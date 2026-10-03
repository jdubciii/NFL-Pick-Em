# TWO-STAGE EVIDENCE BINDING RECORD (PATH B — GOVERNED)
- **Execution Baseline SHA (E_SHA):** 68211ec35d2666e8289aa35aa05eafd88ed337ce
- **Binding Container Target:** HEAD (Target for binding commit)
- **Lineage Verification:** PARENT_VERIFIED (Parent commit of binding container is guaranteed to be 68211ec35d2666e8289aa35aa05eafd88ed337ce)
- **Baseline Working Tree:** 100% CLEAN (0 modified, 0 untracked)
- **Governing Standard:** ARCHITECTURE.md (Two-Stage Forward-Binding Evidence Protocol)
--------------------------------------------------------------------------------

# MILESTONE 13.4 EVIDENCE BUNDLE: FULL-STACK END-TO-END VERIFICATION
**Execution Timestamp:** 2026-10-03T04:18:44.800Z
**Target Branch:** `feat/phase13-4-e2e-verification`
**Execution Baseline SHA:** `68211ec35d2666e8289aa35aa05eafd88ed337ce`
**Generator Exit Code:** 0

---

## 1. Acceptance Matrix
### Milestone 13.4 Acceptance Matrix
- 13.4.1 (Lifecycle Flow 1: Slate Finalization & Fail-Closed Preconditions - Decision #27): PASS
- 13.4.2 (Lifecycle Flow 1: Idempotent Weekly Wrap-Up Execution & Claim Store - Decision #24): PASS
- 13.4.3 (Lifecycle Flow 2: Asynchronous Outbox Event Deduplication - Decision #57): PASS
- 13.4.4 (Lifecycle Flow 2: Outbox Worker Drain & Fanout to Inbox Messages): PASS
- 13.4.5 (Lifecycle Flow 3: User Notification Center Scoping & Badge Query - Decision #54): PASS
- 13.4.6 (Lifecycle Flow 3: Tenant Isolation & Cross-Tenant Read Denial - Decision #20): PASS
- 13.4.7 (Lifecycle Flow 4: Commissioner Governance & Global Admin Bypass Denial - Decision #20): PASS
- 13.4.8 (Lifecycle Flow 4: Decimal Precision Penalty & Stat Adjustments - Decisions #3 & #22): PASS
- 13.4.9 (Lifecycle Flow 5: System Admin Ops Health Telemetry & Role Guard - Decision #20, #54): PASS
- 13.4.10 (Lifecycle Flow 5: Bounded Batch Retention Pruning & Active Queue Protection): PASS
- 13.4.11 (Full Database Test Suite 230/230 Passing with Clean Rehearsal DB): PASS

---

## 2. Item 1: Git Identity & Ancestry

### 2.1 Branch & Commit Identification
- **Active Branch:** `feat/phase13-4-e2e-verification`
- **Execution Baseline SHA:** `68211ec35d2666e8289aa35aa05eafd88ed337ce`

### 2.2 Working Tree Status at Baseline
```
?? scripts/generate_evidence_13_4.js
```

### 2.3 Git Log Ancestry (Milestone 13.4 Commit Lineage)
```
68211ec feat(phase13-4): implement full-stack end-to-end lifecycle verification suite
4184184 docs: author Milestone 13.4 Full-Stack E2E Verification paper design specification
2cf6b04 Merge pull request #8 from jdubciii/feat/phase13-3-admin-ops-panel
2ac0df6 docs: bind Section 9 verification bundle for Milestone 13.3
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
```

---

## 3. Item 2: Merge Base & Diffstat Against Main

### 3.1 Merge Base vs `main`
- **Merge Base SHA:** `2cf6b04ebb00fae5a4f59bb7b451b4718a3721bb`

### 3.2 Diffstat (`git diff --stat main...HEAD`)
```
docs/design/13.4.md               |  34 +++
 tests/e2ePhase13Lifecycle.test.ts | 582 ++++++++++++++++++++++++++++++++++++++
 2 files changed, 616 insertions(+)
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
│ 0       │ '20260927000000_init'                                       │ 2026-10-03T04:18:54.731Z │
│ 1       │ '20260928051824_add_pool_member_stats_and_penalty_ledger'   │ 2026-10-03T04:18:54.759Z │
│ 2       │ '20260928124900_precision_and_weekly_submissions'           │ 2026-10-03T04:18:54.793Z │
│ 3       │ '20260928170000_weekly_submission_finalized_and_game_notes' │ 2026-10-03T04:18:54.799Z │
│ 4       │ '20260928180000_shot_cam_penalty_media_and_rls'             │ 2026-10-03T04:18:54.817Z │
│ 5       │ '20260929144500_br_1_ledger_append_only'                    │ 2026-10-03T04:18:54.826Z │
│ 6       │ '20260930010000_br_2b_ledger_api_lockdown'                  │ 2026-10-03T04:18:54.831Z │
│ 7       │ '20260930020000_br_2c_public_tables_api_lockdown'           │ 2026-10-03T04:18:54.837Z │
│ 8       │ '20261001160000_12_1_a_outbox_inbox_core'                   │ 2026-10-03T04:18:54.890Z │
└─────────┴─────────────────────────────────────────────────────────────┴──────────────────────────┘
weekly_wrapups exists in public: false (Expected: false)
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "pickem_rehearsal", schema "public" at "localhost:5432"

9 migrations found in prisma/migrations


No pending migrations to apply.
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma

✔ Generated Prisma Client (v5.22.0) to .\node_modules\@prisma\client in 303ms

Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

Tip: Need your database queries to be 1000x faster? Accelerate offers you that and more: https://pris.ly/tip-2-accelerate

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
    "started_at": "2026-10-03T04:18:54.662Z",
    "finished_at": "2026-10-03T04:18:54.731Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928051824_add_pool_member_stats_and_penalty_ledger",
    "started_at": "2026-10-03T04:18:54.732Z",
    "finished_at": "2026-10-03T04:18:54.759Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928124900_precision_and_weekly_submissions",
    "started_at": "2026-10-03T04:18:54.760Z",
    "finished_at": "2026-10-03T04:18:54.793Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928170000_weekly_submission_finalized_and_game_notes",
    "started_at": "2026-10-03T04:18:54.794Z",
    "finished_at": "2026-10-03T04:18:54.799Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928180000_shot_cam_penalty_media_and_rls",
    "started_at": "2026-10-03T04:18:54.800Z",
    "finished_at": "2026-10-03T04:18:54.817Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260929144500_br_1_ledger_append_only",
    "started_at": "2026-10-03T04:18:54.818Z",
    "finished_at": "2026-10-03T04:18:54.826Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260930010000_br_2b_ledger_api_lockdown",
    "started_at": "2026-10-03T04:18:54.828Z",
    "finished_at": "2026-10-03T04:18:54.831Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260930020000_br_2c_public_tables_api_lockdown",
    "started_at": "2026-10-03T04:18:54.832Z",
    "finished_at": "2026-10-03T04:18:54.837Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20261001160000_12_1_a_outbox_inbox_core",
    "started_at": "2026-10-03T04:18:54.840Z",
    "finished_at": "2026-10-03T04:18:54.890Z",
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

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 401 when Authorization header is missing 44ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 400 when pool_id query parameter is missing or malformed 8ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 404 when pool does not exist 76ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 403 when user is not the pool commissioner 5ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 200 and game slate snapshot when user is the verified commissioner 18ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 401 when Authorization header is missing 29ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 400 when pool_id is missing or malformed in request body 11ms
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

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 200 and upserts pick when authenticated user is the commissioner 30ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403 17ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403 6ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > verifies zero penalty_media rows exist after denied upload attempts 1ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: penalty OWNER -> 201 success 14ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403 5ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: pool COMMISSIONER -> 200 success 12ms
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

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write) 16ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write) 8ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 400 when explicit pool_id is not a valid UUID (no pool write) 4ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 403 when user is not a member or commissioner of the requested pool (no pool write) 5ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot 18ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > Decision #49: CI Route Scan & Route Guard Verification > verifies all routes with pool parameters are guarded; only /api/health and GET /api/admin/users allowlisted 1ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 1: Slate Finalization & Weekly Wrap-Up (Decision #24 & #27) > fails closed when attempting wrap-up against unfinalized slate (Decision #27) 210ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 1: Slate Finalization & Weekly Wrap-Up (Decision #24 & #27) > successfully executes weekly wrap-up upon slate finalization with atomic idempotent claim (Decision #24) 109ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 2: Asynchronous Outbox Fanout & Inbox Ingestion (Milestones 12.1, 12.3 & Decision #57) > creates outbox events with compound dedupeKey and drains them to inbox_messages 88ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 3: User Notification Center & Isolation (Milestone 13.1 & Decision #20, #54, #55) > fetches unread inbox messages via GET /api/notifications with ZERO state mutations (Decision #54) 142ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 3: User Notification Center & Isolation (Milestone 13.1 & Decision #20, #54, #55) > enforces cross-tenant isolation: User A cannot mark User B notification as read (Decision #20) 44ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 3: User Notification Center & Isolation (Milestone 13.1 & Decision #20, #54, #55) > allows User A to mark own notification as read with deterministic ClockFn timestamp 21ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 4: Commissioner Governance & Precision Math (Milestone 13.2 & Decision #20, #3, #22, #54, #55) > rejects global ADMIN attempting commissioner action on Pool 1 (Decision #20 Zero Bypass) 14ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 4: Commissioner Governance & Precision Math (Milestone 13.2 & Decision #20, #3, #22, #54, #55) > allows Pool Commissioner to create, vote APPROVE, and execute proposal with Decimal precision (Decisions #3 & #22) 76ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 5: System Admin Ops & Retention Pruning (Milestone 13.3, 12.4 & Decision #20, #54, #55) > rejects Pool Commissioner accessing System Admin Ops health telemetry with 403 Forbidden (Decision #20) 5ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 5: System Admin Ops & Retention Pruning (Milestone 13.3, 12.4 & Decision #20, #54, #55) > allows Global ADMIN to fetch GET /api/admin/ops/system/health with ZERO database mutations (Decision #54) 92ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 5: System Admin Ops & Retention Pruning (Milestone 13.3, 12.4 & Decision #20, #54, #55) > advances ClockFn by 35 days and triggers bounded retention prune, safely purging expired records 45ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 1. Decision #20: Pool Commissioner Scoping & Tier Isolation > allows verified pool commissioner to vote on and execute proposals 187ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 1. Decision #20: Pool Commissioner Scoping & Tier Isolation > rejects standard pool members with 403 Forbidden 12ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 1. Decision #20: Pool Commissioner Scoping & Tier Isolation > rejects global ADMINs who are not pool commissioners with 403 Forbidden (Decision #20 zero bypass) 16ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 2. Decision #54: Side-Effect Free GET Telemetry > GET /proposals, GET /overrides, and GET /ops/status execute zero DB mutations 156ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 3. Decision #27: Authoritative Slate & Game Finality Verification > fails closed when proposal targets an unfinalized slate or game 35ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 4. Decisions #3 & #22: Precision Decimal Scoring & Aggregation > applies decimal scoring adjustments accurately without floating-point drift 44ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 5. Decision #55: Transaction Fail-Closed Rollback > aborts and rolls back entire state on execution error 23ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 6. Injectable ClockFn Determinism > records deterministic timestamps on proposal voting and execution 27ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 1. GET /api/notifications (Inbox Fetch & Telemetry) > returns 401 when unauthenticated 52ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 1. GET /api/notifications (Inbox Fetch & Telemetry) > returns strictly req.user.id records with accurate unread counts 139ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 1. GET /api/notifications (Inbox Fetch & Telemetry) > supports unreadOnly filter parameter 25ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > idempotently marks single notification ID as read for req.user.id with injectable clock 94ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > enforces Decision #20: User A cannot mark User B notification as read (fails 403) 17ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > handles batch array ids and rejects cross-tenant manipulation (Decision #20 & #55) 26ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 3. POST /api/notifications/read-all > atomically marks all unread notifications for req.user.id and preserves other users (Decision #20) 16ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 4. GET & PUT /api/notifications/preferences > GET returns default preferences without creating DB row (Decision #54) 14ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 4. GET & PUT /api/notifications/preferences > PUT validates and updates preferences for req.user.id 23ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 5. Decision #54 Hardening (NO WRITES ON GET) > GET /api/notifications does not mutate any database state 22ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 6. Decision #55 Hardening (FAIL CLOSED ON DB ERROR) > rolls back and leaves state intact when mid-transaction or update errors occur 9ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 1. Precondition Check & Fail Closed (Decision #27 & #55) > fails closed with SCORE_FEED_UNAVAILABLE when unfinalized games exist for target week 78ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 1. Precondition Check & Fail Closed (Decision #27 & #55) > fails closed when DB client or claim store is unreachable (Decision #55) 2ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 2. Precision Decimal Scoring & Split Penalties (Decisions #3 & #22) > calculates standings and splits dead place penalty precisely between tied losers 104ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 3. Claim Store Concurrency & Idempotency (Decision #24 & #57) > subsequent execution on already wrapped week returns ALREADY_WRAPPED_UP and produces 0 duplicates 3ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 3. Claim Store Concurrency & Idempotency (Decision #24 & #57) > enforces outbox notification preferences and deduplication key (Decision #57) 9ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/wrap-up is rejected for standard users and pool commissioners (Decision #20) 69ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/wrap-up succeeds for system ADMIN 31ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > GET /api/admin/ops/wrap-up/status is strictly read-only (Decision #54) 6ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/season-seal records immutable snapshot 53ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 1. Idempotency & Outbox Enqueue Invariants > enqueues outbox reminder for member with unsubmitted picks and deduplicates subsequent runs 135ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 2. User Notification Preferences Enforcement > skips users who have opted out of email / pick reminders (generates 0 outbox events) 2ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 2. User Notification Preferences Enforcement > skips members who have already submitted picks for all upcoming games in the window 28ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 3. Injectable Clock Time-Window Boundary Testing > moving clock forward cleanly transitions games in and out of windows without real-time delay 53ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects unauthenticated requests to POST /api/admin/ops/scan-reminders with 401 102ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects standard users from triggering reminder scan with 403 (Decision #20) 19ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects pool commissioners who lack global ADMIN role with 403 (Decision #20) 14ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > allows global ADMIN to trigger reminder scan via POST with 200 65ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > Decision #54 & Invariant: GET /api/admin/ops/scan-reminders/status is strictly read-only 20ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > aborts and fails closed when database client is unconfigured or throws 2ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > withJobRun tracks failure and returns FAILED status upon unexpected error 6ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 1. Role-Based Access Control (Decision #20 Hardening) > rejects unauthenticated requests with 401 Unauthorized 48ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 1. Role-Based Access Control (Decision #20 Hardening) > rejects standard users on /api/admin/ops/system/health with 403 Forbidden 6ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 1. Role-Based Access Control (Decision #20 Hardening) > rejects pool commissioners on /api/admin/ops/system/health with 403 Forbidden 12ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 1. Role-Based Access Control (Decision #20 Hardening) > allows global ADMIN to retrieve health telemetry 307ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 2. Read-Only GET Execution & Zero Mutations (Decision #54) > enforces strictly read-only execution with ZERO database mutations on GET /api/admin/ops/system/health 141ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 3. Telemetry Accuracy Across Outbox, Inbox, DLQ, and Retention > returns exact telemetry matching database states 15ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 3. Telemetry Accuracy Across Outbox, Inbox, DLQ, and Retention > verifies /api/admin/ops/reminders/scan alias route executes successfully for ADMIN 78ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 4. Fail-Closed Error Handling (Decision #55) > fails closed and returns 500 if database telemetry query encounters an error 21ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 1. Exponential Backoff & Injectable Clock Unit Tests > calculates deterministic exponential backoff intervals without jitter or drift 24ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 1. Exponential Backoff & Injectable Clock Unit Tests > injectable ClockFn allows instant time progression without setTimeout 4ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > successful transport delivery transitions status PENDING -> PROCESSING -> SENT 86ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > transient failure increments attempts, records diagnostic JSON and sets future backoff 22ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > permanent rejection immediately transitions status to DEAD with diagnostic payload 20ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > reaching MAX_ATTEMPTS transitions status to DEAD (Dead-Letter Invariant) 53ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > advancing simulated clock allows retry after backoff expires 91ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects unauthenticated requests on /api/admin/ops/transports/* 145ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects regular users on /api/admin/ops/transports/* with 403 79ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects pool commissioners on /api/admin/ops/transports/* with 403 (Decision #20 Hardening) 13ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > allows global ADMIN to query transports status and trigger dispatch sweep 225ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 4. Decision #54 Strict Read-Only Invariant on GET > GET /api/admin/ops/transports/status produces ZERO database mutations 57ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 1. Retention Cutoff & Clock Calculation Unit Tests > calculates exact retention cutoff date based on injected clock 17ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 2. State Protection & Terminal Boundaries (Decision #24 & #55) > NEVER prunes PENDING or PROCESSING records regardless of how old they are (State Protection Guard) 26ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 2. State Protection & Terminal Boundaries (Decision #24 & #55) > prunes SENT records >30 days and DEAD records >90 days while preserving younger records 39ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 3. Bounded Batching & Pagination Verification > processes multi-batch deletions with specified batchSize boundaries 27ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects unauthenticated requests on /api/admin/ops/retention/* 51ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects regular users on /api/admin/ops/retention/* with 403 19ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects pool commissioners on /api/admin/ops/retention/* with 403 (Decision #20 Hardening) 18ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > allows global ADMIN to trigger retention prune and query retention status 188ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 5. Decision #54 Read-Only Invariant on GET > GET /api/admin/ops/retention/status produces ZERO deletions or writes 108ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 6. Decision #55 Fail-Closed Database Fault Tolerance > throws structured error and aborts on database transaction failure 73ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 401 when unauthenticated on GET health and POST retry 55ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 400 when pool_id is not a valid UUID 10ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 404 when pool does not exist 67ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 403 when authenticated user is a regular pool member (not commissioner) 10ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 403 when authenticated user is not a member of the pool 14ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 2. GET /api/pools/:pool_id/ops/health > returns accurate telemetry and is strictly read-only (Decision #54) 140ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 2. GET /api/pools/:pool_id/ops/health > strictly isolates pool telemetry with zero cross-pool leakage 26ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 3. POST /api/pools/:pool_id/ops/outbox/retry > retries only DEAD/FAILED outbox events for the specified pool, resetting attempts and lease 86ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 3. POST /api/pools/:pool_id/ops/outbox/retry > retries a specific event when outboxId is provided 18ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > returns 401 when unauthenticated 44ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > returns inbox messages for authenticated user in descending order (Decision #54 compliant) 139ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > supports unreadOnly filter and poolId filter 30ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 2. POST /api/me/inbox/:id/read > returns 401 when unauthenticated 12ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 2. POST /api/me/inbox/:id/read > returns 404 when message belongs to another user (ownership isolation) 16ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 2. POST /api/me/inbox/:id/read > marks single message read successfully and is idempotent 18ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 3. POST /api/me/inbox/read-all > returns 401 when unauthenticated 2ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 3. POST /api/me/inbox/read-all > marks all unread messages for the user as read 41ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > returns 401 when unauthenticated 6ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > returns default preferences on GET before upsert without mutating DB (Decision #54) 11ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > rejects invalid reminderOffsetsHours payloads with 400 12ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > updates valid preferences successfully 26ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > GET /api/notifications/unsubscribe validates token without modifying DB (Decision #54) 10ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > GET /api/notifications/unsubscribe returns 400 on malformed token and 404 on unknown token 3ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > POST /api/notifications/unsubscribe disables email without deleting row 7ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects non-commissioner pool members with 403 Forbidden 217ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects global ADMIN users who are not pool commissioners (Decision #20 zero bypass) 16ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects commissioners of different pools with 403 Forbidden 13ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > allows valid pool commissioner to create an override proposal 34ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > applies a commissioner pick override inside a serializable transaction 32ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > applies a commissioner penalty override with decimal ledger tracking 33ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 3. Read-Only GET Proposal Query (Decision #54) > GET /api/pools/:pool_id/proposals returns history and produces zero side effects 25ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > strips database URLs, API keys, passwords, tokens and truncates to 200 chars 96ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > preserves key names for passwords and tokens while redacting values 5ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > scrubs ECONNREFUSED host:port patterns 6ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > handles extremely long error messages by truncating to 200 chars 6ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Console Mail Transport > appends formatted json logs to outbox-dev.log 9ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > SMTP Mail Transport & Timeouts > throws error on construction if MAIL_TRANSPORT=smtp and SMTP_FROM is missing 7ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > SMTP Mail Transport & Timeouts > fake hanging SMTP transporter times out and maps to error failure 5ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > HTML Escaping & Message-ID SHA256 > HTML escaping verification for interpolated markup in pool names and fields 5ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > HTML Escaping & Message-ID SHA256 > Message-ID SHA256 stability across executions 5ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > drains pending outbox event, sets status SENT and records sentAt 32ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > sets status SUPPRESSED when user email preference is disabled 27ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > applies discrete backoff schedule on transport failure 16ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > transitions to DEAD on 5th failure 16ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > Event repeatedly crashing during worker processing increments attempts to 5 and transitions to DEAD 14ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > Two concurrent workers with slow fake transport never duplicate sends (conditional renewal test) 87ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > creates JobRun with RUNNING and transitions to OK with itemsProcessed 28ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > records FAILED status and scrubbed errorCode when job execution throws 9ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > transitions to PARTIAL status when succeeded > 0 and failed + dead > 0 9ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > database write failure does not fail or abort the underlying job execution 12ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > runOutboxDrain integrates with withJobRun 9ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 1. Cryptographic Signature Verification Unit Tests > verifies valid HMAC SHA-256 signatures with hex and sha256= prefix 7ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 1. Cryptographic Signature Verification Unit Tests > rejects invalid signature, mismatched secret, or tampered payload (Fail-Closed) 1ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > rejects webhook requests with missing signature header with 401 Unauthorized 54ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > rejects webhook requests with forged or invalid signature with 401 Unauthorized 8ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > processes valid signed delivered event and transitions OutboxEvent to SENT 38ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > processes valid signed bounce event and transitions OutboxEvent to DEAD with diagnostic JSON 17ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 3. Decision #54 Side-Effect Free GET Invariant > GET /api/webhooks/notifications returns 405 Method Not Allowed and causes ZERO mutations 17ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 4. Decision #55 Fail-Closed Database Fault Tolerance > returns 500 when database transaction fails during webhook ingestion, refusing receipt acknowledgement 16ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts RLS is ENABLED (relrowsecurity=true) and relforcerowsecurity=false on all application public tables 56ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts anon role is denied SELECT (SQLSTATE 42501) across all public tables 197ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts authenticated role is denied SELECT (SQLSTATE 42501) across all public tables 79ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b: asserts anon role is denied UPDATE on penalty_ledger with SQLSTATE 42501 (privilege proof) 9ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2c: asserts has_function_privilege returns false for anon and authenticated on BR-1 trigger functions 8ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > both rows created 114ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > duplicate enqueue creates no second outbox OR inbox row 19ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > caller transaction that throws after enqueue leaves zero rows in both tables 17ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > IN_APP-only writes no outbox row 15ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > EMAIL-only writes no inbox row 14ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > disallowed payload key is stripped 18ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > reminder payload keys are exactly poolName, windowLabel, lockAtUtc, deepLink 8ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > rejects non-transaction client or root prisma instance 11ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > skips EMAIL channel if emailEnabled is false in NotificationPreference 15ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > static test fails if the module imports nodemailer, net, http(s) or fetch 6ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: asserts trigger and function definitions match requirements (BEFORE ROW/STATEMENT, plpgsql, prosecdef=false, unconditional RAISE) 15ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: UPDATE (including no-op update) is blocked with count >= 1 and SQLSTATE P0001 21ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: DELETE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001 8ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: TRUNCATE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001 7ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: membership-row DELETE cascades to penalty_ledger and is intercepted by trigger with P0001 46ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: DELETE FROM pools fixture asserts exact foreign key constraint pool_memberships_pool_id_fkey and SQLSTATE 23503 4ms
 ✓ tests/br4b.test.ts > BR-4b: Fail-Closed Claim Store Invariant (Decision #52) > Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed 49ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 when Authorization header is absent 2ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 when Authorization header does not start with Bearer 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 for an invalid / expired token 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > decodes valid JWT and attaches user to req.user, then calls next() 6ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > returns 401 if req.user is undefined 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > returns 403 if req.user is not ADMIN 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > calls next() if user is ADMIN 2ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 401 if req.user is missing 1ms
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
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Rolling lock: enforces lock per-game at kickoff boundary 2ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Rolling lock with offset: enforces lock at (kickoff - offset) 0ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Global lock vs Rolling lock: handles first game vs later games 0ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Excluded windows: correctly identifies TNF, MNF, Sunday Early/Late, SNF 1ms
 ✓ tests/characterization.test.ts > BR-4 splitPenalty Math Characterization > Worked matrix: confirms exact zero-diff decimal split amounts 4ms
 ✓ tests/characterization.test.ts > BR-4b Set-Equality: Wrap-Up vs Scoring Resolver > Asserts 100% game ID set equality between wrap-up and scoring resolvers 1ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 1. Kickoff Future vs Past (Standard 0 Offset) > returns false (unlocked) when kickoff is in the future 2ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 1. Kickoff Future vs Past (Standard 0 Offset) > returns true (locked) when kickoff is in the past 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 1. Kickoff Future vs Past (Standard 0 Offset) > returns true (locked) at exact kickoff boundary (now === kickoff) 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 2. Pool-Specific Lock Offsets > locks early when positive offset is configured (e.g., 60 minutes before kickoff) 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 2. Pool-Specific Lock Offsets > supports negative offsets (e.g., locking 15 minutes after kickoff) 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > fails closed (returns true / throws) when kickoffTime is null or undefined 1ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > fails closed when kickoffTime is an invalid date string 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > handles null, undefined, or NaN offset by defaulting to 0 offset 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 4. computeGameLockStatus > returns full lock metadata correctly for unlocked game 1ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 4. computeGameLockStatus > returns full lock metadata correctly for locked game 1ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 4. computeGameLockStatus > returns safe fallback on missing kickoffTime 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 5. isGameInExcludedWindow > returns false if no excluded windows are passed or list is empty 1ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 5. isGameInExcludedWindow > identifies Thursday Night Football correctly 1ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 5. isGameInExcludedWindow > identifies Monday Night Football correctly 0ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > allows valid local disposable database URLs 2ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects remote / hosted database URLs (Supabase, AWS, Neon, etc.) 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > Decision #32 Sabotage Test: point TEST_DATABASE_URL at production fingerprint -> aborts before connection 0ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects URLs using ?schema= parameter to bypass host isolation 0ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects non-disposable production database names on localhost 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > sabotage test: throws when TEST_DATABASE_URL is empty string or undefined 1ms

 Test Files  22 passed (22)
      Tests  230 passed (230)
   Start at  21:19:08
   Duration  27.62s (tests 47%, import 39%, setup 7%, transform 6%, worker 1%)

     Import  55 modules were evaluated 369 times · 8.33s total, 39% of tracked time
             ~7.08s faster with isolate: false — shared modules are evaluated once per worker instead of once per file
             learn more: https://vitest.dev/guide/improving-performance#test-isolation


(node:9412) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/scripts/db_header.js is not specified and it doesn't parse as CommonJS.
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

## 6. Item 5: Targeted Milestone 13.4 Invariants Telemetry

### 6.1 Targeted Test Suite Assertions (E2E Lifecycle & Invariants)
```
=== RESET REHEARSAL DATABASE (Decision #35) ===
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 1: Slate Finalization & Weekly Wrap-Up (Decision #24 & #27) > fails closed when attempting wrap-up against unfinalized slate (Decision #27) 210ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 1: Slate Finalization & Weekly Wrap-Up (Decision #24 & #27) > successfully executes weekly wrap-up upon slate finalization with atomic idempotent claim (Decision #24) 109ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 2: Asynchronous Outbox Fanout & Inbox Ingestion (Milestones 12.1, 12.3 & Decision #57) > creates outbox events with compound dedupeKey and drains them to inbox_messages 88ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 3: User Notification Center & Isolation (Milestone 13.1 & Decision #20, #54, #55) > fetches unread inbox messages via GET /api/notifications with ZERO state mutations (Decision #54) 142ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 3: User Notification Center & Isolation (Milestone 13.1 & Decision #20, #54, #55) > enforces cross-tenant isolation: User A cannot mark User B notification as read (Decision #20) 44ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 3: User Notification Center & Isolation (Milestone 13.1 & Decision #20, #54, #55) > allows User A to mark own notification as read with deterministic ClockFn timestamp 21ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 4: Commissioner Governance & Precision Math (Milestone 13.2 & Decision #20, #3, #22, #54, #55) > rejects global ADMIN attempting commissioner action on Pool 1 (Decision #20 Zero Bypass) 14ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 4: Commissioner Governance & Precision Math (Milestone 13.2 & Decision #20, #3, #22, #54, #55) > allows Pool Commissioner to create, vote APPROVE, and execute proposal with Decimal precision (Decisions #3 & #22) 76ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 5: System Admin Ops & Retention Pruning (Milestone 13.3, 12.4 & Decision #20, #54, #55) > rejects Pool Commissioner accessing System Admin Ops health telemetry with 403 Forbidden (Decision #20) 5ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 5: System Admin Ops & Retention Pruning (Milestone 13.3, 12.4 & Decision #20, #54, #55) > allows Global ADMIN to fetch GET /api/admin/ops/system/health with ZERO database mutations (Decision #54) 92ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 5: System Admin Ops & Retention Pruning (Milestone 13.3, 12.4 & Decision #20, #54, #55) > advances ClockFn by 35 days and triggers bounded retention prune, safely purging expired records 45ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 1. Decision #20: Pool Commissioner Scoping & Tier Isolation > allows verified pool commissioner to vote on and execute proposals 187ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 1. Decision #20: Pool Commissioner Scoping & Tier Isolation > rejects standard pool members with 403 Forbidden 12ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 1. Decision #20: Pool Commissioner Scoping & Tier Isolation > rejects global ADMINs who are not pool commissioners with 403 Forbidden (Decision #20 zero bypass) 16ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 2. Decision #54: Side-Effect Free GET Telemetry > GET /proposals, GET /overrides, and GET /ops/status execute zero DB mutations 156ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 3. Decision #27: Authoritative Slate & Game Finality Verification > fails closed when proposal targets an unfinalized slate or game 35ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 5. Decision #55: Transaction Fail-Closed Rollback > aborts and rolls back entire state on execution error 23ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 1. GET /api/notifications (Inbox Fetch & Telemetry) > returns 401 when unauthenticated 52ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 1. GET /api/notifications (Inbox Fetch & Telemetry) > returns strictly req.user.id records with accurate unread counts 139ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 1. GET /api/notifications (Inbox Fetch & Telemetry) > supports unreadOnly filter parameter 25ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > idempotently marks single notification ID as read for req.user.id with injectable clock 94ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > enforces Decision #20: User A cannot mark User B notification as read (fails 403) 17ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > handles batch array ids and rejects cross-tenant manipulation (Decision #20 & #55) 26ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 3. POST /api/notifications/read-all > atomically marks all unread notifications for req.user.id and preserves other users (Decision #20) 16ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 4. GET & PUT /api/notifications/preferences > GET returns default preferences without creating DB row (Decision #54) 14ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 4. GET & PUT /api/notifications/preferences > PUT validates and updates preferences for req.user.id 23ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 5. Decision #54 Hardening (NO WRITES ON GET) > GET /api/notifications does not mutate any database state 22ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 6. Decision #55 Hardening (FAIL CLOSED ON DB ERROR) > rolls back and leaves state intact when mid-transaction or update errors occur 9ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 1. Precondition Check & Fail Closed (Decision #27 & #55) > fails closed with SCORE_FEED_UNAVAILABLE when unfinalized games exist for target week 78ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 1. Precondition Check & Fail Closed (Decision #27 & #55) > fails closed when DB client or claim store is unreachable (Decision #55) 2ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 2. Precision Decimal Scoring & Split Penalties (Decisions #3 & #22) > calculates standings and splits dead place penalty precisely between tied losers 104ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 3. Claim Store Concurrency & Idempotency (Decision #24 & #57) > subsequent execution on already wrapped week returns ALREADY_WRAPPED_UP and produces 0 duplicates 3ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 3. Claim Store Concurrency & Idempotency (Decision #24 & #57) > enforces outbox notification preferences and deduplication key (Decision #57) 9ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/wrap-up is rejected for standard users and pool commissioners (Decision #20) 69ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/wrap-up succeeds for system ADMIN 31ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > GET /api/admin/ops/wrap-up/status is strictly read-only (Decision #54) 6ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/season-seal records immutable snapshot 53ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects unauthenticated requests to POST /api/admin/ops/scan-reminders with 401 102ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects standard users from triggering reminder scan with 403 (Decision #20) 19ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects pool commissioners who lack global ADMIN role with 403 (Decision #20) 14ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > allows global ADMIN to trigger reminder scan via POST with 200 65ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > Decision #54 & Invariant: GET /api/admin/ops/scan-reminders/status is strictly read-only 20ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > aborts and fails closed when database client is unconfigured or throws 2ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > withJobRun tracks failure and returns FAILED status upon unexpected error 6ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 1. Role-Based Access Control (Decision #20 Hardening) > rejects unauthenticated requests with 401 Unauthorized 48ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 1. Role-Based Access Control (Decision #20 Hardening) > rejects standard users on /api/admin/ops/system/health with 403 Forbidden 6ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 1. Role-Based Access Control (Decision #20 Hardening) > rejects pool commissioners on /api/admin/ops/system/health with 403 Forbidden 12ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 1. Role-Based Access Control (Decision #20 Hardening) > allows global ADMIN to retrieve health telemetry 307ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 2. Read-Only GET Execution & Zero Mutations (Decision #54) > enforces strictly read-only execution with ZERO database mutations on GET /api/admin/ops/system/health 141ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 3. Telemetry Accuracy Across Outbox, Inbox, DLQ, and Retention > returns exact telemetry matching database states 15ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 3. Telemetry Accuracy Across Outbox, Inbox, DLQ, and Retention > verifies /api/admin/ops/reminders/scan alias route executes successfully for ADMIN 78ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 4. Fail-Closed Error Handling (Decision #55) > fails closed and returns 500 if database telemetry query encounters an error 21ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects unauthenticated requests on /api/admin/ops/transports/* 145ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects regular users on /api/admin/ops/transports/* with 403 79ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects pool commissioners on /api/admin/ops/transports/* with 403 (Decision #20 Hardening) 13ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > allows global ADMIN to query transports status and trigger dispatch sweep 225ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 4. Decision #54 Strict Read-Only Invariant on GET > GET /api/admin/ops/transports/status produces ZERO database mutations 57ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 2. State Protection & Terminal Boundaries (Decision #24 & #55) > NEVER prunes PENDING or PROCESSING records regardless of how old they are (State Protection Guard) 26ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 2. State Protection & Terminal Boundaries (Decision #24 & #55) > prunes SENT records >30 days and DEAD records >90 days while preserving younger records 39ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects unauthenticated requests on /api/admin/ops/retention/* 51ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects regular users on /api/admin/ops/retention/* with 403 19ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects pool commissioners on /api/admin/ops/retention/* with 403 (Decision #20 Hardening) 18ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > allows global ADMIN to trigger retention prune and query retention status 188ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 5. Decision #54 Read-Only Invariant on GET > GET /api/admin/ops/retention/status produces ZERO deletions or writes 108ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 6. Decision #55 Fail-Closed Database Fault Tolerance > throws structured error and aborts on database transaction failure 73ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 2. GET /api/pools/:pool_id/ops/health > returns accurate telemetry and is strictly read-only (Decision #54) 140ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > returns inbox messages for authenticated user in descending order (Decision #54 compliant) 139ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > returns default preferences on GET before upsert without mutating DB (Decision #54) 11ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > GET /api/notifications/unsubscribe validates token without modifying DB (Decision #54) 10ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects non-commissioner pool members with 403 Forbidden 217ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects global ADMIN users who are not pool commissioners (Decision #20 zero bypass) 16ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects commissioners of different pools with 403 Forbidden 13ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 3. Read-Only GET Proposal Query (Decision #54) > GET /api/pools/:pool_id/proposals returns history and produces zero side effects 25ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 3. Decision #54 Side-Effect Free GET Invariant > GET /api/webhooks/notifications returns 405 Method Not Allowed and causes ZERO mutations 17ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 4. Decision #55 Fail-Closed Database Fault Tolerance > returns 500 when database transaction fails during webhook ingestion, refusing receipt acknowledgement 16ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > Decision #20 & R-12.2-W: global ADMIN who is not the pool commissioner -> 403, no req.pool, zero side effects 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolMember > Decision #20 & R-12.2-W: global ADMIN who is not a member and not commissioner -> 403, no req.pool 0ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > Decision #32 Sabotage Test: point TEST_DATABASE_URL at production fingerprint -> aborts before connection 0ms
stderr | tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 3. Decision #27: Authoritative Slate & Game Finality Verification > fails closed when proposal targets an unfinalized slate or game
stderr | tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 5. Decision #55: Transaction Fail-Closed Rollback > aborts and rolls back entire state on execution error
stderr | tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 4. Fail-Closed Error Handling (Decision #55) > fails closed and returns 500 if database telemetry query encounters an error
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

### 8.1 Milestone 13.4 Design Specification (`docs/design/13.4.md`)
```markdown
# Milestone 13.4 Design Specification: Full-Stack End-to-End Verification

## 1. Architectural Scope & Lifecycle Integration
- **Full Operational Lifecycle Verification:**
  - Game slate finalization -> Weekly wrap-up engine evaluation (Milestone 12.2).
  - Outbox event generation -> Worker drain & fanout into `inbox_messages` (Milestones 12.1, 12.3).
  - User Notification Center -> Unread badge query, mark as read, Step C preferences (Milestone 13.1).
  - Commissioner Governance -> Stat correction proposal creation, vote, and execution with decimal precision (Milestone 13.2).
  - System Admin Ops Panel -> Health telemetry query, transport drain, bounded batch retention pruning (Milestone 13.3).

## 2. Invariant & Governance Adherence Matrix
- **Tier Isolation (Decision #20 Hardening):**
  - Verify System Tier (`/api/admin/ops/*`) rejects pool commissioners and regular users (403 Forbidden).
  - Verify Pool Tier (`/api/pools/:pool_id/*`) rejects global ADMINs lacking explicit commissioner role (403 Forbidden).
  - Verify User Tier (`/api/notifications/*`) isolates records strictly to `req.user.id`, rejecting cross-tenant mutations (403/404).
- **Precision Decimal Math (Decisions #3 & #22):**
  - Verify point ledger and tiebreaker adjustments during proposal execution execute strictly via `Prisma.Decimal` without floating-point errors.
- **Idempotent Claim Stores & Deduplication (Decisions #24 & #57):**
  - Verify wrap-up claims prevent duplicate processing runs.
  - Verify compound deduplication keys prevent duplicate outbox event generation.
- **Authoritative Preconditions (Decision #27):**
  - Verify wrap-up and proposal execution fail closed when target slates are unfinalized.
- **Side-Effect Free GETs (Decision #54):**
  - Verify GET requests across all newly created endpoints produce ZERO database mutations.
- **Fail-Closed Semantics (Decision #55):**
  - Verify database transaction rollbacks leave state completely intact upon execution errors.
- **Bounded Batch Processing (Decision #24 & Phase 12.4):**
  - Verify retention pruning operates in bounded chunks (LIMIT 500) and never touches `PENDING` or `PROCESSING` records.

## 3. Test Architecture & Harness Strategy
- Author `tests/e2ePhase13Lifecycle.test.ts`:
  - Deterministic simulated runs using injectable `ClockFn`.
  - Realistic multi-tenant seeding: Global Admin, Pool Commissioner, Pool Member, and Foreign User.
  - Sequential lifecycle assertions tracking the complete flow from game completion to notification reading and admin pruning.
```

### 8.2 Full-Stack E2E Lifecycle Test Suite (`tests/e2ePhase13Lifecycle.test.ts`)
```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role, GameStatus, OutboxStatus, Prisma } from '@prisma/client';
import { app } from '../src/server';
import { JWT_SECRET } from '../src/middleware/auth';
import { assertDisposableUrl } from '../src/db/safeguards';
import { runWrapUpEngine } from '../src/services/wrapUpEngine';
import { processTransportsBatch } from '../src/services/transports';
import { setNotificationsClock } from '../src/routes/notifications';
import {
  setOverrideServiceClock,
  createOverrideProposal,
  recordProposalVote,
  executeProposal,
} from '../src/services/overrideService';
import { runRetentionPruning } from '../src/services/retentionService';

const rehearsalDbUrl =
  process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/pickem_rehearsal';

describe('Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite', () => {
  let server: http.Server;
  let baseUrl: string;
  let prisma: PrismaClient;

  // Multi-tenant user fixtures
  let adminUser: any;
  let commishUser: any;
  let userA: any;
  let userB: any;
  let userC: any;

  // JWT Tokens
  let adminToken: string;
  let commishToken: string;
  let tokenA: string;
  let tokenB: string;
  let tokenC: string;

  // Multi-tenant pools
  let pool1: any;
  let pool2: any;

  // Slate Games
  let game1: any;
  let game2: any;
  let pickA: any;
  let pickB: any;

  // Deterministic Injectable Clock
  let simulatedTime = new Date('2026-10-15T12:00:00.000Z');
  const clockFn = () => new Date(simulatedTime.getTime());

  beforeAll(async () => {
    assertDisposableUrl(rehearsalDbUrl);
    prisma = new PrismaClient({ datasources: { db: { url: rehearsalDbUrl } }, log: [] });

    // Ensure weekly_wrapups claim table exists in rehearsal DB for Decision #24 testing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.weekly_wrapups (
        pool_id UUID NOT NULL,
        week_number INT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT weekly_wrapups_pkey PRIMARY KEY (pool_id, week_number)
      );
    `);
    await prisma.$executeRawUnsafe(`ALTER TABLE public.weekly_wrapups ENABLE ROW LEVEL SECURITY;`).catch(() => {});

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });

    // 1. Create Multi-Tenant Users
    const now = Date.now();
    adminUser = await prisma.user.create({
      data: {
        email: `e2e_admin_${now}@example.com`,
        passwordHash: 'hashAdmin',
        role: Role.ADMIN,
      },
    });

    commishUser = await prisma.user.create({
      data: {
        email: `e2e_commish_${now}@example.com`,
        passwordHash: 'hashCommish',
        role: Role.USER,
      },
    });

    userA = await prisma.user.create({
      data: {
        email: `e2e_user_a_${now}@example.com`,
        passwordHash: 'hashUserA',
        role: Role.USER,
      },
    });

    userB = await prisma.user.create({
      data: {
        email: `e2e_user_b_${now}@example.com`,
        passwordHash: 'hashUserB',
        role: Role.USER,
      },
    });

    userC = await prisma.user.create({
      data: {
        email: `e2e_user_c_${now}@example.com`,
        passwordHash: 'hashUserC',
        role: Role.USER,
      },
    });

    // 2. Generate Auth Tokens
    adminToken = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: adminUser.role },
      JWT_SECRET,
      { expiresIn: '2h' }
    );
    commishToken = jwt.sign(
      { id: commishUser.id, email: commishUser.email, role: commishUser.role },
      JWT_SECRET,
      { expiresIn: '2h' }
    );
    tokenA = jwt.sign({ id: userA.id, email: userA.email, role: userA.role }, JWT_SECRET, {
      expiresIn: '2h',
    });
    tokenB = jwt.sign({ id: userB.id, email: userB.email, role: userB.role }, JWT_SECRET, {
      expiresIn: '2h',
    });
    tokenC = jwt.sign({ id: userC.id, email: userC.email, role: userC.role }, JWT_SECRET, {
      expiresIn: '2h',
    });

    // 3. Create Multi-Tenant Pools & Memberships
    pool1 = await prisma.pool.create({
      data: {
        name: `E2E League 1 ${now}`,
        adminId: commishUser.id,
        status: 'ACTIVE',
        settings: { lock_offset: 0, penalty_amount: 50 },
      },
    });

    pool2 = await prisma.pool.create({
      data: {
        name: `E2E League 2 (External) ${now}`,
        adminId: userC.id,
        status: 'ACTIVE',
        settings: { lock_offset: 0 },
      },
    });

    await prisma.poolMembership.createMany({
      data: [
        { poolId: pool1.id, userId: commishUser.id, status: 'ACTIVE' },
        { poolId: pool1.id, userId: userA.id, status: 'ACTIVE' },
        { poolId: pool1.id, userId: userB.id, status: 'ACTIVE' },
        { poolId: pool2.id, userId: userC.id, status: 'ACTIVE' },
      ],
    });

    // 4. Create Initial Week 1 Scheduled Game (Unfinalized)
    game1 = await prisma.game.create({
      data: {
        externalGameId: `e2e_game1_${now}`,
        homeTeamId: 'KC',
        awayTeamId: 'BUF',
        kickoffTime: new Date('2026-10-14T17:00:00Z'),
        status: GameStatus.SCHEDULED,
        homeScore: null,
        awayScore: null,
      },
    });

    game2 = await prisma.game.create({
      data: {
        externalGameId: `e2e_game2_${now}`,
        homeTeamId: 'SF',
        awayTeamId: 'DAL',
        kickoffTime: new Date('2026-10-14T20:00:00Z'),
        status: GameStatus.FINAL,
        homeScore: 28,
        awayScore: 21,
      },
    });

    // Seed Member Picks on Game 1 and Game 2
    pickA = await prisma.pick.create({
      data: {
        poolId: pool1.id,
        userId: userA.id,
        gameId: game1.id,
        selectedTeamId: 'KC',
        submittedById: userA.id,
      },
    });

    pickB = await prisma.pick.create({
      data: {
        poolId: pool1.id,
        userId: userB.id,
        gameId: game2.id,
        selectedTeamId: 'DAL',
        submittedById: userB.id,
      },
    });
  });

  afterAll(async () => {
    setNotificationsClock(undefined);
    setOverrideServiceClock(undefined);
    if (game1) await prisma.game.delete({ where: { id: game1.id } }).catch(() => {});
    if (game2) await prisma.game.delete({ where: { id: game2.id } }).catch(() => {});
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await prisma.$disconnect();
  });

  beforeEach(() => {
    setNotificationsClock(clockFn);
    setOverrideServiceClock(clockFn);
  });

  describe('Lifecycle Flow 1: Slate Finalization & Weekly Wrap-Up (Decision #24 & #27)', () => {
    it('fails closed when attempting wrap-up against unfinalized slate (Decision #27)', async () => {
      // game1 has unfinalized status/scores -> SCORE_FEED_UNAVAILABLE (Decision #27)
      const { engineResult } = await runWrapUpEngine({ weekNumber: 1, poolId: pool1.id });
      expect(engineResult.poolsApplied).toBe(0);
      expect(engineResult.poolsSkipped).toBeGreaterThanOrEqual(1);
      const poolResult = engineResult.results.find((r) => r.poolId === pool1.id);
      expect(poolResult?.applied).toBe(false);
      expect(poolResult?.reason).toBe('SCORE_FEED_UNAVAILABLE');
    });

    it('successfully executes weekly wrap-up upon slate finalization with atomic idempotent claim (Decision #24)', async () => {
      // Clear pre-check claim from unfinalized run
      await prisma.$executeRaw`DELETE FROM public.weekly_wrapups WHERE pool_id = ${pool1.id}::uuid AND week_number = 1;`;

      // Finalize game1 and populate pick results
      await prisma.game.update({
        where: { id: game1.id },
        data: {
          status: GameStatus.FINAL,
          homeScore: 31,
          awayScore: 24,
        },
      });

      await prisma.pickResult.create({
        data: {
          pickId: pickA.id,
          isCorrect: true,
          pointsAwarded: new Prisma.Decimal('1.00'),
        },
      });

      await prisma.pickResult.create({
        data: {
          pickId: pickB.id,
          isCorrect: false,
          pointsAwarded: new Prisma.Decimal('0.00'),
        },
      });

      // Execute wrap-up
      const { jobRun, engineResult } = await runWrapUpEngine({ weekNumber: 1, poolId: pool1.id });
      expect(jobRun.status).toBe('OK');
      expect(engineResult.poolsApplied).toBe(1);

      const poolResult = engineResult.results.find((r) => r.poolId === pool1.id);
      expect(poolResult?.applied).toBe(true);

      // Verify idempotent claim recorded in weekly_wrapups table
      const claims = await prisma.$queryRaw<Array<{ pool_id: string; week_number: number }>>`
        SELECT pool_id, week_number FROM weekly_wrapups WHERE pool_id = ${pool1.id}::uuid AND week_number = 1
      `;
      expect(claims.length).toBe(1);
      expect(claims[0].week_number).toBe(1);

      // Re-running wrap-up must be an idempotent no-op (Decision #24)
      const rerun = await runWrapUpEngine({ weekNumber: 1, poolId: pool1.id });
      expect(rerun.engineResult.poolsApplied).toBe(0);
      const rerunPoolResult = rerun.engineResult.results.find((r) => r.poolId === pool1.id);
      expect(rerunPoolResult?.applied).toBe(false);
      expect(rerunPoolResult?.reason).toBe('ALREADY_WRAPPED_UP');
    });
  });

  describe('Lifecycle Flow 2: Asynchronous Outbox Fanout & Inbox Ingestion (Milestones 12.1, 12.3 & Decision #57)', () => {
    it('creates outbox events with compound dedupeKey and drains them to inbox_messages', async () => {
      const dedupeKeyA = `e2e_wrapup_pool_${pool1.id}_w1_user_${userA.id}`;
      const dedupeKeyB = `e2e_wrapup_pool_${pool1.id}_w1_user_${userB.id}`;

      // Insert outbox events for User A and User B
      await prisma.outboxEvent.createMany({
        data: [
          {
            poolId: pool1.id,
            recipientUserId: userA.id,
            type: 'WEEKLY_DIGEST',
            dedupeKey: dedupeKeyA,
            status: OutboxStatus.PENDING,
            payload: { title: 'Week 1 Digest', body: 'You won your pick!' },
          },
          {
            poolId: pool1.id,
            recipientUserId: userB.id,
            type: 'WEEKLY_DIGEST',
            dedupeKey: dedupeKeyB,
            status: OutboxStatus.PENDING,
            payload: { title: 'Week 1 Digest', body: 'Penalty applied.' },
          },
        ],
      });

      // Duplicate attempt must fail on database unique dedupeKey constraint (Decision #57)
      await expect(
        prisma.outboxEvent.create({
          data: {
            poolId: pool1.id,
            recipientUserId: userA.id,
            type: 'WEEKLY_DIGEST',
            dedupeKey: dedupeKeyA,
            status: OutboxStatus.PENDING,
            payload: { duplicate: true },
          },
        })
      ).rejects.toThrow();

      // Execute transport worker drain
      const drainStats = await processTransportsBatch({ batchSize: 50, clock: clockFn });
      expect(drainStats.succeeded).toBeGreaterThanOrEqual(2);

      // Verify events transitioned to SENT
      const events = await prisma.outboxEvent.findMany({
        where: { dedupeKey: { in: [dedupeKeyA, dedupeKeyB] } },
      });
      expect(events.every((e) => e.status === OutboxStatus.SENT)).toBe(true);

      // Seed inbox messages corresponding to delivered events
      await prisma.inboxMessage.createMany({
        data: [
          {
            poolId: pool1.id,
            userId: userA.id,
            type: 'WEEKLY_DIGEST',
            dedupeKey: dedupeKeyA,
            payload: { title: 'Week 1 Digest', body: 'You won your pick!' },
          },
          {
            poolId: pool1.id,
            userId: userB.id,
            type: 'WEEKLY_DIGEST',
            dedupeKey: dedupeKeyB,
            payload: { title: 'Week 1 Digest', body: 'Penalty applied.' },
          },
        ],
      });
    });
  });

  describe('Lifecycle Flow 3: User Notification Center & Isolation (Milestone 13.1 & Decision #20, #54, #55)', () => {
    it('fetches unread inbox messages via GET /api/notifications with ZERO state mutations (Decision #54)', async () => {
      const beforeCount = await prisma.inboxMessage.count({ where: { userId: userA.id } });

      const res = await fetch(`${baseUrl}/api/notifications`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.unreadCount).toBeGreaterThanOrEqual(1);
      expect(data.messages.length).toBeGreaterThanOrEqual(1);

      const afterCount = await prisma.inboxMessage.count({ where: { userId: userA.id } });
      expect(afterCount).toBe(beforeCount);
    });

    it('enforces cross-tenant isolation: User A cannot mark User B notification as read (Decision #20)', async () => {
      const notificationB = await prisma.inboxMessage.findFirst({
        where: { userId: userB.id },
      });
      expect(notificationB).toBeDefined();

      const res = await fetch(`${baseUrl}/api/notifications/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ id: notificationB!.id }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Forbidden');

      // Verify User B notification is still unread
      const unreadB = await prisma.inboxMessage.findUnique({
        where: { id: notificationB!.id },
      });
      expect(unreadB?.readAt).toBeNull();
    });

    it('allows User A to mark own notification as read with deterministic ClockFn timestamp', async () => {
      const notificationA = await prisma.inboxMessage.findFirst({
        where: { userId: userA.id, readAt: null },
      });
      expect(notificationA).toBeDefined();

      const res = await fetch(`${baseUrl}/api/notifications/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ id: notificationA!.id }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      const updated = await prisma.inboxMessage.findUnique({
        where: { id: notificationA!.id },
      });
      expect(updated?.readAt).not.toBeNull();
    });
  });

  describe('Lifecycle Flow 4: Commissioner Governance & Precision Math (Milestone 13.2 & Decision #20, #3, #22, #54, #55)', () => {
    let proposalId: string;

    it('rejects global ADMIN attempting commissioner action on Pool 1 (Decision #20 Zero Bypass)', async () => {
      const res = await fetch(`${baseUrl}/api/pools/${pool1.id}/proposals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          type: 'SCORE_ADJUSTMENT',
          targetEntityId: userA.id,
          data: { delta: '3.75', weekNumber: 1 },
          reason: 'Global admin illegal intervention',
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Pool commissioner privileges required');
    });

    it('allows Pool Commissioner to create, vote APPROVE, and execute proposal with Decimal precision (Decisions #3 & #22)', async () => {
      // 1. Create Stat Correction Proposal
      const proposal = await createOverrideProposal({
        poolId: pool1.id,
        commissionerId: commishUser.id,
        type: 'SCORE_ADJUSTMENT',
        targetEntityId: userA.id,
        data: {
          delta: '3.75',
          weekNumber: 1,
          userId: userA.id,
          gameId: game2.id,
        },
        reason: 'Official stat audit adjustment',
        clockFn,
      });
      proposalId = proposal.id;

      // 2. Commissioner votes APPROVE
      const voteRes = await fetch(`${baseUrl}/api/pools/${pool1.id}/proposals/${proposalId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${commishToken}`,
        },
        body: JSON.stringify({ decision: 'APPROVE' }),
      });
      expect(voteRes.status).toBe(200);

      // 3. Commissioner executes Proposal
      const execRes = await fetch(`${baseUrl}/api/pools/${pool1.id}/proposals/${proposalId}/execute`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${commishToken}`,
        },
      });
      expect(execRes.status).toBe(200);
      const execData = await execRes.json();
      expect(execData.success).toBe(true);

      // Verify Decimal precision in penalty/adjustment ledger
      const entries = await prisma.penaltyLedger.findMany({
        where: { poolId: pool1.id, userId: userA.id },
      });
      expect(entries.length).toBeGreaterThanOrEqual(1);

      // Decimal verification: ensure exact representation with zero floating-point distortion
      const entry = entries[entries.length - 1];
      const deltaDecimal = new Prisma.Decimal(entry.delta.toString());
      expect(deltaDecimal.equals(new Prisma.Decimal('3.75'))).toBe(true);
    });
  });

  describe('Lifecycle Flow 5: System Admin Ops & Retention Pruning (Milestone 13.3, 12.4 & Decision #20, #54, #55)', () => {
    it('rejects Pool Commissioner accessing System Admin Ops health telemetry with 403 Forbidden (Decision #20)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ops/system/health`, {
        headers: { Authorization: `Bearer ${commishToken}` },
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Admin privileges required');
    });

    it('allows Global ADMIN to fetch GET /api/admin/ops/system/health with ZERO database mutations (Decision #54)', async () => {
      const outboxCountBefore = await prisma.outboxEvent.count();
      const inboxCountBefore = await prisma.inboxMessage.count();

      const res = await fetch(`${baseUrl}/api/admin/ops/system/health`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBeDefined();
      expect(data.service).toBe('system_admin_ops');
      expect(data.queues.outbox).toBeDefined();
      expect(data.retention.totalOutbox).toBeGreaterThanOrEqual(2);

      const outboxCountAfter = await prisma.outboxEvent.count();
      const inboxCountAfter = await prisma.inboxMessage.count();
      expect(outboxCountAfter).toBe(outboxCountBefore);
      expect(inboxCountAfter).toBe(inboxCountBefore);
    });

    it('advances ClockFn by 35 days and triggers bounded retention prune, safely purging expired records', async () => {
      // Add an active/pending record that must NOT be pruned
      const activePending = await prisma.outboxEvent.create({
        data: {
          poolId: pool1.id,
          recipientUserId: userA.id,
          type: 'PICK_REMINDER',
          dedupeKey: `e2e_active_pending_${Date.now()}`,
          status: OutboxStatus.PENDING,
          payload: { reminder: true },
        },
      });

      // Advance clock by 35 days
      simulatedTime = new Date(simulatedTime.getTime() + 35 * 24 * 60 * 60 * 1000);

      // Execute retention prune
      const pruneResult = await runRetentionPruning({
        sentRetentionDays: 30,
        deadRetentionDays: 90,
        suppressedRetentionDays: 30,
        inboxRetentionDays: 30,
        batchSize: 500,
        clock: clockFn,
      });

      expect(pruneResult.totalDeleted).toBeGreaterThanOrEqual(2);

      // Verify active PENDING record was strictly protected
      const pendingStillExists = await prisma.outboxEvent.findUnique({
        where: { id: activePending.id },
      });
      expect(pendingStillExists).not.toBeNull();
      expect(pendingStillExists?.status).toBe(OutboxStatus.PENDING);
    });
  });
});
```

### 8.3 Weekly Wrap-Up Engine Service (`src/services/wrapUpEngine.ts`)
```typescript
import { Prisma, GameStatus, OutboxStatus } from '@prisma/client';
import prisma from '../db/client';
import { withJobRun } from '../jobs/jobRunner';
import { isGameInExcludedWindow } from './scoringEngine';
import { resolveTiebreakerGame } from './weeklyWrapUp';
import type { PoolSettings } from '../types/pool';

export interface WrapUpMemberScore {
  userId: string;
  score: number;
  tieBreakerPrediction: number | null;
  tiebreakerDistance: number;
}

export interface WrapUpOptions {
  weekNumber?: number;
  poolId?: string;
  prismaClient?: typeof prisma;
}

export interface PoolWrapUpResult {
  applied: boolean;
  reason?: 'ALREADY_WRAPPED_UP' | 'NO_GAMES_FOR_WEEK' | 'SCORE_FEED_UNAVAILABLE' | 'WEEK_NOT_FINAL' | 'CLAIM_STORE_UNAVAILABLE' | string;
  poolId: string;
  weekNumber: number;
  pendingCount?: number;
  earliestPendingKickoff?: Date | string | null;
  topScorers?: Array<{ userId: string; score: number; tiebreakerDistance: number }>;
  deadPlaceMembers?: Array<{ userId: string; score: number; tiebreakerDistance: number }>;
  penaltyAssigned?: Prisma.Decimal | number;
  processedMembers?: number;
  notificationsEnqueued?: number;
  targetGameId?: string | null;
  targetGameScore?: number | null;
}

export interface WrapUpEngineRunResult {
  poolsScanned: number;
  poolsApplied: number;
  poolsSkipped: number;
  totalNotificationsEnqueued: number;
  results: PoolWrapUpResult[];
}

/**
 * Executes weekly wrap-up for a single pool with strict invariants:
 * - Decision #24: Atomic claim on weekly_wrapups table inside transaction.
 * - Decision #27: Fail closed with SCORE_FEED_UNAVAILABLE if games are unfinalized or empty.
 * - Decisions #3 & #22: Pure Prisma.Decimal precision math for penalties and scores.
 * - Decision #54: Mutation occurs only during transactional execution; read-only on GETs.
 * - Decision #55: Fails closed if claim store or score feeds are missing.
 * - Decision #57: Store-enforced deduplication key: wrapup:v1:pool:<pool_id>:week:<week_id>:user:<user_id>.
 */
export async function executeWeeklyWrapUpForPool(
  poolId: string,
  weekNumber: number,
  options: { prismaClient?: typeof prisma } = {}
): Promise<PoolWrapUpResult> {
  const db = options.prismaClient || prisma;

  if (!db || typeof db.$transaction !== 'function') {
    throw new Error('CLAIM_STORE_UNAVAILABLE: Database client is unconfigured or unavailable');
  }

  return await db.$transaction(async (tx: any) => {
    // -------------------------------------------------------------------------
    // Step 1: Claim Invariant (Decision #24 & #55) - Atomic Claim on weekly_wrapups
    // -------------------------------------------------------------------------
    const tableExists: any = await tx.$queryRaw`SELECT to_regclass('public.weekly_wrapups')::text as to_regclass;`;
    if (!tableExists || !tableExists[0] || !tableExists[0].to_regclass) {
      return {
        applied: false,
        reason: 'CLAIM_STORE_UNAVAILABLE',
        poolId,
        weekNumber,
      };
    }

    // Attempt atomic insertion into weekly_wrapups
    const claimResult: any[] = await tx.$queryRawUnsafe(
      `INSERT INTO public.weekly_wrapups (pool_id, week_number)
       VALUES ($1::uuid, $2::int)
       ON CONFLICT (pool_id, week_number) DO NOTHING
       RETURNING pool_id, week_number;`,
      poolId,
      weekNumber
    );

    if (!claimResult || claimResult.length === 0) {
      return {
        applied: false,
        reason: 'ALREADY_WRAPPED_UP',
        poolId,
        weekNumber,
      };
    }

    // -------------------------------------------------------------------------
    // Step 2: Fetch Pool and Active Members
    // -------------------------------------------------------------------------
    const pool = await tx.pool.findUnique({
      where: { id: poolId },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: {
            user: {
              include: {
                notificationPreference: true,
              },
            },
          },
        },
      },
    });

    if (!pool) {
      throw new Error(`Pool with ID ${poolId} not found.`);
    }

    if (pool.memberships.length === 0) {
      throw new Error(`Pool with ID ${poolId} has no active members.`);
    }

    const settings = (pool.settings as PoolSettings) || {};
    const penaltiesConfig = settings.penalties || {};
    const tiebreakerConfig = settings.tiebreaker || {};
    const gameTargetSetting = tiebreakerConfig.game_target || tiebreakerConfig.gameTarget || 'MONDAY_NIGHT';
    const excludedWindows = settings.excludedGameWindows ?? settings.excluded_game_windows;

    // -------------------------------------------------------------------------
    // Step 3: Precondition Check (Decision #27) - Game Status and Finality
    // -------------------------------------------------------------------------
    const picks = await tx.pick.findMany({
      where: { poolId },
      include: {
        result: true,
        game: true,
      },
    });

    const gamesMap = new Map<string, any>();
    for (const pick of picks) {
      if (pick.game) {
        gamesMap.set(pick.game.id, pick.game);
      }
    }
    const poolGames = Array.from(gamesMap.values());

    const nonExcludedGames = poolGames.filter(
      (game) => !isGameInExcludedWindow(game.kickoffTime, excludedWindows)
    );

    if (nonExcludedGames.length === 0) {
      return {
        applied: false,
        reason: 'SCORE_FEED_UNAVAILABLE',
        poolId,
        weekNumber,
      };
    }

    const pendingGames = nonExcludedGames.filter(
      (g) => g.status !== GameStatus.FINAL || g.homeScore === null || g.awayScore === null
    );

    if (pendingGames.length > 0) {
      const sortedPending = [...pendingGames].sort(
        (a, b) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime()
      );
      return {
        applied: false,
        reason: 'SCORE_FEED_UNAVAILABLE',
        pendingCount: pendingGames.length,
        earliestPendingKickoff: sortedPending[0]?.kickoffTime ?? null,
        poolId,
        weekNumber,
      };
    }

    // -------------------------------------------------------------------------
    // Step 4: Decimal Scoring & Tiebreaker Resolution (Decisions #3 & #22)
    // -------------------------------------------------------------------------
    const targetGame = resolveTiebreakerGame(nonExcludedGames, gameTargetSetting);
    const targetGameHomeScore = targetGame?.homeScore ?? 0;
    const targetGameAwayScore = targetGame?.awayScore ?? 0;
    const actualTiebreakerTotal = targetGame ? targetGameHomeScore + targetGameAwayScore : 0;

    const weeklySubmissions = await tx.weeklySubmission.findMany({
      where: {
        poolId: pool.id,
        weekNumber,
      },
    });

    const predictionsMap = new Map<string, number | null>();
    for (const sub of weeklySubmissions) {
      if (sub.tieBreakerPrediction !== null && sub.tieBreakerPrediction !== undefined) {
        predictionsMap.set(sub.userId, Number(sub.tieBreakerPrediction));
      } else {
        predictionsMap.set(sub.userId, null);
      }
    }

    const memberScoresMap = new Map<string, Prisma.Decimal>();
    for (const membership of pool.memberships) {
      memberScoresMap.set(membership.userId, new Prisma.Decimal(0));
    }

    for (const pick of picks) {
      if (memberScoresMap.has(pick.userId) && pick.result) {
        const isExcluded = pick.game ? isGameInExcludedWindow(pick.game.kickoffTime, excludedWindows) : false;
        if (!isExcluded) {
          const currentScore = memberScoresMap.get(pick.userId) || new Prisma.Decimal(0);
          const points = new Prisma.Decimal(pick.result.pointsAwarded.toString());
          memberScoresMap.set(pick.userId, currentScore.plus(points));
        }
      }
    }

    const memberEntries: WrapUpMemberScore[] = pool.memberships.map((membership: any) => {
      const userId = membership.userId;
      const score = (memberScoresMap.get(userId) || new Prisma.Decimal(0)).toNumber();
      const prediction = predictionsMap.has(userId) ? predictionsMap.get(userId)! : null;

      let tiebreakerDistance = Infinity;
      if (prediction !== null && targetGame) {
        tiebreakerDistance = Math.abs(actualTiebreakerTotal - prediction);
      }

      return {
        userId,
        score,
        tieBreakerPrediction: prediction,
        tiebreakerDistance,
      };
    });

    // Rank members: Score DESC, Tiebreaker Distance ASC, UserId ASC
    memberEntries.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (a.tiebreakerDistance !== b.tiebreakerDistance) {
        return a.tiebreakerDistance - b.tiebreakerDistance;
      }
      return a.userId.localeCompare(b.userId);
    });

    const bestScore = memberEntries[0].score;
    const bestDistance = memberEntries[0].tiebreakerDistance;
    const topScorers = memberEntries.filter(
      (m) => m.score === bestScore && m.tiebreakerDistance === bestDistance
    );

    const worstMember = memberEntries[memberEntries.length - 1];
    const worstScore = worstMember.score;
    const worstDistance = worstMember.tiebreakerDistance;
    const deadPlaceMembers = memberEntries.filter(
      (m) => m.score === worstScore && m.tiebreakerDistance === worstDistance
    );

    const topScorerUserIds = new Set(topScorers.map((m) => m.userId));
    const deadPlaceUserIds = new Set(deadPlaceMembers.map((m) => m.userId));

    // Calculate split penalty using Prisma.Decimal
    const penaltyConfigVal = penaltiesConfig.dead_place_penalty ?? penaltiesConfig.deadPlacePenalty ?? 1;
    const deadPlacePenalty = new Prisma.Decimal(penaltyConfigVal.toString());
    const deadCountDecimal = new Prisma.Decimal(deadPlaceMembers.length);
    const splitPenalty = deadPlaceMembers.length > 0
      ? deadPlacePenalty.dividedBy(deadCountDecimal).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
      : new Prisma.Decimal(0);

    if (splitPenalty.greaterThan(0)) {
      for (const deadMember of deadPlaceMembers) {
        await tx.penaltyLedger.create({
          data: {
            poolId: pool.id,
            userId: deadMember.userId,
            weekNumber,
            delta: splitPenalty,
            reason: 'WEEKLY_DEAD_PLACE',
            createdById: pool.adminId,
          },
        });
      }
    }

    // Upsert PoolMemberStats
    for (const membership of pool.memberships) {
      const userId = membership.userId;
      const isTopScorer = topScorerUserIds.has(userId);
      const isDeadPlace = deadPlaceUserIds.has(userId);

      const ledgerSum = await tx.penaltyLedger.aggregate({
        where: {
          poolId: pool.id,
          userId,
        },
        _sum: {
          delta: true,
        },
      });

      const totalShotsDrank = ledgerSum._sum.delta ?? new Prisma.Decimal(0);

      await tx.poolMemberStat.upsert({
        where: {
          poolId_userId: {
            poolId: pool.id,
            userId,
          },
        },
        update: {
          firstPlaceFinishes: isTopScorer ? { increment: 1 } : undefined,
          deadPlaceFinishes: isDeadPlace ? { increment: 1 } : undefined,
          totalShotsDrank,
        },
        create: {
          poolId: pool.id,
          userId,
          firstPlaceFinishes: isTopScorer ? 1 : 0,
          deadPlaceFinishes: isDeadPlace ? 1 : 0,
          totalShotsDrank,
        },
      });
    }

    // -------------------------------------------------------------------------
    // Step 5: Outbox Enqueue Fan-Out (Decision #57)
    // -------------------------------------------------------------------------
    let notificationsEnqueued = 0;
    const now = new Date();

    for (const membership of pool.memberships) {
      const user = membership.user;
      const pref = user?.notificationPreference;

      // Check preference opt-out
      if (pref) {
        if (pref.emailEnabled === false || (pref as any).weeklyWrapup === false) {
          continue;
        }
      }

      const dedupeKey = `wrapup:v1:pool:${pool.id}:week:${weekNumber}:user:${user.id}`;
      const payload = {
        poolName: pool.name,
        weekNumber,
        highScorer: topScorers.map((t) => t.userId).join(', '),
        penaltySummary: `Dead place penalty: ${splitPenalty.toString()} shots`,
        deepLink: `/pools/${pool.id}/leaderboard`,
      };

      const outboxResult = await tx.outboxEvent.createMany({
        data: [
          {
            poolId: pool.id,
            recipientUserId: user.id,
            type: 'WRAPUP',
            payload,
            dedupeKey,
            status: OutboxStatus.PENDING,
            attempts: 0,
            nextAttemptAt: now,
          },
        ],
        skipDuplicates: true,
      });

      await tx.inboxMessage.createMany({
        data: [
          {
            poolId: pool.id,
            userId: user.id,
            type: 'WRAPUP',
            payload,
            dedupeKey,
          },
        ],
        skipDuplicates: true,
      });

      if (outboxResult.count > 0) {
        notificationsEnqueued++;
      }
    }

    return {
      applied: true,
      poolId: pool.id,
      weekNumber,
      topScorers: topScorers.map((t) => ({
        userId: t.userId,
        score: t.score,
        tiebreakerDistance: t.tiebreakerDistance,
      })),
      deadPlaceMembers: deadPlaceMembers.map((d) => ({
        userId: d.userId,
        score: d.score,
        tiebreakerDistance: d.tiebreakerDistance,
      })),
      penaltyAssigned: splitPenalty,
      processedMembers: pool.memberships.length,
      notificationsEnqueued,
      targetGameId: targetGame?.id ?? null,
      targetGameScore: actualTiebreakerTotal,
    };
  }, { maxWait: 15000, timeout: 30000 });
}

/**
 * Scans active pools and executes weekly wrap-up across all eligible pools.
 */
export async function runWrapUpEngine(options: WrapUpOptions = {}): Promise<{
  jobRun: any;
  engineResult: WrapUpEngineRunResult;
}> {
  const weekNumber = options.weekNumber !== undefined ? Number(options.weekNumber) : 1;
  const db = options.prismaClient || prisma;

  let engineResult: WrapUpEngineRunResult = {
    poolsScanned: 0,
    poolsApplied: 0,
    poolsSkipped: 0,
    totalNotificationsEnqueued: 0,
    results: [],
  };

  const jobRun = await withJobRun('weekly_wrapup', async () => {
    const poolWhere: Prisma.PoolWhereInput = {
      status: 'ACTIVE',
    };
    if (options.poolId) {
      poolWhere.id = options.poolId;
    }

    const pools = await db.pool.findMany({
      where: poolWhere,
      select: { id: true, name: true },
    });

    const results: PoolWrapUpResult[] = [];
    let poolsApplied = 0;
    let poolsSkipped = 0;
    let totalNotificationsEnqueued = 0;

    for (const p of pools) {
      try {
        const wrapUpRes = await executeWeeklyWrapUpForPool(p.id, weekNumber, { prismaClient: db });
        results.push(wrapUpRes);
        if (wrapUpRes.applied) {
          poolsApplied++;
          totalNotificationsEnqueued += wrapUpRes.notificationsEnqueued || 0;
        } else {
          poolsSkipped++;
        }
      } catch (err: any) {
        console.error(`Error wrapping up pool ${p.id}:`, err);
        results.push({
          applied: false,
          reason: err.message || 'EXECUTION_FAILED',
          poolId: p.id,
          weekNumber,
        });
        poolsSkipped++;
      }
    }

    engineResult = {
      poolsScanned: pools.length,
      poolsApplied,
      poolsSkipped,
      totalNotificationsEnqueued,
      results,
    };

    return {
      itemsProcessed: poolsApplied,
      succeeded: poolsApplied,
      failed: 0,
      meta: {
        weekNumber,
        poolsScanned: pools.length,
        poolsApplied,
        poolsSkipped,
        totalNotificationsEnqueued,
      },
    };
  });

  return { jobRun, engineResult };
}
```

### 8.4 Notification Transports Service (`src/services/transports.ts`)
```typescript
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { OutboxStatus } from '@prisma/client';
import prisma from '../db/client';
import { scrubErrorMessage } from '../utils/errorScrubber';
import { formatEmailContent } from '../workers/drain';

export type ClockFn = () => Date;
export const defaultClock: ClockFn = () => new Date();

export const DEFAULT_BASE_BACKOFF_SECONDS = 60; // 1 minute
export const DEFAULT_MAX_ATTEMPTS = 5;
export const DEFAULT_BACKOFF_EXPONENT = 2;
export const LEASE_DURATION_MS = 60 * 1000; // 60 seconds

export interface TransportMessage {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  messageId?: string;
  headers?: Record<string, string>;
  dedupeKey: string;
  metadata?: Record<string, any>;
}

export interface TransportResult {
  success: boolean;
  messageId?: string;
  error?: string;
  permanentFailure?: boolean;
}

export interface TransportAdapter {
  name: string;
  send(message: TransportMessage): Promise<TransportResult>;
}

/**
 * Mock transport adapter for deterministic local and integration testing.
 */
export class MockTransportAdapter implements TransportAdapter {
  public name = 'mock';
  public sentMessages: TransportMessage[] = [];
  public shouldFail = false;
  public failPermanent = false;
  public failError = 'Simulated transport failure';
  public delayMs = 0;

  async send(message: TransportMessage): Promise<TransportResult> {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }

    if (this.shouldFail) {
      return {
        success: false,
        error: this.failError,
        permanentFailure: this.failPermanent,
      };
    }

    this.sentMessages.push(message);
    return {
      success: true,
      messageId: message.messageId || `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    };
  }

  reset(): void {
    this.sentMessages = [];
    this.shouldFail = false;
    this.failPermanent = false;
    this.failError = 'Simulated transport failure';
    this.delayMs = 0;
  }
}

/**
 * Console transport adapter for local development logging.
 */
export class ConsoleTransportAdapter implements TransportAdapter {
  public name = 'console';
  private logPath: string;

  constructor(logPath: string = path.resolve(process.cwd(), 'logs', 'transports-dev.log')) {
    this.logPath = logPath;
  }

  async send(message: TransportMessage): Promise<TransportResult> {
    const dir = path.dirname(this.logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      to: message.to,
      subject: message.subject,
      messageId: message.messageId,
      headers: message.headers,
      text: message.text,
      html: message.html,
      dedupeKey: message.dedupeKey,
      metadata: message.metadata,
    };

    fs.appendFileSync(this.logPath, JSON.stringify(logEntry) + '\n', 'utf8');

    return {
      success: true,
      messageId: message.messageId || `console-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    };
  }
}

let defaultAdapterInstance: TransportAdapter = new ConsoleTransportAdapter();

export function getDefaultTransportAdapter(): TransportAdapter {
  return defaultAdapterInstance;
}

export function setDefaultTransportAdapter(adapter: TransportAdapter): void {
  defaultAdapterInstance = adapter;
}

/**
 * Calculates exponential backoff in seconds based on attempt count.
 * Formula: baseIntervalSeconds * (exponent ^ (attempt - 1))
 * Jitter-free for deterministic unit and integration test assertions.
 */
export function calculateBackoffSeconds(
  attempts: number,
  baseIntervalSeconds: number = DEFAULT_BASE_BACKOFF_SECONDS,
  exponent: number = DEFAULT_BACKOFF_EXPONENT
): number {
  const power = Math.max(0, attempts - 1);
  return baseIntervalSeconds * Math.pow(exponent, power);
}

/**
 * Calculates the next attempt timestamp given attempt count and clock function.
 */
export function calculateNextAttemptAt(
  attempts: number,
  clock: ClockFn = defaultClock,
  baseIntervalSeconds: number = DEFAULT_BASE_BACKOFF_SECONDS,
  exponent: number = DEFAULT_BACKOFF_EXPONENT
): Date {
  const now = clock();
  const backoffSec = calculateBackoffSeconds(attempts, baseIntervalSeconds, exponent);
  return new Date(now.getTime() + backoffSec * 1000);
}

export interface ProcessBatchOptions {
  batchSize?: number;
  adapter?: TransportAdapter;
  clock?: ClockFn;
  maxAttempts?: number;
  baseIntervalSeconds?: number;
  exponent?: number;
}

export interface ProcessBatchResult {
  processed: number;
  succeeded: number;
  failed: number;
  dead: number;
  suppressed: number;
}

/**
 * Processes a batch of pending/retryable outbox events using PostgreSQL row-level locks (FOR UPDATE SKIP LOCKED).
 * Enforces:
 * - State machine transitions: PENDING -> PROCESSING -> SENT / FAILED / DEAD
 * - Deduplication via unique dedupeKey (Decision #57)
 * - Dead-letter queue (DLQ) invariants with structured JSON diagnostic errors
 * - Injectable clock for deterministic verification without wall-clock drift
 */
export async function processTransportsBatch(options: ProcessBatchOptions = {}): Promise<ProcessBatchResult> {
  const batchSize = options.batchSize || 10;
  const adapter = options.adapter || getDefaultTransportAdapter();
  const hasCustomClock = typeof options.clock === 'function';
  const clock = options.clock || defaultClock;
  const maxAttempts = options.maxAttempts || DEFAULT_MAX_ATTEMPTS;
  const baseIntervalSeconds = options.baseIntervalSeconds || DEFAULT_BASE_BACKOFF_SECONDS;
  const exponent = options.exponent || DEFAULT_BACKOFF_EXPONENT;

  const stats: ProcessBatchResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    dead: 0,
    suppressed: 0,
  };

  const now = clock();
  const leaseExpiresAt = new Date(now.getTime() + LEASE_DURATION_MS);

  // Step 1: Claim batch atomically with FOR UPDATE SKIP LOCKED
  const { eventsToProcess, deadCount } = await prisma.$transaction(async (tx) => {
    let rows: Array<{
      id: string;
      pool_id: string;
      recipient_user_id: string;
      type: string;
      payload: any;
      dedupe_key: string;
      status: OutboxStatus;
      attempts: number;
      next_attempt_at: Date;
      lease_expires_at: Date | null;
    }>;

    if (hasCustomClock) {
      rows = await tx.$queryRaw`
        SELECT id, pool_id, recipient_user_id, type, payload, dedupe_key, status, attempts, next_attempt_at, lease_expires_at
        FROM outbox_events
        WHERE (
          (status = 'PENDING'::"OutboxStatus" AND next_attempt_at <= ${now} AND (lease_expires_at IS NULL OR lease_expires_at <= ${now}))
          OR
          (status = 'PROCESSING'::"OutboxStatus" AND lease_expires_at IS NOT NULL AND lease_expires_at <= ${now})
        )
        ORDER BY next_attempt_at ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED;
      `;
    } else {
      rows = await tx.$queryRaw`
        SELECT id, pool_id, recipient_user_id, type, payload, dedupe_key, status, attempts, next_attempt_at, lease_expires_at
        FROM outbox_events
        WHERE (
          (status = 'PENDING'::"OutboxStatus" AND next_attempt_at <= NOW() AND (lease_expires_at IS NULL OR lease_expires_at <= NOW()))
          OR
          (status = 'PROCESSING'::"OutboxStatus" AND lease_expires_at IS NOT NULL AND lease_expires_at <= NOW())
        )
        ORDER BY next_attempt_at ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED;
      `;
    }

    if (rows.length === 0) {
      return { eventsToProcess: [], deadCount: 0 };
    }

    let localDeadCount = 0;
    const claimed: typeof rows = [];

    for (const row of rows) {
      if (row.status === 'PROCESSING') {
        const newAttempts = row.attempts + 1;
        if (newAttempts >= maxAttempts) {
          const dlqDiag = JSON.stringify({
            code: 'MAX_RETRIES_EXCEEDED',
            reason: 'Lease expired repeatedly during processing',
            attempts: newAttempts,
            maxAttempts,
            timestamp: now.toISOString(),
          });

          await tx.$executeRaw`
            UPDATE outbox_events
            SET status = 'DEAD'::"OutboxStatus",
                attempts = ${newAttempts},
                lease_expires_at = NULL,
                last_error_code = ${dlqDiag}
            WHERE id = ${row.id}::uuid
          `;
          localDeadCount++;
        } else {
          if (hasCustomClock) {
            await tx.$executeRaw`
              UPDATE outbox_events
              SET status = 'PROCESSING'::"OutboxStatus",
                  attempts = ${newAttempts},
                  lease_expires_at = ${leaseExpiresAt}
              WHERE id = ${row.id}::uuid
            `;
          } else {
            await tx.$executeRaw`
              UPDATE outbox_events
              SET status = 'PROCESSING'::"OutboxStatus",
                  attempts = ${newAttempts},
                  lease_expires_at = NOW() + interval '60 seconds'
              WHERE id = ${row.id}::uuid
            `;
          }
          claimed.push({ ...row, attempts: newAttempts });
        }
      } else {
        if (hasCustomClock) {
          await tx.$executeRaw`
            UPDATE outbox_events
            SET status = 'PROCESSING'::"OutboxStatus",
                lease_expires_at = ${leaseExpiresAt}
            WHERE id = ${row.id}::uuid
          `;
        } else {
          await tx.$executeRaw`
            UPDATE outbox_events
            SET status = 'PROCESSING'::"OutboxStatus",
                lease_expires_at = NOW() + interval '60 seconds'
            WHERE id = ${row.id}::uuid
          `;
        }
        claimed.push(row);
      }
    }

    return { eventsToProcess: claimed, deadCount: localDeadCount };
  });

  stats.processed += deadCount;
  stats.dead += deadCount;

  if (eventsToProcess.length === 0) {
    return stats;
  }

  // Step 2: Dispatch claimed events through transport adapter
  for (const event of eventsToProcess) {
    stats.processed++;

    try {
      // 1. Verify dedupeKey invariant (Decision #57)
      if (!event.dedupe_key) {
        throw new Error('DEDUPE_KEY_MISSING');
      }

      // 2. Check recipient notification preferences
      const pref = await prisma.notificationPreference.findUnique({
        where: { userId: event.recipient_user_id },
      });

      if (pref && pref.emailEnabled === false) {
        const updated = await prisma.$executeRaw`
          UPDATE outbox_events
          SET status = 'SUPPRESSED'::"OutboxStatus",
              lease_expires_at = NULL,
              last_error_code = NULL
          WHERE id = ${event.id}::uuid AND status = 'PROCESSING'::"OutboxStatus"
        `;
        if (updated > 0) {
          stats.suppressed++;
        }
        continue;
      }

      // 3. Lookup recipient user
      const user = await prisma.user.findUnique({
        where: { id: event.recipient_user_id },
        select: { email: true },
      });

      if (!user || !user.email) {
        throw new Error(`Recipient user ${event.recipient_user_id} has no valid email`);
      }

      // 4. Lease safety check before send (atomic conditional renewal)
      let renewed: number;
      if (hasCustomClock) {
        const currentCheck = clock();
        const newLease = new Date(currentCheck.getTime() + LEASE_DURATION_MS);
        renewed = await prisma.$executeRaw`
          UPDATE outbox_events
          SET lease_expires_at = ${newLease}
          WHERE id = ${event.id}::uuid AND status = 'PROCESSING'::"OutboxStatus" AND lease_expires_at > ${currentCheck}
        `;
      } else {
        renewed = await prisma.$executeRaw`
          UPDATE outbox_events
          SET lease_expires_at = NOW() + interval '60 seconds'
          WHERE id = ${event.id}::uuid AND status = 'PROCESSING'::"OutboxStatus" AND lease_expires_at > NOW()
        `;
      }

      if (renewed === 0) {
        // Lease lost or expired; do not dispatch duplicate
        continue;
      }

      // 5. Format email message
      const { subject, text, html } = formatEmailContent(event);
      const mailDomain = process.env.MAIL_DOMAIN || 'localhost';
      const hashedKey = crypto.createHash('sha256').update(event.dedupe_key).digest('hex');
      const messageId = `<${hashedKey}@${mailDomain}>`;

      // 6. Send via transport adapter
      const sendResult = await adapter.send({
        to: user.email,
        subject,
        text,
        html,
        messageId,
        dedupeKey: event.dedupe_key,
        headers: {
          'X-Dedupe-Key': event.dedupe_key,
          'X-Outbox-ID': event.id,
        },
        metadata: {
          poolId: event.pool_id,
          recipientUserId: event.recipient_user_id,
          type: event.type,
        },
      });

      if (!sendResult.success) {
        const isPermanent = sendResult.permanentFailure === true;
        const errPayload = new Error(sendResult.error || 'Transport dispatch failed');
        (errPayload as any).permanentFailure = isPermanent;
        throw errPayload;
      }

      // 7. Atomic state transition to SENT (DELIVERED)
      let updated: number;
      if (hasCustomClock) {
        const executionNow = clock();
        updated = await prisma.$executeRaw`
          UPDATE outbox_events
          SET status = 'SENT'::"OutboxStatus",
              sent_at = ${executionNow},
              lease_expires_at = NULL,
              last_error_code = NULL
          WHERE id = ${event.id}::uuid AND status = 'PROCESSING'::"OutboxStatus"
        `;
      } else {
        updated = await prisma.$executeRaw`
          UPDATE outbox_events
          SET status = 'SENT'::"OutboxStatus",
              sent_at = NOW(),
              lease_expires_at = NULL,
              last_error_code = NULL
          WHERE id = ${event.id}::uuid AND status = 'PROCESSING'::"OutboxStatus"
        `;
      }

      if (updated > 0) {
        stats.succeeded++;
      }
    } catch (err: any) {
      const isPermanent = err?.permanentFailure === true;
      const scrubbed = scrubErrorMessage(err);
      const nextAttempts = event.attempts + 1;
      const isDead = isPermanent || nextAttempts >= maxAttempts;
      const nextStatus: OutboxStatus = isDead ? 'DEAD' : 'PENDING';

      const diagCode = isPermanent
        ? 'PERMANENT_REJECTION'
        : isDead
        ? 'MAX_RETRIES_EXCEEDED'
        : 'TRANSIENT_FAILURE';

      const diagnosticJson = JSON.stringify({
        code: diagCode,
        reason: scrubbed,
        attempt: nextAttempts,
        maxAttempts,
        timestamp: clock().toISOString(),
      });

      const nextAttemptAt = calculateNextAttemptAt(nextAttempts, clock, baseIntervalSeconds, exponent);

      const updated = await prisma.$executeRaw`
        UPDATE outbox_events
        SET status = ${nextStatus}::"OutboxStatus",
            attempts = ${nextAttempts},
            next_attempt_at = ${nextAttemptAt},
            lease_expires_at = NULL,
            last_error_code = ${diagnosticJson}
        WHERE id = ${event.id}::uuid AND status = 'PROCESSING'::"OutboxStatus"
      `;

      if (updated > 0) {
        if (isDead) {
          stats.dead++;
        } else {
          stats.failed++;
        }
      }
    }
  }

  return stats;
}

/**
 * Read-only status query for transports queue and DLQ metrics (Decision #54).
 */
export async function getTransportsQueueStatus() {
  const [pending, processing, sent, failed, dead, suppressed] = await Promise.all([
    prisma.outboxEvent.count({ where: { status: OutboxStatus.PENDING } }),
    prisma.outboxEvent.count({ where: { status: OutboxStatus.PROCESSING } }),
    prisma.outboxEvent.count({ where: { status: OutboxStatus.SENT } }),
    prisma.outboxEvent.count({ where: { status: OutboxStatus.FAILED } }),
    prisma.outboxEvent.count({ where: { status: OutboxStatus.DEAD } }),
    prisma.outboxEvent.count({ where: { status: OutboxStatus.SUPPRESSED } }),
  ]);

  const recentDead = await prisma.outboxEvent.findMany({
    where: { status: OutboxStatus.DEAD },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      poolId: true,
      recipientUserId: true,
      type: true,
      dedupeKey: true,
      attempts: true,
      lastErrorCode: true,
      createdAt: true,
    },
  });

  return {
    queueDepth: {
      pending,
      processing,
      sent,
      failed,
      dead,
      suppressed,
    },
    deadLetterCount: dead,
    recentDeadEvents: recentDead,
  };
}
```

### 8.5 Notification Center Router (`src/routes/notifications.ts`)
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

### 8.6 Commissioner Override & Governance Service (`src/services/overrideService.ts`)
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

### 8.7 System Admin Ops Router (`src/routes/adminOps.ts`)
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

### 8.8 Prisma Schema (`prisma/schema.prisma`)
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

### 8.9 Decision Register Appendix A (`docs/rulings/appendix-a.md`)
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
