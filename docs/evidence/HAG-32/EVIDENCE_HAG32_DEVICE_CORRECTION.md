# HAG-32 Evidence Dossier: Device Correction & Readiness Scope Remediation (R1 Remediation)

**Contract ID**: `P42-DEVICE-READINESS-SCOPE-2026-10-24-01`
**Work Item**: `HAG-32-WEEKLYPICKS-R1` (Resolves `HAG-32 narrow R1 correction: WeeklyPicks settings fail-open`)
**Directive**: `god` message `2026-10-24T22-49-22-650Z-348b2d`
**Review Finding**: `architect-mveovi5k/HAG32-59c558e-ruling.md` (`P42-DEVICE-READINESS-ACCEPTANCE-2026-10-24-02`)
**Starting Base SHA**: `59c558e5e629b7efdaf450574da894415b89aa60`
**Execution Timestamp**: 2026-10-24T23:10:00Z
**Branch**: `feat/p37-shell-auth-openslate`
**Parity Anchor (Decision #61)**: `750A519DF9E42FEBEEA802724077867F14CB2CB514F6117DDADF815C572C6E68` (9,011 bytes)

---

## 1. Executive Summary & Remediation Scope

This dossier certifies the complete remediation of **R1 (WeeklyPicks settings fail-open)** identified in `architect-mveovi5k/HAG32-59c558e-ruling.md` and dispatched by `god`:

1. **WeeklyPicks Settings Readiness & Fail-Closed Gating**:
   - In `client/src/components/WeeklyPicks.tsx`, eliminated `DEFAULT_POOL` offset 0 default before settings load.
   - Decoupled pool settings loading from `fetchGames` into a dedicated `useEffect` with explicit request generation ownership (`settingsGenRef`) bound to `activePoolId` (`status: 'LOADING' | 'READY' | 'ERROR'`, `offset: number`). Stale in-flight settings queries cannot overwrite newer pool settings state.
   - Gated lock claims, pick entry, and preset interactions strictly on verified settings readiness (`isSettingsReady`). Pending, failed, missing, or malformed settings fail closed:
     - Header `scope`: renders `'SYNCING...'` during sync.
     - Header `phase`: renders `'SYNCING'` during sync, `'Status unavailable'` on error.
     - Header badge `lockBadgeText`: renders `'SYNCING'` while pending, `'UNAVAILABLE'` on error; `isBadgeOpen` is strictly `false`.
     - `isGameLocked`: returns `true` (locked / entry denied) when `!isSettingsReady`.
     - `handlePick`: denies entry with clear feedback (`"Pool settings unavailable. Picks locked."`) when `!isSettingsReady`.
     - Bulk preset/clear actions deny execution when `!isSettingsReady`.
   - Pass validated offsets without truthiness masking (`NaN || 0`). A non-finite or negative offset triggers `status: 'ERROR'`, never coercing to 0.
   - A successfully loaded settings object with absent `lock_offset` retains the documented server default `0` with `status: 'READY'`.
   - Switching weeks preserves settings error state until a successful retry.
   - Added visible `[ RETRY TELEMETRY INTAKE ]` action and `[ DATA UNAVAILABLE ]` error presentation across both empty and populated slate views.

2. **Authoritative Designation Enum Alignment (Retained Accepted)**:
   - In `WallOfShamePage.tsx`, aligned `KNOWN_TB_STATUSES` with producer contract exported by `weeklyDesignationService.ts`: `['DEFAULT_LIONS', 'COMMISSIONER_OVERRIDE', 'COMMISSIONER_SELECTION_REQUIRED', 'UNRESOLVED', 'UNAVAILABLE']`. Removed invented legacy values `'DEFAULT'` and `'OVERRIDDEN'`.
   - `COMMISSIONER_SELECTION_REQUIRED` fails closed immediately to `INCOMPLETE_TELEMETRY` with `"Commissioner selection is required for this week tiebreaker."`.

3. **Matrix Settings Readiness & Snapshot Decoupling (Retained Accepted)**:
   - In `MatrixPage.tsx`, settings readiness is owned by dedicated `settingsState` keyed to `activePoolId`. Slate reload does not clear settings errors. `isSyncing` gates open counts/deadlines during settings load.

4. **Required Focused Mounted Tests in `tests/phase42_device_readiness_scope.test.ts`**:
   - **Case 1 (Delayed Nonzero Offset)**: Mounts actual `WeeklyPicks` with game 45 min away and delayed pool settings (`lock_offset: 60`). Asserts that during settings delay, badge shows `SYNCING`, not offset 0 open counts; after offset 60 resolves, game evaluates as locked (`ALL GAMES LOCKED`), never publishing false open claims.
   - **Case 2 (Failed Settings)**: Mounts `WeeklyPicks` with pool query error. Asserts fail-closed to `UNAVAILABLE`, `[ DATA UNAVAILABLE ]`, entry denied, retry button present.
   - **Case 3 (Missing Settings)**: Mounts `WeeklyPicks` with missing/null settings. Asserts fail closed to `UNAVAILABLE`, `[ DATA UNAVAILABLE ]`, entry denied.
   - **Case 4 (Malformed Offset)**: Mounts `WeeklyPicks` with `lock_offset: 'invalid'` and `lock_offset: -15`. Asserts fail closed to `UNAVAILABLE`, offset not masked to 0 via `NaN || 0`.
   - **Case 5 (Successful Retry Interaction)**: Mounts `WeeklyPicks` with initial error, reconfigures mock to valid settings, clicks `[ RETRY TELEMETRY INTAKE ]`, and proves error clears and badge recovers to `PICKS OPEN: 1`.
   - **Case 6 (Exact Effective Deadline & Zero Default)**: Verifies exact canonical lock boundary calculation (`T - M` minutes), server zero default on absent offset, and unvalidated `NaN` fail-closed rejection.

---

## 2. File Modification Registry

| File Path | Role & Remediation |
| :--- | :--- |
| `client/src/components/WeeklyPicks.tsx` | Dedicated pool settings state with request generation ownership. Gated lock claims, pick entry, and presets on `isSettingsReady`. Fail-closed gating on pending, failed, missing, and malformed settings. Removed `NaN || 0` truthiness masking. Server zero default on absent offset. Added `[ RETRY TELEMETRY INTAKE ]` and `[ DATA UNAVAILABLE ]` error presentations. |
| `tests/phase42_device_readiness_scope.test.ts` | Added `P42 R1: WeeklyPicks Settings Readiness, Lock Gating & Retry Contract` suite covering delayed nonzero offset, failed settings, missing settings, malformed offset, successful retry interaction, and exact effective deadline. Added `localStorage` mock and `getBoundingClientRect` / `getComputedStyle` mock DOM support. |
| `docs/evidence/HAG-32/` | Raw verbatim test, build, diff check, and mirror parity logs (01-06) with zero trailing whitespace. |

---

## 3. Test & Verification Matrix

### 3.1 Focused Phase 42 Test Suite (`tests/phase42_device_readiness_scope.test.ts`)
- **Total Tests**: 59
- **Passed**: 59
- **Failed**: 0
- **Execution Command**: `npx vitest run tests/phase42_device_readiness_scope.test.ts --pool=threads`
- **Execution Duration**: 3.45s
- **Evidence Log**: `docs/evidence/HAG-32/01_focused_tests.log`

### 3.2 Authoritative Regression Test Suites
- `tests/sweatProjectionService.test.ts`: 5/5 PASSED
- `tests/phase41_runtime_mock_purge.test.ts`: 12/12 PASSED
- `tests/phase41_picks_tiebreaker_settlement.test.ts`: 16/16 PASSED
- `tests/phase41_pick_validation.test.ts`: 10/10 PASSED
- `tests/phase41_week7_tiebreaker.test.ts`: 82/82 PASSED
- **Total Broader Tests**: 125/125 PASSED in 10.89s
- **Combined Test Count Across All Suites**: 184 / 184 PASSED
- **Evidence Log**: `docs/evidence/HAG-32/02_broader_tests.log`

### 3.3 TypeScript & Production Build Verifications
- `npx tsc --noEmit`: Exit code 0 (0 errors). Evidence log: `docs/evidence/HAG-32/03_typecheck.log`.
- `npm --prefix client run build`: Exit code 0 (`✓ built in 2.09s`, 2,394 modules transformed). Evidence log: `docs/evidence/HAG-32/04_client_build.log`.
- `git diff --check`: Exit code 0 (0 trailing whitespace or formatting defects).
- `git diff --check 790cfc84b1c044fd8db8174b2593bf12269dc804..HEAD`: Exit code 0 (0 errors).
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
- Strictly local implementation on `feat/p37-shell-auth-openslate`.
- Zero remote git push to origin.
- Zero Render deployment trigger.
- Zero APK assembly, compilation, or distribution.
- Zero production database mutations, DDL, or data modifications.
- Zero changes to historical ranking rules, Week 6 exclusion, or scoring algorithms.
