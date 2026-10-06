import { featureFlags, FeatureFlagKey } from '../../config/featureFlags';

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tenantId: string;
  poolId: string;
  tag: string;
}

export interface PerfMetricsSnapshot {
  timestamp: string;
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  activeEntries: number;
}

export class ProjectionCacheService {
  private static cache: Map<string, CacheEntry<unknown>> = new Map();
  private static hits = 0;
  private static misses = 0;

  public static isCircuitBreakerActive(): boolean {
    return featureFlags[FeatureFlagKey.PRD_PHASE_23_PERF_HARDENING] === true;
  }

  public static buildKey(tenantId: string, poolId: string, endpoint: string, scopeHash: string = 'default'): string {
    const safeTenant = tenantId.trim().toLowerCase();
    const safePool = poolId.trim().toLowerCase();
    return `projection:${safeTenant}:${safePool}:${endpoint}:${scopeHash}`;
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

  public static set<T>(key: string, value: T, ttlSeconds: number = 30, tenantId: string = 'default', poolId: string = 'default', tag: string = 'default'): void {
    if (!this.isCircuitBreakerActive()) return;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
      tenantId: tenantId.trim().toLowerCase(),
      poolId: poolId.trim().toLowerCase(),
      tag,
    });
  }

  public static async getOrCompute<T>(
    tenantId: string,
    poolId: string,
    endpoint: string,
    computeFn: () => Promise<T> | T,
    ttlSeconds: number = 30,
    scopeHash: string = 'default'
  ): Promise<T> {
    const key = this.buildKey(tenantId, poolId, endpoint, scopeHash);

    if (!this.isCircuitBreakerActive()) {
      return await computeFn();
    }

    const entry = this.cache.get(key);
    const now = Date.now();

    if (entry && now < entry.expiresAt) {
      if (entry.tenantId !== tenantId.trim().toLowerCase()) {
        throw new Error(`CRITICAL: Cache cross-tenant leakage detected! Expected ${tenantId}, found ${entry.tenantId}`);
      }
      this.hits++;
      return entry.value as T;
    }

    this.misses++;
    const computed = await computeFn();

    this.cache.set(key, {
      value: computed,
      expiresAt: now + ttlSeconds * 1000,
      tenantId: tenantId.trim().toLowerCase(),
      poolId: poolId.trim().toLowerCase(),
      tag: endpoint,
    });

    return computed;
  }

  public static invalidatePool(tenantId: string, poolId: string): number {
    const prefix = `projection:${tenantId.trim().toLowerCase()}:${poolId.trim().toLowerCase()}:`;
    let evicted = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        evicted++;
      }
    }
    return evicted;
  }

  public static getMetrics(): PerfMetricsSnapshot {
    return {
      timestamp: new Date().toISOString(),
      totalRequests: this.hits + this.misses,
      cacheHits: this.hits,
      cacheMisses: this.misses,
      activeEntries: this.cache.size,
    };
  }

  public static clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}
