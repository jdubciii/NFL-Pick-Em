# M34.1 EVIDENCE BUNDLE: CONSUMER TRUTH & CHARTER TIER RECONCILIATION
Date: 2026-10-10T16:07:03.550Z
Baseline E_SHA: f761bc663758efba9c7bd2a2eb1b0106a2656ed5
Governing Authority: R-34.1-FALLBACK

## 1. Baseline Git Hygiene & Working Tree Porcelain (at E_SHA)
?? scripts/generate_m34_1_evidence.js

### git rev-parse HEAD
f761bc663758efba9c7bd2a2eb1b0106a2656ed5

### git rev-parse HEAD~1
a4ee53dde54ee1d531db722a5e3eb2c98a314e5f

## 2. Commit Ancestry & Decision #53 Push Verification
### git log -n 5 --oneline
f761bc6 fix(phase34): reconcile charter discrete tiers, inject target-lock logo, fix card mirror flip, and de-jargon copy
a4ee53d docs: compile complete M33.1 raw evidence bundle
b133600 feat(phase33): implement M33.1 Visual tokens, Target-Lock branding, and asynchronous splash performance
70fca47 docs: compile complete M32.1 raw evidence bundle
2176ea2 feat(phase32): implement M32.1 Wall of Shame 3-Tab consolidation, Ladder autopsy, and Failure to Appear engine

### git reflog -n 5
f761bc6 HEAD@{0}: commit: fix(phase34): reconcile charter discrete tiers, inject target-lock logo, fix card mirror flip, and de-jargon copy
a4ee53d HEAD@{1}: checkout: moving from feat/phase33-visual-identity-branding to feat/phase34-consumer-truth-cleanup
a4ee53d HEAD@{2}: commit: docs: compile complete M33.1 raw evidence bundle
b133600 HEAD@{3}: commit: feat(phase33): implement M33.1 Visual tokens, Target-Lock branding, and asynchronous splash performance
70fca47 HEAD@{4}: checkout: moving from feat/phase32-wall-of-shame-consolidation to feat/phase33-visual-identity-branding

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
  - DB Server Time: Sat Oct 10 2026 09:07:06 GMT-0700 (Mountain Standard Time)
  - Hours Since T0 (2026-09-30T06:14:37Z): 249.8747 hrs

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

 [32m✓[39m tests/wallOfShameConsolidationService.test.ts[2m > [22mM34.1 Wall of Shame Discrete Charter Tiers & Consumer Logic[2m > [22menforces League Charter discrete tiers: 1st=0s, 2nd-6th=1s, 7th-9th=2s, 10th=2.5s[32m 5[2mms[22m[39m
 [32m✓[39m tests/wallOfShameConsolidationService.test.ts[2m > [22mM34.1 Wall of Shame Discrete Charter Tiers & Consumer Logic[2m > [22mcorrectly handles 48h Failure to Appear escalation[32m 1[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m2 passed[39m[22m[90m (2)[39m
[2m   Start at [22m 09:07:15
[2m   Duration [22m 644ms[2m (transform 42%, setup 29%, import 22%, tests 4%, worker 3%)[22m

## 6. Client TypeScript Build Verification
### npm --prefix client run build
> client@0.0.0 build
> tsc -b && vite build

[36mvite v8.3.1 [32mbuilding client environment for production...[36m[39m
transforming...
✓ 2358 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.49 kB │ gzip:   0.32 kB
dist/assets/index-BoQlxTmS.css  168.11 kB │ gzip:  20.70 kB
dist/assets/index-Dk7xe2zj.js   654.50 kB │ gzip: 187.57 kB

[32m✓ built in 2.56s[39m
