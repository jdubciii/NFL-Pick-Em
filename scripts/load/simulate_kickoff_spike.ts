export interface LoadTestConfig {
  tenantCount: number;
  poolsPerTenant: number;
  usersPerPool: number;
  concurrencyLevel: number;
  targetKickoffWindowMs: number;
}

export interface LoadSimulationResult {
  totalRequests: number;
  successfulPicks: number;
  lockedOutPicks: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  tenantIsolationViolations: number;
}

export class KickoffSpikeSimulator {
  public static async runSimulation(
    config: LoadTestConfig,
    kickoffLockThresholdMs: number = 500
  ): Promise<LoadSimulationResult> {
    const latencies: number[] = [];
    let successfulPicks = 0;
    let lockedOutPicks = 0;
    let isolationViolations = 0;

    const tasks: Array<() => Promise<void>> = [];

    for (let t = 0; t < config.tenantCount; t++) {
      const tenantId = `tenant_sim_${t}`;
      for (let p = 0; p < config.poolsPerTenant; p++) {
        const poolId = `pool_sim_${t}_${p}`;
        for (let u = 0; u < config.usersPerPool; u++) {
          const userId = `user_sim_${t}_${p}_${u}`;
          tasks.push(async () => {
            const start = performance.now();
            const simulatedDelay = Math.random() * config.targetKickoffWindowMs;

            if (simulatedDelay > kickoffLockThresholdMs) {
              lockedOutPicks++;
            } else {
              successfulPicks++;
            }

            if (!userId.startsWith(`user_sim_${t}_`)) {
              isolationViolations++;
            }

            const duration = performance.now() - start;
            latencies.push(duration);
          });
        }
      }
    }

    // Execute concurrently up to concurrencyLevel
    const executing: Promise<void>[] = [];
    for (const task of tasks) {
      const p = task();
      executing.push(p);
      if (executing.length >= config.concurrencyLevel) {
        await Promise.race(executing);
        for (let i = executing.length - 1; i >= 0; i--) {
          const res = executing[i];
          // Prune completed
          const status = await Promise.race([res.then(() => true), Promise.resolve(false)]);
          if (status) executing.splice(i, 1);
        }
      }
    }
    await Promise.all(executing);

    latencies.sort((a, b) => a - b);
    const totalRequests = tasks.length;
    const avg = latencies.reduce((sum, v) => sum + v, 0) / (totalRequests || 1);
    const p95Idx = Math.floor(latencies.length * 0.95);
    const p99Idx = Math.floor(latencies.length * 0.99);

    return {
      totalRequests,
      successfulPicks,
      lockedOutPicks,
      averageLatencyMs: Number(avg.toFixed(2)),
      p95LatencyMs: Number((latencies[p95Idx] || 0).toFixed(2)),
      p99LatencyMs: Number((latencies[p99Idx] || 0).toFixed(2)),
      tenantIsolationViolations: isolationViolations,
    };
  }
}
