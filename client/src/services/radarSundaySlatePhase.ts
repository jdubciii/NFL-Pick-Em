import type { LiveGame } from './liveScoreService';
import { isFinalStatus, type SlateGame } from './sweatProjectionService';

export type SundaySlatePhase = 'PRE-KICKOFF' | 'IN PROGRESS' | 'FINAL' | 'AWAITING GAME UPDATES';

const isLiveStatus = (status?: string | null) =>
  ['IN_PROGRESS', 'LIVE', 'HALFTIME', 'STATUS_IN_PROGRESS'].includes(String(status || '').toUpperCase());

const kickoffMs = (value?: string | null) => {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
};

const isArizonaSunday = (time: number) =>
  new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'America/Phoenix' })
    .format(new Date(time)) === 'Sun';

/** Phase of the Sunday games shown on Radar, independent of Thursday/Monday results. */
export function deriveSundaySlatePhase(
  games: SlateGame[],
  liveScores: LiveGame[],
  options: { now?: number; isStale?: boolean } = {}
): SundaySlatePhase {
  const now = options.now ?? Date.now();
  const paired: Array<{ live?: LiveGame; game?: SlateGame }> = liveScores.map((live) => ({
    live,
    game: games.find((game) =>
      game.id === live.id || game.externalGameId === live.id || game.external_game_id === live.id
    ),
  }));
  for (const game of games) {
    if (!paired.some((item) => item.game === game)) paired.push({ game });
  }

  const sunday = paired
    .map(({ game, live }) => ({
      game,
      live,
      kickoff: kickoffMs(game?.kickoffTime) ?? kickoffMs(live?.dateTime) ?? kickoffMs(live?.kickoffTime),
    }))
    .filter((item) => item.kickoff !== null && isArizonaSunday(item.kickoff));

  if (sunday.length === 0) return 'AWAITING GAME UPDATES';
  if (sunday.every(({ game, live }) => isFinalStatus(game?.status) || isFinalStatus(live?.status))) {
    return 'FINAL';
  }
  if (options.isStale) return 'AWAITING GAME UPDATES';
  if (sunday.some(({ game, live }) =>
    isFinalStatus(game?.status) || isFinalStatus(live?.status) ||
    isLiveStatus(game?.status) || isLiveStatus(live?.status)
  )) return 'IN PROGRESS';
  if (sunday.every((item) => item.kickoff !== null && item.kickoff > now)) return 'PRE-KICKOFF';
  return 'AWAITING GAME UPDATES';
}

export const sundaySlatePhaseLabel = (phase: SundaySlatePhase) => `SUNDAY SLATE · ${phase}`;
