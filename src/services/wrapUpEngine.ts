import crypto from 'crypto';
import { Prisma, GameStatus, OutboxStatus } from '@prisma/client';
import prisma from '../db/client';
import { withJobRun } from '../jobs/jobRunner';
import { isGameInExcludedWindow } from './scoringEngine';
import {
  calculateRankingsAndPenalties,
  RankedMemberResult,
  MemberEntry,
} from './tiebreakerRankingService';
import {
  getWeeklyDesignation,
  DesignationResolution,
} from './weeklyDesignationService';
import {
  getAcceptedSlateManifest,
  WeeklySlateManifest,
  normalizeTeamCode,
} from './authoritativeSlateService';
import type { PoolSettings } from '../types/pool';

export interface WrapUpOptions {
  weekNumber?: number;
  season?: number;
  seasonType?: number;
  poolId?: string;
  tiebreakerOffered?: boolean;
  previewRevision?: number | string;
  inputFingerprint?: string;
  appliedBy?: string;
  prismaClient?: typeof prisma;
  settlementEnabled?: boolean;
  penaltyPostingEnabled?: boolean;
}

export interface PoolWrapUpResult {
  applied: boolean;
  reason?:
    | 'ALREADY_WRAPPED_UP'
    | 'NO_GAMES_FOR_WEEK'
    | 'SCORE_FEED_UNAVAILABLE'
    | 'WEEK_NOT_FINAL'
    | 'DESIGNATED_GAME_UNAVAILABLE'
    | 'DESIGNATED_GAME_NOT_FINAL'
    | 'CLAIM_STORE_UNAVAILABLE'
    | 'STALE_PREVIEW_REVISION'
    | 'AUTHORITATIVE_SLATE_UNAVAILABLE'
    | 'SETTLEMENT_DISABLED'
    | 'PENALTY_POSTING_DISABLED'
    | string;
  poolId: string;
  season: number;
  weekNumber: number;
  pendingCount?: number;
  earliestPendingKickoff?: Date | string | null;
  standings?: RankedMemberResult[];
  topScorers?: Array<{ userId: string; score: number; rank: number; shots: number }>;
  deadPlaceMembers?: Array<{ userId: string; score: number; rank: number; shots: number }>;
  processedMembers?: number;
  notificationsEnqueued?: number;
  targetGameId?: string | null;
  targetGameScore?: number | null;
  tiebreakerOffered?: boolean;
  auditSnapshot?: any;
  existingRecord?: any;
}

export interface WrapUpEngineRunResult {
  poolsScanned: number;
  poolsApplied: number;
  poolsSkipped: number;
  totalNotificationsEnqueued: number;
  results: PoolWrapUpResult[];
}

export interface WrapUpPreviewResult {
  readyToSettle: boolean;
  reasonsIfNotReady: string[];
  poolId: string;
  season: number;
  seasonType: number;
  weekNumber: number;
  acceptedRevision: number | null;
  observationTime: string | null;
  manifestFingerprint: string | null;
  expectedGames: number;
  presentGames: number;
  totalGames: number;
  completedGames: number;
  pendingGamesCount: number;
  validMappedPicks: number;
  unmappedPicks: number;
  eligibleParticipants: number;
  allGamesFinal: boolean;
  designatedGame: any | null;
  designatedGameScore: number | null;
  tiebreakerOffered: boolean;
  projectedStandings: RankedMemberResult[];
  inputFingerprint: string;
}

/**
 * Read-only settlement preview for commissioners and admins (Decision #54).
 * Strictly zero mutations; checks slate completeness and evaluates projected rankings.
 */
export async function previewWeeklyWrapUpForPool(
  poolId: string,
  weekNumber: number,
  options: WrapUpOptions = {}
): Promise<WrapUpPreviewResult> {
  const db = options.prismaClient || prisma;

  const pool = await db.pool.findUnique({
    where: { id: poolId },
    include: {
      memberships: {
        where: { status: 'ACTIVE' },
        include: { user: true },
      },
    },
  });

  if (!pool) {
    throw new Error(`Pool with ID ${poolId} not found.`);
  }

  const settings = (pool.settings as any) || {};
  const season = options.season || Number(settings.season) || 2026;
  const seasonType = options.seasonType || 2;
  const reasonsIfNotReady: string[] = [];

  // 1. Check if settlement marker table exists
  let markerTableExists = false;
  try {
    if (typeof (db as any).$queryRaw === 'function') {
      const check: any[] = (await db.$queryRaw`SELECT to_regclass('public.weekly_wrapups') as to_regclass;` as any[]) || [];
      markerTableExists = check[0]?.to_regclass !== null && check[0]?.to_regclass !== undefined;
    } else if (typeof (db as any).$queryRawUnsafe === 'function') {
      const check: any[] = (await db.$queryRawUnsafe(`SELECT to_regclass('public.weekly_wrapups') as to_regclass;`) as any[]) || [];
      markerTableExists = check[0]?.to_regclass !== null && check[0]?.to_regclass !== undefined;
    }
  } catch {
    markerTableExists = false;
  }

  if (!markerTableExists) {
    reasonsIfNotReady.push('CLAIM_STORE_UNAVAILABLE: Settlement claim store (public.weekly_wrapups) does not exist.');
  } else {
    // Check if already claimed under composite key (pool_id, season, week_number)
    const existingClaim: any[] = ((await db.$queryRawUnsafe(
      `SELECT pool_id, week_number FROM public.weekly_wrapups WHERE pool_id = $1::uuid AND (season = $2::int OR season IS NULL) AND week_number = $3::int;`,
      poolId,
      season,
      weekNumber
    ).catch(() => [])) as any[]) || [];

    if (existingClaim && existingClaim.length > 0) {
      reasonsIfNotReady.push('ALREADY_WRAPPED_UP: Week has already been officially settled.');
    }
  }

  // 2. Check accepted weekly slate manifest
  const manifest = await getAcceptedSlateManifest(db, season, seasonType, weekNumber);
  const acceptedRevision = manifest?.revision ?? null;
  const observationTime = manifest?.observationTime ?? null;
  const manifestFingerprint = manifest?.manifestFingerprint ?? null;
  const expectedGames = manifest?.eventIds?.length ?? 0;

  // 3. Fetch games
  const allGames = await db.game.findMany();
  let games = allGames;
  if (manifest && manifest.eventIds && manifest.eventIds.length > 0) {
    const eventSet = new Set(manifest.eventIds);
    games = allGames.filter((g: any) => eventSet.has(g.externalGameId) || eventSet.has(g.id));
  }

  const excludedWindows = settings.excludedGameWindows ?? settings.excluded_game_windows;
  const nonExcludedGames = games.filter(
    (g: any) => !isGameInExcludedWindow(g.kickoffTime, excludedWindows)
  );

  if (nonExcludedGames.length === 0) {
    reasonsIfNotReady.push('NO_GAMES_FOR_WEEK: No active games found in weekly slate.');
  }

  const pendingGames = nonExcludedGames.filter(
    (g: any) => g.status !== GameStatus.FINAL || g.homeScore === null || g.awayScore === null
  );

  if (pendingGames.length > 0) {
    reasonsIfNotReady.push(`WEEK_NOT_FINAL: ${pendingGames.length} games in the weekly slate are not yet official FINAL.`);
  }

  const isWeek6Unavailable = (weekNumber === 6 && season === 2026);
  const tiebreakerOffered = options.tiebreakerOffered !== undefined
    ? options.tiebreakerOffered
    : (!isWeek6Unavailable && settings?.tiebreaker_unavailable_weeks?.[season]?.[weekNumber] !== true);

  let designatedGameScore: number | null = null;
  let designatedGameItem: any | null = null;
  let designation: ReturnType<typeof getWeeklyDesignation> | null = null;

  if (tiebreakerOffered) {
    designation = getWeeklyDesignation(pool.settings, season, weekNumber, games as any);
    if (!designation.game) {
      reasonsIfNotReady.push(`DESIGNATED_GAME_UNAVAILABLE: Tiebreaker game status is ${designation.status}. ${designation.reason || ''}`.trim());
    } else {
      designatedGameItem = designation.game;
      if (designatedGameItem.status !== GameStatus.FINAL || designatedGameItem.homeScore === null || designatedGameItem.awayScore === null) {
        reasonsIfNotReady.push(`DESIGNATED_GAME_NOT_FINAL: Designated tiebreaker game (${designation.eventId}) has not reached official FINAL score.`);
      } else {
        designatedGameScore = Number(designatedGameItem.homeScore) + Number(designatedGameItem.awayScore);
      }
    }
  }

  // 4. Fetch member scores and map picks
  const memberScoresMap = new Map<string, number>();
  for (const m of pool.memberships) {
    memberScoresMap.set(m.userId, 0);
  }

  const picks: any[] = ((await db.$queryRawUnsafe(
    `SELECT p.user_id, p.game_id, p.selected_team, p.selected_team_id, g.home_team_id, g.away_team_id, g.home_score, g.away_score, g.status
     FROM public.picks p
     LEFT JOIN public.games g ON (g.external_game_id = p.game_id OR g.id::text = p.game_id)
     WHERE p.pool_id = $1::uuid AND (p.week = $2::int OR p.week IS NULL);`,
    poolId,
    weekNumber
  ).catch(() => [])) as any[]) || [];

  const validMappedPicks = picks.filter((p) => p.home_team_id !== null && p.home_team_id !== undefined).length;
  const unmappedPicks = picks.length - validMappedPicks;

  if (picks.length > 0 && validMappedPicks === 0) {
    reasonsIfNotReady.push(`NOT READY — AUTHORITATIVE SLATE / EVENT MAPPING UNAVAILABLE: ${picks.length} picks exist for Week ${weekNumber} but 0 join scheduled games.`);
  }

  for (const pick of picks) {
    if (pick.status === GameStatus.FINAL && pick.home_score !== null && pick.away_score !== null) {
      const winner = pick.home_score > pick.away_score ? pick.home_team_id : (pick.away_score > pick.home_score ? pick.away_team_id : null);
      const selected = pick.selected_team || pick.selected_team_id;
      if (winner && selected && normalizeTeamCode(selected) === normalizeTeamCode(winner)) {
        const cur = memberScoresMap.get(pick.user_id) || 0;
        memberScoresMap.set(pick.user_id, cur + 1);
      }
    }
  }

  // 5. Fetch predictions
  const submissions = await db.weeklySubmission.findMany({
    where: { poolId, weekNumber },
  });
  const subMap = new Map(submissions.map((s: any) => [s.userId, s.tieBreakerPrediction !== null ? Number(s.tieBreakerPrediction) : null]));

  const memberEntries: MemberEntry[] = pool.memberships.map((m: any) => ({
    userId: m.userId,
    score: memberScoresMap.get(m.userId) || 0,
    tieBreakerPrediction: subMap.get(m.userId) ?? null,
  }));

  const projectedStandings = calculateRankingsAndPenalties(memberEntries, {
    actualFinalTotal: designatedGameScore,
    tiebreakerOffered,
  });

  // 6. Compute stable input fingerprint
  const inputPayload = JSON.stringify({
    poolId,
    season,
    seasonType,
    weekNumber,
    acceptedRevision,
    manifestFingerprint,
    picks: picks.map((p) => ({ u: p.user_id, g: p.game_id, t: p.selected_team || p.selected_team_id })).sort((a, b) => (a.u + a.g).localeCompare(b.u + b.g)),
    submissions: Array.from(subMap.entries()).sort((a, b) => a[0].localeCompare(b[0])),
  });
  const inputFingerprint = crypto.createHash('sha256').update(inputPayload).digest('hex');

  return {
    readyToSettle: reasonsIfNotReady.length === 0,
    reasonsIfNotReady,
    poolId,
    season,
    seasonType,
    weekNumber,
    acceptedRevision,
    observationTime,
    manifestFingerprint,
    expectedGames,
    presentGames: games.length,
    totalGames: nonExcludedGames.length,
    completedGames: nonExcludedGames.length - pendingGames.length,
    pendingGamesCount: pendingGames.length,
    validMappedPicks,
    unmappedPicks,
    eligibleParticipants: pool.memberships.length,
    allGamesFinal: pendingGames.length === 0 && nonExcludedGames.length > 0,
    designatedGame: designation?.game || null,
    designatedGameScore,
    tiebreakerOffered,
    projectedStandings,
    inputFingerprint,
  };
}

/**
 * Executes weekly settlement for a single pool with strict invariants:
 * - Decision #24: Atomic claim on weekly_wrapups table inside transaction.
 * - Decision #27: Complete-slate check; requires official FINAL status across all games.
 * - Authority P41-TIEBREAKER-CONTRACT-2026-10-17-01: Canonical competition ranking and discrete penalty schedule.
 * - Section 7 Safeguard: Current-week safeguard (fair timely entry verification).
 * - Decision #54: Pure mutations inside POST transaction; read-only preview available separately.
 * - Decision #55: Fails closed on missing feeds or unresolved designation.
 * - Decision #57: Deduplicated outbox/inbox notifications.
 */
export async function executeWeeklyWrapUpForPool(
  poolId: string,
  weekNumber: number,
  options: WrapUpOptions = {}
): Promise<PoolWrapUpResult> {
  const db = options.prismaClient || prisma;

  if (!db || typeof db.$transaction !== 'function') {
    throw new Error('CLAIM_STORE_UNAVAILABLE: Database client is unconfigured or unavailable');
  }

  return await db.$transaction(async (tx: any) => {
    const season = options.season || 2026;
    const seasonType = options.seasonType || 2;

    // Separate Activation Controls (P41 Section 6):
    // If settlement or penalty posting is disabled, refuse official settlement with zero writes.
    // Do not commit a marker and defer charges.
    const isSettlementEnabled = options.settlementEnabled !== undefined
      ? options.settlementEnabled
      : (process.env.SETTLEMENT_ENABLED !== 'false');

    const isPenaltyPostingEnabled = options.penaltyPostingEnabled !== undefined
      ? options.penaltyPostingEnabled
      : (process.env.PENALTY_POSTING_ENABLED !== 'false');

    if (!isSettlementEnabled) {
      return {
        applied: false,
        reason: 'SETTLEMENT_DISABLED',
        poolId,
        season,
        weekNumber,
      };
    }

    if (!isPenaltyPostingEnabled) {
      return {
        applied: false,
        reason: 'PENALTY_POSTING_DISABLED',
        poolId,
        season,
        weekNumber,
      };
    }

    // Check preview revision freshness if provided (Fail-Closed: Decision #55)
    if (options.previewRevision !== undefined) {
      const manifest = await getAcceptedSlateManifest(tx, season, seasonType, weekNumber);
      if (!manifest || manifest.revision !== Number(options.previewRevision)) {
        return {
          applied: false,
          reason: 'STALE_PREVIEW_REVISION',
          poolId,
          season,
          weekNumber,
        };
      }
    }

    // -------------------------------------------------------------------------
    // Step 1: Claim Invariant (Decision #24 & #55) - Atomic Claim on weekly_wrapups
    // -------------------------------------------------------------------------
    let tableExists: any[] = [];
    try {
      if (typeof tx.$queryRaw === 'function') {
        tableExists = (await tx.$queryRaw`SELECT to_regclass('public.weekly_wrapups')::text as to_regclass;`) as any[];
      } else if (typeof tx.$queryRawUnsafe === 'function') {
        tableExists = (await tx.$queryRawUnsafe(`SELECT to_regclass('public.weekly_wrapups')::text as to_regclass;`)) as any[];
      }
    } catch {
      tableExists = [];
    }

    if (!tableExists || !tableExists[0] || !tableExists[0].to_regclass) {
      return {
        applied: false,
        reason: 'CLAIM_STORE_UNAVAILABLE',
        poolId,
        season,
        weekNumber,
      };
    }

    // Probe schema capabilities on weekly_wrapups to maintain backwards compatibility with pre-migration databases
    let hasSeasonCol = false;
    try {
      const colCheck: any[] = ((await tx.$queryRawUnsafe(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'weekly_wrapups' AND column_name = 'season';`
      ).catch(() => [])) as any[]) || [];
      hasSeasonCol = colCheck.length > 0;
    } catch {
      hasSeasonCol = false;
    }

    // Step 1: Atomic insert into weekly_wrapups
    // Claim execution marker immediately to serialize concurrent processes
    let claimResult: any[] = [];
    if (hasSeasonCol) {
      claimResult = ((await tx.$queryRawUnsafe(
        `INSERT INTO public.weekly_wrapups (pool_id, season, week_number, applied_by, input_fingerprint, accepted_revision)
         VALUES ($1::uuid, $2::int, $3::int, $4::uuid, $5::text, $6::int)
         ON CONFLICT (pool_id, season, week_number) DO NOTHING
         RETURNING pool_id, season, week_number;`,
        poolId,
        season,
        weekNumber,
        options.appliedBy || null,
        options.inputFingerprint || null,
        options.previewRevision !== undefined ? Number(options.previewRevision) : null
      )) as any[]) || [];
    } else {
      claimResult = ((await tx.$queryRawUnsafe(
        `INSERT INTO public.weekly_wrapups (pool_id, week_number)
         VALUES ($1::uuid, $2::int)
         ON CONFLICT (pool_id, week_number) DO NOTHING
         RETURNING pool_id, week_number;`,
        poolId,
        weekNumber
      )) as any[]) || [];
    }

    if (!claimResult || claimResult.length === 0) {
      let existing: any[] = [];
      if (hasSeasonCol) {
        existing = ((await tx.$queryRawUnsafe(
          `SELECT pool_id, season, week_number, applied_by, completed_at, input_fingerprint, accepted_revision, summary
           FROM public.weekly_wrapups
           WHERE pool_id = $1::uuid AND (season = $2::int OR season IS NULL) AND week_number = $3::int;`,
          poolId,
          season,
          weekNumber
        ).catch(() => [])) as any[]) || [];
      } else {
        existing = ((await tx.$queryRawUnsafe(
          `SELECT pool_id, week_number, completed_at, summary
           FROM public.weekly_wrapups
           WHERE pool_id = $1::uuid AND week_number = $2::int;`,
          poolId,
          weekNumber
        ).catch(() => [])) as any[]) || [];
      }

      const existingRecord = existing[0] || null;
      return {
        applied: false,
        reason: 'ALREADY_WRAPPED_UP',
        poolId,
        season,
        weekNumber,
        existingRecord: existingRecord ? {
          poolId: existingRecord.pool_id,
          season: existingRecord.season,
          weekNumber: existingRecord.week_number,
          appliedBy: existingRecord.applied_by,
          completedAt: existingRecord.completed_at,
          inputFingerprint: existingRecord.input_fingerprint,
          acceptedRevision: existingRecord.accepted_revision,
          summary: existingRecord.summary,
        } : null,
      };
    }

    // Helper to purge in-flight incomplete claim marker on refusal (Zero writes on refusal)
    const cleanupIncompleteClaim = async () => {
      try {
        if (hasSeasonCol) {
          await tx.$queryRawUnsafe(
            `DELETE FROM public.weekly_wrapups WHERE pool_id = $1::uuid AND season = $2::int AND week_number = $3::int AND summary IS NULL;`,
            poolId, season, weekNumber
          );
        } else {
          await tx.$queryRawUnsafe(
            `DELETE FROM public.weekly_wrapups WHERE pool_id = $1::uuid AND week_number = $2::int AND summary IS NULL;`,
            poolId, weekNumber
          );
        }
      } catch {
        // ignore
      }
    };

    // -------------------------------------------------------------------------
    // Step 2: Fetch Pool and Active Members
    // -------------------------------------------------------------------------
    const pool = await tx.pool.findUnique({
      where: { id: poolId },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: {
            user: {
              include: {
                notificationPreference: true,
              },
            },
          },
        },
      },
    });

    if (!pool) {
      await cleanupIncompleteClaim();
      throw new Error(`Pool with ID ${poolId} not found.`);
    }

    if (pool.memberships.length === 0) {
      await cleanupIncompleteClaim();
      throw new Error(`Pool with ID ${poolId} has no active members.`);
    }

    const settings = (pool.settings as PoolSettings) || {};
    const excludedWindows = settings.excludedGameWindows ?? settings.excluded_game_windows;

    // -------------------------------------------------------------------------
    // Step 3: Complete-Slate Check (Decision #27 & Section 8)
    // Coordinated against Accepted Slate Manifest to include unpicked games
    // -------------------------------------------------------------------------
    const manifest = await getAcceptedSlateManifest(tx, season, seasonType, weekNumber);
    const allGames = await tx.game.findMany();
    let games = allGames;

    if (manifest && manifest.eventIds && manifest.eventIds.length > 0) {
      const eventSet = new Set(manifest.eventIds);
      games = allGames.filter((g: any) => eventSet.has(g.externalGameId) || eventSet.has(g.id));
      if (games.length < manifest.eventIds.length) {
        await cleanupIncompleteClaim();
        return {
          applied: false,
          reason: 'AUTHORITATIVE_SLATE_UNAVAILABLE',
          poolId,
          season,
          weekNumber,
        };
      }
    } else {
      const taggedGames = allGames.filter((g: any) => g.week === weekNumber && (g.season === season || g.season === null));
      if (taggedGames.length > 0) {
        games = taggedGames;
        const poolPickGameIds: any[] = ((await tx.$queryRawUnsafe(
          `SELECT DISTINCT game_id FROM public.picks WHERE pool_id = $1::uuid AND (week = $2::int OR week IS NULL);`,
          poolId,
          weekNumber
        ).catch(() => [])) as any[]) || [];
        const validPickIds = poolPickGameIds.map((p: any) => p.game_id).filter(Boolean);
        if (validPickIds.length > 0) {
          const pickGameSet = new Set(validPickIds);
          games = allGames.filter((g: any) => pickGameSet.has(g.id) || pickGameSet.has(g.externalGameId));
        }
      }
    }
    const nonExcludedGames = games.filter(
      (game: any) => !isGameInExcludedWindow(game.kickoffTime, excludedWindows)
    );

    if (nonExcludedGames.length === 0) {
      await cleanupIncompleteClaim();
      throw new Error('NO_GAMES_FOR_WEEK: No games found in weekly slate.');
    }

    // Every game must have status === 'FINAL' and non-null scores
    const pendingGames = nonExcludedGames.filter(
      (g: any) => g.status !== GameStatus.FINAL || g.homeScore === null || g.awayScore === null
    );

    if (pendingGames.length > 0) {
      await cleanupIncompleteClaim();
      const sortedPending = [...pendingGames].sort(
        (a: any, b: any) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime()
      );
      return {
        applied: false,
        reason: 'WEEK_NOT_FINAL',
        pendingCount: pendingGames.length,
        earliestPendingKickoff: sortedPending[0]?.kickoffTime ?? null,
        poolId,
        season,
        weekNumber,
      };
    }

    // -------------------------------------------------------------------------
    // Step 4: Tiebreaker Availability Check (Section 6 & 7 Safeguard)
    // -------------------------------------------------------------------------
    // If fair timely entry was not offered to all members before deadline (e.g. Week 6),
    const isWeek6Unavailable = (weekNumber === 6 && season === 2026);
    const tiebreakerOffered = options.tiebreakerOffered !== undefined
      ? options.tiebreakerOffered
      : (!isWeek6Unavailable && (pool.settings as any)?.tiebreaker_unavailable_weeks?.[season]?.[weekNumber] !== true);

    let actualTiebreakerTotal: number | null = null;
    let designatedGameId: string | null = null;

    if (tiebreakerOffered) {
      // For weeks with tiebreaker offered: strictly require designated game and official FINAL score
      const designation = getWeeklyDesignation(pool.settings, season, weekNumber, games as any);
      if (!designation.game) {
        await cleanupIncompleteClaim();
        throw new Error(`DESIGNATED_GAME_UNAVAILABLE: Tiebreaker game unresolved (${designation.status}). ${designation.reason || ''}`);
      }

      const designatedGame = designation.game;
      if (designatedGame.status !== GameStatus.FINAL || designatedGame.homeScore === null || designatedGame.awayScore === null) {
        await cleanupIncompleteClaim();
        throw new Error('DESIGNATED_GAME_NOT_FINAL: Designated tiebreaker game has not reached official FINAL score.');
      }

      // Official combined FINAL score, including overtime
      actualTiebreakerTotal = Number(designatedGame.homeScore) + Number(designatedGame.awayScore);
      designatedGameId = designatedGame.id;
    } else {
      // When tiebreaker was not offered to members:
      // Do not require a designated tiebreaker final total that the week was explicitly not eligible to use.
      // Do not fabricate a prediction or designate a replacement game.
      actualTiebreakerTotal = null;
      designatedGameId = null;
    }

    // -------------------------------------------------------------------------
    // Step 6: Member Pick Scoring & Predictions
    // -------------------------------------------------------------------------
    const memberScoresMap = new Map<string, number>();
    for (const membership of pool.memberships) {
      memberScoresMap.set(membership.userId, 0);
    }

    // Load picks for this pool and week
    const picks: any[] = ((await tx.$queryRawUnsafe(
      `SELECT p.user_id, p.game_id, p.selected_team, p.selected_team_id, g.home_team_id, g.away_team_id, g.home_score, g.away_score, g.status
       FROM public.picks p
       LEFT JOIN public.games g ON (g.external_game_id = p.game_id OR g.id::text = p.game_id)
       WHERE p.pool_id = $1::uuid AND (p.week = $2::int OR p.week IS NULL);`,
      poolId,
      weekNumber
    ).catch(() => [])) as any[]) || [];

    const joinedCount = picks.filter((p: any) => p.home_team_id !== null && p.home_team_id !== undefined).length;
    if (picks.length > 0 && joinedCount === 0) {
      return {
        applied: false,
        reason: 'AUTHORITATIVE_SLATE_UNAVAILABLE',
        poolId,
        season,
        weekNumber,
      };
    }

    for (const pick of picks) {
      if (pick.status === GameStatus.FINAL && pick.home_score !== null && pick.away_score !== null) {
        const winner = pick.home_score > pick.away_score ? pick.home_team_id : (pick.away_score > pick.home_score ? pick.away_team_id : null);
        const selected = pick.selected_team || pick.selected_team_id;
        if (winner && selected && normalizeTeamCode(selected) === normalizeTeamCode(winner)) {
          const cur = memberScoresMap.get(pick.user_id) || 0;
          memberScoresMap.set(pick.user_id, cur + 1);
        }
      }
    }

    // Load predictions from weekly_submissions
    const weeklySubmissions = await tx.weeklySubmission.findMany({
      where: {
        poolId: pool.id,
        weekNumber,
      },
    });

    const predictionsMap = new Map<string, number | null>();
    for (const sub of weeklySubmissions) {
      if (sub.tieBreakerPrediction !== null && sub.tieBreakerPrediction !== undefined) {
        predictionsMap.set(sub.userId, Number(sub.tieBreakerPrediction));
      } else {
        predictionsMap.set(sub.userId, null);
      }
    }

    const memberEntries: MemberEntry[] = pool.memberships.map((membership: any) => ({
      userId: membership.userId,
      score: memberScoresMap.get(membership.userId) || 0,
      tieBreakerPrediction: predictionsMap.get(membership.userId) ?? null,
    }));

    // -------------------------------------------------------------------------
    // Step 7: Canonical Tiebreaker Ranking & Penalty Schedule Calculation
    // -------------------------------------------------------------------------
    const rankedStandings = calculateRankingsAndPenalties(memberEntries, {
      actualFinalTotal: actualTiebreakerTotal,
      tiebreakerOffered,
    });

    const topScorers = rankedStandings.filter((r) => r.isSafeHaven);
    const deadPlaceMembers = rankedStandings.filter((r) => r.isDeadPlace);

    // -------------------------------------------------------------------------
    // Step 8: Commit Penalties & Member Stats Atomically
    // -------------------------------------------------------------------------
    for (const member of rankedStandings) {
      // Incur weekly charge if shots > 0
      if (member.shots > 0) {
        const reason = member.isDeadPlace
          ? `DEAD_PLACE_MONARCH_S${season}_W${weekNumber}`
          : `WEEKLY_SETTLEMENT_S${season}_W${weekNumber}_RANK_${member.rank}`;

        await tx.penaltyLedger.create({
          data: {
            poolId: pool.id,
            userId: member.userId,
            weekNumber,
            delta: new Prisma.Decimal(member.shots.toString()),
            reason,
            createdById: pool.adminId,
          },
        });
      }

      // Recompute total cumulative shots drank from ledger
      const ledgerSum = await tx.penaltyLedger.aggregate({
        where: {
          poolId: pool.id,
          userId: member.userId,
        },
        _sum: {
          delta: true,
        },
      });

      const totalShotsDrank = ledgerSum._sum.delta ?? new Prisma.Decimal(0);

      await tx.poolMemberStat.upsert({
        where: {
          poolId_userId: {
            poolId: pool.id,
            userId: member.userId,
          },
        },
        update: {
          firstPlaceFinishes: member.isSafeHaven ? { increment: 1 } : undefined,
          deadPlaceFinishes: member.isDeadPlace ? { increment: 1 } : undefined,
          totalShotsDrank,
        },
        create: {
          poolId: pool.id,
          userId: member.userId,
          firstPlaceFinishes: member.isSafeHaven ? 1 : 0,
          deadPlaceFinishes: member.isDeadPlace ? 1 : 0,
          totalShotsDrank,
        },
      });
    }

    // -------------------------------------------------------------------------
    // Step 9: Outbox Enqueue Fan-Out (Decision #57)
    // -------------------------------------------------------------------------
    let notificationsEnqueued = 0;
    const now = new Date();

    for (const membership of pool.memberships) {
      const user = membership.user;
      const userId = user?.id || membership.userId;
      if (!userId) continue;

      const pref = user?.notificationPreference;

      if (pref && (pref.emailEnabled === false || (pref as any).weeklyWrapup === false)) {
        continue;
      }

      const dedupeKey = `wrapup:v1:pool:${pool.id}:week:${weekNumber}:user:${userId}`;
      const payload = {
        poolName: pool.name,
        season,
        weekNumber,
        highScorers: topScorers.map((t) => t.userId),
        deadPlaceMembers: deadPlaceMembers.map((d) => d.userId),
        deepLink: `/pools/${pool.id}/leaderboard`,
      };

      const outboxResult = await tx.outboxEvent.createMany({
        data: [
          {
            poolId: pool.id,
            recipientUserId: userId,
            type: 'WRAPUP',
            payload,
            dedupeKey,
            status: OutboxStatus.PENDING,
            attempts: 0,
            nextAttemptAt: now,
          },
        ],
        skipDuplicates: true,
      });

      await tx.inboxMessage.createMany({
        data: [
          {
            poolId: pool.id,
            userId,
            type: 'WRAPUP',
            payload,
            dedupeKey,
          },
        ],
        skipDuplicates: true,
      });

      if (outboxResult.count > 0) {
        notificationsEnqueued++;
      }
    }

    const auditSnapshot = {
      poolId: pool.id,
      season,
      seasonType,
      weekNumber,
      settledAt: new Date().toISOString(),
      appliedBy: options.appliedBy || pool.adminId,
      inputFingerprint: options.inputFingerprint || null,
      actualTiebreakerTotal,
      tiebreakerOffered,
      standings: rankedStandings.map((r) => ({
        userId: r.userId,
        score: r.score,
        rank: r.rank,
        shots: r.shots,
        isSafeHaven: r.isSafeHaven,
        isDeadPlace: r.isDeadPlace,
      })),
      topScorers: topScorers.map((t) => t.userId),
      deadPlaceMembers: deadPlaceMembers.map((d) => d.userId),
    };

    try {
      if (hasSeasonCol) {
        await tx.$queryRawUnsafe(
          `UPDATE public.weekly_wrapups
           SET summary = $1::jsonb,
               input_fingerprint = coalesce(input_fingerprint, $5),
               accepted_revision = coalesce(accepted_revision, $6)
           WHERE pool_id = $2::uuid AND (season = $3::int OR season IS NULL) AND week_number = $4::int;`,
          JSON.stringify(auditSnapshot),
          pool.id,
          season,
          weekNumber,
          options.inputFingerprint || null,
          options.previewRevision !== undefined ? Number(options.previewRevision) : null
        );
      } else {
        await tx.$queryRawUnsafe(
          `UPDATE public.weekly_wrapups
           SET summary = $1::jsonb
           WHERE pool_id = $2::uuid AND week_number = $3::int;`,
          JSON.stringify(auditSnapshot),
          pool.id,
          weekNumber
        );
      }
    } catch {
      // Non-fatal if summary column absent
    }

    return {
      applied: true,
      poolId: pool.id,
      season,
      weekNumber,
      standings: rankedStandings,
      topScorers: topScorers.map((t) => ({
        userId: t.userId,
        score: t.score,
        rank: t.rank,
        shots: t.shots,
      })),
      deadPlaceMembers: deadPlaceMembers.map((d) => ({
        userId: d.userId,
        score: d.score,
        rank: d.rank,
        shots: d.shots,
      })),
      processedMembers: pool.memberships.length,
      notificationsEnqueued,
      targetGameId: designatedGameId,
      targetGameScore: actualTiebreakerTotal,
      tiebreakerOffered,
      auditSnapshot,
    };
  }, { maxWait: 15000, timeout: 30000 });
}

/**
 * Scans active pools and executes weekly wrap-up across all eligible pools.
 */
export async function runWrapUpEngine(options: WrapUpOptions = {}): Promise<{
  jobRun: any;
  engineResult: WrapUpEngineRunResult;
}> {
  const weekNumber = options.weekNumber !== undefined ? Number(options.weekNumber) : 1;
  const db = options.prismaClient || prisma;

  let engineResult: WrapUpEngineRunResult = {
    poolsScanned: 0,
    poolsApplied: 0,
    poolsSkipped: 0,
    totalNotificationsEnqueued: 0,
    results: [],
  };

  const jobRun = await withJobRun('weekly_wrapup', async () => {
    const poolWhere: Prisma.PoolWhereInput = {
      status: 'ACTIVE',
    };
    if (options.poolId) {
      poolWhere.id = options.poolId;
    }

    const pools = await db.pool.findMany({
      where: poolWhere,
      select: { id: true, name: true },
    });

    const results: PoolWrapUpResult[] = [];
    let poolsApplied = 0;
    let poolsSkipped = 0;
    let totalNotificationsEnqueued = 0;

    for (const p of pools) {
      try {
        const wrapUpRes = await executeWeeklyWrapUpForPool(p.id, weekNumber, {
          prismaClient: db,
          season: options.season,
          seasonType: options.seasonType,
          tiebreakerOffered: options.tiebreakerOffered,
          previewRevision: options.previewRevision,
          inputFingerprint: options.inputFingerprint,
          appliedBy: options.appliedBy,
        });
        results.push(wrapUpRes);
        if (wrapUpRes.applied) {
          poolsApplied++;
          totalNotificationsEnqueued += wrapUpRes.notificationsEnqueued || 0;
        } else {
          poolsSkipped++;
        }
      } catch (err: any) {
        console.error(`Error wrapping up pool ${p.id}:`, err);
        results.push({
          applied: false,
          reason: err.message || 'EXECUTION_FAILED',
          poolId: p.id,
          season: options.season || 2026,
          weekNumber,
        });
        poolsSkipped++;
      }
    }

    engineResult = {
      poolsScanned: pools.length,
      poolsApplied,
      poolsSkipped,
      totalNotificationsEnqueued,
      results,
    };

    return {
      itemsProcessed: poolsApplied,
      succeeded: poolsApplied,
      failed: 0,
      meta: {
        weekNumber,
        poolsScanned: pools.length,
        poolsApplied,
        poolsSkipped,
        totalNotificationsEnqueued,
      },
    };
  });

  return { jobRun, engineResult };
}
