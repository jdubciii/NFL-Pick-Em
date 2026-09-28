import { GameStatus } from '@prisma/client';

export interface NFLTeamData {
  id: string;
  name: string;
  abbreviation: string;
  displayName: string;
  logo?: string;
}

export interface NFLGameData {
  externalGameId: string;
  homeTeam: NFLTeamData;
  awayTeam: NFLTeamData;
  homeTeamId: string;
  awayTeamId: string;
  kickoffTime: Date;
  status: GameStatus;
  homeScore: number | null;
  awayScore: number | null;
  week?: number;
  seasonYear?: number;
  statusDetail?: string;
}

// ESPN API Raw Response Types
interface ESPNCompetitor {
  id: string;
  homeAway: 'home' | 'away';
  score?: string;
  team: {
    id: string;
    name: string;
    abbreviation: string;
    displayName: string;
    logo?: string;
  };
}

interface ESPNCompetition {
  id: string;
  date: string;
  competitors: ESPNCompetitor[];
  status?: {
    type?: {
      name?: string;
      state?: 'pre' | 'in' | 'post';
      completed?: boolean;
      detail?: string;
    };
  };
}

interface ESPNEvent {
  id: string;
  date: string;
  name: string;
  shortName: string;
  season?: {
    year?: number;
  };
  week?: {
    number?: number;
  };
  competitions: ESPNCompetition[];
  status?: {
    type?: {
      name?: string;
      state?: 'pre' | 'in' | 'post';
      completed?: boolean;
      detail?: string;
    };
  };
}

interface ESPNScoreboardResponse {
  events?: ESPNEvent[];
  week?: {
    number?: number;
  };
  season?: {
    year?: number;
  };
}

const ESPN_SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

/**
 * Maps ESPN game status state to our internal GameStatus enum.
 */
function mapGameStatus(status?: ESPNCompetition['status']): GameStatus {
  const state = status?.type?.state?.toLowerCase();
  const completed = status?.type?.completed;

  if (completed || state === 'post') {
    return GameStatus.FINAL;
  }
  if (state === 'in') {
    return GameStatus.IN_PROGRESS;
  }
  return GameStatus.SCHEDULED;
}

/**
 * Fetches the current week's NFL schedule and live scores from the ESPN public API.
 * Maps raw ESPN events to custom NFLGameData format.
 */
export async function fetchCurrentWeekNFLGames(): Promise<NFLGameData[]> {
  const response = await fetch(ESPN_SCOREBOARD_URL, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`ESPN API request failed with status: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as ESPNScoreboardResponse;
  const events = data.events || [];

  return events.map((event): NFLGameData => {
    const competition = event.competitions?.[0];
    const competitors = competition?.competitors || [];

    const homeCompetitor = competitors.find((c) => c.homeAway === 'home');
    const awayCompetitor = competitors.find((c) => c.homeAway === 'away');

    const homeTeam: NFLTeamData = {
      id: homeCompetitor?.team?.id || '',
      name: homeCompetitor?.team?.name || 'Home Team',
      abbreviation: homeCompetitor?.team?.abbreviation || 'HOME',
      displayName: homeCompetitor?.team?.displayName || 'Home Team',
      logo: homeCompetitor?.team?.logo,
    };

    const awayTeam: NFLTeamData = {
      id: awayCompetitor?.team?.id || '',
      name: awayCompetitor?.team?.name || 'Away Team',
      abbreviation: awayCompetitor?.team?.abbreviation || 'AWAY',
      displayName: awayCompetitor?.team?.displayName || 'Away Team',
      logo: awayCompetitor?.team?.logo,
    };

    const status = mapGameStatus(event.status || competition?.status);
    const isGameStartedOrFinished = status === GameStatus.IN_PROGRESS || status === GameStatus.FINAL;

    const homeScore = isGameStartedOrFinished && homeCompetitor?.score !== undefined
      ? parseInt(homeCompetitor.score, 10)
      : null;

    const awayScore = isGameStartedOrFinished && awayCompetitor?.score !== undefined
      ? parseInt(awayCompetitor.score, 10)
      : null;

    return {
      externalGameId: event.id,
      homeTeam,
      awayTeam,
      homeTeamId: homeTeam.abbreviation,
      awayTeamId: awayTeam.abbreviation,
      kickoffTime: new Date(event.date || competition?.date),
      status,
      homeScore: Number.isNaN(homeScore) ? null : homeScore,
      awayScore: Number.isNaN(awayScore) ? null : awayScore,
      week: event.week?.number ?? data.week?.number,
      seasonYear: event.season?.year ?? data.season?.year,
      statusDetail: event.status?.type?.detail || competition?.status?.type?.detail,
    };
  });
}
