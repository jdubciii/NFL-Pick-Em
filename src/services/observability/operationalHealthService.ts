import { featureFlags, FeatureFlagKey } from '../../config/featureFlags';
import { LockContentionMetricsService, LockContentionSnapshot } from './lockContentionMetricsService';
import { AuditTripLoggerService, AuditTripEvent } from './auditTripLoggerService';

export interface PoolOperationalHealthSnapshot {
  tenantId: string;
  poolId: string;
  status: 'HEALTHY' | 'DEGRADED' | 'CIRCUIT_OPEN' | 'OBSERVABILITY_OFFLINE';
  timestamp: string;
  contention: LockContentionSnapshot;
  recentTripEventsCount: number;
  circuitBreakerActive: boolean;
}

export class OperationalHealthService {
  public static isCircuitBreakerActive(): boolean {
    return featureFlags[FeatureFlagKey.PRD_PHASE_24_OBSERVABILITY] === true;
  }

  public static getPoolHealth(tenantId: string, poolId: string): PoolOperationalHealthSnapshot {
    const safeTenant = tenantId.trim().toLowerCase();
    const safePool = poolId.trim().toLowerCase();
    const timestamp = new Date().toISOString();

    if (!this.isCircuitBreakerActive()) {
      return {
        tenantId: safeTenant,
        poolId: safePool,
        status: 'OBSERVABILITY_OFFLINE',
        timestamp,
        contention: {
          tenantId: safeTenant,
          poolId: safePool,
          totalAttempts: 0,
          acquiredCount: 0,
          rejectedCount: 0,
          contentionRatio: 0,
          averageContentionDelayMs: 0,
          p95ContentionDelayMs: 0,
        },
        recentTripEventsCount: 0,
        circuitBreakerActive: false,
      };
    }

    const contention = LockContentionMetricsService.getPoolContentionMetrics(safeTenant, safePool);
    const auditEvents = AuditTripLoggerService.getPoolAuditTrail(safeTenant, safePool);

    let status: 'HEALTHY' | 'DEGRADED' | 'CIRCUIT_OPEN' = 'HEALTHY';
    if (contention.contentionRatio > 0.5) {
      status = 'DEGRADED';
    }
    const hasActiveTrip = auditEvents.some((e) => e.eventType === 'CIRCUIT_BREAKER_TRIP');
    if (hasActiveTrip) {
      status = 'CIRCUIT_OPEN';
    }

    return {
      tenantId: safeTenant,
      poolId: safePool,
      status,
      timestamp,
      contention,
      recentTripEventsCount: auditEvents.length,
      circuitBreakerActive: true,
    };
  }
}
