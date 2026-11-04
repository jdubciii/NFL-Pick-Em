import { Prisma } from '@prisma/client';
import { executeWeeklyWrapUpForPool, WrapUpOptions, PoolWrapUpResult } from './wrapUpEngine';

export interface ScoredMember {
  userId: string;
  score: number;
  tieBreakerPrediction: number | null;
  tiebreakerDistance: number | null;
}

export interface WeeklyWrapUpResult {
  applied: boolean;
  reason?: 'ALREADY_WRAPPED_UP' | 'NO_GAMES_FOR_WEEK' | 'WEEK_NOT_FINAL' | 'CLAIM_STORE_UNAVAILABLE' | string;
  pendingCount?: number;
  earliestPendingKickoff?: Date | string | null;
  poolId?: string;
  weekNumber?: number;
  weekNo?: number;
  topScorers?: Array<{ userId: string; score: number; tiebreakerDistance?: number | null }>;
  deadPlaceMembers?: Array<{ userId: string; score: number; tiebreakerDistance?: number | null }>;
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
 *
 * COMPATIBILITY CONTRACT & RETURN VALUE MAPPING:
 * - tiebreakerDistance: Authoritatively derived from wrapUpEngine's ranked standings.
 *   Represents the exact absolute distance between user prediction and target game score,
 *   or `null` if no prediction was submitted or tiebreaker was not offered.
 *   NEVER fabricated as 0 for missing or uncalculated predictions.
 * - penaltyAssigned: Under Phase 41 / P41-TIEBREAKER-CONTRACT-2026-10-17-01, penalties follow
 *   the ratified schedule (2.50 shots for Dead Place Monarchs, 0.00 if Safe Haven / entire field tied first).
 *   Returns a Prisma.Decimal representing the assigned dead-place penalty when applied is true,
 *   or undefined when applied is false.
 */
export async function executeWeeklyWrapUp(
  poolId: string,
  weekNumber: number,
  options: WrapUpOptions = {}
): Promise<WeeklyWrapUpResult> {
  const result: PoolWrapUpResult = await executeWeeklyWrapUpForPool(poolId, weekNumber, options);
  const standingsMap = new Map((result.standings || []).map((s) => [s.userId, s]));

  const mapMemberWithDistance = (m: any) => {
    const standing = standingsMap.get(m.userId);
    // Derive authoritative distance: standing.tiebreakerDistance if present, else m.tiebreakerDistance if returned on PoolWrapUpResult, else null.
    // Strictly preserve null/undefined and actual nonzero values without fabricating 0.
    const tiebreakerDistance = standing !== undefined
      ? standing.tiebreakerDistance
      : (m.tiebreakerDistance !== undefined ? m.tiebreakerDistance : null);
    return {
      userId: m.userId,
      score: m.score,
      tiebreakerDistance,
    };
  };

  let penaltyAssigned: Prisma.Decimal | undefined = undefined;
  if (result.applied) {
    if (result.penaltyAssigned !== undefined) {
      penaltyAssigned = result.penaltyAssigned instanceof Prisma.Decimal
        ? result.penaltyAssigned
        : new Prisma.Decimal(result.penaltyAssigned);
    } else if (result.deadPlaceMembers && result.deadPlaceMembers.length > 0) {
      penaltyAssigned = new Prisma.Decimal(result.deadPlaceMembers[0].shots);
    } else {
      penaltyAssigned = new Prisma.Decimal(0);
    }
  }

  return {
    applied: result.applied,
    reason: result.reason,
    poolId: result.poolId || poolId,
    weekNumber: result.weekNumber || weekNumber,
    weekNo: result.weekNumber || weekNumber,
    topScorers: result.topScorers?.map(mapMemberWithDistance),
    deadPlaceMembers: result.deadPlaceMembers?.map(mapMemberWithDistance),
    penaltyAssigned,
    processedMembers: result.processedMembers,
    targetGameId: result.targetGameId ?? null,
    targetGameScore: result.targetGameScore ?? null,
  };
}

export const runWeeklyWrapUp = executeWeeklyWrapUp;
