/**
 * Pool Scored Slate Configuration Adapter (HAG-52 / HAG52-SLATE-2026-11-02-01)
 *
 * Scopes the pool's scored slate to an explicit, immutable event-ID set
 * validated against the accepted NFL manifest.
 *
 * Governed strictly by Architect Ruling HAG52-SLATE-2026-11-02-01:
 * - Authority: The accepted NFL manifest establishes eligible event identity;
 *   it does not establish pool selection.
 * - The scored slate must be an explicit, immutable event-ID set scoped by
 *   exact pool ID, season, season type, and week number.
 * - Does NOT dynamically derive the scored slate from picks, final scores,
 *   kickoff day, or the full NFL manifest.
 * - For Week 8, it must contain exactly nine distinct canonical ESPN event IDs.
 * - Real Week 8 nine IDs confirmed by commissioner Jack (CAR@GB, ARI@DAL, ATL@TB,
 *   BAL@BUF, CLE@PIT, IND@JAX, LV@NYJ, MIN@DET, TEN@CIN) and populated in checked-in configuration.
 * - Future weeks/pools do not inherit the nine-game exception; preserve existing behavior.
 */

export const TARGET_AFFECTED_POOL_ID = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';
export const TARGET_AFFECTED_SEASON = 2026;
export const TARGET_AFFECTED_SEASON_TYPE = 2;
export const TARGET_AFFECTED_WEEK_NUMBER = 8;

export interface ScopedPoolSlateKey {
  poolId?: string | null;
  season?: number | null;
  seasonType?: number | null;
  weekNumber?: number | null;
  poolSettings?: any;
  projection?: any;
}

export interface ScopedPoolSlateEntry {
  poolId: string;
  season: number;
  seasonType: number;
  weekNumber: number;
  version: number;
  scoredEventIds: readonly string[];
  description?: string;
}

export function isTargetAffectedSlateScope(scope?: ScopedPoolSlateKey | null): boolean {
  if (!scope) return false;
  return (
    scope.poolId === TARGET_AFFECTED_POOL_ID &&
    scope.season === TARGET_AFFECTED_SEASON &&
    scope.seasonType === TARGET_AFFECTED_SEASON_TYPE &&
    scope.weekNumber === TARGET_AFFECTED_WEEK_NUMBER
  );
}

/**
 * Checked-in repository of explicit pool-scored slate configurations.
 * Scoped by `${poolId}:${season}:${seasonType}:${weekNumber}`.
 * Week 8 entry confirmed by commissioner Jack (HAG-52) and frozen at runtime.
 */
export const CHECKED_IN_SCOPED_SLATES: Record<string, ScopedPoolSlateEntry> = Object.freeze({
  '9b893bef-3b5a-4ffa-951d-8ba27f9c9782:2026:2:8': Object.freeze({
    poolId: TARGET_AFFECTED_POOL_ID,
    season: TARGET_AFFECTED_SEASON,
    seasonType: TARGET_AFFECTED_SEASON_TYPE,
    weekNumber: TARGET_AFFECTED_WEEK_NUMBER,
    version: 1,
    scoredEventIds: Object.freeze([
      '401873023', // CAR @ GB
      '401873024', // ARI @ DAL (DAL -7.5)
      '401873025', // ATL @ TB
      '401873026', // BAL @ BUF
      '401873027', // CLE @ PIT
      '401873028', // IND @ JAX (JAX -10.5)
      '401873029', // LV @ NYJ
      '401873030', // MIN @ DET (Tiebreaker, Total 34)
      '401873031', // TEN @ CIN (CIN -10.5)
    ]),
    description: 'Week 8 commissioner-confirmed 9-game pool slate (HAG-52)',
  }),
});

export function formatScopeKey(scope: ScopedPoolSlateKey): string | null {
  if (
    !scope.poolId ||
    typeof scope.poolId !== 'string' ||
    scope.season == null ||
    typeof scope.season !== 'number' ||
    !Number.isInteger(scope.season) ||
    scope.seasonType == null ||
    typeof scope.seasonType !== 'number' ||
    !Number.isInteger(scope.seasonType) ||
    scope.weekNumber == null ||
    typeof scope.weekNumber !== 'number' ||
    !Number.isInteger(scope.weekNumber)
  ) {
    return null;
  }
  return `${scope.poolId}:${scope.season}:${scope.seasonType}:${scope.weekNumber}`;
}

let testScopedSlatesOverride: Record<string, ScopedPoolSlateEntry | null> | null = null;
const DYNAMIC_SCOPED_SLATES: Map<string, ScopedPoolSlateEntry> = new Map();

/**
 * Registers a dynamic scoped slate in memory (e.g. from pool settings or tests).
 */
export function registerDynamicPoolSlate(entry: ScopedPoolSlateEntry): void {
  const key = formatScopeKey(entry);
  if (key) {
    DYNAMIC_SCOPED_SLATES.set(
      key,
      Object.freeze({
        ...entry,
        scoredEventIds: Object.freeze([...entry.scoredEventIds]),
      })
    );
  }
}

export function clearDynamicPoolSlates(): void {
  DYNAMIC_SCOPED_SLATES.clear();
}

/**
 * Injects synthetic fixtures for regression testing without mutating production registry.
 */
export function setTestScopedSlatesOverride(overrides: Record<string, ScopedPoolSlateEntry | null> | null): void {
  testScopedSlatesOverride = overrides;
}

export function clearTestScopedSlatesOverride(): void {
  testScopedSlatesOverride = null;
}

export type ScopedPoolSlateStatus = 'VALID_CONFIG' | 'VERIFIED_NO_CUSTOM_CONFIG' | 'UNAVAILABLE';

export interface ScopedPoolSlateResolutionResult {
  status: ScopedPoolSlateStatus;
  entry?: ScopedPoolSlateEntry;
  defaultPolicy?: 'FULL_MANIFEST';
  reason?: string;
  revision?: string;
}

/**
 * Resolves the explicit scoped pool slate configuration with distinct results:
 * - VALID_CONFIG: Explicit verified custom slate configuration entry exists and is valid
 * - VERIFIED_NO_CUSTOM_CONFIG: Scope is verified to have NO custom slate; established default policy applies (FULL_MANIFEST)
 * - UNAVAILABLE: Scope cannot be verified, or configuration is malformed/corrupted. Fails closed!
 *
 * Governed strictly by HAG58-SLATE-2026-11-03-01:
 * Failed settings reads suppress authoritative scores/finality and show unavailable;
 * NEVER default to all NFL games on malformed or absent unverified reads!
 */
export function resolveScopedPoolSlateConfig(scope?: ScopedPoolSlateKey | null): ScopedPoolSlateResolutionResult {
  if (!scope) {
    return {
      status: 'VERIFIED_NO_CUSTOM_CONFIG',
      defaultPolicy: 'FULL_MANIFEST',
    };
  }

  const key = formatScopeKey(scope);
  if (!key) {
    return {
      status: 'UNAVAILABLE',
      reason: 'INVALID_SCOPE_KEY',
    };
  }

  // 1. Injected synthetic test override
  if (testScopedSlatesOverride && key in testScopedSlatesOverride) {
    const entry = testScopedSlatesOverride[key];
    if (!entry) {
      return { status: 'UNAVAILABLE', reason: 'TEST_OVERRIDE_NULL' };
    }
    if (
      entry.poolId !== scope.poolId ||
      entry.season !== scope.season ||
      entry.seasonType !== scope.seasonType ||
      entry.weekNumber !== scope.weekNumber ||
      formatScopeKey(entry) !== key
    ) {
      return { status: 'UNAVAILABLE', reason: 'TEST_OVERRIDE_MISMATCH' };
    }
    return { status: 'VALID_CONFIG', entry };
  }

  // 2. Unshadowable checked-in repository (Week 8 HAG-52) ALWAYS outranks dynamic or settings! (Section 42 & 54)
  if (isTargetAffectedSlateScope(scope)) {
    const entry = CHECKED_IN_SCOPED_SLATES[key] || null;
    if (entry) {
      if (
        entry.poolId !== scope.poolId ||
        entry.season !== scope.season ||
        entry.seasonType !== scope.seasonType ||
        entry.weekNumber !== scope.weekNumber ||
        formatScopeKey(entry) !== key
      ) {
        return { status: 'UNAVAILABLE', reason: 'CHECKED_IN_SCOPE_MISMATCH' };
      }
      return { status: 'VALID_CONFIG', entry };
    }
    return { status: 'UNAVAILABLE', reason: 'CHECKED_IN_SCOPE_MISSING' };
  }

  // 3. Direct projection in scope (from fetchScopedSlateProjection, Section 52 & 54)
  if (scope.projection !== undefined) {
    if (!scope.projection) {
      return { status: 'UNAVAILABLE', reason: 'PROJECTION_NULL' };
    }
    if (scope.projection.status === 'LOADING') {
      return { status: 'UNAVAILABLE', reason: 'PROJECTION_LOADING' };
    }
    if (scope.projection.status === 'UNAVAILABLE') {
      return { status: 'UNAVAILABLE', reason: scope.projection.error || 'PROJECTION_UNAVAILABLE' };
    }
    if (scope.projection.status === 'VERIFIED_NO_CUSTOM_CONFIG') {
      return { status: 'VERIFIED_NO_CUSTOM_CONFIG', defaultPolicy: 'FULL_MANIFEST' };
    }
    if (scope.projection.status === 'VALID_CONFIG') {
      const p = scope.projection;
      if (!Array.isArray(p.eventIds) || p.eventIds.length === 0 || p.eventIds.length > 32) {
        return { status: 'UNAVAILABLE', reason: 'PROJECTION_MALFORMED_EVENT_COUNT' };
      }
      const eventIdRegex = /^[a-zA-Z0-9_-]{1,64}$/;
      const seen = new Set<string>();
      for (const eid of p.eventIds) {
        const sEid = String(eid);
        if (!eventIdRegex.test(sEid) || seen.has(sEid)) {
          return { status: 'UNAVAILABLE', reason: 'PROJECTION_MALFORMED_EVENT_ID' };
        }
        seen.add(sEid);
      }
      return {
        status: 'VALID_CONFIG',
        entry: {
          poolId: scope.poolId!,
          season: scope.season!,
          seasonType: scope.seasonType!,
          weekNumber: scope.weekNumber!,
          version: p.version ?? 1,
          scoredEventIds: Object.freeze(p.eventIds.map(String)),
          description: p.description || `Scoped pool slate for ${scope.season} W${scope.weekNumber}`,
        },
        revision: p.revision,
      };
    }
    return { status: 'UNAVAILABLE', reason: 'UNKNOWN_PROJECTION_STATUS' };
  }

  // 4. Injected poolSettings in scope (legacy / tests fallback)
  if (scope.poolSettings !== undefined) {
    if (!scope.poolSettings || typeof scope.poolSettings !== 'object') {
      return { status: 'UNAVAILABLE', reason: 'MALFORMED_POOL_SETTINGS' };
    }
    const configuredSlates = scope.poolSettings?.owner_admin_v1?.slates;
    const customSlate =
      scope.season != null && scope.seasonType != null && scope.weekNumber != null
        ? configuredSlates?.[scope.season]?.[scope.seasonType]?.[scope.weekNumber]
        : undefined;

    if (customSlate !== undefined && customSlate !== null) {
      if (!Array.isArray(customSlate.eventIds) || customSlate.eventIds.length === 0 || customSlate.eventIds.length > 32) {
        return { status: 'UNAVAILABLE', reason: 'MALFORMED_CUSTOM_SLATE_COUNT' };
      }
      const eventIdRegex = /^[a-zA-Z0-9_-]{1,64}$/;
      const distinct = new Set<string>();
      for (const eid of customSlate.eventIds) {
        const sEid = String(eid);
        if (!eventIdRegex.test(sEid) || distinct.has(sEid)) {
          return { status: 'UNAVAILABLE', reason: 'MALFORMED_CUSTOM_SLATE_EVENT_ID' };
        }
        distinct.add(sEid);
      }
      return {
        status: 'VALID_CONFIG',
        entry: {
          poolId: scope.poolId!,
          season: scope.season!,
          seasonType: scope.seasonType!,
          weekNumber: scope.weekNumber!,
          version: customSlate.version ?? 1,
          scoredEventIds: Object.freeze(customSlate.eventIds.map(String)),
          description: `Configured pool slate for ${scope.season} W${scope.weekNumber}`,
        },
      };
    }

    // Explicitly absent custom slate in poolSettings -> verified default policy
    return {
      status: 'VERIFIED_NO_CUSTOM_CONFIG',
      defaultPolicy: 'FULL_MANIFEST',
    };
  }

  // Neither projection nor settings provided in scope:
  // For historical weeks (weeks <= 8) outside the HAG-52 target scope, dynamic custom slates
  // were not supported; established default policy (full manifest) applies.
  // For future-slate eligible weeks (weeks 9-18), missing evidence cannot be assumed absent;
  // unverified scope strictly fails closed to UNAVAILABLE per HAG58-SLATE-2026-11-03-01.
  if (scope.weekNumber != null && scope.weekNumber <= 8 && !isTargetAffectedSlateScope(scope)) {
    return {
      status: 'VERIFIED_NO_CUSTOM_CONFIG',
      defaultPolicy: 'FULL_MANIFEST',
    };
  }

  return {
    status: 'UNAVAILABLE',
    reason: 'UNVERIFIED_SCOPE_EVIDENCE_MISSING',
  };
}

/**
 * Resolves the explicit scoped pool slate configuration entry for a given scope.
 * Delegates to resolveScopedPoolSlateConfig and returns ScopedPoolSlateEntry if VALID_CONFIG, else null.
 */
export function getScopedPoolSlateConfig(scope?: ScopedPoolSlateKey | null): ScopedPoolSlateEntry | null {
  const res = resolveScopedPoolSlateConfig(scope);
  if (res.status === 'VALID_CONFIG' && res.entry) {
    return res.entry;
  }
  return null;
}
