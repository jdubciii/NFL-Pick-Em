import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from './db/client';
import { JWT_SECRET, requireAuth, requireAdmin } from './middleware/auth';
import { picksRouter } from './routes/picks';
import { adminRouter } from './routes/admin';

export const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/picks', picksRouter);
app.use('/api/admin', adminRouter);

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * POST /api/auth/login
 * Validates user credentials and issues a JWT token.
 */
app.post('/api/auth/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'An unexpected error occurred during login.' });
  }
});

/**
 * GET /api/pools
 * Returns all active pools.
 */
app.get('/api/pools', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const pools = await prisma.pool.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    });
    res.json(pools);
  } catch (error) {
    console.error('Error fetching pools:', error);
    res.status(500).json({ error: 'Failed to fetch pools.' });
  }
});

/**
 * GET /api/games
 * Returns upcoming and current week NFL games with the requesting user's pick status.
 */
app.get('/api/games', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const poolId = req.query.pool_id ? String(req.query.pool_id) : undefined;

  try {
    let pool = poolId
      ? await prisma.pool.findUnique({ where: { id: poolId } })
      : await prisma.pool.findFirst({ where: { status: 'ACTIVE' } });

    if (!pool) {
      pool = await prisma.pool.create({
        data: {
          name: 'Main NFL Pick \'Em Pool',
          adminId: userId,
          settings: { lock_offset: 0, points_per_win: 1 },
          status: 'ACTIVE',
        },
      });
    }

    const games = await prisma.game.findMany({
      orderBy: { kickoffTime: 'asc' },
      include: {
        picks: {
          where: {
            userId: userId,
            poolId: pool.id,
          },
        },
      },
    });

    const settings = (pool.settings as any) || {};
    const lockOffset = Number(settings.lock_offset ?? settings.lockOffset ?? 0);

    res.json({
      pool: {
        id: pool.id,
        name: pool.name,
        lock_offset: lockOffset,
        settings: pool.settings,
      },
      games: games.map((game) => ({
        id: game.id,
        externalGameId: game.externalGameId,
        homeTeamId: game.homeTeamId,
        awayTeamId: game.awayTeamId,
        kickoffTime: game.kickoffTime,
        status: game.status,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        userPick: game.picks[0]?.selectedTeamId ?? null,
        pickId: game.picks[0]?.id ?? null,
      })),
    });
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Failed to fetch NFL games.' });
  }
});

export interface LeaderboardUserEntry {
  user_id: string;
  email: string;
  total_points: number;
  correct_picks: number;
  total_picks: number;
  is_weekly_loser: boolean;
}

/**
 * GET /api/pools/:pool_id/leaderboard
 * Protected endpoint that returns the pool leaderboard aggregated from PickResult records.
 * Sorts users descending by total points and tags the lowest scoring user(s) with is_weekly_loser: true.
 */
app.get('/api/pools/:pool_id/leaderboard', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const poolId = String(req.params.pool_id);

  if (!poolId) {
    res.status(400).json({ error: 'pool_id is required.' });
    return;
  }

  try {
    // 1. Fetch pool, memberships, and all picks with graded results
    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        picks: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
            result: true,
          },
        },
      },
    });

    if (!pool) {
      res.status(404).json({ error: 'Pool not found.' });
      return;
    }

    // 2. Aggregate points and stats by user
    const userMap = new Map<string, LeaderboardUserEntry>();

    // Initialize all pool members
    for (const membership of pool.memberships) {
      if (!userMap.has(membership.user.id)) {
        userMap.set(membership.user.id, {
          user_id: membership.user.id,
          email: membership.user.email,
          total_points: 0,
          correct_picks: 0,
          total_picks: 0,
          is_weekly_loser: false,
        });
      }
    }

    // Include users with picks and accumulate graded points from PickResult
    for (const pick of pool.picks) {
      let entry = userMap.get(pick.userId);
      if (!entry) {
        entry = {
          user_id: pick.user.id,
          email: pick.user.email,
          total_points: 0,
          correct_picks: 0,
          total_picks: 0,
          is_weekly_loser: false,
        };
        userMap.set(pick.userId, entry);
      }

      entry.total_picks += 1;

      if (pick.result) {
        entry.total_points += Number(pick.result.pointsAwarded);
        if (pick.result.isCorrect) {
          entry.correct_picks += 1;
        }
      }
    }

    const leaderboard = Array.from(userMap.values());

    // 3. Sort descending by total points, then by correct picks
    leaderboard.sort((a, b) => {
      if (b.total_points !== a.total_points) {
        return b.total_points - a.total_points;
      }
      return b.correct_picks - a.correct_picks;
    });

    // 4. Calculate absolute lowest score and set is_weekly_loser flag
    if (leaderboard.length > 0) {
      const minPoints = Math.min(...leaderboard.map((u) => u.total_points));
      for (const entry of leaderboard) {
        if (entry.total_points === minPoints) {
          entry.is_weekly_loser = true;
        }
      }
    }

    res.json({
      pool_id: pool.id,
      pool_name: pool.name,
      leaderboard,
    });
  } catch (error) {
    console.error('Leaderboard calculation error:', error);
    res.status(500).json({ error: 'Failed to generate leaderboard.' });
  }
});

// Alias db as any to allow accessing newly generated models without IDE cache conflicts
const db = prisma as any;

export interface CumulativeLeaderboardEntry {
  user_id: string;
  email: string;
  total_shots_drank: number;
  first_place_finishes: number;
  dead_place_finishes: number;
  total_picks: number;
  correct_picks: number;
  accuracy_percentage: number;
  updated_at: Date;
}

/**
 * GET /api/pools/:pool_id/leaderboard/cumulative
 * Protected route returning joined PoolMembership and PoolMemberStat data,
 * including cumulative shot counts, 1st place finishes, dead place finishes, and pick accuracy.
 * Supports sorting by 'shots', 'wins', 'dead_place', or 'accuracy'.
 */
app.get('/api/pools/:pool_id/leaderboard/cumulative', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const poolId = String(req.params.pool_id);
  const sortBy = String(req.query.sort_by || 'shots').toLowerCase();
  const order = String(req.query.order || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

  if (!poolId) {
    res.status(400).json({ error: 'pool_id is required.' });
    return;
  }

  try {
    const pool = await db.pool.findUnique({
      where: { id: poolId },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
            stat: true,
          },
        },
        picks: {
          include: {
            result: true,
          },
        },
      },
    });

    if (!pool) {
      res.status(404).json({ error: 'Pool not found.' });
      return;
    }

    // Map pick accuracy per user
    const userPicksStats = new Map<string, { totalPicks: number; correctPicks: number }>();
    for (const pick of (pool.picks || [])) {
      const userStat = userPicksStats.get(pick.userId) || { totalPicks: 0, correctPicks: 0 };
      userStat.totalPicks += 1;
      if (pick.result?.isCorrect) {
        userStat.correctPicks += 1;
      }
      userPicksStats.set(pick.userId, userStat);
    }

    const memberships: any[] = pool.memberships || [];
    const leaderboard: CumulativeLeaderboardEntry[] = memberships.map((membership: any) => {
      const userStats = userPicksStats.get(membership.userId) || { totalPicks: 0, correctPicks: 0 };
      const accuracy = userStats.totalPicks > 0
        ? Math.round((userStats.correctPicks / userStats.totalPicks) * 1000) / 10
        : 0;

      return {
        user_id: membership.user.id,
        email: membership.user.email,
        total_shots_drank: membership.stat?.totalShotsDrank ?? 0,
        first_place_finishes: membership.stat?.firstPlaceFinishes ?? 0,
        dead_place_finishes: membership.stat?.deadPlaceFinishes ?? 0,
        total_picks: userStats.totalPicks,
        correct_picks: userStats.correctPicks,
        accuracy_percentage: accuracy,
        updated_at: membership.stat?.updatedAt ?? new Date(),
      };
    });

    // Sort by requested parameter
    leaderboard.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'wins' || sortBy === 'first_place') {
        comparison = b.first_place_finishes - a.first_place_finishes;
      } else if (sortBy === 'dead_place' || sortBy === 'dead_place_finishes') {
        comparison = b.dead_place_finishes - a.dead_place_finishes;
      } else if (sortBy === 'accuracy') {
        comparison = b.accuracy_percentage - a.accuracy_percentage;
      } else {
        // Default to total shots drank
        comparison = b.total_shots_drank - a.total_shots_drank;
      }

      if (comparison === 0) {
        // Secondary sort by accuracy then email
        comparison = b.accuracy_percentage - a.accuracy_percentage;
      }

      return order === 'asc' ? -comparison : comparison;
    });

    const totalPoolShots = leaderboard.reduce((acc, curr) => acc + curr.total_shots_drank, 0);

    res.json({
      pool_id: pool.id,
      pool_name: pool.name,
      total_pool_shots: totalPoolShots,
      leaderboard,
    });
  } catch (error) {
    console.error('Cumulative leaderboard calculation error:', error);
    res.status(500).json({ error: 'Failed to generate cumulative leaderboard.' });
  }
});

/**
 * POST /api/pools/:pool_id/penalties/adjust
 * Protected by requireAdmin.
 * Accepts member_id, delta (integer), and reason.
 * Inserts a new record into PenaltyLedger and triggers recalculation of total_shots_drank in PoolMemberStat.
 */
app.post('/api/pools/:pool_id/penalties/adjust', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const poolId = String(req.params.pool_id);
  const memberId = req.body.member_id || req.body.memberId || req.body.user_id || req.body.userId;
  const rawDelta = req.body.delta;
  const reason = req.body.reason;
  const weekNumber = req.body.week_number !== undefined ? Number(req.body.week_number) : null;

  if (!poolId || !memberId || rawDelta === undefined || !reason || String(reason).trim().length === 0) {
    res.status(400).json({
      error: 'Missing required fields: member_id, delta (integer), and reason are required.',
    });
    return;
  }

  const delta = parseInt(String(rawDelta), 10);
  if (isNaN(delta)) {
    res.status(400).json({ error: 'delta must be a valid integer.' });
    return;
  }

  try {
    // 1. Verify pool and member existence
    const membership = await db.poolMembership.findUnique({
      where: {
        poolId_userId: {
          poolId,
          userId: memberId,
        },
      },
    });

    if (!membership) {
      res.status(404).json({ error: 'User is not a member of this pool.' });
      return;
    }

    // 2. Insert record into PenaltyLedger
    const penaltyEntry = await db.penaltyLedger.create({
      data: {
        poolId,
        userId: memberId,
        delta,
        reason: String(reason).trim(),
        weekNumber: weekNumber && !isNaN(weekNumber) ? weekNumber : null,
        createdById: req.user!.id,
      },
    });

    // 3. Recalculate total_shots_drank by summing PenaltyLedger records
    const ledgerSum = await db.penaltyLedger.aggregate({
      where: {
        poolId,
        userId: memberId,
      },
      _sum: {
        delta: true,
      },
    });

    const totalShotsDrank = ledgerSum._sum.delta ?? 0;

    // 4. Update or create PoolMemberStat cache
    const updatedStat = await db.poolMemberStat.upsert({
      where: {
        poolId_userId: {
          poolId,
          userId: memberId,
        },
      },
      update: {
        totalShotsDrank,
      },
      create: {
        poolId,
        userId: memberId,
        totalShotsDrank,
        firstPlaceFinishes: 0,
        deadPlaceFinishes: 0,
      },
    });

    // 5. Create audit log for admin adjustment
    await db.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'ADMIN_ADJUST_PENALTY',
        targetEntityId: penaltyEntry.id,
        newValue: {
          poolId,
          userId: memberId,
          delta,
          reason,
          newTotalShots: totalShotsDrank,
        },
      },
    });

    res.status(201).json({
      message: 'Penalty adjusted successfully.',
      penalty: penaltyEntry,
      stat: updatedStat,
    });
  } catch (error) {
    console.error('Penalty adjustment error:', error);
    res.status(500).json({ error: 'Failed to adjust penalty.' });
  }
});

/**
 * GET /api/pools/:pool_id/penalties/member/:member_id
 * Returns the penalty ledger history for a specific member in the pool.
 */
app.get('/api/pools/:pool_id/penalties/member/:member_id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const poolId = String(req.params.pool_id);
  const memberId = String(req.params.member_id);

  try {
    const history = await db.penaltyLedger.findMany({
      where: {
        poolId,
        userId: memberId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    res.json(history);
  } catch (error) {
    console.error('Error fetching member penalty history:', error);
    res.status(500).json({ error: 'Failed to fetch penalty history.' });
  }
});

// Start listening if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
