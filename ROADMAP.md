# ROADMAP.md

## Phase 1: Foundation & Persistence (Database) [✅]
*Objective: Set up the core database schema and ORM/query layer to establish our single source of truth.*
- [✅] **1.1 Database Initialization:** Spin up a local relational database (e.g., PostgreSQL).
- [✅] **1.2 Core Schema Execution:** Apply DDL scripts for `users`, `pools`, `pool_memberships`, and `games`.
- [✅] **1.3 Transactional Schema Execution:** Apply DDL scripts for `picks`, `pick_results`, and `audit_logs` with all foreign keys and `UNIQUE` constraints.
- [✅] **1.4 ORM/Database Client Setup:** Configure the backend to safely connect to and query the database.

## Phase 2: External Data Ingestion (Sync Worker) [✅]
*Objective: Decouple from the NFL API by building a background worker that fetches and upserts game data.*
- [✅] **2.1 API Client Setup:** Create a service to fetch weekly schedules and live scores from the external NFL data provider.
- [✅] **2.2 The Sync Worker:** Build the scheduled CRON job/worker to run periodically.
- [✅] **2.3 Upsert Logic:** Implement idempotent upserts (using `external_game_id`) to the `games` table without overwriting unchanged data.
- [✅] **2.4 Fallback Handling:** Add error handling so the worker fails gracefully if the upstream API is down, leaving the local DB intact.

## Phase 3: Core Backend & Game Mechanics (Picks & Locking) [✅]
*Objective: Build the API endpoints for user actions and enforce the strict pre-game locking rules.*
- [✅] **3.1 Auth & RBAC:** Implement secure multi-user login and establish `ADMIN` vs. `USER` roles.
- [✅] **3.2 Pick Submission Endpoint:** Create the API to `POST`/`PUT` picks, ensuring missing inputs resolve to `NULL`.
- [✅] **3.3 Granular Locking Engine:** Implement the middleware/validation logic to reject pick mutations if `server_time >= (games.kickoff_time - pools.lock_offset)`.
- [✅] **3.4 Admin Override & Audit Logging:** Enable Admin mutation of user picks and force append-only writes to `audit_logs` for these actions.

## Phase 4: Scoring Engine & Leaderboard [✅]
*Objective: Automate the resolution of completed games and calculate immutable standings.*
- [✅] **4.1 Finalization Trigger:** Detect when a game's status changes to `FINAL` via the Sync Worker.
- [✅] **4.2 Scoring Execution:** Write the logic to grade all `picks` for a finalized game against `pool.settings` (handling `NULL` as 0 points).
- [✅] **4.3 Immutability Enforcement:** Commit results to the `pick_results` table permanently.
- [✅] **4.4 Leaderboard Aggregation:** Create the optimized SQL queries/endpoints to sum `pick_results` for the live leaderboard and identify the weekly loser.

## Phase 5: Client UI Integration (Frontend) [✅]
*Objective: Build the responsive web/mobile interface for users and admins.*
- [✅] **5.1 Auth & Navigation UI:** Build login screens and secure routing.
- [✅] **5.2 Weekly Slate & Picks UI:** Create the interface for users to browse upcoming games and submit picks before the visual lock countdown expires.
- [✅] **5.3 Live Leaderboard & Penalty Tracker:** Build the standings table and prominently highlight the weekly loser.
- [✅] **5.4 Admin Dashboard:** Build the UI for the Admin to override picks and configure pool settings.

## Phase 6: League Simulation & Seed Data [✅]
*Objective: Populate the database with mock users, historical games, and simulated picks to verify leaderboard functionality and UI rendering.*
- [✅] **6.1 Mock User Generation:** Create 9 dummy users and establish their pool memberships.
- [✅] **6.2 Historical Game Seeding:** Insert a completed week of NFL games with final scores.
- [✅] **6.3 Randomized Pick Distribution:** Programmatically generate mock picks for all users across the seeded games.
- [✅] **6.4 Leaderboard Population:** Execute the scoring engine against the seeded data to finalize results and generate the standings.

## Phase 7: Cumulative Stats & Penalty Engine [✅]
*Objective: Introduce persistent season-long mechanics, weekly finalization pipelines, and Wall of Shame UI.*
- [✅] **7.1 Schema Migrations:** Extend the database with `pool_member_stats`, `penalty_ledger`, and update `pool.settings`.
- [✅] **7.2 Finalization Pipeline:** Build the cron-triggered logic to identify 1st place and Dead Place when a week concludes.
- [✅] **7.3 API Expansion:** Implement endpoints for cumulative leaderboards and the manual admin penalty adjustment.
- [✅] **7.4 Wall of Shame UI:** Build the frontend `CumulativeLeaderboardTable` and the `DeadPlaceWallOfShame` showcase.
- [✅] **7.5 Admin Controls UI:** Create the `AdminPenaltyModal` allowing manual ledger overrides.

## Phase 8: Square Sheet Matrix & Precision Tiebreaker Engine [✅]
*Objective: Implement the interactive square sheet matrix, Decimal(5,2) precision penalty splitting, tiebreaker engine, and anti-peeking security.*
- [✅] **8.1 Precision Schema Migrations:** Update `schema.prisma` with `Decimal(5,2)` for `total_shots_drank`, `delta`, and add `WeeklySubmission` model.
- [✅] **8.2 Precision Tiebreaker Pipeline:** Integrate tiebreaker predictions, absolute distance scoring, and split decimal penalty calculations in `executeWeeklyWrapUp`.
- [✅] **8.3 Matrix API Endpoint:** Build `GET /api/pools/:pool_id/matrix` returning nested 2D game/member grid and summary metadata.
- [✅] **8.4 Anti-Peeking Security Layer:** Mask competitor picks prior to kickoff unless the user is an admin or the game has started.
- [✅] **8.5 LeagueMatrixView UI:** Build the spreadsheet-style responsive matrix component with sticky headers, masked locks, and summary footers.

## Phase 9: Rule Engine Expansions & Dispatch (Data & Visibility Layer) [✅]
*Objective: Implement dual-mode slate visibility with draft/final lifecycle states and excluded game logic.*
- [✅] **9.1 Schema & Settings Migrations:** Update `WeeklySubmission`, `Game`, and `pool.settings` schemas.
- [✅] **9.2 Dual-Mode API Middleware:** Upgrade the Matrix API to handle Draft vs. Final visibility modes.
- [✅] **9.3 Scoring Exclusion Pipeline:** Update the grading engine to skip `excludedGameWindows`.
- [✅] **9.4 Matrix Dispatch:** Add `@media print` CSS targets and plaintext clipboard generation to the Matrix UI.

## Phase 10: Shot-Cam Penalty Portal (Storage Infrastructure) [✅]
*Objective: Provision secure media storage for penalty evidence with RLS policies and admin confirmation workflows.*
- [✅] **10.1 Supabase Storage & RLS:** Configure the `penalty-media` bucket and row-level security.
- [✅] **10.2 Media CRUD API:** Build endpoints for upload registration and status confirmation.
- [✅] **10.3 PenaltyLedgerView UI:** Implement client-side compression and upload UI with "Shot Confirmed" status chips.

## Phase 11: UX Accelerators & Social Presets (Presentation Layer) [✅]
*Objective: Ship client-side snapshot auto-fill presets under strict immutable persistence constraints.*
- [✅] **11.1 Gamified Viewport Selector:** Build toggles for Cards, Slate, and Matrix views.
- [✅] **11.2 Standard Presets:** Build Home, Away, and Favorites deterministic auto-fills.
- [✅] **11.3 Social Presets (Contrarian & Mirror):** Build conditional logic relying on Open Slate mode to analyze and clone competitor picks.

### Baseline Remediation
- [ ] **BR-0 (Rehearsal DB):** Provision disposable database to isolate testing.
  *R-12.2-J: BR-0 GO; guard and claim code undeployable until rehearsal tests pass.*
- [ ] **BR-1 (INV-2 Trigger):** Out-of-band deployment of the `enforce_append_only` trigger on `penalty_ledger` (Acceptance pending local fixture test).
- [ ] **BR-2b/2c (Data API Lockdown):** Audit and apply strict RLS deny-all logic to explicitly listed phase tables (Gated on BR-0/BR-1).
- [ ] **BR-3a (Ledger Write Input):** Strict `server.ts` signed decimal parser implementation (Runs in parallel with BR-0).
- [ ] **BR-4 (Wrap-up Math):** Fix `delta` decimal splitting and verify idempotency (Parallel with BR-0).
- [ ] **BR-4b (Wrap-up Idempotency):** Migration to add `weekly_wrapups` claim table to enforce idempotency (Rehearsal first, hosted-gated).
  *R-12.2-I: FINAL-games precondition folded into BR-4b; no bypass.*
- [ ] **BR-5 (Per-pool Authorization):** Code-only fixes for S-2 authorization gaps (Parallel with BR-0).

## Phase 12: League Operations, Resilience & Season Lifecycle [PLANNED]
*Objective: Stabilize network events, expand commissioner auditing and correction workflows, and formalize the season lifecycle to guarantee reliable operation and history retention.*
*Sequence Update: Now: BR-3a, BR-4, BR-5 (parallel with BR-0). Rehearsal: BR-4b. Hosted: BR-1 acceptance -> BR-2b -> BR-2c -> `br_4b_weekly_wrapups` via `migrate deploy` -> claim code -> 12.1 hosted migrations. 12.1 dev on rehearsal after BR-0 AND BR-5 helper merged.*

- [ ] **12.1 Resilient Outbox, Inbox & Job Health:** Ensure non-blocking outbound event delivery, stateless reminders, and job logging.
- [ ] **12.2 Audit & Correction Engine:** Implement dry-run scoring, override rules, and the additive penalty ledger formula.
  - *Ruling R-12.2-A: ledger entryType is additive/parallel; read-path audit gate required before typed writes.*
  - *Ruling R-12.2-B: physical names `penalty_ledger`/`delta` govern; Option A approved; `delta` is a positive magnitude, pending Pre-Flight B.*
  - *Ruling R-12.2-C: BR-1 (append-only trigger) executed out-of-band. UUID typing and snake_case naming enforced. Advisory locks required for negative-balance operations.*
- [ ] **12.3 Penalty Settlement & Season Close:** Establish season states, close-readiness checks, and the immutable JSON seal pattern.
- [ ] **12.4 Season Rollover, Archive & Hardening:** Enable one-click rollovers, read-only sealed history, secure JSON/CSV exports, and system stress tests.

### Explicitly Rejected / Deferred
- **Rejected:** SMS/Twilio, native push notifications, websockets, in-app payment processing, live odds/weather, cross-league analytics, AI-generated recaps.
- **Deferred:** Shot-Cam media retention and purge policy.