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
// 1b. MEMBER READ-ONLY PROJECTION: /api/pools/:pool_id/scoped-slate
// ACTIVE-member guarded scoped slate projection (HAG58-SLATE-2026-11-03-01)
// Strictly read-only; returns VALID_CONFIG, VERIFIED_NO_CUSTOM_CONFIG, or UNAVAILABLE
// ============================================================================
ownerAdminRouter.get('/:pool_id/scoped-slate', requireAuth, requirePoolMember, async (req: Request, res: Response): Promise<void> => {
  res.setHeader('Cache-Control', 'private, no-cache, no-store');
  const pool = req.pool;
  const poolId = pool.id;

  const rawSeason = req.query.season;
  const rawSeasonType = req.query.seasonType;
  const rawWeekNumber = req.query.weekNumber;

  const season = rawSeason !== undefined ? Number(rawSeason) : 2026;
  const seasonType = rawSeasonType !== undefined ? Number(rawSeasonType) : 2;
  const weekNumber = rawWeekNumber !== undefined ? Number(rawWeekNumber) : null;

  if (weekNumber == null || !Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 18) {
    res.status(400).json({ error: 'INVALID_SCOPE: weekNumber must be an integer between 1 and 18.' });
    return;
  }

  // 1. Unshadowable HAG-52 historical scope check (Section 42 & 54)
  if (
    poolId === '9b893bef-3b5a-4ffa-951d-8ba27f9c9782' &&
    season === 2026 &&
    seasonType === 2 &&
    weekNumber === 8
  ) {
    res.status(200).json({
      status: 'VALID_CONFIG',
      scope: { poolId, season, seasonType, weekNumber },
      eventIds: [
        '401873023', '401873024', '401873025', '401873026', '401873027',
        '401873028', '401873029', '401873030', '401873031',
      ],
      version: 1,
      revision: 'hag52-historical-week8',
      isFrozen: true,
      frozenAt: '2026-11-02T02:49:00.000Z',
      description: 'Week 8 commissioner-confirmed 9-game pool slate (HAG-52)',
    });
    return;
  }

  const settings = (pool.settings as any) || {};
  const customSlate = settings?.owner_admin_v1?.slates?.[season]?.[seasonType]?.[weekNumber];
  const freezeRecord = settings?.owner_admin_v1?.freezes?.[season]?.[seasonType]?.[weekNumber];

  if (customSlate) {
    // Validate customSlate integrity:
    // eventIds must be array of strings, non-empty, <= 32, distinct, valid IDs
    if (
      !Array.isArray(customSlate.eventIds) ||
      customSlate.eventIds.length === 0 ||
      customSlate.eventIds.length > 32
    ) {
      res.status(200).json({
        status: 'UNAVAILABLE',
        error: 'MALFORMED_CONFIG',
        details: 'Custom slate eventIds must be a non-empty array with at most 32 events.',
      });
      return;
    }

    const eventIds = customSlate.eventIds.map((id: any) => String(id).trim());
    const validIdRegex = /^[0-9a-zA-Z_-]{1,64}$/;
    const allValid = eventIds.every((id: string) => id.length > 0 && validIdRegex.test(id));
    const uniqueIds = new Set(eventIds);

    if (!allValid || uniqueIds.size !== eventIds.length) {
      res.status(200).json({
        status: 'UNAVAILABLE',
        error: 'MALFORMED_CONFIG',
        details: 'Custom slate contains invalid or duplicate event IDs.',
      });
      return;
    }

    const revision = computePoolSettingsRevision(pool);
    res.status(200).json({
      status: 'VALID_CONFIG',
      scope: { poolId, season, seasonType, weekNumber },
      eventIds,
      version: customSlate.version || 1,
      revision,
      isFrozen: Boolean(freezeRecord),
      frozenAt: freezeRecord?.frozenAt || null,
      description: `Custom pool slate for ${season} W${weekNumber}`,
    });
    return;
  }

  // No custom slate configured -> established default policy (Section 54)
  res.status(200).json({
    status: 'VERIFIED_NO_CUSTOM_CONFIG',
    scope: { poolId, season, seasonType, weekNumber },
    defaultPolicy: 'FULL_MANIFEST',
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
 * Custom pool slate mutation is disabled / fail-closed per HAG57 contract, HAG58-SLATE-2026-11-03-01,
 * and QA ruling (inbox 2026-11-03T19-23-42-078Z-6cf9ba).
 * Live custom slate modification remains disabled (HTTP 501) pending verified writer proof,
 * live external grant audits under HAG-5, and safe enablement.
 *
 * NOTE ON EXTERNAL WRITERS: Repo migration text (20260930020000_br_2c_public_tables_api_lockdown)
 * documents table-level RLS revocations from anon/authenticated, but live database grants
 * and Supabase RPC bypass remain unverified under blocked task HAG-5. Therefore, sole writer
 * status is NOT assumed or asserted, and PUT /owner/slate remains 501 fail-closed in production.
 */
ownerAdminRouter.put(
  '/:pool_id/owner/slate',
  requireAuth,
  requireOwner,
  requirePoolOwnerAccess,
  async (_req: Request, res: Response): Promise<void> => {
    res.status(501).json({
      error: 'SLATE_MUTATION_DISABLED: Live custom slate modification is disabled pending verified writer proof, live grant audits under HAG-5, and safe enablement.',
      code: 'SLATE_MUTATION_DISABLED',
    });
  }
);

/**
 * Hardened Future Slate Mutation Helper (HAG58-SLATE-2026-11-03-01):
 * Fully validates explicit-season provider observation, manifest fingerprint,
 * union deadlines, kickoff-confirmed evidence, authoritative DB clock,
 * pick and submission freeze (with Prisma Pick schema alias resolution),
 * canonical game agreement, and in-transaction audit logging.
 */
export async function executeFutureSlateMutationInternal(
  db: any,
  arg2: any,
  arg3?: any,
  arg4?: any
): Promise<{ slate: any; revision: string }> {
  let poolId: string;
  let actorId: string;
  let envelope: any;
  let observationOverride: any;

  if (typeof arg2 === 'string') {
    poolId = arg2;
    actorId = arg3;
    envelope = arg4;
  } else {
    poolId = arg2.poolId;
    actorId = arg2.actorId;
    envelope = arg2.envelope;
    observationOverride = arg2.observationOverride;
  }

  const season = Number(envelope.season);
  const seasonType = Number(envelope.seasonType ?? 2);
  const weekNumber = Number(envelope.weekNumber);
  const rawEventIds = envelope.eventIds;

  if (
    !Number.isInteger(season) ||
    !Number.isInteger(seasonType) ||
    !Number.isInteger(weekNumber) ||
    !Array.isArray(rawEventIds)
  ) {
    const err: any = new Error('season, weekNumber, and eventIds array are required.');
    err.statusCode = 422;
    err.code = 'INVALID_CHANGE';
    throw err;
  }

  const eventIds = rawEventIds.map(String).map((s) => s.trim()).filter(Boolean);
  if (eventIds.length === 0 || eventIds.length > 32 || new Set(eventIds).size !== eventIds.length) {
    const err: any = new Error('eventIds must be a non-empty unique array of at most 32 canonical game IDs.');
    err.statusCode = 422;
    err.code = 'INVALID_CHANGE';
    throw err;
  }

  const eventIdRegex = /^[a-zA-Z0-9_-]{1,64}$/;
  for (const eid of eventIds) {
    if (!eventIdRegex.test(eid)) {
      const err: any = new Error(`Invalid event ID format '${eid}'. Must be alphanumeric identifier.`);
      err.statusCode = 422;
      err.code = 'INVALID_CHANGE';
      throw err;
    }
  }

  // Historical Scope Protection & Legacy Unverified History Guard (HAG58-SLATE-2026-11-03-01 § Freeze evidence and scope limits)
  // Restrict enablement to authoritatively future, not-yet-started scopes in the current supported season (2026 Regular Season).
  // For legacy scopes whose past participation could have been deleted or history cannot be established, deny as HISTORICAL_SCOPE_UNVERIFIED.
  if (season < 2026 || seasonType !== 2 || (season === 2026 && seasonType === 2 && weekNumber <= 8)) {
    const err: any = new Error(`HISTORICAL_SCOPE_UNVERIFIED: Scope (Season ${season}, Type ${seasonType}, Week ${weekNumber}) is a legacy or completed scope whose historical participation cannot be authoritatively verified. Slate mutation denied.`);
    err.statusCode = 422;
    err.code = 'HISTORICAL_SCOPE_UNVERIFIED';
    throw err;
  }

  // 1. Fetch read-only full ESPN observation outside transaction
  let observation: any = observationOverride;
  if (!observation) {
    try {
      observation = await authoritativeSlateService.fetchAuthoritativeESPNScoreboard({
        seasonYear: season,
        seasonType,
        weekNumber,
      });
    } catch (obsErr: any) {
      const err: any = new Error(`PROVIDER_OBSERVATION_FAILED: Failed to fetch ESPN observation for season ${season} week ${weekNumber}: ${obsErr.message}`);
      err.statusCode = 422;
      err.code = 'UNVERIFIED_PROVIDER_OBSERVATION';
      throw err;
    }
  }

  if (observation.status === 'UNVERIFIED_SOURCE' || !Array.isArray(observation.events) || observation.events.length === 0) {
    const err: any = new Error(`UNVERIFIED_PROVIDER_OBSERVATION: ESPN scoreboard could not be verified for Season ${season} Type ${seasonType} Week ${weekNumber}. Reasons: ${(observation.reasons || []).join('; ')}`);
    err.statusCode = 422;
    err.code = 'UNVERIFIED_PROVIDER_OBSERVATION';
    throw err;
  }

  if (
    observation.seasonYear !== season ||
    observation.seasonType !== seasonType ||
    observation.weekNumber !== weekNumber
  ) {
    const err: any = new Error(`SCOPE_MISMATCH: Provider observation returned scope (${observation.seasonYear}, ${observation.seasonType}, ${observation.weekNumber}) does not match requested scope (${season}, ${seasonType}, ${weekNumber}).`);
    err.statusCode = 422;
    err.code = 'SCOPE_MISMATCH';
    throw err;
  }

  const observationAgeMs = Date.now() - new Date(observation.observationTime).getTime();
  if (isNaN(observationAgeMs) || observationAgeMs > 60000 || observationAgeMs < -60000) {
    const err: any = new Error('EXPIRED_PROVIDER_OBSERVATION: Provider observation age exceeds 60 seconds. Fresh retry required.');
    err.statusCode = 422;
    err.code = 'EXPIRED_PROVIDER_OBSERVATION';
    throw err;
  }

  return await db.$transaction(async (tx: any) => {
    // 2a. Acquire weekly manifest transaction advisory lock FIRST (Ruling § Lock order)
    const weeklyLockKey = `weekly_slate_${season}_${seasonType}_${weekNumber}`;
    if (typeof tx.$queryRawUnsafe === 'function') {
      await tx.$queryRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1));`, weeklyLockKey);
    } else if (typeof tx.$executeRawUnsafe === 'function') {
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1));`, weeklyLockKey);
    }

    // 2b. Mandatory row-level lock on pool and in-tx authority/membership re-verification
    const { freshPool } = await acquireLockedPoolAndVerifyAuthority(tx, poolId, actorId, true);

    // 2c. Revision check
    const currentRevision = computePoolSettingsRevision(freshPool);
    if (currentRevision !== envelope.expectedRevision) {
      const err: any = new Error('STALE_REVISION: Pool settings have changed since last read.');
      err.statusCode = 409;
      err.code = 'STALE_REVISION';
      throw err;
    }

    // 2d. Accepted manifest verification under acquired locks
    const manifest = await authoritativeSlateService.getAcceptedSlateManifest(tx, season, seasonType, weekNumber);
    if (!manifest || !Array.isArray(manifest.eventIds) || manifest.eventIds.length === 0) {
      const err: any = new Error(`Accepted weekly slate manifest not found for Season ${season} Type ${seasonType} Week ${weekNumber}.`);
      err.statusCode = 422;
      err.code = 'UNACCEPTED_MANIFEST';
      throw err;
    }

    const recomputedFingerprint = authoritativeSlateService.computeManifestFingerprint(
      season,
      seasonType,
      weekNumber,
      observation.events
    );
    if (recomputedFingerprint !== manifest.manifestFingerprint) {
      const err: any = new Error('MANIFEST_FINGERPRINT_MISMATCH: Provider observation fingerprint does not match locked accepted manifest fingerprint.');
      err.statusCode = 422;
      err.code = 'MANIFEST_FINGERPRINT_MISMATCH';
      throw err;
    }

    const manifestEventSet = new Set(manifest.eventIds.map(String));
    const obsEventSet = new Set(observation.events.map((e: any) => String(e.externalGameId)));
    if (manifestEventSet.size !== obsEventSet.size || manifest.eventIds.some((id: string) => !obsEventSet.has(String(id)))) {
      const err: any = new Error('MANIFEST_EVENTS_MISMATCH: Observation events do not match accepted manifest events.');
      err.statusCode = 422;
      err.code = 'MANIFEST_EVENTS_MISMATCH';
      throw err;
    }

    for (const eid of eventIds) {
      if (!manifestEventSet.has(eid)) {
        const err: any = new Error(`Event ID '${eid}' is not part of the accepted manifest for Season ${season} Week ${weekNumber}.`);
        err.statusCode = 422;
        err.code = 'INVALID_SLATE_SELECTION';
        throw err;
      }
    }

    // 2d. Freeze check: Settings participation freeze evidence
    const existingSettings = (freshPool.settings as any) || {};
    const storedFreeze = existingSettings?.owner_admin_v1?.freezes?.[season]?.[seasonType]?.[weekNumber];
    if (storedFreeze) {
      const err: any = new Error('SLATE_FROZEN: Participation freeze evidence already recorded for this week. Slate mutation denied.');
      err.statusCode = 409;
      err.code = 'SLATE_FROZEN';
      throw err;
    }

    const storedDesignation = existingSettings?.owner_admin_v1?.designation?.[season]?.[weekNumber];
    if (storedDesignation?.frozenAt) {
      const err: any = new Error('SLATE_FROZEN: Tiebreaker designation is frozen for this week. Slate mutation denied.');
      err.statusCode = 409;
      err.code = 'SLATE_FROZEN';
      throw err;
    }

    // Freeze check: Weekly submissions
    const existingSubmissions = await tx.weeklySubmission.count({
      where: { poolId, weekNumber },
    });
    if (existingSubmissions > 0) {
      const err: any = new Error(`SLATE_FROZEN: Weekly submissions or predictions already exist for week ${weekNumber}. Slate mutation denied.`);
      err.statusCode = 409;
      err.code = 'SLATE_FROZEN';
      throw err;
    }

    // Freeze check: Settled penalty ledger records (Finding 3 & Defect 2: weekNumber in Prisma PenaltyLedger)
    if (typeof tx.penaltyLedger?.count === 'function') {
      const ledgerCount = await tx.penaltyLedger.count({
        where: { poolId, weekNumber },
      });
      if (ledgerCount > 0) {
        const err: any = new Error(`SLATE_FROZEN: Settlement penalty ledger records already exist for week ${weekNumber}. Slate mutation denied.`);
        err.statusCode = 409;
        err.code = 'SLATE_FROZEN';
        throw err;
      }
    }

    // 2e. Union of prior effective slate and proposed slate
    const existingSlateEntry = existingSettings?.owner_admin_v1?.slates?.[season]?.[seasonType]?.[weekNumber];
    const priorEventIds: string[] = Array.isArray(existingSlateEntry?.eventIds) && existingSlateEntry.eventIds.length > 0
      ? existingSlateEntry.eventIds.map(String)
      : manifest.eventIds.map(String);
    const unionEventIds = Array.from(new Set([...priorEventIds, ...eventIds]));

    // 2f. Finding (1) & Defect (1) Resolution: Type-safe Canonical Game query & Alias resolution without casting failure
    const isUuid = (str: string): boolean =>
      typeof str === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    const externalIds = unionEventIds.filter((id: string) => !isUuid(id));
    const inputUuids = unionEventIds.filter((id: string) => isUuid(id));

    const gameQueryOr: any[] = [];
    if (externalIds.length > 0) {
      gameQueryOr.push({ externalGameId: { in: externalIds } });
    }
    if (inputUuids.length > 0) {
      gameQueryOr.push({ id: { in: inputUuids } });
    }

    let canonicalGamesInUnion: any[] = [];
    if (typeof tx.game?.findMany === 'function' && gameQueryOr.length > 0) {
      canonicalGamesInUnion = await tx.game.findMany({
        where: gameQueryOr.length === 1 ? gameQueryOr[0] : { OR: gameQueryOr },
        select: {
          id: true,
          externalGameId: true,
          homeTeamId: true,
          awayTeamId: true,
          kickoffTime: true,
          status: true,
        },
      });
    }

    // Fail closed on ambiguity: verify no multiple canonical rows map to the same externalGameId
    const seenExternalIds = new Set<string>();
    for (const gRow of canonicalGamesInUnion) {
      if (gRow.externalGameId) {
        if (seenExternalIds.has(gRow.externalGameId)) {
          const err: any = new Error(`CANONICAL_GAME_AMBIGUOUS: Multiple canonical Game rows match externalGameId '${gRow.externalGameId}'. Slate mutation denied.`);
          err.statusCode = 422;
          err.code = 'CANONICAL_GAME_AMBIGUOUS';
          throw err;
        }
        seenExternalIds.add(gRow.externalGameId);
      }
    }

    // Collect valid canonical UUIDs only (Game.id is UUID in Prisma schema)
    const canonicalUuids = Array.from(new Set(
      canonicalGamesInUnion
        .map((g: any) => String(g.id))
        .filter((id: string) => isUuid(id))
    ));

    // Freeze check: Any pick row across union (including null picks) (Finding 1 & Defect 1)
    // UUID predicates strictly receive canonical UUIDs; externalGameId predicates query via game relation
    if (typeof tx.pick?.count === 'function') {
      const pickOrClauses: any[] = [];
      if (canonicalUuids.length > 0) {
        pickOrClauses.push({ gameId: { in: canonicalUuids } });
      }
      if (externalIds.length > 0) {
        pickOrClauses.push({ game: { externalGameId: { in: externalIds } } });
      }

      if (pickOrClauses.length > 0) {
        const pickCount = await tx.pick.count({
          where: {
            poolId,
            ...(pickOrClauses.length === 1 ? pickOrClauses[0] : { OR: pickOrClauses }),
          },
        });
        if (pickCount > 0) {
          const err: any = new Error(`SLATE_FROZEN: Picks already exist for week ${weekNumber} or games in slate union. Slate mutation denied.`);
          err.statusCode = 409;
          err.code = 'SLATE_FROZEN';
          throw err;
        }
      }
    }

    // Freeze check: Settled pick results (Finding 3 & Defect 1)
    if (typeof tx.pickResult?.count === 'function') {
      const pickOrClauses: any[] = [];
      if (canonicalUuids.length > 0) {
        pickOrClauses.push({ gameId: { in: canonicalUuids } });
      }
      if (externalIds.length > 0) {
        pickOrClauses.push({ game: { externalGameId: { in: externalIds } } });
      }

      if (pickOrClauses.length > 0) {
        const prCount = await tx.pickResult.count({
          where: {
            pick: {
              poolId,
              ...(pickOrClauses.length === 1 ? pickOrClauses[0] : { OR: pickOrClauses }),
            },
          },
        });
        if (prCount > 0) {
          const err: any = new Error(`SLATE_FROZEN: Settled pick results already exist for games in slate union. Slate mutation denied.`);
          err.statusCode = 409;
          err.code = 'SLATE_FROZEN';
          throw err;
        }
      }
    }

    // 2g. Finding (2) Resolution: Kickoff-confirmed evidence and canonical Game agreement
    const obsEventsByExtId = new Map<string, any>();
    for (const ev of observation.events) {
      obsEventsByExtId.set(String(ev.externalGameId), ev);
    }

    let earliestKickoffMs = Infinity;
    for (const ueid of unionEventIds) {
      const obsEvent = obsEventsByExtId.get(ueid);
      if (!obsEvent || !obsEvent.kickoffTime) {
        const err: any = new Error(`Missing kickoff evidence for event '${ueid}' in slate union.`);
        err.statusCode = 422;
        err.code = 'MISSING_KICKOFF_EVIDENCE';
        throw err;
      }
      if (obsEvent.isKickoffConfirmed !== true) {
        const err: any = new Error(`UNCONFIRMED_KICKOFF: Event '${ueid}' in slate union lacks confirmed kickoff time.`);
        err.statusCode = 422;
        err.code = 'UNCONFIRMED_KICKOFF';
        throw err;
      }
      const kTime = new Date(obsEvent.kickoffTime).getTime();
      if (isNaN(kTime)) {
        const err: any = new Error(`Unparseable kickoff timestamp for event '${ueid}' in slate union.`);
        err.statusCode = 422;
        err.code = 'INVALID_KICKOFF_METADATA';
        throw err;
      }
      if (kTime < earliestKickoffMs) {
        earliestKickoffMs = kTime;
      }
    }

    // Verify canonical Game rows agreement (Finding 2 & Defect 4: reject incomplete or mismatched canonical evidence)
    for (const gRow of canonicalGamesInUnion) {
      if (gRow.status === 'FINAL' || gRow.status === 'IN_PROGRESS') {
        const err: any = new Error(`KICKOFF_PASSED: Game '${gRow.externalGameId || gRow.id}' in slate union is already ${gRow.status}. Slate mutation denied.`);
        err.statusCode = 422;
        err.code = 'KICKOFF_PASSED';
        throw err;
      }

      if (!gRow.externalGameId) {
        const err: any = new Error(`CANONICAL_GAME_MISMATCH: Canonical game row '${gRow.id}' lacks externalGameId.`);
        err.statusCode = 422;
        err.code = 'CANONICAL_GAME_MISMATCH';
        throw err;
      }

      const matchingObs = obsEventsByExtId.get(String(gRow.externalGameId));
      if (!matchingObs) {
        const err: any = new Error(`CANONICAL_GAME_MISMATCH: Canonical game '${gRow.externalGameId}' has no matching provider observation event.`);
        err.statusCode = 422;
        err.code = 'CANONICAL_GAME_MISMATCH';
        throw err;
      }

      if (!gRow.homeTeamId || !gRow.awayTeamId || !gRow.kickoffTime) {
        const err: any = new Error(`CANONICAL_GAME_MISMATCH: Canonical game '${gRow.externalGameId}' has incomplete metadata (missing homeTeamId, awayTeamId, or kickoffTime).`);
        err.statusCode = 422;
        err.code = 'CANONICAL_GAME_MISMATCH';
        throw err;
      }

      if (gRow.homeTeamId !== matchingObs.homeTeamId || gRow.awayTeamId !== matchingObs.awayTeamId) {
        const err: any = new Error(`CANONICAL_GAME_MISMATCH: Team identity mismatch for game '${gRow.externalGameId}' between canonical database row (${gRow.awayTeamId}@${gRow.homeTeamId}) and provider observation (${matchingObs.awayTeamId}@${matchingObs.homeTeamId}).`);
        err.statusCode = 422;
        err.code = 'CANONICAL_GAME_MISMATCH';
        throw err;
      }

      const gTime = new Date(gRow.kickoffTime).getTime();
      const oTime = new Date(matchingObs.kickoffTime).getTime();
      if (isNaN(gTime) || isNaN(oTime) || Math.abs(gTime - oTime) > 60000) {
        const err: any = new Error(`CANONICAL_GAME_MISMATCH: Kickoff timestamp mismatch for game '${gRow.externalGameId}' between canonical database row and provider observation.`);
        err.statusCode = 422;
        err.code = 'CANONICAL_GAME_MISMATCH';
        throw err;
      }

      if (gTime < earliestKickoffMs) {
        earliestKickoffMs = gTime;
      }
    }

    // Retain prior earlier deadlines: if existingSlateEntry had earlier kickoffs in snapshot, retain minimum
    if (Array.isArray(existingSlateEntry?.evidenceSnapshot)) {
      for (const snap of existingSlateEntry.evidenceSnapshot) {
        if (snap?.kickoffTime) {
          const snapTime = new Date(snap.kickoffTime).getTime();
          if (!isNaN(snapTime) && snapTime < earliestKickoffMs) {
            earliestKickoffMs = snapTime;
          }
        }
      }
    }

    // Require valid numeric lock_offset metadata (Finding 2 - no default to 0)
    const rawOffset = existingSettings.lock_offset !== undefined ? existingSettings.lock_offset : existingSettings.lockOffset;
    if (
      rawOffset === undefined ||
      rawOffset === null ||
      typeof rawOffset !== 'number' ||
      !Number.isFinite(rawOffset) ||
      isNaN(rawOffset) ||
      rawOffset < 0
    ) {
      const err: any = new Error('UNVERIFIED_KICKOFF: Pool settings lack valid numeric lock_offset metadata.');
      err.statusCode = 422;
      err.code = 'INVALID_LOCK_OFFSET';
      throw err;
    }
    const lockOffsetMinutes = rawOffset;
    const earliestDeadlineMs = earliestKickoffMs - (lockOffsetMinutes * 60 * 1000);

    // Finding (2) & Defect (3) Resolution: Strict advancing Authoritative DB Clock check (CLOCK_TIMESTAMP())
    const clockRows = await tx.$queryRawUnsafe('SELECT CLOCK_TIMESTAMP() as now;');
    if (!clockRows || !clockRows[0]?.now) {
      const err: any = new Error('DATABASE_CLOCK_UNAVAILABLE: Authoritative advancing database clock query failed under lock.');
      err.statusCode = 500;
      err.code = 'DATABASE_CLOCK_UNAVAILABLE';
      throw err;
    }
    const dbNowMs = new Date(clockRows[0].now).getTime();
    if (isNaN(dbNowMs)) {
      const err: any = new Error('DATABASE_CLOCK_INVALID: Authoritative advancing database clock returned unparseable timestamp.');
      err.statusCode = 500;
      err.code = 'DATABASE_CLOCK_INVALID';
      throw err;
    }

    if (dbNowMs >= earliestDeadlineMs) {
      const err: any = new Error('KICKOFF_PASSED: Earliest lock deadline across slate union has passed. Slate mutation denied.');
      err.statusCode = 422;
      err.code = 'KICKOFF_PASSED';
      throw err;
    }

    // Observation age check against DB clock at write point (Finding 2)
    const finalObsAgeMs = dbNowMs - new Date(observation.observationTime).getTime();
    if (finalObsAgeMs > 60000 || finalObsAgeMs < -60000) {
      const err: any = new Error('EXPIRED_PROVIDER_OBSERVATION: Observation expired during lock acquisition. Fresh retry required.');
      err.statusCode = 422;
      err.code = 'EXPIRED_PROVIDER_OBSERVATION';
      throw err;
    }

    // 2h. Evidence snapshot & Settings update
    const chosenEventSnapshots = eventIds.map((eid: string) => {
      const ev = obsEventsByExtId.get(eid);
      return {
        id: eid,
        homeTeamId: ev?.homeTeamId,
        awayTeamId: ev?.awayTeamId,
        kickoffTime: ev?.kickoffTime,
        isKickoffConfirmed: ev?.isKickoffConfirmed === true,
      };
    });

    const nowIso = new Date(dbNowMs).toISOString();
    const updatedSettings = {
      ...existingSettings,
      owner_admin_v1: {
        ...(existingSettings.owner_admin_v1 || {}),
        slates: {
          ...(existingSettings.owner_admin_v1?.slates || {}),
          [season]: {
            ...(existingSettings.owner_admin_v1?.slates?.[season] || {}),
            [seasonType]: {
              ...(existingSettings.owner_admin_v1?.slates?.[season]?.[seasonType] || {}),
              [weekNumber]: {
                eventIds,
                fingerprint: observation.manifestFingerprint,
                observationTime: observation.observationTime,
                evidenceSnapshot: chosenEventSnapshots,
                version: (existingSlateEntry?.version || 0) + 1,
                updatedAt: nowIso,
                updatedBy: actorId,
                reason: envelope.reason || 'OWNER_ADMIN_UPDATE_SLATE',
              },
            },
          },
        },
      },
    };

    const updatedPool = await tx.pool.update({
      where: { id: poolId },
      data: { settings: updatedSettings },
      select: { id: true, name: true, settings: true },
    });

    // 2i. Mandatory AuditLog within same transaction
    await recordMandatoryAuditLog(tx, {
      actorId,
      action: 'OWNER_ADMIN_UPDATE_SLATE',
      targetEntityId: poolId,
      oldValue: {
        season,
        seasonType,
        weekNumber,
        eventIds: priorEventIds,
        reason: envelope.reason,
      },
      newValue: {
        season,
        seasonType,
        weekNumber,
        eventIds,
        manifestFingerprint: observation.manifestFingerprint,
        reason: envelope.reason,
      },
    });

    // Post-awaited-write advancing authoritative DB clock, deadline, and observation recheck (Section 38 & Defect 3)
    const postClockRows = await tx.$queryRawUnsafe('SELECT CLOCK_TIMESTAMP() as now;');
    if (!postClockRows || !postClockRows[0]?.now) {
      const err: any = new Error('DATABASE_CLOCK_UNAVAILABLE: Authoritative advancing database clock query failed post-write.');
      err.statusCode = 500;
      err.code = 'DATABASE_CLOCK_UNAVAILABLE';
      throw err;
    }
    const postDbNowMs = new Date(postClockRows[0].now).getTime();
    if (isNaN(postDbNowMs)) {
      const err: any = new Error('DATABASE_CLOCK_INVALID: Authoritative advancing database clock returned unparseable timestamp post-write.');
      err.statusCode = 500;
      err.code = 'DATABASE_CLOCK_INVALID';
      throw err;
    }
    if (postDbNowMs >= earliestDeadlineMs) {
      const err: any = new Error('KICKOFF_PASSED: Kickoff deadline crossed during write transaction execution. Slate mutation denied.');
      err.statusCode = 422;
      err.code = 'KICKOFF_PASSED';
      throw err;
    }
    const postObsAgeMs = postDbNowMs - new Date(observation.observationTime).getTime();
    if (postObsAgeMs > 60000 || postObsAgeMs < -60000) {
      const err: any = new Error('EXPIRED_PROVIDER_OBSERVATION: Observation expired during write transaction execution. Fresh retry required.');
      err.statusCode = 422;
      err.code = 'EXPIRED_PROVIDER_OBSERVATION';
      throw err;
    }

    const newRevision = computePoolSettingsRevision(updatedPool);
    return {
      slate: updatedSettings.owner_admin_v1.slates[season][seasonType][weekNumber],
      revision: newRevision,
    };
  });
}

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

  // Derive one effective per-game status from simulatedClock and chosen status
  const effectiveMatches = scenario.map((m: any, idx: number) => {
    const rawStatus = m.status != null ? String(m.status).trim().toUpperCase() : 'SCHEDULED';
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

    const homeTeamCode = String(m.homeTeam || m.homeTeamId).trim().toUpperCase();
    const awayTeamCode = String(m.awayTeam || m.awayTeamId).trim().toUpperCase();
    const homeScore = m.homeScore != null ? String(m.homeScore) : '0';
    const awayScore = m.awayScore != null ? String(m.awayScore) : '0';
    const rawKickoff = m.kickoffTime || new Date(simulatedClock || Date.now()).toISOString();

    return {
      id: String(m.id || `sim-game-${idx + 1}`).trim(),
      homeTeamCode,
      awayTeamCode,
      homeScore,
      awayScore,
      rawKickoff,
      effectiveStatus,
      rawMatch: m,
    };
  });

  // Build SlateGame and LiveGame fixtures using effectiveStatus consistently
  const slateGames: SlateGame[] = effectiveMatches.map((em: any) => ({
    id: em.id,
    homeTeam: em.homeTeamCode,
    awayTeam: em.awayTeamCode,
    spread: typeof em.rawMatch.spread === 'number' ? em.rawMatch.spread : undefined,
    kickoffTime: em.rawKickoff,
    status: em.effectiveStatus,
    isFinal: em.effectiveStatus === 'FINAL',
    homeScore: em.effectiveStatus !== 'SCHEDULED' ? Number(em.homeScore) : undefined,
    awayScore: em.effectiveStatus !== 'SCHEDULED' ? Number(em.awayScore) : undefined,
  }));

  const liveGames: LiveGame[] = effectiveMatches.map((em: any) => ({
    id: em.id,
    name: `${em.awayTeamCode} @ ${em.homeTeamCode}`,
    shortName: `${em.awayTeamCode} @ ${em.homeTeamCode}`,
    homeTeam: { code: em.homeTeamCode, name: em.homeTeamCode, score: em.homeScore },
    awayTeam: { code: em.awayTeamCode, name: em.awayTeamCode, score: em.awayScore },
    status: em.effectiveStatus,
    clock: em.effectiveStatus === 'FINAL' ? 'FINAL' : '0:00',
    period: em.effectiveStatus === 'FINAL' ? 4 : 1,
  }));

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

  // Supply actual tiebreaker total ONLY when designated synthetic game is effectively FINAL
  const tbMatch = effectiveMatches[0];
  const actualTotal =
    tbMatch &&
    tbMatch.effectiveStatus === 'FINAL' &&
    tbMatch.rawMatch.homeScore != null &&
    tbMatch.rawMatch.awayScore != null
      ? Number(tbMatch.rawMatch.homeScore) + Number(tbMatch.rawMatch.awayScore)
      : undefined;

  const tiebreakerData: TiebreakerData = {
    actualTotalScore: actualTotal,
    userPredictions,
  };

  // Compute actual provisional / final standings using real production logic
  const standingsResult = calculateProvisionalStandings(userRefs, slateGames, liveGames, picks, tiebreakerData);
  const allFinal = effectiveMatches.every((em: any) => em.effectiveStatus === 'FINAL');

  res.status(200).json({
    simulation: true,
    calculatedAt: new Date().toISOString(),
    simulatedClock: simulatedClock || new Date().toISOString(),
    isFinal: allFinal,
    standings: standingsResult.standings || standingsResult,
    gameCount: slateGames.length,
    memberCount: userRefs.length,
    tiebreakerTotal: actualTotal ?? null,
    notice: 'SYNTHETIC_SIMULATION: Results computed in-memory using pure production standings engine without persistence.',
  });
});
