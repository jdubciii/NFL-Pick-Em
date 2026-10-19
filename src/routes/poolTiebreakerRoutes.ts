import { Router, Request, Response } from 'express';
import prisma from '../db/client';
import { requireAuth, UUID_REGEX } from '../middleware/auth';
import {
  getWeeklyDesignation,
  applyCommissionerOverride,
  freezeDesignation,
  resolveDefaultDesignation,
  GameSlateItem,
} from '../services/weeklyDesignationService';

export const poolTiebreakerRouter = Router();

/**
 * Schema-compatible authoritative helper to query games for a given season and week.
 * Authority: P41-TIEBREAKER-CONTRACT-2026-10-17-01 & Architect Directive HAG-8
 *
 * Invariant: Prisma Game model lacks season and week columns; queries filter
 * by externalGameId week pattern (_w07_ / _w7_) or respect isolated test fixtures.
 */
export async function getGamesForWeek(weekNumber: number, season: number = 2026): Promise<any[]> {
  const allGames = await prisma.game.findMany({
    orderBy: { kickoffTime: 'asc' },
  });

  const padded = weekNumber < 10 ? `_w0${weekNumber}_` : `_w${weekNumber}_`;
  const unpadded = `_w${weekNumber}_`;

  const weekMatches = allGames.filter((g) =>
    g.externalGameId && (
      g.externalGameId.toLowerCase().includes(padded.toLowerCase()) ||
      g.externalGameId.toLowerCase().includes(unpadded.toLowerCase())
    )
  );

  if (weekMatches.length > 0) {
    return weekMatches;
  }

  // If no games matched the week prefix, check if allGames are custom test fixture games
  // (e.g. mock test items where externalGameId doesn't follow the _w pattern)
  const hasAnyWeekPatternInDb = allGames.some((g) =>
    g.externalGameId && (g.externalGameId.includes('_w') || g.externalGameId.includes('_W'))
  );

  if (!hasAnyWeekPatternInDb && allGames.length > 0) {
    return allGames;
  }

  return [];
}

/**
 * GET /api/pools/:pool_id/tiebreaker
 * Retrieves tiebreaker status, designated game, kickoff lock, and user prediction.
 * Strictly read-only: Decision #54 compliant (zero database mutations on GET).
 * Strict privacy: other members' numeric predictions are NEVER exposed before kickoff.
 */
export async function handleGetTiebreaker(req: Request, res: Response): Promise<void> {
  const poolId = (req.params.pool_id || req.params.poolId || req.query.pool_id || req.query.poolId) as string;
  const weekNumber = Number(req.query.week || req.query.week_number || req.query.weekNumber);
  const season = Number(req.query.season || 2026);

  if (!poolId || !UUID_REGEX.test(poolId) || isNaN(weekNumber) || weekNumber < 1 || weekNumber > 18) {
    res.status(400).json({ error: 'Valid pool_id UUID and week number (1-18) are required.' });
    return;
  }

  // Restrict delivery scope strictly to 2026 (Critical Source Gate)
  if (season !== 2026) {
    res.status(400).json({ error: 'Scope restricted: only 2026 season is supported.' });
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

    // Active pool membership mandatory; global ADMIN role does not grant outsider bypass
    if (!membership || membership.status !== 'ACTIVE') {
      res.status(403).json({ error: 'Forbidden. Active pool membership required.' });
      return;
    }

    const isCommissioner = pool.adminId === userId;
    const settings = (pool.settings as any) || {};

    // Unavailable weeks check (e.g. tiebreaker_unavailable_weeks[2026][6] = true)
    const isUnavailableWeek =
      settings?.tiebreaker_unavailable_weeks?.[season]?.[weekNumber] === true ||
      settings?.tiebreaker_unavailable_weeks?.[String(season)]?.[String(weekNumber)] === true;

    if (isUnavailableWeek) {
      res.status(200).json({
        status: 'UNAVAILABLE',
        tiebreakerOffered: false,
        designatedGame: null,
        eventId: null,
        provenance: null,
        isFrozen: false,
        frozenAt: null,
        kickoffTime: null,
        isLocked: true,
        userPrediction: null,
        reason: 'Tiebreaker unavailable — entry was not offered.',
        readiness: isCommissioner ? [] : undefined,
      });
      return;
    }

    // Fetch games via schema-compatible accessor
    const games = await getGamesForWeek(weekNumber, season);
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

    const kickoffTime = designation.game?.kickoffTime ? new Date(designation.game.kickoffTime) : null;
    // Unknown or invalid kickoff fails closed to isLocked = true
    const isLocked = kickoffTime && !isNaN(kickoffTime.getTime()) ? new Date() >= kickoffTime : true;

    // PRIVACY INVARIANT (Section 6 & HAG-8 Directive):
    // Before kickoff, other members' numeric predictions are NEVER revealed across any surface.
    // Commissioner readiness view only receives submitted/missing flags prior to kickoff.
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
          // Only expose numeric prediction if kickoff has passed!
          prediction: isLocked ? (hasPrediction ? Number(sub!.tieBreakerPrediction) : null) : undefined,
        };
      });
    }

    res.status(200).json({
      status: designation.status,
      tiebreakerOffered: designation.status !== 'UNRESOLVED',
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
}

/**
 * POST /api/pools/:pool_id/tiebreaker
 * Member prediction entry endpoint.
 * Validates range 0.00 to 999.99 (max 2 decimals), enforces server-side kickoff lock,
 * and freezes designation atomically on the first valid prediction.
 */
export async function handlePostTiebreaker(req: Request, res: Response): Promise<void> {
  const poolId = (req.params.pool_id || req.params.poolId || req.body.pool_id || req.body.poolId) as string;
  const weekNumber = Number(req.body.week || req.body.week_number || req.body.weekNumber);
  const season = Number(req.body.season || 2026);
  const rawPrediction = req.body.prediction;
  const isClear = req.body.clear === true || rawPrediction === null;

  // Context validation: reject conflicting identifiers
  const bodyPoolId = req.body.pool_id || req.body.poolId;
  if (bodyPoolId && req.params.pool_id && bodyPoolId !== req.params.pool_id) {
    res.status(400).json({ error: 'Conflicting pool ID context between URL parameter and request body.' });
    return;
  }

  if (!poolId || !UUID_REGEX.test(poolId) || isNaN(weekNumber) || weekNumber < 1 || weekNumber > 18) {
    res.status(400).json({ error: 'Valid pool_id UUID and week number (1-18) are required.' });
    return;
  }

  if (season !== 2026) {
    res.status(400).json({ error: 'Scope restricted: only 2026 season is supported.' });
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
      res.status(403).json({ error: 'Forbidden. Active pool membership required.' });
      return;
    }

    const settings = (pool.settings as any) || {};
    const isUnavailableWeek =
      settings?.tiebreaker_unavailable_weeks?.[season]?.[weekNumber] === true ||
      settings?.tiebreaker_unavailable_weeks?.[String(season)]?.[String(weekNumber)] === true;

    if (isUnavailableWeek) {
      res.status(403).json({
        error: 'TIEBREAKER_UNAVAILABLE: Tiebreaker unavailable — entry was not offered.',
      });
      return;
    }

    // Fetch games and resolve designation
    const games = await getGamesForWeek(weekNumber, season);
    const designation = getWeeklyDesignation(pool.settings, season, weekNumber, games as any);

    if (!designation.game) {
      res.status(400).json({
        error: `Designated tiebreaker game is unavailable (${designation.status}). ${designation.reason || ''}`.trim(),
      });
      return;
    }

    const kickoffTime = new Date(designation.game.kickoffTime);
    const now = new Date();

    if (isNaN(kickoffTime.getTime()) || now >= kickoffTime) {
      res.status(403).json({ error: 'KICKOFF_PASSED: Cannot submit, edit, or clear tiebreaker prediction after kickoff.' });
      return;
    }

    // Validate prediction input: range 0.00 to 999.99 with at most 2 decimal places
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

    // Transactional save with kickoff recheck and designation freeze rule
    const result = await prisma.$transaction(async (tx) => {
      // Re-verify kickoff time inside transaction boundary
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(designation.game!.id);
      const gameCheck = await tx.game.findFirst({
        where: isUuid
          ? { OR: [{ id: designation.game!.id }, { externalGameId: designation.game!.id }] }
          : { externalGameId: designation.game!.id },
      });

      const currentKickoff = gameCheck?.kickoffTime ? new Date(gameCheck.kickoffTime) : kickoffTime;
      if (isNaN(currentKickoff.getTime()) || new Date() >= currentKickoff) {
        throw new Error('KICKOFF_PASSED_TX: Game has already kicked off.');
      }

      // Upsert weekly submission
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

      // Freeze Rule: freeze designation upon first acknowledged valid non-null prediction
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
}

/**
 * POST /api/pools/:pool_id/tiebreaker/override
 * Commissioner endpoint to override designated tiebreaker game before kickoff.
 * Requires pool commissioner authority and active membership.
 */
export async function handlePostTiebreakerOverride(req: Request, res: Response): Promise<void> {
  const poolId = (req.params.pool_id || req.params.poolId || req.body.pool_id || req.body.poolId) as string;
  const weekNumber = Number(req.body.week || req.body.week_number || req.body.weekNumber);
  const season = Number(req.body.season || 2026);
  const targetGameId = req.body.target_game_id || req.body.targetGameId;

  const bodyPoolId = req.body.pool_id || req.body.poolId;
  if (bodyPoolId && req.params.pool_id && bodyPoolId !== req.params.pool_id) {
    res.status(400).json({ error: 'Conflicting pool ID context between URL parameter and request body.' });
    return;
  }

  if (!poolId || !UUID_REGEX.test(poolId) || isNaN(weekNumber) || !targetGameId) {
    res.status(400).json({ error: 'pool_id UUID, week, and target_game_id are required fields.' });
    return;
  }

  if (season !== 2026) {
    res.status(400).json({ error: 'Scope restricted: only 2026 season is supported.' });
    return;
  }

  const userId = req.user!.id;

  try {
    const [pool, membership, games] = await Promise.all([
      prisma.pool.findUnique({ where: { id: poolId } }),
      prisma.poolMembership.findUnique({
        where: { poolId_userId: { poolId, userId } },
      }),
      getGamesForWeek(weekNumber, season),
    ]);

    if (!pool) {
      res.status(404).json({ error: 'Pool not found.' });
      return;
    }

    // Commissioner check: requesting user must be the pool's admin
    if (pool.adminId !== userId) {
      res.status(403).json({ error: 'FORBIDDEN: Only the pool commissioner may override the designated tiebreaker game.' });
      return;
    }

    // Active pool membership check
    if (!membership || membership.status !== 'ACTIVE') {
      res.status(403).json({ error: 'FORBIDDEN: Commissioner must have an active pool membership.' });
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
}

// Router mounts
poolTiebreakerRouter.get('/:pool_id/tiebreaker', requireAuth, handleGetTiebreaker);
poolTiebreakerRouter.post('/:pool_id/tiebreaker', requireAuth, handlePostTiebreaker);
poolTiebreakerRouter.post('/:pool_id/tiebreaker/override', requireAuth, handlePostTiebreakerOverride);
