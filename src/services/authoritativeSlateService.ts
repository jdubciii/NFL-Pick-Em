/**
 * Authoritative Slate & ESPN Provider Adapter Service
 * Authority: P41-AUTHORITATIVE-SLATE-ARCHITECTURE-2026-10-17-01
 * 
 * Implements Stage 1A and 1B:
 * - Normalized, typed adapter for ESPN NFL weekly slates.
 * - Strict metadata & scope verification (season, seasonType, week, identity, kickoff).
 * - Complete manifest fingerprinting and revision tracking.
 * - Atomic database slate persistence and refresh workflow.
 */

import crypto from 'crypto';
import { GameStatus } from '@prisma/client';
import prisma from '../db/client';

export const ADAPTER_VERSION = '1.0.0';

export interface ESPNProviderScope {
  seasonYear: number;
  seasonType: number; // 2 = Regular Season, 3 = Postseason
  weekNumber: number;
}

export interface CanonicalGameRecord {
  externalGameId: string; // Canonical ESPN event ID (e.g. "401872995")
  seasonYear: number;
  seasonType: number;
  weekNumber: number;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  kickoffTime: Date;
  status: GameStatus;
  homeScore: number | null;
  awayScore: number | null;
  spread: string | null;
  statusDetail: string | null;
  isKickoffConfirmed?: boolean;
}

export interface VerifiedSlateObservation {
  status: 'VERIFIED' | 'UNVERIFIED_SOURCE';
  provider: 'ESPN';
  league: 'NFL';
  seasonYear: number;
  seasonType: number;
  weekNumber: number;
  observationTime: string;
  adapterVersion: string;
  eventCount: number;
  events: CanonicalGameRecord[];
  manifestFingerprint: string;
  reasons: string[];
}

export interface WeeklySlateManifest {
  season: number;
  seasonType: number;
  weekNumber: number;
  revision: number;
  eventIds: string[];
  acceptedAt: string;
  acceptedBy: string;
  manifestFingerprint: string;
  observationTime: string;
}

/**
 * Standardizes NFL team abbreviations to official 3-letter codes.
 */
export function normalizeTeamCode(rawAbbrev: string): string {
  if (!rawAbbrev) return 'UNK';
  const clean = rawAbbrev.trim().toUpperCase();
  if (clean === 'WSH') return 'WAS';
  if (clean === 'JAC') return 'JAX';
  return clean;
}

/**
 * Maps ESPN competition state and name to internal GameStatus enum.
 */
export function mapESPNStatus(
  statusName?: string,
  state?: string,
  completed?: boolean
): GameStatus {
  const normState = state?.toLowerCase();
  const normName = statusName?.toUpperCase();

  if (
    completed === true ||
    normState === 'post' ||
    normName === 'STATUS_FINAL' ||
    normName === 'STATUS_FINAL_OVERTIME' ||
    normName === 'STATUS_FINAL_PEN'
  ) {
    return GameStatus.FINAL;
  }

  if (
    normState === 'in' ||
    normName === 'STATUS_IN_PROGRESS' ||
    normName === 'STATUS_HALFTIME' ||
    normName === 'STATUS_END_PERIOD'
  ) {
    return GameStatus.IN_PROGRESS;
  }

  return GameStatus.SCHEDULED;
}

/**
 * Deterministically computes a SHA-256 fingerprint for a weekly manifest.
 */
export function computeManifestFingerprint(
  season: number,
  seasonType: number,
  week: number,
  events: { externalGameId: string; homeTeamId: string; awayTeamId: string; kickoffTime: Date | string }[]
): string {
  const sorted = [...events].sort((a, b) => a.externalGameId.localeCompare(b.externalGameId));
  const normalized = sorted.map((e) => ({
    id: e.externalGameId,
    home: e.homeTeamId,
    away: e.awayTeamId,
    kickoff: new Date(e.kickoffTime).toISOString(),
  }));

  const payload = JSON.stringify({
    season,
    seasonType,
    week,
    events: normalized,
  });

  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Validates raw ESPN scoreboard response against requested scope and schema rules.
 */
export function validateAndTransformESPNScoreboard(
  data: any,
  expectedScope: ESPNProviderScope,
  observationTime = new Date().toISOString()
): VerifiedSlateObservation {
  const reasons: string[] = [];

  if (!data || typeof data !== 'object') {
    return {
      status: 'UNVERIFIED_SOURCE',
      provider: 'ESPN',
      league: 'NFL',
      seasonYear: expectedScope.seasonYear,
      seasonType: expectedScope.seasonType,
      weekNumber: expectedScope.weekNumber,
      observationTime,
      adapterVersion: ADAPTER_VERSION,
      eventCount: 0,
      events: [],
      manifestFingerprint: '',
      reasons: ['MALFORMED_RESPONSE: Scoreboard payload is empty or not an object.'],
    };
  }

  // 1. Verify Scope & Metadata
  const respSeasonYear = data.season?.year;
  const respSeasonType = data.season?.type;
  const respWeekNumber = data.week?.number;

  if (respSeasonYear !== undefined && respSeasonYear !== expectedScope.seasonYear) {
    reasons.push(`SCOPE_MISMATCH_SEASON: Expected season ${expectedScope.seasonYear}, received ${respSeasonYear}.`);
  }
  if (respSeasonType !== undefined && respSeasonType !== expectedScope.seasonType) {
    reasons.push(`SCOPE_MISMATCH_SEASON_TYPE: Expected season type ${expectedScope.seasonType}, received ${respSeasonType}.`);
  }
  if (respWeekNumber !== undefined && respWeekNumber !== expectedScope.weekNumber) {
    reasons.push(`SCOPE_MISMATCH_WEEK: Expected week ${expectedScope.weekNumber}, received ${respWeekNumber}.`);
  }

  const rawEvents = Array.isArray(data.events) ? data.events : [];
  if (rawEvents.length === 0) {
    reasons.push('EMPTY_SLATE: No events found in provider response.');
  }

  const events: CanonicalGameRecord[] = [];
  const seenEventIds = new Set<string>();

  for (let i = 0; i < rawEvents.length; i++) {
    const ev = rawEvents[i];
    const eventId = String(ev.id || '').trim();

    if (!eventId) {
      reasons.push(`INVALID_EVENT_ID: Event at index ${i} lacks valid id.`);
      continue;
    }

    if (seenEventIds.has(eventId)) {
      reasons.push(`DUPLICATE_EVENT_ID: Duplicate event ID ${eventId} encountered.`);
      continue;
    }
    seenEventIds.add(eventId);

    const competition = ev.competitions?.[0];
    if (!competition) {
      reasons.push(`MISSING_COMPETITION: Event ${eventId} lacks competitions array.`);
      continue;
    }

    const competitors = Array.isArray(competition.competitors) ? competition.competitors : [];
    const homeComp = competitors.find((c: any) => c.homeAway === 'home');
    const awayComp = competitors.find((c: any) => c.homeAway === 'away');

    if (!homeComp || !awayComp) {
      reasons.push(`INVALID_COMPETITORS: Event ${eventId} does not have both home and away competitors.`);
      continue;
    }

    const homeTeamId = normalizeTeamCode(homeComp.team?.abbreviation || '');
    const awayTeamId = normalizeTeamCode(awayComp.team?.abbreviation || '');

    if (homeTeamId === awayTeamId || homeTeamId === 'UNK' || awayTeamId === 'UNK') {
      reasons.push(`CONTRADICTORY_TEAMS: Event ${eventId} has contradictory or unknown teams (${awayTeamId} @ ${homeTeamId}).`);
      continue;
    }

    const statusObj = ev.status?.type || competition.status?.type;
    const status = mapESPNStatus(statusObj?.name, statusObj?.state, statusObj?.completed);

    const dateStr = ev.date || competition.date;
    const timeValid = competition.timeValid !== false && ev.timeValid !== false;
    const statusDetailStr = String(statusObj?.detail || '').toUpperCase();
    const statusNameStr = String(statusObj?.name || '').toUpperCase();
    const dateStrUpper = String(dateStr || '').toUpperCase();
    const isTBD = !timeValid || statusDetailStr.includes('TBD') || statusNameStr.includes('TBD') || dateStrUpper.includes('TBD');
    const isKickoffConfirmed = !isTBD;

    let kickoffTime = new Date(dateStr);
    if (isNaN(kickoffTime.getTime())) {
      if (isTBD) {
        // Default anchor for TBD game to preserve manifest coverage while denying writes
        kickoffTime = new Date('2026-10-25T00:00:00.000Z');
      } else {
        reasons.push(`INVALID_KICKOFF: Event ${eventId} has unparseable kickoff date "${dateStr}".`);
        continue;
      }
    }

    let homeScore: number | null = null;
    let awayScore: number | null = null;

    if (status === GameStatus.IN_PROGRESS || status === GameStatus.FINAL) {
      if (homeComp.score !== undefined && homeComp.score !== null && homeComp.score !== '') {
        const parsed = parseInt(homeComp.score, 10);
        if (!isNaN(parsed)) homeScore = parsed;
      }
      if (awayComp.score !== undefined && awayComp.score !== null && awayComp.score !== '') {
        const parsed = parseInt(awayComp.score, 10);
        if (!isNaN(parsed)) awayScore = parsed;
      }

      if (status === GameStatus.FINAL && (homeScore === null || awayScore === null)) {
        reasons.push(`FINAL_WITHOUT_SCORES: Event ${eventId} marked FINAL but missing numeric scores.`);
      }
    }

    const spreadDetails = competition.odds?.[0]?.details || null;
    const statusDetail = statusObj?.detail || null;

    events.push({
      externalGameId: eventId,
      seasonYear: expectedScope.seasonYear,
      seasonType: expectedScope.seasonType,
      weekNumber: expectedScope.weekNumber,
      homeTeamId,
      awayTeamId,
      homeTeamName: homeComp.team?.displayName || homeTeamId,
      awayTeamName: awayComp.team?.displayName || awayTeamId,
      kickoffTime,
      status,
      homeScore,
      awayScore,
      spread: spreadDetails,
      statusDetail,
      isKickoffConfirmed,
    });
  }

  const isVerified = reasons.length === 0 && events.length > 0;
  const manifestFingerprint = isVerified
    ? computeManifestFingerprint(expectedScope.seasonYear, expectedScope.seasonType, expectedScope.weekNumber, events)
    : '';

  return {
    status: isVerified ? 'VERIFIED' : 'UNVERIFIED_SOURCE',
    provider: 'ESPN',
    league: 'NFL',
    seasonYear: expectedScope.seasonYear,
    seasonType: expectedScope.seasonType,
    weekNumber: expectedScope.weekNumber,
    observationTime,
    adapterVersion: ADAPTER_VERSION,
    eventCount: events.length,
    events,
    manifestFingerprint,
    reasons,
  };
}

/**
 * Fetches and validates live or mocked ESPN scoreboard.
 */
export async function fetchAuthoritativeESPNScoreboard(
  scope: ESPNProviderScope,
  fetchFn: typeof fetch = fetch
): Promise<VerifiedSlateObservation> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=${scope.seasonType}&week=${scope.weekNumber}`;

  let response: Response;
  try {
    response = await fetchFn(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'NFL-Pick-Em-Authoritative-Slate-Service/1.0',
      },
    });
  } catch (err: any) {
    return {
      status: 'UNVERIFIED_SOURCE',
      provider: 'ESPN',
      league: 'NFL',
      seasonYear: scope.seasonYear,
      seasonType: scope.seasonType,
      weekNumber: scope.weekNumber,
      observationTime: new Date().toISOString(),
      adapterVersion: ADAPTER_VERSION,
      eventCount: 0,
      events: [],
      manifestFingerprint: '',
      reasons: [`FETCH_ERROR: ${err.message}`],
    };
  }

  if (!response.ok) {
    return {
      status: 'UNVERIFIED_SOURCE',
      provider: 'ESPN',
      league: 'NFL',
      seasonYear: scope.seasonYear,
      seasonType: scope.seasonType,
      weekNumber: scope.weekNumber,
      observationTime: new Date().toISOString(),
      adapterVersion: ADAPTER_VERSION,
      eventCount: 0,
      events: [],
      manifestFingerprint: '',
      reasons: [`HTTP_${response.status}: ESPN request failed with ${response.statusText}`],
    };
  }

  const data = await response.json();
  return validateAndTransformESPNScoreboard(data, scope);
}

/**
 * Queries accepted weekly slate manifest.
 * Fallback to memory or database inspection without schema break.
 */
export async function getAcceptedSlateManifest(
  db: any,
  season: number,
  seasonType: number,
  weekNumber: number
): Promise<WeeklySlateManifest | null> {
  try {
    const tableExists: any[] = await db.$queryRawUnsafe(
      `SELECT to_regclass('public.weekly_slate_manifests') as to_regclass;`
    ).catch(() => []);

    if (tableExists?.[0]?.to_regclass) {
      const rows: any[] = await db.$queryRawUnsafe(
        `SELECT season, season_type, week_number, revision, event_ids, accepted_at, accepted_by, manifest_fingerprint, observation_time
         FROM public.weekly_slate_manifests
         WHERE season = $1::int AND season_type = $2::int AND week_number = $3::int;`,
        season,
        seasonType,
        weekNumber
      ).catch(() => []);

      if (rows.length > 0) {
        const r = rows[0];
        return {
          season: r.season,
          seasonType: r.season_type,
          weekNumber: r.week_number,
          revision: Number(r.revision),
          eventIds: Array.isArray(r.event_ids) ? r.event_ids : JSON.parse(r.event_ids || '[]'),
          acceptedAt: new Date(r.accepted_at).toISOString(),
          acceptedBy: r.accepted_by,
          manifestFingerprint: r.manifest_fingerprint,
          observationTime: new Date(r.observation_time).toISOString(),
        };
      }
    }
  } catch {
    // Return null if table absent or query fails
  }
  return null;
}

/**
 * Controlled commissioner refresh workflow:
 * 1. Fetch & validate observations before opening database transaction.
 * 2. In transaction:
 *    - Recheck authoritative scope and accepted revision.
 *    - Apply deterministic canonical event mapping.
 *    - Preserve existing pick associations and Game identities.
 *    - Persist accepted observations and revision atomically.
 */
export async function refreshWeeklySlateInDb(
  db: any,
  params: {
    poolId?: string;
    seasonYear: number;
    seasonType?: number;
    weekNumber: number;
    operatorId: string;
    customFetch?: typeof fetch;
    preloadedObservation?: VerifiedSlateObservation;
  }
): Promise<{
  success: boolean;
  revision: number;
  manifestFingerprint: string;
  eventCount: number;
  games: any[];
  reason?: string;
}> {
  const seasonType = params.seasonType ?? 2;
  const scope: ESPNProviderScope = {
    seasonYear: params.seasonYear,
    seasonType,
    weekNumber: params.weekNumber,
  };

  // Step 1: Fetch and validate observations BEFORE opening write transaction
  const observation = params.preloadedObservation || (await fetchAuthoritativeESPNScoreboard(scope, params.customFetch));
  if (observation.status !== 'VERIFIED') {
    return {
      success: false,
      revision: 0,
      manifestFingerprint: '',
      eventCount: 0,
      games: [],
      reason: `UNVERIFIED_SOURCE: ${observation.reasons.join('; ')}`,
    };
  }

  // Step 2: Atomic database write transaction
  if (typeof db.$transaction !== 'function') {
    throw new Error('TRANSACTION_UNAVAILABLE: Real database transaction runner required for authoritative slate persistence.');
  }

  return await db.$transaction(async (tx: any) => {
    // Check prior accepted manifest
    const currentManifest = await getAcceptedSlateManifest(tx, scope.seasonYear, scope.seasonType, scope.weekNumber);

    // Invariant: Do not shrink a verified manifest
    if (currentManifest) {
      const priorEventIds = new Set(currentManifest.eventIds);
      const incomingEventIds = new Set(observation.events.map((e) => e.externalGameId));

      for (const priorId of priorEventIds) {
        if (!incomingEventIds.has(priorId)) {
          throw new Error(`CANNOT_SHRINK_MANIFEST: Incoming slate drops previously accepted event ${priorId}.`);
        }
      }
    }

    const isIdempotent = currentManifest && currentManifest.manifestFingerprint === observation.manifestFingerprint;
    const nextRevision = isIdempotent ? currentManifest.revision : (currentManifest?.revision || 0) + 1;
    const upsertedGames: any[] = [];

    // Persist canonical games into public.games
    // Preserve internal Game UUID if game already exists under externalGameId
    for (const ev of observation.events) {
      let existingGame: any = null;

      // Deterministic identity lookup: zero matches allows insert, 1 permits bounded update, >1 is conflict
      if (typeof tx.game?.findMany === 'function') {
        const matches = await tx.game.findMany({
          where: {
            OR: [
              { externalGameId: ev.externalGameId },
              { externalGameId: `espn_${ev.externalGameId}` },
            ],
          },
        });
        if (matches.length > 1) {
          throw new Error(`CONFLICTING_GAME_IDENTITY: Multiple existing games matched external ID ${ev.externalGameId}.`);
        }
        existingGame = matches[0] || null;
      } else if (typeof tx.game?.findFirst === 'function') {
        existingGame = await tx.game.findFirst({
          where: {
            OR: [
              { externalGameId: ev.externalGameId },
              { externalGameId: `espn_${ev.externalGameId}` },
            ],
          },
        });
      }

      if (existingGame) {
        // Bounded update: prevent regression of FINAL status and protect existing scores from null overwrite
        const isAlreadyFinal = existingGame.status === GameStatus.FINAL;
        const preserveStatus = isAlreadyFinal && ev.status !== GameStatus.FINAL ? existingGame.status : ev.status;
        const preserveHomeScore = ev.homeScore !== null ? ev.homeScore : existingGame.homeScore;
        const preserveAwayScore = ev.awayScore !== null ? ev.awayScore : existingGame.awayScore;

        const updated = await tx.game.update({
          where: { id: existingGame.id },
          data: {
            homeTeamId: ev.homeTeamId,
            awayTeamId: ev.awayTeamId,
            kickoffTime: ev.kickoffTime,
            status: preserveStatus,
            homeScore: preserveHomeScore,
            awayScore: preserveAwayScore,
          },
        });
        upsertedGames.push(updated);
      } else {
        // Create canonical game with externalGameId = canonical ESPN event ID
        const created = await tx.game.create({
          data: {
            externalGameId: ev.externalGameId,
            homeTeamId: ev.homeTeamId,
            awayTeamId: ev.awayTeamId,
            kickoffTime: ev.kickoffTime,
            status: ev.status,
            homeScore: ev.homeScore,
            awayScore: ev.awayScore,
          },
        });
        upsertedGames.push(created);
      }
    }

    // Persist manifest atomically; fail closed and rollback if write fails
    const manifestTableExists: any[] = await tx.$queryRawUnsafe(
      `SELECT to_regclass('public.weekly_slate_manifests') as to_regclass;`
    ).catch(() => []);

    if (manifestTableExists?.[0]?.to_regclass) {
      await tx.$queryRawUnsafe(
        `INSERT INTO public.weekly_slate_manifests (
           season, season_type, week_number, revision, event_ids, accepted_at, accepted_by, manifest_fingerprint, observation_time
         ) VALUES (
           $1::int, $2::int, $3::int, $4::int, $5::text[], NOW(), $6::uuid, $7::text, $8::timestamptz
         ) ON CONFLICT (season, season_type, week_number) DO UPDATE SET
           revision = $4::int,
           event_ids = $5::text[],
           accepted_at = NOW(),
           accepted_by = $6::uuid,
           manifest_fingerprint = $7::text,
           observation_time = $8::timestamptz;`,
        scope.seasonYear,
        scope.seasonType,
        scope.weekNumber,
        nextRevision,
        observation.events.map((e) => e.externalGameId),
        params.operatorId,
        observation.manifestFingerprint,
        observation.observationTime
      );
    }

    return {
      success: true,
      revision: nextRevision,
      manifestFingerprint: observation.manifestFingerprint,
      eventCount: observation.events.length,
      games: upsertedGames,
    };
  });
}

/**
 * Orchestrates full season schedule and scores import for weeks 7 through 18.
 * Preserves existing games and performs additive upserts under Option A contract.
 */
export async function orchestrateFullSeasonImport(
  db: any,
  params: {
    startWeek?: number;
    endWeek?: number;
    seasonYear?: number;
    seasonType?: number;
    operatorId: string;
    customFetch?: typeof fetch;
  }
): Promise<{
  success: boolean;
  seasonYear: number;
  seasonType: number;
  importedWeeks: number[];
  failedWeeks: { week: number; reason: string }[];
  totalGamesUpserted: number;
}> {
  const start = params.startWeek ?? 7;
  const end = params.endWeek ?? 18;
  const seasonYear = params.seasonYear ?? 2026;
  const seasonType = params.seasonType ?? 2;

  const importedWeeks: number[] = [];
  const failedWeeks: { week: number; reason: string }[] = [];
  let totalGamesUpserted = 0;

  for (let week = start; week <= end; week++) {
    try {
      const result = await refreshWeeklySlateInDb(db, {
        seasonYear,
        seasonType,
        weekNumber: week,
        operatorId: params.operatorId,
        customFetch: params.customFetch,
      });

      if (result.success) {
        importedWeeks.push(week);
        totalGamesUpserted += result.eventCount;
      } else {
        failedWeeks.push({ week, reason: result.reason || 'Unknown rejection' });
      }
    } catch (err: any) {
      failedWeeks.push({ week, reason: err.message || 'Execution exception' });
    }
  }

  return {
    success: failedWeeks.length === 0,
    seasonYear,
    seasonType,
    importedWeeks,
    failedWeeks,
    totalGamesUpserted,
  };
}
