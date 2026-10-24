# HAG-32 Evidence Dossier: Device Correction & Readiness Scope Remediation (HOLD aadd573 Remediation)

**Contract ID**: `P42-DEVICE-READINESS-SCOPE-2026-10-24-01`
**Work Item**: `HAG-32` (Resolves `HAG-30` Device Observations & Remediates `HAG-32 narrowed HOLD at aadd573`)
**Directive**: `god/HAG27-device-correction-directive-20261024.md`
**Review Finding**: `god/HAG32-review-HOLD-aadd573.md`
**Starting Base SHA**: `aadd5732b202e4dbd976c9e4210737b8b688f8d4`
**Execution Timestamp**: 2026-10-24T21:38:00Z
**Branch**: `feat/p37-shell-auth-openslate`
**Parity Anchor (Decision #61)**: `750A519DF9E42FEBEEA802724077867F14CB2CB514F6117DDADF815C572C6E68`

---

## 1. Executive Summary & Remediation Scope

This dossier certifies the implementation of binding contract `P42-DEVICE-READINESS-SCOPE-2026-10-24-01` and the remediation of all four retained correction groups raised in `god/HAG32-review-HOLD-aadd573.md`.

All work is strictly confined to local implementation, unit testing, client compilation, and documentation. No remote push, Render deploy, Android APK assembly/distribution, production DB migrations/DDL, settlement, sweep, or import operations have been executed.

### Four Retained Correction Groups Remediated:

1. **Actual Offset Contract Alignment & Profile Metadata**:
   - In `evaluateCanonicalGameLock` (`lockEnforcementService.ts`), stored `lock_effective_at` (effective deadline) is resolved and offset is subtracted exactly once matching server `src/routes/picks.ts` (`lockTimeMs = deadlineMs - offsetNum * 60 * 1000`).
   - Uses unified pool settings precedence: `poolSettings?.lock_offset ?? poolSettings?.lockOffset ?? mem?.pools?.lock_offset ?? 0`. Does not assume top-level column `lock_offset` is deployed.
   - Profile direct games query in `resolveProfileReminderScope` (`ProfilePage.tsx`) selects `canonical_kickoff_time, lock_effective_at` and carries metadata to `windowGames`.
   - Replaced truthiness checks in `ProfilePage.tsx` with `isScopeMismatch` guarding `formatNextKickoffLock` against stale deadline copy during scope transitions.

2. **Tiebreaker Missingness, Designation & Finality**:
   - In `WallOfShamePage.tsx`, validates tiebreaker endpoint response: fails closed to `INCOMPLETE_TELEMETRY` on non-OK/rejected fetch, `UNRESOLVED` designation, missing/unmatched designated event, incomplete active member readiness coverage, or malformed prediction values.
   - Distinguishes live designated games from final designated games: derives `actualTotalScore` only when designated game status is verified `FINAL`. When the designated game is `IN_PROGRESS` / `LIVE`, leaves `actualTotalScore = undefined`, preserving legitimate provisional ties before final outcomes are known under existing ranking rules.

3. **Snapshot Reset, Null-Safe Scope Comparison & Progress Truth**:
   - In `WallOfShamePage.tsx`, explicitly resets `isSettled: false`, `ladderData: []`, and `scoreStatus: 'STATUS_UNAVAILABLE'` on refresh initiation and on all error branches, preventing stale `OFFICIALLY SETTLED` headers from lingering during retry or error states.
   - In `isScopeMismatch`, compares user identity with null safety: `(snapshot.userId ?? null) !== (user?.id ?? null)`, ensuring sign-out immediately invalidates snapshot and renders loading state.
   - Evaluates official settlement score status strictly over scoped slate games (`gamesList`), not unscoped feed events.
   - In `evaluateSlateLockSummary` (`lockEnforcementService.ts`), cleanly separates game progress (`actualStartedOrFinalCount`: games marked `FINAL` or `IN_PROGRESS` or with verified kickoff in the past) from pick lock offset. A pregame slate with all games verified upcoming reports `'Games not started'` even when lock offset has locked pick submissions.

4. **Required Inputs, Matrix Structurally Complete Validation & Error States**:
   - In `WallOfShamePage.tsx`, validates that the matrix payload is structurally complete (valid scoped metadata, columns covering all active members, and row cells present). If structurally complete, uses matrix picks; if incomplete or unavailable, resolves slate via `resolveAuthoritativeSlate` and reads authoritative scoped picks from the database (`supabase.from('picks').select(...)`). Fails closed on query errors.
   - In `MatrixPage.tsx`, guards against stale week picks during week transitions (`[ SYNCING SLATE ]`), tracks `hasLoadError`, and renders `[ DATA UNAVAILABLE ]` / `[ LEAGUE DATA COULD NOT BE VERIFIED ]` on membership/picks query errors, distinct from verified empty slates (`[ NO PICKS SUBMITTED ]`). Uses unified pool settings offset precedence.

---

## 2. File Modification Registry

| File Path | Role & Remediation |
| :--- | :--- |
| `client/src/services/lockEnforcementService.ts` | Stored `lock_effective_at` has offset subtracted once matching server. Evaluates slate lock summary cleanly separating game progress from pick lock offset. |
| `client/src/pages/ProfilePage.tsx` | Pool lock offset precedence checks `settings.lock_offset ?? settings.lockOffset ?? lock_offset`. Direct select includes `canonical_kickoff_time, lock_effective_at`. `isScopeMismatch` guards deadline formatting. |
| `client/src/pages/MatrixPage.tsx` | Guards against stale week picks during week transitions. Tracks `hasLoadError` and renders `[ DATA UNAVAILABLE ]` on failure versus `[ NO PICKS SUBMITTED ]` on verified empty. Pool offset precedence aligned. |
| `client/src/pages/WallOfShamePage.tsx` | Structurally complete matrix validation with DB fallback. Settlement snapshot reset on refresh and error. Null-safe `isScopeMismatch`. Scoped score status. Tiebreaker validation, unresolved designation denial, live vs final provisional tie preservation. |
| `tests/phase42_device_readiness_scope.test.ts` | Updated `setupWallMocks` with complete metadata and auth client mock. Added 16 contract tests in Case 8 covering exact offset boundaries, flexed earlier deadline, Profile metadata select, tiebreaker live vs final provisional tie differentiation, unresolved designation denial, refresh snapshot reset, and MatrixPage error vs verified empty states. |
| `docs/evidence/HAG-32/` | Raw verbatim test and build logs (01-06) with zero trailing whitespace. |

---

## 3. Test & Verification Matrix

### 3.1 Focused Phase 42 Test Suite (`tests/phase42_device_readiness_scope.test.ts`)
- **Total Tests**: 40
- **Passed**: 40
- **Failed**: 0
- **Execution Command**: `npx vitest run tests/phase42_device_readiness_scope.test.ts --pool=threads`
- **Execution Duration**: 1.38s
- **Cases Proven**:
  - Case 1: Cold load, network rejection, empty/missing telemetry (4 tests)
  - Case 2: Complete 0-0 scores, all-pregame state, and genuine shared ranks (4 tests)
  - Case 3: Request generation isolation & stale response cancellation (2 tests)
  - Case 4: Profile explicit vs configured scope precedence (7 tests)
  - Case 5: Per-game lock and week in progress status (4 tests)
  - Case 6: Settlement separation from game outcome finality (2 tests)
  - Case 7: Visible stale snapshot banner & elimination of fake countdown (1 test)
  - Case 8: Real Producer/Caller Contract Alignment (HOLD aadd573 Remediation) (16 tests)

### 3.2 Authoritative Regression Test Suites
- `tests/sweatProjectionService.test.ts`: 5/5 PASSED
- `tests/phase41_runtime_mock_purge.test.ts`: 12/12 PASSED
- `tests/phase41_picks_tiebreaker_settlement.test.ts`: 16/16 PASSED
- `tests/phase41_pick_validation.test.ts`: 10/10 PASSED
- `tests/phase41_week7_tiebreaker.test.ts`: 82/82 PASSED
- **Total Broader Tests**: 125/125 PASSED
- **Combined Test Count Across All Suites**: 165 / 165 PASSED

### 3.3 TypeScript & Production Build Verifications
- `npx tsc --noEmit`: Exit code 0 (0 errors).
- `npm --prefix client run build`: Exit code 0 (`tsc -b && vite build` built in 2.60s, 2,394 modules transformed).
- `git diff --check`: Exit code 0 (0 trailing whitespace or formatting defects).
- `git diff --check 790cfc84b1c044fd8db8174b2593bf12269dc804..HEAD`: Exit code 0.

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
```

---

## 4. Retained Evidence Log Reference

All raw outputs have been recorded into `docs/evidence/HAG-32/`:
- `01_focused_tests.log`: Verbatim 40/40 pass output for Phase 42 test suite.
- `02_broader_tests.log`: Verbatim 125/125 pass output across 5 regression suites.
- `03_typecheck.log`: Verbatim exit 0 root TypeScript check.
- `04_client_build.log`: Verbatim exit 0 client Vite/TypeScript build.
- `05_mirror_parity.log`: PowerShell SHA256 hash and byte length check.
- `06_git_diff_check.log`: Verbatim exit 0 diff checks.
