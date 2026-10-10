# M30.1 EVIDENCE BUNDLE: PRE-GAME TRANSPARENCY & RIVAL CROSSHAIRS
Date: 2026-10-10T04:23:52.614Z
Baseline E_SHA: daa7e2e2edc4bb71391469aa558b92aea4cd03eb
Governing Authority: R-30.1-FALLBACK

## 1. Baseline Git Hygiene & Working Tree Porcelain (at E_SHA)
?? scripts/generate_m30_1_evidence.js

### git rev-parse HEAD
daa7e2e2edc4bb71391469aa558b92aea4cd03eb

### git rev-parse HEAD~1
dc88303f41e24395c827a6abd3f539cfbfc55008

## 2. Commit Ancestry & Decision #53 Push Verification
### git log -n 5 --oneline
daa7e2e feat(phase30): implement M30.1 Pre-Game Transparency, Consensus Dimming, Lone Wolf indicator, and Rival Crosshairs
dc88303 docs: compile complete M29.2 raw evidence bundle
02574fb feat(phase29): implement M29.2 Tribunal Adjudication, Wall of Shame feed, and dispute resolution
41486d4 docs: compile complete M29.1 raw evidence bundle
40c59a5 feat(phase29): implement M29.1 Confessional Booth HUD, Social Tribunal, and Punishment FSM

### git reflog -n 5
daa7e2e HEAD@{0}: commit: feat(phase30): implement M30.1 Pre-Game Transparency, Consensus Dimming, Lone Wolf indicator, and Rival Crosshairs
dc88303 HEAD@{1}: checkout: moving from feat/phase29-punishment-tribunal to feat/phase30-pregame-crosshairs
dc88303 HEAD@{2}: commit: docs: compile complete M29.2 raw evidence bundle
02574fb HEAD@{3}: commit: feat(phase29): implement M29.2 Tribunal Adjudication, Wall of Shame feed, and dispute resolution
41486d4 HEAD@{4}: commit: docs: compile complete M29.1 raw evidence bundle

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
  - DB Server Time: Fri Oct 09 2026 21:23:54 GMT-0700 (Mountain Standard Time)
  - Hours Since T0 (2026-09-30T06:14:37Z): 238.1549 hrs

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
### npx vitest run tests/pregameTopologyService.test.ts --reporter=verbose
[1m[30m[46m RUN [49m[39m[22m [36mv5.0.2 [39m[90mC:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em[39m

 [32m✓[39m tests/pregameTopologyService.test.ts[2m > [22mM30.1 Pre-Game Topology, Consensus Dimming & Rival Crosshairs[2m > [22menforces Finding 5.6 Anti-Peeking Cohort Floor: returns AWAITING_COHORT when N < 3[32m 6[2mms[22m[39m
 [32m✓[39m tests/pregameTopologyService.test.ts[2m > [22mM30.1 Pre-Game Topology, Consensus Dimming & Rival Crosshairs[2m > [22munlocks READY state and computes distributions when cohort floor N >= 3 is met[32m 1[2mms[22m[39m
 [32m✓[39m tests/pregameTopologyService.test.ts[2m > [22mM30.1 Pre-Game Topology, Consensus Dimming & Rival Crosshairs[2m > [22maccurately identifies 10/10 Consensus rows for dimming[32m 1[2mms[22m[39m
 [32m✓[39m tests/pregameTopologyService.test.ts[2m > [22mM30.1 Pre-Game Topology, Consensus Dimming & Rival Crosshairs[2m > [22maccurately identifies Lone Wolf contrarian picks (e.g. 9-1 or (N-1)-1 split)[32m 1[2mms[22m[39m
 [32m✓[39m tests/pregameTopologyService.test.ts[2m > [22mM30.1 Pre-Game Topology, Consensus Dimming & Rival Crosshairs[2m > [22mcomputes 1-on-1 Duel comparison, swing points, and Vegas Tale of the Tape probabilities[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m5 passed[39m[22m[90m (5)[39m
[2m   Start at [22m 21:23:59
[2m   Duration [22m 758ms[2m (transform 45%, setup 26%, import 21%, tests 5%, worker 3%)[22m

## 6. Client TypeScript Build Verification
### npm --prefix client run build
> client@0.0.0 build
> tsc -b && vite build

[36mvite v8.3.1 [32mbuilding client environment for production...[36m[39m
transforming...
✓ 2340 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.49 kB │ gzip:   0.32 kB
dist/assets/index--CA-PXWq.css  163.19 kB │ gzip:  20.12 kB
dist/assets/index-T0VuzDx1.js   616.53 kB │ gzip: 179.60 kB

[32m✓ built in 2.35s[39m
