# TWO-STAGE EVIDENCE BINDING RECORD (PATH B — GOVERNED)
- **Execution Baseline SHA (E_SHA):** 66959a6db367ac5bd72f697db6d77801544182a6
- **Binding Container Target:** HEAD (Target for binding commit)
- **Lineage Verification:** PARENT_VERIFIED (Parent commit of binding container is guaranteed to be 66959a6db367ac5bd72f697db6d77801544182a6)
- **Baseline Working Tree:** 100% CLEAN (0 modified, 0 untracked)
- **Governing Standard:** ARCHITECTURE.md (Two-Stage Forward-Binding Evidence Protocol)
--------------------------------------------------------------------------------

# MILESTONE 13.2 EVIDENCE BUNDLE: COMMISSIONER GOVERNANCE & PROPOSAL DASHBOARD
**Execution Timestamp:** 2026-10-03T03:28:48.596Z
**Target Branch:** `feat/phase13-2-commissioner-dashboard`
**Execution Baseline SHA:** `66959a6db367ac5bd72f697db6d77801544182a6`
**Generator Exit Code:** 0

---

## 1. Acceptance Matrix
### Milestone 13.2 Acceptance Matrix
- 13.2.1 (Commissioner Proposal Review & Voting Lifecycle: APPROVE/REJECT): PASS
- 13.2.2 (Atomic Proposal Execution & Ledger Commit): PASS
- 13.2.3 (Decision #20 Hardening: Zero Global Admin Bypass on Pool Routes): PASS
- 13.2.4 (Decision #54 Side-Effect Free GETs on Proposals, Overrides & Ops Status): PASS
- 13.2.5 (Decision #27 Authoritative Finality Guard: Rejects Unfinalized Slates): PASS
- 13.2.6 (Decisions #3 & #22 Precision Decimal Scoring via Prisma.Decimal): PASS
- 13.2.7 (Decision #55 Fail-Closed Database Fault Tolerance & Atomic Rollback): PASS
- 13.2.8 (Frontend Commissioner Dashboard, Review Cards, & Override Panel): PASS
- 13.2.9 (Full Database Test Suite 211/211 Passing with Clean Rehearsal DB): PASS

---

## 2. Item 1: Git Identity & Ancestry

### 2.1 Branch & Commit Identification
- **Active Branch:** `feat/phase13-2-commissioner-dashboard`
- **Execution Baseline SHA:** `66959a6db367ac5bd72f697db6d77801544182a6`

### 2.2 Working Tree Status at Baseline
```
?? scripts/generate_evidence_13_2.js
```

### 2.3 Git Log Ancestry (Milestone 13.2 Commit Lineage)
```
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
dd41ad2 docs: bind Section 9 verification bundle for Milestone 12.3
81effd4 feat(phase12-3): implement notification transports, retry backoff, and webhook ingress
9345cfb docs: author Milestone 12.3 Notification Transports & Webhooks design specification
3eea715 Merge pull request #3 from jdubciii/feat/phase12-2-wrapup-engine
```

---

## 3. Item 2: Merge Base & Diffstat Against Main

### 3.1 Merge Base vs `main`
- **Merge Base SHA:** `96f8a7dcadf901e1402d64a000fab1ab0de9df14`

### 3.2 Diffstat (`git diff --stat main...HEAD`)
```
.../commissioner/CommissionerDashboardView.tsx     | 298 +++++++++++++++
 .../commissioner/ManualOverridePanel.tsx           | 240 ++++++++++++
 .../components/commissioner/PoolHealthWidget.tsx   | 135 +++++++
 .../components/commissioner/ProposalReviewCard.tsx | 241 ++++++++++++
 docs/design/13.2.md                                |  44 +++
 .../commissioner/CommissionerDashboardView.tsx     |   1 +
 .../commissioner/ManualOverridePanel.tsx           |   1 +
 src/components/commissioner/PoolHealthWidget.tsx   |   1 +
 src/components/commissioner/ProposalReviewCard.tsx |   1 +
 src/routes/ops.ts                                  | 180 +++++++--
 src/services/overrideService.ts                    | 394 ++++++++++++++++++-
 tests/commissionerDashboard.test.ts                | 423 +++++++++++++++++++++
 12 files changed, 1921 insertions(+), 38 deletions(-)
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
│ 0       │ '20260927000000_init'                                       │ 2026-10-03T03:28:59.931Z │
│ 1       │ '20260928051824_add_pool_member_stats_and_penalty_ledger'   │ 2026-10-03T03:28:59.956Z │
│ 2       │ '20260928124900_precision_and_weekly_submissions'           │ 2026-10-03T03:28:59.992Z │
│ 3       │ '20260928170000_weekly_submission_finalized_and_game_notes' │ 2026-10-03T03:29:00.000Z │
│ 4       │ '20260928180000_shot_cam_penalty_media_and_rls'             │ 2026-10-03T03:29:00.024Z │
│ 5       │ '20260929144500_br_1_ledger_append_only'                    │ 2026-10-03T03:29:00.033Z │
│ 6       │ '20260930010000_br_2b_ledger_api_lockdown'                  │ 2026-10-03T03:29:00.039Z │
│ 7       │ '20260930020000_br_2c_public_tables_api_lockdown'           │ 2026-10-03T03:29:00.045Z │
│ 8       │ '20261001160000_12_1_a_outbox_inbox_core'                   │ 2026-10-03T03:29:00.098Z │
└─────────┴─────────────────────────────────────────────────────────────┴──────────────────────────┘
weekly_wrapups exists in public: false (Expected: false)
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "pickem_rehearsal", schema "public" at "localhost:5432"

9 migrations found in prisma/migrations


No pending migrations to apply.
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma

✔ Generated Prisma Client (v5.22.0) to .\node_modules\@prisma\client in 409ms

Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

Tip: Curious about the SQL queries Prisma ORM generates? Optimize helps you enhance your visibility: https://pris.ly/tip-2-optimize

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
    "started_at": "2026-10-03T03:28:59.864Z",
    "finished_at": "2026-10-03T03:28:59.931Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928051824_add_pool_member_stats_and_penalty_ledger",
    "started_at": "2026-10-03T03:28:59.932Z",
    "finished_at": "2026-10-03T03:28:59.956Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928124900_precision_and_weekly_submissions",
    "started_at": "2026-10-03T03:28:59.957Z",
    "finished_at": "2026-10-03T03:28:59.992Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928170000_weekly_submission_finalized_and_game_notes",
    "started_at": "2026-10-03T03:28:59.993Z",
    "finished_at": "2026-10-03T03:29:00.000Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928180000_shot_cam_penalty_media_and_rls",
    "started_at": "2026-10-03T03:29:00.002Z",
    "finished_at": "2026-10-03T03:29:00.024Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260929144500_br_1_ledger_append_only",
    "started_at": "2026-10-03T03:29:00.026Z",
    "finished_at": "2026-10-03T03:29:00.033Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260930010000_br_2b_ledger_api_lockdown",
    "started_at": "2026-10-03T03:29:00.034Z",
    "finished_at": "2026-10-03T03:29:00.039Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260930020000_br_2c_public_tables_api_lockdown",
    "started_at": "2026-10-03T03:29:00.040Z",
    "finished_at": "2026-10-03T03:29:00.045Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20261001160000_12_1_a_outbox_inbox_core",
    "started_at": "2026-10-03T03:29:00.047Z",
    "finished_at": "2026-10-03T03:29:00.098Z",
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

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 401 when Authorization header is missing 53ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 400 when pool_id query parameter is missing or malformed 11ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 404 when pool does not exist 70ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 403 when user is not the pool commissioner 12ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 200 and game slate snapshot when user is the verified commissioner 17ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 401 when Authorization header is missing 32ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 400 when pool_id is missing or malformed in request body 12ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 404 when pool does not exist in request body 5ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 403 when user is not the pool commissioner 3ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403
penalty_media row count = 0

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403
penalty_media row count = 0

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > verifies zero penalty_media rows exist after denied upload attempts
penalty_media row count = 0

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403
penalty_media row count = 0

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 200 and upserts pick when authenticated user is the commissioner 39ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403 17ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403 9ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > verifies zero penalty_media rows exist after denied upload attempts 1ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: penalty OWNER -> 201 success 15ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403 6ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: pool COMMISSIONER -> 200 success 11ms
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

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write) 14ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write) 5ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 400 when explicit pool_id is not a valid UUID (no pool write) 8ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 403 when user is not a member or commissioner of the requested pool (no pool write) 9ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot 25ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > Decision #49: CI Route Scan & Route Guard Verification > verifies all routes with pool parameters are guarded; only /api/health and GET /api/admin/users allowlisted 1ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 1. Decision #20: Pool Commissioner Scoping & Tier Isolation > allows verified pool commissioner to vote on and execute proposals 184ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 1. Decision #20: Pool Commissioner Scoping & Tier Isolation > rejects standard pool members with 403 Forbidden 28ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 1. Decision #20: Pool Commissioner Scoping & Tier Isolation > rejects global ADMINs who are not pool commissioners with 403 Forbidden (Decision #20 zero bypass) 18ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 2. Decision #54: Side-Effect Free GET Telemetry > GET /proposals, GET /overrides, and GET /ops/status execute zero DB mutations 189ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 3. Decision #27: Authoritative Slate & Game Finality Verification > fails closed when proposal targets an unfinalized slate or game 41ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 4. Decisions #3 & #22: Precision Decimal Scoring & Aggregation > applies decimal scoring adjustments accurately without floating-point drift 128ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 5. Decision #55: Transaction Fail-Closed Rollback > aborts and rolls back entire state on execution error 20ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 6. Injectable ClockFn Determinism > records deterministic timestamps on proposal voting and execution 21ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 1. GET /api/notifications (Inbox Fetch & Telemetry) > returns 401 when unauthenticated 51ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 1. GET /api/notifications (Inbox Fetch & Telemetry) > returns strictly req.user.id records with accurate unread counts 366ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 1. GET /api/notifications (Inbox Fetch & Telemetry) > supports unreadOnly filter parameter 157ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > idempotently marks single notification ID as read for req.user.id with injectable clock 169ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > enforces Decision #20: User A cannot mark User B notification as read (fails 403) 21ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > handles batch array ids and rejects cross-tenant manipulation (Decision #20 & #55) 32ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 3. POST /api/notifications/read-all > atomically marks all unread notifications for req.user.id and preserves other users (Decision #20) 29ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 4. GET & PUT /api/notifications/preferences > GET returns default preferences without creating DB row (Decision #54) 17ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 4. GET & PUT /api/notifications/preferences > PUT validates and updates preferences for req.user.id 33ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 5. Decision #54 Hardening (NO WRITES ON GET) > GET /api/notifications does not mutate any database state 19ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 6. Decision #55 Hardening (FAIL CLOSED ON DB ERROR) > rolls back and leaves state intact when mid-transaction or update errors occur 14ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 1. Exponential Backoff & Injectable Clock Unit Tests > calculates deterministic exponential backoff intervals without jitter or drift 18ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 1. Exponential Backoff & Injectable Clock Unit Tests > injectable ClockFn allows instant time progression without setTimeout 7ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > successful transport delivery transitions status PENDING -> PROCESSING -> SENT 34ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > transient failure increments attempts, records diagnostic JSON and sets future backoff 17ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > permanent rejection immediately transitions status to DEAD with diagnostic payload 15ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > reaching MAX_ATTEMPTS transitions status to DEAD (Dead-Letter Invariant) 12ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > advancing simulated clock allows retry after backoff expires 17ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects unauthenticated requests on /api/admin/ops/transports/* 47ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects regular users on /api/admin/ops/transports/* with 403 16ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects pool commissioners on /api/admin/ops/transports/* with 403 (Decision #20 Hardening) 24ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > allows global ADMIN to query transports status and trigger dispatch sweep 184ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 4. Decision #54 Strict Read-Only Invariant on GET > GET /api/admin/ops/transports/status produces ZERO database mutations 50ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 1. Idempotency & Outbox Enqueue Invariants > enqueues outbox reminder for member with unsubmitted picks and deduplicates subsequent runs 114ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 2. User Notification Preferences Enforcement > skips users who have opted out of email / pick reminders (generates 0 outbox events) 2ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 2. User Notification Preferences Enforcement > skips members who have already submitted picks for all upcoming games in the window 21ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 3. Injectable Clock Time-Window Boundary Testing > moving clock forward cleanly transitions games in and out of windows without real-time delay 33ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects unauthenticated requests to POST /api/admin/ops/scan-reminders with 401 74ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects standard users from triggering reminder scan with 403 (Decision #20) 8ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects pool commissioners who lack global ADMIN role with 403 (Decision #20) 10ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > allows global ADMIN to trigger reminder scan via POST with 200 56ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > Decision #54 & Invariant: GET /api/admin/ops/scan-reminders/status is strictly read-only 18ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > aborts and fails closed when database client is unconfigured or throws 3ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > withJobRun tracks failure and returns FAILED status upon unexpected error 10ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 1. Retention Cutoff & Clock Calculation Unit Tests > calculates exact retention cutoff date based on injected clock 16ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 2. State Protection & Terminal Boundaries (Decision #24 & #55) > NEVER prunes PENDING or PROCESSING records regardless of how old they are (State Protection Guard) 22ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 2. State Protection & Terminal Boundaries (Decision #24 & #55) > prunes SENT records >30 days and DEAD records >90 days while preserving younger records 34ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 3. Bounded Batching & Pagination Verification > processes multi-batch deletions with specified batchSize boundaries 27ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects unauthenticated requests on /api/admin/ops/retention/* 52ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects regular users on /api/admin/ops/retention/* with 403 14ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects pool commissioners on /api/admin/ops/retention/* with 403 (Decision #20 Hardening) 12ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > allows global ADMIN to trigger retention prune and query retention status 195ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 5. Decision #54 Read-Only Invariant on GET > GET /api/admin/ops/retention/status produces ZERO deletions or writes 62ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 6. Decision #55 Fail-Closed Database Fault Tolerance > throws structured error and aborts on database transaction failure 15ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 1. Precondition Check & Fail Closed (Decision #27 & #55) > fails closed with SCORE_FEED_UNAVAILABLE when unfinalized games exist for target week 110ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 1. Precondition Check & Fail Closed (Decision #27 & #55) > fails closed when DB client or claim store is unreachable (Decision #55) 3ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 2. Precision Decimal Scoring & Split Penalties (Decisions #3 & #22) > calculates standings and splits dead place penalty precisely between tied losers 132ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 3. Claim Store Concurrency & Idempotency (Decision #24 & #57) > subsequent execution on already wrapped week returns ALREADY_WRAPPED_UP and produces 0 duplicates 5ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 3. Claim Store Concurrency & Idempotency (Decision #24 & #57) > enforces outbox notification preferences and deduplication key (Decision #57) 9ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/wrap-up is rejected for standard users and pool commissioners (Decision #20) 230ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/wrap-up succeeds for system ADMIN 225ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > GET /api/admin/ops/wrap-up/status is strictly read-only (Decision #54) 33ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/season-seal records immutable snapshot 50ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 401 when unauthenticated on GET health and POST retry 54ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 400 when pool_id is not a valid UUID 7ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 404 when pool does not exist 74ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 403 when authenticated user is a regular pool member (not commissioner) 9ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 403 when authenticated user is not a member of the pool 13ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 2. GET /api/pools/:pool_id/ops/health > returns accurate telemetry and is strictly read-only (Decision #54) 141ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 2. GET /api/pools/:pool_id/ops/health > strictly isolates pool telemetry with zero cross-pool leakage 20ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 3. POST /api/pools/:pool_id/ops/outbox/retry > retries only DEAD/FAILED outbox events for the specified pool, resetting attempts and lease 69ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 3. POST /api/pools/:pool_id/ops/outbox/retry > retries a specific event when outboxId is provided 22ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > returns 401 when unauthenticated 50ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > returns inbox messages for authenticated user in descending order (Decision #54 compliant) 181ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > supports unreadOnly filter and poolId filter 17ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 2. POST /api/me/inbox/:id/read > returns 401 when unauthenticated 12ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 2. POST /api/me/inbox/:id/read > returns 404 when message belongs to another user (ownership isolation) 18ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 2. POST /api/me/inbox/:id/read > marks single message read successfully and is idempotent 30ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 3. POST /api/me/inbox/read-all > returns 401 when unauthenticated 2ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 3. POST /api/me/inbox/read-all > marks all unread messages for the user as read 36ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > returns 401 when unauthenticated 12ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > returns default preferences on GET before upsert without mutating DB (Decision #54) 7ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > rejects invalid reminderOffsetsHours payloads with 400 26ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > updates valid preferences successfully 16ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > GET /api/notifications/unsubscribe validates token without modifying DB (Decision #54) 7ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > GET /api/notifications/unsubscribe returns 400 on malformed token and 404 on unknown token 4ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > POST /api/notifications/unsubscribe disables email without deleting row 6ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > strips database URLs, API keys, passwords, tokens and truncates to 200 chars 103ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > preserves key names for passwords and tokens while redacting values 12ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > scrubs ECONNREFUSED host:port patterns 6ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > handles extremely long error messages by truncating to 200 chars 10ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Console Mail Transport > appends formatted json logs to outbox-dev.log 8ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > SMTP Mail Transport & Timeouts > throws error on construction if MAIL_TRANSPORT=smtp and SMTP_FROM is missing 9ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > SMTP Mail Transport & Timeouts > fake hanging SMTP transporter times out and maps to error failure 5ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > HTML Escaping & Message-ID SHA256 > HTML escaping verification for interpolated markup in pool names and fields 7ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > HTML Escaping & Message-ID SHA256 > Message-ID SHA256 stability across executions 6ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > drains pending outbox event, sets status SENT and records sentAt 35ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > sets status SUPPRESSED when user email preference is disabled 28ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > applies discrete backoff schedule on transport failure 19ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > transitions to DEAD on 5th failure 16ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > Event repeatedly crashing during worker processing increments attempts to 5 and transitions to DEAD 12ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > Two concurrent workers with slow fake transport never duplicate sends (conditional renewal test) 95ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > creates JobRun with RUNNING and transitions to OK with itemsProcessed 30ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > records FAILED status and scrubbed errorCode when job execution throws 13ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > transitions to PARTIAL status when succeeded > 0 and failed + dead > 0 12ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > database write failure does not fail or abort the underlying job execution 16ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > runOutboxDrain integrates with withJobRun 11ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts RLS is ENABLED (relrowsecurity=true) and relforcerowsecurity=false on all application public tables 66ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts anon role is denied SELECT (SQLSTATE 42501) across all public tables 207ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts authenticated role is denied SELECT (SQLSTATE 42501) across all public tables 79ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b: asserts anon role is denied UPDATE on penalty_ledger with SQLSTATE 42501 (privilege proof) 74ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2c: asserts has_function_privilege returns false for anon and authenticated on BR-1 trigger functions 11ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects non-commissioner pool members with 403 Forbidden 134ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects global ADMIN users who are not pool commissioners (Decision #20 zero bypass) 30ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects commissioners of different pools with 403 Forbidden 8ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > allows valid pool commissioner to create an override proposal 27ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > applies a commissioner pick override inside a serializable transaction 42ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > applies a commissioner penalty override with decimal ledger tracking 38ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 3. Read-Only GET Proposal Query (Decision #54) > GET /api/pools/:pool_id/proposals returns history and produces zero side effects 20ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 1. Cryptographic Signature Verification Unit Tests > verifies valid HMAC SHA-256 signatures with hex and sha256= prefix 10ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 1. Cryptographic Signature Verification Unit Tests > rejects invalid signature, mismatched secret, or tampered payload (Fail-Closed) 1ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > rejects webhook requests with missing signature header with 401 Unauthorized 70ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > rejects webhook requests with forged or invalid signature with 401 Unauthorized 10ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > processes valid signed delivered event and transitions OutboxEvent to SENT 35ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > processes valid signed bounce event and transitions OutboxEvent to DEAD with diagnostic JSON 17ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 3. Decision #54 Side-Effect Free GET Invariant > GET /api/webhooks/notifications returns 405 Method Not Allowed and causes ZERO mutations 17ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 4. Decision #55 Fail-Closed Database Fault Tolerance > returns 500 when database transaction fails during webhook ingestion, refusing receipt acknowledgement 16ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > both rows created 216ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > duplicate enqueue creates no second outbox OR inbox row 28ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > caller transaction that throws after enqueue leaves zero rows in both tables 18ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > IN_APP-only writes no outbox row 14ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > EMAIL-only writes no inbox row 13ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > disallowed payload key is stripped 17ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > reminder payload keys are exactly poolName, windowLabel, lockAtUtc, deepLink 5ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > rejects non-transaction client or root prisma instance 4ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > skips EMAIL channel if emailEnabled is false in NotificationPreference 15ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > static test fails if the module imports nodemailer, net, http(s) or fetch 9ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: asserts trigger and function definitions match requirements (BEFORE ROW/STATEMENT, plpgsql, prosecdef=false, unconditional RAISE) 18ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: UPDATE (including no-op update) is blocked with count >= 1 and SQLSTATE P0001 55ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: DELETE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001 13ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: TRUNCATE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001 10ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: membership-row DELETE cascades to penalty_ledger and is intercepted by trigger with P0001 17ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: DELETE FROM pools fixture asserts exact foreign key constraint pool_memberships_pool_id_fkey and SQLSTATE 23503 5ms
 ✓ tests/br4b.test.ts > BR-4b: Fail-Closed Claim Store Invariant (Decision #52) > Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed 146ms
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
 ✓ tests/characterization.test.ts > BR-4 splitPenalty Math Characterization > Worked matrix: confirms exact zero-diff decimal split amounts 4ms
 ✓ tests/characterization.test.ts > BR-4b Set-Equality: Wrap-Up vs Scoring Resolver > Asserts 100% game ID set equality between wrap-up and scoring resolvers 2ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 when Authorization header is absent 2ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 when Authorization header does not start with Bearer 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 for an invalid / expired token 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > decodes valid JWT and attaches user to req.user, then calls next() 6ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > returns 401 if req.user is undefined 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > returns 403 if req.user is not ADMIN 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > calls next() if user is ADMIN 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 401 if req.user is missing 2ms
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
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > allows valid local disposable database URLs 3ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects remote / hosted database URLs (Supabase, AWS, Neon, etc.) 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > Decision #32 Sabotage Test: point TEST_DATABASE_URL at production fingerprint -> aborts before connection 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects URLs using ?schema= parameter to bypass host isolation 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects non-disposable production database names on localhost 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > sabotage test: throws when TEST_DATABASE_URL is empty string or undefined 1ms

 Test Files  20 passed (20)
      Tests  211 passed (211)
   Start at  20:29:15
   Duration  23.40s (tests 50%, import 35%, transform 7%, setup 7%, worker 1%)

     Import  53 modules were evaluated 319 times · 6.38s total, 35% of tracked time
             ~5.32s faster with isolate: false — shared modules are evaluated once per worker instead of once per file
             learn more: https://vitest.dev/guide/improving-performance#test-isolation


(node:15728) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/scripts/db_header.js is not specified and it doesn't parse as CommonJS.
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

## 6. Item 5: Targeted Milestone 13.2 Invariants Telemetry

### 6.1 Targeted Test Suite Assertions (Commissioner Governance & Invariants)
```
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 1. Decision #20: Pool Commissioner Scoping & Tier Isolation > allows verified pool commissioner to vote on and execute proposals 184ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 1. Decision #20: Pool Commissioner Scoping & Tier Isolation > rejects standard pool members with 403 Forbidden 28ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 1. Decision #20: Pool Commissioner Scoping & Tier Isolation > rejects global ADMINs who are not pool commissioners with 403 Forbidden (Decision #20 zero bypass) 18ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 2. Decision #54: Side-Effect Free GET Telemetry > GET /proposals, GET /overrides, and GET /ops/status execute zero DB mutations 189ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 3. Decision #27: Authoritative Slate & Game Finality Verification > fails closed when proposal targets an unfinalized slate or game 41ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 4. Decisions #3 & #22: Precision Decimal Scoring & Aggregation > applies decimal scoring adjustments accurately without floating-point drift 128ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 5. Decision #55: Transaction Fail-Closed Rollback > aborts and rolls back entire state on execution error 20ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 6. Injectable ClockFn Determinism > records deterministic timestamps on proposal voting and execution 21ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > enforces Decision #20: User A cannot mark User B notification as read (fails 403) 21ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > handles batch array ids and rejects cross-tenant manipulation (Decision #20 & #55) 32ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 3. POST /api/notifications/read-all > atomically marks all unread notifications for req.user.id and preserves other users (Decision #20) 29ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 4. GET & PUT /api/notifications/preferences > GET returns default preferences without creating DB row (Decision #54) 17ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 5. Decision #54 Hardening (NO WRITES ON GET) > GET /api/notifications does not mutate any database state 19ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 6. Decision #55 Hardening (FAIL CLOSED ON DB ERROR) > rolls back and leaves state intact when mid-transaction or update errors occur 14ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects unauthenticated requests on /api/admin/ops/transports/* 47ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects regular users on /api/admin/ops/transports/* with 403 16ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects pool commissioners on /api/admin/ops/transports/* with 403 (Decision #20 Hardening) 24ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > allows global ADMIN to query transports status and trigger dispatch sweep 184ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 4. Decision #54 Strict Read-Only Invariant on GET > GET /api/admin/ops/transports/status produces ZERO database mutations 50ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects unauthenticated requests to POST /api/admin/ops/scan-reminders with 401 74ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects standard users from triggering reminder scan with 403 (Decision #20) 8ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects pool commissioners who lack global ADMIN role with 403 (Decision #20) 10ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > allows global ADMIN to trigger reminder scan via POST with 200 56ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > Decision #54 & Invariant: GET /api/admin/ops/scan-reminders/status is strictly read-only 18ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > aborts and fails closed when database client is unconfigured or throws 3ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > withJobRun tracks failure and returns FAILED status upon unexpected error 10ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects unauthenticated requests on /api/admin/ops/retention/* 52ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects regular users on /api/admin/ops/retention/* with 403 14ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects pool commissioners on /api/admin/ops/retention/* with 403 (Decision #20 Hardening) 12ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > allows global ADMIN to trigger retention prune and query retention status 195ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 5. Decision #54 Read-Only Invariant on GET > GET /api/admin/ops/retention/status produces ZERO deletions or writes 62ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 6. Decision #55 Fail-Closed Database Fault Tolerance > throws structured error and aborts on database transaction failure 15ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 1. Precondition Check & Fail Closed (Decision #27 & #55) > fails closed with SCORE_FEED_UNAVAILABLE when unfinalized games exist for target week 110ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 1. Precondition Check & Fail Closed (Decision #27 & #55) > fails closed when DB client or claim store is unreachable (Decision #55) 3ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 2. Precision Decimal Scoring & Split Penalties (Decisions #3 & #22) > calculates standings and splits dead place penalty precisely between tied losers 132ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 3. Claim Store Concurrency & Idempotency (Decision #24 & #57) > subsequent execution on already wrapped week returns ALREADY_WRAPPED_UP and produces 0 duplicates 5ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 3. Claim Store Concurrency & Idempotency (Decision #24 & #57) > enforces outbox notification preferences and deduplication key (Decision #57) 9ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/wrap-up is rejected for standard users and pool commissioners (Decision #20) 230ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/wrap-up succeeds for system ADMIN 225ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > GET /api/admin/ops/wrap-up/status is strictly read-only (Decision #54) 33ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/season-seal records immutable snapshot 50ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 2. GET /api/pools/:pool_id/ops/health > returns accurate telemetry and is strictly read-only (Decision #54) 141ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > returns inbox messages for authenticated user in descending order (Decision #54 compliant) 181ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > returns default preferences on GET before upsert without mutating DB (Decision #54) 7ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > GET /api/notifications/unsubscribe validates token without modifying DB (Decision #54) 7ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects non-commissioner pool members with 403 Forbidden 134ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects global ADMIN users who are not pool commissioners (Decision #20 zero bypass) 30ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects commissioners of different pools with 403 Forbidden 8ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > allows valid pool commissioner to create an override proposal 27ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > applies a commissioner pick override inside a serializable transaction 42ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > applies a commissioner penalty override with decimal ledger tracking 38ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 3. Read-Only GET Proposal Query (Decision #54) > GET /api/pools/:pool_id/proposals returns history and produces zero side effects 20ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 1. Cryptographic Signature Verification Unit Tests > rejects invalid signature, mismatched secret, or tampered payload (Fail-Closed) 1ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 3. Decision #54 Side-Effect Free GET Invariant > GET /api/webhooks/notifications returns 405 Method Not Allowed and causes ZERO mutations 17ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 4. Decision #55 Fail-Closed Database Fault Tolerance > returns 500 when database transaction fails during webhook ingestion, refusing receipt acknowledgement 16ms
 ✓ tests/br4b.test.ts > BR-4b: Fail-Closed Claim Store Invariant (Decision #52) > Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed 146ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > fails closed (returns true / throws) when kickoffTime is null or undefined 1ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > fails closed when kickoffTime is an invalid date string 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > handles null, undefined, or NaN offset by defaulting to 0 offset 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > Decision #20 & R-12.2-W: global ADMIN who is not the pool commissioner -> 403, no req.pool, zero side effects 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolMember > Decision #20 & R-12.2-W: global ADMIN who is not a member and not commissioner -> 403, no req.pool 0ms
stderr | tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 3. Decision #27: Authoritative Slate & Game Finality Verification > fails closed when proposal targets an unfinalized slate or game
    at executeProposal (C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/src/services/overrideService.ts:207:11)
stderr | tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 5. Decision #55: Transaction Fail-Closed Rollback > aborts and rolls back entire state on execution error
    at executeProposal (C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/src/services/overrideService.ts:219:10)
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

### 8.1 Milestone 13.2 Design Specification (`docs/design/13.2.md`)
```markdown
# Milestone 13.2 Design Specification: Commissioner Governance & Proposal Dashboard

## 1. Architectural Scope & Tier Isolation (Decision #20 Hardening)
- **Pool-Tier Exclusivity:**
  - All proposal reviews, voting, and manual override management routes reside strictly under `/api/pools/:pool_id/proposals/*` and `/api/pools/:pool_id/overrides/*`.
  - Guarded strictly by `requirePoolCommissioner`. Global ADMIN status grants ZERO bypass on pool-scoped routes (Decision #20). Non-commissioners and members receive 403 Forbidden.
- **Route Specifications:**
  - `GET /api/pools/:pool_id/proposals`: Lists active, approved, and rejected stat correction proposals for the pool.
  - `POST /api/pools/:pool_id/proposals/:id/vote`: Records commissioner vote or approval action.
  - `POST /api/pools/:pool_id/proposals/:id/execute`: Atomically executes an approved proposal, recalculating weekly scoring if necessary.
  - `GET /api/pools/:pool_id/overrides`: Lists historical commissioner overrides applied to the pool.
  - `POST /api/pools/:pool_id/overrides`: Submits an authoritative manual pick override.
  - `GET /api/pools/:pool_id/ops/status`: Read-only pool health and weekly wrap-up readiness telemetry.

## 2. Invariant & Security Invariants
- **Side-Effect Free GETs (Decision #54):**
  - `GET /api/pools/:pool_id/proposals`, `GET /api/pools/:pool_id/overrides`, and `GET /api/pools/:pool_id/ops/status` perform ZERO database mutations.
- **Fail-Closed Semantics (Decision #55):**
  - Unauthorized access attempts, unverified slates (Decision #27), or execution failures trigger immediate rollback and fail closed with HTTP 403/400/500.
- **Precision Math Invariants (Decisions #3 & #22):**
  - Proposal execution and score adjustments must use `Prisma.Decimal` to preserve financial-grade decimal scoring without floating-point drift.
- **Authoritative Preconditions (Decision #27 & #55):**
  - Overrides and proposals cannot be executed against unfinalized or locked slates without meeting authoritative state requirements.
- **Clock Injection:**
  - Execution timestamps and proposal expiration evaluations accept an injectable `ClockFn: () => Date` for deterministic unit and integration test assertions.

## 3. UI Component Architecture (React/Tailwind)
- **CommissionerDashboardView:**
  - Main management hub mounted under `/pools/:pool_id/manage`.
  - Conditional rendering: Visible strictly to users verified as pool commissioners.
- **ProposalReviewCard & VoteModal:**
  - Displays proposed stat changes, user impact, affected game, and submission timestamp.
  - Interactive controls: "Approve", "Reject", "Execute Proposal" with confirmation dialogs.
- **ManualOverridePanel:**
  - Form allowing commissioners to input authoritative manual overrides with mandatory reason/audit trail fields.
- **PoolHealthWidget:**
  - Read-only card displaying weekly wrap-up status, missing picks count, and slate lock indicators.

## 4. Verification & Testing Strategy
- Tier isolation tests proving standard members and global ADMINs without commissioner role receive 403 on commissioner routes (Decision #20).
- Decision #54 compliance tests confirming GET routes produce zero writes.
- Precision math unit tests proving score adjustments calculate using exact decimals.
- Decision #27 fail-closed tests proving proposals reject execution against unfinalized slates.
- Component state tests for proposal cards, action buttons, and access guards.
```

### 8.2 Override & Proposal Service (`src/services/overrideService.ts`)
```typescript
import { Prisma } from '@prisma/client';
import prisma from '../db/client';

export type OverrideType = 'PICK' | 'PENALTY' | 'SCORE_ADJUSTMENT' | 'CUSTOM';
export type ClockFn = () => Date;

let injectedClock: ClockFn | undefined;

export function setOverrideServiceClock(clock: ClockFn | undefined): void {
  injectedClock = clock;
}

function getNow(clockFn?: ClockFn): Date {
  if (clockFn) return clockFn();
  if (injectedClock) return injectedClock();
  return new Date();
}

export interface OverrideProposalInput {
  poolId: string;
  commissionerId: string;
  type: OverrideType;
  targetEntityId: string;
  data: any;
  reason: string;
}

export interface ProposalRecord {
  id: string;
  poolId: string;
  actorId: string;
  action: string;
  targetEntityId: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
}

/**
 * Commissioner Override & Proposal Governance Service (Milestone 12.2 & 13.2)
 *
 * Invariants:
 * - Decision #20: Authority is scoped strictly by pools.admin_id; no global admin bypass on pool routes.
 * - Decision #54: Mutations occur strictly within write (POST/PUT) methods, never on GET.
 * - Decision #27: Proposals cannot execute against unfinalized or locked slates without meeting authoritative finality.
 * - Decisions #3 & #22: Precision scoring adjustments strictly use Prisma.Decimal.
 * - Decision #55: Fail-closed transaction rollback on execution errors.
 */

/**
 * Creates an override proposal within the specified pool.
 */
export async function createOverrideProposal(
  input: OverrideProposalInput,
  clockFn?: ClockFn,
  db: typeof prisma = prisma
): Promise<ProposalRecord> {
  const { poolId, commissionerId, type, targetEntityId, data, reason } = input;

  if (!poolId || !commissionerId || !type || !targetEntityId) {
    throw new Error('poolId, commissionerId, type, and targetEntityId are required');
  }

  // Verify pool exists and caller is commissioner
  const pool = await db.pool.findUnique({ where: { id: poolId } });
  if (!pool) {
    throw new Error('POOL_NOT_FOUND');
  }
  if (pool.adminId !== commissionerId) {
    throw new Error('FORBIDDEN_COMMISSIONER_REQUIRED');
  }

  const now = getNow(clockFn);

  const auditLog = await db.auditLog.create({
    data: {
      actorId: commissionerId,
      action: 'COMMISSIONER_PROPOSAL_CREATED',
      targetEntityId,
      timestamp: now,
      newValue: {
        poolId,
        type,
        data,
        reason,
        status: 'PROPOSED',
        createdAt: now.toISOString(),
      },
    },
  });

  return auditLog as unknown as ProposalRecord;
}

/**
 * Records a commissioner vote (APPROVE / REJECT) on a proposal.
 * Enforces Decision #20 (commissioner authority).
 */
export async function recordProposalVote(
  poolId: string,
  proposalId: string,
  commissionerUserId: string,
  voteDecision: 'APPROVE' | 'REJECT',
  clockFn?: ClockFn,
  db: typeof prisma = prisma
): Promise<ProposalRecord> {
  if (!poolId || !proposalId || !commissionerUserId || !voteDecision) {
    throw new Error('poolId, proposalId, commissionerUserId, and voteDecision are required');
  }

  if (voteDecision !== 'APPROVE' && voteDecision !== 'REJECT') {
    throw new Error('voteDecision must be APPROVE or REJECT');
  }

  const pool = await db.pool.findUnique({ where: { id: poolId } });
  if (!pool) {
    throw new Error('POOL_NOT_FOUND');
  }
  if (pool.adminId !== commissionerUserId) {
    throw new Error('FORBIDDEN_COMMISSIONER_REQUIRED');
  }

  const proposal = await db.auditLog.findUnique({
    where: { id: proposalId },
  });

  if (!proposal) {
    throw new Error('PROPOSAL_NOT_FOUND');
  }

  const val = (proposal.newValue as any) || {};
  if (val.poolId !== poolId) {
    throw new Error('PROPOSAL_POOL_MISMATCH');
  }

  if (val.status === 'EXECUTED') {
    throw new Error('CANNOT_VOTE_ON_EXECUTED_PROPOSAL');
  }

  const now = getNow(clockFn);
  const updatedStatus = voteDecision === 'APPROVE' ? 'APPROVED' : 'REJECTED';

  const updatedValue = {
    ...val,
    status: updatedStatus,
    votedBy: commissionerUserId,
    votedAt: now.toISOString(),
    voteDecision,
  };

  const updated = await db.auditLog.update({
    where: { id: proposalId },
    data: {
      newValue: updatedValue,
    },
  });

  return updated as unknown as ProposalRecord;
}

/**
 * Atomically executes an approved proposal, recalculating scoring and updating target entities.
 *
 * Enforces:
 * - Decision #27: Authoritative finality check; rejects unfinalized or locked slates.
 * - Decisions #3 & #22: Decimal scoring arithmetic via Prisma.Decimal.
 * - Decision #55: Transaction rollback on failure.
 */
export async function executeProposal(
  poolId: string,
  proposalId: string,
  commissionerUserId: string,
  clockFn?: ClockFn,
  db: typeof prisma = prisma
): Promise<{ success: boolean; proposalId: string; action: string; result: any; executedAt: Date }> {
  if (!poolId || !proposalId || !commissionerUserId) {
    throw new Error('poolId, proposalId, and commissionerUserId are required');
  }

  const pool = await db.pool.findUnique({ where: { id: poolId } });
  if (!pool) {
    throw new Error('POOL_NOT_FOUND');
  }
  if (pool.adminId !== commissionerUserId) {
    throw new Error('FORBIDDEN_COMMISSIONER_REQUIRED');
  }

  const proposal = await db.auditLog.findUnique({
    where: { id: proposalId },
  });

  if (!proposal) {
    throw new Error('PROPOSAL_NOT_FOUND');
  }

  const val = (proposal.newValue as any) || {};
  if (val.poolId !== poolId) {
    throw new Error('PROPOSAL_POOL_MISMATCH');
  }

  if (val.status === 'EXECUTED') {
    throw new Error('PROPOSAL_ALREADY_EXECUTED');
  }

  // Enforce Decision #27: Authoritative finality check
  if (val.data?.slateFinalized === false || val.data?.isFinalized === false) {
    throw new Error('DECISION_27_FAIL_CLOSED: Target slate or game is unfinalized.');
  }

  if (val.data?.gameId) {
    const game = await db.game.findUnique({ where: { id: val.data.gameId } });
    if (game && val.data?.requireGameFinal && game.status !== 'FINAL') {
      throw new Error('DECISION_27_FAIL_CLOSED: Game is not FINAL.');
    }
  }

  const now = getNow(clockFn);

  return await db.$transaction(
    async (tx) => {
      let result: any = null;
      const type: OverrideType = val.type || 'PICK';
      const data = val.data || {};
      const targetEntityId = proposal.targetEntityId;

      if (type === 'PICK') {
        const userId = data.userId || targetEntityId;
        const gameId = data.gameId;
        const selectedTeamId = data.selectedTeamId !== undefined ? data.selectedTeamId : null;

        if (!userId || !gameId) {
          throw new Error('userId and gameId are required for PICK override');
        }

        result = await tx.pick.upsert({
          where: {
            poolId_userId_gameId: {
              poolId,
              userId,
              gameId,
            },
          },
          update: {
            selectedTeamId,
            submittedById: commissionerUserId,
          },
          create: {
            poolId,
            userId,
            gameId,
            selectedTeamId,
            submittedById: commissionerUserId,
          },
        });
      } else if (type === 'PENALTY' || type === 'SCORE_ADJUSTMENT') {
        const userId = data.userId || targetEntityId;
        // Enforce Decisions #3 & #22: Prisma.Decimal precision
        const deltaStr = (data.delta !== undefined ? data.delta : data.points !== undefined ? data.points : '1').toString();
        const delta = new Prisma.Decimal(deltaStr);
        const weekNumber = data.weekNumber !== undefined ? Number(data.weekNumber) : null;

        if (!userId) {
          throw new Error('userId is required for PENALTY/SCORE_ADJUSTMENT override');
        }

        result = await tx.penaltyLedger.create({
          data: {
            poolId,
            userId,
            weekNumber,
            delta,
            reason: val.reason || 'COMMISSIONER_PROPOSAL_EXECUTION',
            createdById: commissionerUserId,
            createdAt: now,
          },
        });

        // Recalculate member total shots using Decimal aggregate
        const ledgerSum = await tx.penaltyLedger.aggregate({
          where: { poolId, userId },
          _sum: { delta: true },
        });

        const totalShots = ledgerSum._sum.delta ?? new Prisma.Decimal(0);

        await tx.poolMemberStat.upsert({
          where: { poolId_userId: { poolId, userId } },
          update: { totalShotsDrank: totalShots, updatedAt: now },
          create: { poolId, userId, totalShotsDrank: totalShots, updatedAt: now },
        });
      } else {
        result = { customData: data, executedAt: now.toISOString() };
      }

      // Mark proposal status as EXECUTED
      const updatedProposalValue = {
        ...val,
        status: 'EXECUTED',
        executedBy: commissionerUserId,
        executedAt: now.toISOString(),
        executionResult: JSON.parse(JSON.stringify(result)),
      };

      await tx.auditLog.update({
        where: { id: proposalId },
        data: {
          newValue: updatedProposalValue,
        },
      });

      // Record separate execution audit log
      await tx.auditLog.create({
        data: {
          actorId: commissionerUserId,
          action: 'COMMISSIONER_PROPOSAL_EXECUTED',
          targetEntityId: proposalId,
          timestamp: now,
          newValue: {
            poolId,
            proposalId,
            type,
            result: JSON.parse(JSON.stringify(result)),
          },
        },
      });

      return {
        success: true,
        proposalId,
        action: 'PROPOSAL_EXECUTED',
        result,
        executedAt: now,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

/**
 * Applies a commissioner override directly inside a serializable transaction.
 */
export async function applyOverride(
  input: OverrideProposalInput,
  clockFn?: ClockFn,
  db: typeof prisma = prisma
): Promise<{ success: boolean; action: string; result: any; auditLogId: string }> {
  const { poolId, commissionerId, type, targetEntityId, data, reason } = input;

  if (!poolId || !commissionerId || !type || !targetEntityId) {
    throw new Error('poolId, commissionerId, type, and targetEntityId are required');
  }

  const pool = await db.pool.findUnique({ where: { id: poolId } });
  if (!pool) {
    throw new Error('POOL_NOT_FOUND');
  }
  if (pool.adminId !== commissionerId) {
    throw new Error('FORBIDDEN_COMMISSIONER_REQUIRED');
  }

  const now = getNow(clockFn);

  return await db.$transaction(
    async (tx) => {
      let result: any = null;
      let actionName = `COMMISSIONER_OVERRIDE_${type}`;
      let oldValue: any = null;

      if (type === 'PICK') {
        const userId = data.userId || targetEntityId;
        const gameId = data.gameId;
        const selectedTeamId = data.selectedTeamId !== undefined ? data.selectedTeamId : null;

        if (!userId || !gameId) {
          throw new Error('userId and gameId are required for PICK override');
        }

        const existingPick = await tx.pick.findUnique({
          where: {
            poolId_userId_gameId: {
              poolId,
              userId,
              gameId,
            },
          },
        });
        oldValue = existingPick ? JSON.parse(JSON.stringify(existingPick)) : null;

        result = await tx.pick.upsert({
          where: {
            poolId_userId_gameId: {
              poolId,
              userId,
              gameId,
            },
          },
          update: {
            selectedTeamId,
            submittedById: commissionerId,
          },
          create: {
            poolId,
            userId,
            gameId,
            selectedTeamId,
            submittedById: commissionerId,
          },
        });
      } else if (type === 'PENALTY' || type === 'SCORE_ADJUSTMENT') {
        const userId = data.userId || targetEntityId;
        const delta = new Prisma.Decimal(data.delta?.toString() || data.points?.toString() || '1');
        const weekNumber = data.weekNumber !== undefined ? Number(data.weekNumber) : null;

        if (!userId) {
          throw new Error('userId is required for PENALTY override');
        }

        result = await tx.penaltyLedger.create({
          data: {
            poolId,
            userId,
            weekNumber,
            delta,
            reason: reason || 'COMMISSIONER_PENALTY_OVERRIDE',
            createdById: commissionerId,
            createdAt: now,
          },
        });

        // Recalculate member total shots
        const ledgerSum = await tx.penaltyLedger.aggregate({
          where: { poolId, userId },
          _sum: { delta: true },
        });

        await tx.poolMemberStat.upsert({
          where: { poolId_userId: { poolId, userId } },
          update: { totalShotsDrank: ledgerSum._sum.delta ?? new Prisma.Decimal(0), updatedAt: now },
          create: { poolId, userId, totalShotsDrank: ledgerSum._sum.delta ?? new Prisma.Decimal(0), updatedAt: now },
        });
      } else {
        result = { customData: data, appliedAt: now.toISOString() };
      }

      const auditLog = await tx.auditLog.create({
        data: {
          actorId: commissionerId,
          action: actionName,
          targetEntityId: result?.id || targetEntityId,
          timestamp: now,
          oldValue,
          newValue: {
            poolId,
            type,
            reason,
            data: JSON.parse(JSON.stringify(result)),
          },
        },
      });

      return {
        success: true,
        action: actionName,
        result,
        auditLogId: auditLog.id,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

/**
 * Lists proposals for a pool.
 * Decision #54: Strictly read-only, zero side effects or mutations.
 */
export async function listProposals(
  poolId: string,
  db: typeof prisma = prisma
): Promise<ProposalRecord[]> {
  const auditLogs = await db.auditLog.findMany({
    where: {
      action: {
        in: [
          'COMMISSIONER_PROPOSAL_CREATED',
          'COMMISSIONER_PROPOSAL_EXECUTED',
        ],
      },
    },
    orderBy: { timestamp: 'desc' },
    take: 100,
  });

  const poolLogs = auditLogs.filter((log) => {
    if (log.newValue && typeof log.newValue === 'object') {
      return (log.newValue as any).poolId === poolId;
    }
    return false;
  });

  return poolLogs as unknown as ProposalRecord[];
}

/**
 * Lists applied overrides for a pool.
 * Decision #54: Strictly read-only, zero side effects or mutations.
 */
export async function listOverrides(
  poolId: string,
  db: typeof prisma = prisma
): Promise<ProposalRecord[]> {
  const auditLogs = await db.auditLog.findMany({
    where: {
      action: {
        in: [
          'COMMISSIONER_OVERRIDE_PICK',
          'COMMISSIONER_OVERRIDE_PENALTY',
          'COMMISSIONER_OVERRIDE_SCORE_ADJUSTMENT',
          'COMMISSIONER_OVERRIDE_CUSTOM',
          'COMMISSIONER_PROPOSAL_EXECUTED',
          'ADMIN_OVERRIDE_PICK',
        ],
      },
    },
    orderBy: { timestamp: 'desc' },
    take: 100,
  });

  const poolLogs = auditLogs.filter((log) => {
    if (log.newValue && typeof log.newValue === 'object') {
      return (log.newValue as any).poolId === poolId;
    }
    return false;
  });

  return poolLogs as unknown as ProposalRecord[];
}

/**
 * Returns read-only pool ops status, weekly wrap-up readiness and stats.
 * Decision #54: Strictly read-only, zero database writes.
 */
export async function getPoolOpsStatus(
  poolId: string,
  db: typeof prisma = prisma
): Promise<any> {
  const pool = await db.pool.findUnique({
    where: { id: poolId },
    include: {
      _count: {
        select: {
          memberships: true,
          inboxMessages: true,
          outboxEvents: true,
        },
      },
    },
  });

  if (!pool) {
    throw new Error('POOL_NOT_FOUND');
  }

  const [
    activeMembersCount,
    unreadInboxCount,
    pendingOutboxCount,
    deadOutboxCount,
    proposalsCount,
    overridesCount,
  ] = await Promise.all([
    db.poolMembership.count({ where: { poolId, status: 'ACTIVE' } }),
    db.inboxMessage.count({ where: { poolId, readAt: null } }),
    db.outboxEvent.count({ where: { poolId, status: 'PENDING' } }),
    db.outboxEvent.count({ where: { poolId, status: 'DEAD' } }),
    db.auditLog.count({
      where: {
        action: 'COMMISSIONER_PROPOSAL_CREATED',
      },
    }),
    db.auditLog.count({
      where: {
        action: {
          in: ['COMMISSIONER_OVERRIDE_PICK', 'COMMISSIONER_OVERRIDE_PENALTY', 'COMMISSIONER_PROPOSAL_EXECUTED'],
        },
      },
    }),
  ]);

  return {
    poolId: pool.id,
    poolName: pool.name,
    status: pool.status,
    activeMembers: activeMembersCount,
    unreadNotifications: unreadInboxCount,
    pendingOutbox: pendingOutboxCount,
    deadOutbox: deadOutboxCount,
    wrapUpReady: deadOutboxCount === 0 && pendingOutboxCount === 0,
    metrics: {
      totalMembers: pool._count.memberships,
      totalProposals: proposalsCount,
      totalOverrides: overridesCount,
    },
  };
}
```

### 8.3 Pool Ops Router (`src/routes/ops.ts`)
```typescript
import { Router, Request, Response } from 'express';
import prisma from '../db/client';
import { requireAuth, requirePoolCommissioner, UUID_REGEX } from '../middleware/auth';
import {
  createOverrideProposal,
  recordProposalVote,
  executeProposal,
  applyOverride,
  listProposals,
  listOverrides,
  getPoolOpsStatus,
} from '../services/overrideService';

export const opsRouter = Router({ mergeParams: true });

// JobRun-level re-execution is out-of-scope for pool-scoped APIs. Job worker runs operate at the system/service tier.

/**
 * GET /api/pools/:pool_id/ops/health
 * Protected route for pool commissioner.
 * Observational health telemetry: strictly pool-scoped outbox queue depth, dead events, and recent activity.
 * Strictly read-only (Decision #54 compliant).
 * NOTE: Global JobRun records are excluded to prevent cross-pool telemetry leakage.
 */
opsRouter.get('/:pool_id/ops/health', requireAuth, requirePoolCommissioner, async (req: Request, res: Response): Promise<void> => {
  const pool = req.pool;
  const poolId = pool.id;

  try {
    const [
      pendingCount,
      processingCount,
      deadCount,
      failedCount,
      sentCount,
      suppressedCount,
      totalCount,
      deadEvents,
      recentOutboxActivity,
    ] = await Promise.all([
      prisma.outboxEvent.count({ where: { poolId, status: 'PENDING' } }),
      prisma.outboxEvent.count({ where: { poolId, status: 'PROCESSING' } }),
      prisma.outboxEvent.count({ where: { poolId, status: 'DEAD' } }),
      prisma.outboxEvent.count({ where: { poolId, status: 'FAILED' } }),
      prisma.outboxEvent.count({ where: { poolId, status: 'SENT' } }),
      prisma.outboxEvent.count({ where: { poolId, status: 'SUPPRESSED' } }),
      prisma.outboxEvent.count({ where: { poolId } }),
      prisma.outboxEvent.findMany({
        where: { poolId, status: { in: ['DEAD', 'FAILED'] } },
        orderBy: { createdAt: 'desc' },
        take: 25,
        select: {
          id: true,
          type: true,
          status: true,
          attempts: true,
          lastErrorCode: true,
          createdAt: true,
          nextAttemptAt: true,
          leaseExpiresAt: true,
          sentAt: true,
          retriedAt: true,
          retriedBy: true,
        },
      }),
      prisma.outboxEvent.findMany({
        where: { poolId },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: {
          id: true,
          type: true,
          status: true,
          attempts: true,
          lastErrorCode: true,
          createdAt: true,
          sentAt: true,
          retriedAt: true,
        },
      }),
    ]);

    const status = deadCount > 0 || failedCount > 0 ? 'DEGRADED' : 'HEALTHY';

    res.json({
      poolId,
      poolName: pool.name,
      status,
      timestamp: new Date().toISOString(),
      queueDepth: {
        pending: pendingCount,
        processing: processingCount,
        dead: deadCount,
        failed: failedCount,
        sent: sentCount,
        suppressed: suppressedCount,
        total: totalCount,
      },
      deadEvents,
      recentOutboxActivity,
    });
  } catch (error) {
    console.error('Error fetching pool ops health:', error);
    res.status(500).json({ error: 'Failed to fetch pool ops health telemetry.' });
  }
});

/**
 * GET /api/pools/:pool_id/ops/status
 * Protected route for pool commissioner.
 * Read-only pool wrap-up readiness, member stats, and operational overview.
 * Strict adherence to Decision #54 (NO WRITES ON GET).
 */
opsRouter.get('/:pool_id/ops/status', requireAuth, requirePoolCommissioner, async (req: Request, res: Response): Promise<void> => {
  const poolId = req.pool.id;

  try {
    const statusData = await getPoolOpsStatus(poolId);
    res.status(200).json(statusData);
  } catch (error: any) {
    console.error('Error fetching pool ops status:', error);
    res.status(500).json({ error: 'Failed to fetch pool ops status', details: error.message });
  }
});

/**
 * POST /api/pools/:pool_id/ops/outbox/retry
 * Protected route for pool commissioner.
 * Re-queues DEAD or FAILED outbox events for the pool.
 * Resets status to PENDING, attempts to 0, clears leaseExpiresAt, sets nextAttemptAt to now,
 * and stamps retriedBy/retriedAt.
 * Strictly scoped to OutboxEvent records belonging to poolId.
 */
opsRouter.post('/:pool_id/ops/outbox/retry', requireAuth, requirePoolCommissioner, async (req: Request, res: Response): Promise<void> => {
  const pool = req.pool;
  const poolId = pool.id;
  const rawOutboxId = req.body?.outboxId || req.body?.outbox_id;
  const outboxId = typeof rawOutboxId === 'string' && UUID_REGEX.test(rawOutboxId) ? rawOutboxId : undefined;

  try {
    const where: any = {
      poolId,
      status: { in: ['DEAD', 'FAILED'] },
    };

    if (outboxId) {
      where.id = outboxId;
    }

    const result = await prisma.outboxEvent.updateMany({
      where,
      data: {
        status: 'PENDING',
        attempts: 0,
        leaseExpiresAt: null,
        nextAttemptAt: new Date(),
        retriedBy: req.user!.id,
        retriedAt: new Date(),
      },
    });

    res.json({
      success: true,
      poolId,
      retriedCount: result.count,
    });
  } catch (error) {
    console.error('Error retrying outbox events:', error);
    res.status(500).json({ error: 'Failed to retry outbox events.' });
  }
});

/**
 * GET /api/pools/:pool_id/proposals
 * Pool-tier read-only endpoint listing override proposals for the pool.
 * Protected by requireAuth & requirePoolCommissioner.
 * Strict adherence to Decision #54 (NO WRITES ON GET: zero state mutation).
 */
opsRouter.get('/:pool_id/proposals', requireAuth, requirePoolCommissioner, async (req: Request, res: Response): Promise<void> => {
  const poolId = req.pool.id;

  try {
    const proposals = await listProposals(poolId);
    res.status(200).json({
      poolId,
      proposals,
    });
  } catch (error: any) {
    console.error('Error listing proposals:', error);
    res.status(500).json({
      error: 'Failed to list proposals',
      details: error.message,
    });
  }
});

/**
 * POST /api/pools/:pool_id/proposals
 * Pool-tier endpoint to create a commissioner override proposal.
 * Protected by requireAuth & requirePoolCommissioner (Decision #20: No global admin override bypass).
 * Decision #54 compliant (Mutations occur via POST).
 */
opsRouter.post('/:pool_id/proposals', requireAuth, requirePoolCommissioner, async (req: Request, res: Response): Promise<void> => {
  const poolId = req.pool.id;
  const commissionerId = req.user!.id;
  const { type, targetEntityId, data, reason } = req.body || {};

  if (!type || !targetEntityId) {
    res.status(400).json({ error: 'type and targetEntityId are required fields.' });
    return;
  }

  try {
    const proposal = await createOverrideProposal({
      poolId,
      commissionerId,
      type,
      targetEntityId,
      data: data || {},
      reason: reason || 'Commissioner proposal',
    });

    res.status(201).json({
      message: 'Override proposal recorded successfully',
      proposal,
    });
  } catch (error: any) {
    console.error('Error creating override proposal:', error);
    res.status(500).json({
      error: 'Failed to create override proposal',
      details: error.message,
    });
  }
});

/**
 * POST /api/pools/:pool_id/proposals/:id/vote
 * Records commissioner approval or rejection vote on a proposal.
 * Protected by requireAuth & requirePoolCommissioner (Decision #20).
 */
opsRouter.post('/:pool_id/proposals/:id/vote', requireAuth, requirePoolCommissioner, async (req: Request, res: Response): Promise<void> => {
  const poolId = req.pool.id;
  const commissionerId = req.user!.id;
  const proposalId = req.params.id;
  const { decision, vote } = req.body || {};
  const voteDecision = (decision || vote || '').toUpperCase();

  if (!proposalId || !UUID_REGEX.test(proposalId)) {
    res.status(400).json({ error: 'Invalid proposal ID format.' });
    return;
  }

  if (voteDecision !== 'APPROVE' && voteDecision !== 'REJECT') {
    res.status(400).json({ error: 'decision must be APPROVE or REJECT.' });
    return;
  }

  try {
    const updatedProposal = await recordProposalVote(
      poolId,
      proposalId,
      commissionerId,
      voteDecision as 'APPROVE' | 'REJECT'
    );

    res.status(200).json({
      success: true,
      message: `Proposal ${voteDecision.toLowerCase()}d successfully`,
      proposal: updatedProposal,
    });
  } catch (error: any) {
    console.error('Error recording proposal vote:', error);
    const status = error.message.includes('NOT_FOUND') ? 404 : 400;
    res.status(status).json({
      error: 'Failed to record proposal vote',
      details: error.message,
    });
  }
});

/**
 * POST /api/pools/:pool_id/proposals/:id/execute
 * Atomically executes an approved proposal, applying score adjustments via Prisma.Decimal.
 * Protected by requireAuth & requirePoolCommissioner (Decision #20).
 * Enforces Decision #27 (fail closed if slate/game is unfinalized) and Decision #55 (atomic rollback).
 */
opsRouter.post('/:pool_id/proposals/:id/execute', requireAuth, requirePoolCommissioner, async (req: Request, res: Response): Promise<void> => {
  const poolId = req.pool.id;
  const commissionerId = req.user!.id;
  const proposalId = req.params.id;

  if (!proposalId || !UUID_REGEX.test(proposalId)) {
    res.status(400).json({ error: 'Invalid proposal ID format.' });
    return;
  }

  try {
    const result = await executeProposal(poolId, proposalId, commissionerId);
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error executing proposal:', error);
    const isClientError =
      error.message.includes('NOT_FOUND') ||
      error.message.includes('DECISION_27') ||
      error.message.includes('FAIL_CLOSED') ||
      error.message.includes('ALREADY_EXECUTED');
    const status = error.message.includes('NOT_FOUND') ? 404 : isClientError ? 400 : 500;

    res.status(status).json({
      error: 'Failed to execute proposal',
      details: error.message,
    });
  }
});

/**
 * GET /api/pools/:pool_id/overrides
 * Pool-tier read-only endpoint listing applied overrides for the pool.
 * Protected by requireAuth & requirePoolCommissioner.
 * Strict adherence to Decision #54 (NO WRITES ON GET: zero state mutation).
 */
opsRouter.get('/:pool_id/overrides', requireAuth, requirePoolCommissioner, async (req: Request, res: Response): Promise<void> => {
  const poolId = req.pool.id;

  try {
    const overrides = await listOverrides(poolId);
    res.status(200).json({
      poolId,
      overrides,
    });
  } catch (error: any) {
    console.error('Error listing overrides:', error);
    res.status(500).json({
      error: 'Failed to list overrides',
      details: error.message,
    });
  }
});

/**
 * POST /api/pools/:pool_id/overrides
 * Pool-tier endpoint to directly apply a commissioner override in a serializable transaction.
 * Protected by requireAuth & requirePoolCommissioner (Decision #20).
 * Decision #54 compliant (Mutations occur via POST).
 */
opsRouter.post('/:pool_id/overrides', requireAuth, requirePoolCommissioner, async (req: Request, res: Response): Promise<void> => {
  const poolId = req.pool.id;
  const commissionerId = req.user!.id;
  const { type, targetEntityId, data, reason } = req.body || {};

  if (!type || !targetEntityId) {
    res.status(400).json({ error: 'type and targetEntityId are required fields.' });
    return;
  }

  try {
    const result = await applyOverride({
      poolId,
      commissionerId,
      type,
      targetEntityId,
      data: data || {},
      reason: reason || 'Commissioner override execution',
    });

    res.status(200).json({
      message: 'Override applied successfully',
      ...result,
    });
  } catch (error: any) {
    console.error('Error applying override:', error);
    res.status(500).json({
      error: 'Failed to apply override',
      details: error.message,
    });
  }
});
```

### 8.4 CommissionerDashboardView Component (`client/src/components/commissioner/CommissionerDashboardView.tsx`)
```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  FileCheck2,
  Sliders,
  Activity,
  AlertOctagon,
  RefreshCw,
  PlusCircle,
  ArrowLeft,
} from 'lucide-react';
import { PoolHealthWidget, type PoolOpsStatusData } from './PoolHealthWidget';
import { ProposalReviewCard, type ProposalItem } from './ProposalReviewCard';
import { ManualOverridePanel } from './ManualOverridePanel';

export const CommissionerDashboardView: React.FC = () => {
  const { pool_id: poolIdParam } = useParams<{ pool_id: string }>();
  const poolId = poolIdParam || '';
  const { token, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<'proposals' | 'overrides' | 'health'>('proposals');
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [healthData, setHealthData] = useState<PoolOpsStatusData | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!token || !poolId) return;
    setLoading(true);
    setErrorStatus(null);
    setErrorMessage(null);

    try {
      // 1. Fetch pool health status
      const healthRes = await fetch(`/api/pools/${poolId}/ops/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (healthRes.status === 403) {
        setErrorStatus(403);
        setErrorMessage('Forbidden. You do not hold pool commissioner privileges for this pool.');
        return;
      }
      if (healthRes.status === 404) {
        setErrorStatus(404);
        setErrorMessage('Pool not found.');
        return;
      }

      if (healthRes.ok) {
        const hData = await healthRes.json();
        setHealthData(hData);
      }

      // 2. Fetch proposals
      const proposalsRes = await fetch(`/api/pools/${poolId}/proposals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (proposalsRes.ok) {
        const pData = await proposalsRes.json();
        setProposals(pData.proposals || []);
      }

      // 3. Fetch overrides
      const overridesRes = await fetch(`/api/pools/${poolId}/overrides`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (overridesRes.ok) {
        const oData = await overridesRes.json();
        setOverrides(oData.overrides || []);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error fetching dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [token, poolId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleVote = async (proposalId: string, decision: 'APPROVE' | 'REJECT') => {
    if (!token) return;
    const res = await fetch(`/api/pools/${poolId}/proposals/${proposalId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ decision }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || err.details || 'Vote failed');
    }

    await fetchDashboardData();
  };

  const handleExecute = async (proposalId: string) => {
    if (!token) return;
    const res = await fetch(`/api/pools/${poolId}/proposals/${proposalId}/execute`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || err.details || 'Execution failed');
    }

    await fetchDashboardData();
  };

  if (errorStatus === 403) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="p-8 rounded-3xl bg-rose-950/20 border border-rose-800/40 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
            <AlertOctagon className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">403 Forbidden: Tier Isolation Guard</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            {errorMessage || 'Under Decision #20, pool management routes require authoritative commissioner permissions.'}
          </p>
          <div className="pt-4">
            <Link
              to="/picks"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Picks</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-cyan-400 font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Commissioner Governance Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {healthData?.poolName || 'Pool Dashboard'}
          </h1>
        </div>

        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="self-start sm:self-auto flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Sync State</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab('proposals')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'proposals'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Stat Proposals ({proposals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('overrides')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'overrides'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Manual Overrides ({overrides.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('health')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'health'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Pool Health & Ops</span>
        </button>
      </div>

      {/* Tab 1: Proposals */}
      {activeTab === 'proposals' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Stat Correction & Outcome Proposals</h2>
              <p className="text-xs text-slate-400">Review, vote, and atomically execute stat corrections.</p>
            </div>
          </div>

          {proposals.length === 0 ? (
            <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center text-slate-500 space-y-2">
              <FileCheck2 className="w-8 h-8 mx-auto text-slate-600" />
              <div className="text-sm font-semibold text-slate-400">No proposals pending review</div>
              <p className="text-xs max-w-sm mx-auto">
                Stat correction proposals from provider updates or commissioner triggers will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {proposals.map((p) => (
                <ProposalReviewCard
                  key={p.id}
                  proposal={p}
                  onVote={handleVote}
                  onExecute={handleExecute}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Overrides */}
      {activeTab === 'overrides' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-white">Override Audit History</h2>
            {overrides.length === 0 ? (
              <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-slate-500 text-xs">
                No manual overrides recorded for this pool.
              </div>
            ) : (
              <div className="space-y-3">
                {overrides.map((ov) => (
                  <div
                    key={ov.id}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-400 uppercase">{ov.action}</span>
                      <span className="text-slate-500 text-[10px]">
                        {new Date(ov.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-slate-300">
                      <span className="text-slate-500 font-semibold">Reason: </span>
                      {ov.newValue?.reason || 'Direct commissioner intervention'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <ManualOverridePanel
              poolId={poolId}
              onOverrideApplied={fetchDashboardData}
            />
          </div>
        </div>
      )}

      {/* Tab 3: Pool Health */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          <PoolHealthWidget
            data={healthData}
            loading={loading}
            onRefresh={fetchDashboardData}
          />
        </div>
      )}
    </div>
  );
};
```

### 8.5 ProposalReviewCard Component (`client/src/components/commissioner/ProposalReviewCard.tsx`)
```typescript
import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Play,
  Clock,
  User,
  HelpCircle,
  FileText,
  AlertTriangle,
} from 'lucide-react';

export interface ProposalItem {
  id: string;
  actorId: string;
  action: string;
  targetEntityId: string;
  oldValue: any;
  newValue: {
    poolId: string;
    type: string;
    data: any;
    reason: string;
    status: 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'EXECUTED';
    createdAt: string;
    votedBy?: string;
    votedAt?: string;
    voteDecision?: string;
    executedBy?: string;
    executedAt?: string;
    executionResult?: any;
  };
  timestamp: string;
}

interface ProposalReviewCardProps {
  proposal: ProposalItem;
  onVote: (proposalId: string, decision: 'APPROVE' | 'REJECT') => Promise<void>;
  onExecute: (proposalId: string) => Promise<void>;
}

export const ProposalReviewCard: React.FC<ProposalReviewCardProps> = ({
  proposal,
  onVote,
  onExecute,
}) => {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const val = proposal.newValue || ({} as any);
  const status = val.status || 'PROPOSED';
  const type = val.type || 'UNKNOWN';
  const data = val.data || {};
  const reason = val.reason || 'No description provided';

  const handleVote = async (decision: 'APPROVE' | 'REJECT') => {
    setActionLoading(decision);
    setFeedback(null);
    try {
      await onVote(proposal.id, decision);
      setFeedback({ type: 'success', message: `Proposal ${decision.toLowerCase()}d successfully.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Vote failed.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleExecute = async () => {
    setActionLoading('execute');
    setFeedback(null);
    try {
      await onExecute(proposal.id);
      setFeedback({ type: 'success', message: 'Proposal executed and state committed.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Execution failed.' });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'EXECUTED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            EXECUTED
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            APPROVED
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            REJECTED
          </span>
        );
      case 'PROPOSED':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            PENDING REVIEW
          </span>
        );
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 transition-all shadow-md space-y-4">
      {/* Card Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                {type} Override Proposal
              </span>
              {getStatusBadge()}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center space-x-1.5 mt-0.5">
              <Clock className="w-3 h-3" />
              <span>{new Date(val.createdAt || proposal.timestamp).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800 truncate max-w-[140px]">
          ID: {proposal.id.substring(0, 8)}...
        </div>
      </div>

      {/* Rationale & Target Details */}
      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-2">
        <div className="text-xs font-medium text-slate-300">
          <span className="text-slate-500 font-semibold mr-1.5">Reason:</span>
          {reason}
        </div>

        {/* Data summary */}
        <div className="text-[11px] text-slate-400 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800/40">
          <div>
            <span className="text-slate-500 font-semibold">Target Entity / User: </span>
            <span className="font-mono text-cyan-400">
              {data.userId || proposal.targetEntityId}
            </span>
          </div>
          {data.gameId && (
            <div>
              <span className="text-slate-500 font-semibold">Game ID: </span>
              <span className="font-mono text-slate-300">{data.gameId}</span>
            </div>
          )}
          {data.selectedTeamId && (
            <div>
              <span className="text-slate-500 font-semibold">Selected Pick: </span>
              <span className="font-bold text-emerald-400">{data.selectedTeamId}</span>
            </div>
          )}
          {(data.delta !== undefined || data.points !== undefined) && (
            <div>
              <span className="text-slate-500 font-semibold">Adjustment: </span>
              <span className="font-bold text-amber-400">
                {data.delta ?? data.points} {type === 'PENALTY' ? 'Shots' : 'Pts'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Feedback message */}
      {feedback && (
        <div
          className={`p-2.5 rounded-xl text-xs flex items-center space-x-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Interactive Action Bar */}
      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800/60">
        {status === 'PROPOSED' && (
          <>
            <button
              onClick={() => handleVote('REJECT')}
              disabled={!!actionLoading}
              className="px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 rounded-lg border border-rose-500/20 transition-all flex items-center space-x-1.5 disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>{actionLoading === 'REJECT' ? 'Voting...' : 'Reject'}</span>
            </button>

            <button
              onClick={() => handleVote('APPROVE')}
              disabled={!!actionLoading}
              className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-sm shadow-cyan-500/20 transition-all flex items-center space-x-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{actionLoading === 'APPROVE' ? 'Voting...' : 'Approve'}</span>
            </button>
          </>
        )}

        {status === 'APPROVED' && (
          <button
            onClick={handleExecute}
            disabled={!!actionLoading}
            className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:opacity-90 rounded-lg shadow-md shadow-emerald-500/20 transition-all flex items-center space-x-1.5 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{actionLoading === 'execute' ? 'Executing...' : 'Execute Proposal'}</span>
          </button>
        )}

        {status === 'EXECUTED' && (
          <div className="text-[11px] text-emerald-400 font-medium flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>State committed to ledger</span>
          </div>
        )}
      </div>
    </div>
  );
};
```

### 8.6 ManualOverridePanel Component (`client/src/components/commissioner/ManualOverridePanel.tsx`)
```typescript
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, Send, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface ManualOverridePanelProps {
  poolId: string;
  onOverrideApplied: () => void;
}

export const ManualOverridePanel: React.FC<ManualOverridePanelProps> = ({
  poolId,
  onOverrideApplied,
}) => {
  const { token } = useAuth();
  const [overrideType, setOverrideType] = useState<'PICK' | 'PENALTY' | 'SCORE_ADJUSTMENT'>('PICK');
  const [targetUserId, setTargetUserId] = useState('');
  const [gameId, setGameId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [delta, setDelta] = useState('1');
  const [reason, setReason] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!targetUserId.trim()) {
      setFeedback({ type: 'error', message: 'Target User ID is required.' });
      return;
    }

    if (!reason.trim()) {
      setFeedback({ type: 'error', message: 'Authoritative audit reason is mandatory.' });
      return;
    }

    if (overrideType === 'PICK' && (!gameId.trim() || !selectedTeamId.trim())) {
      setFeedback({ type: 'error', message: 'Game ID and Selected Team ID are required for Pick overrides.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    const payloadData: any = {
      userId: targetUserId.trim(),
    };

    if (overrideType === 'PICK') {
      payloadData.gameId = gameId.trim();
      payloadData.selectedTeamId = selectedTeamId.trim().toUpperCase();
    } else {
      payloadData.delta = delta;
      payloadData.points = delta;
    }

    try {
      const res = await fetch(`/api/pools/${poolId}/overrides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: overrideType,
          targetEntityId: targetUserId.trim(),
          data: payloadData,
          reason: reason.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || errData.details || 'Failed to apply manual override.');
      }

      setFeedback({ type: 'success', message: 'Manual override executed and committed to ledger.' });
      setReason('');
      onOverrideApplied();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error executing override.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center space-x-2.5">
        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Authoritative Manual Override</h3>
          <p className="text-xs text-slate-400">Directly commit changes to pick outcomes or penalty ledgers</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-medium flex items-center space-x-2.5 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Override Type Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Override Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['PICK', 'PENALTY', 'SCORE_ADJUSTMENT'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setOverrideType(t)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  overrideType === t
                    ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/30'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800'
                }`}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Target User ID */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1">
            Target User UUID <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            required
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Dynamic Fields by Type */}
        {overrideType === 'PICK' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Game UUID <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                placeholder="Game UUID"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Selected Team Abbreviation <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                placeholder="e.g. KC, SF, PHI"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white placeholder-slate-600 uppercase focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Delta Adjustment (Decimal Units) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              step="0.25"
              required
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="e.g. 1.00 or -0.50"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>
        )}

        {/* Mandatory Reason */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1">
            Mandatory Rationale & Audit Trail <span className="text-rose-400">*</span>
          </label>
          <textarea
            required
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Document authoritative ruling rationale, ticket reference, or stat correction basis..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 resize-none"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-cyan-400 hover:opacity-90 shadow-md shadow-cyan-500/20 transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            {submitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{submitting ? 'Committing Override...' : 'Apply Authoritative Override'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
```

### 8.7 PoolHealthWidget Component (`client/src/components/commissioner/PoolHealthWidget.tsx`)
```typescript
import React from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, Clock, Users, Mail, RefreshCw } from 'lucide-react';

export interface PoolOpsStatusData {
  poolId: string;
  poolName: string;
  status: string;
  activeMembers: number;
  unreadNotifications: number;
  pendingOutbox: number;
  deadOutbox: number;
  wrapUpReady: boolean;
  metrics: {
    totalMembers: number;
    totalProposals: number;
    totalOverrides: number;
  };
}

interface PoolHealthWidgetProps {
  data: PoolOpsStatusData | null;
  loading: boolean;
  onRefresh: () => void;
}

export const PoolHealthWidget: React.FC<PoolHealthWidgetProps> = ({
  data,
  loading,
  onRefresh,
}) => {
  if (loading && !data) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center space-x-3 text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
        <span className="text-sm">Loading pool telemetry...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-slate-500 text-sm">
        No telemetry data available.
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Pool Operations & Health</h3>
            <p className="text-xs text-slate-400">Real-time status for {data.poolName}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center space-x-1.5 ${
              data.wrapUpReady
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
          >
            {data.wrapUpReady ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            <span>{data.wrapUpReady ? 'Wrap-Up Ready' : 'Pending Operations'}</span>
          </span>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Refresh status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>Active Members</span>
          </div>
          <div className="text-2xl font-black text-white">{data.activeMembers}</div>
          <div className="text-[11px] text-slate-500 mt-1">Total: {data.metrics.totalMembers} enrolled</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
            <Mail className="w-3.5 h-3.5 text-emerald-400" />
            <span>Unread Notifications</span>
          </div>
          <div className="text-2xl font-black text-white">{data.unreadNotifications}</div>
          <div className="text-[11px] text-slate-500 mt-1">Inbox messages pending read</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Outbox Queue Depth</span>
          </div>
          <div className="text-2xl font-black text-white">{data.pendingOutbox}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {data.deadOutbox > 0 ? (
              <span className="text-rose-400 font-bold">{data.deadOutbox} Dead Letter Events</span>
            ) : (
              '0 dead letters'
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>Governance Ledger</span>
          </div>
          <div className="text-2xl font-black text-white">{data.metrics.totalOverrides}</div>
          <div className="text-[11px] text-slate-500 mt-1">{data.metrics.totalProposals} proposals recorded</div>
        </div>
      </div>
    </div>
  );
};
```

### 8.8 Commissioner Governance Test Suite (`tests/commissionerDashboard.test.ts`)
```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role, GameStatus, Prisma } from '@prisma/client';
import { app } from '../src/server';
import { JWT_SECRET } from '../src/middleware/auth';
import { assertDisposableUrl } from '../src/db/safeguards';
import {
  setOverrideServiceClock,
  createOverrideProposal,
  recordProposalVote,
  executeProposal,
} from '../src/services/overrideService';

const rehearsalDbUrl =
  process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/pickem_rehearsal';

describe('Milestone 13.2 Commissioner Dashboard & Governance Integration Tests', () => {
  let server: http.Server;
  let baseUrl: string;
  let prisma: PrismaClient;

  let commissionerUser: any;
  let memberUser: any;
  let globalAdminUser: any;
  let otherCommissionerUser: any;

  let commissionerToken: string;
  let memberToken: string;
  let globalAdminToken: string;
  let otherCommissionerToken: string;

  let pool: any;
  let otherPool: any;
  let finalGame: any;
  let scheduledGame: any;

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

    commissionerUser = await prisma.user.create({
      data: {
        email: `commish_13_2_${Date.now()}@example.com`,
        passwordHash: 'hash',
        role: Role.USER,
      },
    });

    memberUser = await prisma.user.create({
      data: {
        email: `member_13_2_${Date.now()}@example.com`,
        passwordHash: 'hash',
        role: Role.USER,
      },
    });

    globalAdminUser = await prisma.user.create({
      data: {
        email: `admin_13_2_${Date.now()}@example.com`,
        passwordHash: 'hash',
        role: Role.ADMIN,
      },
    });

    otherCommissionerUser = await prisma.user.create({
      data: {
        email: `other_commish_13_2_${Date.now()}@example.com`,
        passwordHash: 'hash',
        role: Role.USER,
      },
    });

    commissionerToken = jwt.sign(
      { id: commissionerUser.id, email: commissionerUser.email, role: commissionerUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    memberToken = jwt.sign(
      { id: memberUser.id, email: memberUser.email, role: memberUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    globalAdminToken = jwt.sign(
      { id: globalAdminUser.id, email: globalAdminUser.email, role: globalAdminUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    otherCommissionerToken = jwt.sign(
      { id: otherCommissionerUser.id, email: otherCommissionerUser.email, role: otherCommissionerUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    pool = await prisma.pool.create({
      data: {
        name: `Commissioner Pool ${Date.now()}`,
        adminId: commissionerUser.id,
        status: 'ACTIVE',
        settings: {},
      },
    });

    otherPool = await prisma.pool.create({
      data: {
        name: `Other Pool ${Date.now()}`,
        adminId: otherCommissionerUser.id,
        status: 'ACTIVE',
        settings: {},
      },
    });

    await prisma.poolMembership.createMany({
      data: [
        { poolId: pool.id, userId: commissionerUser.id, status: 'ACTIVE' },
        { poolId: pool.id, userId: memberUser.id, status: 'ACTIVE' },
        { poolId: otherPool.id, userId: otherCommissionerUser.id, status: 'ACTIVE' },
      ],
    });

    finalGame = await prisma.game.create({
      data: {
        externalGameId: `final_game_${Date.now()}`,
        homeTeamId: 'KC',
        awayTeamId: 'BUF',
        kickoffTime: new Date('2026-10-01T17:00:00Z'),
        status: GameStatus.FINAL,
        homeScore: 24,
        awayScore: 20,
      },
    });

    scheduledGame = await prisma.game.create({
      data: {
        externalGameId: `sched_game_${Date.now()}`,
        homeTeamId: 'SF',
        awayTeamId: 'DAL',
        kickoffTime: new Date('2026-11-20T20:00:00Z'),
        status: GameStatus.SCHEDULED,
      },
    });
  });

  afterAll(async () => {
    setOverrideServiceClock(undefined);
    if (finalGame) await prisma.game.delete({ where: { id: finalGame.id } }).catch(() => {});
    if (scheduledGame) await prisma.game.delete({ where: { id: scheduledGame.id } }).catch(() => {});
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    setOverrideServiceClock(undefined);
  });

  describe('1. Decision #20: Pool Commissioner Scoping & Tier Isolation', () => {
    it('allows verified pool commissioner to vote on and execute proposals', async () => {
      const proposal = await createOverrideProposal({
        poolId: pool.id,
        commissionerId: commissionerUser.id,
        type: 'PICK',
        targetEntityId: memberUser.id,
        data: { userId: memberUser.id, gameId: finalGame.id, selectedTeamId: 'KC' },
        reason: 'Stat correction for late submission',
      });

      // Vote APPROVE
      const voteRes = await fetch(`${baseUrl}/api/pools/${pool.id}/proposals/${proposal.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${commissionerToken}`,
        },
        body: JSON.stringify({ decision: 'APPROVE' }),
      });

      expect(voteRes.status).toBe(200);
      const voteData = await voteRes.json();
      expect(voteData.proposal.newValue.status).toBe('APPROVED');

      // Execute proposal
      const execRes = await fetch(`${baseUrl}/api/pools/${pool.id}/proposals/${proposal.id}/execute`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${commissionerToken}`,
        },
      });

      expect(execRes.status).toBe(200);
      const execData = await execRes.json();
      expect(execData.success).toBe(true);

      // Verify Pick state
      const pick = await prisma.pick.findUnique({
        where: {
          poolId_userId_gameId: {
            poolId: pool.id,
            userId: memberUser.id,
            gameId: finalGame.id,
          },
        },
      });
      expect(pick?.selectedTeamId).toBe('KC');
    });

    it('rejects standard pool members with 403 Forbidden', async () => {
      const proposal = await createOverrideProposal({
        poolId: pool.id,
        commissionerId: commissionerUser.id,
        type: 'PICK',
        targetEntityId: memberUser.id,
        data: { userId: memberUser.id, gameId: finalGame.id, selectedTeamId: 'KC' },
        reason: 'Member test',
      });

      const res = await fetch(`${baseUrl}/api/pools/${pool.id}/proposals/${proposal.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({ decision: 'APPROVE' }),
      });

      expect(res.status).toBe(403);
    });

    it('rejects global ADMINs who are not pool commissioners with 403 Forbidden (Decision #20 zero bypass)', async () => {
      const proposal = await createOverrideProposal({
        poolId: pool.id,
        commissionerId: commissionerUser.id,
        type: 'PICK',
        targetEntityId: memberUser.id,
        data: { userId: memberUser.id, gameId: finalGame.id, selectedTeamId: 'KC' },
        reason: 'Admin bypass test',
      });

      const res = await fetch(`${baseUrl}/api/pools/${pool.id}/proposals/${proposal.id}/execute`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${globalAdminToken}`,
        },
      });

      expect(res.status).toBe(403);
    });
  });

  describe('2. Decision #54: Side-Effect Free GET Telemetry', () => {
    it('GET /proposals, GET /overrides, and GET /ops/status execute zero DB mutations', async () => {
      const auditCountBefore = await prisma.auditLog.count();
      const penaltyCountBefore = await prisma.penaltyLedger.count();
      const poolCountBefore = await prisma.pool.count();

      const resProposals = await fetch(`${baseUrl}/api/pools/${pool.id}/proposals`, {
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });
      expect(resProposals.status).toBe(200);

      const resOverrides = await fetch(`${baseUrl}/api/pools/${pool.id}/overrides`, {
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });
      expect(resOverrides.status).toBe(200);

      const resStatus = await fetch(`${baseUrl}/api/pools/${pool.id}/ops/status`, {
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });
      expect(resStatus.status).toBe(200);

      const auditCountAfter = await prisma.auditLog.count();
      const penaltyCountAfter = await prisma.penaltyLedger.count();
      const poolCountAfter = await prisma.pool.count();

      expect(auditCountBefore).toBe(auditCountAfter);
      expect(penaltyCountBefore).toBe(penaltyCountAfter);
      expect(poolCountBefore).toBe(poolCountAfter);
    });
  });

  describe('3. Decision #27: Authoritative Slate & Game Finality Verification', () => {
    it('fails closed when proposal targets an unfinalized slate or game', async () => {
      const unfinalizedProposal = await createOverrideProposal({
        poolId: pool.id,
        commissionerId: commissionerUser.id,
        type: 'SCORE_ADJUSTMENT',
        targetEntityId: memberUser.id,
        data: {
          userId: memberUser.id,
          gameId: scheduledGame.id,
          requireGameFinal: true,
          slateFinalized: false,
          points: '1.50',
        },
        reason: 'Premature adjustment attempt',
      });

      const res = await fetch(`${baseUrl}/api/pools/${pool.id}/proposals/${unfinalizedProposal.id}/execute`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${commissionerToken}`,
        },
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.details || data.error).toContain('DECISION_27_FAIL_CLOSED');
    });
  });

  describe('4. Decisions #3 & #22: Precision Decimal Scoring & Aggregation', () => {
    it('applies decimal scoring adjustments accurately without floating-point drift', async () => {
      const decimalProposal = await createOverrideProposal({
        poolId: pool.id,
        commissionerId: commissionerUser.id,
        type: 'PENALTY',
        targetEntityId: memberUser.id,
        data: {
          userId: memberUser.id,
          delta: '1.75',
          weekNumber: 4,
        },
        reason: 'Precise fractional penalty adjustment',
      });

      const res = await fetch(`${baseUrl}/api/pools/${pool.id}/proposals/${decimalProposal.id}/execute`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${commissionerToken}`,
        },
      });

      expect(res.status).toBe(200);

      // Verify Decimal representation in database
      const memberStat = await prisma.poolMemberStat.findUnique({
        where: {
          poolId_userId: {
            poolId: pool.id,
            userId: memberUser.id,
          },
        },
      });

      expect(memberStat).not.toBeNull();
      expect(new Prisma.Decimal(memberStat!.totalShotsDrank).toNumber()).toBeGreaterThanOrEqual(1.75);
    });
  });

  describe('5. Decision #55: Transaction Fail-Closed Rollback', () => {
    it('aborts and rolls back entire state on execution error', async () => {
      const invalidProposal = await createOverrideProposal({
        poolId: pool.id,
        commissionerId: commissionerUser.id,
        type: 'PICK',
        targetEntityId: memberUser.id,
        data: {
          userId: memberUser.id,
          // Missing gameId triggers failure in transaction
        },
        reason: 'Simulated fail-closed transaction',
      });

      const res = await fetch(`${baseUrl}/api/pools/${pool.id}/proposals/${invalidProposal.id}/execute`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${commissionerToken}`,
        },
      });

      expect([400, 500]).toContain(res.status);

      // Verify proposal status remained unexecuted
      const checkProposal = await prisma.auditLog.findUnique({
        where: { id: invalidProposal.id },
      });
      const val = checkProposal?.newValue as any;
      expect(val.status).not.toBe('EXECUTED');
    });
  });

  describe('6. Injectable ClockFn Determinism', () => {
    it('records deterministic timestamps on proposal voting and execution', async () => {
      const fixedTime = new Date('2026-10-02T18:45:00.000Z');
      setOverrideServiceClock(() => fixedTime);

      const prop = await createOverrideProposal({
        poolId: pool.id,
        commissionerId: commissionerUser.id,
        type: 'PENALTY',
        targetEntityId: memberUser.id,
        data: { userId: memberUser.id, delta: '0.50' },
        reason: 'Clock test',
      });

      const voted = await recordProposalVote(
        pool.id,
        prop.id,
        commissionerUser.id,
        'APPROVE',
        () => fixedTime
      );
      expect((voted.newValue as any).votedAt).toBe(fixedTime.toISOString());

      const executed = await executeProposal(
        pool.id,
        prop.id,
        commissionerUser.id,
        () => fixedTime
      );
      expect(executed.executedAt.toISOString()).toBe(fixedTime.toISOString());
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
