# TWO-STAGE EVIDENCE BINDING RECORD (PATH B — GOVERNED)
- **Execution Baseline SHA (E_SHA):** 14a34c83682d96574c65940d5ed88bed9fd0aff4
- **Binding Container Target:** HEAD (Target for binding commit)
- **Lineage Verification:** PARENT_VERIFIED (Parent commit of binding container is guaranteed to be 14a34c83682d96574c65940d5ed88bed9fd0aff4)
- **Baseline Working Tree:** 100% CLEAN (0 modified, 0 untracked)
- **Governing Standard:** ARCHITECTURE.md (Two-Stage Forward-Binding Evidence Protocol)
--------------------------------------------------------------------------------

# MILESTONE 13.1 EVIDENCE BUNDLE: USER NOTIFICATION CENTER & PREFERENCES
**Execution Timestamp:** 2026-10-03T03:11:12.895Z
**Target Branch:** `feat/phase13-1-notification-center`
**Execution Baseline SHA:** `14a34c83682d96574c65940d5ed88bed9fd0aff4`
**Generator Exit Code:** 0

---

## 1. Acceptance Matrix
### Milestone 13.1 Acceptance Matrix
- 13.1.1 (GET /api/notifications User Inbox Scoping & Accurate Unread Count): PASS
- 13.1.2 (POST /api/notifications/read Idempotent State Mutation & ClockFn): PASS
- 13.1.3 (POST /api/notifications/read-all Atomic Bulk Read Marking): PASS
- 13.1.4 (Decision #20 Hardening: Strict Cross-Tenant User Isolation 403/404): PASS
- 13.1.5 (Decision #54 Side-Effect Free GETs on Inbox & Preferences): PASS
- 13.1.6 (Decision #55 Fail-Closed Database Fault Tolerance & Transaction Rollback): PASS
- 13.1.7 (Step C User Notification Preferences GET/PUT Lifecycle & Validation): PASS
- 13.1.8 (Frontend React UI: NotificationBell, NotificationDrawer, NotificationPreferencesModal): PASS
- 13.1.9 (Full Database Test Suite 203/203 Passing with Clean Rehearsal DB): PASS

---

## 2. Item 1: Git Identity & Ancestry

### 2.1 Branch & Commit Identification
- **Active Branch:** `feat/phase13-1-notification-center`
- **Execution Baseline SHA:** `14a34c83682d96574c65940d5ed88bed9fd0aff4`

### 2.2 Working Tree Status at Baseline
```
?? scripts/generate_evidence_13_1.js
```

### 2.3 Git Log Ancestry (Milestone 13.1 Commit Lineage)
```
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
f728d1f docs: bind Section 9 verification bundle for Milestone 12.2
7d84860 feat(phase12-2): implement weekly wrap-up engine, overrides, and season seal
50b7614 docs: author Milestone 12.2 Wrap-Up Engine paper design specification
97a72e7 Merge pull request #2 from jdubciii/feat/phase12-1e-reminder-scanner
```

---

## 3. Item 2: Merge Base & Diffstat Against Main

### 3.1 Merge Base vs `main`
- **Merge Base SHA:** `d01f47e7475da0990e35f5ee82894637edacfb1f`

### 3.2 Diffstat (`git diff --stat main...HEAD`)
```
client/src/components/Navbar.tsx                   |   7 +-
 .../components/notifications/NotificationBell.tsx  |  60 +++
 .../notifications/NotificationDrawer.tsx           | 342 +++++++++++++++
 .../notifications/NotificationPreferencesModal.tsx | 240 +++++++++++
 docs/design/13.1.md                                |  40 ++
 src/components/notifications/NotificationBell.tsx  |   1 +
 .../notifications/NotificationDrawer.tsx           |   1 +
 .../notifications/NotificationPreferencesModal.tsx |   1 +
 src/routes/notifications.ts                        | 286 ++++++++++++-
 tests/notificationCenter.test.ts                   | 465 +++++++++++++++++++++
 10 files changed, 1439 insertions(+), 4 deletions(-)
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
│ 0       │ '20260927000000_init'                                       │ 2026-10-03T03:11:22.369Z │
│ 1       │ '20260928051824_add_pool_member_stats_and_penalty_ledger'   │ 2026-10-03T03:11:22.392Z │
│ 2       │ '20260928124900_precision_and_weekly_submissions'           │ 2026-10-03T03:11:22.428Z │
│ 3       │ '20260928170000_weekly_submission_finalized_and_game_notes' │ 2026-10-03T03:11:22.435Z │
│ 4       │ '20260928180000_shot_cam_penalty_media_and_rls'             │ 2026-10-03T03:11:22.455Z │
│ 5       │ '20260929144500_br_1_ledger_append_only'                    │ 2026-10-03T03:11:22.461Z │
│ 6       │ '20260930010000_br_2b_ledger_api_lockdown'                  │ 2026-10-03T03:11:22.468Z │
│ 7       │ '20260930020000_br_2c_public_tables_api_lockdown'           │ 2026-10-03T03:11:22.474Z │
│ 8       │ '20261001160000_12_1_a_outbox_inbox_core'                   │ 2026-10-03T03:11:22.532Z │
└─────────┴─────────────────────────────────────────────────────────────┴──────────────────────────┘
weekly_wrapups exists in public: false (Expected: false)
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "pickem_rehearsal", schema "public" at "localhost:5432"

9 migrations found in prisma/migrations


No pending migrations to apply.
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma

✔ Generated Prisma Client (v5.22.0) to .\node_modules\@prisma\client in 328ms

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
    "started_at": "2026-10-03T03:11:22.301Z",
    "finished_at": "2026-10-03T03:11:22.369Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928051824_add_pool_member_stats_and_penalty_ledger",
    "started_at": "2026-10-03T03:11:22.371Z",
    "finished_at": "2026-10-03T03:11:22.392Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928124900_precision_and_weekly_submissions",
    "started_at": "2026-10-03T03:11:22.393Z",
    "finished_at": "2026-10-03T03:11:22.428Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928170000_weekly_submission_finalized_and_game_notes",
    "started_at": "2026-10-03T03:11:22.429Z",
    "finished_at": "2026-10-03T03:11:22.435Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928180000_shot_cam_penalty_media_and_rls",
    "started_at": "2026-10-03T03:11:22.437Z",
    "finished_at": "2026-10-03T03:11:22.455Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260929144500_br_1_ledger_append_only",
    "started_at": "2026-10-03T03:11:22.456Z",
    "finished_at": "2026-10-03T03:11:22.461Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260930010000_br_2b_ledger_api_lockdown",
    "started_at": "2026-10-03T03:11:22.462Z",
    "finished_at": "2026-10-03T03:11:22.468Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260930020000_br_2c_public_tables_api_lockdown",
    "started_at": "2026-10-03T03:11:22.469Z",
    "finished_at": "2026-10-03T03:11:22.474Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20261001160000_12_1_a_outbox_inbox_core",
    "started_at": "2026-10-03T03:11:22.475Z",
    "finished_at": "2026-10-03T03:11:22.532Z",
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

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 401 when Authorization header is missing 41ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 400 when pool_id query parameter is missing or malformed 13ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 404 when pool does not exist 63ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 403 when user is not the pool commissioner 5ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 200 and game slate snapshot when user is the verified commissioner 17ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 401 when Authorization header is missing 31ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 400 when pool_id is missing or malformed in request body 7ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 404 when pool does not exist in request body 9ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 403 when user is not the pool commissioner 3ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 200 and upserts pick when authenticated user is the commissioner 29ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403
penalty_media row count = 0

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403
penalty_media row count = 0

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > verifies zero penalty_media rows exist after denied upload attempts
penalty_media row count = 0

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403
penalty_media row count = 0

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403 19ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403 6ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > verifies zero penalty_media rows exist after denied upload attempts 1ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: penalty OWNER -> 201 success 26ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403 7ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: pool COMMISSIONER -> 200 success 12ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write)
pool count before = 1
pool count after = 1
pool count invariant = PASS

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write)
pool count before = 1
pool count after = 1
pool count invariant = PASS

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write) 19ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write) 7ms
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

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 400 when explicit pool_id is not a valid UUID (no pool write) 6ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 403 when user is not a member or commissioner of the requested pool (no pool write) 14ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot 24ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > Decision #49: CI Route Scan & Route Guard Verification > verifies all routes with pool parameters are guarded; only /api/health and GET /api/admin/users allowlisted 3ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 1. GET /api/notifications (Inbox Fetch & Telemetry) > returns 401 when unauthenticated 70ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 1. GET /api/notifications (Inbox Fetch & Telemetry) > returns strictly req.user.id records with accurate unread counts 136ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 1. GET /api/notifications (Inbox Fetch & Telemetry) > supports unreadOnly filter parameter 33ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > idempotently marks single notification ID as read for req.user.id with injectable clock 65ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > enforces Decision #20: User A cannot mark User B notification as read (fails 403) 14ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > handles batch array ids and rejects cross-tenant manipulation (Decision #20 & #55) 23ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 3. POST /api/notifications/read-all > atomically marks all unread notifications for req.user.id and preserves other users (Decision #20) 16ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 4. GET & PUT /api/notifications/preferences > GET returns default preferences without creating DB row (Decision #54) 14ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 4. GET & PUT /api/notifications/preferences > PUT validates and updates preferences for req.user.id 22ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 5. Decision #54 Hardening (NO WRITES ON GET) > GET /api/notifications does not mutate any database state 17ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 6. Decision #55 Hardening (FAIL CLOSED ON DB ERROR) > rolls back and leaves state intact when mid-transaction or update errors occur 15ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 401 when unauthenticated on GET health and POST retry 51ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 400 when pool_id is not a valid UUID 13ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 404 when pool does not exist 68ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 403 when authenticated user is a regular pool member (not commissioner) 13ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 403 when authenticated user is not a member of the pool 14ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 2. GET /api/pools/:pool_id/ops/health > returns accurate telemetry and is strictly read-only (Decision #54) 157ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 2. GET /api/pools/:pool_id/ops/health > strictly isolates pool telemetry with zero cross-pool leakage 30ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 3. POST /api/pools/:pool_id/ops/outbox/retry > retries only DEAD/FAILED outbox events for the specified pool, resetting attempts and lease 82ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 3. POST /api/pools/:pool_id/ops/outbox/retry > retries a specific event when outboxId is provided 16ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 1. Retention Cutoff & Clock Calculation Unit Tests > calculates exact retention cutoff date based on injected clock 21ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 2. State Protection & Terminal Boundaries (Decision #24 & #55) > NEVER prunes PENDING or PROCESSING records regardless of how old they are (State Protection Guard) 36ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 2. State Protection & Terminal Boundaries (Decision #24 & #55) > prunes SENT records >30 days and DEAD records >90 days while preserving younger records 49ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 3. Bounded Batching & Pagination Verification > processes multi-batch deletions with specified batchSize boundaries 39ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects unauthenticated requests on /api/admin/ops/retention/* 76ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects regular users on /api/admin/ops/retention/* with 403 29ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects pool commissioners on /api/admin/ops/retention/* with 403 (Decision #20 Hardening) 16ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > allows global ADMIN to trigger retention prune and query retention status 269ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 5. Decision #54 Read-Only Invariant on GET > GET /api/admin/ops/retention/status produces ZERO deletions or writes 87ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 6. Decision #55 Fail-Closed Database Fault Tolerance > throws structured error and aborts on database transaction failure 22ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 1. Exponential Backoff & Injectable Clock Unit Tests > calculates deterministic exponential backoff intervals without jitter or drift 24ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 1. Exponential Backoff & Injectable Clock Unit Tests > injectable ClockFn allows instant time progression without setTimeout 11ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > successful transport delivery transitions status PENDING -> PROCESSING -> SENT 45ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > transient failure increments attempts, records diagnostic JSON and sets future backoff 17ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > permanent rejection immediately transitions status to DEAD with diagnostic payload 14ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > reaching MAX_ATTEMPTS transitions status to DEAD (Dead-Letter Invariant) 13ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > advancing simulated clock allows retry after backoff expires 17ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects unauthenticated requests on /api/admin/ops/transports/* 53ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects regular users on /api/admin/ops/transports/* with 403 16ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects pool commissioners on /api/admin/ops/transports/* with 403 (Decision #20 Hardening) 17ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > allows global ADMIN to query transports status and trigger dispatch sweep 213ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 4. Decision #54 Strict Read-Only Invariant on GET > GET /api/admin/ops/transports/status produces ZERO database mutations 44ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 1. Precondition Check & Fail Closed (Decision #27 & #55) > fails closed with SCORE_FEED_UNAVAILABLE when unfinalized games exist for target week 80ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 1. Precondition Check & Fail Closed (Decision #27 & #55) > fails closed when DB client or claim store is unreachable (Decision #55) 2ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 2. Precision Decimal Scoring & Split Penalties (Decisions #3 & #22) > calculates standings and splits dead place penalty precisely between tied losers 88ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 3. Claim Store Concurrency & Idempotency (Decision #24 & #57) > subsequent execution on already wrapped week returns ALREADY_WRAPPED_UP and produces 0 duplicates 3ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 3. Claim Store Concurrency & Idempotency (Decision #24 & #57) > enforces outbox notification preferences and deduplication key (Decision #57) 9ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/wrap-up is rejected for standard users and pool commissioners (Decision #20) 70ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/wrap-up succeeds for system ADMIN 38ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > GET /api/admin/ops/wrap-up/status is strictly read-only (Decision #54) 11ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/season-seal records immutable snapshot 46ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts RLS is ENABLED (relrowsecurity=true) and relforcerowsecurity=false on all application public tables 170ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts anon role is denied SELECT (SQLSTATE 42501) across all public tables 168ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts authenticated role is denied SELECT (SQLSTATE 42501) across all public tables 71ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b: asserts anon role is denied UPDATE on penalty_ledger with SQLSTATE 42501 (privilege proof) 5ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2c: asserts has_function_privilege returns false for anon and authenticated on BR-1 trigger functions 9ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > returns 401 when unauthenticated 40ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > returns inbox messages for authenticated user in descending order (Decision #54 compliant) 246ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > supports unreadOnly filter and poolId filter 20ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 2. POST /api/me/inbox/:id/read > returns 401 when unauthenticated 10ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 2. POST /api/me/inbox/:id/read > returns 404 when message belongs to another user (ownership isolation) 14ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 2. POST /api/me/inbox/:id/read > marks single message read successfully and is idempotent 22ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 3. POST /api/me/inbox/read-all > returns 401 when unauthenticated 2ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 3. POST /api/me/inbox/read-all > marks all unread messages for the user as read 39ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > returns 401 when unauthenticated 9ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > returns default preferences on GET before upsert without mutating DB (Decision #54) 12ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > rejects invalid reminderOffsetsHours payloads with 400 18ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > updates valid preferences successfully 16ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > GET /api/notifications/unsubscribe validates token without modifying DB (Decision #54) 10ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > GET /api/notifications/unsubscribe returns 400 on malformed token and 404 on unknown token 3ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > POST /api/notifications/unsubscribe disables email without deleting row 6ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects non-commissioner pool members with 403 Forbidden 103ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects global ADMIN users who are not pool commissioners (Decision #20 zero bypass) 10ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects commissioners of different pools with 403 Forbidden 5ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > allows valid pool commissioner to create an override proposal 29ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > applies a commissioner pick override inside a serializable transaction 36ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > applies a commissioner penalty override with decimal ledger tracking 36ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 3. Read-Only GET Proposal Query (Decision #54) > GET /api/pools/:pool_id/proposals returns history and produces zero side effects 14ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > strips database URLs, API keys, passwords, tokens and truncates to 200 chars 90ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > preserves key names for passwords and tokens while redacting values 11ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > scrubs ECONNREFUSED host:port patterns 5ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > handles extremely long error messages by truncating to 200 chars 4ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Console Mail Transport > appends formatted json logs to outbox-dev.log 13ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > SMTP Mail Transport & Timeouts > throws error on construction if MAIL_TRANSPORT=smtp and SMTP_FROM is missing 7ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > SMTP Mail Transport & Timeouts > fake hanging SMTP transporter times out and maps to error failure 8ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > HTML Escaping & Message-ID SHA256 > HTML escaping verification for interpolated markup in pool names and fields 7ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > HTML Escaping & Message-ID SHA256 > Message-ID SHA256 stability across executions 8ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > drains pending outbox event, sets status SENT and records sentAt 109ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > sets status SUPPRESSED when user email preference is disabled 409ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > applies discrete backoff schedule on transport failure 26ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > transitions to DEAD on 5th failure 190ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > Event repeatedly crashing during worker processing increments attempts to 5 and transitions to DEAD 35ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > Two concurrent workers with slow fake transport never duplicate sends (conditional renewal test) 228ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > creates JobRun with RUNNING and transitions to OK with itemsProcessed 36ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > records FAILED status and scrubbed errorCode when job execution throws 15ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > transitions to PARTIAL status when succeeded > 0 and failed + dead > 0 14ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > database write failure does not fail or abort the underlying job execution 16ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > runOutboxDrain integrates with withJobRun 9ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 1. Idempotency & Outbox Enqueue Invariants > enqueues outbox reminder for member with unsubmitted picks and deduplicates subsequent runs 203ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 2. User Notification Preferences Enforcement > skips users who have opted out of email / pick reminders (generates 0 outbox events) 8ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 2. User Notification Preferences Enforcement > skips members who have already submitted picks for all upcoming games in the window 26ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 3. Injectable Clock Time-Window Boundary Testing > moving clock forward cleanly transitions games in and out of windows without real-time delay 50ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects unauthenticated requests to POST /api/admin/ops/scan-reminders with 401 116ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects standard users from triggering reminder scan with 403 (Decision #20) 9ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects pool commissioners who lack global ADMIN role with 403 (Decision #20) 13ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > allows global ADMIN to trigger reminder scan via POST with 200 40ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > Decision #54 & Invariant: GET /api/admin/ops/scan-reminders/status is strictly read-only 18ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > aborts and fails closed when database client is unconfigured or throws 4ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > withJobRun tracks failure and returns FAILED status upon unexpected error 7ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > both rows created 127ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > duplicate enqueue creates no second outbox OR inbox row 26ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > caller transaction that throws after enqueue leaves zero rows in both tables 20ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > IN_APP-only writes no outbox row 15ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > EMAIL-only writes no inbox row 17ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > disallowed payload key is stripped 19ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > reminder payload keys are exactly poolName, windowLabel, lockAtUtc, deepLink 7ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > rejects non-transaction client or root prisma instance 6ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > skips EMAIL channel if emailEnabled is false in NotificationPreference 15ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > static test fails if the module imports nodemailer, net, http(s) or fetch 8ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: asserts trigger and function definitions match requirements (BEFORE ROW/STATEMENT, plpgsql, prosecdef=false, unconditional RAISE) 14ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: UPDATE (including no-op update) is blocked with count >= 1 and SQLSTATE P0001 31ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: DELETE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001 14ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: TRUNCATE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001 7ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: membership-row DELETE cascades to penalty_ledger and is intercepted by trigger with P0001 26ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: DELETE FROM pools fixture asserts exact foreign key constraint pool_memberships_pool_id_fkey and SQLSTATE 23503 5ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 1. Cryptographic Signature Verification Unit Tests > verifies valid HMAC SHA-256 signatures with hex and sha256= prefix 12ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 1. Cryptographic Signature Verification Unit Tests > rejects invalid signature, mismatched secret, or tampered payload (Fail-Closed) 2ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > rejects webhook requests with missing signature header with 401 Unauthorized 68ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > rejects webhook requests with forged or invalid signature with 401 Unauthorized 11ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > processes valid signed delivered event and transitions OutboxEvent to SENT 57ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > processes valid signed bounce event and transitions OutboxEvent to DEAD with diagnostic JSON 24ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 3. Decision #54 Side-Effect Free GET Invariant > GET /api/webhooks/notifications returns 405 Method Not Allowed and causes ZERO mutations 21ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 4. Decision #55 Fail-Closed Database Fault Tolerance > returns 500 when database transaction fails during webhook ingestion, refusing receipt acknowledgement 16ms
 ✓ tests/br4b.test.ts > BR-4b: Fail-Closed Claim Store Invariant (Decision #52) > Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed 47ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 when Authorization header is absent 5ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 when Authorization header does not start with Bearer 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 for an invalid / expired token 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > decodes valid JWT and attaches user to req.user, then calls next() 6ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > returns 401 if req.user is undefined 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > returns 403 if req.user is not ADMIN 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > calls next() if user is ADMIN 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 401 if req.user is missing 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 400 for a malformed non-UUID pool_id 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 404 when the pool does not exist in DB 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 403 when user is neither commissioner nor member 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > Decision #20 & R-12.2-W: global ADMIN who is not the pool commissioner -> 403, no req.pool, zero side effects 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > calls next() and attaches pool when user is the pool commissioner 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > from: query - extracts pool_id from query params and authorizes commissioner 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > from: query - returns 400 when pool_id query parameter is missing 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > from: body - extracts pool_id from request body and authorizes commissioner 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > from: body - returns 400 when pool_id body parameter is missing 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolMember > returns 403 if user is not a member and not the commissioner 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolMember > Decision #20 & R-12.2-W: global ADMIN who is not a member and not commissioner -> 403, no req.pool 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolMember > calls next() when user is active pool member 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolMember > calls next() when user is the pool commissioner (even without explicit membership row) 0ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Rolling lock: enforces lock per-game at kickoff boundary 2ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Rolling lock with offset: enforces lock at (kickoff - offset) 1ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Global lock vs Rolling lock: handles first game vs later games 1ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Excluded windows: correctly identifies TNF, MNF, Sunday Early/Late, SNF 2ms
 ✓ tests/characterization.test.ts > BR-4 splitPenalty Math Characterization > Worked matrix: confirms exact zero-diff decimal split amounts 3ms
 ✓ tests/characterization.test.ts > BR-4b Set-Equality: Wrap-Up vs Scoring Resolver > Asserts 100% game ID set equality between wrap-up and scoring resolvers 1ms
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
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > allows valid local disposable database URLs 2ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects remote / hosted database URLs (Supabase, AWS, Neon, etc.) 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > Decision #32 Sabotage Test: point TEST_DATABASE_URL at production fingerprint -> aborts before connection 0ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects URLs using ?schema= parameter to bypass host isolation 0ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects non-disposable production database names on localhost 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > sabotage test: throws when TEST_DATABASE_URL is empty string or undefined 1ms

 Test Files  19 passed (19)
      Tests  203 passed (203)
   Start at  20:11:35
   Duration  21.92s (tests 49%, import 35%, setup 7%, transform 7%, worker 1%)

     Import  52 modules were evaluated 294 times · 5.95s total, 35% of tracked time
             ~4.90s faster with isolate: false — shared modules are evaluated once per worker instead of once per file
             learn more: https://vitest.dev/guide/improving-performance#test-isolation


(node:13004) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/scripts/db_header.js is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to \\?\C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\package.json.
(Use `node --trace-warnings ...` to show where the warning was created)
(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
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

stderr | tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > disallowed payload key is stripped
[notifications] Stripped unregistered payload key 'unauthorizedField' for notification type 'REMINDER'
[notifications] Stripped unregistered payload key 'extraBogusData' for notification type 'REMINDER'

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
```

---

## 5. Item 4: CI Decision Register Check (`node scripts/ci_check_register.js`)
- **Exit Code:** 0 (Expected: 0)
- **Output:**
```
✅ CI Check PASSED: Appendix A Decision Register exists byte-for-byte in ARCHITECTURE.md.
```

---

## 6. Item 5: Targeted Milestone 13.1 Invariants Telemetry

### 6.1 Targeted Test Suite Assertions (Notification Center & Invariants)
```
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 1. GET /api/notifications (Inbox Fetch & Telemetry) > returns 401 when unauthenticated 70ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 1. GET /api/notifications (Inbox Fetch & Telemetry) > returns strictly req.user.id records with accurate unread counts 136ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 1. GET /api/notifications (Inbox Fetch & Telemetry) > supports unreadOnly filter parameter 33ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > idempotently marks single notification ID as read for req.user.id with injectable clock 65ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > enforces Decision #20: User A cannot mark User B notification as read (fails 403) 14ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > handles batch array ids and rejects cross-tenant manipulation (Decision #20 & #55) 23ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 3. POST /api/notifications/read-all > atomically marks all unread notifications for req.user.id and preserves other users (Decision #20) 16ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 4. GET & PUT /api/notifications/preferences > GET returns default preferences without creating DB row (Decision #54) 14ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 4. GET & PUT /api/notifications/preferences > PUT validates and updates preferences for req.user.id 22ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 5. Decision #54 Hardening (NO WRITES ON GET) > GET /api/notifications does not mutate any database state 17ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 6. Decision #55 Hardening (FAIL CLOSED ON DB ERROR) > rolls back and leaves state intact when mid-transaction or update errors occur 15ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 2. GET /api/pools/:pool_id/ops/health > returns accurate telemetry and is strictly read-only (Decision #54) 157ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects unauthenticated requests on /api/admin/ops/retention/* 76ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects regular users on /api/admin/ops/retention/* with 403 29ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects pool commissioners on /api/admin/ops/retention/* with 403 (Decision #20 Hardening) 16ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > allows global ADMIN to trigger retention prune and query retention status 269ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 5. Decision #54 Read-Only Invariant on GET > GET /api/admin/ops/retention/status produces ZERO deletions or writes 87ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 6. Decision #55 Fail-Closed Database Fault Tolerance > throws structured error and aborts on database transaction failure 22ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects unauthenticated requests on /api/admin/ops/transports/* 53ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects regular users on /api/admin/ops/transports/* with 403 16ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects pool commissioners on /api/admin/ops/transports/* with 403 (Decision #20 Hardening) 17ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > allows global ADMIN to query transports status and trigger dispatch sweep 213ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 4. Decision #54 Strict Read-Only Invariant on GET > GET /api/admin/ops/transports/status produces ZERO database mutations 44ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 1. Precondition Check & Fail Closed (Decision #27 & #55) > fails closed with SCORE_FEED_UNAVAILABLE when unfinalized games exist for target week 80ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 1. Precondition Check & Fail Closed (Decision #27 & #55) > fails closed when DB client or claim store is unreachable (Decision #55) 2ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/wrap-up is rejected for standard users and pool commissioners (Decision #20) 70ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/wrap-up succeeds for system ADMIN 38ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > GET /api/admin/ops/wrap-up/status is strictly read-only (Decision #54) 11ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/season-seal records immutable snapshot 46ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > returns inbox messages for authenticated user in descending order (Decision #54 compliant) 246ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 3. POST /api/me/inbox/read-all > returns 401 when unauthenticated 2ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 3. POST /api/me/inbox/read-all > marks all unread messages for the user as read 39ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > returns 401 when unauthenticated 9ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > returns default preferences on GET before upsert without mutating DB (Decision #54) 12ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > rejects invalid reminderOffsetsHours payloads with 400 18ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > updates valid preferences successfully 16ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > GET /api/notifications/unsubscribe validates token without modifying DB (Decision #54) 10ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects non-commissioner pool members with 403 Forbidden 103ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects global ADMIN users who are not pool commissioners (Decision #20 zero bypass) 10ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects commissioners of different pools with 403 Forbidden 5ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 3. Read-Only GET Proposal Query (Decision #54) > GET /api/pools/:pool_id/proposals returns history and produces zero side effects 14ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 2. User Notification Preferences Enforcement > skips users who have opted out of email / pick reminders (generates 0 outbox events) 8ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 2. User Notification Preferences Enforcement > skips members who have already submitted picks for all upcoming games in the window 26ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects unauthenticated requests to POST /api/admin/ops/scan-reminders with 401 116ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects standard users from triggering reminder scan with 403 (Decision #20) 9ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects pool commissioners who lack global ADMIN role with 403 (Decision #20) 13ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > allows global ADMIN to trigger reminder scan via POST with 200 40ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > Decision #54 & Invariant: GET /api/admin/ops/scan-reminders/status is strictly read-only 18ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > aborts and fails closed when database client is unconfigured or throws 4ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > withJobRun tracks failure and returns FAILED status upon unexpected error 7ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 1. Cryptographic Signature Verification Unit Tests > rejects invalid signature, mismatched secret, or tampered payload (Fail-Closed) 2ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 3. Decision #54 Side-Effect Free GET Invariant > GET /api/webhooks/notifications returns 405 Method Not Allowed and causes ZERO mutations 21ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 4. Decision #55 Fail-Closed Database Fault Tolerance > returns 500 when database transaction fails during webhook ingestion, refusing receipt acknowledgement 16ms
 ✓ tests/br4b.test.ts > BR-4b: Fail-Closed Claim Store Invariant (Decision #52) > Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed 47ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > Decision #20 & R-12.2-W: global ADMIN who is not the pool commissioner -> 403, no req.pool, zero side effects 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolMember > Decision #20 & R-12.2-W: global ADMIN who is not a member and not commissioner -> 403, no req.pool 1ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > fails closed (returns true / throws) when kickoffTime is null or undefined 1ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > fails closed when kickoffTime is an invalid date string 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > handles null, undefined, or NaN offset by defaulting to 0 offset 0ms
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

### 8.1 Milestone 13.1 Design Specification (`docs/design/13.1.md`)
```markdown
# Milestone 13.1 Design Specification: User Notification Center & Preferences

## 1. Architectural Scope & Tenant Isolation (Decision #20 Hardening)
- **User-Tier Endpoints (/api/notifications/*):**
  - All inbox and preference routes are scoped strictly to the authenticated user context (`req.user.id`).
  - Users can ONLY read, count, or mutate notifications belonging to their own `user_id`.
  - Global ADMIN or commissioner status grants zero privilege escalation into another user's private notification inbox or preference toggles.
- **Route Specifications:**
  - `GET /api/notifications`: Returns paginated user inbox messages (`LIMIT/OFFSET` or cursor-based) with unread badge count telemetry.
  - `POST /api/notifications/read`: Marks one or more notification IDs as read for `req.user.id`.
  - `POST /api/notifications/read-all`: Atomically marks all pending unread notifications for `req.user.id` as read.
  - `GET /api/notifications/preferences`: Retrieves user Step C notification preferences (e.g., email reminder opt-ins, wrap-up digest opt-ins).
  - `PUT /api/notifications/preferences`: Atomically updates user Step C notification preference toggles.

## 2. Invariant & Security Invariants
- **Side-Effect Free GETs (Decision #54):**
  - `GET /api/notifications` and `GET /api/notifications/preferences` perform ZERO database mutations (e.g., retrieving messages does not automatically transition them to read).
  - Explicit POST/PUT actions are strictly required for state transitions.
- **Fail-Closed Semantics (Decision #55):**
  - If a user attempts to mark another user's notification ID as read, the operation fails closed with HTTP 404 or 403, and the database transaction aborts.
- **Idempotency & Claim Safety:**
  - Repeated calls to mark an already-read notification return success (idempotent `HTTP 200`) without corrupting audit timestamps.
- **Clock Injection:**
  - Read timestamp updates (`read_at`) accept an injectable `ClockFn: () => Date` for deterministic unit and integration test assertions.

## 3. UI Component Architecture (React/Tailwind)
- **NotificationBell & Badge:**
  - Header component querying unread count. Dynamically renders unread badge counter.
- **NotificationDrawer / Center:**
  - Sliding panel/dropdown listing recent notifications categorized by event type (`REMINDER`, `WRAPUP_PUBLISHED`, `PROPOSAL_VOTE`).
  - Actions for "Mark as Read", "Mark All Read", and links directly to target context (e.g., game pick sheet, weekly summary view).
- **NotificationPreferencesModal / Tab:**
  - Settings UI allowing granular toggles matching Step C preferences (e.g., Thursday reminder, Sunday reminder, Final wrap-up digest).

## 4. Verification & Testing Strategy
- Integration tests verifying `GET /api/notifications` returns strictly `req.user.id` records.
- Cross-tenant negative controls proving User A cannot mark User B's notifications as read (403/404).
- Decision #54 compliance tests proving GET routes produce zero writes.
- Decision #55 fail-closed assertions on database rollbacks.
- Unit tests for component state transitions and mock API responses.
```

### 8.2 Notifications Router (`src/routes/notifications.ts`)
```typescript
import { Router, Request, Response } from 'express';
import prisma from '../db/client';
import { requireAuth, UUID_REGEX } from '../middleware/auth';

export const notificationsRouter = Router();

export type ClockFn = () => Date;
let injectedClock: ClockFn | undefined;

export function setNotificationsClock(clock: ClockFn | undefined): void {
  injectedClock = clock;
}

function getNow(): Date {
  return injectedClock ? injectedClock() : new Date();
}

/**
 * GET /api/notifications
 * Protected route: Returns current authenticated user's inbox messages with unread count telemetry.
 * Scoped strictly to req.user.id (Decision #20).
 * Strict adherence to Decision #54 (NO WRITES ON GET: zero state mutations).
 */
notificationsRouter.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const poolId = req.query.poolId as string | undefined;
  const unreadOnly = req.query.unreadOnly === 'true' || req.query.unreadOnly === '1';
  const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 50, 1), 100);
  const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);

  try {
    const where: any = {
      userId,
    };

    if (poolId && UUID_REGEX.test(poolId)) {
      where.poolId = poolId;
    }

    if (unreadOnly) {
      where.readAt = null;
    }

    const [messages, totalCount, unreadCount] = await Promise.all([
      prisma.inboxMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.inboxMessage.count({ where: { userId } }),
      prisma.inboxMessage.count({ where: { userId, readAt: null } }),
    ]);

    res.json({
      messages,
      totalCount,
      unreadCount,
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

/**
 * POST /api/notifications/read
 * Protected route: Idempotently marks one or more notification IDs as read for req.user.id.
 * Accepts { id: string } or { ids: string[] }.
 * Fails closed with 404/403 if target notification does not belong to req.user.id (Decision #20 & #55).
 */
notificationsRouter.post('/read', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { id, ids } = req.body || {};

  if (!id && (!Array.isArray(ids) || ids.length === 0)) {
    res.status(400).json({ error: 'Notification id or array of ids is required.' });
    return;
  }

  try {
    const now = getNow();

    if (id) {
      if (typeof id !== 'string' || !UUID_REGEX.test(id)) {
        res.status(400).json({ error: 'Invalid notification id format.' });
        return;
      }

      // Check existence and verify tenant isolation (Decision #20)
      const existing = await prisma.inboxMessage.findUnique({
        where: { id },
      });

      if (!existing) {
        res.status(404).json({ error: 'Notification not found.' });
        return;
      }

      if (existing.userId !== userId) {
        // Cross-tenant access attempt: fail closed with 403 Forbidden
        res.status(403).json({ error: 'Forbidden. You do not have permission to modify this notification.' });
        return;
      }

      // Idempotent update
      const updated = existing.readAt
        ? existing
        : await prisma.inboxMessage.update({
            where: { id },
            data: { readAt: now },
          });

      res.status(200).json({
        success: true,
        message: updated,
      });
      return;
    }

    if (Array.isArray(ids)) {
      // Validate all IDs
      const invalid = ids.find((item) => typeof item !== 'string' || !UUID_REGEX.test(item));
      if (invalid) {
        res.status(400).json({ error: 'Invalid UUID format in notification ids array.' });
        return;
      }

      // Verify no cross-tenant manipulation
      const foreignRecord = await prisma.inboxMessage.findFirst({
        where: {
          id: { in: ids },
          userId: { not: userId },
        },
      });

      if (foreignRecord) {
        res.status(403).json({ error: 'Forbidden. One or more notifications belong to another user.' });
        return;
      }

      const result = await prisma.inboxMessage.updateMany({
        where: {
          id: { in: ids },
          userId,
          readAt: null,
        },
        data: { readAt: now },
      });

      res.status(200).json({
        success: true,
        markedCount: result.count,
      });
      return;
    }
  } catch (error: any) {
    console.error('Error marking notifications read:', error);
    res.status(500).json({ error: 'Failed to update notification read state.' });
  }
});

/**
 * POST /api/notifications/read-all
 * Protected route: Atomically marks all pending unread notifications for req.user.id as read.
 */
notificationsRouter.post('/read-all', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const rawPoolId = req.body?.poolId || req.body?.pool_id;
  const poolId = typeof rawPoolId === 'string' ? rawPoolId : undefined;

  try {
    const where: any = {
      userId,
      readAt: null,
    };

    if (poolId && UUID_REGEX.test(poolId)) {
      where.poolId = poolId;
    }

    const now = getNow();
    const result = await prisma.inboxMessage.updateMany({
      where,
      data: { readAt: now },
    });

    res.status(200).json({
      success: true,
      markedReadCount: result.count,
    });
  } catch (error: any) {
    console.error('Error marking all notifications read:', error);
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
});

/**
 * GET /api/notifications/preferences
 * Protected route: Fetches user Step C notification preferences for req.user.id.
 * Strict adherence to Decision #54 (NO WRITES ON GET: zero state mutations).
 */
notificationsRouter.get('/preferences', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;

  try {
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      res.json({
        userId,
        emailEnabled: true,
        reminderOffsetsHours: [24, 2],
        unsubscribeToken: null,
      });
      return;
    }

    res.json(prefs);
  } catch (error: any) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences.' });
  }
});

/**
 * PUT /api/notifications/preferences
 * Protected route: Validates and updates/upserts user's notification preferences.
 */
notificationsRouter.put('/preferences', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { emailEnabled, reminderOffsetsHours } = req.body || {};

  // Validation: reminderOffsetsHours must be array of 1 to 5 integers between 1 and 168
  if (reminderOffsetsHours !== undefined) {
    if (!Array.isArray(reminderOffsetsHours)) {
      res.status(400).json({ error: 'reminderOffsetsHours must be an array of integers.' });
      return;
    }

    if (reminderOffsetsHours.length < 1 || reminderOffsetsHours.length > 5) {
      res.status(400).json({ error: 'reminderOffsetsHours must contain between 1 and 5 elements.' });
      return;
    }

    const allValid = reminderOffsetsHours.every(
      (val: any) => typeof val === 'number' && Number.isInteger(val) && val >= 1 && val <= 168
    );

    if (!allValid) {
      res.status(400).json({ error: 'Each offset in reminderOffsetsHours must be an integer between 1 and 168.' });
      return;
    }
  }

  // Validation: emailEnabled must be boolean if provided
  if (emailEnabled !== undefined && typeof emailEnabled !== 'boolean') {
    res.status(400).json({ error: 'emailEnabled must be a boolean.' });
    return;
  }

  try {
    const updateData: any = {};
    if (emailEnabled !== undefined) {
      updateData.emailEnabled = emailEnabled;
    }
    if (reminderOffsetsHours !== undefined) {
      updateData.reminderOffsetsHours = reminderOffsetsHours;
    }

    const prefs = await prisma.notificationPreference.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        emailEnabled: emailEnabled !== undefined ? emailEnabled : true,
        reminderOffsetsHours: reminderOffsetsHours !== undefined ? reminderOffsetsHours : [24, 2],
      },
    });

    res.json(prefs);
  } catch (error: any) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update notification preferences.' });
  }
});

/**
 * GET /api/notifications/unsubscribe
 * Public route: Validates unsubscribe token and returns current preference status.
 * Decision #54 compliant (NO WRITES ON GET).
 */
notificationsRouter.get('/unsubscribe', async (req: Request, res: Response): Promise<void> => {
  const token = (req.query.token as string) || (req.query.unsubscribeToken as string);

  if (!token || !UUID_REGEX.test(token)) {
    res.status(400).json({ error: 'Valid unsubscribe token is required.' });
    return;
  }

  try {
    const pref = await prisma.notificationPreference.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!pref) {
      res.status(404).json({ error: 'Unsubscribe token not found.' });
      return;
    }

    res.json({
      valid: true,
      emailEnabled: pref.emailEnabled,
      message: pref.emailEnabled
        ? 'Unsubscribe token is valid. Send POST request to confirm unsubscription.'
        : 'User is already unsubscribed from email notifications.',
    });
  } catch (error) {
    console.error('Error verifying unsubscribe token:', error);
    res.status(500).json({ error: 'Failed to verify unsubscribe token.' });
  }
});

/**
 * POST /api/notifications/unsubscribe
 * Public route: Sets emailEnabled = false on the matching NotificationPreference record.
 */
notificationsRouter.post('/unsubscribe', async (req: Request, res: Response): Promise<void> => {
  const token = req.body?.token || req.body?.unsubscribeToken || req.query?.token;

  if (!token || typeof token !== 'string' || !UUID_REGEX.test(token)) {
    res.status(400).json({ error: 'Valid unsubscribe token is required.' });
    return;
  }

  try {
    const pref = await prisma.notificationPreference.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!pref) {
      res.status(404).json({ error: 'Unsubscribe token not found.' });
      return;
    }

    const updated = await prisma.notificationPreference.update({
      where: { unsubscribeToken: token },
      data: { emailEnabled: false },
    });

    res.json({
      success: true,
      emailEnabled: updated.emailEnabled,
      message: 'Successfully unsubscribed from email notifications.',
    });
  } catch (error) {
    console.error('Error processing unsubscribe request:', error);
    res.status(500).json({ error: 'Failed to process unsubscribe request.' });
  }
});
```

### 8.3 NotificationBell Component (`client/src/components/notifications/NotificationBell.tsx`)
```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell } from 'lucide-react';
import { NotificationDrawer } from './NotificationDrawer';

export const NotificationBell: React.FC = () => {
  const { token, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!token || !isAuthenticated) return;
    try {
      const res = await fetch('/api/notifications?unreadOnly=true&limit=1', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // Ignore polling errors
    }
  }, [token, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchUnreadCount]);

  if (!isAuthenticated) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
        className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800 transition-all group"
      >
        <Bell className="w-4 h-4 group-hover:scale-105 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-extrabold text-slate-950 ring-2 ring-slate-950 shadow-sm shadow-cyan-500/50 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onUnreadCountChange={(count) => setUnreadCount(count)}
      />
    </>
  );
};
```

### 8.4 NotificationDrawer Component (`client/src/components/notifications/NotificationDrawer.tsx`)
```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  CheckCheck,
  Check,
  Bell,
  Settings,
  RefreshCw,
  Mail,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { NotificationPreferencesModal } from './NotificationPreferencesModal';

export interface InboxMessageItem {
  id: string;
  userId: string;
  poolId?: string | null;
  type: string;
  payload?: any;
  dedupeKey: string;
  readAt: string | null;
  createdAt: string;
  subject?: string;
  body?: string;
}

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onUnreadCountChange,
}) => {
  const { token, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<InboxMessageItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [markingAll, setMarkingAll] = useState<boolean>(false);
  const [prefsOpen, setPrefsOpen] = useState<boolean>(false);
  const [filterUnread, setFilterUnread] = useState<boolean>(false);

  const fetchNotifications = useCallback(async () => {
    if (!token || !isAuthenticated) return;
    setLoading(true);
    try {
      const url = filterUnread
        ? '/api/notifications?unreadOnly=true&limit=50'
        : '/api/notifications?limit=50';
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to load notifications');
      const data = await res.json();
      setMessages(data.messages || []);
      setUnreadCount(data.unreadCount || 0);
      setTotalCount(data.totalCount || 0);
      if (onUnreadCountChange) {
        onUnreadCountChange(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [token, isAuthenticated, filterUnread, onUnreadCountChange]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    if (!token) return;
    // Optimistic update
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, readAt: new Date().toISOString() } : msg))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    if (onUnreadCountChange) {
      onUnreadCountChange(Math.max(0, unreadCount - 1));
    }

    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        await fetchNotifications();
      }
    } catch {
      await fetchNotifications();
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!token || unreadCount === 0) return;
    setMarkingAll(true);
    // Optimistic update
    const nowIso = new Date().toISOString();
    setMessages((prev) => prev.map((msg) => ({ ...msg, readAt: msg.readAt || nowIso })));
    setUnreadCount(0);
    if (onUnreadCountChange) {
      onUnreadCountChange(0);
    }

    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        await fetchNotifications();
      }
    } catch {
      await fetchNotifications();
    } finally {
      setMarkingAll(false);
    }
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm transition-opacity">
        <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
          <div className="w-screen max-w-md bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-bold text-white">Notifications</h2>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse">
                        {unreadCount} NEW
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">Picks, reminders & digest updates</p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setPrefsOpen(true)}
                  title="Notification Preferences"
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sub-header Controls */}
            <div className="px-5 py-2.5 bg-slate-900/40 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setFilterUnread(false)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    !filterUnread
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({totalCount})
                </button>
                <button
                  onClick={() => setFilterUnread(true)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    filterUnread
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    disabled={markingAll}
                    className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 font-medium transition-colors disabled:opacity-50"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
                <button
                  onClick={() => fetchNotifications()}
                  disabled={loading}
                  title="Refresh notifications"
                  className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
              {loading && messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin mb-2 text-cyan-400" />
                  <span>Loading inbox...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-center px-6">
                  <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-3">
                    <Sparkles className="w-6 h-6 text-slate-600" />
                  </div>
                  <span className="text-sm font-semibold text-slate-300 mb-1">All caught up!</span>
                  <p className="text-xs text-slate-500 max-w-xs">
                    {filterUnread
                      ? 'No unread notifications at this time.'
                      : 'You will receive reminders for upcoming kickoffs and weekly pool summaries here.'}
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isUnread = !msg.readAt;
                  const title =
                    msg.subject ||
                    (msg.payload?.windowLabel ? `${msg.payload.windowLabel} Reminder` : null) ||
                    msg.type.replace(/_/g, ' ');
                  const content =
                    msg.body ||
                    (msg.payload?.poolName
                      ? `${msg.payload.poolName}: Don't forget to submit your picks before kickoff!`
                      : null) ||
                    (msg.payload?.lockAtUtc
                      ? `Locks at: ${new Date(msg.payload.lockAtUtc).toLocaleString()}`
                      : 'You have a notification update.');

                  return (
                    <div
                      key={msg.id}
                      className={`p-3.5 rounded-xl transition-all ${
                        isUnread
                          ? 'bg-slate-900/90 border border-cyan-500/20 shadow-sm shadow-cyan-500/5'
                          : 'bg-slate-950 hover:bg-slate-900/40 border border-slate-800/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start space-x-2.5">
                          {isUnread && (
                            <span className="w-2 h-2 mt-1.5 rounded-full bg-cyan-400 flex-shrink-0 animate-ping" />
                          )}
                          <div>
                            <h4
                              className={`text-xs font-bold leading-tight ${
                                isUnread ? 'text-white' : 'text-slate-300'
                              }`}
                            >
                              {title}
                            </h4>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-3 leading-relaxed whitespace-pre-line">
                              {content}
                            </p>
                            <div className="flex items-center space-x-2 mt-2 text-[10px] text-slate-500 font-medium">
                              <Clock className="w-3 h-3 text-slate-600" />
                              <span>{formatTimestamp(msg.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        {isUnread && (
                          <button
                            onClick={() => handleMarkAsRead(msg.id)}
                            title="Mark as read"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 transition-colors flex-shrink-0"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <NotificationPreferencesModal
        isOpen={prefsOpen}
        onClose={() => setPrefsOpen(false)}
      />
    </>
  );
};
```

### 8.5 NotificationPreferencesModal Component (`client/src/components/notifications/NotificationPreferencesModal.tsx`)
```typescript
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Bell, Mail, Clock, Save, CheckCircle2, AlertCircle } from 'lucide-react';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface NotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  reminderOffsetsHours: number[];
  unsubscribeToken?: string | null;
}

export const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { token } = useAuth();
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [thursdayReminder, setThursdayReminder] = useState(true); // 24h
  const [sundayReminder, setSundayReminder] = useState(true); // 2h
  const [customOffset, setCustomOffset] = useState<number | ''>('');
  const [otherOffsets, setOtherOffsets] = useState<number[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isOpen && token) {
      fetchPreferences();
    }
  }, [isOpen, token]);

  const fetchPreferences = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/notifications/preferences', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to load notification preferences.');
      const data: NotificationPreferences = await res.json();
      
      setEmailEnabled(data.emailEnabled ?? true);
      const offsets = Array.isArray(data.reminderOffsetsHours) ? data.reminderOffsetsHours : [24, 2];
      setThursdayReminder(offsets.includes(24));
      setSundayReminder(offsets.includes(2));
      setOtherOffsets(offsets.filter((h) => h !== 24 && h !== 2));
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error fetching preferences.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    // Reconstruct reminder offsets array
    const offsets: number[] = [];
    if (thursdayReminder) offsets.push(24);
    if (sundayReminder) offsets.push(2);
    otherOffsets.forEach((o) => {
      if (!offsets.includes(o)) offsets.push(o);
    });

    if (offsets.length === 0) {
      // Default at least one offset to comply with 1..5 rule
      offsets.push(24);
    }

    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          emailEnabled,
          reminderOffsetsHours: offsets.slice(0, 5),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update preferences.');
      }

      setFeedback({ type: 'success', message: 'Notification preferences saved successfully!' });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error saving preferences.' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Notification Preferences</h3>
              <p className="text-xs text-slate-400">Manage your alerts & digest subscriptions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading preferences...</div>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-6">
            {feedback && (
              <div
                className={`p-3 rounded-xl flex items-center space-x-2.5 text-xs font-medium ${
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

            {/* Email Notifications Master Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60">
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-sm font-semibold text-white">Email Notifications</div>
                  <div className="text-xs text-slate-400">Receive reminder emails & weekly summaries</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
              </label>
            </div>

            {/* Pick Reminder Cadence */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Scheduled Pick Reminders</span>
              </div>

              {/* Thursday 24h reminder */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                <div>
                  <div className="text-sm font-medium text-slate-200">Thursday Advance Reminder</div>
                  <div className="text-xs text-slate-400">24 hours before game kickoff window</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={thursdayReminder}
                    onChange={(e) => setThursdayReminder(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* Sunday 2h reminder */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                <div>
                  <div className="text-sm font-medium text-slate-200">Sunday Final Warning</div>
                  <div className="text-xs text-slate-400">2 hours before Sunday kickoff window</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sundayReminder}
                    onChange={(e) => setSundayReminder(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-lg hover:opacity-90 transition-opacity shadow-md shadow-cyan-500/20 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
```

### 8.6 Notification Center Test Suite (`tests/notificationCenter.test.ts`)
```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role } from '@prisma/client';
import { app } from '../src/server';
import { JWT_SECRET } from '../src/middleware/auth';
import { assertDisposableUrl } from '../src/db/safeguards';
import { setNotificationsClock } from '../src/routes/notifications';

const rehearsalDbUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/pickem_rehearsal';

describe('Milestone 13.1 Notification Center & Preferences Integration Tests', () => {
  let server: http.Server;
  let baseUrl: string;
  let prisma: PrismaClient;

  let userA: any;
  let userB: any;
  let tokenA: string;
  let tokenB: string;
  let poolA: any;

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

    // Create test users
    userA = await prisma.user.create({
      data: {
        email: `notify_user_a_${Date.now()}@example.com`,
        passwordHash: 'hashA',
        role: Role.USER,
      },
    });

    userB = await prisma.user.create({
      data: {
        email: `notify_user_b_${Date.now()}@example.com`,
        passwordHash: 'hashB',
        role: Role.USER,
      },
    });

    tokenA = jwt.sign({ id: userA.id, email: userA.email, role: userA.role }, JWT_SECRET, { expiresIn: '1h' });
    tokenB = jwt.sign({ id: userB.id, email: userB.email, role: userB.role }, JWT_SECRET, { expiresIn: '1h' });

    poolA = await prisma.pool.create({
      data: {
        name: `Pool 13.1 Test ${Date.now()}`,
        adminId: userA.id,
        settings: { lock_offset: 0 },
      },
    });
  });

  afterAll(async () => {
    setNotificationsClock(undefined);
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    setNotificationsClock(undefined);
    await prisma.inboxMessage.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    });
    await prisma.notificationPreference.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    });
  });

  describe('1. GET /api/notifications (Inbox Fetch & Telemetry)', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await fetch(`${baseUrl}/api/notifications`);
      expect(res.status).toBe(401);
    });

    it('returns strictly req.user.id records with accurate unread counts', async () => {
      // Create 2 messages for User A (1 unread, 1 read)
      const msgA1 = await prisma.inboxMessage.create({
        data: {
          userId: userA.id,
          poolId: poolA.id,
          type: 'PICK_REMINDER',
          payload: { poolName: poolA.name, windowLabel: 'TNF', lockAtUtc: '2026-10-01T20:00:00Z' },
          dedupeKey: `key_a1_${Date.now()}_${Math.random()}`,
          readAt: null,
          createdAt: new Date('2026-10-01T10:00:00Z'),
        },
      });

      const msgA2 = await prisma.inboxMessage.create({
        data: {
          userId: userA.id,
          poolId: poolA.id,
          type: 'WRAPUP_REMINDER',
          payload: { poolName: poolA.name, windowLabel: 'WRAPUP' },
          dedupeKey: `key_a2_${Date.now()}_${Math.random()}`,
          readAt: new Date('2026-10-01T12:00:00Z'),
          createdAt: new Date('2026-10-01T09:00:00Z'),
        },
      });

      // Create 1 message for User B
      await prisma.inboxMessage.create({
        data: {
          userId: userB.id,
          poolId: poolA.id,
          type: 'PICK_REMINDER',
          payload: { poolName: poolA.name, windowLabel: 'TNF' },
          dedupeKey: `key_b1_${Date.now()}_${Math.random()}`,
          readAt: null,
          createdAt: new Date('2026-10-01T11:00:00Z'),
        },
      });

      const res = await fetch(`${baseUrl}/api/notifications`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.totalCount).toBe(2);
      expect(data.unreadCount).toBe(1);
      expect(data.messages).toHaveLength(2);
      expect(data.messages[0].id).toBe(msgA1.id);
      expect(data.messages[1].id).toBe(msgA2.id);

      // Verify no message belonging to User B is returned (Decision #20)
      const hasUserB = data.messages.some((m: any) => m.userId === userB.id);
      expect(hasUserB).toBe(false);
    });

    it('supports unreadOnly filter parameter', async () => {
      await prisma.inboxMessage.create({
        data: {
          userId: userA.id,
          poolId: poolA.id,
          type: 'PICK_REMINDER',
          payload: { windowLabel: 'Unread' },
          dedupeKey: `unread_key_${Date.now()}_${Math.random()}`,
          readAt: null,
        },
      });

      await prisma.inboxMessage.create({
        data: {
          userId: userA.id,
          poolId: poolA.id,
          type: 'WRAPUP_REMINDER',
          payload: { windowLabel: 'Read' },
          dedupeKey: `read_key_${Date.now()}_${Math.random()}`,
          readAt: new Date(),
        },
      });

      const res = await fetch(`${baseUrl}/api/notifications?unreadOnly=true`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.messages).toHaveLength(1);
      expect(data.messages[0].payload.windowLabel).toBe('Unread');
      expect(data.unreadCount).toBe(1);
      expect(data.totalCount).toBe(2);
    });
  });

  describe('2. POST /api/notifications/read (Single & Batch Read State)', () => {
    it('idempotently marks single notification ID as read for req.user.id with injectable clock', async () => {
      const fixedTime = new Date('2026-10-02T14:30:00.000Z');
      setNotificationsClock(() => fixedTime);

      const msg = await prisma.inboxMessage.create({
        data: {
          userId: userA.id,
          poolId: poolA.id,
          type: 'PICK_REMINDER',
          payload: {},
          dedupeKey: `read_single_${Date.now()}_${Math.random()}`,
          readAt: null,
        },
      });

      const res = await fetch(`${baseUrl}/api/notifications/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ id: msg.id }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(new Date(data.message.readAt).toISOString()).toBe(fixedTime.toISOString());

      // Verify in DB
      const dbMsg = await prisma.inboxMessage.findUnique({ where: { id: msg.id } });
      expect(dbMsg?.readAt?.toISOString()).toBe(fixedTime.toISOString());

      // Test idempotency: Calling read again on already-read notification returns 200 OK without changing timestamp
      const laterTime = new Date('2026-10-02T16:00:00.000Z');
      setNotificationsClock(() => laterTime);

      const res2 = await fetch(`${baseUrl}/api/notifications/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ id: msg.id }),
      });

      expect(res2.status).toBe(200);
      const dbMsg2 = await prisma.inboxMessage.findUnique({ where: { id: msg.id } });
      expect(dbMsg2?.readAt?.toISOString()).toBe(fixedTime.toISOString());
    });

    it('enforces Decision #20: User A cannot mark User B notification as read (fails 403)', async () => {
      const msgB = await prisma.inboxMessage.create({
        data: {
          userId: userB.id,
          poolId: poolA.id,
          type: 'PICK_REMINDER',
          payload: { note: 'Confidential' },
          dedupeKey: `user_b_priv_${Date.now()}_${Math.random()}`,
          readAt: null,
        },
      });

      // User A attempts to mark User B's notification
      const res = await fetch(`${baseUrl}/api/notifications/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ id: msgB.id }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/Forbidden/i);

      // Verify User B's notification was NOT altered in database
      const intact = await prisma.inboxMessage.findUnique({ where: { id: msgB.id } });
      expect(intact?.readAt).toBeNull();
    });

    it('handles batch array ids and rejects cross-tenant manipulation (Decision #20 & #55)', async () => {
      const msgA1 = await prisma.inboxMessage.create({
        data: { userId: userA.id, poolId: poolA.id, type: 'PICK_REMINDER', payload: {}, dedupeKey: `batch_a1_${Date.now()}_${Math.random()}`, readAt: null },
      });
      const msgA2 = await prisma.inboxMessage.create({
        data: { userId: userA.id, poolId: poolA.id, type: 'PICK_REMINDER', payload: {}, dedupeKey: `batch_a2_${Date.now()}_${Math.random()}`, readAt: null },
      });
      const msgB = await prisma.inboxMessage.create({
        data: { userId: userB.id, poolId: poolA.id, type: 'PICK_REMINDER', payload: {}, dedupeKey: `batch_b1_${Date.now()}_${Math.random()}`, readAt: null },
      });

      // User A tries batch update including msgB
      const resCross = await fetch(`${baseUrl}/api/notifications/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ ids: [msgA1.id, msgB.id] }),
      });

      expect(resCross.status).toBe(403);
      // Verify nothing marked
      const checkA1 = await prisma.inboxMessage.findUnique({ where: { id: msgA1.id } });
      expect(checkA1?.readAt).toBeNull();

      // Valid batch for User A
      const resValid = await fetch(`${baseUrl}/api/notifications/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ ids: [msgA1.id, msgA2.id] }),
      });

      expect(resValid.status).toBe(200);
      const dataValid = await resValid.json();
      expect(dataValid.markedCount).toBe(2);

      const checkA2 = await prisma.inboxMessage.findUnique({ where: { id: msgA2.id } });
      expect(checkA2?.readAt).not.toBeNull();
    });
  });

  describe('3. POST /api/notifications/read-all', () => {
    it('atomically marks all unread notifications for req.user.id and preserves other users (Decision #20)', async () => {
      await prisma.inboxMessage.create({
        data: { userId: userA.id, poolId: poolA.id, type: 'PICK_REMINDER', payload: {}, dedupeKey: `all_a1_${Date.now()}_${Math.random()}`, readAt: null },
      });
      await prisma.inboxMessage.create({
        data: { userId: userA.id, poolId: poolA.id, type: 'PICK_REMINDER', payload: {}, dedupeKey: `all_a2_${Date.now()}_${Math.random()}`, readAt: null },
      });
      const msgB = await prisma.inboxMessage.create({
        data: { userId: userB.id, poolId: poolA.id, type: 'PICK_REMINDER', payload: {}, dedupeKey: `all_b1_${Date.now()}_${Math.random()}`, readAt: null },
      });

      const res = await fetch(`${baseUrl}/api/notifications/read-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.markedReadCount).toBe(2);

      // Verify User A unread count is now 0
      const countA = await prisma.inboxMessage.count({ where: { userId: userA.id, readAt: null } });
      expect(countA).toBe(0);

      // Verify User B unread message is completely untouched
      const freshB = await prisma.inboxMessage.findUnique({ where: { id: msgB.id } });
      expect(freshB?.readAt).toBeNull();
    });
  });

  describe('4. GET & PUT /api/notifications/preferences', () => {
    it('GET returns default preferences without creating DB row (Decision #54)', async () => {
      const initialRows = await prisma.notificationPreference.count({ where: { userId: userA.id } });
      expect(initialRows).toBe(0);

      const res = await fetch(`${baseUrl}/api/notifications/preferences`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.emailEnabled).toBe(true);
      expect(data.reminderOffsetsHours).toEqual([24, 2]);

      // Verify Decision #54: No rows created on GET
      const afterRows = await prisma.notificationPreference.count({ where: { userId: userA.id } });
      expect(afterRows).toBe(0);
    });

    it('PUT validates and updates preferences for req.user.id', async () => {
      // Invalid offsets: empty array
      const resBad1 = await fetch(`${baseUrl}/api/notifications/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({ reminderOffsetsHours: [] }),
      });
      expect(resBad1.status).toBe(400);

      // Invalid offsets: out of range (> 168)
      const resBad2 = await fetch(`${baseUrl}/api/notifications/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({ reminderOffsetsHours: [200] }),
      });
      expect(resBad2.status).toBe(400);

      // Valid update
      const resValid = await fetch(`${baseUrl}/api/notifications/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({
          emailEnabled: false,
          reminderOffsetsHours: [48, 12, 1],
        }),
      });

      expect(resValid.status).toBe(200);
      const data = await resValid.json();
      expect(data.emailEnabled).toBe(false);
      expect(data.reminderOffsetsHours).toEqual([48, 12, 1]);

      // Verify GET returns updated values
      const resGet = await fetch(`${baseUrl}/api/notifications/preferences`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const dataGet = await resGet.json();
      expect(dataGet.emailEnabled).toBe(false);
      expect(dataGet.reminderOffsetsHours).toEqual([48, 12, 1]);
    });
  });

  describe('5. Decision #54 Hardening (NO WRITES ON GET)', () => {
    it('GET /api/notifications does not mutate any database state', async () => {
      await prisma.inboxMessage.create({
        data: {
          userId: userA.id,
          poolId: poolA.id,
          type: 'PICK_REMINDER',
          payload: { label: 'ReadOnly' },
          dedupeKey: `dec54_key_${Date.now()}_${Math.random()}`,
          readAt: null,
        },
      });

      const beforeMessages = await prisma.inboxMessage.findMany({ where: { userId: userA.id } });
      const beforePrefs = await prisma.notificationPreference.findMany({ where: { userId: userA.id } });

      const res = await fetch(`${baseUrl}/api/notifications`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      expect(res.status).toBe(200);

      const afterMessages = await prisma.inboxMessage.findMany({ where: { userId: userA.id } });
      const afterPrefs = await prisma.notificationPreference.findMany({ where: { userId: userA.id } });

      expect(beforeMessages).toEqual(afterMessages);
      expect(beforePrefs).toEqual(afterPrefs);
    });
  });

  describe('6. Decision #55 Hardening (FAIL CLOSED ON DB ERROR)', () => {
    it('rolls back and leaves state intact when mid-transaction or update errors occur', async () => {
      const msg = await prisma.inboxMessage.create({
        data: {
          userId: userA.id,
          poolId: poolA.id,
          type: 'PICK_REMINDER',
          payload: { test: true },
          dedupeKey: `dec55_key_${Date.now()}_${Math.random()}`,
          readAt: null,
        },
      });

      // Attempt atomic transaction with deliberate failure
      try {
        await prisma.$transaction(async (tx) => {
          await tx.inboxMessage.update({
            where: { id: msg.id },
            data: { readAt: new Date() },
          });
          throw new Error('SIMULATED_DB_ERROR_FAIL_CLOSED');
        });
      } catch (err: any) {
        expect(err.message).toContain('SIMULATED_DB_ERROR_FAIL_CLOSED');
      }

      // Verify transaction rollback: message remains unread
      const fresh = await prisma.inboxMessage.findUnique({ where: { id: msg.id } });
      expect(fresh?.readAt).toBeNull();
    });
  });
});
```

### 8.7 Prisma Schema (`prisma/schema.prisma`)
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

### 8.8 Decision Register Appendix A (`docs/rulings/appendix-a.md`)
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
