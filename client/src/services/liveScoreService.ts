export interface LiveGame {
  id: string;
  name: string;
  shortName: string;
  homeTeam: { code: string; name: string; score?: string; record?: string | null };
  awayTeam: { code: string; name: string; score?: string; record?: string | null };
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINAL';
  kickoffTime?: string;
  clock: string;
  period: number;
  downDistanceText?: string;
  isRedZone?: boolean;
  state?: string;
  displayClock?: string;
  periodLabel?: string;
  dateTime?: string;
  favoriteLine?: string | null;
  spread?: number | null;
  seasonYear?: number;
}

// Jack's supplied Week 8 lines. The number is the home team's spread.
// No feed odds or inferred lines are used for any other matchup or week.
const WEEK_8_HOME_SPREADS: Record<string, number> = {
  'TEN@CIN': -10.5,
  'IND@JAX': -10.5,
  'ARI@DAL': -7.5,
};

// Jack's supplied Week 9 lines. The number is the home team's spread.
const WEEK_9_HOME_SPREADS: Record<string, number> = {
  'JAX@BAL': 10.5,
  'NYJ@KC': -10.5,
  'DET@MIA': 7.5,
};

function normalizeSpreadTeamCode(code: string): string {
  const value = String(code || '').trim().toUpperCase();
  return value === 'JAC' ? 'JAX' : value === 'WSH' ? 'WAS' : value;
}

export function getJackWeek8HomeSpread(weekNumber: number, awayCode: string, homeCode: string, seasonYear: number): number | null {
  if (weekNumber !== 8 || seasonYear !== 2026) return null;
  return WEEK_8_HOME_SPREADS[`${normalizeSpreadTeamCode(awayCode)}@${normalizeSpreadTeamCode(homeCode)}`] ?? null;
}

export function getJackWeek9HomeSpread(weekNumber: number, awayCode: string, homeCode: string, seasonYear: number): number | null {
  if (weekNumber !== 9 || seasonYear !== 2026) return null;
  return WEEK_9_HOME_SPREADS[`${normalizeSpreadTeamCode(awayCode)}@${normalizeSpreadTeamCode(homeCode)}`] ?? null;
}

export function getJackWeek9SpreadLine(weekNumber: number, awayCode: string, homeCode: string, seasonYear: number): string | null {
  const homeSpread = getJackWeek9HomeSpread(weekNumber, awayCode, homeCode, seasonYear);
  if (homeSpread === null) return null;
  const home = normalizeSpreadTeamCode(homeCode);
  const away = normalizeSpreadTeamCode(awayCode);
  return homeSpread > 0
    ? `${home} +${homeSpread} / ${away} -${homeSpread}`
    : `${away} +${-homeSpread} / ${home} ${homeSpread}`;
}

export function getJackApprovedHomeSpread(weekNumber: number, awayCode: string, homeCode: string, seasonYear: number): number | null {
  return getJackWeek9HomeSpread(weekNumber, awayCode, homeCode, seasonYear)
    ?? getJackWeek8HomeSpread(weekNumber, awayCode, homeCode, seasonYear);
}

export function getJackApprovedSpreadLine(weekNumber: number, awayCode: string, homeCode: string, seasonYear: number): string | null {
  return getJackWeek9SpreadLine(weekNumber, awayCode, homeCode, seasonYear)
    ?? getJackWeek8FavoriteLine(weekNumber, awayCode, homeCode, seasonYear);
}

export function getJackWeek8FavoriteLine(weekNumber: number, awayCode: string, homeCode: string, seasonYear: number): string | null {
  const homeSpread = getJackWeek8HomeSpread(weekNumber, awayCode, homeCode, seasonYear);
  if (homeSpread === null) return null;
  return `${homeSpread < 0 ? normalizeSpreadTeamCode(homeCode) : normalizeSpreadTeamCode(awayCode)} -${Math.abs(homeSpread)}`;
}

export async function fetchLiveNFLScores(weekNumber: number = 5): Promise<LiveGame[]> {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${weekNumber}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch ESPN scores');
    const data = await res.json();
    
    return (data.events || []).map((event: any) => {
      const competition = event.competitions?.[0];
      const competitors = competition?.competitors || [];
      const home = competitors.find((c: any) => c.homeAway === 'home') || {};
      const away = competitors.find((c: any) => c.homeAway === 'away') || {};
      const statusName = event.status?.type?.name || '';
      const statusDetail = event.status?.type?.detail || event.status?.type?.description || event.status?.type?.shortDetail || '';
      
      const isHalftime = statusName === 'STATUS_HALFTIME' || statusDetail.toLowerCase().includes('halftime');
      let mappedStatus: 'SCHEDULED' | 'IN_PROGRESS' | 'FINAL' = 'SCHEDULED';
      let state = 'PRE';
      let displayClock = event.status?.displayClock || '0:00';
      const rawPeriod = Number(event.status?.period) || 1;
      let periodLabel = rawPeriod >= 5 ? 'OT' : `Q${rawPeriod}`;

      if (statusName === 'STATUS_FINAL') {
        mappedStatus = 'FINAL';
        state = 'POST';
        periodLabel = 'FINAL';
      } else if (isHalftime) {
        mappedStatus = 'IN_PROGRESS';
        state = 'LIVE';
        displayClock = 'HALFTIME';
        periodLabel = 'HALF';
      } else if (statusName === 'STATUS_IN_PROGRESS') {
        mappedStatus = 'IN_PROGRESS';
        state = 'LIVE';
      }

      const rawHomeCode = (home.team?.abbreviation || 'HOM').trim().toUpperCase();
      const rawAwayCode = (away.team?.abbreviation || 'AWY').trim().toUpperCase();
      const homeCode = rawHomeCode === 'WSH' ? 'WAS' : rawHomeCode === 'JAC' ? 'JAX' : rawHomeCode;
      const awayCode = rawAwayCode === 'WSH' ? 'WAS' : rawAwayCode === 'JAC' ? 'JAX' : rawAwayCode;

      const getRecord = (c: any): string | null => {
        const recs = Array.isArray(c?.records) ? c.records : [];
        const total = recs.find((r: any) => r?.type === 'total') || recs[0];
        return total?.summary || null;
      };
      const seasonYear = Number(data.season?.year ?? event.season?.year ?? (event.date ? new Date(event.date).getUTCFullYear() : NaN));
      const spread = getJackApprovedHomeSpread(weekNumber, awayCode, homeCode, seasonYear);
      const favoriteLine = getJackApprovedSpreadLine(weekNumber, awayCode, homeCode, seasonYear);

      const homeScore = home.score !== undefined && home.score !== null ? String(home.score) : undefined;
      const awayScore = away.score !== undefined && away.score !== null ? String(away.score) : undefined;
      const kickoffIso = event.date ? new Date(event.date).toISOString() : undefined;

      return {
        id: String(event.id),
        name: event.name,
        shortName: event.shortName,
        homeTeam: {
          code: homeCode,
          name: home.team?.displayName || 'Home',
          score: homeScore,
          record: getRecord(home),
        },
        awayTeam: {
          code: awayCode,
          name: away.team?.displayName || 'Away',
          score: awayScore,
          record: getRecord(away),
        },
        status: mappedStatus,
        kickoffTime: kickoffIso,
        clock: displayClock,
        period: event.status?.period || (isHalftime ? 2 : 1),
        downDistanceText: competition?.situation?.downDistanceText || '',
        isRedZone: Boolean(competition?.situation?.isRedZone),
        state,
        displayClock,
        periodLabel,
        dateTime: event.date || undefined,
        favoriteLine,
        spread,
        seasonYear,
      };
    });
  } catch (err) {
    console.warn('Live score fetch fallback:', err);
    return [];
  }
}

/**
 * Authoritative Live Score Feed Ingestion & Telemetry Processing Function
 * Architecturally isolated pure function that accepts only game telemetry arrays
 * and contains zero references or imports to picks, locks, database clients, or mutation sinks.
 * Strictly guarantees that live feed polling and network failovers cannot mutate
 * user picks, kickoff locks, or persist side effects (Decision #54 & Decision #66).
 */
export function processLiveScoreUpdate(existingGames: LiveGame[], newScores: LiveGame[]): LiveGame[] {
  if (!newScores || newScores.length === 0) {
    // Preserve existing live telemetry state on transient network failover or error
    return existingGames;
  }
  return [...newScores];
}
