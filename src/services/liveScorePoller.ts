import prisma from '../db/client';
import { GameStatus } from '@prisma/client';
import { LiveScoreboardService } from './LiveScoreboardService';
import { tryAcquireAdvisoryLock } from './advisoryLockService';

let pollerTimer: NodeJS.Timeout | null = null;
let isPollerActive = false;
let isExecuting = false;

export const LIVE_SCORE_POLLER_INTERVAL_MS = 15000;

/**
 * Executes a single tick of the live score poller:
 * 1. Fetches scoreboard data from ESPN API (outside DB transaction).
 * 2. Opens a bounded Prisma transaction and attempts to acquire the shared advisory lock.
 * 3. Re-reads current game state to prevent overwriting FINAL games.
 * 4. Applies score and status updates.
 * 5. Commits and automatically releases the lock.
 */
export async function tickLiveScorePoller(): Promise<{
  updatedCount: number;
  skipped: boolean;
  reason?: string;
}> {
  if (isExecuting) {
    return { updatedCount: 0, skipped: true, reason: 'IN_PROCESS_OVERLAP' };
  }

  isExecuting = true;
  let updatedCount = 0;

  try {
    // 1. Fetch live scores from ESPN outside the database transaction
    const liveGames = await LiveScoreboardService.fetchLiveScores();
    if (!liveGames || liveGames.length === 0) {
      return { updatedCount: 0, skipped: false };
    }

    // 2. Execute database mutation within an advisory-locked transaction
    const result = await prisma.$transaction(async (tx) => {
      const lockAcquired = await tryAcquireAdvisoryLock(tx);
      if (!lockAcquired) {
        return { updatedCount: 0, skipped: true, reason: 'LOCK_UNAVAILABLE' };
      }

      let innerUpdates = 0;
      for (const game of liveGames) {
        if (!game.isLive && !game.isFinal) {
          continue;
        }

        const targetStatus = game.isFinal
          ? GameStatus.FINAL
          : game.isLive
          ? GameStatus.IN_PROGRESS
          : GameStatus.SCHEDULED;

        // Re-read existing authoritative game record to prevent regressing FINAL games
        const existingGames = await tx.game.findMany({
          where: {
            OR: [
              { awayTeamId: game.awayTeam, homeTeamId: game.homeTeam },
              { awayTeamId: game.homeTeam, homeTeamId: game.awayTeam },
              { awayTeamId: game.awayTeam.toUpperCase(), homeTeamId: game.homeTeam.toUpperCase() },
              { awayTeamId: game.homeTeam.toUpperCase(), homeTeamId: game.awayTeam.toUpperCase() },
            ],
          },
        });

        for (const eg of existingGames) {
          // Invariant: Never overwrite or regress an already settled/FINAL game with stale live scores
          if (eg.status === GameStatus.FINAL && targetStatus !== GameStatus.FINAL) {
            continue;
          }

          await tx.game.update({
            where: { id: eg.id },
            data: {
              awayScore: game.awayScore,
              homeScore: game.homeScore,
              status: targetStatus,
            },
          });
          innerUpdates++;
        }
      }

      return { updatedCount: innerUpdates, skipped: false };
    });

    updatedCount = result.updatedCount;
    return result;
  } catch (err) {
    console.warn('[LiveScorePoller] Tick error (failing safe):', err);
    return { updatedCount: 0, skipped: true, reason: 'ERROR' };
  } finally {
    isExecuting = false;
  }
}

/**
 * Starts the live score poller loop.
 */
export function startLiveScorePoller(intervalMs: number = LIVE_SCORE_POLLER_INTERVAL_MS): void {
  if (isPollerActive) return;

  isPollerActive = true;
  console.log(`[LiveScoreboard] Initializing ${intervalMs / 1000}s ESPN polling daemon with advisory locking...`);

  // Initial tick
  tickLiveScorePoller().catch((err) => {
    console.warn('[LiveScoreboard] Initial tick warning:', err);
  });

  pollerTimer = setInterval(async () => {
    if (!isPollerActive) return;
    try {
      await tickLiveScorePoller();
    } catch (err) {
      console.warn('[LiveScoreboard] Interval tick warning:', err);
    }
  }, intervalMs);
}

/**
 * Stops the live score poller loop cleanly.
 */
export function stopLiveScorePoller(): void {
  isPollerActive = false;
  if (pollerTimer) {
    clearInterval(pollerTimer);
    pollerTimer = null;
  }
  console.log('[LiveScoreboard] Live score poller stopped.');
}

export default {
  startLiveScorePoller,
  stopLiveScorePoller,
  tickLiveScorePoller,
};
