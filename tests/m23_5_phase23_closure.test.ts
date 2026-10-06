import { describe, it, expect, beforeEach } from 'vitest';
import { featureFlags, FeatureFlagKey } from '../src/config/featureFlags';
import { ProjectionCacheService } from '../src/services/perf/projectionCacheService';
import { KickoffSpikeSimulator, LoadTestConfig } from '../scripts/load/simulate_kickoff_spike';
import { QueryAuditService } from '../src/services/perf/queryAuditService';
import { FailoverDegradationService } from '../src/services/perf/failoverDegradationService';

describe('Milestone 23.5: Phase 23 Cumulative Performance Hardening E2E Closure Suite', () => {
  beforeEach(() => {
    ProjectionCacheService.clear();
    FailoverDegradationService.clearAll();
  });

  it('E2E HARDENING 1: verifies ProjectionCacheService key isolation and circuit breaker bypass', async () => {
    expect(featureFlags[FeatureFlagKey.PRD_PHASE_23_PERF_HARDENING]).toBe(false);

    const key = ProjectionCacheService.buildKey('tenant_closure', 'pool_closure', 'radar', 'v1');
    expect(key).toBe('projection:tenant_closure:pool_closure:radar:v1');

    let execCount = 0;
    const fetcher = async () => {
      execCount++;
      return { live: true };
    };

    const res1 = await ProjectionCacheService.getOrCompute('tenant_closure', 'pool_closure', 'radar', fetcher);
    const res2 = await ProjectionCacheService.getOrCompute('tenant_closure', 'pool_closure', 'radar', fetcher);

    expect(execCount).toBe(2); // Flag is false, bypasses cache
    expect(res1).toEqual(res2);
  });

  it('E2E HARDENING 2: executes synthetic kickoff spike simulation maintaining zero isolation bleed', async () => {
    const config: LoadTestConfig = {
      tenantCount: 2,
      poolsPerTenant: 2,
      usersPerPool: 4,
      concurrencyLevel: 8,
      targetKickoffWindowMs: 400,
    };

    const result = await KickoffSpikeSimulator.runSimulation(config, 250);
    expect(result.totalRequests).toBe(16);
    expect(result.successfulPicks + result.lockedOutPicks).toBe(16);
    expect(result.tenantIsolationViolations).toBe(0);
    expect(result.averageLatencyMs).toBeGreaterThanOrEqual(0);
  });

  it('E2E HARDENING 3: confirms QueryAuditService verifies existing index coverage with Zero DDL', () => {
    const audit = QueryAuditService.auditQueryProjection(
      'AuditClosurePicks',
      'picks',
      ['tenant_id', 'pool_id', 'user_id', 'week'],
      ['id', 'user_id', 'points']
    );

    expect(audit.indexCovered).toBe(true);
    expect(audit.tenantFiltered).toBe(true);
    expect(audit.hasNPlusOneRisk).toBe(false);

    const batchQuery = QueryAuditService.optimizeLeaderboardBatchRead('Tenant_1', 'Pool_1', ['u1', 'u2']);
    expect(batchQuery.whereClause.tenant_id).toBe('tenant_1');
    expect(batchQuery.whereClause.pool_id).toBe('pool_1');
  });

  it('E2E HARDENING 4: verifies FailoverDegradationService fail-closed error propagation', async () => {
    expect(featureFlags[FeatureFlagKey.PRD_PHASE_23_PERF_HARDENING]).toBe(false);

    const failingPrimary = async () => {
      throw new Error('Connection pool timeout');
    };
    const fallbackFn = () => ({ cached: true });

    await expect(
      FailoverDegradationService.executeWithDegradation(
        'tenant_closure',
        'pool_closure',
        'leaderboard',
        failingPrimary,
        fallbackFn
      )
    ).rejects.toThrow('Connection pool timeout');
  });

  it('GOVERNANCE INVARIANT: verifies PRD_PHASE_23_PERF_HARDENING defaults strictly to false', () => {
    expect(featureFlags[FeatureFlagKey.PRD_PHASE_23_PERF_HARDENING]).toBe(false);
  });
});
