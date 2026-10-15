# Phase 40 Sprint 1 (P40-S1) Authoritative Evidence Bundle (v67)

- **Authorizing Ruling**: P39-CLOSE-2026-10-14-01
- **Milestone**: P40_S1 (Opening Corrections + Pass 4: Sweat Receipts, Season Story & Weekly Recap PNG Export)
- **Branch**: feat/p37-shell-auth-openslate
- **Phase 39 Closing Parent SHA**: 080af72fdb9297e8620363b6718de49015454567
- **Stage 1 Implementation SHA (E_SHA)**: 2bcab46537baa0ce458eebe26a465a048b16ae08
- **Generated Timestamp (UTC)**: 2026-10-15T03:11:15Z
- **APK Artifact**: pickem-v40-s1.apk (versionCode 67, versionName 40.1.0)
- **APK Size (Bytes)**: 13943728
- **APK SHA-256**: 91A948E98836EE682E63F035DD77683DAC3AFE123756B53DD22AEC121E83E9B7
- **APK Signature Scheme v2**: true

## Authoritative Vitest Execution Log
~~~text
[1m[30m[46m RUN [49m[39m[22m [36mv5.0.2 [39m[90mC:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em[39m

 [32mΓ£ô[39m tests/phase40_s1_league_memory.test.ts[2m > [22mPhase 40 Sprint 1 (P40-S1): League Memory, Sweat Receipts & Authoritative Story[2m > [22m1. Arbiter Opening Corrections: indefinite articles, rival display name, duel margin movement, and bounded escape scenario gating[32m 3[2mms[22m[39m
 [32mΓ£ô[39m tests/phase40_s1_league_memory.test.ts[2m > [22mPhase 40 Sprint 1 (P40-S1): League Memory, Sweat Receipts & Authoritative Story[2m > [22m2. Session Sweat Receipts: baseline suppression, duplicate suppression, transitions, attribution, context switch reset, and simulation exclusion[32m 2[2mms[22m[39m
 [32mΓ£ô[39m tests/phase40_s1_league_memory.test.ts[2m > [22mPhase 40 Sprint 1 (P40-S1): League Memory, Sweat Receipts & Authoritative Story[2m > [22m3. Season Story Service: distinct states, blocks uncertified settlements, preserves tied ranks, and separates charges from debt[32m 2[2mms[22m[39m
 [32mΓ£ô[39m tests/phase40_s1_league_memory.test.ts[2m > [22mPhase 40 Sprint 1 (P40-S1): League Memory, Sweat Receipts & Authoritative Story[2m > [22m4. Weekly Recap Service: blocks unsettled cards, handles co-winners, revisions, and sanitizes email domains and MAIN26 invite codes[32m 2[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m1. Server-Enforced Registration (POST /api/pools/:pool_id/join)[2m > [22mstrictly rejects missing inviteCode with HTTP 403 and 0 database writes[32m 73[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m1. Server-Enforced Registration (POST /api/pools/:pool_id/join)[2m > [22mstrictly rejects invalid inviteCode with HTTP 403 and 0 database writes[32m 10[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m1. Server-Enforced Registration (POST /api/pools/:pool_id/join)[2m > [22mstrictly rejects MAIN26 inviteCode when targeting a foreign pool with HTTP 403 and 0 database writes[32m 5[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m1. Server-Enforced Registration (POST /api/pools/:pool_id/join)[2m > [22mstrictly rejects forged payloads containing { status: "ACTIVE" } or { role: "ADMIN" } with HTTP 403[32m 17[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m1. Server-Enforced Registration (POST /api/pools/:pool_id/join)[2m > [22mforces legitimate registration with valid inviteCode strictly into PENDING state[32m 7[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m2. Pool-Scoped Adjudication (Decision #20 & Decision #55)[2m > [22mdenies actor with foreign pool ADMIN rights attempting to adjudicate Main League with HTTP 403[32m 7[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m2. Pool-Scoped Adjudication (Decision #20 & Decision #55)[2m > [22mpermits authorized Main League commissioner to adjudicate applicant to ACTIVE[32m 4[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m3. GET Safety (Decision #54)[2m > [22mproves exactly 0 database INSERT, UPDATE, DELETE, or executeRaw operations occur during GET requests[32m 4[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m4. Fail-Closed Context Resolution (Decision #55)[2m > [22mfails closed (HTTP 401) when Authorization header is absent or token is invalid[32m 5[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m4. Fail-Closed Context Resolution (Decision #55)[2m > [22mfails closed (HTTP 404) when pool does not exist in database[32m 3[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m4. Fail-Closed Context Resolution (Decision #55)[2m > [22mfails closed (HTTP 500) without leaking access when database lookup throws an error[32m 9[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m5. App Production Call Site Verification[2m > [22mverifies that client/src/App.tsx directly consumes resolveNavigationVisibility to guard BottomNavigation[32m 2[2mms[22m[39m
 [32mΓ£ô[39m tests/sweatProjectionService.test.ts[2m > [22mPhase 38 Sunday Sweat Projection Engine (Ruling P37-P38-2026-10-12-01)[2m > [22maccurately combines banked final points and active live points[32m 31[2mms[22m[39m
 [32mΓ£ô[39m tests/sweatProjectionService.test.ts[2m > [22mPhase 38 Sunday Sweat Projection Engine (Ruling P37-P38-2026-10-12-01)[2m > [22mcorrectly resolves ties via tiebreaker distance and marks unresolved ties[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/sweatProjectionService.test.ts[2m > [22mPhase 38 Sunday Sweat Projection Engine (Ruling P37-P38-2026-10-12-01)[2m > [22mcalculates swing game card identifying highest leverage matchup[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/sweatProjectionService.test.ts[2m > [22mPhase 38 Sunday Sweat Projection Engine (Ruling P37-P38-2026-10-12-01)[2m > [22mfalls back gracefully on empty or null live scores without corruption or exceptions[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/sweatProjectionService.test.ts[2m > [22mPhase 38 Sunday Sweat Projection Engine (Ruling P37-P38-2026-10-12-01)[2m > [22mstrictly excludes unsubmitted and hidden picks, and guarantees input immutability[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/liveScoreService.test.ts[2m > [22mESPN Live Score Adapter & Circuit Breakers (Ruling C8 Compliance)[2m > [22mmaps valid ESPN scoreboard payload accurately into LiveGame objects[32m 7[2mms[22m[39m
 [32mΓ£ô[39m tests/liveScoreService.test.ts[2m > [22mESPN Live Score Adapter & Circuit Breakers (Ruling C8 Compliance)[2m > [22mfalls back gracefully to empty array on HTTP 500 error without throwing[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/liveScoreService.test.ts[2m > [22mESPN Live Score Adapter & Circuit Breakers (Ruling C8 Compliance)[2m > [22mfalls back gracefully to empty array on offline network failure[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/liveScoreService.test.ts[2m > [22mESPN Live Score Adapter & Circuit Breakers (Ruling C8 Compliance)[2m > [22mfalls back gracefully on malformed JSON payload[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/liveScoreService.test.ts[2m > [22mESPN Live Score Adapter & Circuit Breakers (Ruling C8 Compliance)[2m > [22mmaps STATUS_HALFTIME accurately to IN_PROGRESS/LIVE and pins scoreboard week query[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/liveScoreService.test.ts[2m > [22mESPN Live Score Adapter & Circuit Breakers (Ruling C8 Compliance)[2m > [22mexercises integrated consumer state preservation: isolates telemetry from user picks and kickoff locks[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/phase39_s1_dependable_info.test.ts[2m > [22mPhase 39 Sprint 1 (P39-S1): Dependable Information & Mathematical Truth[2m > [22m1. resolves PRE_KICKOFF vs LIVE_IN_PROGRESS vs AWAITING_SETTLEMENT vs SETTLED states and suppresses false 0-0 scores before kickoff[32m 5[2mms[22m[39m
 [32mΓ£ô[39m tests/phase39_s1_dependable_info.test.ts[2m > [22mPhase 39 Sprint 1 (P39-S1): Dependable Information & Mathematical Truth[2m > [22m2. separates Draft Complete from Submitted and Partial Kickoff Locks (Decision #66)[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/phase39_s1_dependable_info.test.ts[2m > [22mPhase 39 Sprint 1 (P39-S1): Dependable Information & Mathematical Truth[2m > [22m3. computes exact +1 / -1 Radar Duel outcome branches and 2 PT OUTCOME SPAN instead of +-2 PTS NET SWING[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/phase39_s1_dependable_info.test.ts[2m > [22mPhase 39 Sprint 1 (P39-S1): Dependable Information & Mathematical Truth[2m > [22m4. filters out unanimous shared picks from League Swing Game selection and avoids podium language in a 2-player field[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/phase39_s1_dependable_info.test.ts[2m > [22mPhase 39 Sprint 1 (P39-S1): Dependable Information & Mathematical Truth[2m > [22m5. distinguishes unresolved tied ranks from settled tiebreakers and formats shot units & spreads cleanly[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/phase39_s1_dependable_info.test.ts[2m > [22mPhase 39 Sprint 1 (P39-S1): Dependable Information & Mathematical Truth[2m > [22m6. verifies Pass-3 signature algorithms: buildPersonalRootingQueue, evaluateLateGameEscape, summarizeNemesisRecord, and classifyPickDistributionBadge[32m 4[2mms[22m[39m
 [32mΓ£ô[39m tests/rivalryShowdownService.test.ts[2m > [22mPhase 38 Sprint 2: Rivalry Showdown Engine (Ruling P37-P38-2026-10-12-01)[2m > [22mcorrectly categorizes opposite picks as battlegrounds and shared picks as neutral leverage[32m 6[2mms[22m[39m
 [32mΓ£ô[39m tests/rivalryShowdownService.test.ts[2m > [22mPhase 38 Sprint 2: Rivalry Showdown Engine (Ruling P37-P38-2026-10-12-01)[2m > [22mcalculates exact branch arithmetic demonstrating two-point net swing on opposite picks[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/rivalryShowdownService.test.ts[2m > [22mPhase 38 Sprint 2: Rivalry Showdown Engine (Ruling P37-P38-2026-10-12-01)[2m > [22mdeterministically selects the Duel Decider prioritizing live in-progress battlegrounds[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/rivalryShowdownService.test.ts[2m > [22mPhase 38 Sprint 2: Rivalry Showdown Engine (Ruling P37-P38-2026-10-12-01)[2m > [22mexcludes hidden or unsubmitted picks and preserves strict immutability[32m 2[2mms[22m[39m
 [32mΓ£ô[39m tests/nflCalendarService.test.ts[2m > [22mNFL Calendar Service & Automatic Rollover[2m > [22mevaluates Tue Oct 6 ΓÇô Mon Oct 12, 2026 as Week 5[32m 3[2mms[22m[39m
 [32mΓ£ô[39m tests/nflCalendarService.test.ts[2m > [22mNFL Calendar Service & Automatic Rollover[2m > [22mevaluates Tue Oct 13 ΓÇô Mon Oct 19, 2026 as Week 6[32m 0[2mms[22m[39m
 [32mΓ£ô[39m tests/nflCalendarService.test.ts[2m > [22mNFL Calendar Service & Automatic Rollover[2m > [22mevaluates Tue Oct 20 ΓÇô Mon Oct 26, 2026 as Week 7[32m 0[2mms[22m[39m
 [32mΓ£ô[39m tests/nflCalendarService.test.ts[2m > [22mNFL Calendar Service & Automatic Rollover[2m > [22mdefaults to 6 for present Tuesday morning Oct 13, 2026 date[32m 0[2mms[22m[39m

[2m Test Files [22m [1m[32m7 passed[39m[22m[90m (7)[39m
[2m      Tests [22m [1m[32m41 passed[39m[22m[90m (41)[39m
[2m   Start at [22m 20:09:50
[2m   Duration [22m 6.53s[2m (import 46%, transform 35%, setup 12%, tests 6%, worker 2%)[22m

[2m    Isolate [22m [33m7 workers spawned[39m[2m ┬╖ ~260ms startup each (spawn + environment, per file)[22m
[2m            [22m [2mat least ~1.56s faster with [22m[33misolate: false[39m[2m ΓÇö reuses workers across files instead of one per file[22m
~~~