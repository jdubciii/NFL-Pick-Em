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

## 5. Complete Multi-Step Settlement Transaction & Concurrency Protocol

The complete 10-step settlement protocol was executed against PostgreSQL 17.6 using independent client connections:
1. **Manifest Revision Selection:** Official Week 6 slate manifest persisted with `revision = 1`, `event_ids = ARRAY['401872995'..'401873008']`, fingerprint `c72f7e4c7a55...`.
2. **Read-Only Preview & Input Fingerprint:** Evaluated via `previewWeeklyWrapUpForPool`. Blocks unfinalized slates (`WEEK_NOT_FINAL`).
3. **Stale Preview / Refresh Fail-Closed:** `executeWeeklyWrapUpForPool` called with `previewRevision: 999` while manifest is at revision 1. Fails closed immediately with `{ applied: false, reason: 'STALE_PREVIEW_REVISION' }` before any claim is attempted.
4. **Two-Process Concurrent Claim Race:** Two independent database connections simultaneously executed:
   ```sql
   INSERT INTO public.weekly_wrapups (pool_id, season, week_number, applied_by, input_fingerprint, accepted_revision)
   VALUES ('9b893bef-...', 2026, 6, '...', '...', 1)
   ON CONFLICT (pool_id, season, week_number) DO NOTHING
   RETURNING pool_id, season, week_number;
   ```
   **Result:** Exactly **ONE claim returned 1 row (winner)**; the competing process returned **0 rows (loser / conflict signal)**.
5. **Audit Snapshot & Member Ledger Charges:**
   - Full JSONB audit snapshot persisted in `weekly_wrapups.summary`.
   - Discrete weekly charges written to `public.penalty_ledger` with `(pool_id, user_id, season, week_number, delta, reason, created_by)`.
6. **Atomic Rollback Proof:** An explicit failure inside an independent transaction (`RAISE_INTENTIONAL_ERROR_TRIGGERING_ROLLBACK`) triggered `ROLLBACK`. Query verification confirmed **exactly 0 orphan rows** committed in `public.penalty_ledger`.
7. **Idempotent Retry & Duplicate Charge Prevention:**
   - Retrying the committed settlement received conflict signal (0 rows). The engine retrieved and returned the existing committed result with `accepted_revision = 1` and full audit snapshot.
   - Attempting to insert a duplicate penalty charge was rejected by partial unique index `idx_penalty_ledger_settlement_unique` (PostgreSQL error `23505`).

---

## 6. Non-Bypass RLS & Direct PostgREST 16.4 Gateway Review

### 6.1 Policy & Grant Inventory
- Over-permissive legacy policies dropped:
  - `DROP POLICY IF EXISTS "Allow authenticated read picks" ON public.picks;`
  - `DROP POLICY IF EXISTS "Allow user upsert own picks" ON public.picks;`
- Restrictive granular policies activated:
  - `Allow authenticated read own picks`: Owner can always view their own picks.
  - `Allow active pool members read post kickoff picks`: Other members can only view picks after official kickoff (`g.kickoff_time <= now()`) and must hold `status = 'ACTIVE'` in the same pool.
  - `Allow active pool members insert own picks before kickoff`: Authenticated user inserting own pick before kickoff (`g.kickoff_time > now()`).
  - `Allow active pool members update own picks before kickoff`: Authenticated user updating own pick before kickoff.
  - `Allow active pool members delete own picks before kickoff`: Authenticated user deleting own pick before kickoff.
- Unauthorized Games Mutation Denial:
  ```sql
  REVOKE INSERT, UPDATE, DELETE ON public.games FROM anon, authenticated;
  GRANT SELECT ON public.games TO anon, authenticated;
  ```
  Verified: Authenticated user attempting to alter game kickoff time received `permission denied for table games` (PostgreSQL error `42501`).
- Immutability Trigger Guard:
  `trg_enforce_pick_kickoff_lock` blocks mutations to `pool_id`, `user_id`, and `week` on existing rows.

### 6.2 Native PostgREST 16.4 Gateway Test Results
PostgREST 16.4 was spawned natively on port `3001` connecting to PostgreSQL 17.6:
- **HTTP POST `/picks` (Future Game):** Member 01 inserts pick for upcoming game -> **201 Created**.
- **HTTP Upsert (`Prefer: resolution=merge-duplicates`):** Member 01 updates selection -> **201 Created / 200 OK**.
- **HTTP POST (Past Game):** Member 02 attempts pick on past game (`401872995`) -> **400 Bad Request** (`KICKOFF_LOCKED`).
- **HTTP POST (Nonmember):** Nonmember attempts pick in Pool 1 -> **403 Forbidden** (gated by RLS membership check).
- **HTTP GET `/picks` (Privacy):** Member 01 queries `/picks` -> sees Member 02's pick on past game (`401872995`), but Member 02's unkicked pick (`401873008`) is **hidden / stripped**.

---

## 7. Staged Production Cutover & Security-Preserving Forward Recovery Plan

### 7.1 Cutover Sequence
```
Stage 1 (Backward-Compatible Schema DDL):
  Apply Proposal A (additive nullable columns on games; manifest table)
  Apply Proposal C (season-aware unique index on weekly_submissions)
  Apply Proposal D (weekly_wrapups composite key; penalty_ledger season attribution)
  [Old and new client/backend versions operate concurrently without degradation]

Stage 2 (Application Cutover):
  Deploy updated backend and client artifacts supporting season-aware keys and manifest queries.
  Verify application health and read compatibility.

Stage 3 (Canonical Games Import):
  Execute Proposal B (Week 6 14-Event Schedule import into public.games).
  Persist official Weekly Slate Manifest (Revision 1).
  Verify 100% of saved picks join canonical events.

Stage 4 (Direct Supabase Security Cutover):
  Apply Proposal E (Replace permissive pick RLS with kickoff-enforced policies, immutability trigger guard, and revoke games write privileges).
  Verify PostgREST schema cache reload (NOTIFY pgrst, 'reload schema';).

Stage 5 (Settlement & Refresh Activation):
  Enable automated settlement workers and commissioner refresh endpoints.
```

### 7.2 Security-Preserving Forward Recovery Invariants
- **No Automatic Reversal to Permissive RLS:** If an issue arises post-cutover, never reinstate over-permissive policies that expose pre-kickoff picks to opponents. Fix forward under explicit review.
- **Zero Data Loss on Rollback:** Never drop tables (`weekly_slate_manifests`, `weekly_wrapups`), columns (`season`, `week`), or ledger records containing newly accepted member picks or official charges.
- **Fail-Closed Gate Preservation:** If manifest or settlement verification fails, official settlement remains locked. Stale previews fail closed without modifying stored records.

---

## 8. Exact Tested SQL Proposal Hashes (SHA-256)

| Script File | Target Proposal | SHA-256 Hash |
| :--- | :--- | :--- |
| `00_init_auth_and_roles.sql` | Test Scaffolding (Auth & Roles) | `7c907e8090ecafbee143a251b0391eeb90bfddaa30dad3493ed672d36204f727` |
| `01_baseline_schema.sql` | Baseline Catalog Reproduction | `94033fbbad968577298c3ad16a8af633d7cf9918b18a6e5fee444265e83d050b` |
| `02_proposal_a_games_manifest.sql` | Proposal A: Games & Manifest DDL | `119d349e2a80669379ae5d5531482593c7637d0a7ff46e475c8da97d2b352d17` |
| `03_proposal_b_games_import.sql` | Proposal B: Canonical Games Import | `43446c507b93ae6914d5c6bdbc376199ba0c42e269f8f605805be76844b94e37` |
| `04_proposal_c_submissions_designation.sql` | Proposal C: Season-Safe Submissions | `abcc55fcbd90eed210ed03923dd9ec6c598373f36c1de3d061fc40b66b7f0e0d` |
| `05_proposal_d_settlement_ledger.sql` | Proposal D: Settlement Store & Ledger | `b7f60eb9d46ca820be25118f4b4506835ddc13e12b297b5f6bd88a34c61fddbe` |
| `06_proposal_e_picks_security.sql` | Proposal E: Pick Security, RLS & Trigger | `fb059cbb3f8d74b7a4bb59d61c89b9fe225594801080ddcc19a94e2d8fd626b5` |

---

## 9. Comprehensive Execution Outcomes

### 9.1 Isolated Native PG 17.6 + PostgREST 16.4 Suite
- **Command:** `npx tsx scratch/test_db_runner/run_isolated_validation.js`
- **Engine:** PostgreSQL 17.6 on `127.0.0.1:54329`, database `pickem_pg17_isolated_db`
- **Gateway:** PostgREST 16.4 on `127.0.0.1:3001`
- **Total Checks:** **45 PASS, 0 FAIL, 0 NOT_RUN (100% PASS)**

### 9.2 Focused Vitest Suites (Phase 41)
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
All five database proposals (A–E) have been corrected and fully validated against a production-major-version-matched **PostgreSQL 17.6** cluster and **PostgREST 16.4** gateway. Legacy 16-game catalog preservation is verified with bit-identical SHA-256 pre/post hashes and unassigned nullable metadata. The multi-step settlement protocol, stale-preview fail-closed gate, two-process concurrent claim race, atomic rollback, and idempotent committed-result retrieval are proven under independent connections. Decision #53 remains strictly **HELD** with zero remote pushes and zero production mutations.
