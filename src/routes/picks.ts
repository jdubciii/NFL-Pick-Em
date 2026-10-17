import { Router, Request, Response } from 'express';
import prisma from '../db/client';
import { requireAuth } from '../middleware/auth';
import { PoolSettings } from '../types/pool';
import { isGameLocked } from '../services/lockResolver';
import {
  getWeeklyDesignation,
  applyCommissionerOverride,
  freezeDesignation,
} from '../services/weeklyDesignationService';

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
    : req.body.selectedTeamId;

  if (!poolId || !rawGameId) {
    res.status(400).json({ error: 'pool_id and game_id are required fields.' });
    return;
  }

  const gameId = String(rawGameId).trim();
  const selectedTeamId = rawSelectedTeamId && String(rawSelectedTeamId).trim().length > 0
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

    // 3. Validate home/away team selection
    if (selectedTeamId && selectedTeamId !== game.homeTeamId && selectedTeamId !== game.awayTeamId) {
      res.status(400).json({ error: 'Selected team must be the home or away team for this game.' });
      return;
    }

    // 4. Extract lock_offset (in minutes) from pool.settings JSON and evaluate lock status
    const settings = (pool.settings as PoolSettings) || {};
    const lockOffsetMinutes = Number(settings.lock_offset ?? settings.lockOffset ?? 0);

    if (isGameLocked(game.kickoffTime, lockOffsetMinutes)) {
      res.status(403).json({ error: 'Game is locked' });
      return;
    }

    // 5. Upsert pick record using internal game.id
    const pick = await prisma.pick.upsert({
      where: {
        poolId_userId_gameId: {
          poolId,
          userId,
          gameId: game.id,
        },
      },
      update: {
        selectedTeamId,
        submittedById: userId,
      },
      create: {
        poolId,
        userId,
        gameId: game.id,
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
      const rawSelected = item.selected_team_id !== undefined ? item.selected_team_id : item.selectedTeamId;
      const selectedTeamId = rawSelected && String(rawSelected).trim().length > 0
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

      if (selectedTeamId && selectedTeamId !== game.homeTeamId && selectedTeamId !== game.awayTeamId) {
        continue;
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
          selectedTeamId,
          submittedById: userId,
        },
        create: {
          poolId,
          userId,
          gameId: game.id,
          selectedTeamId,
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
 * GET /api/picks/tiebreaker
 * Retrieves tiebreaker status, designated game, kickoff lock, and user prediction.
 * Enforces strict privacy invariant: other members' numeric predictions are NEVER exposed before kickoff.
 */
picksRouter.get('/tiebreaker', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const poolId = (req.query.pool_id || req.query.poolId) as string;
  const weekNumber = Number(req.query.week || req.query.week_number || req.query.weekNumber);
  const season = Number(req.query.season || 2026);

  if (!poolId || isNaN(weekNumber)) {
    res.status(400).json({ error: 'pool_id and week are required query parameters.' });
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

    const games = await prisma.game.findMany();
    const designation = getWeeklyDesignation(pool.settings, season, weekNumber, games as any);

    const userSubmission = await prisma.weeklySubmission.findUnique({
      where: {
        poolId_userId_weekNumber: {
          poolId,
          userId,
          weekNumber,
        },
      },
    });

    const isCommissioner = pool.adminId === userId;
    const kickoffTime = designation.game?.kickoffTime ? new Date(designation.game.kickoffTime) : null;
    const isLocked = kickoffTime ? new Date() >= kickoffTime : false;

    // PRIVACY INVARIANT (Section 6):
    // Before kickoff, other members' numeric predictions are NEVER revealed.
    // Commissioner readiness view only receives submitted/missing flags.
    let readiness: any = null;
    if (isCommissioner) {
      const activeMemberships = await prisma.poolMembership.findMany({
        where: { poolId, status: 'ACTIVE' },
        include: { user: { select: { id: true, email: true } } },
      });

      const allSubmissions = await prisma.weeklySubmission.findMany({
        where: { poolId, weekNumber },
      });
      const subMap = new Map(allSubmissions.map((s) => [s.userId, s]));

      readiness = activeMemberships.map((m) => {
        const sub = subMap.get(m.userId);
        const hasPrediction = sub?.tieBreakerPrediction !== null && sub?.tieBreakerPrediction !== undefined;
        return {
          userId: m.userId,
          email: m.user.email,
          hasSubmitted: hasPrediction,
          // Only expose prediction numeric value if kickoff has passed!
          prediction: isLocked ? (hasPrediction ? Number(sub!.tieBreakerPrediction) : null) : undefined,
        };
      });
    }

    res.status(200).json({
      status: designation.status,
      designatedGame: designation.game,
      eventId: designation.eventId,
      provenance: designation.provenance,
      isFrozen: designation.isFrozen,
      frozenAt: designation.frozenAt,
      kickoffTime: kickoffTime ? kickoffTime.toISOString() : null,
      isLocked,
      userPrediction: userSubmission?.tieBreakerPrediction !== null && userSubmission?.tieBreakerPrediction !== undefined
        ? Number(userSubmission.tieBreakerPrediction)
        : null,
      reason: designation.reason,
      readiness,
    });
  } catch (error: any) {
    console.error('Error fetching tiebreaker info:', error);
    res.status(500).json({ error: 'Failed to retrieve tiebreaker information.' });
  }
});

/**
 * POST /api/picks/tiebreaker
 * Member prediction entry endpoint.
 * Validates range 0.00 to 999.99, max 2 decimals, enforces authoritative server kickoff lock,
 * and triggers designation freeze on first valid prediction.
 */
picksRouter.post('/tiebreaker', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const poolId = req.body.pool_id || req.body.poolId;
  const weekNumber = Number(req.body.week || req.body.week_number || req.body.weekNumber);
  const season = Number(req.body.season || 2026);
  const rawPrediction = req.body.prediction;
  const isClear = req.body.clear === true || rawPrediction === null;

  if (!poolId || isNaN(weekNumber)) {
    res.status(400).json({ error: 'pool_id and week are required fields.' });
    return;
  }

  const userId = req.user!.id;

  try {
    // 1. Verify pool and active membership
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

    // 2. Fetch games and resolve designated tiebreaker game
    const games = await prisma.game.findMany();
    const designation = getWeeklyDesignation(pool.settings, season, weekNumber, games as any);

    if (!designation.game) {
      res.status(400).json({
        error: `Designated tiebreaker game is unavailable (${designation.status}). ${designation.reason || ''}`.trim(),
      });
      return;
    }

    const kickoffTime = new Date(designation.game.kickoffTime);
    const now = new Date();

    // 3. Kickoff lock check (authoritative server-side)
    if (now >= kickoffTime) {
      res.status(403).json({ error: 'KICKOFF_PASSED: Cannot submit, edit, or clear tiebreaker prediction after kickoff.' });
      return;
    }

    // 4. Validate or clear prediction
    let parsedPrediction: number | null = null;

    if (isClear) {
      parsedPrediction = null;
    } else {
      if (rawPrediction === undefined || rawPrediction === '') {
        // Omitted prediction fields preserve existing prediction
        const existing = await prisma.weeklySubmission.findUnique({
          where: { poolId_userId_weekNumber: { poolId, userId, weekNumber } },
        });
        parsedPrediction = existing?.tieBreakerPrediction !== null && existing?.tieBreakerPrediction !== undefined
          ? Number(existing.tieBreakerPrediction)
          : null;
      } else {
        const predStr = String(rawPrediction).trim();
        // Validation: 0.00 through 999.99 with no more than 2 decimal places
        const validFormat = /^(?:0|[1-9]\d{0,2})(?:\.\d{1,2})?$/.test(predStr);
        const numVal = Number(predStr);

        if (!validFormat || isNaN(numVal) || numVal < 0 || numVal > 999.99 || !isFinite(numVal)) {
          res.status(400).json({
            error: 'INVALID_PREDICTION: Prediction must be a valid number between 0.00 and 999.99 with at most two decimal places.',
          });
          return;
        }
        parsedPrediction = Math.round(numVal * 100) / 100;
      }
    }

    // 5. Transactional save with kickoff recheck and freeze rule
    const result = await prisma.$transaction(async (tx) => {
      // Recheck kickoff time inside transaction
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(designation.game!.id);
      const gameCheck = await tx.game.findFirst({
        where: isUuid
          ? { OR: [{ id: designation.game!.id }, { externalGameId: designation.game!.id }] }
          : { externalGameId: designation.game!.id },
      });

      const currentKickoff = gameCheck?.kickoffTime ? new Date(gameCheck.kickoffTime) : kickoffTime;
      if (new Date() >= currentKickoff) {
        throw new Error('KICKOFF_PASSED_TX: Game has already kicked off.');
      }

      // Upsert weekly_submissions
      const submission = await tx.weeklySubmission.upsert({
        where: {
          poolId_userId_weekNumber: {
            poolId,
            userId,
            weekNumber,
          },
        },
        update: {
          tieBreakerPrediction: parsedPrediction,
          updatedAt: new Date(),
        },
        create: {
          poolId,
          userId,
          weekNumber,
          tieBreakerPrediction: parsedPrediction,
          isFinalized: false,
        },
      });

      // Apply Freeze Rule: if a valid prediction was saved and designation not frozen
      if (parsedPrediction !== null && !designation.isFrozen) {
        const freshPool = typeof tx.pool?.findUnique === 'function'
          ? await tx.pool.findUnique({ where: { id: poolId } })
          : pool;
        const currentSettings = freshPool?.settings || pool.settings;
        const currentDesignation = getWeeklyDesignation(currentSettings, season, weekNumber, games as any);

        if (!currentDesignation.isFrozen && typeof tx.pool?.update === 'function') {
          const updatedSettings = freezeDesignation({
            currentSettings,
            season,
            week: weekNumber,
            designatedEventId: currentDesignation.eventId || designation.eventId!,
            firstPredictionUserId: userId,
            games: games as any,
          });

          await tx.pool.update({
            where: { id: poolId },
            data: { settings: updatedSettings },
          });
        }
      }

      return submission;
    });

    res.status(200).json({
      message: isClear ? 'Tiebreaker prediction cleared successfully.' : 'Tiebreaker prediction saved successfully.',
      prediction: parsedPrediction,
      weekNumber,
      designatedGameId: designation.eventId,
      submission: result,
    });
  } catch (error: any) {
    console.error('Error saving tiebreaker prediction:', error);
    if (error.message?.includes('KICKOFF_PASSED')) {
      res.status(403).json({ error: 'KICKOFF_PASSED: Cannot modify tiebreaker prediction after kickoff.' });
      return;
    }
    res.status(500).json({ error: 'Failed to save tiebreaker prediction.' });
  }
});

/**
 * POST /api/picks/tiebreaker/override
 * Commissioner endpoint to override designated tiebreaker game before kickoff.
 */
picksRouter.post('/tiebreaker/override', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const poolId = req.body.pool_id || req.body.poolId;
  const weekNumber = Number(req.body.week || req.body.week_number || req.body.weekNumber);
  const season = Number(req.body.season || 2026);
  const targetGameId = req.body.target_game_id || req.body.targetGameId;

  if (!poolId || isNaN(weekNumber) || !targetGameId) {
    res.status(400).json({ error: 'pool_id, week, and target_game_id are required fields.' });
    return;
  }

  const userId = req.user!.id;

  try {
    const [pool, membership, games] = await Promise.all([
      prisma.pool.findUnique({ where: { id: poolId } }),
      prisma.poolMembership.findUnique({
        where: { poolId_userId: { poolId, userId } },
      }),
      prisma.game.findMany(),
    ]);

    if (!pool) {
      res.status(404).json({ error: 'Pool not found.' });
      return;
    }

    const designation = await prisma.$transaction(async (tx) => {
      const freshPool = await tx.pool.findUnique({ where: { id: poolId } });
      if (!freshPool) {
        throw new Error('NOT_FOUND: Pool not found');
      }

      // Concurrency check: verify no predictions have been submitted for this pool and week
      const existingPredictions = await tx.weeklySubmission.findMany({
        where: {
          poolId,
          weekNumber,
          tieBreakerPrediction: { not: null },
        },
      });

      if (existingPredictions.length > 0) {
        throw new Error('DESIGNATION_FROZEN: Cannot change designated tiebreaker game after predictions have been received');
      }

      const { updatedSettings, designation: newDesignation } = applyCommissionerOverride({
        currentSettings: freshPool.settings,
        season,
        week: weekNumber,
        targetGameId,
        games: games as any,
        requestingUserId: userId,
        poolAdminId: freshPool.adminId,
        isUserActiveMember: membership?.status === 'ACTIVE',
      });

      await tx.pool.update({
        where: { id: poolId },
        data: { settings: updatedSettings },
      });

      return newDesignation;
    });

    res.status(200).json({
      message: 'Designated tiebreaker game updated successfully.',
      designation,
    });
  } catch (error: any) {
    console.error('Error applying commissioner override:', error);
    if (error.message?.startsWith('FORBIDDEN')) {
      res.status(403).json({ error: error.message });
      return;
    }
    if (error.message?.startsWith('DESIGNATION_FROZEN') || error.message?.startsWith('KICKOFF_PASSED')) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: error.message || 'Failed to update tiebreaker designation.' });
  }
});
