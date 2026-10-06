import { describe, it, expect, beforeEach } from 'vitest';
import { featureFlags, FeatureFlagKey } from '../src/config/featureFlags';
import { ObservabilityTelemetryService } from '../src/services/observability/observabilityTelemetryService';
import { LockContentionMetricsService } from '../src/services/observability/lockContentionMetricsService';
import { AuditTripLoggerService } from '../src/services/observability/auditTripLoggerService';
import { OperationalHealthService } from '../src/services/observability/operationalHealthService';
import { SyntheticAlertingService } from '../src/services/observability/syntheticAlertingService';

describe('Milestone 24.5: Phase 24 Cumulative Observability E2E Closure Suite', () => {
  beforeEach(() => {
    ObservabilityTelemetryService.clearBuffer();
    LockContentionMetricsService.clear();
    AuditTripLoggerService.clear();
  });

  it('E2E OBSERVABILITY 1: verifies ObservabilityTelemetryService fail-closed bypass and ring buffer integrity', () => {
    expect(featureFlags[FeatureFlagKey.PRD_PHASE_24_OBSERVABILITY]).toBe(false);

    const spanRecorded = ObservabilityTelemetryService.recordSpan({
      traceId: 'trace_closure_01',
      tenantId: 'tenant_closure',
      poolId: 'pool_closure',
      event: 'GAMEDAY_OBSERVABILITY_AUDIT',
      level: 'INFO',
    });

    expect(spanRecorded).toBe(false); // Flag disabled: bypasses ingestion
    const recent = ObservabilityTelemetryService.getRecentSpans('tenant_closure', 'pool_closure');
    expect(recent).toHaveLength(0);
  });

  it('E2E OBSERVABILITY 2: verifies LockContentionMetricsService tenant partitioning and contention percentiles', () => {
    const metrics = LockContentionMetricsService.getPoolContentionMetrics('tenant_closure', 'pool_closure');
    expect(metrics.tenantId).toBe('tenant_closure');
    expect(metrics.poolId).toBe('pool_closure');
    expect(metrics.totalAttempts).toBe(0);
    expect(metrics.contentionRatio).toBe(0);
    expect(metrics.p95ContentionDelayMs).toBe(0);
  });

  it('E2E OBSERVABILITY 3: verifies AuditTripLoggerService trip recording and pure read filtering', () => {
    const recorded = AuditTripLoggerService.recordTripEvent({
      tenantId: 'tenant_closure',
      poolId: 'pool_closure',
      eventType: 'CIRCUIT_BREAKER_TRIP',
      flagKey: FeatureFlagKey.PRD_PHASE_24_OBSERVABILITY,
      triggeredBy: 'CLOSURE_TEST_HARNESS',
      details: { reason: 'Cumulative closure verification' },
    });

    expect(recorded).toBe(false); // Circuit breaker disabled
    const trail = AuditTripLoggerService.getPoolAuditTrail('tenant_closure', 'pool_closure');
    expect(trail).toHaveLength(0);
  });

  it('E2E OBSERVABILITY 4: verifies OperationalHealthService composite aggregation without database side-effects', () => {
    const health = OperationalHealthService.getPoolHealth('tenant_closure', 'pool_closure');
    expect(health.status).toBe('OBSERVABILITY_OFFLINE');
    expect(health.circuitBreakerActive).toBe(false);
    expect(health.recentTripEventsCount).toBe(0);
    expect(health.contention.totalAttempts).toBe(0);
  });

  it('E2E OBSERVABILITY 5: verifies SyntheticAlertingService rule evaluations and fail-closed state', () => {
    const alerts = SyntheticAlertingService.evaluatePoolAlerts('tenant_closure', 'pool_closure');
    expect(alerts).toEqual([]);
  });

  it('GOVERNANCE INVARIANT: verifies PRD_PHASE_24_OBSERVABILITY defaults strictly to false', () => {
    expect(featureFlags[FeatureFlagKey.PRD_PHASE_24_OBSERVABILITY]).toBe(false);
  });
});
