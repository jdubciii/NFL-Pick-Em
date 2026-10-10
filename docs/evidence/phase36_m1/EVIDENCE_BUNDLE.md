# PHASE 36 EVIDENCE BUNDLE: FULL-SYSTEM E2E WALKTHROUGH & HARDENED RELEASE CANDIDATE
Date: 2026-10-10T23:21:47.117Z
Baseline E_SHA: 15007e6086c985ef7fe7748bf8d66a0d6a6096ec
Governing Authority: Ruling R-36.0-RELEASE-CANDIDATE
Active Branch: feat/phase36-release-hardening

## 1. Baseline Git Hygiene & Working Tree Porcelain (at E_SHA)
?? scripts/generate_m36_evidence.js

### git rev-parse HEAD
15007e6086c985ef7fe7748bf8d66a0d6a6096ec

### git rev-parse HEAD~1
21c94fffc6ea34f71489b938fdb8cac206440cc5

## 2. Commit Ancestry & Decision #53 Push Verification
### git log -n 5 --oneline
15007e6 feat(phase36): implement empty states, charter onboarding, error boundary, console stripping, and signed release APK
21c94ff docs: compile complete M35.3 raw evidence bundle
4a83054 feat(phase35): implement M35.3 hardware capture, stall watchdog, and atomic RPC transition
68de8a3 docs: re-seal M35.2 evidence bundle with z-index and padding adjustments
47a27ae fix(shame): elevate EvidenceSubmissionDrawer to z-[100] and increase page scroll padding to pb-36

### git reflog -n 5
15007e6 HEAD@{0}: commit: feat(phase36): implement empty states, charter onboarding, error boundary, console stripping, and signed release APK
21c94ff HEAD@{1}: checkout: moving from feat/native-media-upload to feat/phase36-release-hardening
21c94ff HEAD@{2}: commit: docs: compile complete M35.3 raw evidence bundle
4a83054 HEAD@{3}: commit: feat(phase35): implement M35.3 hardware capture, stall watchdog, and atomic RPC transition
68de8a3 HEAD@{4}: commit: docs: re-seal M35.2 evidence bundle with z-index and padding adjustments

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
  - DB Server Time: Sat Oct 10 2026 16:21:50 GMT-0700 (Mountain Standard Time)
  - Hours Since T0 (2026-09-30T06:14:37Z): 257.1204 hrs

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

## 5. Vitest Pilot Season Full-System E2E Test Execution
### npx vitest run tests/phase36PilotSeasonE2E.test.ts --reporter=verbose
[1m[30m[46m RUN [49m[39m[22m [36mv5.0.2 [39m[90mC:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em[39m

 [32m✓[39m tests/phase36PilotSeasonE2E.test.ts[2m > [22mPhase 36: Pilot Season Full-System E2E Lifecycle Simulation[2m > [22mStep 1 (Tuesday Locks): Assert 10 members submit picks, including Autopilot and Lone Wolf[32m 2[2mms[22m[39m
 [32m✓[39m tests/phase36PilotSeasonE2E.test.ts[2m > [22mPhase 36: Pilot Season Full-System E2E Lifecycle Simulation[2m > [22mStep 2 (Sunday 1:00 PM): Assert SLATE_LOCKED event freezes pick modifications[32m 0[2mms[22m[39m
 [32m✓[39m tests/phase36PilotSeasonE2E.test.ts[2m > [22mPhase 36: Pilot Season Full-System E2E Lifecycle Simulation[2m > [22mStep 3 (Sunday 3:00 PM): Process live game scores, verify Danger Seat and 100% Win Equity normalization[32m 1[2mms[22m[39m
 [32m✓[39m tests/phase36PilotSeasonE2E.test.ts[2m > [22mPhase 36: Pilot Season Full-System E2E Lifecycle Simulation[2m > [22mStep 4 (Sunday 4:15 PM): Fire SLATE_FINALIZED and assign 10th place 2.50 Dead Place debt[32m 2[2mms[22m[39m
 [32m✓[39m tests/phase36PilotSeasonE2E.test.ts[2m > [22mPhase 36: Pilot Season Full-System E2E Lifecycle Simulation[2m > [22mStep 5 (Monday Deposition): Execute submitPenaltyEvidenceRPC for 10th place and start 24h Jury Clock[32m 1[2mms[22m[39m
 [32m✓[39m tests/phase36PilotSeasonE2E.test.ts[2m > [22mPhase 36: Pilot Season Full-System E2E Lifecycle Simulation[2m > [22mStep 6 (Tuesday Tribunal): 5 UPHOLD votes on SPILLED_LIQUOR dispute trigger Contempt of Court (+0.50s)[32m 1[2mms[22m[39m
 [32m✓[39m tests/phase36PilotSeasonE2E.test.ts[2m > [22mPhase 36: Pilot Season Full-System E2E Lifecycle Simulation[2m > [22mStep 7 (Ledger Verification): 10th place lifetime outstanding debt equals strictly 3.00 SHOTS[32m 0[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m7 passed[39m[22m[90m (7)[39m
[2m   Start at [22m 16:21:51
[2m   Duration [22m 566ms[2m (transform 57%, setup 25%, import 11%, tests 4%, worker 3%)[22m

## 6. Client TypeScript Production Build Verification (Console Dropping)
### npm --prefix client run build
> client@0.0.0 build
> tsc -b && vite build

[36mvite v8.3.1 [32mbuilding client environment for production...[36m[39m
transforming...
✓ 2361 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                     0.49 kB │ gzip:   0.32 kB
dist/assets/index-CyOwiizW.css                    171.07 kB │ gzip:  20.91 kB
dist/assets/nativeMediaUploadService-DPUKdVPf.js    0.35 kB │ gzip:   0.27 kB
dist/assets/index-D3cNFkzt.js                     642.02 kB │ gzip: 185.72 kB

[32m✓ built in 2.73s[39m

## 7. Signed Release Binary Telemetry (app-release.apk)
Release Keystore: client/android/nflpickem-release.keystore (RSA 2048-bit)
Root app-release.apk Size: 6851386 bytes
