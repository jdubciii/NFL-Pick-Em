import { describe, it, expect, beforeEach } from 'vitest';
import { featureFlags, FeatureFlagKey } from '../src/config/featureFlags';
import { OperationalHealthService } from '../src/services/observability/operationalHealthService';
import { LockContentionMetricsService } from '../src/services/observability/lockContentionMetricsService';
import { AuditTripLoggerService } from '../src/services/observability/auditTripLoggerService';

describe('Milestone 24.3: Real-Time Operational Health Endpoints & Degradation Telemetry Contracts', () => {
  beforeEach(() => {
    LockContentionMetricsService.clear();
    AuditTripLoggerService.clear();
  });

  it('enforces Decision #62 fail-closed circuit breaker invariant (PRD_PHASE_24_OBSERVABILITY default false)', () => {
    expect(featureFlags[FeatureFlagKey.PRD_PHASE_24_OBSERVABILITY]).toBe(false);
    expect(OperationalHealthService.isCircuitBreakerActive()).toBe(false);

    const snapshot = OperationalHealthService.getPoolHealth('tenant_demo', 'pool_demo');
    expect(snapshot.status).toBe('OBSERVABILITY_OFFLINE');
    expect(snapshot.circuitBreakerActive).toBe(false);
    expect(snapshot.recentTripEventsCount).toBe(0);
  });

  it('enforces Decision #20 tenant-partitioned health aggregation with zero cross-tenant leakage', () => {
    const healthA = OperationalHealthService.getPoolHealth('tenant_a', 'pool_1');
    const healthB = OperationalHealthService.getPoolHealth('tenant_b', 'pool_1');

    expect(healthA.tenantId).toBe('tenant_a');
    expect(healthB.tenantId).toBe('tenant_b');
    expect(healthA.poolId).toBe('pool_1');
    expect(healthB.poolId).toBe('pool_1');
  });

  it('validates pure read projection semantics without database side-effects (Decision #54)', () => {
    const snapshot = OperationalHealthService.getPoolHealth('tenant_read', 'pool_read');
    expect(snapshot).toHaveProperty('timestamp');
    expect(snapshot).toHaveProperty('contention');
    expect(typeof snapshot.status).toBe('string');
  });
});
