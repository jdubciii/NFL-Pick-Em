import crypto from 'crypto';
import { featureFlags, FeatureFlagKey } from '../config/featureFlags';

export interface TenantContext {
  tenantId: string;
  poolId: string;
  userId?: string;
}

export interface PoolLeaderboardEntry {
  userId: string;
  username: string;
  tenantId: string;
  poolId: string;
  totalPoints: number;
  rank: number;
}

export interface PartitionedLeaderboardProjection {
  tenantId: string;
  poolId: string;
  isAnonymized: boolean;
  entries: Array<{
    displayRank: number;
    displayName: string;
    points: number;
    isExternal: boolean;
  }>;
}

export class TenantPartitioningService {
  /**
   * Deterministically anonymizes user identifiers for cross-tenant/public projections.
   * Format: AnonUser-[8-byte-hmac-hex]
   */
  public static anonymizeUserIdentifier(userId: string, salt: string = 'global_tenant_salt'): string {
    if (!userId || userId.trim() === '') {
      throw new Error('TENANT_PARTITIONING_ERROR: userId cannot be empty');
    }
    const hash = crypto.createHmac('sha256', salt).update(userId).digest('hex').slice(0, 8);
    return `AnonUser-${hash}`;
  }

  /**
   * Partitions leaderboard results strictly by tenant.
   * Gated behind GLOBAL_TENANT_PARTITIONING flag (Decision #62).
   * Fail-closed on cross-tenant leakage or empty scope (Decision #20, #55).
   * Pure projection with zero side effects (Decision #54).
   */
  public static partitionLeaderboard(
    requestingScope: TenantContext,
    dataset: PoolLeaderboardEntry[]
  ): PartitionedLeaderboardProjection {
    if (!requestingScope.tenantId || requestingScope.tenantId.trim() === '') {
      throw new Error('TENANT_ISOLATION_VIOLATION: Missing requesting tenantId');
    }
    if (!requestingScope.poolId || requestingScope.poolId.trim() === '') {
      throw new Error('TENANT_ISOLATION_VIOLATION: Missing requesting poolId');
    }

    // Circuit Breaker: When flag is OFF, enforce strict local isolation without global rollups
    if (!featureFlags[FeatureFlagKey.GLOBAL_TENANT_PARTITIONING]) {
      const localEntries = dataset.filter(
        (entry) => entry.tenantId === requestingScope.tenantId && entry.poolId === requestingScope.poolId
      );

      return {
        tenantId: requestingScope.tenantId,
        poolId: requestingScope.poolId,
        isAnonymized: false,
        entries: localEntries.map((e) => ({
          displayRank: e.rank,
          displayName: e.username,
          points: e.totalPoints,
          isExternal: false,
        })),
      };
    }

    // Flag ON: Multi-tenant aggregation with cryptographic cross-tenant anonymization
    const projectedEntries = dataset.map((entry) => {
      const isExternal = entry.tenantId !== requestingScope.tenantId;

      return {
        displayRank: entry.rank,
        displayName: isExternal ? this.anonymizeUserIdentifier(entry.userId, requestingScope.tenantId) : entry.username,
        points: entry.totalPoints,
        isExternal,
      };
    });

    return {
      tenantId: requestingScope.tenantId,
      poolId: requestingScope.poolId,
      isAnonymized: true,
      entries: projectedEntries,
    };
  }

  /**
   * Validates cross-tenant data access boundaries.
   * Throws TENANT_ACCESS_DENIED if a user/request attempts to mutate or directly inspect foreign un-anonymized tenant assets.
   */
  public static assertTenantAccess(requestingScope: TenantContext, targetTenantId: string): void {
    if (!requestingScope.tenantId || requestingScope.tenantId !== targetTenantId) {
      throw new Error(`TENANT_ACCESS_DENIED: Requesting tenant '${requestingScope.tenantId}' cannot access foreign tenant '${targetTenantId}'`);
    }
  }
}
