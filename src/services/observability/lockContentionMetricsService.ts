import { featureFlags, FeatureFlagKey } from '../../config/featureFlags';

export interface LockAttemptEvent {
  tenantId: string;
  poolId: string;
  gameId: string;
  userId: string;
  acquired: boolean;
  contentionDelayMs: number;
  reason?: 'LOCK_ACQUIRED' | 'POST_KICKOFF_REJECTED' | 'CONCURRENCY_TIMEOUT';
}

export interface LockContentionSnapshot {
  tenantId: string;
  poolId: string;
  totalAttempts: number;
  acquiredCount: number;
  rejectedCount: number;
  contentionRatio: number;
  averageContentionDelayMs: number;
  p95ContentionDelayMs: number;
}

export class LockContentionMetricsService {
  private static events: LockAttemptEvent[] = [];
  private static readonly MAX_EVENT_CAPACITY = 2000;

  public static isCircuitBreakerActive(): boolean {
    return featureFlags[FeatureFlagKey.PRD_PHASE_24_OBSERVABILITY] === true;
  }

  public static recordLockAttempt(event: LockAttemptEvent): boolean {
    if (!this.isCircuitBreakerActive()) {
      return false; // Drop telemetry when disabled (Decision #62)
    }

    if (this.events.length >= this.MAX_EVENT_CAPACITY) {
      this.events.shift();
    }

    this.events.push({
      ...event,
      tenantId: event.tenantId.trim().toLowerCase(),
      poolId: event.poolId.trim().toLowerCase(),
    });
    return true;
  }

  public static getPoolContentionMetrics(tenantId: string, poolId: string): LockContentionSnapshot {
    const safeTenant = tenantId.trim().toLowerCase();
    const safePool = poolId.trim().toLowerCase();

    if (!this.isCircuitBreakerActive()) {
      return {
        tenantId: safeTenant,
        poolId: safePool,
        totalAttempts: 0,
        acquiredCount: 0,
        rejectedCount: 0,
        contentionRatio: 0,
        averageContentionDelayMs: 0,
        p95ContentionDelayMs: 0,
      };
    }

    const poolEvents = this.events.filter(
      (e) => e.tenantId === safeTenant && e.poolId === safePool
    );

    const total = poolEvents.length;
    if (total === 0) {
      return {
        tenantId: safeTenant,
        poolId: safePool,
        totalAttempts: 0,
        acquiredCount: 0,
        rejectedCount: 0,
        contentionRatio: 0,
        averageContentionDelayMs: 0,
        p95ContentionDelayMs: 0,
      };
    }

    const acquired = poolEvents.filter((e) => e.acquired).length;
    const rejected = total - acquired;
    const delays = poolEvents.map((e) => e.contentionDelayMs).sort((a, b) => a - b);
    const avg = delays.reduce((sum, v) => sum + v, 0) / total;
    const p95Idx = Math.floor(total * 0.95);

    return {
      tenantId: safeTenant,
      poolId: safePool,
      totalAttempts: total,
      acquiredCount: acquired,
      rejectedCount: rejected,
      contentionRatio: Number((rejected / total).toFixed(4)),
      averageContentionDelayMs: Number(avg.toFixed(2)),
      p95ContentionDelayMs: Number((delays[p95Idx] || 0).toFixed(2)),
    };
  }

  public static clear(): void {
    this.events = [];
  }
}
