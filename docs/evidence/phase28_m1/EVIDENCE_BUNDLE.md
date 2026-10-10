# M28.1 EVIDENCE BUNDLE: RADAR LIVE CONSEQUENCES & CHAOS ENGINE
Date: 2026-10-09T22:19:40.057Z
Baseline E_SHA: bb73b1e7482d3f7dd1e9962058ba8ae0875fe083
Governing Authority: R-28.1-FALLBACK

## 1. Baseline Git Hygiene & Working Tree Porcelain (at E_SHA)
?? docs/evidence/phase28_m1/
?? scripts/generate_m28_1_evidence.js

### git rev-parse HEAD
bb73b1e7482d3f7dd1e9962058ba8ae0875fe083

### git rev-parse HEAD~1
3237b51142f3eea1f93079fac8cc155db6798906

## 2. Commit Ancestry & Decision #53 Push Verification
### git log -n 5 --oneline
bb73b1e feat(phase28): implement M28.1 Radar live consequence tiers, danger seat strip, and simulation engine
3237b51 chore: add *.apk to .gitignore
7a61f8e fix(matrix): seal settled gameday hub restoration checkpoint
f790a87 fix(toast): semantic color-coded toasts with dynamic re-trigger bounce, remove dead refresh button, and isolate clear all header
982278d fix(header): eliminate dead refresh button, fix lock pill overflow, and elevate clear all away from chevron

### git reflog -n 5
bb73b1e HEAD@{0}: commit: feat(phase28): implement M28.1 Radar live consequence tiers, danger seat strip, and simulation engine
3237b51 HEAD@{1}: checkout: moving from main to feat/phase28-radar-live-sweat
3237b51 HEAD@{2}: commit: chore: add *.apk to .gitignore
7a61f8e HEAD@{3}: commit: fix(matrix): seal settled gameday hub restoration checkpoint
f790a87 HEAD@{4}: commit: fix(toast): semantic color-coded toasts with dynamic re-trigger bounce, remove dead refresh button, and isolate clear all header

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
  - DB Server Time: Fri Oct 09 2026 15:19:43 GMT-0700 (Mountain Standard Time)
  - Hours Since T0 (2026-09-30T06:14:37Z): 232.0852 hrs

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
### npx vitest run tests/radarLiveConsequencesService.test.ts --reporter=verbose
[1m[30m[46m RUN [49m[39m[22m [36mv5.0.2 [39m[90mC:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em[39m

 [32m✓[39m tests/radarLiveConsequencesService.test.ts[2m > [22mM28.1 Radar Live Consequences Engine[2m > [22mcorrectly grades ATS picks against Tuesday frozen lines[32m 3[2mms[22m[39m
 [32m✓[39m tests/radarLiveConsequencesService.test.ts[2m > [22mM28.1 Radar Live Consequences Engine[2m > [22menforces Decision #69: 10th Place Dead Place receives exactly 2.50 absolute penalty shots[32m 4[2mms[22m[39m
 [32m✓[39m tests/radarLiveConsequencesService.test.ts[2m > [22mM28.1 Radar Live Consequences Engine[2m > [22mdetects Red Zone threat when opponent has possession inside the 20[32m 1[2mms[22m[39m
 [32m✓[39m tests/radarLiveConsequencesService.test.ts[2m > [22mM28.1 Radar Live Consequences Engine[2m > [22mINV-6: executes in-memory What-If score adjustments without mutating base game state[32m 0[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m4 passed[39m[22m[90m (4)[39m
[2m   Start at [22m 15:19:46
[2m   Duration [22m 549ms[2m (transform 42%, import 25%, setup 24%, tests 5%, worker 4%)[22m

## 6. Client TypeScript Build Verification
### npm --prefix client run build
> client@0.0.0 build
> tsc -b && vite build

[36mvite v8.3.1 [32mbuilding client environment for production...[36m[39m
transforming...
✓ 2347 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.49 kB │ gzip:   0.32 kB
dist/assets/index-Cw_g3RsO.css  152.75 kB │ gzip:  19.21 kB
dist/assets/index-Dgqyo-1Z.js   692.22 kB │ gzip: 193.71 kB

[32m✓ built in 3.60s[39m
