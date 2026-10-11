export interface LiveGame {
  id: string;
  name: string;
  shortName: string;
  homeTeam: { code: string; name: string; score: string };
  awayTeam: { code: string; name: string; score: string };
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINAL';
  clock: string;
  period: number;
  downDistanceText?: string;
  isRedZone?: boolean;
}

export async function fetchLiveNFLScores(): Promise<LiveGame[]> {
  try {
    const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard');
    if (!res.ok) throw new Error('Failed to fetch ESPN scores');
    const data = await res.json();
    
    return (data.events || []).map((event: any) => {
      const competition = event.competitions?.[0];
      const competitors = competition?.competitors || [];
      const home = competitors.find((c: any) => c.homeAway === 'home') || {};
      const away = competitors.find((c: any) => c.homeAway === 'away') || {};
      const statusType = event.status?.type?.name;
      
      let mappedStatus: 'SCHEDULED' | 'IN_PROGRESS' | 'FINAL' = 'SCHEDULED';
      if (statusType === 'STATUS_FINAL') mappedStatus = 'FINAL';
      else if (statusType === 'STATUS_IN_PROGRESS') mappedStatus = 'IN_PROGRESS';

      return {
        id: event.id,
        name: event.name,
        shortName: event.shortName,
        homeTeam: {
          code: home.team?.abbreviation || 'HOM',
          name: home.team?.displayName || 'Home',
          score: home.score || '0'
        },
        awayTeam: {
          code: away.team?.abbreviation || 'AWY',
          name: away.team?.displayName || 'Away',
          score: away.score || '0'
        },
        status: mappedStatus,
        clock: event.status?.displayClock || '0:00',
        period: event.status?.period || 1,
        downDistanceText: competition?.situation?.downDistanceText || '',
        isRedZone: Boolean(competition?.situation?.isRedZone)
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

