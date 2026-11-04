import { Prisma } from '@prisma/client';
import { executeWeeklyWrapUpForPool, WrapUpOptions, PoolWrapUpResult } from './wrapUpEngine';

export interface ScoredMember {
  userId: string;
  score: number;
  tieBreakerPrediction: number | null;
  tiebreakerDistance: number;
}

export interface WeeklyWrapUpResult {
  applied: boolean;
  reason?: 'ALREADY_WRAPPED_UP' | 'NO_GAMES_FOR_WEEK' | 'WEEK_NOT_FINAL' | 'CLAIM_STORE_UNAVAILABLE' | string;
  pendingCount?: number;
  earliestPendingKickoff?: Date | string | null;
  poolId?: string;
  weekNumber?: number;
  weekNo?: number;
  topScorers?: Array<{ userId: string; score: number; tiebreakerDistance: number }>;
  deadPlaceMembers?: Array<{ userId: string; score: number; tiebreakerDistance: number }>;
  penaltyAssigned?: Prisma.Decimal | number;
  processedMembers?: number;
  targetGameId?: string | null;
  targetGameScore?: number | null;
}

/**
 * Resolves the designated tiebreaker game for a week based on pool settings.
 * Supports 'MONDAY_NIGHT', 'LAST_GAME_OF_WEEK' / 'LAST_GAME', or latest kickoff.
 * Preserved for backward compatibility.
 */
export function resolveTiebreakerGame(games: any[], gameTargetSetting?: string): any | null {
  if (!games || games.length === 0) {
    return null;
  }

  const target = (gameTargetSetting || 'MONDAY_NIGHT').toUpperCase().trim();

  if (target === 'MONDAY_NIGHT') {
    const mondayGames = games.filter((game) => {
      if (!game.kickoffTime) return false;
      const kTime = new Date(game.kickoffTime);
      const dayUtc = kTime.getUTCDay();
      const hoursUtc = kTime.getUTCHours();
      return dayUtc === 1 || (dayUtc === 2 && hoursUtc < 8) || kTime.getDay() === 1;
    });

    if (mondayGames.length > 0) {
      mondayGames.sort((a, b) => new Date(b.kickoffTime).getTime() - new Date(a.kickoffTime).getTime());
      return mondayGames[0];
    }
  }

  // Default or LAST_GAME / LAST_GAME_OF_WEEK: pick game with latest kickoff time
  const sortedGames = [...games].sort(
    (a, b) => new Date(b.kickoffTime).getTime() - new Date(a.kickoffTime).getTime()
  );
  return sortedGames[0] || null;
}

/**
 * Executes weekly wrap-up for a completed week in a pool.
 *
 * NOTE ON RETIREMENT & CONVERGENCE (HAG58-SLATE-2026-11-03-01):
 * This legacy entry point (Milestone 12.0 / BR-4) has been retired as an independent
 * un-gated writer and consolidated onto the production wrap-up engine (executeWeeklyWrapUpForPool).
 * This strictly enforces:
 * 1. Weekly manifest transaction advisory lock (pg_advisory_xact_lock).
 * 2. Mandatory pool row lock (SELECT ... FROM public.pools FOR UPDATE) and active status check.
 * 3. Unified pool-scoped canonical games resolver (resolvePoolScopedGamesForWrapUp).
 * 4. Atomic claim creation on public.weekly_wrapups with full rollback on cleanup failure.
 */
export async function executeWeeklyWrapUp(
  poolId: string,
  weekNumber: number,
  options: WrapUpOptions = {}
): Promise<WeeklyWrapUpResult> {
  const result: PoolWrapUpResult = await executeWeeklyWrapUpForPool(poolId, weekNumber, options);
  return {
    applied: result.applied,
    reason: result.reason,
    poolId: result.poolId || poolId,
    weekNumber: result.weekNumber || weekNumber,
    weekNo: result.weekNumber || weekNumber,
    topScorers: result.topScorers?.map((t: any) => ({
      userId: t.userId,
      score: t.score,
      tiebreakerDistance: t.tiebreakerDistance ?? 0,
    })),
    deadPlaceMembers: result.deadPlaceMembers?.map((d: any) => ({
      userId: d.userId,
      score: d.score,
      tiebreakerDistance: d.tiebreakerDistance ?? 0,
    })),
    penaltyAssigned: result.deadPlaceMembers?.[0]?.shots !== undefined
      ? new Prisma.Decimal(result.deadPlaceMembers[0].shots)
      : undefined,
    processedMembers: result.processedMembers,
    targetGameId: result.targetGameId ?? null,
    targetGameScore: result.targetGameScore ?? null,
  };
}

export const runWeeklyWrapUp = executeWeeklyWrapUp;
