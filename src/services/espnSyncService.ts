import { GameStatus } from '@prisma/client';
import prisma from '../db/client';

export interface ESPNTransformedGame {
  externalGameId: string;
  espnId: string;
  weekNumber: number;
  seasonYear: number;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  kickoffTime: Date;
  status: GameStatus;
  homeScore: number | null;
  awayScore: number | null;
  spread: string | null;
  statusDetail?: string;
}

interface ESPNOdds {
  details?: string;
  overUnder?: number;
  spread?: number;
}

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
  odds?: ESPNOdds[];
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

/**
 * Normalizes NFL team abbreviations to standard 3-letter codes used throughout the app.
 */
export function normalizeTeamAbbreviation(rawAbbrev: string): string {
  if (!rawAbbrev) return 'UNK';
  const clean = rawAbbrev.trim().toUpperCase();
  if (clean === 'WSH') return 'WAS';
  return clean;
}

/**
 * Maps ESPN status name and state to internal GameStatus enum.
 */
export function mapESPNGameStatus(
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
 * Fetches and transforms games for a specific NFL week from the public ESPN API.
 */
export async function fetchESPNWeekGames(
  weekNumber: number,
  seasonYear: number = 2026
): Promise<ESPNTransformedGame[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${weekNumber}`;
  
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'NFL-Pick-Em-Sync-Service/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`ESPN API request failed for week ${weekNumber}: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as ESPNScoreboardResponse;
  const events = data.events || [];

  return events.map((event): ESPNTransformedGame => {
    const competition = event.competitions?.[0];
    const competitors = competition?.competitors || [];

    const homeComp = competitors.find((c) => c.homeAway === 'home');
    const awayComp = competitors.find((c) => c.homeAway === 'away');

    const rawHomeAbbr = homeComp?.team?.abbreviation || 'HOME';
    const rawAwayAbbr = awayComp?.team?.abbreviation || 'AWAY';

    const homeTeamId = normalizeTeamAbbreviation(rawHomeAbbr);
    const awayTeamId = normalizeTeamAbbreviation(rawAwayAbbr);

    const statusObj = event.status?.type || competition?.status?.type;
    const status = mapESPNGameStatus(statusObj?.name, statusObj?.state, statusObj?.completed);

    const isLiveOrFinal = status === GameStatus.IN_PROGRESS || status === GameStatus.FINAL;
    const homeScore = isLiveOrFinal && homeComp?.score !== undefined ? parseInt(homeComp.score, 10) : null;
    const awayScore = isLiveOrFinal && awayComp?.score !== undefined ? parseInt(awayComp.score, 10) : null;

    const spreadDetails = competition?.odds?.[0]?.details || null;
    const paddedWeek = String(weekNumber).padStart(2, '0');
    const externalGameId = `${seasonYear}_w${paddedWeek}_${awayTeamId}_${homeTeamId}`;

    return {
      externalGameId,
      espnId: event.id,
      weekNumber,
      seasonYear,
      homeTeamId,
      awayTeamId,
      homeTeamName: homeComp?.team?.displayName || homeTeamId,
      awayTeamName: awayComp?.team?.displayName || awayTeamId,
      kickoffTime: new Date(event.date || competition?.date),
      status,
      homeScore: Number.isNaN(homeScore) ? null : homeScore,
      awayScore: Number.isNaN(awayScore) ? null : awayScore,
      spread: spreadDetails,
      statusDetail: statusObj?.detail,
    };
  });
}

/**
 * Upserts a single ESPN transformed game record into PostgreSQL.
 */
export async function upsertESPNGame(game: ESPNTransformedGame) {
  // Check if existing game exists under externalGameId or case variations
  const paddedWeek = String(game.weekNumber).padStart(2, '0');
  const lowerExternalId = `${game.seasonYear}_w${paddedWeek}_${game.awayTeamId.toLowerCase()}_${game.homeTeamId.toLowerCase()}`;
  const upperExternalId = `${game.seasonYear}_w${paddedWeek}_${game.awayTeamId.toUpperCase()}_${game.homeTeamId.toUpperCase()}`;

  let existing = await prisma.game.findFirst({
    where: {
      OR: [
        { externalGameId: game.externalGameId },
        { externalGameId: lowerExternalId },
        { externalGameId: upperExternalId },
        { externalGameId: `espn_${game.espnId}` },
        {
          AND: [
            { homeTeamId: game.homeTeamId },
            { awayTeamId: game.awayTeamId },
            {
              kickoffTime: {
                gte: new Date(game.kickoffTime.getTime() - 24 * 3600 * 1000),
                lte: new Date(game.kickoffTime.getTime() + 24 * 3600 * 1000),
              },
            },
          ],
        },
      ],
    },
  });

  const commissionerNotes = game.spread ? `Spread: ${game.spread}` : existing?.commissionerNotes ?? null;

  if (existing) {
    return prisma.game.update({
      where: { id: existing.id },
      data: {
        externalGameId: upperExternalId, // standardize to upper canonical format
        homeTeamId: game.homeTeamId,
        awayTeamId: game.awayTeamId,
        kickoffTime: game.kickoffTime,
        status: game.status,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        commissionerNotes,
      },
    });
  }

  return prisma.game.create({
    data: {
      externalGameId: upperExternalId,
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      kickoffTime: game.kickoffTime,
      status: game.status,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      commissionerNotes,
    },
  });
}

/**
 * Synchronizes an entire week's games from ESPN into the database.
 */
export async function syncWeek(weekNumber: number, seasonYear: number = 2026) {
  const games = await fetchESPNWeekGames(weekNumber, seasonYear);
  const results = [];

  for (const game of games) {
    const upserted = await upsertESPNGame(game);
    results.push(upserted);
  }

  return results;
}

/**
 * Synchronizes multiple weeks in sequence.
 */
export async function syncWeeks(weekNumbers: number[], seasonYear: number = 2026) {
  const allResults: Record<number, any[]> = {};
  for (const week of weekNumbers) {
    allResults[week] = await syncWeek(week, seasonYear);
  }
  return allResults;
}

export default {
  fetchESPNWeekGames,
  upsertESPNGame,
  syncWeek,
  syncWeeks,
  normalizeTeamAbbreviation,
  mapESPNGameStatus,
};
