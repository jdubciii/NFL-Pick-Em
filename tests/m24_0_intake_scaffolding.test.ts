import { describe, it, expect, beforeEach } from 'vitest';
import { featureFlags, FeatureFlagKey } from '../src/config/featureFlags';
import { ObservabilityTelemetryService } from '../src/services/observability/observabilityTelemetryService';

describe('Milestone 24.0: Phase 24 Intake & Observability Scaffolding Invariants', () => {
  beforeEach(() => {
    ObservabilityTelemetryService.clearBuffer();
  });

  it('enforces Decision #62 fail-closed circuit breaker invariant (PRD_PHASE_24_OBSERVABILITY default false)', () => {
    expect(featureFlags[FeatureFlagKey.PRD_PHASE_24_OBSERVABILITY]).toBe(false);
    expect(ObservabilityTelemetryService.isCircuitBreakerActive()).toBe(false);
  });

  it('bypasses telemetry ingestion completely when circuit breaker is disabled', () => {
    const recorded = ObservabilityTelemetryService.recordSpan({
      traceId: 'trace_test_01',
      tenantId: 'tenant_alpha',
      poolId: 'pool_1',
      event: 'KICKOFF_LOCK_AUDIT',
      level: 'INFO',
    });

    expect(recorded).toBe(false);
    const spans = ObservabilityTelemetryService.getRecentSpans('tenant_alpha', 'pool_1');
    expect(spans).toHaveLength(0);
  });

  it('enforces Decision #20 tenant-scoped query boundary interface', () => {
    const spans = ObservabilityTelemetryService.getRecentSpans('tenant_test', 'pool_test');
    expect(Array.isArray(spans)).toBe(true);
  });
});
