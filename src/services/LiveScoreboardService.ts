export interface LiveGameStatus {
  gameId: string;
  awayTeam: string;
  homeTeam: string;
  awayScore: number;
  homeScore: number;
  status: string; // e.g. "Q2 1:24" or "FINAL"
  isLive: boolean;
  isFinal: boolean;
  possession?: string;
  inRedZone?: boolean;
}

export class LiveScoreboardService {
  private static ESPN_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

  public static async fetchLiveScores(): Promise<LiveGameStatus[]> {
    try {
      const response = await fetch(this.ESPN_URL, {
        signal: AbortSignal.timeout(4000),
        headers: {
          Accept: 'application/json',
          'User-Agent': 'NFL-Pick-Em-Live-Scoreboard/1.0',
        },
      });

      if (!response.ok) {
        return [];
      }

      const data: any = await response.json();
      const events = data?.events || [];

      return events.map((event: any) => {
        const competition = event.competitions?.[0];
        const competitors = competition?.competitors || [];
        const home = competitors.find((c: any) => c.homeAway === 'home');
        const away = competitors.find((c: any) => c.homeAway === 'away');

        const state = event.status?.type?.state; // 'pre', 'in', 'post'

        return {
          gameId: event.id,
          awayTeam: away?.team?.abbreviation || 'AWAY',
          homeTeam: home?.team?.abbreviation || 'HOME',
          awayScore: parseInt(away?.score || '0', 10),
          homeScore: parseInt(home?.score || '0', 10),
          status: event.status?.type?.shortDetail || 'UPCOMING',
          isLive: state === 'in',
          isFinal: state === 'post',
          possession: competition?.situation?.possession,
          inRedZone: competition?.situation?.isRedZone || false,
        };
      });
    } catch (err) {
      console.error('[LiveScoreboardService] Failed to poll ESPN live score:', err);
      return [];
    }
  }
}
