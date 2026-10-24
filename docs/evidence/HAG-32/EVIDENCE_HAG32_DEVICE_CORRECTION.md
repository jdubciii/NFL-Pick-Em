# HAG-32 Evidence Dossier: Device Correction & Readiness Scope

**Contract ID**: `P42-DEVICE-READINESS-SCOPE-2026-10-24-01`  
**Work Item**: `HAG-32` (Resolves `HAG-30` Device Observations)  
**Directive**: `god/HAG27-device-correction-directive-20261024.md`  
**Execution Timestamp**: 2026-10-24T20:13:00Z  
**Branch**: `feat/p37-shell-auth-openslate`  
**Parity Anchor (Decision #61)**: `750A519DF9E42FEBEEA802724077867F14CB2CB514F6117DDADF815C572C6E68`

---

## 1. Executive Summary

This dossier certifies the implementation of binding contract `P42-DEVICE-READINESS-SCOPE-2026-10-24-01`, addressing physical device findings on Render/Android runtime without altering production database state, executing DDL, triggering remote deploys, or assembling APKs.

### Root Causes Remediated:
1. **Week 6 False-Safe Preview & Ladder Race Condition**:
   - `WallOfShamePage.tsx` previously fired asynchronous live score queries while an uncoordinated reactive effect evaluated standings against an empty score array.
   - Missing live scores caused `sweatProjectionService` to score all submitted picks as 0 points, manufacturing an artificial 11-way tie at rank 1 with tier `SAFE_HAVEN` and label `PROJECTED SAFE` before ESPN returned real game outcomes.
   - Fixed by introducing parent-owned `ScopedLadderSnapshot` with monotonic request generation tracking (`reqGenRef`), strict live telemetry coverage validation (`validateTelemetryCoverage`), and unified atomic state updates.
2. **WeeklyLadderView Autonomous State & Fake Clock Purged**:
   - Eliminated autonomous `fetchActivePoolMembers` fallback in `WeeklyLadderView.tsx` which previously queried `pool_memberships` and `penalty_ledger` with hardcoded pool `9b893bef-db9d-40bc-8056-b7ff5a229a00`, mapping zero debt directly to `#1 PROJECTED SAFE` on cold mount.
   - Eliminated fake hardcoded countdown timer (`3600*24+1800`).
   - Replaced with purely supplied state driven by contract statuses: `LOADING`, `INCOMPLETE_TELEMETRY`, `GAMES_NOT_STARTED`, `EMPTY`, and `READY`.
   - Added visible `isStale` warning banner displaying the snapshot's observed timestamp.
3. **Mid-Slate Phase Semantics Hardened**:
   - When a Thursday night game (`NE @ CHI 24-30`) completed and Sunday games remained upcoming, `WeeklyPicks.tsx` previously declared the week `PRE-KICKOFF`.
   - Corrected to `'Week in progress'` and labeled the status badge `'PICKS OPEN: N'` per Decision #66.
4. **Monolithic Lock Replaced by Per-Game Lock (Decision #66)**:
   - `MatrixPage.tsx` previously declared the slate locked upon the kickoff of the first game, denying picks visibility and contradicting per-game lock rules.
   - Refactored to evaluate per-game locks (`openCount`, `lockedCount`, `matrixPhase`), rendering granular status badges and date-agnostic empty-state messaging.
5. **Profile Scope Precedence & Fallback Verified**:
   - `ProfilePage.tsx` previously fell back to an arbitrary literal `|| 6`.
   - Refactored to strictly enforce calendar/navigation scope precedence (`propWeek ?? poolSettings.current_week ?? null`) and fail closed with `'Unavailable'` when scope or games cannot be resolved.
   - `formatNextKickoffLock` only claims `'All Week N Games Locked'` when all scheduled games have confirmed past kickoff timestamps.
6. **Settlement Decoupled from Game Outcome Finality**:
   - `WallOfShamePage.tsx` now distinguishes live game finality (`ALL_GAMES_FINAL`) from official charter settlement (`weekly_wrapups`), rendering distinct `SETTLEMENT NOT CONFIRMED` and `OFFICIAL SETTLED` indicators.

---

## 2. File Modification Registry

| File Path | Role & Changes |
| :--- | :--- |
| `client/src/services/sweatProjectionService.ts` | Added `validateTelemetryCoverage(games, liveScores)` helper; guarded `calculateProvisionalStandings` to return empty when `games` or `users` is empty. |
| `client/src/components/shame/WeeklyLadderView.tsx` | Pure supplied-state renderer; purged hardcoded pool fallback and fake clock; added `INCOMPLETE_TELEMETRY` with retry; added `isStale` warning banner. |
| `client/src/pages/WallOfShamePage.tsx` | Parent-owned `ScopedLadderSnapshot` with monotonic `reqGenRef`; parallel data fetch; truthful `scoreStatus` decoupled from settlement; synchronized header and body state. |
| `client/src/pages/ProfilePage.tsx` | Enforced scope precedence (`propWeek ?? current_week`); removed `|| 6` fallback; hardened `formatNextKickoffLock` truthfulness. |
| `client/src/components/WeeklyPicks.tsx` | Mapped mid-slate phase `'Week in progress'`; labeled badge `'PICKS OPEN: N'` per Decision #66. |
| `client/src/pages/MatrixPage.tsx` | Replaced monolithic slate lock with per-game lock evaluation; added date-agnostic empty state copy. |
| `tests/phase42_device_readiness_scope.test.ts` | Authored 19 comprehensive contract tests covering all 7 contract cases. |

---

## 3. Test & Verification Matrix

### 3.1 Focused Contract Test Suite (`tests/phase42_device_readiness_scope.test.ts`)
- **Total Tests**: 19
- **Passed**: 19
- **Failed**: 0
- **Execution Time**: 165ms
- **Contract Coverage**:
  - Case 1: Cold load, network rejection, empty/missing telemetry (4 tests) — PASSED
  - Case 2: Complete 0-0 scores, all-pregame state, and genuine shared ranks (4 tests) — PASSED
  - Case 3: Request generation isolation & stale response cancellation (1 test) — PASSED
  - Case 4: Profile explicit vs configured scope precedence (6 tests) — PASSED
  - Case 5: Per-game lock and week in progress status (1 test) — PASSED
  - Case 6: Settlement separation from game outcome finality (2 tests) — PASSED
  - Case 7: Visible stale snapshot banner & elimination of fake countdown (1 test) — PASSED

### 3.2 Authoritative Regression Test Suites
- `tests/sweatProjectionService.test.ts`: 5/5 PASSED
- `tests/phase41_runtime_mock_purge.test.ts`: 12/12 PASSED
- `tests/phase41_picks_tiebreaker_settlement.test.ts`: 16/16 PASSED
- `tests/phase41_pick_validation.test.ts`: 10/10 PASSED
- `tests/phase41_week7_tiebreaker.test.ts`: 82/82 PASSED
- **Total Authoritative Vitest Pass Count**: 144 / 144 PASSED

### 3.3 TypeScript & Build Verifications
- `npx tsc --noEmit`: Exit code 0 (0 diagnostics, 0 errors).
- `npm --prefix client run build`: Exit code 0 (`tsc -b && vite build` completed in 4.53s, 2,394 modules transformed).
- `git diff --check`: Exit code 0 (0 trailing whitespace or formatting defects).

### 3.4 Decision #61 Bit-Identical Mirror Verification
```text
Algorithm : SHA256
Hash      : 750A519DF9E42FEBEEA802724077867F14CB2CB514F6117DDADF815C572C6E68
Path      : src/services/tiebreakerRankingService.ts

Algorithm : SHA256
Hash      : 750A519DF9E42FEBEEA802724077867F14CB2CB514F6117DDADF815C572C6E68
Path      : client/src/services/tiebreakerRankingService.ts
```
Bit-identical mirror parity is strictly preserved.

---

## 4. Retained Evidence Logs

The raw terminal output for all verifications is preserved in `docs/evidence/HAG-32/`:
- `01_focused_tests.log`: Focused 19-test contract run.
- `02_broader_tests.log`: 43-test regression run.
- `03_typecheck.log`: Clean root TypeScript check.
- `04_client_build.log`: Clean production client build.
- `05_mirror_parity.log`: Cryptographic hash comparison of server and client tiebreaker services.
- `06_git_diff_check.log`: Git diff check verification.

---

## 5. Deployment & Operating Boundaries

In accordance with `god/HAG27-device-correction-directive-20261024.md` and contract `P42-DEVICE-READINESS-SCOPE-2026-10-24-01`:
- **Remote Push**: NOT EXECUTED. Local branch `feat/p37-shell-auth-openslate` remains unpushed.
- **Render Deployment**: NOT TRIGGERED.
- **APK Assembly / Distribution**: NOT EXECUTED.
- **Database DDL / Hosted Mutations**: NOT EXECUTED.
- **Settlement / Import**: NOT EXECUTED.
