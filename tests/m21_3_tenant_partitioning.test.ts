import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { featureFlags, FeatureFlagKey } from '../src/config/featureFlags';
import {
  TenantPartitioningService,
  TenantContext,
  PoolLeaderboardEntry,
} from '../src/services/tenantPartitioningService';

describe('Milestone 21.3: Scaled Multi-Tenant Partitioning & Anonymization Engine', () => {
  const originalFlag = featureFlags[FeatureFlagKey.GLOBAL_TENANT_PARTITIONING];

  const clientScope: TenantContext = {
    tenantId: 'tenant_alpha',
    poolId: 'pool_101',
    userId: 'user_alpha_1',
  };

  const sampleDataset: PoolLeaderboardEntry[] = [
    {
      userId: 'user_alpha_1',
      username: 'AlphaWinner',
      tenantId: 'tenant_alpha',
      poolId: 'pool_101',
      totalPoints: 120,
      rank: 1,
    },
    {
      userId: 'user_beta_9',
      username: 'BetaChampion',
      tenantId: 'tenant_beta',
      poolId: 'pool_202',
      totalPoints: 115,
      rank: 2,
    },
    {
      userId: 'user_gamma_4',
      username: 'GammaSecret',
      tenantId: 'tenant_gamma',
      poolId: 'pool_303',
      totalPoints: 110,
      rank: 3,
    },
  ];

  beforeEach(() => {
    featureFlags[FeatureFlagKey.GLOBAL_TENANT_PARTITIONING] = false;
  });

  afterEach(() => {
    featureFlags[FeatureFlagKey.GLOBAL_TENANT_PARTITIONING] = originalFlag;
  });

  describe('Circuit Breaker (Decision #62)', () => {
    it('returns only local tenant entries with zero cross-tenant leakage when flag is OFF', () => {
      const projection = TenantPartitioningService.partitionLeaderboard(clientScope, sampleDataset);
      expect(projection.isAnonymized).toBe(false);
      expect(projection.entries.length).toBe(1);
      expect(projection.entries[0].displayName).toBe('AlphaWinner');
      expect(projection.entries[0].isExternal).toBe(false);
    });
  });

  describe('Tenant Boundary Assertion & Fail-Closed Errors (Decisions #20, #55)', () => {
    it('throws TENANT_ISOLATION_VIOLATION if requesting tenantId is missing', () => {
      expect(() => {
        TenantPartitioningService.partitionLeaderboard(
          { tenantId: '', poolId: 'pool_101' },
          sampleDataset
        );
      }).toThrowError(/TENANT_ISOLATION_VIOLATION/);
    });

    it('assertTenantAccess throws TENANT_ACCESS_DENIED when attempting to access a foreign tenant', () => {
      expect(() => {
        TenantPartitioningService.assertTenantAccess(clientScope, 'tenant_beta');
      }).toThrowError(/TENANT_ACCESS_DENIED/);
    });

    it('assertTenantAccess succeeds when tenantId matches target', () => {
      expect(() => {
        TenantPartitioningService.assertTenantAccess(clientScope, 'tenant_alpha');
      }).not.toThrow();
    });
  });

  describe('Global Partitioning & Cryptographic Anonymization (Decisions #20, #54)', () => {
    beforeEach(() => {
      featureFlags[FeatureFlagKey.GLOBAL_TENANT_PARTITIONING] = true;
    });

    it('anonymizes external tenant entries while preserving internal names', () => {
      const projection = TenantPartitioningService.partitionLeaderboard(clientScope, sampleDataset);

      expect(projection.isAnonymized).toBe(true);
      expect(projection.entries.length).toBe(3);

      const internal = projection.entries.find((e) => e.displayName === 'AlphaWinner');
      expect(internal).toBeDefined();
      expect(internal?.isExternal).toBe(false);

      const externalEntries = projection.entries.filter((e) => e.isExternal);
      expect(externalEntries.length).toBe(2);
      externalEntries.forEach((entry) => {
        expect(entry.displayName).toMatch(/^AnonUser-[a-f0-9]{8}$/);
        expect(entry.displayName).not.toContain('BetaChampion');
        expect(entry.displayName).not.toContain('GammaSecret');
      });
    });

    it('produces deterministic anonymized identifiers for the same user and salt', () => {
      const id1 = TenantPartitioningService.anonymizeUserIdentifier('user_x', 'salt_1');
      const id2 = TenantPartitioningService.anonymizeUserIdentifier('user_x', 'salt_1');
      const id3 = TenantPartitioningService.anonymizeUserIdentifier('user_x', 'salt_2');

      expect(id1).toBe(id2);
      expect(id1).not.toBe(id3);
    });
  });
});
