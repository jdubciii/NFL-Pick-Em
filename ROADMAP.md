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

## Phase 5: Client UI Integration (Frontend) [🏃]
*Objective: Build the responsive web/mobile interface for users and admins.*
- [ ] **5.1 Auth & Navigation UI:** Build login screens and secure routing.
- [ ] **5.2 Weekly Slate & Picks UI:** Create the interface for users to browse upcoming games and submit picks before the visual lock countdown expires.
- [ ] **5.3 Live Leaderboard & Penalty Tracker:** Build the standings table and prominently highlight the weekly loser.
- [ ] **5.4 Admin Dashboard:** Build the UI for the Admin to override picks and configure pool settings.