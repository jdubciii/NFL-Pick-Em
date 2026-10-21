/**
 * Client Authoritative Slate Resolution Service
 * Governs manifest primacy, pool authority, exact unique coverage, and bounded cache.
 */

export interface AuthoritativeManifestRecord {
  season: number;
  season_type: number;
  week_number: number;
  revision: number;
  manifest_fingerprint: string;
  event_ids: string[];
  observation_time: string | null;
  accepted_at: string | null;
}

export interface SlateResolutionResult {
  games: any[];
  manifest: AuthoritativeManifestRecord | null;
  lastUpdatedIso: string | null;
  error?: string;
  source: 'PERSISTED_MANIFEST' | 'FAILED_CLOSED';
}

export interface ResolveAuthoritativeSlateParams {
  supabase: any;
  activePoolId: string;
  seasonYear: number;
  seasonType: number;
  weekNumber: number;
  liveScores?: any[];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Searches localStorage for the highest cached revision matching the exact delimited scope.
 * Prevents prefix collisions (e.g. week 7 matching week 17).
 * Rejects old unscoped/revisionless entries.
 */
export function getHighestCachedSlateRevision(
  storage: Storage,
  poolId: string,
  season: number,
  seasonType: number,
  week: number
): { games: any[]; revision: number } | null {
  if (!storage || !poolId) return null;
  const regex = new RegExp(`^picks_slate_${escapeRegex(poolId)}_s${season}_t${seasonType}_w${week}_r(\\d+)$`);
  let highestRev = -1;
  let highestData: string | null = null;

  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key) continue;
    const match = key.match(regex);
    if (match) {
      const rev = parseInt(match[1], 10);
      if (!isNaN(rev) && rev > highestRev) {
        highestRev = rev;
        highestData = storage.getItem(key);
      }
    }
  }

  if (highestRev >= 0 && highestData) {
    try {
      const parsed = JSON.parse(highestData);
      if (Array.isArray(parsed)) {
        return { games: parsed, revision: highestRev };
      }
    } catch (_) {}
  }
  return null;
}

/**
 * Saves slate games to localStorage under exact delimited scope with revision key.
 */
export function saveScopedSlateRevisionCache(
  storage: Storage,
  poolId: string,
  season: number,
  seasonType: number,
  week: number,
  revision: number,
  games: any[]
): void {
  if (!storage || !poolId) return;
  const key = `picks_slate_${poolId}_s${season}_t${seasonType}_w${week}_r${revision}`;
  try {
    storage.setItem(key, JSON.stringify(games));
  } catch (_) {}
}

/**
 * Resolves authoritative games slate for a pool, season, seasonType, and week.
 * Enforces manifest primacy: missing/denied/error state strictly fails closed to empty games.
 * Direct games fallback requires verified active pool authority.
 * Coverage must be complete, exact, and unique for accepted event_ids.
 */
export async function resolveAuthoritativeSlate(
  params: ResolveAuthoritativeSlateParams
): Promise<SlateResolutionResult> {
  const { supabase, activePoolId, seasonYear, seasonType, weekNumber, liveScores } = params;

  if (!supabase || !activePoolId) {
    return {
      games: [],
      manifest: null,
      lastUpdatedIso: null,
      error: 'MISSING_CLIENT_OR_POOL',
      source: 'FAILED_CLOSED',
    };
  }

  // 1. Fetch weekly slate manifest for exact scope
  let manifest: AuthoritativeManifestRecord | null = null;
  try {
    const { data, error: manifestErr } = await supabase
      .from('weekly_slate_manifests')
      .select('season, season_type, week_number, revision, manifest_fingerprint, event_ids, observation_time, accepted_at')
      .eq('season', seasonYear)
      .eq('season_type', seasonType)
      .eq('week_number', weekNumber)
      .maybeSingle();

    if (manifestErr || !data) {
      return {
        games: [],
        manifest: null,
        lastUpdatedIso: null,
        error: manifestErr?.message || 'NO_ACCEPTED_MANIFEST',
        source: 'FAILED_CLOSED',
      };
    }
    manifest = data;
  } catch (err: any) {
    return {
      games: [],
      manifest: null,
      lastUpdatedIso: null,
      error: err?.message || 'MANIFEST_FETCH_FAILED',
      source: 'FAILED_CLOSED',
    };
  }

  if (!manifest || !Array.isArray(manifest.event_ids) || manifest.event_ids.length === 0) {
    return {
      games: [],
      manifest: null,
      lastUpdatedIso: null,
      error: 'EMPTY_MANIFEST_EVENTS',
      source: 'FAILED_CLOSED',
    };
  }

  const rawEventIds = manifest.event_ids.map(String);
  const acceptedEventIds = Array.from(new Set(rawEventIds));
  if (acceptedEventIds.length !== rawEventIds.length) {
    return {
      games: [],
      manifest,
      lastUpdatedIso: null,
      error: 'DUPLICATE_MANIFEST_EVENT_IDS',
      source: 'FAILED_CLOSED',
    };
  }

  // 2. Fetch canonical games via RPC or direct table with pool authority check
  let candidateRows: any[] = [];
  let rpcSuccess = false;

  if (typeof supabase.rpc === 'function') {
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('get_pool_canonical_games', {
        p_pool_id: activePoolId,
        p_season: seasonYear,
        p_week: weekNumber,
      });
      if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
        candidateRows = rpcData;
        rpcSuccess = true;
      }
    } catch (_) {}
  }

  // If direct fallback is needed or to enrich metadata:
  // Direct fallback MUST prove active pool authority, not override denial
  let hasPoolAuthority = rpcSuccess;
  if (!hasPoolAuthority) {
    try {
      const { data: membership, error: memErr } = await supabase
        .from('pool_memberships')
        .select('status')
        .eq('pool_id', activePoolId)
        .maybeSingle();

      if (!memErr && membership && membership.status === 'ACTIVE') {
        hasPoolAuthority = true;
      }
    } catch (_) {}
  }

  if (!hasPoolAuthority) {
    return {
      games: [],
      manifest,
      lastUpdatedIso: null,
      error: 'POOL_AUTHORITY_DENIED: Direct games query requires verified active pool membership.',
      source: 'FAILED_CLOSED',
    };
  }

  // Query games table matching exact revision
  try {
    const { data: directGames, error: directErr } = await supabase
      .from('games')
      .select('id, external_game_id, home_team_id, away_team_id, kickoff_time, status, home_score, away_score, canonical_kickoff_time, lock_effective_at, season, season_type, week, observation_time, manifest_revision')
      .eq('season', seasonYear)
      .eq('season_type', seasonType)
      .eq('week', weekNumber)
      .eq('manifest_revision', manifest.revision);

    if (!directErr && Array.isArray(directGames) && directGames.length > 0) {
      if (candidateRows.length === 0) {
        candidateRows = directGames;
      } else {
        const directMap = new Map(directGames.map((g: any) => [String(g.external_game_id || g.id), g]));
        candidateRows = candidateRows.map((r: any) => {
          const ext = String(r.externalGameId || r.external_game_id || r.id);
          const dm = directMap.get(ext);
          return dm ? { ...r, ...dm } : r;
        });
      }
    }
  } catch (_) {}

  // 3. Verify complete, exact, unique coverage for acceptedEventIds
  const matchedGames: any[] = [];
  const candidateMap = new Map<string, any>();

  for (const g of candidateRows) {
    const ext = String(g.external_game_id || g.externalGameId || g.id);
    if (acceptedEventIds.includes(ext)) {
      if (candidateMap.has(ext)) {
        return {
          games: [],
          manifest,
          lastUpdatedIso: null,
          error: `CONFLICTING_GAME_IDENTITY: Multiple rows returned for accepted event ${ext}`,
          source: 'FAILED_CLOSED',
        };
      }
      candidateMap.set(ext, g);
    }
  }

  for (const eventId of acceptedEventIds) {
    const matched = candidateMap.get(eventId);
    if (!matched) {
      return {
        games: [],
        manifest,
        lastUpdatedIso: null,
        error: `INCOMPLETE_MANIFEST_COVERAGE: Accepted event ${eventId} not found in canonical rows for revision ${manifest.revision}`,
        source: 'FAILED_CLOSED',
      };
    }
    matchedGames.push(matched);
  }

  // 4. Map to playable GameItems with lock/score enrichment
  let liveScoresMap = new Map<string, any>();
  if (Array.isArray(liveScores)) {
    liveScores.forEach((ls) => {
      liveScoresMap.set(String(ls.id), ls);
      if (ls.awayTeam?.code && ls.homeTeam?.code) {
        liveScoresMap.set(`${ls.awayTeam.code}@${ls.homeTeam.code}`, ls);
      }
    });
  }

  const playableGames = matchedGames.map((g: any) => {
    const extId = String(g.external_game_id || g.externalGameId || g.id);
    const homeAbbr = String(g.home_team_id || g.homeTeamId || '').toUpperCase();
    const awayAbbr = String(g.away_team_id || g.awayTeamId || '').toUpperCase();

    const liveScore = liveScoresMap.get(extId) || liveScoresMap.get(`${awayAbbr}@${homeAbbr}`);

    let mappedStatus: 'SCHEDULED' | 'IN_PROGRESS' | 'FINAL' = (g.status as any) || 'SCHEDULED';
    if (mappedStatus !== 'FINAL' && liveScore?.status) {
      mappedStatus = liveScore.status;
    }

    let gameStatus: 'FINAL' | 'LIVE' | 'SCHEDULED' = 'SCHEDULED';
    if (mappedStatus === 'FINAL') {
      gameStatus = 'FINAL';
    } else if (mappedStatus === 'IN_PROGRESS') {
      gameStatus = 'LIVE';
    }

    const homeScoreVal =
      liveScore?.homeTeam?.score != null && !isNaN(parseInt(liveScore.homeTeam.score, 10))
        ? parseInt(liveScore.homeTeam.score, 10)
        : g.home_score != null
        ? Number(g.home_score)
        : g.homeScore != null
        ? Number(g.homeScore)
        : null;

    const awayScoreVal =
      liveScore?.awayTeam?.score != null && !isNaN(parseInt(liveScore.awayTeam.score, 10))
        ? parseInt(liveScore.awayTeam.score, 10)
        : g.away_score != null
        ? Number(g.away_score)
        : g.awayScore != null
        ? Number(g.awayScore)
        : null;

    const isHalftime = liveScore?.statusDetail?.toLowerCase?.().includes('halftime');
    const displayClockVal =
      liveScore?.displayClock ||
      (isHalftime ? 'HALFTIME' : '0:00');
    const rawPeriod = Number(liveScore?.period) || 1;
    const periodLabelVal =
      liveScore?.periodLabel ||
      (mappedStatus === 'FINAL' ? 'FINAL' : isHalftime ? 'HALF' : (rawPeriod >= 5 ? 'OT' : `Q${rawPeriod}`));

    const canonicalKickoffIso = g.canonical_kickoff_time || g.kickoff_time || g.kickoffTime;
    const lockEffectiveIso = g.lock_effective_at || canonicalKickoffIso;

    const isUnconfirmed =
      g.canonical_kickoff_time === null ||
      (g.lock_effective_at && new Date(g.lock_effective_at).getTime() <= 0) ||
      !canonicalKickoffIso ||
      new Date(canonicalKickoffIso).getTime() <= 0;

    return {
      id: String(g.id),
      externalGameId: extId,
      homeTeamId: homeAbbr,
      awayTeamId: awayAbbr,
      kickoffTime: isUnconfirmed
        ? '1970-01-01T00:00:00.000Z'
        : typeof canonicalKickoffIso === 'string'
        ? canonicalKickoffIso
        : new Date(canonicalKickoffIso).toISOString(),
      status: mappedStatus,
      homeScore: homeScoreVal,
      awayScore: awayScoreVal,
      spread: null,
      userPick: null,
      pickId: null,
      isLive: mappedStatus === 'IN_PROGRESS',
      gameStatus,
      displayClock: displayClockVal,
      periodLabel: periodLabelVal,
      isKickoffConfirmed: !isUnconfirmed,
      canonical_kickoff_time: g.canonical_kickoff_time,
      lock_effective_at: lockEffectiveIso,
      season: g.season,
      seasonType: g.season_type,
      week: g.week,
    };
  });

  // Sort chronologically by kickoff
  const sortedGames = [...playableGames].sort(
    (a, b) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime()
  );

  const syncIso =
    manifest.observation_time ||
    manifest.accepted_at ||
    (matchedGames.length > 0 ? matchedGames[0].observation_time : null);

  return {
    games: sortedGames,
    manifest,
    lastUpdatedIso: syncIso,
    source: 'PERSISTED_MANIFEST',
  };
}
