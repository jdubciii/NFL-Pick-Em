import { describe, it, expect } from 'vitest';
import {
  anonymizedHandle,
  isDistributionHidden,
  SweatRadarMatchup,
} from '../src/components/leaderboard/MultiTenantLeaderboardPanel';
import { TenantPartitioningService } from '../src/services/tenantPartitioningService';
import { featureFlags, FeatureFlagKey } from '../src/config/featureFlags';

describe('Milestone 22.4: Multi-Tenant Leaderboard & Live Sweat Radar UI Contracts', () => {
  it('enforces Decision #20 deterministic anonymization format (AnonUser-[hash])', () => {
    const userId = 'usr_external_tenant_9988';
    const handle = anonymizedHandle(userId);
    expect(handle).toMatch(/^AnonUser-[0-9a-f]{8}$/);
    expect(anonymizedHandle(userId)).toBe(handle);
  });

  it('validates TenantPartitioningService isolation boundaries and cross-tenant reads', () => {
    const tenantA = 'tenant_alpha';
    const tenantB = 'tenant_beta';

    expect(() => {
      TenantPartitioningService.assertTenantAccess({ tenantId: tenantA, poolId: 'pool_alpha_1' }, tenantA);
    }).not.toThrow();

    expect(() => {
      TenantPartitioningService.assertTenantAccess({ tenantId: tenantA, poolId: 'pool_alpha_1' }, tenantB);
    }).toThrow(/TENANT_ACCESS_DENIED/);

    const anon = TenantPartitioningService.anonymizeUserIdentifier('usr_123', tenantA);
    expect(anon).toMatch(/^AnonUser-[0-9a-f]{8}$/);
  });

  it('exposes distributions for small cohorts (cohort >= 1) under open pool visibility (P41-POOL-VISIBILITY-2026-10-19-08)', () => {
    const pastKickoff = new Date(Date.now() - 3600000).toISOString();
    const smallCohortMatchup: SweatRadarMatchup = {
      gameId: 'gm_small_cohort',
      homeTeam: 'KC',
      awayTeam: 'BAL',
      homePickPct: 75,
      awayPickPct: 25,
      isSuppressed: false,
      kickoffAt: pastKickoff,
      cohortSize: 2,
    };

    expect(isDistributionHidden(smallCohortMatchup, Date.now())).toBe(false);

    const validCohortMatchup: SweatRadarMatchup = {
      ...smallCohortMatchup,
      cohortSize: 5,
    };
    expect(isDistributionHidden(validCohortMatchup, Date.now())).toBe(false);
  });

  it('exposes pre-kickoff pick distributions under open pool visibility', () => {
    const futureKickoff = new Date(Date.now() + 7200000).toISOString();
    const preKickoffMatchup: SweatRadarMatchup = {
      gameId: 'gm_future',
      homeTeam: 'PHI',
      awayTeam: 'DAL',
      homePickPct: 60,
      awayPickPct: 40,
      isSuppressed: false,
      kickoffAt: futureKickoff,
      cohortSize: 20,
    };

    expect(isDistributionHidden(preKickoffMatchup, Date.now())).toBe(false);
  });

  it('enforces Decision #62 fail-closed circuit breaker invariant (PRD_PHASE_22_UI_WIRING)', () => {
    expect(featureFlags[FeatureFlagKey.PRD_PHASE_22_UI_WIRING]).toBe(false);
  });
});
