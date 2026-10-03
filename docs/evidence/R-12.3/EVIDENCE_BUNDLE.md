# TWO-STAGE EVIDENCE BINDING RECORD (PATH B — GOVERNED)
- **Execution Baseline SHA (E_SHA):** 81effd459a049b28cc43c3e231583aac11a3ad2e
- **Binding Container Target:** HEAD (Target for binding commit)
- **Lineage Verification:** PARENT_VERIFIED (Parent commit of binding container is guaranteed to be 81effd459a049b28cc43c3e231583aac11a3ad2e)
- **Baseline Working Tree:** 100% CLEAN (0 modified, 0 untracked)
- **Governing Standard:** ARCHITECTURE.md (Two-Stage Forward-Binding Evidence Protocol)
--------------------------------------------------------------------------------

# MILESTONE 12.3 EVIDENCE BUNDLE: NOTIFICATION TRANSPORTS, EXPONENTIAL BACKOFF & WEBHOOK INGRESS
**Execution Timestamp:** 2026-10-03T02:23:04.362Z
**Target Branch:** `feat/phase12-3-transports`
**Execution Baseline SHA:** `81effd459a049b28cc43c3e231583aac11a3ad2e`
**Generator Exit Code:** 0

---

## 1. Acceptance Matrix
### Milestone 12.3 Acceptance Matrix
- 12.3.1 (Pluggable Transport Interface & Adapters): PASS
- 12.3.2 (Exponential Backoff & Injectable ClockFn Determinism): PASS
- 12.3.3 (Atomic State Transitions & Dead-Letter Queue Invariant): PASS
- 12.3.4 (Decision #57 Outbox Deduplication & Message-ID SHA-256): PASS
- 12.3.5 (Webhook Ingress Gateway & HMAC SHA-256 Verification): PASS
- 12.3.6 (Decision #54 Side-Effect Free GETs on Webhooks & Admin Ops): PASS
- 12.3.7 (Decision #55 Fail-Closed Database Fault Tolerance on Webhooks): PASS
- 12.3.8 (Decision #20 Tier Separation: Admin Ops vs Pool Commissioner): PASS
- 12.3.9 (Full Database Test Suite 182/182 Passing with Clean Rehearsal DB): PASS

---

## 2. Item 1: Git Identity & Ancestry

### 2.1 Branch & Commit Identification
- **Active Branch:** `feat/phase12-3-transports`
- **Execution Baseline SHA:** `81effd459a049b28cc43c3e231583aac11a3ad2e`

### 2.2 Working Tree Status at Baseline
```
?? scripts/generate_evidence_12_3.js
```

### 2.3 Git Log Ancestry (Milestone 12.3 Commit Lineage)
```
81effd4 feat(phase12-3): implement notification transports, retry backoff, and webhook ingress
9345cfb docs: author Milestone 12.3 Notification Transports & Webhooks design specification
3eea715 Merge pull request #3 from jdubciii/feat/phase12-2-wrapup-engine
f728d1f docs: bind Section 9 verification bundle for Milestone 12.2
7d84860 feat(phase12-2): implement weekly wrap-up engine, overrides, and season seal
50b7614 docs: author Milestone 12.2 Wrap-Up Engine paper design specification
97a72e7 Merge pull request #2 from jdubciii/feat/phase12-1e-reminder-scanner
d77c219 docs: bind Section 9 verification bundle for Milestone 12.1-E
6ec29ba feat(phase12-1e): implement Automated Reminder Scanner engine and system route
8b6c758 docs: author Milestone 12.1-E Reminder Scanner design specification
45df406 Merge pull request #1 from jdubciii/feat/phase12-1-outbox
d3b7e8a docs: create binding container B_SHA for Section 9 verification bundle
0b1db1d chore: align Section 9 evidence generator to baseline E_SHA
05b03bb docs: finalize machine-verified Path B binding record for R-12.1-RESTORE-01
3c8e419 docs: stage Section 9 verification bundle at baseline 010610eccc0b4ec88731f11205636e24a19153ba
```

---

## 3. Item 2: Merge Base & Diffstat Against Main

### 3.1 Merge Base vs `main`
- **Merge Base SHA:** `3eea71533aefd3d226dab973524cca6948ae8e48`

### 3.2 Diffstat (`git diff --stat main...HEAD`)
```
docs/design/12.3.md        |  37 ++++
 src/routes/adminOps.ts     |  53 +++++
 src/routes/webhooks.ts     | 192 ++++++++++++++++
 src/server.ts              |   2 +
 src/services/transports.ts | 529 +++++++++++++++++++++++++++++++++++++++++++++
 tests/transports.test.ts   | 427 ++++++++++++++++++++++++++++++++++++
 tests/webhooks.test.ts     | 267 +++++++++++++++++++++++
 7 files changed, 1507 insertions(+)
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
│ 0       │ '20260927000000_init'                                       │ 2026-10-03T02:23:12.153Z │
│ 1       │ '20260928051824_add_pool_member_stats_and_penalty_ledger'   │ 2026-10-03T02:23:12.213Z │
│ 2       │ '20260928124900_precision_and_weekly_submissions'           │ 2026-10-03T02:23:12.278Z │
│ 3       │ '20260928170000_weekly_submission_finalized_and_game_notes' │ 2026-10-03T02:23:12.283Z │
│ 4       │ '20260928180000_shot_cam_penalty_media_and_rls'             │ 2026-10-03T02:23:12.326Z │
│ 5       │ '20260929144500_br_1_ledger_append_only'                    │ 2026-10-03T02:23:12.332Z │
│ 6       │ '20260930010000_br_2b_ledger_api_lockdown'                  │ 2026-10-03T02:23:12.336Z │
│ 7       │ '20260930020000_br_2c_public_tables_api_lockdown'           │ 2026-10-03T02:23:12.344Z │
│ 8       │ '20261001160000_12_1_a_outbox_inbox_core'                   │ 2026-10-03T02:23:12.441Z │
└─────────┴─────────────────────────────────────────────────────────────┴──────────────────────────┘
weekly_wrapups exists in public: false (Expected: false)
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "pickem_rehearsal", schema "public" at "localhost:5432"

9 migrations found in prisma/migrations


No pending migrations to apply.
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma

✔ Generated Prisma Client (v5.22.0) to .\node_modules\@prisma\client in 292ms

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
    "started_at": "2026-10-03T02:23:12.099Z",
    "finished_at": "2026-10-03T02:23:12.153Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928051824_add_pool_member_stats_and_penalty_ledger",
    "started_at": "2026-10-03T02:23:12.154Z",
    "finished_at": "2026-10-03T02:23:12.213Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928124900_precision_and_weekly_submissions",
    "started_at": "2026-10-03T02:23:12.213Z",
    "finished_at": "2026-10-03T02:23:12.278Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928170000_weekly_submission_finalized_and_game_notes",
    "started_at": "2026-10-03T02:23:12.279Z",
    "finished_at": "2026-10-03T02:23:12.283Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928180000_shot_cam_penalty_media_and_rls",
    "started_at": "2026-10-03T02:23:12.284Z",
    "finished_at": "2026-10-03T02:23:12.326Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260929144500_br_1_ledger_append_only",
    "started_at": "2026-10-03T02:23:12.327Z",
    "finished_at": "2026-10-03T02:23:12.332Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260930010000_br_2b_ledger_api_lockdown",
    "started_at": "2026-10-03T02:23:12.333Z",
    "finished_at": "2026-10-03T02:23:12.336Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260930020000_br_2c_public_tables_api_lockdown",
    "started_at": "2026-10-03T02:23:12.337Z",
    "finished_at": "2026-10-03T02:23:12.344Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20261001160000_12_1_a_outbox_inbox_core",
    "started_at": "2026-10-03T02:23:12.345Z",
    "finished_at": "2026-10-03T02:23:12.441Z",
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
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 400 when pool_id query parameter is missing or malformed 12ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 404 when pool does not exist 51ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 403 when user is not the pool commissioner 11ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 200 and game slate snapshot when user is the verified commissioner 28ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 401 when Authorization header is missing 27ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 400 when pool_id is missing or malformed in request body 9ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 404 when pool does not exist in request body 5ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 403 when user is not the pool commissioner 6ms
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
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403 7ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > verifies zero penalty_media rows exist after denied upload attempts 2ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: penalty OWNER -> 201 success 14ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403 6ms
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

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write) 18ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write) 7ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 400 when explicit pool_id is not a valid UUID (no pool write) 5ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 403 when user is not a member or commissioner of the requested pool (no pool write) 7ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot 33ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > Decision #49: CI Route Scan & Route Guard Verification > verifies all routes with pool parameters are guarded; only /api/health and GET /api/admin/users allowlisted 1ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 401 when unauthenticated on GET health and POST retry 49ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 400 when pool_id is not a valid UUID 8ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 404 when pool does not exist 59ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 403 when authenticated user is a regular pool member (not commissioner) 11ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 403 when authenticated user is not a member of the pool 10ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 2. GET /api/pools/:pool_id/ops/health > returns accurate telemetry and is strictly read-only (Decision #54) 141ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 2. GET /api/pools/:pool_id/ops/health > strictly isolates pool telemetry with zero cross-pool leakage 19ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 3. POST /api/pools/:pool_id/ops/outbox/retry > retries only DEAD/FAILED outbox events for the specified pool, resetting attempts and lease 52ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 3. POST /api/pools/:pool_id/ops/outbox/retry > retries a specific event when outboxId is provided 22ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > strips database URLs, API keys, passwords, tokens and truncates to 200 chars 100ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > preserves key names for passwords and tokens while redacting values 11ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > scrubs ECONNREFUSED host:port patterns 6ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > handles extremely long error messages by truncating to 200 chars 7ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Console Mail Transport > appends formatted json logs to outbox-dev.log 10ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > SMTP Mail Transport & Timeouts > throws error on construction if MAIL_TRANSPORT=smtp and SMTP_FROM is missing 9ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > SMTP Mail Transport & Timeouts > fake hanging SMTP transporter times out and maps to error failure 7ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > HTML Escaping & Message-ID SHA256 > HTML escaping verification for interpolated markup in pool names and fields 109ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > HTML Escaping & Message-ID SHA256 > Message-ID SHA256 stability across executions 19ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > drains pending outbox event, sets status SENT and records sentAt 83ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > sets status SUPPRESSED when user email preference is disabled 86ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > applies discrete backoff schedule on transport failure 51ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > transitions to DEAD on 5th failure 29ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > Event repeatedly crashing during worker processing increments attempts to 5 and transitions to DEAD 16ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > Two concurrent workers with slow fake transport never duplicate sends (conditional renewal test) 84ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > creates JobRun with RUNNING and transitions to OK with itemsProcessed 44ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > records FAILED status and scrubbed errorCode when job execution throws 10ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > transitions to PARTIAL status when succeeded > 0 and failed + dead > 0 13ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > database write failure does not fail or abort the underlying job execution 15ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > runOutboxDrain integrates with withJobRun 30ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > returns 401 when unauthenticated 42ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > returns inbox messages for authenticated user in descending order (Decision #54 compliant) 135ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > supports unreadOnly filter and poolId filter 26ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 2. POST /api/me/inbox/:id/read > returns 401 when unauthenticated 4ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 2. POST /api/me/inbox/:id/read > returns 404 when message belongs to another user (ownership isolation) 12ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 2. POST /api/me/inbox/:id/read > marks single message read successfully and is idempotent 32ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 3. POST /api/me/inbox/read-all > returns 401 when unauthenticated 2ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 3. POST /api/me/inbox/read-all > marks all unread messages for the user as read 31ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > returns 401 when unauthenticated 4ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > returns default preferences on GET before upsert without mutating DB (Decision #54) 8ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > rejects invalid reminderOffsetsHours payloads with 400 13ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > updates valid preferences successfully 15ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > GET /api/notifications/unsubscribe validates token without modifying DB (Decision #54) 6ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > GET /api/notifications/unsubscribe returns 400 on malformed token and 404 on unknown token 4ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > POST /api/notifications/unsubscribe disables email without deleting row 11ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 1. Precondition Check & Fail Closed (Decision #27 & #55) > fails closed with SCORE_FEED_UNAVAILABLE when unfinalized games exist for target week 95ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 1. Precondition Check & Fail Closed (Decision #27 & #55) > fails closed when DB client or claim store is unreachable (Decision #55) 3ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 2. Precision Decimal Scoring & Split Penalties (Decisions #3 & #22) > calculates standings and splits dead place penalty precisely between tied losers 121ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 3. Claim Store Concurrency & Idempotency (Decision #24 & #57) > subsequent execution on already wrapped week returns ALREADY_WRAPPED_UP and produces 0 duplicates 5ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 3. Claim Store Concurrency & Idempotency (Decision #24 & #57) > enforces outbox notification preferences and deduplication key (Decision #57) 10ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/wrap-up is rejected for standard users and pool commissioners (Decision #20) 61ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/wrap-up succeeds for system ADMIN 24ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > GET /api/admin/ops/wrap-up/status is strictly read-only (Decision #54) 6ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/season-seal records immutable snapshot 46ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 1. Idempotency & Outbox Enqueue Invariants > enqueues outbox reminder for member with unsubmitted picks and deduplicates subsequent runs 97ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 2. User Notification Preferences Enforcement > skips users who have opted out of email / pick reminders (generates 0 outbox events) 3ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 2. User Notification Preferences Enforcement > skips members who have already submitted picks for all upcoming games in the window 19ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 3. Injectable Clock Time-Window Boundary Testing > moving clock forward cleanly transitions games in and out of windows without real-time delay 26ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects unauthenticated requests to POST /api/admin/ops/scan-reminders with 401 58ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects standard users from triggering reminder scan with 403 (Decision #20) 5ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects pool commissioners who lack global ADMIN role with 403 (Decision #20) 5ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > allows global ADMIN to trigger reminder scan via POST with 200 26ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > Decision #54 & Invariant: GET /api/admin/ops/scan-reminders/status is strictly read-only 16ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > aborts and fails closed when database client is unconfigured or throws 4ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > withJobRun tracks failure and returns FAILED status upon unexpected error 11ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 1. Exponential Backoff & Injectable Clock Unit Tests > calculates deterministic exponential backoff intervals without jitter or drift 20ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 1. Exponential Backoff & Injectable Clock Unit Tests > injectable ClockFn allows instant time progression without setTimeout 4ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > successful transport delivery transitions status PENDING -> PROCESSING -> SENT 36ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > transient failure increments attempts, records diagnostic JSON and sets future backoff 17ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > permanent rejection immediately transitions status to DEAD with diagnostic payload 14ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > reaching MAX_ATTEMPTS transitions status to DEAD (Dead-Letter Invariant) 13ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > advancing simulated clock allows retry after backoff expires 18ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects unauthenticated requests on /api/admin/ops/transports/* 46ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects regular users on /api/admin/ops/transports/* with 403 17ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects pool commissioners on /api/admin/ops/transports/* with 403 (Decision #20 Hardening) 10ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > allows global ADMIN to query transports status and trigger dispatch sweep 132ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 4. Decision #54 Strict Read-Only Invariant on GET > GET /api/admin/ops/transports/status produces ZERO database mutations 35ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts RLS is ENABLED (relrowsecurity=true) and relforcerowsecurity=false on all application public tables 165ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts anon role is denied SELECT (SQLSTATE 42501) across all public tables 130ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts authenticated role is denied SELECT (SQLSTATE 42501) across all public tables 109ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b: asserts anon role is denied UPDATE on penalty_ledger with SQLSTATE 42501 (privilege proof) 8ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2c: asserts has_function_privilege returns false for anon and authenticated on BR-1 trigger functions 27ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects non-commissioner pool members with 403 Forbidden 128ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects global ADMIN users who are not pool commissioners (Decision #20 zero bypass) 7ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects commissioners of different pools with 403 Forbidden 5ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > allows valid pool commissioner to create an override proposal 23ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > applies a commissioner pick override inside a serializable transaction 30ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > applies a commissioner penalty override with decimal ledger tracking 32ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 3. Read-Only GET Proposal Query (Decision #54) > GET /api/pools/:pool_id/proposals returns history and produces zero side effects 18ms
 ✓ tests/br4b.test.ts > BR-4b: Fail-Closed Claim Store Invariant (Decision #52) > Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed 38ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 1. Cryptographic Signature Verification Unit Tests > verifies valid HMAC SHA-256 signatures with hex and sha256= prefix 12ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 1. Cryptographic Signature Verification Unit Tests > rejects invalid signature, mismatched secret, or tampered payload (Fail-Closed) 2ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > rejects webhook requests with missing signature header with 401 Unauthorized 63ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > rejects webhook requests with forged or invalid signature with 401 Unauthorized 5ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > processes valid signed delivered event and transitions OutboxEvent to SENT 22ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > processes valid signed bounce event and transitions OutboxEvent to DEAD with diagnostic JSON 13ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 3. Decision #54 Side-Effect Free GET Invariant > GET /api/webhooks/notifications returns 405 Method Not Allowed and causes ZERO mutations 17ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 4. Decision #55 Fail-Closed Database Fault Tolerance > returns 500 when database transaction fails during webhook ingestion, refusing receipt acknowledgement 14ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > both rows created 115ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > duplicate enqueue creates no second outbox OR inbox row 28ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > caller transaction that throws after enqueue leaves zero rows in both tables 58ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > IN_APP-only writes no outbox row 23ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > EMAIL-only writes no inbox row 17ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > disallowed payload key is stripped 24ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > reminder payload keys are exactly poolName, windowLabel, lockAtUtc, deepLink 7ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > rejects non-transaction client or root prisma instance 10ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > skips EMAIL channel if emailEnabled is false in NotificationPreference 19ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > static test fails if the module imports nodemailer, net, http(s) or fetch 8ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: asserts trigger and function definitions match requirements (BEFORE ROW/STATEMENT, plpgsql, prosecdef=false, unconditional RAISE) 11ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: UPDATE (including no-op update) is blocked with count >= 1 and SQLSTATE P0001 21ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: DELETE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001 6ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: TRUNCATE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001 5ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: membership-row DELETE cascades to penalty_ledger and is intercepted by trigger with P0001 11ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: DELETE FROM pools fixture asserts exact foreign key constraint pool_memberships_pool_id_fkey and SQLSTATE 23503 5ms
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
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 1. Kickoff Future vs Past (Standard 0 Offset) > returns false (unlocked) when kickoff is in the future 2ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 1. Kickoff Future vs Past (Standard 0 Offset) > returns true (locked) when kickoff is in the past 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 1. Kickoff Future vs Past (Standard 0 Offset) > returns true (locked) at exact kickoff boundary (now === kickoff) 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 2. Pool-Specific Lock Offsets > locks early when positive offset is configured (e.g., 60 minutes before kickoff) 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 2. Pool-Specific Lock Offsets > supports negative offsets (e.g., locking 15 minutes after kickoff) 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > fails closed (returns true / throws) when kickoffTime is null or undefined 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > fails closed when kickoffTime is an invalid date string 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > handles null, undefined, or NaN offset by defaulting to 0 offset 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 4. computeGameLockStatus > returns full lock metadata correctly for unlocked game 1ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 4. computeGameLockStatus > returns full lock metadata correctly for locked game 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 4. computeGameLockStatus > returns safe fallback on missing kickoffTime 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 5. isGameInExcludedWindow > returns false if no excluded windows are passed or list is empty 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 5. isGameInExcludedWindow > identifies Thursday Night Football correctly 1ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 5. isGameInExcludedWindow > identifies Monday Night Football correctly 0ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Rolling lock: enforces lock per-game at kickoff boundary 2ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Rolling lock with offset: enforces lock at (kickoff - offset) 1ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Global lock vs Rolling lock: handles first game vs later games 0ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Excluded windows: correctly identifies TNF, MNF, Sunday Early/Late, SNF 2ms
 ✓ tests/characterization.test.ts > BR-4 splitPenalty Math Characterization > Worked matrix: confirms exact zero-diff decimal split amounts 4ms
 ✓ tests/characterization.test.ts > BR-4b Set-Equality: Wrap-Up vs Scoring Resolver > Asserts 100% game ID set equality between wrap-up and scoring resolvers 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > allows valid local disposable database URLs 3ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects remote / hosted database URLs (Supabase, AWS, Neon, etc.) 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > Decision #32 Sabotage Test: point TEST_DATABASE_URL at production fingerprint -> aborts before connection 0ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects URLs using ?schema= parameter to bypass host isolation 0ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects non-disposable production database names on localhost 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > sabotage test: throws when TEST_DATABASE_URL is empty string or undefined 1ms

 Test Files  17 passed (17)
      Tests  182 passed (182)
   Start at  19:23:23
   Duration  16.88s (tests 45%, import 33%, transform 13%, setup 8%, worker 1%)

     Import  49 modules were evaluated 236 times · 4.23s total, 33% of tracked time
             ~3.35s faster with isolate: false — shared modules are evaluated once per worker instead of once per file
             learn more: https://vitest.dev/guide/improving-performance#test-isolation


(node:14456) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/scripts/db_header.js is not specified and it doesn't parse as CommonJS.
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

## 6. Item 5: Targeted Milestone 12.3 Invariants Telemetry

### 6.1 Targeted Test Suite Assertions (Transports, Webhooks & Invariants)
```
=== RESET REHEARSAL DATABASE (Decision #35) ===
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 401 when Authorization header is missing 44ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 400 when pool_id query parameter is missing or malformed 12ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 404 when pool does not exist 51ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 403 when user is not the pool commissioner 11ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 200 and game slate snapshot when user is the verified commissioner 28ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 401 when Authorization header is missing 27ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 400 when pool_id is missing or malformed in request body 9ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 404 when pool does not exist in request body 5ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 403 when user is not the pool commissioner 6ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 200 and upserts pick when authenticated user is the commissioner 25ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > verifies zero penalty_media rows exist after denied upload attempts
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403 14ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403 7ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > verifies zero penalty_media rows exist after denied upload attempts 2ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: penalty OWNER -> 201 success 14ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403 6ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: pool COMMISSIONER -> 200 success 10ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write)
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write)
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 400 when explicit pool_id is not a valid UUID (no pool write)
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 403 when user is not a member or commissioner of the requested pool (no pool write)
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write) 18ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write) 7ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 400 when explicit pool_id is not a valid UUID (no pool write) 5ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 403 when user is not a member or commissioner of the requested pool (no pool write) 7ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot 33ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > Decision #49: CI Route Scan & Route Guard Verification > verifies all routes with pool parameters are guarded; only /api/health and GET /api/admin/users allowlisted 1ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 2. GET /api/pools/:pool_id/ops/health > returns accurate telemetry and is strictly read-only (Decision #54) 141ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > returns inbox messages for authenticated user in descending order (Decision #54 compliant) 135ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > returns default preferences on GET before upsert without mutating DB (Decision #54) 8ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > GET /api/notifications/unsubscribe validates token without modifying DB (Decision #54) 6ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 1. Precondition Check & Fail Closed (Decision #27 & #55) > fails closed with SCORE_FEED_UNAVAILABLE when unfinalized games exist for target week 95ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 1. Precondition Check & Fail Closed (Decision #27 & #55) > fails closed when DB client or claim store is unreachable (Decision #55) 3ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 3. Claim Store Concurrency & Idempotency (Decision #24 & #57) > subsequent execution on already wrapped week returns ALREADY_WRAPPED_UP and produces 0 duplicates 5ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 3. Claim Store Concurrency & Idempotency (Decision #24 & #57) > enforces outbox notification preferences and deduplication key (Decision #57) 10ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/wrap-up is rejected for standard users and pool commissioners (Decision #20) 61ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/wrap-up succeeds for system ADMIN 24ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > GET /api/admin/ops/wrap-up/status is strictly read-only (Decision #54) 6ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/season-seal records immutable snapshot 46ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects unauthenticated requests to POST /api/admin/ops/scan-reminders with 401 58ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects standard users from triggering reminder scan with 403 (Decision #20) 5ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects pool commissioners who lack global ADMIN role with 403 (Decision #20) 5ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > allows global ADMIN to trigger reminder scan via POST with 200 26ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > Decision #54 & Invariant: GET /api/admin/ops/scan-reminders/status is strictly read-only 16ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > aborts and fails closed when database client is unconfigured or throws 4ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > withJobRun tracks failure and returns FAILED status upon unexpected error 11ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 1. Exponential Backoff & Injectable Clock Unit Tests > calculates deterministic exponential backoff intervals without jitter or drift 20ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 1. Exponential Backoff & Injectable Clock Unit Tests > injectable ClockFn allows instant time progression without setTimeout 4ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > successful transport delivery transitions status PENDING -> PROCESSING -> SENT 36ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > transient failure increments attempts, records diagnostic JSON and sets future backoff 17ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > permanent rejection immediately transitions status to DEAD with diagnostic payload 14ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > reaching MAX_ATTEMPTS transitions status to DEAD (Dead-Letter Invariant) 13ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > advancing simulated clock allows retry after backoff expires 18ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects unauthenticated requests on /api/admin/ops/transports/* 46ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects regular users on /api/admin/ops/transports/* with 403 17ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects pool commissioners on /api/admin/ops/transports/* with 403 (Decision #20 Hardening) 10ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > allows global ADMIN to query transports status and trigger dispatch sweep 132ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 4. Decision #54 Strict Read-Only Invariant on GET > GET /api/admin/ops/transports/status produces ZERO database mutations 35ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects non-commissioner pool members with 403 Forbidden 128ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects global ADMIN users who are not pool commissioners (Decision #20 zero bypass) 7ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects commissioners of different pools with 403 Forbidden 5ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 3. Read-Only GET Proposal Query (Decision #54) > GET /api/pools/:pool_id/proposals returns history and produces zero side effects 18ms
 ✓ tests/br4b.test.ts > BR-4b: Fail-Closed Claim Store Invariant (Decision #52) > Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed 38ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 1. Cryptographic Signature Verification Unit Tests > verifies valid HMAC SHA-256 signatures with hex and sha256= prefix 12ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 1. Cryptographic Signature Verification Unit Tests > rejects invalid signature, mismatched secret, or tampered payload (Fail-Closed) 2ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > rejects webhook requests with missing signature header with 401 Unauthorized 63ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > rejects webhook requests with forged or invalid signature with 401 Unauthorized 5ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > processes valid signed delivered event and transitions OutboxEvent to SENT 22ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > processes valid signed bounce event and transitions OutboxEvent to DEAD with diagnostic JSON 13ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 3. Decision #54 Side-Effect Free GET Invariant > GET /api/webhooks/notifications returns 405 Method Not Allowed and causes ZERO mutations 17ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 4. Decision #55 Fail-Closed Database Fault Tolerance > returns 500 when database transaction fails during webhook ingestion, refusing receipt acknowledgement 14ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > Decision #20 & R-12.2-W: global ADMIN who is not the pool commissioner -> 403, no req.pool, zero side effects 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolMember > Decision #20 & R-12.2-W: global ADMIN who is not a member and not commissioner -> 403, no req.pool 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > fails closed (returns true / throws) when kickoffTime is null or undefined 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > fails closed when kickoffTime is an invalid date string 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > handles null, undefined, or NaN offset by defaulting to 0 offset 0ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > Decision #32 Sabotage Test: point TEST_DATABASE_URL at production fingerprint -> aborts before connection 0ms
stderr | tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 4. Decision #55 Fail-Closed Database Fault Tolerance > returns 500 when database transaction fails during webhook ingestion, refusing receipt acknowledgement
    at C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/webhooks.test.ts:249:62
```

---

## 7. Item 6: Remote & Session Integrity (`git remote -v`)
```
origin	https://github.com/jdubciii/NFL-Pick-Em.git (fetch)
origin	https://github.com/jdubciii/NFL-Pick-Em.git (push)
```

---

## 8. LIVE REPOSITORY CONTEXT

### 8.1 Milestone 12.3 Design Specification (`docs/design/12.3.md`)
```markdown
# Milestone 12.3 Design Specification: Notification Delivery Channels, Provider Transports & Webhook Handlers

## 1. Architectural Scope & Tier Isolation (Decision #20 Hardening)
- **System Tier (Global Operations):**
  - Outbox Transports Daemon: Consumes pending `outbox_events` dispatched by earlier engines (reminders, weekly wrap-ups) and routes to external delivery adapters (e.g., Email via Resend/SendGrid or internal Webhook dispatcher).
  - Webhook Ingress Gateway: Inbound provider delivery callbacks (e.g., delivery status, bounces, drops) hosted strictly at `/api/webhooks/notifications` under strict cryptographic signature verification.
  - Administration Routes: Manual retry sweeps and transport monitoring endpoints (`/api/admin/ops/transports/*`) guarded strictly by `requireAdmin`.
- **Pool Tier Isolation:**
  - Zero transport routing or webhook endpoints are mounted under pool-scoped routes (`/api/pools/:pool_id/*`). Pool commissioners cannot trigger, intercept, or modify provider keys or transport dispatches.

## 2. Transport Adapters, Retry Backoff & Dead-Letter Invariants
- **Pluggable Transport Interface:**
  - Abstract `TransportAdapter` interface with mockable implementations for deterministic local integration testing.
  - Production implementations enforce transport-level secret masking and payload validation.
- **Store-Enforced Deduplication & Claim Semantics (Decision #24 & #57):**
  - Processing records mark claims via row locking or state transition (`PENDING` -> `PROCESSING` -> `DELIVERED` / `FAILED`).
  - Outbox deduplication guarantees that transport retries utilize the store-enforced `dedupeKey` to prevent duplicate external message dispatches.
- **Exponential Backoff & Dead-Letter Queue (DLQ):**
  - Transient provider network failures increment `retry_count` and calculate backoff intervals (`backoff_until = now() + (base ^ retry_count)`).
  - Permanent rejections (e.g., invalid address, hard bounce, max retries exceeded) transition events to `DEAD_LETTER` with structured diagnostic error payloads.

## 3. Webhook Callback & Security Invariants
- **Cryptographic Signature Verification:**
  - Inbound webhooks require valid HMAC/header signatures matching configured provider secrets. Unsigned or mismatched requests fail closed with HTTP 401/403.
- **Side-Effect Free GETs (Decision #54):**
  - Webhook callbacks MUST use POST. GET requests to webhook routes return 405 Method Not Allowed or strictly read-only schema metadata without state mutation.
- **Fail-Closed Semantics (Decision #55):**
  - If signature validation fails or the database store is unreachable during webhook ingestion, the handler aborts, rejects the hook, and rolls back transaction state.
- **Clock Injection:**
  - Retry calculators and expiration evaluations accept an injectable `ClockFn: () => Date` for deterministic unit and integration test assertions.

## 4. Verification & Testing Strategy
- Unit test coverage of exponential backoff math and DLQ state transitions.
- Cryptographic signature validation negative and positive controls.
- Injectable clock time-advance testing for retry intervals without wall-clock drift.
- Tier isolation tests proving `/api/admin/ops/transports/*` and `/api/webhooks/*` reject unauthorized users and pool commissioners.
- Fail-closed negative control tests simulating database connection drop during dispatch.
```

### 8.2 Notification Transports Service (`src/services/transports.ts`)
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

### 8.3 Webhook Ingress Route (`src/routes/webhooks.ts`)
```typescript
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../db/client';
import { OutboxStatus } from '@prisma/client';

export const webhooksRouter = Router();

export const DEFAULT_WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || process.env.NOTIFICATIONS_WEBHOOK_SECRET || 'nfl-pickem-webhook-secret-2026';

/**
 * Constant-time cryptographic signature verification for inbound webhook payloads.
 * Supports raw hex signatures and 'sha256=<hex>' header formats.
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer | object,
  signatureHeader: string | undefined,
  secret: string = DEFAULT_WEBHOOK_SECRET
): boolean {
  if (!signatureHeader || !secret) {
    return false;
  }

  try {
    const cleanSignature = signatureHeader.startsWith('sha256=')
      ? signatureHeader.slice(7).trim()
      : signatureHeader.trim();

    const payloadString = typeof rawBody === 'string'
      ? rawBody
      : Buffer.isBuffer(rawBody)
      ? rawBody.toString('utf8')
      : JSON.stringify(rawBody);

    const computedHex = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');

    if (cleanSignature.length !== computedHex.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(cleanSignature, 'utf8'),
      Buffer.from(computedHex, 'utf8')
    );
  } catch {
    return false;
  }
}

/**
 * Helper to compute an HMAC SHA-256 signature for test requests or provider mock.
 */
export function signWebhookPayload(payload: string | object, secret: string = DEFAULT_WEBHOOK_SECRET): string {
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return `sha256=${crypto.createHmac('sha256', secret).update(payloadString).digest('hex')}`;
}

/**
 * GET /api/webhooks/notifications
 * Enforces Decision #54 (Side-effect free GETs).
 * Rejects GET requests with 405 Method Not Allowed or read-only schema metadata with ZERO state mutation.
 */
webhooksRouter.get('/notifications', (_req: Request, res: Response): void => {
  res.status(405).json({
    error: 'Method Not Allowed',
    allowedMethods: ['POST'],
    message: 'Notification webhook ingress requires POST with valid cryptographic signature.',
  });
});

/**
 * POST /api/webhooks/notifications
 * Inbound provider delivery callbacks (delivery confirmation, bounces, drops).
 * Protected by strict cryptographic HMAC SHA-256 signature verification.
 * Enforces Decision #55 (Fail-closed on DB failure: returns 500 without acknowledging receipt).
 */
webhooksRouter.post('/notifications', async (req: Request, res: Response): Promise<void> => {
  const signatureHeader =
    (req.headers['x-webhook-signature'] as string) ||
    (req.headers['x-signature-sha256'] as string) ||
    (req.headers['x-hub-signature-256'] as string) ||
    (req.headers['x-provider-signature'] as string);

  // 1. Cryptographic Signature Verification (Fail-closed on missing or invalid signature)
  const isValid = verifyWebhookSignature(req.body, signatureHeader, DEFAULT_WEBHOOK_SECRET);
  if (!isValid) {
    res.status(401).json({
      error: 'Unauthorized. Invalid or missing cryptographic webhook signature.',
    });
    return;
  }

  const payload = req.body || {};
  const { event, messageId, dedupeKey, error: providerError, recipient } = payload;

  if (!event) {
    res.status(400).json({ error: 'Missing required field: event' });
    return;
  }

  try {
    // 2. Atomic state mutation inside transaction (Decision #55: rollback and fail closed if DB error occurs)
    await prisma.$transaction(async (tx) => {
      // Lookup outbox event by dedupeKey or messageId
      let outboxEvent = null;

      if (dedupeKey) {
        outboxEvent = await tx.outboxEvent.findUnique({
          where: { dedupeKey: String(dedupeKey) },
        });
      }

      if (!outboxEvent && messageId) {
        // Find by hashed dedupe key or raw message id match if recorded in dedupeKey
        const cleanMessageId = String(messageId).replace(/[<>@].*$/g, '').replace(/^[<>]/g, '');
        outboxEvent = await tx.outboxEvent.findFirst({
          where: {
            OR: [
              { dedupeKey: String(messageId) },
              { dedupeKey: { contains: cleanMessageId } },
            ],
          },
        });
      }

      if (outboxEvent) {
        const normalizedEvent = String(event).toLowerCase();

        if (['delivered', 'sent', 'success'].includes(normalizedEvent)) {
          // Transition to SENT
          await tx.outboxEvent.update({
            where: { id: outboxEvent.id },
            data: {
              status: OutboxStatus.SENT,
              sentAt: new Date(),
              leaseExpiresAt: null,
              lastErrorCode: null,
            },
          });
        } else if (['bounced', 'dropped', 'permanent_failure', 'rejected'].includes(normalizedEvent)) {
          // Permanent failure -> transition to DEAD
          const diag = JSON.stringify({
            code: 'WEBHOOK_PERMANENT_BOUNCE',
            event: normalizedEvent,
            recipient: recipient || outboxEvent.recipientUserId,
            error: providerError || 'Delivery dropped or bounced by provider',
            receivedAt: new Date().toISOString(),
          });

          await tx.outboxEvent.update({
            where: { id: outboxEvent.id },
            data: {
              status: OutboxStatus.DEAD,
              leaseExpiresAt: null,
              lastErrorCode: diag,
            },
          });
        } else if (['failed', 'deferred', 'transient_failure'].includes(normalizedEvent)) {
          // Transient failure reported via webhook
          const diag = JSON.stringify({
            code: 'WEBHOOK_TRANSIENT_FAILURE',
            event: normalizedEvent,
            error: providerError || 'Transient failure reported by provider',
            receivedAt: new Date().toISOString(),
          });

          await tx.outboxEvent.update({
            where: { id: outboxEvent.id },
            data: {
              lastErrorCode: diag,
            },
          });
        }
      }
    });

    res.status(200).json({
      received: true,
      event,
      status: 'processed',
    });
  } catch (err: any) {
    // Fail closed (Decision #55): return 500 without acknowledging receipt so provider retries
    console.error('Webhook ingestion error (failing closed):', err);
    res.status(500).json({
      error: 'Failed to process webhook event',
      details: err?.message || 'Internal error',
    });
  }
});
```

### 8.4 Admin Ops Router (`src/routes/adminOps.ts`)
```typescript
import { Router, Request, Response } from 'express';
import prisma from '../db/client';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { runReminderScan } from '../services/reminderScanner';
import { runWrapUpEngine } from '../services/wrapUpEngine';
import { sealSeason, getSeasonSealStatus } from '../services/seasonSeal';
import { processTransportsBatch, getTransportsQueueStatus } from '../services/transports';

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
```

### 8.5 Server Entrypoint (`src/server.ts`)
```typescript
import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from './db/client';
import { JWT_SECRET, UUID_REGEX, requireAuth, requireAdmin, requirePoolCommissioner, requirePoolMember } from './middleware/auth';
import { picksRouter } from './routes/picks';
import { adminRouter } from './routes/admin';
import { meRouter } from './routes/me';
import { notificationsRouter } from './routes/notifications';
import { opsRouter } from './routes/ops';
import { adminOpsRouter } from './routes/adminOps';
import { webhooksRouter } from './routes/webhooks';
import type {
  PoolSettings,
  MatrixResponsePayload,
  MatrixMemberColumn,
  MatrixGameRow,
  MatrixPickCell,
  MatrixMemberSummary,
  PickingMode,
} from './types/pool';

export const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/picks', picksRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin/ops', adminOpsRouter);
app.use('/api/me', meRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/pools', opsRouter);



// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * POST /api/auth/login
 * Validates user credentials and issues a JWT token.
 */
app.post('/api/auth/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'An unexpected error occurred during login.' });
  }
});

/**
 * GET /api/pools
 * Returns all active pools.
 */
app.get('/api/pools', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const pools = await prisma.pool.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    });
    res.json(pools);
  } catch (error) {
    console.error('Error fetching pools:', error);
    res.status(500).json({ error: 'Failed to fetch pools.' });
  }
});

/**
 * GET /api/games
 * Returns upcoming and current week NFL games with the requesting user's pick status.
 */
app.get('/api/games', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const poolIdParam = req.query.pool_id;
  const poolId = poolIdParam !== undefined && poolIdParam !== null && poolIdParam !== ''
    ? String(poolIdParam)
    : undefined;

  try {
    let pool: any = null;
    if (poolId) {
      if (!UUID_REGEX.test(poolId)) {
        res.status(400).json({ error: 'Invalid pool ID format. Must be a valid UUID.' });
        return;
      }

      pool = await prisma.pool.findUnique({ where: { id: poolId } });
      if (!pool) {
        res.status(404).json({ error: 'POOL_NOT_FOUND' });
        return;
      }

      const isCommissioner = pool.adminId === userId;
      if (!isCommissioner) {
        const membership = await prisma.poolMembership.findUnique({
          where: {
            poolId_userId: {
              poolId,
              userId,
            },
          },
        });

        if (!membership || membership.status !== 'ACTIVE') {
          res.status(403).json({ error: 'Forbidden. Active pool membership required.' });
          return;
        }
      }
    } else {
      pool = await prisma.pool.findFirst({
        where: {
          status: 'ACTIVE',
          memberships: {
            some: {
              userId,
              status: 'ACTIVE',
            },
          },
        },
        orderBy: [{ name: 'asc' }],
      });

      if (!pool) {
        pool = await prisma.pool.findFirst({
          where: {
            adminId: userId,
            status: 'ACTIVE',
          },
          orderBy: [{ name: 'asc' }],
        });
      }
    }

    if (!pool) {
      res.status(404).json({ error: 'POOL_NOT_FOUND' });
      return;
    }

    const games = await prisma.game.findMany({
      orderBy: { kickoffTime: 'asc' },
      include: {
        picks: {
          where: {
            userId: userId,
            poolId: pool.id,
          },
        },
      },
    });

    const settings = (pool.settings as any) || {};
    const lockOffset = Number(settings.lock_offset ?? settings.lockOffset ?? 0);

    res.json({
      pool: {
        id: pool.id,
        name: pool.name,
        lock_offset: lockOffset,
        settings: pool.settings,
      },
      games: games.map((game) => ({
        id: game.id,
        externalGameId: game.externalGameId,
        homeTeamId: game.homeTeamId,
        awayTeamId: game.awayTeamId,
        kickoffTime: game.kickoffTime,
        status: game.status,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        userPick: game.picks[0]?.selectedTeamId ?? null,
        pickId: game.picks[0]?.id ?? null,
      })),
    });
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Failed to fetch NFL games.' });
  }
});

export interface LeaderboardUserEntry {
  user_id: string;
  email: string;
  total_points: number;
  correct_picks: number;
  total_picks: number;
  is_weekly_loser: boolean;
}

/**
 * GET /api/pools/:pool_id/leaderboard
 * Protected endpoint that returns the pool leaderboard aggregated from PickResult records.
 * Sorts users descending by total points and tags the lowest scoring user(s) with is_weekly_loser: true.
 */
app.get('/api/pools/:pool_id/leaderboard', requireAuth, requirePoolMember, async (req: Request, res: Response): Promise<void> => {
  const poolId = String(req.params.pool_id);

  if (!poolId) {
    res.status(400).json({ error: 'pool_id is required.' });
    return;
  }

  try {
    // 1. Fetch pool, memberships, and all picks with graded results
    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        picks: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
            result: true,
          },
        },
      },
    });

    if (!pool) {
      res.status(404).json({ error: 'Pool not found.' });
      return;
    }

    // 2. Aggregate points and stats by user
    const userMap = new Map<string, LeaderboardUserEntry>();

    // Initialize all pool members
    for (const membership of pool.memberships) {
      if (!userMap.has(membership.user.id)) {
        userMap.set(membership.user.id, {
          user_id: membership.user.id,
          email: membership.user.email,
          total_points: 0,
          correct_picks: 0,
          total_picks: 0,
          is_weekly_loser: false,
        });
      }
    }

    // Include users with picks and accumulate graded points from PickResult
    for (const pick of pool.picks) {
      let entry = userMap.get(pick.userId);
      if (!entry) {
        entry = {
          user_id: pick.user.id,
          email: pick.user.email,
          total_points: 0,
          correct_picks: 0,
          total_picks: 0,
          is_weekly_loser: false,
        };
        userMap.set(pick.userId, entry);
      }

      entry.total_picks += 1;

      if (pick.result) {
        entry.total_points += Number(pick.result.pointsAwarded);
        if (pick.result.isCorrect) {
          entry.correct_picks += 1;
        }
      }
    }

    const leaderboard = Array.from(userMap.values());

    // 3. Sort descending by total points, then by correct picks
    leaderboard.sort((a, b) => {
      if (b.total_points !== a.total_points) {
        return b.total_points - a.total_points;
      }
      return b.correct_picks - a.correct_picks;
    });

    // 4. Calculate absolute lowest score and set is_weekly_loser flag
    if (leaderboard.length > 0) {
      const minPoints = Math.min(...leaderboard.map((u) => u.total_points));
      for (const entry of leaderboard) {
        if (entry.total_points === minPoints) {
          entry.is_weekly_loser = true;
        }
      }
    }

    res.json({
      pool_id: pool.id,
      pool_name: pool.name,
      leaderboard,
    });
  } catch (error) {
    console.error('Leaderboard calculation error:', error);
    res.status(500).json({ error: 'Failed to generate leaderboard.' });
  }
});

// Alias db as any to allow accessing newly generated models without IDE cache conflicts
const db = prisma as any;

export interface CumulativeLeaderboardEntry {
  user_id: string;
  email: string;
  total_shots_drank: number;
  first_place_finishes: number;
  dead_place_finishes: number;
  total_picks: number;
  correct_picks: number;
  accuracy_percentage: number;
  updated_at: Date;
}

/**
 * GET /api/pools/:pool_id/leaderboard/cumulative
 * Protected route returning joined PoolMembership and PoolMemberStat data,
 * including cumulative shot counts, 1st place finishes, dead place finishes, and pick accuracy.
 * Supports sorting by 'shots', 'wins', 'dead_place', or 'accuracy'.
 */
app.get('/api/pools/:pool_id/leaderboard/cumulative', requireAuth, requirePoolMember, async (req: Request, res: Response): Promise<void> => {
  const poolId = String(req.params.pool_id);
  const sortBy = String(req.query.sort_by || 'shots').toLowerCase();
  const order = String(req.query.order || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

  if (!poolId) {
    res.status(400).json({ error: 'pool_id is required.' });
    return;
  }

  try {
    const pool = await db.pool.findUnique({
      where: { id: poolId },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
            stat: true,
          },
        },
        picks: {
          include: {
            result: true,
          },
        },
      },
    });

    if (!pool) {
      res.status(404).json({ error: 'Pool not found.' });
      return;
    }

    // Map pick accuracy per user
    const userPicksStats = new Map<string, { totalPicks: number; correctPicks: number }>();
    for (const pick of (pool.picks || [])) {
      const userStat = userPicksStats.get(pick.userId) || { totalPicks: 0, correctPicks: 0 };
      userStat.totalPicks += 1;
      if (pick.result?.isCorrect) {
        userStat.correctPicks += 1;
      }
      userPicksStats.set(pick.userId, userStat);
    }

    const memberships: any[] = pool.memberships || [];
    const leaderboard: CumulativeLeaderboardEntry[] = memberships.map((membership: any) => {
      const userStats = userPicksStats.get(membership.userId) || { totalPicks: 0, correctPicks: 0 };
      const accuracy = userStats.totalPicks > 0
        ? Math.round((userStats.correctPicks / userStats.totalPicks) * 1000) / 10
        : 0;

      return {
        user_id: membership.user.id,
        email: membership.user.email,
        total_shots_drank: Number(membership.stat?.totalShotsDrank ?? 0),
        first_place_finishes: membership.stat?.firstPlaceFinishes ?? 0,
        dead_place_finishes: membership.stat?.deadPlaceFinishes ?? 0,
        total_picks: userStats.totalPicks,
        correct_picks: userStats.correctPicks,
        accuracy_percentage: accuracy,
        updated_at: membership.stat?.updatedAt ?? new Date(),
      };
    });

    // Sort by requested parameter
    leaderboard.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'wins' || sortBy === 'first_place') {
        comparison = b.first_place_finishes - a.first_place_finishes;
      } else if (sortBy === 'dead_place' || sortBy === 'dead_place_finishes') {
        comparison = b.dead_place_finishes - a.dead_place_finishes;
      } else if (sortBy === 'accuracy') {
        comparison = b.accuracy_percentage - a.accuracy_percentage;
      } else {
        // Default to total shots drank
        comparison = Number(b.total_shots_drank) - Number(a.total_shots_drank);
      }

      if (comparison === 0) {
        // Secondary sort by accuracy then email
        comparison = b.accuracy_percentage - a.accuracy_percentage;
      }

      return order === 'asc' ? -comparison : comparison;
    });

    const totalPoolShots = leaderboard.reduce((acc, curr) => acc + Number(curr.total_shots_drank || 0), 0);

    res.json({
      pool_id: pool.id,
      pool_name: pool.name,
      total_pool_shots: totalPoolShots,
      leaderboard,
    });
  } catch (error) {
    console.error('Cumulative leaderboard calculation error:', error);
    res.status(500).json({ error: 'Failed to generate cumulative leaderboard.' });
  }
});

/**
 * POST /api/pools/:pool_id/penalties/adjust
 * Protected by requireAdmin.
 * Accepts member_id, delta (integer), and reason.
 * Inserts a new record into PenaltyLedger and triggers recalculation of total_shots_drank in PoolMemberStat.
 */
app.post('/api/pools/:pool_id/penalties/adjust', requireAuth, requirePoolCommissioner, async (req: Request, res: Response): Promise<void> => {
  const poolId = String(req.params.pool_id);
  const memberId = req.body.member_id || req.body.memberId || req.body.user_id || req.body.userId;
  const rawDelta = req.body.delta;
  const reason = req.body.reason;
  const weekNumber = req.body.week_number !== undefined ? Number(req.body.week_number) : null;

  if (!poolId || !memberId || rawDelta === undefined || !reason || String(reason).trim().length === 0) {
    res.status(400).json({
      error: 'Missing required fields: member_id, delta (integer), and reason are required.',
    });
    return;
  }

  const delta = parseInt(String(rawDelta), 10);
  if (isNaN(delta)) {
    res.status(400).json({ error: 'delta must be a valid integer.' });
    return;
  }

  try {
    // 1. Verify pool and member existence
    const membership = await db.poolMembership.findUnique({
      where: {
        poolId_userId: {
          poolId,
          userId: memberId,
        },
      },
    });

    if (!membership) {
      res.status(404).json({ error: 'User is not a member of this pool.' });
      return;
    }

    // 2. Insert record into PenaltyLedger
    const penaltyEntry = await db.penaltyLedger.create({
      data: {
        poolId,
        userId: memberId,
        delta,
        reason: String(reason).trim(),
        weekNumber: weekNumber && !isNaN(weekNumber) ? weekNumber : null,
        createdById: req.user!.id,
      },
    });

    // 3. Recalculate total_shots_drank by summing PenaltyLedger records
    const ledgerSum = await db.penaltyLedger.aggregate({
      where: {
        poolId,
        userId: memberId,
      },
      _sum: {
        delta: true,
      },
    });

    const totalShotsDrank = ledgerSum._sum.delta ?? 0;

    // 4. Update or create PoolMemberStat cache
    const updatedStat = await db.poolMemberStat.upsert({
      where: {
        poolId_userId: {
          poolId,
          userId: memberId,
        },
      },
      update: {
        totalShotsDrank,
      },
      create: {
        poolId,
        userId: memberId,
        totalShotsDrank,
        firstPlaceFinishes: 0,
        deadPlaceFinishes: 0,
      },
    });

    // 5. Create audit log for admin adjustment
    await db.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'ADMIN_ADJUST_PENALTY',
        targetEntityId: penaltyEntry.id,
        newValue: {
          poolId,
          userId: memberId,
          delta,
          reason,
          newTotalShots: totalShotsDrank,
        },
      },
    });

    res.status(201).json({
      message: 'Penalty adjusted successfully.',
      penalty: penaltyEntry,
      stat: updatedStat,
    });
  } catch (error) {
    console.error('Penalty adjustment error:', error);
    res.status(500).json({ error: 'Failed to adjust penalty.' });
  }
});

/**
 * GET /api/pools/:pool_id/penalties/member/:member_id
 * Returns the penalty ledger history for a specific member in the pool.
 */
app.get('/api/pools/:pool_id/penalties/member/:member_id', requireAuth, requirePoolMember, async (req: Request, res: Response): Promise<void> => {
  const poolId = String(req.params.pool_id);
  const memberId = String(req.params.member_id);

  try {
    const history = await db.penaltyLedger.findMany({
      where: {
        poolId,
        userId: memberId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
          },
        },
        media: true,
      },
    });

    res.json(history);
  } catch (error) {
    console.error('Error fetching member penalty history:', error);
    res.status(500).json({ error: 'Failed to fetch penalty history.' });
  }
});

/**
 * POST /api/pools/:pool_id/penalties/:id/media
 * Registers Supabase storage path to the PenaltyMedia table.
 * Restricted to the penalty owner, pool commissioner, or global admin.
 */
app.post('/api/pools/:pool_id/penalties/:id/media', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const poolId = String(req.params.pool_id);
  const penaltyId = String(req.params.id);
  const storagePath = req.body.storage_path || req.body.storagePath;
  const mediaType = req.body.media_type || req.body.mediaType || 'video/mp4';

  if (!storagePath || typeof storagePath !== 'string' || storagePath.trim().length === 0) {
    res.status(400).json({ error: 'storage_path is required.' });
    return;
  }

  try {
    // 1. Fetch pool and penalty ledger record
    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
    });

    if (!pool) {
      res.status(404).json({ error: 'Pool not found.' });
      return;
    }

    const penalty = await db.penaltyLedger.findUnique({
      where: { id: penaltyId },
    });

    if (!penalty || penalty.poolId !== poolId) {
      res.status(404).json({ error: 'Penalty record not found in this pool.' });
      return;
    }

    // 2. Authorization check: penalty owner or pool commissioner
    const requestingUserId = req.user!.id;
    const isOwner = penalty.userId === requestingUserId;
    const isCommissioner = pool.adminId === requestingUserId;

    if (!isOwner && !isCommissioner) {
      res.status(403).json({ error: 'Forbidden: You do not have permission to upload media for this penalty.' });
      return;
    }

    // 3. Upsert PenaltyMedia record
    const penaltyMedia = await db.penaltyMedia.upsert({
      where: {
        penaltyId,
      },
      update: {
        storagePath: String(storagePath).trim(),
        mediaType: String(mediaType).trim(),
        status: 'PENDING',
        confirmedBy: null,
      },
      create: {
        penaltyId,
        poolId,
        userId: penalty.userId,
        storagePath: String(storagePath).trim(),
        mediaType: String(mediaType).trim(),
        status: 'PENDING',
      },
    });

    // 4. Record audit log
    await db.auditLog.create({
      data: {
        actorId: requestingUserId,
        action: 'UPLOAD_PENALTY_MEDIA',
        targetEntityId: penaltyId,
        newValue: {
          penaltyId,
          poolId,
          userId: penalty.userId,
          storagePath: String(storagePath).trim(),
          mediaType: String(mediaType).trim(),
          status: 'PENDING',
        },
      },
    });

    res.status(201).json({
      message: 'Penalty media registered successfully.',
      media: penaltyMedia,
    });
  } catch (error) {
    console.error('Error registering penalty media:', error);
    res.status(500).json({ error: 'Failed to register penalty media.' });
  }
});

/**
 * PATCH /api/pools/:pool_id/penalties/:id/media/confirm
 * Commissioner action to flip penalty media status to CONFIRMED (or REJECTED/PENDING).
 * Restricted to the pool commissioner.
 */
app.patch('/api/pools/:pool_id/penalties/:id/media/confirm', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const poolId = String(req.params.pool_id);
  const penaltyId = String(req.params.id);
  const targetStatus = String(req.body.status || 'CONFIRMED').toUpperCase();

  if (!['CONFIRMED', 'REJECTED', 'PENDING'].includes(targetStatus)) {
    res.status(400).json({ error: 'Invalid status. Allowed values: CONFIRMED, REJECTED, PENDING.' });
    return;
  }

  try {
    // 1. Fetch pool and verify commissioner permissions
    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
    });

    if (!pool) {
      res.status(404).json({ error: 'Pool not found.' });
      return;
    }

    const requestingUserId = req.user!.id;
    const isCommissioner = pool.adminId === requestingUserId;

    if (!isCommissioner) {
      res.status(403).json({ error: 'Forbidden: Only the pool commissioner can confirm penalty media.' });
      return;
    }

    // 2. Fetch penalty media
    const existingMedia = await db.penaltyMedia.findUnique({
      where: { penaltyId },
    });

    if (!existingMedia || existingMedia.poolId !== poolId) {
      res.status(404).json({ error: 'Penalty media not found for this penalty in this pool.' });
      return;
    }

    // 3. Update status
    const updatedMedia = await db.penaltyMedia.update({
      where: { penaltyId },
      data: {
        status: targetStatus,
        confirmedBy: targetStatus === 'CONFIRMED' ? requestingUserId : (targetStatus === 'PENDING' ? null : requestingUserId),
      },
    });

    // 4. Record audit log
    await db.auditLog.create({
      data: {
        actorId: requestingUserId,
        action: 'CONFIRM_PENALTY_MEDIA',
        targetEntityId: penaltyId,
        oldValue: {
          status: existingMedia.status,
          confirmedBy: existingMedia.confirmedBy,
        },
        newValue: {
          status: targetStatus,
          confirmedBy: updatedMedia.confirmedBy,
        },
      },
    });

    res.json({
      message: `Penalty media status updated to ${targetStatus}.`,
      media: updatedMedia,
    });
  } catch (error) {
    console.error('Error confirming penalty media:', error);
    res.status(500).json({ error: 'Failed to update penalty media status.' });
  }
});

/**
 * GET /api/pools/:pool_id/penalties/:id/media
 * Returns penalty media details for a specific penalty entry.
 */
app.get('/api/pools/:pool_id/penalties/:id/media', requireAuth, requirePoolMember, async (req: Request, res: Response): Promise<void> => {
  const poolId = String(req.params.pool_id);
  const penaltyId = String(req.params.id);

  try {
    const media = await db.penaltyMedia.findUnique({
      where: { penaltyId },
      include: {
        confirmer: {
          select: {
            id: true,
            email: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!media || media.poolId !== poolId) {
      res.status(404).json({ error: 'Penalty media not found.' });
      return;
    }

    res.json(media);
  } catch (error) {
    console.error('Error fetching penalty media:', error);
    res.status(500).json({ error: 'Failed to fetch penalty media.' });
  }
});

/**
 * GET /api/pools/:pool_id/matrix
 * Protected route returning a structured square sheet matrix for the pool week.
 * Payload includes:
 * - metadata: pool_id, week_number, picking_mode, hide_picks_until_kickoff
 * - columns: array of active members ({ user_id, email, displayName })
 * - rows: array of games ({ game_id, external_game_id, home_team_id, away_team_id, kickoff_time, status, home_score, away_score, spread })
 * - cells: 2D map nested by game_id -> user_id -> { pick_id, selected_team_id, is_masked, is_correct, points_awarded }
 * - summary: object map keyed by user_id -> { user_id, weekly_wins, tiebreaker_guess, cumulative_shots }
 */
app.get('/api/pools/:pool_id/matrix', requireAuth, requirePoolMember, async (req: Request, res: Response): Promise<void> => {
  const poolId = String(req.params.pool_id);
  const rawWeekNo = req.query.week_no || req.query.weekNumber || req.query.week || '1';
  const weekNumber = parseInt(String(rawWeekNo), 10) || 1;

  if (!poolId) {
    res.status(400).json({ error: 'pool_id is required.' });
    return;
  }

  try {
    // 1. Fetch pool, settings, active memberships, and user stats
    const pool = await db.pool.findUnique({
      where: { id: poolId },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
            stat: true,
          },
          orderBy: {
            user: {
              email: 'asc',
            },
          },
        },
      },
    });

    if (!pool) {
      res.status(404).json({ error: 'Pool not found.' });
      return;
    }

    const settings = (pool.settings as PoolSettings) || {};
    const pickingMode: PickingMode = settings.picking_mode ?? settings.pickingMode ?? 'STRAIGHT_UP';
    const hidePicksUntilKickoff = Boolean(
      settings.hide_picks_until_kickoff ?? settings.hidePicksUntilKickoff ?? true
    );

    // 2. Fetch all games ordered chronologically by kickoffTime
    const games = await db.game.findMany({
      orderBy: { kickoffTime: 'asc' },
    });

    const gameIds = games.map((g: any) => g.id);

    // 3. Fetch all picks for this pool and these games, including finalized results
    const picks = await db.pick.findMany({
      where: {
        poolId: pool.id,
        gameId: { in: gameIds },
      },
      include: {
        result: true,
      },
    });

    // 4. Fetch weekly submissions for tiebreaker predictions and finalization status for this week
    const weeklySubmissions = await db.weeklySubmission.findMany({
      where: {
        poolId: pool.id,
        weekNumber,
      },
    });

    const tiebreakerMap = new Map<string, number | null>();
    const finalizedMap = new Map<string, boolean>();
    for (const sub of weeklySubmissions) {
      if (sub.tieBreakerPrediction !== null && sub.tieBreakerPrediction !== undefined) {
        tiebreakerMap.set(sub.userId, Number(sub.tieBreakerPrediction));
      } else {
        tiebreakerMap.set(sub.userId, null);
      }
      finalizedMap.set(sub.userId, Boolean(sub.isFinalized));
    }

    // 5. Build columns (members)
    const columns: MatrixMemberColumn[] = pool.memberships.map((m: any) => ({
      user_id: m.userId,
      email: m.user.email,
      displayName: m.user.email.split('@')[0],
    }));

    // 6. Build rows (games)
    const rows: MatrixGameRow[] = games.map((g: any) => ({
      game_id: g.id,
      external_game_id: g.externalGameId,
      home_team_id: g.homeTeamId,
      away_team_id: g.awayTeamId,
      kickoff_time: g.kickoffTime.toISOString(),
      status: g.status,
      home_score: g.homeScore,
      away_score: g.awayScore,
      spread: null,
    }));

    // 7. Build 2D cells map: game_id -> user_id -> MatrixPickCell
    const pickLookup = new Map<string, any>();
    for (const pick of picks) {
      pickLookup.set(`${pick.gameId}_${pick.userId}`, pick);
    }

    const cells: Record<string, Record<string, MatrixPickCell>> = {};
    for (const game of games) {
      cells[game.id] = {};
      for (const membership of pool.memberships) {
        const userId = membership.userId;
        const pick = pickLookup.get(`${game.id}_${userId}`);

        if (pick) {
          cells[game.id][userId] = {
            pick_id: pick.id,
            selected_team_id: pick.selectedTeamId,
            is_masked: false,
            is_correct: pick.result ? pick.result.isCorrect : null,
            points_awarded: pick.result ? Number(pick.result.pointsAwarded) : null,
          };
        } else {
          cells[game.id][userId] = {
            pick_id: null,
            selected_team_id: null,
            is_masked: false,
            is_correct: null,
            points_awarded: null,
          };
        }
      }
    }

    // 8. Dual-Mode Visibility & Anti-Peeking Security Layer
    // Mode A: hide_picks_until_kickoff === true -> redact unstarted games for other users
    // Mode B: hide_picks_until_kickoff === false -> redact unstarted games ONLY if opponent's WeeklySubmission.is_finalized is false
    const now = new Date();
    const requestingUserId = req.user?.id;
    const isUserAdmin = req.user?.role === 'ADMIN';

    for (const game of games) {
      const isGameNotStarted = now.getTime() < new Date(game.kickoffTime).getTime();

      for (const membership of pool.memberships) {
        const userId = membership.userId;
        const cell = cells[game.id]?.[userId];

        if (cell) {
          const isOtherMember = userId !== requestingUserId;

          if (isGameNotStarted && isOtherMember && !isUserAdmin) {
            if (hidePicksUntilKickoff) {
              // Mode A (Strict/Hidden): Mask all competitor picks prior to kickoff
              cell.selected_team_id = null;
              cell.is_masked = true;
            } else {
              // Mode B (Open Slate): Expose picks only if opponent has finalized their weekly submission
              const isOpponentFinalized = finalizedMap.get(userId) === true;
              if (!isOpponentFinalized) {
                cell.selected_team_id = null;
                cell.is_masked = true;
              } else {
                cell.is_masked = false;
              }
            }
          } else {
            cell.is_masked = false;
          }
        }
      }
    }

    // 9. Build summary: user_id -> MatrixMemberSummary
    const weeklyWinsMap = new Map<string, number>();
    for (const pick of picks) {
      if (pick.result?.isCorrect) {
        weeklyWinsMap.set(pick.userId, (weeklyWinsMap.get(pick.userId) || 0) + 1);
      }
    }

    const summary: Record<string, MatrixMemberSummary> = {};
    for (const membership of pool.memberships) {
      const userId = membership.userId;
      const weeklyWins = weeklyWinsMap.get(userId) || 0;
      const tiebreakerGuess = tiebreakerMap.has(userId) ? tiebreakerMap.get(userId)! : null;
      const cumulativeShots = Number(membership.stat?.totalShotsDrank ?? 0);

      summary[userId] = {
        user_id: userId,
        weekly_wins: weeklyWins,
        tiebreaker_guess: tiebreakerGuess,
        cumulative_shots: cumulativeShots,
      };
    }

    const responsePayload: MatrixResponsePayload = {
      metadata: {
        pool_id: pool.id,
        week_number: weekNumber,
        picking_mode: pickingMode,
        hide_picks_until_kickoff: hidePicksUntilKickoff,
      },
      columns,
      rows,
      cells,
      summary,
    };

    res.json(responsePayload);
  } catch (error) {
    console.error('Matrix calculation error:', error);
    res.status(500).json({ error: 'Failed to generate matrix.' });
  }
});

// Start listening if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
```

### 8.6 Notification Transports Test Suite (`tests/transports.test.ts`)
```typescript
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import http from 'http';
import jwt from 'jsonwebtoken';
import { Role, OutboxStatus } from '@prisma/client';
import prisma from '../src/db/client';
import { app } from '../src/server';
import { JWT_SECRET } from '../src/middleware/auth';
import {
  processTransportsBatch,
  calculateBackoffSeconds,
  calculateNextAttemptAt,
  MockTransportAdapter,
  ConsoleTransportAdapter,
  getTransportsQueueStatus,
  ClockFn,
} from '../src/services/transports';
import { enqueueNotification } from '../src/services/notifications';

describe('Milestone 12.3: Notification Transports, Retry Engine & DLQ', () => {
  let server: http.Server;
  let baseUrl: string;

  let adminUser: any;
  let commissionerUser: any;
  let regularUser: any;

  let adminToken: string;
  let commissionerToken: string;
  let regularToken: string;

  let testPool: any;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });

    // Create test users
    adminUser = await prisma.user.create({
      data: {
        email: `transports_admin_${Date.now()}@example.com`,
        passwordHash: 'hash',
        role: Role.ADMIN,
      },
    });

    commissionerUser = await prisma.user.create({
      data: {
        email: `transports_commish_${Date.now()}@example.com`,
        passwordHash: 'hash',
        role: Role.USER,
      },
    });

    regularUser = await prisma.user.create({
      data: {
        email: `transports_user_${Date.now()}@example.com`,
        passwordHash: 'hash',
        role: Role.USER,
      },
    });

    adminToken = jwt.sign({ id: adminUser.id, email: adminUser.email, role: Role.ADMIN }, JWT_SECRET, { expiresIn: '1h' });
    commissionerToken = jwt.sign({ id: commissionerUser.id, email: commissionerUser.email, role: Role.USER }, JWT_SECRET, { expiresIn: '1h' });
    regularToken = jwt.sign({ id: regularUser.id, email: regularUser.email, role: Role.USER }, JWT_SECRET, { expiresIn: '1h' });

    testPool = await prisma.pool.create({
      data: {
        name: `Transports Test Pool ${Date.now()}`,
        adminId: commissionerUser.id,
        settings: {},
      },
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.outboxEvent.deleteMany({});
    await prisma.inboxMessage.deleteMany({});
    await prisma.notificationPreference.deleteMany({});
    await prisma.jobRun.deleteMany({});
  });

  describe('1. Exponential Backoff & Injectable Clock Unit Tests', () => {
    it('calculates deterministic exponential backoff intervals without jitter or drift', () => {
      // baseInterval = 60s, exponent = 2
      // attempt 1: 60 * 2^0 = 60s
      // attempt 2: 60 * 2^1 = 120s
      // attempt 3: 60 * 2^2 = 240s
      // attempt 4: 60 * 2^3 = 480s
      // attempt 5: 60 * 2^4 = 960s
      expect(calculateBackoffSeconds(1, 60, 2)).toBe(60);
      expect(calculateBackoffSeconds(2, 60, 2)).toBe(120);
      expect(calculateBackoffSeconds(3, 60, 2)).toBe(240);
      expect(calculateBackoffSeconds(4, 60, 2)).toBe(480);
      expect(calculateBackoffSeconds(5, 60, 2)).toBe(960);
    });

    it('injectable ClockFn allows instant time progression without setTimeout', () => {
      const baseTime = new Date('2026-10-01T12:00:00.000Z');
      let simulatedTime = new Date(baseTime.getTime());
      const mockClock: ClockFn = () => simulatedTime;

      const next1 = calculateNextAttemptAt(1, mockClock, 60, 2);
      expect(next1.toISOString()).toBe('2026-10-01T12:01:00.000Z');

      // Advance clock by 1 minute
      simulatedTime = new Date(simulatedTime.getTime() + 60 * 1000);
      const next2 = calculateNextAttemptAt(2, mockClock, 60, 2);
      expect(next2.toISOString()).toBe('2026-10-01T12:03:00.000Z');
    });
  });

  describe('2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions', () => {
    it('successful transport delivery transitions status PENDING -> PROCESSING -> SENT', async () => {
      const mockAdapter = new MockTransportAdapter();
      const dedupeKey = `transports-ok-${Date.now()}`;

      await prisma.$transaction(async (tx) => {
        await enqueueNotification(tx, {
          poolId: testPool.id,
          userId: regularUser.id,
          type: 'PICK_REMINDER',
          payload: {
            poolName: testPool.name,
            windowLabel: 'Sunday Early',
            lockAtUtc: new Date().toISOString(),
            deepLink: `/pools/${testPool.id}/picks`,
          },
          dedupeKey,
          channels: ['EMAIL'],
        });
      });

      const result = await processTransportsBatch({ adapter: mockAdapter });
      expect(result.processed).toBe(1);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.dead).toBe(0);

      expect(mockAdapter.sentMessages).toHaveLength(1);
      expect(mockAdapter.sentMessages[0].to).toBe(regularUser.email);
      expect(mockAdapter.sentMessages[0].dedupeKey).toBe(dedupeKey);

      const event = await prisma.outboxEvent.findUnique({ where: { dedupeKey } });
      expect(event?.status).toBe(OutboxStatus.SENT);
      expect(event?.sentAt).toBeDefined();
      expect(event?.leaseExpiresAt).toBeNull();
      expect(event?.lastErrorCode).toBeNull();
    });

    it('transient failure increments attempts, records diagnostic JSON and sets future backoff', async () => {
      const mockAdapter = new MockTransportAdapter();
      mockAdapter.shouldFail = true;
      mockAdapter.failPermanent = false;
      mockAdapter.failError = 'Network timeout connecting to provider API';

      const baseTime = new Date('2026-10-01T12:00:00.000Z');
      const mockClock: ClockFn = () => baseTime;
      const dedupeKey = `transports-transient-${Date.now()}`;

      await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: regularUser.id,
          type: 'PICK_REMINDER',
          payload: { poolName: testPool.name },
          dedupeKey,
          status: OutboxStatus.PENDING,
          attempts: 0,
          nextAttemptAt: baseTime,
        },
      });

      const result = await processTransportsBatch({
        adapter: mockAdapter,
        clock: mockClock,
        baseIntervalSeconds: 60,
        exponent: 2,
      });

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.dead).toBe(0);

      const event = await prisma.outboxEvent.findUnique({ where: { dedupeKey } });
      expect(event?.status).toBe(OutboxStatus.PENDING);
      expect(event?.attempts).toBe(1);
      expect(event?.leaseExpiresAt).toBeNull();
      expect(event?.nextAttemptAt.toISOString()).toBe('2026-10-01T12:01:00.000Z');

      // Structured diagnostic error validation
      expect(event?.lastErrorCode).toBeDefined();
      const diag = JSON.parse(event!.lastErrorCode!);
      expect(diag.code).toBe('TRANSIENT_FAILURE');
      expect(diag.reason).toContain('Network timeout');
      expect(diag.attempt).toBe(1);
    });

    it('permanent rejection immediately transitions status to DEAD with diagnostic payload', async () => {
      const mockAdapter = new MockTransportAdapter();
      mockAdapter.shouldFail = true;
      mockAdapter.failPermanent = true;
      mockAdapter.failError = '550 5.1.1 User unknown / mailbox not found';

      const dedupeKey = `transports-perm-fail-${Date.now()}`;

      await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: regularUser.id,
          type: 'PICK_REMINDER',
          payload: { poolName: testPool.name },
          dedupeKey,
          status: OutboxStatus.PENDING,
          attempts: 0,
        },
      });

      const result = await processTransportsBatch({ adapter: mockAdapter });
      expect(result.processed).toBe(1);
      expect(result.dead).toBe(1);
      expect(result.failed).toBe(0);

      const event = await prisma.outboxEvent.findUnique({ where: { dedupeKey } });
      expect(event?.status).toBe(OutboxStatus.DEAD);
      expect(event?.leaseExpiresAt).toBeNull();

      const diag = JSON.parse(event!.lastErrorCode!);
      expect(diag.code).toBe('PERMANENT_REJECTION');
      expect(diag.reason).toContain('User unknown');
    });

    it('reaching MAX_ATTEMPTS transitions status to DEAD (Dead-Letter Invariant)', async () => {
      const mockAdapter = new MockTransportAdapter();
      mockAdapter.shouldFail = true;
      mockAdapter.failPermanent = false;
      mockAdapter.failError = 'Repeated upstream provider 500 Internal Error';

      const dedupeKey = `transports-max-retries-${Date.now()}`;

      await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: regularUser.id,
          type: 'PICK_REMINDER',
          payload: { poolName: testPool.name },
          dedupeKey,
          status: OutboxStatus.PENDING,
          attempts: 4, // 4 previous failed attempts
        },
      });

      const result = await processTransportsBatch({
        adapter: mockAdapter,
        maxAttempts: 5,
      });

      expect(result.processed).toBe(1);
      expect(result.dead).toBe(1);
      expect(result.failed).toBe(0);

      const event = await prisma.outboxEvent.findUnique({ where: { dedupeKey } });
      expect(event?.status).toBe(OutboxStatus.DEAD);
      expect(event?.attempts).toBe(5);

      const diag = JSON.parse(event!.lastErrorCode!);
      expect(diag.code).toBe('MAX_RETRIES_EXCEEDED');
      expect(diag.attempt).toBe(5);
    });

    it('advancing simulated clock allows retry after backoff expires', async () => {
      const mockAdapter = new MockTransportAdapter();
      const baseTime = new Date('2026-10-01T12:00:00.000Z');
      let currentTime = new Date(baseTime.getTime());
      const mockClock: ClockFn = () => currentTime;

      const dedupeKey = `transports-clock-advance-${Date.now()}`;

      // Event scheduled for nextAttemptAt in future relative to baseTime
      await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: regularUser.id,
          type: 'PICK_REMINDER',
          payload: { poolName: testPool.name },
          dedupeKey,
          status: OutboxStatus.PENDING,
          attempts: 1,
          nextAttemptAt: new Date(baseTime.getTime() + 120 * 1000), // 2 mins later
        },
      });

      // At baseTime, event is not yet due
      const sweep1 = await processTransportsBatch({ adapter: mockAdapter, clock: mockClock });
      expect(sweep1.processed).toBe(0);
      expect(mockAdapter.sentMessages).toHaveLength(0);

      // Advance clock by 3 minutes (past the 2m backoff window)
      currentTime = new Date(baseTime.getTime() + 180 * 1000);
      const sweep2 = await processTransportsBatch({ adapter: mockAdapter, clock: mockClock });
      expect(sweep2.processed).toBe(1);
      expect(sweep2.succeeded).toBe(1);
      expect(mockAdapter.sentMessages).toHaveLength(1);

      const event = await prisma.outboxEvent.findUnique({ where: { dedupeKey } });
      expect(event?.status).toBe(OutboxStatus.SENT);
    });
  });

  describe('3. Decision #20 Tier Separation: Admin Transport Routes', () => {
    it('rejects unauthenticated requests on /api/admin/ops/transports/*', async () => {
      const getRes = await fetch(`${baseUrl}/api/admin/ops/transports/status`);
      expect(getRes.status).toBe(401);

      const postRes = await fetch(`${baseUrl}/api/admin/ops/transports/drain`, {
        method: 'POST',
      });
      expect(postRes.status).toBe(401);
    });

    it('rejects regular users on /api/admin/ops/transports/* with 403', async () => {
      const getRes = await fetch(`${baseUrl}/api/admin/ops/transports/status`, {
        headers: { Authorization: `Bearer ${regularToken}` },
      });
      expect(getRes.status).toBe(403);

      const postRes = await fetch(`${baseUrl}/api/admin/ops/transports/drain`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${regularToken}` },
      });
      expect(postRes.status).toBe(403);
    });

    it('rejects pool commissioners on /api/admin/ops/transports/* with 403 (Decision #20 Hardening)', async () => {
      const getRes = await fetch(`${baseUrl}/api/admin/ops/transports/status`, {
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });
      expect(getRes.status).toBe(403);

      const postRes = await fetch(`${baseUrl}/api/admin/ops/transports/drain`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });
      expect(postRes.status).toBe(403);
    });

    it('allows global ADMIN to query transports status and trigger dispatch sweep', async () => {
      const getRes = await fetch(`${baseUrl}/api/admin/ops/transports/status`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(getRes.status).toBe(200);
      const data = await getRes.json();
      expect(data.status).toBe('ok');
      expect(data.service).toBe('transports_engine');
      expect(data.queueDepth).toBeDefined();

      const postRes = await fetch(`${baseUrl}/api/admin/ops/transports/drain`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ batchSize: 5 }),
      });
      expect(postRes.status).toBe(200);
      const postData = await postRes.json();
      expect(postData.message).toBe('Transport sweep executed successfully');
      expect(postData.result).toBeDefined();
    });
  });

  describe('4. Decision #54 Strict Read-Only Invariant on GET', () => {
    it('GET /api/admin/ops/transports/status produces ZERO database mutations', async () => {
      // Create pending and dead outbox events
      await prisma.outboxEvent.createMany({
        data: [
          {
            poolId: testPool.id,
            recipientUserId: regularUser.id,
            type: 'REMINDER',
            payload: { a: 1 },
            dedupeKey: `get-status-pending-${Date.now()}`,
            status: OutboxStatus.PENDING,
          },
          {
            poolId: testPool.id,
            recipientUserId: regularUser.id,
            type: 'REMINDER',
            payload: { a: 2 },
            dedupeKey: `get-status-dead-${Date.now()}`,
            status: OutboxStatus.DEAD,
            attempts: 5,
            lastErrorCode: 'DIAG_ERR',
          },
        ],
      });

      const countBefore = await prisma.outboxEvent.count();
      const eventsBefore = await prisma.outboxEvent.findMany({ select: { id: true, status: true, attempts: true, lastErrorCode: true } });

      const res = await fetch(`${baseUrl}/api/admin/ops/transports/status`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.queueDepth.pending).toBeGreaterThanOrEqual(1);
      expect(data.queueDepth.dead).toBeGreaterThanOrEqual(1);

      const countAfter = await prisma.outboxEvent.count();
      const eventsAfter = await prisma.outboxEvent.findMany({ select: { id: true, status: true, attempts: true, lastErrorCode: true } });

      expect(countAfter).toBe(countBefore);
      expect(eventsAfter).toEqual(eventsBefore);
    });
  });
});
```

### 8.7 Webhook Ingress Test Suite (`tests/webhooks.test.ts`)
```typescript
import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import http from 'http';
import { Role, OutboxStatus } from '@prisma/client';
import prisma from '../src/db/client';
import { app } from '../src/server';
import {
  signWebhookPayload,
  verifyWebhookSignature,
  DEFAULT_WEBHOOK_SECRET,
} from '../src/routes/webhooks';

describe('Milestone 12.3: Webhook Ingress Gateway & Signature Verification', () => {
  let server: http.Server;
  let baseUrl: string;

  let testUser: any;
  let testPool: any;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });

    testUser = await prisma.user.create({
      data: {
        email: `webhook_test_user_${Date.now()}@example.com`,
        passwordHash: 'hash',
        role: Role.USER,
      },
    });

    testPool = await prisma.pool.create({
      data: {
        name: `Webhook Test Pool ${Date.now()}`,
        adminId: testUser.id,
        settings: {},
      },
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.outboxEvent.deleteMany({});
  });

  describe('1. Cryptographic Signature Verification Unit Tests', () => {
    it('verifies valid HMAC SHA-256 signatures with hex and sha256= prefix', () => {
      const payload = { event: 'delivered', messageId: 'msg_123', dedupeKey: 'dedupe_123' };
      const secret = 'my-super-secret-key';

      const sigWithPrefix = signWebhookPayload(payload, secret);
      const rawHex = sigWithPrefix.replace('sha256=', '');

      expect(verifyWebhookSignature(payload, sigWithPrefix, secret)).toBe(true);
      expect(verifyWebhookSignature(payload, rawHex, secret)).toBe(true);
    });

    it('rejects invalid signature, mismatched secret, or tampered payload (Fail-Closed)', () => {
      const payload = { event: 'delivered', messageId: 'msg_123' };
      const secret = 'correct-secret';

      const validSig = signWebhookPayload(payload, secret);
      const wrongSecretSig = signWebhookPayload(payload, 'wrong-secret');
      const tamperedPayload = { event: 'delivered', messageId: 'msg_tampered' };

      expect(verifyWebhookSignature(payload, undefined, secret)).toBe(false);
      expect(verifyWebhookSignature(payload, '', secret)).toBe(false);
      expect(verifyWebhookSignature(payload, 'invalid-hex-sig', secret)).toBe(false);
      expect(verifyWebhookSignature(payload, wrongSecretSig, secret)).toBe(false);
      expect(verifyWebhookSignature(tamperedPayload, validSig, secret)).toBe(false);
    });
  });

  describe('2. POST /api/webhooks/notifications Ingress Security', () => {
    it('rejects webhook requests with missing signature header with 401 Unauthorized', async () => {
      const payload = { event: 'delivered', dedupeKey: 'k1' };

      const res = await fetch(`${baseUrl}/api/webhooks/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('Unauthorized');
    });

    it('rejects webhook requests with forged or invalid signature with 401 Unauthorized', async () => {
      const payload = { event: 'delivered', dedupeKey: 'k1' };

      const res = await fetch(`${baseUrl}/api/webhooks/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-signature': 'sha256=0000000000000000000000000000000000000000000000000000000000000000',
        },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('Unauthorized');
    });

    it('processes valid signed delivered event and transitions OutboxEvent to SENT', async () => {
      const dedupeKey = `webhook-deliv-${Date.now()}`;

      const outboxEvent = await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: testUser.id,
          type: 'PICK_REMINDER',
          payload: { poolName: testPool.name },
          dedupeKey,
          status: OutboxStatus.PROCESSING,
          attempts: 1,
        },
      });

      const payload = {
        event: 'delivered',
        dedupeKey,
        messageId: `<${dedupeKey}@test>`,
      };

      const signature = signWebhookPayload(payload, DEFAULT_WEBHOOK_SECRET);

      const res = await fetch(`${baseUrl}/api/webhooks/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-signature': signature,
        },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.received).toBe(true);
      expect(data.event).toBe('delivered');

      const updated = await prisma.outboxEvent.findUnique({ where: { id: outboxEvent.id } });
      expect(updated?.status).toBe(OutboxStatus.SENT);
      expect(updated?.sentAt).toBeDefined();
      expect(updated?.leaseExpiresAt).toBeNull();
    });

    it('processes valid signed bounce event and transitions OutboxEvent to DEAD with diagnostic JSON', async () => {
      const dedupeKey = `webhook-bounce-${Date.now()}`;

      const outboxEvent = await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: testUser.id,
          type: 'PICK_REMINDER',
          payload: { poolName: testPool.name },
          dedupeKey,
          status: OutboxStatus.PROCESSING,
          attempts: 1,
        },
      });

      const payload = {
        event: 'bounced',
        dedupeKey,
        recipient: testUser.email,
        error: '550 User mailbox inactive / hard bounce',
      };

      const signature = signWebhookPayload(payload, DEFAULT_WEBHOOK_SECRET);

      const res = await fetch(`${baseUrl}/api/webhooks/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature-sha256': signature,
        },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(200);

      const updated = await prisma.outboxEvent.findUnique({ where: { id: outboxEvent.id } });
      expect(updated?.status).toBe(OutboxStatus.DEAD);
      expect(updated?.leaseExpiresAt).toBeNull();

      expect(updated?.lastErrorCode).toBeDefined();
      const diag = JSON.parse(updated!.lastErrorCode!);
      expect(diag.code).toBe('WEBHOOK_PERMANENT_BOUNCE');
      expect(diag.event).toBe('bounced');
      expect(diag.error).toContain('hard bounce');
    });
  });

  describe('3. Decision #54 Side-Effect Free GET Invariant', () => {
    it('GET /api/webhooks/notifications returns 405 Method Not Allowed and causes ZERO mutations', async () => {
      const dedupeKey = `webhook-get-check-${Date.now()}`;

      await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: testUser.id,
          type: 'PICK_REMINDER',
          payload: { poolName: testPool.name },
          dedupeKey,
          status: OutboxStatus.PENDING,
          attempts: 0,
        },
      });

      const countBefore = await prisma.outboxEvent.count();
      const eventsBefore = await prisma.outboxEvent.findMany({ select: { id: true, status: true, attempts: true } });

      const res = await fetch(`${baseUrl}/api/webhooks/notifications`);
      expect(res.status).toBe(405);
      const data = await res.json();
      expect(data.error).toBe('Method Not Allowed');
      expect(data.allowedMethods).toContain('POST');

      const countAfter = await prisma.outboxEvent.count();
      const eventsAfter = await prisma.outboxEvent.findMany({ select: { id: true, status: true, attempts: true } });

      expect(countAfter).toBe(countBefore);
      expect(eventsAfter).toEqual(eventsBefore);
    });
  });

  describe('4. Decision #55 Fail-Closed Database Fault Tolerance', () => {
    it('returns 500 when database transaction fails during webhook ingestion, refusing receipt acknowledgement', async () => {
      const payload = {
        event: 'delivered',
        dedupeKey: `webhook-fail-closed-${Date.now()}`,
      };

      const signature = signWebhookPayload(payload, DEFAULT_WEBHOOK_SECRET);

      // Simulate database error inside transaction
      vi.spyOn(prisma, '$transaction').mockRejectedValueOnce(new Error('PostgreSQL connection dropped unexpectedly'));

      const res = await fetch(`${baseUrl}/api/webhooks/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-signature': signature,
        },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toContain('Failed to process webhook event');

      vi.restoreAllMocks();
    });
  });
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
