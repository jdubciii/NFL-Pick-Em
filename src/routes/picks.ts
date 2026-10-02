import { Router, Request, Response } from 'express';
import prisma from '../db/client';
import { requireAuth } from '../middleware/auth';
import { PoolSettings } from '../types/pool';
import { isGameLocked } from '../services/lockResolver';

export const picksRouter = Router();

/**
 * POST /api/picks
 * Protected route for users to submit or update their game pick.
 * Accepts: pool_id, game_id, selected_team_id (optional)
 * Enforces granular kickoff locking based on pool.settings.lock_offset.
 * Uses Prisma upsert on compound unique [pool_id, user_id, game_id].
 */
picksRouter.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const poolId = req.body.pool_id || req.body.poolId;
  const gameId = req.body.game_id || req.body.gameId;
  const rawSelectedTeamId = req.body.selected_team_id !== undefined 
    ? req.body.selected_team_id 
    : req.body.selectedTeamId;

  if (!poolId || !gameId) {
    res.status(400).json({ error: 'pool_id and game_id are required fields.' });
    return;
  }

  // Ensure missing, empty string, or whitespace-only inputs resolve to null
  const selectedTeamId = rawSelectedTeamId && String(rawSelectedTeamId).trim().length > 0
    ? String(rawSelectedTeamId).trim()
    : null;

  const userId = req.user!.id;

  try {
    // 1. Fetch Game and Pool to enforce granular locking rules
    const [game, pool] = await Promise.all([
      prisma.game.findUnique({ where: { id: gameId } }),
      prisma.pool.findUnique({ where: { id: poolId } }),
    ]);

    if (!game) {
      res.status(404).json({ error: 'Game not found.' });
      return;
    }

    if (!pool) {
      res.status(404).json({ error: 'Pool not found.' });
      return;
    }

    // 2. Extract lock_offset (in minutes) from pool.settings JSON
    const settings = (pool.settings as PoolSettings) || {};
    const lockOffsetMinutes = Number(settings.lock_offset ?? settings.lockOffset ?? 0);

    // 3. Evaluate lock status via pure lockResolver
    if (isGameLocked(game.kickoffTime, lockOffsetMinutes)) {
      res.status(403).json({ error: 'Game is locked' });
      return;
    }


    // 5. Upsert pick record
    const pick = await prisma.pick.upsert({
      where: {
        poolId_userId_gameId: {
          poolId,
          userId,
          gameId,
        },
      },
      update: {
        selectedTeamId,
        submittedById: userId,
      },
      create: {
        poolId,
        userId,
        gameId,
        selectedTeamId,
        submittedById: userId,
      },
    });

    res.status(200).json({
      message: 'Pick saved successfully',
      pick,
    });
  } catch (error: any) {
    console.error('Error saving pick:', error);

    // Foreign key violation error handling
    if (error.code === 'P2003') {
      res.status(400).json({ error: 'Invalid pool_id or game_id reference.' });
      return;
    }

    res.status(500).json({ error: 'Failed to save pick.' });
  }
});
