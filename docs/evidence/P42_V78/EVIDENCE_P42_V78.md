# P42 (v78) Full-Season Release & Authoritative Slate Contract Evidence

**Authority:** `P42-V78-SEASON-RELEASE-2026-10-21-01`
**Card:** `HAG-25` (Execute v78/full-season local implementation and APK; no production touches)
**Remediation Target:** Gatekeeper Residual HOLD at `0c0be0e` / inbox `2026-10-21T19-32-21-177Z-72f9bb.json`
**Implementation Commit (Prior):** `0af78dd06ec560df877d65b8b70b426a61aa8735`
**Base Commit:** `dadb049` (`feat/p37-shell-auth-openslate`)
**Target Release Binary:** `pickem-v78-season-release.apk` (versionCode 78, versionName 42.0.0)
**Execution Boundary:** STRICTLY LOCAL. Zero remote push, zero Render deployment, zero production database DDL/mutations.

---

## 1. Executive Summary & Remediation of Residual HOLD Items (A–D)

In response to God's Gatekeeper Residual HOLD at `0f862c9` / `e381e88` (`god/P42-v78-verification-HOLD-e381e88.md`), Executor resolved the initial four concrete items cleanly on branch `feat/p37-shell-auth-openslate`:

### Item A: Shared Client Slate Authority & Delimited Cache Isolation
- **Production Resolver (`client/src/services/authoritativeSlateClientService.ts`)**:
  - Implemented `resolveAuthoritativeSlate`, standardizing manifest retrieval and canonical game resolution across both `WeeklyPicks.tsx` and `LeagueMatrixView.tsx`.
  - **Manifest Primacy**: If the weekly manifest query errors, returns null, or contains an empty `event_ids` array, the resolver strictly fails closed (`source: 'FAILED_CLOSED'`, `games: []`). No direct games or RPC rows can override a missing or denied manifest.
  - **Active Pool Authority Check**: Direct table access requires verified active pool membership (`pool_memberships.status === 'ACTIVE'`). Non-members or unauthenticated callers are rejected with `POOL_AUTHORITY_DENIED`.
  - **Exact Coverage Invariant**: Requires complete, exact, unique coverage of all accepted manifest event IDs (`INCOMPLETE_MANIFEST_COVERAGE` on missing events; `CONFLICTING_GAME_IDENTITY` on duplicates). Extra provider games not in the accepted manifest are strictly excluded.
  - **Sentinel Lock Enforcement**: Unconfirmed TBD matchups (`canonical_kickoff_time === null` or `lock_effective_at` epoch sentinel `1970-01-01T00:00:00.000Z`) are flagged with `isKickoffConfirmed: false` and locked at epoch.
- **Delimited Cache Scope**:
  - Implemented `getHighestCachedSlateRevision` using exact regex delimiters: `^picks_slate_${poolId}_s${season}_t${seasonType}_w${week}_r(\d+)$`.
  - Completely eliminates the prefix collision defect where week 7 matched week 17.
  - Eradicated old unscoped/revisionless fallback keys (`picks_slate_${poolId}_w${week}`).

### Item B: Canonical Game Lock Resolution & Cross-Week Pick Validation
- **Exact Parameter Binder Count**:
  - In `src/routes/picks.ts`, refactored `resolveGameWithCanonicalLock` so that non-UUID game IDs bind exactly 1 parameter (`WHERE external_game_id = $1::text`) and UUIDs bind exactly 2 (`WHERE id = $1::uuid OR external_game_id = $2::text`), resolving driver-level binder-count sensitivity.
- **Truthful Error Handling**:
  - Removed silent error swallowing (`catch (_) {}`). Real database query failures propagate truthfully as `CANONICAL_GAME_QUERY_FAILED`. Legacy Prisma `findFirst` fallback is strictly constrained to environments where the table does not exist (e.g. SQLite unit test mocks).
  - Ambiguous game identities (multiple matches) fail closed with `AMBIGUOUS_GAME_IDENTITY`.
  - Unparseable kickoff dates reject with `INVALID_KICKOFF_METADATA`; NaN lock deadlines reject with `INVALID_LOCK_METADATA`; NaN canonical kickoffs reject with `INVALID_CANONICAL_KICKOFF`.
- **Cross-Week Pick Validation**:
  - In both single `POST /api/picks` and batch `POST /api/picks/batch`, verifies `requestedWeek === game.week`. Mismatched submissions return HTTP 400 `CROSS_WEEK_MISMATCH`, preventing cross-week false success.
  - When the deployed schema provides the `week` column on `public.picks`, executes parameterized SQL update binding `week = game.week`.

### Item C: CLI Argument Parser Hardening
- **Strict Integer Validation**:
  - In `scripts/season_import_cli.ts`, replaced permissive `parseInt()` with `parseStrictInteger()` using strict regex `/^\d+$/` and `Number.isSafeInteger()`.
  - Rejects fractional inputs (e.g. `'7.5'`) and alphanumeric strings (e.g. `'7junk'`) with `INVALID_INTEGER`.
  - Rejects missing argument values (flags at end of argv or followed immediately by another flag) with `MISSING_ARGUMENT_VALUE`.
  - Rejects contradictory modes (specifying both `--dry-run` and `--execute`) with `CONTRADICTORY_MODES`.
  - Rejects out-of-bounds weeks (`start < 1`, `end > 18`, `end < start`), non-2026 season years, and non-2 season types.
  - In `--execute` mode, enforces valid UUID formats for `--pool` and `--operator` and rejects placeholder UUIDs.

### Item D: Evidence-Bounded Compatibility & Runbook Specifications
- **Evidence-Bounded Client Compatibility Statement**: See Section 5 for explicit differentiation between local trigger verification and unverified live production trigger execution.
- **Retained Build Telemetry**: Accurately reflects the client compilation time from `03_client_build.log`.
- **Runbook Integrity**: Replaced dummy placeholder UUIDs with parameterized environment variables (`$env:POOL_ID`, `$env:OPERATOR_ID`) and descriptive prerequisites.

---

## 1.5 Remediation of Two Production Paths (God HOLD `0c0be0e` / HAG-25)

In response to God's subsequent HOLD `0c0be0e` (`god/P42-v78-verification-HOLD-0c0be0e.md` and inbox `2026-10-21T19-32-21-177Z-72f9bb.json`), Executor resolved the two identified production paths without modifying existing database rows or performing remote operations:

### Path 1: Parameterized Atomic 4-Column Pick Persistence & Route Invariants
- **Atomic 4-Column Key Upsert (`savePickAtomically`)**:
  - Replaced legacy 3-column `prisma.pick.upsert` (`poolId_userId_gameId`) and swallowed `UPDATE ... WHERE game_id = $4::uuid` with an atomic raw SQL upsert matching deployed PostgreSQL constraint `(pool_id, user_id, week, game_id)` and `$4::text` for game identity:
    ```sql
    INSERT INTO public.picks (id, pool_id, user_id, game_id, week, selected_team, created_at, updated_at)
    VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3::text, $4::integer, $5::text, NOW(), NOW())
    ON CONFLICT (pool_id, user_id, week, game_id)
    DO UPDATE SET
      selected_team = EXCLUDED.selected_team,
      updated_at = NOW()
    RETURNING id, pool_id, user_id, game_id, week, selected_team, created_at, updated_at;
    ```
  - Both single (`POST /api/picks`) and batch (`POST /api/picks/batch`) routes now call `savePickAtomically`.
  - Authoritative `game.week` is directly bound into the initial insert and conflict targets; separate best-effort update logic is completely eliminated.
  - Requires authoritative `game.week` (`MISSING_AUTHORITATIVE_WEEK`, HTTP 400).
  - Explicit requested week scope must match authoritative `game.week` (`CROSS_WEEK_MISMATCH`, HTTP 400).
  - Write errors propagate truthfully with HTTP 500 (`Error saving pick`).
  - Existing 84 picks remain entirely untouched.
- **Elimination of Fallback Runtime Fabrication**:
  - Removed generic error swallowing and runtime deadline fabrication in `resolveGameWithCanonicalLock`.
  - Real database / query failures strictly fail closed with `CANONICAL_GAME_QUERY_FAILED`.
  - Unit test compatibility is isolated exclusively via explicit test hooks (`setLegacyGameAdapterForTesting`, `setLegacyPickSaveAdapterForTesting`).
- **Kickoff Lock Date/NaN Hardening**:
  - `evaluateKickoffLock` rigorously validates `kickoffTime`, `canonicalKickoffTime`, `lockEffectiveAt`, `lockOffsetMinutes`, `now`, and `lockTimeMs`.
  - Non-numeric or NaN lock offsets reject with `INVALID_LOCK_OFFSET`.
  - NaN/invalid timestamps reject with `INVALID_LOCK_METADATA` or `INVALID_CANONICAL_KICKOFF`.
  - Non-positive lock deadlines reject with `NON_POSITIVE_LOCK_DEADLINE`.

### Path 2: Actual Client Revision / Authority
- **Strict Slate Revision & Field Validation**:
  - `resolveAuthoritativeSlate` rigorously validates manifest structure (`season`, `season_type`, `week_number`, `revision >= 0`, `manifest_fingerprint`, and non-empty `event_ids`).
  - Direct metadata query on `games` table validates every returned row against exact scope (`season`, `season_type`, `week`), exact `manifest_revision`, and trustworthy kickoff/lock metadata (`canonical_kickoff_time`, `lock_effective_at`).
  - If direct metadata read fails, errors, or returns empty rows, the resolver strictly fails closed (`source: 'FAILED_CLOSED'`). A thin RPC success cannot substitute for missing lock data or bypass revision mismatch.
- **Authenticated Subject Pool Membership Binding**:
  - Verifies caller user session via `supabase.auth.getUser()`.
  - Scopes pool membership verification directly to caller (`.eq('user_id', currentUserId)`).
  - Rejects missing user identity, foreign users, or non-active memberships with `POOL_AUTHORITY_DENIED`.

---

## 2. Empirical Verification Telemetry

| Check | Tool / Command | Result | Details |
| :--- | :--- | :--- | :--- |
| **Authoritative Test Suites** | `npx vitest run` (6 suites) | **PASS** | 188/188 tests passing across 6 authoritative test files (`01_focused_tests.log`) |
| **Backend TypeScript** | `npx tsc --noEmit` | **PASS** | Exit code 0, 0 errors (`02_typescript_typecheck.log`) |
| **Client Web Build** | `npm --prefix client run build` | **PASS** | Exit code 0, 2,394 modules transformed in 2.25s (`03_client_build.log`) |
| **Git Diff Quality** | `git diff --check dadb049..HEAD` | **PASS** | Exit code 0, 0 whitespace errors or conflict markers (`04_git_diff_check.log`) |
| **Decision #61 Mirror Parity** | `Get-FileHash -Algorithm SHA256` | **PASS** | Server and client `tiebreakerRankingService.ts` bit-identical (`750A519DF9E42FEBEEA802724077867F14CB2CB514F6117DDADF815C572C6E68`) (`05_decision61_mirror_hashes.log`) |
| **APK Release Binary Size** | File Inspection | **PASS** | `7,003,436` bytes (identical across build output, root v78, and root app-release) |
| **APK Binary Hash** | `Get-FileHash -Algorithm SHA256` | **PASS** | `10BD6BCAD6FC3FD29BDE819C5CA9BBA32888B2437F4D60862229F204E1056A05` |
| **AAPT Version Metadata** | `aapt dump badging` | **PASS** | `versionCode='78'`, `versionName='42.0.0'` (`06_apksigner_verification.log`) |
| **APK Signature Verification** | `apksigner verify --verbose` | **PASS** | Scheme v2 verified (`true`), 1 signer |

---

## 3. Decision #61 Service Mirror Parity Check

```text
Algorithm : SHA256
Hash      : 750A519DF9E42FEBEEA802724077867F14CB2CB514F6117DDADF815C572C6E68
Path      : src/services/tiebreakerRankingService.ts

Algorithm : SHA256
Hash      : 750A519DF9E42FEBEEA802724077867F14CB2CB514F6117DDADF815C572C6E68
Path      : client/src/services/tiebreakerRankingService.ts
Parity    : True
```

---

## 4. Runbook: Season Ingestion CLI Execution

### A. Simulated Dry Run (Zero Database Writes)
```bash
npx tsx scripts/season_import_cli.ts --dry-run --start 7 --end 18 --pool "$POOL_ID"
```
- Fetches weekly slates from ESPN for weeks 7 through 18.
- Validates zoned ISO timestamps, competitor identities, and TBD unconfirmed flex status.
- Evaluates Detroit Lions default tiebreaker designation for each week (`DEFAULT_LIONS` or `COMMISSIONER_SELECTION_REQUIRED` on bye).
- Outputs ASCII verification matrix with zero mutations.

### B. Live Authorized Execution (Operator Only)
```powershell
# Set environment variables in PowerShell execution context for authenticated commissioner
$env:POOL_ID = "9b893bef-3b5a-4ffa-951d-8ba27f9c9782"
$env:OPERATOR_ID = "$env:OPERATOR_ID" # Set to authenticated commissioner user UUID before execution

npx tsx scripts/season_import_cli.ts --execute --start 7 --end 18 --pool $env:POOL_ID --operator $env:OPERATOR_ID
```
- Executes inside serial transactions per week with transaction-level advisory locks (`pg_advisory_xact_lock`).
- Persists canonical games into `public.games` writing all 16 deployed columns.
- Re-verifies weekly manifests in `public.weekly_slate_manifests`.
- Updates `pool.settings.tiebreaker_designations` preserving any existing frozen or commissioner overrides.
- Preserves all 84 existing picks, 30 baseline games, 11 memberships, and 1 pool.

---

## 5. Evidence-Bounded Client Compatibility & Governance Statement

1. **v77 Client Pick Submission & Kickoff Locks**:
   - In local SQLite and mock test environments, pick submissions that omit `canonical_kickoff_time` or `lock_effective_at` fail closed or evaluate against verified canonical locks. When canonical columns are present in `public.games`, `COALESCE(lock_effective_at, canonical_kickoff_time, kickoff_time)` enforces earliest flex and epoch sentinel locks.
   - **Operational Boundary Qualification**: Executor has NOT queried, verified, or probed the live production database trigger execution path, in accordance with the strict LOCAL ONLY boundary and zero-production-probe policy. Live execution proof of deployed trigger enforcement remains unverified by Executor and is owned by God/PM.
2. **Future Weeks Navigation**:
   - Deployed v77 mobile clients lack the 18-week dynamic picker and cannot navigate to slates beyond Week 6. Upgrading to APK v78 (`versionCode 78`, `versionName 42.0.0`) is required for members to view, select, and submit picks for Weeks 7 through 18.
3. **Delayed-Write Protection & Live Runtime Qualification**:
   - Client and Express layer pre-checks enforce kickoff deadlines at request receipt. Under high-latency or delayed database writes, the database-level trigger `check_pick_kickoff_and_immutability()` provides the authoritative final serialization barrier against `clock_timestamp()`.
   - **Live Runtime Qualification**: Actual deployed database trigger execution proof and live runtime compatibility under deployed Render/Supabase environments remain unverified by Executor and require independent verification by God/PM.
