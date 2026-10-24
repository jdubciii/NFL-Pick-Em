# HAG-32 Evidence Dossier: Device Correction & Readiness Scope Remediation (R1 Remediation)

**Contract ID**: `P42-DEVICE-READINESS-SCOPE-2026-10-24-01`
**Work Item**: `HAG-32-WEEKLYPICKS-R1` (Resolves `HAG-32 narrow R1 correction: WeeklyPicks settings fail-open`)
**Directive**: `god` message `2026-10-24T23-15-07-858Z-d5e323`
**Review Finding**: `architect-mveovi5k/HAG32-59c558e-ruling.md` (`P42-DEVICE-READINESS-ACCEPTANCE-2026-10-24-02`)
**Starting Base SHA**: `a9bf69d8a3f419ca9d3da1455274e54a2548b1e8`
**Execution Timestamp**: 2026-10-24T23:35:00Z
**Branch**: `feat/p37-shell-auth-openslate`
**Parity Anchor (Decision #61)**: `750A519DF9E42FEBEEA802724077867F14CB2CB514F6117DDADF815C572C6E68` (9,011 bytes)

---

## 1. Executive Summary & Remediation Scope

This dossier certifies the complete remediation of **R1 (WeeklyPicks settings fail-open)** and satisfies all caller-proof requirements identified in `god` directive `2026-10-24T23-15-07-858Z-d5e323`:

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

2. **Actual-Caller Proof & Persistence Spy Assertions**:
   - Spied on all 4 local and backend persistence channels:
     1. `supabase.from('picks').upsert`
     2. `supabase.from('picks').delete`
     3. `scopedExpressFetch` for `/api/picks`
     4. `localStorage.setItem` for user pick keys (`picks_${poolId}_${week}_${userId}`)
   - **Delayed Nonzero Offset**: Mounted actual `WeeklyPicks` with game 45 min away and delayed pool settings (`lock_offset: 60`, delay 60ms). While pending, verified `SYNCING` badge, button disabled, and attempted pick interaction asserting 0 writes across all 4 channels. When delay resolves with offset 60, verified `ALL GAMES LOCKED`, button disabled, and attempted pick asserting 0 writes.
   - **Failed Settings Query (`poolError`)**: Mounted actual `WeeklyPicks` with database timeout error. Verified fail-closed to `UNAVAILABLE` / `[ DATA UNAVAILABLE ]`, button disabled, attempted pick interaction asserting 0 writes across all 4 channels.
   - **Missing Settings (`poolSettings: null`)**: Mounted actual `WeeklyPicks` with null settings. Verified fail-closed to `UNAVAILABLE` / `[ DATA UNAVAILABLE ]`, button disabled, attempted pick interaction asserting 0 writes across all 4 channels.
   - **Missing Pool Row (`poolData: null`)**: Mounted actual `WeeklyPicks` with missing pool record. Verified fail-closed to `UNAVAILABLE` / `[ DATA UNAVAILABLE ]`, button disabled, attempted pick interaction asserting 0 writes across all 4 channels.
   - **Malformed Offsets**: Mounted actual `WeeklyPicks` with `lock_offset: 'invalid'` and `lock_offset: -15`. Verified fail-closed to `UNAVAILABLE` / `[ DATA UNAVAILABLE ]`, buttons disabled, attempted pick interaction asserting 0 writes across all 4 channels.
   - **Successful Retry Interaction with Actual Entry Restoration**: Mounted actual `WeeklyPicks` in error state, asserted initial pick denial and 0 writes, reconfigured mock to valid settings (`lock_offset: 0`), triggered `[ RETRY TELEMETRY INTAKE ]`, verified error clears and header publishes `PICKS OPEN: 1`, verified button enabled, clicked button, and verified actual pick persistence to `supabase.from('picks').upsert` (`game_id: 'g-retry'`, `selected_team: 'DEN'`), `scopedExpressFetch('/api/picks')`, and `localStorage`.
   - **Mounted Server Zero Default (`poolSettings: {}`)**: Mounted actual `WeeklyPicks` with valid empty settings object. Verified zero default applied: header shows `PICKS OPEN: 1`, button is enabled, clicking button succeeds and persists pick.
   - **Mounted Nonzero Offset (`poolSettings: { lock_offset: 15 }`) & Controlled Clock Advance**:
     - Used `vi.useFakeTimers()` with kickoff at `17:00:00.000Z` and offset 15m (exact effective lock deadline `16:45:00.000Z`).
     - Set initial clock to exactly `16:44:50.000Z` (10s before deadline). Verified `Date.now() < exactDeadlineTime`, `PICKS OPEN: 1`, button enabled, click succeeds and persists pick.
     - Advanced controlled timer by exactly `10,000ms` via `advanceTimersByTimeAsync(10000)`, firing the `WeeklyPicks` interval at `Date.now() === exactDeadlineTime` (`16:45:00.000Z`).
     - Asserted `Date.now() === exactDeadlineTime` (`16:45:00.000Z`), header transitions to `ALL GAMES LOCKED`, button disabled (`disabled: true`), pick attempt denied, and 0 persistence writes across all 4 channels.
     - Confirmed that an operational boundary mutation from `>=` to `>` evaluates as open and is caught by actual caller proof.
     - Advanced clock by `300,000ms` (30 interval cycles) to `16:50:00.000Z` (past deadline, 10 min before kickoff): asserted `Date.now() === 16:50:00.000Z`, game remains locked, button disabled, and 0 persistence writes.
     - Cleaned up with `vi.useRealTimers()`.

---

## 2. File Modification Registry

| File Path | Role & Remediation |
| :--- | :--- |
| `tests/phase42_device_readiness_scope.test.ts` | Added `pickPersistenceTracker` intercepting and asserting on `supabase.from('picks').upsert`, `delete`, `scopedExpressFetch('/api/picks')`, and `localStorage.setItem`. Added actual mounted pick interactions and persistence assertions across pending, error, missing settings (`poolSettings: null`), missing pool row (`poolData: null`), and malformed offsets. Added actual mounted retry test restoring button entry and pick persistence. Added actual mounted server zero default (`poolSettings: {}`) and controlled clock advance across before/exact effective deadline. |
| `docs/evidence/HAG-32/` | Raw verbatim test, build, diff check, and mirror parity logs (01-06) with zero trailing whitespace. |

---

## 3. Test & Verification Matrix

### 3.1 Focused Phase 42 Test Suite (`tests/phase42_device_readiness_scope.test.ts`)
- **Total Tests**: 62
- **Passed**: 62
- **Failed**: 0
- **Execution Command**: `npx vitest run tests/phase42_device_readiness_scope.test.ts --pool=threads`
- **Execution Duration**: 3.89s
- **Evidence Log**: `docs/evidence/HAG-32/01_focused_tests.log`

### 3.2 TypeScript & Production Build Verifications
- `npx tsc --noEmit`: Exit code 0 (0 errors). Evidence log: `docs/evidence/HAG-32/03_typecheck.log`.
- `npm --prefix client run build`: Exit code 0 (`✓ built in 1.83s`, 2,394 modules transformed). Evidence log: `docs/evidence/HAG-32/04_client_build.log`.
- `git diff --check`: Exit code 0 (0 trailing whitespace or formatting defects).
- `git diff --check 790cfc84b1c044fd8db8174b2593bf12269dc804..HEAD`: Exit code 0 (0 errors).
- **Evidence Log**: `docs/evidence/HAG-32/06_git_diff_check.log`.

### 3.3 Decision #61 Bit-Identical Mirror Parity Verification
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
