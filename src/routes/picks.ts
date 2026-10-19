import { Router, Request, Response } from 'express';
import prisma from '../db/client';
import { requireAuth } from '../middleware/auth';
import { PoolSettings } from '../types/pool';
import { isGameLocked } from '../services/lockResolver';
import {
  handleGetTiebreaker,
  handlePostTiebreaker,
  handlePostTiebreakerOverride,
} from './poolTiebreakerRoutes';
import { normalizeTeamCode } from '../services/authoritativeSlateService';

export const picksRouter = Router();

/**
 * POST /api/picks
 * Protected route for users to submit or update their game pick.
 * Accepts: pool_id, game_id, selected_team_id (optional)
 * Enforces verified actor, applicable ACTIVE pool membership, correct pool,
 * valid home/away selection, and granular kickoff locking.
 * Uses Prisma upsert on compound unique [pool_id, user_id, game_id].
 */
picksRouter.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const poolId = req.body.pool_id || req.body.poolId;
  const rawGameId = req.body.game_id || req.body.gameId;
  const rawSelectedTeamId = req.body.selected_team_id !== undefined 
    ? req.body.selected_team_id 
    : (req.body.selectedTeamId !== undefined
      ? req.body.selectedTeamId
      : (req.body.selected_team !== undefined
        ? req.body.selected_team
        : (req.body.selectedTeam !== undefined
          ? req.body.selectedTeam
          : (req.body.team_id !== undefined
            ? req.body.team_id
            : (req.body.teamId !== undefined
              ? req.body.teamId
              : req.body.team)))));

  if (!poolId || !rawGameId) {
    res.status(400).json({ error: 'pool_id and game_id are required fields.' });
    return;
  }

  const gameId = String(rawGameId).trim();
  const selectedTeamId = rawSelectedTeamId !== undefined && rawSelectedTeamId !== null && String(rawSelectedTeamId).trim().length > 0
    ? String(rawSelectedTeamId).trim()
    : null;

  const userId = req.user!.id;

  try {
    // 1. Fetch Pool and verify ACTIVE membership (Decision #55: Fail-closed)
    const [pool, membership] = await Promise.all([
      prisma.pool.findUnique({ where: { id: poolId } }),
      prisma.poolMembership.findUnique({
        where: {
          poolId_userId: {
            poolId,
            userId,
          },
        },
      }),
    ]);

    if (!pool) {
      res.status(404).json({ error: 'Pool not found.' });
      return;
    }

    if (!membership || membership.status !== 'ACTIVE') {
      res.status(403).json({ error: 'Active pool membership required.' });
      return;
    }

    // 2. Fetch Game by internal UUID or canonical ESPN event ID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gameId);
    const game = await prisma.game.findFirst({
      where: isUuid
        ? { OR: [{ id: gameId }, { externalGameId: gameId }] }
        : { externalGameId: gameId },
    });

    if (!game) {
      res.status(404).json({ error: 'Game not found.' });
      return;
    }

    // 3. Validate home/away team selection using normalized comparison (Fail-closed)
    const normHome = normalizeTeamCode(game.homeTeamId);
    const normAway = normalizeTeamCode(game.awayTeamId);
    const normSelected = selectedTeamId ? normalizeTeamCode(selectedTeamId) : null;

    if (normSelected) {
      if (normHome === 'UNK' || normAway === 'UNK') {
        res.status(400).json({ error: 'Game participants cannot be verified.' });
        return;
      }

      if (normSelected !== normHome && normSelected !== normAway) {
        res.status(400).json({
          error: `Selected team '${selectedTeamId}' is not a participant in this game (${normAway} @ ${normHome}).`,
        });
        return;
      }
    }

    // 4. Extract lock_offset (in minutes) from pool.settings JSON and evaluate lock status
    const settings = (pool.settings as PoolSettings) || {};
    const lockOffsetMinutes = Number(settings.lock_offset ?? settings.lockOffset ?? 0);

    if (isGameLocked(game.kickoffTime, lockOffsetMinutes)) {
      res.status(403).json({ error: 'Game is locked' });
      return;
    }

    // 5. Upsert pick record using internal game.id and normalized selected team
    const pick = await prisma.pick.upsert({
      where: {
        poolId_userId_gameId: {
          poolId,
          userId,
          gameId: game.id,
        },
      },
      update: {
        selectedTeamId: normSelected,
        submittedById: userId,
      },
      create: {
        poolId,
        userId,
        gameId: game.id,
        selectedTeamId: normSelected,
        submittedById: userId,
      },
    });

    res.status(200).json({
      message: 'Pick saved successfully',
      pick,
    });
  } catch (error: any) {
    console.error('Error saving pick:', error);

    if (error.code === 'P2003') {
      res.status(400).json({ error: 'Invalid pool_id or game_id reference.' });
      return;
    }

    res.status(500).json({ error: 'Failed to save pick.' });
  }
});

/**
 * POST /api/picks/batch
 * Submits or updates multiple picks in bulk for a pool.
 * Accepts: { pool_id, picks: Array<{ game_id, selected_team_id }> }
 */
picksRouter.post('/batch', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const poolId = req.body.pool_id || req.body.poolId;
  const picksList = req.body.picks || [];

  if (!poolId || !Array.isArray(picksList)) {
    res.status(400).json({ error: 'pool_id and picks array are required.' });
    return;
  }

  const userId = req.user!.id;

  try {
    const [pool, membership] = await Promise.all([
      prisma.pool.findUnique({ where: { id: poolId } }),
      prisma.poolMembership.findUnique({
        where: { poolId_userId: { poolId, userId } },
      }),
    ]);

    if (!pool) {
      res.status(404).json({ error: 'Pool not found.' });
      return;
    }

    if (!membership || membership.status !== 'ACTIVE') {
      res.status(403).json({ error: 'Active pool membership required.' });
      return;
    }

    const settings = (pool.settings as PoolSettings) || {};
    const lockOffsetMinutes = Number(settings.lock_offset ?? settings.lockOffset ?? 0);

    const savedPicks = [];
    for (const item of picksList) {
      const rawGameId = item.game_id || item.gameId;
      const rawSelected = item.selected_team_id !== undefined
        ? item.selected_team_id
        : (item.selectedTeamId !== undefined
          ? item.selectedTeamId
          : (item.selected_team !== undefined
            ? item.selected_team
            : (item.selectedTeam !== undefined
              ? item.selectedTeam
              : (item.team_id !== undefined
                ? item.team_id
                : (item.teamId !== undefined
                  ? item.teamId
                  : item.team)))));
      const selectedTeamId = rawSelected !== undefined && rawSelected !== null && String(rawSelected).trim().length > 0
        ? String(rawSelected).trim()
        : null;

      if (!rawGameId) continue;
      const gameId = String(rawGameId).trim();

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gameId);
      const game = await prisma.game.findFirst({
        where: isUuid
          ? { OR: [{ id: gameId }, { externalGameId: gameId }] }
          : { externalGameId: gameId },
      });
      if (!game) continue;

      if (isGameLocked(game.kickoffTime, lockOffsetMinutes)) {
        continue;
      }

      const normHome = normalizeTeamCode(game.homeTeamId);
      const normAway = normalizeTeamCode(game.awayTeamId);
      const normSelected = selectedTeamId ? normalizeTeamCode(selectedTeamId) : null;

      if (normSelected) {
        if (normHome === 'UNK' || normAway === 'UNK' || (normSelected !== normHome && normSelected !== normAway)) {
          continue;
        }
      }

      const pick = await prisma.pick.upsert({
        where: {
          poolId_userId_gameId: {
            poolId,
            userId,
            gameId: game.id,
          },
        },
        update: {
          selectedTeamId: normSelected,
          submittedById: userId,
        },
        create: {
          poolId,
          userId,
          gameId: game.id,
          selectedTeamId: normSelected,
          submittedById: userId,
        },
      });
      savedPicks.push(pick);
    }

    res.status(200).json({
      message: `Batch processed ${savedPicks.length} picks successfully.`,
      count: savedPicks.length,
      picks: savedPicks,
    });
  } catch (error: any) {
    console.error('Error in batch picks:', error);
    res.status(500).json({ error: 'Failed to process batch picks.' });
  }
});

/**
 * Legacy Tiebreaker Routes (/api/picks/tiebreaker)
 * Safely delegated to canonical pool-scoped handlers (Finding 4).
 * Eliminates second write paths, ensuring identical authorization, privacy,
 * kickoff locking, concurrency serialization, and explicit Week 6 2026 unavailability.
 */
picksRouter.get('/tiebreaker', requireAuth, handleGetTiebreaker);
picksRouter.post('/tiebreaker', requireAuth, handlePostTiebreaker);
picksRouter.post('/tiebreaker/override', requireAuth, handlePostTiebreakerOverride);
