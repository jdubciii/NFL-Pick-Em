import { featureFlags, FeatureFlagKey } from '../../config/featureFlags';
import { OperationalHealthService, PoolOperationalHealthSnapshot } from './operationalHealthService';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface OperationalAlert {
  id: string;
  tenantId: string;
  poolId: string;
  code: 'HIGH_CONTENTION' | 'CIRCUIT_OPEN' | 'POOL_DEGRADED';
  severity: AlertSeverity;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export class SyntheticAlertingService {
  public static isCircuitBreakerActive(): boolean {
    return featureFlags[FeatureFlagKey.PRD_PHASE_24_OBSERVABILITY] === true;
  }

  public static evaluatePoolAlerts(tenantId: string, poolId: string): OperationalAlert[] {
    const safeTenant = tenantId.trim().toLowerCase();
    const safePool = poolId.trim().toLowerCase();

    if (!this.isCircuitBreakerActive()) {
      return []; // Fail-closed: zero active alerts when observability is disabled (Decision #62)
    }

    const health: PoolOperationalHealthSnapshot = OperationalHealthService.getPoolHealth(safeTenant, safePool);
    const alerts: OperationalAlert[] = [];
    const timestamp = new Date().toISOString();

    if (health.status === 'CIRCUIT_OPEN') {
      alerts.push({
        id: `alert_${Date.now()}_open`,
        tenantId: safeTenant,
        poolId: safePool,
        code: 'CIRCUIT_OPEN',
        severity: 'CRITICAL',
        message: 'Circuit breaker has tripped into open state for this pool.',
        timestamp,
        metadata: { recentTripEventsCount: health.recentTripEventsCount },
      });
    }

    if (health.contention.contentionRatio > 0.5) {
      alerts.push({
        id: `alert_${Date.now()}_contention`,
        tenantId: safeTenant,
        poolId: safePool,
        code: 'HIGH_CONTENTION',
        severity: 'WARNING',
        message: `High lock contention detected: ratio is ${(health.contention.contentionRatio * 100).toFixed(1)}%.`,
        timestamp,
        metadata: {
          contentionRatio: health.contention.contentionRatio,
          p95DelayMs: health.contention.p95ContentionDelayMs,
        },
      });
    }

    if (health.status === 'DEGRADED') {
      alerts.push({
        id: `alert_${Date.now()}_degraded`,
        tenantId: safeTenant,
        poolId: safePool,
        code: 'POOL_DEGRADED',
        severity: 'WARNING',
        message: 'Operational health degraded under contention or upstream delay.',
        timestamp,
      });
    }

    return alerts;
  }
}
