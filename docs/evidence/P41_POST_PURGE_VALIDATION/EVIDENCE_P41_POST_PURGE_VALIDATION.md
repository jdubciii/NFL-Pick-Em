# P41 Post-Purge Evidence and Isolated Database Validation Report

**AUTHORITY:** `P41-POST-PURGE-VALIDATION-2026-10-18-01`  
**WORKSPACE:** `C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em`  
**BRANCH:** `feat/p37-shell-auth-openslate`  
**BASELINE LOCAL HEAD:** `49955d39fd470b08c9c885e653cb52cf897b96db`  
**DATE:** 2026-10-18  
**GOVERNING DIRECTIVE:** Local mock remediation accepted. Strict preservation of local HEAD and preceding commits. Zero production DDL, RLS modification, data rewrite, or remote push. Decision #53 HELD.

---

## 1. Owner Clarification & Sporting Disposition

- **Submission Nature:** All current production picks recorded in `public.picks` (`week = 6`) are non-competitive test submissions generated during technical verification sprints.
- **Sporting Outcome:** There is **no sporting outcome to adjudicate**, no league winner/loser dispute, and no member repair or historical penalty reconciliation required.
- **Production Guard:** **No historical sweep, reset, or production repair is authorized or executed.** Historical records remain untouched.

---

## 2. Bounded Display Forensics

### 2.1 Preserved Released Source, Web Assets & Distributed Android Artifacts

| Artifact Name | Version Code / Name | Exact File Size | SHA-256 Digest | Source Commit SHA | Inlined Web Asset Identifiers |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `pickem-v73-s2.apk` / `app-release.apk` | `73` / `41.3.1` | 6,995,304 B | `2D27D588D2A3D62CF29856DB49B8266ABE5C88C97818FF1FB36E57E5CD1D25C4` | `a0c839abb690d89f72ef4050f22ca39d2e1d09c1` | `index.html` (497 B), `index-BWINUVan.js` (876,863 B, SHA-256 `E4903B88266A...`), `index-Bql-ZanU.css` (180,276 B) |
| `pickem-v41-s2.apk` | `71` / `41.2.2` | 14,719,600 B | `BCC10F78899282FF3EB7F1B6FA127C3682986E60D1B58C025A626040509BF437` | `926d541a8951206a2f035900b2d4f118c47deaa8` | `index.html` (497 B), `index-BWINUVan.js`, `index-Bql-ZanU.css` |
| Local Current HEAD | — | — | — | `49955d39fd470b08c9c885e653cb52cf897b96db` | Source repository HEAD with dynamic reminder resolution and mock purge |

*Cryptographic Signature Proof*: `pickem-v73-s2.apk` verified using APK Signature Scheme v2 (`true`). Signer DN: `CN=NFLPickEm, OU=Engineering, O=League, L=Phoenix, ST=AZ, C=US`. Certificate SHA-256: `0f4397ffa90b7934d49bbe58317839fd534e36f7d483cda52ce29e960af2e9a4`.

### 2.2 Inspection of Fallback Paths in Preserved Released Artifact (`pickem-v73-s2.apk`)

Direct inspection of compiled JavaScript asset `assets/public/assets/index-BWINUVan.js` extracted from `pickem-v73-s2.apk`:
1. **Kickoff Fallback Dictionary (`Nu(e)` / `CANONICAL_WEEK6_SCHEDULE`)**:
   - `index-BWINUVan.js` contained a compiled schedule map `i={"SEA@DEN":{iso:"2026-10-16T00:15:00.000Z",label:"Thu 5:15 PM",fallbackId:"g-w6-sea-den"}, ...}`.
   - When a game lacked a valid kickoff timestamp from the database (because `public.games` had 0 rows for Week 6), the client code resolved to synthetic IDs (`g-w6-*`) and hardcoded timestamps.
2. **Profile Reminder Windows (`week6WindowGames`)**:
   - `ProfilePage.tsx` at commit `a0c839a` hardcoded 4 games: `g-w6-sea-den`, `g-w6-hou-jax`, `g-w6-chi-atl`, and `g-w6-mia-ind`.
   - This included `MIA @ IND`, even though the Miami Dolphins were on bye in Week 6 (`teamsOnBye: [CIN, DET, MIA, MIN]`).
3. **BigBoard Duel Decider Fallback**:
   - `WatchPartyBigBoardModal.tsx` contained static fallback pairings when dynamic duel participants were missing.

### 2.3 Forensics Integrity Classification

- **Confirmed Historical Display:** In production test submissions, members made picks on 9 games (saved in `public.picks` with `week = 6`, e.g. game IDs `401872995`..`401873003`). `WeeklyPicks.tsx` rendered games using the live ESPN scoreboard API (`fetchLiveNFLScores()`), which returned live ESPN text event IDs (`401872995`..`401873003`).
- **Reachability in Inspected Released Artifact (`pickem-v73-s2.apk`):** Reachability is confirmed for anyone navigating to the Profile reminder section: the 4 hardcoded games (including `MIA @ IND`) were statically loaded into `week6WindowGames` and fed into `deadlineAlertPlanner`. Similarly, any game rendered without an authoritative kickoff timestamp triggered the `CANONICAL_WEEK6_SCHEDULE` fallback dictionary.
- **Absence Within Defined Inspection Scope:** Within `pickem-v73-s2.apk`, no dynamic query to `weekly_slate_manifests` existed because the manifest table was nonexecuted in production. In the hosted Supabase database, `public.games` contained 16 Week 5 games but 0 Week 6 games.
- **Inconclusive History:** Whether an individual member viewed the Profile notification schedule at an exact timestamp cannot be inferred from `updated_at` (per prompt instruction). Whether an individual client device displayed the live ESPN feed vs fallback states during early pick testing depended on ESPN network reachability on that physical device at runtime.

### 2.4 Correction Under Equivalent Isolated Inputs

The remediation across commits `d3e3ac0`, `e3ba5b9`, `3377820`, and `49955d3` (HEAD) was demonstrated and verified in `tests/phase41_runtime_mock_purge.test.ts` (12 tests, 100% PASS):
1. `resolveCanonicalGameKickoff`: Hardcoded `CANONICAL_WEEK6_SCHEDULE` dictionary purged. Without authoritative input, returns `status: 'UNAVAILABLE'`, `isResolved: false`, failing closed with `isKickoffLocked = true` (Decision #55).
2. `ProfilePage.tsx`: Hardcoded `week6WindowGames` purged. Reminder windows dynamically resolved via `resolveProfileReminderScope` querying active pool membership and accepted slate manifests.
3. Team Identity Normalization: Canonical platform code `WAS` losslessly maps input alias `WSH` (`normalizeTeamIdentity`), and `areTeamIdentitiesEquivalent` ensures legacy pick records join canonical events without modifying historical database rows.

---

## 3. Native Test Environment & Isolation Proof

### 3.1 Binaries & Download Provenance

- **PostgreSQL 18.6:** Local native Windows installation at `C:\Program Files\PostgreSQL\18\bin\postgres.exe` (x86_64-windows, compiled by msvc-19.44.35229, 64-bit). Subtools used: `initdb.exe`, `createdb.exe`, `psql.exe`, `pg_ctl.exe`.
- **PostgREST 16.4:** Official GitHub release archive downloaded from `https://github.com/PostgREST/postgrest/releases/download/v16.4/postgrest-v16.4-windows-x86-64.zip`.
  - Extracted binary: `scratch/tools/postgrest.exe`
  - Exact file size: `65,320,448 bytes`
  - SHA-256 Digest: `C4155000DFB0BEFB59215B65D61A621BBAEA1515F36A6E758FC504C7CA0DCBEE`
  - Dynamic link dependency: `libpq.dll` resolved directly from `C:\Program Files\PostgreSQL\18\bin\libpq.dll`.

### 3.2 Target Identity & Fail-Closed Isolation Proof

- **Cluster Directory:** `scratch/test_pg_cluster` (100% task-owned, gitignored, isolated from global services).
- **Network Binding:** Strictly loopback `127.0.0.1` on dedicated port `54329` (PostgreSQL) and `127.0.0.1:3001` (PostgREST).
- **Target Database:** `pickem_isolated_test_db`.
- **Preflight Verification Query:**
  ```sql
  SELECT current_database() as db, current_user as usr, inet_server_addr() as addr, inet_server_port() as port;
  ```
  Result: `db = 'pickem_isolated_test_db'`, `usr = 'postgres'`, `addr = '127.0.0.1'`, `port = 54329`.
- **Fail-Closed Target Guard:** Target check verifies exact identity before any DDL or test execution; any mismatch terminates execution immediately.
- **Zero Production Environment Contamination:** Zero production environment files (`.env.hosted`, `.env.production`) were loaded. Zero production data was cloned. Zero Windows services were installed. Zero global system configuration was altered. Zero Docker containers were introduced. Zero cloud resources were provisioned.

### 3.3 Supabase-Specific Test Scaffolding Documentation

- **Scaffolding Applied (`00_init_auth_and_roles.sql`):**
  - Schema `auth` and table `auth.users (id uuid PRIMARY KEY, email text, created_at timestamptz)`.
  - Functions `auth.uid()` and `auth.role()` extracting claims from `request.jwt.claims->>'sub'` and `request.jwt.claim.sub`.
  - Roles: `anon`, `authenticated`, `service_role`, `authenticator`.
- **What Scaffolding Proves:** Proves PostgreSQL RLS policies, trigger guards, session-level `SET request.jwt.claim.sub`, and native PostgREST HTTP token authentication execute with exact parity.
- **What Scaffolding Does NOT Prove:** Does not prove Supabase Cloud managed services (e.g., Supabase Auth GoTrue SMTP email delivery, Supabase S3-compatible Storage buckets, Supabase Realtime WebSocket replication, or PostgREST schema cache automatic reload via hosted webhooks).

---

## 4. Exact Tested SQL Proposal Hashes (SHA-256)

All candidate SQL scripts were executed as exact, hashed inputs:

| Script File | Target Proposal | SHA-256 Hash |
| :--- | :--- | :--- |
| `00_init_auth_and_roles.sql` | Test Scaffolding (Auth & Roles) | `7c907e8090ecafbee143a251b0391eeb90bfddaa30dad3493ed672d36204f727` |
| `01_baseline_schema.sql` | Baseline Catalog Reproduction | `1147071e91bbee53cf9b8bfe88a302523e5fbb3141a07f2f9300bd9d0565c89b` |
| `02_proposal_a_games_manifest.sql` | Proposal A: Games & Manifest DDL | `5ee2271dd1e76d20084311e873e9dc822553cd040119b35d9a92c19fee63baf2` |
| `03_proposal_b_games_import.sql` | Proposal B: Canonical Games Import | `43446c507b93ae6914d5c6bdbc376199ba0c42e269f8f605805be76844b94e37` |
| `04_proposal_c_submissions_designation.sql` | Proposal C: Season-Safe Submissions | `abcc55fcbd90eed210ed03923dd9ec6c598373f36c1de3d061fc40b66b7f0e0d` |
| `05_proposal_d_settlement_ledger.sql` | Proposal D: Settlement Store & Ledger | `b7f60eb9d46ca820be25118f4b4506835ddc13e12b297b5f6bd88a34c61fddbe` |
| `06_proposal_e_picks_security.sql` | Proposal E: Pick Security, RLS & Trigger | `bcf8b580eaa9a9af5b700dc489dd6572d4f58a98ee8fc08f58ba1c097c8e9b8a` |

---

## 5. Real Database & Client-Path Test Execution Results

**Execution Command:** `npx tsx scratch/test_db_runner/run_isolated_validation.js`  
**Total Tests Executed:** 42  
**Results:** **42 PASS, 0 FAIL, 0 NOT_RUN**

### 5.1 Test Outcome Breakdown by Layer & Group

| # | Group | Layer | Test Description | Outcome |
|---|---|---|---|---|
| 1 | Preflight | SQL | Fail-Closed Target Identity Verification (`127.0.0.1:54329/pickem_isolated_test_db`) | **PASS** |
| 2 | Baseline | SQL | Apply `00_init_auth_and_roles.sql` | **PASS** |
| 3 | Baseline | SQL | Apply `01_baseline_schema.sql` (exact live catalog reproduction) | **PASS** |
| 4 | Seeding | SQL | Seed Synthetic Users, Pools, Memberships & Historical Baseline Picks | **PASS** |
| 5 | Proposals | SQL | Proposal A: Canonical Games & Weekly Slate Manifests DDL | **PASS** |
| 6 | Proposals | SQL | Proposal B: Canonical Games Import (Week 6 14-Event Schedule) | **PASS** |
| 7 | Proposals | SQL | Proposal C: Season-Safe Submissions and Designation DDL | **PASS** |
| 8 | Proposals | SQL | Proposal D: Settlement Records & Penalty Ledger Attribution DDL | **PASS** |
| 9 | Proposals | SQL | Proposal E: Direct Supabase Pick Security, Grants & Trigger Guards | **PASS** |
| 10 | Prisma | ORM | Prisma Model Schema Compatibility Reads (`Game`, `Pool`, `Membership`, `Pick`) | **PASS** |
| 11 | Gateway | HTTP | PostgREST 16.4 Native Gateway Bound & Ready on `127.0.0.1:3001` | **PASS** |
| 12 | RLS_SELECT | SQL | Member A sees Member B pick AFTER kickoff (`401872995`) | **PASS** |
| 13 | RLS_SELECT | SQL | Member A CANNOT see Member B pick BEFORE kickoff (Privacy protection on `401873008`) | **PASS** |
| 14 | RLS_SELECT | SQL | Inactive member CANNOT see other members picks after kickoff | **PASS** |
| 15 | RLS_SELECT | SQL | Nonmember CANNOT see pool picks after kickoff | **PASS** |
| 16 | RLS_SELECT | SQL | Cross-pool member CANNOT see Pool 1 picks after kickoff | **PASS** |
| 17 | Picks_Mutation | SQL | Member A inserts pick BEFORE kickoff (`401873007`) | **PASS** |
| 18 | Picks_Mutation | SQL | Member A updates pick BEFORE kickoff (`401873007`) | **PASS** |
| 19 | Picks_Mutation | SQL | Member A deletes pick BEFORE kickoff (`401873007`) | **PASS** |
| 20 | Kickoff_Lock | SQL | Member A INSERT rejected AFTER kickoff (Trigger / RLS check on `401872995`) | **PASS** |
| 21 | Kickoff_Lock | SQL | Member B UPDATE rejected AFTER kickoff (RLS / Trigger `KICKOFF_LOCKED`) | **PASS** |
| 22 | Kickoff_Lock | SQL | Member B DELETE rejected AFTER kickoff (RLS blocks delete, 0 rows affected) | **PASS** |
| 23 | Immutability | SQL | Trigger guards `pool_id` immutability on UPDATE (`CANNOT_MUTATE_PICK_POOL_ID`) | **PASS** |
| 24 | Immutability | SQL | Trigger guards `user_id` immutability on UPDATE (`CANNOT_MUTATE_PICK_USER_ID`) | **PASS** |
| 25 | Immutability | SQL | Trigger guards `week` immutability on UPDATE (`CANNOT_MUTATE_PICK_WEEK`) | **PASS** |
| 26 | HTTP_Gateway | HTTP | HTTP POST `/picks`: Member A inserts pick for future game via PostgREST (201 Created) | **PASS** |
| 27 | HTTP_Gateway | HTTP | HTTP Upsert: Member A upserts pick via `Prefer: resolution=merge-duplicates` | **PASS** |
| 28 | HTTP_Gateway | HTTP | HTTP POST rejected for past game: `KICKOFF_LOCKED` enforced (400 Bad Request) | **PASS** |
| 29 | HTTP_Gateway | HTTP | HTTP POST rejected for nonmember: RLS active membership check (403 Forbidden) | **PASS** |
| 30 | HTTP_Gateway | HTTP | HTTP GET `/picks` preserves kickoff privacy: Member B's unkicked pick hidden | **PASS** |
| 31 | Submissions | SQL | Insert weekly submission for Season 2026 Week 6 | **PASS** |
| 32 | Submissions | SQL | Cross-Season Collision Prevention: 2026 and 2027 same week coexist | **PASS** |
| 33 | Submissions | SQL | Duplicate submission in same season/week rejected by replacement unique index | **PASS** |
| 34 | Designation | SQL | Designation storage within `pools.settings`: Detroit Lions BYE correctly handled | **PASS** |
| 35 | Settlement | Logic | Complete-Slate FINAL requirement: settlement blocked when games are SCHEDULED | **PASS** |
| 36 | Concurrency | SQL | Two-process settlement concurrency: exactly ONE claim wins, second is rejected | **PASS** |
| 37 | Rollback | SQL | Atomic failure and rollback: zero orphan penalty ledger rows committed | **PASS** |
| 38 | Concurrency | SQL | Refresh-versus-settlement race: concurrent score update does not corrupt claim | **PASS** |
| 39 | Ledger | SQL | Duplicate-charge prevention: partial unique index blocks second settlement penalty | **PASS** |
| 40 | Ledger | SQL | Idempotent retry: subsequent settlement returns 0 rows without modifying store | **PASS** |
| 41 | Tiebreaker | Logic | Ratified tiebreaker ranking: points priority, tiebreaker prediction distance | **PASS** |
| 42 | Tiebreaker | Logic | Ratified tier penalties: Dead Place receives 2.5 shots per ratified schedule | **PASS** |

### 5.2 Independent-Process Concurrency & Rollback Evidence

- **Two-Process Settlement Claim Race:** Two concurrent database connections executed:
  ```sql
  INSERT INTO public.weekly_wrapups (pool_id, season, week_number, applied_by, input_fingerprint, accepted_revision)
  VALUES ('11111111-1111-1111-1111-111111111111', 2026, 6, '...', '...', 1)
  ON CONFLICT (pool_id, season, week_number) DO NOTHING
  RETURNING pool_id, season, week_number;
  ```
  Result: Connection A returned 1 row (winner). Connection B returned 0 rows (loser / idempotent abort). Exactly 1 row committed in `weekly_wrapups`.
- **Atomic Failure & Rollback Proof:** An explicit exception raised inside a multi-statement transaction after inserting a candidate penalty into `public.penalty_ledger` triggered `ROLLBACK`. Query verification confirmed exactly 0 penalty rows committed.
- **Deduplication Partial Index Proof:** Attempting to insert a duplicate penalty charge with reason `WEEKLY_SETTLEMENT_S2026_W6_DEAD_PLACE` for the same member/pool/season/week raised PostgreSQL unique constraint violation error `23505` (`idx_penalty_ledger_settlement_unique`).

---

## 6. Exact Proposal Review Package (Proposals A–E)

### Proposal A — Canonical Games & Weekly Slate Manifests
- **Catalog Comparison:** Additive only. Preserves `games.id` (UUID), `external_game_id`, `home_score`, `away_score`, `status`. Adds `season`, `season_type`, `week`, `observation_time`, `manifest_revision`.
- **Preservation Check:** Classifies existing 16 Week 5 games safely (`WHERE external_game_id ILIKE '2026_w05_%'`). 0 rows dropped.
- **Dependencies:** None.

### Proposal B — Canonical Games Import (Separated Data Operation)
- **Status:** Proposed data operation only. Verified against live HTTPS ESPN capture (`docs/evidence/P41_ESPN_LIVE_CAPTURE/espn_week6_2026_raw.json`, SHA-256 `f0826e586f9ccef338076212bd96708ae1d0ce007d7500e7208bc45ee29c3bae`).
- **Join Effect:** All 80 saved Week 6 picks across 9 events join canonical games. 0 orphan picks.
- **Dependencies:** Proposal A must be applied first.

### Proposal C — Season-Safe Submissions and Designation
- **Catalog Comparison:** Replaces verified legacy unique constraint `weekly_submissions_pool_id_user_id_week_number_key` on `(pool_id, user_id, week_number)` with season-aware unique index `(pool_id, season, season_type, week_number, user_id)`.
- **Designation Storage:** Stored strictly within `pools.settings` JSONB under `season_tiebreaker_config`. Zero orphan tables.
- **Dependencies:** None.

### Proposal D — Settlement Records & Penalty Ledger Attribution
- **Catalog Comparison:** Introduces `public.weekly_wrapups` with composite primary key `(pool_id, season, week_number)`. Extends `public.penalty_ledger` with `season` and `settlement_attribution`. Adds partial unique index `idx_penalty_ledger_settlement_unique`.
- **Dependencies:** `public.pools`, `public.penalty_ledger`.

### Proposal E — Direct Supabase Pick Security, Grants & Trigger Guards
- **Catalog Comparison:** Drops over-permissive policies `Allow authenticated read picks` and `Allow user upsert own picks`. Implements kickoff-enforced `SELECT`, `INSERT`, `UPDATE`, `DELETE` policies and `BEFORE INSERT OR UPDATE` trigger guard.
- **Preservation:** Preserves direct Supabase client pick-saving flow while eliminating all pre-kickoff opponent pick leakage and post-kickoff modification escapes.
- **Dependencies:** Proposal A (requires `games.kickoff_time` relation).

### Rollback & Cutover Order
1. **Application Cutover:** Deploy backend and client updates supporting season-aware keys.
2. **Schema Cutover:** Apply Proposal A -> Proposal C -> Proposal D -> Proposal E.
3. **Data Operation:** Apply Proposal B (Canonical Games Import).
4. **Rollback Protocol:** If rolled back, reverse Proposal E (restore legacy policies) -> drop Proposal D partial index -> restore Proposal C legacy unique index -> drop Proposal A additive columns.

---

## 7. Explicit Compatibility Limitations & NOT_RUN Items

1. **Hardware / Device-Session Physical Acceptance:** Physical Android notification shade delivery, background push receipt, and notification tap handling require physical device interaction and remain **NOT RUN** (as established in `P41_FINAL_ACCEPTANCE` audit).
2. **PostgREST Schema Reload Notification:** In hosted Supabase, DDL requires `NOTIFY pgrst, 'reload schema';` to reload the PostgREST cache. In the isolated local harness, PostgREST was started after DDL was applied.
3. **Prior Authoritative Evidence:** The prior 228-test suite, client production build, and 6-domain Decision #61 service mirror parity audits are carried forward as **agent-reported historical evidence** (from baseline commit `49955d39fd470b08c9c885e653cb52cf897b96db`) and are not described as newly or independently executed during this isolated database validation run.

---

## 8. Summary & Status Certification

- **Local Working Tree:** Clean. Local HEAD preserved at `49955d39fd470b08c9c885e653cb52cf897b96db`.
- **Isolated Validation:** 42 / 42 tests PASSED on native PostgreSQL 18.6 and native PostgREST 16.4.
- **Production Hold:** Zero production execution was performed.
- **Remote Push:** Zero remote git pushes executed. Decision #53 remains strictly **HELD**.
