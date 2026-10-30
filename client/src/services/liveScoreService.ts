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
      // Spreads Jack provided for Week 8, and only these. No ESPN odds,
      // no lines for any other game. Shown in favorites format:
      // Jack's TEN +10.5 becomes CIN -10.5, IND +10.5 becomes JAX -10.5,
      // ARI +7.5 becomes DAL -7.5.
      const jackSpreads: Record<string, string> = {
        'TEN@CIN': 'CIN -10.5',
        'IND@JAX': 'JAX -10.5',
        'ARI@DAL': 'DAL -7.5',
      };
      const favoriteLine = weekNumber === 8 ? (jackSpreads[`${awayCode}@${homeCode}`] || null) : null;

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
