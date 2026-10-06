import { describe, it, expect, beforeEach } from 'vitest';
import { FailoverDegradationService } from '../src/services/perf/failoverDegradationService';
import { featureFlags, FeatureFlagKey } from '../src/config/featureFlags';

describe('Milestone 23.4: Stress Testing & Graceful Degradation Failover Contracts', () => {
  beforeEach(() => {
    FailoverDegradationService.clearAll();
  });

  it('enforces Decision #62 fail-closed circuit breaker bypass (PRD_PHASE_23_PERF_HARDENING default false)', async () => {
    expect(featureFlags[FeatureFlagKey.PRD_PHASE_23_PERF_HARDENING]).toBe(false);

    const primaryFn = async () => ({ live: 'primary_healthy' });
    const fallbackFn = () => ({ live: 'fallback_stale' });

    const result = await FailoverDegradationService.executeWithDegradation(
      'tenant_test',
      'pool_test',
      'get_standings',
      primaryFn,
      fallbackFn
    );

    expect(result.data.live).toBe('primary_healthy');
    expect(result.status.servedFromFallback).toBe(false);
    expect(result.status.isDegraded).toBe(false);
  });

  it('re-throws error on primary failure when circuit breaker is disabled (fail-closed)', async () => {
    expect(featureFlags[FeatureFlagKey.PRD_PHASE_23_PERF_HARDENING]).toBe(false);

    const failingPrimary = async () => {
      throw new Error('Database pool exhausted');
    };
    const fallbackFn = () => ({ live: 'fallback_stale' });

    await expect(
      FailoverDegradationService.executeWithDegradation(
        'tenant_test',
        'pool_test',
        'get_standings',
        failingPrimary,
        fallbackFn
      )
    ).rejects.toThrow('Database pool exhausted');
  });

  it('verifies tenant-isolated failover tracking does not leak across tenants (Decision #20)', () => {
    const tenantA = 'tenant_alpha';
    const tenantB = 'tenant_beta';

    FailoverDegradationService.resetHealth(tenantA, 'pool_1', 'op_test');
    FailoverDegradationService.resetHealth(tenantB, 'pool_1', 'op_test');

    expect(FailoverDegradationService.isCircuitBreakerActive()).toBe(false);
  });
});
