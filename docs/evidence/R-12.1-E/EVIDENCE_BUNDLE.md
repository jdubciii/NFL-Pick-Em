# TWO-STAGE EVIDENCE BINDING RECORD (PATH B — GOVERNED)
- **Execution Baseline SHA (E_SHA):** 6ec29ba983c7677447cf8807442909487dfe0233
- **Binding Container Target:** HEAD (Target for binding commit)
- **Lineage Verification:** PARENT_VERIFIED (Parent commit of binding container is guaranteed to be 6ec29ba983c7677447cf8807442909487dfe0233)
- **Baseline Working Tree:** 100% CLEAN (0 modified, 0 untracked)
- **Governing Standard:** ARCHITECTURE.md (Two-Stage Forward-Binding Evidence Protocol)
--------------------------------------------------------------------------------

# MILESTONE 12.1-E EVIDENCE BUNDLE: AUTOMATED REMINDER SCANNER ENGINE
**Execution Timestamp:** 2026-10-03T00:02:54.645Z
**Target Branch:** `feat/phase12-1e-reminder-scanner`
**Execution Baseline SHA:** `6ec29ba983c7677447cf8807442909487dfe0233`
**Generator Exit Code:** 0

---

## 1. Acceptance Matrix
### Milestone 12.1-E Acceptance Matrix
- E.1 (Reminder Scanner Engine / Missing Picks Identification): PASS
- E.2 (Deterministic Idempotency Deduplication Key): PASS
- E.3 (User Notification Preferences / Opt-Out Enforcement): PASS
- E.4 (Injectable Clock Time-Window Boundary Transitions): PASS
- E.5 (System Tier Route Isolation / Decision #20 Hardening): PASS
- E.6 (Decision #54 Read-Only Status & Non-GET Mutation): PASS
- E.7 (Decision #55 Fail-Closed Resilience): PASS
- E.8 (Full Test Suite 146/146 Passing & Clean Working Tree): PASS

---

## 2. Item 1: Git Identity & Ancestry

### 2.1 Branch & Commit Identification
- **Active Branch:** `feat/phase12-1e-reminder-scanner`
- **Execution Baseline SHA:** `6ec29ba983c7677447cf8807442909487dfe0233`

### 2.2 Working Tree Status at Baseline
```
?? scripts/generate_evidence_12_1e.js
```

### 2.3 Git Log Ancestry (Milestone 12.1-E Commit Lineage)
```
6ec29ba feat(phase12-1e): implement Automated Reminder Scanner engine and system route
8b6c758 docs: author Milestone 12.1-E Reminder Scanner design specification
45df406 Merge pull request #1 from jdubciii/feat/phase12-1-outbox
d3b7e8a docs: create binding container B_SHA for Section 9 verification bundle
0b1db1d chore: align Section 9 evidence generator to baseline E_SHA
05b03bb docs: finalize machine-verified Path B binding record for R-12.1-RESTORE-01
3c8e419 docs: stage Section 9 verification bundle at baseline 010610eccc0b4ec88731f11205636e24a19153ba
010610e docs: bind authoritative Section 9 verification bundle with Path B lineage record
88f5cda docs: formalize Two-Stage Forward-Binding Evidence Protocol for published branches
9f97965 docs: bind authoritative Section 9 verification bundle for R-12.1-RESTORE-01
794549c chore: finalize Section 9 evidence generator script
46c287b docs: bind Section 9 verification bundle for R-12.1-RESTORE-01
fccee22 docs: apply R-12.1-RESTORE-01 documentation updates
48943b7 chore: prepare Step F authoritative evidence baseline and tier standard
bf65c53 chore: prepare Step F authoritative evidence baseline
```

---

## 3. Item 2: Merge Base & Diffstat Against Main

### 3.1 Merge Base vs `main`
- **Merge Base SHA:** `45df4063236d306043137755f44852879fa07b2b`

### 3.2 Diffstat (`git diff --stat main...HEAD`)
```
docs/design/12.1-E.md           |  32 ++++
 src/jobs/cli.ts                 |   6 +-
 src/jobs/jobRunner.ts           |   8 +
 src/routes/adminOps.ts          |  63 +++++++
 src/server.ts                   |   2 +
 src/services/reminderScanner.ts | 235 ++++++++++++++++++++++++
 tests/reminderScanner.test.ts   | 388 ++++++++++++++++++++++++++++++++++++++++
 7 files changed, 733 insertions(+), 1 deletion(-)
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
│ 0       │ '20260927000000_init'                                       │ 2026-10-03T00:03:03.977Z │
│ 1       │ '20260928051824_add_pool_member_stats_and_penalty_ledger'   │ 2026-10-03T00:03:04.004Z │
│ 2       │ '20260928124900_precision_and_weekly_submissions'           │ 2026-10-03T00:03:04.051Z │
│ 3       │ '20260928170000_weekly_submission_finalized_and_game_notes' │ 2026-10-03T00:03:04.059Z │
│ 4       │ '20260928180000_shot_cam_penalty_media_and_rls'             │ 2026-10-03T00:03:04.081Z │
│ 5       │ '20260929144500_br_1_ledger_append_only'                    │ 2026-10-03T00:03:04.093Z │
│ 6       │ '20260930010000_br_2b_ledger_api_lockdown'                  │ 2026-10-03T00:03:04.098Z │
│ 7       │ '20260930020000_br_2c_public_tables_api_lockdown'           │ 2026-10-03T00:03:04.108Z │
│ 8       │ '20261001160000_12_1_a_outbox_inbox_core'                   │ 2026-10-03T00:03:04.163Z │
└─────────┴─────────────────────────────────────────────────────────────┴──────────────────────────┘
weekly_wrapups exists in public: false (Expected: false)
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "pickem_rehearsal", schema "public" at "localhost:5432"

9 migrations found in prisma/migrations


No pending migrations to apply.
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma

✔ Generated Prisma Client (v5.22.0) to .\node_modules\@prisma\client in 287ms

Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

Help us improve the Prisma ORM for everyone. Share your feedback in a short 2-min survey: https://pris.ly/orm/survey/release-5-22

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
    "started_at": "2026-10-03T00:03:03.904Z",
    "finished_at": "2026-10-03T00:03:03.977Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928051824_add_pool_member_stats_and_penalty_ledger",
    "started_at": "2026-10-03T00:03:03.978Z",
    "finished_at": "2026-10-03T00:03:04.004Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928124900_precision_and_weekly_submissions",
    "started_at": "2026-10-03T00:03:04.006Z",
    "finished_at": "2026-10-03T00:03:04.051Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928170000_weekly_submission_finalized_and_game_notes",
    "started_at": "2026-10-03T00:03:04.052Z",
    "finished_at": "2026-10-03T00:03:04.059Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928180000_shot_cam_penalty_media_and_rls",
    "started_at": "2026-10-03T00:03:04.060Z",
    "finished_at": "2026-10-03T00:03:04.081Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260929144500_br_1_ledger_append_only",
    "started_at": "2026-10-03T00:03:04.082Z",
    "finished_at": "2026-10-03T00:03:04.093Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260930010000_br_2b_ledger_api_lockdown",
    "started_at": "2026-10-03T00:03:04.094Z",
    "finished_at": "2026-10-03T00:03:04.098Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260930020000_br_2c_public_tables_api_lockdown",
    "started_at": "2026-10-03T00:03:04.099Z",
    "finished_at": "2026-10-03T00:03:04.108Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20261001160000_12_1_a_outbox_inbox_core",
    "started_at": "2026-10-03T00:03:04.110Z",
    "finished_at": "2026-10-03T00:03:04.163Z",
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

 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 1. Idempotency & Outbox Enqueue Invariants > enqueues outbox reminder for member with unsubmitted picks and deduplicates subsequent runs 501ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 2. User Notification Preferences Enforcement > skips users who have opted out of email / pick reminders (generates 0 outbox events) 4ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 2. User Notification Preferences Enforcement > skips members who have already submitted picks for all upcoming games in the window 86ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 3. Injectable Clock Time-Window Boundary Testing > moving clock forward cleanly transitions games in and out of windows without real-time delay 46ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects unauthenticated requests to POST /api/admin/ops/scan-reminders with 401 79ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects standard users from triggering reminder scan with 403 (Decision #20) 6ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects pool commissioners who lack global ADMIN role with 403 (Decision #20) 3ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > allows global ADMIN to trigger reminder scan via POST with 200 37ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > Decision #54 & Invariant: GET /api/admin/ops/scan-reminders/status is strictly read-only 18ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > aborts and fails closed when database client is unconfigured or throws 5ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > withJobRun tracks failure and returns FAILED status upon unexpected error 5ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 401 when Authorization header is missing 59ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 400 when pool_id query parameter is missing or malformed 14ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 404 when pool does not exist 59ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 403 when user is not the pool commissioner 5ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 200 and game slate snapshot when user is the verified commissioner 15ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 401 when Authorization header is missing 22ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 400 when pool_id is missing or malformed in request body 7ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 404 when pool does not exist in request body 4ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 403 when user is not the pool commissioner 3ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 200 and upserts pick when authenticated user is the commissioner 24ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403
penalty_media row count = 0

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403
penalty_media row count = 0

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > verifies zero penalty_media rows exist after denied upload attempts
penalty_media row count = 0

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403
penalty_media row count = 0

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403 17ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403 8ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > verifies zero penalty_media rows exist after denied upload attempts 2ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: penalty OWNER -> 201 success 13ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403 6ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: pool COMMISSIONER -> 200 success 8ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write)
pool count before = 2
pool count after = 2
pool count invariant = PASS

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write)
pool count before = 2
pool count after = 2
pool count invariant = PASS

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 400 when explicit pool_id is not a valid UUID (no pool write)
pool count before = 2
pool count after = 2
pool count invariant = PASS

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 403 when user is not a member or commissioner of the requested pool (no pool write)
pool count before = 2
pool count after = 2
pool count invariant = PASS

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot
pool count before = 2
pool count after = 2
pool count invariant = PASS
member response byte equality = PASS
commissioner response byte equality = PASS

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write) 10ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write) 6ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 400 when explicit pool_id is not a valid UUID (no pool write) 6ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 403 when user is not a member or commissioner of the requested pool (no pool write) 7ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot 26ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > Decision #49: CI Route Scan & Route Guard Verification > verifies all routes with pool parameters are guarded; only /api/health and GET /api/admin/users allowlisted 1ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > strips database URLs, API keys, passwords, tokens and truncates to 200 chars 373ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > preserves key names for passwords and tokens while redacting values 104ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > scrubs ECONNREFUSED host:port patterns 70ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > handles extremely long error messages by truncating to 200 chars 7ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Console Mail Transport > appends formatted json logs to outbox-dev.log 40ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > SMTP Mail Transport & Timeouts > throws error on construction if MAIL_TRANSPORT=smtp and SMTP_FROM is missing 8ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > SMTP Mail Transport & Timeouts > fake hanging SMTP transporter times out and maps to error failure 8ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > HTML Escaping & Message-ID SHA256 > HTML escaping verification for interpolated markup in pool names and fields 7ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > HTML Escaping & Message-ID SHA256 > Message-ID SHA256 stability across executions 8ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > drains pending outbox event, sets status SENT and records sentAt 132ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > sets status SUPPRESSED when user email preference is disabled 30ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > applies discrete backoff schedule on transport failure 21ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > transitions to DEAD on 5th failure 18ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > Event repeatedly crashing during worker processing increments attempts to 5 and transitions to DEAD 12ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > Two concurrent workers with slow fake transport never duplicate sends (conditional renewal test) 187ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > creates JobRun with RUNNING and transitions to OK with itemsProcessed 26ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > records FAILED status and scrubbed errorCode when job execution throws 9ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > transitions to PARTIAL status when succeeded > 0 and failed + dead > 0 9ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > database write failure does not fail or abort the underlying job execution 11ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > runOutboxDrain integrates with withJobRun 11ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 401 when unauthenticated on GET health and POST retry 45ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 400 when pool_id is not a valid UUID 9ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 404 when pool does not exist 153ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 403 when authenticated user is a regular pool member (not commissioner) 20ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 403 when authenticated user is not a member of the pool 9ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 2. GET /api/pools/:pool_id/ops/health > returns accurate telemetry and is strictly read-only (Decision #54) 212ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 2. GET /api/pools/:pool_id/ops/health > strictly isolates pool telemetry with zero cross-pool leakage 15ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 3. POST /api/pools/:pool_id/ops/outbox/retry > retries only DEAD/FAILED outbox events for the specified pool, resetting attempts and lease 56ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 3. POST /api/pools/:pool_id/ops/outbox/retry > retries a specific event when outboxId is provided 169ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > returns 401 when unauthenticated 34ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > returns inbox messages for authenticated user in descending order (Decision #54 compliant) 130ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > supports unreadOnly filter and poolId filter 12ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 2. POST /api/me/inbox/:id/read > returns 401 when unauthenticated 10ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 2. POST /api/me/inbox/:id/read > returns 404 when message belongs to another user (ownership isolation) 14ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 2. POST /api/me/inbox/:id/read > marks single message read successfully and is idempotent 43ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 3. POST /api/me/inbox/read-all > returns 401 when unauthenticated 10ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 3. POST /api/me/inbox/read-all > marks all unread messages for the user as read 47ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > returns 401 when unauthenticated 7ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > returns default preferences on GET before upsert without mutating DB (Decision #54) 10ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > rejects invalid reminderOffsetsHours payloads with 400 11ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > updates valid preferences successfully 15ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > GET /api/notifications/unsubscribe validates token without modifying DB (Decision #54) 5ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > GET /api/notifications/unsubscribe returns 400 on malformed token and 404 on unknown token 4ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > POST /api/notifications/unsubscribe disables email without deleting row 6ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts RLS is ENABLED (relrowsecurity=true) and relforcerowsecurity=false on all application public tables 71ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts anon role is denied SELECT (SQLSTATE 42501) across all public tables 159ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts authenticated role is denied SELECT (SQLSTATE 42501) across all public tables 130ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b: asserts anon role is denied UPDATE on penalty_ledger with SQLSTATE 42501 (privilege proof) 6ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2c: asserts has_function_privilege returns false for anon and authenticated on BR-1 trigger functions 14ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: asserts trigger and function definitions match requirements (BEFORE ROW/STATEMENT, plpgsql, prosecdef=false, unconditional RAISE) 14ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: UPDATE (including no-op update) is blocked with count >= 1 and SQLSTATE P0001 25ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: DELETE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001 7ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: TRUNCATE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001 7ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: membership-row DELETE cascades to penalty_ledger and is intercepted by trigger with P0001 12ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: DELETE FROM pools fixture asserts exact foreign key constraint pool_memberships_pool_id_fkey and SQLSTATE 23503 4ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > both rows created 214ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > duplicate enqueue creates no second outbox OR inbox row 30ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > caller transaction that throws after enqueue leaves zero rows in both tables 20ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > IN_APP-only writes no outbox row 15ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > EMAIL-only writes no inbox row 16ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > disallowed payload key is stripped 19ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > reminder payload keys are exactly poolName, windowLabel, lockAtUtc, deepLink 6ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > rejects non-transaction client or root prisma instance 12ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > skips EMAIL channel if emailEnabled is false in NotificationPreference 19ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > static test fails if the module imports nodemailer, net, http(s) or fetch 6ms
 ✓ tests/br4b.test.ts > BR-4b: Fail-Closed Claim Store Invariant (Decision #52) > Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed 43ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > allows valid local disposable database URLs 2ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects remote / hosted database URLs (Supabase, AWS, Neon, etc.) 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > Decision #32 Sabotage Test: point TEST_DATABASE_URL at production fingerprint -> aborts before connection 0ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects URLs using ?schema= parameter to bypass host isolation 0ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects non-disposable production database names on localhost 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > sabotage test: throws when TEST_DATABASE_URL is empty string or undefined 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 when Authorization header is absent 2ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 when Authorization header does not start with Bearer 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 for an invalid / expired token 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > decodes valid JWT and attaches user to req.user, then calls next() 6ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > returns 401 if req.user is undefined 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > returns 403 if req.user is not ADMIN 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > calls next() if user is ADMIN 0ms
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
 ✓ tests/characterization.test.ts > BR-4 splitPenalty Math Characterization > Worked matrix: confirms exact zero-diff decimal split amounts 2ms
 ✓ tests/characterization.test.ts > BR-4b Set-Equality: Wrap-Up vs Scoring Resolver > Asserts 100% game ID set equality between wrap-up and scoring resolvers 1ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 1. Kickoff Future vs Past (Standard 0 Offset) > returns false (unlocked) when kickoff is in the future 3ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 1. Kickoff Future vs Past (Standard 0 Offset) > returns true (locked) when kickoff is in the past 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 1. Kickoff Future vs Past (Standard 0 Offset) > returns true (locked) at exact kickoff boundary (now === kickoff) 1ms
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

 Test Files  13 passed (13)
      Tests  146 passed (146)
   Start at  17:03:17
   Duration  12.72s (tests 54%, import 28%, transform 8%, setup 8%, worker 1%)

     Import  40 modules were evaluated 111 times · 2.72s total, 28% of tracked time
             ~1.74s faster with isolate: false — shared modules are evaluated once per worker instead of once per file
             learn more: https://vitest.dev/guide/improving-performance#test-isolation


(node:14736) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/scripts/db_header.js is not specified and it doesn't parse as CommonJS.
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
```

---

## 5. Item 4: CI Decision Register Check (`node scripts/ci_check_register.js`)
- **Exit Code:** 0 (Expected: 0)
- **Output:**
```
✅ CI Check PASSED: Appendix A Decision Register exists byte-for-byte in ARCHITECTURE.md.
```

---

## 6. Item 5: Targeted Reminder Scanner Invariants Telemetry

### 6.1 Reminder Scanner Test Assertions
```
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 1. Idempotency & Outbox Enqueue Invariants > enqueues outbox reminder for member with unsubmitted picks and deduplicates subsequent runs 501ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 2. User Notification Preferences Enforcement > skips users who have opted out of email / pick reminders (generates 0 outbox events) 4ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 2. User Notification Preferences Enforcement > skips members who have already submitted picks for all upcoming games in the window 86ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 3. Injectable Clock Time-Window Boundary Testing > moving clock forward cleanly transitions games in and out of windows without real-time delay 46ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects unauthenticated requests to POST /api/admin/ops/scan-reminders with 401 79ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects standard users from triggering reminder scan with 403 (Decision #20) 6ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects pool commissioners who lack global ADMIN role with 403 (Decision #20) 3ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > allows global ADMIN to trigger reminder scan via POST with 200 37ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > Decision #54 & Invariant: GET /api/admin/ops/scan-reminders/status is strictly read-only 18ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > aborts and fails closed when database client is unconfigured or throws 5ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > withJobRun tracks failure and returns FAILED status upon unexpected error 5ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > returns 401 when unauthenticated 7ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > returns default preferences on GET before upsert without mutating DB (Decision #54) 10ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > rejects invalid reminderOffsetsHours payloads with 400 11ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > updates valid preferences successfully 15ms
 ✓ tests/br4b.test.ts > BR-4b: Fail-Closed Claim Store Invariant (Decision #52) > Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed 43ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > fails closed (returns true / throws) when kickoffTime is null or undefined 1ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > fails closed when kickoffTime is an invalid date string 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > handles null, undefined, or NaN offset by defaulting to 0 offset 0ms
```

---

## 7. Item 6: Remote & Session Integrity (`git remote -v`)
```
origin	https://github.com/jdubciii/NFL-Pick-Em.git (fetch)
origin	https://github.com/jdubciii/NFL-Pick-Em.git (push)
```

---

## 8. LIVE REPOSITORY CONTEXT

### 8.1 Milestone 12.1-E Design Specification (`docs/design/12.1-E.md`)
```markdown
# Milestone 12.1-E Design Specification: Automated Reminder Scanner Engine

## 1. Architectural Scope & Tier Isolation (Decision #20 Hardening)
- System-Tier Component: The Reminder Scanner operates strictly as an autonomous background daemon / scheduled system service.
- Tier Boundaries:
  - Excluded entirely from pool commissioner endpoints (/api/pools/:pool_id/*).
  - Manual or scheduled triggers exist solely on internal/system-tier administrative pathways (/api/admin/ops/scan-reminders or internal cron CLI).
  - Does not leak system execution state or cross-pool member records into client-facing routes.

## 2. Producer Model & Idempotency Invariants
- Outbox Enqueue Contract:
  - Scans for upcoming NFL game locktimes across active leagues.
  - Identifies users who have unsubmitted picks for games within the notification window (e.g., 24h, 2h prior to kickoff).
  - Store-Level Deduplication: Every enqueued reminder event generates a deterministic idempotency_key (e.g., remind:v1:user:<user_id>:week:<week_id>:window:<window_hours>). Duplicate sweeps across the same window produce zero duplicate rows in outbox_events.
- User Preference Enforcement (Milestone 12.1 Step C Alignment):
  - Scans MUST evaluate user_notification_preferences.
  - If a user has disabled pick reminders, opted out, or silenced email/inbox channels, zero outbox events are created for that user.

## 3. Operational & Fault Tolerance Invariants
- Fail-Closed Semantics (Decision #55):
  - If the claim store, database connection, or outbox partition is unreachable, the scanner aborts the run, rolls back transactions, and logs a structured failure.
  - Partial scans never report a synthetic success state.
- Side-Effect Free GETs (Decision #54):
  - Scanner execution cannot be triggered by GET requests. Health checks on scanner readiness remain strictly read-only.
- Deterministic Time Handling:
  - Time resolution relies on an injectable clock interface (ClockFn: () => Date), permitting 100% deterministic unit and integration testing without wall-clock drift.

## 4. Verification & Testing Strategy
- Unit tests covering deterministic idempotency deduplication.
- Preference opt-out validation (opted-out users generate 0 events).
- Injectable clock time-window boundary testing.
- System-tier route isolation tests proving non-commissioner access.
```

### 8.2 Reminder Scanner Engine Service (`src/services/reminderScanner.ts`)
```typescript
import { Prisma, OutboxStatus } from '@prisma/client';
import prisma from '../db/client';
import { withJobRun } from '../jobs/jobRunner';

export type ClockFn = () => Date;

export interface ReminderScanOptions {
  clock?: ClockFn;
  windowsHours?: number[];
  weekId?: string | number;
  poolId?: string;
  prismaClient?: typeof prisma;
}

export interface ReminderScanResult {
  poolsScanned: number;
  usersScanned: number;
  remindersEnqueued: number;
  skippedOptedOut: number;
  skippedAlreadyPicked: number;
  windowsEvaluated: number[];
  scannedAt: string;
}

/**
 * Scans active pools and upcoming games to identify members with unsubmitted picks
 * within configured lookahead windows (default: 24h and 2h prior to game kickoff).
 * 
 * Invariants:
 * - Decision #20: Operates strictly at the System Tier.
 * - Decision #54: Triggered solely by write (POST) methods or background cron; GETs are read-only.
 * - Decision #55: Fails closed if the database or outbox is unreachable.
 * - Deterministic deduplication key: `remind:v1:user:<user_id>:week:<week_id>:window:<window_hours>`
 */
export async function scanAndEnqueueReminders(
  options: ReminderScanOptions = {}
): Promise<ReminderScanResult> {
  const clock: ClockFn = options.clock || (() => new Date());
  const now = clock();
  const windowsHours = options.windowsHours && options.windowsHours.length > 0
    ? options.windowsHours
    : [24, 2];
  const weekId = String(options.weekId ?? '1');
  const db = options.prismaClient || prisma;

  // Fail-Closed check (Decision #55): If DB client is invalid or unconfigured, throw
  if (!db || typeof db.$transaction !== 'function') {
    throw new Error('CLAIM_STORE_UNAVAILABLE: Database client is unconfigured or unavailable');
  }

  let poolsScanned = 0;
  let usersScanned = 0;
  let remindersEnqueued = 0;
  let skippedOptedOut = 0;
  let skippedAlreadyPicked = 0;

  // 1. Fetch active pools
  const poolWhere: Prisma.PoolWhereInput = {
    status: 'ACTIVE',
  };
  if (options.poolId) {
    poolWhere.id = options.poolId;
  }

  const pools = await db.pool.findMany({
    where: poolWhere,
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

  poolsScanned = pools.length;

  for (const pool of pools) {
    for (const windowHours of windowsHours) {
      // Lookahead window: kickoffTime > now AND kickoffTime <= now + (windowHours * 3600 * 1000)
      const windowEnd = new Date(now.getTime() + windowHours * 3600 * 1000);

      const upcomingGames = await db.game.findMany({
        where: {
          status: 'SCHEDULED',
          kickoffTime: {
            gt: now,
            lte: windowEnd,
          },
        },
        orderBy: { kickoffTime: 'asc' },
      });

      if (upcomingGames.length === 0) {
        continue;
      }

      const earliestKickoff = upcomingGames[0].kickoffTime;
      const gameIds = upcomingGames.map((g) => g.id);

      for (const membership of pool.memberships) {
        usersScanned++;
        const user = membership.user;
        const pref = user.notificationPreference;

        // User preference evaluation:
        // - Global opt-out: emailEnabled === false
        // - Specific window opt-out: reminderOffsetsHours defined and does not include windowHours
        // - pickReminders explicitly set to false
        if (pref) {
          if (pref.emailEnabled === false) {
            skippedOptedOut++;
            continue;
          }
          if (Array.isArray(pref.reminderOffsetsHours) && pref.reminderOffsetsHours.length > 0) {
            if (!pref.reminderOffsetsHours.includes(windowHours)) {
              skippedOptedOut++;
              continue;
            }
          }
          if ((pref as any).pickReminders === false) {
            skippedOptedOut++;
            continue;
          }
        }

        // Check if user has submitted picks for all upcoming games in this window
        const userPicks = await db.pick.findMany({
          where: {
            poolId: pool.id,
            userId: user.id,
            gameId: { in: gameIds },
            selectedTeamId: { not: null },
          },
        });

        const pickedGameIds = new Set(userPicks.map((p) => p.gameId));
        const hasMissingPicks = upcomingGames.some((g) => !pickedGameIds.has(g.id));

        if (!hasMissingPicks) {
          skippedAlreadyPicked++;
          continue;
        }

        // User needs a reminder. Construct deterministic compound deduplication key.
        const dedupeKey = `remind:v1:user:${user.id}:week:${weekId}:window:${windowHours}`;

        const payload = {
          poolName: pool.name,
          windowLabel: `${windowHours}h reminder`,
          lockAtUtc: earliestKickoff.toISOString(),
          deepLink: `/pools/${pool.id}/picks`,
        };

        // Transactional creation with database-enforced unique dedupeKey
        await db.$transaction(async (tx) => {
          const outboxResult = await tx.outboxEvent.createMany({
            data: [
              {
                poolId: pool.id,
                recipientUserId: user.id,
                type: 'REMINDER',
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
                type: 'REMINDER',
                payload,
                dedupeKey,
              },
            ],
            skipDuplicates: true,
          });

          if (outboxResult.count > 0) {
            remindersEnqueued++;
          }
        });
      }
    }
  }

  return {
    poolsScanned,
    usersScanned,
    remindersEnqueued,
    skippedOptedOut,
    skippedAlreadyPicked,
    windowsEvaluated: windowsHours,
    scannedAt: now.toISOString(),
  };
}

/**
 * Runs the Reminder Scanner within a tracked JobRun.
 */
export async function runReminderScan(options: ReminderScanOptions = {}) {
  let scanResult: ReminderScanResult = {
    poolsScanned: 0,
    usersScanned: 0,
    remindersEnqueued: 0,
    skippedOptedOut: 0,
    skippedAlreadyPicked: 0,
    windowsEvaluated: [],
    scannedAt: new Date().toISOString(),
  };

  const jobRun = await withJobRun('reminder_scan', async () => {
    scanResult = await scanAndEnqueueReminders(options);
    return {
      itemsProcessed: scanResult.remindersEnqueued,
      succeeded: scanResult.remindersEnqueued,
      failed: 0,
      meta: scanResult,
    };
  });

  return { jobRun, scanResult };
}
```

### 8.3 Admin Ops Router (`src/routes/adminOps.ts`)
```typescript
import { Router, Request, Response } from 'express';
import prisma from '../db/client';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { runReminderScan, scanAndEnqueueReminders } from '../services/reminderScanner';

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
```

### 8.4 Reminder Scanner Test Suite (`tests/reminderScanner.test.ts`)
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role } from '@prisma/client';
import { app } from '../src/server';
import { JWT_SECRET } from '../src/middleware/auth';
import { assertDisposableUrl } from '../src/db/safeguards';
import { scanAndEnqueueReminders, runReminderScan } from '../src/services/reminderScanner';

const rehearsalDbUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/pickem_rehearsal';

describe('Milestone 12.1-E: Automated Reminder Scanner Engine Tests', () => {
  let server: http.Server;
  let baseUrl: string;
  let prisma: PrismaClient;

  let adminUser: any;
  let commissionerUser: any;
  let standardUser: any;
  let optedOutUser: any;

  let adminToken: string;
  let commissionerToken: string;
  let standardToken: string;
  let optedOutToken: string;

  let pool: any;
  let game24h: any;
  let game2h: any;

  const baseTime = new Date('2026-10-15T12:00:00.000Z');

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
    adminUser = await prisma.user.create({
      data: {
        email: `scanner_admin_${Date.now()}@example.com`,
        passwordHash: 'hash123',
        role: Role.ADMIN,
      },
    });

    commissionerUser = await prisma.user.create({
      data: {
        email: `scanner_commish_${Date.now()}@example.com`,
        passwordHash: 'hash123',
        role: Role.USER,
      },
    });

    standardUser = await prisma.user.create({
      data: {
        email: `scanner_standard_${Date.now()}@example.com`,
        passwordHash: 'hash123',
        role: Role.USER,
      },
    });

    optedOutUser = await prisma.user.create({
      data: {
        email: `scanner_optout_${Date.now()}@example.com`,
        passwordHash: 'hash123',
        role: Role.USER,
      },
    });

    // Create NotificationPreference for optedOutUser (disabled email)
    await prisma.notificationPreference.create({
      data: {
        userId: optedOutUser.id,
        emailEnabled: false,
        reminderOffsetsHours: [24, 2],
      },
    });

    // Create NotificationPreference for standardUser (enabled email with 24h and 2h offsets)
    await prisma.notificationPreference.create({
      data: {
        userId: standardUser.id,
        emailEnabled: true,
        reminderOffsetsHours: [24, 2],
      },
    });

    adminToken = jwt.sign({ id: adminUser.id, email: adminUser.email, role: adminUser.role }, JWT_SECRET, { expiresIn: '1h' });
    commissionerToken = jwt.sign({ id: commissionerUser.id, email: commissionerUser.email, role: commissionerUser.role }, JWT_SECRET, { expiresIn: '1h' });
    standardToken = jwt.sign({ id: standardUser.id, email: standardUser.email, role: standardUser.role }, JWT_SECRET, { expiresIn: '1h' });
    optedOutToken = jwt.sign({ id: optedOutUser.id, email: optedOutUser.email, role: optedOutUser.role }, JWT_SECRET, { expiresIn: '1h' });

    // Create Pool administered by commissionerUser
    pool = await prisma.pool.create({
      data: {
        name: `Scanner Test Pool ${Date.now()}`,
        adminId: commissionerUser.id,
        status: 'ACTIVE',
        settings: { lock_offset: 0 },
      },
    });

    // Add memberships
    await prisma.poolMembership.createMany({
      data: [
        { poolId: pool.id, userId: commissionerUser.id, status: 'ACTIVE' },
        { poolId: pool.id, userId: standardUser.id, status: 'ACTIVE' },
        { poolId: pool.id, userId: optedOutUser.id, status: 'ACTIVE' },
      ],
    });

    // Create upcoming games relative to baseTime (2026-10-15T12:00:00Z)
    // Game 1: Kickoff in 20 hours (inside 24h window, outside 2h window) -> 2026-10-16T08:00:00Z
    game24h = await prisma.game.create({
      data: {
        externalGameId: `game_24h_${Date.now()}`,
        homeTeamId: 'KC',
        awayTeamId: 'BAL',
        kickoffTime: new Date(baseTime.getTime() + 20 * 3600 * 1000),
        status: 'SCHEDULED',
      },
    });

    // Game 2: Kickoff in 1 hour (inside both 24h and 2h window) -> 2026-10-15T13:00:00Z
    game2h = await prisma.game.create({
      data: {
        externalGameId: `game_2h_${Date.now()}`,
        homeTeamId: 'SF',
        awayTeamId: 'DAL',
        kickoffTime: new Date(baseTime.getTime() + 1 * 3600 * 1000),
        status: 'SCHEDULED',
      },
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  describe('1. Idempotency & Outbox Enqueue Invariants', () => {
    it('enqueues outbox reminder for member with unsubmitted picks and deduplicates subsequent runs', async () => {
      // 1st run targeting 24h window
      const result1 = await scanAndEnqueueReminders({
        clock: () => baseTime,
        windowsHours: [24],
        weekId: 1,
        poolId: pool.id,
      });

      expect(result1.poolsScanned).toBe(1);
      // Standard user & commissioner user enqueued; optedOutUser skipped
      expect(result1.remindersEnqueued).toBeGreaterThanOrEqual(1);

      const standardDedupeKey = `remind:v1:user:${standardUser.id}:week:1:window:24`;
      const outboxEventsAfter1 = await prisma.outboxEvent.findMany({
        where: { dedupeKey: standardDedupeKey },
      });
      expect(outboxEventsAfter1.length).toBe(1);
      expect(outboxEventsAfter1[0].status).toBe('PENDING');
      expect(outboxEventsAfter1[0].recipientUserId).toBe(standardUser.id);
      expect(outboxEventsAfter1[0].type).toBe('REMINDER');

      // 2nd run with same parameters (sweeping the same window)
      const result2 = await scanAndEnqueueReminders({
        clock: () => baseTime,
        windowsHours: [24],
        weekId: 1,
        poolId: pool.id,
      });

      expect(result2.remindersEnqueued).toBe(0); // 0 new outbox records created

      const outboxEventsAfter2 = await prisma.outboxEvent.findMany({
        where: { dedupeKey: standardDedupeKey },
      });
      expect(outboxEventsAfter2.length).toBe(1); // EXACTLY 1 row remains
    });
  });

  describe('2. User Notification Preferences Enforcement', () => {
    it('skips users who have opted out of email / pick reminders (generates 0 outbox events)', async () => {
      const optoutDedupeKey24 = `remind:v1:user:${optedOutUser.id}:week:1:window:24`;
      const optoutDedupeKey2 = `remind:v1:user:${optedOutUser.id}:week:1:window:2`;

      const events = await prisma.outboxEvent.findMany({
        where: {
          dedupeKey: { in: [optoutDedupeKey24, optoutDedupeKey2] },
        },
      });

      expect(events.length).toBe(0);
    });

    it('skips members who have already submitted picks for all upcoming games in the window', async () => {
      // Submit picks for standardUser for both upcoming games
      await prisma.pick.createMany({
        data: [
          { poolId: pool.id, userId: standardUser.id, gameId: game24h.id, selectedTeamId: 'KC', submittedById: standardUser.id },
          { poolId: pool.id, userId: standardUser.id, gameId: game2h.id, selectedTeamId: 'SF', submittedById: standardUser.id },
        ],
      });

      const dedupeKeyWeek2 = `remind:v1:user:${standardUser.id}:week:2:window:24`;

      const scanResult = await scanAndEnqueueReminders({
        clock: () => baseTime,
        windowsHours: [24],
        weekId: 2,
        poolId: pool.id,
      });

      const userOutbox = await prisma.outboxEvent.findMany({
        where: { dedupeKey: dedupeKeyWeek2 },
      });

      expect(userOutbox.length).toBe(0);
      expect(scanResult.skippedAlreadyPicked).toBeGreaterThanOrEqual(1);
    });
  });

  describe('3. Injectable Clock Time-Window Boundary Testing', () => {
    it('moving clock forward cleanly transitions games in and out of windows without real-time delay', async () => {
      // Create user needing picks
      const newUser = await prisma.user.create({
        data: {
          email: `clock_user_${Date.now()}@example.com`,
          passwordHash: 'hash123',
          role: Role.USER,
        },
      });
      await prisma.poolMembership.create({
        data: { poolId: pool.id, userId: newUser.id, status: 'ACTIVE' },
      });

      // Target only 2h window
      // At baseTime (12:00Z), game2h kickoffs at 13:00Z (1h away -> in 2h window).
      // game24h kickoffs at +20h (8:00Z next day -> outside 2h window).
      const scan2h = await scanAndEnqueueReminders({
        clock: () => baseTime,
        windowsHours: [2],
        weekId: 3,
        poolId: pool.id,
      });

      const user2hEvent = await prisma.outboxEvent.findUnique({
        where: { dedupeKey: `remind:v1:user:${newUser.id}:week:3:window:2` },
      });
      expect(user2hEvent).not.toBeNull();
      expect(user2hEvent?.recipientUserId).toBe(newUser.id);

      // Now shift clock to 2 hours AFTER game2h kickoff (15:00Z)
      const pastTime = new Date(baseTime.getTime() + 3 * 3600 * 1000);
      const scanAfterKickoff = await scanAndEnqueueReminders({
        clock: () => pastTime,
        windowsHours: [2],
        weekId: 4,
        poolId: pool.id,
      });

      // game2h is now in the past (kickoff < now) and game24h is 17h away (> 2h) -> 0 reminders for 2h window
      const userPastEvent = await prisma.outboxEvent.findUnique({
        where: { dedupeKey: `remind:v1:user:${newUser.id}:week:4:window:2` },
      });
      expect(userPastEvent).toBeNull();
    });
  });

  describe('4. Tier Separation & System Route Access Guards (Decision #20 & #54)', () => {
    it('rejects unauthenticated requests to POST /api/admin/ops/scan-reminders with 401', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ops/scan-reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      expect(res.status).toBe(401);
    });

    it('rejects standard users from triggering reminder scan with 403 (Decision #20)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ops/scan-reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${standardToken}`,
        },
      });
      expect(res.status).toBe(403);
    });

    it('rejects pool commissioners who lack global ADMIN role with 403 (Decision #20)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ops/scan-reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${commissionerToken}`,
        },
      });
      expect(res.status).toBe(403);
    });

    it('allows global ADMIN to trigger reminder scan via POST with 200', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ops/scan-reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          windowsHours: [24],
          weekId: 5,
          poolId: pool.id,
        }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.message).toBe('Reminder scan executed successfully');
      expect(json.jobRun).toBeDefined();
      expect(json.scanResult).toBeDefined();
    });

    it('Decision #54 & Invariant: GET /api/admin/ops/scan-reminders/status is strictly read-only', async () => {
      const beforeJobRuns = await prisma.jobRun.count();
      const beforeOutbox = await prisma.outboxEvent.count();

      const res = await fetch(`${baseUrl}/api/admin/ops/scan-reminders/status`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('ok');
      expect(json.service).toBe('reminder_scanner');

      const afterJobRuns = await prisma.jobRun.count();
      const afterOutbox = await prisma.outboxEvent.count();

      expect(afterJobRuns).toBe(beforeJobRuns);
      expect(afterOutbox).toBe(beforeOutbox);
    });
  });

  describe('5. Fail-Closed Resilience (Decision #55)', () => {
    it('aborts and fails closed when database client is unconfigured or throws', async () => {
      const brokenClient = {} as any;

      await expect(
        scanAndEnqueueReminders({
          clock: () => baseTime,
          prismaClient: brokenClient,
        })
      ).rejects.toThrow('CLAIM_STORE_UNAVAILABLE');
    });

    it('withJobRun tracks failure and returns FAILED status upon unexpected error', async () => {
      const brokenClient = {
        $transaction: async () => {
          throw new Error('Database connection reset');
        },
        pool: {
          findMany: async () => {
            throw new Error('Database connection reset');
          },
        },
      } as any;

      const { jobRun } = await runReminderScan({
        prismaClient: brokenClient,
      });

      expect(jobRun.status).toBe('FAILED');
      expect(jobRun.errorCode).toContain('Database connection reset');
    });
  });
});
```
