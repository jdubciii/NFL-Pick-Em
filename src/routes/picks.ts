import { Router, Request, Response } from 'express';
import prisma from '../db/client';
import { requireAuth } from '../middleware/auth';
import { PoolSettings } from '../types/pool';
import { normalizeTeamCode } from '../services/authoritativeSlateService';

export const picksRouter = Router();

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

export async function savePickAtomically(
  db: any,
  params: {
    poolId: string;
    userId: string;
    gameId: string;
    week: number;
    selectedTeamId: string | null;
    externalGameId?: string | null;
  }
): Promise<SavedPickRecord> {
  const { poolId, userId, gameId, week, selectedTeamId, externalGameId } = params;

  if (week == null || isNaN(week) || week < 1 || week > 18) {
    throw new Error(`INVALID_PICK_WEEK: Authoritative week ${week} is invalid or outside season bounds (1-18).`);
  }

  // In test environments where an explicit legacy save adapter is injected, use it directly
  if (legacyPickSaveAdapterForTesting) {
    return await legacyPickSaveAdapterForTesting(db, params);
  }

  if (typeof db.$queryRawUnsafe === 'function') {
    // Identity resolution across UUID and external ESPN ID when an alias is present
    if (externalGameId && String(externalGameId) !== String(gameId)) {
      try {
        const dupCheckSql = `
          SELECT id, game_id FROM public.picks
          WHERE pool_id = $1::uuid AND user_id = $2::uuid AND week = $3::int AND game_id IN ($4::text, $5::text)
        `;
        const dupRows = await db.$queryRawUnsafe(dupCheckSql, poolId, userId, week, String(gameId), String(externalGameId));
        if (dupRows && dupRows.length > 1) {
          console.warn(
            `DUPLICATE_PICKS_DETECTED: Found duplicate picks for game ${gameId} and ${externalGameId}. Consolidating to canonical UUID.`
          );
          const extraIds = dupRows.filter((r: any) => String(r.game_id) === String(externalGameId)).map((r: any) => r.id);
          if (extraIds.length > 0) {
            await db.$queryRawUnsafe(`DELETE FROM public.picks WHERE id = ANY($1::uuid[])`, extraIds);
          }
        } else if (dupRows && dupRows.length === 1 && String(dupRows[0].game_id) === String(externalGameId)) {
          // Convert existing externalGameId row to canonical gameId so the upsert updates the existing row in place
          await db.$queryRawUnsafe(
            `UPDATE public.picks SET game_id = $1::text WHERE id = $2::uuid`,
            String(gameId),
            dupRows[0].id
          );
        }
      } catch (_) {}
    }

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

  throw new Error('PICK_PERSISTENCE_FAILED: No raw SQL executor available for atomic pick persistence.');
}

/**
 * POST /api/picks
 * Protected route for users to submit or update their game pick.
 * Accepts: pool_id, game_id, selected_team_id (optional), week (optional for validation)
 * Enforces verified actor, applicable ACTIVE pool membership, correct pool,
 * participant validation, kickoff locks, and 4-column atomic persistence with TEXT game identity.
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
    });

    res.status(200).json({
      message: 'Pick saved successfully',
      pick: savedPick,
    });
  } catch (error: any) {
    console.error('Error saving pick:', error);

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

    const savedPicks: SavedPickRecord[] = [];
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

      const game = await resolveGameWithCanonicalLock(prisma, gameId);
      if (!game) continue;

      // Validate requested week vs game week
      const requestedWeek = item.week !== undefined ? item.week : (item.selectedWeek !== undefined ? item.selectedWeek : req.body.week);
      if (requestedWeek !== undefined && requestedWeek !== null && game.week !== undefined && game.week !== null) {
        if (Number(requestedWeek) !== Number(game.week)) {
          continue; // skip mismatched cross-week picks
        }
      }

      const targetWeek = game.week ?? (requestedWeek !== undefined && requestedWeek !== null ? Number(requestedWeek) : null);
      if (targetWeek == null || isNaN(targetWeek) || targetWeek < 1 || targetWeek > 18) {
        continue;
      }

      const lockResult = evaluateKickoffLock(game, lockOffsetMinutes, new Date());
      if (lockResult.isLocked) {
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

      const savedPick = await savePickAtomically(prisma, {
        poolId,
        userId,
        gameId: String(game.id),
        week: targetWeek,
        selectedTeamId: normSelected,
        externalGameId: game.externalGameId ? String(game.externalGameId) : null,
      });

      savedPicks.push(savedPick);
    }

    res.status(200).json({
      message: `Batch processed ${savedPicks.length} picks successfully.`,
      count: savedPicks.length,
      picks: savedPicks,
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
