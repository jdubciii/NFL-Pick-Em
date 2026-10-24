# HAG-32 Evidence Dossier: Device Correction & Readiness Scope Remediation (HOLD f41b8d7 Remediation)

**Contract ID**: `P42-DEVICE-READINESS-SCOPE-2026-10-24-01`
**Work Item**: `HAG-32` (Resolves `HAG-30` Device Observations & Remediates `HAG-32 residual HOLD at f41b8d7`)
**Directive**: `god/HAG27-device-correction-directive-20261024.md`
**Review Finding**: `god/HAG32-review-HOLD-f41b8d7.md`
**Starting Base SHA**: `f41b8d704771ec270b3adff02be79611ebde9b5f`
**Execution Timestamp**: 2026-10-24T22:15:00Z
**Branch**: `feat/p37-shell-auth-openslate`
**Parity Anchor (Decision #61)**: `750A519DF9E42FEBEEA802724077867F14CB2CB514F6117DDADF815C572C6E68` (9,011 bytes)

---

## 1. Executive Summary & Remediation Scope

This dossier certifies the complete remediation of all three residual caller/input/ownership gates identified in `god/HAG32-review-HOLD-f41b8d7.md`:

1. **Settings Read Contract**:
   - In `ProfilePage.tsx`, removed unsupported top-level `lock_offset` from actual Supabase selects in both membership query paths (`.select('pool_id, status, pools(id, settings)')`). Reads `settings.lock_offset ?? settings.lockOffset ?? 0`. If `pools.settings` is missing or not an object, immediately propagates as unavailable (`POOL_SETTINGS_UNAVAILABLE`) rather than defaulting to offset 0. Validates `poolLockOffset` is a non-negative finite number, otherwise returning `INVALID_POOL_LOCK_OFFSET`.
   - In `MatrixPage.tsx`, removed unsupported `lock_offset` from `.select('id, settings')`. Reads `settings.lock_offset ?? settings.lockOffset ?? 0`. If the query errors or settings is missing/invalid, sets `setHasLoadError(true)` to fail closed, never silently falling back to offset 0.
   - In `WeeklyPicks.tsx` (line 295), aligned caller precedence with server logic: `lock_offset: Number(poolData.settings?.lock_offset ?? poolData.settings?.lockOffset ?? 0)`.
   - Focused tests strictly inspect query strings and throw `UNSUPPORTED_COLUMN` if `lock_offset` is queried directly on `pools` or joined `pools(...)`.

2. **Fail-Closed Input Shapes**:
   - In `WallOfShamePage.tsx`, rejects `{}` and `[]` tiebreaker responses immediately with `INCOMPLETE_TELEMETRY`.
   - Validates known endpoint statuses (`DEFAULT`, `OVERRIDDEN`, `UNAVAILABLE`, `UNRESOLVED`) and requires `typeof tbJson.tiebreakerOffered === 'boolean'`. Rejects unknown or inconsistent status/offered pairs.
   - If `tbJson.status === 'UNRESOLVED'`, fails closed to `INCOMPLETE_TELEMETRY`. If `tiebreakerOffered === false`, permits only `status === 'UNAVAILABLE'`.
   - When `tiebreakerOffered === true`, validates designated event presence, verifies unique exact member coverage (rejecting duplicate member rows), and enforces that prediction is explicitly `null` or a valid finite numeric value `0 <= p <= 999.99` (rejecting `undefined`, boolean, string, negative, and NaN).
   - In `WallOfShamePage.tsx`, validates complete matrix payload (metadata, valid rows with non-empty IDs/kickoffs, all active member columns, and producer cell shapes with explicit nullable `pick_id` and `selected_team_id`). If structurally incomplete, falls back to `resolveAuthoritativeSlate` and queries picks from the database, failing closed if either fails. Malformed cells cannot manufacture zero-point safe standings.

3. **Refresh & Render Ownership Proof**:
   - In `WallOfShamePage.tsx`, immediately resets `isSettled: false`, `ladderData: []`, `status: 'LOADING'`, `scoreStatus: 'STATUS_UNAVAILABLE'`, and `errorMessage: undefined` at the start of `loadScopedData`, before any asynchronous pool or membership queries, clearing prior settlement headers instantly.
   - Added same-instance retry/refresh tests with controlled delayed membership errors without changing the React `key`, proving that `isSettled` is cleared immediately during loading and that errors are published honestly.
   - In `MatrixPage.tsx`, gates `AppHeader` (scope: `'SYNCING...'`, phase: `'SYNCING'`, badge: `'SYNCING'`), `GAMETRACK` tab (`[ SYNCING SLATE ]`), and `LEVERAGE` tab on `isSyncing = loadingGames || renderedWeek !== selectedWeek`, preventing old slateSummary or games from rendering under a newly selected week.
   - In `ProfilePage.tsx`, introduced `renderedUserId` state; `isScopeMismatch` now checks `(renderedUserId ?? null) !== (user?.id ?? null)`. Clears and denies deadline lock text (`'Unavailable'`) immediately upon identity change or sign-out.

---

## 2. File Modification Registry

| File Path | Role & Remediation |
| :--- | :--- |
| `client/src/components/WeeklyPicks.tsx` | Aligned line 295 settings alias precedence: `lock_offset: Number(poolData.settings?.lock_offset ?? poolData.settings?.lockOffset ?? 0)`. |
| `client/src/pages/MatrixPage.tsx` | Selects `id, settings` (no unsupported `lock_offset`). Propagates read failure to `setHasLoadError(true)`. Entire dependent header/body gated on `isSyncing`. |
| `client/src/pages/ProfilePage.tsx` | Selects `pool_id, status, pools(id, settings)`. Reads `lock_offset ?? lockOffset ?? 0` and fails closed on missing settings or invalid offset. User ownership tracked via `renderedUserId`. |
| `client/src/pages/WallOfShamePage.tsx` | Immediate reset of `isSettled: false` on load/refresh. Strict tiebreaker validation (rejects `{}`, validates known statuses, boolean offered, unique member coverage, explicit numeric predictions). Strict cell shape validation with canonical fallback. |
| `tests/phase42_device_readiness_scope.test.ts` | Query inspection rejects top-level `lock_offset`. Tested settings alias precedence, read failures, empty `{}` TB, duplicate member rows, non-numeric predictions, malformed cells fallback, same-instance refresh, Matrix syncing gate, and Profile identity transition. |
| `docs/evidence/HAG-32/` | Raw verbatim test and build logs (01-06) with zero trailing whitespace. |

---

## 3. Test & Verification Matrix

### 3.1 Focused Phase 42 Test Suite (`tests/phase42_device_readiness_scope.test.ts`)
- **Total Tests**: 46
- **Passed**: 46
- **Failed**: 0
- **Execution Command**: `npx vitest run tests/phase42_device_readiness_scope.test.ts --pool=threads`
- **Execution Duration**: 2.21s
- **Evidence Log**: `docs/evidence/HAG-32/01_focused_tests.log`

### 3.2 Authoritative Regression Test Suites
- `tests/sweatProjectionService.test.ts`: 5/5 PASSED
- `tests/phase41_runtime_mock_purge.test.ts`: 12/12 PASSED
- `tests/phase41_picks_tiebreaker_settlement.test.ts`: 16/16 PASSED
- `tests/phase41_pick_validation.test.ts`: 10/10 PASSED
- `tests/phase41_week7_tiebreaker.test.ts`: 82/82 PASSED
- **Total Broader Tests**: 125/125 PASSED
- **Combined Test Count Across All Suites**: 171 / 171 PASSED
- **Evidence Log**: `docs/evidence/HAG-32/02_broader_tests.log`

### 3.3 TypeScript & Production Build Verifications
- `npx tsc --noEmit`: Exit code 0 (0 errors). Evidence log: `docs/evidence/HAG-32/03_typecheck.log`.
- `npm --prefix client run build`: Exit code 0 (`✓ built in 2.42s`, 2,394 modules transformed). Evidence log: `docs/evidence/HAG-32/04_client_build.log`.
- `git diff --check`: Exit code 0 (0 trailing whitespace or formatting defects).
- `git diff --check 790cfc84b1c044fd8db8174b2593bf12269dc804..HEAD`: Exit code 0.
- **Evidence Log**: `docs/evidence/HAG-32/06_git_diff_check.log`.

### 3.4 Decision #61 Bit-Identical Mirror Parity Verification
```text
Algorithm : SHA256
Hash      : 750A519DF9E42FEBEEA802724077867F14CB2CB514F6117DDADF815C572C6E68
Path      : src/services/tiebreakerRankingService.ts

Algorithm : SHA256
Hash      : 750A519DF9E42FEBEEA802724077867F14CB2CB514F6117DDADF815C572C6E68
Path      : client/src/services/tiebreakerRankingService.ts

File byte lengths:
9011 src/services/tiebreakerRankingService.ts
9011 client/src/services/tiebreakerRankingService.ts
```
Evidence log: `docs/evidence/HAG-32/05_mirror_parity.log`.

---

## 4. Operational Boundaries

In strict compliance with directive instructions:
- Edits are committed strictly to feature branch `feat/p37-shell-auth-openslate`.
- No remote `git push` has been performed.
- No Render webhook or deploy triggers executed.
- No Android APK compilation or signing executed.
- No production database DDL or state mutations executed.
- No claims of live production acceptance or schema deployment made.
