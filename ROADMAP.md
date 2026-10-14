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

### Ruling R-12.2-Y: Guard Merge Accepted; WrapUp Test Retired; Admin Inventory; BR-5 Verification Next
- R-12.2-Y: guard merge accepted; wrapUp test retired; admin inventory; BR-5 verification next.
- R-12.2-Z: prior bundle re-sent; R-12.2-Y re-issued.
- R-12.2-AA: S-6 admin picks routes; BR-5b; bundle gaps; docs arithmetic.
- R-12.2-AB: BR-5b not accepted; environment integrity; route-table facts.
- R-12.2-AC: branch truth; claim code fails closed; S-7 facts.
- R-12.2-AD: commit hygiene; stale DB; S-8.
- R-12.2-AE: claim defects; S-8 completion; BR-5 closure matrix.
- R-12.2-AE-V2: BR-4b lifecycle verification, evidence-bundle integrity, secret-scan cleanliness, and live-context reconciliation are acceptance blockers.
- R-12.2-AE-V3: BR-4b lifecycle verification completed. Local Git finalization executed.
- R-12.2-AE-V4: Substantive implementation and verification complete. Local Git finalization executed.
- R-12.2-AF: 12.1 conditional start; BR-5 closure; register repair.
- R-12.2-AG: register ratified; hosted tripwire re-run.
- R-12.2-AH: Milestone 12.1 CONDITIONAL START; hosted tripwire & evidence repair cycle.
- R-12.2-AH-V2: Tripwire row output and test assertion logs captured.
- R-12.2-AH-V2: Evidence gate cleared. Milestone 12.1 conditional start active on feat/phase12-1-outbox.
- R-12.2-AI: 12.1 Core Schema & Outbox models applied to rehearsal DB.
- R-12.2-AJ: I-1/I-2 closed; 12.1 step A accepted with amendment.
- R-12.2-AK: 12.1 Step B GO; concurrency stabilization.
- R-12.2-AL: B3 fixes; scanner deferred to step E.

### Milestone Status (R-12.1-RESTORE-01)
- **Milestone 12.1:** CLOSED provisionally, CONDITIONAL on R-12.1-RESTORE-01 verification. Merge to main strictly BLOCKED pending explicit authorization.
- **Milestone 12.1-E (Reminder Scanner):** OPEN as a distinct follow-on milestone cut from main post-merge. Sequenced before Milestone 12.2 implementation.
- **Milestone 12.2 (Weekly Wrap-up Engine & Distribution):** Paper scope only. Implementation BLOCKED.

## Phase 14: Foundations & Core Feature Delivery — SEALED
- Milestones 14.1 through 14.7 ratified and certified closed under Ruling R-14-FINAL-CLOSURE-01.
- Cumulative test regression: 261/261 tests passing across 29 suites.

## Phase 15: Social Stakes, Faction Mechanics & Risk Telemetry — SEALED
- Milestones 15.0 through 15.5 ratified and certified closed under Ruling R-15-FINAL-CLOSURE-01.
- Cumulative test regression: 299/299 tests passing across 35 suites.

## Phase 16: Syndicates, Dynamic Markets & Engagement Overlays — SEALED
- Milestone 16.0: Phase 16 Architectural Intake & Scaffolding
- Milestone 16.1: Feature 7: Syndicate Portfolios Engine
- Milestone 16.2: Feature 9: Bad Beat Insurance Protocol
- Milestone 16.3: Feature 12: Dynamic Spread Adjustment Engine
- Milestone 16.4: Feature 13: Live In-Game Props Matrix
- Milestone 16.5: Phase 16 E2E Integration & Final Closure
- Milestones 16.0 through 16.5 ratified and verified end-to-end.
- Cumulative test regression: 324/324 tests passing across 41 suites.

## Phase 17: Social Stakes & Telemetry UI
- Status: PHASE_17_SEALED
- Milestones: M17.0 (Intake & Scaffolding), M17.1 (Social Stakes Core), M17.2 (Telemetry UI), M17.3 (Live Sweat Feed), M17.4 (Audit & Hardening), M17.5 (Phase Closure)
- Governing Authority: R-16-FINAL-CLOSURE-01

## Phase 18: Season Finale, Global Leaderboards & Historical Archival Engine
- Status: PHASE_18_SEALED
- Milestones: M18.0 (Intake & Scaffolding), M18.1 (Leaderboard Aggregations), M18.2 (Achievements Engine), M18.3 (Historical Archival Engine), M18.4 (Next-Season Rollover & Hardening), M18.5 (Phase Closure)
- Governing Authority: R-18.0-INTAKE-01

## Phase 19: Postseason Bracketology & Playoff Multiplier Engine
- Status: PHASE_19_SEALED
- Milestones: M19.0 (Intake & Scaffolding), M19.1 (Playoff Bracket Engine & Lock Supremacy), M19.2 (Dynamic Round Multipliers), M19.3 (Playoff Survivor Mode), M19.4 (Super Bowl Prop Matrix & Hardening), M19.5 (Phase Closure)
- Governing Authority: R-19.0-INTAKE-01

## Phase 20: Private League Gameday Core & Punishment Hub
- Status: COMPLETED
- Milestones: M20.0 (Intake & Scaffolding), M20.1 (Dead Place Override & Auto-Loss), M20.2 (Shot-Cam Workflow Engine), M20.3 (Autopilot Presets & SMS Ingest), M20.4 (Gameday E2E Integration), M20.5 (Phase Closure)
- Governing Authority: R-20.0-INTAKE-01 / Decision #69

## Phase 21: Consumer-Facing Expansion & Multi-Tenant Hardening
- Status: SEALED_PENDING_RATIFICATION
- Milestones: M21.0 (Intake & Scaffolding), M21.1 (Public Templates), M21.2 (Rule Configurator), M21.3 (Tenant Scaling), M21.4 (Consumer Dashboard), M21.5 (Closure)
- Governing Authority: R-20.5-CLOSURE-01

### Phase 22: Full-Stack UI Wiring & Interactive Integration [COMPLETE]
- Objective: Wire all backend domain engines (Phases 20 & 21) into clickable, production-ready React views.
- Key Deliverables:
  - M22.0: Intake Scaffolding, Navigation Routes & Feature Flag Registration [COMPLETE]
  - M22.1: Template Selection Modal & Create Pool Onboarding Wizard [COMPLETE]
  - M22.2: Commissioner Rule Toggle Panel (/admin) [COMPLETE]
  - M22.3: Wall of Shame Shot-Cam Review Card & Auto-Loss Badging (/shame) [COMPLETE]
  - M22.4: Multi-Tenant Leaderboard & Sweat Radar Gameday Overlay [COMPLETE]
  - M22.5: Cumulative Integration Suite & Phase 22 Seal [COMPLETE]

### Phase 23: Production Performance Hardening, Synthetic Load Generation & Edge Caching [COMPLETE]
- M23.0: Phase 23 Intake, Circuit Breaker Registration & Scaffolding [RATIFIED]
- M23.1: Edge & In-Memory Projection Read-Through Caching [RATIFIED]
- M23.2: Synthetic Multi-Tenant Load Generation & Kickoff Spikes [RATIFIED]
- M23.3: Database Query Optimization & Read Index Audit (Zero DDL) [RATIFIED]
- M23.4: Stress Testing & Graceful Degradation Failover [RATIFIED]
- M23.5: Phase 23 Cumulative Performance Dossier & Final Closure [COMPLETE]

### Phase 24: Enterprise Observability, Automated Audit Telemetry & Operational Health [COMPLETE]
- M24.0: Phase 24 Intake, Circuit Breaker Registration & Scaffolding [RATIFIED]
- M24.1: Multi-Tenant Structured Telemetry & Lock Contention Metrics [RATIFIED]
- M24.2: Automated Audit Trail & Circuit Breaker Trip Logging [RATIFIED]
- M24.3: Real-Time Operational Health Endpoints & Degradation Telemetry [RATIFIED]
- M24.4: Synthetic E2E Alerting & Monitoring Verification [RATIFIED]
- M24.5: Phase 24 Cumulative Observability Dossier & Final Closure [COMPLETE]



## Phase 25: Multi-Tenant League Isolation & Ten-Person Charter Enforcement [✅]
- [✅] **25.1 Charter Invariants:** Enforced 10-person private league capacity constraints and automated invitation token rotation.
- [✅] **25.2 Multi-Tenant Partitioning:** Database-level scoping on active pool contexts across all analytical projections.

## Phase 26: Tiebreaker Precision Engine & Split Decimal Penalties [✅]
- [✅] **26.1 Precision Distance Scoring:** Absolute Monday Night distance resolution using Prisma.Decimal(5,2).
- [✅] **26.2 Dead Place Monarch Settlement:** Integrated Decision #69 zero-splitting auto-loss penalty rules.

## Phase 27: Wall of Shame Shot-Cam Video Pipeline & Storage Vault [✅]
- [✅] **27.1 Private Storage Bucket:** Configured Supabase Storage `penalty-evidence` with strict folder-level RLS.
- [✅] **27.2 Hardware Camera Capture:** Integrated Capacitor Camera and Media capture with 30MB/60s hardware caps.

## Phase 28: Mobile Viewport Adapters & Native Capacitor Bridge [✅]
- [✅] **28.1 Native HTTP Interceptor:** Configured Android cleartext bridge and local network routing to `192.168.1.18:3000`.
- [✅] **28.2 Hardware Keystore Signing:** Configured Android release compilation with `nflpickem-release.keystore`.

## Phase 29: Sunday Sweat Radar & Live Win Probability Projection Engine [✅]
- [✅] **29.1 Monte Carlo Simulation Engine:** Implemented 10,000-iteration gameday live outcome simulation.
- [✅] **29.2 Dynamic Ladder Projection:** Real-time projected shot debt exposure and Safe Haven tier calculation.

## Phase 30: 1-on-1 Head-to-Head Rivalry Duel & Crosshairs Battlegrounds [✅]
- [✅] **30.1 Battleground Game Isolation:** Real-time delta extraction isolating opposing picks on active slates.
- [✅] **30.2 Duel Decider Calculator:** Live branch swing arithmetic evaluating signed net point differentials.

## Phase 31: Dynamic Consensus Spread & Vegas Line Freezing [✅]
- [✅] **31.1 Line Freeze Automation:** Implemented pre-lock spread snapshotting derived from ESPN data feeds.
- [✅] **31.2 Consensus Tug-of-War UI:** Visual distribution percentage bars on matchup cards.

## Phase 32: Pre-Lock Matrix Topologies & Anti-Peeking Cohort Floors [✅]
- [✅] **32.1 Anti-Peeking Enforcement:** Strict masking of unrevealed picks until individual matchup kickoff.
- [✅] **32.2 Pre-Lock Matrix Rendering:** Avatar cluster distribution without leaking individual member picks.

## Phase 33: Gameday Live Drive Progression & ESPN Feed Integration [✅]
- [✅] **33.1 Live Telemetry Ingestion:** Sub-minute pollers streaming down, distance, clock, and territory progression.
- [✅] **33.2 Red Zone Alert Overlays:** Visual red-zone flash and turnover indicator badges on live matchup cards.

## Phase 34: In-App Administrative Tribunal & Penalty Ledger Compensations [✅]
- [✅] **34.1 Append-Only Ledger Triggers:** Installed `penalty_ledger_prevent_update_delete()` database trigger.
- [✅] **34.2 Compensating Reversal Engine:** Reversal entry tracking with balance verification.

## Phase 35: Offline State Snapshotting & Local Persistence Resilience [✅]
- [✅] **35.1 Scoped Local Caching:** Isolated pick storage keys `picks_${user.id}_${poolId}_w${week}`.
- [✅] **35.2 Rehydration Fallbacks:** Cloud-first hydration with deterministic local storage cache recovery.

## Phase 36: Pilot Season Day 1 Cutover & Release Candidate Hardening [✅]
- [✅] **36.1 Database Sanitization:** Reset legacy mock fixtures and established `Main League` production pool.
- [✅] **36.2 Release Candidate Verification:** Tagged `v36.0.0-pilot` release candidate binary.

## Phase 37: Shell Auth Modernization & Dynamic NFL Week Calendar [✅]
- [✅] **37.1 Authoritative Tuesday Rollover:** Implemented `getCurrentNFLWeek()` calendar resolver.
- [✅] **37.2 User Safety Lock:** Implemented user edit-protection toggle (`PROTECTED` / `EDITING`) separated from system slate status.

## Phase 38: Authoritative Onboarding Triggers & Universal AppHeader Parity [✅]
- [✅] **38.1 Database Auth Trigger:** Installed server-side `AFTER INSERT` trigger on `auth.users` (`handle_new_auth_user()`).
- [✅] **38.2 Universal AppHeader:** Standardized 56px branding wrapper across Picks, Matrix, Radar, Shame, and Profile.
- [✅] **38.3 Verified Release Build:** Compiled and cryptographically signed release binary (versionCode 62 / v38.4.6).

## Phase 39: Live Gameday Operations, Active Week 6 Sweat & Automated Adjudication [ACTIVE]
*Objective: Execute live Week 6 gameday tracking, automated kickoff locking, and real-time Tribunal adjudication.*
- [ ] **39.1 Week 6 Kickoff Lock Verification:** Automated server-side locking at Thursday Night Football kickoff (SEA @ DEN).
- [ ] **39.2 Live Sunday Sweat Radar Telemetry:** Real-time win probability simulation and dynamic ladder rank shifts.
- [ ] **39.3 Monday Night Tiebreaker Finalization:** Automated calculation of final shot debt allocations and Wall of Shame settlement.

---

## Phase 39–41: 5-Pass Product Review Architecture & Execution Plan (Synced October 13, 2026)

### Pass 1 — Phase 39 Sprint 1 (P39-S1): Dependable Information & Mathematical Truth [ACTIVE]
- **Submission & Lock State Separation (Decision #66)**: Explicitly distinguish local draft picks, server-confirmed submissions, and per-game kickoff locks (1 Locked / 13 Editable).
- **Explicit Slate Phase Telemetry**: Replace ambiguous pre-game LIVE PROJECTION / 0-0 displays with deterministic phase states (PRE_KICKOFF, LIVE_IN_PROGRESS, AWAITING_SETTLEMENT, SETTLED, SIMULATION) and scheduled kickoff times.
- **Tied Ranks & Tiebreaker Honesty**: Unify Radar and Ladder standing descriptors (Joint #1 on points - Tiebreak pending vs. Projected Safe Haven if standing holds vs. settled tiebreakers).
- **Traceable Spreads & Intel Attribution**: Require team-attributed spreads (DEN -2.5) and explicit Spread Unavailable states rather than raw 0 or [0] placeholders.
- **True League Swing Game Engine**: Require non-zero rank or charter tier movement; exclude 100% shared picks and replace 3-place podium claims in 2-player slates with exact #1 Safe Haven vs. #2 consequence copy.
- **Radar Duel Swing Arithmetic**: Replace +-2 PTS NET SWING on 1-point games with explicit conditional outcome tiles (SEA wins: +1 / DEN wins: -1) and 2 PT OUTCOME SPAN (-1 / +1).
- **Charter Shot Unit Precision (Decision #69)**: Replace ambiguous 0.00s formatting with human units (0 shots, 1 shot, 2.5 shots).

### Pass 2 — Phase 39 Sprint 2 (P39-S2): Mobile Speed, Shared Context & Rivalry Continuity [QUEUED]
- **Shared Pool + Week + Phase Context Header**: Persistent top context bar across all 5 destinations (Main League - Week 6 - Pre-Kickoff).
- **Semantic Visual Token Unification**: Lock Viewer = Cyan and Rival = Amber across both Matrix and Radar; enforce 48x48dp touch targets and WCAG contrast minimums.
- **Smart List / Swipe Workhorse & Bulk Preview**: Honor saved view mode or auto-select Swipe for unpicked slates and List for completed slates; add Presets and Clear All preview confirmation with pre-lock Undo guard.
- **Readable Matrix Filters & Denominators**: Add All, Split Picks, My Pick, and Live filter pills with prominent participation denominators (2 of 2, 8 of 10).
- **Unified Matrix + Radar Rivalry Workflow**: Share selectedRivalId across Matrix and Radar, auto-select the sole rival in a 2-player pool, and rename Lock Target to Open Duel.

### Pass 3 — Phase 39 Sprint 3 (P39-S3): Signature Sunday Sweat Features [QUEUED]
- **Personal Rooting Queue**: Prioritized Radar watch strip ordering live/upcoming games by rivalry and tier leverage.
- **Bounded Late-Game Escape (SNF/MNF)**: Exact mathematical survival and tiebreak scenarios when 1-2 games remain to escape The Pit or clinch #1.
- **Nemesis Records**: Settled head-to-head weekly duel ledger (Jack leads rivalry 3-2).
- **Lone Wolf & Split Decision Recognition**: Read-only badges derived from authorized pick distributions (Split Decision 1 of 2 / Lone Wolf 1 of 10).
- **Commissioner Readiness Room**: Operational summary card displaying Active Members, Pending Applicants, Slate Submission Readiness, and Next Kickoff Lock.

### Pass 4 — Phase 40 (P40): League Memory & Shareable Artifacts [BACKLOG]
- **Provisional Sweat Receipts**: Shareable session cards capturing live lead-change moments with provisional badges.
- **Season Story Timelines**: Settled historical progression for weekly rank, pick accuracy, and shot-debt balance.
- **Deterministic Weekly Recap Cards**: Shareable post-settlement summary cards (Champion, Rivalry Result, Weekly League Recap).

### Pass 5 — Phase 41 (P41): Social Expression, Native Alerts & Watch Party Big Board [BACKLOG]
- **Contextual Moment Reactions**: Quick game/receipt reactions (Called it, Pain, Pit bound) governed by pick visibility locks.
- **Opt-In Native Notifications**: Authoritative deadline reminders for unsubmitted slates, weekly settlement, and pending shot-reel obligations.
- **Watch Party Big Board**: Landscape browser layout for Sunday living-room displays showing live standings, featured duel, and swing games.
