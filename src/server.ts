import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from './db/client';
import { JWT_SECRET, UUID_REGEX, requireAuth, requireAdmin, requirePoolCommissioner, requirePoolMember } from './middleware/auth';
import { picksRouter } from './routes/picks';
import { adminRouter } from './routes/admin';
import { meRouter } from './routes/me';
import { notificationsRouter } from './routes/notifications';
import { opsRouter } from './routes/ops';
import { adminOpsRouter } from './routes/adminOps';
import { webhooksRouter } from './routes/webhooks';
import { shotCamRouter } from './routes/shotCam';
import streamRouter from './routes/streamRoutes';
import type {
  PoolSettings,
  MatrixResponsePayload,
  MatrixMemberColumn,
  MatrixGameRow,
  MatrixPickCell,
  MatrixMemberSummary,
  PickingMode,
} from './types/pool';
import { startLiveScheduleDaemon } from './services/liveScheduleDaemon';

export const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: (_origin, callback) => callback(null, true),
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-email', 'x-user-role'],
}));
app.use(express.json());

// Bind dev user if x-user-email header is present in non-production
app.use(async (req: Request, _res: Response, next) => {
  const devEmail = (req.headers['x-user-email'] || req.headers['x-dev-user-email']) as string;
  if (devEmail && process.env.NODE_ENV !== 'production' && !req.user) {
    try {
      const user = await prisma.user.findFirst({ where: { email: devEmail } });
      if (user) {
        req.user = { id: user.id, email: user.email, role: user.role };
      } else {
        req.user = {
          id: '4cbde3a9-6f8f-44cf-80fa-3c16c03810db',
          email: 'jack@nflpickem.com',
          role: Role.ADMIN,
        };
      }
    } catch {
      req.user = {
        id: '4cbde3a9-6f8f-44cf-80fa-3c16c03810db',
        email: 'jack@nflpickem.com',
        role: Role.ADMIN,
      };
    }
  }
  next();
});

// Routes
app.use('/api/picks', picksRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin/ops', adminOpsRouter);
app.use('/api/me', meRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/pools', opsRouter);
app.use('/api/pools/:pool_id/shot-cam', shotCamRouter);
app.use('/api/shot-cam', shotCamRouter);
app.use('/api/pools/:pool_id/shame', shotCamRouter);
app.use('/api/shame', shotCamRouter);
app.use(streamRouter);



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
  const poolIdParam = req.query.pool_id;
  const poolId = poolIdParam !== undefined && poolIdParam !== null && poolIdParam !== ''
    ? String(poolIdParam)
    : undefined;

  try {
    let pool: any = null;
    if (poolId) {
      if (!UUID_REGEX.test(poolId)) {
        res.status(400).json({ error: 'Invalid pool ID format. Must be a valid UUID.' });
        return;
      }

      pool = await prisma.pool.findUnique({ where: { id: poolId } });
      if (!pool) {
        res.status(404).json({ error: 'POOL_NOT_FOUND' });
        return;
      }

      const isCommissioner = pool.adminId === userId;
      if (!isCommissioner) {
        const membership = await prisma.poolMembership.findUnique({
          where: {
            poolId_userId: {
              poolId,
              userId,
            },
          },
        });

        if (!membership || membership.status !== 'ACTIVE') {
          res.status(403).json({ error: 'Forbidden. Active pool membership required.' });
          return;
        }
      }
    } else {
      pool = await prisma.pool.findFirst({
        where: {
          status: 'ACTIVE',
          memberships: {
            some: {
              userId,
              status: 'ACTIVE',
            },
          },
        },
        orderBy: [{ name: 'asc' }],
      });

      if (!pool) {
        pool = await prisma.pool.findFirst({
          where: {
            adminId: userId,
            status: 'ACTIVE',
          },
          orderBy: [{ name: 'asc' }],
        });
      }
    }

    if (!pool) {
      res.status(404).json({ error: 'POOL_NOT_FOUND' });
      return;
    }

    const settings = (pool.settings as any) || {};
    const defaultWeek = Number(settings.week_number ?? settings.current_week ?? 5);
    const requestedWeek = req.query.week || req.query.week_no || req.query.weekNumber;
    const isAllWeeks = String(requestedWeek).toLowerCase() === 'all';
    const weekNum = requestedWeek !== undefined && requestedWeek !== null && requestedWeek !== ''
      ? (isAllWeeks ? 0 : parseInt(String(requestedWeek), 10) || defaultWeek)
      : defaultWeek;

    const allGames = await prisma.game.findMany({
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

    let games = allGames;
    if (!isAllWeeks && weekNum > 0) {
      const padded = weekNum < 10 ? `_w0${weekNum}_` : `_w${weekNum}_`;
      const unpadded = `_w${weekNum}_`;
      games = allGames.filter((g) =>
        g.externalGameId && (
          g.externalGameId.toLowerCase().includes(padded.toLowerCase()) ||
          g.externalGameId.toLowerCase().includes(unpadded.toLowerCase())
        )
      );
    }

    const lockOffset = Number(settings.lock_offset ?? settings.lockOffset ?? 0);

    res.json({
      pool: {
        id: pool.id,
        name: pool.name,
        lock_offset: lockOffset,
        settings: pool.settings,
        current_week: defaultWeek,
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
app.get('/api/pools/:pool_id/leaderboard', requireAuth, requirePoolMember, async (req: Request, res: Response): Promise<void> => {
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
            game: true,
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

    // Include users with picks and accumulate dynamically evaluated points
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

      const game = (pick as any).game;
      const isGameFinished = game && (game.status === 'FINAL' || (game.homeScore !== null && game.awayScore !== null));

      let isCorrect = false;
      let pointsAwarded = 0;

      if (isGameFinished) {
        let winner: string | null = null;
        if (game.homeScore !== null && game.awayScore !== null) {
          if (game.homeScore > game.awayScore) winner = game.homeTeamId;
          else if (game.awayScore > game.homeScore) winner = game.awayTeamId;
        }
        isCorrect = Boolean(winner && pick.selectedTeamId && pick.selectedTeamId === winner);
        pointsAwarded = isCorrect ? 1.0 : 0.0;
      } else if (pick.result) {
        isCorrect = pick.result.isCorrect;
        pointsAwarded = Number(pick.result.pointsAwarded);
      }

      entry.total_points += pointsAwarded;
      if (isCorrect) {
        entry.correct_picks += 1;
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
app.get('/api/pools/:pool_id/leaderboard/cumulative', requireAuth, requirePoolMember, async (req: Request, res: Response): Promise<void> => {
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
        total_shots_drank: Number(membership.stat?.totalShotsDrank ?? 0),
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
        comparison = Number(b.total_shots_drank) - Number(a.total_shots_drank);
      }

      if (comparison === 0) {
        // Secondary sort by accuracy then email
        comparison = b.accuracy_percentage - a.accuracy_percentage;
      }

      return order === 'asc' ? -comparison : comparison;
    });

    const totalPoolShots = leaderboard.reduce((acc, curr) => acc + Number(curr.total_shots_drank || 0), 0);

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
app.post('/api/pools/:pool_id/penalties/adjust', requireAuth, requirePoolCommissioner, async (req: Request, res: Response): Promise<void> => {
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
app.get('/api/pools/:pool_id/penalties/member/:member_id', requireAuth, requirePoolMember, async (req: Request, res: Response): Promise<void> => {
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
        media: true,
      },
    });

    res.json(history);
  } catch (error) {
    console.error('Error fetching member penalty history:', error);
    res.status(500).json({ error: 'Failed to fetch penalty history.' });
  }
});

/**
 * POST /api/pools/:pool_id/penalties/:id/media
 * Registers Supabase storage path to the PenaltyMedia table.
 * Restricted to the penalty owner, pool commissioner, or global admin.
 */
app.post('/api/pools/:pool_id/penalties/:id/media', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const poolId = String(req.params.pool_id);
  const penaltyId = String(req.params.id);
  const storagePath = req.body.storage_path || req.body.storagePath;
  const mediaType = req.body.media_type || req.body.mediaType || 'video/mp4';

  if (!storagePath || typeof storagePath !== 'string' || storagePath.trim().length === 0) {
    res.status(400).json({ error: 'storage_path is required.' });
    return;
  }

  try {
    // 1. Fetch pool and penalty ledger record
    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
    });

    if (!pool) {
      res.status(404).json({ error: 'Pool not found.' });
      return;
    }

    const penalty = await db.penaltyLedger.findUnique({
      where: { id: penaltyId },
    });

    if (!penalty || penalty.poolId !== poolId) {
      res.status(404).json({ error: 'Penalty record not found in this pool.' });
      return;
    }

    // 2. Authorization check: penalty owner or pool commissioner
    const requestingUserId = req.user!.id;
    const isOwner = penalty.userId === requestingUserId;
    const isCommissioner = pool.adminId === requestingUserId;

    if (!isOwner && !isCommissioner) {
      res.status(403).json({ error: 'Forbidden: You do not have permission to upload media for this penalty.' });
      return;
    }

    // 3. Upsert PenaltyMedia record
    const penaltyMedia = await db.penaltyMedia.upsert({
      where: {
        penaltyId,
      },
      update: {
        storagePath: String(storagePath).trim(),
        mediaType: String(mediaType).trim(),
        status: 'PENDING',
        confirmedBy: null,
      },
      create: {
        penaltyId,
        poolId,
        userId: penalty.userId,
        storagePath: String(storagePath).trim(),
        mediaType: String(mediaType).trim(),
        status: 'PENDING',
      },
    });

    // 4. Record audit log
    await db.auditLog.create({
      data: {
        actorId: requestingUserId,
        action: 'UPLOAD_PENALTY_MEDIA',
        targetEntityId: penaltyId,
        newValue: {
          penaltyId,
          poolId,
          userId: penalty.userId,
          storagePath: String(storagePath).trim(),
          mediaType: String(mediaType).trim(),
          status: 'PENDING',
        },
      },
    });

    res.status(201).json({
      message: 'Penalty media registered successfully.',
      media: penaltyMedia,
    });
  } catch (error) {
    console.error('Error registering penalty media:', error);
    res.status(500).json({ error: 'Failed to register penalty media.' });
  }
});

/**
 * PATCH /api/pools/:pool_id/penalties/:id/media/confirm
 * Commissioner action to flip penalty media status to CONFIRMED (or REJECTED/PENDING).
 * Restricted to the pool commissioner.
 */
app.patch('/api/pools/:pool_id/penalties/:id/media/confirm', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const poolId = String(req.params.pool_id);
  const penaltyId = String(req.params.id);
  const targetStatus = String(req.body.status || 'CONFIRMED').toUpperCase();

  if (!['CONFIRMED', 'REJECTED', 'PENDING'].includes(targetStatus)) {
    res.status(400).json({ error: 'Invalid status. Allowed values: CONFIRMED, REJECTED, PENDING.' });
    return;
  }

  try {
    // 1. Fetch pool and verify commissioner permissions
    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
    });

    if (!pool) {
      res.status(404).json({ error: 'Pool not found.' });
      return;
    }

    const requestingUserId = req.user!.id;
    const isCommissioner = pool.adminId === requestingUserId;

    if (!isCommissioner) {
      res.status(403).json({ error: 'Forbidden: Only the pool commissioner can confirm penalty media.' });
      return;
    }

    // 2. Fetch penalty media
    const existingMedia = await db.penaltyMedia.findUnique({
      where: { penaltyId },
    });

    if (!existingMedia || existingMedia.poolId !== poolId) {
      res.status(404).json({ error: 'Penalty media not found for this penalty in this pool.' });
      return;
    }

    // 3. Update status
    const updatedMedia = await db.penaltyMedia.update({
      where: { penaltyId },
      data: {
        status: targetStatus,
        confirmedBy: targetStatus === 'CONFIRMED' ? requestingUserId : (targetStatus === 'PENDING' ? null : requestingUserId),
      },
    });

    // 4. Record audit log
    await db.auditLog.create({
      data: {
        actorId: requestingUserId,
        action: 'CONFIRM_PENALTY_MEDIA',
        targetEntityId: penaltyId,
        oldValue: {
          status: existingMedia.status,
          confirmedBy: existingMedia.confirmedBy,
        },
        newValue: {
          status: targetStatus,
          confirmedBy: updatedMedia.confirmedBy,
        },
      },
    });

    res.json({
      message: `Penalty media status updated to ${targetStatus}.`,
      media: updatedMedia,
    });
  } catch (error) {
    console.error('Error confirming penalty media:', error);
    res.status(500).json({ error: 'Failed to update penalty media status.' });
  }
});

/**
 * GET /api/pools/:pool_id/penalties/:id/media
 * Returns penalty media details for a specific penalty entry.
 */
app.get('/api/pools/:pool_id/penalties/:id/media', requireAuth, requirePoolMember, async (req: Request, res: Response): Promise<void> => {
  const poolId = String(req.params.pool_id);
  const penaltyId = String(req.params.id);

  try {
    const media = await db.penaltyMedia.findUnique({
      where: { penaltyId },
      include: {
        confirmer: {
          select: {
            id: true,
            email: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!media || media.poolId !== poolId) {
      res.status(404).json({ error: 'Penalty media not found.' });
      return;
    }

    res.json(media);
  } catch (error) {
    console.error('Error fetching penalty media:', error);
    res.status(500).json({ error: 'Failed to fetch penalty media.' });
  }
});

/**
 * GET /api/pools/:pool_id/matrix
 * Protected route returning a structured square sheet matrix for the pool week.
 * Payload includes:
 * - metadata: pool_id, week_number, picking_mode, hide_picks_until_kickoff
 * - columns: array of active members ({ user_id, email, displayName })
 * - rows: array of games ({ game_id, external_game_id, home_team_id, away_team_id, kickoff_time, status, home_score, away_score, spread })
 * - cells: 2D map nested by game_id -> user_id -> { pick_id, selected_team_id, is_masked, is_correct, points_awarded }
 * - summary: object map keyed by user_id -> { user_id, weekly_wins, tiebreaker_guess, cumulative_shots }
 */
app.get('/api/pools/:pool_id/matrix', requireAuth, requirePoolMember, async (req: Request, res: Response): Promise<void> => {
  const poolId = String(req.params.pool_id);
  const requestedWeek = req.query.week_no || req.query.week || req.query.weekNumber;
  const isAllWeeks = String(requestedWeek).toLowerCase() === 'all';

  if (!poolId) {
    res.status(400).json({ error: 'pool_id is required.' });
    return;
  }

  try {
    // 1. Fetch pool, settings, active memberships, and user stats
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
          orderBy: {
            user: {
              email: 'asc',
            },
          },
        },
      },
    });

    if (!pool) {
      res.status(404).json({ error: 'Pool not found.' });
      return;
    }

    const settings = (pool.settings as PoolSettings) || {};
    const defaultWeek = Number(settings.week_number ?? (settings as any).current_week ?? 5);
    const weekNum = requestedWeek !== undefined && requestedWeek !== null && requestedWeek !== ''
      ? (isAllWeeks ? 0 : parseInt(String(requestedWeek), 10) || defaultWeek)
      : defaultWeek;
    const pickingMode: PickingMode = settings.picking_mode ?? settings.pickingMode ?? 'STRAIGHT_UP';
    const hidePicksUntilKickoff = Boolean(
      settings.hide_picks_until_kickoff ?? settings.hidePicksUntilKickoff ?? true
    );

    // 2. Fetch all games ordered chronologically by kickoffTime
    const allGames = await db.game.findMany({
      orderBy: { kickoffTime: 'asc' },
    });

    let games = allGames;
    if (!isAllWeeks && weekNum > 0) {
      const padded = weekNum < 10 ? `_w0${weekNum}_` : `_w${weekNum}_`;
      const unpadded = `_w${weekNum}_`;
      games = allGames.filter((g: any) =>
        g.externalGameId && (
          g.externalGameId.toLowerCase().includes(padded.toLowerCase()) ||
          g.externalGameId.toLowerCase().includes(unpadded.toLowerCase())
        )
      );
    }

    const gameIds = games.map((g: any) => g.id);

    // 3. Fetch all picks for this pool and these games, including finalized results
    const picks = await db.pick.findMany({
      where: {
        poolId: pool.id,
        gameId: { in: gameIds },
      },
      include: {
        result: true,
      },
    });

    // 4. Fetch weekly submissions for tiebreaker predictions and finalization status for this week
    const weeklySubmissionsWhere: any = { poolId: pool.id };
    if (!isAllWeeks) {
      weeklySubmissionsWhere.weekNumber = weekNum;
    }
    const weeklySubmissions = await db.weeklySubmission.findMany({
      where: weeklySubmissionsWhere,
    });

    const tiebreakerMap = new Map<string, number | null>();
    const finalizedMap = new Map<string, boolean>();
    for (const sub of weeklySubmissions) {
      if (sub.tieBreakerPrediction !== null && sub.tieBreakerPrediction !== undefined) {
        tiebreakerMap.set(sub.userId, Number(sub.tieBreakerPrediction));
      } else {
        tiebreakerMap.set(sub.userId, null);
      }
      finalizedMap.set(sub.userId, Boolean(sub.isFinalized));
    }

    // 5. Build columns (members)
    const columns: MatrixMemberColumn[] = pool.memberships.map((m: any) => ({
      user_id: m.userId,
      email: m.user.email,
      displayName: m.user.email.split('@')[0],
    }));

    // 6. Build rows (games)
    const rows: MatrixGameRow[] = games.map((g: any) => ({
      game_id: g.id,
      external_game_id: g.externalGameId,
      home_team_id: g.homeTeamId,
      away_team_id: g.awayTeamId,
      kickoff_time: g.kickoffTime.toISOString(),
      status: g.status,
      home_score: g.homeScore,
      away_score: g.awayScore,
      spread: null,
    }));

    // 7. Build 2D cells map: game_id -> user_id -> MatrixPickCell
    const pickLookup = new Map<string, any>();
    for (const pick of picks) {
      pickLookup.set(`${pick.gameId}_${pick.userId}`, pick);
    }

    const cells: Record<string, Record<string, MatrixPickCell>> = {};
    for (const game of games) {
      cells[game.id] = {};
      for (const membership of pool.memberships) {
        const userId = membership.userId;
        const pick = pickLookup.get(`${game.id}_${userId}`);

        if (pick) {
          cells[game.id][userId] = {
            pick_id: pick.id,
            selected_team_id: pick.selectedTeamId,
            is_masked: false,
            is_correct: pick.result ? pick.result.isCorrect : null,
            points_awarded: pick.result ? Number(pick.result.pointsAwarded) : null,
          };
        } else {
          cells[game.id][userId] = {
            pick_id: null,
            selected_team_id: null,
            is_masked: false,
            is_correct: null,
            points_awarded: null,
          };
        }
      }
    }

    // 8. Dual-Mode Visibility & Anti-Peeking Security Layer
    // Mode A: hide_picks_until_kickoff === true -> redact unstarted games for other users
    // Mode B: hide_picks_until_kickoff === false -> redact unstarted games ONLY if opponent's WeeklySubmission.is_finalized is false
    const now = new Date();
    const requestingUserId = req.user?.id;
    const isUserAdmin = req.user?.role === 'ADMIN';

    for (const game of games) {
      const isGameNotStarted = now.getTime() < new Date(game.kickoffTime).getTime();

      for (const membership of pool.memberships) {
        const userId = membership.userId;
        const cell = cells[game.id]?.[userId];

        if (cell) {
          const isOtherMember = userId !== requestingUserId;

          if (isGameNotStarted && isOtherMember && !isUserAdmin) {
            if (hidePicksUntilKickoff) {
              // Mode A (Strict/Hidden): Mask all competitor picks prior to kickoff
              cell.selected_team_id = null;
              cell.is_masked = true;
            } else {
              // Mode B (Open Slate): Expose picks only if opponent has finalized their weekly submission
              const isOpponentFinalized = finalizedMap.get(userId) === true;
              if (!isOpponentFinalized) {
                cell.selected_team_id = null;
                cell.is_masked = true;
              } else {
                cell.is_masked = false;
              }
            }
          } else {
            cell.is_masked = false;
          }
        }
      }
    }

    // 9. Build summary: user_id -> MatrixMemberSummary
    const weeklyWinsMap = new Map<string, number>();
    for (const pick of picks) {
      if (pick.result?.isCorrect) {
        weeklyWinsMap.set(pick.userId, (weeklyWinsMap.get(pick.userId) || 0) + 1);
      }
    }

    const summary: Record<string, MatrixMemberSummary> = {};
    for (const membership of pool.memberships) {
      const userId = membership.userId;
      const weeklyWins = weeklyWinsMap.get(userId) || 0;
      const tiebreakerGuess = tiebreakerMap.has(userId) ? tiebreakerMap.get(userId)! : null;
      const cumulativeShots = Number(membership.stat?.totalShotsDrank ?? 0);

      summary[userId] = {
        user_id: userId,
        weekly_wins: weeklyWins,
        tiebreaker_guess: tiebreakerGuess,
        cumulative_shots: cumulativeShots,
      };
    }

    const responsePayload: MatrixResponsePayload = {
      metadata: {
        pool_id: pool.id,
        week_number: isAllWeeks ? 'all' : weekNum,
        picking_mode: pickingMode,
        hide_picks_until_kickoff: hidePicksUntilKickoff,
      },
      columns,
      rows,
      cells,
      summary,
    };

    res.json(responsePayload);
  } catch (error) {
    console.error('Matrix calculation error:', error);
    res.status(500).json({ error: 'Failed to generate matrix.' });
  }
});

// Start listening if run directly
if (require.main === module) {
  const portNum = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;
  app.listen(portNum, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT} (Local Wi-Fi: http://192.168.1.18:${PORT})`);
    startLiveScheduleDaemon();
  });
}
