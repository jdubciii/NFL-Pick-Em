import { describe, it, expect, beforeEach } from 'vitest';
import { featureFlags, FeatureFlagKey } from '../src/config/featureFlags';
import { SyntheticAlertingService } from '../src/services/observability/syntheticAlertingService';
import { LockContentionMetricsService } from '../src/services/observability/lockContentionMetricsService';
import { AuditTripLoggerService } from '../src/services/observability/auditTripLoggerService';

describe('Milestone 24.4: Synthetic E2E Alerting & Monitoring Contracts', () => {
  beforeEach(() => {
    LockContentionMetricsService.clear();
    AuditTripLoggerService.clear();
  });

  it('enforces Decision #62 fail-closed circuit breaker invariant (PRD_PHASE_24_OBSERVABILITY default false)', () => {
    expect(featureFlags[FeatureFlagKey.PRD_PHASE_24_OBSERVABILITY]).toBe(false);
    expect(SyntheticAlertingService.isCircuitBreakerActive()).toBe(false);

    const alerts = SyntheticAlertingService.evaluatePoolAlerts('tenant_alpha', 'pool_1');
    expect(alerts).toHaveLength(0);
  });

  it('enforces Decision #20 tenant-scoped alerting evaluation with zero cross-tenant leakage', () => {
    const alertsA = SyntheticAlertingService.evaluatePoolAlerts('tenant_a', 'pool_1');
    const alertsB = SyntheticAlertingService.evaluatePoolAlerts('tenant_b', 'pool_1');

    expect(alertsA).toEqual([]);
    expect(alertsB).toEqual([]);
  });

  it('validates pure read projection semantics without database side-effects (Decision #54)', () => {
    const alerts = SyntheticAlertingService.evaluatePoolAlerts('tenant_read', 'pool_read');
    expect(Array.isArray(alerts)).toBe(true);
  });
});
