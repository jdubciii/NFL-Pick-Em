import { describe, it, expect, beforeEach } from 'vitest';
import { featureFlags, FeatureFlagKey } from '../src/config/featureFlags';
import { ProjectionCacheService } from '../src/services/perf/projectionCacheService';

describe('Milestone 23.1: Edge & In-Memory Projection Read-Through Caching Contracts', () => {
  beforeEach(() => {
    ProjectionCacheService.clear();
  });

  it('generates deterministic tenant-isolated cache keys (Decision #20)', () => {
    const keyA = ProjectionCacheService.buildKey('tenant_alpha', 'pool_1', 'sweat-radar', 'wk_5');
    const keyB = ProjectionCacheService.buildKey('tenant_beta', 'pool_1', 'sweat-radar', 'wk_5');

    expect(keyA).toBe('projection:tenant_alpha:pool_1:sweat-radar:wk_5');
    expect(keyB).toBe('projection:tenant_beta:pool_1:sweat-radar:wk_5');
    expect(keyA).not.toEqual(keyB);
  });

  it('bypasses cache completely when PRD_PHASE_23_PERF_HARDENING circuit breaker is false (Decision #62)', async () => {
    expect(featureFlags[FeatureFlagKey.PRD_PHASE_23_PERF_HARDENING]).toBe(false);

    let computeExecutions = 0;
    const computeFn = () => {
      computeExecutions++;
      return { standings: ['PlayerA', 'PlayerB'] };
    };

    const res1 = await ProjectionCacheService.getOrCompute('tenant_1', 'pool_1', 'standings', computeFn, 60);
    const res2 = await ProjectionCacheService.getOrCompute('tenant_1', 'pool_1', 'standings', computeFn, 60);

    expect(computeExecutions).toBe(2);
    expect(res1).toEqual(res2);
    const metrics = ProjectionCacheService.getMetrics();
    expect(metrics.cacheHits).toBe(0);
    expect(metrics.totalRequests).toBe(0);
  });

  it('invalidates entries scoped strictly to tenant and pool without bleed', () => {
    const key1 = ProjectionCacheService.buildKey('tenant_a', 'pool_1', 'leaderboard');
    const key2 = ProjectionCacheService.buildKey('tenant_b', 'pool_1', 'leaderboard');

    expect(key1.startsWith('projection:tenant_a:pool_1:')).toBe(true);
    expect(key2.startsWith('projection:tenant_a:pool_1:')).toBe(false);
  });
});
