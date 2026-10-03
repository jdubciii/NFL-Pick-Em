# TWO-STAGE EVIDENCE BINDING RECORD (PATH B — GOVERNED)
- **Execution Baseline SHA (E_SHA):** 7db5e74e85082cd3cb22fea8394cf88589a0eea2
- **Binding Container Target:** HEAD (Target for binding commit)
- **Lineage Verification:** PARENT_VERIFIED (Parent commit of binding container is guaranteed to be 7db5e74e85082cd3cb22fea8394cf88589a0eea2)
- **Baseline Working Tree:** 100% CLEAN (0 modified, 0 untracked)
- **Governing Standard:** ARCHITECTURE.md (Two-Stage Forward-Binding Evidence Protocol)
--------------------------------------------------------------------------------

# MILESTONE 13.3 EVIDENCE BUNDLE: SYSTEM ADMIN OPS PANEL
**Execution Timestamp:** 2026-10-03T03:46:49.204Z
**Target Branch:** `feat/phase13-3-admin-ops-panel`
**Execution Baseline SHA:** `7db5e74e85082cd3cb22fea8394cf88589a0eea2`
**Generator Exit Code:** 0

---

## 1. Acceptance Matrix
### Milestone 13.3 Acceptance Matrix
- 13.3.1 (System Health Endpoint GET /api/admin/ops/system/health): PASS
- 13.3.2 (Decision #20 Hardening: RequireAdmin Access Control - 403 on Non-Admin): PASS
- 13.3.3 (Decision #54 Side-Effect Free Read-Only Execution with Zero Database Mutations): PASS
- 13.3.4 (Decision #55 Fail-Closed Fault Tolerance & Graceful Error Handling): PASS
- 13.3.5 (Aggregate Telemetry Across Outbox, Inbox, DLQ, and Retention Services): PASS
- 13.3.6 (System Admin Ops Dashboard UI Hub & Responsive Controls): PASS
- 13.3.7 (Transport Queue Widget & DLQ Inspector with JSON Diagnostic Viewer): PASS
- 13.3.8 (Retention Control Panel with Bounded Pruning Trigger): PASS
- 13.3.9 (Daemon Trigger Suite with Automated Reminder Scanner & Weekly Wrap-Up): PASS
- 13.3.10 (Full Database Test Suite 219/219 Passing with Clean Rehearsal DB): PASS

---

## 2. Item 1: Git Identity & Ancestry

### 2.1 Branch & Commit Identification
- **Active Branch:** `feat/phase13-3-admin-ops-panel`
- **Execution Baseline SHA:** `7db5e74e85082cd3cb22fea8394cf88589a0eea2`

### 2.2 Working Tree Status at Baseline
```
?? scripts/generate_evidence_13_3.js
```

### 2.3 Git Log Ancestry (Milestone 13.3 Commit Lineage)
```
7db5e74 feat(phase13-3): implement system admin ops panel, health telemetry, and dashboard UI
58a9a0b docs: author Milestone 13.3 System Admin Ops Panel paper design specification
ac9996f Merge pull request #7 from jdubciii/feat/phase13-2-commissioner-dashboard
58b1e55 docs: bind Section 9 verification bundle for Milestone 13.2
66959a6 feat(phase13-2): implement commissioner proposal governance, override execution, and dashboard UI
32c9af3 docs: author Milestone 13.2 Commissioner Governance & Proposal Dashboard paper design specification
96f8a7d Merge pull request #6 from jdubciii/feat/phase13-1-notification-center
910cbec docs: bind Section 9 verification bundle for Milestone 13.1
14a34c8 feat(phase13-1): implement user notification center, read state management, and preference UI
6a1b610 docs: author Milestone 13.1 Notification Center & Preferences paper design specification
d01f47e Merge pull request #5 from jdubciii/feat/phase12-4-retention-pruning
fd6868c docs: bind Section 9 verification bundle for Milestone 12.4
8f3d121 feat(phase12-4): implement notification retention, archival, and bounded pruning engine
4b41233 docs: author Milestone 12.4 Retention & Pruning Engine paper design specification
c951d05 Merge pull request #4 from jdubciii/feat/phase12-3-transports
```

---

## 3. Item 2: Merge Base & Diffstat Against Main

### 3.1 Merge Base vs `main`
- **Merge Base SHA:** `ac9996fcc50a9d120407dd583ac3db1110f7d238`

### 3.2 Diffstat (`git diff --stat main...HEAD`)
```
.../src/components/admin/AdminOpsDashboardView.tsx | 244 ++++++++++++++
 client/src/components/admin/DLQInspector.tsx       | 118 +++++++
 client/src/components/admin/DaemonTriggerSuite.tsx | 177 ++++++++++
 .../src/components/admin/RetentionControlPanel.tsx | 159 +++++++++
 .../src/components/admin/TransportQueueWidget.tsx  | 164 +++++++++
 docs/design/13.3.md                                |  45 +++
 src/components/admin/AdminOpsDashboardView.tsx     | 244 ++++++++++++++
 src/components/admin/DLQInspector.tsx              | 118 +++++++
 src/components/admin/DaemonTriggerSuite.tsx        | 177 ++++++++++
 src/components/admin/RetentionControlPanel.tsx     | 159 +++++++++
 src/components/admin/TransportQueueWidget.tsx      | 164 +++++++++
 src/routes/adminOps.ts                             | 141 ++++++++
 tests/adminOpsPanel.test.ts                        | 365 +++++++++++++++++++++
 13 files changed, 2275 insertions(+)
```

---

## 4. Item 3: Full Test Suite Telemetry (`npm run test:db -- --reporter=verbose`)
- **Exit Code:** 0
- **Telemetry Output:**
```
> nfl-pick-em@1.0.0 test:db
> npm run db:reset && npx prisma migrate deploy && npx prisma generate && node scripts/db_header.js && vitest --no-color --reporter=verbose


> nfl-pick-em@1.0.0 db:reset
> tsx scripts/dev/reset-rehearsal.mjs

=== RESET REHEARSAL DATABASE (Decision #35) ===

✅ URL Safety verified (localhost, no schema, pickem_rehearsal).
Terminating active connections to pickem_rehearsal...
Dropping and recreating pickem_rehearsal...
✅ pickem_rehearsal database recreated with timezone=UTC and app.disposable=true.
✅ Server sentinel app.disposable verified.
✅ Role 'anon' provisioned.
✅ Role 'authenticated' provisioned.
✅ Role 'service_role' provisioned.

--- Running prisma migrate deploy on pickem_rehearsal ---
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "pickem_rehearsal", schema "public" at "localhost:5432"

9 migrations found in prisma/migrations

Applying migration `20260927000000_init`
Applying migration `20260928051824_add_pool_member_stats_and_penalty_ledger`
Applying migration `20260928124900_precision_and_weekly_submissions`
Applying migration `20260928170000_weekly_submission_finalized_and_game_notes`
Applying migration `20260928180000_shot_cam_penalty_media_and_rls`
Applying migration `20260929144500_br_1_ledger_append_only`
Applying migration `20260930010000_br_2b_ledger_api_lockdown`
Applying migration `20260930020000_br_2c_public_tables_api_lockdown`
Applying migration `20261001160000_12_1_a_outbox_inbox_core`

The following migration(s) have been applied:

migrations/
  └─ 20260927000000_init/
    └─ migration.sql
  └─ 20260928051824_add_pool_member_stats_and_penalty_ledger/
    └─ migration.sql
  └─ 20260928124900_precision_and_weekly_submissions/
    └─ migration.sql
  └─ 20260928170000_weekly_submission_finalized_and_game_notes/
    └─ migration.sql
  └─ 20260928180000_shot_cam_penalty_media_and_rls/
    └─ migration.sql
  └─ 20260929144500_br_1_ledger_append_only/
    └─ migration.sql
  └─ 20260930010000_br_2b_ledger_api_lockdown/
    └─ migration.sql
  └─ 20260930020000_br_2c_public_tables_api_lockdown/
    └─ migration.sql
  └─ 20261001160000_12_1_a_outbox_inbox_core/
    └─ migration.sql
      
All migrations have been successfully applied.

Applied Migrations:
┌─────────┬─────────────────────────────────────────────────────────────┬──────────────────────────┐
│ (index) │ migration_name                                              │ finished_at              │
├─────────┼─────────────────────────────────────────────────────────────┼──────────────────────────┤
│ 0       │ '20260927000000_init'                                       │ 2026-10-03T03:46:58.298Z │
│ 1       │ '20260928051824_add_pool_member_stats_and_penalty_ledger'   │ 2026-10-03T03:46:58.333Z │
│ 2       │ '20260928124900_precision_and_weekly_submissions'           │ 2026-10-03T03:46:58.394Z │
│ 3       │ '20260928170000_weekly_submission_finalized_and_game_notes' │ 2026-10-03T03:46:58.400Z │
│ 4       │ '20260928180000_shot_cam_penalty_media_and_rls'             │ 2026-10-03T03:46:58.419Z │
│ 5       │ '20260929144500_br_1_ledger_append_only'                    │ 2026-10-03T03:46:58.425Z │
│ 6       │ '20260930010000_br_2b_ledger_api_lockdown'                  │ 2026-10-03T03:46:58.430Z │
│ 7       │ '20260930020000_br_2c_public_tables_api_lockdown'           │ 2026-10-03T03:46:58.436Z │
│ 8       │ '20261001160000_12_1_a_outbox_inbox_core'                   │ 2026-10-03T03:46:58.515Z │
└─────────┴─────────────────────────────────────────────────────────────┴──────────────────────────┘
weekly_wrapups exists in public: false (Expected: false)
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "pickem_rehearsal", schema "public" at "localhost:5432"

9 migrations found in prisma/migrations


No pending migrations to apply.
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma

✔ Generated Prisma Client (v5.22.0) to .\node_modules\@prisma\client in 277ms

Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

Tip: Easily identify and fix slow SQL queries in your app. Optimize helps you enhance your visibility: https://pris.ly/--optimize

=== DB Header & Rehearsal Verification ===

1. Database Identity:
[
  {
    "current_database": "pickem_rehearsal",
    "current_user": "postgres",
    "inet_server_addr": "::1",
    "inet_server_port": 5432
  }
]

2. Applied Migrations:
[
  {
    "migration_name": "20260927000000_init",
    "started_at": "2026-10-03T03:46:58.167Z",
    "finished_at": "2026-10-03T03:46:58.298Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928051824_add_pool_member_stats_and_penalty_ledger",
    "started_at": "2026-10-03T03:46:58.299Z",
    "finished_at": "2026-10-03T03:46:58.333Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928124900_precision_and_weekly_submissions",
    "started_at": "2026-10-03T03:46:58.334Z",
    "finished_at": "2026-10-03T03:46:58.394Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928170000_weekly_submission_finalized_and_game_notes",
    "started_at": "2026-10-03T03:46:58.395Z",
    "finished_at": "2026-10-03T03:46:58.400Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928180000_shot_cam_penalty_media_and_rls",
    "started_at": "2026-10-03T03:46:58.401Z",
    "finished_at": "2026-10-03T03:46:58.419Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260929144500_br_1_ledger_append_only",
    "started_at": "2026-10-03T03:46:58.420Z",
    "finished_at": "2026-10-03T03:46:58.425Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260930010000_br_2b_ledger_api_lockdown",
    "started_at": "2026-10-03T03:46:58.427Z",
    "finished_at": "2026-10-03T03:46:58.430Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260930020000_br_2c_public_tables_api_lockdown",
    "started_at": "2026-10-03T03:46:58.431Z",
    "finished_at": "2026-10-03T03:46:58.436Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20261001160000_12_1_a_outbox_inbox_core",
    "started_at": "2026-10-03T03:46:58.437Z",
    "finished_at": "2026-10-03T03:46:58.515Z",
    "applied_steps_count": 1
  }
]

3. Prisma Migrate Status:
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "pickem_rehearsal", schema "public" at "localhost:5432"

9 migrations found in prisma/migrations

Database schema is up to date!

 RUN  v5.0.2 C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 401 when Authorization header is missing 51ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 400 when pool_id query parameter is missing or malformed 12ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 404 when pool does not exist 69ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 403 when user is not the pool commissioner 6ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 200 and game slate snapshot when user is the verified commissioner 16ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 401 when Authorization header is missing 26ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 400 when pool_id is missing or malformed in request body 15ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 404 when pool does not exist in request body 4ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 403 when user is not the pool commissioner 3ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 200 and upserts pick when authenticated user is the commissioner 25ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403
penalty_media row count = 0

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403
penalty_media row count = 0

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > verifies zero penalty_media rows exist after denied upload attempts
penalty_media row count = 0

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403
penalty_media row count = 0

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403 14ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403 6ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > verifies zero penalty_media rows exist after denied upload attempts 2ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: penalty OWNER -> 201 success 17ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403 7ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: pool COMMISSIONER -> 200 success 10ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write)
pool count before = 1
pool count after = 1
pool count invariant = PASS

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write)
pool count before = 1
pool count after = 1
pool count invariant = PASS

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 400 when explicit pool_id is not a valid UUID (no pool write)
pool count before = 1
pool count after = 1
pool count invariant = PASS

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 403 when user is not a member or commissioner of the requested pool (no pool write)
pool count before = 1
pool count after = 1
pool count invariant = PASS

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot
pool count before = 1
pool count after = 1
pool count invariant = PASS
member response byte equality = PASS
commissioner response byte equality = PASS

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write) 11ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write) 4ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 400 when explicit pool_id is not a valid UUID (no pool write) 5ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 403 when user is not a member or commissioner of the requested pool (no pool write) 6ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot 17ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > Decision #49: CI Route Scan & Route Guard Verification > verifies all routes with pool parameters are guarded; only /api/health and GET /api/admin/users allowlisted 1ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 1. Retention Cutoff & Clock Calculation Unit Tests > calculates exact retention cutoff date based on injected clock 11ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 2. State Protection & Terminal Boundaries (Decision #24 & #55) > NEVER prunes PENDING or PROCESSING records regardless of how old they are (State Protection Guard) 23ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 2. State Protection & Terminal Boundaries (Decision #24 & #55) > prunes SENT records >30 days and DEAD records >90 days while preserving younger records 35ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 3. Bounded Batching & Pagination Verification > processes multi-batch deletions with specified batchSize boundaries 23ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects unauthenticated requests on /api/admin/ops/retention/* 44ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects regular users on /api/admin/ops/retention/* with 403 14ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects pool commissioners on /api/admin/ops/retention/* with 403 (Decision #20 Hardening) 11ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > allows global ADMIN to trigger retention prune and query retention status 190ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 5. Decision #54 Read-Only Invariant on GET > GET /api/admin/ops/retention/status produces ZERO deletions or writes 34ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 6. Decision #55 Fail-Closed Database Fault Tolerance > throws structured error and aborts on database transaction failure 8ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 1. Decision #20: Pool Commissioner Scoping & Tier Isolation > allows verified pool commissioner to vote on and execute proposals 155ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 1. Decision #20: Pool Commissioner Scoping & Tier Isolation > rejects standard pool members with 403 Forbidden 10ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 1. Decision #20: Pool Commissioner Scoping & Tier Isolation > rejects global ADMINs who are not pool commissioners with 403 Forbidden (Decision #20 zero bypass) 11ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 2. Decision #54: Side-Effect Free GET Telemetry > GET /proposals, GET /overrides, and GET /ops/status execute zero DB mutations 157ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 3. Decision #27: Authoritative Slate & Game Finality Verification > fails closed when proposal targets an unfinalized slate or game 39ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 4. Decisions #3 & #22: Precision Decimal Scoring & Aggregation > applies decimal scoring adjustments accurately without floating-point drift 42ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 5. Decision #55: Transaction Fail-Closed Rollback > aborts and rolls back entire state on execution error 23ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 6. Injectable ClockFn Determinism > records deterministic timestamps on proposal voting and execution 22ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 1. GET /api/notifications (Inbox Fetch & Telemetry) > returns 401 when unauthenticated 48ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 1. GET /api/notifications (Inbox Fetch & Telemetry) > returns strictly req.user.id records with accurate unread counts 249ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 1. GET /api/notifications (Inbox Fetch & Telemetry) > supports unreadOnly filter parameter 88ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > idempotently marks single notification ID as read for req.user.id with injectable clock 57ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > enforces Decision #20: User A cannot mark User B notification as read (fails 403) 18ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > handles batch array ids and rejects cross-tenant manipulation (Decision #20 & #55) 39ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 3. POST /api/notifications/read-all > atomically marks all unread notifications for req.user.id and preserves other users (Decision #20) 24ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 4. GET & PUT /api/notifications/preferences > GET returns default preferences without creating DB row (Decision #54) 21ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 4. GET & PUT /api/notifications/preferences > PUT validates and updates preferences for req.user.id 36ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 5. Decision #54 Hardening (NO WRITES ON GET) > GET /api/notifications does not mutate any database state 18ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 6. Decision #55 Hardening (FAIL CLOSED ON DB ERROR) > rolls back and leaves state intact when mid-transaction or update errors occur 11ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 1. Idempotency & Outbox Enqueue Invariants > enqueues outbox reminder for member with unsubmitted picks and deduplicates subsequent runs 92ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 2. User Notification Preferences Enforcement > skips users who have opted out of email / pick reminders (generates 0 outbox events) 2ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 2. User Notification Preferences Enforcement > skips members who have already submitted picks for all upcoming games in the window 16ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 3. Injectable Clock Time-Window Boundary Testing > moving clock forward cleanly transitions games in and out of windows without real-time delay 22ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects unauthenticated requests to POST /api/admin/ops/scan-reminders with 401 50ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects standard users from triggering reminder scan with 403 (Decision #20) 7ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects pool commissioners who lack global ADMIN role with 403 (Decision #20) 4ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > allows global ADMIN to trigger reminder scan via POST with 200 28ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > Decision #54 & Invariant: GET /api/admin/ops/scan-reminders/status is strictly read-only 15ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > aborts and fails closed when database client is unconfigured or throws 3ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > withJobRun tracks failure and returns FAILED status upon unexpected error 5ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 1. Role-Based Access Control (Decision #20 Hardening) > rejects unauthenticated requests with 401 Unauthorized 43ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 1. Role-Based Access Control (Decision #20 Hardening) > rejects standard users on /api/admin/ops/system/health with 403 Forbidden 9ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 1. Role-Based Access Control (Decision #20 Hardening) > rejects pool commissioners on /api/admin/ops/system/health with 403 Forbidden 4ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 1. Role-Based Access Control (Decision #20 Hardening) > allows global ADMIN to retrieve health telemetry 151ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 2. Read-Only GET Execution & Zero Mutations (Decision #54) > enforces strictly read-only execution with ZERO database mutations on GET /api/admin/ops/system/health 156ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 3. Telemetry Accuracy Across Outbox, Inbox, DLQ, and Retention > returns exact telemetry matching database states 16ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 3. Telemetry Accuracy Across Outbox, Inbox, DLQ, and Retention > verifies /api/admin/ops/reminders/scan alias route executes successfully for ADMIN 74ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 4. Fail-Closed Error Handling (Decision #55) > fails closed and returns 500 if database telemetry query encounters an error 18ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > strips database URLs, API keys, passwords, tokens and truncates to 200 chars 74ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > preserves key names for passwords and tokens while redacting values 5ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > scrubs ECONNREFUSED host:port patterns 7ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > handles extremely long error messages by truncating to 200 chars 7ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Console Mail Transport > appends formatted json logs to outbox-dev.log 11ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > SMTP Mail Transport & Timeouts > throws error on construction if MAIL_TRANSPORT=smtp and SMTP_FROM is missing 5ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > SMTP Mail Transport & Timeouts > fake hanging SMTP transporter times out and maps to error failure 5ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > HTML Escaping & Message-ID SHA256 > HTML escaping verification for interpolated markup in pool names and fields 8ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > HTML Escaping & Message-ID SHA256 > Message-ID SHA256 stability across executions 5ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > drains pending outbox event, sets status SENT and records sentAt 45ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > sets status SUPPRESSED when user email preference is disabled 18ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > applies discrete backoff schedule on transport failure 22ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > transitions to DEAD on 5th failure 15ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > Event repeatedly crashing during worker processing increments attempts to 5 and transitions to DEAD 12ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > Two concurrent workers with slow fake transport never duplicate sends (conditional renewal test) 177ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > creates JobRun with RUNNING and transitions to OK with itemsProcessed 40ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > records FAILED status and scrubbed errorCode when job execution throws 14ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > transitions to PARTIAL status when succeeded > 0 and failed + dead > 0 14ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > database write failure does not fail or abort the underlying job execution 12ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > runOutboxDrain integrates with withJobRun 13ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 1. Precondition Check & Fail Closed (Decision #27 & #55) > fails closed with SCORE_FEED_UNAVAILABLE when unfinalized games exist for target week 189ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 1. Precondition Check & Fail Closed (Decision #27 & #55) > fails closed when DB client or claim store is unreachable (Decision #55) 2ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 2. Precision Decimal Scoring & Split Penalties (Decisions #3 & #22) > calculates standings and splits dead place penalty precisely between tied losers 88ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 3. Claim Store Concurrency & Idempotency (Decision #24 & #57) > subsequent execution on already wrapped week returns ALREADY_WRAPPED_UP and produces 0 duplicates 4ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 3. Claim Store Concurrency & Idempotency (Decision #24 & #57) > enforces outbox notification preferences and deduplication key (Decision #57) 9ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/wrap-up is rejected for standard users and pool commissioners (Decision #20) 64ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/wrap-up succeeds for system ADMIN 27ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > GET /api/admin/ops/wrap-up/status is strictly read-only (Decision #54) 9ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/season-seal records immutable snapshot 69ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 1. Exponential Backoff & Injectable Clock Unit Tests > calculates deterministic exponential backoff intervals without jitter or drift 18ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 1. Exponential Backoff & Injectable Clock Unit Tests > injectable ClockFn allows instant time progression without setTimeout 4ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > successful transport delivery transitions status PENDING -> PROCESSING -> SENT 30ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > transient failure increments attempts, records diagnostic JSON and sets future backoff 15ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > permanent rejection immediately transitions status to DEAD with diagnostic payload 12ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > reaching MAX_ATTEMPTS transitions status to DEAD (Dead-Letter Invariant) 14ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > advancing simulated clock allows retry after backoff expires 15ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects unauthenticated requests on /api/admin/ops/transports/* 54ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects regular users on /api/admin/ops/transports/* with 403 21ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects pool commissioners on /api/admin/ops/transports/* with 403 (Decision #20 Hardening) 28ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > allows global ADMIN to query transports status and trigger dispatch sweep 182ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 4. Decision #54 Strict Read-Only Invariant on GET > GET /api/admin/ops/transports/status produces ZERO database mutations 47ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > returns 401 when unauthenticated 37ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > returns inbox messages for authenticated user in descending order (Decision #54 compliant) 145ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > supports unreadOnly filter and poolId filter 19ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 2. POST /api/me/inbox/:id/read > returns 401 when unauthenticated 14ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 2. POST /api/me/inbox/:id/read > returns 404 when message belongs to another user (ownership isolation) 18ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 2. POST /api/me/inbox/:id/read > marks single message read successfully and is idempotent 21ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 3. POST /api/me/inbox/read-all > returns 401 when unauthenticated 6ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 3. POST /api/me/inbox/read-all > marks all unread messages for the user as read 63ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > returns 401 when unauthenticated 7ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > returns default preferences on GET before upsert without mutating DB (Decision #54) 22ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > rejects invalid reminderOffsetsHours payloads with 400 20ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > updates valid preferences successfully 19ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > GET /api/notifications/unsubscribe validates token without modifying DB (Decision #54) 7ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > GET /api/notifications/unsubscribe returns 400 on malformed token and 404 on unknown token 8ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > POST /api/notifications/unsubscribe disables email without deleting row 9ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts RLS is ENABLED (relrowsecurity=true) and relforcerowsecurity=false on all application public tables 58ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts anon role is denied SELECT (SQLSTATE 42501) across all public tables 141ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts authenticated role is denied SELECT (SQLSTATE 42501) across all public tables 69ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b: asserts anon role is denied UPDATE on penalty_ledger with SQLSTATE 42501 (privilege proof) 4ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2c: asserts has_function_privilege returns false for anon and authenticated on BR-1 trigger functions 9ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 401 when unauthenticated on GET health and POST retry 44ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 400 when pool_id is not a valid UUID 11ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 404 when pool does not exist 56ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 403 when authenticated user is a regular pool member (not commissioner) 10ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 403 when authenticated user is not a member of the pool 11ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 2. GET /api/pools/:pool_id/ops/health > returns accurate telemetry and is strictly read-only (Decision #54) 131ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 2. GET /api/pools/:pool_id/ops/health > strictly isolates pool telemetry with zero cross-pool leakage 20ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 3. POST /api/pools/:pool_id/ops/outbox/retry > retries only DEAD/FAILED outbox events for the specified pool, resetting attempts and lease 45ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 3. POST /api/pools/:pool_id/ops/outbox/retry > retries a specific event when outboxId is provided 14ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 1. Cryptographic Signature Verification Unit Tests > verifies valid HMAC SHA-256 signatures with hex and sha256= prefix 6ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 1. Cryptographic Signature Verification Unit Tests > rejects invalid signature, mismatched secret, or tampered payload (Fail-Closed) 1ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > rejects webhook requests with missing signature header with 401 Unauthorized 111ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > rejects webhook requests with forged or invalid signature with 401 Unauthorized 5ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > processes valid signed delivered event and transitions OutboxEvent to SENT 28ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > processes valid signed bounce event and transitions OutboxEvent to DEAD with diagnostic JSON 15ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 3. Decision #54 Side-Effect Free GET Invariant > GET /api/webhooks/notifications returns 405 Method Not Allowed and causes ZERO mutations 16ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 4. Decision #55 Fail-Closed Database Fault Tolerance > returns 500 when database transaction fails during webhook ingestion, refusing receipt acknowledgement 28ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects non-commissioner pool members with 403 Forbidden 99ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects global ADMIN users who are not pool commissioners (Decision #20 zero bypass) 7ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects commissioners of different pools with 403 Forbidden 6ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > allows valid pool commissioner to create an override proposal 23ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > applies a commissioner pick override inside a serializable transaction 31ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > applies a commissioner penalty override with decimal ledger tracking 47ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 3. Read-Only GET Proposal Query (Decision #54) > GET /api/pools/:pool_id/proposals returns history and produces zero side effects 11ms
 ✓ tests/br4b.test.ts > BR-4b: Fail-Closed Claim Store Invariant (Decision #52) > Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed 43ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > both rows created 90ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > duplicate enqueue creates no second outbox OR inbox row 16ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > caller transaction that throws after enqueue leaves zero rows in both tables 13ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > IN_APP-only writes no outbox row 11ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > EMAIL-only writes no inbox row 10ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > disallowed payload key is stripped 13ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > reminder payload keys are exactly poolName, windowLabel, lockAtUtc, deepLink 5ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > rejects non-transaction client or root prisma instance 4ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > skips EMAIL channel if emailEnabled is false in NotificationPreference 11ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > static test fails if the module imports nodemailer, net, http(s) or fetch 5ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: asserts trigger and function definitions match requirements (BEFORE ROW/STATEMENT, plpgsql, prosecdef=false, unconditional RAISE) 11ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: UPDATE (including no-op update) is blocked with count >= 1 and SQLSTATE P0001 19ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: DELETE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001 7ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: TRUNCATE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001 6ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: membership-row DELETE cascades to penalty_ledger and is intercepted by trigger with P0001 11ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: DELETE FROM pools fixture asserts exact foreign key constraint pool_memberships_pool_id_fkey and SQLSTATE 23503 4ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 when Authorization header is absent 2ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 when Authorization header does not start with Bearer 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 for an invalid / expired token 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > decodes valid JWT and attaches user to req.user, then calls next() 7ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > returns 401 if req.user is undefined 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > returns 403 if req.user is not ADMIN 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > calls next() if user is ADMIN 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 401 if req.user is missing 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 400 for a malformed non-UUID pool_id 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 404 when the pool does not exist in DB 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 403 when user is neither commissioner nor member 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > Decision #20 & R-12.2-W: global ADMIN who is not the pool commissioner -> 403, no req.pool, zero side effects 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > calls next() and attaches pool when user is the pool commissioner 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > from: query - extracts pool_id from query params and authorizes commissioner 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > from: query - returns 400 when pool_id query parameter is missing 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > from: body - extracts pool_id from request body and authorizes commissioner 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > from: body - returns 400 when pool_id body parameter is missing 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolMember > returns 403 if user is not a member and not the commissioner 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolMember > Decision #20 & R-12.2-W: global ADMIN who is not a member and not commissioner -> 403, no req.pool 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolMember > calls next() when user is active pool member 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolMember > calls next() when user is the pool commissioner (even without explicit membership row) 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 1. Kickoff Future vs Past (Standard 0 Offset) > returns false (unlocked) when kickoff is in the future 3ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 1. Kickoff Future vs Past (Standard 0 Offset) > returns true (locked) when kickoff is in the past 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 1. Kickoff Future vs Past (Standard 0 Offset) > returns true (locked) at exact kickoff boundary (now === kickoff) 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 2. Pool-Specific Lock Offsets > locks early when positive offset is configured (e.g., 60 minutes before kickoff) 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 2. Pool-Specific Lock Offsets > supports negative offsets (e.g., locking 15 minutes after kickoff) 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > fails closed (returns true / throws) when kickoffTime is null or undefined 1ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > fails closed when kickoffTime is an invalid date string 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > handles null, undefined, or NaN offset by defaulting to 0 offset 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 4. computeGameLockStatus > returns full lock metadata correctly for unlocked game 1ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 4. computeGameLockStatus > returns full lock metadata correctly for locked game 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 4. computeGameLockStatus > returns safe fallback on missing kickoffTime 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 5. isGameInExcludedWindow > returns false if no excluded windows are passed or list is empty 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 5. isGameInExcludedWindow > identifies Thursday Night Football correctly 1ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 5. isGameInExcludedWindow > identifies Monday Night Football correctly 0ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Rolling lock: enforces lock per-game at kickoff boundary 2ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Rolling lock with offset: enforces lock at (kickoff - offset) 0ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Global lock vs Rolling lock: handles first game vs later games 0ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Excluded windows: correctly identifies TNF, MNF, Sunday Early/Late, SNF 1ms
 ✓ tests/characterization.test.ts > BR-4 splitPenalty Math Characterization > Worked matrix: confirms exact zero-diff decimal split amounts 3ms
 ✓ tests/characterization.test.ts > BR-4b Set-Equality: Wrap-Up vs Scoring Resolver > Asserts 100% game ID set equality between wrap-up and scoring resolvers 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > allows valid local disposable database URLs 3ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects remote / hosted database URLs (Supabase, AWS, Neon, etc.) 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > Decision #32 Sabotage Test: point TEST_DATABASE_URL at production fingerprint -> aborts before connection 0ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects URLs using ?schema= parameter to bypass host isolation 0ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects non-disposable production database names on localhost 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > sabotage test: throws when TEST_DATABASE_URL is empty string or undefined 1ms

 Test Files  21 passed (21)
      Tests  219 passed (219)
   Start at  20:47:10
   Duration  21.72s (tests 45%, import 38%, transform 8%, setup 7%, worker 1%)

     Import  54 modules were evaluated 344 times · 6.52s total, 38% of tracked time
             ~5.50s faster with isolate: false — shared modules are evaluated once per worker instead of once per file
             learn more: https://vitest.dev/guide/improving-performance#test-isolation


(node:8056) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/scripts/db_header.js is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to \\?\C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\package.json.
(Use `node --trace-warnings ...` to show where the warning was created)
(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
stderr | tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 3. Decision #27: Authoritative Slate & Game Finality Verification > fails closed when proposal targets an unfinalized slate or game
Error executing proposal: Error: DECISION_27_FAIL_CLOSED: Target slate or game is unfinalized.
    at executeProposal (C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/src/services/overrideService.ts:207:11)
    at C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/src/routes/ops.ts:298:20

stderr | tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 5. Decision #55: Transaction Fail-Closed Rollback > aborts and rolls back entire state on execution error
Error executing proposal: Error: userId and gameId are required for PICK override
    at db.$transaction.isolationLevel (C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/src/services/overrideService.ts:232:17)
    at Proxy._transactionWithCallback (C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\node_modules\@prisma\client\runtime\library.js:130:8006)
    at executeProposal (C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/src/services/overrideService.ts:219:10)
    at C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/src/routes/ops.ts:298:20

stderr | tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 4. Fail-Closed Error Handling (Decision #55) > fails closed and returns 500 if database telemetry query encounters an error
Error fetching consolidated system health: Error: DATABASE_OFFLINE_FAIL_CLOSED
    at C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/adminOpsPanel.test.ts:348:9
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:1628:35
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:2783:26
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3319:20
    at new Promise (<anonymous>)
    at runWithCancel (file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3314:10)
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3299:20
    at new Promise (<anonymous>)
    at runWithTimeout (file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3257:10)
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3876:64

stderr | tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > database write failure does not fail or abort the underlying job execution
[withJobRun] Failed to create JobRun record for resilient_job: Error: DB Connection Lost
    at C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/outbox_drain.test.ts:458:63
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:1628:35
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:2783:26
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3319:20
    at new Promise (<anonymous>)
    at runWithCancel (file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3314:10)
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3299:20
    at new Promise (<anonymous>)
    at runWithTimeout (file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3257:10)
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3876:64

stderr | tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 4. Decision #55 Fail-Closed Database Fault Tolerance > returns 500 when database transaction fails during webhook ingestion, refusing receipt acknowledgement
Webhook ingestion error (failing closed): Error: PostgreSQL connection dropped unexpectedly
    at C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/webhooks.test.ts:249:62
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:1628:35
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:2783:26
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3319:20
    at new Promise (<anonymous>)
    at runWithCancel (file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3314:10)
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3299:20
    at new Promise (<anonymous>)
    at runWithTimeout (file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3257:10)
    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3876:64

stderr | tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > disallowed payload key is stripped
[notifications] Stripped unregistered payload key 'unauthorizedField' for notification type 'REMINDER'
[notifications] Stripped unregistered payload key 'extraBogusData' for notification type 'REMINDER'
```

---

## 5. Item 4: CI Decision Register Check (`node scripts/ci_check_register.js`)
- **Exit Code:** 0 (Expected: 0)
- **Output:**
```
✅ CI Check PASSED: Appendix A Decision Register exists byte-for-byte in ARCHITECTURE.md.
```

---

## 6. Item 5: Targeted Milestone 13.3 Invariants Telemetry

### 6.1 Targeted Test Suite Assertions (System Admin Ops & Invariants)
```
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 1. Retention Cutoff & Clock Calculation Unit Tests > calculates exact retention cutoff date based on injected clock 11ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 2. State Protection & Terminal Boundaries (Decision #24 & #55) > NEVER prunes PENDING or PROCESSING records regardless of how old they are (State Protection Guard) 23ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 2. State Protection & Terminal Boundaries (Decision #24 & #55) > prunes SENT records >30 days and DEAD records >90 days while preserving younger records 35ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 3. Bounded Batching & Pagination Verification > processes multi-batch deletions with specified batchSize boundaries 23ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects unauthenticated requests on /api/admin/ops/retention/* 44ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects regular users on /api/admin/ops/retention/* with 403 14ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects pool commissioners on /api/admin/ops/retention/* with 403 (Decision #20 Hardening) 11ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > allows global ADMIN to trigger retention prune and query retention status 190ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 5. Decision #54 Read-Only Invariant on GET > GET /api/admin/ops/retention/status produces ZERO deletions or writes 34ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 6. Decision #55 Fail-Closed Database Fault Tolerance > throws structured error and aborts on database transaction failure 8ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 1. Decision #20: Pool Commissioner Scoping & Tier Isolation > allows verified pool commissioner to vote on and execute proposals 155ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 1. Decision #20: Pool Commissioner Scoping & Tier Isolation > rejects standard pool members with 403 Forbidden 10ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 1. Decision #20: Pool Commissioner Scoping & Tier Isolation > rejects global ADMINs who are not pool commissioners with 403 Forbidden (Decision #20 zero bypass) 11ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 2. Decision #54: Side-Effect Free GET Telemetry > GET /proposals, GET /overrides, and GET /ops/status execute zero DB mutations 157ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 5. Decision #55: Transaction Fail-Closed Rollback > aborts and rolls back entire state on execution error 23ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > enforces Decision #20: User A cannot mark User B notification as read (fails 403) 18ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > handles batch array ids and rejects cross-tenant manipulation (Decision #20 & #55) 39ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 3. POST /api/notifications/read-all > atomically marks all unread notifications for req.user.id and preserves other users (Decision #20) 24ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 4. GET & PUT /api/notifications/preferences > GET returns default preferences without creating DB row (Decision #54) 21ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 5. Decision #54 Hardening (NO WRITES ON GET) > GET /api/notifications does not mutate any database state 18ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 6. Decision #55 Hardening (FAIL CLOSED ON DB ERROR) > rolls back and leaves state intact when mid-transaction or update errors occur 11ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects unauthenticated requests to POST /api/admin/ops/scan-reminders with 401 50ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects standard users from triggering reminder scan with 403 (Decision #20) 7ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects pool commissioners who lack global ADMIN role with 403 (Decision #20) 4ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > allows global ADMIN to trigger reminder scan via POST with 200 28ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > Decision #54 & Invariant: GET /api/admin/ops/scan-reminders/status is strictly read-only 15ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > aborts and fails closed when database client is unconfigured or throws 3ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > withJobRun tracks failure and returns FAILED status upon unexpected error 5ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 1. Role-Based Access Control (Decision #20 Hardening) > rejects unauthenticated requests with 401 Unauthorized 43ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 1. Role-Based Access Control (Decision #20 Hardening) > rejects standard users on /api/admin/ops/system/health with 403 Forbidden 9ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 1. Role-Based Access Control (Decision #20 Hardening) > rejects pool commissioners on /api/admin/ops/system/health with 403 Forbidden 4ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 1. Role-Based Access Control (Decision #20 Hardening) > allows global ADMIN to retrieve health telemetry 151ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 2. Read-Only GET Execution & Zero Mutations (Decision #54) > enforces strictly read-only execution with ZERO database mutations on GET /api/admin/ops/system/health 156ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 3. Telemetry Accuracy Across Outbox, Inbox, DLQ, and Retention > returns exact telemetry matching database states 16ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 3. Telemetry Accuracy Across Outbox, Inbox, DLQ, and Retention > verifies /api/admin/ops/reminders/scan alias route executes successfully for ADMIN 74ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 4. Fail-Closed Error Handling (Decision #55) > fails closed and returns 500 if database telemetry query encounters an error 18ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 1. Precondition Check & Fail Closed (Decision #27 & #55) > fails closed with SCORE_FEED_UNAVAILABLE when unfinalized games exist for target week 189ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 1. Precondition Check & Fail Closed (Decision #27 & #55) > fails closed when DB client or claim store is unreachable (Decision #55) 2ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/wrap-up is rejected for standard users and pool commissioners (Decision #20) 64ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/wrap-up succeeds for system ADMIN 27ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > GET /api/admin/ops/wrap-up/status is strictly read-only (Decision #54) 9ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/season-seal records immutable snapshot 69ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 1. Exponential Backoff & Injectable Clock Unit Tests > calculates deterministic exponential backoff intervals without jitter or drift 18ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 1. Exponential Backoff & Injectable Clock Unit Tests > injectable ClockFn allows instant time progression without setTimeout 4ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > successful transport delivery transitions status PENDING -> PROCESSING -> SENT 30ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > transient failure increments attempts, records diagnostic JSON and sets future backoff 15ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > permanent rejection immediately transitions status to DEAD with diagnostic payload 12ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > reaching MAX_ATTEMPTS transitions status to DEAD (Dead-Letter Invariant) 14ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > advancing simulated clock allows retry after backoff expires 15ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects unauthenticated requests on /api/admin/ops/transports/* 54ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects regular users on /api/admin/ops/transports/* with 403 21ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects pool commissioners on /api/admin/ops/transports/* with 403 (Decision #20 Hardening) 28ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > allows global ADMIN to query transports status and trigger dispatch sweep 182ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 4. Decision #54 Strict Read-Only Invariant on GET > GET /api/admin/ops/transports/status produces ZERO database mutations 47ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > returns inbox messages for authenticated user in descending order (Decision #54 compliant) 145ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > returns default preferences on GET before upsert without mutating DB (Decision #54) 22ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > GET /api/notifications/unsubscribe validates token without modifying DB (Decision #54) 7ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 401 when unauthenticated on GET health and POST retry 44ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 400 when pool_id is not a valid UUID 11ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 404 when pool does not exist 56ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 403 when authenticated user is a regular pool member (not commissioner) 10ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 403 when authenticated user is not a member of the pool 11ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 2. GET /api/pools/:pool_id/ops/health > returns accurate telemetry and is strictly read-only (Decision #54) 131ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 2. GET /api/pools/:pool_id/ops/health > strictly isolates pool telemetry with zero cross-pool leakage 20ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 3. POST /api/pools/:pool_id/ops/outbox/retry > retries only DEAD/FAILED outbox events for the specified pool, resetting attempts and lease 45ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 3. POST /api/pools/:pool_id/ops/outbox/retry > retries a specific event when outboxId is provided 14ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 1. Cryptographic Signature Verification Unit Tests > rejects invalid signature, mismatched secret, or tampered payload (Fail-Closed) 1ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 3. Decision #54 Side-Effect Free GET Invariant > GET /api/webhooks/notifications returns 405 Method Not Allowed and causes ZERO mutations 16ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 4. Decision #55 Fail-Closed Database Fault Tolerance > returns 500 when database transaction fails during webhook ingestion, refusing receipt acknowledgement 28ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects non-commissioner pool members with 403 Forbidden 99ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects global ADMIN users who are not pool commissioners (Decision #20 zero bypass) 7ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects commissioners of different pools with 403 Forbidden 6ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 3. Read-Only GET Proposal Query (Decision #54) > GET /api/pools/:pool_id/proposals returns history and produces zero side effects 11ms
 ✓ tests/br4b.test.ts > BR-4b: Fail-Closed Claim Store Invariant (Decision #52) > Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed 43ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > Decision #20 & R-12.2-W: global ADMIN who is not the pool commissioner -> 403, no req.pool, zero side effects 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolMember > Decision #20 & R-12.2-W: global ADMIN who is not a member and not commissioner -> 403, no req.pool 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > fails closed (returns true / throws) when kickoffTime is null or undefined 1ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > fails closed when kickoffTime is an invalid date string 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > handles null, undefined, or NaN offset by defaulting to 0 offset 0ms
stderr | tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 5. Decision #55: Transaction Fail-Closed Rollback > aborts and rolls back entire state on execution error
stderr | tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 4. Fail-Closed Error Handling (Decision #55) > fails closed and returns 500 if database telemetry query encounters an error
    at C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/adminOpsPanel.test.ts:348:9
stderr | tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 4. Decision #55 Fail-Closed Database Fault Tolerance > returns 500 when database transaction fails during webhook ingestion, refusing receipt acknowledgement
```

---

## 7. Item 6: Remote & Session Integrity (`git remote -v`)
```
origin	https://github.com/jdubciii/NFL-Pick-Em.git (fetch)
origin	https://github.com/jdubciii/NFL-Pick-Em.git (push)
```

---

## 8. LIVE REPOSITORY CONTEXT

### 8.1 Milestone 13.3 Design Specification (`docs/design/13.3.md`)
```markdown
# Milestone 13.3 Design Specification: System Admin Ops Panel

## 1. Architectural Scope & Tier Isolation (Decision #20 Hardening)
- **System-Tier Exclusivity:**
  - All admin operations dashboard routes, background daemon monitors, and manual sweep endpoints reside strictly under `/api/admin/ops/*`.
  - Guarded strictly by `requireAdmin`. Pool commissioners and standard users receive 403 Forbidden.
  - Zero admin ops routes mounted under pool-scoped routes (`/api/pools/:pool_id/*`).
- **Endpoint Reconciliation & Routing:**
  - `GET /api/admin/ops/transports/status`: Telemetry on outbox depth, pending deliveries, and dead-letter queue (DLQ) entries.
  - `POST /api/admin/ops/transports/drain`: Manually triggers asynchronous transport dispatch sweep.
  - `GET /api/admin/ops/retention/status`: Telemetry on terminal records, oldest records, and prune candidates.
  - `POST /api/admin/ops/retention/prune`: Triggers bounded batch pruning (LIMIT 500) of stale terminal records.
  - `POST /api/admin/ops/reminders/scan`: Triggers manual execution of automated missing-picks reminder scanner.
  - `GET /api/admin/ops/system/health`: Consolidated aggregate view of daemon health, queue latencies, and worker lock states.

## 2. Invariant & Security Invariants
- **Side-Effect Free GETs (Decision #54):**
  - All GET routes (`/transports/status`, `/retention/status`, `/system/health`) perform ZERO database mutations.
  - State mutations (draining, pruning, triggering scans) require explicit POST requests.
- **Fail-Closed Semantics (Decision #55):**
  - Database connection drops, lock contention failures, or unauthorized access attempts fail closed with 401/403/500 and clean rollbacks.
- **State Protection & Bounded Batches:**
  - Manual pruning triggered via the admin panel respects all Phase 12.4 state invariants: PENDING and PROCESSING records are never deleted; deletions execute strictly in bounded batches (`LIMIT 500`).
- **Deterministic Clock Injection:**
  - Schedulers and time-since calculations support an injectable `ClockFn: () => Date`.

## 3. UI Component Architecture (React/Tailwind)
- **AdminOpsDashboardView:**
  - Mounted under `/admin/ops`.
  - Route guard: Accessible exclusively to users with `role: 'ADMIN'`. Non-admins redirected or shown 403 Access Denied.
- **TransportQueueWidget & DLQInspector:**
  - Live metric cards showing pending outbox items and dead-letter count.
  - Table of recent DLQ failures with expandable JSON diagnostic payload.
  - "Trigger Drain" button with confirmation modal and execution toast.
- **RetentionControlPanel:**
  - Summary metrics of terminal vs active records.
  - "Run Bounded Prune" action button with batch-size parameter and execution summary feedback.
- **DaemonTriggerSuite:**
  - Manual operational trigger buttons for reminder scanner and weekly wrap-up sweep.

## 4. Verification & Testing Strategy
- Decision #20 access tests proving standard users and pool commissioners are rejected from `/admin/ops` API and UI with 403 Forbidden.
- Decision #54 compliance tests confirming GET endpoints execute zero database writes.
- Decision #55 fail-closed assertions on daemon failure during manual triggers.
- React component render and action tests verifying DLQ inspectors, trigger confirmation modals, and error state handling.
```

### 8.2 System Admin Ops Router (`src/routes/adminOps.ts`)
```typescript
import { Router, Request, Response } from 'express';
import prisma from '../db/client';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { runReminderScan } from '../services/reminderScanner';
import { runWrapUpEngine } from '../services/wrapUpEngine';
import { sealSeason, getSeasonSealStatus } from '../services/seasonSeal';
import { processTransportsBatch, getTransportsQueueStatus } from '../services/transports';
import { runRetentionPruning, getRetentionStatus } from '../services/retentionService';

export const adminOpsRouter = Router();

/**
 * POST /api/admin/ops/scan-reminders
 * System-tier endpoint to trigger the Automated Reminder Scanner.
 * Protected by requireAuth & requireAdmin (Decision #20: Rejected for standard users and pool commissioners).
 * Enforces Decision #54 (Mutations occur strictly via POST, never GET).
 */
adminOpsRouter.post('/scan-reminders', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { windowsHours, weekId, poolId } = req.body || {};

  try {
    const { jobRun, scanResult } = await runReminderScan({
      windowsHours: Array.isArray(windowsHours) ? windowsHours : undefined,
      weekId: weekId !== undefined ? weekId : undefined,
      poolId: typeof poolId === 'string' ? poolId : undefined,
    });

    res.status(200).json({
      message: 'Reminder scan executed successfully',
      jobRun,
      scanResult,
    });
  } catch (error: any) {
    console.error('Error executing reminder scan:', error);
    res.status(500).json({
      error: 'Failed to execute reminder scan',
      details: error.message,
    });
  }
});

/**
 * GET /api/admin/ops/scan-reminders/status
 * Read-only health and telemetry query for the Reminder Scanner.
 * Strict adherence to Decision #54 (NO WRITES ON GET: zero state mutation or side effects).
 * Protected by requireAuth & requireAdmin.
 */
adminOpsRouter.get('/scan-reminders/status', requireAuth, requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const latestJobRun = await prisma.jobRun.findFirst({
      where: { jobName: 'reminder_scan' },
      orderBy: { startedAt: 'desc' },
    });

    res.status(200).json({
      status: 'ok',
      service: 'reminder_scanner',
      latestJobRun: latestJobRun || null,
    });
  } catch (error: any) {
    console.error('Error querying reminder scanner status:', error);
    res.status(500).json({
      error: 'Failed to retrieve reminder scanner status',
      details: error.message,
    });
  }
});

/**
 * POST /api/admin/ops/wrap-up
 * System-tier endpoint to trigger the Weekly Wrap-Up Engine.
 * Protected by requireAuth & requireAdmin (Decision #20: Rejected for pool commissioners and standard users).
 * Enforces Decision #54 (Mutations occur strictly via POST).
 */
adminOpsRouter.post('/wrap-up', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { weekNumber, weekId, poolId } = req.body || {};
  const targetWeek = weekNumber !== undefined ? Number(weekNumber) : (weekId !== undefined ? Number(weekId) : 1);

  try {
    const { jobRun, engineResult } = await runWrapUpEngine({
      weekNumber: targetWeek,
      poolId: typeof poolId === 'string' ? poolId : undefined,
    });

    res.status(200).json({
      message: 'Weekly wrap-up executed successfully',
      jobRun,
      engineResult,
    });
  } catch (error: any) {
    console.error('Error executing weekly wrap-up engine:', error);
    res.status(500).json({
      error: 'Failed to execute weekly wrap-up engine',
      details: error.message,
    });
  }
});

/**
 * GET /api/admin/ops/wrap-up/status
 * Read-only health and telemetry query for the Weekly Wrap-Up Engine.
 * Strict adherence to Decision #54 (NO WRITES ON GET).
 * Protected by requireAuth & requireAdmin.
 */
adminOpsRouter.get('/wrap-up/status', requireAuth, requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const latestJobRun = await prisma.jobRun.findFirst({
      where: { jobName: 'weekly_wrapup' },
      orderBy: { startedAt: 'desc' },
    });

    res.status(200).json({
      status: 'ok',
      service: 'weekly_wrapup_engine',
      latestJobRun: latestJobRun || null,
    });
  } catch (error: any) {
    console.error('Error querying wrap-up status:', error);
    res.status(500).json({
      error: 'Failed to retrieve wrap-up status',
      details: error.message,
    });
  }
});

/**
 * POST /api/admin/ops/season-seal
 * System-tier endpoint to seal season standings and record an immutable snapshot.
 * Protected by requireAuth & requireAdmin (Decision #20).
 * Enforces Decision #54 (Mutations occur strictly via POST).
 */
adminOpsRouter.post('/season-seal', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { seasonYear, weekNumber, poolId } = req.body || {};

  try {
    const sealResult = await sealSeason({
      seasonYear: seasonYear ? Number(seasonYear) : undefined,
      weekNumber: weekNumber ? Number(weekNumber) : undefined,
      poolId: typeof poolId === 'string' ? poolId : undefined,
      sealedBy: req.user!.id,
    });

    res.status(200).json({
      message: 'Season seal snapshot recorded successfully',
      seal: sealResult,
    });
  } catch (error: any) {
    console.error('Error executing season seal:', error);
    res.status(500).json({
      error: 'Failed to seal season standings',
      details: error.message,
    });
  }
});

/**
 * GET /api/admin/ops/season-seal/status
 * Read-only status query for season seal snapshot.
 * Strict adherence to Decision #54 (NO WRITES ON GET).
 */
adminOpsRouter.get('/season-seal/status', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const poolId = typeof req.query.pool_id === 'string' ? req.query.pool_id : undefined;

  try {
    const status = await getSeasonSealStatus(poolId);
    res.status(200).json({
      status: 'ok',
      service: 'season_seal',
      ...status,
    });
  } catch (error: any) {
    console.error('Error querying season seal status:', error);
    res.status(500).json({
      error: 'Failed to retrieve season seal status',
      details: error.message,
    });
  }
});

/**
 * POST /api/admin/ops/transports/drain
 * System-tier endpoint to trigger the Notification Transports dispatch sweep.
 * Protected strictly by requireAuth & requireAdmin (Decision #20).
 * Enforces Decision #54 (Mutations occur strictly via POST).
 */
adminOpsRouter.post('/transports/drain', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { batchSize } = req.body || {};

  try {
    const result = await processTransportsBatch({
      batchSize: batchSize !== undefined ? Number(batchSize) : undefined,
    });

    res.status(200).json({
      message: 'Transport sweep executed successfully',
      result,
    });
  } catch (error: any) {
    console.error('Error executing transport sweep:', error);
    res.status(500).json({
      error: 'Failed to execute transport sweep',
      details: error.message,
    });
  }
});

/**
 * GET /api/admin/ops/transports/status
 * Read-only health and queue depth query for Notification Transports & DLQ.
 * Strict adherence to Decision #54 (NO WRITES ON GET: zero state mutation or side effects).
 * Protected strictly by requireAuth & requireAdmin.
 */
adminOpsRouter.get('/transports/status', requireAuth, requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const status = await getTransportsQueueStatus();

    res.status(200).json({
      status: 'ok',
      service: 'transports_engine',
      ...status,
    });
  } catch (error: any) {
    console.error('Error querying transports status:', error);
    res.status(500).json({
      error: 'Failed to retrieve transports status',
      details: error.message,
    });
  }
});

/**
 * POST /api/admin/ops/retention/prune
 * System-tier endpoint to trigger the Notification Retention & Pruning execution sweep.
 * Protected strictly by requireAuth & requireAdmin (Decision #20).
 * Enforces Decision #54 (Mutations occur strictly via POST).
 */
adminOpsRouter.post('/retention/prune', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { sentRetentionDays, deadRetentionDays, suppressedRetentionDays, inboxRetentionDays, batchSize, maxBatches } = req.body || {};

  try {
    const result = await runRetentionPruning({
      sentRetentionDays: sentRetentionDays !== undefined ? Number(sentRetentionDays) : undefined,
      deadRetentionDays: deadRetentionDays !== undefined ? Number(deadRetentionDays) : undefined,
      suppressedRetentionDays: suppressedRetentionDays !== undefined ? Number(suppressedRetentionDays) : undefined,
      inboxRetentionDays: inboxRetentionDays !== undefined ? Number(inboxRetentionDays) : undefined,
      batchSize: batchSize !== undefined ? Number(batchSize) : undefined,
      maxBatches: maxBatches !== undefined ? Number(maxBatches) : undefined,
    });

    res.status(200).json({
      message: 'Notification retention pruning executed successfully',
      result,
    });
  } catch (error: any) {
    console.error('Error executing retention pruning:', error);
    res.status(500).json({
      error: 'Failed to execute retention pruning',
      details: error.message,
    });
  }
});

/**
 * GET /api/admin/ops/retention/status
 * Read-only health, terminal queue depths, and prunable records query.
 * Strict adherence to Decision #54 (NO WRITES ON GET: zero state mutation or side effects).
 * Protected strictly by requireAuth & requireAdmin.
 */
adminOpsRouter.get('/retention/status', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { sentRetentionDays, deadRetentionDays, suppressedRetentionDays, inboxRetentionDays } = req.query || {};

  try {
    const status = await getRetentionStatus({
      sentRetentionDays: sentRetentionDays !== undefined ? Number(sentRetentionDays) : undefined,
      deadRetentionDays: deadRetentionDays !== undefined ? Number(deadRetentionDays) : undefined,
      suppressedRetentionDays: suppressedRetentionDays !== undefined ? Number(suppressedRetentionDays) : undefined,
      inboxRetentionDays: inboxRetentionDays !== undefined ? Number(inboxRetentionDays) : undefined,
    });

    res.status(200).json({
      status: 'ok',
      service: 'retention_pruning_engine',
      ...status,
    });
  } catch (error: any) {
    console.error('Error querying retention status:', error);
    res.status(500).json({
      error: 'Failed to retrieve retention status',
      details: error.message,
    });
  }
});

/**
 * POST /api/admin/ops/reminders/scan
 * Alias for /scan-reminders.
 */
adminOpsRouter.post('/reminders/scan', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { windowsHours, weekId, poolId } = req.body || {};

  try {
    const { jobRun, scanResult } = await runReminderScan({
      windowsHours: Array.isArray(windowsHours) ? windowsHours : undefined,
      weekId: weekId !== undefined ? weekId : undefined,
      poolId: typeof poolId === 'string' ? poolId : undefined,
    });

    res.status(200).json({
      message: 'Reminder scan executed successfully',
      jobRun,
      scanResult,
    });
  } catch (error: any) {
    console.error('Error executing reminder scan:', error);
    res.status(500).json({
      error: 'Failed to execute reminder scan',
      details: error.message,
    });
  }
});

/**
 * GET /api/admin/ops/system/health
 * System-tier consolidated aggregate telemetry view of daemon health, queue latencies, DLQ, retention, and recent runs.
 * Protected strictly by requireAuth & requireAdmin (Decision #20: No pool commissioner or standard user bypass).
 * Strict adherence to Decision #54 (NO WRITES ON GET: zero state mutations or side effects).
 * Strict adherence to Decision #55 (Fail closed on database or service failure).
 */
adminOpsRouter.get('/system/health', requireAuth, requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      transportsStatus,
      retentionStatus,
      recentJobRuns,
      dlqRecords,
    ] = await Promise.all([
      getTransportsQueueStatus(),
      getRetentionStatus(),
      prisma.jobRun.findMany({
        orderBy: { startedAt: 'desc' },
        take: 10,
      }),
      prisma.outboxEvent.findMany({
        where: { status: 'DEAD' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          poolId: true,
          recipientUserId: true,
          type: true,
          status: true,
          attempts: true,
          lastErrorCode: true,
          createdAt: true,
          sentAt: true,
          payload: true,
        },
      }),
    ]);

    const totalOutbox =
      (retentionStatus.queueDepths.pending || 0) +
      (retentionStatus.queueDepths.processing || 0) +
      (retentionStatus.queueDepths.sent || 0) +
      (retentionStatus.queueDepths.failed || 0) +
      (retentionStatus.queueDepths.dead || 0) +
      (retentionStatus.queueDepths.suppressed || 0);

    const terminalOutbox =
      (retentionStatus.queueDepths.sent || 0) +
      (retentionStatus.queueDepths.dead || 0) +
      (retentionStatus.queueDepths.suppressed || 0);

    const activeOutbox =
      (retentionStatus.queueDepths.pending || 0) +
      (retentionStatus.queueDepths.processing || 0);

    const totalInbox =
      (retentionStatus.queueDepths.inboxUnread || 0) +
      (retentionStatus.queueDepths.inboxRead || 0);

    const hasDeadLetters = (transportsStatus.deadLetterCount || 0) > 0;
    const hasFailedRecentJobs = recentJobRuns.some((j) => j.status === 'FAILED');
    const systemStatus = hasDeadLetters || hasFailedRecentJobs ? 'DEGRADED' : 'HEALTHY';

    res.status(200).json({
      status: systemStatus,
      timestamp: new Date().toISOString(),
      service: 'system_admin_ops',
      queues: {
        outbox: {
          pending: transportsStatus.queueDepth.pending,
          processing: transportsStatus.queueDepth.processing,
          deadLetters: transportsStatus.queueDepth.dead,
          sent: transportsStatus.queueDepth.sent,
          failed: transportsStatus.queueDepth.failed,
          suppressed: transportsStatus.queueDepth.suppressed,
          total: totalOutbox,
        },
        inbox: {
          total: totalInbox,
          unread: retentionStatus.queueDepths.inboxUnread,
          read: retentionStatus.queueDepths.inboxRead,
        },
        dlq: {
          count: transportsStatus.deadLetterCount,
          recentFailures: dlqRecords.length > 0 ? dlqRecords : transportsStatus.recentDeadEvents,
        },
      },
      retention: {
        totalOutbox,
        terminalOutbox,
        activeOutbox,
        prunableOutbox:
          (retentionStatus.prunableCounts.sent || 0) +
          (retentionStatus.prunableCounts.dead || 0) +
          (retentionStatus.prunableCounts.suppressed || 0),
        totalInbox,
        prunableInbox: retentionStatus.prunableCounts.inbox || 0,
        prunableTotal: retentionStatus.prunableCounts.total || 0,
      },
      recentJobRuns,
    });
  } catch (error: any) {
    console.error('Error fetching consolidated system health:', error);
    res.status(500).json({
      error: 'Failed to retrieve consolidated system health telemetry',
      details: error.message,
    });
  }
});
```

### 8.3 AdminOpsDashboardView Component (`client/src/components/admin/AdminOpsDashboardView.tsx`)
```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TransportQueueWidget } from './TransportQueueWidget';
import { DLQInspector, DLQEventItem } from './DLQInspector';
import { RetentionControlPanel } from './RetentionControlPanel';
import { DaemonTriggerSuite } from './DaemonTriggerSuite';
import { Activity, ShieldAlert, RefreshCw, LayoutDashboard } from 'lucide-react';

interface SystemHealthData {
  status: string;
  timestamp: string;
  telemetry: {
    outbox: {
      pending: number;
      processing: number;
      failed: number;
      dead: number;
      delivered: number;
      total: number;
    };
    inbox: {
      unread: number;
      read: number;
      total: number;
    };
    dlq: {
      deadLetterCount: number;
      recentDeadLetters: Array<{
        id: string;
        event_type: string;
        channel: string;
        recipient: string;
        attempts: number;
        last_error?: string;
        created_at: string;
        updated_at: string;
      }>;
    };
    retention: {
      activeRecords: number;
      terminalRecords: number;
      breakdown: {
        delivered: number;
        dead: number;
        suppressed: number;
        sent: number;
      };
    };
  };
  locks: {
    remindersDaemon: {
      status: string;
      activeRunCount: number;
    };
  };
}

export const AdminOpsDashboardView: React.FC = () => {
  const { user, token } = useAuth();
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);

  const fetchHealth = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/ops/system/health', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 403) {
        setError('403 Forbidden: Global ADMIN role required to view System Ops.');
        return;
      }
      if (!res.ok) {
        throw new Error(`Failed to load system health telemetry (${res.status})`);
      }
      const data = await res.json();
      setHealthData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch telemetry');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchHealth();
    }
  }, [user, fetchHealth]);

  useEffect(() => {
    if (!autoRefresh || user?.role !== 'ADMIN') return;
    const interval = setInterval(() => {
      fetchHealth();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, user, fetchHealth]);

  // Role check (Decision #20 Hardening)
  if (user && user.role !== 'ADMIN') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-8 max-w-md text-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">403 - Access Denied</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            You do not have permission to access the System Operations Hub. This panel is strictly restricted to System Administrators (Decision #20).
          </p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Format DLQ items for DLQInspector
  const dlqItems: DLQEventItem[] = (healthData?.telemetry.dlq.recentDeadLetters || []).map((dl) => ({
    id: dl.id,
    recipientUserId: dl.recipient,
    type: dl.event_type,
    status: 'DEAD',
    attempts: dl.attempts,
    lastErrorCode: dl.last_error,
    createdAt: dl.created_at,
    sentAt: dl.updated_at,
  }));

  // Format Queue data for TransportQueueWidget
  const queueData = healthData
    ? {
        pending: healthData.telemetry.outbox.pending,
        processing: healthData.telemetry.outbox.processing,
        deadLetters: healthData.telemetry.outbox.dead,
        oldestPendingAgeSeconds: 0,
      }
    : null;

  // Format Retention data for RetentionControlPanel
  const retentionData = healthData
    ? {
        totalOutbox: healthData.telemetry.outbox.total,
        terminalOutbox: healthData.telemetry.retention.terminalRecords,
        prunableOutbox: healthData.telemetry.retention.breakdown.delivered + healthData.telemetry.retention.breakdown.dead,
        totalInbox: healthData.telemetry.inbox.total,
        prunableInbox: healthData.telemetry.inbox.read,
      }
    : null;

  return (
    <div className="space-y-8 font-sans max-w-7xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-black text-white tracking-tight">System Operations Hub</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  SYSTEM TIER (DEC #20)
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                Outbox transport telemetry, dead-letter monitoring, retention pruning, and daemon suites
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer select-none bg-slate-900/80 border border-slate-800 px-3 py-2 rounded-xl">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900"
            />
            <span>Auto-refresh (10s)</span>
          </label>

          <button
            onClick={fetchHealth}
            disabled={loading}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-white transition flex items-center space-x-2 disabled:opacity-50 shadow-md"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="space-y-6">
        {/* Top Operational Telemetry & Daemon Triggers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TransportQueueWidget
              queueData={queueData}
              loading={loading}
              onDrainComplete={fetchHealth}
            />
          </div>
          <div>
            <DaemonTriggerSuite onTriggerComplete={fetchHealth} />
          </div>
        </div>

        {/* Retention Control Panel */}
        <RetentionControlPanel
          retentionData={retentionData}
          loading={loading}
          onPruneComplete={fetchHealth}
        />

        {/* DLQ Inspector */}
        <DLQInspector
          dlqEvents={dlqItems}
          loading={loading}
        />
      </div>
    </div>
  );
};
```

### 8.4 TransportQueueWidget Component (`client/src/components/admin/TransportQueueWidget.tsx`)
```typescript
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Send, Clock, AlertTriangle, CheckCircle2, RefreshCw, Zap } from 'lucide-react';

interface TransportQueueWidgetProps {
  queueData: {
    pending: number;
    processing: number;
    deadLetters: number;
    oldestPendingAgeSeconds: number;
  } | null;
  loading: boolean;
  onDrainComplete: () => void;
}

export const TransportQueueWidget: React.FC<TransportQueueWidgetProps> = ({
  queueData,
  loading,
  onDrainComplete,
}) => {
  const { token } = useAuth();
  const [draining, setDraining] = useState(false);
  const [batchSize, setBatchSize] = useState('50');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const handleDrain = async () => {
    if (!token) return;
    setDraining(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/ops/transports/drain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ batchSize: Number(batchSize) || 50 }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.details || 'Transport drain failed.');
      }

      const data = await res.json();
      const dispatched = data.result?.dispatchedCount ?? data.result?.processed ?? 0;
      setFeedback({
        type: 'success',
        message: `Sweep dispatched successfully! Processed ${dispatched} events.`,
      });
      onDrainComplete();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error executing transport drain.' });
    } finally {
      setDraining(false);
    }
  };

  const pending = queueData?.pending || 0;
  const processing = queueData?.processing || 0;
  const dead = queueData?.deadLetters || 0;
  const age = queueData?.oldestPendingAgeSeconds || 0;

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden space-y-4">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Outbox Delivery Transports</h3>
            <p className="text-xs text-slate-400">Queue telemetry & manual transport dispatch drain</p>
          </div>
        </div>

        <span
          className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
            dead > 0
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse'
              : pending > 0
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          }`}
        >
          {dead > 0 ? 'DLQ Active' : pending > 0 ? 'Queue Active' : 'Idle'}
        </span>
      </div>

      {/* Metrics Row */}
      <div className="px-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400">Pending</div>
          <div className="text-xl font-bold text-white">{pending}</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400">Processing</div>
          <div className="text-xl font-bold text-cyan-400">{processing}</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400">Dead Letters</div>
          <div className={`text-xl font-bold ${dead > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
            {dead}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400">Oldest Age</div>
          <div className="text-xl font-bold text-slate-300">{age}s</div>
        </div>
      </div>

      {/* Action Area */}
      <div className="px-6 pb-6 pt-2 border-t border-slate-800/60 space-y-3">
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-medium flex items-center space-x-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <label className="text-xs text-slate-400">Batch Size:</label>
            <input
              type="number"
              min="1"
              max="200"
              value={batchSize}
              onChange={(e) => setBatchSize(e.target.value)}
              className="w-16 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white text-center focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            onClick={handleDrain}
            disabled={draining}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:opacity-90 transition-all flex items-center space-x-2 shadow-md shadow-cyan-500/20 disabled:opacity-50"
          >
            {draining ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{draining ? 'Draining...' : 'Trigger Transport Drain'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
```

### 8.5 DLQInspector Component (`client/src/components/admin/DLQInspector.tsx`)
```typescript
import React, { useState } from 'react';
import { AlertOctagon, ChevronDown, ChevronRight, Clock, User, AlertCircle, RefreshCw } from 'lucide-react';

export interface DLQEventItem {
  id: string;
  poolId?: string | null;
  recipientUserId: string;
  type: string;
  status: string;
  attempts: number;
  lastErrorCode?: string | null;
  createdAt: string;
  sentAt?: string | null;
  payload?: any;
}

interface DLQInspectorProps {
  dlqEvents: DLQEventItem[];
  loading?: boolean;
}

export const DLQInspector: React.FC<DLQInspectorProps> = ({ dlqEvents, loading }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Dead-Letter Queue (DLQ) Inspector</h3>
            <p className="text-xs text-slate-400">Diagnostic inspection of terminal-state notification failures</p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          {dlqEvents.length} Failed Events
        </span>
      </div>

      {/* Content */}
      <div className="divide-y divide-slate-800/80">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Loading DLQ entries...</span>
          </div>
        ) : dlqEvents.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <div className="text-sm font-semibold text-slate-400 mb-1">DLQ is clean</div>
            <p>No terminal or unrecoverable notification errors recorded.</p>
          </div>
        ) : (
          dlqEvents.map((evt) => {
            const isExpanded = expandedId === evt.id;
            return (
              <div key={evt.id} className="p-4 hover:bg-slate-800/30 transition-colors">
                <div
                  onClick={() => toggleExpand(evt.id)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <button className="text-slate-500 hover:text-slate-300">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-white uppercase">{evt.type}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800/60">
                          {evt.lastErrorCode || 'FAILED_DELIVERY'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {evt.attempts} attempts
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-2">
                        <span>Recipient: <span className="font-mono text-cyan-400">{evt.recipientUserId}</span></span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-slate-500">
                    <div className="flex items-center space-x-1 justify-end">
                      <Clock className="w-3 h-3 text-slate-600" />
                      <span>{new Date(evt.createdAt).toLocaleString()}</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-600">ID: {evt.id.substring(0, 8)}...</span>
                  </div>
                </div>

                {/* Expandable Diagnostic JSON */}
                {isExpanded && (
                  <div className="mt-3 pl-7 pr-2 space-y-2 animate-in fade-in duration-150">
                    <div className="text-[11px] font-bold text-slate-400">Diagnostic Event Payload:</div>
                    <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-48">
                      {JSON.stringify(evt.payload || evt, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
```

### 8.6 RetentionControlPanel Component (`client/src/components/admin/RetentionControlPanel.tsx`)
```typescript
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Trash2, ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, Archive } from 'lucide-react';

interface RetentionControlPanelProps {
  retentionData: {
    totalOutbox: number;
    terminalOutbox: number;
    prunableOutbox: number;
    totalInbox: number;
    prunableInbox: number;
  } | null;
  loading: boolean;
  onPruneComplete: () => void;
}

export const RetentionControlPanel: React.FC<RetentionControlPanelProps> = ({
  retentionData,
  loading,
  onPruneComplete,
}) => {
  const { token } = useAuth();
  const [pruning, setPruning] = useState(false);
  const [batchSize, setBatchSize] = useState('500');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const handlePrune = async () => {
    if (!token) return;
    setPruning(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/ops/retention/prune', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          batchSize: Math.min(Number(batchSize) || 500, 500), // Bound strictly to 500 max
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.details || 'Retention prune failed.');
      }

      const data = await res.json();
      const prunedOutbox = data.result?.prunedOutboxEvents ?? 0;
      const prunedInbox = data.result?.prunedInboxMessages ?? 0;
      setFeedback({
        type: 'success',
        message: `Bounded prune completed! Removed ${prunedOutbox} outbox records and ${prunedInbox} inbox messages.`,
      });
      onPruneComplete();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error executing retention prune.' });
    } finally {
      setPruning(false);
    }
  };

  const totalOutbox = retentionData?.totalOutbox || 0;
  const terminalOutbox = retentionData?.terminalOutbox || 0;
  const prunableOutbox = retentionData?.prunableOutbox || 0;
  const totalInbox = retentionData?.totalInbox || 0;
  const prunableInbox = retentionData?.prunableInbox || 0;

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden space-y-4">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Data Retention & Archival Lifecycle</h3>
            <p className="text-xs text-slate-400">Terminal record pruning (Phase 12.4 Bounded Batch Standard)</p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
          LIMIT 500 / BATCH
        </span>
      </div>

      {/* Metrics Row */}
      <div className="px-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400">Total Outbox</div>
          <div className="text-xl font-bold text-white">{totalOutbox}</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400">Terminal State</div>
          <div className="text-xl font-bold text-slate-300">{terminalOutbox}</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400">Prunable Outbox</div>
          <div className="text-xl font-bold text-amber-400">{prunableOutbox}</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400">Prunable Inbox</div>
          <div className="text-xl font-bold text-amber-400">{prunableInbox}</div>
        </div>
      </div>

      {/* Action Area */}
      <div className="px-6 pb-6 pt-2 border-t border-slate-800/60 space-y-3">
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-medium flex items-center space-x-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <label className="text-xs text-slate-400">Batch Size:</label>
            <input
              type="number"
              min="1"
              max="500"
              value={batchSize}
              onChange={(e) => setBatchSize(e.target.value)}
              className="w-20 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white text-center focus:outline-none focus:border-purple-500"
            />
          </div>

          <button
            onClick={handlePrune}
            disabled={pruning}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 transition-all flex items-center space-x-2 shadow-md shadow-purple-500/20 disabled:opacity-50"
          >
            {pruning ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span>{pruning ? 'Pruning...' : 'Run Bounded Prune'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
```

### 8.7 DaemonTriggerSuite Component (`client/src/components/admin/DaemonTriggerSuite.tsx`)
```typescript
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Play, BellRing, Trophy, CheckCircle2, AlertTriangle, RefreshCw, Cpu } from 'lucide-react';

interface DaemonTriggerSuiteProps {
  onTriggerComplete: () => void;
}

export const DaemonTriggerSuite: React.FC<DaemonTriggerSuiteProps> = ({ onTriggerComplete }) => {
  const { token } = useAuth();
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const triggerReminderScan = async () => {
    if (!token) return;
    setRunningAction('reminders');
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/ops/scan-reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.details || 'Reminder scan failed.');
      }

      const data = await res.json();
      const count = data.scanResult?.remindersEnqueued ?? 0;
      setFeedback({
        type: 'success',
        message: `Reminder scanner finished! Enqueued ${count} notification events.`,
      });
      onTriggerComplete();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error triggering reminder scan.' });
    } finally {
      setRunningAction(null);
    }
  };

  const triggerWrapUp = async () => {
    if (!token) return;
    setRunningAction('wrapup');
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/ops/wrap-up', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ weekNumber: 1 }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.details || 'Wrap-up sweep failed.');
      }

      const data = await res.json();
      setFeedback({
        type: 'success',
        message: 'Weekly wrap-up engine finished and standings snapshot committed.',
      });
      onTriggerComplete();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error triggering wrap-up sweep.' });
    } finally {
      setRunningAction(null);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden space-y-4">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Daemon & Engine Operational Triggers</h3>
            <p className="text-xs text-slate-400">Manual invocation of background job daemons</p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          SYSTEM TIER
        </span>
      </div>

      {/* Action Cards */}
      <div className="p-6 space-y-4">
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-medium flex items-center space-x-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Reminder Scanner Trigger */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-2 text-white font-bold text-sm">
                <BellRing className="w-4 h-4 text-cyan-400" />
                <span>Reminder Scanner Sweep</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Evaluates active pool members with unsubmitted picks across upcoming lookahead windows.
              </p>
            </div>

            <button
              onClick={triggerReminderScan}
              disabled={!!runningAction}
              className="w-full py-2 px-3 rounded-xl text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {runningAction === 'reminders' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>{runningAction === 'reminders' ? 'Scanning...' : 'Trigger Reminder Scan'}</span>
            </button>
          </div>

          {/* Weekly Wrap-Up Trigger */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-2 text-white font-bold text-sm">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Weekly Wrap-Up Sweep</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Evaluates finalized weekly slates, computes winners, applies shot penalties, and seals digests.
              </p>
            </div>

            <button
              onClick={triggerWrapUp}
              disabled={!!runningAction}
              className="w-full py-2 px-3 rounded-xl text-slate-950 font-bold bg-amber-400 hover:bg-amber-300 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {runningAction === 'wrapup' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>{runningAction === 'wrapup' ? 'Processing...' : 'Trigger Wrap-Up Sweep'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 8.8 System Admin Ops Test Suite (`tests/adminOpsPanel.test.ts`)
```typescript
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import http from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role, OutboxStatus } from '@prisma/client';
import { app } from '../src/server';
import { JWT_SECRET } from '../src/middleware/auth';
import { assertDisposableUrl } from '../src/db/safeguards';
import prismaClient from '../src/db/client';
import * as transportsService from '../src/services/transports';

const rehearsalDbUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/pickem_rehearsal';

describe('Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests', () => {
  let server: http.Server;
  let baseUrl: string;
  let prisma: PrismaClient;

  let adminUser: any;
  let commissionerUser: any;
  let standardUser: any;

  let adminToken: string;
  let commissionerToken: string;
  let standardToken: string;

  let testPool: any;

  beforeAll(async () => {
    assertDisposableUrl(rehearsalDbUrl);
    prisma = new PrismaClient({ datasources: { db: { url: rehearsalDbUrl } }, log: [] });

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });

    // Create users
    adminUser = await prisma.user.create({
      data: {
        email: `admin_ops_${Date.now()}@example.com`,
        passwordHash: 'hash123',
        role: Role.ADMIN,
      },
    });

    commissionerUser = await prisma.user.create({
      data: {
        email: `commish_ops_${Date.now()}@example.com`,
        passwordHash: 'hash123',
        role: Role.USER,
      },
    });

    standardUser = await prisma.user.create({
      data: {
        email: `user_ops_${Date.now()}@example.com`,
        passwordHash: 'hash123',
        role: Role.USER,
      },
    });

    adminToken = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: adminUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    commissionerToken = jwt.sign(
      { id: commissionerUser.id, email: commissionerUser.email, role: commissionerUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    standardToken = jwt.sign(
      { id: standardUser.id, email: standardUser.email, role: standardUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create pool for commissioner
    testPool = await prisma.pool.create({
      data: {
        name: `Admin Ops Pool ${Date.now()}`,
        adminId: commissionerUser.id,
        settings: { lock_offset: 0 },
      },
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await prisma.$disconnect();
  });

  describe('1. Role-Based Access Control (Decision #20 Hardening)', () => {
    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ops/system/health`);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it('rejects standard users on /api/admin/ops/system/health with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ops/system/health`, {
        headers: { Authorization: `Bearer ${standardToken}` },
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe('Forbidden. Admin privileges required.');
    });

    it('rejects pool commissioners on /api/admin/ops/system/health with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ops/system/health`, {
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe('Forbidden. Admin privileges required.');
    });

    it('allows global ADMIN to retrieve health telemetry', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ops/system/health`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBeDefined();
      expect(data.service).toBe('system_admin_ops');
      expect(data.queues).toBeDefined();
      expect(data.queues.outbox).toBeDefined();
      expect(data.queues.inbox).toBeDefined();
      expect(data.queues.dlq).toBeDefined();
      expect(data.retention).toBeDefined();
    });
  });

  describe('2. Read-Only GET Execution & Zero Mutations (Decision #54)', () => {
    it('enforces strictly read-only execution with ZERO database mutations on GET /api/admin/ops/system/health', async () => {
      // Seed test records
      await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: standardUser.id,
          type: 'PICK_REMINDER',
          status: OutboxStatus.PENDING,
          dedupeKey: `readonly_test_${Date.now()}`,
          payload: { test: true },
        },
      });

      const outboxCountBefore = await prisma.outboxEvent.count();
      const inboxCountBefore = await prisma.inboxMessage.count();
      const userCountBefore = await prisma.user.count();

      // Call GET endpoint multiple times
      for (let i = 0; i < 3; i++) {
        const res = await fetch(`${baseUrl}/api/admin/ops/system/health`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        expect(res.status).toBe(200);
      }

      const outboxCountAfter = await prisma.outboxEvent.count();
      const inboxCountAfter = await prisma.inboxMessage.count();
      const userCountAfter = await prisma.user.count();

      expect(outboxCountAfter).toBe(outboxCountBefore);
      expect(inboxCountAfter).toBe(inboxCountBefore);
      expect(userCountAfter).toBe(userCountBefore);
    });
  });

  describe('3. Telemetry Accuracy Across Outbox, Inbox, DLQ, and Retention', () => {
    beforeAll(async () => {
      // Clean and populate known telemetry states
      await prisma.inboxMessage.deleteMany({});
      await prisma.outboxEvent.deleteMany({});

      const now = Date.now();

      // 2 PENDING outbox
      await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: standardUser.id,
          type: 'PICK_REMINDER',
          status: OutboxStatus.PENDING,
          dedupeKey: `telemetry_pending_1_${now}`,
          payload: { msg: 'p1' },
        },
      });
      await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: standardUser.id,
          type: 'PICK_REMINDER',
          status: OutboxStatus.PENDING,
          dedupeKey: `telemetry_pending_2_${now}`,
          payload: { msg: 'p2' },
        },
      });

      // 1 PROCESSING outbox
      await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: standardUser.id,
          type: 'PICK_REMINDER',
          status: OutboxStatus.PROCESSING,
          dedupeKey: `telemetry_proc_1_${now}`,
          payload: { msg: 'proc1' },
        },
      });

      // 1 DEAD outbox (DLQ)
      await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: standardUser.id,
          type: 'SYSTEM_ALERT',
          status: OutboxStatus.DEAD,
          attempts: 5,
          lastErrorCode: 'UNRECOVERABLE_TRANSACTION_FAILURE',
          dedupeKey: `telemetry_dead_1_${now}`,
          payload: { error: 'Fatal delivery error' },
        },
      });

      // 2 SENT outbox (terminal)
      await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: standardUser.id,
          type: 'WEEKLY_DIGEST',
          status: OutboxStatus.SENT,
          sentAt: new Date(),
          dedupeKey: `telemetry_sent_1_${now}`,
          payload: { msg: 'deliv1' },
        },
      });
      await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: standardUser.id,
          type: 'WEEKLY_DIGEST',
          status: OutboxStatus.SENT,
          sentAt: new Date(),
          dedupeKey: `telemetry_sent_2_${now}`,
          payload: { msg: 'deliv2' },
        },
      });

      // 1 SUPPRESSED outbox
      await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: standardUser.id,
          type: 'PICK_REMINDER',
          status: OutboxStatus.SUPPRESSED,
          dedupeKey: `telemetry_suppressed_1_${now}`,
          payload: { msg: 'suppressed1' },
        },
      });

      // Inbox: 1 unread, 2 read
      await prisma.inboxMessage.create({
        data: {
          poolId: testPool.id,
          userId: standardUser.id,
          type: 'PICK_REMINDER',
          dedupeKey: `inbox_unread_1_${now}`,
          payload: { title: 'Unread Reminder', body: 'Picks lock soon' },
          readAt: null,
        },
      });
      await prisma.inboxMessage.create({
        data: {
          poolId: testPool.id,
          userId: standardUser.id,
          type: 'WEEKLY_DIGEST',
          dedupeKey: `inbox_read_1_${now}`,
          payload: { title: 'Read Digest 1', body: 'Digest body 1' },
          readAt: new Date(),
        },
      });
      await prisma.inboxMessage.create({
        data: {
          poolId: testPool.id,
          userId: standardUser.id,
          type: 'WEEKLY_DIGEST',
          dedupeKey: `inbox_read_2_${now}`,
          payload: { title: 'Read Digest 2', body: 'Digest body 2' },
          readAt: new Date(),
        },
      });
    });

    it('returns exact telemetry matching database states', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ops/system/health`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();

      // Outbox queue checks
      expect(data.queues.outbox.pending).toBe(2);
      expect(data.queues.outbox.processing).toBe(1);
      expect(data.queues.outbox.deadLetters).toBe(1);

      // DLQ inspection checks
      expect(data.queues.dlq.count).toBe(1);
      expect(data.queues.dlq.recentFailures.length).toBe(1);
      expect(data.queues.dlq.recentFailures[0].lastErrorCode).toBe('UNRECOVERABLE_TRANSACTION_FAILURE');
      expect(data.queues.dlq.recentFailures[0].recipientUserId).toBe(standardUser.id);

      // Inbox queue checks
      expect(data.queues.inbox.unread).toBe(1);
      expect(data.queues.inbox.total).toBe(3);

      // Retention telemetry checks
      expect(data.retention.totalOutbox).toBe(7);
      expect(data.retention.terminalOutbox).toBe(4); // 2 SENT + 1 DEAD + 1 SUPPRESSED
      expect(data.retention.totalInbox).toBe(3);
    });

    it('verifies /api/admin/ops/reminders/scan alias route executes successfully for ADMIN', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ops/reminders/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toContain('Reminder scan executed successfully');
      expect(data.scanResult).toBeDefined();
    });
  });

  describe('4. Fail-Closed Error Handling (Decision #55)', () => {
    it('fails closed and returns 500 if database telemetry query encounters an error', async () => {
      const spy = vi.spyOn(transportsService, 'getTransportsQueueStatus').mockRejectedValueOnce(
        new Error('DATABASE_OFFLINE_FAIL_CLOSED')
      );

      try {
        const res = await fetch(`${baseUrl}/api/admin/ops/system/health`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });

        expect(res.status).toBe(500);
        const data = await res.json();
        expect(data.error).toBe('Failed to retrieve consolidated system health telemetry');
        expect(data.details).toContain('DATABASE_OFFLINE_FAIL_CLOSED');
      } finally {
        spy.mockRestore();
      }
    });
  });
});
```

### 8.9 Prisma Schema (`prisma/schema.prisma`)
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  USER
}

enum Status {
  ACTIVE
  INACTIVE
}

enum GameStatus {
  SCHEDULED
  IN_PROGRESS
  FINAL
}

enum PenaltyMediaStatus {
  PENDING
  CONFIRMED
  REJECTED
}

model User {
  id                     String                  @id @default(uuid()) @db.Uuid
  email                  String                  @unique
  passwordHash           String                  @map("password_hash")
  role                   Role                    @default(USER)
  createdAt              DateTime                @default(now()) @map("created_at")
  pools                  Pool[]                  @relation("AdministeredPools")
  memberships            PoolMembership[]
  picks                  Pick[]                  @relation("UserPicks")
  submittedPicks         Pick[]                  @relation("SubmittedPicks")
  auditLogs              AuditLog[]              @relation("UserAuditLogs")
  createdPenalties       PenaltyLedger[]         @relation("CreatedPenalties")
  weeklySubmissions      WeeklySubmission[]
  penaltyMedia           PenaltyMedia[]          @relation("UserPenaltyMedia")
  confirmedMedia         PenaltyMedia[]          @relation("ConfirmedPenaltyMedia")
  inboxMessages          InboxMessage[]
  outboxEventsReceived   OutboxEvent[]           @relation("OutboxEventRecipient")
  outboxEventsRetried    OutboxEvent[]           @relation("OutboxEventRetrier")
  notificationPreference NotificationPreference?

  @@map("users")
}

model Pool {
  id                String             @id @default(uuid()) @db.Uuid
  name              String
  adminId           String             @map("admin_id") @db.Uuid
  admin             User               @relation("AdministeredPools", fields: [adminId], references: [id])
  settings          Json
  status            Status             @default(ACTIVE)
  memberships       PoolMembership[]
  picks             Pick[]
  memberStats       PoolMemberStat[]
  penaltyLedger     PenaltyLedger[]
  weeklySubmissions WeeklySubmission[]
  penaltyMedia      PenaltyMedia[]
  inboxMessages     InboxMessage[]
  outboxEvents      OutboxEvent[]

  @@map("pools")
}

model PoolMembership {
  poolId String @map("pool_id") @db.Uuid
  userId String @map("user_id") @db.Uuid
  status Status @default(ACTIVE)

  pool Pool @relation(fields: [poolId], references: [id])
  user User @relation(fields: [userId], references: [id])

  stat              PoolMemberStat?
  penaltyLedger     PenaltyLedger[]
  weeklySubmissions WeeklySubmission[]

  @@id([poolId, userId])
  @@map("pool_memberships")
}

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
  picks             Pick[]

  @@map("games")
}

model Pick {
  id             String      @id @default(uuid()) @db.Uuid
  poolId         String      @map("pool_id") @db.Uuid
  userId         String      @map("user_id") @db.Uuid
  gameId         String      @map("game_id") @db.Uuid
  selectedTeamId String?     @map("selected_team_id")
  submittedById  String      @map("submitted_by") @db.Uuid
  createdAt      DateTime    @default(now()) @map("created_at")

  pool        Pool        @relation(fields: [poolId], references: [id])
  user        User        @relation("UserPicks", fields: [userId], references: [id])
  game        Game        @relation(fields: [gameId], references: [id])
  submittedBy User        @relation("SubmittedPicks", fields: [submittedById], references: [id])
  result      PickResult?

  @@unique([poolId, userId, gameId])
  @@map("picks")
}

model PickResult {
  pickId        String   @id @map("pick_id") @db.Uuid
  isCorrect     Boolean  @map("is_correct")
  pointsAwarded Decimal  @map("points_awarded") @db.Decimal(5, 2)
  finalizedAt   DateTime @default(now()) @map("finalized_at")

  pick Pick @relation(fields: [pickId], references: [id], onDelete: Cascade)

  @@map("pick_results")
}

model AuditLog {
  id             String   @id @default(uuid()) @db.Uuid
  actorId        String   @map("actor_id") @db.Uuid
  action         String
  targetEntityId String   @map("target_entity_id")
  oldValue       Json?    @map("old_value")
  newValue       Json?    @map("new_value")
  timestamp      DateTime @default(now())

  actor User @relation("UserAuditLogs", fields: [actorId], references: [id])

  @@map("audit_logs")
}

model PoolMemberStat {
  poolId             String   @map("pool_id") @db.Uuid
  userId             String   @map("user_id") @db.Uuid
  totalShotsDrank    Decimal  @default(0.00) @map("total_shots_drank") @db.Decimal(5, 2)
  firstPlaceFinishes Int      @default(0) @map("first_place_finishes")
  deadPlaceFinishes  Int      @default(0) @map("dead_place_finishes")
  updatedAt          DateTime @default(now()) @updatedAt @map("updated_at")

  pool       Pool           @relation(fields: [poolId], references: [id], onDelete: Cascade)
  membership PoolMembership @relation(fields: [poolId, userId], references: [poolId, userId], onDelete: Cascade)

  @@id([poolId, userId])
  @@map("pool_member_stats")
}

model PenaltyLedger {
  id          String        @id @default(uuid()) @db.Uuid
  poolId      String        @map("pool_id") @db.Uuid
  userId      String        @map("user_id") @db.Uuid
  weekNumber  Int?          @map("week_number")
  delta       Decimal       @map("delta") @db.Decimal(5, 2)
  reason      String
  createdById String        @map("created_by") @db.Uuid
  createdAt   DateTime      @default(now()) @map("created_at")

  pool       Pool           @relation(fields: [poolId], references: [id], onDelete: Cascade)
  membership PoolMembership @relation(fields: [poolId, userId], references: [poolId, userId], onDelete: Cascade)
  createdBy  User           @relation("CreatedPenalties", fields: [createdById], references: [id])
  media      PenaltyMedia?

  @@index([poolId, userId])
  @@map("penalty_ledger")
}

model WeeklySubmission {
  id                   String   @id @default(uuid()) @db.Uuid
  poolId               String   @map("pool_id") @db.Uuid
  userId               String   @map("user_id") @db.Uuid
  weekNumber           Int      @map("week_number")
  tieBreakerPrediction Decimal? @map("tie_breaker_prediction") @db.Decimal(5, 2)
  isFinalized          Boolean  @default(false) @map("is_finalized")
  createdAt            DateTime @default(now()) @map("created_at")
  updatedAt            DateTime @default(now()) @updatedAt @map("updated_at")

  pool       Pool           @relation(fields: [poolId], references: [id], onDelete: Cascade)
  membership PoolMembership @relation(fields: [poolId, userId], references: [poolId, userId], onDelete: Cascade)
  user       User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([poolId, userId, weekNumber])
  @@index([poolId, weekNumber, isFinalized])
  @@map("weekly_submissions")
}

model PenaltyMedia {
  id          String             @id @default(uuid()) @db.Uuid
  penaltyId   String             @unique @map("penalty_id") @db.Uuid
  poolId      String             @map("pool_id") @db.Uuid
  userId      String             @map("user_id") @db.Uuid
  storagePath String             @map("storage_path")
  mediaType   String             @map("media_type")
  status      PenaltyMediaStatus @default(PENDING)
  confirmedBy String?            @map("confirmed_by") @db.Uuid
  createdAt   DateTime           @default(now()) @map("created_at")

  penalty   PenaltyLedger @relation(fields: [penaltyId], references: [id], onDelete: Cascade)
  pool      Pool          @relation(fields: [poolId], references: [id], onDelete: Cascade)
  user      User          @relation("UserPenaltyMedia", fields: [userId], references: [id], onDelete: Cascade)
  confirmer User?         @relation("ConfirmedPenaltyMedia", fields: [confirmedBy], references: [id])

  @@index([poolId, userId])
  @@map("penalty_media")
}

enum OutboxStatus {
  PENDING
  PROCESSING
  SENT
  FAILED
  DEAD
  SUPPRESSED
}

enum JobStatus {
  RUNNING
  OK
  PARTIAL
  FAILED
}

model InboxMessage {
  id        String    @id @default(uuid()) @db.Uuid
  poolId    String    @map("pool_id") @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  type      String
  payload   Json
  dedupeKey String    @map("dedupe_key")
  readAt    DateTime? @map("read_at") @db.Timestamp(3)
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamp(3)

  pool Pool @relation(fields: [poolId], references: [id], onDelete: Restrict, onUpdate: Restrict)
  user User @relation(fields: [userId], references: [id], onDelete: Restrict, onUpdate: Restrict)

  @@unique([userId, dedupeKey])
  @@index([userId, readAt, createdAt])
  @@map("inbox_messages")
}

model OutboxEvent {
  id              String       @id @default(uuid()) @db.Uuid
  poolId          String       @map("pool_id") @db.Uuid
  recipientUserId String       @map("recipient_user_id") @db.Uuid
  type            String
  payload         Json
  dedupeKey       String       @unique @map("dedupe_key")
  status          OutboxStatus @default(PENDING)
  attempts        Int          @default(0)
  nextAttemptAt   DateTime     @default(now()) @map("next_attempt_at") @db.Timestamp(3)
  leaseExpiresAt  DateTime?    @map("lease_expires_at") @db.Timestamp(3)
  lastErrorCode   String?      @map("last_error_code")
  sentAt          DateTime?    @map("sent_at") @db.Timestamp(3)
  retriedBy       String?      @map("retried_by") @db.Uuid
  retriedAt       DateTime?    @map("retried_at") @db.Timestamp(3)
  createdAt       DateTime     @default(now()) @map("created_at") @db.Timestamp(3)

  pool      Pool  @relation(fields: [poolId], references: [id], onDelete: Restrict, onUpdate: Restrict)
  recipient User  @relation("OutboxEventRecipient", fields: [recipientUserId], references: [id], onDelete: Restrict, onUpdate: Restrict)
  retrier   User? @relation("OutboxEventRetrier", fields: [retriedBy], references: [id], onDelete: Restrict, onUpdate: Restrict)

  @@index([status, nextAttemptAt])
  @@map("outbox_events")
}

model NotificationPreference {
  userId               String   @id @map("user_id") @db.Uuid
  emailEnabled         Boolean  @default(true) @map("email_enabled")
  reminderOffsetsHours Int[]    @default([24, 2]) @map("reminder_offsets_hours")
  unsubscribeToken     String   @unique @default(uuid()) @map("unsubscribe_token")
  updatedAt            DateTime @updatedAt @map("updated_at") @db.Timestamp(3)

  user User @relation(fields: [userId], references: [id], onDelete: Restrict, onUpdate: Restrict)

  @@map("notification_preferences")
}

model JobRun {
  id             String    @id @default(uuid()) @db.Uuid
  jobName        String    @map("job_name")
  status         JobStatus
  startedAt      DateTime  @default(now()) @map("started_at") @db.Timestamp(3)
  finishedAt     DateTime? @map("finished_at") @db.Timestamp(3)
  itemsProcessed Int       @default(0) @map("items_processed")
  errorCode      String?   @map("error_code")
  meta           Json?

  @@index([jobName, startedAt])
  @@map("job_runs")
}
```

### 8.10 Decision Register Appendix A (`docs/rulings/appendix-a.md`)
```markdown
1 Points are derived; penalties are ledger entries.
2 Provider corrections are proposals; auto-apply only when no outcome changes.
3 Manual overrides beat sync; divergence is flagged.
4 Locks derive from the stored kickoff time only.
5 Inbox is the source of truth; email is best-effort.
6 Aggregates are never stored in numeric columns.
7 Pick-on-behalf is write-only.
8 History reads sealed snapshots only.
9 Ledger entry_type is additive and parallel to reason; backfill by column default, never UPDATE.
10 Physical schema names govern; logical names in handoffs are documentation.
11 DB-enforced invariants are verified against the catalog, never assumed.
12 Typed ledger writes serialize per (pool_id, user_id).
13 Ledger-bearing pools and memberships are never hard-deleted.
14 Season is Pool; routes use /api/pools/:pool_id.
15 New tables and functions are deny-by-default to Data API roles.
16 Money input goes through one strict parser; never parseInt/parseFloat/Number.
17 Every evidence report states host class, database, user and server version.
18 Destructive work runs only on a disposable database; hosted gets migrate deploy only.
19 Legacy ASSESSMENT rows may be signed; typed rows are positive.
20 Per-pool authority derives from pools.admin_id; no global-role override.
21 Authorization defect fixes are code-only and precede new commissioner endpoints.
22 Money splitting is Decimal-only with characterization first; no zero-delta rows.
23 Every invariant carries an evidence status.
24 Period-close jobs are idempotent via a DB-enforced claim in the same transaction.
25 Acceptance tests assert behavior (SQLSTATE, row state), never message text.
26 Read routes are guarded like write routes; guards change access, never payloads.
27 Period-close preconditions use authoritative state; empty sets fail closed; no bypass flag.
28 VERIFIED requires numbers or raw output in the report body.
29 Isolation is by database, never by schema; the guard has three independent checks.
30 Raw evidence is unedited tool output; identifiers resolve; figures are consistent.
31 Irreversible operations run only from committed scripts with machine-checked preconditions.
32 The default environment is disposable; hosted credentials live in a separate file.
33 Docs are append-only, enforced by CI against a tagged baseline.
34 Every acceptance criterion maps to a named test or evidence item.
35 Tests never create or alter schema; databases reset via a guarded script.
36 A migration stays off the deployable branch until its hosted gate clears.
37 Evidence is produced by one committed script; empty sections fail; UTF-8 via spawn.
38 Trigger proofs run as a privileged role; privilege proofs as anon/authenticated.
39 Evidence and CI scripts measure inputs independently and ship with a negative control.
40 Every evidence run stamps commit, branch and time; identical output counts as not run.
41 A matrix row may cite only tests present in the committed JSON artifact.
42 Schema evidence comes from real pg_dump including ACLs, bodies and indexes.
43 Every ordered criterion appears in the matrix as PASS, FAIL or NOT VERIFIED.
44 Only a human runs or approves hosted changes; authorizations are typed in the conversation.
45 Rollbacks are generated from a pre-state snapshot and proven by hash equality.
46 External exposure is measured identically before and after a change.
47 Machine-checkable gates are decided by script exit codes.
48 Applied migrations are immutable; CI compares checksums.
49 Authorization scans cover every source of an identifier (path, query, body, headers).
50 Each test run begins with reset, migrate deploy and generate, and prints a header.
51 Tests are never deleted or weakened in non-test commits; controls run in a separate worktree.
52 Code depending on a schema object ships with its migration or fails closed.
53 Agents never push, force-push or change remotes.
54 GET handlers perform no writes.
55 A guard is never bypassed by a conditional when its dependency is missing.
56 Rulings are stored verbatim under docs/rulings/. The Decision Register in ARCHITECTURE.md is a byte-for-byte copy of docs/rulings/appendix-a.md, and CI diffs the two.
57 Every table written by a re-running job carries a database-enforced dedupe key.
58 Outbound payload sanitization is default-deny against an explicit per-type registry.
59 Outbox drain workers claim via FOR UPDATE SKIP LOCKED with explicit lease timeouts and discrete backoff.
60 Every claim of a leased job item counts as an attempt; the lease is verified before each send and when the result is recorded.
```
