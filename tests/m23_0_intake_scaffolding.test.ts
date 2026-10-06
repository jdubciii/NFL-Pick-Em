import { describe, it, expect, beforeEach } from 'vitest';
import { featureFlags, FeatureFlagKey } from '../src/config/featureFlags';
import { ProjectionCacheService } from '../src/services/perf/projectionCacheService';

describe('Milestone 23.0: Phase 23 Intake & Scaffolding Invariants', () => {
  beforeEach(() => {
    ProjectionCacheService.clear();
  });

  it('enforces Decision #62 fail-closed circuit breaker invariant (PRD_PHASE_23_PERF_HARDENING default false)', () => {
    expect(featureFlags[FeatureFlagKey.PRD_PHASE_23_PERF_HARDENING]).toBe(false);
    expect(ProjectionCacheService.isCircuitBreakerActive()).toBe(false);
  });

  it('bypasses cache completely when circuit breaker is disabled', () => {
    ProjectionCacheService.set('test_key', { data: 123 }, 60);
    const result = ProjectionCacheService.get('test_key');
    expect(result).toBeNull();
  });

  it('provides structured metrics telemetry scaffolding', () => {
    const metrics = ProjectionCacheService.getMetrics();
    expect(metrics).toHaveProperty('timestamp');
    expect(metrics).toHaveProperty('cacheHits');
    expect(metrics).toHaveProperty('cacheMisses');
  });
});
