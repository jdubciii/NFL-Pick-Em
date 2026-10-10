# M31.1 EVIDENCE BUNDLE: USER PROFILE & REPUTATION HUB
Date: 2026-10-10T05:47:31.076Z
Baseline E_SHA: 7b206ba2e075a253e86c174bf365d2f38d233bbd
Governing Authority: R-31.1-FALLBACK

## 1. Baseline Git Hygiene & Working Tree Porcelain (at E_SHA)
?? scripts/generate_m31_1_evidence.js

### git rev-parse HEAD
7b206ba2e075a253e86c174bf365d2f38d233bbd

### git rev-parse HEAD~1
3aa2b8c9c6f275aba8842dc12745690f19c1c4db

## 2. Commit Ancestry & Decision #53 Push Verification
### git log -n 5 --oneline
7b206ba feat(phase31): implement M31.1 User Profile, 3D Trading Card, and Season Rap Sheet
3aa2b8c docs: compile complete M30.2 raw evidence bundle
1a2d096 feat(phase30): implement M30.2 Autopilot attribution, camp clustering, and dual-mode live gametrack preservation
dd80f9d docs: compile complete M30.1 raw evidence bundle
daa7e2e feat(phase30): implement M30.1 Pre-Game Transparency, Consensus Dimming, Lone Wolf indicator, and Rival Crosshairs

### git reflog -n 5
7b206ba HEAD@{0}: commit: feat(phase31): implement M31.1 User Profile, 3D Trading Card, and Season Rap Sheet
3aa2b8c HEAD@{1}: checkout: moving from feat/phase30-pregame-crosshairs to feat/phase31-profile-rapsheet
3aa2b8c HEAD@{2}: commit: docs: compile complete M30.2 raw evidence bundle
1a2d096 HEAD@{3}: commit: feat(phase30): implement M30.2 Autopilot attribution, camp clustering, and dual-mode live gametrack preservation
dd80f9d HEAD@{4}: commit: docs: compile complete M30.1 raw evidence bundle

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
  - DB Server Time: Fri Oct 09 2026 22:47:33 GMT-0700 (Mountain Standard Time)
  - Hours Since T0 (2026-09-30T06:14:37Z): 239.5490 hrs

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
### npx vitest run tests/reputationEngineService.test.ts --reporter=verbose
[1m[30m[46m RUN [49m[39m[22m [36mv5.0.2 [39m[90mC:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em[39m

 [32m✓[39m tests/reputationEngineService.test.ts[2m > [22mM31.1 Reputation Engine & Multi-Metric Penalty Ledger[2m > [22mcorrectly aggregates multi-metric ledger balances and audit trail[32m 4[2mms[22m[39m
 [32m✓[39m tests/reputationEngineService.test.ts[2m > [22mM31.1 Reputation Engine & Multi-Metric Penalty Ledger[2m > [22mcorrectly derives Dead Place Monarch badge when 10th place count >= 3[32m 1[2mms[22m[39m
 [32m✓[39m tests/reputationEngineService.test.ts[2m > [22mM31.1 Reputation Engine & Multi-Metric Penalty Ledger[2m > [22mcorrectly derives Escape Artist badge when surviving 9th place by < 1.0 point[32m 0[2mms[22m[39m
 [32m✓[39m tests/reputationEngineService.test.ts[2m > [22mM31.1 Reputation Engine & Multi-Metric Penalty Ledger[2m > [22mcorrectly derives The Machine badge when using Autopilot for 3 consecutive weeks[32m 0[2mms[22m[39m
 [32m✓[39m tests/reputationEngineService.test.ts[2m > [22mM31.1 Reputation Engine & Multi-Metric Penalty Ledger[2m > [22mcorrectly derives Ghost badge when 0 dead places and 0 wins across >= 3 weeks[32m 0[2mms[22m[39m
 [32m✓[39m tests/reputationEngineService.test.ts[2m > [22mM31.1 Reputation Engine & Multi-Metric Penalty Ledger[2m > [22mcalculates head-to-head records and danger seat forces[32m 0[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m6 passed[39m[22m[90m (6)[39m
[2m   Start at [22m 22:47:37
[2m   Duration [22m 618ms[2m (transform 41%, setup 26%, import 25%, tests 4%, worker 4%)[22m

## 6. Client TypeScript Build Verification
### npm --prefix client run build
> client@0.0.0 build
> tsc -b && vite build

[36mvite v8.3.1 [32mbuilding client environment for production...[36m[39m
transforming...
✓ 2345 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.49 kB │ gzip:   0.32 kB
dist/assets/index-BMi5fpVu.css  167.70 kB │ gzip:  20.56 kB
dist/assets/index-Diq1_fbC.js   625.87 kB │ gzip: 181.55 kB

[32m✓ built in 2.46s[39m
