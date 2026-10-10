# M32.1 EVIDENCE BUNDLE: WALL OF SHAME 3-TAB CONSOLIDATION & FAILURE TO APPEAR
Date: 2026-10-10T06:15:38.942Z
Baseline E_SHA: 2176ea28c57db1edfb284f2b7578aa9f6da97d3d
Governing Authority: R-32.1-FALLBACK

## 1. Baseline Git Hygiene & Working Tree Porcelain (at E_SHA)
?? scripts/generate_m32_1_evidence.js

### git rev-parse HEAD
2176ea28c57db1edfb284f2b7578aa9f6da97d3d

### git rev-parse HEAD~1
f89fd664a2ced84f21dfd6531ccc9b9106567094

## 2. Commit Ancestry & Decision #53 Push Verification
### git log -n 5 --oneline
2176ea2 feat(phase32): implement M32.1 Wall of Shame 3-Tab consolidation, Ladder autopsy, and Failure to Appear engine
f89fd66 docs: compile complete M31.2 raw evidence bundle
20e81d1 feat(navigation): wire 5th PROFILE tab and route mounting into bottom nav bar
742b070 docs: compile complete M31.1 raw evidence bundle
7b206ba feat(phase31): implement M31.1 User Profile, 3D Trading Card, and Season Rap Sheet

### git reflog -n 5
2176ea2 HEAD@{0}: commit: feat(phase32): implement M32.1 Wall of Shame 3-Tab consolidation, Ladder autopsy, and Failure to Appear engine
f89fd66 HEAD@{1}: checkout: moving from feat/phase31-profile-rapsheet to feat/phase32-wall-of-shame-consolidation
f89fd66 HEAD@{2}: commit: docs: compile complete M31.2 raw evidence bundle
20e81d1 HEAD@{3}: commit: feat(navigation): wire 5th PROFILE tab and route mounting into bottom nav bar
742b070 HEAD@{4}: commit: docs: compile complete M31.1 raw evidence bundle

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
  - DB Server Time: Fri Oct 09 2026 23:15:41 GMT-0700 (Mountain Standard Time)
  - Hours Since T0 (2026-09-30T06:14:37Z): 240.0179 hrs

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
### npx vitest run tests/wallOfShameConsolidationService.test.ts --reporter=verbose
[1m[30m[46m RUN [49m[39m[22m [36mv5.0.2 [39m[90mC:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em[39m

 [32m✓[39m tests/wallOfShameConsolidationService.test.ts[2m > [22mM32.1 Wall of Shame Consolidation & Failure to Appear Engine[2m > [22mdoes not escalate if 48h deadline has not expired[32m 3[2mms[22m[39m
 [32m✓[39m tests/wallOfShameConsolidationService.test.ts[2m > [22mM32.1 Wall of Shame Consolidation & Failure to Appear Engine[2m > [22menforces Failure to Appear escalation (+2.00 shots to 4.50 total) when NOW > 48h[32m 8[2mms[22m[39m
 [32m✓[39m tests/wallOfShameConsolidationService.test.ts[2m > [22mM32.1 Wall of Shame Consolidation & Failure to Appear Engine[2m > [22mbuilds settled ladder tiers correctly identifying Safe, Danger, and The Pit[32m 3[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m3 passed[39m[22m[90m (3)[39m
[2m   Start at [22m 23:15:47
[2m   Duration [22m 549ms[2m (transform 42%, setup 26%, import 24%, tests 6%, worker 2%)[22m

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
dist/assets/index-Dl9rdS6G.css  169.30 kB │ gzip:  20.63 kB
dist/assets/index-CbRi9AeY.js   656.13 kB │ gzip: 187.98 kB

[32m✓ built in 2.17s[39m
