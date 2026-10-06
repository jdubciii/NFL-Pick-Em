import { Prisma, GameStatus } from '@prisma/client';
import prisma from '../db/client';
import type { PoolSettings, TiebreakerSettings, PenaltySettings } from '../types/pool';
import { isGameInExcludedWindow } from './scoringEngine';
import { Phase20CoreService, FeatureFlagKey, WeeklyScoreEntry } from './phase20CoreService';

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
 * Executes the weekly wrap-up pipeline for a completed week in a pool according to R-12.2-I order of execution:
 * 1. READ (Claim Check): Check if marker exists for (poolId, weekNumber).
 * 2. READ (Game Resolver & Non-Excluded Set): Resolve non-excluded games for the week via the shared scoring resolver.
 * 3. READ (Status Check): Verify that every resolved game has status === 'FINAL'.
 * 4. WRITE (Claim): Create the weekly_wrapups claim via createMany({ skipDuplicates: true }).
 * 5. WRITE (Effects): Execute BR-4 / Decision #69 penalty ledger entries and pool_member_stats updates.
 */
export async function executeWeeklyWrapUp(poolId: string, weekNumber: number): Promise<WeeklyWrapUpResult> {
  return await prisma.$transaction(async (tx: any) => {
    // -------------------------------------------------------------------------
    // Step 1: READ (Claim Check) - Fail-closed check if claim store exists
    // -------------------------------------------------------------------------
    const tableExists: any = await tx.$queryRaw`SELECT to_regclass('public.weekly_wrapups')::text as to_regclass;`;
    if (!tableExists || !tableExists[0] || !tableExists[0].to_regclass) {
      return { applied: false, reason: 'CLAIM_STORE_UNAVAILABLE', poolId, weekNumber, weekNo: weekNumber };
    }

    // Fetch Pool and all active members
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

    const settings = (pool.settings as PoolSettings) || {};
    const tiebreakerConfig = settings.tiebreaker || {};
    const gameTargetSetting = tiebreakerConfig.game_target || tiebreakerConfig.gameTarget || 'MONDAY_NIGHT';

    // -------------------------------------------------------------------------
    // Step 2: READ (Game Resolver & Non-Excluded Set)
    // -------------------------------------------------------------------------
    // Fetch picks for this pool with associated games and results
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

    // Resolve non-excluded games using shared scoring resolver
    const excludedWindows = settings.excludedGameWindows ?? settings.excluded_game_windows;
    const nonExcludedGames = poolGames.filter(
      (game) => !isGameInExcludedWindow(game.kickoffTime, excludedWindows)
    );

    // If no non-excluded games are found, strictly abort (do NOT trigger database-wide fallback)
    if (nonExcludedGames.length === 0) {
      return {
        applied: false,
        reason: 'NO_GAMES_FOR_WEEK',
        poolId,
        weekNumber,
        weekNo: weekNumber,
      };
    }

    // -------------------------------------------------------------------------
    // Step 3: READ (Status Check) - All resolved non-excluded games MUST be FINAL
    // -------------------------------------------------------------------------
    const pendingGames = nonExcludedGames.filter(
      (g) => g.status !== GameStatus.FINAL || g.homeScore === null || g.awayScore === null
    );

    if (pendingGames.length > 0) {
      const sortedPending = [...pendingGames].sort(
        (a, b) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime()
      );
      return {
        applied: false,
        reason: 'WEEK_NOT_FINAL',
        pendingCount: pendingGames.length,
        earliestPendingKickoff: sortedPending[0]?.kickoffTime ?? null,
        poolId,
        weekNumber,
        weekNo: weekNumber,
      };
    }

    // -------------------------------------------------------------------------
    // Step 4: WRITE (Claim) - Atomic claim insertion via raw query or createMany
    // -------------------------------------------------------------------------
    const claimModel = (tx as any).weeklyWrapup || (tx as any).weekly_wrapup || (tx as any).weekly_wrapups;
    if (claimModel) {
      const claim = await claimModel.createMany({
        data: [{ poolId, weekNumber }],
        skipDuplicates: true,
      });
      if (claim && claim.count === 0) {
        return { applied: false, reason: 'ALREADY_WRAPPED_UP', poolId, weekNumber, weekNo: weekNumber };
      }
    } else {
      const claimResult: any[] = await tx.$queryRawUnsafe(
        `INSERT INTO public.weekly_wrapups (pool_id, week_number)
         VALUES ($1::uuid, $2::int)
         ON CONFLICT (pool_id, week_number) DO NOTHING
         RETURNING pool_id, week_number;`,
        poolId,
        weekNumber
      );
      if (!claimResult || claimResult.length === 0) {
        return { applied: false, reason: 'ALREADY_WRAPPED_UP', poolId, weekNumber, weekNo: weekNumber };
      }
    }

    // -------------------------------------------------------------------------
    // Step 5: WRITE (Effects) - Grade, Split Penalties, and Update Stats
    // -------------------------------------------------------------------------
    const targetGame = resolveTiebreakerGame(nonExcludedGames, gameTargetSetting);
    const targetGameHomeScore = targetGame?.homeScore ?? 0;
    const targetGameAwayScore = targetGame?.awayScore ?? 0;
    const actualTiebreakerTotal = targetGame ? targetGameHomeScore + targetGameAwayScore : 0;

    // Fetch weekly submissions for tiebreaker predictions
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

    // Calculate score per member
    const memberScoresMap = new Map<string, number>();
    for (const membership of pool.memberships) {
      memberScoresMap.set(membership.userId, 0);
    }

    for (const pick of picks) {
      if (memberScoresMap.has(pick.userId) && pick.result) {
        const isExcluded = pick.game ? isGameInExcludedWindow(pick.game.kickoffTime, excludedWindows) : false;
        if (!isExcluded) {
          const currentScore = memberScoresMap.get(pick.userId) || 0;
          memberScoresMap.set(pick.userId, currentScore + Number(pick.result.pointsAwarded));
        }
      }
    }

    // Build scored members array with tiebreaker distance
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

    // Sort users: Points (DESC), then Tiebreaker Distance (ASC)
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
    const topScorerUserIds = new Set(topScorers.map((m) => m.userId));

    // Decision #69: Evaluate Dead Place Penalties via Phase20CoreService
    const isPrdDeadPlaceRulesOn = Phase20CoreService.isFlagEnabled(
      FeatureFlagKey.PRD_DEAD_PLACE_RULES,
      settings.featureFlags || (settings as any).feature_flags || {}
    );

    const scoreEntries: WeeklyScoreEntry[] = pool.memberships.map((membership: any) => {
      const userId = membership.userId;
      const score = memberScoresMap.get(userId) || 0;
      const userPicks = picks.filter(
        (p: any) => p.userId === userId && (!p.game || !isGameInExcludedWindow(p.game.kickoffTime, excludedWindows))
      );
      return {
        userId,
        membershipId: membership.id,
        poolId: pool.id,
        totalPoints: new Prisma.Decimal(score.toString()),
        picksCount: userPicks.length,
      };
    });

    const deadPlaceResults = Phase20CoreService.evaluateDeadPlacePenalties(
      scoreEntries,
      isPrdDeadPlaceRulesOn,
      true // week is finalized
    );

    const deadPlaceUserIds = new Set(
      deadPlaceResults.filter((r) => r.isDeadPlace).map((r) => r.userId)
    );
    const deadPlaceMembers = memberEntries.filter((m) => deadPlaceUserIds.has(m.userId));

    // Insert PenaltyLedger records
    for (const r of deadPlaceResults) {
      if (r.penaltyShotsOwed.greaterThan(0)) {
        await tx.penaltyLedger.create({
          data: {
            poolId: pool.id,
            userId: r.userId,
            weekNumber,
            delta: r.penaltyShotsOwed,
            reason: 'WEEKLY_DEAD_PLACE',
            createdById: pool.adminId,
          },
        });
      }
      if (r.flatFineOwed.greaterThan(0)) {
        await tx.penaltyLedger.create({
          data: {
            poolId: pool.id,
            userId: r.userId,
            weekNumber,
            delta: r.flatFineOwed,
            reason: 'NO_SHOW_FINE',
            createdById: pool.adminId,
          },
        });
      }
    }

    const assignedPenalty = deadPlaceResults.find((r) => r.isDeadPlace)?.penaltyShotsOwed ?? new Prisma.Decimal(0);

    // Update/Upsert PoolMemberStat for all pool members & recalculate total_shots_drank
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

    return {
      applied: true,
      poolId: pool.id,
      weekNumber,
      weekNo: weekNumber,
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
      penaltyAssigned: assignedPenalty,
      processedMembers: pool.memberships.length,
      targetGameId: targetGame?.id ?? null,
      targetGameScore: actualTiebreakerTotal,
    };
  }, { maxWait: 15000, timeout: 30000 });
}

export const runWeeklyWrapUp = executeWeeklyWrapUp;
