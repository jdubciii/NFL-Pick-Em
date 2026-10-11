# M35.1 EVIDENCE BUNDLE: NATIVE MEDIA CAPTURE & VAULT PIPELINE
Date: 2026-10-10T20:23:47.698Z
Baseline E_SHA: 9c5a9b182aab4f2f932baea651f696a02a44a36d
Governing Authority: R-35.1-MEDIA-SCAFFOLD

## 1. Baseline Git Hygiene & Working Tree Porcelain (at E_SHA)
?? scripts/generate_m35_1_evidence.js

### git rev-parse HEAD
9c5a9b182aab4f2f932baea651f696a02a44a36d

### git rev-parse HEAD~1
c7f06e8fd1c4a9bf91962d725a3dae30301d8fbb

## 2. Commit Ancestry & Decision #53 Push Verification
### git log -n 5 --oneline
9c5a9b1 feat(phase35): scaffold native media capture, storage pipeline, and constraint validation
c7f06e8 fix(radar): wire RadarPage cleanly into App.tsx without duplicate imports
591723c chore(release): merge feat/phase34-consumer-truth-cleanup into main (Phases 28-34 complete: Live Radar, Tribunal, Pre-Game, Rap Sheet, Wall of Shame, Design System, Consumer Truth)
b49924f docs: compile complete M34.3 raw evidence bundle
e26f3cd fix(phase34): implement video-first Reels feed, compact tribunal drawer, and narrative badge receipts

### git reflog -n 5
9c5a9b1 HEAD@{0}: commit: feat(phase35): scaffold native media capture, storage pipeline, and constraint validation
c7f06e8 HEAD@{1}: checkout: moving from main to feat/native-media-upload
c7f06e8 HEAD@{2}: checkout: moving from main to main
c7f06e8 HEAD@{3}: commit: fix(radar): wire RadarPage cleanly into App.tsx without duplicate imports
591723c HEAD@{4}: merge feat/phase34-consumer-truth-cleanup: Merge made by the 'ort' strategy.

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
  - DB Server Time: Sat Oct 10 2026 13:23:50 GMT-0700 (Mountain Standard Time)
  - Hours Since T0 (2026-09-30T06:14:37Z): 254.1538 hrs

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
### npx vitest run tests/nativeMediaUploadService.test.ts --reporter=verbose
[1m[30m[46m RUN [49m[39m[22m [36mv5.0.2 [39m[90mC:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em[39m

 [32m✓[39m tests/nativeMediaUploadService.test.ts[2m > [22mMilestone 35.1: Native Media Capture & Vault Pipeline Invariants[2m > [22menforces maximum 30MB file size ceiling[32m 4[2mms[22m[39m
 [32m✓[39m tests/nativeMediaUploadService.test.ts[2m > [22mMilestone 35.1: Native Media Capture & Vault Pipeline Invariants[2m > [22mrejects unpermitted media MIME types and accepts approved formats[32m 1[2mms[22m[39m
 [32m✓[39m tests/nativeMediaUploadService.test.ts[2m > [22mMilestone 35.1: Native Media Capture & Vault Pipeline Invariants[2m > [22mrejects video duration exceeding 60-second punishment limit[32m 1[2mms[22m[39m
 [32m✓[39m tests/nativeMediaUploadService.test.ts[2m > [22mMilestone 35.1: Native Media Capture & Vault Pipeline Invariants[2m > [22mgenerates isolated, RLS-compliant Supabase storage paths per pool and user[32m 1[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m4 passed[39m[22m[90m (4)[39m
[2m   Start at [22m 13:23:56
[2m   Duration [22m 1.37s[2m (transform 50%, import 36%, setup 11%, worker 2%, tests 1%)[22m

## 6. Client TypeScript Build Verification
### npm --prefix client run build
> client@0.0.0 build
> tsc -b && vite build

[36mvite v8.3.1 [32mbuilding client environment for production...[36m[39m
transforming...
✓ 2355 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.49 kB │ gzip:   0.32 kB
dist/assets/index-YJaaFUA_.css  168.73 kB │ gzip:  20.73 kB
dist/assets/index-uYnqFwLG.js   624.07 kB │ gzip: 181.02 kB

[32m✓ built in 3.75s[39m
