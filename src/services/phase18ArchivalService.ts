import { Prisma } from '@prisma/client';

export enum Phase18FeatureFlagKey {
  GLOBAL_LEADERBOARDS = 'global_leaderboards',
  ACHIEVEMENTS_ENGINE = 'achievements_engine',
  SEASON_ARCHIVAL = 'season_archival',
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  isAnonymized: boolean;
  poolId?: string;
  seasonScore: Prisma.Decimal;
  winCount: number;
  rank: number;
}

export interface AchievementBadge {
  id: string;
  userId: string;
  poolId: string;
  badgeType: string;
  awardedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface SeasonArchiveManifest {
  archiveId: string;
  seasonYear: number;
  poolId: string;
  snapshotSha256: string;
  totalMembers: number;
  totalPicks: number;
  isLocked: boolean;
  createdAt: Date;
}

export class Phase18ArchivalService {
  /**
   * Evaluates Decision #62 Circuit Breakers.
   * Default state is strictly OFF (false).
   */
  public static isFlagEnabled(flagStoreValue: boolean | null | undefined): boolean {
    return flagStoreValue === true;
  }

  /**
   * Enforces Decision #20 & Decision #54:
   * Read-only leaderboard entry projection with anonymization for non-opted-in cross-pool displays.
   */
  public static sanitizeLeaderboardEntry(entry: LeaderboardEntry, isCrossPoolQuery: boolean): LeaderboardEntry {
    if (isCrossPoolQuery && entry.isAnonymized) {
      return {
        ...entry,
        displayName: 'Anonymous Picker #' + entry.userId.substring(0, 4),
        poolId: undefined,
      };
    }
    return entry;
  }

  /**
   * Decision #55: Fail-closed archival manifest creation.
   */
  public static createArchiveManifest(params: {
    seasonYear: number;
    poolId: string;
    totalMembers: number;
    totalPicks: number;
    snapshotHash: string;
    flagStoreValue: boolean | null | undefined;
  }): { success: boolean; manifest?: SeasonArchiveManifest; error?: string } {
    if (!this.isFlagEnabled(params.flagStoreValue)) {
      return { success: false, error: 'CIRCUIT_BREAKER_DISABLED: Season archival feature is disabled' };
    }

    if (!params.snapshotHash || params.snapshotHash.length < 32) {
      return { success: false, error: 'INVALID_SNAPSHOT_HASH: Archival aborted to preserve data integrity' };
    }

    const manifest: SeasonArchiveManifest = {
      archiveId: 'arch_' + params.seasonYear + '_' + params.poolId,
      seasonYear: params.seasonYear,
      poolId: params.poolId,
      snapshotSha256: params.snapshotHash,
      totalMembers: params.totalMembers,
      totalPicks: params.totalPicks,
      isLocked: true,
      createdAt: new Date(),
    };

    return { success: true, manifest };
  }
}
