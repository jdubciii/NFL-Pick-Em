import { Router, Request, Response } from 'express';
import prisma from '../db/client';
import { requireAuth, requireAdmin, requirePoolCommissioner } from '../middleware/auth';

export const adminRouter = Router();

/**
 * GET /api/admin/users
 * Returns list of all registered users for admin management.
 */
adminRouter.get('/users', requireAuth, requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { email: 'asc' },
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

/**
 * GET /api/admin/picks
 * Returns all weekly NFL games populated with the targeted user's picks.
 * Protected by requirePoolCommissioner({ from: 'query' }).
 */
adminRouter.get('/picks', requireAuth, requirePoolCommissioner({ from: 'query' }), async (req: Request, res: Response): Promise<void> => {
  const targetUserId = req.query.user_id ? String(req.query.user_id) : undefined;
  const requestedWeek = req.query.week || req.query.week_no || req.query.weekNumber;
  const pool = req.pool!;
  const settings = (pool.settings as any) || {};
  const defaultWeek = Number(settings.week_number ?? settings.current_week ?? 5);
  const isAllWeeks = String(requestedWeek).toLowerCase() === 'all';
  const weekNum = requestedWeek !== undefined && requestedWeek !== null && requestedWeek !== ''
    ? (isAllWeeks ? 0 : parseInt(String(requestedWeek), 10) || defaultWeek)
    : defaultWeek;

  try {
    const allGames = await prisma.game.findMany({
      orderBy: { kickoffTime: 'asc' },
      include: {
        picks: targetUserId
          ? {
              where: {
                userId: targetUserId,
                poolId: pool.id,
              },
            }
          : false,
      },
    });

    let games = allGames;
    if (!isAllWeeks && weekNum > 0 && allGames.length > 0) {
      const padded = weekNum < 10 ? `_w0${weekNum}_` : `_w${weekNum}_`;
      const unpadded = `_w${weekNum}_`;
      const patternMatched = allGames.filter((g) =>
        g.externalGameId && (
          g.externalGameId.toLowerCase().includes(padded.toLowerCase()) ||
          g.externalGameId.toLowerCase().includes(unpadded.toLowerCase())
        )
      );
      if (patternMatched.length > 0) {
        games = patternMatched;
      }
    }

    res.json({
      pool: {
        id: pool.id,
        name: pool.name,
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
        userPick: (game as any).picks?.[0]?.selectedTeamId ?? null,
        pickId: (game as any).picks?.[0]?.id ?? null,
      })),
    });
  } catch (error) {
    console.error('Error fetching admin picks slate:', error);
    res.status(500).json({ error: 'Failed to fetch admin picks slate.' });
  }
});

/**
 * GET /api/admin/audit-logs
 * Returns recent audit logs for the audit trail viewer.
 */
adminRouter.get('/audit-logs', requireAuth, requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const logs = await prisma.auditLog.findMany({
      take: 50,
      orderBy: { timestamp: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

/**
 * PUT /api/admin/picks
 * POST /api/admin/picks/override
 * POST /api/admin/pools/:pool_id/picks/override
 * Commissioner override route for modifying or creating picks for any user.
 * Protected by requirePoolCommissioner({ from: 'body' }).
 * Captures previous state, updates pick, immediately re-grades if game is final, and writes an audit log.
 */
const handleAdminPickOverride = async (req: Request, res: Response): Promise<void> => {
  const userId = req.body.user_id || req.body.userId;
  const poolId = req.pool?.id || req.body.pool_id || req.body.poolId || req.params.pool_id;
  const gameId = req.body.game_id || req.body.gameId;
  const rawSelectedTeamId = req.body.selected_team_id !== undefined
    ? req.body.selected_team_id
    : req.body.selectedTeamId;

  if (!userId || !poolId || !gameId) {
    res.status(400).json({ error: 'user_id, pool_id, and game_id are required fields.' });
    return;
  }

  // Ensure missing or empty inputs map to null
  const selectedTeamId = rawSelectedTeamId && String(rawSelectedTeamId).trim().length > 0
    ? String(rawSelectedTeamId).trim()
    : null;

  const adminId = req.user!.id;

  try {
    // 1. Query existing pick to capture old state for auditing
    const existingPick = await prisma.pick.findUnique({
      where: {
        poolId_userId_gameId: {
          poolId,
          userId,
          gameId,
        },
      },
    });

    // 2. Fetch game details to verify if already finalized
    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });

    // 3. Execute transaction: Upsert pick, upsert PickResult if finalized, and create AuditLog
    const result = await prisma.$transaction(async (tx) => {
      const pick = await tx.pick.upsert({
        where: {
          poolId_userId_gameId: {
            poolId,
            userId,
            gameId,
          },
        },
        update: {
          selectedTeamId,
          submittedById: adminId,
        },
        create: {
          poolId,
          userId,
          gameId,
          selectedTeamId,
          submittedById: adminId,
        },
      });

      // If the targeted game is FINAL or has scores, immediately re-grade and upsert PickResult
      if (game && (game.status === 'FINAL' || (game.homeScore !== null && game.awayScore !== null))) {
        let winner: string | null = null;
        if (game.homeScore !== null && game.awayScore !== null) {
          if (game.homeScore > game.awayScore) winner = game.homeTeamId;
          else if (game.awayScore > game.homeScore) winner = game.awayTeamId;
        }

        const isCorrect = Boolean(winner && selectedTeamId && selectedTeamId === winner);
        const pointsAwarded = isCorrect ? 1.0 : 0.0;

        await tx.pickResult.upsert({
          where: { pickId: pick.id },
          update: {
            isCorrect,
            pointsAwarded,
          },
          create: {
            pickId: pick.id,
            isCorrect,
            pointsAwarded,
          },
        });
      }

      const auditLog = await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'ADMIN_OVERRIDE_PICK',
          targetEntityId: pick.id,
          oldValue: existingPick ? JSON.parse(JSON.stringify(existingPick)) : null,
          newValue: JSON.parse(JSON.stringify(pick)),
        },
      });

      return { pick, auditLog };
    });

    res.status(200).json({
      message: 'Pick successfully updated by admin.',
      pick: result.pick,
      auditLogId: result.auditLog.id,
    });
  } catch (error: any) {
    console.error('Error during admin pick override:', error);

    if (error.code === 'P2003') {
      res.status(400).json({ error: 'Invalid user_id, pool_id, or game_id reference.' });
      return;
    }

    res.status(500).json({ error: 'Failed to perform admin pick override.' });
  }
};

adminRouter.put('/picks', requireAuth, requirePoolCommissioner({ from: 'body' }), handleAdminPickOverride);
adminRouter.post('/picks/override', requireAuth, requirePoolCommissioner({ from: 'body' }), handleAdminPickOverride);
adminRouter.post('/pools/:pool_id/picks/override', requireAuth, requirePoolCommissioner({ from: 'param' }), handleAdminPickOverride);

