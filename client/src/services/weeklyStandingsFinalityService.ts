import type { LiveGame } from './liveScoreService';
import { isFinalStatus, type SlateGame, type TiebreakerData } from './sweatProjectionService';

export interface WeeklyTiebreakerSnapshot {
  verified: boolean;
  offered: boolean;
  eventId?: string;
  data?: TiebreakerData;
}

function validScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function finalScore(game: SlateGame, live?: LiveGame): { home: number; away: number } | null {
  if (isFinalStatus(game.status) && validScore(game.homeScore) && validScore(game.awayScore)) {
    return { home: game.homeScore, away: game.awayScore };
  }
  const home = live?.homeTeam?.score == null ? NaN : Number(live.homeTeam.score);
  const away = live?.awayTeam?.score == null ? NaN : Number(live.awayTeam.score);
  if (isFinalStatus(live?.status) && validScore(home) && validScore(away)) {
    return { home, away };
  }
  return null;
}

/** Only a verified scored league slate can publish final weekly standings. */
export function isWeeklyScoredSlateFinal(
  games: readonly SlateGame[],
  liveScores: readonly LiveGame[],
  tiebreaker: WeeklyTiebreakerSnapshot,
  isVerifiedLeagueSlate: boolean,
  requireDesignatedTiebreaker = false,
): boolean {
  if (!isVerifiedLeagueSlate || games.length === 0 || !tiebreaker.verified) return false;
  if (requireDesignatedTiebreaker && !tiebreaker.offered) return false;
  const liveById = new Map(liveScores.map((score) => [String(score.id), score]));
  const seen = new Set<string>();
  for (const game of games) {
    const id = String(game?.id || '');
    const externalId = String(game?.externalGameId || game?.external_game_id || id);
    if (!id || seen.has(id) || seen.has(externalId)) return false;
    seen.add(id);
    seen.add(externalId);
    const live = liveById.get(externalId) || liveById.get(id);
    if (!finalScore(game, live)) return false;
  }
  if (!tiebreaker.offered) return true;
  if (!tiebreaker.eventId || !validScore(tiebreaker.data?.actualTotalScore)) return false;
  return games.some((game) =>
    String(game.id) === tiebreaker.eventId ||
    String(game.externalGameId || game.external_game_id) === tiebreaker.eventId
  );
}

/** Read the existing member-scoped tiebreaker endpoint without changing its contract. */
export function resolveWeeklyTiebreakerSnapshot(
  payload: unknown,
  memberIds: readonly string[],
  games: readonly SlateGame[],
  liveScores: readonly LiveGame[],
): WeeklyTiebreakerSnapshot {
  const invalid: WeeklyTiebreakerSnapshot = { verified: false, offered: false };
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || memberIds.length === 0) return invalid;
  const response = payload as Record<string, unknown>;
  if (response.tiebreakerOffered === false && response.status === 'UNAVAILABLE') {
    return { verified: true, offered: false };
  }
  if (response.tiebreakerOffered !== true ||
      !['DEFAULT_LIONS', 'COMMISSIONER_OVERRIDE'].includes(String(response.status))) return invalid;

  const eventId = String(response.eventId || '');
  const game = games.find((item) =>
    String(item.id) === eventId || String(item.externalGameId || item.external_game_id) === eventId
  );
  if (!eventId || !game || !Array.isArray(response.readiness)) return invalid;

  const expected = new Set(memberIds);
  const seen = new Set<string>();
  const predictions: Record<string, number> = {};
  for (const item of response.readiness) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return invalid;
    const row = item as Record<string, unknown>;
    const userId = row.userId;
    if (typeof userId !== 'string' || !expected.has(userId) || seen.has(userId) || !('prediction' in row)) return invalid;
    seen.add(userId);
    if (row.prediction === null) continue;
    if (!validScore(row.prediction) || row.prediction > 999.999) return invalid;
    predictions[userId] = row.prediction;
  }
  if (seen.size !== expected.size) return invalid;

  const liveById = new Map(liveScores.map((score) => [String(score.id), score]));
  const live = liveById.get(String(game.externalGameId || game.external_game_id || game.id)) || liveById.get(String(game.id));
  const score = finalScore(game, live);
  return {
    verified: true,
    offered: true,
    eventId,
    data: { userPredictions: predictions, actualTotalScore: score ? score.home + score.away : undefined },
  };
}
