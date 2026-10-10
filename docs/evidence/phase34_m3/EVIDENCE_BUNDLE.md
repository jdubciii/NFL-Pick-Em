# M34.3 EVIDENCE BUNDLE: VIDEO-FIRST REELS & NARRATIVE BADGE RECEIPTS
Date: 2026-10-10T19:19:22.396Z
Baseline E_SHA: e26f3cd23a1be85783aeeca62d1da08449bbf80b
Governing Authority: R-34.3-FALLBACK

## 1. Baseline Git Hygiene & Working Tree Porcelain (at E_SHA)
?? scripts/generate_m34_3_evidence.js

### git rev-parse HEAD
e26f3cd23a1be85783aeeca62d1da08449bbf80b

### git rev-parse HEAD~1
1e82edafc4e7cb337a3d52f8086284de125ce4c7

## 2. Commit Ancestry & Decision #53 Push Verification
### git log -n 5 --oneline
e26f3cd fix(phase34): implement video-first Reels feed, compact tribunal drawer, and narrative badge receipts
1e82eda docs: compile complete M34.2 raw evidence bundle
1783de2 fix(phase34): reconcile Radar mathematical integrity, enforce 14-game slate parity, and reorder above-the-fold gameday sweat
a11c884 docs: compile complete M34.1 raw evidence bundle
f761bc6 fix(phase34): reconcile charter discrete tiers, inject target-lock logo, fix card mirror flip, and de-jargon copy

### git reflog -n 5
e26f3cd HEAD@{0}: commit: fix(phase34): implement video-first Reels feed, compact tribunal drawer, and narrative badge receipts
1e82eda HEAD@{1}: reset: moving to 1e82edafc4e7cb337a3d52f8086284de125ce4c7
1e82eda HEAD@{2}: reset: moving to 1e82edafc4e7cb337a3d52f8086284de125ce4c7
ef8c77a HEAD@{3}: commit: docs: compile complete M34.3 raw evidence bundle
f3c4094 HEAD@{4}: commit: fix(phase34): implement video-first Reels feed, compact tribunal drawer, and narrative badge receipts

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
  - DB Server Time: Sat Oct 10 2026 12:19:25 GMT-0700 (Mountain Standard Time)
  - Hours Since T0 (2026-09-30T06:14:37Z): 253.0801 hrs

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
### npx vitest run tests/shameVideoReelsExperience.test.ts --reporter=verbose
[1m[30m[46m RUN [49m[39m[22m [36mv5.0.2 [39m[90mC:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em[39m

 [32m✓[39m tests/shameVideoReelsExperience.test.ts[2m > [22mM34.3 Video-First Experience & Narrative Badge Receipts[2m > [22mgenerates specific defining moment receipts for Escape Artist badge[32m 3[2mms[22m[39m
 [32m✓[39m tests/shameVideoReelsExperience.test.ts[2m > [22mM34.3 Video-First Experience & Narrative Badge Receipts[2m > [22mgenerates specific defining moment receipts for Dead Place Monarch badge[32m 0[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m2 passed[39m[22m[90m (2)[39m
[2m   Start at [22m 12:19:28
[2m   Duration [22m 554ms[2m (transform 42%, setup 29%, import 23%, worker 4%, tests 3%)[22m

## 6. Client TypeScript Build Verification
### npm --prefix client run build
> client@0.0.0 build
> tsc -b && vite build

[36mvite v8.3.1 [32mbuilding client environment for production...[36m[39m
transforming...
✓ 2356 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.49 kB │ gzip:   0.32 kB
dist/assets/index-YJaaFUA_.css  168.73 kB │ gzip:  20.73 kB
dist/assets/index-CO3GywmQ.js   650.53 kB │ gzip: 186.58 kB

[32m✓ built in 6.00s[39m
