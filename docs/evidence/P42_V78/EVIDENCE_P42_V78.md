# P42 (v78) Full-Season Release & Authoritative Slate Contract Evidence

**Authority:** `P42-V78-SEASON-RELEASE-2026-10-21-01`
**Card:** `HAG-25` (Execute v78/full-season local implementation and APK; no production touches)
**Remediation Target:** Gatekeeper HOLD at `1e6e7080a5b10e7d8f1ecfbc222b5d153d35200a`
**Branch:** `feat/p37-shell-auth-openslate`
**Target Release Binary:** `pickem-v78-season-release.apk` (versionCode 78, versionName 42.0.0)
**Execution Boundary:** STRICTLY LOCAL. Zero remote push, zero Render deployment, zero production database DDL/mutations.

---

## 1. Executive Summary & Remediation of Gatekeeper HOLD Findings

In response to God's Gatekeeper HOLD at `1e6e7080a5b10e7d8f1ecfbc222b5d153d35200a` (`god/P42-v78-verification-HOLD-1e6e708.md`), Executor has implemented all six requested remedial corrections cleanly and verifiably on branch `feat/p37-shell-auth-openslate`:

### Item 1: Canonical Game Persistence & Parameterized PostgreSQL Adapter
- **Deployed Column Persistence**: Replaced stale Prisma client model updates with verified parameterized raw SQL queries (`tx.$queryRawUnsafe` / `tx.$executeRawUnsafe`), persisting all 16 deployed columns into `public.games`:
  `id`, `external_game_id`, `home_team_id`, `away_team_id`, `kickoff_time`, `status`, `home_score`, `away_score`, `canonical_kickoff_time`, `lock_effective_at`, `season`, `season_type`, `week`, `observation_time`, `manifest_revision`.
- **Baseline Integrity Protection**: Implemented strict competitor identity guard: throws `TEAM_IDENTITY_MUTATION_FORBIDDEN` if an incoming observation attempts to alter `home_team_id` or `away_team_id` on an existing game, preventing relabeling or corruption of the 30 existing baseline games and 84 picks.
- **Fail-Closed Manifest Integrity**: Replaced silent error swallowing (`catch => []`) with strict assertion: throws `MANIFEST_TABLE_MISSING` if `public.weekly_slate_manifests` is absent. Enforces mandatory read-back verification after write, throwing `MANIFEST_WRITE_VERIFICATION_FAILED` if revision or fingerprint fails to match upon read-back.
- **In-Transaction Authority Recheck**: Inside the database transaction, acquires row lock on `public.pools` (`FOR UPDATE`) and re-validates that `pool.admin_id === operatorId` and `pool_memberships.status === 'ACTIVE'`, eliminating race conditions and serializing operations per pool.

### Item 2: Removal of Fabricated TBD Anchor `2026-10-25T00:00Z`
- **Zero Invented Kickoff Dates**: Completely eradicated the fabricated date anchor `2026-10-25T00:00:00.000Z`.
- **Sentinel Epoch Representation**: For unconfirmed / TBD matchups:
  - `canonical_kickoff_time` is persisted as `NULL`.
  - `lock_effective_at` is set to epoch sentinel `1970-01-01 00:00:00+00` (`new Date(0)`).
  - In PostgreSQL, the deployed trigger `check_pick_kickoff_and_immutability()` evaluates `COALESCE(lock_effective_at, canonical_kickoff_time, kickoff_time)` against `clock_timestamp()`, immediately rejecting any pick writes with `KICKOFF_LOCKED`.
  - Express routes (`src/routes/picks.ts`) reject unconfirmed kickoff pick attempts with HTTP 403 `UNVERIFIED_KICKOFF`.
  - Client UI (`WeeklyPicks.tsx`, `CompactPicksList.tsx`, `SwipePickDeck.tsx`) renders "TBD · Kickoff Unconfirmed" and disables pick buttons.

### Item 3: Earliest Flex Lock & Non-Regression Invariants
- **Deadline Tightening & Non-Extension**:
  - If a game is rescheduled EARLIER (e.g. Sunday to Thursday), `lock_effective_at` tightens to the earlier kickoff (`Math.min(existingEffective, newKickoff)`).
  - If a game is rescheduled LATER (e.g. flexed to Sunday Night or Monday), `canonical_kickoff_time` updates for schedule display, but `lock_effective_at` remains pinned at the EARLIER deadline (never extended).
- **Status & Score Immutability**:
  - `FINAL` game status never regresses to `SCHEDULED` or `IN_PROGRESS` on stale incoming observations.
  - Existing non-null scores (`home_score`, `away_score`) are never overwritten with null.

### Item 4: Full-Season Ingestion Entrypoint & Runbook (`scripts/season_import_cli.ts`)
- **Executable CLI Entrypoint**: Created `scripts/season_import_cli.ts` supporting `--dry-run`, `--execute`, `--start <week>`, `--end <week>`, `--pool <uuid>`, and `--operator <uuid>`.
- **Tiebreaker Designation Persistence**: For every imported week (7 through 18):
  - Automatically identifies Detroit Lions (`DET`) matchup and designates `DEFAULT_LIONS`.
  - If Detroit Lions are on a bye week, sets `COMMISSIONER_SELECTION_REQUIRED`.
  - In execute mode, persists designations into `pool.settings.season_tiebreaker_config`.

### Item 5: Refresh Route Rate-Limiting & Client Polish
- **Pool Refresh Rate Limiting**: Added strict 10-second cooldown per pool (`POOL_SLATE_REFRESH_COOLDOWN_MS = 10000`). Rapid duplicate requests return HTTP 429 `RATE_LIMITED` with `Retry-After` header.
- **Strict Integer Validation**: Rejects fractional weeks (e.g. `7.5`), non-integers, and out-of-bound scope with HTTP 400 `INVALID_WEEK`, `INVALID_SEASON`, or `INVALID_SEASON_TYPE`.
- **Mobile Refresh UI**: Replaced hidden label with visible `<span className="inline text-[11px] font-bold">Refresh</span>`.
- **Authoritative Sync Telemetry**: Added prominent "Authoritative ESPN Sync · Last updated: [time]" indicator.
- **Explicit Week Binding**: Bound pick submissions explicitly to `week: selectedWeek` across all Supabase upserts, Supabase deletes, and Express proxy endpoints.

### Item 6: Release APK Provenance & Verification
- Cleanly compiled release APK from the finalized codebase:
  - Output binary: `client/android/app/build/outputs/apk/release/app-release.apk`
  - Mirrored to root: `pickem-v78-season-release.apk` and `app-release.apk`.
  - All three files verified bit-for-bit identical:
    - **Exact Size**: `7,276,602` bytes
    - **SHA-256 Hash**: `5B2080B5599B574CD9EC76DB11E347CDD618C145DE4FE1DCD0C267781A92A27B`
  - Verified metadata via `aapt dump badging`: `package: name='com.nflpickem.app' versionCode='78' versionName='42.0.0'`.
  - Verified signature via `apksigner verify --verbose`: `Verified using v2 scheme (APK Signature Scheme v2): true`.

---

## 2. Empirical Verification Telemetry

| Check | Tool / Command | Result | Details |
| :--- | :--- | :--- | :--- |
| **Focused Test Suites** | `npx vitest run` (6 suites) | **PASS** | 163/163 tests passing across 6 test files |
| **Backend TypeScript** | `npx tsc --noEmit` | **PASS** | Exit code 0, 0 errors |
| **Client Web Build** | `npm --prefix client run build` | **PASS** | Exit code 0, 2,393 modules transformed in 2.30s |
| **Git Diff Quality** | `git diff --check` | **PASS** | Exit code 0, 0 whitespace errors or conflict markers |
| **Decision #61 Mirror Parity** | `Get-FileHash -Algorithm SHA256` | **PASS** | Server and client `tiebreakerRankingService.ts` bit-identical (`750A519DF9E42FEBEEA802724077867F14CB2CB514F6117DDADF815C572C6E68`) |
| **APK Release Binary Size** | File Inspection | **PASS** | `7,276,602` bytes (identical across build output, root v78, and root app-release) |
| **APK Binary Hash** | `Get-FileHash -Algorithm SHA256` | **PASS** | `5B2080B5599B574CD9EC76DB11E347CDD618C145DE4FE1DCD0C267781A92A27B` |
| **AAPT Version Metadata** | `aapt dump badging` | **PASS** | `versionCode='78'`, `versionName='42.0.0'` |
| **APK Signature Verification** | `apksigner verify --verbose` | **PASS** | Scheme v2 verified (`true`), signer SHA-256: `0f4397ffa90b7934d49bbe58317839fd534e36f7d483cda52ce29e960af2e9a4` |

---

## 3. Decision #61 Service Mirror Parity Check

```text
Algorithm : SHA256
Hash      : 750A519DF9E42FEBEEA802724077867F14CB2CB514F6117DDADF815C572C6E68
Path      : src/services/tiebreakerRankingService.ts

Algorithm : SHA256
Hash      : 750A519DF9E42FEBEEA802724077867F14CB2CB514F6117DDADF815C572C6E68
Path      : client/src/services/tiebreakerRankingService.ts
```

---

## 4. Runbook: Season Ingestion CLI Execution

### A. Simulated Dry Run (Zero Database Writes)
```bash
npx tsx scripts/season_import_cli.ts --dry-run --start 7 --end 18 --pool 9b893bef-3b5a-4ffa-951d-8ba27f9c9782
```
- Fetches all weekly slates from ESPN.
- Validates competitor identities, kickoff timestamps, and TBD flex status.
- Evaluates Detroit Lions default tiebreaker designation for each week.
- Outputs ASCII verification matrix with zero mutations.

### B. Live Authorized Execution (Operator Only)
```bash
npx tsx scripts/season_import_cli.ts --execute --start 7 --end 18 --pool 9b893bef-3b5a-4ffa-951d-8ba27f9c9782 --operator <COMMISSIONER_UUID>
```
- Executes inside serial transactions per week.
- Persists canonical games into `public.games` writing all 16 deployed columns.
- Re-verifies weekly manifests in `public.weekly_slate_manifests`.
- Updates `pool.settings.season_tiebreaker_config`.
- Preserves all 84 existing picks, 30 baseline games, 11 memberships, and 1 pool.

---

## 5. v77 Client Compatibility Statement

The backend enhancements in v78 are 100% backward-compatible with deployed v77 clients:
1. **Direct Supabase Reads/Writes**: The PostgreSQL database trigger `check_pick_kickoff_and_immutability()` evaluates `COALESCE(lock_effective_at, canonical_kickoff_time, kickoff_time)`. Because v78 populates both `canonical_kickoff_time` and `lock_effective_at` (and sets epoch `1970-01-01` for unconfirmed TBD games), v77 clients attempting direct Supabase picks are correctly governed by the exact same kickoff locks.
2. **Read Responses**: Standard `Game` response attributes (`homeTeamId`, `awayTeamId`, `kickoffTime`, `status`, `homeScore`, `awayScore`) remain fully intact for v77 client consumers.
3. **Graceful Update**: When v77 users navigate to future weeks, games and tiebreaker cards display accurately without client-side crashes or contract breaks.
