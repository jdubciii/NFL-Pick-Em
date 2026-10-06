import { GameStatus } from '@prisma/client';
import prisma from '../db/client';
import espnSyncService from './espnSyncService';

let daemonTimer: NodeJS.Timeout | null = null;
let isExecuting = false;
let isDaemonActive = false;

/**
 * Determines whether a given date corresponds to an NFL Gameday (Thursday, Sunday, Monday).
 */
export function isGameday(date: Date = new Date()): boolean {
  // Check day of week in Eastern Time / UTC (0 = Sunday, 1 = Monday, 4 = Thursday)
  const utcDay = date.getUTCDay();
  // Thursday (4), Friday early AM UTC (5 for TNF), Sunday (0), Monday (1), Tuesday early AM UTC (2 for MNF)
  return [0, 1, 2, 4, 5].includes(utcDay);
}

/**
 * Returns interval in milliseconds based on gameday status.
 * - Gameday: 60 seconds (60,000 ms)
 * - Off-Day: 30 minutes (1,800,000 ms)
 */
export function getIngestIntervalMs(date: Date = new Date()): number {
  return isGameday(date) ? 60 * 1000 : 30 * 60 * 1000;
}

/**
 * Core daemon tick execution:
 * 1. Resolves active pool and current NFL week.
 * 2. Syncs live week data directly from ESPN API.
 * 3. Transitions kicked-off SCHEDULED games to IN_PROGRESS.
 * 4. Grades member picks atomically for FINAL games.
 */
export async function tickLiveScheduleDaemon(): Promise<{
  week: number;
  syncedCount: number;
  transitionedInProgress: number;
  gradedPicks: number;
}> {
  if (isExecuting) {
    return { week: 0, syncedCount: 0, transitionedInProgress: 0, gradedPicks: 0 };
  }

  isExecuting = true;
  let syncedCount = 0;
  let transitionedInProgress = 0;
  let gradedPicks = 0;
  let currentWeek = 5;

  try {
    // 1. Resolve current week from Main League pool settings
    const pool = await prisma.pool.findFirst({
      where: { name: 'Main League' },
    });

    if (pool?.settings) {
      const settings = pool.settings as any;
      currentWeek = Number(settings.week_number ?? settings.current_week ?? 5);
    }

    // 2. Query and sync current week via ESPN Sync Service
    try {
      const syncedGames = await espnSyncService.syncWeek(currentWeek);
      syncedCount = syncedGames.length;
    } catch (espnErr) {
      console.warn(`[LiveScheduleDaemon] ESPN live sync warning for week ${currentWeek}:`, espnErr);
    }

    // 3. Scan games for kickoff status transitions & pick grading
    const now = new Date();
    const paddedWeek = currentWeek < 10 ? `_w0${currentWeek}_` : `_w${currentWeek}_`;
    const weekGames = await prisma.game.findMany({
      where: {
        externalGameId: {
          contains: paddedWeek,
        },
      },
    });

    for (const game of weekGames) {
      // Transition: SCHEDULED -> IN_PROGRESS when now >= kickoffTime
      if (game.status === GameStatus.SCHEDULED && now >= new Date(game.kickoffTime)) {
        await prisma.game.update({
          where: { id: game.id },
          data: { status: GameStatus.IN_PROGRESS },
        });
        transitionedInProgress++;
      }

      // Auto-Grade: If game is FINAL and scores are present
      if (game.status === GameStatus.FINAL && game.homeScore !== null && game.awayScore !== null) {
        const winner =
          game.homeScore > game.awayScore
            ? game.homeTeamId
            : game.awayScore > game.homeScore
            ? game.awayTeamId
            : 'TIE';

        const picks = await prisma.pick.findMany({
          where: { gameId: game.id },
        });

        for (const pick of picks) {
          const isCorrect = pick.selectedTeamId === winner;
          await prisma.pickResult.upsert({
            where: { pickId: pick.id },
            update: {
              isCorrect,
              pointsAwarded: isCorrect ? 1.0 : 0.0,
              finalizedAt: now,
            },
            create: {
              pickId: pick.id,
              isCorrect,
              pointsAwarded: isCorrect ? 1.0 : 0.0,
              finalizedAt: now,
            },
          });
          gradedPicks++;
        }
      }
    }
  } catch (err) {
    console.error('[LiveScheduleDaemon] Error during daemon tick execution:', err);
  } finally {
    isExecuting = false;
  }

  return {
    week: currentWeek,
    syncedCount,
    transitionedInProgress,
    gradedPicks,
  };
}

/**
 * Schedules the next tick dynamically according to gameday frequency.
 */
function scheduleNextTick() {
  if (!isDaemonActive) return;

  const intervalMs = getIngestIntervalMs();
  daemonTimer = setTimeout(async () => {
    try {
      await tickLiveScheduleDaemon();
    } catch (err) {
      console.error('[LiveScheduleDaemon] Unhandled error in daemon loop:', err);
    } finally {
      scheduleNextTick();
    }
  }, intervalMs);
}

/**
 * Boots the Live Schedule Daemon upon server startup.
 */
export function startLiveScheduleDaemon(): void {
  if (isDaemonActive) {
    return;
  }

  isDaemonActive = true;
  const isGameDay = isGameday();
  const intervalMs = getIngestIntervalMs();
  console.log(
    `[LiveScheduleDaemon] 🚀 Started automated gameday ingest daemon. Mode: ${
      isGameDay ? 'GAMEDAY (60s interval)' : 'OFF-DAY (30m interval)'
    }`
  );

  // Execute immediate initial tick in background
  tickLiveScheduleDaemon()
    .then((result) => {
      console.log(
        `[LiveScheduleDaemon] Initial tick completed (Week ${result.week}): Synced ${result.syncedCount} games, updated ${result.transitionedInProgress} live, graded ${result.gradedPicks} picks.`
      );
    })
    .catch((err) => {
      console.warn('[LiveScheduleDaemon] Initial tick encountered error:', err);
    })
    .finally(() => {
      scheduleNextTick();
    });
}

/**
 * Stops the Live Schedule Daemon gracefully.
 */
export function stopLiveScheduleDaemon(): void {
  isDaemonActive = false;
  if (daemonTimer) {
    clearTimeout(daemonTimer);
    daemonTimer = null;
  }
  console.log('[LiveScheduleDaemon] 🛑 Ingest daemon stopped.');
}

export default {
  startLiveScheduleDaemon,
  stopLiveScheduleDaemon,
  tickLiveScheduleDaemon,
  isGameday,
  getIngestIntervalMs,
};
