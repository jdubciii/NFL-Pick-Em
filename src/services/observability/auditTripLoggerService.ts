import { featureFlags, FeatureFlagKey } from '../../config/featureFlags';

export type TripEventType =
  | 'CIRCUIT_BREAKER_TRIP'
  | 'CIRCUIT_BREAKER_BYPASS'
  | 'KICKOFF_LOCK_ENFORCEMENT'
  | 'DEAD_PLACE_OVERRIDE_APPLIED'
  | 'FAILOVER_DEGRADATION_TRIGGERED';

export interface AuditTripEvent {
  id: string;
  tenantId: string;
  poolId: string;
  eventType: TripEventType;
  flagKey?: FeatureFlagKey | string;
  triggeredBy: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export class AuditTripLoggerService {
  private static auditRing: AuditTripEvent[] = [];
  private static readonly MAX_AUDIT_CAPACITY = 1000;

  public static isCircuitBreakerActive(): boolean {
    return featureFlags[FeatureFlagKey.PRD_PHASE_24_OBSERVABILITY] === true;
  }

  public static recordTripEvent(
    event: Omit<AuditTripEvent, 'id' | 'timestamp'>
  ): boolean {
    if (!this.isCircuitBreakerActive()) {
      return false; // Fail-closed: drop ingestion when flag is disabled (Decision #62)
    }

    if (this.auditRing.length >= this.MAX_AUDIT_CAPACITY) {
      this.auditRing.shift();
    }

    const completedEvent: AuditTripEvent = {
      ...event,
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      tenantId: event.tenantId.trim().toLowerCase(),
      poolId: event.poolId.trim().toLowerCase(),
      timestamp: new Date().toISOString(),
    };

    this.auditRing.push(completedEvent);
    return true;
  }

  public static getPoolAuditTrail(
    tenantId: string,
    poolId: string,
    filterType?: TripEventType
  ): AuditTripEvent[] {
    if (!this.isCircuitBreakerActive()) {
      return [];
    }

    const safeTenant = tenantId.trim().toLowerCase();
    const safePool = poolId.trim().toLowerCase();

    return this.auditRing.filter((e) => {
      const matchScope = e.tenantId === safeTenant && e.poolId === safePool;
      return filterType ? matchScope && e.eventType === filterType : matchScope;
    });
  }

  public static clear(): void {
    this.auditRing = [];
  }
}
