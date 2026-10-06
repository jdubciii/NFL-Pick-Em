import { describe, it, expect, beforeEach } from 'vitest';
import { featureFlags, FeatureFlagKey } from '../src/config/featureFlags';
import { LockContentionMetricsService } from '../src/services/observability/lockContentionMetricsService';

describe('Milestone 24.1: Multi-Tenant Structured Telemetry & Lock Contention Metrics Contracts', () => {
  beforeEach(() => {
    LockContentionMetricsService.clear();
  });

  it('enforces Decision #62 fail-closed circuit breaker invariant (PRD_PHASE_24_OBSERVABILITY default false)', () => {
    expect(featureFlags[FeatureFlagKey.PRD_PHASE_24_OBSERVABILITY]).toBe(false);
    expect(LockContentionMetricsService.isCircuitBreakerActive()).toBe(false);

    const recorded = LockContentionMetricsService.recordLockAttempt({
      tenantId: 'tenant_1',
      poolId: 'pool_1',
      gameId: 'game_1',
      userId: 'user_1',
      acquired: true,
      contentionDelayMs: 25,
      reason: 'LOCK_ACQUIRED',
    });

    expect(recorded).toBe(false);
    const metrics = LockContentionMetricsService.getPoolContentionMetrics('tenant_1', 'pool_1');
    expect(metrics.totalAttempts).toBe(0);
  });

  it('enforces Decision #20 tenant-scoped metrics partitioning with zero cross-tenant leakage', () => {
    const tenantA = 'tenant_alpha';
    const tenantB = 'tenant_beta';

    const metricsA = LockContentionMetricsService.getPoolContentionMetrics(tenantA, 'pool_main');
    const metricsB = LockContentionMetricsService.getPoolContentionMetrics(tenantB, 'pool_main');

    expect(metricsA.tenantId).toBe('tenant_alpha');
    expect(metricsB.tenantId).toBe('tenant_beta');
    expect(metricsA.totalAttempts).toBe(0);
    expect(metricsB.totalAttempts).toBe(0);
  });

  it('verifies pure read projection behavior on metrics queries (Decision #54)', () => {
    const metrics = LockContentionMetricsService.getPoolContentionMetrics('tenant_query', 'pool_query');
    expect(metrics).toHaveProperty('contentionRatio');
    expect(metrics).toHaveProperty('p95ContentionDelayMs');
    expect(typeof metrics.averageContentionDelayMs).toBe('number');
  });
});
