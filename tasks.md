# tasks.md

## Phase 1: Foundation & Persistence (Database) [✅ COMPLETED]
### Prompt 1.1: Database Initialization [✅]
> "Initialize a new Node.js and TypeScript project. I want to use PostgreSQL as my database and Prisma as my ORM. Please generate the `package.json` with the necessary dependencies, set up a basic `tsconfig.json`, and create a `docker-compose.yml` file that spins up a local PostgreSQL 16 instance. Include a `.env.example` file with the default database connection string."

### Prompt 1.2: Core Schema Execution [✅]
> "Initialize Prisma and update the `schema.prisma` file to include the core tables for our NFL Pick'em app. Use UUIDs for all primary keys. Create models: User, Pool, PoolMembership, and Game with their defined fields."

### Prompt 1.3: Transactional Schema Execution [✅]
> "Extend the `schema.prisma` file with our transactional tables ensuring strict relational integrity. Add Pick, PickResult, and AuditLog models. Run the command to create and apply the initial database migration."

### Prompt 1.4: ORM/Database Client Setup [✅]
> "Create a `src/db/client.ts` file that instantiates and exports a singleton Prisma Client. Then write a simple `src/db/test.ts` script to verify the connection."

## Phase 2: External Data Ingestion (Sync Worker) [✅ COMPLETED]
### Prompt 2.1: API Client Setup [✅]
> "Create a `src/services/nflApiClient.ts` file. Define a TypeScript interface for our expected NFL Game Data. Write a function that fetches the current week's NFL schedule and live scores using the public ESPN API."

### Prompt 2.2: The Sync Worker [✅]
> "Install `node-cron`. Create `src/workers/syncWorker.ts` and set up a cron job that runs every 5 minutes calling our `nflApiClient`."

### Prompt 2.3: Upsert Logic [✅]
> "Update `syncWorker.ts` to save the fetched ESPN data into PostgreSQL using Prisma's `upsert` on the `Game` model matching `external_game_id`."

### Prompt 2.4: Fallback Handling [✅]
> "Wrap the main logic inside `syncWorker.ts` in a robust try/catch block to log failures and exit gracefully without crashing if the NFL API is down."

## Phase 3: Core Backend & Game Mechanics (Picks & Locking) [✅ COMPLETED]
### Prompt 3.1: Auth & RBAC [✅]
> "Install `express`, `jsonwebtoken`, and `bcrypt`. Create a `/api/auth/login` endpoint and `requireAuth`/`requireAdmin` middlewares."

### Prompt 3.2: Pick Submission Endpoint [✅]
> "Create a `POST /api/picks` route protected by `requireAuth` to insert or update a record in the `Pick` table using a composite key."

### Prompt 3.3: Granular Locking Engine [✅]
> "Update `POST /api/picks` to calculate lock thresholds from `game.kickoff_time` minus `pool.lock_offset`. Reject late picks with a 403 status."

### Prompt 3.4: Admin Override & Audit Logging [✅]
> "Create a `PUT /api/admin/picks` route. Safely execute a Prisma `$transaction` to update the pick and append a record to the `AuditLog` table."

## Phase 4: Scoring Engine & Leaderboard [✅ COMPLETED]
### Prompt 4.1: Finalization Trigger [✅]
> "Update `syncWorker.ts` to detect when an incoming game status changes to 'FINAL'. Trigger a placeholder `gradeFinalizedGames` function."

### Prompt 4.2: Scoring Execution [✅]
> "Create `src/services/scoringEngine.ts`. Grade all picks for a finalized game against the winning team, assigning points based on pool settings."

### Prompt 4.3: Immutability Enforcement [✅]
> "Update the engine to commit results to the `PickResult` table. Skip any `pick_id` that already has an existing result to prevent double-scoring."

### Prompt 4.4: Leaderboard Aggregation [✅]
> "Create `GET /api/pools/:pool_id/leaderboard`. Fetch and sum up points awarded, sorting users descending, and append an `is_weekly_loser` flag to the lowest score."

## Phase 5: Client UI Integration (Frontend) [✅ COMPLETED]
### Prompt 5.1: Auth & Navigation UI [✅]
> "Initialize a Vite/React/TypeScript frontend with Tailwind. Build a global Auth Context, a Login component, and protected routing."

### Prompt 5.2: Weekly Slate & Picks UI [✅]
> "Create a `WeeklyPicks` component. Fetch upcoming games and render visually distinct matchup cards with interactive pick selection. Apply 'Locked' visual states."

### Prompt 5.3: Live Leaderboard & Penalty Tracker [✅]
> "Create a `Leaderboard` component displaying a data table sorted by total points. Highlight the row with `is_weekly_loser` in red."

### Prompt 5.4: Admin Dashboard [✅]
> "Create an `AdminDashboard` component to select users, override picks, and display toast notifications."

## Phase 6: League Simulation & Seed Data [✅ COMPLETED]
### Prompt 6.1: Mock User Generation [✅]
> "Create a `prisma/seed.ts` script. Generate 9 dummy users and establish `PoolMembership` records attaching them to a main pool."

### Prompt 6.2: Historical Game Seeding [✅]
> "Update `seed.ts` to insert an array of 16 mock NFL games with hardcoded 'FINAL' statuses and random scores."

### Prompt 6.3: Randomized Pick Distribution [✅]
> "Extend `seed.ts` to randomly distribute picks across all mock users for all seeded games."

### Prompt 6.4: Leaderboard Population [✅]
> "Execute the `gradeFinalizedGames` function at the end of the seed script to calculate points and populate the leaderboard."

## Phase 7: Cumulative Stats & Penalty Engine [✅ COMPLETED]
### Prompt 7.1: Schema Migrations [✅]
> "Update `schema.prisma` with `PoolMemberStat` and `PenaltyLedger` models. Generate the migration."

### Prompt 7.2: Finalization Pipeline [✅]
> "Create `executeWeeklyWrapUp(poolId, weekNo)`. Use a transaction to identify 1st and Dead Place, write to `PenaltyLedger`, and recalculate stats."

### Prompt 7.3: API Expansion [✅]
> "Add `GET /api/pools/:pool_id/leaderboard/cumulative` and `POST /api/pools/:pool_id/penalties/adjust` endpoints."

### Prompt 7.4: Wall of Shame UI [✅]
> "Build the `WallOfShame` component featuring a 'Dead Place Crown' banner, Shot Odometer, and season-long stat table."

### Prompt 7.5: Admin Controls UI [✅]
> "Build the `AdminPenaltyModal` to allow manual `PenaltyLedger` adjustments with a read-only audit history."

## Phase 8: Square Sheet Matrix & Precision Tiebreaker Engine [✅ COMPLETED]
*Instructions: Copy and paste the blocks below one by one into your Antigravity IDE. Do not proceed to the next prompt until the IDE successfully completes the current one.*

### Prompt 8.1: Precision Schema Migrations [✅]
> "Update the `schema.prisma` file. Change `total_shots_drank` in `PoolMemberStat` and `delta` in `PenaltyLedger` from `Int` to `Decimal` with a scale of 2. Add a new model called `WeeklySubmission` with `id`, `pool_id`, `member_id`, `week_number`, and `tie_breaker_prediction` (Decimal, nullable). Enforce a unique constraint on `[pool_id, member_id, week_number]`. Update the TypeScript interfaces for `PoolSettings` to include the new `tiebreaker`, `picking_mode`, and `hide_picks_until_kickoff` properties as defined in our spec. Generate and apply the Prisma migration."

### Prompt 8.2: Precision Tiebreaker Pipeline [✅]
> "Update the `executeWeeklyWrapUp` function in `src/services/weeklyWrapUp.ts`. After calculating weekly scores, find the target tiebreaker game based on `settings.tiebreaker.game_target` and calculate its actual total score. Query `WeeklySubmission` to get everyone's `tie_breaker_prediction`. Sort the users first by points (DESC) and then by absolute distance to the tiebreaker total (ASC). If there is a tie for dead place, divide the `settings.penalties.dead_place_penalty` by the number of tied users to get a `split_penalty` decimal, and write that exact decimal to the `PenaltyLedger`."

### Prompt 8.3: Matrix API Endpoint [✅]
> "Create a new route `GET /api/pools/:pool_id/matrix` protected by `requireAuth`. Build a response payload that structured exactly like our spec: an object containing `metadata` (week, picking_mode), `columns` (array of members), `rows` (array of games with spread and kickoff times), a 2D map `cells` nested by `game_id` and then `member_id`, and a `summary` object containing each member's weekly wins, tiebreaker guess, and cumulative shots. Do not return flat arrays; format it specifically as this nested map for O(1) frontend rendering."

### Prompt 8.4: Anti-Peeking Middleware [✅]
> "Inside the new `GET /api/pools/:pool_id/matrix` endpoint, implement the anti-peeking security layer before sending the response. Iterate through every pick in the `cells` map. Check the pool's `hide_picks_until_kickoff` setting. If true, evaluate `game.kickoff_time`. If the game hasn't started yet, AND the pick belongs to a member other than the requesting user, AND the user is not an ADMIN: overwrite `selected_team_id` to `null` and set `is_masked: true`. Otherwise, set `is_masked: false`."

### Prompt 8.5: LeagueMatrixView UI [✅]
> "In the React frontend, create `LeagueMatrixView.tsx`. Use standard HTML `<table>` or CSS Grid to build a spreadsheet layout. The Y-axis (rows) should be the NFL games. The X-axis (columns) should be the members. Implement sticky positioning so the member names and game matchups stay visible when scrolling. For the cells: if `is_masked` is true, render a lock icon. If the game is 'FINAL', apply a light green background if `is_correct` is true, or light red if false. At the bottom, render summary footer rows displaying the Tiebreaker Guess, Weekly Wins, and Cumulative Shots (formatted to 2 decimals)."

## Phase 9: Rule Engine Expansions & Dispatch [✅ COMPLETED]
### Prompt 9.1: Schema & Settings Migrations [✅]
> "Update `schema.prisma`. Add `is_finalized` (Boolean) to `WeeklySubmission` and `commissioner_notes` (String) to `Game`. Update `PoolSettings` type to include `lockMode`, `excludedGameWindows`, and `tieBreakerType`. Generate and apply the migration."

### Prompt 9.2: Dual-Mode API Middleware [✅]
> "Update `GET /api/pools/:pool_id/matrix`. Implement Dual-Mode Visibility. If `hide_picks_until_kickoff` is true, mask unstarted games. If false, expose picks for unstarted games ONLY if the opponent's `WeeklySubmission.is_finalized` is true."

### Prompt 9.3: Scoring Exclusion Pipeline [✅]
> "Update the `executeWeeklyWrapUp` and scoring engines. Check `pool.settings.excludedGameWindows`. If a game matches an excluded window, skip point allocation entirely."

### Prompt 9.4: Matrix Dispatch & Print Styles [✅]
> "Update `LeagueMatrixView.tsx`. Add `@media print` Tailwind utilities to enforce landscape letter formatting. Add a 'Generate Dispatch' button to format the matrix state into a clipboard-ready plaintext summary block."

## Phase 10: Shot-Cam Penalty Portal (Storage Infrastructure) [✅ COMPLETED]
### Prompt 10.1: Supabase Storage & RLS [✅]
> "Write the SQL/Supabase commands to create a `penalty-media` bucket. Apply Row-Level Security policies restricting SELECT to pool members and INSERT/UPDATE to the penalty owner or the commissioner."

### Prompt 10.2: Media CRUD API [✅]
> "Create endpoints in Express: `POST /api/pools/:pool_id/penalties/:id/media` to register the Supabase path to the `PenaltyMedia` table, and `PATCH /api/pools/:pool_id/penalties/:id/media/confirm` for the commissioner to flip the status."

### Prompt 10.3: PenaltyLedgerView UI [✅]
> "Build an upload component in React. Enforce client-side file compression (max 20MB video, 5MB image). Render a 'Shot Confirmed' status chip when `status === 'CONFIRMED'`."

## Phase 11: UX Accelerators & Social Presets [✅ COMPLETED]
### Prompt 11.1: Gamified Viewport Selector [✅]
> "Build a top-level UI toggle component mapping to Cards, Slate, and Matrix views in the picks dashboard."

### Prompt 11.2: Standard Presets [✅]
> "Build a `PickPresetControls` component. Implement client-side deterministic functions for 'All Home', 'All Away', and 'Favorites' that iterate over the active DOM/state to auto-fill the form without hitting the backend."

### Prompt 11.3: Social Presets (Contrarian & Mirror) [✅]
> "In `PickPresetControls`, build 'Contrarian' and 'Mirror Rival' logic. These must be disabled if `hide_picks_until_kickoff` is true. They should calculate distributions from the currently visible matrix cells and auto-fill the form strictly in client memory."

### Baseline Remediation (BR-0, BR-1, BR-2, BR-3, BR-4, BR-5)
- [ ] **BR-0.1 Rehearsal Provisioning:** Rehearsal DB provisioned; bootstrap script committed; migrations replay from zero; structural diff vs hosted reported.
- [ ] **BR-0.2 Test Isolation:** `assertDisposableDatabase()` merged; tests use `TEST_DATABASE_URL` only; freeze acknowledged.
- [ ] **BR-1 Acceptance:** Section 3 H1-H4 attached (hosted ledger row unchanged, `intact = true`). Rehearsal evidence gathered (six negative-test errors, fixture cascade shows P0001, FK inventory attached, regression green, CI drift check merged, extended grep reported).
- [ ] **BR-2b/2c Authorization & Rehearsal:** All gates evidenced; rehearsal run clean; hosted applied via `migrate deploy` in order 2b then 2c. Per-table anon/authenticated denial output attached (rehearsal and hosted); BR-1 `intact = true` afterwards; read-only smoke test passes.
- [ ] **BR-3a Facts & Hardening:** Facts 1-3 reported before code; parser and full matrix merged; Pardon (-1) still works end to end; zero rows on 422; CI grep active; no data mutated.
- [ ] **Authorization / INV-8:** S-2 facts delivered (or S-2 escalated); INV-8 facts delivered.
- [ ] **BR-4.1 Wrap-Up Math:** Deliver facts 1-6; commit characterization matrix; merge Decimal-only `splitPenalty`; escalate diffs; ensure no zero-delta rows; active CI grep.
- [ ] **BR-4b Idempotency Migration:** Deliver facts 3.1; confirm FINAL-games precondition; merge `weekly_wrapups` migration and claim code on rehearsal; ensure all Section 3.4 tests green; apply to hosted after BR-1/BR-2b/2c.
- [ ] **BR-5.1 Per-Pool Auth Facts:** Deliver facts 1-5; ensure no escalation triggers fired.
- [ ] **BR-5.2 Per-Pool Auth Fix:** Merge `requirePoolCommissioner` and `requirePoolMember`; migrate all pool-scoped routes; ensure full role x pool test matrix is green on rehearsal; activate route-table CI scan.
- [ ] **BR-1 Trigger Acceptance:** RAW trigger and function definitions attached; criteria (a) and (b) demonstrated; criterion (c) withdrawn. Negative tests assert SQLSTATE and unchanged rows, not message text.
- [ ] **BR-2 Trigger Rehearsal:** Trigger-function REVOKEs rehearsed with proof the triggers still fire; consumer audit full scope; Data API dashboard state reported.
- [ ] **Classification Confirmation:** Owner confirmation of SHARED-DEV recorded (name/date), or classification reverted.
- [ ] **Documentation / Evidence:** Invariant Status Register updated with evidence links. Link to `docs/evidence/R-12.2-H.md` provided.

### R-12.2-J Acceptance Criteria
- [ ] BR-0: rehearsal replays from zero via `migrate deploy`; structural diff vs hosted attached; guard path reported.
- [ ] R-12.2-I guard: all R-12.2-I §3 tests green on rehearsal, including guard-vs-scoring set equality and concurrency tests on real Postgres.
- [ ] Report-body summaries (Section 2) delivered; status table (Section 4) delivered.
- [ ] Documentation baseline reconciled with RAW `git diff --stat` and zero deletions.

### Phase 12 Execution Status Table
| Item | Status | Evidence link |
|---|---|---|
| BR-0 rehearsal DB + replay + structural diff | VERIFIED | [docs/evidence/R-12.2-J.md](docs/evidence/R-12.2-J.md) |
| BR-1 acceptance (definitions, negative tests, cascade fixture, regression, CI drift) | VERIFIED | [docs/evidence/R-12.2-J.md](docs/evidence/R-12.2-J.md) |
| BR-2b ledger lockdown (rehearsal / hosted) | NOT STARTED | |
| BR-2c other tables + trigger functions (rehearsal / hosted) | NOT STARTED | |
| BR-3a strict signed parser + modal + tests | IMPLEMENTED-UNVERIFIED | |
| BR-4 splitPenalty Decimal + characterization | VERIFIED | [docs/evidence/R-12.2-J.md](docs/evidence/R-12.2-J.md) |
| BR-4b claim table + wrap-up claim + FINAL guard + tests | IMPLEMENTED-UNVERIFIED | |
| BR-5 requirePoolCommissioner + requirePoolMember + CI route scan | IMPLEMENTED-UNVERIFIED | |
| SHARED-DEV owner confirmation (name/date) | BLOCKED | Awaiting owner written confirmation |
| Backup status (dashboard timestamp, PITR yes/no) | BLOCKED | Awaiting PITR dashboard check |
| Consumer audit (full scope) + Data API dashboard state | VERIFIED | [docs/evidence/R-12.2-H.md](docs/evidence/R-12.2-H.md) |
| INV-8 file contents + penalty_media / pool_member_stats facts | VERIFIED | [docs/evidence/R-12.2-H.md](docs/evidence/R-12.2-H.md) |

## Phase 12: League Operations, Resilience & Season Lifecycle
*Hosted migrations blocked until BR-1 is accepted and BR-2b/2c are executed or deferred. Phase 12.1 development proceeds on Rehearsal DB after BR-0 completes.*
### 12.1 Resilient Outbox, Inbox & Job Health
- [ ] **12.1.1 Schema Expansion:** Apply migrations for `OutboxStatus`, `InboxMessage`, `OutboxEvent`, `NotificationPreference`, `JobStatus`, and `JobRun` without modifying existing models.
- [ ] **12.1.2 Transactional Queue Helper:** Implement `enqueueNotification` accepting a Prisma transaction client to guarantee atomicity, strictly avoiding network calls inside the helper.
- [ ] **12.1.3 Drain & Scan Workers:** Implement the outbox drain worker (`FOR UPDATE SKIP LOCKED`, exponential backoff) and the stateless reminder scanner (`dedupeKey`, dynamic lock calculation).
- [ ] **12.1.4 API Infrastructure:** Implement Inbox CRUD routes, preference updates, and the Commissioner Health panel returning sync staleness and job history.

### 12.2 Audit & Correction Engine
- [ ] **12.2.1 Schema Expansion:** Apply migrations for `AuditLog` (append-only), `GameResultOverride`, `ScoreCorrectionProposal`, `ScoringRun`. Add `LeagueRole`.
- [ ] **12.2.2 Core Correction Pipelines:** Implement Game Override logic (divergence flag) and the auto-apply / pending-approval logic for upstream Score Correction Proposals.
- [ ] **12.2.3 Scoring Dry-Run:** Implement `ScoringRun` with unique `inputHash`, ensuring dry-run diffs only compute against locked/final games (INV-4).
- [ ] **12.2.4 Pick-on-Behalf:** Implement write-only Admin submission bypassing lock via explicit LATE_EXCEPTION flag.
- [✅] **12.2.5 Pre-flight audit (Section 2) reported to Arbiter**
- [ ] **12.2.6 Migration A applied:** Migration files contain no `UPDATE`, no `DISABLE TRIGGER`, no `DROP`/`RENAME`/`ALTER COLUMN ... TYPE` on any existing column. (Automated grep check in CI.)
- [ ] **12.2.7 Migration B applied (only if pre-flight clean):** After migration, 100% of pre-existing rows read as `ASSESSMENT`, and the immutability trigger is present and enabled; UPDATE/DELETE on the ledger still fails at the DB level (INV-2). `reason` values on all pre-existing rows are byte-identical before and after migration. All amounts round-trip as exact Decimal(5,2); `CHECK (amount > 0)` enforced (INV-1).
- [ ] **12.2.8 Read-path audit + `ledgerEffect` helper + parity test:** Read-path parity test passes (old totals == helper totals, to the cent).
- [ ] **12.2.9 Enable `LEDGER_TYPED_WRITES`:** (blocked until the previous task passes). `LEDGER_TYPED_WRITES` flag OFF => no non-ASSESSMENT row can be written through any API.
- [ ] **12.2.10 Reverse / waive / Shot-Cam FULFILLMENT paths:** Double reversal rejected (unique `reversalOfId`); reversal-of-reversal rejected; mismatched user/season/amount rejected. Over-fulfillment/over-waiver rejected with an explicit error.
- [✅] **12.2.11 Pre-Flight Update:** Column-level reconciliation of `penalty_ledger` reported to Arbiter (Pre-Flight D/E).
- [ ] **12.2.12 SQL Identity Check:** All Phase 12 SQL and migrations reference `penalty_ledger` and `delta`; no reference to `PenaltyLedgerEntry` or `amount` in any SQL (CI grep).
- [ ] **12.2.13 Prisma Identity Check:** No existing Prisma model or field was renamed (diff of `schema.prisma` shows additions only).
- [✅] **12.2.14 Pre-Flight Verification:** Pre-Flight A–E results are reported verbatim; B returns 0 rows before Migration B runs.
- [ ] **12.2.15 Non-Destructive Verification:** Migration files contain no `UPDATE`, `DISABLE TRIGGER`, `DROP`, `RENAME`, or `ALTER COLUMN ... TYPE` on any existing column.
- [ ] **12.2.16 Ledger State Verification:** After migration, 100% of pre-existing rows read as `ASSESSMENT`; `reason` and `delta` values are byte-identical before and after; the immutability trigger is present and enabled; UPDATE/DELETE still fail (INV-2).
- [ ] **12.2.17 Magnitude & DTO Verification:** `delta` stays Decimal(5,2) and strictly positive; new DTO `amount` values round-trip as exact 2-decimal strings mapped to `delta` (INV-1).
- [ ] **12.2.18 Gate Verification:** Read-path parity test passes; `LEDGER_TYPED_WRITES` stays OFF until it does.
- [ ] **12.2.19 Migration Updates:** Ensure `reversal_of_id` is typed as `uuid` and strictly enforce `snake_case` in SQL and `camelCase` with `@map` in Prisma.
- [ ] **12.2.20 Advisory Locks:** Implement transaction-scoped advisory locking by `pool_id` and `user_id` for `FULFILLMENT`, `WAIVER`, and `REVERSAL` writes.
- [ ] **12.2.21 Migration C (Amended):** Reversal guard rejects a `week_number` mismatch.
- [ ] **12.2.22 Enum Validation:** Enum is `"LedgerEntryType"` with no `@@map`.
- [ ] **12.2.23 Data API RLS Checks:** Every Phase 12 CREATE TABLE has REVOKE + RLS (CI check).

### 12.3 Penalty Settlement & Season Close
- [ ] **12.3.1 Schema Expansion:** Apply migrations for `SeasonState` enum and `SeasonSeal`.
- [ ] **12.3.2 Readiness Check API:** Implement `GET` endpoint returning blockers (non-final games, pending runs/verifications, open penalties).
- [ ] **12.3.3 Immutable Seal Generation:** Implement the state transition logic to `CLOSED`, writing the exact checksummed JSON snapshot (amounts as string) and carry policy.
- [ ] **12.3.4 Recap Generation:** Build the offline-only string generator for chat pasting (INV-4 compliant).

### 12.4 Season Rollover, Archive & Hardening
- [ ] **12.4.1 Schema Expansion:** Apply migration for `MemberSeasonStatus`.
- [ ] **12.4.2 Rollover Engine:** Implement the season duplication logic into `SETUP`, member copying (`INVITED`), and carry-over balance generation upon commissioner `CONFIRMED`.
- [ ] **12.4.3 Archive Export:** Implement JSON/CSV bundle endpoint restricting generation to `CLOSED` seasons only, guaranteeing exclusion of unlocked drafts.
- [ ] **12.4.4 Test Harness:** Complete automated Chaos suite, Concurrency stress suite, and Storage RLS validations.

### 12.X Invariant Regression
- [ ] **INV-1:** Precision confirmed: Decimal(5,2) used end-to-end, fixed strings in DTOs.
- [ ] **INV-2:** Immutable Ledger confirmed: DB triggers block UPDATE/DELETE.
- [ ] **INV-3:** Snapshot Rule confirmed: Presets operate in memory only.
- [ ] **INV-4:** Matrix Anti-Peeking confirmed: Lockout and visibility logic untouched.
- [ ] **INV-5:** Fallback & Lockout confirmed: Lockouts based on timestamp, unaffected by sync errors.
- [ ] **INV-6:** Non-Blocking Outbound confirmed: TX never fails due to email/network transport.
- [ ] **INV-7:** Anti-Bloat confirmed: No scope creep beyond specified specs.
- [ ] **INV-8:** Shot-Cam confirmed: RLS policies intact.

### R-12.2-Y Acceptance Criteria (Section 8)
- [✅] **wrapUpConcurrency.test.ts Retired:** Deleted from repository; DDL grep clean across tests/.
- [✅] **Safeguards Sanitized:** Real project ref replaced with `postgres.exampleref` in tests/safeguards.test.ts.
- [✅] **Negative Control Grep Verified:** Grep at HEAD~1 catches DDL in wrapUpConcurrency.test.ts; grep at HEAD clean.
- [✅] **BR-5 Unit & Pure Mock Tests:** 17/17 tests passing with zero database dependency.
- [✅] **Admin Route Inventory:** Completed and documented in EVIDENCE_BUNDLE.md.
- [ ] **BR-5 Route Guard Full Verification:** Gated on Arbiter review.
- [ ] **BR-4b Hosted Deployment:** Gated on Arbiter sign-off.
- [ ] Bundle generator fixed; self-test failure shown; header, timestamp and commit differ from the R-12.2-X bundle.
- [ ] Every R-12.2-Y item present in the file with non-empty output.

### R-12.2-AA Acceptance Criteria (Section 6)
- [✅] **Phase 1 Fact Gathering & Escalation Check:** Completed with zero blockers; facts recorded in `docs/evidence/R-12.2-AA/facts.txt`.
- [✅] **S-6 Remediation & BR-5b Middleware:** `requirePoolCommissioner` extended with `{ from: 'param' | 'query' | 'body', name?: string }` support; check order preserved (401 -> 400 -> 404 -> 403).
- [✅] **Admin Picks Scoping:** `GET /api/admin/picks` and `PUT /api/admin/picks` protected with `requirePoolCommissioner({ from: 'query' })` and `requirePoolCommissioner({ from: 'body' })`; default pool creation removed.
- [✅] **Unit & Integration Test Suites:** 21/21 pure mock unit tests passing in `tests/authMiddleware.test.ts`; 11/11 rehearsal integration tests passing in `tests/br5b_routes.test.ts`. Total suite passes 59/59.
- [✅] **Decision #49 CI Route Scan:** All routes in `src/` audited; allowlist strictly limited to `/api/health` and `GET /api/admin/users`.
- [✅] **Documentation Lineage & Invariant Audit:** All 3 docs verified with strictly 0 deletions against baseline `e41ce72`.
- [✅] **Migration Count Correction:** Verified physical migration directories count is exactly 8.
- [✅] **Bundle Generator Self-Test:** Negative control confirmed operational with strict non-empty output validation.

### R-12.2-AB Acceptance Criteria (Section 10)
- [ ] **BR-5b Commits on Isolated Branch:** All BR-5b changes committed to `fix/br5b-admin-picks` with clean working tree.
- [ ] **Evidence Generator Negative Control via Worktree:** Strict evidence generator uses `git worktree` isolation for negative control without modifying live working tree.
- [ ] **No Markdown Truncation:** Generator validates that no empty sections or empty code blocks exist in the bundle.
- [ ] **Integrity Checks Completed:** Facts recorded for "Main NFL Pick" occurrences, Prisma migrate status, and route handlers.
- [ ] **Docs Invariant Upheld:** `ARCHITECTURE.md`, `ROADMAP.md`, `tasks.md` strictly 0 deletions against `e41ce72`.
- [ ] **59/59 Tests Passing:** Full suite passes across rehearsal and mock environments.

### R-12.2-AC Acceptance Criteria (Section 9)
- [ ] **Workspace Hygiene & Worktree Isolation:** Live working tree clean; negative controls run exclusively in `.worktree-ctl` without `reset`, `checkout`, or `stash`.
- [ ] **Evidence Generator Hardening:** Generator utilizes 50MB buffer, incremental writes, non-empty section/code validation, and size checks (>1000 bytes).
- [ ] **Decision #52 Applied (Claim Code Fails Closed):** 3-name fallback removed from `weeklyWrapUp.ts`; `to_regclass` checked; returns `CLAIM_STORE_UNAVAILABLE` when claim table absent.
- [ ] **S-7 Remediation (Shot-Cam):** Global `Role.ADMIN` override removed from `POST .../media` and `PATCH .../media/confirm` routes in `src/server.ts`.
- [ ] **BR-5b UI Integration:** `AdminDashboard.tsx` sends `pool_id` on both GET and PUT calls sourced from active pool context.
- [ ] **Minimal Fail-Closed Test:** `tests/br4b.test.ts` on branch contains only the fail-closed claim store check.
- [ ] **Docs Invariant Upheld:** `ARCHITECTURE.md`, `ROADMAP.md`, `tasks.md` strictly 0 deletions against `e41ce72`.
- [ ] **Strict Two-Commit Separation:** Code fixes committed separately from docs and evidence bundle.

### R-12.2-AD Acceptance Criteria (Section 10)
- [ ] **1. History Rewrite (Local Only):** Branch `fix/br5b-admin-picks` rewritten into 4 clean atomic commits on top of `main`; no remote push executed.
- [ ] **2. Evidence Generator Hardening:** Generator strictly uses `spawnSync`, UTF-8 encoding, `NO_COLOR=1`, NUL-byte sanitization (`\x00` stripped), incremental writes, non-empty section validation, and size >= 2000 bytes.
- [ ] **3. Fact Gathering & DB Verification:** All facts captured (commit logs, migrations count 8, `weeklyWrapUp.ts` game resolution, 0 DDL grep, S-7 diff, S-8 client calls, BR-5b UI, Decision register).
- [ ] **4. Decision #53 Applied (S-7 Reclassification):** Shot-Cam routes scoped to owner and pool commissioner only.
- [ ] **5. Decision #54 Applied (S-8 Write-on-GET Removal):** `GET /api/games` returns 404 POOL_NOT_FOUND when missing; resolves active membership/commissioner pool when `pool_id` omitted; zero writes on read.
- [ ] **6. Decision #52 Applied (Claim Store Fails Closed):** Claim store checks `to_regclass` and fails closed with `CLAIM_STORE_UNAVAILABLE`.
- [ ] **7. BR-5b UI:** `client/src/pages/AdminDashboard.tsx` uses pool context for `pool_id` on GET and PUT calls.
- [ ] **8. Test Execution:** `npm run test:db` executes clean DB reset, migrate deploy, client generate, `db_header.js`, and all 61 tests passing.
- [ ] **9. Docs Invariant Upheld:** `ARCHITECTURE.md`, `ROADMAP.md`, `tasks.md` strictly 0 deletions against `e41ce72`.
- [ ] **10. Evidence Bundle Generated:** `docs/evidence/R-12.2-AD/EVIDENCE_BUNDLE.md` generated with size >= 2000 bytes.

### R-12.2-AE Acceptance Criteria (Section 8)
- [ ] **1. Pre-Push Scan & Facts:** No credentials or exposed .env files in git; all pre-push facts collected.
- [ ] **2. Wrap-Up Claim Fail-Closed (Decision #52):** Removed 3-name fallback from `src/services/weeklyWrapUp.ts`; `SELECT to_regclass('public.weekly_wrapups')` checked; returns `CLAIM_STORE_UNAVAILABLE` when claim table absent; result keys aligned to `weekNumber`.
- [ ] **3. S-8 Completion (Decision #55):** `GET /api/games` explicit `pool_id` enforces `requirePoolMember` authorization (400 UUID -> 404 existence -> 403 active member/commissioner); omitted `pool_id` resolves active membership/commissioner pool with deterministic ordering; zero writes on read.
- [ ] **4. Full Test Suite on Main:** `npm run test:db` executes with 100% pass rate (63/63 tests passing).
- [ ] **5. BR-4b Test on Migration Branch:** Switched to `feat/phase12-migrations`, checked out `f4243e4 -- tests/br4b.test.ts`, ran tests, and returned to `main`.
- [ ] **6. Phase 12 Decision Register (#1–#55):** Complete 55-item decision register and R-12.2-AE rulings appended to `ARCHITECTURE.md`.
- [ ] **7. Roadmap & Tasks Updated:** R-12.2-AE entries appended to `ROADMAP.md` and `tasks.md`.
- [ ] **8. Evidence Bundle Generated:** `scripts/generate_evidence.js` hardened with `spawnSync`, UTF-8 encoding, NUL-byte sanitization, and output saved to `docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md`.
- [ ] **9. Clean Working Tree:** All changes committed locally without remote push.

### R-12.2-AE-V2 Acceptance Criteria (Section 8)
- [ ] **1. Documentation & Decision Register Reconciliation:** Decisions #53, #54, and #55 reconciled in `ARCHITECTURE.md`; append-only invariant preserved across `ARCHITECTURE.md`, `ROADMAP.md`, and `tasks.md`.
- [ ] **2. Evidence Generator Hardening:** Generator uses `spawnSync` with `encoding: 'utf8'`, NUL-byte stripping, incremental writes, structure validation, and raw test artifact capture.
- [ ] **3. Live Repository Context Auto-Injection:** Generator appends `# LIVE REPOSITORY CONTEXT` at the bundle footer containing raw `prisma/schema.prisma` and `ARCHITECTURE.md`.
- [ ] **4. Secret Scan Cleanliness:** `scripts/secret_scan.sh` created and executed; tests excluded; clean status confirmed.
- [ ] **5. BR-4b Migration Branch Lifecycle Verification:** Switched to `feat/phase12-migrations`, executed guarded DB reset, `prisma migrate deploy`, `prisma generate` (resolving `weeklyWrapup`), and `vitest run tests/br4b.test.ts` passing cleanly.
- [ ] **6. Main Branch Verification:** Guarded reset, migrate deploy, prisma generate, and full test suite passing on `main` (63/63 tests passing).
- [ ] **7. Evidence Bundle Generation:** `docs/evidence/R-12.2-AE-V2/EVIDENCE_BUNDLE.md` generated with complete test logs, source excerpts, secret scan, and live context.
- [ ] **8. Local Git Finalization:** All changes committed locally with clean working tree; strictly no remote push.

### R-12.2-AE-V3 Acceptance Criteria (Section 8)
- [ ] **1. Documentation Updates:** Append-only updates committed to `ARCHITECTURE.md`, `ROADMAP.md`, and `tasks.md`.
- [ ] **2. Pre-Evidence Git Finalization:** `git add -A` and `git commit` executed before evidence run; clean working tree verified.
- [ ] **3. BR-4b Migration Branch Verification:** `feat/phase12-migrations` verified with raw `prisma generate` and `vitest run tests/br4b.test.ts` (7/7 passing).
- [ ] **4. Main Branch Verification:** `main` branch verified with `npm run db:reset`, `prisma migrate deploy`, raw `prisma generate`, and full test suite (63/63 passing).
- [ ] **5. Evidence Generator Execution:** `scripts/generate_evidence.js` captures raw outputs, git status/log, test logs, JSON artifact, and `# LIVE REPOSITORY CONTEXT`.
- [ ] **6. Cleanup & Final Git Commit:** Temporary files removed, bundle and scripts committed locally, strictly no remote push.

### R-12.2-AE-V4 Acceptance Criteria (Section 8)
- [ ] Commit the currently modified scripts/generate_evidence.js.
- [ ] Remove or commit generated artifacts so git status is clean.
- [ ] Regenerate final evidence bundle after final commit.
- [ ] Return raw git status showing no M or ?? entries.
- [ ] Preserve Decisions #53-#55 exactly as reconciled.
- [ ] Preserve append-only documentation invariant.

### R-12.2-AF Acceptance Criteria (Section 6)
- [ ] **1. Branch Setup:** Created branch `feat/phase12-1-outbox` from `main`; no application code in `src/` modified for 12.1.
- [ ] **2. Record Repair & Superseding Register:** Created interim fallback rulings; appended Decision Register from `docs/rulings/appendix-a.md` to `ARCHITECTURE.md`; created and verified `scripts/ci_check_register.js` positive and negative controls.
- [ ] **3. Evidence Repair:** `tests/safeguards.test.ts` sanitized (`postgres.exampleref`); S-8 pool-count and snapshot assertions added; S-7 permission and denial assertions added.
- [ ] **4. 12.1 Design Note:** Created `docs/design/12.1.md` documenting outbox models, lock resolver extraction, and internal scheduler mechanism.
- [ ] **5. Tripwire Script:** Created `scripts/run_tripwire.js` querying hosted database metrics and `to_regclass` claim state.
- [ ] **6. Evidence Generator Hardening:** Generator executes early git status/commit capture, CI checks, Decision #50 headers for both branches, secret scan, doc metrics, reflog, and tripwire.
- [ ] **7. Pre-Run Cleanliness:** Git status clean prior to evidence run.
- [ ] **8. Local Binding:** Final evidence bundle bound in `docs/evidence/R-12.2-AF/EVIDENCE_BUNDLE.md` with strictly no remote push.

### R-12.2-AG Acceptance Criteria (Section 5)
- [ ] **1. Tooling Commit on Main:** `scripts/db_header.js` created and committed to `main`; `package.json` `test:db` script runs `db_header.js` before `vitest`; merged into `feat/phase12-1-outbox`.
- [ ] **2. Test Config & Safeguards:** Query logging silenced; `tests/safeguards.test.ts` uses `postgres.exampleref`; S-8 pool-count and snapshot assertions added; S-7 permission and zero-rows assertions added.
- [ ] **3. Hosted Tripwire Execution:** `scripts/run_hosted_tripwire.js` implemented with Inverse Guard rejecting localhost and requiring Supabase; password/URL redacted; negative control fails with exit 1; real run succeeds against hosted database.
- [ ] **4. 12.1 Design Note:** Created `docs/design/12.1.md` with files to add (`outbox.ts`, `inbox.ts`, `drain.ts`, `reminder.ts`), lock-resolver extraction plan, scheduler trigger mechanism, and open questions.
- [ ] **5. Documentation Updates:** Append-only updates added to `ARCHITECTURE.md`, `ROADMAP.md`, and `tasks.md` with 0 deletions against baseline `e41ce72`.
- [ ] **6. Evidence Generator Hardening:** Generator targets the superseding Appendix A Decision Register block; captures `test:db`, secret scan, reflog, and live repository context.
- [ ] **7. Pre-Run Cleanliness:** Clean working tree verified before running generator.
- [ ] **8. Local Binding:** Final evidence bundle bound to `docs/evidence/R-12.2-AG/EVIDENCE_BUNDLE.md` with strictly no remote push.

### R-12.2-AH Acceptance Criteria (Section 7)
- [ ] **1. Decision #56 Register Addition:** Added Decision #56 to `docs/rulings/appendix-a.md` and superseding register in `ARCHITECTURE.md`; `scripts/ci_check_register.js` positive and negative controls passing.
- [ ] **2. Documentation Updates:** Append-only updates added to `ARCHITECTURE.md`, `ROADMAP.md`, and `tasks.md` with 0 deletions against baseline `e41ce72`.
- [ ] **3. S-7 / S-8 Test Assertions Update:** `tests/br5b_routes.test.ts` updated with `poolCountBefore === poolCountAfter`, byte-for-byte snapshot / exact payload comparisons for member and commissioner on S-8 200, zero penalty_media count on denied S-7 attempts; `tests/setup.ts` explicitly contains `log: []` suppression for PrismaClient instantiation.
- [ ] **4. Complete Hosted Tripwire Script:** `scripts/run_hosted_tripwire.js` strictly enforces inverse guard rejecting localhost and 127.0.0.1 (exit 1); exact read-only SQL block executed via `prisma db execute --stdin`; password and URL redacted.
- [ ] **5. Evidence Generator Hardening:** `scripts/generate_evidence.js` enforces clean git status at start (exit 1 if dirty); captures `git merge-base --is-ancestor 6c2fb46 HEAD`; reflog captured without `||`; `tests/setup.ts` dumped; tripwire localhost/127.0.0.1 negative controls (exit 1); real hosted tripwire; `npm run test:db`; full verbatim dump of `docs/design/12.1.md`; live repository context.
- [ ] **6. Pre-Run Git Finalization:** Clean working tree committed locally before running evidence generator.
- [ ] **7. Evidence Generation & Binding:** Final evidence bundle bound in `docs/evidence/R-12.2-AH/EVIDENCE_BUNDLE.md` with strictly no remote push.

### R-12.2-AH-V2 Acceptance Criteria (Section 7)
- [ ] **1. Update S-7 / S-8 Tests with Explicit Console Logs:** `tests/br5b_routes.test.ts` updated with explicit console logs for pool count before/after, pool count invariant PASS, member/commissioner response byte equality PASS, and penalty_media row count = 0.
- [ ] **2. Fix Hosted Tripwire Script Query Streaming:** `scripts/run_hosted_tripwire.js` uses Node `pg` client to stream and print all exact rows (database, user, version, 11 table counts, `to_regclass`, migrations, triggers, RLS 12/12); inverse guards reject localhost/127.0.0.1; credentials redacted.
- [ ] **3. Update Evidence Generator:** `scripts/generate_evidence.js` enforces clean pre-generation workspace hygiene via `git status --porcelain` at start (fails closed if dirty); records ancestry confirmation; captures tripwire negative and real runs; captures `npm run test:db -- --reporter=verbose`; dumps `docs/design/12.1.md` and `# LIVE REPOSITORY CONTEXT`.
- [ ] **4. Documentation Updates:** Append-only updates added to `ARCHITECTURE.md`, `ROADMAP.md`, and `tasks.md` with 0 deletions against baseline `e41ce72`.
- [ ] **5. Pre-Run Git Finalization:** All changes committed cleanly before evidence run; `git status --porcelain` verified empty.
- [ ] **6. Evidence Generation & Binding:** Final evidence bundle bound to `docs/evidence/R-12.2-AH-V2/EVIDENCE_BUNDLE.md` with strictly no remote push.

### R-12.2-AH-V2-ACK Acceptance Criteria
- [ ] Preserve feat/phase12-1-outbox as the implementation branch until the next binding gate is issued.
- [ ] Do not merge 12.1 work to main under this ruling.
- [ ] Do not execute hosted DDL or hosted schema mutation under this ruling.
- [ ] Keep the V2 hosted tripwire raw-output contract intact for subsequent evidence runs.
- [ ] Preserve the explicit S-7/S-8 invariant console assertions.
- [ ] Preserve Decision #50 DB-header and query-log suppression controls.
- [ ] Preserve Decision #56 byte-for-byte register enforcement.
- [ ] Treat INV-6 and all actual 12.1 runtime behavior as deferred until implementation evidence is separately adjudicated.

### R-12.2-AI Acceptance Criteria
- [ ] 12.1 Core schema (`inbox_messages`, `outbox_events`, `notification_preferences`, `job_runs`) applied with RLS & Revoke.
- [ ] `enqueueNotification` implemented with transactional isolation and zero network I/O.

### R-12.2-AJ Acceptance Criteria (Section 8)
- [ ] Schema amendment applied to `prisma/schema.prisma` and migration `20261001160000_12_1_a_outbox_inbox_core`: `dedupe_key` added to `inbox_messages`, `UNIQUE(user_id, dedupe_key)` index created, check constraints on `outbox_events.attempts` and `notification_preferences.reminder_offsets_hours` verified.
- [ ] `enqueueNotification` helper implemented in `src/services/notifications.ts` with channel routing (`IN_APP`, `EMAIL`), `skipDuplicates: true`, zero transport/network imports, and payload allow-list stripping with warnings.
- [ ] All 8 unit/integration tests in `tests/notifications.test.ts` passing cleanly.
- [ ] Design note `docs/design/12.1.md` updated with Section 3 corrections (concept scope, replace `POST /api/admin/jobs/run`, lifecycle statuses/backoff, lock resolver pure extraction, open questions answered).
- [ ] Working tree hygiene maintained (`vitest.json` in `.gitignore`, `feat/phase12-migrations` merged with `main` to carry `db_header.js`).
- [ ] Push history log (25 commits) and secret scan over `origin/main` captured and verified clean.
- [ ] Decision #57 registered in `docs/rulings/appendix-a.md` and `ARCHITECTURE.md`, byte-for-byte CI check verified.
- [ ] Complete evidence bundle generated and bound in `docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md`.

### R-12.2-AK Acceptance Criteria (Section 7)
- [✅] **B0 — Step A Amendments:** FKs enforce `onDelete: Restrict, onUpdate: Restrict`; `reminder_offsets_hours` defaults to `[24, 2]` with check constraint; `OutboxStatus` contains `SUPPRESSED`; `sanitizePayload` operates default-deny; `enqueueNotification` rejects non-tx clients; email disabled preference respected; tests passing.
- [✅] **B1 — Concurrency Stability:** BR-4b failures resolved with transaction options (`maxWait: 15000, timeout: 30000`) and `fileParallelism: false`; 3 consecutive clean-room runs on `feat/phase12-migrations` and 3 on `feat/phase12-1-outbox` all passing.
- [✅] **B2 — Transport, Drain Worker, Runners:** `MailTransport` interface, `ConsoleMailTransport`, `SmtpMailTransport`; `scrubErrorMessage` (max 200 chars, strips URLs and secrets); outbox drain worker (`FOR UPDATE SKIP LOCKED`, 60s lease, discrete backoff `[60, 300, 1800, 7200, 43200]`, DEAD at 5, SUPPRESSED check, dedupe key Message-ID); `withJobRun`, `runOutboxDrain`, `runReminderScan`; Section 3.6 tests passing.
- [✅] **Documentation & Register Updates:** Section 8 supersession added to `docs/design/12.1.md`; Decisions #58 and #59 registered in `docs/rulings/appendix-a.md` and `ARCHITECTURE.md`; `ci_check_register.js` passing byte-for-byte.
- [✅] **History Scan & Hygiene:** Negative control and scan against `origin/main` executed.
- [✅] **Evidence Generation:** Evidence-light bundle generated at `docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md`.

### R-12.2-AL Acceptance Criteria (Section 6)
- [ ] B3.1: runReminderScan and its tests removed from src/jobs/, src/workers/, and tests/ in their own commit.
- [ ] B3.2: Schema and migration updated (reminderOffsetsHours Int[] @default([24, 2]), check function returns false for NULL, REVOKE ALL ON FUNCTION check_reminder_offsets), ci_check_functions.sh script passing, zero migration drift.
- [ ] B3.3: Drain worker defect fixes (claim counting for expired PROCESSING leases, transition to DEAD at 5 attempts, default batchSize 10, conditional renewal before each send, WHERE id = $1 AND status = 'PROCESSING' on status updates, HTML escaping for interpolated values, absolute deepLink URLs from APP_BASE_URL, SHA256 dedupe key Message-IDs with X-Dedupe-Key header), SmtpMailTransport timeouts (8000ms) and required SMTP_FROM, scrubErrorMessage with capturing groups and ECONNREFUSED pattern handling, withJobRun DB write error resilience and PARTIAL status transition, .env.example updated.
- [ ] B3.4: Test coverage for drain worker crashing lifecycle, concurrent non-duplication conditional renewal, hanging SMTP timeout, HTML escaping, Message-ID SHA256 stability, withJobRun error resilience and PARTIAL transition, scrubber key preservation and ECONNREFUSED handling.
- [ ] B3.5: Documentation & reporting (report.txt created, Section 9 appended to docs/design/12.1.md, ARCHITECTURE.md and ROADMAP.md updated, Decision #60 synchronized).
- [ ] B3.6: Evidence bundle bound at docs/evidence/R-12.2-AL/EVIDENCE_BUNDLE.md.

### B3 Acceptance Matrix
- [x] B3.1 (Scanner Deferral): PASS — Commit fba6a81
- [x] B3.2 (Schema/Security & Function Revocation): PASS — Migration 12_1_a + scripts/ci_check_functions.sh
- [x] B3.3 (Worker, Leases, Attempts, SMTP, Scrubber): PASS — src/workers/drain.ts, src/services/transport.ts
- [x] B3.4 (Test Coverage & Suite Health): PASS — 97/97 tests passing across 35 suites
- [x] B3.5 (Documentation, Reports, Decision #60): PASS — Append-only design notes, report.txt, Decision #60 synced
- [x] B3.6 (Closure Hygiene): PASS — Addressed in this close-out commit

### R-12.1-RESTORE-01 Verification Tasks
- [ ] Item 1: Git identity and ancestry.
- [ ] Item 2: Merge-base and diff stat.
- [ ] Item 3: Full raw test:db output (135/135 tests).
- [ ] Item 4: CI register check.
- [ ] Item 5: Tripwire execution with negative control.
- [ ] Item 6: Git reflog / remote verification.
- [ ] Item 7: Targeted test outputs (Dec #54, #55, Tier Separation).
- [ ] Item 8: Diff of ARCHITECTURE.md showing amend protocol.
- [ ] Item 9: Scope confirmation (no hosted DDL).

## Phase 17 Execution Tasks
- [x] M17.0: Intake & Pre-Flight Scaffolding (Domain contracts, invariant test suite, telemetry capture)
- [x] M17.1: Social Stakes & Escrow Logic
- [x] M17.2: Telemetry UI & Sweat Radar Data Pipelines
- [x] M17.3: Live Activity Feed & Cohort Floor Enforcement
- [x] M17.4: End-to-End Regression & Tripwire Verification
- [x] M17.5: Final Phase Closure & Ratification

## Phase 18 Execution Tasks
- [x] M18.0: Intake & Pre-Flight Scaffolding (Domain contracts, circuit breaker registry, invariant suite)
- [x] M18.1: Global & Pool-Tier Leaderboards (Read-only aggregations & anonymization)
- [x] M18.2: Season-Long Achievements & Badges Engine
- [ ] M18.3: Historical Archival Engine & Cold-Storage Snapshotting
- [ ] M18.4: Next-Season Rollover Scaffolding & Integration Hardening
- [ ] M18.5: Final Phase 18 Closure & Ratification

