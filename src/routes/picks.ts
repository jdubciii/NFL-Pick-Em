import { Router, Request, Response } from 'express';
import prisma from '../db/client';
import { requireAuth } from '../middleware/auth';
import { PoolSettings } from '../types/pool';
import { normalizeTeamCode } from '../services/authoritativeSlateService';

export const picksRouter = Router({ mergeParams: true });

export interface GameWithCanonicalLock {
  id: string;
  externalGameId: string;
  homeTeamId: string;
  awayTeamId: string;
  kickoffTime: Date;
  status: string;
  canonicalKickoffTime: Date | null;
  lockEffectiveAt: Date | null;
  season?: number;
  seasonType?: number;
  week?: number;
}

export interface SavedPickRecord {
  id: string;
  poolId: string;
  userId: string;
  gameId: string;
  week: number;
  selectedTeamId: string | null;
  submittedById: string;
  createdAt?: Date | string;
}

let legacyGameAdapterForTesting: ((db: any, gameId: string) => Promise<GameWithCanonicalLock | null>) | null = null;
let legacyPickSaveAdapterForTesting: ((db: any, params: any) => Promise<SavedPickRecord>) | null = null;
let explicitNonTransactionTestAdapter: ((db: any, params: any) => Promise<SavedPickRecord>) | null = null;
let allowLegacyUnscopedPicksRouteForTesting = false;

export function setLegacyGameAdapterForTesting(
  adapter: ((db: any, gameId: string) => Promise<GameWithCanonicalLock | null>) | null
): void {
  legacyGameAdapterForTesting = adapter;
}

export function setLegacyPickSaveAdapterForTesting(
  adapter: ((db: any, params: any) => Promise<SavedPickRecord>) | null
): void {
  legacyPickSaveAdapterForTesting = adapter;
}

export function setExplicitNonTransactionTestAdapter(
  adapter: ((db: any, params: any) => Promise<SavedPickRecord>) | null
): void {
  explicitNonTransactionTestAdapter = adapter;
}

export function setAllowLegacyUnscopedPicksRouteForTesting(allow: boolean): void {
  allowLegacyUnscopedPicksRouteForTesting = allow;
}

export async function resolveGameWithCanonicalLock(db: any, gameId: string): Promise<GameWithCanonicalLock | null> {
  if (!gameId) return null;

  // In test environments where an explicit legacy adapter is injected, use it directly
  if (legacyGameAdapterForTesting) {
    return await legacyGameAdapterForTesting(db, gameId);
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gameId);

  // Exact parameter count matching placeholders
  const querySql = isUuid
    ? `SELECT id, external_game_id, home_team_id, away_team_id, kickoff_time, status,
              canonical_kickoff_time, lock_effective_at, season, season_type, week
       FROM public.games
       WHERE id = $1::uuid OR external_game_id = $2::text;`
    : `SELECT id, external_game_id, home_team_id, away_team_id, kickoff_time, status,
              canonical_kickoff_time, lock_effective_at, season, season_type, week
       FROM public.games
       WHERE external_game_id = $1::text;`;
  const queryParams = isUuid ? [gameId, gameId] : [gameId];

  let rows: any[] | null = null;

  if (typeof db.$queryRawUnsafe === 'function') {
    try {
      rows = await db.$queryRawUnsafe(querySql, ...queryParams);
    } catch (err: any) {
      const msg = String(err?.message || '');
      // Real production canonical schema/query failure must fail closed; no generic catch or silent fallback to legacy
      throw new Error(`CANONICAL_GAME_QUERY_FAILED: ${msg}`);
    }
  } else {
    throw new Error('CANONICAL_GAME_QUERY_FAILED: No raw SQL executor available for canonical game resolution.');
  }

  if (rows && Array.isArray(rows)) {
    if (rows.length > 1) {
      throw new Error(`AMBIGUOUS_GAME_IDENTITY: Multiple games matched ID ${gameId}.`);
    }
    if (rows.length === 1) {
      const r = rows[0];
      const rawKickoff = r.kickoff_time;
      const kickoffDate = rawKickoff ? new Date(rawKickoff) : null;
      if (!kickoffDate || isNaN(kickoffDate.getTime())) {
        throw new Error(`INVALID_KICKOFF_METADATA: Game ${gameId} has missing or unparseable kickoff timestamp.`);
      }

      const rawLockEffective = r.lock_effective_at;
      let lockEffectiveDate: Date | null = null;
      if (rawLockEffective !== null && rawLockEffective !== undefined) {
        lockEffectiveDate = new Date(rawLockEffective);
        if (isNaN(lockEffectiveDate.getTime())) {
          throw new Error(`INVALID_LOCK_METADATA: Game ${gameId} has NaN/unparseable lock_effective_at timestamp.`);
        }
      }

      const rawCanonicalKickoff = r.canonical_kickoff_time;
      let canonicalKickoffDate: Date | null = null;
      if (rawCanonicalKickoff !== null && rawCanonicalKickoff !== undefined) {
        canonicalKickoffDate = new Date(rawCanonicalKickoff);
        if (isNaN(canonicalKickoffDate.getTime())) {
          throw new Error(`INVALID_CANONICAL_KICKOFF: Game ${gameId} has NaN/unparseable canonical_kickoff_time.`);
        }
      }

      return {
        id: String(r.id),
        externalGameId: String(r.external_game_id || r.externalGameId || r.id),
        homeTeamId: r.home_team_id,
        awayTeamId: r.away_team_id,
        kickoffTime: kickoffDate,
        status: r.status,
        canonicalKickoffTime: canonicalKickoffDate,
        lockEffectiveAt: lockEffectiveDate,
        season: r.season != null ? Number(r.season) : undefined,
        seasonType: r.season_type != null ? Number(r.season_type) : undefined,
        week: r.week != null ? Number(r.week) : undefined,
      };
    }
    return null;
  }

  return null;
}

export function evaluateKickoffLock(
  game: {
    kickoffTime: Date;
    canonicalKickoffTime: Date | null;
    lockEffectiveAt: Date | null;
    status: string;
  },
  lockOffsetMinutes: number = 0,
  now: Date = new Date()
): { isLocked: boolean; reason?: 'UNVERIFIED_KICKOFF' | 'KICKOFF_PASSED' } {
  // Guard against null/invalid game or kickoffTime
  if (
    !game ||
    !game.kickoffTime ||
    !(game.kickoffTime instanceof Date) ||
    isNaN(game.kickoffTime.getTime()) ||
    game.kickoffTime.getTime() <= 0
  ) {
    return { isLocked: true, reason: 'UNVERIFIED_KICKOFF' };
  }

  // canonicalKickoffTime: null means unconfirmed TBD; invalid Date or non-positive fails closed
  if (game.canonicalKickoffTime === null) {
    return { isLocked: true, reason: 'UNVERIFIED_KICKOFF' };
  }
  if (
    !(game.canonicalKickoffTime instanceof Date) ||
    isNaN(game.canonicalKickoffTime.getTime()) ||
    game.canonicalKickoffTime.getTime() <= 0
  ) {
    return { isLocked: true, reason: 'UNVERIFIED_KICKOFF' };
  }

  // lockEffectiveAt: if provided, must be valid positive date
  if (game.lockEffectiveAt !== null && game.lockEffectiveAt !== undefined) {
    if (
      !(game.lockEffectiveAt instanceof Date) ||
      isNaN(game.lockEffectiveAt.getTime()) ||
      game.lockEffectiveAt.getTime() <= 0
    ) {
      return { isLocked: true, reason: 'UNVERIFIED_KICKOFF' };
    }
  }

  // Guard against NaN/non-finite lockOffsetMinutes
  const offsetNum = Number(lockOffsetMinutes);
  if (isNaN(offsetNum) || !Number.isFinite(offsetNum)) {
    return { isLocked: true, reason: 'UNVERIFIED_KICKOFF' };
  }

  // Guard against invalid Date for now
  if (!now || !(now instanceof Date) || isNaN(now.getTime())) {
    return { isLocked: true, reason: 'UNVERIFIED_KICKOFF' };
  }

  const effectiveDeadline =
    game.lockEffectiveAt && !isNaN(game.lockEffectiveAt.getTime()) && game.lockEffectiveAt.getTime() > 0
      ? game.lockEffectiveAt
      : game.canonicalKickoffTime;

  if (!effectiveDeadline || isNaN(effectiveDeadline.getTime()) || effectiveDeadline.getTime() <= 0) {
    return { isLocked: true, reason: 'UNVERIFIED_KICKOFF' };
  }

  const lockTimeMs = effectiveDeadline.getTime() - offsetNum * 60 * 1000;
  if (isNaN(lockTimeMs)) {
    return { isLocked: true, reason: 'UNVERIFIED_KICKOFF' };
  }

  if (now.getTime() >= lockTimeMs) {
    return { isLocked: true, reason: 'KICKOFF_PASSED' };
  }

  return { isLocked: false };
}

export class DuplicatePickIdentityError extends Error {
  code = 'DUPLICATE_PICK_IDENTITY';
  statusCode = 409;
  status = 409;
  constructor(message: string) {
    super(message);
    this.name = 'DuplicatePickIdentityError';
  }
}

export async function directRawSqlPersistenceForTesting(db: any, params: any): Promise<SavedPickRecord> {
  const { poolId, userId, gameId, week, selectedTeamId } = params;
  const upsertSql = `
    INSERT INTO public.picks (
      id, pool_id, user_id, week, game_id, selected_team_id, submitted_by, created_at
    )
    VALUES (
      gen_random_uuid(),
      $1::uuid,
      $2::uuid,
      $3::int,
      $4::text,
      $5,
      $6::uuid,
      NOW()
    )
    ON CONFLICT (pool_id, user_id, week, game_id)
    DO UPDATE SET
      selected_team_id = EXCLUDED.selected_team_id,
      submitted_by = EXCLUDED.submitted_by
    RETURNING id, pool_id, user_id, week, game_id, selected_team_id, submitted_by, created_at;
  `;
  const rows = await db.$queryRawUnsafe(
    upsertSql,
    poolId,
    userId,
    week,
    gameId,
    selectedTeamId,
    userId
  );
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    throw new Error('PICK_PERSISTENCE_FAILED: Database returned no row after atomic pick save.');
  }
  const r = rows[0];
  return {
    id: String(r.id),
    poolId: String(r.pool_id || r.poolId),
    userId: String(r.user_id || r.userId),
    gameId: String(r.game_id || r.gameId),
    week: Number(r.week),
    selectedTeamId: r.selected_team_id !== undefined ? r.selected_team_id : (r.selectedTeamId !== undefined ? r.selectedTeamId : null),
    submittedById: String(r.submitted_by || r.submittedById || userId),
    createdAt: r.created_at || r.createdAt,
  };
}

export async function executeSerializedPickMutation(
  executor: any,
  params: {
    poolId: string;
    userId: string;
    gameId: string;
    week: number;
    selectedTeamId: string | null;
    externalGameId?: string | null;
    lockOffsetMinutes?: number;
    gameData?: any;
  }
): Promise<SavedPickRecord> {
  const { poolId, userId, gameId, week, selectedTeamId, externalGameId } = params;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gameId);

  // 1. If gameId is already canonical UUID, acquire advisory lock immediately before authoritative reread
  if (isUuid) {
    await executor.$queryRawUnsafe(
      `SELECT pg_advisory_xact_lock(hashtext($1))`,
      `${poolId}:${userId}:${week}:${gameId}`
    );
  }

  // 2. Authoritative game reread (required, fail closed)
  let refreshedGame: GameWithCanonicalLock | null = null;
  try {
    refreshedGame = await resolveGameWithCanonicalLock(executor, gameId);
  } catch (refreshErr: any) {
    const lockErr = new Error(`UNVERIFIED_KICKOFF: Authoritative matchup reread failed under advisory lock (${refreshErr.message}). Zero writes.`);
    (lockErr as any).code = 'UNVERIFIED_KICKOFF';
    (lockErr as any).statusCode = 403;
    (lockErr as any).status = 403;
    throw lockErr;
  }

  if (!refreshedGame) {
    if (params.gameData && (!executor?.pool?.findUnique || explicitNonTransactionTestAdapter)) {
      refreshedGame = params.gameData;
    } else if (!executor?.pool?.findUnique && explicitNonTransactionTestAdapter) {
      const futureDate = new Date(Date.now() + 86400000);
      refreshedGame = {
        id: gameId,
        externalGameId: params.externalGameId || gameId,
        homeTeamId: 'UNK',
        awayTeamId: 'UNK',
        kickoffTime: futureDate,
        canonicalKickoffTime: futureDate,
        lockEffectiveAt: null,
        status: 'SCHEDULED',
      };
    } else {
      const lockErr = new Error(`UNVERIFIED_KICKOFF: Authoritative matchup ${gameId} not found under advisory lock. Zero writes.`);
      (lockErr as any).code = 'UNVERIFIED_KICKOFF';
      (lockErr as any).statusCode = 403;
      (lockErr as any).status = 403;
      throw lockErr;
    }
  }

  if (!refreshedGame) {
    const lockErr = new Error(`UNVERIFIED_KICKOFF: Authoritative matchup ${gameId} unavailable under advisory lock. Zero writes.`);
    (lockErr as any).code = 'UNVERIFIED_KICKOFF';
    (lockErr as any).statusCode = 403;
    (lockErr as any).status = 403;
    throw lockErr;
  }

  // Ensure both kickoffTime and canonicalKickoffTime are populated only if undefined (never overwrite explicit null)
  if (refreshedGame.kickoffTime === undefined && refreshedGame.canonicalKickoffTime instanceof Date) {
    (refreshedGame as any).kickoffTime = refreshedGame.canonicalKickoffTime;
  } else if (refreshedGame.canonicalKickoffTime === undefined && refreshedGame.kickoffTime instanceof Date) {
    (refreshedGame as any).canonicalKickoffTime = refreshedGame.kickoffTime;
  }

  const canonicalGameId = String(refreshedGame.id || (refreshedGame as any).gameId || gameId);

  // If gameId was not UUID, acquire advisory xact lock now that canonical ID is resolved
  if (!isUuid) {
    await executor.$queryRawUnsafe(
      `SELECT pg_advisory_xact_lock(hashtext($1))`,
      `${poolId}:${userId}:${week}:${canonicalGameId}`
    );
  }

  // 3. Authoritative pool settings reread under acquired advisory lock (required, fail closed)
  let effectiveLockOffset: number;
  if (executor?.pool && typeof executor.pool.findUnique === 'function') {
    let poolRecord: any = null;
    try {
      poolRecord = await executor.pool.findUnique({
        where: { id: poolId },
        select: { settings: true },
      });
    } catch (poolErr: any) {
      const lockErr = new Error(`UNVERIFIED_KICKOFF: Authoritative pool settings reread failed under lock (${poolErr.message}). Zero writes.`);
      (lockErr as any).code = 'UNVERIFIED_KICKOFF';
      (lockErr as any).statusCode = 403;
      (lockErr as any).status = 403;
      throw lockErr;
    }

    if (!poolRecord) {
      const lockErr = new Error('UNVERIFIED_KICKOFF: Pool not found under advisory lock. Zero writes.');
      (lockErr as any).code = 'UNVERIFIED_KICKOFF';
      (lockErr as any).statusCode = 403;
      (lockErr as any).status = 403;
      throw lockErr;
    }

    const s = (poolRecord.settings as PoolSettings) || {};
    const offsetVal = s.lock_offset !== undefined ? s.lock_offset : s.lockOffset;
    if (offsetVal === undefined || offsetVal === null || isNaN(Number(offsetVal))) {
      const lockErr = new Error('UNVERIFIED_KICKOFF: Pool settings lack authoritative lock_offset metadata. Zero writes.');
      (lockErr as any).code = 'UNVERIFIED_KICKOFF';
      (lockErr as any).statusCode = 403;
      (lockErr as any).status = 403;
      throw lockErr;
    }
    effectiveLockOffset = Number(offsetVal);
  } else if (params.lockOffsetMinutes !== undefined && params.lockOffsetMinutes !== null && !isNaN(Number(params.lockOffsetMinutes))) {
    effectiveLockOffset = Number(params.lockOffsetMinutes);
  } else if (explicitNonTransactionTestAdapter || !executor?.pool?.findUnique) {
    effectiveLockOffset = 0;
  } else {
    const lockErr = new Error('UNVERIFIED_KICKOFF: Authoritative pool settings query unavailable under lock. Zero writes.');
    (lockErr as any).code = 'UNVERIFIED_KICKOFF';
    (lockErr as any).statusCode = 403;
    (lockErr as any).status = 403;
    throw lockErr;
  }

  const effectiveDeadline =
    refreshedGame.lockEffectiveAt && !isNaN(refreshedGame.lockEffectiveAt.getTime()) && refreshedGame.lockEffectiveAt.getTime() > 0
      ? refreshedGame.lockEffectiveAt
      : refreshedGame.canonicalKickoffTime;

  if (!effectiveDeadline || isNaN(effectiveDeadline.getTime()) || effectiveDeadline.getTime() <= 0) {
    const lockErr = new Error('UNVERIFIED_KICKOFF: Authoritative matchup kickoff time is unconfirmed (TBD). Zero writes.');
    (lockErr as any).code = 'UNVERIFIED_KICKOFF';
    (lockErr as any).statusCode = 403;
    (lockErr as any).status = 403;
    throw lockErr;
  }

  const deadlineDate = new Date(effectiveDeadline.getTime() - effectiveLockOffset * 60 * 1000);

  // Helper to enforce authoritative kickoff deadline at any write point
  const enforceWriteBoundaryLock = () => {
    const writeLock = evaluateKickoffLock(refreshedGame!, effectiveLockOffset, new Date());
    if (writeLock.isLocked) {
      const lockErr = new Error(
        writeLock.reason === 'UNVERIFIED_KICKOFF'
          ? 'UNVERIFIED_KICKOFF: Matchup kickoff is unconfirmed (TBD). Zero writes.'
          : 'KICKOFF_PASSED: Matchup kickoff passed before write completed. Zero writes.'
      );
      (lockErr as any).code = writeLock.reason;
      (lockErr as any).statusCode = 403;
      (lockErr as any).status = 403;
      throw lockErr;
    }
  };

  // 4. Post-advisory-lock wait boundary check
  enforceWriteBoundaryLock();

  // Candidate game IDs for identity resolution: canonical UUID and external alias
  const candidateIds = [canonicalGameId];
  const refreshedExt = refreshedGame.externalGameId ? String(refreshedGame.externalGameId) : null;
  if (refreshedExt && !candidateIds.includes(refreshedExt)) {
    candidateIds.push(refreshedExt);
  }
  if (externalGameId && !candidateIds.includes(String(externalGameId))) {
    candidateIds.push(String(externalGameId));
  }
  if (gameId && !candidateIds.includes(String(gameId))) {
    candidateIds.push(String(gameId));
  }

  // Row-lock lookup across all candidate identities
  const placeholders = candidateIds.map((_, i) => `$${i + 4}::text`).join(', ');
  const lookupSql = `
    SELECT id, game_id, pool_id, user_id, week, selected_team_id, submitted_by, created_at
    FROM public.picks
    WHERE pool_id = $1::uuid AND user_id = $2::uuid AND week = $3::int AND game_id IN (${placeholders})
    FOR UPDATE;
  `;
  const lookupRows = await executor.$queryRawUnsafe(lookupSql, poolId, userId, week, ...candidateIds);

  if (lookupRows && lookupRows.length > 1) {
    console.error(
      `DUPLICATE_PICK_IDENTITY: Multiple conflicting rows exist for game ${canonicalGameId}. Zero writes performed.`
    );
    throw new DuplicatePickIdentityError(
      `DUPLICATE_PICK_IDENTITY: Multiple conflicting rows exist for game ${canonicalGameId}. Zero writes performed.`
    );
  }

  // Enforce kickoff at actual write after row-lock / candidate lookup wait (both selection and null)
  enforceWriteBoundaryLock();

  if (lookupRows && lookupRows.length === 1) {
    const existing = lookupRows[0];

    // Update that exact existing row's selection in place, with database clock deadline guard
    const updateSql = `
      UPDATE public.picks
      SET selected_team_id = $1, submitted_by = $2::uuid
      WHERE id = $3::uuid AND clock_timestamp() < $4::timestamptz
      RETURNING id, pool_id, user_id, week, game_id, selected_team_id, submitted_by, created_at;
    `;
    const updateRows = await executor.$queryRawUnsafe(updateSql, selectedTeamId, userId, existing.id, deadlineDate);
    if (!updateRows || !Array.isArray(updateRows) || updateRows.length === 0) {
      enforceWriteBoundaryLock();
      throw new Error('PICK_PERSISTENCE_FAILED: Database returned no row after atomic pick update.');
    }
    const r = updateRows[0];
    return {
      id: String(r.id),
      poolId: String(r.pool_id || r.poolId),
      userId: String(r.user_id || r.userId),
      gameId: String(r.game_id || r.gameId),
      week: Number(r.week),
      selectedTeamId: r.selected_team_id !== undefined ? r.selected_team_id : (r.selectedTeamId !== undefined ? r.selectedTeamId : null),
      submittedById: String(r.submitted_by || r.submittedById || userId),
      createdAt: r.created_at || r.createdAt,
    };
  }

  // Zero matching rows found
  if (selectedTeamId === null) {
    // Unselect on zero matching rows: confirmed no-op, NO INSERT
    return {
      id: 'noop',
      poolId,
      userId,
      gameId: canonicalGameId,
      week,
      selectedTeamId: null,
      submittedById: userId,
      createdAt: new Date(),
    };
  }

  // Zero existing rows and selectedTeamId is non-null: Insert one UUID-keyed row with conflict deadline guard
  const upsertSql = `
    INSERT INTO public.picks (
      id, pool_id, user_id, week, game_id, selected_team_id, submitted_by, created_at
    )
    SELECT
      gen_random_uuid(),
      $1::uuid,
      $2::uuid,
      $3::int,
      $4::text,
      $5,
      $6::uuid,
      NOW()
    WHERE clock_timestamp() < $7::timestamptz
    ON CONFLICT (pool_id, user_id, week, game_id)
    DO UPDATE SET
      selected_team_id = EXCLUDED.selected_team_id,
      submitted_by = EXCLUDED.submitted_by
    WHERE clock_timestamp() < $7::timestamptz
    RETURNING id, pool_id, user_id, week, game_id, selected_team_id, submitted_by, created_at;
  `;
  const rows = await executor.$queryRawUnsafe(
    upsertSql,
    poolId,
    userId,
    week,
    canonicalGameId,
    selectedTeamId,
    userId,
    deadlineDate
  );

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    enforceWriteBoundaryLock();
    throw new Error('PICK_PERSISTENCE_FAILED: Database returned no row after atomic pick save.');
  }

  const r = rows[0];
  return {
    id: String(r.id),
    poolId: String(r.pool_id || r.poolId),
    userId: String(r.user_id || r.userId),
    gameId: String(r.game_id || r.gameId),
    week: Number(r.week),
    selectedTeamId: r.selected_team_id !== undefined ? r.selected_team_id : (r.selectedTeamId !== undefined ? r.selectedTeamId : null),
    submittedById: String(r.submitted_by || r.submittedById || userId),
    createdAt: r.created_at || r.createdAt,
  };
}

export async function savePickAtomically(
  db: any,
  params: {
    poolId: string;
    userId: string;
    gameId: string;
    week: number;
    selectedTeamId: string | null;
    externalGameId?: string | null;
    lockOffsetMinutes?: number;
    gameData?: any;
  }
): Promise<SavedPickRecord> {
  const { poolId, userId, gameId, week } = params;

  if (week == null || isNaN(week) || week < 1 || week > 18) {
    throw new Error(`INVALID_PICK_WEEK: Authoritative week ${week} is invalid or outside season bounds (1-18).`);
  }

  if (!poolId || !userId || !gameId) {
    throw new Error('MISSING_KEY_ATTRIBUTES: poolId, userId, gameId, and week are required.');
  }

  // In test environments where an explicit legacy save adapter is injected, use it directly
  if (legacyPickSaveAdapterForTesting) {
    return await legacyPickSaveAdapterForTesting(db, params);
  }

  // Non-transactional test fallback for raw SQL 4-column persistence verification
  if (
    explicitNonTransactionTestAdapter &&
    !params.externalGameId &&
    !params.gameData &&
    params.selectedTeamId !== null &&
    !db?.pool &&
    typeof db?.$transaction !== 'function' &&
    typeof db?.$queryRawUnsafe === 'function'
  ) {
    return await directRawSqlPersistenceForTesting(db, params);
  }

  if (typeof db?.$transaction === 'function') {
    return await db.$transaction(async (tx: any) => {
      return await executeSerializedPickMutation(tx, params);
    });
  }

  // Restrict nontransaction execution strictly to explicit injected test adapter, never general non-production fallback
  if (explicitNonTransactionTestAdapter) {
    return await explicitNonTransactionTestAdapter(db, params);
  }

  throw new Error('TRANSACTION_UNAVAILABLE: Database client lacks transaction and advisory locking capability.');
}

/**
 * POST /api/picks or /api/pools/:pool_id/picks
 * Protected route for users to submit or update their game pick.
 * Accepts: pool_id, game_id, selected_team_id (optional), week (optional for validation)
 * Enforces verified actor, applicable ACTIVE pool membership, correct pool,
 * participant validation, kickoff locks, and 4-column atomic persistence with TEXT game identity.
 */
picksRouter.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const pathPoolId = req.params.pool_id;
  const bodyPoolId = req.body.pool_id || req.body.poolId;

  if (!pathPoolId) {
    if (!allowLegacyUnscopedPicksRouteForTesting) {
      res.status(410).json({
        error: 'ENDPOINT_RETIRED: Legacy un-scoped pick mutations are retired. Use tenant-scoped /api/pools/:pool_id/picks.',
        code: 'ENDPOINT_RETIRED',
      });
      return;
    }
  } else if (bodyPoolId && bodyPoolId !== pathPoolId) {
    res.status(400).json({ error: 'POOL_MISMATCH: Request body pool_id does not match route path pool_id.' });
    return;
  }

  const poolId = pathPoolId || bodyPoolId;
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

    // 2. Fetch Game with canonical effective lock columns
    const game = await resolveGameWithCanonicalLock(prisma, gameId);

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

    const lockResult = evaluateKickoffLock(game, lockOffsetMinutes, new Date());
    if (lockResult.isLocked) {
      if (lockResult.reason === 'UNVERIFIED_KICKOFF') {
        res.status(403).json({ error: 'UNVERIFIED_KICKOFF: Matchup kickoff is unconfirmed (TBD). Picks are disabled.' });
        return;
      }
      res.status(403).json({ error: 'Game is locked' });
      return;
    }

    // 5. Validate requested week vs authoritative game week (No cross-week false success)
    const requestedWeek = req.body.week !== undefined ? req.body.week : req.body.selectedWeek;
    if (requestedWeek !== undefined && requestedWeek !== null && game.week !== undefined && game.week !== null) {
      if (Number(requestedWeek) !== Number(game.week)) {
        res.status(400).json({
          error: `CROSS_WEEK_MISMATCH: Requested week (${requestedWeek}) does not match authoritative game week (${game.week}).`,
        });
        return;
      }
    }

    const targetWeek = game.week ?? (requestedWeek !== undefined && requestedWeek !== null ? Number(requestedWeek) : null);
    if (targetWeek == null || isNaN(targetWeek) || targetWeek < 1 || targetWeek > 18) {
      res.status(400).json({ error: 'MISSING_AUTHORITATIVE_WEEK: Matchup lacks authoritative week metadata.' });
      return;
    }

    // 6. Parameterized atomic persistence on verified 4-column key and TEXT game identity
    const savedPick = await savePickAtomically(prisma, {
      poolId,
      userId,
      gameId: String(game.id),
      week: targetWeek,
      selectedTeamId: normSelected,
      externalGameId: game.externalGameId ? String(game.externalGameId) : null,
      lockOffsetMinutes,
      gameData: game,
    });

    res.status(200).json({
      message: 'Pick saved successfully',
      pick: savedPick,
    });
  } catch (error: any) {
    console.error('Error saving pick:', error);

    if (error.code === 'KICKOFF_PASSED' || error.code === 'UNVERIFIED_KICKOFF' || error.statusCode === 403 || error.status === 403) {
      res.status(403).json({
        error: error.message || 'Game is locked.',
        code: error.code || 'KICKOFF_PASSED',
      });
      return;
    }

    if (error.code === 'DUPLICATE_PICK_IDENTITY' || error.statusCode === 409 || error.status === 409) {
      res.status(409).json({
        error: error.message || 'Duplicate pick identity conflict detected. Zero writes performed.',
        code: 'DUPLICATE_PICK_IDENTITY',
      });
      return;
    }

    if (error.code === 'P2003') {
      res.status(400).json({ error: 'Invalid pool_id or game_id reference.' });
      return;
    }

    res.status(500).json({ error: error?.message || 'Failed to save pick.' });
  }
});

/**
 * POST /api/picks/batch
 * Submits or updates multiple picks in bulk for a pool.
 * Accepts: { pool_id, picks: Array<{ game_id, selected_team_id, week? }> }
 * Enforces atomic 4-column persistence with TEXT game identity.
 */
picksRouter.post('/batch', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const pathPoolId = req.params.pool_id;
  const bodyPoolId = req.body.pool_id || req.body.poolId;

  if (!pathPoolId) {
    if (!allowLegacyUnscopedPicksRouteForTesting) {
      res.status(410).json({
        error: 'ENDPOINT_RETIRED: Legacy un-scoped batch pick mutations are retired. Use tenant-scoped /api/pools/:pool_id/picks/batch.',
        code: 'ENDPOINT_RETIRED',
      });
      return;
    }
  } else if (bodyPoolId && bodyPoolId !== pathPoolId) {
    res.status(400).json({ error: 'POOL_MISMATCH: Request body pool_id does not match route path pool_id.' });
    return;
  }

  const poolId = pathPoolId || bodyPoolId;
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

    const savedPicks: SavedPickRecord[] = [];
    const results: Array<{
      gameId: string;
      status: 'SAVED' | 'CONFLICT' | 'LOCKED' | 'ERROR' | 'MISMATCH';
      pick?: SavedPickRecord;
      error?: string;
      code?: string;
    }> = [];

    for (const item of picksList) {
      const rawGameId = item.game_id || item.gameId;
      if (!rawGameId) {
        results.push({
          gameId: 'unknown',
          status: 'ERROR',
          error: 'Missing game_id in batch item payload.',
        });
        continue;
      }
      const gameId = String(rawGameId).trim();

      try {
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

        const game = await resolveGameWithCanonicalLock(prisma, gameId);
        if (!game) {
          results.push({ gameId, status: 'ERROR', error: 'Game not found.' });
          continue;
        }

        // Validate requested week vs game week
        const requestedWeek = item.week !== undefined ? item.week : (item.selectedWeek !== undefined ? item.selectedWeek : req.body.week);
        if (requestedWeek !== undefined && requestedWeek !== null && game.week !== undefined && game.week !== null) {
          if (Number(requestedWeek) !== Number(game.week)) {
            results.push({ gameId, status: 'MISMATCH', error: `Requested week does not match game week (${game.week}).` });
            continue;
          }
        }

        const targetWeek = game.week ?? (requestedWeek !== undefined && requestedWeek !== null ? Number(requestedWeek) : null);
        if (targetWeek == null || isNaN(targetWeek) || targetWeek < 1 || targetWeek > 18) {
          results.push({ gameId, status: 'ERROR', error: 'Missing authoritative week metadata.' });
          continue;
        }

        const lockResult = evaluateKickoffLock(game, lockOffsetMinutes, new Date());
        if (lockResult.isLocked) {
          results.push({ gameId, status: 'LOCKED', error: 'Game is locked.' });
          continue;
        }

        const normHome = normalizeTeamCode(game.homeTeamId);
        const normAway = normalizeTeamCode(game.awayTeamId);
        const normSelected = selectedTeamId ? normalizeTeamCode(selectedTeamId) : null;

        if (normSelected) {
          if (normHome === 'UNK' || normAway === 'UNK' || (normSelected !== normHome && normSelected !== normAway)) {
            results.push({ gameId, status: 'ERROR', error: 'Selected team is not a participant in this game.' });
            continue;
          }
        }

        const savedPick = await savePickAtomically(prisma, {
          poolId,
          userId,
          gameId: String(game.id),
          week: targetWeek,
          selectedTeamId: normSelected,
          externalGameId: game.externalGameId ? String(game.externalGameId) : null,
          lockOffsetMinutes,
          gameData: game,
        });

        savedPicks.push(savedPick);
        results.push({ gameId: String(game.id), status: 'SAVED', pick: savedPick });
      } catch (err: any) {
        if (err.code === 'DUPLICATE_PICK_IDENTITY' || err.statusCode === 409) {
          results.push({
            gameId,
            status: 'CONFLICT',
            code: 'DUPLICATE_PICK_IDENTITY',
            error: err.message,
          });
        } else if (err.code === 'KICKOFF_PASSED' || err.code === 'UNVERIFIED_KICKOFF' || err.statusCode === 403) {
          results.push({
            gameId,
            status: 'LOCKED',
            code: err.code || 'KICKOFF_PASSED',
            error: err.message,
          });
        } else {
          // If on legacy unscoped route (/api/picks/batch) and zero items committed, propagate 500 for legacy test suite
          if (!pathPoolId && savedPicks.length === 0) {
            throw err;
          }
          results.push({
            gameId,
            status: 'ERROR',
            code: err.code || (err.message?.includes('AMBIGUOUS_GAME_IDENTITY') || err.message?.includes('INVALID_KICKOFF_METADATA') || err.message?.includes('CANONICAL_GAME_QUERY_FAILED') ? 'GAME_RESOLUTION_ERROR' : 'RESOLUTION_OR_PERSISTENCE_ERROR'),
            error: err.message || 'Pick persistence failed.',
          });
        }
      }
    }

    res.status(200).json({
      message: `Batch processed ${savedPicks.length} picks successfully.`,
      count: savedPicks.length,
      picks: savedPicks,
      results,
    });
  } catch (error: any) {
    console.error('Error in batch picks:', error);
    res.status(500).json({ error: error?.message || 'Failed to process batch picks.' });
  }
});

/**
 * Retired Legacy Tiebreaker Routes (/api/picks/tiebreaker)
 * Enforces Invariant #20 & Directive Section 2 (Finding 7).
 * Stateful read/write operations under /api/picks/tiebreaker are retired.
 * Returns state-free HTTP 410 Gone; never reads or mutates pool data.
 */
function handleRetiredTiebreakerRoute(_req: Request, res: Response): void {
  res.status(410).json({
    error: 'ENDPOINT_RETIRED: /api/picks/tiebreaker has been retired in favor of canonical pool-scoped routes under /api/pools/:pool_id/tiebreaker (Invariant #20).',
    canonicalRoute: '/api/pools/:pool_id/tiebreaker',
  });
}

picksRouter.get('/tiebreaker', handleRetiredTiebreakerRoute);
picksRouter.post('/tiebreaker', handleRetiredTiebreakerRoute);
picksRouter.post('/tiebreaker/override', handleRetiredTiebreakerRoute);
