import type { LiveGame } from './liveScoreService';
import { isFinalStatus, type SlateGame, type TiebreakerData } from './sweatProjectionService';
import {
  getScopedPoolSlateConfig,
  isTargetAffectedSlateScope,
  type ScopedPoolSlateKey,
} from './poolScoredSlateConfig';

export type { ScopedPoolSlateKey };

export interface WeeklyTiebreakerSnapshot {
  verified: boolean;
  offered: boolean;
  eventId?: string;
  data?: TiebreakerData;
}

/**
 * A calendar week can contain games outside the league's scored slate. Match
 * the accepted manifest exactly before deciding whether weekly standings are
 * final; stale status on an unscored game must not hold the league open.
 *
 * Governed by Architect Ruling HAG52-SLATE-2026-11-02-01:
 * Validates the explicit scoped pool slate against the accepted NFL manifest.
 * Missing picks never shrink the list; outside manifest games do not gate finality.
 */
export function selectAcceptedScoredSlateGames(
  games: readonly SlateGame[],
  eventIds: readonly string[] | null | undefined,
  scope?: ScopedPoolSlateKey | null,
): SlateGame[] | null {
  if (!eventIds?.length || new Set(eventIds.map(String)).size !== eventIds.length) return null;
  const byEventId = new Map<string, SlateGame>();
  for (const game of games) {
    const id = String(game.externalGameId || game.external_game_id || game.id || '');
    if (!id || byEventId.has(id)) return null;
    byEventId.set(id, game);
  }

  const isAffectedScope = isTargetAffectedSlateScope(scope);
  const scopedConfig = getScopedPoolSlateConfig(scope);
  let targetEventIds: readonly string[];

  if (scopedConfig) {
    if (
      scopedConfig.poolId !== scope?.poolId ||
      scopedConfig.season !== scope?.season ||
      scopedConfig.seasonType !== scope?.seasonType ||
      scopedConfig.weekNumber !== scope?.weekNumber
    ) {
      return null;
    }

    const { scoredEventIds, weekNumber } = scopedConfig;
    if (!scoredEventIds || scoredEventIds.length === 0) return null;

    const idSet = new Set(scoredEventIds.map(String));
    if (idSet.size !== scoredEventIds.length) return null;

    if (weekNumber === 8 && scoredEventIds.length !== 9) return null;

    const manifestSet = new Set(eventIds.map(String));
    for (const id of scoredEventIds) {
      if (!manifestSet.has(String(id))) {
        return null;
      }
    }

    targetEventIds = scoredEventIds;
  } else if (isAffectedScope) {
    // For the affected pool/week, absent or malformed config fails closed to null/Provisional
    // regardless of whether all 14 manifest games are final.
    return null;
  } else {
    // Preserves existing behavior outside target scope
    targetEventIds = eventIds;
  }

  const selected = targetEventIds.map((id) => byEventId.get(String(id)));
  return selected.every((game): game is SlateGame => Boolean(game)) ? selected : null;
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
