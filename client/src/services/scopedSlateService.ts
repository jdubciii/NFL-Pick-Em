/**
 * Member Scoped Slate Projection Service (HAG58-SLATE-2026-11-03-01)
 *
 * Exposes an ACTIVE-member-guarded, read-only scoped slate projection.
 * Governed strictly by Architect Ruling HAG58-SLATE-2026-11-03-01:
 * - Distinct results: VALID_CONFIG, VERIFIED_NO_CUSTOM_CONFIG, UNAVAILABLE
 * - Historical HAG-52 Week 8 cannot be shadowed by pool settings
 * - In-memory cache keyed by poolId:season:seasonType:weekNumber
 * - Invalidate cache on mutation or pool switch
 * - Failed reads suppress authoritative scores/finality; never default to all NFL games
 */

import { scopedExpressFetch } from '../lib/apiClient';
import { supabase } from '../lib/supabase';
import {
  TARGET_AFFECTED_POOL_ID,
  TARGET_AFFECTED_SEASON,
  TARGET_AFFECTED_SEASON_TYPE,
  TARGET_AFFECTED_WEEK_NUMBER,
  CHECKED_IN_SCOPED_SLATES,
} from './poolScoredSlateConfig';

export interface ScopedSlateProjectionScope {
  poolId: string;
  season: number;
  seasonType: number;
  weekNumber: number;
  revision?: string;
}

export type ScopedSlateResolution =
  | {
      status: 'LOADING';
      scope?: ScopedSlateProjectionScope;
    }
  | {
      status: 'VALID_CONFIG';
      scope: ScopedSlateProjectionScope;
      eventIds: readonly string[];
      version?: number;
      revision?: string;
      isFrozen?: boolean;
      frozenAt?: string | null;
      description?: string;
    }
  | {
      status: 'VERIFIED_NO_CUSTOM_CONFIG';
      scope: ScopedSlateProjectionScope;
      defaultPolicy: 'FULL_MANIFEST';
    }
  | {
      status: 'UNAVAILABLE';
      scope?: ScopedSlateProjectionScope;
      error?: string;
    };

// In-memory projection cache keyed by poolId:season:seasonType:weekNumber:revision
const projectionCache = new Map<string, { resolution: ScopedSlateResolution; cachedAt: number }>();

export function getScopedSlateCacheKey(scope: ScopedSlateProjectionScope, revision?: string): string {
  const rev = revision !== undefined ? revision : (scope.revision || 'latest');
  return `${scope.poolId}:${scope.season}:${scope.seasonType}:${scope.weekNumber}:${rev}`;
}

export function invalidateScopedSlateCache(poolId?: string, scope?: ScopedSlateProjectionScope): void {
  if (!poolId && !scope) {
    projectionCache.clear();
    return;
  }
  if (scope) {
    const scopePrefix = `${scope.poolId}:${scope.season}:${scope.seasonType}:${scope.weekNumber}:`;
    for (const key of projectionCache.keys()) {
      if (key.startsWith(scopePrefix)) {
        projectionCache.delete(key);
      }
    }
    return;
  }
  if (poolId) {
    for (const key of projectionCache.keys()) {
      if (key.startsWith(`${poolId}:`)) {
        projectionCache.delete(key);
      }
    }
  }
}

export async function fetchScopedSlateProjection(
  scope: ScopedSlateProjectionScope,
  authToken?: string | null,
  options?: { fetchFn?: any; apiOrigin?: string }
): Promise<ScopedSlateResolution> {
  // 1. Unshadowable HAG-52 historical configuration check (Section 42 & 54)
  if (
    scope.poolId === TARGET_AFFECTED_POOL_ID &&
    scope.season === TARGET_AFFECTED_SEASON &&
    scope.seasonType === TARGET_AFFECTED_SEASON_TYPE &&
    scope.weekNumber === TARGET_AFFECTED_WEEK_NUMBER
  ) {
    const historicalEntry = CHECKED_IN_SCOPED_SLATES[`${TARGET_AFFECTED_POOL_ID}:${TARGET_AFFECTED_SEASON}:${TARGET_AFFECTED_SEASON_TYPE}:${TARGET_AFFECTED_WEEK_NUMBER}`];
    return {
      status: 'VALID_CONFIG',
      scope,
      eventIds: historicalEntry.scoredEventIds,
      version: historicalEntry.version,
      revision: 'hag52-historical-week8',
      isFrozen: true,
      frozenAt: '2026-11-02T02:49:00.000Z',
      description: historicalEntry.description,
    };
  }

  // 2. Cache lookup
  const cacheKey = getScopedSlateCacheKey(scope);
  const cached = projectionCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < 30000) {
    return cached.resolution;
  }

  try {
    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    } else {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        headers['Authorization'] = `Bearer ${data.session.access_token}`;
      }
    }

    const query = new URLSearchParams({
      season: String(scope.season),
      seasonType: String(scope.seasonType),
      weekNumber: String(scope.weekNumber),
    });

    const fetchFn = options?.fetchFn || scopedExpressFetch;
    const res = await fetchFn(`/api/pools/${scope.poolId}/scoped-slate?${query.toString()}`, {
      method: 'GET',
      headers,
      sessionToken: authToken,
      ...(options?.apiOrigin ? { apiOrigin: options.apiOrigin } : {}),
    });

    if (!res.ok) {
      const unavailable: ScopedSlateResolution = {
        status: 'UNAVAILABLE',
        scope,
        error: `HTTP_${res.status}`,
      };
      return unavailable;
    }

    const data = await res.json();
    if (!data || typeof data !== 'object') {
      return { status: 'UNAVAILABLE', scope, error: 'INVALID_PAYLOAD' };
    }

    if (data.status === 'VALID_CONFIG') {
      if (!Array.isArray(data.eventIds) || data.eventIds.length === 0 || data.eventIds.length > 32) {
        return { status: 'UNAVAILABLE', scope, error: 'MALFORMED_EVENT_IDS' };
      }
      const eventIdRegex = /^[a-zA-Z0-9_-]{1,64}$/;
      const validatedIds: string[] = [];
      const seen = new Set<string>();
      for (const id of data.eventIds) {
        if (typeof id !== 'string' || !eventIdRegex.test(id) || seen.has(id)) {
          return { status: 'UNAVAILABLE', scope, error: 'MALFORMED_EVENT_IDS' };
        }
        seen.add(id);
        validatedIds.push(id);
      }
      const resolution: ScopedSlateResolution = {
        status: 'VALID_CONFIG',
        scope,
        eventIds: Object.freeze(validatedIds),
        version: data.version ?? 1,
        revision: typeof data.revision === 'string' ? data.revision : undefined,
        isFrozen: Boolean(data.isFrozen),
        frozenAt: data.frozenAt || null,
        description: data.description,
      };
      const cacheKeyLatest = getScopedSlateCacheKey(scope, 'latest');
      projectionCache.set(cacheKeyLatest, { resolution, cachedAt: Date.now() });
      if (resolution.revision) {
        const cacheKeyWithRev = getScopedSlateCacheKey(scope, resolution.revision);
        projectionCache.set(cacheKeyWithRev, { resolution, cachedAt: Date.now() });
      }
      return resolution;
    }

    if (data.status === 'VERIFIED_NO_CUSTOM_CONFIG') {
      const resolution: ScopedSlateResolution = {
        status: 'VERIFIED_NO_CUSTOM_CONFIG',
        scope,
        defaultPolicy: 'FULL_MANIFEST',
      };
      const cacheKeyLatest = getScopedSlateCacheKey(scope, 'latest');
      projectionCache.set(cacheKeyLatest, { resolution, cachedAt: Date.now() });
      const cacheKeyWithRev = getScopedSlateCacheKey(scope, 'no-custom');
      projectionCache.set(cacheKeyWithRev, { resolution, cachedAt: Date.now() });
      return resolution;
    }

    return { status: 'UNAVAILABLE', scope, error: data.error || 'UNAVAILABLE' };
  } catch (err: any) {
    return { status: 'UNAVAILABLE', scope, error: err?.message || 'FETCH_FAILED' };
  }
}
