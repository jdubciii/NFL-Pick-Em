# HAG-32 Evidence Dossier: Device Correction & Readiness Scope Remediation (HOLD 064ce15 Remediation)

**Contract ID**: `P42-DEVICE-READINESS-SCOPE-2026-10-24-01`
**Work Item**: `HAG-32` (Resolves `HAG-30` Device Observations & Remediates `HAG-32 residual HOLD at 064ce15`)
**Directive**: `god/HAG27-device-correction-directive-20261024.md`
**Review Finding**: `god/HAG32-review-HOLD-064ce15.md`
**Starting Base SHA**: `064ce15eb253cc5165ff2e74bd761ede7f35dc5c`
**Execution Timestamp**: 2026-10-24T22:38:00Z
**Branch**: `feat/p37-shell-auth-openslate`
**Parity Anchor (Decision #61)**: `750A519DF9E42FEBEEA802724077867F14CB2CB514F6117DDADF815C572C6E68` (9,011 bytes)

---

## 1. Executive Summary & Remediation Scope

This dossier certifies the complete remediation of both remaining gates identified in `god/HAG32-review-HOLD-064ce15.md`:

1. **Authoritative Designation Enum Alignment**:
   - In `WallOfShamePage.tsx`, aligned `KNOWN_TB_STATUSES` with producer contract exported by `weeklyDesignationService.ts`: `['DEFAULT_LIONS', 'COMMISSIONER_OVERRIDE', 'COMMISSIONER_SELECTION_REQUIRED', 'UNRESOLVED', 'UNAVAILABLE']`. Removed invented legacy values `'DEFAULT'` and `'OVERRIDDEN'`.
   - `DEFAULT_LIONS` and `COMMISSIONER_OVERRIDE` proceed with verified designation and active member readiness.
   - `COMMISSIONER_SELECTION_REQUIRED` is unavailable pending designation, failing closed immediately to `INCOMPLETE_TELEMETRY` with `"Commissioner selection is required for this week tiebreaker."`, even if `tiebreakerOffered: true`.
   - `UNRESOLVED` fails closed to `INCOMPLETE_TELEMETRY` with `"Tiebreaker designation is unresolved for this week."`.
   - `UNAVAILABLE` (when `tiebreakerOffered: false`) proceeds without tiebreaker scoring, evaluating rankings on pick points alone (honoring Decision #61).
   - In `tests/phase42_device_readiness_scope.test.ts`, added contract test importing `DesignationStatus` directly from `src/services/weeklyDesignationService.ts`, preventing client caller and test fixtures from agreeing on fabricated enums.
   - Tested that `COMMISSIONER_OVERRIDE` and `DEFAULT_LIONS` reach differentiated rankings, while `COMMISSIONER_SELECTION_REQUIRED`, `UNRESOLVED`, and legacy `DEFAULT`/`OVERRIDDEN` fail closed.

2. **Matrix Settings Readiness & Snapshot Decoupling**:
   - In `MatrixPage.tsx`, settings readiness is owned by a dedicated `settingsState` object keyed to `activePoolId` (`status: 'LOADING' | 'READY' | 'ERROR'`, `offset: number`).
   - The slate loading effect is completely decoupled from settings state; it sets `slateLoadError` and does NOT reset `settingsState`.
   - `isSyncing` includes `isSettingsLoading = settingsState.status === 'LOADING' || settingsState.poolId !== activePoolId`. While settings are in-flight, `AppHeader` renders `scope: 'SYNCING...'`, `phase: 'SYNCING'`, `badge: 'SYNCING'`, and tab bodies render `[ SYNCING SLATE ]`, never claiming offset 0 or publishing false open counts (`1 PICK OPEN`).
   - If settings fail (`isSettingsError`), `AppHeader` renders `phase: 'STATUS_UNAVAILABLE'` and right badge `'UNAVAILABLE'`. Content renders `[ DATA UNAVAILABLE ]` / `[ LEAGUE DATA COULD NOT BE VERIFIED ]`.
   - Switching weeks does NOT erase the settings error; `settingsState.status === 'ERROR'` persists across week selector changes until a successful retry.
   - Added retry button `[ RETRY TELEMETRY INTAKE ]` triggering `handleRetry` to reload settings and slate.
   - Tested actual mounted `MatrixPage` with slate resolving before delayed settings (verifying no offset 0 open counts), settings failure persistence across week switch, and successful recovery interaction.

3. **Evidence & Retry Interaction Calibration**:
   - Accurately labeled the existing same-instance mount test as: `"WallOfShamePage scope transition (week 6 -> 7) on same mount clears settlement header immediately during loading and publishes error"`.
   - Added new test: `"WallOfShamePage same-scope retry recovery interaction recovers from error and renders valid ladder"`, mounting `WallOfShamePage` with initial error, clicking the `RETRY` button via mock DOM props, and proving ladder recovery.

---

## 2. File Modification Registry

| File Path | Role & Remediation |
| :--- | :--- |
| `client/src/pages/WallOfShamePage.tsx` | Aligned tiebreaker status validation with producer enum: `DEFAULT_LIONS`, `COMMISSIONER_OVERRIDE`, `COMMISSIONER_SELECTION_REQUIRED`, `UNRESOLVED`, `UNAVAILABLE`. Fails closed on `COMMISSIONER_SELECTION_REQUIRED`. |
| `client/src/pages/MatrixPage.tsx` | Dedicated `settingsState` keyed to `activePoolId`. Slate effect does not erase settings error. `isSyncing` gates lock-dependent counts during settings load; header renders `UNAVAILABLE` on settings error and persists across week switch. Added `[ RETRY TELEMETRY INTAKE ]`. |
| `tests/phase42_device_readiness_scope.test.ts` | Imported `DesignationStatus` producer type for contract enforcement. Updated fixtures to `DEFAULT_LIONS` and `COMMISSIONER_OVERRIDE`. Added same-scope retry test, delayed settings gate test, week switch error persistence test, and `MockElement.querySelectorAll` / `dispatchEvent` mock support. |
| `docs/evidence/HAG-32/` | Raw verbatim test, build, and diff check logs (01-06) with zero trailing whitespace. |

---

## 3. Test & Verification Matrix

### 3.1 Focused Phase 42 Test Suite (`tests/phase42_device_readiness_scope.test.ts`)
- **Total Tests**: 53
- **Passed**: 53
- **Failed**: 0
- **Execution Command**: `npx vitest run tests/phase42_device_readiness_scope.test.ts --pool=threads`
- **Execution Duration**: 2.26s
- **Evidence Log**: `docs/evidence/HAG-32/01_focused_tests.log`

### 3.2 Authoritative Regression Test Suites
- `tests/sweatProjectionService.test.ts`: 5/5 PASSED
- `tests/phase41_runtime_mock_purge.test.ts`: 12/12 PASSED
- `tests/phase41_picks_tiebreaker_settlement.test.ts`: 16/16 PASSED
- `tests/phase41_pick_validation.test.ts`: 10/10 PASSED
- `tests/phase41_week7_tiebreaker.test.ts`: 82/82 PASSED
- **Total Broader Tests**: 125/125 PASSED in 7.63s
- **Combined Test Count Across All Suites**: 178 / 178 PASSED
- **Evidence Log**: `docs/evidence/HAG-32/02_broader_tests.log`

### 3.3 TypeScript & Production Build Verifications
- `npx tsc --noEmit`: Exit code 0 (0 errors). Evidence log: `docs/evidence/HAG-32/03_typecheck.log`.
- `npm --prefix client run build`: Exit code 0 (`✓ built in 3.69s`, 2,394 modules transformed). Evidence log: `docs/evidence/HAG-32/04_client_build.log`.
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
- Edits are committed strictly to feature branch `feat/p37-shell-auth-openslate`.
- No remote `git push` has been performed.
- No Render webhook or deploy triggers executed.
- No Android APK compilation or signing executed.
- No production database DDL or state mutations executed.
- No claims of live production acceptance or schema deployment made.
