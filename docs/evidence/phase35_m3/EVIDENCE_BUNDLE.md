# M35.3 EVIDENCE BUNDLE: NATIVE HARDWARE WIRING & STORAGE PIPELINE
Date: 2026-10-10T22:55:04.646Z
Baseline E_SHA: 4a830544c26f3f50c0a4649de5cb0964a3d8dda0
Governing Authority: R-35.3-NATIVE-PIPELINE

## 1. Baseline Git Hygiene & Working Tree Porcelain (at E_SHA)
?? scripts/generate_m35_3_evidence.js

### git rev-parse HEAD
4a830544c26f3f50c0a4649de5cb0964a3d8dda0

### git rev-parse HEAD~1
68de8a31e80beb1ac322f5ced5813a1bee17b4e0

## 2. Commit Ancestry & Decision #53 Push Verification
### git log -n 5 --oneline
4a83054 feat(phase35): implement M35.3 hardware capture, stall watchdog, and atomic RPC transition
68de8a3 docs: re-seal M35.2 evidence bundle with z-index and padding adjustments
47a27ae fix(shame): elevate EvidenceSubmissionDrawer to z-[100] and increase page scroll padding to pb-36
5a06a4d style(shame): add bottom padding to Pit CTA button container in WallOfShamePage
7821194 docs: compile complete M35.2 raw evidence bundle

### git reflog -n 5
4a83054 HEAD@{0}: commit: feat(phase35): implement M35.3 hardware capture, stall watchdog, and atomic RPC transition
68de8a3 HEAD@{1}: commit: docs: re-seal M35.2 evidence bundle with z-index and padding adjustments
47a27ae HEAD@{2}: commit: fix(shame): elevate EvidenceSubmissionDrawer to z-[100] and increase page scroll padding to pb-36
5a06a4d HEAD@{3}: commit: style(shame): add bottom padding to Pit CTA button container in WallOfShamePage
7821194 HEAD@{4}: commit: docs: compile complete M35.2 raw evidence bundle

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
  - DB Server Time: Sat Oct 10 2026 15:55:07 GMT-0700 (Mountain Standard Time)
  - Hours Since T0 (2026-09-30T06:14:37Z): 256.6752 hrs

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

## 5. Vitest Invariant Test Suite Execution
### npx vitest run tests/nativeMediaStoragePipeline.test.ts --reporter=verbose
[1m[30m[46m RUN [49m[39m[22m [36mv5.0.2 [39m[90mC:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em[39m

 [32m✓[39m tests/nativeMediaStoragePipeline.test.ts[2m > [22mMilestone 35.3: Native Hardware Wiring & Supabase Storage Pipeline Invariants[2m > [22mtriggers optimization state threshold when media exceeds 15MB[32m 2[2mms[22m[39m
 [32m✓[39m tests/nativeMediaStoragePipeline.test.ts[2m > [22mMilestone 35.3: Native Hardware Wiring & Supabase Storage Pipeline Invariants[2m > [22mexecutes atomic submit_penalty_evidence RPC and initiates 24h Jury Clock[32m 3[2mms[22m[39m
 [32m✓[39m tests/nativeMediaStoragePipeline.test.ts[2m > [22mMilestone 35.3: Native Hardware Wiring & Supabase Storage Pipeline Invariants[2m > [22mrejects RPC and triggers orphan cleanup when file path is invalid[32m 1[2mms[22m[39m
 [32m✓[39m tests/nativeMediaStoragePipeline.test.ts[2m > [22mMilestone 35.3: Native Hardware Wiring & Supabase Storage Pipeline Invariants[2m > [22mverifies RLS path compliance structure[32m 1[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m4 passed[39m[22m[90m (4)[39m
[2m   Start at [22m 15:55:08
[2m   Duration [22m 402ms[2m (transform 45%, setup 35%, import 11%, tests 6%, worker 4%)[22m

## 6. Client TypeScript Build Verification
### npm --prefix client run build
> client@0.0.0 build
> tsc -b && vite build

[36mvite v8.3.1 [32mbuilding client environment for production...[36m[39m
transforming...
✓ 2358 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                     0.49 kB │ gzip:   0.32 kB
dist/assets/index-CEtL9UMR.css                    169.45 kB │ gzip:  20.81 kB
dist/assets/nativeMediaUploadService-DPUKdVPf.js    0.35 kB │ gzip:   0.27 kB
dist/assets/index-1lMcPylZ.js                     632.68 kB │ gzip: 183.24 kB

[32m✓ built in 2.03s[39m
