import { Router, Request, Response } from 'express';
import prisma from '../db/client';
import { requireAuth, requireAdmin } from '../middleware/auth';

export const adminRouter = Router();

/**
 * PUT /api/admin/picks
 * Admin override route for modifying or creating picks for any user.
 * Protected by requireAuth and requireAdmin.
 * Captures previous state and writes an audit log atomically via $transaction.
 */
adminRouter.put('/picks', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const userId = req.body.user_id || req.body.userId;
  const poolId = req.body.pool_id || req.body.poolId;
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
