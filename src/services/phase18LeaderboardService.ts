import { Prisma } from '@prisma/client';
import { LeaderboardEntry } from './phase18ArchivalService';

export interface RawMemberSeasonPerformance {
  userId: string;
  poolId: string;
  membershipId: string;
  displayName: string;
  correctPicksCount: number;
  totalPicksCount: number;
  totalPoints: Prisma.Decimal;
  optInGlobalLeaderboard: boolean;
}

export interface LeaderboardQueryOptions {
  poolId?: string;
  isGlobal: boolean;
  limit?: number;
  flagStoreValue: boolean | null | undefined;
}

export class Phase18LeaderboardService {
  private static readonly CIRCUIT_BREAKER_KEY = 'global_leaderboards';

  public static isFeatureEnabled(flagStoreValue: boolean | null | undefined): boolean {
    return flagStoreValue === true;
  }

  /**
   * Enforces Decision #20 (Pool Isolation & Anonymization), Decision #54 (Read-Only GET),
   * Decision #62 (Circuit Breaker), and Decisions #3 & #22 (Prisma.Decimal precision).
   */
  public static aggregateLeaderboard(
    records: RawMemberSeasonPerformance[],
    options: LeaderboardQueryOptions
  ): { success: boolean; leaderboard?: LeaderboardEntry[]; error?: string } {
    if (options.isGlobal && !this.isFeatureEnabled(options.flagStoreValue)) {
      return { success: false, error: 'CIRCUIT_BREAKER_DISABLED: Global leaderboards feature is disabled' };
    }

    let filtered = records;

    // Decision #20: Strict pool isolation for pool-tier query
    if (!options.isGlobal) {
      if (!options.poolId) {
        return { success: false, error: 'POOL_ID_REQUIRED: Pool-tier leaderboard query requires valid poolId' };
      }
      filtered = records.filter((r) => r.poolId === options.poolId);
    }

    // Sort descending by totalPoints using Prisma.Decimal comparisons, then winCount
    const sorted = [...filtered].sort((a, b) => {
      if (b.totalPoints.greaterThan(a.totalPoints)) return 1;
      if (b.totalPoints.lessThan(a.totalPoints)) return -1;
      return b.correctPicksCount - a.correctPicksCount;
    });

    const limit = options.limit || 50;
    const paged = sorted.slice(0, limit);

    const projected: LeaderboardEntry[] = paged.map((item, index) => {
      const isAnonymized = options.isGlobal && !item.optInGlobalLeaderboard;
      return {
        userId: isAnonymized ? 'anon_' + item.userId.substring(0, 4) : item.userId,
        displayName: isAnonymized ? 'Anonymous Picker' : item.displayName,
        isAnonymized,
        poolId: options.isGlobal ? undefined : item.poolId,
        seasonScore: item.totalPoints,
        winCount: item.correctPicksCount,
        rank: index + 1,
      };
    });

    return {
      success: true,
      leaderboard: projected,
    };
  }
}
