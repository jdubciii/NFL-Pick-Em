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
  const pool = req.pool!;

  try {
    const games = await prisma.game.findMany({
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
 * Commissioner override route for modifying or creating picks for any user.
 * Protected by requirePoolCommissioner({ from: 'body' }).
 * Captures previous state and writes an audit log atomically via $transaction.
 */
adminRouter.put('/picks', requireAuth, requirePoolCommissioner({ from: 'body' }), async (req: Request, res: Response): Promise<void> => {
  const userId = req.body.user_id || req.body.userId;
  const poolId = req.pool!.id;
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

    // 2. Execute transaction: Upsert pick with admin submitted_by & create AuditLog record
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
});
