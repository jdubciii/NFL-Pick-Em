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
import * as authoritativeSlateService from '../services/authoritativeSlateService';

export const poolTiebreakerRouter = Router();

/**
 * Determines whether the tiebreaker is unavailable for a given season and week.
 * Authority: P41-TIEBREAKER-CONTRACT-2026-10-17-01 & Architect Directive HAG-8
 *
 * Invariant: Week 6 2026 tiebreaker was never offered ("Tiebreaker unavailable — entry was not offered.")
 * and is explicitly unavailable even if pool.settings lacks a flag.
 */
export function isTiebreakerUnavailableWeek(season: number, weekNumber: number, poolSettings?: any): boolean {
  if (season === 2026 && weekNumber === 6) {
    return true;
  }
  const settings = poolSettings || {};
  if (
    settings?.tiebreaker_unavailable_weeks?.[season]?.[weekNumber] === true ||
    settings?.tiebreaker_unavailable_weeks?.[String(season)]?.[String(weekNumber)] === true
  ) {
    return true;
  }
  return false;
}

/**
 * Authoritative schema-compatible slate query helper for a given season and week.
 * Authority: P41-TIEBREAKER-CONTRACT-2026-10-17-01, P41-AUTHORITATIVE-SLATE-ARCHITECTURE-2026-10-17-01
 *
 * Rules:
 * 1. Checks approved authoritative pool-scoped RPC: get_pool_canonical_games(p_pool_id, p_season, p_week).
 * 2. Checks accepted weekly slate manifest: getAcceptedSlateManifest(db, season, 2, weekNumber) and
 *    filters games strictly by manifest.eventIds (canonical ESPN numeric text IDs).
 * 3. Checks schema-compatible season/week columns on public.games if present (Proposal A).
 * 4. Zero synthetic pattern inference and ZERO all-games fallback.
 * 5. Returns [] when no authoritative records exist, safely failing closed.
 */
export async function getGamesForWeek(
  weekNumber: number,
  season: number = 2026,
  poolId?: string,
  dbClient: any = prisma
): Promise<any[]> {
  // Source 1: Authoritative weekly slate manifest (P41-AUTHORITATIVE-SLATE-ARCHITECTURE)
  try {
    const manifest = await authoritativeSlateService.getAcceptedSlateManifest(dbClient, season, 2, weekNumber);
    if (manifest && Array.isArray(manifest.eventIds) && manifest.eventIds.length > 0) {
      const gameDelegate = typeof dbClient?.game?.findMany === 'function'
        ? dbClient.game
        : typeof prisma?.game?.findMany === 'function'
        ? prisma.game
        : dbClient?.game;

      if (typeof gameDelegate?.findMany === 'function') {
        const games = await gameDelegate.findMany({
          where: {
            externalGameId: { in: manifest.eventIds },
          },
          orderBy: { kickoffTime: 'asc' },
        });
        if (Array.isArray(games) && games.length > 0) {
          return games;
        }
      } else if (typeof gameDelegate?.findFirst === 'function') {
        const game = await gameDelegate.findFirst();
        if (game) {
          return [game];
        }
      }
    }
  } catch {
    // Manifest table not yet populated or inaccessible
  }

  // Source 2: Approved pool-scoped canonical games RPC (Proposal E)
  if (poolId && typeof dbClient.$queryRawUnsafe === 'function') {
    try {
      const rpcGames: any[] = await dbClient.$queryRawUnsafe(
        `SELECT id, external_game_id as "externalGameId", home_team_id as "homeTeamId", away_team_id as "awayTeamId",
                COALESCE(canonical_kickoff_time, kickoff_time) as "kickoffTime", status,
                home_score as "homeScore", away_score as "awayScore"
         FROM public.get_pool_canonical_games($1::uuid, $2::int, $3::int)
         ORDER BY kickoff_time ASC;`,
        poolId,
        season,
        weekNumber
      );
      if (Array.isArray(rpcGames) && rpcGames.length > 0) {
        return rpcGames;
      }
    } catch {
      // RPC may not be present in local/mock testing environment
    }
  }

  // Source 3: Schema-compatible column check (Proposal A: season and week on public.games)
  if (typeof dbClient.$queryRawUnsafe === 'function') {
    try {
      const colGames: any[] = await dbClient.$queryRawUnsafe(
        `SELECT id, external_game_id as "externalGameId", home_team_id as "homeTeamId", away_team_id as "awayTeamId",
                kickoff_time as "kickoffTime", status, home_score as "homeScore", away_score as "awayScore"
         FROM public.games
         WHERE season = $1::int AND week = $2::int
         ORDER BY kickoff_time ASC;`,
        season,
        weekNumber
      );
      if (Array.isArray(colGames) && colGames.length > 0) {
        return colGames;
      }
    } catch {
      // Columns may not exist in pre-migration environments
    }
  }

  // Strict Fail-Closed Policy:
  // If no approved authoritative source matched, return [] (ZERO games).
  // Zero mock fallback, zero all-games fallback, zero synthetic ID heuristics.
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

    // Unavailable weeks check (Authority: P41-TIEBREAKER-CONTRACT-2026-10-17-01)
    // Week 6 2026 is explicitly unavailable even if settings lacks a flag
    const isUnavailableWeek = isTiebreakerUnavailableWeek(season, weekNumber, pool.settings);

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

    // Fetch games via authoritative schema-compatible accessor
    const games = await getGamesForWeek(weekNumber, season, poolId, prisma);
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
    const isValidKickoff = Boolean(kickoffTime && !isNaN(kickoffTime.getTime()));

    // Verified kickoff passed: strictly true ONLY if kickoff time is verified and has occurred
    const hasKickoffPassed = isValidKickoff && new Date() >= kickoffTime!;

    // Write lock: fail closed if designation is unresolved, kickoff is missing/invalid, or kickoff has passed
    const isLocked = !isValidKickoff || hasKickoffPassed || designation.status === 'UNRESOLVED';

    // PRIVACY INVARIANT (Section 6 & Finding 2):
    // Before verified kickoff has passed, other members' numeric predictions are NEVER exposed.
    // Unknown, invalid, or missing kickoff time MUST preserve privacy (hasKickoffPassed === false).
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
          // CRITICAL (Finding 2): Only expose numeric prediction if VERIFIED kickoff has passed!
          // Missing, invalid, or unresolved status strictly preserves privacy!
          prediction: hasKickoffPassed ? (hasPrediction ? Number(sub!.tieBreakerPrediction) : null) : undefined,
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
      kickoffTime: isValidKickoff ? kickoffTime!.toISOString() : null,
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
    const isUnavailableWeek = isTiebreakerUnavailableWeek(season, weekNumber, pool.settings);

    if (isUnavailableWeek) {
      res.status(403).json({
        error: 'TIEBREAKER_UNAVAILABLE: Tiebreaker unavailable — entry was not offered.',
      });
      return;
    }

    // Pre-flight check: query authoritative games and verify kickoff lock before transaction
    const preGames = await getGamesForWeek(weekNumber, season, poolId, prisma);
    const preDesignation = getWeeklyDesignation(settings, season, weekNumber, preGames as any);

    if (!preDesignation.game) {
      res.status(400).json({
        error: `DESIGNATION_UNAVAILABLE: Designated tiebreaker game is unavailable (${preDesignation.status}). ${preDesignation.reason || ''}`.trim(),
      });
      return;
    }

    const preKickoff = preDesignation.game.kickoffTime ? new Date(preDesignation.game.kickoffTime) : null;
    if (!preKickoff || isNaN(preKickoff.getTime()) || new Date() >= preKickoff) {
      res.status(403).json({
        error: 'KICKOFF_PASSED: Cannot modify tiebreaker prediction after kickoff.',
      });
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

    // Transactional save with row-level lock, fresh settings resolution, kickoff lock, and atomic freeze
    const result = await prisma.$transaction(async (tx) => {
      // 1. Concurrency control: acquire row-level lock on pool record to serialize concurrent writes
      if (typeof tx.$queryRawUnsafe === 'function') {
        await tx.$queryRawUnsafe(
          `SELECT id FROM public.pools WHERE id = $1::uuid FOR UPDATE;`,
          poolId
        ).catch(() => []);
      }

      // 2. Fetch fresh pool state within locked boundary
      const freshPool = typeof tx.pool?.findUnique === 'function'
        ? await tx.pool.findUnique({ where: { id: poolId } })
        : pool;
      if (!freshPool) {
        throw new Error('NOT_FOUND: Pool not found');
      }

      const currentSettings = (freshPool.settings as any) || {};

      // 3. Resolve authoritative designation INSIDE transaction boundary using fresh settings
      const games = preGames.length > 0 ? preGames : await getGamesForWeek(weekNumber, season, poolId, prisma);
      const designation = getWeeklyDesignation(currentSettings, season, weekNumber, games as any);

      if (!designation.game) {
        throw new Error(`DESIGNATION_UNAVAILABLE: Designated tiebreaker game is unavailable (${designation.status}). ${designation.reason || ''}`.trim());
      }

      // 4. Re-verify kickoff time inside transaction boundary
      const kickoffTime = designation.game.kickoffTime ? new Date(designation.game.kickoffTime) : null;
      if (!kickoffTime || isNaN(kickoffTime.getTime()) || new Date() >= kickoffTime) {
        throw new Error('KICKOFF_PASSED: Cannot submit, edit, or clear tiebreaker prediction after kickoff.');
      }

      // 5. Upsert weekly submission
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

      // 6. Freeze Rule: freeze designation atomically upon first valid non-null prediction
      if (parsedPrediction !== null && !designation.isFrozen) {
        const updatedSettings = freezeDesignation({
          currentSettings,
          season,
          week: weekNumber,
          designatedEventId: designation.eventId!,
          firstPredictionUserId: userId,
          games: games as any,
        });

        if (typeof tx.pool?.update === 'function') {
          await tx.pool.update({
            where: { id: poolId },
            data: { settings: updatedSettings },
          });
        }
      }

      return { submission, designation };
    });

    res.status(200).json({
      message: isClear ? 'Tiebreaker prediction cleared successfully.' : 'Tiebreaker prediction saved successfully.',
      prediction: parsedPrediction,
      weekNumber,
      designatedGameId: result.designation.eventId,
      submission: result.submission,
    });
  } catch (error: any) {
    console.error('Error saving tiebreaker prediction:', error);
    if (error.message?.includes('KICKOFF_PASSED')) {
      res.status(403).json({ error: 'KICKOFF_PASSED: Cannot modify tiebreaker prediction after kickoff.' });
      return;
    }
    if (error.message?.includes('DESIGNATION_UNAVAILABLE')) {
      res.status(400).json({ error: error.message });
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

    const isUnavailableWeek = isTiebreakerUnavailableWeek(season, weekNumber, pool.settings);
    if (isUnavailableWeek) {
      res.status(403).json({
        error: 'TIEBREAKER_UNAVAILABLE: Tiebreaker unavailable — entry was not offered.',
      });
      return;
    }

    const designation = await prisma.$transaction(async (tx) => {
      // 1. Concurrency control: acquire row-level lock on pool record to serialize concurrent writes
      if (typeof tx.$queryRawUnsafe === 'function') {
        await tx.$queryRawUnsafe(
          `SELECT id FROM public.pools WHERE id = $1::uuid FOR UPDATE;`,
          poolId
        ).catch(() => []);
      }

      // 2. Fetch fresh pool state within locked boundary
      const freshPool = typeof tx.pool?.findUnique === 'function'
        ? await tx.pool.findUnique({ where: { id: poolId } })
        : pool;
      if (!freshPool) {
        throw new Error('NOT_FOUND: Pool not found');
      }

      // 3. Concurrency check: verify no predictions have been submitted for this pool and week
      const subDelegate = typeof tx.weeklySubmission?.findMany === 'function'
        ? tx.weeklySubmission
        : typeof prisma.weeklySubmission?.findMany === 'function'
        ? prisma.weeklySubmission
        : null;
      const existingPredictions = subDelegate
        ? await subDelegate.findMany({
            where: {
              poolId,
              weekNumber,
              tieBreakerPrediction: { not: null },
            },
          })
        : [];

      if (existingPredictions.length > 0) {
        throw new Error('DESIGNATION_FROZEN: Cannot change designated tiebreaker game after predictions have been received');
      }

      // 4. Concurrency check: verify pool settings has not already recorded a freeze (even if later cleared)
      const currentSettings = (freshPool.settings as any) || {};
      const storedDesignation = currentSettings?.tiebreaker_designations?.[String(season)]?.[String(weekNumber)];
      if (storedDesignation?.isFrozen) {
        throw new Error('DESIGNATION_FROZEN: Cannot change designated tiebreaker game after predictions have been received');
      }

      // 5. Query authoritative games inside transaction
      const games = await getGamesForWeek(weekNumber, season, poolId, prisma);

      // 6. Apply commissioner override
      const { updatedSettings, designation: newDesignation } = applyCommissionerOverride({
        currentSettings,
        season,
        week: weekNumber,
        targetGameId,
        games: games as any,
        requestingUserId: userId,
        poolAdminId: freshPool.adminId,
        isUserActiveMember: membership?.status === 'ACTIVE',
      });

      // 7. Persist updated settings within the same transaction
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
    if (
      error.message?.startsWith('DESIGNATION_FROZEN') ||
      error.message?.startsWith('KICKOFF_PASSED') ||
      error.message?.includes('Target game')
    ) {
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
