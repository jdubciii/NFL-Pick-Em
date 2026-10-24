# HAG-32 Evidence Dossier: Device Correction & Readiness Scope Remediation (HOLD 8f4d4b0 Remediation)

**Contract ID**: `P42-DEVICE-READINESS-SCOPE-2026-10-24-01`
**Work Item**: `HAG-32` (Resolves `HAG-30` Device Observations & Remediates `HAG-32 HOLD`)
**Directive**: `god/HAG27-device-correction-directive-20261024.md`
**Review Finding**: `god/HAG32-review-HOLD-8f4d4b0.md`
**Starting Base SHA**: `8f4d4b075202508afb38e90bc3db70c28fb9649e`
**Execution Timestamp**: 2026-10-24T21:07:00Z
**Branch**: `feat/p37-shell-auth-openslate`
**Parity Anchor (Decision #61)**: `750A519DF9E42FEBEEA802724077867F14CB2CB514F6117DDADF815C572C6E68`

---

## 1. Executive Summary & Remediation Scope

This dossier certifies the implementation of binding contract `P42-DEVICE-READINESS-SCOPE-2026-10-24-01` and the remediation of all 7 retained blockers raised in `god/HAG32-review-HOLD-8f4d4b0.md`.

All work is strictly confined to local implementation, unit testing, client compilation, and documentation. No remote push, Render deploy, Android APK assembly/distribution, production DB migrations/DDL, settlement, sweep, or import operations have been executed.

### 7 Retained Blockers Remediated:

1. **Producer/Consumer Identity Mapping & Authoritative Slate (Blocker 1)**:
   - Aligned caller and producer contracts between `src/server.ts` (`game_id` = internal UUID, `external_game_id` = ESPN ID) and client services.
   - In `sweatProjectionService.ts`, established a verified two-way 1-to-1 identity mapping (`gameByInternalId`, `gameByExternalId`, `internalToExternal`) across picks (keyed by internal UUID), games, and live score telemetry (keyed by ESPN ID).
   - In `WallOfShamePage.tsx`, games are mapped with `id: String(row.game_id)` and `externalGameId: String(row.external_game_id || row.game_id)`. If matrix endpoint is unavailable, resolves slate via `resolveAuthoritativeSlate`.
   - Queries user picks using `.in('game_id', acceptedGameIds)` against `pool_id/user_id/game_id`, eliminating assumed schema contracts on `picks.week/matchup_id`.
   - In `sweatProjectionService.ts`, `validateTelemetryCoverage` enforces duplicate slate game ID rejection (`DUPLICATE_SLATE_GAME_ID`).

2. **Real Tiebreaker Endpoint Consumer Alignment (Blocker 2)**:
   - Adapted `WallOfShamePage.tsx` to consume the real DTO from `handleGetTiebreaker` (`src/routes/poolTiebreakerRoutes.ts`), which returns `{ tiebreakerOffered, designatedGame, eventId, readiness: [{ userId, prediction }] }` (and does not return `predictions` object or `designatedGameScore`).
   - Maps `readiness` array to prediction values, preserving legitimate null prediction vs missing/unverified query.
   - Derives the designated game score dynamically from validated live score telemetry using the authoritative `eventId`.
   - Fails closed to `INCOMPLETE_TELEMETRY` on non-OK or failed tiebreaker reads on non-Week-6 slates (Week 6 exclusion preserved per charter).

3. **Official Settlement Full Scope & Authoritative Validation (Blocker 3)**:
   - In `WallOfShamePage.tsx`, verifies `!wrapupResult.error`, non-null `wrapup.completed_at`, and full scope match between `wrapup.summary` and requested scope:
     `sum.poolId === targetPoolId && Number(sum.season) === 2026 && Number(sum.seasonType) === 2 && Number(sum.weekNumber) === targetWeek`.
   - Requires non-empty standings array where every record has a valid string `userId`, finite numeric `score`, integer `rank >= 1`, finite nonnegative `shots >= 0`, and boolean flags `isSafeHaven` and `isDeadPlace`.
   - Maps 2-shot tier to `DANGER_HIGH` (`2 SHOTS`) rather than classifying all non-safe/non-dead members as `DANGER_LOW`.
   - Does not require a current picks read for immutable official standings. Evaluates `scoreStatus` from live scores rather than inferring all games final solely from settlement flag.

4. **Full Scope & Identity Invalidation (Blocker 4)**:
   - In `WallOfShamePage.tsx`, enforces full scope validation: requires `resolvedPoolId`, integer `1 <= week <= 18`, `season === 2026`, and `seasonType === 2`. Fails closed with truthful error snapshot if any scope parameter is missing, out-of-range, or unsupported.
   - In `isScopeMismatch`, validates `userId`, `poolId`, `season`, `seasonType`, and `week`. Immediately renders `LOADING` and suppresses prior READY/SAFE/settled rows during scope transitions.
   - Clears `ladderData` on retry/loading and resets `isSettled` so stale official headers cannot survive loading or error states.

5. **Separation of Game Progress from Lock Truth (Blocker 5)**:
   - In `lockEnforcementService.ts`, rewritten `evaluateSlateLockSummary` to separate actual game progress (`actualStartedOrFinalCount`: games marked `FINAL` or `IN_PROGRESS` or with verified kickoff in the past) from lock offset. A future game inside the pool lock offset window is locked for pick submission but does NOT mark the week in progress.
   - `allGamesLocked` strictly requires all games known locked (`unavailableCount === 0`).
   - If any game has unknown/unavailable lock status, `lockBadgeText` reports `'UNAVAILABLE'` rather than falsely claiming all games locked. An all-unavailable slate safely reports `'Status unavailable'`.
   - In `evaluateCanonicalGameLock`, explicit canonical NULL (`canonicalKickoffTime === null`) enforces canonical unknown denial (`'UNAVAILABLE'`). Accounts for `lockEffectiveAt` / `lock_effective_at` precomputed offset once and does not subtract offset again.

6. **Caller Integration (Matrix & Profile) (Blocker 6)**:
   - In `MatrixPage.tsx`: Clears `liveGames`, `slateGames`, and `poolPicks` immediately on week change. Resolves slate via `resolveAuthoritativeSlate` without raw unverified fallback. Queries picks scoped by `acceptedGameIds`. Queries pool settings for `poolOffset` and includes a 10-second deadline clock. Passes `slateGames, liveGames, poolOffset, clockNow` to `evaluateSlateLockSummary`.
   - In `ProfilePage.tsx`: `resolveProfileReminderScope` queries `lock_offset` from pool settings and returns `poolLockOffset`. Maps canonical kickoff metadata (`canonical_kickoff_time`, `lock_effective_at`, `isKickoffConfirmed`). `formatNextKickoffLock` formats using the user's established local timezone (not unlabeled UTC) and displays the actual lock deadline (`upcoming[0].lockDeadline`).

7. **Contract Tests & Retained Dossier (Blocker 7)**:
   - Authored Case 8 in `tests/phase42_device_readiness_scope.test.ts` containing 9 comprehensive contract tests exercising producer/consumer identity mapping, tiebreaker DTO handling, settlement scope validation, lock offset vs game progress separation, and canonical NULL denial.
   - Retained evidence logs in `docs/evidence/HAG-32/` with exact test outputs, zero whitespace defects, and Decision #61 parity hashes.

---

## 2. File Modification Registry

| File Path | Role & Remediation |
| :--- | :--- |
| `client/src/services/sweatProjectionService.ts` | Added `externalGameId` support on `SlateGame`. Added `DUPLICATE_SLATE_GAME_ID` rejection. Established two-way 1-to-1 identity mapping (`internalToExternal`) bridging picks (UUID) to ESPN telemetry (numeric string). |
| `client/src/services/lockEnforcementService.ts` | Fixed `evaluateSlateLockSummary`: game progress separated from lock offset; allGamesLocked requires zero unavailable; UNAVAILABLE badge if any game unknown. Fixed `evaluateCanonicalGameLock`: explicit canonical NULL denies to UNAVAILABLE; offset accounted for once. |
| `client/src/pages/WallOfShamePage.tsx` | Mapped games with `id: game_id` and `externalGameId: external_game_id`. Queries picks via `acceptedGameIds`. Consumes real tiebreaker DTO (`readiness`, `eventId`) and derives designated score from live scores. Full scope settlement validation (`poolId`, `season`, `seasonType`, `weekNumber`) and DANGER_HIGH 2-shot mapping. Full scope invalidation (`isScopeMismatch`). |
| `client/src/pages/MatrixPage.tsx` | Clears state on week switch. Resolves authoritative slate. Queries picks by `acceptedGameIds`. Queries `poolOffset` and maintains 10-second deadline clock. Passes real metadata to `evaluateSlateLockSummary`. |
| `client/src/pages/ProfilePage.tsx` | Queries `lock_offset` in `resolveProfileReminderScope`. Passes `canonical_kickoff_time` and `lock_effective_at`. Formats deadline using user's established local timezone and actual deadline offset. |
| `vitest.config.ts` | Added `pool: 'threads'` under `test` configuration to prevent Windows process spawn EPERM errors. |
| `tests/phase42_device_readiness_scope.test.ts` | Updated settlement fixture with full scope; aligned tiebreaker assertion with `INCOMPLETE GAME TELEMETRY`; added Case 8 with 9 contract tests for HOLD remediation. |

---

## 3. Test & Verification Matrix

### 3.1 Focused Phase 42 Test Suite (`tests/phase42_device_readiness_scope.test.ts`)
- **Total Tests**: 33
- **Passed**: 33
- **Failed**: 0
- **Execution Command**: `npx vitest run tests/phase42_device_readiness_scope.test.ts --pool=threads`
- **Execution Duration**: 3.61s
- **Cases Proven**:
  - Case 1: Cold load, network rejection, empty/missing telemetry (4 tests)
  - Case 2: Complete 0-0 scores, all-pregame state, and genuine shared ranks (4 tests)
  - Case 3: Request generation isolation & stale response cancellation (2 tests)
  - Case 4: Profile explicit vs configured scope precedence (7 tests)
  - Case 5: Per-game lock and week in progress status (4 tests)
  - Case 6: Settlement separation from game outcome finality (2 tests)
  - Case 7: Visible stale snapshot banner & elimination of fake countdown (1 test)
  - Case 8: Real Producer/Caller Contract Alignment (HOLD 8f4d4b0 Remediation) (9 tests)

### 3.2 Authoritative Regression Test Suites
- `tests/sweatProjectionService.test.ts`: 5/5 PASSED
- `tests/phase41_runtime_mock_purge.test.ts`: 12/12 PASSED
- `tests/phase41_picks_tiebreaker_settlement.test.ts`: 16/16 PASSED
- `tests/phase41_pick_validation.test.ts`: 10/10 PASSED
- `tests/phase41_week7_tiebreaker.test.ts`: 82/82 PASSED
- **Total Broader Tests**: 125/125 PASSED
- **Combined Test Count Across All Suites**: 158 / 158 PASSED

### 3.3 TypeScript & Production Build Verifications
- `npx tsc --noEmit`: Exit code 0 (0 errors).
- `npm --prefix client run build`: Exit code 0 (`tsc -b && vite build` built in 4.06s, 2,394 modules transformed).
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
- `01_focused_tests.log`: Verbatim 33/33 pass output for Phase 42 test suite.
- `02_broader_tests.log`: Verbatim 125/125 pass output across 5 regression suites.
- `03_typecheck.log`: Verbatim exit 0 root TypeScript check.
- `04_client_build.log`: Verbatim exit 0 client Vite/TypeScript build.
- `05_mirror_parity.log`: PowerShell SHA256 hash and byte length check.
- `06_git_diff_check.log`: Verbatim exit 0 diff checks.
