import { Prisma } from '@prisma/client';
import prisma from '../db/client';
import type { PoolSettings, TiebreakerSettings, PenaltySettings } from '../types/pool';

export interface ScoredMember {
  userId: string;
  score: number;
  tieBreakerPrediction: number | null;
  tiebreakerDistance: number;
}

export interface WeeklyWrapUpResult {
  poolId: string;
  weekNo: number;
  topScorers: Array<{ userId: string; score: number; tiebreakerDistance: number }>;
  deadPlaceMembers: Array<{ userId: string; score: number; tiebreakerDistance: number }>;
  penaltyAssigned: number;
  processedMembers: number;
  targetGameId?: string | null;
  targetGameScore?: number | null;
}

/**
 * Resolves the designated tiebreaker game for a week based on pool settings.
 * Supports 'MONDAY_NIGHT', 'LAST_GAME_OF_WEEK' / 'LAST_GAME', or latest kickoff.
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
      // Monday in UTC (1) or Monday night ET / Tuesday early UTC (dayUtc === 2 && hoursUtc < 8) or local Monday
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
 * Executes the weekly wrap-up pipeline for a completed week in a pool.
 * Uses a Prisma transaction to:
 * 1. Query all finalized pick_results for the pool to calculate total scores.
 * 2. Find the target tiebreaker game from settings.tiebreaker.game_target and calculate its actual total score.
 * 3. Query WeeklySubmission to get everyone's tie_breaker_prediction.
 * 4. Sort users by points (DESC) and absolute distance to the tiebreaker total (ASC).
 * 5. Identify top scorer(s) (1st Place) and increment first_place_finishes in PoolMemberStat.
 * 6. Identify lowest scorer(s) (Dead Place). If tied, divides dead_place_penalty by the number of tied users
 *    to compute split_penalty, writing the exact decimal to PenaltyLedger.
 * 7. Increment dead_place_finishes for lowest scorer(s).
 * 8. Recalculate total_shots_drank by summing PenaltyLedger entries for affected users.
 */
export async function executeWeeklyWrapUp(poolId: string, weekNo: number): Promise<WeeklyWrapUpResult> {
  return await prisma.$transaction(async (tx: any) => {
    // 1. Fetch Pool and all active members
    const pool = await tx.pool.findUnique({
      where: { id: poolId },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: {
            user: true,
          },
        },
      },
    });

    if (!pool) {
      throw new Error(`Pool with ID ${poolId} not found.`);
    }

    if (pool.memberships.length === 0) {
      throw new Error(`Pool with ID ${poolId} has no active members.`);
    }

    // Extract settings configuration
    const settings = (pool.settings as PoolSettings) || {};
    const penaltiesConfig = settings.penalties || {};
    const deadPlacePenalty = Number(
      penaltiesConfig.dead_place_penalty ?? penaltiesConfig.deadPlacePenalty ?? 1
    );

    const tiebreakerConfig = settings.tiebreaker || {};
    const gameTargetSetting = tiebreakerConfig.game_target || tiebreakerConfig.gameTarget || 'MONDAY_NIGHT';

    // 2. Fetch all picks for the pool with their finalized results and associated game
    const picks = await tx.pick.findMany({
      where: { poolId },
      include: {
        result: true,
        game: true,
      },
    });

    // 3. Extract unique games and determine target tiebreaker game
    const gamesMap = new Map<string, any>();
    for (const pick of picks) {
      if (pick.game) {
        gamesMap.set(pick.game.id, pick.game);
      }
    }
    const poolGames = Array.from(gamesMap.values());

    // If no games from picks, query all finalized games as fallback
    let allGames = poolGames;
    if (allGames.length === 0) {
      allGames = await tx.game.findMany({
        orderBy: { kickoffTime: 'desc' },
      });
    }

    const targetGame = resolveTiebreakerGame(allGames, gameTargetSetting);
    const targetGameHomeScore = targetGame?.homeScore ?? 0;
    const targetGameAwayScore = targetGame?.awayScore ?? 0;
    const actualTiebreakerTotal = targetGame ? targetGameHomeScore + targetGameAwayScore : 0;

    // 4. Query WeeklySubmission to get everyone's tie_breaker_prediction
    const weeklySubmissions = await tx.weeklySubmission.findMany({
      where: {
        poolId: pool.id,
        weekNumber: weekNo,
      },
    });

    const predictionsMap = new Map<string, number | null>();
    for (const sub of weeklySubmissions) {
      if (sub.tieBreakerPrediction !== null && sub.tieBreakerPrediction !== undefined) {
        predictionsMap.set(sub.userId, Number(sub.tieBreakerPrediction));
      } else {
        predictionsMap.set(sub.userId, null);
      }
    }

    // 5. Calculate scores per user
    const memberScoresMap = new Map<string, number>();
    for (const membership of pool.memberships) {
      memberScoresMap.set(membership.userId, 0);
    }

    for (const pick of picks) {
      if (memberScoresMap.has(pick.userId) && pick.result) {
        const currentScore = memberScoresMap.get(pick.userId) || 0;
        memberScoresMap.set(pick.userId, currentScore + Number(pick.result.pointsAwarded));
      }
    }

    // 6. Build scored members array with tiebreaker distance
    const memberEntries: ScoredMember[] = pool.memberships.map((membership: any) => {
      const userId = membership.userId;
      const score = memberScoresMap.get(userId) || 0;
      const prediction = predictionsMap.has(userId) ? predictionsMap.get(userId)! : null;

      let tiebreakerDistance = Infinity;
      if (prediction !== null && targetGame) {
        tiebreakerDistance = Math.abs(actualTiebreakerTotal - prediction);
      }

      return {
        userId,
        score,
        tieBreakerPrediction: prediction,
        tiebreakerDistance,
      };
    });

    if (memberEntries.length === 0) {
      throw new Error(`No scored members found in pool ${poolId}.`);
    }

    // 7. Sort users first by points (DESC) and then by absolute distance to tiebreaker total (ASC)
    memberEntries.sort((a, b) => {
      // Primary Sort: Points (DESC)
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Secondary Sort: Tiebreaker Distance (ASC)
      if (a.tiebreakerDistance !== b.tiebreakerDistance) {
        return a.tiebreakerDistance - b.tiebreakerDistance;
      }
      return a.userId.localeCompare(b.userId);
    });

    // 8. Identify 1st Place (Top Scorers) and Dead Place (Lowest Scorers)
    const bestScore = memberEntries[0].score;
    const bestDistance = memberEntries[0].tiebreakerDistance;
    const topScorers = memberEntries.filter(
      (m) => m.score === bestScore && m.tiebreakerDistance === bestDistance
    );

    const worstMember = memberEntries[memberEntries.length - 1];
    const worstScore = worstMember.score;
    const worstDistance = worstMember.tiebreakerDistance;
    const deadPlaceMembers = memberEntries.filter(
      (m) => m.score === worstScore && m.tiebreakerDistance === worstDistance
    );

    const topScorerUserIds = new Set(topScorers.map((m) => m.userId));
    const deadPlaceUserIds = new Set(deadPlaceMembers.map((m) => m.userId));

    // 9. Calculate split penalty if there is a tie for dead place
    const splitPenalty = Number((deadPlacePenalty / deadPlaceMembers.length).toFixed(2));

    // 10. Insert PenaltyLedger records for all Dead Place finishers with split_penalty
    for (const deadMember of deadPlaceMembers) {
      await tx.penaltyLedger.create({
        data: {
          poolId: pool.id,
          userId: deadMember.userId,
          weekNumber: weekNo,
          delta: new Prisma.Decimal(splitPenalty),
          reason: 'WEEKLY_DEAD_PLACE',
          createdById: pool.adminId,
        },
      });
    }

    // 11. Update/Upsert PoolMemberStat for all pool members & recalculate total_shots_drank
    for (const membership of pool.memberships) {
      const userId = membership.userId;
      const isTopScorer = topScorerUserIds.has(userId);
      const isDeadPlace = deadPlaceUserIds.has(userId);

      // Sum all penalty deltas for this user to get total_shots_drank
      const ledgerSum = await tx.penaltyLedger.aggregate({
        where: {
          poolId: pool.id,
          userId,
        },
        _sum: {
          delta: true,
        },
      });

      const totalShotsDrank = ledgerSum._sum.delta ?? new Prisma.Decimal(0);

      await tx.poolMemberStat.upsert({
        where: {
          poolId_userId: {
            poolId: pool.id,
            userId,
          },
        },
        update: {
          firstPlaceFinishes: isTopScorer ? { increment: 1 } : undefined,
          deadPlaceFinishes: isDeadPlace ? { increment: 1 } : undefined,
          totalShotsDrank,
        },
        create: {
          poolId: pool.id,
          userId,
          firstPlaceFinishes: isTopScorer ? 1 : 0,
          deadPlaceFinishes: isDeadPlace ? 1 : 0,
          totalShotsDrank,
        },
      });
    }

    return {
      poolId: pool.id,
      weekNo,
      topScorers: topScorers.map((t) => ({
        userId: t.userId,
        score: t.score,
        tiebreakerDistance: t.tiebreakerDistance,
      })),
      deadPlaceMembers: deadPlaceMembers.map((d) => ({
        userId: d.userId,
        score: d.score,
        tiebreakerDistance: d.tiebreakerDistance,
      })),
      penaltyAssigned: splitPenalty,
      processedMembers: pool.memberships.length,
      targetGameId: targetGame?.id ?? null,
      targetGameScore: actualTiebreakerTotal,
    };
  });
}

