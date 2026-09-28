import { Prisma } from '@prisma/client';
import prisma from '../db/client';
import type { PoolSettings } from '../types/pool';

export interface WeeklyWrapUpResult {
  poolId: string;
  weekNo: number;
  topScorers: Array<{ userId: string; score: number }>;
  deadPlaceMembers: Array<{ userId: string; score: number }>;
  penaltyAssigned: number;
  processedMembers: number;
}

/**
 * Executes the weekly wrap-up pipeline for a completed week in a pool.
 * Uses a Prisma transaction to:
 * 1. Query all finalized pick_results for the pool to calculate total scores.
 * 2. Identify top scorer(s) and increment first_place_finishes in PoolMemberStat.
 * 3. Identify lowest scorer(s) ('Dead Place') and create PenaltyLedger record(s).
 * 4. Increment dead_place_finishes for lowest scorer(s).
 * 5. Recalculate total_shots_drank by summing PenaltyLedger entries for affected users.
 * Supports tie handling by penalizing all tied lowest scorers.
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

    // Extract penalty configuration from pool.settings
    const settings = (pool.settings as PoolSettings) || {};
    const penaltiesConfig = settings.penalties || {};
    const deadPlacePenalty = Number(
      penaltiesConfig.dead_place_penalty ?? penaltiesConfig.deadPlacePenalty ?? 1
    );

    // 2. Fetch all picks for the pool with their finalized results
    const picks = await tx.pick.findMany({
      where: { poolId },
      include: {
        result: true,
      },
    });

    // 3. Calculate scores per user
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

    const memberScoreEntries = Array.from(memberScoresMap.entries()).map(([userId, score]) => ({
      userId,
      score,
    }));

    if (memberScoreEntries.length === 0) {
      throw new Error(`No scored members found in pool ${poolId}.`);
    }

    // 4. Identify Max (1st Place) and Min (Dead Place) scores
    const maxScore = Math.max(...memberScoreEntries.map((m) => m.score));
    const minScore = Math.min(...memberScoreEntries.map((m) => m.score));

    const topScorers = memberScoreEntries.filter((m) => m.score === maxScore);
    const deadPlaceMembers = memberScoreEntries.filter((m) => m.score === minScore);

    const topScorerUserIds = new Set(topScorers.map((m) => m.userId));
    const deadPlaceUserIds = new Set(deadPlaceMembers.map((m) => m.userId));

    // 5. Insert PenaltyLedger records for all Dead Place finishers
    for (const deadMember of deadPlaceMembers) {
      await tx.penaltyLedger.create({
        data: {
          poolId: pool.id,
          userId: deadMember.userId,
          weekNumber: weekNo,
          delta: deadPlacePenalty,
          reason: 'WEEKLY_DEAD_PLACE',
          createdById: pool.adminId,
        },
      });
    }

    // 6. Update/Upsert PoolMemberStat for all pool members & recalculate total_shots_drank
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

      const totalShotsDrank = ledgerSum._sum.delta ?? 0;

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
      topScorers,
      deadPlaceMembers,
      penaltyAssigned: deadPlacePenalty,
      processedMembers: pool.memberships.length,
    };
  });
}
