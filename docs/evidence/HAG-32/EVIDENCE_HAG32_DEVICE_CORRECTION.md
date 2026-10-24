# HAG-32 Evidence Dossier: Device Correction & Readiness Scope Remediation

**Contract ID**: `P42-DEVICE-READINESS-SCOPE-2026-10-24-01`
**Work Item**: `HAG-32` (Resolves `HAG-30` Device Observations & Remediates `HAG-32 HOLD`)
**Directive**: `god/HAG27-device-correction-directive-20261024.md`
**Review Finding**: `god/HAG32-review-HOLD-1680534a.md`
**Starting Base SHA**: `1680534a0bfe3d8dd63c60a31148ccdbc74dc61a`
**Execution Timestamp**: 2026-10-24T20:41:00Z
**Branch**: `feat/p37-shell-auth-openslate`
**Parity Anchor (Decision #61)**: `750A519DF9E42FEBEEA802724077867F14CB2CB514F6117DDADF815C572C6E68`

---

## 1. Executive Summary & HOLD Remediation

This dossier certifies the implementation of binding contract `P42-DEVICE-READINESS-SCOPE-2026-10-24-01` and the complete remediation of all 7 findings raised in `god/HAG32-review-HOLD-1680534a.md`. All work is strictly local implementation, unit testing, client compilation, and documentation. No remote push, Render deploy, Android APK assembly/distribution, or production DB migrations/DDL have been executed.

### 7 HOLD Findings Remediated:
1. **WallOfShamePage Fabricated Official Ladder Purged (Finding 1)**:
   - Purged the bogus fallback query against `penalty_ledger` that lacked season/week filters and fabricated official ranks by mapping 0 debt to rank 1 and array index to remaining ranks.
   - When officially settled (`weekly_wrapups`), the page now truthfully unpacks authoritative standings from `wrapup.summary.standings` (`RankedMemberResult[]`), preserving exact tie handling, points, and ranks recorded by the settlement engine. If not settled, it falls through to validated provisional sweat projection; if telemetry is unavailable or invalid, it renders unavailable.
2. **Request Generation, Unmount Invalidation & Scope Collision (Finding 2)**:
   - Placed request generation validation (`if (reqGenRef.current !== currentGen) return;`) after every asynchronous operation (`Promise.all`, matrix json parse, games query, tiebreaker fetch).
   - Added `useEffect` unmount cleanup that increments `reqGenRef.current += 1` to immediately cancel and discard in-flight async callbacks on unmount.
   - Added `isScopeMismatch` check in render to immediately display `LOADING` and suppress prior READY/SAFE rows whenever `week` or `poolId` props change before the new snapshot resolves. Clears `ladderData` on retry/refresh.
3. **Strict Telemetry Validation (Finding 3)**:
   - In `liveScoreService.ts`, preserved score missingness (`undefined`, never coerces missing score to `'0'`) on scheduled games; maps `kickoffTime: event.date ? new Date(event.date).toISOString() : undefined`.
   - In `sweatProjectionService.ts`, `validateTelemetryCoverage` enforces duplicate ID rejection (`DUPLICATE_TELEMETRY_EVENT_ID`), invalid slate ID rejection (`INVALID_SLATE_GAME_ID`), exact slate coverage, finite nonnegative score string validation (`/^\d+$/`), confirmed future kickoffs for scheduled games, and rejects post-deadline scheduled games as uncertain.
4. **Scope Readiness, Manifest Mapping & Tiebreaker Inputs (Finding 4)**:
   - Eliminated default test pool UUID (`9b893bef...`) and literal week 6 fallback; fails closed with truthful unavailable/loading states when pool or week cannot be resolved.
   - Resolves games via manifest/matrix rows or scoped DB games.
   - Reads tiebreaker endpoint `/api/pools/:pool_id/tiebreaker` (excluded on Week 6 per charter) and passes member predictions and designated game score to `calculateProvisionalStandings`.
5. **Canonical Game Lock & Slate Summary Contract (Finding 5)**:
   - Authored `evaluateCanonicalGameLock` (returning 3-way canonical state `'OPEN' | 'LOCKED' | 'UNAVAILABLE'`) and `evaluateSlateLockSummary` in `lockEnforcementService.ts`.
   - Applied across `WeeklyPicks.tsx`, `MatrixPage.tsx`, and `ProfilePage.tsx`.
   - `MatrixPage.tsx` displays `'PICKS OPEN: N'` when games remain open and renders date-agnostic empty-state copy when no picks exist.
   - `ProfilePage.tsx` resolves canonical kickoff lock state via `evaluateCanonicalGameLock`, accounting for pool lock offset minutes.
6. **Actual Consumer Mounting in Vitest (Finding 6)**:
   - Authored 24 comprehensive consumer-mount tests in `tests/phase42_device_readiness_scope.test.ts` utilizing React `createRoot` and `act()`.
   - Mounts actual `WallOfShamePage` with mock server responses, verifying rapid week transitions, unmount invalidation, settlement separation from live finality, and retry on incomplete telemetry.
   - Verifies `formatNextKickoffLock` with pool lock offset and canonical game lock on mixed Thursday/Sunday slates.
7. **Dossier Accuracy, Full Diff Check & Evidence Preparation (Finding 7)**:
   - Eliminated all trailing whitespace across documentation.
   - Recorded starting base SHA (`1680534a0bfe3d8dd63c60a31148ccdbc74dc61a`).
   - Recorded full verification logs in `docs/evidence/HAG-32/`.

---

## 2. File Modification Registry

| File Path | Role & Remediation |
| :--- | :--- |
| `client/src/services/liveScoreService.ts` | Preserves score missingness on scheduled games; maps kickoff time from event date. |
| `client/src/services/sweatProjectionService.ts` | Strict telemetry validation: duplicate ID detection, slate coverage, finite nonnegative score validation, post-deadline scheduled rejection. |
| `client/src/services/lockEnforcementService.ts` | Authored `evaluateCanonicalGameLock` (3-way state) and `evaluateSlateLockSummary`. |
| `client/src/pages/WallOfShamePage.tsx` | Purged bogus `penalty_ledger` official ladder; consumes `wrapup.summary.standings`; adds unmount cleanup and per-await generation guards; scope mismatch display protection. |
| `client/src/components/WeeklyPicks.tsx` | Uses `evaluateSlateLockSummary` and `evaluateCanonicalGameLock`; maintains `liveScores` state. |
| `client/src/pages/MatrixPage.tsx` | Evaluates per-game locks via `evaluateSlateLockSummary`; renders `'PICKS OPEN: N'` and date-agnostic empty copy. |
| `client/src/pages/ProfilePage.tsx` | Resolves canonical lock via `evaluateCanonicalGameLock` with `lockOffsetMinutes`. |
| `tests/phase42_device_readiness_scope.test.ts` | Authored 24 consumer mounting tests covering actual `WallOfShamePage` and lock enforcement. |
| `docs/evidence/HAG-32/*` | Retained evidence logs and updated dossier without trailing whitespace. |

---

## 3. Test & Verification Matrix

### 3.1 Focused Phase 42 Test Suite (`tests/phase42_device_readiness_scope.test.ts`)
- **Total Tests**: 24
- **Passed**: 24
- **Failed**: 0
- **Execution Command**: `npx vitest run tests/phase42_device_readiness_scope.test.ts --pool=threads`
- **Execution Time**: 202ms

### 3.2 Authoritative Regression Test Suites
- `tests/sweatProjectionService.test.ts`: 5/5 PASSED
- `tests/phase41_runtime_mock_purge.test.ts`: 12/12 PASSED
- `tests/phase41_picks_tiebreaker_settlement.test.ts`: 16/16 PASSED
- `tests/phase41_pick_validation.test.ts`: 10/10 PASSED
- `tests/phase41_week7_tiebreaker.test.ts`: 82/82 PASSED
- **Total Broader Tests**: 125/125 PASSED
- **Combined Test Count Across Suites**: 149 / 149 PASSED

### 3.3 TypeScript & Production Build Verifications
- `npx tsc --noEmit`: Exit code 0 (0 errors).
- `npm --prefix client run build`: Exit code 0 (`tsc -b && vite build` built in 1.99s, 2,394 modules transformed).
- `git diff --check`: Exit code 0 (0 trailing whitespace or formatting defects).

### 3.4 Decision #61 Bit-Identical Mirror Parity Verification
```text
Algorithm : SHA256
Hash      : 750A519DF9E42FEBEEA802724077867F14CB2CB514F6117DDADF815C572C6E68
Path      : src/services/tiebreakerRankingService.ts

Algorithm : SHA256
Hash      : 750A519DF9E42FEBEEA802724077867F14CB2CB514F6117DDADF815C572C6E68
Path      : client/src/services/tiebreakerRankingService.ts

File byte lengths:
src/services/tiebreakerRankingService.ts: 9011 bytes
client/src/services/tiebreakerRankingService.ts: 9011 bytes
Mirror parity: BIT-IDENTICAL PRESERVED
```

---

## 4. Retained Evidence Logs

The raw terminal output for all verifications is preserved in `docs/evidence/HAG-32/`:
- `01_focused_tests.log`: Output of `npx vitest run tests/phase42_device_readiness_scope.test.ts --pool=threads` (24/24 passed).
- `02_broader_tests.log`: Output of broader regression suites (125/125 passed).
- `03_typecheck.log`: Output of `npx tsc --noEmit` (clean).
- `04_client_build.log`: Output of `npm --prefix client run build` (built in 1.99s).
- `05_mirror_parity.log`: SHA-256 and byte length parity verification of `tiebreakerRankingService.ts`.
- `06_git_diff_check.log`: Output of `git diff --check` (exit code 0).

---

## 5. Operational Boundary Attestation

All remediation actions have been executed strictly within the local development workspace:
- Remote push to origin: **NOT EXECUTED**
- Render deploy webhook: **NOT EXECUTED**
- Production database DDL / migrations / mutations: **NOT EXECUTED**
- APK build / signing / release distribution: **NOT EXECUTED**
