# PHASE 15 FINAL CLOSURE EVIDENCE DOSSIER: COMPLETE INTEGRATION TELEMETRY
Date: 2026-10-03
Baseline E_SHA: 6585276a5e43caf8953231e3668d0285746b1992
Governing Authority: R-15.4-CLOSURE-03

## 1. Baseline Git Hygiene & Working Tree Porcelain (at E_SHA)
### git status --porcelain
(clean - 0 tracked uncommitted changes)

### git rev-parse HEAD
6585276a5e43caf8953231e3668d0285746b1992

## 2. Commit Ancestry & Decision #53 Push Verification
### git log -n 5 --oneline
6585276 feat(phase15): implement M15.5 end-to-end integration test suite
bcfece0 docs: compile verified clean M15.4 evidence bundle with live db
1ccd4f4 feat(phase15): implement M15.4 sweat radar and scenario engine
cd39115 feat(m15.4): implement Sweat Radar leverage simulator and compile evidence bundle
0e1aac3 docs: compile complete M15.3 raw evidence bundle

### git reflog -n 5
6585276 HEAD@{0}: commit: feat(phase15): implement M15.5 end-to-end integration test suite
bcfece0 HEAD@{1}: checkout: moving from feat/phase15-m15.4-sweat-radar to feat/phase15-m15.5-closure
bcfece0 HEAD@{2}: checkout: moving from feat/phase15-m15.4-sweat-radar to feat/phase15-m15.4-sweat-radar
bcfece0 HEAD@{3}: commit: docs: compile verified clean M15.4 evidence bundle with live db
1ccd4f4 HEAD@{4}: reset: moving to 1ccd4f447b318ec4b43421e9d4da00f1fea71c6d

### git remote -v
origin	https://github.com/jdubciii/NFL-Pick-Em.git (fetch)
origin	https://github.com/jdubciii/NFL-Pick-Em.git (push)

## 3. Decision Register CI Verification (Decisions #56, #68)
### node scripts/ci_check_register.js
✅ CI Check PASSED: Appendix A Decision Register exists byte-for-byte in ARCHITECTURE.md.

## 4. Database Schema Tripwire (15 Protected Tables)
### node scripts/run_hosted_tripwire.js
=== HOSTED DATABASE TRIPWIRE (R-12.2-AH-V2) ===

Target Host: postgresql://postgres.[REDACTED]:****@aws-0-us-east-1.pooler.supabase.com:5432/postgres
Parsed Hostname: aws-0-us-east-1.pooler.supabase.com
✅ Inverse Guard verified: Target is confirmed hosted Supabase database.

Connecting via Node pg client to stream exact query rows...

1. Database Identity & Server Info:
  - Database: postgres
  - Current User: postgres
  - Version: PostgreSQL 17.6 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 15.2.0, 64-bit

2. Timestamp & Drift Metrics:
  - DB Server Time: Sat Oct 03 2026 21:06:32 GMT-0700 (Mountain Standard Time)
  - Hours Since T0 (2026-09-30T06:14:37Z): 93.8654 hrs

3. All 15 Table Row Counts:
  - users                    : 344
  - pools                    : 298
  - pool_memberships         : 11
  - games                    : 16
  - picks                    : 0
  - pick_results             : 0
  - weekly_submissions       : 0
  - penalty_ledger           : 2
  - penalty_media            : 0
  - pool_member_stats        : 10
  - audit_logs               : 0
  - inbox_messages           : 0
  - outbox_events            : 0
  - notification_preferences : 0
  - job_runs                 : 0

4. to_regclass('public.weekly_wrapups'): NULL

5. Applied Migrations (9 total):
  - 20260927000000_init
  - 20260928051824_add_pool_member_stats_and_penalty_ledger
  - 20260928124900_precision_and_weekly_submissions
  - 20260928170000_weekly_submission_finalized_and_game_notes
  - 20260928180000_shot_cam_penalty_media_and_rls
  - 20260929144500_br_1_ledger_append_only
  - 20260930010000_br_2b_ledger_api_lockdown
  - 20260930020000_br_2c_public_tables_api_lockdown
  - 20261001160000_12_1_a_outbox_inbox_core

6. Penalty Ledger Immutability Triggers Intact: TRUE

7. Row-Level Security: rls_on: 16/16

✅ Hosted Tripwire executed successfully.

## 5. Full Cumulative Regression Test Suite Execution (Vitest All Suites)
### npx vitest run --reporter=verbose
 RUN  v5.0.2 C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em

 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 1. Role-Based Access Control (Decision #20 Hardening) > rejects unauthenticated requests with 401 Unauthorized 55ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 1. Role-Based Access Control (Decision #20 Hardening) > rejects standard users on /api/admin/ops/system/health with 403 Forbidden 11ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 1. Role-Based Access Control (Decision #20 Hardening) > rejects pool commissioners on /api/admin/ops/system/health with 403 Forbidden 9ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 1. Role-Based Access Control (Decision #20 Hardening) > allows global ADMIN to retrieve health telemetry 744ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 2. Read-Only GET Execution & Zero Mutations (Decision #54) > enforces strictly read-only execution with ZERO database mutations on GET /api/admin/ops/system/health 111ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 3. Telemetry Accuracy Across Outbox, Inbox, DLQ, and Retention > returns exact telemetry matching database states 41ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 3. Telemetry Accuracy Across Outbox, Inbox, DLQ, and Retention > verifies /api/admin/ops/reminders/scan alias route executes successfully for ADMIN 75ms
 ✓ tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 4. Fail-Closed Error Handling (Decision #55) > fails closed and returns 500 if database telemetry query encounters an error 22ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 1: Slate Finalization & Weekly Wrap-Up (Decision #24 & #27) > fails closed when attempting wrap-up against unfinalized slate (Decision #27) 98ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 1: Slate Finalization & Weekly Wrap-Up (Decision #24 & #27) > successfully executes weekly wrap-up upon slate finalization with atomic idempotent claim (Decision #24) 86ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 2: Asynchronous Outbox Fanout & Inbox Ingestion (Milestones 12.1, 12.3 & Decision #57) > creates outbox events with compound dedupeKey and drains them to inbox_messages 104ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 3: User Notification Center & Isolation (Milestone 13.1 & Decision #20, #54, #55) > fetches unread inbox messages via GET /api/notifications with ZERO state mutations (Decision #54) 133ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 3: User Notification Center & Isolation (Milestone 13.1 & Decision #20, #54, #55) > enforces cross-tenant isolation: User A cannot mark User B notification as read (Decision #20) 30ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 3: User Notification Center & Isolation (Milestone 13.1 & Decision #20, #54, #55) > allows User A to mark own notification as read with deterministic ClockFn timestamp 19ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 4: Commissioner Governance & Precision Math (Milestone 13.2 & Decision #20, #3, #22, #54, #55) > rejects global ADMIN attempting commissioner action on Pool 1 (Decision #20 Zero Bypass) 12ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 4: Commissioner Governance & Precision Math (Milestone 13.2 & Decision #20, #3, #22, #54, #55) > allows Pool Commissioner to create, vote APPROVE, and execute proposal with Decimal precision (Decisions #3 & #22) 60ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 5: System Admin Ops & Retention Pruning (Milestone 13.3, 12.4 & Decision #20, #54, #55) > rejects Pool Commissioner accessing System Admin Ops health telemetry with 403 Forbidden (Decision #20) 4ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 5: System Admin Ops & Retention Pruning (Milestone 13.3, 12.4 & Decision #20, #54, #55) > allows Global ADMIN to fetch GET /api/admin/ops/system/health with ZERO database mutations (Decision #54) 771ms
 ✓ tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 5: System Admin Ops & Retention Pruning (Milestone 13.3, 12.4 & Decision #20, #54, #55) > advances ClockFn by 35 days and triggers bounded retention prune, safely purging expired records 55ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 1. Decision #20: Pool Commissioner Scoping & Tier Isolation > allows verified pool commissioner to vote on and execute proposals 199ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 1. Decision #20: Pool Commissioner Scoping & Tier Isolation > rejects standard pool members with 403 Forbidden 10ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 1. Decision #20: Pool Commissioner Scoping & Tier Isolation > rejects global ADMINs who are not pool commissioners with 403 Forbidden (Decision #20 zero bypass) 12ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 2. Decision #54: Side-Effect Free GET Telemetry > GET /proposals, GET /overrides, and GET /ops/status execute zero DB mutations 266ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 3. Decision #27: Authoritative Slate & Game Finality Verification > fails closed when proposal targets an unfinalized slate or game 32ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 4. Decisions #3 & #22: Precision Decimal Scoring & Aggregation > applies decimal scoring adjustments accurately without floating-point drift 33ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 5. Decision #55: Transaction Fail-Closed Rollback > aborts and rolls back entire state on execution error 15ms
 ✓ tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 6. Injectable ClockFn Determinism > records deterministic timestamps on proposal voting and execution 19ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 1. Idempotency & Outbox Enqueue Invariants > enqueues outbox reminder for member with unsubmitted picks and deduplicates subsequent runs 96ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 2. User Notification Preferences Enforcement > skips users who have opted out of email / pick reminders (generates 0 outbox events) 2ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 2. User Notification Preferences Enforcement > skips members who have already submitted picks for all upcoming games in the window 22ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 3. Injectable Clock Time-Window Boundary Testing > moving clock forward cleanly transitions games in and out of windows without real-time delay 26ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects unauthenticated requests to POST /api/admin/ops/scan-reminders with 401 48ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects standard users from triggering reminder scan with 403 (Decision #20) 5ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects pool commissioners who lack global ADMIN role with 403 (Decision #20) 4ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > allows global ADMIN to trigger reminder scan via POST with 200 29ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > Decision #54 & Invariant: GET /api/admin/ops/scan-reminders/status is strictly read-only 14ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > aborts and fails closed when database client is unconfigured or throws 3ms
 ✓ tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > withJobRun tracks failure and returns FAILED status upon unexpected error 7ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 1. Retention Cutoff & Clock Calculation Unit Tests > calculates exact retention cutoff date based on injected clock 17ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 2. State Protection & Terminal Boundaries (Decision #24 & #55) > NEVER prunes PENDING or PROCESSING records regardless of how old they are (State Protection Guard) 22ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 2. State Protection & Terminal Boundaries (Decision #24 & #55) > prunes SENT records >30 days and DEAD records >90 days while preserving younger records 32ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 3. Bounded Batching & Pagination Verification > processes multi-batch deletions with specified batchSize boundaries 23ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects unauthenticated requests on /api/admin/ops/retention/* 50ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects regular users on /api/admin/ops/retention/* with 403 10ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects pool commissioners on /api/admin/ops/retention/* with 403 (Decision #20 Hardening) 13ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > allows global ADMIN to trigger retention prune and query retention status 420ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 5. Decision #54 Read-Only Invariant on GET > GET /api/admin/ops/retention/status produces ZERO deletions or writes 41ms
 ✓ tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 6. Decision #55 Fail-Closed Database Fault Tolerance > throws structured error and aborts on database transaction failure 13ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > returns 401 when unauthenticated 52ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > returns inbox messages for authenticated user in descending order (Decision #54 compliant) 143ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > supports unreadOnly filter and poolId filter 11ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 2. POST /api/me/inbox/:id/read > returns 401 when unauthenticated 5ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 2. POST /api/me/inbox/:id/read > returns 404 when message belongs to another user (ownership isolation) 10ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 2. POST /api/me/inbox/:id/read > marks single message read successfully and is idempotent 15ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 3. POST /api/me/inbox/read-all > returns 401 when unauthenticated 3ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 3. POST /api/me/inbox/read-all > marks all unread messages for the user as read 29ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > returns 401 when unauthenticated 17ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > returns default preferences on GET before upsert without mutating DB (Decision #54) 9ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > rejects invalid reminderOffsetsHours payloads with 400 9ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > updates valid preferences successfully 11ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > GET /api/notifications/unsubscribe validates token without modifying DB (Decision #54) 5ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > GET /api/notifications/unsubscribe returns 400 on malformed token and 404 on unknown token 4ms
 ✓ tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > POST /api/notifications/unsubscribe disables email without deleting row 6ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 1. Precondition Check & Fail Closed (Decision #27 & #55) > fails closed with SCORE_FEED_UNAVAILABLE when unfinalized games exist for target week 182ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 1. Precondition Check & Fail Closed (Decision #27 & #55) > fails closed when DB client or claim store is unreachable (Decision #55) 2ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 2. Precision Decimal Scoring & Split Penalties (Decisions #3 & #22) > calculates standings and splits dead place penalty precisely between tied losers 81ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 3. Claim Store Concurrency & Idempotency (Decision #24 & #57) > subsequent execution on already wrapped week returns ALREADY_WRAPPED_UP and produces 0 duplicates 4ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 3. Claim Store Concurrency & Idempotency (Decision #24 & #57) > enforces outbox notification preferences and deduplication key (Decision #57) 6ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/wrap-up is rejected for standard users and pool commissioners (Decision #20) 58ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/wrap-up succeeds for system ADMIN 43ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > GET /api/admin/ops/wrap-up/status is strictly read-only (Decision #54) 10ms
 ✓ tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/season-seal records immutable snapshot 48ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > strips database URLs, API keys, passwords, tokens and truncates to 200 chars 72ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > preserves key names for passwords and tokens while redacting values 5ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > scrubs ECONNREFUSED host:port patterns 5ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > handles extremely long error messages by truncating to 200 chars 5ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Console Mail Transport > appends formatted json logs to outbox-dev.log 8ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > SMTP Mail Transport & Timeouts > throws error on construction if MAIL_TRANSPORT=smtp and SMTP_FROM is missing 7ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > SMTP Mail Transport & Timeouts > fake hanging SMTP transporter times out and maps to error failure 5ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > HTML Escaping & Message-ID SHA256 > HTML escaping verification for interpolated markup in pool names and fields 4ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > HTML Escaping & Message-ID SHA256 > Message-ID SHA256 stability across executions 5ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > drains pending outbox event, sets status SENT and records sentAt 29ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > sets status SUPPRESSED when user email preference is disabled 16ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > applies discrete backoff schedule on transport failure 22ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > transitions to DEAD on 5th failure 13ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > Event repeatedly crashing during worker processing increments attempts to 5 and transitions to DEAD 11ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > Two concurrent workers with slow fake transport never duplicate sends (conditional renewal test) 178ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > creates JobRun with RUNNING and transitions to OK with itemsProcessed 35ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > records FAILED status and scrubbed errorCode when job execution throws 13ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > transitions to PARTIAL status when succeeded > 0 and failed + dead > 0 12ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > database write failure does not fail or abort the underlying job execution 12ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > runOutboxDrain integrates with withJobRun 12ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 401 when unauthenticated on GET health and POST retry 44ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 400 when pool_id is not a valid UUID 7ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 404 when pool does not exist 61ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 403 when authenticated user is a regular pool member (not commissioner) 16ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 403 when authenticated user is not a member of the pool 15ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 2. GET /api/pools/:pool_id/ops/health > returns accurate telemetry and is strictly read-only (Decision #54) 256ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 2. GET /api/pools/:pool_id/ops/health > strictly isolates pool telemetry with zero cross-pool leakage 17ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 3. POST /api/pools/:pool_id/ops/outbox/retry > retries only DEAD/FAILED outbox events for the specified pool, resetting attempts and lease 60ms
 ✓ tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 3. POST /api/pools/:pool_id/ops/outbox/retry > retries a specific event when outboxId is provided 17ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 1. Exponential Backoff & Injectable Clock Unit Tests > calculates deterministic exponential backoff intervals without jitter or drift 17ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 1. Exponential Backoff & Injectable Clock Unit Tests > injectable ClockFn allows instant time progression without setTimeout 4ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > successful transport delivery transitions status PENDING -> PROCESSING -> SENT 27ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > transient failure increments attempts, records diagnostic JSON and sets future backoff 15ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > permanent rejection immediately transitions status to DEAD with diagnostic payload 12ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > reaching MAX_ATTEMPTS transitions status to DEAD (Dead-Letter Invariant) 12ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > advancing simulated clock allows retry after backoff expires 12ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects unauthenticated requests on /api/admin/ops/transports/* 44ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects regular users on /api/admin/ops/transports/* with 403 12ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects pool commissioners on /api/admin/ops/transports/* with 403 (Decision #20 Hardening) 12ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > allows global ADMIN to query transports status and trigger dispatch sweep 182ms
 ✓ tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 4. Decision #54 Strict Read-Only Invariant on GET > GET /api/admin/ops/transports/status produces ZERO database mutations 37ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 1. GET /api/notifications (Inbox Fetch & Telemetry) > returns 401 when unauthenticated 47ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 1. GET /api/notifications (Inbox Fetch & Telemetry) > returns strictly req.user.id records with accurate unread counts 238ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 1. GET /api/notifications (Inbox Fetch & Telemetry) > supports unreadOnly filter parameter 28ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > idempotently marks single notification ID as read for req.user.id with injectable clock 46ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > enforces Decision #20: User A cannot mark User B notification as read (fails 403) 17ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > handles batch array ids and rejects cross-tenant manipulation (Decision #20 & #55) 28ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 3. POST /api/notifications/read-all > atomically marks all unread notifications for req.user.id and preserves other users (Decision #20) 25ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 4. GET & PUT /api/notifications/preferences > GET returns default preferences without creating DB row (Decision #54) 110ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 4. GET & PUT /api/notifications/preferences > PUT validates and updates preferences for req.user.id 201ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 5. Decision #54 Hardening (NO WRITES ON GET) > GET /api/notifications does not mutate any database state 237ms
 ✓ tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 6. Decision #55 Hardening (FAIL CLOSED ON DB ERROR) > rolls back and leaves state intact when mid-transaction or update errors occur 33ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 401 when Authorization header is missing 42ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 400 when pool_id query parameter is missing or malformed 9ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 404 when pool does not exist 56ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 403 when user is not the pool commissioner 4ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 200 and game slate snapshot when user is the verified commissioner 14ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403
penalty_media row count = 0

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403
penalty_media row count = 0

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > verifies zero penalty_media rows exist after denied upload attempts
penalty_media row count = 0

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403
penalty_media row count = 0

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 401 when Authorization header is missing 24ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 400 when pool_id is missing or malformed in request body 7ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 404 when pool does not exist in request body 4ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 403 when user is not the pool commissioner 6ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 200 and upserts pick when authenticated user is the commissioner 24ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403 12ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403 5ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > verifies zero penalty_media rows exist after denied upload attempts 2ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: penalty OWNER -> 201 success 12ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403 5ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: pool COMMISSIONER -> 200 success 8ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write)
pool count before = 35
pool count after = 35
pool count invariant = PASS

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write)
pool count before = 35
pool count after = 35
pool count invariant = PASS

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 400 when explicit pool_id is not a valid UUID (no pool write)
pool count before = 35
pool count after = 35
pool count invariant = PASS

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 403 when user is not a member or commissioner of the requested pool (no pool write)
pool count before = 35
pool count after = 35
pool count invariant = PASS

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot
pool count before = 35
pool count after = 35
pool count invariant = PASS
member response byte equality = PASS
commissioner response byte equality = PASS

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write) 10ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write) 8ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 400 when explicit pool_id is not a valid UUID (no pool write) 4ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 403 when user is not a member or commissioner of the requested pool (no pool write) 6ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot 20ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > Decision #49: CI Route Scan & Route Guard Verification > verifies all routes with pool parameters are guarded; only /api/health and GET /api/admin/users allowlisted 1ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts RLS is ENABLED (relrowsecurity=true) and relforcerowsecurity=false on all application public tables 53ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts anon role is denied SELECT (SQLSTATE 42501) across all public tables 101ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts authenticated role is denied SELECT (SQLSTATE 42501) across all public tables 37ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b: asserts anon role is denied UPDATE on penalty_ledger with SQLSTATE 42501 (privilege proof) 3ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2c: asserts has_function_privilege returns false for anon and authenticated on BR-1 trigger functions 6ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: asserts trigger and function definitions match requirements (BEFORE ROW/STATEMENT, plpgsql, prosecdef=false, unconditional RAISE) 10ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: UPDATE (including no-op update) is blocked with count >= 1 and SQLSTATE P0001 17ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: DELETE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001 6ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: TRUNCATE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001 5ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: membership-row DELETE cascades to penalty_ledger and is intercepted by trigger with P0001 10ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: DELETE FROM pools fixture asserts exact foreign key constraint pool_memberships_pool_id_fkey and SQLSTATE 23503 3ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects non-commissioner pool members with 403 Forbidden 96ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects global ADMIN users who are not pool commissioners (Decision #20 zero bypass) 10ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects commissioners of different pools with 403 Forbidden 7ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > allows valid pool commissioner to create an override proposal 16ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > applies a commissioner pick override inside a serializable transaction 28ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > applies a commissioner penalty override with decimal ledger tracking 27ms
 ✓ tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 3. Read-Only GET Proposal Query (Decision #54) > GET /api/pools/:pool_id/proposals returns history and produces zero side effects 12ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > both rows created 87ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > duplicate enqueue creates no second outbox OR inbox row 17ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > caller transaction that throws after enqueue leaves zero rows in both tables 16ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > IN_APP-only writes no outbox row 10ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > EMAIL-only writes no inbox row 10ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > disallowed payload key is stripped 16ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > reminder payload keys are exactly poolName, windowLabel, lockAtUtc, deepLink 7ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > rejects non-transaction client or root prisma instance 5ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > skips EMAIL channel if emailEnabled is false in NotificationPreference 13ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > static test fails if the module imports nodemailer, net, http(s) or fetch 7ms
 ✓ tests/br4b.test.ts > BR-4b: Fail-Closed Claim Store Invariant (Decision #52) > Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed 49ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 1. Cryptographic Signature Verification Unit Tests > verifies valid HMAC SHA-256 signatures with hex and sha256= prefix 6ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 1. Cryptographic Signature Verification Unit Tests > rejects invalid signature, mismatched secret, or tampered payload (Fail-Closed) 1ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > rejects webhook requests with missing signature header with 401 Unauthorized 57ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > rejects webhook requests with forged or invalid signature with 401 Unauthorized 8ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > processes valid signed delivered event and transitions OutboxEvent to SENT 27ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > processes valid signed bounce event and transitions OutboxEvent to DEAD with diagnostic JSON 15ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 3. Decision #54 Side-Effect Free GET Invariant > GET /api/webhooks/notifications returns 405 Method Not Allowed and causes ZERO mutations 15ms
 ✓ tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 4. Decision #55 Fail-Closed Database Fault Tolerance > returns 500 when database transaction fails during webhook ingestion, refusing receipt acknowledgement 17ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 when Authorization header is absent 2ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 when Authorization header does not start with Bearer 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 for an invalid / expired token 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > decodes valid JWT and attaches user to req.user, then calls next() 5ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > returns 401 if req.user is undefined 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > returns 403 if req.user is not ADMIN 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > calls next() if user is ADMIN 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 401 if req.user is missing 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 400 for a malformed non-UUID pool_id 0ms
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
 ✓ tests/m15_4_sweat_radar.test.ts > Milestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66) > Decision #62 - Circuit Breaker (FeatureFlagKey.SWEAT_RADAR) > Feature is disabled by default (returns false) 2ms
 ✓ tests/m15_4_sweat_radar.test.ts > Milestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66) > Decision #62 - Circuit Breaker (FeatureFlagKey.SWEAT_RADAR) > Feature gates can be toggled on and off 0ms
 ✓ tests/m15_4_sweat_radar.test.ts > Milestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66) > Divergence Computation (Decision #66 - Lock Visibility) > Excludes unlocked games from divergence output 2ms
 ✓ tests/m15_4_sweat_radar.test.ts > Milestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66) > Divergence Computation (Decision #66 - Lock Visibility) > Computes correct home/away pick rates with Decimal precision 1ms
 ✓ tests/m15_4_sweat_radar.test.ts > Milestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66) > Cohort Floor Suppression (Finding 5.6 / canExposeAggregate) > Suppresses divergence when cohort size is below the floor (< 3) 0ms
 ✓ tests/m15_4_sweat_radar.test.ts > Milestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66) > Cohort Floor Suppression (Finding 5.6 / canExposeAggregate) > Does NOT suppress when cohort meets or exceeds the floor 0ms
 ✓ tests/m15_4_sweat_radar.test.ts > Milestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66) > Leverage Swing Computation (Decision #54 - Pure Calculation) > Computes leverage only for locked, non-finalized games 1ms
 ✓ tests/m15_4_sweat_radar.test.ts > Milestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66) > Leverage Swing Computation (Decision #54 - Pure Calculation) > Produces a leverage entry for every member with a pick on pending games 0ms
 ✓ tests/m15_4_sweat_radar.test.ts > Milestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66) > Leverage Swing Computation (Decision #54 - Pure Calculation) > Swing magnitude is always non-negative (Decimal precision) 1ms
 ✓ tests/m15_4_sweat_radar.test.ts > Milestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66) > Leverage Swing Computation (Decision #54 - Pure Calculation) > Higher swing for games with more divergent picks (g3 50/50 split) 1ms
 ✓ tests/m15_4_sweat_radar.test.ts > Milestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66) > Scenario Simulation (Decision #54 - Zero Writes on GET) > Projects correct totals when all home teams win 1ms
 ✓ tests/m15_4_sweat_radar.test.ts > Milestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66) > Scenario Simulation (Decision #54 - Zero Writes on GET) > Outcomes are sorted descending by projected total 0ms
 ✓ tests/m15_4_sweat_radar.test.ts > Milestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66) > Scenario Simulation (Decision #54 - Zero Writes on GET) > Zero delta when no assumptions match any picks 0ms
 ✓ tests/m15_4_sweat_radar.test.ts > Milestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66) > Snapshot Builder (Decision #61 - Pure Overlay) > Builds a complete snapshot with divergence and leverage 1ms
 ✓ tests/m15_4_sweat_radar.test.ts > Milestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66) > Snapshot Builder (Decision #61 - Pure Overlay) > Snapshot divergence excludes unlocked games 1ms
 ✓ tests/m15_4_sweat_radar.test.ts > Milestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66) > Snapshot Builder (Decision #61 - Pure Overlay) > Snapshot leverage excludes finalized games 1ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Rolling lock: enforces lock per-game at kickoff boundary 2ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Rolling lock with offset: enforces lock at (kickoff - offset) 1ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Global lock vs Rolling lock: handles first game vs later games 0ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Excluded windows: correctly identifies TNF, MNF, Sunday Early/Late, SNF 1ms
 ✓ tests/characterization.test.ts > BR-4 splitPenalty Math Characterization > Worked matrix: confirms exact zero-diff decimal split amounts 3ms
 ✓ tests/characterization.test.ts > BR-4b Set-Equality: Wrap-Up vs Scoring Resolver > Asserts 100% game ID set equality between wrap-up and scoring resolvers 1ms
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
 ✓ tests/m15_5_e2e_integration.test.ts > Milestone 15.5 - Phase 15 E2E Pipeline Integration (Decisions #3, #20, #22, #54, #61, #62, #65, #66) > Executes the complete Phase 15 social stakes & risk telemetry pipeline 12ms
 ✓ tests/m14_1_feature_registry.test.ts > Milestone 14.1 - Feature Registry & Circuit Breaker (Decisions #20, #61, #62) > Decision #62: Feature defaults to OFF when not explicitly configured 2ms
 ✓ tests/m14_1_feature_registry.test.ts > Milestone 14.1 - Feature Registry & Circuit Breaker (Decisions #20, #61, #62) > Decision #62: Returns true only when explicitly enabled for the pool 0ms
 ✓ tests/m14_1_feature_registry.test.ts > Milestone 14.1 - Feature Registry & Circuit Breaker (Decisions #20, #61, #62) > Decision #62: Middleware returns 404 when feature is disabled for pool members 1ms
 ✓ tests/m14_1_feature_registry.test.ts > Milestone 14.1 - Feature Registry & Circuit Breaker (Decisions #20, #61, #62) > Decision #62: Middleware calls next() when feature is enabled 0ms
 ✓ tests/m15_1_bounty_board.test.ts > Milestone 15.1 - Feature 2: Bounty Board Engine (Decisions #3, #22, #61, #62, #65) > Creates bounty offer and validates strict positive escrow 2ms
 ✓ tests/m15_1_bounty_board.test.ts > Milestone 15.1 - Feature 2: Bounty Board Engine (Decisions #3, #22, #61, #62, #65) > Rejects bounty creation fail-closed if target game is already locked (Decision #65) 1ms
 ✓ tests/m15_1_bounty_board.test.ts > Milestone 15.1 - Feature 2: Bounty Board Engine (Decisions #3, #22, #61, #62, #65) > Settles single-claimant bounty with 100% escrow payout 1ms
 ✓ tests/m15_1_bounty_board.test.ts > Milestone 15.1 - Feature 2: Bounty Board Engine (Decisions #3, #22, #61, #62, #65) > Distributes multi-claimant split with exact penny remainder preservation ($100 / 3 claimants) 1ms
 ✓ tests/m15_1_bounty_board.test.ts > Milestone 15.1 - Feature 2: Bounty Board Engine (Decisions #3, #22, #61, #62, #65) > Settles refund to creator when zero claimants qualify 0ms
 ✓ tests/m15_2_rival_hex.test.ts > Milestone 15.2 - Feature 4: Rival Hex Pairwise Challenge Engine (Decisions #3, #22, #61, #62, #65) > Creates a proposed challenge with valid Decimal stakes and handicap 2ms
 ✓ tests/m15_2_rival_hex.test.ts > Milestone 15.2 - Feature 4: Rival Hex Pairwise Challenge Engine (Decisions #3, #22, #61, #62, #65) > Rejects self-challenge fail-closed 1ms
 ✓ tests/m15_2_rival_hex.test.ts > Milestone 15.2 - Feature 4: Rival Hex Pairwise Challenge Engine (Decisions #3, #22, #61, #62, #65) > Rejects challenge proposal on locked slate (Decision #65) 1ms
 ✓ tests/m15_2_rival_hex.test.ts > Milestone 15.2 - Feature 4: Rival Hex Pairwise Challenge Engine (Decisions #3, #22, #61, #62, #65) > Rejects challenge acceptance once slate has locked (Decision #65) 0ms
 ✓ tests/m15_2_rival_hex.test.ts > Milestone 15.2 - Feature 4: Rival Hex Pairwise Challenge Engine (Decisions #3, #22, #61, #62, #65) > Settles challenger victory and awards 2x side-pot ($40.00) 1ms
 ✓ tests/m15_2_rival_hex.test.ts > Milestone 15.2 - Feature 4: Rival Hex Pairwise Challenge Engine (Decisions #3, #22, #61, #62, #65) > Applies positive handicap correctly to target player 0ms
 ✓ tests/m15_2_rival_hex.test.ts > Milestone 15.2 - Feature 4: Rival Hex Pairwise Challenge Engine (Decisions #3, #22, #61, #62, #65) > Resolves exact score tie to STALEMATE_REFUND returning original stake 0ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > allows valid local disposable database URLs 3ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects remote / hosted database URLs (Supabase, AWS, Neon, etc.) 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > Decision #32 Sabotage Test: point TEST_DATABASE_URL at production fingerprint -> aborts before connection 0ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects URLs using ?schema= parameter to bypass host isolation 0ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects non-disposable production database names on localhost 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > sabotage test: throws when TEST_DATABASE_URL is empty string or undefined 1ms
 ✓ tests/m15_0_intake.test.ts > Milestone 15.0 - Phase 15 Intake & Bounty Board Scaffolding (Decisions #3, #22, #61, #62) > Creates a bounty offer with exact Decimal precision 2ms
 ✓ tests/m15_0_intake.test.ts > Milestone 15.0 - Phase 15 Intake & Bounty Board Scaffolding (Decisions #3, #22, #61, #62) > Rejects non-positive escrow amounts fail-closed 1ms
 ✓ tests/m15_0_intake.test.ts > Milestone 15.0 - Phase 15 Intake & Bounty Board Scaffolding (Decisions #3, #22, #61, #62) > Settles bounty as CLAIMED when a qualifying claimant is present 1ms
 ✓ tests/m15_0_intake.test.ts > Milestone 15.0 - Phase 15 Intake & Bounty Board Scaffolding (Decisions #3, #22, #61, #62) > Settles bounty as REFUNDED to creator when expired without claimant 0ms
 ✓ tests/m14_5_escalation.test.ts > Milestone 14.5 - Dead Place Escalation Ladder (Decisions #3, #22, #61, #62) > Calculates base penalty for 1st week last place finish 2ms
 ✓ tests/m14_5_escalation.test.ts > Milestone 14.5 - Dead Place Escalation Ladder (Decisions #3, #22, #61, #62) > Calculates exponential streak escalation for consecutive last place finishes 1ms
 ✓ tests/m14_5_escalation.test.ts > Milestone 14.5 - Dead Place Escalation Ladder (Decisions #3, #22, #61, #62) > Caps escalation at maxEscalationLevel 0ms
 ✓ tests/m14_5_escalation.test.ts > Milestone 14.5 - Dead Place Escalation Ladder (Decisions #3, #22, #61, #62) > Resets streak to 0 when player escapes last place 0ms
 ✓ tests/m14_5_escalation.test.ts > Milestone 14.5 - Dead Place Escalation Ladder (Decisions #3, #22, #61, #62) > Emits append-only compensating adjustment without in-place mutation 1ms
 ✓ tests/m14_7_e2e_integration.test.ts > Milestone 14.7 - Phase 14 E2E Pipeline Integration (Decisions #3, #20, #22, #54, #61, #62, #65, #66) > Executes the complete Phase 14 lifecycle across all 6 modules 7ms
 ✓ tests/m14_3_visibility.test.ts > Milestone 14.3 - Central Pick Visibility Service (Decisions #20, #66) > Decision #66: Truth-Table Pick Visibility > Owner can always view their own pick regardless of lock or policy 2ms
 ✓ tests/m14_3_visibility.test.ts > Milestone 14.3 - Central Pick Visibility Service (Decisions #20, #66) > Decision #66: Truth-Table Pick Visibility > Competitor pick is hidden when policy is active and game is unlocked 0ms
 ✓ tests/m14_3_visibility.test.ts > Milestone 14.3 - Central Pick Visibility Service (Decisions #20, #66) > Decision #66: Truth-Table Pick Visibility > Competitor pick is visible when policy is active and game is locked 0ms
 ✓ tests/m14_3_visibility.test.ts > Milestone 14.3 - Central Pick Visibility Service (Decisions #20, #66) > Decision #66: Truth-Table Pick Visibility > Competitor pick is visible when policy is disabled even if game is unlocked 0ms
 ✓ tests/m14_3_visibility.test.ts > Milestone 14.3 - Central Pick Visibility Service (Decisions #20, #66) > Finding 5.6: Anti-Peeking Cohort Floor (N >= 3) > Suppresses aggregate exposure if cohort size is below 3 0ms
 ✓ tests/m14_3_visibility.test.ts > Milestone 14.3 - Central Pick Visibility Service (Decisions #20, #66) > Finding 5.6: Anti-Peeking Cohort Floor (N >= 3) > Permits aggregate exposure if cohort size is 3 or greater 0ms
 ✓ tests/m14_3_visibility.test.ts > Milestone 14.3 - Central Pick Visibility Service (Decisions #20, #66) > Pick Selection Masking Helper > Masks selection to null when canView is false 0ms
 ✓ tests/m14_3_visibility.test.ts > Milestone 14.3 - Central Pick Visibility Service (Decisions #20, #66) > Pick Selection Masking Helper > Preserves selection when canView is true 0ms
 ✓ tests/m15_3_comeback_vault.test.ts > Milestone 15.3 - Feature 5: Comeback Vault Mechanics (Decisions #3, #22, #61, #62, #65) > Denies eligibility when slate week is before minimum threshold week 3ms
 ✓ tests/m15_3_comeback_vault.test.ts > Milestone 15.3 - Feature 5: Comeback Vault Mechanics (Decisions #3, #22, #61, #62, #65) > Denies eligibility when deficit is below threshold 1ms
 ✓ tests/m15_3_comeback_vault.test.ts > Milestone 15.3 - Feature 5: Comeback Vault Mechanics (Decisions #3, #22, #61, #62, #65) > Grants eligibility when week >= 10 and deficit >= 15.00 points 1ms
 ✓ tests/m15_3_comeback_vault.test.ts > Milestone 15.3 - Feature 5: Comeback Vault Mechanics (Decisions #3, #22, #61, #62, #65) > Calculates boosted underdog score with exact Decimal math (1 * 1.5 = 1.50) 0ms
 ✓ tests/m15_3_comeback_vault.test.ts > Milestone 15.3 - Feature 5: Comeback Vault Mechanics (Decisions #3, #22, #61, #62, #65) > Does not apply multiplier if pick is incorrect or not underdog 0ms
 ✓ tests/m14_6_press_box.test.ts > Milestone 14.6 - League Press Box & 12.2 Reconciliation (Finding 5.6, Decisions #20, #61, #62) > Extracts deterministic fact tuples for winner, runner-up, and dead place 5ms
 ✓ tests/m14_6_press_box.test.ts > Milestone 14.6 - League Press Box & 12.2 Reconciliation (Finding 5.6, Decisions #20, #61, #62) > Generates deterministic recap copy from structured facts without LLM hallucinations 1ms
 ✓ tests/m14_6_press_box.test.ts > Milestone 14.6 - League Press Box & 12.2 Reconciliation (Finding 5.6, Decisions #20, #61, #62) > Generates an incremented revision artifact instead of in-place mutation upon stat correction 1ms
 ✓ tests/m14_2_state_graph.test.ts > Milestone 14.2 - Weekly State Graph & Amendments A1-A8 (Decision #65) > A1: Derives OPEN when no games have reached kickoff 2ms
 ✓ tests/m14_2_state_graph.test.ts > Milestone 14.2 - Weekly State Graph & Amendments A1-A8 (Decision #65) > A1 & A7: Derives PARTIAL_LOCK when at least one game locked and at least one unlocked 0ms
 ✓ tests/m14_2_state_graph.test.ts > Milestone 14.2 - Weekly State Graph & Amendments A1-A8 (Decision #65) > A1 & A7: Derives LIVE when all games are locked but not all final 0ms
 ✓ tests/m14_2_state_graph.test.ts > Milestone 14.2 - Weekly State Graph & Amendments A1-A8 (Decision #65) > A1: Derives SETTLEMENT when all games are final 0ms
 ✓ tests/m14_2_state_graph.test.ts > Milestone 14.2 - Weekly State Graph & Amendments A1-A8 (Decision #65) > A6: Derives FINALIZED when slate is committed 0ms
 ✓ tests/m14_2_state_graph.test.ts > Milestone 14.2 - Weekly State Graph & Amendments A1-A8 (Decision #65) > A2: Game lock remains authoritative independent of slate state 0ms
 ✓ tests/m14_4_command_bar.test.ts > Milestone 14.4 - Matrix Command Bar (Finding 5.6, Decisions #20, #62, #66) > FAVORITES action picks home team and skips locked games 3ms
 ✓ tests/m14_4_command_bar.test.ts > Milestone 14.4 - Matrix Command Bar (Finding 5.6, Decisions #20, #62, #66) > FLIP_ALL flips current selections and preserves locked game picks 1ms
 ✓ tests/m14_4_command_bar.test.ts > Milestone 14.4 - Matrix Command Bar (Finding 5.6, Decisions #20, #62, #66) > CLEAR_UNLOCKED removes unlocked picks only 0ms
 ✓ tests/m14_4_command_bar.test.ts > Milestone 14.4 - Matrix Command Bar (Finding 5.6, Decisions #20, #62, #66) > Finding 5.6: MIRROR_CONSENSUS suppresses action when cohort size < 3 0ms

 Test Files  35 passed (35)
      Tests  299 passed (299)
   Start at  21:06:34
   Duration  29.39s (tests 52%, import 31%, setup 9%, transform 6%, worker 1%)

     Import  79 modules were evaluated 421 times · 6.34s total, 31% of tracked time
             ~5.15s faster with isolate: false — shared modules are evaluated once per worker instead of once per file
             learn more: https://vitest.dev/guide/improving-performance#test-isolation
