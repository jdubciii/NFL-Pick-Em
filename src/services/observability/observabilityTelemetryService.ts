import { featureFlags, FeatureFlagKey } from '../../config/featureFlags';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface TelemetrySpan {
  traceId: string;
  tenantId: string;
  poolId: string;
  event: string;
  level: LogLevel;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export class ObservabilityTelemetryService {
  private static ringBuffer: TelemetrySpan[] = [];
  private static readonly MAX_BUFFER_SIZE = 100;

  public static isCircuitBreakerActive(): boolean {
    return featureFlags[FeatureFlagKey.PRD_PHASE_24_OBSERVABILITY] === true;
  }

  public static recordSpan(span: Omit<TelemetrySpan, 'timestamp'>): boolean {
    if (!this.isCircuitBreakerActive()) {
      return false; // Fail-closed bypass: drop telemetry in-memory when flag is disabled
    }

    const completedSpan: TelemetrySpan = {
      ...span,
      tenantId: span.tenantId.trim().toLowerCase(),
      poolId: span.poolId.trim().toLowerCase(),
      timestamp: new Date().toISOString(),
    };

    if (this.ringBuffer.length >= this.MAX_BUFFER_SIZE) {
      this.ringBuffer.shift();
    }
    this.ringBuffer.push(completedSpan);
    return true;
  }

  public static getRecentSpans(tenantId: string, poolId: string): TelemetrySpan[] {
    if (!this.isCircuitBreakerActive()) {
      return [];
    }

    const safeTenant = tenantId.trim().toLowerCase();
    const safePool = poolId.trim().toLowerCase();

    return this.ringBuffer.filter(
      (s) => s.tenantId === safeTenant && s.poolId === safePool
    );
  }

  public static clearBuffer(): void {
    this.ringBuffer = [];
  }
}
