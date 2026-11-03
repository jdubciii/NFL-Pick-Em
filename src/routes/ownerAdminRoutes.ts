import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../db/client';
import {
  requireAuth,
  requireOwner,
  requirePoolOwnerAccess,
  requirePoolMember,
  getPrismaClient,
} from '../middleware/auth';
import { getGamesForWeek } from './poolTiebreakerRoutes';
import { getWeeklyDesignation, applyCommissionerOverride } from '../services/weeklyDesignationService';
import * as authoritativeSlateService from '../services/authoritativeSlateService';
import {
  calculateProvisionalStandings,
  type SlateGame,
  type UserStandingRef,
  type UserPickItem,
  type TiebreakerData,
} from '../services/sweatProjectionService';
import { type LiveGame } from '../services/liveScoreService';

export const ownerAdminRouter = Router();

/**
 * Computes deterministic SHA-256 fingerprint of pool settings and identity.
 * Governed by Architect Rulings HAG57-OWNER-2026-11-03-01 & -02.
 */
export function computePoolSettingsRevision(pool: { name: string; settings: any }): string {
  const payload = JSON.stringify({
    name: pool.name,
    settings: pool.settings ?? {},
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Helper to validate strict allowlist and common mutation fields.
 */
function validateMutationEnvelope(req: Request, allowedKeys: string[]): {
  valid: boolean;
  reason?: string;
  expectedRevision?: string;
  error?: string;
  code?: string;
} {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Request body must be a JSON object.', code: 'INVALID_PAYLOAD' };
  }

  const allAllowed = new Set([...allowedKeys, 'expectedRevision', 'reason']);
  for (const key of Object.keys(body)) {
    if (!allAllowed.has(key)) {
      return {
        valid: false,
        error: `Unknown field '${key}' rejected by strict allowlist.`,
        code: 'INVALID_CHANGE',
      };
    }
  }

  const expectedRevision = typeof body.expectedRevision === 'string' ? body.expectedRevision.trim() : '';
  if (!expectedRevision) {
    return {
      valid: false,
      error: 'expectedRevision is required and must be a non-empty string.',
      code: 'INVALID_CHANGE',
    };
  }

  const rawReason = body.reason;
  if (typeof rawReason !== 'string' || !rawReason.trim() || rawReason.trim().length > 500) {
    return {
      valid: false,
      error: 'Non-empty reason required (maximum 500 characters).',
      code: 'INVALID_CHANGE',
    };
  }

  return { valid: true, reason: rawReason.trim(), expectedRevision };
}

// ============================================================================
// 1. PUBLIC/MEMBER READ-ONLY PROJECTION: /api/pools/:pool_id/presentation-flags
// ============================================================================
ownerAdminRouter.get('/:pool_id/presentation-flags', requireAuth, requirePoolMember, async (req: Request, res: Response): Promise<void> => {
  res.setHeader('Cache-Control', 'no-store');
  const pool = req.pool;
  const flags = pool?.settings?.owner_admin_v1?.presentationFlags;

  if (!flags || typeof flags !== 'object') {
    res.status(200).json({
      f_sweat_radar: false,
      f_league_press_box: false,
      configured: false,
    });
    return;
  }

  res.status(200).json({
    f_sweat_radar: Boolean(flags.f_sweat_radar),
    f_league_press_box: Boolean(flags.f_league_press_box),
    configured: true,
  });
});

// ============================================================================
// 2. OWNER PROJECTIONS: /api/pools/:pool_id/owner/*
// Strictly read-only; zero database mutations on GET.
// ============================================================================

ownerAdminRouter.get('/:pool_id/owner/overview', requireAuth, requireOwner, requirePoolOwnerAccess, async (req: Request, res: Response): Promise<void> => {
  const pool = req.pool;
  const db = getPrismaClient();

  const memberCount = await db.poolMembership.count({
    where: { poolId: pool.id, status: 'ACTIVE' },
  });

  const currentRevision = computePoolSettingsRevision(pool);
  const flags = pool?.settings?.owner_admin_v1?.presentationFlags;

  res.status(200).json({
    poolId: pool.id,
    name: pool.name,
    status: pool.status,
    adminId: pool.adminId,
    isCommissioner: Boolean(req.isCommissioner),
    memberCount,
    currentRevision,
    presentationFlags: flags
      ? {
          f_sweat_radar: Boolean(flags.f_sweat_radar),
          f_league_press_box: Boolean(flags.f_league_press_box),
          configured: true,
        }
      : {
          f_sweat_radar: false,
          f_league_press_box: false,
          configured: false,
        },
    serverTime: new Date().toISOString(),
  });
});

ownerAdminRouter.get('/:pool_id/owner/games', requireAuth, requireOwner, requirePoolOwnerAccess, async (req: Request, res: Response): Promise<void> => {
  const poolId = String(req.params.pool_id);
  const season = Number(req.query.season) || 2026;
  const weekNumber = Number(req.query.week) || 8;
  const db = getPrismaClient();

  const games = await getGamesForWeek(weekNumber, season, poolId, db);

  res.status(200).json({
    season,
    weekNumber,
    games: games.map((g) => ({
      id: g.id,
      externalGameId: g.externalGameId,
      homeTeamId: g.homeTeamId,
      awayTeamId: g.awayTeamId,
      kickoffTime: g.kickoffTime,
      status: g.status,
      homeScore: g.homeScore,
      awayScore: g.awayScore,
    })),
    liveScoreEditPolicy: 'SIMULATION_ONLY',
    notice: 'Direct manual score and game status modifications are simulation-only. Real games are ingested authoritatively.',
  });
});

ownerAdminRouter.get('/:pool_id/owner/rules', requireAuth, requireOwner, requirePoolOwnerAccess, async (req: Request, res: Response): Promise<void> => {
  const pool = req.pool;
  const season = Number(req.query.season) || 2026;
  const weekNumber = Number(req.query.week) || 8;
  const db = getPrismaClient();

  const games = await getGamesForWeek(weekNumber, season, pool.id, db);
  const designation = getWeeklyDesignation(pool.settings, season, weekNumber, games as any);

  const predictionsCount = await db.weeklySubmission.count({
    where: {
      poolId: pool.id,
      weekNumber,
      tieBreakerPrediction: { not: null },
    },
  });

  res.status(200).json({
    shotTiers: [
      { rankRange: '1st', shots: 0, label: 'SAFE HAVEN' },
      { rankRange: '2nd – 6th', shots: 1, label: 'MIDDLE PACK' },
      { rankRange: '7th – 9th', shots: 2, label: 'THE DROP' },
      { rankRange: 'Last (10th)', shots: 2.5, label: 'THE PIT' },
    ],
    tiebreakRules: [
      '1. Total provisional / final points (higher is better)',
      '2. Absolute distance to tiebreaker game total points (closer is better)',
      '3. At-or-under rule (prediction at or below actual total beats prediction above actual total at equal distance)',
      '4. Shared competition ranks with highest penalty in bracket',
    ],
    tiebreakerStatus: {
      season,
      weekNumber,
      isFrozen: Boolean(designation.isFrozen || predictionsCount > 0),
      designatedGame: designation.game,
      eventId: designation.eventId,
      provenance: designation.provenance,
      predictionsCount,
      isLocked: designation.game?.kickoffTime ? new Date() >= new Date(designation.game.kickoffTime) : true,
    },
  });
});

ownerAdminRouter.get('/:pool_id/owner/flags', requireAuth, requireOwner, requirePoolOwnerAccess, async (req: Request, res: Response): Promise<void> => {
  const pool = req.pool;
  const flags = pool?.settings?.owner_admin_v1?.presentationFlags;

  res.status(200).json({
    presentationFlags: flags
      ? {
          f_sweat_radar: Boolean(flags.f_sweat_radar),
          f_league_press_box: Boolean(flags.f_league_press_box),
          configured: true,
        }
      : {
          f_sweat_radar: false,
          f_league_press_box: false,
          configured: false,
        },
    roadmapFlags: [
      { key: 'f_dynamic_spread', status: 'READ_ONLY', value: false, note: 'Governed by league-wide ATS scoring rules.' },
      { key: 'f_audit_stream', status: 'READ_ONLY', value: true, note: 'Active server audit logger.' },
      { key: 'f_bounty_board', status: 'READ_ONLY', value: false, note: 'Dormant feature gate.' },
    ],
  });
});

// ============================================================================
// 3. OWNER MUTATIONS: /api/pools/:pool_id/owner/*
// Transactional with mandatory row lock, in-tx authority/membership recheck,
// expectedRevision verification, strict allowlist, and mandatory AuditLog.
// ============================================================================

/**
 * Mandatory row-level locking and in-transaction authority re-verification.
 * Fails closed if row lock, active pool, active membership, or commissioner status is unavailable.
 */
async function acquireLockedPoolAndVerifyAuthority(
  tx: any,
  poolId: string,
  actorId: string,
  requireCommish: boolean = true
): Promise<{ freshPool: any; membership: any; isCommissioner: boolean }> {
  if (!tx || typeof tx.$queryRawUnsafe !== 'function') {
    const err: any = new Error('TRANSACTION_LOCK_UNAVAILABLE: Mandatory row-level locking is unavailable.');
    err.statusCode = 500;
    err.code = 'TRANSACTION_LOCK_UNAVAILABLE';
    throw err;
  }

  await tx.$queryRawUnsafe(
    'SELECT id, name, settings, status, admin_id FROM public.pools WHERE id = $1::uuid FOR UPDATE;',
    poolId
  );

  const freshPool = await tx.pool.findUnique({
    where: { id: poolId },
  });

  if (!freshPool || freshPool.status !== 'ACTIVE') {
    const err: any = new Error('Pool not found or inactive.');
    err.statusCode = 404;
    err.code = 'POOL_NOT_FOUND';
    throw err;
  }

  if (!tx.poolMembership || typeof tx.poolMembership.findFirst !== 'function') {
    const err: any = new Error('MEMBERSHIP_SERVICE_UNAVAILABLE: Unable to verify active membership.');
    err.statusCode = 500;
    err.code = 'MEMBERSHIP_SERVICE_UNAVAILABLE';
    throw err;
  }

  const membership = await tx.poolMembership.findFirst({
    where: { poolId, userId: actorId, status: 'ACTIVE' },
  });

  if (!membership) {
    const err: any = new Error('FORBIDDEN: Active pool membership required.');
    err.statusCode = 403;
    err.code = 'ACTIVE_MEMBERSHIP_REQUIRED';
    throw err;
  }

  const isCommissioner = freshPool.adminId === actorId || membership.role === 'COMMISSIONER';
  if (requireCommish && !isCommissioner) {
    const err: any = new Error('FORBIDDEN: Pool commissioner privileges required.');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  return { freshPool, membership, isCommissioner };
}

/**
 * Mandatory audit log creation. Never silently skipped.
 */
async function recordMandatoryAuditLog(
  tx: any,
  entry: {
    actorId: string;
    action: string;
    targetEntityId: string;
    oldValue: any;
    newValue: any;
  }
): Promise<void> {
  if (!tx || !tx.auditLog || typeof tx.auditLog.create !== 'function') {
    const err: any = new Error('AUDIT_LOG_UNAVAILABLE: Mandatory audit log writer is unavailable.');
    err.statusCode = 500;
    err.code = 'AUDIT_LOG_UNAVAILABLE';
    throw err;
  }

  await tx.auditLog.create({ data: entry });
}

ownerAdminRouter.patch('/:pool_id/owner/details', requireAuth, requireOwner, requirePoolOwnerAccess, async (req: Request, res: Response): Promise<void> => {
  const envelope = validateMutationEnvelope(req, ['name']);
  if (!envelope.valid) {
    res.status(422).json({ error: envelope.error, code: envelope.code });
    return;
  }

  const rawName = req.body.name;
  if (typeof rawName !== 'string' || !rawName.trim() || rawName.trim().length > 80) {
    res.status(422).json({
      error: 'Pool name must be a non-empty string between 1 and 80 characters.',
      code: 'INVALID_CHANGE',
    });
    return;
  }
  const newName = rawName.trim();
  const poolId = req.pool.id;
  const actorId = req.user!.id;
  const db = getPrismaClient();

  try {
    const result = await db.$transaction(async (tx: any) => {
      const { freshPool } = await acquireLockedPoolAndVerifyAuthority(tx, poolId, actorId, true);

      const currentRevision = computePoolSettingsRevision(freshPool);
      if (currentRevision !== envelope.expectedRevision) {
        const err: any = new Error('STALE_REVISION: Pool state has changed since last read.');
        err.statusCode = 409;
        err.code = 'STALE_REVISION';
        throw err;
      }

      const updatedPool = await tx.pool.update({
        where: { id: poolId },
        data: { name: newName },
      });

      await recordMandatoryAuditLog(tx, {
        actorId,
        action: 'OWNER_ADMIN_UPDATE_DETAILS',
        targetEntityId: poolId,
        oldValue: { name: freshPool.name, reason: envelope.reason },
        newValue: { name: newName, reason: envelope.reason },
      });

      const newRevision = computePoolSettingsRevision(updatedPool);
      return { pool: updatedPool, newRevision };
    });

    res.status(200).json({
      success: true,
      name: result.pool.name,
      revision: result.newRevision,
    });
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message, code: err.code || 'UPDATE_FAILED' });
  }
});

ownerAdminRouter.patch('/:pool_id/owner/flags', requireAuth, requireOwner, requirePoolOwnerAccess, async (req: Request, res: Response): Promise<void> => {
  const envelope = validateMutationEnvelope(req, ['flags']);
  if (!envelope.valid) {
    res.status(422).json({ error: envelope.error, code: envelope.code });
    return;
  }

  const rawFlags = req.body.flags;
  if (!rawFlags || typeof rawFlags !== 'object' || Array.isArray(rawFlags)) {
    res.status(422).json({
      error: 'flags must be an object with f_sweat_radar and f_league_press_box.',
      code: 'INVALID_CHANGE',
    });
    return;
  }

  const flagKeys = Object.keys(rawFlags);
  const allowedFlagKeys = new Set(['f_sweat_radar', 'f_league_press_box']);
  for (const k of flagKeys) {
    if (!allowedFlagKeys.has(k)) {
      res.status(422).json({
        error: `Unknown flag '${k}' rejected. Only f_sweat_radar and f_league_press_box allowed.`,
        code: 'INVALID_CHANGE',
      });
      return;
    }
  }

  if (typeof rawFlags.f_sweat_radar !== 'boolean' || typeof rawFlags.f_league_press_box !== 'boolean') {
    res.status(422).json({
      error: 'Both f_sweat_radar and f_league_press_box must be boolean values.',
      code: 'INVALID_CHANGE',
    });
    return;
  }

  const poolId = req.pool.id;
  const actorId = req.user!.id;
  const db = getPrismaClient();

  try {
    const result = await db.$transaction(async (tx: any) => {
      const { freshPool } = await acquireLockedPoolAndVerifyAuthority(tx, poolId, actorId, true);

      const currentRevision = computePoolSettingsRevision(freshPool);
      if (currentRevision !== envelope.expectedRevision) {
        const err: any = new Error('STALE_REVISION: Pool settings have changed since last read.');
        err.statusCode = 409;
        err.code = 'STALE_REVISION';
        throw err;
      }

      const existingSettings = (freshPool.settings as any) || {};
      const ownerAdminV1 = existingSettings.owner_admin_v1 || {};

      const oldFlags = ownerAdminV1.presentationFlags || null;
      const newFlags = {
        f_sweat_radar: rawFlags.f_sweat_radar,
        f_league_press_box: rawFlags.f_league_press_box,
        updatedAt: new Date().toISOString(),
      };

      const updatedSettings = {
        ...existingSettings,
        owner_admin_v1: {
          ...ownerAdminV1,
          presentationFlags: newFlags,
        },
      };

      const updatedPool = await tx.pool.update({
        where: { id: poolId },
        data: { settings: updatedSettings },
      });

      await recordMandatoryAuditLog(tx, {
        actorId,
        action: 'OWNER_ADMIN_UPDATE_FLAGS',
        targetEntityId: poolId,
        oldValue: { presentationFlags: oldFlags, reason: envelope.reason },
        newValue: { presentationFlags: newFlags, reason: envelope.reason },
      });

      const newRevision = computePoolSettingsRevision(updatedPool);
      return { newFlags, newRevision };
    });

    res.status(200).json({
      success: true,
      flags: result.newFlags,
      revision: result.newRevision,
    });
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message, code: err.code || 'UPDATE_FAILED' });
  }
});

ownerAdminRouter.post('/:pool_id/owner/tiebreaker-designation', requireAuth, requireOwner, requirePoolOwnerAccess, async (req: Request, res: Response): Promise<void> => {
  const envelope = validateMutationEnvelope(req, ['season', 'seasonType', 'weekNumber', 'targetGameId']);
  if (!envelope.valid) {
    res.status(422).json({ error: envelope.error, code: envelope.code });
    return;
  }

  if (!req.isCommissioner) {
    res.status(403).json({
      error: 'FORBIDDEN: Pool commissioner privileges required to modify tiebreaker designation.',
      code: 'FORBIDDEN',
    });
    return;
  }

  const season = Number(req.body.season);
  const weekNumber = Number(req.body.weekNumber);
  const targetGameId = String(req.body.targetGameId || '').trim();

  if (!Number.isInteger(season) || !Number.isInteger(weekNumber) || !targetGameId) {
    res.status(422).json({
      error: 'season, weekNumber, and targetGameId are required.',
      code: 'INVALID_CHANGE',
    });
    return;
  }

  const poolId = req.pool.id;
  const actorId = req.user!.id;
  const db = getPrismaClient();

  try {
    const result = await db.$transaction(async (tx: any) => {
      const { freshPool } = await acquireLockedPoolAndVerifyAuthority(tx, poolId, actorId, true);

      const currentRevision = computePoolSettingsRevision(freshPool);
      if (currentRevision !== envelope.expectedRevision) {
        const err: any = new Error('STALE_REVISION: Pool settings have changed since last read.');
        err.statusCode = 409;
        err.code = 'STALE_REVISION';
        throw err;
      }

      // 1. Check existing predictions
      const existingPredictions = await tx.weeklySubmission.count({
        where: {
          poolId,
          weekNumber,
          tieBreakerPrediction: { not: null },
        },
      });

      if (existingPredictions > 0) {
        const err: any = new Error('DESIGNATION_FROZEN: Cannot change designated tiebreaker game after predictions have been received.');
        err.statusCode = 409;
        err.code = 'DESIGNATION_FROZEN';
        throw err;
      }

      // 2. Check settings freeze marker
      const currentSettings = (freshPool.settings as any) || {};
      const storedDesignation = currentSettings?.tiebreaker_designations?.[String(season)]?.[String(weekNumber)];
      if (storedDesignation?.isFrozen) {
        const err: any = new Error('DESIGNATION_FROZEN: Designated tiebreaker is already frozen.');
        err.statusCode = 409;
        err.code = 'DESIGNATION_FROZEN';
        throw err;
      }

      // 3. Authoritative games inspection
      const games = await getGamesForWeek(weekNumber, season, poolId, tx);
      const targetGame = games.find((g: any) => String(g.id) === targetGameId || String(g.externalGameId) === targetGameId);
      if (!targetGame) {
        const err: any = new Error(`Target game '${targetGameId}' was not found in accepted games for week ${weekNumber}.`);
        err.statusCode = 422;
        err.code = 'INVALID_CHANGE';
        throw err;
      }

      const now = new Date();
      if (targetGame.kickoffTime && new Date(targetGame.kickoffTime) <= now) {
        const err: any = new Error('KICKOFF_PASSED: Cannot designate a game whose kickoff has already passed.');
        err.statusCode = 422;
        err.code = 'KICKOFF_PASSED';
        throw err;
      }

      // Current designated game must also not have kicked off
      const currentDesig = getWeeklyDesignation(currentSettings, season, weekNumber, games as any);
      if (currentDesig.game?.kickoffTime && new Date(currentDesig.game.kickoffTime) <= now) {
        const err: any = new Error('KICKOFF_PASSED: Cannot change designation after current designated game has kicked off.');
        err.statusCode = 422;
        err.code = 'KICKOFF_PASSED';
        throw err;
      }

      const { updatedSettings, designation: newDesignation } = applyCommissionerOverride({
        currentSettings,
        season,
        week: weekNumber,
        targetGameId,
        games: games as any,
        requestingUserId: actorId,
        poolAdminId: freshPool.adminId,
        isUserActiveMember: true,
      });

      const updatedPool = await tx.pool.update({
        where: { id: poolId },
        data: { settings: updatedSettings },
      });

      await recordMandatoryAuditLog(tx, {
        actorId,
        action: 'OWNER_ADMIN_TIEBREAKER_DESIGNATION',
        targetEntityId: poolId,
        oldValue: { previousDesignation: currentDesig.eventId, reason: envelope.reason },
        newValue: { newDesignation: newDesignation.eventId, reason: envelope.reason },
      });

      // Final in-transaction freeze/lock checks after awaited writes and before commit (HAG57 Section 16 & 20)
      const postWriteNow = new Date();
      if (targetGame.kickoffTime && new Date(targetGame.kickoffTime) <= postWriteNow) {
        const err: any = new Error('KICKOFF_PASSED: Target game kickoff deadline passed during write transaction.');
        err.statusCode = 422;
        err.code = 'KICKOFF_PASSED';
        throw err;
      }
      if (currentDesig.game?.kickoffTime && new Date(currentDesig.game.kickoffTime) <= postWriteNow) {
        const err: any = new Error('KICKOFF_PASSED: Existing designated game kickoff deadline passed during write transaction.');
        err.statusCode = 422;
        err.code = 'KICKOFF_PASSED';
        throw err;
      }
      const postWritePredictions = await tx.weeklySubmission.count({
        where: {
          poolId,
          weekNumber,
          tieBreakerPrediction: { not: null },
        },
      });
      if (postWritePredictions > 0) {
        const err: any = new Error('DESIGNATION_FROZEN: Prediction was received concurrently during write transaction.');
        err.statusCode = 409;
        err.code = 'DESIGNATION_FROZEN';
        throw err;
      }

      const newRevision = computePoolSettingsRevision(updatedPool);
      return { designation: newDesignation, newRevision };
    });

    res.status(200).json({
      success: true,
      designation: result.designation,
      revision: result.newRevision,
    });
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message, code: err.code || 'DESIGNATION_FAILED' });
  }
});

/**
 * Custom pool slate mutation is disabled / fail-closed pending shared scored-slate resolver wiring
 * and serialization against pick/prediction creation (Finding 3 / HAG57 contract).
 */
ownerAdminRouter.put('/:pool_id/owner/slate', requireAuth, requireOwner, requirePoolOwnerAccess, async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({
    error: 'SLATE_MUTATION_DISABLED: Live custom slate modification is disabled pending shared scored-slate resolver wiring and pick serialization contract.',
    code: 'SLATE_MUTATION_DISABLED',
  });
});

// ============================================================================
// 4. SIMULATION ENDPOINT: /api/pools/:pool_id/owner/simulations/preview
// Pure in-memory synthetic evaluator; zero persistence or transport writes.
// Strictly validates bounds: team codes, match IDs, scores, tiebreakers, picks.
// ============================================================================

export const VALID_NFL_TEAMS = new Set([
  'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE',
  'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC',
  'LAC', 'LAR', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG',
  'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WAS'
]);

export function validateSimulationPayload(body: any): { error?: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'Simulation body must be a valid JSON object.' };
  }

  const { scenario, members, simulatedClock } = body;

  if (simulatedClock !== undefined && simulatedClock !== null) {
    if (typeof simulatedClock !== 'string' || isNaN(Date.parse(simulatedClock))) {
      return { error: `malformed simulatedClock: '${simulatedClock}'. Must be a valid ISO 8601 date string.` };
    }
  }

  if (!Array.isArray(scenario) || scenario.length === 0 || scenario.length > 32) {
    return { error: 'scenario must be an array of 1 to 32 synthetic matches.' };
  }

  if (!Array.isArray(members) || members.length === 0 || members.length > 10) {
    return { error: 'members must be an array of 1 to 10 synthetic participants.' };
  }

  const seenMatchIds = new Set<string>();
  const matchTeamMap = new Map<string, { home: string; away: string }>();

  for (let i = 0; i < scenario.length; i++) {
    const m = scenario[i];
    if (!m || typeof m !== 'object') {
      return { error: `scenario[${i}] must be an object.` };
    }

    const rawId = m.id !== undefined && m.id !== null ? String(m.id).trim() : '';
    if (!rawId || !/^[a-zA-Z0-9_-]{1,64}$/.test(rawId)) {
      return { error: `scenario[${i}] has invalid or missing synthetic match ID '${rawId}'. Must match ^[a-zA-Z0-9_-]{1,64}$.` };
    }
    if (seenMatchIds.has(rawId)) {
      return { error: `duplicate synthetic match ID '${rawId}' found in scenario.` };
    }
    seenMatchIds.add(rawId);

    // Reject conflicting team aliases
    if (m.homeTeam !== undefined && m.homeTeamId !== undefined) {
      const ht = String(m.homeTeam).trim().toUpperCase();
      const htid = String(m.homeTeamId).trim().toUpperCase();
      if (ht !== htid) {
        return { error: `scenario[${i}] has conflicting homeTeam ('${m.homeTeam}') and homeTeamId ('${m.homeTeamId}') aliases.` };
      }
    }
    if (m.awayTeam !== undefined && m.awayTeamId !== undefined) {
      const at = String(m.awayTeam).trim().toUpperCase();
      const atid = String(m.awayTeamId).trim().toUpperCase();
      if (at !== atid) {
        return { error: `scenario[${i}] has conflicting awayTeam ('${m.awayTeam}') and awayTeamId ('${m.awayTeamId}') aliases.` };
      }
    }

    const home = String(m.homeTeam || m.homeTeamId || '').trim().toUpperCase();
    const away = String(m.awayTeam || m.awayTeamId || '').trim().toUpperCase();

    if (!VALID_NFL_TEAMS.has(home)) {
      return { error: `scenario[${i}] has invalid home team code '${home}'. Must be one of 32 standard NFL abbreviations.` };
    }
    if (!VALID_NFL_TEAMS.has(away)) {
      return { error: `scenario[${i}] has invalid away team code '${away}'. Must be one of 32 standard NFL abbreviations.` };
    }
    if (home === away) {
      return { error: `scenario[${i}] homeTeam and awayTeam cannot be identical ('${home}').` };
    }

    matchTeamMap.set(rawId, { home, away });

    if (m.homeScore !== undefined && m.homeScore !== null) {
      if (typeof m.homeScore !== 'number' || !Number.isInteger(m.homeScore) || m.homeScore < 0 || m.homeScore > 150) {
        return { error: `scenario[${i}] homeScore must be an integer between 0 and 150.` };
      }
    }

    if (m.awayScore !== undefined && m.awayScore !== null) {
      if (typeof m.awayScore !== 'number' || !Number.isInteger(m.awayScore) || m.awayScore < 0 || m.awayScore > 150) {
        return { error: `scenario[${i}] awayScore must be an integer between 0 and 150.` };
      }
    }

    if (m.status !== undefined && m.status !== null) {
      const st = String(m.status).trim().toUpperCase();
      if (st !== 'SCHEDULED' && st !== 'IN_PROGRESS' && st !== 'FINAL') {
        return { error: `scenario[${i}] status '${m.status}' is invalid. Must be SCHEDULED, IN_PROGRESS, or FINAL.` };
      }
    }
  }

  const seenMemberIds = new Set<string>();

  for (let i = 0; i < members.length; i++) {
    const mem = members[i];
    if (!mem || typeof mem !== 'object') {
      return { error: `members[${i}] must be an object.` };
    }

    // Reject conflicting member aliases
    if (mem.userId !== undefined && mem.id !== undefined) {
      const uid = String(mem.userId).trim();
      const mid = String(mem.id).trim();
      if (uid !== mid) {
        return { error: `members[${i}] has conflicting userId ('${mem.userId}') and id ('${mem.id}') aliases.` };
      }
    }
    if (mem.userName !== undefined && mem.name !== undefined) {
      const uname = String(mem.userName).trim();
      const mname = String(mem.name).trim();
      if (uname !== mname) {
        return { error: `members[${i}] has conflicting userName ('${mem.userName}') and name ('${mem.name}') aliases.` };
      }
    }

    const uid = String(mem.userId || mem.id || '').trim();
    if (!uid || !/^[a-zA-Z0-9_-]{1,64}$/.test(uid)) {
      return { error: `members[${i}] has invalid or missing synthetic member ID '${uid}'. Must match ^[a-zA-Z0-9_-]{1,64}$.` };
    }
    if (seenMemberIds.has(uid)) {
      return { error: `duplicate synthetic member ID '${uid}' found in members.` };
    }
    seenMemberIds.add(uid);

    if (mem.tiebreakerPrediction !== undefined && mem.tiebreakerPrediction !== null) {
      if (
        typeof mem.tiebreakerPrediction !== 'number' ||
        !Number.isFinite(mem.tiebreakerPrediction) ||
        !Number.isInteger(mem.tiebreakerPrediction) ||
        mem.tiebreakerPrediction < 0 ||
        mem.tiebreakerPrediction > 200
      ) {
        return { error: `members[${i}] (${uid}) tiebreakerPrediction must be a finite integer between 0 and 200.` };
      }
    }

    if (mem.picks !== undefined && mem.picks !== null) {
      if (!Array.isArray(mem.picks)) {
        return { error: `members[${i}] (${uid}) picks must be an array.` };
      }

      const seenPicksForGame = new Set<string>();
      for (let pIdx = 0; pIdx < mem.picks.length; pIdx++) {
        const p = mem.picks[pIdx];
        if (!p || typeof p !== 'object') {
          return { error: `members[${i}] pick[${pIdx}] must be an object.` };
        }
        const gid = String(p.gameId || '').trim();
        if (!gid || !seenMatchIds.has(gid)) {
          return { error: `members[${i}] pick[${pIdx}] references unknown match ID '${gid}'.` };
        }
        if (seenPicksForGame.has(gid)) {
          return { error: `members[${i}] duplicate pick for match '${gid}'.` };
        }
        seenPicksForGame.add(gid);

        const selTeam = String(p.selectedTeam || '').trim().toUpperCase();
        const teams = matchTeamMap.get(gid)!;
        if (selTeam !== teams.home && selTeam !== teams.away) {
          return { error: `members[${i}] pick[${pIdx}] selected team '${selTeam}' is neither home ('${teams.home}') nor away ('${teams.away}') in match '${gid}'.` };
        }
      }
    }
  }

  return {};
}

ownerAdminRouter.post('/:pool_id/owner/simulations/preview', requireAuth, requireOwner, requirePoolOwnerAccess, (req: Request, res: Response): void => {
  const validation = validateSimulationPayload(req.body);
  if (validation.error) {
    res.status(422).json({
      error: `INVALID_SIMULATION: ${validation.error}`,
      code: 'INVALID_SIMULATION',
    });
    return;
  }

  const { scenario, members, simulatedClock } = req.body;
  const clockMs = simulatedClock ? new Date(simulatedClock).getTime() : Date.now();

  // Build SlateGame and LiveGame fixtures for pure simulation
  const slateGames: SlateGame[] = scenario.map((m: any, idx: number) => {
    const rawKickoff = m.kickoffTime || new Date(simulatedClock || Date.now()).toISOString();
    return {
      id: String(m.id || `sim-game-${idx + 1}`).trim(),
      homeTeam: String(m.homeTeam || m.homeTeamId).trim().toUpperCase(),
      awayTeam: String(m.awayTeam || m.awayTeamId).trim().toUpperCase(),
      spread: typeof m.spread === 'number' ? m.spread : undefined,
      kickoffTime: rawKickoff,
    };
  });

  const liveGames: LiveGame[] = scenario.map((m: any, idx: number) => {
    const gid = String(m.id || `sim-game-${idx + 1}`).trim();
    const homeTeamCode = String(m.homeTeam || m.homeTeamId).trim().toUpperCase();
    const awayTeamCode = String(m.awayTeam || m.awayTeamId).trim().toUpperCase();
    const homeScore = m.homeScore != null ? String(m.homeScore) : '0';
    const awayScore = m.awayScore != null ? String(m.awayScore) : '0';
    const rawStatus = m.status != null ? String(m.status).trim().toUpperCase() : 'SCHEDULED';

    // Kickoff lock behavior: if simulatedClock is before kickoffTime, matchup has not kicked off yet
    const mKickoffMs = m.kickoffTime ? new Date(m.kickoffTime).getTime() : NaN;
    const isPastKickoff = isNaN(mKickoffMs) || clockMs >= mKickoffMs;
    const effectiveStatus: 'SCHEDULED' | 'IN_PROGRESS' | 'FINAL' =
      !isPastKickoff
        ? 'SCHEDULED'
        : rawStatus === 'FINAL'
          ? 'FINAL'
          : rawStatus === 'IN_PROGRESS'
            ? 'IN_PROGRESS'
            : 'SCHEDULED';

    return {
      id: gid,
      name: `${awayTeamCode} @ ${homeTeamCode}`,
      shortName: `${awayTeamCode} @ ${homeTeamCode}`,
      homeTeam: { code: homeTeamCode, name: homeTeamCode, score: homeScore },
      awayTeam: { code: awayTeamCode, name: awayTeamCode, score: awayScore },
      status: effectiveStatus,
      clock: effectiveStatus === 'FINAL' ? 'FINAL' : '0:00',
      period: effectiveStatus === 'FINAL' ? 4 : 1,
    };
  });

  const userRefs: UserStandingRef[] = members.map((m: any, idx: number) => ({
    id: String(m.userId || m.id || `sim-user-${idx + 1}`).trim(),
    name: String(m.userName || m.name || `Sim Member ${idx + 1}`),
  }));

  const picks: UserPickItem[] = [];
  for (const m of members) {
    const uid = String(m.userId || m.id).trim();
    if (Array.isArray(m.picks)) {
      for (const p of m.picks) {
        picks.push({
          userId: uid,
          gameId: String(p.gameId).trim(),
          selectedTeam: String(p.selectedTeam).trim().toUpperCase(),
          isSubmitted: true,
        });
      }
    }
  }

  const userPredictions: Record<string, number> = {};
  for (const m of members) {
    const uid = String(m.userId || m.id).trim();
    if (m.tiebreakerPrediction != null) {
      userPredictions[uid] = Number(m.tiebreakerPrediction);
    }
  }

  const tbGame = scenario[0];
  const actualTotal =
    tbGame?.homeScore != null && tbGame?.awayScore != null
      ? Number(tbGame.homeScore) + Number(tbGame.awayScore)
      : undefined;

  const tiebreakerData: TiebreakerData = {
    actualTotalScore: actualTotal,
    userPredictions,
  };

  // Compute actual provisional / final standings using real production logic
  const standingsResult = calculateProvisionalStandings(userRefs, slateGames, liveGames, picks, tiebreakerData);
  const allFinal = liveGames.every((g) => g.status === 'FINAL');

  res.status(200).json({
    simulation: true,
    calculatedAt: new Date().toISOString(),
    simulatedClock: simulatedClock || new Date().toISOString(),
    isFinal: allFinal,
    standings: standingsResult.standings || standingsResult,
    gameCount: slateGames.length,
    memberCount: userRefs.length,
    notice: 'SYNTHETIC_SIMULATION: Results computed in-memory using pure production standings engine without persistence.',
  });
});
