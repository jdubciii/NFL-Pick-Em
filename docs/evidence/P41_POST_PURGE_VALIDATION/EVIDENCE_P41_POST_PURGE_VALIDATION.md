# P41 Post-Purge Evidence and Isolated Database Validation Report

**AUTHORITY:** `P41-POST-PURGE-VALIDATION-2026-10-18-01`
**ARCHITECTURE:** `P41-AUTHORITATIVE-SLATE-ARCHITECTURE-2026-10-17-01`
**WORKSPACE:** `C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em`
**BRANCH:** `feat/p37-shell-auth-openslate`
**LOCAL HEAD:** Preserved starting at `bd70c5fbcc8c2bd9aa2c6d68d4bdac3d7d1a30d`
**PUBLISHED BASELINE:** `34bf0025bc0067fc20af43c316e346a2a5f5fa4b`
**DATE:** 2026-10-18
**GOVERNING DIRECTIVES:**
- Decision #53 strictly **HELD** (Zero remote Git push).
- Zero production execution (No DDL, RLS modification, data rewrite, or deployment).
- Zero mock / fake data policy (Zero tolerance).
- Hardware Virtualization Constraint (No Docker).

---

## 1. Owner Clarification & Sporting Disposition

- **Submission Nature:** All current production picks recorded in `public.picks` (`week = 6`) are non-competitive technical test submissions generated during early verification sprints.
- **Sporting Outcome:** There is **no sporting outcome to adjudicate**, no league winner or loser dispute, and no member repair, retroactive grading, or historical penalty reconciliation requested or authorized.
- **Production Guard:** **No historical sweep, reset, deletion, rewrite, or production repair is authorized or executed.** Historical records remain strictly untouched.
- **Display Forensics Retained:** Preserved forensic findings confirm earlier distributed APK assets (`pickem-v73-s2.apk`) contained synthetic fallback dictionaries (`CANONICAL_WEEK6_SCHEDULE`) and static Profile reminder games (`week6WindowGames`, including bye-week team `MIA @ IND`). These fallbacks have been completely purged from source, as verified in `tests/phase41_runtime_mock_purge.test.ts` (12 tests, 100% PASS). Precise physical display on any specific historical device remains classified as inconclusive without device-side execution traces.

---

## 2. Production Games Preservation & Catalog Reality

### 2.1 Live Supabase Catalog Facts (PostgreSQL 17.6)
The Gatekeeper independently verified the actual production Supabase catalog:
- **Server Version:** PostgreSQL **17.6**.
- **Table `public.games`:** Exactly **16 rows**.
- **Identifiers (`external_game_id`):** Numeric ESPN-style text identifiers **`401872964` through `401872979`**.
- **Synthetic Predicate Reality:** Rows matching `external_game_id ILIKE '2026_w05_%'`: **ZERO**.
- **Kickoff Timestamps:** 15 rows on October 4, 2026 (`2026-10-04T17:00:00Z`); one row on October 5, 2026 (`2026-10-05T00:15:00Z`).
- **Primary Key:** `public.games.id` (UUID).
- **Unique Text Identity:** `public.games.external_game_id`.
- **Preserved Attributes:** `home_score`, `away_score`, `status` (`GameStatus`), and `commissioner_notes`.

### 2.2 Retraction & Correction of Proposal A
1. **Retraction:** The previous statement that the 16 existing Games records use synthetic `2026_w05_*` identifiers is **retracted**.
2. **Deletion of Invalid UPDATE:** The statement:
   ```sql
   UPDATE public.games
   SET week = 5, season = 2026, season_type = 2
   WHERE external_game_id ILIKE '2026_w05_%' AND week IS NULL;
   ```
   has been **completely removed** from all proposal documents and SQL scripts (`02_proposal_a_games_manifest.sql`).
3. **No Unverified Classification:** The existing 16 rows are not classified solely by kickoff dates or ID ranges.
4. **Nullable / Unassigned Preservation:** Additive columns in Proposal A remain nullable without defaults that silently certify legacy records:
   ```sql
   ALTER TABLE public.games
     ADD COLUMN IF NOT EXISTS season integer NULL,
     ADD COLUMN IF NOT EXISTS season_type integer DEFAULT 2 NULL,
     ADD COLUMN IF NOT EXISTS week integer NULL,
     ADD COLUMN IF NOT EXISTS observation_time timestamptz NULL,
     ADD COLUMN IF NOT EXISTS manifest_revision integer NULL;
   ```
5. **Target Prisma Model Alignment:**
   ```prisma
   model Game {
     id                String     @id @default(uuid()) @db.Uuid
     externalGameId    String     @unique @map("external_game_id")
     homeTeamId        String     @map("home_team_id")
     awayTeamId        String     @map("away_team_id")
     kickoffTime       DateTime   @map("kickoff_time")
     status            GameStatus @default(SCHEDULED)
     homeScore         Int?       @map("home_score")
     awayScore         Int?       @map("away_score")
     commissionerNotes String?    @map("commissioner_notes")
     season            Int?       @map("season")
     seasonType        Int?       @default(2) @map("season_type")
     week              Int?       @map("week")
     observationTime   DateTime?  @map("observation_time")
     manifestRevision  Int?       @map("manifest_revision")
     picks             Pick[]

     @@index([season, seasonType, week])
     @@map("games")
   }
   ```
   All application queries distinguish canonical entries: `where: { season: 2026, week: targetWeek, manifestRevision: { not: null } }`. Legacy unclassified records (`season IS NULL` / `week IS NULL`) remain safely isolated.

---

## 3. Isolated Native PostgreSQL 17.6 Test Environment

### 3.1 Provenance & Setup
- **Engine Version:** **PostgreSQL 17.6 on x86_64-windows**, compiled by Visual C++ build 1944, 64-bit.
- **Location:** Local user-space native binary installation at `scratch/tools/pg17/pgsql/bin/postgres.exe`.
- **Database Identity:** `pickem_pg17_isolated_db`.
- **Host & Port:** `127.0.0.1:54329` (strictly loopback).
- **Cluster Path:** `scratch/test_pg17_cluster` (100% disposable, gitignored).
- **Preflight Identity Assertion:**
  ```sql
  SELECT version(), current_database() as db, current_user as usr, inet_server_addr() as addr, inet_server_port() as port;
  ```
  Result: `version = PostgreSQL 17.6...`, `db = pickem_pg17_isolated_db`, `usr = postgres`, `addr = 127.0.0.1`, `port = 54329`.
- **Zero Docker / Zero Paid Infrastructure:** Ran completely natively without Docker Desktop or cloud provisioning.
- **Fail-Closed Protection:** Runner strictly verifies target database name (`pickem_pg17_isolated_db`) and loopback address (`127.0.0.1`) before connecting or executing. Zero production credentials loaded.

---

## 4. Representative Preservation Fixtures & Reconciliation

### 4.1 Fixture Specifications
- **16 Baseline Games:** Text IDs `401872964` through `401872979`, 15 with kickoff `2026-10-04T17:00:00Z`, 1 with kickoff `2026-10-05T00:15:00Z`. Status `FINAL`, genuine non-null scores, unclassified season/week.
- **1 Pool:** `9b893bef-3b5a-4ffa-951d-8ba27f9c9782` (`2026 Main Pick Em League`).
- **10 Participating Active Users:** `10000000-0000-0000-0000-000000000001` through `0010`.
- **80 Baseline Picks:** Exactly matching production distribution across 9 picked event IDs (`401872995`..`401873003`):
  - `401872995`: 1 pick
  - `401872996`: 10 picks
  - `401872997`: 10 picks
  - `401872998`: 10 picks
  - `401872999`: 10 picks
  - `401873000`: 9 picks
  - `401873001`: 10 picks
  - `401873002`: 10 picks
  - `401873003`: 10 picks

### 4.2 SHA-256 Row Preservation Proof
Row hashes were computed across all 16 legacy games using:
`sha256(external_game_id || home_team_id || away_team_id || kickoff_time || status || home_score || away_score || commissioner_notes)`.
- **Pre-DDL Baseline Hash:** `2c4eaebcf9071efc5e3f434df81b8543f4bbbe2d12613f17387f3b57cefbdd26`
- **Post-Proposal A DDL Hash:** `2c4eaebcf9071efc5e3f434df81b8543f4bbbe2d12613f17387f3b57cefbdd26` (**100% MATCH**)
- **Post-Proposal B Import Hash:** `2c4eaebcf9071efc5e3f434df81b8543f4bbbe2d12613f17387f3b57cefbdd26` (**100% MATCH**)
- **Unassigned Legacy Records:** Exactly 16 of 16 legacy games have `season IS NULL` and `week IS NULL` (Zero silent certification).
- **Pick Resolution:** Exactly **80 of 80 picks (100%)** successfully join canonical games post-import.

---

## 5. Real Service Settlement Implementation & Concurrency Protocol

The real application service `wrapUpEngine` (`executeWeeklyWrapUpForPool` and `previewWeeklyWrapUpForPool`) was executed directly against PostgreSQL 17.6 using Prisma Client inside the isolated test environment:
1. **Manifest Coordination & Slate Completeness:** Verified against official Week 6 slate manifest (`revision = 1`). Slate completeness check verifies all 14 canonical games are `FINAL` before proceeding. When any game is unfinalized (including unpicked games), execution exits immediately with `{ applied: false, reason: 'WEEK_NOT_FINAL' }` with **zero database writes and zero markers committed**.
2. **Eligible Zero-Pick Roster Members:** Active pool members with zero submitted picks are included in standings calculations and assessed the standard last-place penalty schedule.
3. **Current Commissioner / Active Membership Check:** Validates that the initiating caller holds active commissioner privileges in the pool before settlement proceeds.
4. **Single Transaction Client (`tx`):** Marker claim, results snapshot, member standings, penalty ledger entries, and audit metadata are executed atomically across a single transaction client.
5. **Atomic Mid-Operation Rollback:** An explicit injected fault inside the settlement transaction triggers complete rollback. Query verification confirms **exactly 0 orphan rows** committed in `public.penalty_ledger` or `public.weekly_wrapups`.
6. **Two-Process Contention & Refresh Races:** Two concurrent worker processes attempting settlement on the same pool/season/week serialize on the composite primary key `(pool_id, season, week_number)`. Exactly **ONE** process succeeds in acquiring the claim; the competing process detects the existing settlement and exits cleanly without double-billing.
7. **Authorized Retry Idempotency:** Subsequent wrap-up invocations on an already-settled week return `{ applied: false, reason: 'ALREADY_WRAPPED_UP', existingWrapUp: ... }` with the full preserved audit snapshot and **zero additional ledger writes**.
8. **Week 6 Tiebreaker Treatment:** In Week 6, the Detroit Lions have a bye. If no commissioner override has been designated, tiebreaker evaluation defaults cleanly without unhandled exceptions or crash loops.
9. **Activation Gating Controls:**
   - When `SETTLEMENT_ENABLED !== 'true'`, `executeWeeklyWrapUpForPool` halts with `{ applied: false, reason: 'SETTLEMENT_DISABLED' }` with zero writes and zero markers committed.
   - When `PENALTY_POSTING_ENABLED !== 'true'`, wrap-up executes in preview mode only, refusing to persist ledger charges.
   - When `SLATE_REFRESH_ENABLED !== 'true'`, Express admin endpoint `POST /api/admin/ops/slate/refresh` returns 403 `REFRESH_EXECUTION_DISABLED`.
   - All background workers and cron schedules remain strictly disabled at startup.

---

## 6. Non-Bypass RLS, Safe Canonical Reads & Direct PostgREST 16.4 Gateway Review

### 6.1 Policy & Grant Inventory
- Over-permissive legacy policies dropped:
  - `DROP POLICY IF EXISTS "Allow authenticated read picks" ON public.picks;`
  - `DROP POLICY IF EXISTS "Allow user upsert own picks" ON public.picks;`
  - `DROP POLICY IF EXISTS "Allow authenticated all picks" ON public.picks;`
- Restrictive granular policies activated:
  - `picks_select_pool_member_policy`: Owner can always view own picks; other members can only view picks after official kickoff if holding `ACTIVE` status in the same pool. Evaluated via `is_game_locked()` helper.
  - `picks_insert_policy`: Active pool member inserting own pick before game kickoff. Evaluated via `is_game_open()` helper.
  - `picks_update_policy`: Active pool member updating own pick before game kickoff. Evaluated via `is_game_open()` helper.
  - `picks_delete_policy`: Active pool member deleting own pick before game kickoff. Evaluated via `is_game_open()` helper.
- Immutability & Kickoff Lock Trigger Guard (`trg_check_pick_kickoff_and_immutability`):
  - Operates `BEFORE INSERT OR UPDATE OR DELETE ON public.picks`.
  - Protects `id`, `pool_id`, `user_id`, `game_id`, `matchup_id`, and `week` from reassignment on `UPDATE`. Allows unchanged values (`NEW.col IS NOT DISTINCT FROM OLD.col`), enabling safe PostgREST upserts.
  - Derives omitted `matchup_id` only on new inserts (`NEW.matchup_id := NEW.game_id`), ensuring it never becomes an independent event identity.
  - Validates participating teams (`selected_team` / `selected_team_id`) against canonical `home_team_id` and `away_team_id`, normalizing legacy platform aliases (`WSH` -> `WAS`, `JAC` -> `JAX`).
  - Evaluates effective kickoff lock using `clock_timestamp()` (NOT transaction-start `now()`) against `COALESCE(lock_effective_at, canonical_kickoff_time, kickoff_time)`. Writes waiting across kickoff boundary fail closed.
  - Prevents post-kickoff pick deletions.
- Canonical Games Access Minimization:
  - `REVOKE ALL ON public.games FROM anon, authenticated;`
  - Blanket queries `SELECT * FROM games` receive PostgreSQL error `42501` / HTTP 403 Forbidden.
  - Installed `SECURITY DEFINER` lookup helpers: `is_game_locked` and `is_game_open` (granted to `authenticated`).
  - Installed safe pool-scoped canonical DTO RPC: `get_pool_canonical_games(p_pool_id, p_season, p_week)`. Returns only safe fields (`id, external_game_id, home_team_id, away_team_id, kickoff_time, status, home_score, away_score`). Administrative `commissioner_notes`, manifests, audit fingerprints, and unclassified legacy records are strictly excluded.

### 6.2 Timezone Invariance & Postponement Immunity
- Evaluated effective kickoff across UTC, America/Phoenix, and America/New_York sessions:
  - In PostgreSQL, `timestamptz` stores UTC epoch microseconds.
  - Evaluating `COALESCE(lock_effective_at, canonical_kickoff_time, kickoff_time)` across `UTC`, `America/Phoenix`, and `America/New_York` produces bit-identical instant comparisons.
- Postponement Immunity: If a game kickoff is postponed after pick locks were established, setting `lock_effective_at` to the original deadline ensures the pick lock remains permanently closed, preventing postponement from reopening deadlines.

### 6.3 Native PostgREST 16.4 Gateway Test Results
PostgREST 16.4 was spawned natively on port `3001` connecting to PostgreSQL 17.6:
- **HTTP POST `/picks` (Future Game):** Member 01 inserts pick for upcoming game -> **201 Created**.
- **HTTP Upsert (`Prefer: resolution=merge-duplicates`):** Member 01 updates selection -> **201 Created / 200 OK**.
- **HTTP POST (Past Game):** Member 02 attempts pick on past game (`401872995`) -> **400 Bad Request** (`KICKOFF_LOCKED`).
- **HTTP POST (Nonmember):** Nonmember attempts pick in Pool 1 -> **403 Forbidden** (gated by RLS membership check).
- **HTTP GET `/picks` (Privacy):** Member 01 queries `/picks` -> sees Member 02's pick on past game (`401872995`), but Member 02's unkicked pick (`401873008`) is **hidden / stripped**.
- **HTTP POST `/rpc/get_pool_canonical_games`:** Active pool member retrieves safe Week 6 games DTO -> **200 OK** (14 canonical games returned, 0 commissioner notes exposed).

---

## 7. Staged Production Cutover & Security-Preserving Forward Recovery Plan

### 7.1 Corrected 8-Phase Cutover Sequence
The earlier `deploy-client → import → secure-picks` sequence is formally replaced by the following 8-phase cutover plan:

```
Phase 1: Private Backward-Compatible Schema Expansion (Proposals A, D1, E additive columns)
               ↓
Phase 2: Enforceable Bounded Write Hold & Legacy Mutation Quiescence (APP_WRITE_HOLD=true)
               ↓
Phase 3: Complete Security Replacement (Proposal E RLS, Triggers, revoke games SELECT, safe RPC)
               ↓
Phase 4: Separately Approved Canonical Import (Proposal B Week 6 verified ESPN import + manifest)
               ↓
Phase 5: Transactional Activation & Concurrent Index Transition (Proposals C, D2)
               ↓
Phase 6: Independent Postcheck Verification (Tripwire, 80 picks joined, 0 orphan records)
               ↓
Phase 7: Compatible Backend Deployment with Write Capabilities Disabled (Gated flags)
               ↓
Phase 8: Client Exposure Only After Security Gate Passes (Release write hold)
```

### 7.2 Security-Preserving Forward Recovery Invariants
- **No Insecure Rollback:** If an operational anomaly occurs post-cutover, never reinstate permissive policies that expose pre-kickoff picks or lack kickoff guards.
- **Fail-Closed Write Hold:** If any phase fails, `APP_WRITE_HOLD = true` remains permanently engaged until a human operator investigates. An automated retry script must NEVER unset `APP_WRITE_HOLD`.
- **No Destructive Drops:** Tables (`weekly_wrapups`, `weekly_slate_manifests`), columns (`season`, `week`), manifests, accepted picks, or committed settlement entries are NEVER DROPPED.
- **Financial & Settlement Invariance:** Committed settlement markers in `weekly_wrapups` are permanent. Erroneous settlements must be compensated via offsetting reversal entries in `penalty_ledger` (`delta = -original_delta` with audit reason).
- **Stop Condition Supremacy:** Any operational condition requiring unvetted destructive reversal SQL is an immediate **STOP CONDITION**.

---

## 8. Exact Tested SQL Proposal Hashes (SHA-256)

| Script File | Target Proposal | SHA-256 Hash |
| :--- | :--- | :--- |
| `00_init_auth_and_roles.sql` | Test Scaffolding (Auth & Roles) | `7c907e8090ecafbee143a251b0391eeb90bfddaa30dad3493ed672d36204f727` |
| `01_baseline_schema.sql` | Baseline Catalog Reproduction | `d2fea221766aaf973e4dec62a91e1c2aa985de038c4ce6b4dadf42ac46d9e1bd` |
| `02_proposal_a_games_manifest.sql` | Proposal A: Games & Manifest DDL | `50926ff835a1d1c3f9a90c38d7fd99570a814478e5fb0f627d46d09f9ecdbb21` |
| `03_proposal_b_games_import.sql` | Proposal B: Canonical Games Import | `2e0f7e8a1703df9a3ea736a99afc74a52b83eb5fb2feb5db81928a4a3f65b472` |
| `04_proposal_c_submissions_designation.sql` | Proposal C: Season-Safe Submissions | `abcc55fcbd90eed210ed03923dd9ec6c598373f36c1de3d061fc40b66b7f0e0d` |
| `05_proposal_d_settlement_ledger.sql` | Proposal D: Settlement Store & Ledger | `b7f60eb9d46ca820be25118f4b4506835ddc13e12b297b5f6bd88a34c61fddbe` |
| `06_proposal_e_picks_security.sql` | Proposal E: Pick Security, RLS & Trigger | `a39e8ba26e5ceaba8d405926c184862060dce0bb379d8cd69748513957776e96` |

---

## 9. Comprehensive Execution Outcomes

### 9.1 Isolated Native PG 17.6 + PostgREST 16.4 Suite
- **Command:** `npx tsx scratch/test_db_runner/run_isolated_validation.js`
- **Engine:** PostgreSQL 17.6 on `127.0.0.1:54329`, database `pickem_pg17_isolated_db`
- **Gateway:** PostgREST 16.4 on `127.0.0.1:3001`
- **Results Breakdown:**
  - Prior Scope: 45 baseline schema, catalog preservation, settlement protocol, and RLS checks (**45 PASS**).
  - New Contract Corrections: 15 checks covering timezone invariance, writes waiting across kickoff, pick immutability, team normalization, safe DTO RPC, real wrapUpEngine transaction path, slate completeness, zero-pick members, and activation gating (**15 PASS**).
- **Total Isolated Checks:** **60 PASS, 0 FAIL, 0 NOT_RUN (100% PASS)**
- **Audit Artifact:** `docs/evidence/P41_POST_PURGE_VALIDATION/isolated_validation_summary.json`

### 9.2 Authoritative Vitest Suites (Phase 41)
- **Commands:**
  - Core suites: `npx vitest run tests/phase41_authoritative_slate_persistence.test.ts tests/phase41_p0_provider_integrity.test.ts tests/phase41_slate_settlement_integration.test.ts tests/phase41_p41_final_acceptance.test.ts tests/phase41_runtime_mock_purge.test.ts tests/phase41_worker_coordination.test.ts` (52 tests, 100% PASS)
  - Security & CORS suites: `npx vitest run tests/phase41_auth_trust_contract.test.ts tests/phase41_client_bootstrap_security.test.ts tests/phase41_render_free_cors.test.ts tests/phase41_render_free_safety.test.ts tests/phase41_s1_bigboard_alerts_social.test.ts tests/phase41_s2_lounge_reactions_consistency.test.ts tests/phase41_s2_persistence_rehearsal.test.ts` (118 tests, 100% PASS)
- **Total Phase 41 Vitest Tests:** **170 PASS, 0 FAIL**

### 9.3 Build Verification
- **Backend TypeScript Build (`npm run build`):** Exit code 0 (`tsc` succeeded cleanly).
- **Client TypeScript & Vite Bundle (`npm --prefix client run build`):** Exit code 0 (`tsc -b && vite build` succeeded cleanly).
- **Frozen Migration Immutability (`git diff --exit-code 926d541 -- prisma/schema.prisma prisma/migrations`):** Exit code 0 (Bit-identical match against checkpoint).
- **Committed Whitespace Check (`git diff --check`):** Clean (zero errors).
- **Working Tree:** Clean, unpushed. Decision #53 strictly **HELD**.

---

## 10. Final Disposition

`P41_DB_PROPOSALS_AND_PG17_VALIDATED — GATEKEEPER_REVIEW_PENDING`

**Summary Statement:**
All database proposals (A–E) have been reconciled, corrected, and validated against native **PostgreSQL 17.6** and **PostgREST 16.4**. Legacy 16-game catalog preservation is verified with bit-identical SHA-256 pre/post hashes and unassigned nullable metadata. Real service execution via `wrapUpEngine` confirms single-transaction atomicity, slate completeness gating, zero-pick roster member handling, and activation control fail-closed security. Blanket `games` SELECT privileges have been revoked in favor of the authenticated pool-scoped DTO RPC `get_pool_canonical_games`. Decision #53 remains strictly **HELD** with zero remote pushes and zero production mutations.
