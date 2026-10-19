# HAG-20 Corrective Evidence Dossier

**Target Branch:** `feat/p37-shell-auth-openslate`  
**Reference Commit Baseline:** `8992530d06c3f27736d360a5c5937c012c0fce15`  
**Date:** 2026-10-19  
**Authority:** God Verification Dossier (`HAG-20-verification-8992530.md`) & P41-POOL-VISIBILITY-2026-10-19-08 Directive  

---

## 1. Executive Summary & Corrections Addressed

This corrective change addresses both findings identified in god's independent verification of commit `8992530`:

1. **`src/services/pickVisibility.ts` Helper Authorization Contract**:
   - `PickVisibilityContext` now requires explicit trusted same-pool ACTIVE authorization context.
   - Fails closed (`return false`) when authorization context is absent, explicitly false (`isSamePoolActiveMember: false`), mismatched (`viewerPoolId !== targetPoolId`), or non-ACTIVE (`viewerMembershipStatus !== 'ACTIVE'`).
   - Added rigorous negative context unit tests in `tests/m14_3_visibility.test.ts` verifying all fail-closed denial modes alongside immediate pool visibility positive assertions.
   - Updated `tests/m14_7_e2e_integration.test.ts` to provide explicit trusted active pool context.

2. **`tests/phase41_week7_tiebreaker.test.ts` Section 17 & Pool Isolation Proof**:
   - Parameterized legacy hide settings variants (`hide_picks_until_kickoff: true/false`, `hidePicksUntilKickoff: true/false`, and absent) directly within `mockPool.settings`, explicitly removing keys for absent test cases.
   - Asserted that observed query pool and settings fixtures match the exact intended configurations.
   - Strengthened pool and week isolation proof with a comprehensive multi-pool, multi-week dataset and mock implementation ensuring `prisma.pick.findMany` and `prisma.weeklySubmission.findMany` filter strictly by `where.poolId`, `where.weekNumber`, and `where.gameId.in`.
   - Verified that same-member picks and submissions in other pools/weeks never leak into the target pool's matrix view.

3. **Topology Divergence & Decision #61 Mirror Parity Analysis**:
   - Investigated git history between `src/services/pregameTopologyService.ts` and `client/src/services/pregameTopologyService.ts`.
   - Confirmed the diff between server and client pre-dates commit `8992530` (it is identical at `65c77be` and earlier).
   - Divergence consists strictly of client-only duel fields/copy (`targetPicksCount?: number`, `rivalPicksCount?: number`, and `summaryMicrocopy` unsubmitted notice).
   - `pregameTopologyService.ts` is outside Decision #61's Canonical Six mirrors and ranking algorithms. Per god's instruction, preexisting client duel behavior was preserved without manufactured parity. Both services share identical `cohortFloor: number = 1` logic.
   - `tiebreakerRankingService.ts` verified 100% bit-identical SHA-256 (`750A519DF9E42FEBEEA802724077867F14CB2CB514F6117DDADF815C572C6E68`).

---

## 2. Source & Test Change Map

| File | Change Details |
|---|---|
| `src/services/pickVisibility.ts` | Added `viewerPoolId`, `targetPoolId`, `viewerMembershipStatus`, `isSamePoolActiveMember` to `PickVisibilityContext`. Required explicit trusted same-pool ACTIVE context in `canViewPick`, failing closed on absent/false/mismatched/inactive context. |
| `tests/m14_3_visibility.test.ts` | Added positive tests for immediate visibility with trusted context; added comprehensive negative context tests (absent context, false context, mismatched pools, inactive status, empty IDs). |
| `tests/m14_7_e2e_integration.test.ts` | Passed explicit trusted active pool context in `canViewPick` assertions. |
| `tests/phase41_week7_tiebreaker.test.ts` | Section 17 parameterized in `mockPool.settings` across snake_case true/false, camelCase true/false, and absent (with keys deleted); asserted observed fixtures on `poolFindUniqueSpy`; implemented multi-pool/multi-week dataset proving strict query filtering and same-member cross-pool isolation. |

---

## 3. Retained Verbatim Raw Logs & Artifacts

All test runs, typechecks, builds, and diff checks were executed and their raw verbatim outputs captured into files in `docs/evidence/HAG-20-CORRECTIVE/`:

- **01 Focused Tests**: `docs/evidence/HAG-20-CORRECTIVE/01_focused_tests.log`  
  *Result:* 3 files, 96 tests passed (0 failures).
- **02 Affected Tests**: `docs/evidence/HAG-20-CORRECTIVE/02_affected_tests.log`  
  *Result:* 9 files, 51 tests passed (0 failures).
- **03 Full Phase 41 Suite**: `docs/evidence/HAG-20-CORRECTIVE/03_phase41_full_suite.log`  
  *Result:* 16 files, 278 tests passed (0 failures).
- **04 TypeScript Typecheck**: `docs/evidence/HAG-20-CORRECTIVE/04_typescript_typecheck.log`  
  *Result:* `npx tsc --noEmit` exited 0 with 0 errors.
- **05 Client Build**: `docs/evidence/HAG-20-CORRECTIVE/05_client_build.log`  
  *Result:* Vite v8.3.1 clean build (2,393 modules transformed, 0 errors).
- **06 Git Diff Check**: `docs/evidence/HAG-20-CORRECTIVE/06_git_diff_check.log`  
  *Result:* `git diff --check` and `git diff --check dadb049..HEAD` exited 0 with 0 errors.
- **07 Decision #61 Mirror Hashes**: `docs/evidence/HAG-20-CORRECTIVE/07_decision61_mirror_hashes.log`  
  *Result:* Verified exact SHA-256 hashes and byte parity across all canonical shared services.
