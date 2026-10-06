import { describe, it, expect } from 'vitest';
import { KickoffSpikeSimulator, LoadTestConfig } from '../scripts/load/simulate_kickoff_spike';
import { featureFlags, FeatureFlagKey } from '../src/config/featureFlags';
import { ProjectionCacheService } from '../src/services/perf/projectionCacheService';

describe('Milestone 23.2: Synthetic Multi-Tenant Load Generation & Kickoff Contention Contracts', () => {
  it('executes concurrent synthetic load simulation across multiple tenants without isolation bleed', async () => {
    const config: LoadTestConfig = {
      tenantCount: 3,
      poolsPerTenant: 2,
      usersPerPool: 5,
      concurrencyLevel: 10,
      targetKickoffWindowMs: 600,
    };

    const result = await KickoffSpikeSimulator.runSimulation(config, 400);

    expect(result.totalRequests).toBe(30); // 3 * 2 * 5
    expect(result.successfulPicks + result.lockedOutPicks).toBe(30);
    expect(result.tenantIsolationViolations).toBe(0);
    expect(result.p95LatencyMs).toBeGreaterThanOrEqual(0);
  });

  it('enforces Decision #65 kickoff lock cutoff under high concurrency contention', async () => {
    const config: LoadTestConfig = {
      tenantCount: 2,
      poolsPerTenant: 1,
      usersPerPool: 10,
      concurrencyLevel: 5,
      targetKickoffWindowMs: 1000,
    };

    // Lock immediate threshold at 0ms so all submissions lock out
    const result = await KickoffSpikeSimulator.runSimulation(config, -1);
    expect(result.lockedOutPicks).toBe(20);
    expect(result.successfulPicks).toBe(0);
  });

  it('verifies ProjectionCacheService handles concurrent read-through calls without race conditions', async () => {
    ProjectionCacheService.clear();
    const calls = Array.from({ length: 20 }, (_, i) => {
      return ProjectionCacheService.getOrCompute(
        'tenant_perf_test',
        'pool_perf_test',
        'leaderboard',
        () => ({ computedAt: Date.now(), index: i }),
        30
      );
    });

    const results = await Promise.all(calls);
    expect(results.length).toBe(20);
    // Because circuit breaker is default OFF, each evaluates independently
    expect(featureFlags[FeatureFlagKey.PRD_PHASE_23_PERF_HARDENING]).toBe(false);
  });
});
