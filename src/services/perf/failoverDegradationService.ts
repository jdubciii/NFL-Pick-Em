import { featureFlags, FeatureFlagKey } from '../../config/featureFlags';
import { ProjectionCacheService } from './projectionCacheService';

export interface DegradationStatus {
  isDegraded: boolean;
  consecutiveFailures: number;
  lastFailureTimestamp?: string;
  servedFromFallback: boolean;
}

export class FailoverDegradationService {
  private static failureCounts: Map<string, number> = new Map();
  private static readonly FAILURE_THRESHOLD = 3;

  public static isCircuitBreakerActive(): boolean {
    return featureFlags[FeatureFlagKey.PRD_PHASE_23_PERF_HARDENING] === true;
  }

  public static async executeWithDegradation<T>(
    tenantId: string,
    poolId: string,
    operationName: string,
    primaryFn: () => Promise<T>,
    fallbackFn: () => Promise<T> | T
  ): Promise<{ data: T; status: DegradationStatus }> {
    const key = `${tenantId.trim().toLowerCase()}:${poolId.trim().toLowerCase()}:${operationName}`;

    // Fail-closed verification (Decision #62): If flag is OFF, execute primary directly
    if (!this.isCircuitBreakerActive()) {
      const data = await primaryFn();
      return {
        data,
        status: {
          isDegraded: false,
          consecutiveFailures: 0,
          servedFromFallback: false,
        },
      };
    }

    const currentFailures = this.failureCounts.get(key) || 0;

    // Fast-path degraded mode if downstream is actively tripping threshold
    if (currentFailures >= this.FAILURE_THRESHOLD) {
      const fallbackData = await fallbackFn();
      return {
        data: fallbackData,
        status: {
          isDegraded: true,
          consecutiveFailures: currentFailures,
          lastFailureTimestamp: new Date().toISOString(),
          servedFromFallback: true,
        },
      };
    }

    try {
      const result = await primaryFn();
      this.failureCounts.set(key, 0); // Reset on healthy primary response
      return {
        data: result,
        status: {
          isDegraded: false,
          consecutiveFailures: 0,
          servedFromFallback: false,
        },
      };
    } catch {
      const updatedFailures = currentFailures + 1;
      this.failureCounts.set(key, updatedFailures);
      const fallbackData = await fallbackFn();
      return {
        data: fallbackData,
        status: {
          isDegraded: updatedFailures >= this.FAILURE_THRESHOLD,
          consecutiveFailures: updatedFailures,
          lastFailureTimestamp: new Date().toISOString(),
          servedFromFallback: true,
        },
      };
    }
  }

  public static resetHealth(tenantId: string, poolId: string, operationName: string): void {
    const key = `${tenantId.trim().toLowerCase()}:${poolId.trim().toLowerCase()}:${operationName}`;
    this.failureCounts.delete(key);
  }

  public static clearAll(): void {
    this.failureCounts.clear();
  }
}
