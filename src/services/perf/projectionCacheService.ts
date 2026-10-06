import { featureFlags, FeatureFlagKey } from '../../config/featureFlags';

export interface CacheConfig {
  ttlSeconds: number;
  maxEntries: number;
}

export interface PerfMetricsSnapshot {
  timestamp: string;
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  p95LatencyMs: number;
}

export class ProjectionCacheService {
  private static cache: Map<string, { value: unknown; expiresAt: number }> = new Map();
  private static hits = 0;
  private static misses = 0;

  public static isCircuitBreakerActive(): boolean {
    return featureFlags[FeatureFlagKey.PRD_PHASE_23_PERF_HARDENING] === true;
  }

  public static get<T>(key: string): T | null {
    if (!this.isCircuitBreakerActive()) return null;
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    return entry.value as T;
  }

  public static set<T>(key: string, value: T, ttlSeconds: number = 30): void {
    if (!this.isCircuitBreakerActive()) return;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  public static getMetrics(): PerfMetricsSnapshot {
    return {
      timestamp: new Date().toISOString(),
      totalRequests: this.hits + this.misses,
      cacheHits: this.hits,
      cacheMisses: this.misses,
      p95LatencyMs: 0,
    };
  }

  public static clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}
