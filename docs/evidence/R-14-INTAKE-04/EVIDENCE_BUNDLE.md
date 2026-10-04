# R-14-INTAKE-04 G1 REMEDIATION EVIDENCE DOSSIER

## 1. Commit & Branch Provenance
### Diff bdb43ea 1d99324
Reason: Local amend executed to bundle transient audit scripts and clean working tree before R-14-INTAKE-02 generation.
diff --git a/docs/evidence/R-14-INTAKE-01/EVIDENCE_BUNDLE.md b/docs/evidence/R-14-INTAKE-01/EVIDENCE_BUNDLE.md
index e69de29..b9586ad 100644
--- a/docs/evidence/R-14-INTAKE-01/EVIDENCE_BUNDLE.md
+++ b/docs/evidence/R-14-INTAKE-01/EVIDENCE_BUNDLE.md
@@ -0,0 +1,1181 @@
+# TWO-STAGE EVIDENCE BINDING RECORD (PATH B ΓÇö GOVERNED)
+- **Execution Baseline SHA (E_SHA):** bdb43ea53ebcb1c8facc2f29c46adde5e260752f
+- **Binding Container Target:** HEAD (Target for binding commit)
+- **Lineage Verification:** PARENT_VERIFIED (Parent commit of binding container is guaranteed to be bdb43ea53ebcb1c8facc2f29c46adde5e260752f)
+- **Baseline Working Tree:** 100% CLEAN (0 modified, 0 untracked)
+- **Governing Standard:** Binding Ruling R-14-INTAKE-01 & ARCHITECTURE.md (Two-Stage Forward-Binding Evidence Protocol)
+--------------------------------------------------------------------------------
+
+# BINDING RULING R-14-INTAKE-01: COMPREHENSIVE VERIFICATION BUNDLE
+**Execution Timestamp:** 2026-10-03T18:59:10.541Z
+**Target Branch:** `main`
+**Execution Baseline SHA:** `bdb43ea53ebcb1c8facc2f29c46adde5e260752f`
+**Generator Exit Code:** 0
+
+---
+
+## 1. Executive Summary & Acceptance Matrix
+### R-14-INTAKE-01 Verification & Acceptance Matrix
+- Lineage Anchor (Decision #53 & Ancestry at f9f9308): VERIFIED ON MAIN
+- Decision Register Ingestion (#61ΓÇô#66): BYTE-FOR-BYTE SYNCHRONIZED (66 Total Decisions)
+- CI Decision Register Enforcement (scripts/ci_check_register.js): EXIT CODE 0
+- Hosted Database Isolation & Tripwire Inventory: 15/15 PUBLIC TABLES VERIFIED
+- Hosted Database Inverse Guard (Negative Control): REJECTS LOCALHOST (EXIT CODE 1)
+- Rehearsal Database State (pickem_rehearsal): 9/9 MIGRATIONS APPLIED (UTC / app.disposable=true)
+- Regression Test Suite: 22/22 SUITES PASSED, 230/230 TESTS PASSED (EXIT CODE 0)
+- Outbox Idempotency Key Contract: ATOMIC CLAIM & DEDUPLICATION ENFORCED
+- Shared Table Schema Guardrail (PenaltyLedger & NotificationPreference): ZERO FEATURE CREEP
+- Push Governance (Decision #53): ZERO REMOTE PUSHES RECORDED
+
+---
+
+## 2. Section 1: Git Identity, Lineage Ancestry & Working Tree Hygiene (Decision #53)
+
+### 2.1 Branch & Current Execution Baseline
+- **Active Branch:** `main`
+- **Execution Baseline SHA:** `bdb43ea53ebcb1c8facc2f29c46adde5e260752f`
+
+### 2.2 Working Tree Status at Baseline
+```
+(clean - 0 uncommitted changes)
+```
+
+### 2.3 Commit Lineage Ancestry Verification
+- **Milestone 12.1 Root Ancestry (6c2fb46):** CONFIRMED ANCESTOR (Exit Code 0)
+- **Phase 13 Final Closure Ancestry (f9f9308):** CONFIRMED ANCESTOR (Exit Code 0)
+
+### 2.4 Git Commit History (Last 15 Commits on `main`)
+```
+bdb43ea chore: prepare R-14-INTAKE-01 evidence baseline
+cccaac1 chore: update tripwire and db header for 15-table schema and rehearsal
+c09c365 docs: ingest Decisions #61-66 from R-14-INTAKE-01
+f9f9308 docs: bind Section 9 verification bundle for Phase 13 final program closure
+c98e2a3 feat(phase13-closure): generate comprehensive raw terminal evidence for Phase 13 closure
+45eb5a7 Merge pull request #9 from jdubciii/feat/phase13-4-e2e-verification
+11ec29f docs: bind Section 9 verification bundle for Milestone 13.4
+68211ec feat(phase13-4): implement full-stack end-to-end lifecycle verification suite
+4184184 docs: author Milestone 13.4 Full-Stack E2E Verification paper design specification
+2cf6b04 Merge pull request #8 from jdubciii/feat/phase13-3-admin-ops-panel
+2ac0df6 docs: bind Section 9 verification bundle for Milestone 13.3
+7db5e74 feat(phase13-3): implement system admin ops panel, health telemetry, and dashboard UI
+58a9a0b docs: author Milestone 13.3 System Admin Ops Panel paper design specification
+ac9996f Merge pull request #7 from jdubciii/feat/phase13-2-commissioner-dashboard
+58b1e55 docs: bind Section 9 verification bundle for Milestone 13.2
+```
+
+### 2.5 Git Reflog (Last 15 Entries ΓÇö Decision #53 Push Guard Compliance)
+```
+bdb43ea HEAD@{0}: commit: chore: prepare R-14-INTAKE-01 evidence baseline
+cccaac1 HEAD@{1}: commit: chore: update tripwire and db header for 15-table schema and rehearsal
+c09c365 HEAD@{2}: commit: docs: ingest Decisions #61-66 from R-14-INTAKE-01
+f9f9308 HEAD@{3}: commit: docs: bind Section 9 verification bundle for Phase 13 final program closure
+c98e2a3 HEAD@{4}: commit: feat(phase13-closure): generate comprehensive raw terminal evidence for Phase 13 closure
+45eb5a7 HEAD@{5}: pull origin main: Fast-forward
+2cf6b04 HEAD@{6}: checkout: moving from feat/phase13-4-e2e-verification to main
+11ec29f HEAD@{7}: commit: docs: bind Section 9 verification bundle for Milestone 13.4
+68211ec HEAD@{8}: commit: feat(phase13-4): implement full-stack end-to-end lifecycle verification suite
+4184184 HEAD@{9}: commit: docs: author Milestone 13.4 Full-Stack E2E Verification paper design specification
+2cf6b04 HEAD@{10}: checkout: moving from main to feat/phase13-4-e2e-verification
+2cf6b04 HEAD@{11}: pull origin main: Fast-forward
+ac9996f HEAD@{12}: checkout: moving from feat/phase13-3-admin-ops-panel to main
+2ac0df6 HEAD@{13}: commit: docs: bind Section 9 verification bundle for Milestone 13.3
+7db5e74 HEAD@{14}: commit: feat(phase13-3): implement system admin ops panel, health telemetry, and dashboard UI
+```
+
+### 2.6 Git Remote Verification (`git remote -v`)
+```
+origin	https://github.com/jdubciii/NFL-Pick-Em.git (fetch)
+origin	https://github.com/jdubciii/NFL-Pick-Em.git (push)
+```
+
+---
+
+## 3. Section 2: Ruling Ledger Reconciliation Excerpt
+The following rulings ledger outlines the authoritative progression leading to R-14-INTAKE-01:
+- **R-12.1-RESTORE-01**: Transaction Isolation and Append-Only Ledger Immutability
+- **R-12.2-AE**: Multi-Tier Authorization, Dead-Letter Queue Architecture, and Single-Commit Protocol
+- **R-12.3-ADOPT**: Automated Reminder Scanning and Retention Framework
+- **R-12.4-FINAL**: Retention Pruning and Background Worker Governance
+- **R-13.1-CLOSEOUT**: User Notification Center & Preference Scoping (PR #6)
+- **R-13.2-CLOSEOUT**: Commissioner Governance & Proposal Lifecycle (PR #7)
+- **R-13.3-CLOSEOUT**: System Admin Operations Hub & Health Telemetry (PR #8)
+- **R-13.4-CLOSEOUT**: Full-Stack End-to-End Lifecycle Verification (PR #9)
+- **R-13-FINAL-CLOSURE-01**: Comprehensive Program Baseline & Final Phase 13 Sign-off
+- **R-14-INTAKE-01**: Intake Governance, Register Ingestion (Decisions #61ΓÇô#66), and Phase 14 Readiness
+
+---
+
+## 4. Section 3: Decision Register Byte-for-Byte Integrity Check (`node scripts/ci_check_register.js`)
+- **Exit Code:** 0 (Expected: 0)
+- **Raw Command Output:**
+```
+Γ£à CI Check PASSED: Appendix A Decision Register exists byte-for-byte in ARCHITECTURE.md.
+```
+
+---
+
+## 5. Section 4: Hosted Database Tripwire & Negative Control Proofs
+
+### 5.1 Hosted Database 15-Table Inventory Check (`node scripts/run_hosted_tripwire.js`)
+- **Exit Code:** 0 (Expected: 0)
+- **Raw Command Output:**
+```
+=== HOSTED DATABASE TRIPWIRE (R-12.2-AH-V2) ===
+
+Target Host: postgresql://postgres.[REDACTED]:****@aws-0-us-east-1.pooler.supabase.com:5432/postgres
+Parsed Hostname: aws-0-us-east-1.pooler.supabase.com
+Γ£à Inverse Guard verified: Target is confirmed hosted Supabase database.
+
+Connecting via Node pg client to stream exact query rows...
+
+1. Database Identity & Server Info:
+  - Database: postgres
+  - Current User: postgres
+  - Version: PostgreSQL 17.6 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 15.2.0, 64-bit
+
+2. Timestamp & Drift Metrics:
+  - DB Server Time: Sat Oct 03 2026 11:59:17 GMT-0700 (Mountain Standard Time)
+  - Hours Since T0 (2026-09-30T06:14:37Z): 84.7445 hrs
+
+3. All 15 Table Row Counts:
+  - users                    : 122
+  - pools                    : 100
+  - pool_memberships         : 11
+  - games                    : 16
+  - picks                    : 4
+  - pick_results             : 0
+  - weekly_submissions       : 0
+  - penalty_ledger           : 2
+  - penalty_media            : 0
+  - pool_member_stats        : 10
+  - audit_logs               : 10
+  - inbox_messages           : 0
+  - outbox_events            : 0
+  - notification_preferences : 0
+  - job_runs                 : 1
+
+4. to_regclass('public.weekly_wrapups'): NULL
+
+5. Applied Migrations (9 total):
+  - 20260927000000_init
+  - 20260928051824_add_pool_member_stats_and_penalty_ledger
+  - 20260928124900_precision_and_weekly_submissions
+  - 20260928170000_weekly_submission_finalized_and_game_notes
+  - 20260928180000_shot_cam_penalty_media_and_rls
+  - 20260929144500_br_1_ledger_append_only
+  - 20260930010000_br_2b_ledger_api_lockdown
+  - 20260930020000_br_2c_public_tables_api_lockdown
+  - 20261001160000_12_1_a_outbox_inbox_core
+
+6. Penalty Ledger Immutability Triggers Intact: TRUE
+
+7. Row-Level Security: rls_on: 16/16
+
+Γ£à Hosted Tripwire executed successfully.
+```
+
+### 5.2 Inverse Guard Negative Control Demonstration (`node scripts/run_hosted_tripwire.js --negative-control`)
+- **Exit Code:** 1 (Expected: 1 - Fail Closed)
+- **Raw Command Output:**
+```
+=== HOSTED DATABASE TRIPWIRE (R-12.2-AH-V2) ===
+
+Target Host: postgresql://postgres.[REDACTED]:****@localhost:5432/pickem_rehearsal
+Parsed Hostname: localhost
+
+SAFETY_ERROR: Refusing to run against localhost.
+Refusing to run against localhost
+```
+
+---
+
+## 6. Section 5: Rehearsal Database State & Diagnostics (`pickem_rehearsal`)
+
+### 6.1 Rehearsal Reset & Migration Deployment (`npm run db:reset`)
+- **Exit Code:** 0 (Expected: 0)
+- **Raw Command Output:**
+```
+> nfl-pick-em@1.0.0 db:reset
+> tsx scripts/dev/reset-rehearsal.mjs
+
+=== RESET REHEARSAL DATABASE (Decision #35) ===
+
+Γ£à URL Safety verified (localhost, no schema, pickem_rehearsal).
+Terminating active connections to pickem_rehearsal...
+Dropping and recreating pickem_rehearsal...
+Γ£à pickem_rehearsal database recreated with timezone=UTC and app.disposable=true.
+Γ£à Server sentinel app.disposable verified.
+Γ£à Role 'anon' provisioned.
+Γ£à Role 'authenticated' provisioned.
+Γ£à Role 'service_role' provisioned.
+
+--- Running prisma migrate deploy on pickem_rehearsal ---
+Environment variables loaded from .env
+Prisma schema loaded from prisma\schema.prisma
+Datasource "db": PostgreSQL database "pickem_rehearsal", schema "public" at "localhost:5432"
+
+9 migrations found in prisma/migrations
+
+Applying migration `20260927000000_init`
+Applying migration `20260928051824_add_pool_member_stats_and_penalty_ledger`
+Applying migration `20260928124900_precision_and_weekly_submissions`
+Applying migration `20260928170000_weekly_submission_finalized_and_game_notes`
+Applying migration `20260928180000_shot_cam_penalty_media_and_rls`
+Applying migration `20260929144500_br_1_ledger_append_only`
+Applying migration `20260930010000_br_2b_ledger_api_lockdown`
+Applying migration `20260930020000_br_2c_public_tables_api_lockdown`
+Applying migration `20261001160000_12_1_a_outbox_inbox_core`
+
+The following migration(s) have been applied:
+
+migrations/
+  ΓööΓöÇ 20260927000000_init/
+    ΓööΓöÇ migration.sql
+  ΓööΓöÇ 20260928051824_add_pool_member_stats_and_penalty_ledger/
+    ΓööΓöÇ migration.sql
+  ΓööΓöÇ 20260928124900_precision_and_weekly_submissions/
+    ΓööΓöÇ migration.sql
+  ΓööΓöÇ 20260928170000_weekly_submission_finalized_and_game_notes/
+    ΓööΓöÇ migration.sql
+  ΓööΓöÇ 20260928180000_shot_cam_penalty_media_and_rls/
+    ΓööΓöÇ migration.sql
+  ΓööΓöÇ 20260929144500_br_1_ledger_append_only/
+    ΓööΓöÇ migration.sql
+  ΓööΓöÇ 20260930010000_br_2b_ledger_api_lockdown/
+    ΓööΓöÇ migration.sql
+  ΓööΓöÇ 20260930020000_br_2c_public_tables_api_lockdown/
+    ΓööΓöÇ migration.sql
+  ΓööΓöÇ 20261001160000_12_1_a_outbox_inbox_core/
+    ΓööΓöÇ migration.sql
+      
+All migrations have been successfully applied.
+
+Applied Migrations:
+ΓöîΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓö¼ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓö¼ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÉ
+Γöé (index) Γöé migration_name                                              Γöé finished_at              Γöé
+Γö£ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓö╝ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓö╝ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöñ
+Γöé 0       Γöé '20260927000000_init'                                       Γöé 2026-10-03T18:59:25.455Z Γöé
+Γöé 1       Γöé '20260928051824_add_pool_member_stats_and_penalty_ledger'   Γöé 2026-10-03T18:59:25.485Z Γöé
+Γöé 2       Γöé '20260928124900_precision_and_weekly_submissions'           Γöé 2026-10-03T18:59:25.521Z Γöé
+Γöé 3       Γöé '20260928170000_weekly_submission_finalized_and_game_notes' Γöé 2026-10-03T18:59:25.527Z Γöé
+Γöé 4       Γöé '20260928180000_shot_cam_penalty_media_and_rls'             Γöé 2026-10-03T18:59:25.547Z Γöé
+Γöé 5       Γöé '20260929144500_br_1_ledger_append_only'                    Γöé 2026-10-03T18:59:25.555Z Γöé
+Γöé 6       Γöé '20260930010000_br_2b_ledger_api_lockdown'                  Γöé 2026-10-03T18:59:25.559Z Γöé
+Γöé 7       Γöé '20260930020000_br_2c_public_tables_api_lockdown'           Γöé 2026-10-03T18:59:25.568Z Γöé
+Γöé 8       Γöé '20261001160000_12_1_a_outbox_inbox_core'                   Γöé 2026-10-03T18:59:25.622Z Γöé
+ΓööΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓö┤ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓö┤ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÿ
+weekly_wrapups exists in public: false (Expected: false)
+
+ΓöîΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÉ
+Γöé  Update available 5.22.0 -> 8.0.0-rc.19                 Γöé
+Γöé                                                         Γöé
+Γöé  This is a major update - please follow the guide at    Γöé
+Γöé  https://pris.ly/d/major-version-upgrade                Γöé
+Γöé                                                         Γöé
+Γöé  Run the following to update                            Γöé
+Γöé    npm i --save-dev prisma@latest                       Γöé
+Γöé    npm i @prisma/client@latest                          Γöé
+ΓööΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÿ
+```
+
+### 6.2 Database Header & Rehearsal Verification (`node scripts/db_header.js`)
+- **Exit Code:** 0 (Expected: 0)
+- **Raw Command Output:**
+```
+=== DB Header & Rehearsal Verification ===
+
+1. Database Identity:
+[
+  {
+    "current_database": "pickem_rehearsal",
+    "current_user": "postgres",
+    "inet_server_addr": "::1",
+    "inet_server_port": 5432
+  }
+]
+
+2. Applied Migrations:
+[
+  {
+    "migration_name": "20260927000000_init",
+    "started_at": "2026-10-03T18:59:25.382Z",
+    "finished_at": "2026-10-03T18:59:25.455Z",
+    "applied_steps_count": 1
+  },
+  {
+    "migration_name": "20260928051824_add_pool_member_stats_and_penalty_ledger",
+    "started_at": "2026-10-03T18:59:25.456Z",
+    "finished_at": "2026-10-03T18:59:25.485Z",
+    "applied_steps_count": 1
+  },
+  {
+    "migration_name": "20260928124900_precision_and_weekly_submissions",
+    "started_at": "2026-10-03T18:59:25.486Z",
+    "finished_at": "2026-10-03T18:59:25.521Z",
+    "applied_steps_count": 1
+  },
+  {
+    "migration_name": "20260928170000_weekly_submission_finalized_and_game_notes",
+    "started_at": "2026-10-03T18:59:25.522Z",
+    "finished_at": "2026-10-03T18:59:25.527Z",
+    "applied_steps_count": 1
+  },
+  {
+    "migration_name": "20260928180000_shot_cam_penalty_media_and_rls",
+    "started_at": "2026-10-03T18:59:25.528Z",
+    "finished_at": "2026-10-03T18:59:25.547Z",
+    "applied_steps_count": 1
+  },
+  {
+    "migration_name": "20260929144500_br_1_ledger_append_only",
+    "started_at": "2026-10-03T18:59:25.549Z",
+    "finished_at": "2026-10-03T18:59:25.555Z",
+    "applied_steps_count": 1
+  },
+  {
+    "migration_name": "20260930010000_br_2b_ledger_api_lockdown",
+    "started_at": "2026-10-03T18:59:25.556Z",
+    "finished_at": "2026-10-03T18:59:25.559Z",
+    "applied_steps_count": 1
+  },
+  {
+    "migration_name": "20260930020000_br_2c_public_tables_api_lockdown",
+    "started_at": "2026-10-03T18:59:25.560Z",
+    "finished_at": "2026-10-03T18:59:25.568Z",
+    "applied_steps_count": 1
+  },
+  {
+    "migration_name": "20261001160000_12_1_a_outbox_inbox_core",
+    "started_at": "2026-10-03T18:59:25.569Z",
+    "finished_at": "2026-10-03T18:59:25.622Z",
+    "applied_steps_count": 1
+  }
+]
+
+3. Prisma Migrate Status:
+Environment variables loaded from .env
+Prisma schema loaded from prisma\schema.prisma
+Datasource "db": PostgreSQL database "pickem_rehearsal", schema "public" at "localhost:5432"
+
+9 migrations found in prisma/migrations
+
+Database schema is up to date!
+
+(node:17176) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/scripts/db_header.js is not specified and it doesn't parse as CommonJS.
+Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
+To eliminate this warning, add "type": "module" to \\?\C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\package.json.
+(Use `node --trace-warnings ...` to show where the warning was created)
+```
+
+---
+
+## 7. Section 6: Full Regression Test Suite Execution Telemetry (`npx vitest run --reporter=verbose`)
+- **Exit Code:** 0 (Expected: 0)
+- **Test Suites:** 22 Passed / 22 Total
+- **Total Tests:** 230 Passed / 230 Total (0 Failures, 0 Skips)
+- **Raw Vitest Output:**
+```
+RUN  v5.0.2 C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em
+
+ Γ£ô tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 1: Slate Finalization & Weekly Wrap-Up (Decision #24 & #27) > fails closed when attempting wrap-up against unfinalized slate (Decision #27) 255ms
+ Γ£ô tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 1: Slate Finalization & Weekly Wrap-Up (Decision #24 & #27) > successfully executes weekly wrap-up upon slate finalization with atomic idempotent claim (Decision #24) 107ms
+ Γ£ô tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 2: Asynchronous Outbox Fanout & Inbox Ingestion (Milestones 12.1, 12.3 & Decision #57) > creates outbox events with compound dedupeKey and drains them to inbox_messages 87ms
+ Γ£ô tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 3: User Notification Center & Isolation (Milestone 13.1 & Decision #20, #54, #55) > fetches unread inbox messages via GET /api/notifications with ZERO state mutations (Decision #54) 121ms
+ Γ£ô tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 3: User Notification Center & Isolation (Milestone 13.1 & Decision #20, #54, #55) > enforces cross-tenant isolation: User A cannot mark User B notification as read (Decision #20) 45ms
+ Γ£ô tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 3: User Notification Center & Isolation (Milestone 13.1 & Decision #20, #54, #55) > allows User A to mark own notification as read with deterministic ClockFn timestamp 20ms
+ Γ£ô tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 4: Commissioner Governance & Precision Math (Milestone 13.2 & Decision #20, #3, #22, #54, #55) > rejects global ADMIN attempting commissioner action on Pool 1 (Decision #20 Zero Bypass) 10ms
+ Γ£ô tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 4: Commissioner Governance & Precision Math (Milestone 13.2 & Decision #20, #3, #22, #54, #55) > allows Pool Commissioner to create, vote APPROVE, and execute proposal with Decimal precision (Decisions #3 & #22) 68ms
+ Γ£ô tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 5: System Admin Ops & Retention Pruning (Milestone 13.3, 12.4 & Decision #20, #54, #55) > rejects Pool Commissioner accessing System Admin Ops health telemetry with 403 Forbidden (Decision #20) 5ms
+ Γ£ô tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 5: System Admin Ops & Retention Pruning (Milestone 13.3, 12.4 & Decision #20, #54, #55) > allows Global ADMIN to fetch GET /api/admin/ops/system/health with ZERO database mutations (Decision #54) 171ms
+ Γ£ô tests/e2ePhase13Lifecycle.test.ts > Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite > Lifecycle Flow 5: System Admin Ops & Retention Pruning (Milestone 13.3, 12.4 & Decision #20, #54, #55) > advances ClockFn by 35 days and triggers bounded retention prune, safely purging expired records 29ms
+ Γ£ô tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 1. Decision #20: Pool Commissioner Scoping & Tier Isolation > allows verified pool commissioner to vote on and execute proposals 197ms
+ Γ£ô tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 1. Decision #20: Pool Commissioner Scoping & Tier Isolation > rejects standard pool members with 403 Forbidden 11ms
+ Γ£ô tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 1. Decision #20: Pool Commissioner Scoping & Tier Isolation > rejects global ADMINs who are not pool commissioners with 403 Forbidden (Decision #20 zero bypass) 10ms
+ Γ£ô tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 2. Decision #54: Side-Effect Free GET Telemetry > GET /proposals, GET /overrides, and GET /ops/status execute zero DB mutations 165ms
+ Γ£ô tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 3. Decision #27: Authoritative Slate & Game Finality Verification > fails closed when proposal targets an unfinalized slate or game 34ms
+ Γ£ô tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 4. Decisions #3 & #22: Precision Decimal Scoring & Aggregation > applies decimal scoring adjustments accurately without floating-point drift 36ms
+ Γ£ô tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 5. Decision #55: Transaction Fail-Closed Rollback > aborts and rolls back entire state on execution error 16ms
+ Γ£ô tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 6. Injectable ClockFn Determinism > records deterministic timestamps on proposal voting and execution 21ms
+ Γ£ô tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 1. Precondition Check & Fail Closed (Decision #27 & #55) > fails closed with SCORE_FEED_UNAVAILABLE when unfinalized games exist for target week 80ms
+ Γ£ô tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 1. Precondition Check & Fail Closed (Decision #27 & #55) > fails closed when DB client or claim store is unreachable (Decision #55) 2ms
+ Γ£ô tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 2. Precision Decimal Scoring & Split Penalties (Decisions #3 & #22) > calculates standings and splits dead place penalty precisely between tied losers 108ms
+ Γ£ô tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 3. Claim Store Concurrency & Idempotency (Decision #24 & #57) > subsequent execution on already wrapped week returns ALREADY_WRAPPED_UP and produces 0 duplicates 4ms
+ Γ£ô tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 3. Claim Store Concurrency & Idempotency (Decision #24 & #57) > enforces outbox notification preferences and deduplication key (Decision #57) 7ms
+ Γ£ô tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/wrap-up is rejected for standard users and pool commissioners (Decision #20) 81ms
+ Γ£ô tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/wrap-up succeeds for system ADMIN 23ms
+ Γ£ô tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > GET /api/admin/ops/wrap-up/status is strictly read-only (Decision #54) 9ms
+ Γ£ô tests/wrapUpEngine.test.ts > Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out > 4. Tier Separation & Route Protection (Decision #20 & #54) > POST /api/admin/ops/season-seal records immutable snapshot 50ms
+ Γ£ô tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 1. Role-Based Access Control (Decision #20 Hardening) > rejects unauthenticated requests with 401 Unauthorized 54ms
+ Γ£ô tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 1. Role-Based Access Control (Decision #20 Hardening) > rejects standard users on /api/admin/ops/system/health with 403 Forbidden 7ms
+ Γ£ô tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 1. Role-Based Access Control (Decision #20 Hardening) > rejects pool commissioners on /api/admin/ops/system/health with 403 Forbidden 6ms
+ Γ£ô tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 1. Role-Based Access Control (Decision #20 Hardening) > allows global ADMIN to retrieve health telemetry 183ms
+ Γ£ô tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 2. Read-Only GET Execution & Zero Mutations (Decision #54) > enforces strictly read-only execution with ZERO database mutations on GET /api/admin/ops/system/health 80ms
+ Γ£ô tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 3. Telemetry Accuracy Across Outbox, Inbox, DLQ, and Retention > returns exact telemetry matching database states 23ms
+ Γ£ô tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 3. Telemetry Accuracy Across Outbox, Inbox, DLQ, and Retention > verifies /api/admin/ops/reminders/scan alias route executes successfully for ADMIN 67ms
+ Γ£ô tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 4. Fail-Closed Error Handling (Decision #55) > fails closed and returns 500 if database telemetry query encounters an error 22ms
+ Γ£ô tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 401 when Authorization header is missing 49ms
+ Γ£ô tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 400 when pool_id query parameter is missing or malformed 21ms
+ Γ£ô tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 404 when pool does not exist 71ms
+ Γ£ô tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 403 when user is not the pool commissioner 15ms
+ Γ£ô tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 200 and game slate snapshot when user is the verified commissioner 76ms
+ Γ£ô tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 401 when Authorization header is missing 39ms
+ Γ£ô tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 400 when pool_id is missing or malformed in request body 20ms
+ Γ£ô tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 404 when pool does not exist in request body 13ms
+ Γ£ô tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 403 when user is not the pool commissioner 7ms
+ Γ£ô tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 200 and upserts pick when authenticated user is the commissioner 47ms
+stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403
+penalty_media row count = 0
+
+stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403
+penalty_media row count = 0
+
+stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > verifies zero penalty_media rows exist after denied upload attempts
+penalty_media row count = 0
+
+stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403
+penalty_media row count = 0
+
+ Γ£ô tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403 21ms
+ Γ£ô tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403 8ms
+ Γ£ô tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > verifies zero penalty_media rows exist after denied upload attempts 2ms
+ Γ£ô tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: penalty OWNER -> 201 success 16ms
+ Γ£ô tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403 8ms
+ Γ£ô tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: pool COMMISSIONER -> 200 success 11ms
+stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write)
+pool count before = 8
+pool count after = 8
+pool count invariant = PASS
+
+stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write)
+pool count before = 8
+pool count after = 8
+pool count invariant = PASS
+
+stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 400 when explicit pool_id is not a valid UUID (no pool write)
+pool count before = 8
+pool count after = 8
+pool count invariant = PASS
+
+stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 403 when user is not a member or commissioner of the requested pool (no pool write)
+pool count before = 8
+pool count after = 8
+pool count invariant = PASS
+
+stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot
+pool count before = 8
+pool count after = 8
+pool count invariant = PASS
+member response byte equality = PASS
+commissioner response byte equality = PASS
+
+ Γ£ô tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write) 16ms
+ Γ£ô tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write) 6ms
+ Γ£ô tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 400 when explicit pool_id is not a valid UUID (no pool write) 6ms
+ Γ£ô tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 403 when user is not a member or commissioner of the requested pool (no pool write) 11ms
+ Γ£ô tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot 30ms
+ Γ£ô tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > Decision #49: CI Route Scan & Route Guard Verification > verifies all routes with pool parameters are guarded; only /api/health and GET /api/admin/users allowlisted 1ms
+ Γ£ô tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 1. Exponential Backoff & Injectable Clock Unit Tests > calculates deterministic exponential backoff intervals without jitter or drift 20ms
+ Γ£ô tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 1. Exponential Backoff & Injectable Clock Unit Tests > injectable ClockFn allows instant time progression without setTimeout 5ms
+ Γ£ô tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > successful transport delivery transitions status PENDING -> PROCESSING -> SENT 37ms
+ Γ£ô tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > transient failure increments attempts, records diagnostic JSON and sets future backoff 18ms
+ Γ£ô tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > permanent rejection immediately transitions status to DEAD with diagnostic payload 15ms
+ Γ£ô tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > reaching MAX_ATTEMPTS transitions status to DEAD (Dead-Letter Invariant) 17ms
+ Γ£ô tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions > advancing simulated clock allows retry after backoff expires 17ms
+ Γ£ô tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects unauthenticated requests on /api/admin/ops/transports/* 59ms
+ Γ£ô tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects regular users on /api/admin/ops/transports/* with 403 16ms
+ Γ£ô tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > rejects pool commissioners on /api/admin/ops/transports/* with 403 (Decision #20 Hardening) 10ms
+ Γ£ô tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 3. Decision #20 Tier Separation: Admin Transport Routes > allows global ADMIN to query transports status and trigger dispatch sweep 160ms
+ Γ£ô tests/transports.test.ts > Milestone 12.3: Notification Transports, Retry Engine & DLQ > 4. Decision #54 Strict Read-Only Invariant on GET > GET /api/admin/ops/transports/status produces ZERO database mutations 45ms
+ Γ£ô tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 401 when unauthenticated on GET health and POST retry 65ms
+ Γ£ô tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 400 when pool_id is not a valid UUID 12ms
+ Γ£ô tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 404 when pool does not exist 78ms
+ Γ£ô tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 403 when authenticated user is a regular pool member (not commissioner) 26ms
+ Γ£ô tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 1. Authorization & Scoping on Pool Ops Routes > returns 403 when authenticated user is not a member of the pool 27ms
+ Γ£ô tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 2. GET /api/pools/:pool_id/ops/health > returns accurate telemetry and is strictly read-only (Decision #54) 145ms
+ Γ£ô tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 2. GET /api/pools/:pool_id/ops/health > strictly isolates pool telemetry with zero cross-pool leakage 22ms
+ Γ£ô tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 3. POST /api/pools/:pool_id/ops/outbox/retry > retries only DEAD/FAILED outbox events for the specified pool, resetting attempts and lease 112ms
+ Γ£ô tests/ops_routes.test.ts > Step F: Pool Ops Health & Outbox Retry Routes Tests > 3. POST /api/pools/:pool_id/ops/outbox/retry > retries a specific event when outboxId is provided 36ms
+ Γ£ô tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 1. Cryptographic Signature Verification Unit Tests > verifies valid HMAC SHA-256 signatures with hex and sha256= prefix 9ms
+ Γ£ô tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 1. Cryptographic Signature Verification Unit Tests > rejects invalid signature, mismatched secret, or tampered payload (Fail-Closed) 2ms
+ Γ£ô tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > rejects webhook requests with missing signature header with 401 Unauthorized 82ms
+ Γ£ô tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > rejects webhook requests with forged or invalid signature with 401 Unauthorized 8ms
+ Γ£ô tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > processes valid signed delivered event and transitions OutboxEvent to SENT 29ms
+ Γ£ô tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 2. POST /api/webhooks/notifications Ingress Security > processes valid signed bounce event and transitions OutboxEvent to DEAD with diagnostic JSON 14ms
+ Γ£ô tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 3. Decision #54 Side-Effect Free GET Invariant > GET /api/webhooks/notifications returns 405 Method Not Allowed and causes ZERO mutations 17ms
+ Γ£ô tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 4. Decision #55 Fail-Closed Database Fault Tolerance > returns 500 when database transaction fails during webhook ingestion, refusing receipt acknowledgement 16ms
+ Γ£ô tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 1. Retention Cutoff & Clock Calculation Unit Tests > calculates exact retention cutoff date based on injected clock 17ms
+ Γ£ô tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 2. State Protection & Terminal Boundaries (Decision #24 & #55) > NEVER prunes PENDING or PROCESSING records regardless of how old they are (State Protection Guard) 26ms
+ Γ£ô tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 2. State Protection & Terminal Boundaries (Decision #24 & #55) > prunes SENT records >30 days and DEAD records >90 days while preserving younger records 39ms
+ Γ£ô tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 3. Bounded Batching & Pagination Verification > processes multi-batch deletions with specified batchSize boundaries 29ms
+ Γ£ô tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects unauthenticated requests on /api/admin/ops/retention/* 64ms
+ Γ£ô tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects regular users on /api/admin/ops/retention/* with 403 14ms
+ Γ£ô tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > rejects pool commissioners on /api/admin/ops/retention/* with 403 (Decision #20 Hardening) 9ms
+ Γ£ô tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 4. Decision #20 Tier Separation on Admin Retention Routes > allows global ADMIN to trigger retention prune and query retention status 180ms
+ Γ£ô tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 5. Decision #54 Read-Only Invariant on GET > GET /api/admin/ops/retention/status produces ZERO deletions or writes 57ms
+ Γ£ô tests/retention.test.ts > Milestone 12.4: Notification Retention, Archival & Pruning Engine > 6. Decision #55 Fail-Closed Database Fault Tolerance > throws structured error and aborts on database transaction failure 14ms
+ Γ£ô tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 1. GET /api/notifications (Inbox Fetch & Telemetry) > returns 401 when unauthenticated 66ms
+ Γ£ô tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 1. GET /api/notifications (Inbox Fetch & Telemetry) > returns strictly req.user.id records with accurate unread counts 145ms
+ Γ£ô tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 1. GET /api/notifications (Inbox Fetch & Telemetry) > supports unreadOnly filter parameter 25ms
+ Γ£ô tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > idempotently marks single notification ID as read for req.user.id with injectable clock 53ms
+ Γ£ô tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > enforces Decision #20: User A cannot mark User B notification as read (fails 403) 18ms
+ Γ£ô tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 2. POST /api/notifications/read (Single & Batch Read State) > handles batch array ids and rejects cross-tenant manipulation (Decision #20 & #55) 32ms
+ Γ£ô tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 3. POST /api/notifications/read-all > atomically marks all unread notifications for req.user.id and preserves other users (Decision #20) 17ms
+ Γ£ô tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 4. GET & PUT /api/notifications/preferences > GET returns default preferences without creating DB row (Decision #54) 13ms
+ Γ£ô tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 4. GET & PUT /api/notifications/preferences > PUT validates and updates preferences for req.user.id 23ms
+ Γ£ô tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 5. Decision #54 Hardening (NO WRITES ON GET) > GET /api/notifications does not mutate any database state 13ms
+ Γ£ô tests/notificationCenter.test.ts > Milestone 13.1 Notification Center & Preferences Integration Tests > 6. Decision #55 Hardening (FAIL CLOSED ON DB ERROR) > rolls back and leaves state intact when mid-transaction or update errors occur 9ms
+ Γ£ô tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 1. Idempotency & Outbox Enqueue Invariants > enqueues outbox reminder for member with unsubmitted picks and deduplicates subsequent runs 103ms
+ Γ£ô tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 2. User Notification Preferences Enforcement > skips users who have opted out of email / pick reminders (generates 0 outbox events) 2ms
+ Γ£ô tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 2. User Notification Preferences Enforcement > skips members who have already submitted picks for all upcoming games in the window 19ms
+ Γ£ô tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 3. Injectable Clock Time-Window Boundary Testing > moving clock forward cleanly transitions games in and out of windows without real-time delay 27ms
+ Γ£ô tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects unauthenticated requests to POST /api/admin/ops/scan-reminders with 401 75ms
+ Γ£ô tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects standard users from triggering reminder scan with 403 (Decision #20) 11ms
+ Γ£ô tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > rejects pool commissioners who lack global ADMIN role with 403 (Decision #20) 5ms
+ Γ£ô tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > allows global ADMIN to trigger reminder scan via POST with 200 29ms
+ Γ£ô tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 4. Tier Separation & System Route Access Guards (Decision #20 & #54) > Decision #54 & Invariant: GET /api/admin/ops/scan-reminders/status is strictly read-only 16ms
+ Γ£ô tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > aborts and fails closed when database client is unconfigured or throws 3ms
+ Γ£ô tests/reminderScanner.test.ts > Milestone 12.1-E: Automated Reminder Scanner Engine Tests > 5. Fail-Closed Resilience (Decision #55) > withJobRun tracks failure and returns FAILED status upon unexpected error 6ms
+ Γ£ô tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > returns 401 when unauthenticated 50ms
+ Γ£ô tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > returns inbox messages for authenticated user in descending order (Decision #54 compliant) 156ms
+ Γ£ô tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 1. GET /api/me/inbox > supports unreadOnly filter and poolId filter 21ms
+ Γ£ô tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 2. POST /api/me/inbox/:id/read > returns 401 when unauthenticated 6ms
+ Γ£ô tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 2. POST /api/me/inbox/:id/read > returns 404 when message belongs to another user (ownership isolation) 14ms
+ Γ£ô tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 2. POST /api/me/inbox/:id/read > marks single message read successfully and is idempotent 17ms
+ Γ£ô tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 3. POST /api/me/inbox/read-all > returns 401 when unauthenticated 3ms
+ Γ£ô tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 3. POST /api/me/inbox/read-all > marks all unread messages for the user as read 42ms
+ Γ£ô tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > returns 401 when unauthenticated 6ms
+ Γ£ô tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > returns default preferences on GET before upsert without mutating DB (Decision #54) 9ms
+ Γ£ô tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > rejects invalid reminderOffsetsHours payloads with 400 13ms
+ Γ£ô tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 4. Notification Preferences: GET & PUT /api/me/notification-prefs > updates valid preferences successfully 15ms
+ Γ£ô tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > GET /api/notifications/unsubscribe validates token without modifying DB (Decision #54) 6ms
+ Γ£ô tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > GET /api/notifications/unsubscribe returns 400 on malformed token and 404 on unknown token 4ms
+ Γ£ô tests/me_routes.test.ts > Step C: /api/me & /api/notifications Routes Tests > 5. Token-based Unsubscribe Flow > POST /api/notifications/unsubscribe disables email without deleting row 8ms
+ Γ£ô tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > strips database URLs, API keys, passwords, tokens and truncates to 200 chars 190ms
+ Γ£ô tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > preserves key names for passwords and tokens while redacting values 8ms
+ Γ£ô tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > scrubs ECONNREFUSED host:port patterns 6ms
+ Γ£ô tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > handles extremely long error messages by truncating to 200 chars 6ms
+ Γ£ô tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Console Mail Transport > appends formatted json logs to outbox-dev.log 10ms
+ Γ£ô tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > SMTP Mail Transport & Timeouts > throws error on construction if MAIL_TRANSPORT=smtp and SMTP_FROM is missing 8ms
+ Γ£ô tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > SMTP Mail Transport & Timeouts > fake hanging SMTP transporter times out and maps to error failure 6ms
+ Γ£ô tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > HTML Escaping & Message-ID SHA256 > HTML escaping verification for interpolated markup in pool names and fields 5ms
+ Γ£ô tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > HTML Escaping & Message-ID SHA256 > Message-ID SHA256 stability across executions 5ms
+ Γ£ô tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > drains pending outbox event, sets status SENT and records sentAt 38ms
+ Γ£ô tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > sets status SUPPRESSED when user email preference is disabled 22ms
+ Γ£ô tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > applies discrete backoff schedule on transport failure 24ms
+ Γ£ô tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > transitions to DEAD on 5th failure 16ms
+ Γ£ô tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > Event repeatedly crashing during worker processing increments attempts to 5 and transitions to DEAD 12ms
+ Γ£ô tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > Two concurrent workers with slow fake transport never duplicate sends (conditional renewal test) 171ms
+ Γ£ô tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > creates JobRun with RUNNING and transitions to OK with itemsProcessed 33ms
+ Γ£ô tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > records FAILED status and scrubbed errorCode when job execution throws 11ms
+ Γ£ô tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > transitions to PARTIAL status when succeeded > 0 and failed + dead > 0 11ms
+ Γ£ô tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > database write failure does not fail or abort the underlying job execution 15ms
+ Γ£ô tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > runOutboxDrain integrates with withJobRun 11ms
+ Γ£ô tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects non-commissioner pool members with 403 Forbidden 113ms
+ Γ£ô tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects global ADMIN users who are not pool commissioners (Decision #20 zero bypass) 10ms
+ Γ£ô tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 1. Route Isolation & Decision #20 Verification > rejects commissioners of different pools with 403 Forbidden 9ms
+ Γ£ô tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > allows valid pool commissioner to create an override proposal 25ms
+ Γ£ô tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > applies a commissioner pick override inside a serializable transaction 31ms
+ Γ£ô tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 2. Commissioner Proposal Creation & Resolution > applies a commissioner penalty override with decimal ledger tracking 32ms
+ Γ£ô tests/overrides.test.ts > Milestone 12.2: Pool Commissioner Proposals & Overrides Service > 3. Read-Only GET Proposal Query (Decision #54) > GET /api/pools/:pool_id/proposals returns history and produces zero side effects 15ms
+ Γ£ô tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts RLS is ENABLED (relrowsecurity=true) and relforcerowsecurity=false on all application public tables 71ms
+ Γ£ô tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts anon role is denied SELECT (SQLSTATE 42501) across all public tables 202ms
+ Γ£ô tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts authenticated role is denied SELECT (SQLSTATE 42501) across all public tables 136ms
+ Γ£ô tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b: asserts anon role is denied UPDATE on penalty_ledger with SQLSTATE 42501 (privilege proof) 21ms
+ Γ£ô tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2c: asserts has_function_privilege returns false for anon and authenticated on BR-1 trigger functions 17ms
+ Γ£ô tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: asserts trigger and function definitions match requirements (BEFORE ROW/STATEMENT, plpgsql, prosecdef=false, unconditional RAISE) 12ms
+ Γ£ô tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: UPDATE (including no-op update) is blocked with count >= 1 and SQLSTATE P0001 23ms
+ Γ£ô tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: DELETE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001 6ms
+ Γ£ô tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: TRUNCATE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001 6ms
+ Γ£ô tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: membership-row DELETE cascades to penalty_ledger and is intercepted by trigger with P0001 12ms
+ Γ£ô tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: DELETE FROM pools fixture asserts exact foreign key constraint pool_memberships_pool_id_fkey and SQLSTATE 23503 4ms
+ Γ£ô tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > both rows created 122ms
+ Γ£ô tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > duplicate enqueue creates no second outbox OR inbox row 30ms
+ Γ£ô tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > caller transaction that throws after enqueue leaves zero rows in both tables 39ms
+ Γ£ô tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > IN_APP-only writes no outbox row 15ms
+ Γ£ô tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > EMAIL-only writes no inbox row 18ms
+ Γ£ô tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > disallowed payload key is stripped 23ms
+ Γ£ô tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > reminder payload keys are exactly poolName, windowLabel, lockAtUtc, deepLink 7ms
+ Γ£ô tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > rejects non-transaction client or root prisma instance 15ms
+ Γ£ô tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > skips EMAIL channel if emailEnabled is false in NotificationPreference 34ms
+ Γ£ô tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > static test fails if the module imports nodemailer, net, http(s) or fetch 16ms
+ Γ£ô tests/br4b.test.ts > BR-4b: Fail-Closed Claim Store Invariant (Decision #52) > Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed 78ms
+ Γ£ô tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 when Authorization header is absent 4ms
+ Γ£ô tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 when Authorization header does not start with Bearer 1ms
+ Γ£ô tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 for an invalid / expired token 3ms
+ Γ£ô tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > decodes valid JWT and attaches user to req.user, then calls next() 12ms
+ Γ£ô tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > returns 401 if req.user is undefined 1ms
+ Γ£ô tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > returns 403 if req.user is not ADMIN 1ms
+ Γ£ô tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > calls next() if user is ADMIN 1ms
+ Γ£ô tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 401 if req.user is missing 4ms
+ Γ£ô tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 400 for a malformed non-UUID pool_id 3ms
+ Γ£ô tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 404 when the pool does not exist in DB 1ms
+ Γ£ô tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 403 when user is neither commissioner nor member 1ms
+ Γ£ô tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > Decision #20 & R-12.2-W: global ADMIN who is not the pool commissioner -> 403, no req.pool, zero side effects 1ms
+ Γ£ô tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > calls next() and attaches pool when user is the pool commissioner 1ms
+ Γ£ô tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > from: query - extracts pool_id from query params and authorizes commissioner 1ms
+ Γ£ô tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > from: query - returns 400 when pool_id query parameter is missing 1ms
+ Γ£ô tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > from: body - extracts pool_id from request body and authorizes commissioner 1ms
+ Γ£ô tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > from: body - returns 400 when pool_id body parameter is missing 0ms
+ Γ£ô tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolMember > returns 403 if user is not a member and not the commissioner 0ms
+ Γ£ô tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolMember > Decision #20 & R-12.2-W: global ADMIN who is not a member and not commissioner -> 403, no req.pool 0ms
+ Γ£ô tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolMember > calls next() when user is active pool member 0ms
+ Γ£ô tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolMember > calls next() when user is the pool commissioner (even without explicit membership row) 1ms
+ Γ£ô tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Rolling lock: enforces lock per-game at kickoff boundary 3ms
+ Γ£ô tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Rolling lock with offset: enforces lock at (kickoff - offset) 1ms
+ Γ£ô tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Global lock vs Rolling lock: handles first game vs later games 0ms
+ Γ£ô tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Excluded windows: correctly identifies TNF, MNF, Sunday Early/Late, SNF 2ms
+ Γ£ô tests/characterization.test.ts > BR-4 splitPenalty Math Characterization > Worked matrix: confirms exact zero-diff decimal split amounts 5ms
+ Γ£ô tests/characterization.test.ts > BR-4b Set-Equality: Wrap-Up vs Scoring Resolver > Asserts 100% game ID set equality between wrap-up and scoring resolvers 2ms
+ Γ£ô tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 1. Kickoff Future vs Past (Standard 0 Offset) > returns false (unlocked) when kickoff is in the future 5ms
+ Γ£ô tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 1. Kickoff Future vs Past (Standard 0 Offset) > returns true (locked) when kickoff is in the past 1ms
+ Γ£ô tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 1. Kickoff Future vs Past (Standard 0 Offset) > returns true (locked) at exact kickoff boundary (now === kickoff) 1ms
+ Γ£ô tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 2. Pool-Specific Lock Offsets > locks early when positive offset is configured (e.g., 60 minutes before kickoff) 1ms
+ Γ£ô tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 2. Pool-Specific Lock Offsets > supports negative offsets (e.g., locking 15 minutes after kickoff) 0ms
+ Γ£ô tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > fails closed (returns true / throws) when kickoffTime is null or undefined 1ms
+ Γ£ô tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > fails closed when kickoffTime is an invalid date string 1ms
+ Γ£ô tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 3. Fail-Closed Edge Cases (Null, Undefined, Invalid) > handles null, undefined, or NaN offset by defaulting to 0 offset 1ms
+ Γ£ô tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 4. computeGameLockStatus > returns full lock metadata correctly for unlocked game 2ms
+ Γ£ô tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 4. computeGameLockStatus > returns full lock metadata correctly for locked game 1ms
+ Γ£ô tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 4. computeGameLockStatus > returns safe fallback on missing kickoffTime 0ms
+ Γ£ô tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 5. isGameInExcludedWindow > returns false if no excluded windows are passed or list is empty 1ms
+ Γ£ô tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 5. isGameInExcludedWindow > identifies Thursday Night Football correctly 2ms
+ Γ£ô tests/lock_resolver.characterization.test.ts > Step D: Lock Resolver Characterization & Pure Invariants > 5. isGameInExcludedWindow > identifies Monday Night Football correctly 0ms
+ Γ£ô tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > allows valid local disposable database URLs 5ms
+ Γ£ô tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects remote / hosted database URLs (Supabase, AWS, Neon, etc.) 1ms
+ Γ£ô tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > Decision #32 Sabotage Test: point TEST_DATABASE_URL at production fingerprint -> aborts before connection 1ms
+ Γ£ô tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects URLs using ?schema= parameter to bypass host isolation 1ms
+ Γ£ô tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects non-disposable production database names on localhost 1ms
+ Γ£ô tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > sabotage test: throws when TEST_DATABASE_URL is empty string or undefined 1ms
+
+ Test Files  22 passed (22)
+      Tests  230 passed (230)
+   Start at  11:59:33
+   Duration  27.54s (tests 46%, import 38%, setup 8%, transform 7%, worker 1%)
+
+     Import  55 modules were evaluated 369 times ┬╖ 7.98s total, 38% of tracked time
+             ~6.79s faster with isolate: false ΓÇö shared modules are evaluated once per worker instead of once per file
+             learn more: https://vitest.dev/guide/improving-performance#test-isolation
+
+
+(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
+  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
+Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
+stderr | tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 3. Decision #27: Authoritative Slate & Game Finality Verification > fails closed when proposal targets an unfinalized slate or game
+Error executing proposal: Error: DECISION_27_FAIL_CLOSED: Target slate or game is unfinalized.
+    at executeProposal (C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/src/services/overrideService.ts:207:11)
+    at C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/src/routes/ops.ts:298:20
+
+stderr | tests/commissionerDashboard.test.ts > Milestone 13.2 Commissioner Dashboard & Governance Integration Tests > 5. Decision #55: Transaction Fail-Closed Rollback > aborts and rolls back entire state on execution error
+Error executing proposal: Error: userId and gameId are required for PICK override
+    at db.$transaction.isolationLevel (C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/src/services/overrideService.ts:232:17)
+    at Proxy._transactionWithCallback (C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\node_modules\@prisma\client\runtime\library.js:130:8006)
+    at executeProposal (C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/src/services/overrideService.ts:219:10)
+    at C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/src/routes/ops.ts:298:20
+
+stderr | tests/adminOpsPanel.test.ts > Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests > 4. Fail-Closed Error Handling (Decision #55) > fails closed and returns 500 if database telemetry query encounters an error
+Error fetching consolidated system health: Error: DATABASE_OFFLINE_FAIL_CLOSED
+    at C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/adminOpsPanel.test.ts:348:9
+    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:1628:35
+    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:2783:26
+    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3319:20
+    at new Promise (<anonymous>)
+    at runWithCancel (file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3314:10)
+    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3299:20
+    at new Promise (<anonymous>)
+    at runWithTimeout (file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3257:10)
+    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3876:64
+
+stderr | tests/webhooks.test.ts > Milestone 12.3: Webhook Ingress Gateway & Signature Verification > 4. Decision #55 Fail-Closed Database Fault Tolerance > returns 500 when database transaction fails during webhook ingestion, refusing receipt acknowledgement
+Webhook ingestion error (failing closed): Error: PostgreSQL connection dropped unexpectedly
+    at C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/webhooks.test.ts:249:62
+    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:1628:35
+    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:2783:26
+    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3319:20
+    at new Promise (<anonymous>)
+    at runWithCancel (file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3314:10)
+    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3299:20
+    at new Promise (<anonymous>)
+    at runWithTimeout (file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3257:10)
+    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3876:64
+
+stderr | tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > database write failure does not fail or abort the underlying job execution
+[withJobRun] Failed to create JobRun record for resilient_job: Error: DB Connection Lost
+    at C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/outbox_drain.test.ts:458:63
+    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:1628:35
+    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:2783:26
+    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3319:20
+    at new Promise (<anonymous>)
+    at runWithCancel (file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3314:10)
+    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3299:20
+    at new Promise (<anonymous>)
+    at runWithTimeout (file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3257:10)
+    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3876:64
+
+stderr | tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > disallowed payload key is stripped
+[notifications] Stripped unregistered payload key 'unauthorizedField' for notification type 'REMINDER'
+[notifications] Stripped unregistered payload key 'extraBogusData' for notification type 'REMINDER'
+```
+
+---
+
+## 8. Section 7: Outbox Idempotency Key Contract & Targeted Verification
+
+### 8.1 Outbox Idempotency Enqueue Implementation
+```typescript
+N/A
+```
+
+### 8.2 Targeted Outbox Drain & Idempotency Test Output (`tests/outbox_drain.test.ts`)
+- **Exit Code:** 0 (Expected: 0)
+- **Raw Test Output:**
+```
+RUN  v5.0.2 C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em
+
+ Γ£ô tests/outbox_drain.test.ts (20 tests) 415ms
+
+ Test Files  1 passed (1)
+      Tests  20 passed (20)
+   Start at  12:00:04
+   Duration  1.11s (tests 49%, transform 22%, import 20%, setup 9%, worker 1%)
+
+
+(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
+  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
+Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
+stderr | tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > database write failure does not fail or abort the underlying job execution
+[withJobRun] Failed to create JobRun record for resilient_job: Error: DB Connection Lost
+    at C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/outbox_drain.test.ts:458:63
+    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:1628:35
+    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:2783:26
+    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3319:20
+    at new Promise (<anonymous>)
+    at runWithCancel (file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3314:10)
+    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3299:20
+    at new Promise (<anonymous>)
+    at runWithTimeout (file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3257:10)
+    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3876:64
+```
+
+---
+
+## 9. Section 8: Shared Table Schema Verification (Zero Feature Creep)
+
+### 9.1 `PenaltyLedger` Model Definition
+```prisma
+model PenaltyLedger {
+  id          String        @id @default(uuid()) @db.Uuid
+  poolId      String        @map("pool_id") @db.Uuid
+  userId      String        @map("user_id") @db.Uuid
+  weekNumber  Int?          @map("week_number")
+  delta       Decimal       @map("delta") @db.Decimal(5, 2)
+  reason      String
+  createdById String        @map("created_by") @db.Uuid
+  createdAt   DateTime      @default(now()) @map("created_at")
+
+  pool       Pool           @relation(fields: [poolId], references: [id], onDelete: Cascade)
+  membership PoolMembership @relation(fields: [poolId, userId], references: [poolId, userId], onDelete: Cascade)
+  createdBy  User           @relation("CreatedPenalties", fields: [createdById], references: [id])
+  media      PenaltyMedia?
+
+  @@index([poolId, userId])
+  @@map("penalty_ledger")
+}
+```
+
+### 9.2 `NotificationPreference` Model Definition
+```prisma
+model NotificationPreference {
+  userId               String   @id @map("user_id") @db.Uuid
+  emailEnabled         Boolean  @default(true) @map("email_enabled")
+  reminderOffsetsHours Int[]    @default([24, 2]) @map("reminder_offsets_hours")
+  unsubscribeToken     String   @unique @default(uuid()) @map("unsubscribe_token")
+  updatedAt            DateTime @updatedAt @map("updated_at") @db.Timestamp(3)
+
+  user User @relation(fields: [userId], references: [id], onDelete: Restrict, onUpdate: Restrict)
+
+  @@map("notification_preferences")
+}
+```
+
+---
+
+## 10. Section 9: LIVE REPOSITORY CONTEXT
+
+### 10.1 Prisma Schema (`prisma/schema.prisma`)
+```prisma
+datasource db {
+  provider = "postgresql"
+  url      = env("DATABASE_URL")
+}
+
+generator client {
+  provider = "prisma-client-js"
+}
+
+enum Role {
+  ADMIN
+  USER
+}
+
+enum Status {
+  ACTIVE
+  INACTIVE
+}
+
+enum GameStatus {
+  SCHEDULED
+  IN_PROGRESS
+  FINAL
+}
+
+enum PenaltyMediaStatus {
+  PENDING
+  CONFIRMED
+  REJECTED
+}
+
+model User {
+  id                     String                  @id @default(uuid()) @db.Uuid
+  email                  String                  @unique
+  passwordHash           String                  @map("password_hash")
+  role                   Role                    @default(USER)
+  createdAt              DateTime                @default(now()) @map("created_at")
+  pools                  Pool[]                  @relation("AdministeredPools")
+  memberships            PoolMembership[]
+  picks                  Pick[]                  @relation("UserPicks")
+  submittedPicks         Pick[]                  @relation("SubmittedPicks")
+  auditLogs              AuditLog[]              @relation("UserAuditLogs")
+  createdPenalties       PenaltyLedger[]         @relation("CreatedPenalties")
+  weeklySubmissions      WeeklySubmission[]
+  penaltyMedia           PenaltyMedia[]          @relation("UserPenaltyMedia")
+  confirmedMedia         PenaltyMedia[]          @relation("ConfirmedPenaltyMedia")
+  inboxMessages          InboxMessage[]
+  outboxEventsReceived   OutboxEvent[]           @relation("OutboxEventRecipient")
+  outboxEventsRetried    OutboxEvent[]           @relation("OutboxEventRetrier")
+  notificationPreference NotificationPreference?
+
+  @@map("users")
+}
+
+model Pool {
+  id                String             @id @default(uuid()) @db.Uuid
+  name              String
+  adminId           String             @map("admin_id") @db.Uuid
+  admin             User               @relation("AdministeredPools", fields: [adminId], references: [id])
+  settings          Json
+  status            Status             @default(ACTIVE)
+  memberships       PoolMembership[]
+  picks             Pick[]
+  memberStats       PoolMemberStat[]
+  penaltyLedger     PenaltyLedger[]
+  weeklySubmissions WeeklySubmission[]
+  penaltyMedia      PenaltyMedia[]
+  inboxMessages     InboxMessage[]
+  outboxEvents      OutboxEvent[]
+
+  @@map("pools")
+}
+
+model PoolMembership {
+  poolId String @map("pool_id") @db.Uuid
+  userId String @map("user_id") @db.Uuid
+  status Status @default(ACTIVE)
+
+  pool Pool @relation(fields: [poolId], references: [id])
+  user User @relation(fields: [userId], references: [id])
+
+  stat              PoolMemberStat?
+  penaltyLedger     PenaltyLedger[]
+  weeklySubmissions WeeklySubmission[]
+
+  @@id([poolId, userId])
+  @@map("pool_memberships")
+}
+
+model Game {
+  id                String     @id @default(uuid()) @db.Uuid
+  externalGameId    String     @unique @map("external_game_id")
+  homeTeamId        String     @map("home_team_id")
+  awayTeamId        String     @map("away_team_id")
+  kickoffTime       DateTime   @map("kickoff_time")
+  status            GameStatus @default(SCHEDULED)
+  homeScore         Int?       @map("home_score")
+  awayScore         Int?       @map("away_score")
+  commissionerNotes String?    @map("commissioner_notes")
+  picks             Pick[]
+
+  @@map("games")
+}
+
+model Pick {
+  id             String      @id @default(uuid()) @db.Uuid
+  poolId         String      @map("pool_id") @db.Uuid
+  userId         String      @map("user_id") @db.Uuid
+  gameId         String      @map("game_id") @db.Uuid
+  selectedTeamId String?     @map("selected_team_id")
+  submittedById  String      @map("submitted_by") @db.Uuid
+  createdAt      DateTime    @default(now()) @map("created_at")
+
+  pool        Pool        @relation(fields: [poolId], references: [id])
+  user        User        @relation("UserPicks", fields: [userId], references: [id])
+  game        Game        @relation(fields: [gameId], references: [id])
+  submittedBy User        @relation("SubmittedPicks", fields: [submittedById], references: [id])
+  result      PickResult?
+
+  @@unique([poolId, userId, gameId])
+  @@map("picks")
+}
+
+model PickResult {
+  pickId        String   @id @map("pick_id") @db.Uuid
+  isCorrect     Boolean  @map("is_correct")
+  pointsAwarded Decimal  @map("points_awarded") @db.Decimal(5, 2)
+  finalizedAt   DateTime @default(now()) @map("finalized_at")
+
+  pick Pick @relation(fields: [pickId], references: [id], onDelete: Cascade)
+
+  @@map("pick_results")
+}
+
+model AuditLog {
+  id             String   @id @default(uuid()) @db.Uuid
+  actorId        String   @map("actor_id") @db.Uuid
+  action         String
+  targetEntityId String   @map("target_entity_id")
+  oldValue       Json?    @map("old_value")
+  newValue       Json?    @map("new_value")
+  timestamp      DateTime @default(now())
+
+  actor User @relation("UserAuditLogs", fields: [actorId], references: [id])
+
+  @@map("audit_logs")
+}
+
+model PoolMemberStat {
+  poolId             String   @map("pool_id") @db.Uuid
+  userId             String   @map("user_id") @db.Uuid
+  totalShotsDrank    Decimal  @default(0.00) @map("total_shots_drank") @db.Decimal(5, 2)
+  firstPlaceFinishes Int      @default(0) @map("first_place_finishes")
+  deadPlaceFinishes  Int      @default(0) @map("dead_place_finishes")
+  updatedAt          DateTime @default(now()) @updatedAt @map("updated_at")
+
+  pool       Pool           @relation(fields: [poolId], references: [id], onDelete: Cascade)
+  membership PoolMembership @relation(fields: [poolId, userId], references: [poolId, userId], onDelete: Cascade)
+
+  @@id([poolId, userId])
+  @@map("pool_member_stats")
+}
+
+model PenaltyLedger {
+  id          String        @id @default(uuid()) @db.Uuid
+  poolId      String        @map("pool_id") @db.Uuid
+  userId      String        @map("user_id") @db.Uuid
+  weekNumber  Int?          @map("week_number")
+  delta       Decimal       @map("delta") @db.Decimal(5, 2)
+  reason      String
+  createdById String        @map("created_by") @db.Uuid
+  createdAt   DateTime      @default(now()) @map("created_at")
+
+  pool       Pool           @relation(fields: [poolId], references: [id], onDelete: Cascade)
+  membership PoolMembership @relation(fields: [poolId, userId], references: [poolId, userId], onDelete: Cascade)
+  createdBy  User           @relation("CreatedPenalties", fields: [createdById], references: [id])
+  media      PenaltyMedia?
+
+  @@index([poolId, userId])
+  @@map("penalty_ledger")
+}
+
+model WeeklySubmission {
+  id                   String   @id @default(uuid()) @db.Uuid
+  poolId               String   @map("pool_id") @db.Uuid
+  userId               String   @map("user_id") @db.Uuid
+  weekNumber           Int      @map("week_number")
+  tieBreakerPrediction Decimal? @map("tie_breaker_prediction") @db.Decimal(5, 2)
+  isFinalized          Boolean  @default(false) @map("is_finalized")
+  createdAt            DateTime @default(now()) @map("created_at")
+  updatedAt            DateTime @default(now()) @updatedAt @map("updated_at")
+
+  pool       Pool           @relation(fields: [poolId], references: [id], onDelete: Cascade)
+  membership PoolMembership @relation(fields: [poolId, userId], references: [poolId, userId], onDelete: Cascade)
+  user       User           @relation(fields: [userId], references: [id], onDelete: Cascade)
+
+  @@unique([poolId, userId, weekNumber])
+  @@index([poolId, weekNumber, isFinalized])
+  @@map("weekly_submissions")
+}
+
+model PenaltyMedia {
+  id          String             @id @default(uuid()) @db.Uuid
+  penaltyId   String             @unique @map("penalty_id") @db.Uuid
+  poolId      String             @map("pool_id") @db.Uuid
+  userId      String             @map("user_id") @db.Uuid
+  storagePath String             @map("storage_path")
+  mediaType   String             @map("media_type")
+  status      PenaltyMediaStatus @default(PENDING)
+  confirmedBy String?            @map("confirmed_by") @db.Uuid
+  createdAt   DateTime           @default(now()) @map("created_at")
+
+  penalty   PenaltyLedger @relation(fields: [penaltyId], references: [id], onDelete: Cascade)
+  pool      Pool          @relation(fields: [poolId], references: [id], onDelete: Cascade)
+  user      User          @relation("UserPenaltyMedia", fields: [userId], references: [id], onDelete: Cascade)
+  confirmer User?         @relation("ConfirmedPenaltyMedia", fields: [confirmedBy], references: [id])
+
+  @@index([poolId, userId])
+  @@map("penalty_media")
+}
+
+enum OutboxStatus {
+  PENDING
+  PROCESSING
+  SENT
+  FAILED
+  DEAD
+  SUPPRESSED
+}
+
+enum JobStatus {
+  RUNNING
+  OK
+  PARTIAL
+  FAILED
+}
+
+model InboxMessage {
+  id        String    @id @default(uuid()) @db.Uuid
+  poolId    String    @map("pool_id") @db.Uuid
+  userId    String    @map("user_id") @db.Uuid
+  type      String
+  payload   Json
+  dedupeKey String    @map("dedupe_key")
+  readAt    DateTime? @map("read_at") @db.Timestamp(3)
+  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamp(3)
+
+  pool Pool @relation(fields: [poolId], references: [id], onDelete: Restrict, onUpdate: Restrict)
+  user User @relation(fields: [userId], references: [id], onDelete: Restrict, onUpdate: Restrict)
+
+  @@unique([userId, dedupeKey])
+  @@index([userId, readAt, createdAt])
+  @@map("inbox_messages")
+}
+
+model OutboxEvent {
+  id              String       @id @default(uuid()) @db.Uuid
+  poolId          String       @map("pool_id") @db.Uuid
+  recipientUserId String       @map("recipient_user_id") @db.Uuid
+  type            String
+  payload         Json
+  dedupeKey       String       @unique @map("dedupe_key")
+  status          OutboxStatus @default(PENDING)
+  attempts        Int          @default(0)
+  nextAttemptAt   DateTime     @default(now()) @map("next_attempt_at") @db.Timestamp(3)
+  leaseExpiresAt  DateTime?    @map("lease_expires_at") @db.Timestamp(3)
+  lastErrorCode   String?      @map("last_error_code")
+  sentAt          DateTime?    @map("sent_at") @db.Timestamp(3)
+  retriedBy       String?      @map("retried_by") @db.Uuid
+  retriedAt       DateTime?    @map("retried_at") @db.Timestamp(3)
+  createdAt       DateTime     @default(now()) @map("created_at") @db.Timestamp(3)
+
+  pool      Pool  @relation(fields: [poolId], references: [id], onDelete: Restrict, onUpdate: Restrict)
+  recipient User  @relation("OutboxEventRecipient", fields: [recipientUserId], references: [id], onDelete: Restrict, onUpdate: Restrict)
+  retrier   User? @relation("OutboxEventRetrier", fields: [retriedBy], references: [id], onDelete: Restrict, onUpdate: Restrict)
+
+  @@index([status, nextAttemptAt])
+  @@map("outbox_events")
+}
+
+model NotificationPreference {
+  userId               String   @id @map("user_id") @db.Uuid
+  emailEnabled         Boolean  @default(true) @map("email_enabled")
+  reminderOffsetsHours Int[]    @default([24, 2]) @map("reminder_offsets_hours")
+  unsubscribeToken     String   @unique @default(uuid()) @map("unsubscribe_token")
+  updatedAt            DateTime @updatedAt @map("updated_at") @db.Timestamp(3)
+
+  user User @relation(fields: [userId], references: [id], onDelete: Restrict, onUpdate: Restrict)
+
+  @@map("notification_preferences")
+}
+
+model JobRun {
+  id             String    @id @default(uuid()) @db.Uuid
+  jobName        String    @map("job_name")
+  status         JobStatus
+  startedAt      DateTime  @default(now()) @map("started_at") @db.Timestamp(3)
+  finishedAt     DateTime? @map("finished_at") @db.Timestamp(3)
+  itemsProcessed Int       @default(0) @map("items_processed")
+  errorCode      String?   @map("error_code")
+  meta           Json?
+
+  @@index([jobName, startedAt])
+  @@map("job_runs")
+}
+```
+
+### 10.2 Authoritative Decision Register Appendix A (`docs/rulings/appendix-a.md`)
+```markdown
+1 Points are derived; penalties are ledger entries.
+2 Provider corrections are proposals; auto-apply only when no outcome changes.
+3 Manual overrides beat sync; divergence is flagged.
+4 Locks derive from the stored kickoff time only.
+5 Inbox is the source of truth; email is best-effort.
+6 Aggregates are never stored in numeric columns.
+7 Pick-on-behalf is write-only.
+8 History reads sealed snapshots only.
+9 Ledger entry_type is additive and parallel to reason; backfill by column default, never UPDATE.
+10 Physical schema names govern; logical names in handoffs are documentation.
+11 DB-enforced invariants are verified against the catalog, never assumed.
+12 Typed ledger writes serialize per (pool_id, user_id).
+13 Ledger-bearing pools and memberships are never hard-deleted.
+14 Season is Pool; routes use /api/pools/:pool_id.
+15 New tables and functions are deny-by-default to Data API roles.
+16 Money input goes through one strict parser; never parseInt/parseFloat/Number.
+17 Every evidence report states host class, database, user and server version.
+18 Destructive work runs only on a disposable database; hosted gets migrate deploy only.
+19 Legacy ASSESSMENT rows may be signed; typed rows are positive.
+20 Per-pool authority derives from pools.admin_id; no global-role override.
+21 Authorization defect fixes are code-only and precede new commissioner endpoints.
+22 Money splitting is Decimal-only with characterization first; no zero-delta rows.
+23 Every invariant carries an evidence status.
+24 Period-close jobs are idempotent via a DB-enforced claim in the same transaction.
+25 Acceptance tests assert behavior (SQLSTATE, row state), never message text.
+26 Read routes are guarded like write routes; guards change access, never payloads.
+27 Period-close preconditions use authoritative state; empty sets fail closed; no bypass flag.
+28 VERIFIED requires numbers or raw output in the report body.
+29 Isolation is by database, never by schema; the guard has three independent checks.
+30 Raw evidence is unedited tool output; identifiers resolve; figures are consistent.
+31 Irreversible operations run only from committed scripts with machine-checked preconditions.
+32 The default environment is disposable; hosted credentials live in a separate file.
+33 Docs are append-only, enforced by CI against a tagged baseline.
+34 Every acceptance criterion maps to a named test or evidence item.
+35 Tests never create or alter schema; databases reset via a guarded script.
+36 A migration stays off the deployable branch until its hosted gate clears.
+37 Evidence is produced by one committed script; empty sections fail; UTF-8 via spawn.
+38 Trigger proofs run as a privileged role; privilege proofs as anon/authenticated.
+39 Evidence and CI scripts measure inputs independently and ship with a negative control.
+40 Every evidence run stamps commit, branch and time; identical output counts as not run.
+41 A matrix row may cite only tests present in the committed JSON artifact.
+42 Schema evidence comes from real pg_dump including ACLs, bodies and indexes.
+43 Every ordered criterion appears in the matrix as PASS, FAIL or NOT VERIFIED.
+44 Only a human runs or approves hosted changes; authorizations are typed in the conversation.
+45 Rollbacks are generated from a pre-state snapshot and proven by hash equality.
+46 External exposure is measured identically before and after a change.
+47 Machine-checkable gates are decided by script exit codes.
+48 Applied migrations are immutable; CI compares checksums.
+49 Authorization scans cover every source of an identifier (path, query, body, headers).
+50 Each test run begins with reset, migrate deploy and generate, and prints a header.
+51 Tests are never deleted or weakened in non-test commits; controls run in a separate worktree.
+52 Code depending on a schema object ships with its migration or fails closed.
+53 Agents never push, force-push or change remotes.
+54 GET handlers perform no writes.
+55 A guard is never bypassed by a conditional when its dependency is missing.
+56 Rulings are stored verbatim under docs/rulings/. The Decision Register in ARCHITECTURE.md is a byte-for-byte copy of docs/rulings/appendix-a.md, and CI diffs the two.
+57 Every table written by a re-running job carries a database-enforced dedupe key.
+58 Outbound payload sanitization is default-deny against an explicit per-type registry.
+59 Outbox drain workers claim via FOR UPDATE SKIP LOCKED with explicit lease timeouts and discrete backoff.
+60 Every claim of a leased job item counts as an attempt; the lease is verified before each send and when the result is recorded.
+61 Core tables hold no foreign keys to feature tables, and feature tables hold none to other features; core code and scoring do not import feature modules; shared tables (penalty_ledger, notification_preferences, outbox_events, inbox_messages, job_runs) receive no feature columns; feature metadata lives in prefixed side tables keyed downward.
+62 Every feature binds to a registry key, default OFF; a missing row or flag-store failure evaluates to disabled; routes run authenticate, membership, flag, handler; disabled features return 404 to members; producers check the flag at enqueue; queued events for disabled features get an audit-visible terminal disposition that records the reason and is distinguishable from preference opt-out, are never silently deleted, and are not replayed on re-enable without a ruling.
+63 Disable, retire and purge are distinct; purge is hosted DDL needing an authorization ruling, drops tables explicitly and never uses CASCADE; scoring-affecting features change only forward-only at a week boundary.
+64 Feature tables use the public schema with f_<feature>_ prefixes and platform tables use p_; multi-schema is not used in Phases 14-16, and this does not alter Decision 29 (environment isolation by database); every prefixed table is tripwire-covered.
+65 The six-state weekly slate graph is a derived monotonic projection recorded in an append-only idempotent p_ transition log; per-game locks remain the sole authority for pick acceptance and are irrevocable; FINALIZED is immutable and corrections are revisions; transitions run only in System-Tier workers using transaction-scoped locks, never on GET; user notifications fan out per recipient through the transaction-client producer path with a deterministic dedupe key under Decision 57.
+66 Pick visibility under hide_picks_until_kickoff derives from the per-game lock, never slate state; viewer identity is resolved server-side from membership; a cohort floor of 3 is a minimum, and snapshot differencing must be analyzed before any live aggregate feature ships.
+```

### Commit Details (git log --stat -1)

--- c09c365 ---
commit c09c365fcc6ec9eac7cc44b3ab2fbc672702a449
Author: jdubciii <jack.w.cone@gmail.com>
Date:   Sat Oct 3 11:27:25 2026 -0700

    docs: ingest Decisions #61-66 from R-14-INTAKE-01

 ARCHITECTURE.md            | 6 ++++++
 docs/rulings/appendix-a.md | 8 ++++++--
 2 files changed, 12 insertions(+), 2 deletions(-)

--- cccaac1 ---
commit cccaac1ea34704d4c3f26f906ce598c1b00b7660
Author: jdubciii <jack.w.cone@gmail.com>
Date:   Sat Oct 3 11:58:19 2026 -0700

    chore: update tripwire and db header for 15-table schema and rehearsal

 scripts/db_header.js           |  2 ++
 scripts/run_hosted_tripwire.js | 12 ++++++++----
 2 files changed, 10 insertions(+), 4 deletions(-)

--- 1d99324 ---
commit 1d993244265b76b4d49dac082af01ee0b8242446
Author: jdubciii <jack.w.cone@gmail.com>
Date:   Sat Oct 3 11:59:06 2026 -0700

    chore: prepare R-14-INTAKE-01 evidence baseline

 docs/evidence/R-14-INTAKE-01/EVIDENCE_BUNDLE.md | 1181 +++++++++++++++++++++++
 scripts/generate_evidence_r14_intake.js         |  292 ++++++
 2 files changed, 1473 insertions(+)

### NotificationBell.tsx Git History & Disposition
commit 14a34c83682d96574c65940d5ed88bed9fd0aff4
Author: jdubciii <jack.w.cone@gmail.com>
Date:   Fri Oct 2 20:10:50 2026 -0700

    feat(phase13-1): implement user notification center, read state management, and preference UI

 .../components/notifications/NotificationBell.tsx  | 60 ++++++++++++++++++++++
 1 file changed, 60 insertions(+)

### Branch Tracking Status (git branch -vv)
* docs/r14-intake-remediation           2a7eee2 docs: ingest Decision #68 and stage M14.1 baseline
  feat/phase12-1-outbox                 d3b7e8a docs: create binding container B_SHA for Section 9 verification bundle
  feat/phase12-1e-reminder-scanner      d77c219 docs: bind Section 9 verification bundle for Milestone 12.1-E
  feat/phase12-2-wrapup-engine          f728d1f docs: bind Section 9 verification bundle for Milestone 12.2
  feat/phase12-3-transports             dd41ad2 docs: bind Section 9 verification bundle for Milestone 12.3
  feat/phase12-4-retention-pruning      fd6868c docs: bind Section 9 verification bundle for Milestone 12.4
  feat/phase12-guard-e2e                e67ad25 docs(evidence): record R-12.2-X verification bundle, diffs, and test outputs
  feat/phase12-migrations               24e83dd test: B1 - concurrency stabilization
  feat/phase13-1-notification-center    910cbec docs: bind Section 9 verification bundle for Milestone 13.1
  feat/phase13-2-commissioner-dashboard 58b1e55 docs: bind Section 9 verification bundle for Milestone 13.2
  feat/phase13-3-admin-ops-panel        2ac0df6 docs: bind Section 9 verification bundle for Milestone 13.3
  feat/phase13-4-e2e-verification       11ec29f docs: bind Section 9 verification bundle for Milestone 13.4
  fix/br5b-admin-picks                  e8959ea [origin/fix/br5b-admin-picks: ahead 5, behind 3] docs: generate evidence bundle and append R-12.2-AD rulings
  main                                  f9f9308 [origin/main] docs: bind Section 9 verification bundle for Phase 13 final program closure
  release/br2                           d6251e8 docs(evidence): complete R-12.2-U post-execution report and safeguards test coverage (R-12.2-V)

## 2. Raw Ancestry & Remote Push Verification
git merge-base --is-ancestor f9f9308 HEAD -> Exit Code: 0 (CONFIRMED ANCESTOR)
git merge-base --is-ancestor 6c2fb46 HEAD -> Exit Code: 0 (CONFIRMED ANCESTOR)
git merge-base --is-ancestor 908f447 HEAD -> Exit Code: 1 (NOT ANCESTOR)
git merge-base --is-ancestor 0754c696 HEAD -> Exit Code: 0 (CONFIRMED ANCESTOR)
git merge-base --is-ancestor 8b2e4a8 HEAD -> Exit Code: 0 (CONFIRMED ANCESTOR)
git merge-base --is-ancestor 532becb HEAD -> Exit Code: 1 (NOT ANCESTOR)
git merge-base --is-ancestor 53305b7 HEAD -> Exit Code: 0 (CONFIRMED ANCESTOR)
git merge-base --is-ancestor 954265e HEAD -> Exit Code: 0 (CONFIRMED ANCESTOR)

### First-Parent Commit Log (from 6c2fb46 to HEAD)
2a7eee2 docs: ingest Decision #68 and stage M14.1 baseline
b2df31d docs: bind R-14-INTAKE-03 closing evidence supplement
f5459d5 docs: ingest Decision #67 from R-14-INTAKE-03 and prepare evidence compiler
1d99324 chore: prepare R-14-INTAKE-01 evidence baseline
cccaac1 chore: update tripwire and db header for 15-table schema and rehearsal
c09c365 docs: ingest Decisions #61-66 from R-14-INTAKE-01
f9f9308 docs: bind Section 9 verification bundle for Phase 13 final program closure
c98e2a3 feat(phase13-closure): generate comprehensive raw terminal evidence for Phase 13 closure
45eb5a7 Merge pull request #9 from jdubciii/feat/phase13-4-e2e-verification
2cf6b04 Merge pull request #8 from jdubciii/feat/phase13-3-admin-ops-panel
ac9996f Merge pull request #7 from jdubciii/feat/phase13-2-commissioner-dashboard
96f8a7d Merge pull request #6 from jdubciii/feat/phase13-1-notification-center
d01f47e Merge pull request #5 from jdubciii/feat/phase12-4-retention-pruning
c951d05 Merge pull request #4 from jdubciii/feat/phase12-3-transports
3eea715 Merge pull request #3 from jdubciii/feat/phase12-2-wrapup-engine
97a72e7 Merge pull request #2 from jdubciii/feat/phase12-1e-reminder-scanner
45df406 Merge pull request #1 from jdubciii/feat/phase12-1-outbox
00e89dd docs: generate evidence bundle and finalize changes for R-12.2-AA
8ec0ca5 docs: generate evidence bundle and finalize changes for R-12.2-Z
a28e55d chore: retire wrapUpConcurrency test and sanitize safeguards ref
e0e8579 Merge branch 'feat/phase12-guard-e2e' into main (R-12.2-X: Decision #20 override removal & BR-5 unit tests)
75c42c5 Merge branch 'release/br2' into main
18238ff feat: add Phase 12 ground-truth verification scripts, documentation CI guard, and arbiter ruling evidence
41296e4 feat: add local PostgreSQL rehearsal setup scripts and wrap-up concurrency tests
96fca3d feat: implement database safeguards and testing infrastructure alongside Incident I-1 forensic artifacts
a2362c0 test: add vitest dependency and characterization and concurrency test suites
bb4c463 docs: add Phase 12 architecture specification for league operations and resilience patterns
988ec29 feat: add database safeguard utility and R-12.2-J evidence documentation
ff5208a feat: implement weekly wrap-up service with game finality validation and claim idempotency
c8eef5a feat: implement weekly wrap-up service, auth middleware, and append-only penalty ledger migration

### Remote Configuration & Reflogs (Decision #53)
origin	https://github.com/jdubciii/NFL-Pick-Em.git (fetch)
origin	https://github.com/jdubciii/NFL-Pick-Em.git (push)

Reflog (HEAD):
2a7eee2 HEAD@{0}: commit: docs: ingest Decision #68 and stage M14.1 baseline
b2df31d HEAD@{1}: checkout: moving from main to docs/r14-intake-remediation
f9f9308 HEAD@{2}: reset: moving to origin/main
1d99324 HEAD@{3}: checkout: moving from docs/r14-intake-remediation to main
b2df31d HEAD@{4}: commit: docs: bind R-14-INTAKE-03 closing evidence supplement
f5459d5 HEAD@{5}: commit: docs: ingest Decision #67 from R-14-INTAKE-03 and prepare evidence compiler
1d99324 HEAD@{6}: checkout: moving from main to docs/r14-intake-remediation
1d99324 HEAD@{7}: commit (amend): chore: prepare R-14-INTAKE-01 evidence baseline
bdb43ea HEAD@{8}: commit: chore: prepare R-14-INTAKE-01 evidence baseline
cccaac1 HEAD@{9}: commit: chore: update tripwire and db header for 15-table schema and rehearsal
c09c365 HEAD@{10}: commit: docs: ingest Decisions #61-66 from R-14-INTAKE-01
f9f9308 HEAD@{11}: commit: docs: bind Section 9 verification bundle for Phase 13 final program closure
c98e2a3 HEAD@{12}: commit: feat(phase13-closure): generate comprehensive raw terminal evidence for Phase 13 closure
45eb5a7 HEAD@{13}: pull origin main: Fast-forward
2cf6b04 HEAD@{14}: checkout: moving from feat/phase13-4-e2e-verification to main

### fix/br5b-admin-picks Status
* docs/r14-intake-remediation
  feat/phase12-1-outbox
  feat/phase12-1e-reminder-scanner
  feat/phase12-2-wrapup-engine
  feat/phase12-3-transports
  feat/phase12-4-retention-pruning
  feat/phase12-guard-e2e
  feat/phase12-migrations
  feat/phase13-1-notification-center
  feat/phase13-2-commissioner-dashboard
  feat/phase13-3-admin-ops-panel
  feat/phase13-4-e2e-verification
  fix/br5b-admin-picks
  main
  release/br2
  remotes/origin/HEAD -> origin/main
  remotes/origin/feat/phase12-1-outbox
  remotes/origin/feat/phase12-1e-reminder-scanner
  remotes/origin/feat/phase12-2-wrapup-engine
  remotes/origin/feat/phase12-3-transports
  remotes/origin/feat/phase12-4-retention-pruning
  remotes/origin/feat/phase13-1-notification-center
  remotes/origin/feat/phase13-2-commissioner-dashboard
  remotes/origin/feat/phase13-3-admin-ops-panel
  remotes/origin/feat/phase13-4-e2e-verification
  remotes/origin/fix/br5b-admin-picks
  remotes/origin/main

## 3. Script Inventory & Host Safety Manifest
### scripts/ Directory Hashes:
fd6ed477202a25be245f6b9b1db6a8f78b6c9d874e484c56d7089d395f910f83  scripts/append_rls.js
75f9be35b8541a8074da4be92d34204b73ffd4ba6a071c3419a23b51728dd7b8  scripts/ci_check_functions.sh
249299000c7ec747bec8eea666a308781b5c2a43ec8c4285644c731cb264f563  scripts/ci_check_register.js
1bad6c295f5464a07278199ebdbabf3530b8ee183d9538b2cf7909d8f6b29a51  scripts/db_header.js
d52ccab7792fa245b60ba8bad7962eb7b0f21a2d20b9f2f0c3027b6ffd379ac0  scripts/docs_audit_aa.js
ce895774ecff37ef75c281aae5672897976dc996a403c161213a66f4dfc5b1ac  scripts/docs_audit_ab.js
826f956937fdc0eb433065bf8d7d5398289d4bafda4a202be58d4a8d8008313e  scripts/gather_facts_aa.js
700ff13f5d602ebd4a27e145488e2fc27d05a1798c6356124d37c7cacc1fdc76  scripts/gather_facts_ab.js
a3e90a09f74fb56c57ad6a04e3f7315d77d1bf55feb4e8c70ee957a52439f4b7  scripts/gather_facts_ac.js
6aaa168c9facd90d52111a76759165b59f3f3a06329c92039baaf9611dc05508  scripts/gather_facts_ae.js
44396e05945d4f75c00a7247b01fd86826d1036fbfe4ce054d6aece4e6c9e439  scripts/generate_evidence.js
5bbabe6b248f4d4389e990e012ca728aec8af23897d6fbda7d806cc516379c85  scripts/generate_evidence_12_1e.js
104c2de41bd6ad24dd066df7d004cc5cae4b4b0ffa8d9bda9983a012fca4a57a  scripts/generate_evidence_12_2.js
98fc2532d5ddd12a473c3162a4b53e0e91616d5127ebac659b1ed7353c25a48e  scripts/generate_evidence_12_3.js
f456b844e831a8e6cfb81b3c972d653976f157e34b187480a6c7a01a8b6f59af  scripts/generate_evidence_12_4.js
145be6753c82fb40c5fe5ef362ee87451a119472517dbf5efcc863fdf149d30a  scripts/generate_evidence_13_1.js
1995ffb982cbb3e7fafd33e82bfa9b5a1763d76b959afc2ae56c578e57b1f93a  scripts/generate_evidence_13_2.js
7e0110b1aae3e080d2182cf8173e4d062c5f5bb4e295a77843d0fe4c0d41fd51  scripts/generate_evidence_13_3.js
44604505bb1c52f4c41601ac4b6e546fb677afa94524853c30c9ed5841e5f97b  scripts/generate_evidence_13_4.js
f4f93ff74d112545619a9c5f6d0981653a15852ef2d0b953a0060fe5a2156d0d  scripts/generate_evidence_13_final.js
9d670b945276055c93f311d3b96c9f7c155e6614f2b9ed2190089f3a8ffedc5a  scripts/generate_evidence_b3_closeout.js
a08a8771e196595dc13d49c398479f378e7397bcafc3f1f081b3217901a375a6  scripts/generate_evidence_b3_v2.js
788509d7d1533598cd6081bb105444280f8f0c4e39b6167321fd111cd8559044  scripts/generate_evidence_r12_1_restore_01.js
69c8b8455f975b12da549428895cb759e84f2da209b8a69b0b37a843d1cf360f  scripts/generate_evidence_r14_intake.js
e96b7cb546a19dd1e2baade9dd38ee0431e225c07ec2d0d054af381a2383e62a  scripts/generate_evidence_r14_intake_03.js
20759690622ef3f403bea1546253df8d654129a319af634b752951de9dc3f5d4  scripts/generate_evidence_step_c.js
c8d514a999ed579b5814d81bde86d146b0132a947a996a6fafd667cfabaafa73  scripts/generate_evidence_step_d.js
d275e0642ebbf196a213b8c31faad5960313dd4ef50e77e0604c5ea0af735054  scripts/generate_evidence_step_f.js
fb2e33d6b27f38ad922e48ef10543a7011695fec8c136b34972414edd4303f52  scripts/generate_evidence_step_f_v2.js
c425e17fc817a0fd931add8ebacfeddb4e6b037f5674813b852abc7b2811b5da  scripts/generate_g1_evidence.js
e7264caf1574e5192090358bec8ea9dbd935ce701cd0f24659b7fea11b2e447a  scripts/history_scan.js
656c7f28d27e26c1a974080e9e113758866ecc9b91d44fabba68ae9c95865b94  scripts/history_scan.sh
cf9ec2414f1b440c0b9046be6636c04aefe7fa3d4bd728a6885babbea2b08bdf  scripts/run_hosted_tripwire.js
2b91500ffaf2208578f196994d1f2d1436c74d05c90f52770ddc8d8b1f63b813  scripts/run_negative_control.js
d43983fe62b7479ad88ae875135dc1b4bc25d3e5025a63207beec0f62305b313  scripts/run_tripwire.js
7a30eb80f62bc0cdc5ae17f4b52675b7e4fc3b127cffa9dcb189b336138ceafc  scripts/secret_scan.sh

### .worktree-ctl/ Directory Hashes:
e09f53ab18e0a507cf29d3bdf81a4687758c388d5d9a5a117dd26367054d2ef8  .worktree-ctl/check_dal_games.ts
1c8d764bc48cb878c8915e6c3a7ef69bcac5ac9e45c797a44871bc27a2a4de71  .worktree-ctl/cleanup_stale_games.ts
a5f5069d2d2f4ef83389e8cf68cde05e8a90b0c17f11e032932562efafb4413d  .worktree-ctl/debug_matrix.ts
879d48d1742cb0b69ec01fa309a9923268758de5d5aa4a82b16b0407cb07fed9  .worktree-ctl/fix_exact_pool_memberships.ts
e09d75f3f719585fdc65ce380041f975e17a447a1fd6625897e5a0f5153028bc  .worktree-ctl/fix_game_schedule.ts
fdc9b5dc382d2900b743de8b027cd032e02bc7845b8eef4ea8022c35f2ff9846  .worktree-ctl/fix_membership.ts
5b7b24b52a6658ddd2e51c0aade38b7c6ca0016aa2c78ca4a276da2f5ca91292  .worktree-ctl/get_active_token.ts
b9cc0b13754c32f39b083f4db94ffeb21a70a4a54d92e7512cf5d72df3a4c7fb  .worktree-ctl/grant_all_memberships.ts
4855c2e56b43d18bde9995e2fbe55e2760397b68d68ac5d68b9aa2c40fd5dba0  .worktree-ctl/inspect_auth.ts
aeadc79e77fab9069d8950830d4556c94d15854304b35aaa2bbf2056cdf7fca5  .worktree-ctl/reset_and_verify.ts
06f9703e9f5c1e7906d6e6d85501e19b7e24f0fd549f490c69a0b03313d1f247  .worktree-ctl/seed_week1.ts
36d8943c88a220036ba518ebc97e8b04931a73883690246bcc015266713b2842  .worktree-ctl/set_all_week4_kickoffs.ts
aed29193a85ff606fa4f4e3354695482906ad76a0a1cac551d9b8d96fba8b752  .worktree-ctl/set_real_kickoffs.ts
2729dfefe93a630be12d0a63216beb02a1e4e20527a3002bfd351fa8da57e532  .worktree-ctl/sync_live_nfl_games.ts
b3202b73f2c967993b8f880576ff75f66edaadb0381850c70152c77374347d2a  .worktree-ctl/test_matrix_endpoint.ts
b0a78d9f15c866e68608f0bf7796f603a8928c76123d4029cabec07047e011e8  .worktree-ctl/verify_matrix_direct.ts

### Host Safety Manifest
- Loaded Env Source: .env (Local Rehearsal)
- Target Database Host Class: Localhost / pickem_rehearsal (PostgreSQL port 5432)
- DECLARATION: No mutative scripts were executed against the hosted Supabase environment.
