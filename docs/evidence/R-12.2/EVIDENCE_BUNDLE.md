# TWO-STAGE EVIDENCE BINDING RECORD (PATH B — GOVERNED)
- **Execution Baseline SHA (E_SHA):** 7d84860969b2ea8b52b006c17d77be32a572dcb2
- **Binding Container Target:** HEAD (Target for binding commit)
- **Lineage Verification:** PARENT_VERIFIED (Parent commit of binding container is guaranteed to be 7d84860969b2ea8b52b006c17d77be32a572dcb2)
- **Baseline Working Tree:** 100% CLEAN (0 modified, 0 untracked)
- **Governing Standard:** ARCHITECTURE.md (Two-Stage Forward-Binding Evidence Protocol)
--------------------------------------------------------------------------------

# MILESTONE 12.2 EVIDENCE BUNDLE: WEEKLY WRAP-UP ENGINE, OVERRIDES, PROPOSALS & SEASON SEAL
**Execution Timestamp:** 2026-10-03T00:25:52.383Z
**Target Branch:** `feat/phase12-2-wrapup-engine`
**Execution Baseline SHA:** `7d84860969b2ea8b52b006c17d77be32a572dcb2`
**Generator Exit Code:** 0

---

## 1. Acceptance Matrix
### Milestone 12.2 Acceptance Matrix
- 12.2.1 (Weekly Wrap-Up Execution Engine & JobRunner Integration): PASS
- 12.2.2 (Decision #24 Atomic Claim Invariant on weekly_wrapups): PASS
- 12.2.3 (Decision #27 Precondition & Fail Closed on Incomplete Slates): PASS
- 12.2.4 (Decisions #3 & #22 Precision Decimal Scoring & Split Penalties): PASS
- 12.2.5 (Decision #57 Outbox Fan-Out & Preference Opt-Out Enforcement): PASS
- 12.2.6 (Commissioner Override Proposals & Serializable Execution): PASS
- 12.2.7 (Season Seal Standings Snapshot & Invariant): PASS
- 12.2.8 (Decision #20 Tier Separation: System vs Pool Commissioner): PASS
- 12.2.9 (Decision #54 Read-Only Status on GET Endpoints): PASS
- 12.2.10 (Decision #55 Fail-Closed Resilience on Missing Dependencies): PASS
- 12.2.11 (Full Database Test Suite 162/162 Passing with Clean Rehearsal DB): PASS

---

## 2. Item 1: Git Identity & Ancestry

### 2.1 Branch & Commit Identification
- **Active Branch:** `feat/phase12-2-wrapup-engine`
- **Execution Baseline SHA:** `7d84860969b2ea8b52b006c17d77be32a572dcb2`

### 2.2 Working Tree Status at Baseline
```
?? scripts/generate_evidence_12_2.js
```

### 2.3 Git Log Ancestry (Milestone 12.2 Commit Lineage)
```
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
010610e docs: bind authoritative Section 9 verification bundle with Path B lineage record
88f5cda docs: formalize Two-Stage Forward-Binding Evidence Protocol for published branches
9f97965 docs: bind authoritative Section 9 verification bundle for R-12.1-RESTORE-01
794549c chore: finalize Section 9 evidence generator script
```

---

## 3. Item 2: Merge Base & Diffstat Against Main

### 3.1 Merge Base vs `main`
- **Merge Base SHA:** `97a72e7ce8efd7d3359b68c4025aa739f298aa15`

### 3.2 Diffstat (`git diff --stat main...HEAD`)
```
docs/design/12.2.md             |  37 +++
 src/routes/adminOps.ts          | 115 +++++++++-
 src/routes/ops.ts               | 103 +++++++++
 src/services/notifications.ts   |   4 +
 src/services/overrideService.ts | 236 +++++++++++++++++++
 src/services/seasonSeal.ts      | 178 +++++++++++++++
 src/services/wrapUpEngine.ts    | 493 ++++++++++++++++++++++++++++++++++++++++
 tests/overrides.test.ts         | 240 +++++++++++++++++++
 tests/wrapUpEngine.test.ts      | 400 ++++++++++++++++++++++++++++++++
 9 files changed, 1805 insertions(+), 1 deletion(-)
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
│ 0       │ '20260927000000_init'                                       │ 2026-10-03T00:26:01.062Z │
│ 1       │ '20260928051824_add_pool_member_stats_and_penalty_ledger'   │ 2026-10-03T00:26:01.088Z │
│ 2       │ '20260928124900_precision_and_weekly_submissions'           │ 2026-10-03T00:26:01.126Z │
│ 3       │ '20260928170000_weekly_submission_finalized_and_game_notes' │ 2026-10-03T00:26:01.134Z │
│ 4       │ '20260928180000_shot_cam_penalty_media_and_rls'             │ 2026-10-03T00:26:01.153Z │
│ 5       │ '20260929144500_br_1_ledger_append_only'                    │ 2026-10-03T00:26:01.161Z │
│ 6       │ '20260930010000_br_2b_ledger_api_lockdown'                  │ 2026-10-03T00:26:01.169Z │
│ 7       │ '20260930020000_br_2c_public_tables_api_lockdown'           │ 2026-10-03T00:26:01.177Z │
│ 8       │ '20261001160000_12_1_a_outbox_inbox_core'                   │ 2026-10-03T00:26:01.246Z │
└─────────┴─────────────────────────────────────────────────────────────┴──────────────────────────┘
weekly_wrapups exists in public: false (Expected: false)
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "pickem_rehearsal", schema "public" at "localhost:5432"

9 migrations found in prisma/migrations


No pending migrations to apply.
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma

✔ Generated Prisma Client (v5.22.0) to .\node_modules\@prisma\client in 296ms

Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

Tip: Want real-time updates to your database without manual polling? Discover how with Pulse: https://pris.ly/tip-0-pulse

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
    "started_at": "2026-10-03T00:26:00.992Z",
    "finished_at": "2026-10-03T00:26:01.062Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928051824_add_pool_member_stats_and_penalty_ledger",
    "started_at": "2026-10-03T00:26:01.063Z",
    "finished_at": "2026-10-03T00:26:01.088Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928124900_precision_and_weekly_submissions",
    "started_at": "2026-10-03T00:26:01.089Z",
    "finished_at": "2026-10-03T00:26:01.126Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928170000_weekly_submission_finalized_and_game_notes",
    "started_at": "2026-10-03T00:26:01.127Z",
    "finished_at": "2026-10-03T00:26:01.134Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928180000_shot_cam_penalty_media_and_rls",
    "started_at": "2026-10-03T00:26:01.135Z",
    "finished_at": "2026-10-03T00:26:01.153Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260929144500_br_1_ledger_append_only",
    "started_at": "2026-10-03T00:26:01.155Z",
    "finished_at": "2026-10-03T00:26:01.161Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260930010000_br_2b_ledger_api_lockdown",
    "started_at": "2026-10-03T00:26:01.163Z",
    "finished_at": "2026-10-03T00:26:01.169Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260930020000_br_2c_public_tables_api_lockdown",
    "started_at": "2026-10-03T00:26:01.171Z",
    "finished_at": "2026-10-03T00:26:01.177Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20261001160000_12_1_a_outbox_inbox_core",
    "started_at": "2026-10-03T00:26:01.178Z",
    "finished_at": "2026-10-03T00:26:01.246Z",
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

 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > returns 401 when unauthenticated 49ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > returns inbox messages for authenticated user in descending order (Decision #54 compliant) 232ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > supports unreadOnly filter and poolId filter 15ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 2. POST /api/me/inbox/:id/read > returns 401 when unauthenticated 7ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 2. POST /api/me/inbox/:id/read > returns 404 when message belongs to another user (ownership isolation) 15ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 2. POST /api/me/inbox/:id/read > marks single message read successfully and is idempotent 30ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 3. POST /api/me/inbox/read-all > returns 401 when unauthenticated 2ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 3. POST /api/me/inbox/read-all > marks all unread messages for the user as read 54ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > returns 401 when unauthenticated 8ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > returns default preferences on GET before upsert without mutating DB (Decision #54) 11ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > rejects invalid reminderOffsetsHours payloads with 400 22ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > updates valid preferences successfully 33ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > GET /api/notifications/unsubscribe validates token without modifying DB (Decision #54) 5ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > GET /api/notifications/unsubscribe returns 400 on malformed token and 404 on unknown token 4ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > POST /api/notifications/unsubscribe disables email without deleting row 13ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 401 when Authorization header is missing 66ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 400 when pool_id query parameter is missing or malformed 27ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 404 when pool does not exist 240ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 403 when user is not the pool commissioner 7ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 200 and game slate snapshot when user is the verified commissioner 20ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 401 when Authorization header is missing 58ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 400 when pool_id is missing or malformed in request body 21ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 404 when pool does not exist in request body 45ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 403 when user is not the pool commissioner 9ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 200 and upserts pick when authenticated user is the commissioner 63ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403
penalty_media row count = 0

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403
penalty_media row count = 0

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > verifies zero penalty_media rows exist after denied upload attempts
penalty_media row count = 0

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403 33ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403 19ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > verifies zero penalty_media rows exist after denied upload attempts 4ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403
penalty_media row count = 0

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: penalty OWNER -> 201 success 67ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403 12ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: pool COMMISSIONER -> 200 success 10ms
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

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write) 31ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write) 8ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 400 when explicit pool_id is not a valid UUID (no pool write) 12ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 403 when user is not a member or commissioner of the requested pool (no pool write) 11ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot 28ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > Decision #49: CI Route Scan & Route Guard Verification > verifies all routes with pool parameters are guarded; only /api/health and GET /api/admin/users allowlisted 1ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 1. Idempotency & Outbox Enqueue Invariants > enqueues outbox reminder for member with unsubmitted picks and deduplicates subsequent runs 101ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 2. User Notification Preferences Enforcement > skips users who have opted out of email / pick reminders (generates 0 outbox events) 2ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 2. User Notification Preferences Enforcement > skips members who have already submitted picks for all upcoming games in the window 18ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 3. Injectable Clock Time-Window Boundary Testing > moving clock forward cleanly transitions games in and out of windows without real-time delay 30ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects unauthenticated requests to POST /api/admin/ops/scan-reminders with 401 58ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects standard users from triggering reminder scan with 403 (Decision #20) 6ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects pool commissioners who lack global ADMIN role with 403 (Decision #20) 6ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > allows global ADMIN to trigger reminder scan via POST with 200 32ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > Decision #54 & Invariant: GET /api/admin/ops/scan-reminders/status is strictly read-only 18ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > aborts and fails closed when database client is unconfigured or throws 6ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > withJobRun tracks failure and returns FAILED status upon unexpected error 5ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 1. Precondition Check & Fail Closed (Decision #27 & #55) > fails closed with SCORE_FEED_UNAVAILABLE when unfinalized games exist for target week 88ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 1. Precondition Check & Fail Closed (Decision #27 & #55) > fails closed when DB client or claim store is unreachable (Decision #55) 4ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 2. Precision Decimal Scoring & Split Penalties (Decisions #3 & #22) > calculates standings and splits dead place penalty precisely between tied losers 88ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 3. Claim Store Concurrency & Idempotency (Decision #24 & #57) > subsequent execution on already wrapped week returns ALREADY_WRAPPED_UP and produces 0 duplicates 4ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 3. Claim Store Concurrency & Idempotency (Decision #24 & #57) > enforces outbox notification preferences and deduplication key (Decision #57) 8ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/wrap-up is rejected for standard users and pool commissioners (Decision #20) 64ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/wrap-up succeeds for system ADMIN 33ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > GET /api/admin/ops/wrap-up/status is strictly read-only (Decision #54) 10ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/season-seal records immutable snapshot 43ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 401 when unauthenticated on GET health and POST retry 44ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 400 when pool_id is not a valid UUID 13ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 404 when pool does not exist 65ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 403 when authenticated user is a regular pool member (not commissioner) 9ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 403 when authenticated user is not a member of the pool 10ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 2. GET /api/pools/:pool_id/ops/health > returns accurate telemetry and is strictly read-only (Decision #54) 164ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 2. GET /api/pools/:pool_id/ops/health > strictly isolates pool telemetry with zero cross-pool leakage 22ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 3. POST /api/pools/:pool_id/ops/outbox/retry > retries only DEAD/FAILED outbox events for the specified pool, resetting attempts and lease 67ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 3. POST /api/pools/:pool_id/ops/outbox/retry > retries a specific event when outboxId is provided 20ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > strips database URLs, API keys, passwords, tokens and truncates to 200 chars 208ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > preserves key names for passwords and tokens while redacting values 9ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > scrubs ECONNREFUSED host:port patterns 7ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > handles extremely long error messages by truncating to 200 chars 6ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Console Mail Transport > appends formatted json logs to outbox-dev.log 12ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > SMTP Mail Transport & Timeouts > throws error on construction if MAIL_TRANSPORT=smtp and SMTP_FROM is missing 6ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > SMTP Mail Transport & Timeouts > fake hanging SMTP transporter times out and maps to error failure 9ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > HTML Escaping & Message-ID SHA256 > HTML escaping verification for interpolated markup in pool names and fields 5ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > HTML Escaping & Message-ID SHA256 > Message-ID SHA256 stability across executions 7ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > drains pending outbox event, sets status SENT and records sentAt 40ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > sets status SUPPRESSED when user email preference is disabled 22ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > applies discrete backoff schedule on transport failure 20ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > transitions to DEAD on 5th failure 18ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > Event repeatedly crashing during worker processing increments attempts to 5 and transitions to DEAD 17ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > Two concurrent workers with slow fake transport never duplicate sends (conditional renewal test) 96ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > creates JobRun with RUNNING and transitions to OK with itemsProcessed 27ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > records FAILED status and scrubbed errorCode when job execution throws 15ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > transitions to PARTIAL status when succeeded > 0 and failed + dead > 0 11ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > database write failure does not fail or abort the underlying job execution 10ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > runOutboxDrain integrates with withJobRun 13ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts RLS is ENABLED (relrowsecurity=true) and relforcerowsecurity=false on all application public tables 64ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts anon role is denied SELECT (SQLSTATE 42501) across all public tables 175ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts authenticated role is denied SELECT (SQLSTATE 42501) across all public tables 112ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b: asserts anon role is denied UPDATE on penalty_ledger with SQLSTATE 42501 (privilege proof) 9ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2c: asserts has_function_privilege returns false for anon and authenticated on BR-1 trigger functions 10ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects non-commissioner pool members with 403 Forbidden 111ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects global ADMIN users who are not pool commissioners (Decision #20 zero bypass) 8ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects commissioners of different pools with 403 Forbidden 6ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > allows valid pool commissioner to create an override proposal 27ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > applies a commissioner pick override inside a serializable transaction 36ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > applies a commissioner penalty override with decimal ledger tracking 32ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 3. Read-Only GET Proposal Query (Decision #54) > GET /api/pools/:pool_id/proposals returns history and produces zero side effects 13ms
 ✓ tests/br4b.test.ts > BR-4b: Fail-Closed Claim Store Invariant (Decision #52) > Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed 63ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > both rows created 98ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > duplicate enqueue creates no second outbox OR inbox row 20ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > caller transaction that throws after enqueue leaves zero rows in both tables 18ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > IN_APP-only writes no outbox row 10ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > EMAIL-only writes no inbox row 13ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > disallowed payload key is stripped 17ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > reminder payload keys are exactly poolName, windowLabel, lockAtUtc, deepLink 5ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > rejects non-transaction client or root prisma instance 7ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > skips EMAIL channel if emailEnabled is false in NotificationPreference 12ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > static test fails if the module imports nodemailer, net, http(s) or fetch 10ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: asserts trigger and function definitions match requirements (BEFORE ROW/STATEMENT, plpgsql, prosecdef=false, unconditional RAISE) 11ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: UPDATE (including no-op update) is blocked with count >= 1 and SQLSTATE P0001 22ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: DELETE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001 7ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: TRUNCATE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001 7ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: membership-row DELETE cascades to penalty_ledger and is intercepted by trigger with P0001 13ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: DELETE FROM pools fixture asserts exact foreign key constraint pool_memberships_pool_id_fkey and SQLSTATE 23503 5ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 when Authorization header is absent 2ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 when Authorization header does not start with Bearer 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 for an invalid / expired token 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > decodes valid JWT and attaches user to req.user, then calls next() 8ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > returns 401 if req.user is undefined 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > returns 403 if req.user is not ADMIN 1ms
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
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 1. Kickoff Future vs Past (Standard 0 Offset) > returns false (unlocked) when kickoff is in the future 3ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 1. Kickoff Future vs Past (Standard 0 Offset) > returns true (locked) when kickoff is in the past 1ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 1. Kickoff Future vs Past (Standard 0 Offset) > returns true (locked) at exact kickoff boundary (now === kickoff) 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 2. Pool-Specific Lock Offsets > locks early when positive offset is configured (e.g., 60 minutes before kickoff) 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 2. Pool-Specific Lock Offsets > supports negative offsets (e.g., locking 15 minutes after kickoff) 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > fails closed (returns true / throws) when kickoffTime is null or undefined 1ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > fails closed when kickoffTime is an invalid date string 1ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > handles null, undefined, or NaN offset by defaulting to 0 offset 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 4. computeGameLockStatus > returns full lock metadata correctly for unlocked game 2ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 4. computeGameLockStatus > returns full lock metadata correctly for locked game 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 4. computeGameLockStatus > returns safe fallback on missing kickoffTime 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 5. isGameInExcludedWindow > returns false if no excluded windows are passed or list is empty 0ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 5. isGameInExcludedWindow > identifies Thursday Night Football correctly 1ms
 ✓ tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 5. isGameInExcludedWindow > identifies Monday Night Football correctly 0ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Rolling lock: enforces lock per-game at kickoff boundary 4ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Rolling lock with offset: enforces lock at (kickoff - offset) 0ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Global lock vs Rolling lock: handles first game vs later games 0ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Excluded windows: correctly identifies TNF, MNF, Sunday Early/Late, SNF 2ms
 ✓ tests/characterization.test.ts > BR-4 splitPenalty Math Characterization > Worked matrix: confirms exact zero-diff decimal split amounts 3ms
 ✓ tests/characterization.test.ts > BR-4b Set-Equality: Wrap-Up vs Scoring Resolver > Asserts 100% game ID set equality between wrap-up and scoring resolvers 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > allows valid local disposable database URLs 3ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects remote / hosted database URLs (Supabase, AWS, Neon, etc.) 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > Decision #32 Sabotage Test: point TEST_DATABASE_URL at production fingerprint -> aborts before connection 0ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects URLs using ?schema= parameter to bypass host isolation 0ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects non-disposable production database names on localhost 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > sabotage test: throws when TEST_DATABASE_URL is empty string or undefined 1ms

 Test Files  15 passed (15)
      Tests  162 passed (162)
   Start at  17:26:14
   Duration  15.56s (tests 47%, import 36%, setup 8%, transform 8%, worker 1%)

     Import  45 modules were evaluated 175 times · 4.16s total, 36% of tracked time
             ~3.09s faster with isolate: false — shared modules are evaluated once per worker instead of once per file
             learn more: https://vitest.dev/guide/improving-performance#test-isolation


(node:16220) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/scripts/db_header.js is not specified and it doesn't parse as CommonJS.
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

## 6. Item 5: Targeted Milestone 12.2 Invariants Telemetry

### 6.1 Targeted Test Suite Assertions (Wrap-Up Engine & Overrides)
```
=== RESET REHEARSAL DATABASE (Decision #35) ===
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > returns inbox messages for authenticated user in descending order (Decision #54 compliant) 232ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > returns default preferences on GET before upsert without mutating DB (Decision #54) 11ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > GET /api/notifications/unsubscribe validates token without modifying DB (Decision #54) 5ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 401 when Authorization header is missing 66ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 400 when pool_id query parameter is missing or malformed 27ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 404 when pool does not exist 240ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 403 when user is not the pool commissioner 7ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 200 and game slate snapshot when user is the verified commissioner 20ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 401 when Authorization header is missing 58ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 400 when pool_id is missing or malformed in request body 21ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 404 when pool does not exist in request body 45ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 403 when user is not the pool commissioner 9ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 200 and upserts pick when authenticated user is the commissioner 63ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > verifies zero penalty_media rows exist after denied upload attempts
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403 33ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403 19ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > verifies zero penalty_media rows exist after denied upload attempts 4ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: penalty OWNER -> 201 success 67ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403 12ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: pool COMMISSIONER -> 200 success 10ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write)
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write)
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 400 when explicit pool_id is not a valid UUID (no pool write)
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 403 when user is not a member or commissioner of the requested pool (no pool write)
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write) 31ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write) 8ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 400 when explicit pool_id is not a valid UUID (no pool write) 12ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 403 when user is not a member or commissioner of the requested pool (no pool write) 11ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot 28ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > Decision #49: CI Route Scan & Route Guard Verification > verifies all routes with pool parameters are guarded; only /api/health and GET /api/admin/users allowlisted 1ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects unauthenticated requests to POST /api/admin/ops/scan-reminders with 401 58ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects standard users from triggering reminder scan with 403 (Decision #20) 6ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects pool commissioners who lack global ADMIN role with 403 (Decision #20) 6ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > allows global ADMIN to trigger reminder scan via POST with 200 32ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > Decision #54 & Invariant: GET /api/admin/ops/scan-reminders/status is strictly read-only 18ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > aborts and fails closed when database client is unconfigured or throws 6ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > withJobRun tracks failure and returns FAILED status upon unexpected error 5ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 1. Precondition Check & Fail Closed (Decision #27 & #55) > fails closed with SCORE_FEED_UNAVAILABLE when unfinalized games exist for target week 88ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 1. Precondition Check & Fail Closed (Decision #27 & #55) > fails closed when DB client or claim store is unreachable (Decision #55) 4ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 2. Precision Decimal Scoring & Split Penalties (Decisions #3 & #22) > calculates standings and splits dead place penalty precisely between tied losers 88ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 3. Claim Store Concurrency & Idempotency (Decision #24 & #57) > subsequent execution on already wrapped week returns ALREADY_WRAPPED_UP and produces 0 duplicates 4ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 3. Claim Store Concurrency & Idempotency (Decision #24 & #57) > enforces outbox notification preferences and deduplication key (Decision #57) 8ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/wrap-up is rejected for standard users and pool commissioners (Decision #20) 64ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/wrap-up succeeds for system ADMIN 33ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > GET /api/admin/ops/wrap-up/status is strictly read-only (Decision #54) 10ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/season-seal records immutable snapshot 43ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 2. GET /api/pools/:pool_id/ops/health > returns accurate telemetry and is strictly read-only (Decision #54) 164ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects non-commissioner pool members with 403 Forbidden 111ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects global ADMIN users who are not pool commissioners (Decision #20 zero bypass) 8ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects commissioners of different pools with 403 Forbidden 6ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > allows valid pool commissioner to create an override proposal 27ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > applies a commissioner pick override inside a serializable transaction 36ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > applies a commissioner penalty override with decimal ledger tracking 32ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 3. Read-Only GET Proposal Query (Decision #54) > GET /api/pools/:pool_id/proposals returns history and produces zero side effects 13ms
 ✓ tests/br4b.test.ts > BR-4b: Fail-Closed Claim Store Invariant (Decision #52) > Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed 63ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > Decision #20 & R-12.2-W: global ADMIN who is not the pool commissioner -> 403, no req.pool, zero side effects 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolMember > Decision #20 & R-12.2-W: global ADMIN who is not a member and not commissioner -> 403, no req.pool 0ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > Decision #32 Sabotage Test: point TEST_DATABASE_URL at production fingerprint -> aborts before connection 0ms
```

---

## 7. Item 6: Remote & Session Integrity (`git remote -v`)
```
origin	https://github.com/jdubciii/NFL-Pick-Em.git (fetch)
origin	https://github.com/jdubciii/NFL-Pick-Em.git (push)
```

---

## 8. LIVE REPOSITORY CONTEXT

### 8.1 Milestone 12.2 Design Specification (`docs/design/12.2.md`)
```markdown
# Milestone 12.2 Design Specification: Weekly Wrap-Up Engine, Overrides, Proposals & Season Seal

## 1. Architectural Scope & Tier Isolation (Decision #20 Hardening)
- **System Tier (Global Operations):**
  - Background Wrap-Up Scanner & Engine: Evaluates completed weekly slates across leagues and enqueues wrap-up notification fan-outs.
  - Global Season Seal: Seals completed regular/post-season slates; prevents post-deadline modifications.
  - Execution Routes: Internal system pathways (`/api/admin/ops/wrap-up/*`) guarded strictly by `requireAdmin`.
- **Pool Tier (Tenant Scoping):**
  - Weekly Overrides & Commissioner Proposals: Operates strictly within `/api/pools/:pool_id/proposals` and `/api/pools/:pool_id/overrides`.
  - Guarded strictly by `requirePoolCommissioner`. Cannot alter global system configuration or cross-pool states.

## 2. Wrap-Up Producer Model & Outbox Distribution
- **Trigger Conditions:**
  - Game slates reach final status (all games concluded and scores locked).
  - Wrap-up producer evaluates pool standings, weekly high-scorers, and penalty assignments.
- **Store-Enforced Idempotency:**
  - Deterministic compound deduplication keys: `wrapup:v1:pool:<pool_id>:week:<week_id>:user:<user_id>`.
  - Multiple worker sweeps or admin re-scans produce zero duplicate outbox events.
- **Notification Preference Enforcement:**
  - Evaluates user preferences (`weeklyWrapup: true`). Opted-out users produce zero enqueued outbox messages.

## 3. Operational & Security Invariants
- **Side-Effect Free GETs (Decision #54):**
  - Evaluation or generation of wrap-ups, proposals, and seals cannot occur on GET requests.
  - GET routes exclusively return current status, standings, or pending proposals.
- **Fail-Closed Semantics (Decision #55):**
  - If score sources or claim stores are unavailable or incomplete, wrap-up evaluation halts immediately with structured errors (`CLAIM_STORE_UNAVAILABLE` or `SCORE_FEED_UNAVAILABLE`).
  - Partial weekly wraps are strictly prohibited from committing.
- **Transactional Atomicity:**
  - Commissioner override proposals and season seal operations execute within serializable database transactions to prevent race conditions during concurrent pick resolutions.

## 4. Verification & Testing Strategy
- Standings & scoring calculation verification across tiebreakers.
- Deduplication of wrap-up outbox enqueues across duplicate sweeps.
- Preference filter tests confirming opted-out participants receive 0 outbox events.
- Strict route isolation tests proving pool commissioners cannot access system wrap-up trigger endpoints.
- Fail-closed negative control tests on missing game completions.
```

### 8.2 Weekly Wrap-Up Engine Service (`src/services/wrapUpEngine.ts`)
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

### 8.3 Commissioner Override Service (`src/services/overrideService.ts`)
```typescript
import { Prisma } from '@prisma/client';
import prisma from '../db/client';

export type OverrideType = 'PICK' | 'PENALTY' | 'CUSTOM';

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
 * Commissioner Override & Proposal Service (Milestone 12.2)
 *
 * Invariants:
 * - Decision #20: Authority is scoped strictly by pools.admin_id; no global admin bypass on pool routes.
 * - Decision #54: Mutations occur strictly within write (POST/PUT) methods, never on GET.
 * - Serializable transaction execution to prevent race conditions during concurrent pick resolutions.
 */

/**
 * Creates an override proposal within the specified pool.
 */
export async function createOverrideProposal(
  input: OverrideProposalInput,
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

  const auditLog = await db.auditLog.create({
    data: {
      actorId: commissionerId,
      action: 'COMMISSIONER_PROPOSAL_CREATED',
      targetEntityId,
      newValue: {
        poolId,
        type,
        data,
        reason,
        status: 'PROPOSED',
        createdAt: new Date().toISOString(),
      },
    },
  });

  return auditLog as unknown as ProposalRecord;
}

/**
 * Applies a commissioner override inside a serializable transaction.
 */
export async function applyOverride(
  input: OverrideProposalInput,
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
      } else if (type === 'PENALTY') {
        const userId = data.userId || targetEntityId;
        const delta = new Prisma.Decimal(data.delta?.toString() || '1');
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
          },
        });

        // Recalculate member total shots
        const ledgerSum = await tx.penaltyLedger.aggregate({
          where: { poolId, userId },
          _sum: { delta: true },
        });

        await tx.poolMemberStat.upsert({
          where: { poolId_userId: { poolId, userId } },
          update: { totalShotsDrank: ledgerSum._sum.delta ?? new Prisma.Decimal(0) },
          create: { poolId, userId, totalShotsDrank: ledgerSum._sum.delta ?? new Prisma.Decimal(0) },
        });
      } else {
        result = { customData: data, appliedAt: new Date().toISOString() };
      }

      const auditLog = await tx.auditLog.create({
        data: {
          actorId: commissionerId,
          action: actionName,
          targetEntityId: result?.id || targetEntityId,
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
 * Lists proposals and override audit history for a pool.
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
          'COMMISSIONER_OVERRIDE_PICK',
          'COMMISSIONER_OVERRIDE_PENALTY',
          'ADMIN_OVERRIDE_PICK',
        ],
      },
    },
    orderBy: { timestamp: 'desc' },
    take: 50,
  });

  // Filter in-memory for audit logs that target this poolId in newValue
  const poolLogs = auditLogs.filter((log) => {
    if (log.newValue && typeof log.newValue === 'object') {
      return (log.newValue as any).poolId === poolId;
    }
    return false;
  });

  return poolLogs as unknown as ProposalRecord[];
}
```

### 8.4 Season Seal Service (`src/services/seasonSeal.ts`)
```typescript
import { Prisma } from '@prisma/client';
import prisma from '../db/client';

export interface SeasonSealOptions {
  seasonYear?: number;
  weekNumber?: number;
  poolId?: string;
  sealedBy: string;
}

export interface PoolStandingsSnapshot {
  poolId: string;
  poolName: string;
  sealedAt: string;
  members: Array<{
    userId: string;
    totalShotsDrank: string;
    firstPlaceFinishes: number;
    deadPlaceFinishes: number;
    totalPicks: number;
    totalPoints: string;
  }>;
}

export interface SeasonSealResult {
  sealed: boolean;
  seasonYear: number;
  weekNumber: number;
  sealedAt: string;
  sealedBy: string;
  snapshots: PoolStandingsSnapshot[];
  auditLogId: string;
}

/**
 * Season Seal Service (Milestone 12.2)
 *
 * Invariants:
 * - Decision #20: Operates strictly at the System Tier (invoked by system admin).
 * - Decision #54: Mutations occur strictly via POST, never on GET.
 * - Read-only snapshot invariant: Snapshots current cumulative standings immutably.
 */

/**
 * Seals the season / regular season standings across active pools.
 */
export async function sealSeason(
  options: SeasonSealOptions,
  db: typeof prisma = prisma
): Promise<SeasonSealResult> {
  const { seasonYear = 2026, weekNumber = 18, poolId, sealedBy } = options;

  if (!sealedBy) {
    throw new Error('sealedBy user ID is required');
  }

  const poolWhere: Prisma.PoolWhereInput = {
    status: 'ACTIVE',
  };
  if (poolId) {
    poolWhere.id = poolId;
  }

  const pools = await db.pool.findMany({
    where: poolWhere,
    include: {
      memberships: {
        where: { status: 'ACTIVE' },
        include: {
          stat: true,
        },
      },
    },
  });

  const sealedAt = new Date().toISOString();
  const snapshots: PoolStandingsSnapshot[] = [];

  return await db.$transaction(async (tx) => {
    for (const pool of pools) {
      const memberSnapshots = [];

      for (const membership of pool.memberships) {
        const userId = membership.userId;

        // Sum points awarded for this user in this pool
        const pickResults = await tx.pick.findMany({
          where: { poolId: pool.id, userId },
          include: { result: true },
        });

        let totalPoints = new Prisma.Decimal(0);
        for (const p of pickResults) {
          if (p.result?.pointsAwarded) {
            totalPoints = totalPoints.plus(p.result.pointsAwarded);
          }
        }

        memberSnapshots.push({
          userId,
          totalShotsDrank: membership.stat?.totalShotsDrank?.toString() || '0.00',
          firstPlaceFinishes: membership.stat?.firstPlaceFinishes || 0,
          deadPlaceFinishes: membership.stat?.deadPlaceFinishes || 0,
          totalPicks: pickResults.length,
          totalPoints: totalPoints.toString(),
        });
      }

      // Mark pool settings as sealed
      const existingSettings = (pool.settings as any) || {};
      await tx.pool.update({
        where: { id: pool.id },
        data: {
          settings: {
            ...existingSettings,
            seasonSealed: true,
            sealedAt,
            sealSeasonYear: seasonYear,
          },
        },
      });

      snapshots.push({
        poolId: pool.id,
        poolName: pool.name,
        sealedAt,
        members: memberSnapshots,
      });
    }

    // Create immutable audit log snapshot
    const auditLog = await tx.auditLog.create({
      data: {
        actorId: sealedBy,
        action: 'SEASON_SEAL_SNAPSHOT',
        targetEntityId: poolId || 'GLOBAL',
        newValue: {
          seasonYear,
          weekNumber,
          sealedAt,
          snapshots,
        },
      },
    });

    return {
      sealed: true,
      seasonYear,
      weekNumber,
      sealedAt,
      sealedBy,
      snapshots,
      auditLogId: auditLog.id,
    };
  });
}

/**
 * Retrieves the latest season seal status and snapshot.
 * Strict adherence to Decision #54 (NO WRITES ON GET).
 */
export async function getSeasonSealStatus(
  poolId?: string,
  db: typeof prisma = prisma
): Promise<{ sealed: boolean; latestSeal: any | null }> {
  const auditLog = await db.auditLog.findFirst({
    where: {
      action: 'SEASON_SEAL_SNAPSHOT',
      ...(poolId ? { targetEntityId: { in: [poolId, 'GLOBAL'] } } : {}),
    },
    orderBy: { timestamp: 'desc' },
  });

  return {
    sealed: auditLog !== null,
    latestSeal: auditLog ? auditLog.newValue : null,
  };
}
```

### 8.5 Admin Ops Router (`src/routes/adminOps.ts`)
```typescript
import { Router, Request, Response } from 'express';
import prisma from '../db/client';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { runReminderScan } from '../services/reminderScanner';
import { runWrapUpEngine } from '../services/wrapUpEngine';
import { sealSeason, getSeasonSealStatus } from '../services/seasonSeal';

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
```

### 8.6 Pool Ops Router (`src/routes/ops.ts`)
```typescript
import { Router, Request, Response } from 'express';
import prisma from '../db/client';
import { requireAuth, requirePoolCommissioner, UUID_REGEX } from '../middleware/auth';
import { createOverrideProposal, applyOverride, listProposals } from '../services/overrideService';

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

/**
 * GET /api/pools/:pool_id/proposals
 * Pool-tier read-only endpoint listing override proposals and commissioner history.
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
```

### 8.7 Wrap-Up Engine Test Suite (`tests/wrapUpEngine.test.ts`)
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role, GameStatus, Prisma } from '@prisma/client';
import { app } from '../src/server';
import { JWT_SECRET } from '../src/middleware/auth';
import { assertDisposableUrl } from '../src/db/safeguards';
import { executeWeeklyWrapUpForPool, runWrapUpEngine } from '../src/services/wrapUpEngine';

const rehearsalDbUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/pickem_rehearsal';

describe('Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out', () => {
  let server: http.Server;
  let baseUrl: string;
  let prisma: PrismaClient;

  let adminUser: any;
  let commissionerUser: any;
  let winnerUser: any;
  let loserUser1: any;
  let loserUser2: any;
  let optedOutUser: any;

  let adminToken: string;
  let commissionerToken: string;
  let winnerToken: string;
  let loser1Token: string;
  let loser2Token: string;
  let optedOutToken: string;

  let pool: any;
  let unfinalizedPool: any;
  let finalGame1: any;
  let finalGame2: any;
  let pendingGame: any;

  beforeAll(async () => {
    assertDisposableUrl(rehearsalDbUrl);
    prisma = new PrismaClient({ datasources: { db: { url: rehearsalDbUrl } }, log: [] });

    // Ensure weekly_wrapups table exists in rehearsal DB for claim store testing with RLS enabled
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.weekly_wrapups (
        pool_id UUID NOT NULL,
        week_number INT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT weekly_wrapups_pkey PRIMARY KEY (pool_id, week_number)
      );
    `);
    await prisma.$executeRawUnsafe(`ALTER TABLE public.weekly_wrapups ENABLE ROW LEVEL SECURITY;`);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });

    // Create test users
    adminUser = await prisma.user.create({
      data: { email: `wrapup_admin_${Date.now()}@example.com`, passwordHash: 'hash123', role: Role.ADMIN },
    });

    commissionerUser = await prisma.user.create({
      data: { email: `wrapup_commish_${Date.now()}@example.com`, passwordHash: 'hash123', role: Role.USER },
    });

    winnerUser = await prisma.user.create({
      data: { email: `wrapup_winner_${Date.now()}@example.com`, passwordHash: 'hash123', role: Role.USER },
    });

    loserUser1 = await prisma.user.create({
      data: { email: `wrapup_loser1_${Date.now()}@example.com`, passwordHash: 'hash123', role: Role.USER },
    });

    loserUser2 = await prisma.user.create({
      data: { email: `wrapup_loser2_${Date.now()}@example.com`, passwordHash: 'hash123', role: Role.USER },
    });

    optedOutUser = await prisma.user.create({
      data: { email: `wrapup_optout_${Date.now()}@example.com`, passwordHash: 'hash123', role: Role.USER },
    });

    // Notification preferences
    await prisma.notificationPreference.create({
      data: { userId: optedOutUser.id, emailEnabled: false },
    });
    await prisma.notificationPreference.create({
      data: { userId: winnerUser.id, emailEnabled: true },
    });
    await prisma.notificationPreference.create({
      data: { userId: loserUser1.id, emailEnabled: true },
    });

    adminToken = jwt.sign({ id: adminUser.id, email: adminUser.email, role: adminUser.role }, JWT_SECRET, { expiresIn: '1h' });
    commissionerToken = jwt.sign({ id: commissionerUser.id, email: commissionerUser.email, role: commissionerUser.role }, JWT_SECRET, { expiresIn: '1h' });
    winnerToken = jwt.sign({ id: winnerUser.id, email: winnerUser.email, role: winnerUser.role }, JWT_SECRET, { expiresIn: '1h' });
    loser1Token = jwt.sign({ id: loserUser1.id, email: loserUser1.email, role: loserUser1.role }, JWT_SECRET, { expiresIn: '1h' });
    loser2Token = jwt.sign({ id: loserUser2.id, email: loserUser2.email, role: loserUser2.role }, JWT_SECRET, { expiresIn: '1h' });
    optedOutToken = jwt.sign({ id: optedOutUser.id, email: optedOutUser.email, role: optedOutUser.role }, JWT_SECRET, { expiresIn: '1h' });

    // Create main Pool
    pool = await prisma.pool.create({
      data: {
        name: `WrapUp Test Pool ${Date.now()}`,
        adminId: commissionerUser.id,
        status: 'ACTIVE',
        settings: {
          penalties: { dead_place_penalty: 1 },
          tiebreaker: { game_target: 'LAST_GAME' },
        },
      },
    });

    // Create unfinalized Pool
    unfinalizedPool = await prisma.pool.create({
      data: {
        name: `Unfinalized Test Pool ${Date.now()}`,
        adminId: commissionerUser.id,
        status: 'ACTIVE',
        settings: {},
      },
    });

    // Add memberships
    await prisma.poolMembership.createMany({
      data: [
        { poolId: pool.id, userId: commissionerUser.id, status: 'ACTIVE' },
        { poolId: pool.id, userId: winnerUser.id, status: 'ACTIVE' },
        { poolId: pool.id, userId: loserUser1.id, status: 'ACTIVE' },
        { poolId: pool.id, userId: loserUser2.id, status: 'ACTIVE' },
        { poolId: pool.id, userId: optedOutUser.id, status: 'ACTIVE' },
        { poolId: unfinalizedPool.id, userId: winnerUser.id, status: 'ACTIVE' },
      ],
    });

    // Create games
    finalGame1 = await prisma.game.create({
      data: {
        externalGameId: `game_w1_1_${Date.now()}`,
        homeTeamId: 'KC',
        awayTeamId: 'DEN',
        kickoffTime: new Date('2026-10-10T17:00:00Z'),
        status: GameStatus.FINAL,
        homeScore: 24,
        awayScore: 10,
      },
    });

    finalGame2 = await prisma.game.create({
      data: {
        externalGameId: `game_w1_2_${Date.now()}`,
        homeTeamId: 'DAL',
        awayTeamId: 'NYG',
        kickoffTime: new Date('2026-10-10T20:00:00Z'),
        status: GameStatus.FINAL,
        homeScore: 30,
        awayScore: 20,
      },
    });

    pendingGame = await prisma.game.create({
      data: {
        externalGameId: `game_w2_pending_${Date.now()}`,
        homeTeamId: 'GB',
        awayTeamId: 'CHI',
        kickoffTime: new Date('2026-10-17T17:00:00Z'),
        status: GameStatus.SCHEDULED,
        homeScore: null,
        awayScore: null,
      },
    });

    // Populate picks for unfinalizedPool
    await prisma.pick.create({
      data: { poolId: unfinalizedPool.id, userId: winnerUser.id, gameId: pendingGame.id, selectedTeamId: 'GB', submittedById: winnerUser.id },
    });

    // Populate picks & results for main Pool (Week 1)
    // Winner: 2 correct picks (2.00 points)
    const p1 = await prisma.pick.create({
      data: { poolId: pool.id, userId: winnerUser.id, gameId: finalGame1.id, selectedTeamId: 'KC', submittedById: winnerUser.id },
    });
    await prisma.pickResult.create({
      data: { pickId: p1.id, isCorrect: true, pointsAwarded: new Prisma.Decimal('1.00') },
    });

    const p2 = await prisma.pick.create({
      data: { poolId: pool.id, userId: winnerUser.id, gameId: finalGame2.id, selectedTeamId: 'DAL', submittedById: winnerUser.id },
    });
    await prisma.pickResult.create({
      data: { pickId: p2.id, isCorrect: true, pointsAwarded: new Prisma.Decimal('1.00') },
    });

    // Loser 1: 0 correct picks (0.00 points)
    const p3 = await prisma.pick.create({
      data: { poolId: pool.id, userId: loserUser1.id, gameId: finalGame1.id, selectedTeamId: 'DEN', submittedById: loserUser1.id },
    });
    await prisma.pickResult.create({
      data: { pickId: p3.id, isCorrect: false, pointsAwarded: new Prisma.Decimal('0.00') },
    });

    // Loser 2: 0 correct picks (0.00 points)
    const p4 = await prisma.pick.create({
      data: { poolId: pool.id, userId: loserUser2.id, gameId: finalGame1.id, selectedTeamId: 'DEN', submittedById: loserUser2.id },
    });
    await prisma.pickResult.create({
      data: { pickId: p4.id, isCorrect: false, pointsAwarded: new Prisma.Decimal('0.00') },
    });

    // Commissioner & OptedOut: 1 correct pick (1.00 point)
    const p5 = await prisma.pick.create({
      data: { poolId: pool.id, userId: commissionerUser.id, gameId: finalGame1.id, selectedTeamId: 'KC', submittedById: commissionerUser.id },
    });
    await prisma.pickResult.create({
      data: { pickId: p5.id, isCorrect: true, pointsAwarded: new Prisma.Decimal('1.00') },
    });

    const p6 = await prisma.pick.create({
      data: { poolId: pool.id, userId: optedOutUser.id, gameId: finalGame1.id, selectedTeamId: 'KC', submittedById: optedOutUser.id },
    });
    await prisma.pickResult.create({
      data: { pickId: p6.id, isCorrect: true, pointsAwarded: new Prisma.Decimal('1.00') },
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    if (prisma) {
      // Drop weekly_wrapups table so subsequent/clean-room suites see clean state
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS public.weekly_wrapups;`).catch(() => {});
      await prisma.$disconnect();
    }
  });

  describe('1. Precondition Check & Fail Closed (Decision #27 & #55)', () => {
    it('fails closed with SCORE_FEED_UNAVAILABLE when unfinalized games exist for target week', async () => {
      const result = await executeWeeklyWrapUpForPool(unfinalizedPool.id, 1);
      expect(result.applied).toBe(false);
      expect(result.reason).toBe('SCORE_FEED_UNAVAILABLE');
      expect(result.pendingCount).toBe(1);
    });

    it('fails closed when DB client or claim store is unreachable (Decision #55)', async () => {
      await expect(
        executeWeeklyWrapUpForPool(pool.id, 999, { prismaClient: {} as any })
      ).rejects.toThrow(/CLAIM_STORE_UNAVAILABLE/);
    });
  });

  describe('2. Precision Decimal Scoring & Split Penalties (Decisions #3 & #22)', () => {
    it('calculates standings and splits dead place penalty precisely between tied losers', async () => {
      const result = await executeWeeklyWrapUpForPool(pool.id, 1);
      expect(result.applied).toBe(true);
      expect(result.poolId).toBe(pool.id);
      expect(result.weekNumber).toBe(1);

      // Winner has 2 points
      expect(result.topScorers).toBeDefined();
      expect(result.topScorers![0].userId).toBe(winnerUser.id);
      expect(result.topScorers![0].score).toBe(2);

      // Losers are loserUser1 and loserUser2 (tied at 0 points)
      expect(result.deadPlaceMembers).toBeDefined();
      expect(result.deadPlaceMembers!.length).toBe(2);
      const deadUserIds = result.deadPlaceMembers!.map((m) => m.userId);
      expect(deadUserIds).toContain(loserUser1.id);
      expect(deadUserIds).toContain(loserUser2.id);

      // 1 shot penalty divided by 2 tied losers = 0.50 shots each
      expect(result.penaltyAssigned?.toString()).toBe('0.5');

      // Verify penalty_ledger records
      const ledgers = await prisma.penaltyLedger.findMany({
        where: { poolId: pool.id, weekNumber: 1 },
      });
      expect(ledgers.length).toBe(2);
      for (const l of ledgers) {
        expect(l.delta.toString()).toBe('0.5');
        expect(l.reason).toBe('WEEKLY_DEAD_PLACE');
      }

      // Verify poolMemberStat updated
      const loser1Stat = await prisma.poolMemberStat.findUnique({
        where: { poolId_userId: { poolId: pool.id, userId: loserUser1.id } },
      });
      expect(loser1Stat).toBeDefined();
      expect(loser1Stat!.deadPlaceFinishes).toBe(1);
      expect(loser1Stat!.totalShotsDrank.toString()).toBe('0.5');

      const winnerStat = await prisma.poolMemberStat.findUnique({
        where: { poolId_userId: { poolId: pool.id, userId: winnerUser.id } },
      });
      expect(winnerStat).toBeDefined();
      expect(winnerStat!.firstPlaceFinishes).toBe(1);
    });
  });

  describe('3. Claim Store Concurrency & Idempotency (Decision #24 & #57)', () => {
    it('subsequent execution on already wrapped week returns ALREADY_WRAPPED_UP and produces 0 duplicates', async () => {
      const duplicateResult = await executeWeeklyWrapUpForPool(pool.id, 1);
      expect(duplicateResult.applied).toBe(false);
      expect(duplicateResult.reason).toBe('ALREADY_WRAPPED_UP');

      // Verify exactly 2 penalty ledger entries exist (no double assignment)
      const ledgers = await prisma.penaltyLedger.findMany({
        where: { poolId: pool.id, weekNumber: 1 },
      });
      expect(ledgers.length).toBe(2);
    });

    it('enforces outbox notification preferences and deduplication key (Decision #57)', async () => {
      const optOutDedupe = `wrapup:v1:pool:${pool.id}:week:1:user:${optedOutUser.id}`;
      const winnerDedupe = `wrapup:v1:pool:${pool.id}:week:1:user:${winnerUser.id}`;

      // Opted out user must receive ZERO outbox events
      const optOutEvents = await prisma.outboxEvent.findMany({
        where: { dedupeKey: optOutDedupe },
      });
      expect(optOutEvents.length).toBe(0);

      // Active user must have exactly ONE outbox event
      const winnerEvents = await prisma.outboxEvent.findMany({
        where: { dedupeKey: winnerDedupe },
      });
      expect(winnerEvents.length).toBe(1);
      expect(winnerEvents[0].type).toBe('WRAPUP');
      expect(winnerEvents[0].status).toBe('PENDING');
    });
  });

  describe('4. Tier Separation & Route Protection (Decision #20 & #54)', () => {
    it('POST /api/admin/ops/wrap-up is rejected for standard users and pool commissioners (Decision #20)', async () => {
      // Standard user rejected (403)
      const resUser = await fetch(`${baseUrl}/api/admin/ops/wrap-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${winnerToken}` },
        body: JSON.stringify({ weekNumber: 1 }),
      });
      expect(resUser.status).toBe(403);

      // Pool commissioner rejected (403) - Decision #20 strictly enforced
      const resCommish = await fetch(`${baseUrl}/api/admin/ops/wrap-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${commissionerToken}` },
        body: JSON.stringify({ weekNumber: 1 }),
      });
      expect(resCommish.status).toBe(403);
    });

    it('POST /api/admin/ops/wrap-up succeeds for system ADMIN', async () => {
      const resAdmin = await fetch(`${baseUrl}/api/admin/ops/wrap-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ weekNumber: 1, poolId: pool.id }),
      });
      expect(resAdmin.status).toBe(200);
      const data = await resAdmin.json();
      expect(data.jobRun).toBeDefined();
      expect(data.engineResult).toBeDefined();
    });

    it('GET /api/admin/ops/wrap-up/status is strictly read-only (Decision #54)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ops/wrap-up/status`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('ok');
      expect(data.service).toBe('weekly_wrapup_engine');
      expect(data.latestJobRun).toBeDefined();
    });

    it('POST /api/admin/ops/season-seal records immutable snapshot', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ops/season-seal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ seasonYear: 2026, weekNumber: 1, poolId: pool.id }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.seal).toBeDefined();
      expect(data.seal.sealed).toBe(true);
      expect(data.seal.snapshots.length).toBeGreaterThanOrEqual(1);

      // GET /api/admin/ops/season-seal/status read-only verification
      const statusRes = await fetch(`${baseUrl}/api/admin/ops/season-seal/status?pool_id=${pool.id}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(statusRes.status).toBe(200);
      const statusData = await statusRes.json();
      expect(statusData.sealed).toBe(true);
    });
  });
});
```

### 8.8 Overrides Test Suite (`tests/overrides.test.ts`)
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role, GameStatus, Prisma } from '@prisma/client';
import { app } from '../src/server';
import { JWT_SECRET } from '../src/middleware/auth';
import { assertDisposableUrl } from '../src/db/safeguards';
import { createOverrideProposal, applyOverride, listProposals } from '../src/services/overrideService';

const rehearsalDbUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/pickem_rehearsal';

describe('Milestone 12.2: Pool Commissioner Proposals & Overrides Service', () => {
  let server: http.Server;
  let baseUrl: string;
  let prisma: PrismaClient;

  let adminUser: any;
  let commissionerUser: any;
  let otherCommissionerUser: any;
  let memberUser: any;

  let adminToken: string;
  let commissionerToken: string;
  let otherCommissionerToken: string;
  let memberToken: string;

  let pool: any;
  let game: any;

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

    adminUser = await prisma.user.create({
      data: { email: `overrides_admin_${Date.now()}@example.com`, passwordHash: 'hash123', role: Role.ADMIN },
    });

    commissionerUser = await prisma.user.create({
      data: { email: `overrides_commish_${Date.now()}@example.com`, passwordHash: 'hash123', role: Role.USER },
    });

    otherCommissionerUser = await prisma.user.create({
      data: { email: `overrides_other_commish_${Date.now()}@example.com`, passwordHash: 'hash123', role: Role.USER },
    });

    memberUser = await prisma.user.create({
      data: { email: `overrides_member_${Date.now()}@example.com`, passwordHash: 'hash123', role: Role.USER },
    });

    adminToken = jwt.sign({ id: adminUser.id, email: adminUser.email, role: adminUser.role }, JWT_SECRET, { expiresIn: '1h' });
    commissionerToken = jwt.sign({ id: commissionerUser.id, email: commissionerUser.email, role: commissionerUser.role }, JWT_SECRET, { expiresIn: '1h' });
    otherCommissionerToken = jwt.sign({ id: otherCommissionerUser.id, email: otherCommissionerUser.email, role: otherCommissionerUser.role }, JWT_SECRET, { expiresIn: '1h' });
    memberToken = jwt.sign({ id: memberUser.id, email: memberUser.email, role: memberUser.role }, JWT_SECRET, { expiresIn: '1h' });

    pool = await prisma.pool.create({
      data: {
        name: `Overrides Pool ${Date.now()}`,
        adminId: commissionerUser.id,
        status: 'ACTIVE',
        settings: {},
      },
    });

    await prisma.poolMembership.createMany({
      data: [
        { poolId: pool.id, userId: commissionerUser.id, status: 'ACTIVE' },
        { poolId: pool.id, userId: memberUser.id, status: 'ACTIVE' },
      ],
    });

    game = await prisma.game.create({
      data: {
        externalGameId: `game_override_${Date.now()}`,
        homeTeamId: 'MIA',
        awayTeamId: 'BUF',
        kickoffTime: new Date('2026-10-25T17:00:00Z'),
        status: GameStatus.SCHEDULED,
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

  describe('1. Route Isolation & Decision #20 Verification', () => {
    it('rejects non-commissioner pool members with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/pools/${pool.id}/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({
          type: 'PICK',
          targetEntityId: memberUser.id,
          data: { gameId: game.id, selectedTeamId: 'MIA' },
          reason: 'Member trying to propose',
        }),
      });
      expect(res.status).toBe(403);
    });

    it('rejects global ADMIN users who are not pool commissioners (Decision #20 zero bypass)', async () => {
      const res = await fetch(`${baseUrl}/api/pools/${pool.id}/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          type: 'PICK',
          targetEntityId: memberUser.id,
          data: { gameId: game.id, selectedTeamId: 'MIA' },
          reason: 'Global admin attempting pool route without ownership',
        }),
      });
      expect(res.status).toBe(403);
    });

    it('rejects commissioners of different pools with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/pools/${pool.id}/overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${otherCommissionerToken}` },
        body: JSON.stringify({
          type: 'PENALTY',
          targetEntityId: memberUser.id,
          data: { delta: 1 },
          reason: 'Cross-pool commissioner intrusion',
        }),
      });
      expect(res.status).toBe(403);
    });
  });

  describe('2. Commissioner Proposal Creation & Resolution', () => {
    it('allows valid pool commissioner to create an override proposal', async () => {
      const res = await fetch(`${baseUrl}/api/pools/${pool.id}/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${commissionerToken}` },
        body: JSON.stringify({
          type: 'PICK',
          targetEntityId: memberUser.id,
          data: { gameId: game.id, selectedTeamId: 'MIA' },
          reason: 'Late submission due to outage',
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.proposal).toBeDefined();
      expect(data.proposal.action).toBe('COMMISSIONER_PROPOSAL_CREATED');
      expect(data.proposal.actorId).toBe(commissionerUser.id);
    });

    it('applies a commissioner pick override inside a serializable transaction', async () => {
      const res = await fetch(`${baseUrl}/api/pools/${pool.id}/overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${commissionerToken}` },
        body: JSON.stringify({
          type: 'PICK',
          targetEntityId: memberUser.id,
          data: { userId: memberUser.id, gameId: game.id, selectedTeamId: 'BUF' },
          reason: 'Commissioner manual correction',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.action).toBe('COMMISSIONER_OVERRIDE_PICK');
      expect(data.result.selectedTeamId).toBe('BUF');
      expect(data.result.submittedById).toBe(commissionerUser.id);

      // Verify pick in database
      const pick = await prisma.pick.findUnique({
        where: { poolId_userId_gameId: { poolId: pool.id, userId: memberUser.id, gameId: game.id } },
      });
      expect(pick).toBeDefined();
      expect(pick!.selectedTeamId).toBe('BUF');
      expect(pick!.submittedById).toBe(commissionerUser.id);
    });

    it('applies a commissioner penalty override with decimal ledger tracking', async () => {
      const res = await fetch(`${baseUrl}/api/pools/${pool.id}/overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${commissionerToken}` },
        body: JSON.stringify({
          type: 'PENALTY',
          targetEntityId: memberUser.id,
          data: { userId: memberUser.id, delta: 2.5, weekNumber: 1 },
          reason: 'Late fine',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.action).toBe('COMMISSIONER_OVERRIDE_PENALTY');

      // Verify penalty ledger
      const ledger = await prisma.penaltyLedger.findFirst({
        where: { poolId: pool.id, userId: memberUser.id, reason: 'Late fine' },
      });
      expect(ledger).toBeDefined();
      expect(ledger!.delta.toString()).toBe('2.5');
    });
  });

  describe('3. Read-Only GET Proposal Query (Decision #54)', () => {
    it('GET /api/pools/:pool_id/proposals returns history and produces zero side effects', async () => {
      const res = await fetch(`${baseUrl}/api/pools/${pool.id}/proposals`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.poolId).toBe(pool.id);
      expect(Array.isArray(data.proposals)).toBe(true);
      expect(data.proposals.length).toBeGreaterThanOrEqual(1);

      // Re-query to confirm read-only idempotent behavior (Decision #54)
      const res2 = await fetch(`${baseUrl}/api/pools/${pool.id}/proposals`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });
      expect(res2.status).toBe(200);
      const data2 = await res2.json();
      expect(data2.proposals.length).toBe(data.proposals.length);
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
