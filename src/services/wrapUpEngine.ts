import { Prisma, GameStatus, OutboxStatus } from '@prisma/client';
import prisma from '../db/client';
import { withJobRun } from '../jobs/jobRunner';
import { isGameInExcludedWindow } from './scoringEngine';
import { resolveTiebreakerGame } from './weeklyWrapUp';
import type { PoolSettings } from '../types/pool';

export interface WrapUpMemberScore {
  userId: string;
  score: number;
  tieBreakerPrediction: number | null;
  tiebreakerDistance: number;
}

export interface WrapUpOptions {
  weekNumber?: number;
  poolId?: string;
  prismaClient?: typeof prisma;
}

export interface PoolWrapUpResult {
  applied: boolean;
  reason?: 'ALREADY_WRAPPED_UP' | 'NO_GAMES_FOR_WEEK' | 'SCORE_FEED_UNAVAILABLE' | 'WEEK_NOT_FINAL' | 'CLAIM_STORE_UNAVAILABLE' | string;
  poolId: string;
  weekNumber: number;
  pendingCount?: number;
  earliestPendingKickoff?: Date | string | null;
  topScorers?: Array<{ userId: string; score: number; tiebreakerDistance: number }>;
  deadPlaceMembers?: Array<{ userId: string; score: number; tiebreakerDistance: number }>;
  penaltyAssigned?: Prisma.Decimal | number;
  processedMembers?: number;
  notificationsEnqueued?: number;
  targetGameId?: string | null;
  targetGameScore?: number | null;
}

export interface WrapUpEngineRunResult {
  poolsScanned: number;
  poolsApplied: number;
  poolsSkipped: number;
  totalNotificationsEnqueued: number;
  results: PoolWrapUpResult[];
}

/**
 * Executes weekly wrap-up for a single pool with strict invariants:
 * - Decision #24: Atomic claim on weekly_wrapups table inside transaction.
 * - Decision #27: Fail closed with SCORE_FEED_UNAVAILABLE if games are unfinalized or empty.
 * - Decisions #3 & #22: Pure Prisma.Decimal precision math for penalties and scores.
 * - Decision #54: Mutation occurs only during transactional execution; read-only on GETs.
 * - Decision #55: Fails closed if claim store or score feeds are missing.
 * - Decision #57: Store-enforced deduplication key: wrapup:v1:pool:<pool_id>:week:<week_id>:user:<user_id>.
 */
export async function executeWeeklyWrapUpForPool(
  poolId: string,
  weekNumber: number,
  options: { prismaClient?: typeof prisma } = {}
): Promise<PoolWrapUpResult> {
  const db = options.prismaClient || prisma;

  if (!db || typeof db.$transaction !== 'function') {
    throw new Error('CLAIM_STORE_UNAVAILABLE: Database client is unconfigured or unavailable');
  }

  return await db.$transaction(async (tx: any) => {
    // -------------------------------------------------------------------------
    // Step 1: Claim Invariant (Decision #24 & #55) - Atomic Claim on weekly_wrapups
    // -------------------------------------------------------------------------
    const tableExists: any = await tx.$queryRaw`SELECT to_regclass('public.weekly_wrapups')::text as to_regclass;`;
    if (!tableExists || !tableExists[0] || !tableExists[0].to_regclass) {
      return {
        applied: false,
        reason: 'CLAIM_STORE_UNAVAILABLE',
        poolId,
        weekNumber,
      };
    }

    // Attempt atomic insertion into weekly_wrapups
    const claimResult: any[] = await tx.$queryRawUnsafe(
      `INSERT INTO public.weekly_wrapups (pool_id, week_number)
       VALUES ($1::uuid, $2::int)
       ON CONFLICT (pool_id, week_number) DO NOTHING
       RETURNING pool_id, week_number;`,
      poolId,
      weekNumber
    );

    if (!claimResult || claimResult.length === 0) {
      return {
        applied: false,
        reason: 'ALREADY_WRAPPED_UP',
        poolId,
        weekNumber,
      };
    }

    // -------------------------------------------------------------------------
    // Step 2: Fetch Pool and Active Members
    // -------------------------------------------------------------------------
    const pool = await tx.pool.findUnique({
      where: { id: poolId },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: {
            user: {
              include: {
                notificationPreference: true,
              },
            },
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

    const settings = (pool.settings as PoolSettings) || {};
    const penaltiesConfig = settings.penalties || {};
    const tiebreakerConfig = settings.tiebreaker || {};
    const gameTargetSetting = tiebreakerConfig.game_target || tiebreakerConfig.gameTarget || 'MONDAY_NIGHT';
    const excludedWindows = settings.excludedGameWindows ?? settings.excluded_game_windows;

    // -------------------------------------------------------------------------
    // Step 3: Precondition Check (Decision #27) - Game Status and Finality
    // -------------------------------------------------------------------------
    const picks = await tx.pick.findMany({
      where: { poolId },
      include: {
        result: true,
        game: true,
      },
    });

    const gamesMap = new Map<string, any>();
    for (const pick of picks) {
      if (pick.game) {
        gamesMap.set(pick.game.id, pick.game);
      }
    }
    const poolGames = Array.from(gamesMap.values());

    const nonExcludedGames = poolGames.filter(
      (game) => !isGameInExcludedWindow(game.kickoffTime, excludedWindows)
    );

    if (nonExcludedGames.length === 0) {
      return {
        applied: false,
        reason: 'SCORE_FEED_UNAVAILABLE',
        poolId,
        weekNumber,
      };
    }

    const pendingGames = nonExcludedGames.filter(
      (g) => g.status !== GameStatus.FINAL || g.homeScore === null || g.awayScore === null
    );

    if (pendingGames.length > 0) {
      const sortedPending = [...pendingGames].sort(
        (a, b) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime()
      );
      return {
        applied: false,
        reason: 'SCORE_FEED_UNAVAILABLE',
        pendingCount: pendingGames.length,
        earliestPendingKickoff: sortedPending[0]?.kickoffTime ?? null,
        poolId,
        weekNumber,
      };
    }

    // -------------------------------------------------------------------------
    // Step 4: Decimal Scoring & Tiebreaker Resolution (Decisions #3 & #22)
    // -------------------------------------------------------------------------
    const targetGame = resolveTiebreakerGame(nonExcludedGames, gameTargetSetting);
    const targetGameHomeScore = targetGame?.homeScore ?? 0;
    const targetGameAwayScore = targetGame?.awayScore ?? 0;
    const actualTiebreakerTotal = targetGame ? targetGameHomeScore + targetGameAwayScore : 0;

    const weeklySubmissions = await tx.weeklySubmission.findMany({
      where: {
        poolId: pool.id,
        weekNumber,
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

    const memberScoresMap = new Map<string, Prisma.Decimal>();
    for (const membership of pool.memberships) {
      memberScoresMap.set(membership.userId, new Prisma.Decimal(0));
    }

    for (const pick of picks) {
      if (memberScoresMap.has(pick.userId) && pick.result) {
        const isExcluded = pick.game ? isGameInExcludedWindow(pick.game.kickoffTime, excludedWindows) : false;
        if (!isExcluded) {
          const currentScore = memberScoresMap.get(pick.userId) || new Prisma.Decimal(0);
          const points = new Prisma.Decimal(pick.result.pointsAwarded.toString());
          memberScoresMap.set(pick.userId, currentScore.plus(points));
        }
      }
    }

    const memberEntries: WrapUpMemberScore[] = pool.memberships.map((membership: any) => {
      const userId = membership.userId;
      const score = (memberScoresMap.get(userId) || new Prisma.Decimal(0)).toNumber();
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

    // Rank members: Score DESC, Tiebreaker Distance ASC, UserId ASC
    memberEntries.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (a.tiebreakerDistance !== b.tiebreakerDistance) {
        return a.tiebreakerDistance - b.tiebreakerDistance;
      }
      return a.userId.localeCompare(b.userId);
    });

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

    // Calculate split penalty using Prisma.Decimal
    const penaltyConfigVal = penaltiesConfig.dead_place_penalty ?? penaltiesConfig.deadPlacePenalty ?? 1;
    const deadPlacePenalty = new Prisma.Decimal(penaltyConfigVal.toString());
    const deadCountDecimal = new Prisma.Decimal(deadPlaceMembers.length);
    const splitPenalty = deadPlaceMembers.length > 0
      ? deadPlacePenalty.dividedBy(deadCountDecimal).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
      : new Prisma.Decimal(0);

    if (splitPenalty.greaterThan(0)) {
      for (const deadMember of deadPlaceMembers) {
        await tx.penaltyLedger.create({
          data: {
            poolId: pool.id,
            userId: deadMember.userId,
            weekNumber,
            delta: splitPenalty,
            reason: 'WEEKLY_DEAD_PLACE',
            createdById: pool.adminId,
          },
        });
      }
    }

    // Upsert PoolMemberStats
    for (const membership of pool.memberships) {
      const userId = membership.userId;
      const isTopScorer = topScorerUserIds.has(userId);
      const isDeadPlace = deadPlaceUserIds.has(userId);

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

    // -------------------------------------------------------------------------
    // Step 5: Outbox Enqueue Fan-Out (Decision #57)
    // -------------------------------------------------------------------------
    let notificationsEnqueued = 0;
    const now = new Date();

    for (const membership of pool.memberships) {
      const user = membership.user;
      const pref = user?.notificationPreference;

      // Check preference opt-out
      if (pref) {
        if (pref.emailEnabled === false || (pref as any).weeklyWrapup === false) {
          continue;
        }
      }

      const dedupeKey = `wrapup:v1:pool:${pool.id}:week:${weekNumber}:user:${user.id}`;
      const payload = {
        poolName: pool.name,
        weekNumber,
        highScorer: topScorers.map((t) => t.userId).join(', '),
        penaltySummary: `Dead place penalty: ${splitPenalty.toString()} shots`,
        deepLink: `/pools/${pool.id}/leaderboard`,
      };

      const outboxResult = await tx.outboxEvent.createMany({
        data: [
          {
            poolId: pool.id,
            recipientUserId: user.id,
            type: 'WRAPUP',
            payload,
            dedupeKey,
            status: OutboxStatus.PENDING,
            attempts: 0,
            nextAttemptAt: now,
          },
        ],
        skipDuplicates: true,
      });

      await tx.inboxMessage.createMany({
        data: [
          {
            poolId: pool.id,
            userId: user.id,
            type: 'WRAPUP',
            payload,
            dedupeKey,
          },
        ],
        skipDuplicates: true,
      });

      if (outboxResult.count > 0) {
        notificationsEnqueued++;
      }
    }

    return {
      applied: true,
      poolId: pool.id,
      weekNumber,
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
      notificationsEnqueued,
      targetGameId: targetGame?.id ?? null,
      targetGameScore: actualTiebreakerTotal,
    };
  }, { maxWait: 15000, timeout: 30000 });
}

/**
 * Scans active pools and executes weekly wrap-up across all eligible pools.
 */
export async function runWrapUpEngine(options: WrapUpOptions = {}): Promise<{
  jobRun: any;
  engineResult: WrapUpEngineRunResult;
}> {
  const weekNumber = options.weekNumber !== undefined ? Number(options.weekNumber) : 1;
  const db = options.prismaClient || prisma;

  let engineResult: WrapUpEngineRunResult = {
    poolsScanned: 0,
    poolsApplied: 0,
    poolsSkipped: 0,
    totalNotificationsEnqueued: 0,
    results: [],
  };

  const jobRun = await withJobRun('weekly_wrapup', async () => {
    const poolWhere: Prisma.PoolWhereInput = {
      status: 'ACTIVE',
    };
    if (options.poolId) {
      poolWhere.id = options.poolId;
    }

    const pools = await db.pool.findMany({
      where: poolWhere,
      select: { id: true, name: true },
    });

    const results: PoolWrapUpResult[] = [];
    let poolsApplied = 0;
    let poolsSkipped = 0;
    let totalNotificationsEnqueued = 0;

    for (const p of pools) {
      try {
        const wrapUpRes = await executeWeeklyWrapUpForPool(p.id, weekNumber, { prismaClient: db });
        results.push(wrapUpRes);
        if (wrapUpRes.applied) {
          poolsApplied++;
          totalNotificationsEnqueued += wrapUpRes.notificationsEnqueued || 0;
        } else {
          poolsSkipped++;
        }
      } catch (err: any) {
        console.error(`Error wrapping up pool ${p.id}:`, err);
        results.push({
          applied: false,
          reason: err.message || 'EXECUTION_FAILED',
          poolId: p.id,
          weekNumber,
        });
        poolsSkipped++;
      }
    }

    engineResult = {
      poolsScanned: pools.length,
      poolsApplied,
      poolsSkipped,
      totalNotificationsEnqueued,
      results,
    };

    return {
      itemsProcessed: poolsApplied,
      succeeded: poolsApplied,
      failed: 0,
      meta: {
        weekNumber,
        poolsScanned: pools.length,
        poolsApplied,
        poolsSkipped,
        totalNotificationsEnqueued,
      },
    };
  });

  return { jobRun, engineResult };
}
