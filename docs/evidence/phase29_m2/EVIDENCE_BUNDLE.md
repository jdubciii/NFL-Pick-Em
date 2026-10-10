# M29.2 EVIDENCE BUNDLE: TRIBUNAL ADJUDICATION & WALL OF SHAME REELS
Date: 2026-10-10T04:02:48.700Z
Baseline E_SHA: 02574fb0583e111c25b6347bc54b05ff0c330ccb
Governing Authority: R-29.2-FALLBACK

## 1. Baseline Git Hygiene & Working Tree Porcelain (at E_SHA)
?? scripts/generate_m29_2_evidence.js

### git rev-parse HEAD
02574fb0583e111c25b6347bc54b05ff0c330ccb

### git rev-parse HEAD~1
41486d40fcaf2a1b53bb9e34fa45180a7d971b81

## 2. Commit Ancestry & Decision #53 Push Verification
### git log -n 5 --oneline
02574fb feat(phase29): implement M29.2 Tribunal Adjudication, Wall of Shame feed, and dispute resolution
41486d4 docs: compile complete M29.1 raw evidence bundle
40c59a5 feat(phase29): implement M29.1 Confessional Booth HUD, Social Tribunal, and Punishment FSM
5d37a3b docs: compile complete M28.2 raw evidence bundle
92b3e37 feat(phase28): implement M28.2 Momentum sparklines, rivalry leverage drawer, and slate finalization engine

### git reflog -n 5
02574fb HEAD@{0}: commit: feat(phase29): implement M29.2 Tribunal Adjudication, Wall of Shame feed, and dispute resolution
41486d4 HEAD@{1}: commit: docs: compile complete M29.1 raw evidence bundle
40c59a5 HEAD@{2}: commit: feat(phase29): implement M29.1 Confessional Booth HUD, Social Tribunal, and Punishment FSM
5d37a3b HEAD@{3}: checkout: moving from feat/phase28-radar-live-sweat to feat/phase29-punishment-tribunal
5d37a3b HEAD@{4}: commit: docs: compile complete M28.2 raw evidence bundle

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
  - DB Server Time: Fri Oct 09 2026 21:02:50 GMT-0700 (Mountain Standard Time)
  - Hours Since T0 (2026-09-30T06:14:37Z): 237.8039 hrs

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
### npx vitest run tests/radarLiveConsequencesService.test.ts tests/slateFinaleSettlementService.test.ts tests/punishmentFsmService.test.ts tests/tribunalAdjudicationService.test.ts --reporter=verbose
[1m[30m[46m RUN [49m[39m[22m [36mv5.0.2 [39m[90mC:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em[39m

 [32m✓[39m tests/punishmentFsmService.test.ts[2m > [22mM29.1 Punishment FSM & Double-Entry Ledger Offsets[2m > [22mcreates initial penalty submission in PENDING_SUBMISSION state[32m 5[2mms[22m[39m
 [32m✓[39m tests/punishmentFsmService.test.ts[2m > [22mM29.1 Punishment FSM & Double-Entry Ledger Offsets[2m > [22mtransitions to UNDER_REVIEW and locks 24-hour dispute window[32m 3[2mms[22m[39m
 [32m✓[39m tests/punishmentFsmService.test.ts[2m > [22mM29.1 Punishment FSM & Double-Entry Ledger Offsets[2m > [22mrejects disputes with less than 50 characters of justification[32m 2[2mms[22m[39m
 [32m✓[39m tests/punishmentFsmService.test.ts[2m > [22mM29.1 Punishment FSM & Double-Entry Ledger Offsets[2m > [22mtransitions to DISPUTED when a valid 50+ char infraction is filed[32m 1[2mms[22m[39m
 [32m✓[39m tests/punishmentFsmService.test.ts[2m > [22mM29.1 Punishment FSM & Double-Entry Ledger Offsets[2m > [22menforces 24-hour timestamp lock: rejects premature clearance[32m 1[2mms[22m[39m
 [32m✓[39m tests/punishmentFsmService.test.ts[2m > [22mM29.1 Punishment FSM & Double-Entry Ledger Offsets[2m > [22mclears penalty after 24h and emits double-entry offsetting ledger credit (Decision #61)[32m 1[2mms[22m[39m
 [32m✓[39m tests/punishmentFsmService.test.ts[2m > [22mM29.1 Punishment FSM & Double-Entry Ledger Offsets[2m > [22mawards gold border nomination status when video receives > 5 nominations[32m 1[2mms[22m[39m
 [32m✓[39m tests/tribunalAdjudicationService.test.ts[2m > [22mM29.2 Tribunal Adjudication & Dispute Resolution[2m > [22menforces juror recusal: rejects votes from the Defendant[32m 3[2mms[22m[39m
 [32m✓[39m tests/tribunalAdjudicationService.test.ts[2m > [22mM29.2 Tribunal Adjudication & Dispute Resolution[2m > [22menforces juror recusal: rejects votes from the Accuser[32m 0[2mms[22m[39m
 [32m✓[39m tests/tribunalAdjudicationService.test.ts[2m > [22mM29.2 Tribunal Adjudication & Dispute Resolution[2m > [22mprevents duplicate voting by the same juror[32m 0[2mms[22m[39m
 [32m✓[39m tests/tribunalAdjudicationService.test.ts[2m > [22mM29.2 Tribunal Adjudication & Dispute Resolution[2m > [22madjudicates conviction at 5 UPHOLD votes and escalates debt to 3.00 (Contempt of Court)[32m 1[2mms[22m[39m
 [32m✓[39m tests/tribunalAdjudicationService.test.ts[2m > [22mM29.2 Tribunal Adjudication & Dispute Resolution[2m > [22macquits defendant in a 4-4 tie (innocent until proven guilty) and emits -2.50 credit[32m 0[2mms[22m[39m
 [32m✓[39m tests/radarLiveConsequencesService.test.ts[2m > [22mM28.1.1 Radar Live Consequences Engine & Decision #69 isDeadPlace[2m > [22mcorrectly grades ATS picks against Tuesday frozen lines[32m 2[2mms[22m[39m
 [32m✓[39m tests/radarLiveConsequencesService.test.ts[2m > [22mM28.1.1 Radar Live Consequences Engine & Decision #69 isDeadPlace[2m > [22menforces Decision #69: 10th Place emits explicit isDeadPlace: true and 2.50 absolute penalty[32m 4[2mms[22m[39m
 [32m✓[39m tests/radarLiveConsequencesService.test.ts[2m > [22mM28.1.1 Radar Live Consequences Engine & Decision #69 isDeadPlace[2m > [22mdetects Red Zone threat when opponent has possession inside the 20[32m 1[2mms[22m[39m
 [32m✓[39m tests/radarLiveConsequencesService.test.ts[2m > [22mM28.1.1 Radar Live Consequences Engine & Decision #69 isDeadPlace[2m > [22mINV-6: executes in-memory What-If score adjustments without mutating base game state[32m 1[2mms[22m[39m
 [32m✓[39m tests/slateFinaleSettlementService.test.ts[2m > [22mM28.2 Momentum, Rivalry Leverage & Slate Finalization[2m > [22mcorrectly calculates Rivalry Leverage and delta picks between users[32m 8[2mms[22m[39m
 [32m✓[39m tests/slateFinaleSettlementService.test.ts[2m > [22mM28.2 Momentum, Rivalry Leverage & Slate Finalization[2m > [22mtriggers Proximity Warning when 9th vs 10th differential is less than 3.0 points[32m 1[2mms[22m[39m
 [32m✓[39m tests/slateFinaleSettlementService.test.ts[2m > [22mM28.2 Momentum, Rivalry Leverage & Slate Finalization[2m > [22maccurately computes momentum trend classification from rolling history snapshots[32m 1[2mms[22m[39m
 [32m✓[39m tests/slateFinaleSettlementService.test.ts[2m > [22mM28.2 Momentum, Rivalry Leverage & Slate Finalization[2m > [22menforces Decision #55 & Decision #69 during Slate Settlement when all games are FINAL[32m 3[2mms[22m[39m
 [32m✓[39m tests/slateFinaleSettlementService.test.ts[2m > [22mM28.2 Momentum, Rivalry Leverage & Slate Finalization[2m > [22mrejects premature slate finalization if any game is IN_PROGRESS[32m 1[2mms[22m[39m

[2m Test Files [22m [1m[32m4 passed[39m[22m[90m (4)[39m
[2m      Tests [22m [1m[32m21 passed[39m[22m[90m (21)[39m
[2m   Start at [22m 21:02:55
[2m   Duration [22m 1.98s[2m (setup 35%, transform 32%, import 20%, tests 8%, worker 5%)[22m

[2m    Isolate [22m [33m4 workers spawned[39m[2m · ~294ms startup each (spawn + environment, per file)[22m
[2m            [22m [2mat least ~882ms faster with [22m[33misolate: false[39m[2m — reuses workers across files instead of one per file[22m

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
dist/assets/index-KBE4zVee.css  162.62 kB │ gzip:  20.07 kB
dist/assets/index-Cv_wYWMT.js   656.11 kB │ gzip: 187.42 kB

[32m✓ built in 1.97s[39m
