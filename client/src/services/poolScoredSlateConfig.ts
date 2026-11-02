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
 * - Real Week 8 nine IDs remain absent until authoritative accepted identity
 *   evidence is confirmed, safely yielding Provisional in production.
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
 * Real Week 8 entry remains absent until authoritative commissioner-selected
 * or recorded accepted slate identity evidence is verified, ensuring production
 * safely fails closed to Provisional.
 */
const CHECKED_IN_SCOPED_SLATES: Record<string, ScopedPoolSlateEntry> = {
  // Real Week 8 entry intentionally absent per HAG52-SLATE-2026-11-02-01.
};

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

let testScopedSlatesOverride: Record<string, ScopedPoolSlateEntry> | null = null;

/**
 * Injects synthetic fixtures for regression testing without mutating production registry.
 */
export function setTestScopedSlatesOverride(overrides: Record<string, ScopedPoolSlateEntry> | null): void {
  testScopedSlatesOverride = overrides;
}

export function clearTestScopedSlatesOverride(): void {
  testScopedSlatesOverride = null;
}

/**
 * Resolves the explicit scoped pool slate configuration for a given scope.
 * Validates that entry fields strictly match the requested scope and its key.
 * Returns null if no explicit configuration entry exists or if integrity validation fails.
 */
export function getScopedPoolSlateConfig(scope?: ScopedPoolSlateKey | null): ScopedPoolSlateEntry | null {
  if (!scope) return null;
  const key = formatScopeKey(scope);
  if (!key) return null;

  const entry =
    testScopedSlatesOverride && key in testScopedSlatesOverride
      ? testScopedSlatesOverride[key]
      : CHECKED_IN_SCOPED_SLATES[key] || null;

  if (!entry) return null;

  // Strict field validation: verify entry fields match requested scope and formatted key
  if (
    entry.poolId !== scope.poolId ||
    entry.season !== scope.season ||
    entry.seasonType !== scope.seasonType ||
    entry.weekNumber !== scope.weekNumber ||
    formatScopeKey(entry) !== key
  ) {
    return null;
  }

  return entry;
}
