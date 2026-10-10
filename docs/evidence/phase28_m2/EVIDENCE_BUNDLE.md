# M28.2 EVIDENCE BUNDLE: MOMENTUM, LEVERAGE DRAWER & SLATE FINALIZATION
Date: 2026-10-10T03:35:37.358Z
Baseline E_SHA: 92b3e37896269fc76d3085504d7843558359b322
Governing Authority: R-28.2-FALLBACK

## 1. Baseline Git Hygiene & Working Tree Porcelain (at E_SHA)
?? scripts/generate_m28_2_evidence.js

### git rev-parse HEAD
92b3e37896269fc76d3085504d7843558359b322

### git rev-parse HEAD~1
f6d68c352aae85dc799b35e7bb3a041d9497cf6d

## 2. Commit Ancestry & Decision #53 Push Verification
### git log -n 5 --oneline
92b3e37 feat(phase28): implement M28.2 Momentum sparklines, rivalry leverage drawer, and slate finalization engine
f6d68c3 docs: compile complete M28.1.1 raw evidence bundle
7973f37 feat(phase28): implement M28.1.1 Radar UX elevation, 'The Drop' demarcation, and simulation reality styling
7b1bc23 docs: compile complete M28.1 raw evidence bundle
bb73b1e feat(phase28): implement M28.1 Radar live consequence tiers, danger seat strip, and simulation engine

### git reflog -n 5
92b3e37 HEAD@{0}: commit: feat(phase28): implement M28.2 Momentum sparklines, rivalry leverage drawer, and slate finalization engine
f6d68c3 HEAD@{1}: commit: docs: compile complete M28.1.1 raw evidence bundle
7973f37 HEAD@{2}: commit: feat(phase28): implement M28.1.1 Radar UX elevation, 'The Drop' demarcation, and simulation reality styling
7b1bc23 HEAD@{3}: commit: docs: compile complete M28.1 raw evidence bundle
bb73b1e HEAD@{4}: commit: feat(phase28): implement M28.1 Radar live consequence tiers, danger seat strip, and simulation engine

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
  - DB Server Time: Fri Oct 09 2026 20:35:39 GMT-0700 (Mountain Standard Time)
  - Hours Since T0 (2026-09-30T06:14:37Z): 237.3507 hrs

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
### npx vitest run tests/radarLiveConsequencesService.test.ts tests/slateFinaleSettlementService.test.ts --reporter=verbose
[1m[30m[46m RUN [49m[39m[22m [36mv5.0.2 [39m[90mC:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em[39m

 [32m✓[39m tests/slateFinaleSettlementService.test.ts[2m > [22mM28.2 Momentum, Rivalry Leverage & Slate Finalization[2m > [22mcorrectly calculates Rivalry Leverage and delta picks between users[32m 6[2mms[22m[39m
 [32m✓[39m tests/slateFinaleSettlementService.test.ts[2m > [22mM28.2 Momentum, Rivalry Leverage & Slate Finalization[2m > [22mtriggers Proximity Warning when 9th vs 10th differential is less than 3.0 points[32m 1[2mms[22m[39m
 [32m✓[39m tests/slateFinaleSettlementService.test.ts[2m > [22mM28.2 Momentum, Rivalry Leverage & Slate Finalization[2m > [22maccurately computes momentum trend classification from rolling history snapshots[32m 1[2mms[22m[39m
 [32m✓[39m tests/slateFinaleSettlementService.test.ts[2m > [22mM28.2 Momentum, Rivalry Leverage & Slate Finalization[2m > [22menforces Decision #55 & Decision #69 during Slate Settlement when all games are FINAL[32m 3[2mms[22m[39m
 [32m✓[39m tests/slateFinaleSettlementService.test.ts[2m > [22mM28.2 Momentum, Rivalry Leverage & Slate Finalization[2m > [22mrejects premature slate finalization if any game is IN_PROGRESS[32m 2[2mms[22m[39m
 [32m✓[39m tests/radarLiveConsequencesService.test.ts[2m > [22mM28.1.1 Radar Live Consequences Engine & Decision #69 isDeadPlace[2m > [22mcorrectly grades ATS picks against Tuesday frozen lines[32m 3[2mms[22m[39m
 [32m✓[39m tests/radarLiveConsequencesService.test.ts[2m > [22mM28.1.1 Radar Live Consequences Engine & Decision #69 isDeadPlace[2m > [22menforces Decision #69: 10th Place emits explicit isDeadPlace: true and 2.50 absolute penalty[32m 4[2mms[22m[39m
 [32m✓[39m tests/radarLiveConsequencesService.test.ts[2m > [22mM28.1.1 Radar Live Consequences Engine & Decision #69 isDeadPlace[2m > [22mdetects Red Zone threat when opponent has possession inside the 20[32m 1[2mms[22m[39m
 [32m✓[39m tests/radarLiveConsequencesService.test.ts[2m > [22mM28.1.1 Radar Live Consequences Engine & Decision #69 isDeadPlace[2m > [22mINV-6: executes in-memory What-If score adjustments without mutating base game state[32m 1[2mms[22m[39m

[2m Test Files [22m [1m[32m2 passed[39m[22m[90m (2)[39m
[2m      Tests [22m [1m[32m9 passed[39m[22m[90m (9)[39m
[2m   Start at [22m 20:35:43
[2m   Duration [22m 1.09s[2m (transform 37%, setup 32%, import 19%, tests 6%, worker 6%)[22m

[2m    Isolate [22m [33m2 workers spawned[39m[2m · ~268ms startup each (spawn + environment, per file)[22m
[2m            [22m [2mat least ~268ms faster with [22m[33misolate: false[39m[2m — reuses workers across files instead of one per file[22m

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
dist/assets/index-DzcXFtjV.css  156.73 kB │ gzip:  19.63 kB
dist/assets/index-CI6f2iF_.js   692.22 kB │ gzip: 193.71 kB

[32m✓ built in 3.18s[39m
