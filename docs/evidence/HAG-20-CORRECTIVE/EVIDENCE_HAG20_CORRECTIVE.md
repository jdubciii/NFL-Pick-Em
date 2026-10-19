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
   - **`tiebreakerRankingService.ts`**: Controlling Phase 41 / Week 7 service. Bit-for-bit identical across `src/services/tiebreakerRankingService.ts` and `client/src/services/tiebreakerRankingService.ts` (SHA-256 `750A519DF9E42FEBEEA802724077867F14CB2CB514F6117DDADF815C572C6E68`, 9,011 bytes).
   - **Canonical Shared Mirrors (100% Bit-Identical)**:
     - `sweatReceiptService.ts`: `32260366348F01033C1795CD3E753EAB177117634EBDA44AB5C08D1B07A7E4F3` (5,572 bytes)
     - `seasonStoryService.ts`: `CA64105F17C4FF076FC3698DD255F69CAB6E12F031396CBDB6189E0FDE895481` (6,234 bytes)
     - `weeklyRecapService.ts`: `C23AEB4ECE99F9A89C3474B3CBFAC745272B347119DE6C5E57B938B0BD366B27` (8,351 bytes)
     - `deadlineAlertPlanner.ts`: `C20C73120C059C640618AE524CC8A0B006DDEDDF064B082E761C9295CF4C0600` (8,091 bytes)
     - `poolSocialService.ts`: `07540B8A82EC6DAA10EA7431613A494ED78894B63FAEC0A58DF2B41A60105FED` (18,750 bytes)
   - **Pre-existing Mirror Deltas (Preserved per Invariant)**:
     - `dependableInfoService.ts`: Server (`A049BC6EF773A1EACAC73DA442DCFD38E81D1061A75D2BAA79ECEDA13B85E938`, 35,572 bytes) vs Client (`2C738D7B65DBDC8D7115DB7D14020F74EC28BB2932C8A3ED424B0642C71437CB`, 35,782 bytes). Identical to baseline `65c77be` (0 diff vs `65c77be`). Divergence is a pre-existing client-side team identity normalization in `buildPersonalRootingQueue` (`normAway @ normHome` vs `toUpperCase()`) introduced in commit `3ef6c55` (v75 physical phone acceptance).
     - `pregameTopologyService.ts`: Server (`EDFE2E9A00CCD1E06D59D8EB2EC033805F6B577DC875E0020DF0DF308EFACD70`, 6,494 bytes) vs Client (`E54D5FEE0284095759EB8EA2FB035435F8EBC715F735A40CDBA4049088031CF8`, 6,764 bytes). Identical to baseline `65c77be` (0 diff vs `65c77be`). Divergence consists strictly of client-only duel fields/copy (`targetPicksCount`, `rivalPicksCount`, empty-state microcopy). Both share identical `cohortFloor: number = 1` logic.
   - **Scope Ruling**: Decision #61 ranking algorithm parity is 100% preserved. Preexisting client duel and rooting UI behaviors remain untouched per invariant without manufactured parity.

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
  *Result:* `git diff --check dadb049..HEAD` verified clean with 0 errors.
- **07 Decision #61 Mirror Hashes**: `docs/evidence/HAG-20-CORRECTIVE/07_decision61_mirror_hashes.log`
  *Result:* Verified exact SHA-256 hashes, byte sizes, and pre-existing baseline provenance.
