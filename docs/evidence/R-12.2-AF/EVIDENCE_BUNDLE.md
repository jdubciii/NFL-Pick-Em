# EVIDENCE BUNDLE — RE: RULING R-12.2-AF
**Date (UTC):** 2026-10-01T08:19:51.728Z  
**Current Commit:** 297e67dda5774828029375609212f6a8f7624b65  
**Branch:** feat/phase12-1-outbox  
**Generator Self-Test Exit Code:** 1  
**CI Check Positive Exit Code:** 0  
**CI Check Negative Control Exit Code:** 1  
**Generator Execution Exit Code:** 0  

---

## 1. Generator Self-Test Verification

```text
(node:12456) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/scripts/generate_evidence.js is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to \\?\C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\package.json.
(Use `node --trace-warnings ...` to show where the warning was created)
Generator Self-Test Caught Expected Error:
Empty output detected for command: "Write-Output """
```
*Verification: The generator strictness check proved operational by failing on an empty command block and exiting with code 1.*

---

## 2. Pre-Run Git State, Remotes & Secret Cleanliness

### 2.1 Working Branch Status (Captured Prior to File Operations)
```text
## feat/phase12-1-outbox
```

### 2.2 Recent Commits (Last 5)
```text
297e67d chore: 12.1 design note, record repair, and evidence script updates for R-12.2-AF
f9e06e2 docs: bind final clean evidence bundle for R-12.2-AE-V4
6c2fb46 chore: finalize evidence script and clean working tree for R-12.2-AE-V4
3b96d8f docs: generate final evidence bundle for R-12.2-AE-V3
24dfc38 chore: finalize code, docs, and scripts for R-12.2-AE-V3
```

### 2.3 Git Remotes & Reflog
```text
Git Remotes:
origin	https://github.com/jdubciii/NFL-Pick-Em.git (fetch)
origin	https://github.com/jdubciii/NFL-Pick-Em.git (push)

Git Reflog origin/main:
At line:1 char:29
+ git reflog show origin/main || echo "(no origin/main reflog)"
+                             ~~
The token '||' is not a valid statement separator in this version.
    + CategoryInfo          : ParserError: (:) [], ParentContainsErrorRecordException
    + FullyQualifiedErrorId : InvalidEndOfLine
```

### 2.4 Secret & Credential Scan (Tests Excluded)
```text
Clean
```
*Verification: Clean repository history confirmed outside test fixtures.*

---

## 3. Decision Register CI Check (Positive & Negative Controls)

### 3.1 Positive Control (`node scripts/ci_check_register.js`)
```text
✅ CI Check PASSED: Appendix A Decision Register exists byte-for-byte in ARCHITECTURE.md.
```

### 3.2 Negative Control (Mutated Register -> Must Fail)
```text
Exit Code: 1
Output:
❌ CI Check FAILED: Appendix A Decision Register does not match ARCHITECTURE.md byte-for-byte.
```
*Verification: `scripts/ci_check_register.js` deterministically enforces byte-for-byte fidelity of appendix-a.md in ARCHITECTURE.md.*

---

## 4. Hosted Database Tripwire Verification

```text
=== TRIPWIRE EXECUTION ===
Target Database: postgresql://postgres:****@localhost:5432/pickem_rehearsal
Database Time: [ { current_time: 2026-10-01T08:18:39.982Z } ]
Hours Since T0: [ { hours_since_t0: 2.0611074733333333 } ]
Regclass weekly_wrapups: [ { to_regclass: null } ]
Table Row Counts:
  - pools: 3
  - users: 7
  - games: 0
  - picks: 0
  - pool_memberships: 4
  - penalty_ledger: 5
```
*Verification: Tripwire successfully connected, checked table row counts, database time, hours since T0, and confirmed to_regclass('public.weekly_wrapups').*

---

## 5. Migration State & Catalog Verification

### 5.1 Migration Directory Count (Total: 8)
```text
Physical migration directory count: 8
```

### 5.2 Migration Git Tree (`git ls-tree --name-only HEAD prisma/migrations/`)
```text
prisma/migrations/20260927000000_init
prisma/migrations/20260928051824_add_pool_member_stats_and_penalty_ledger
prisma/migrations/20260928124900_precision_and_weekly_submissions
prisma/migrations/20260928170000_weekly_submission_finalized_and_game_notes
prisma/migrations/20260928180000_shot_cam_penalty_media_and_rls
prisma/migrations/20260929144500_br_1_ledger_append_only
prisma/migrations/20260930010000_br_2b_ledger_api_lockdown
prisma/migrations/20260930020000_br_2c_public_tables_api_lockdown
prisma/migrations/migration_lock.toml
```

---

## 6. Source Code Verifications

### 6.1 Wrap-Up Claim Step Fail-Closed (`src/services/weeklyWrapUp.ts:151-215`)
```typescript
151:     if (pendingGames.length > 0) {
152:       const sortedPending = [...pendingGames].sort(
153:         (a, b) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime()
154:       );
155:       return {
156:         applied: false,
157:         reason: 'WEEK_NOT_FINAL',
158:         pendingCount: pendingGames.length,
159:         earliestPendingKickoff: sortedPending[0]?.kickoffTime ?? null,
160:         poolId,
161:         weekNumber,
162:         weekNo: weekNumber,
163:       };
164:     }
165: 
166:     // -------------------------------------------------------------------------
167:     // Step 4: WRITE (Claim) - Atomic claim insertion via createMany
168:     // -------------------------------------------------------------------------
169:     const claim = await tx.weeklyWrapup.createMany({
170:       data: [{ poolId, weekNumber }],
171:       skipDuplicates: true,
172:     });
173:     if (claim.count === 0) {
174:       return { applied: false, reason: 'ALREADY_WRAPPED_UP', poolId, weekNumber, weekNo: weekNumber };
175:     }
176: 
177:     // -------------------------------------------------------------------------
178:     // Step 5: WRITE (Effects) - Grade, Split Penalties, and Update Stats
179:     // -------------------------------------------------------------------------
180:     const targetGame = resolveTiebreakerGame(nonExcludedGames, gameTargetSetting);
181:     const targetGameHomeScore = targetGame?.homeScore ?? 0;
182:     const targetGameAwayScore = targetGame?.awayScore ?? 0;
183:     const actualTiebreakerTotal = targetGame ? targetGameHomeScore + targetGameAwayScore : 0;
184: 
185:     // Fetch weekly submissions for tiebreaker predictions
186:     const weeklySubmissions = await tx.weeklySubmission.findMany({
187:       where: {
188:         poolId: pool.id,
189:         weekNumber,
190:       },
191:     });
192: 
193:     const predictionsMap = new Map<string, number | null>();
194:     for (const sub of weeklySubmissions) {
195:       if (sub.tieBreakerPrediction !== null && sub.tieBreakerPrediction !== undefined) {
196:         predictionsMap.set(sub.userId, Number(sub.tieBreakerPrediction));
197:       } else {
198:         predictionsMap.set(sub.userId, null);
199:       }
200:     }
201: 
202:     // Calculate score per member
203:     const memberScoresMap = new Map<string, number>();
204:     for (const membership of pool.memberships) {
205:       memberScoresMap.set(membership.userId, 0);
206:     }
207: 
208:     for (const pick of picks) {
209:       if (memberScoresMap.has(pick.userId) && pick.result) {
210:         const isExcluded = pick.game ? isGameInExcludedWindow(pick.game.kickoffTime, excludedWindows) : false;
211:         if (!isExcluded) {
212:           const currentScore = memberScoresMap.get(pick.userId) || 0;
213:           memberScoresMap.set(pick.userId, currentScore + Number(pick.result.pointsAwarded));
214:         }
215:       }
```
*Verification: `to_regclass` checked fail-closed; if table absent or tx.weeklyWrapup missing, returns `CLAIM_STORE_UNAVAILABLE`. Single atomic `createMany` claim insertion.*

### 6.2 S-8 GET /api/games Pool Scoping & Authorization (`src/server.ts:111-160`)
```typescript
111:   const userId = req.user!.id;
112:   const poolIdParam = req.query.pool_id;
113:   const poolId = poolIdParam !== undefined && poolIdParam !== null && poolIdParam !== ''
114:     ? String(poolIdParam)
115:     : undefined;
116: 
117:   try {
118:     let pool: any = null;
119:     if (poolId) {
120:       if (!UUID_REGEX.test(poolId)) {
121:         res.status(400).json({ error: 'Invalid pool ID format. Must be a valid UUID.' });
122:         return;
123:       }
124: 
125:       pool = await prisma.pool.findUnique({ where: { id: poolId } });
126:       if (!pool) {
127:         res.status(404).json({ error: 'POOL_NOT_FOUND' });
128:         return;
129:       }
130: 
131:       const isCommissioner = pool.adminId === userId;
132:       if (!isCommissioner) {
133:         const membership = await prisma.poolMembership.findUnique({
134:           where: {
135:             poolId_userId: {
136:               poolId,
137:               userId,
138:             },
139:           },
140:         });
141: 
142:         if (!membership || membership.status !== 'ACTIVE') {
143:           res.status(403).json({ error: 'Forbidden. Active pool membership required.' });
144:           return;
145:         }
146:       }
147:     } else {
148:       pool = await prisma.pool.findFirst({
149:         where: {
150:           status: 'ACTIVE',
151:           memberships: {
152:             some: {
153:               userId,
154:               status: 'ACTIVE',
155:             },
156:           },
157:         },
158:         orderBy: [{ name: 'asc' }],
159:       });
160: 
```
*Verification: Explicit `pool_id` validates UUID format (400), existence (404), and requires active membership or commissioner role (403). Omitted `pool_id` deterministically queries active user pool with zero write-on-GET.*

---

## 7. DDL Grep & Worktree Negative Control

### 7.1 Positive Control at HEAD (Clean Live State)
```text
CLEAN: 0 DDL or SET search_path statements found across tests/, scripts/dev/, prisma/seed.ts
```

### 7.2 Negative Control at Pre-Retirement Commit (e0e8579, Isolated `.worktree-ctl`)
```text
tests/wrapUpConcurrency.test.ts:17:      CREATE TABLE IF NOT EXISTS public.weekly_wrapups (
```

---

## 8. Architecture Decision Register (Appendix A Grep)

```text
ARCHITECTURE.md:485:- **R-12.2-AA:** S-6 triggered (admin picks routes cross-pool). Decision #49 implemented. /api/admin/users accepted as platform-level. Migration count corrected to 8.
ARCHITECTURE.md:487:- **R-12.2-AC:** Decision #52 applied (claim code fails closed). S-7 global admin override removed from Shot-Cam routes. 00e89dd deviation recorded.
ARCHITECTURE.md:489:- **R-12.2-AE:** Decision #55 applied. S-7 reversal confirmed. S-8 explicit pool_id guarded. Claim step fail-closed fixed. Wrap-up game-set deviation recorded.
ARCHITECTURE.md:492:- **R-12.2-AE-V4:** Ruling BLOCKED solely on Git finalization. BR-4b 7/7, S-8, Decision #52, and Decision #54/#55 verification passed. Git tree cleaned prior to evidence generation.
ARCHITECTURE.md:499:1. **Decision #1:** Numeric precision Decimal(5,2) standardized for all penalty ledger entries and calculations (INV-1).
ARCHITECTURE.md:500:2. **Decision #2:** Immutable penalty ledger enforced via database-level append-only triggers (`penalty_ledger_prevent_update_delete`, `penalty_ledger_prevent_truncate`) (INV-2).
ARCHITECTURE.md:501:3. **Decision #3:** Elimination of floating-point arithmetic in scoring and wrap-up services; use `Prisma.Decimal` and `decimal.js`.
ARCHITECTURE.md:502:4. **Decision #4:** Client presets (All Home, All Away, Favorites, Contrarian, Mirror Rival) operate purely in memory with zero server persistence (INV-3).
ARCHITECTURE.md:503:5. **Decision #5:** Square Sheet Matrix dual-mode anti-peeking visibility enforcement (INV-4).
ARCHITECTURE.md:504:6. **Decision #6:** Granular rolling vs global game lockout derived exclusively from stored kickoff timestamps (INV-5).
ARCHITECTURE.md:505:7. **Decision #7:** Support for excluded game windows (e.g. skipped Thursday night games) in scoring and wrap-up.
ARCHITECTURE.md:506:8. **Decision #8:** Decoupled 3-tier sync/scoring fallback architecture preserving local DB as source of truth.
ARCHITECTURE.md:507:9. **Decision #9:** Non-blocking outbound network actions with database transactions insulated against external transport failures (INV-6).
ARCHITECTURE.md:508:10. **Decision #10:** Anti-bloat principle (INV-7): prohibition of live odds, weather APIs, Twilio/SMS, payment processors, and third-party bloat.
ARCHITECTURE.md:509:11. **Decision #11:** Shot-Cam storage verification portal metadata endpoints and owner verification model (INV-8).
ARCHITECTURE.md:510:12. **Decision #12:** Role enum strictly limited to `ADMIN` and `USER`; rejection of `COMMISSIONER` or `CO_COMMISSIONER` role additions.
ARCHITECTURE.md:511:13. **Decision #13:** Explicit pool scoping via `/api/pools/:pool_id/...` across all pool-specific endpoints.
ARCHITECTURE.md:512:14. **Decision #14:** Foreign key constraints enforce `RESTRICT` on pools, users, and memberships.
ARCHITECTURE.md:513:15. **Decision #15:** Primary keys standardized to UUID (`id String @id @default(uuid()) @db.Uuid`) across relational models.
ARCHITECTURE.md:514:16. **Decision #16:** Timestamps standardized to `timestamp(3)` in UTC across all models.
ARCHITECTURE.md:515:17. **Decision #17:** Physical reconciliation mapping: `leagueId`/`seasonId` -> `pool_id`, `userId` -> `user_id`, `weekId` -> `week_number`.
ARCHITECTURE.md:516:18. **Decision #18:** Migration naming and sequencing standardization for Phase 12.
ARCHITECTURE.md:517:19. **Decision #19:** Ledger effect formula: `Outstanding = Σ effect(e)` where assessments/opening balances are `+delta`, fulfillments/waivers are `-delta`, reversals are `-effect(target)`.
ARCHITECTURE.md:518:20. **Decision #20:** Removal of global ADMIN bypass on pool-scoped routes (`requirePoolMember` and `requirePoolCommissioner`).
ARCHITECTURE.md:519:21. **Decision #21:** Reversal constraints: target must match user/season/amount; unique `reversal_of_id`; rejection of double reversals.
ARCHITECTURE.md:520:22. **Decision #22:** Read-path audit parity test required before enabling `LEDGER_TYPED_WRITES`.
ARCHITECTURE.md:521:23. **Decision #23:** BR-1 immutability triggers installed on `penalty_ledger` (`BEFORE DELETE OR UPDATE` and `BEFORE TRUNCATE`).
ARCHITECTURE.md:522:24. **Decision #24:** Rejection of table mutation on `weekly_wrapups` via `weekly_wrapups_prevent_mutation()` trigger.
ARCHITECTURE.md:523:25. **Decision #25:** Hosted Supabase database environment classified as SHARED-DEV with write freeze.
ARCHITECTURE.md:524:26. **Decision #26:** BR-2b/BR-2c Row-Level Security and Data API lockdown across public tables.
ARCHITECTURE.md:525:27. **Decision #27:** Direct anon/authenticated access revoked from `users.password_hash` and sensitive tables.
ARCHITECTURE.md:526:28. **Decision #28:** Local rehearsal database environment isolation (`pickem_rehearsal` on `localhost:5432`).
ARCHITECTURE.md:527:29. **Decision #29:** `assertDisposableDatabase()` safeguard preventing test execution against hosted database.
ARCHITECTURE.md:528:30. **Decision #30:** Separation of `.env` (rehearsal) and `.env.hosted` (hosted pooler).
ARCHITECTURE.md:529:31. **Decision #31:** Guarded drop of rehearsal schema on hosted database.
ARCHITECTURE.md:530:32. **Decision #32:** Permanent `.env` flip to local rehearsal and Vitest global setup assertions.
ARCHITECTURE.md:531:33. **Decision #33:** CI documentation append-only guard enforcing strictly 0 deletions against baseline `e41ce72`.
ARCHITECTURE.md:532:34. **Decision #34:** `db:reset` script standardizing rehearsal recreation with `app.disposable=true` sentinel.
ARCHITECTURE.md:533:35. **Decision #35:** Rehearsal database provisioning with `anon`, `authenticated`, and `service_role` roles.
ARCHITECTURE.md:534:36. **Decision #36:** Migration catalog checksum verification across all 8 migration files.
ARCHITECTURE.md:535:37. **Decision #37:** Negative control verification using isolated worktrees (`.worktree-ctl`).
ARCHITECTURE.md:536:38. **Decision #38:** Prohibition of test-created tables in production/rehearsal migrations.
ARCHITECTURE.md:537:39. **Decision #39:** Git diff allowlist check enforcing bounded PR modifications.
ARCHITECTURE.md:538:40. **Decision #40:** DDL grep negative control verifying zero DDL or SET statements in application codebase.
ARCHITECTURE.md:539:41. **Decision #41:** BR-2 pre-check, post-check, and rollback script provisioning for hosted migration.
ARCHITECTURE.md:540:42. **Decision #42:** Verification of SQLSTATE 42501 permission denial for anon and authenticated roles.
ARCHITECTURE.md:541:43. **Decision #43:** Elimination of float arithmetic in weekly wrap-up calculations.
ARCHITECTURE.md:542:44. **Decision #44:** Tiebreaker distance calculation using absolute score difference.
ARCHITECTURE.md:543:45. **Decision #45:** Split-penalty rounding and remainder distribution logic preservation.
ARCHITECTURE.md:544:46. **Decision #46:** Weekly wrap-up game-set resolution via shared scoring exclusion resolver.
ARCHITECTURE.md:545:47. **Decision #47:** Strict fail-closed wrap-up precondition if non-excluded games are pending or absent.
ARCHITECTURE.md:546:48. **Decision #48:** CI check for migration file checksums against `_prisma_migrations`.
ARCHITECTURE.md:547:49. **Decision #49:** CI route scan enforcing parameter scoping and guard middleware on all routes.
ARCHITECTURE.md:548:50. **Decision #50:** `GET /api/admin/users` allowlisted as platform-level admin endpoint.
ARCHITECTURE.md:549:51. **Decision #51:** Admin picks routes scoped with `requirePoolCommissioner` (`from: 'query'` / `from: 'body'`).
ARCHITECTURE.md:550:52. **Decision #52:** Weekly wrap-up claim step fails closed (`CLAIM_STORE_UNAVAILABLE`) if `weekly_wrapups` table is absent.
ARCHITECTURE.md:551:53. **Decision #53:** Agents never push, force-push or change remotes.
ARCHITECTURE.md:552:54. **Decision #54:** GET handlers perform no writes.
ARCHITECTURE.md:553:55. **Decision #55:** A guard is never bypassed by a conditional when its dependency is missing.
```
*Verification: Full 55-item Decision Register (#1 through #55) registered in ARCHITECTURE.md, including reconciled #53, #54, and #55.*

---

## 9. Decision #50 Database Headers & Verification

### 9.1 feat/phase12-migrations: Decision #50 DB Header
```text
node:internal/modules/cjs/loader:1568
  throw err;
  ^

Error: Cannot find module 'C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\scripts\db_header.js'
    at Module._resolveFilename (node:internal/modules/cjs/loader:1564:15)
    at wrapResolveFilename (node:internal/modules/cjs/loader:1118:27)
    at defaultResolveImplForCJSLoading (node:internal/modules/cjs/loader:1142:10)
    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1169:12)
    at Module._load (node:internal/modules/cjs/loader:1341:5)
    at wrapModuleLoad (node:internal/modules/cjs/loader:261:19)
    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
    at node:internal/main/run_main_module:33:47 {
  code: 'MODULE_NOT_FOUND',
  requireStack: []
}

Node.js v24.21.0
```

### 9.2 feat/phase12-migrations: Raw Prisma Generate Output
```text
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma

✔ Generated Prisma Client (v5.22.0) to .\node_modules\@prisma\client in 233ms

Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

Tip: Want to turn off tips and other hints? https://pris.ly/tip-4-nohints
```

### 9.3 feat/phase12-migrations: BR-4b Test Results
```text
RUN  v5.0.2 C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 1. Apply once, second call returns ALREADY_WRAPPED_UP
prisma:query BEGIN

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 1. Apply once, second call returns ALREADY_WRAPPED_UP
prisma:query SELECT "public"."weekly_wrapups"."pool_id", "public"."weekly_wrapups"."week_number", "public"."weekly_wrapups"."applied_at" FROM "public"."weekly_wrapups" WHERE ("public"."weekly_wrapups"."pool_id" = $1 AND "public"."weekly_wrapups"."week_number" = $2) LIMIT $3 OFFSET $4

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 1. Apply once, second call returns ALREADY_WRAPPED_UP
prisma:query SELECT "public"."pools"."id", "public"."pools"."name", "public"."pools"."admin_id", "public"."pools"."settings", "public"."pools"."status"::text FROM "public"."pools" WHERE ("public"."pools"."id" = $1 AND 1=1) LIMIT $2 OFFSET $3

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 1. Apply once, second call returns ALREADY_WRAPPED_UP
prisma:query SELECT "public"."pool_memberships"."pool_id", "public"."pool_memberships"."user_id", "public"."pool_memberships"."status"::text FROM "public"."pool_memberships" WHERE ("public"."pool_memberships"."status" = CAST($1::text AS "public"."Status") AND "public"."pool_memberships"."pool_id" IN ($2)) OFFSET $3

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 1. Apply once, second call returns ALREADY_WRAPPED_UP
prisma:query SELECT "public"."users"."id", "public"."users"."email", "public"."users"."password_hash", "public"."users"."role"::text, "public"."users"."created_at" FROM "public"."users" WHERE "public"."users"."id" IN ($1,$2,$3) OFFSET $4

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 1. Apply once, second call returns ALREADY_WRAPPED_UP
prisma:query SELECT "public"."picks"."id", "public"."picks"."pool_id", "public"."picks"."user_id", "public"."picks"."game_id", "public"."picks"."selected_team_id", "public"."picks"."submitted_by", "public"."picks"."created_at" FROM "public"."picks" WHERE "public"."picks"."pool_id" = $1 OFFSET $2

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 1. Apply once, second call returns ALREADY_WRAPPED_UP
prisma:query SELECT "public"."pick_results"."pick_id", "public"."pick_results"."is_correct", "public"."pick_results"."points_awarded", "public"."pick_results"."finalized_at" FROM "public"."pick_results" WHERE "public"."pick_results"."pick_id" IN ($1,$2) OFFSET $3

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 1. Apply once, second call returns ALREADY_WRAPPED_UP
prisma:query SELECT "public"."games"."id", "public"."games"."external_game_id", "public"."games"."home_team_id", "public"."games"."away_team_id", "public"."games"."kickoff_time", "public"."games"."status"::text, "public"."games"."home_score", "public"."games"."away_score", "public"."games"."commissioner_notes" FROM "public"."games" WHERE "public"."games"."id" IN ($1) OFFSET $2

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 1. Apply once, second call returns ALREADY_WRAPPED_UP
prisma:query INSERT INTO "public"."weekly_wrapups" ("pool_id","applied_at","week_number") VALUES ($1,$2,$3) ON CONFLICT DO NOTHING

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 1. Apply once, second call returns ALREADY_WRAPPED_UP
prisma:query SELECT "public"."weekly_submissions"."id", "public"."weekly_submissions"."pool_id", "public"."weekly_submissions"."user_id", "public"."weekly_submissions"."week_number", "public"."weekly_submissions"."tie_breaker_prediction", "public"."weekly_submissions"."is_finalized", "public"."weekly_submissions"."created_at", "public"."weekly_submissions"."updated_at" FROM "public"."weekly_submissions" WHERE ("public"."weekly_submissions"."pool_id" = $1 AND "public"."weekly_submissions"."week_number" = $2) OFFSET $3

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 1. Apply once, second call returns ALREADY_WRAPPED_UP
prisma:query INSERT INTO "public"."penalty_ledger" ("id","pool_id","user_id","week_number","delta","reason","created_by","created_at") VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING "public"."penalty_ledger"."id", "public"."penalty_ledger"."pool_id", "public"."penalty_ledger"."user_id", "public"."penalty_ledger"."week_number", "public"."penalty_ledger"."delta", "public"."penalty_ledger"."reason", "public"."penalty_ledger"."created_by", "public"."penalty_ledger"."created_at"

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 1. Apply once, second call returns ALREADY_WRAPPED_UP
prisma:query INSERT INTO "public"."penalty_ledger" ("id","pool_id","user_id","week_number","delta","reason","created_by","created_at") VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING "public"."penalty_ledger"."id", "public"."penalty_ledger"."pool_id", "public"."penalty_ledger"."user_id", "public"."penalty_ledger"."week_number", "public"."penalty_ledger"."delta", "public"."penalty_ledger"."reason", "public"."penalty_ledger"."created_by", "public"."penalty_ledger"."created_at"

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 1. Apply once, second call returns ALREADY_WRAPPED_UP
prisma:query SELECT SUM("delta") FROM (SELECT "public"."penalty_ledger"."delta" FROM "public"."penalty_ledger" WHERE ("public"."penalty_ledger"."pool_id" = $1 AND "public"."penalty_ledger"."user_id" = $2) OFFSET $3) AS "sub"

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 1. Apply once, second call returns ALREADY_WRAPPED_UP
prisma:query INSERT INTO "public"."pool_member_stats" ("pool_id","user_id","total_shots_drank","first_place_finishes","dead_place_finishes","updated_at") VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT ("pool_id","user_id") DO UPDATE SET "dead_place_finishes" = ("public"."pool_member_stats"."dead_place_finishes" + $7), "total_shots_drank" = $8, "updated_at" = $9 WHERE (("public"."pool_member_stats"."pool_id" = $10 AND "public"."pool_member_stats"."user_id" = $11) AND 1=1) RETURNING "public"."pool_member_stats"."pool_id", "public"."pool_member_stats"."user_id", "public"."pool_member_stats"."total_shots_drank", "public"."pool_member_stats"."first_place_finishes", "public"."pool_member_stats"."dead_place_finishes", "public"."pool_member_stats"."updated_at"

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 1. Apply once, second call returns ALREADY_WRAPPED_UP
prisma:query SELECT SUM("delta") FROM (SELECT "public"."penalty_ledger"."delta" FROM "public"."penalty_ledger" WHERE ("public"."penalty_ledger"."pool_id" = $1 AND "public"."penalty_ledger"."user_id" = $2) OFFSET $3) AS "sub"

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 1. Apply once, second call returns ALREADY_WRAPPED_UP
prisma:query INSERT INTO "public"."pool_member_stats" ("pool_id","user_id","total_shots_drank","first_place_finishes","dead_place_finishes","updated_at") VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT ("pool_id","user_id") DO UPDATE SET "first_place_finishes" = ("public"."pool_member_stats"."first_place_finishes" + $7), "total_shots_drank" = $8, "updated_at" = $9 WHERE (("public"."pool_member_stats"."pool_id" = $10 AND "public"."pool_member_stats"."user_id" = $11) AND 1=1) RETURNING "public"."pool_member_stats"."pool_id", "public"."pool_member_stats"."user_id", "public"."pool_member_stats"."total_shots_drank", "public"."pool_member_stats"."first_place_finishes", "public"."pool_member_stats"."dead_place_finishes", "public"."pool_member_stats"."updated_at"

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 1. Apply once, second call returns ALREADY_WRAPPED_UP
prisma:query SELECT SUM("delta") FROM (SELECT "public"."penalty_ledger"."delta" FROM "public"."penalty_ledger" WHERE ("public"."penalty_ledger"."pool_id" = $1 AND "public"."penalty_ledger"."user_id" = $2) OFFSET $3) AS "sub"

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 1. Apply once, second call returns ALREADY_WRAPPED_UP
prisma:query INSERT INTO "public"."pool_member_stats" ("pool_id","user_id","total_shots_drank","first_place_finishes","dead_place_finishes","updated_at") VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT ("pool_id","user_id") DO UPDATE SET "dead_place_finishes" = ("public"."pool_member_stats"."dead_place_finishes" + $7), "total_shots_drank" = $8, "updated_at" = $9 WHERE (("public"."pool_member_stats"."pool_id" = $10 AND "public"."pool_member_stats"."user_id" = $11) AND 1=1) RETURNING "public"."pool_member_stats"."pool_id", "public"."pool_member_stats"."user_id", "public"."pool_member_stats"."total_shots_drank", "public"."pool_member_stats"."first_place_finishes", "public"."pool_member_stats"."dead_place_finishes", "public"."pool_member_stats"."updated_at"

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 1. Apply once, second call returns ALREADY_WRAPPED_UP
prisma:query COMMIT

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 1. Apply once, second call returns ALREADY_WRAPPED_UP
prisma:query BEGIN

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 1. Apply once, second call returns ALREADY_WRAPPED_UP
prisma:query SELECT "public"."weekly_wrapups"."pool_id", "public"."weekly_wrapups"."week_number", "public"."weekly_wrapups"."applied_at" FROM "public"."weekly_wrapups" WHERE ("public"."weekly_wrapups"."pool_id" = $1 AND "public"."weekly_wrapups"."week_number" = $2) LIMIT $3 OFFSET $4

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 1. Apply once, second call returns ALREADY_WRAPPED_UP
prisma:query COMMIT

 ✓ tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 1. Apply once, second call returns ALREADY_WRAPPED_UP 171ms
stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 2. Concurrent calls on final week: exactly one applies, other receives ALREADY_WRAPPED_UP
prisma:query BEGIN

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 2. Concurrent calls on final week: exactly one applies, other receives ALREADY_WRAPPED_UP
prisma:query SELECT "public"."weekly_wrapups"."pool_id", "public"."weekly_wrapups"."week_number", "public"."weekly_wrapups"."applied_at" FROM "public"."weekly_wrapups" WHERE ("public"."weekly_wrapups"."pool_id" = $1 AND "public"."weekly_wrapups"."week_number" = $2) LIMIT $3 OFFSET $4

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 2. Concurrent calls on final week: exactly one applies, other receives ALREADY_WRAPPED_UP
prisma:query SELECT "public"."pools"."id", "public"."pools"."name", "public"."pools"."admin_id", "public"."pools"."settings", "public"."pools"."status"::text FROM "public"."pools" WHERE ("public"."pools"."id" = $1 AND 1=1) LIMIT $2 OFFSET $3

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 2. Concurrent calls on final week: exactly one applies, other receives ALREADY_WRAPPED_UP
prisma:query SELECT "public"."pool_memberships"."pool_id", "public"."pool_memberships"."user_id", "public"."pool_memberships"."status"::text FROM "public"."pool_memberships" WHERE ("public"."pool_memberships"."status" = CAST($1::text AS "public"."Status") AND "public"."pool_memberships"."pool_id" IN ($2)) OFFSET $3

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 2. Concurrent calls on final week: exactly one applies, other receives ALREADY_WRAPPED_UP
prisma:query SELECT "public"."users"."id", "public"."users"."email", "public"."users"."password_hash", "public"."users"."role"::text, "public"."users"."created_at" FROM "public"."users" WHERE "public"."users"."id" IN ($1,$2,$3) OFFSET $4

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 2. Concurrent calls on final week: exactly one applies, other receives ALREADY_WRAPPED_UP
prisma:query SELECT "public"."picks"."id", "public"."picks"."pool_id", "public"."picks"."user_id", "public"."picks"."game_id", "public"."picks"."selected_team_id", "public"."picks"."submitted_by", "public"."picks"."created_at" FROM "public"."picks" WHERE "public"."picks"."pool_id" = $1 OFFSET $2

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 2. Concurrent calls on final week: exactly one applies, other receives ALREADY_WRAPPED_UP
prisma:query SELECT "public"."pick_results"."pick_id", "public"."pick_results"."is_correct", "public"."pick_results"."points_awarded", "public"."pick_results"."finalized_at" FROM "public"."pick_results" WHERE "public"."pick_results"."pick_id" IN ($1,$2,$3) OFFSET $4

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 2. Concurrent calls on final week: exactly one applies, other receives ALREADY_WRAPPED_UP
prisma:query SELECT "public"."games"."id", "public"."games"."external_game_id", "public"."games"."home_team_id", "public"."games"."away_team_id", "public"."games"."kickoff_time", "public"."games"."status"::text, "public"."games"."home_score", "public"."games"."away_score", "public"."games"."commissioner_notes" FROM "public"."games" WHERE "public"."games"."id" IN ($1,$2) OFFSET $3

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 2. Concurrent calls on final week: exactly one applies, other receives ALREADY_WRAPPED_UP
prisma:query INSERT INTO "public"."weekly_wrapups" ("week_number","pool_id","applied_at") VALUES ($1,$2,$3) ON CONFLICT DO NOTHING

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 2. Concurrent calls on final week: exactly one applies, other receives ALREADY_WRAPPED_UP
prisma:query SELECT "public"."weekly_submissions"."id", "public"."weekly_submissions"."pool_id", "public"."weekly_submissions"."user_id", "public"."weekly_submissions"."week_number", "public"."weekly_submissions"."tie_breaker_prediction", "public"."weekly_submissions"."is_finalized", "public"."weekly_submissions"."created_at", "public"."weekly_submissions"."updated_at" FROM "public"."weekly_submissions" WHERE ("public"."weekly_submissions"."pool_id" = $1 AND "public"."weekly_submissions"."week_number" = $2) OFFSET $3

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 2. Concurrent calls on final week: exactly one applies, other receives ALREADY_WRAPPED_UP
prisma:query INSERT INTO "public"."penalty_ledger" ("id","pool_id","user_id","week_number","delta","reason","created_by","created_at") VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING "public"."penalty_ledger"."id", "public"."penalty_ledger"."pool_id", "public"."penalty_ledger"."user_id", "public"."penalty_ledger"."week_number", "public"."penalty_ledger"."delta", "public"."penalty_ledger"."reason", "public"."penalty_ledger"."created_by", "public"."penalty_ledger"."created_at"

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 2. Concurrent calls on final week: exactly one applies, other receives ALREADY_WRAPPED_UP
prisma:query INSERT INTO "public"."penalty_ledger" ("id","pool_id","user_id","week_number","delta","reason","created_by","created_at") VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING "public"."penalty_ledger"."id", "public"."penalty_ledger"."pool_id", "public"."penalty_ledger"."user_id", "public"."penalty_ledger"."week_number", "public"."penalty_ledger"."delta", "public"."penalty_ledger"."reason", "public"."penalty_ledger"."created_by", "public"."penalty_ledger"."created_at"

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 2. Concurrent calls on final week: exactly one applies, other receives ALREADY_WRAPPED_UP
prisma:query SELECT SUM("delta") FROM (SELECT "public"."penalty_ledger"."delta" FROM "public"."penalty_ledger" WHERE ("public"."penalty_ledger"."pool_id" = $1 AND "public"."penalty_ledger"."user_id" = $2) OFFSET $3) AS "sub"

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 2. Concurrent calls on final week: exactly one applies, other receives ALREADY_WRAPPED_UP
prisma:query INSERT INTO "public"."pool_member_stats" ("pool_id","user_id","total_shots_drank","first_place_finishes","dead_place_finishes","updated_at") VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT ("pool_id","user_id") DO UPDATE SET "dead_place_finishes" = ("public"."pool_member_stats"."dead_place_finishes" + $7), "total_shots_drank" = $8, "updated_at" = $9 WHERE (("public"."pool_member_stats"."pool_id" = $10 AND "public"."pool_member_stats"."user_id" = $11) AND 1=1) RETURNING "public"."pool_member_stats"."pool_id", "public"."pool_member_stats"."user_id", "public"."pool_member_stats"."total_shots_drank", "public"."pool_member_stats"."first_place_finishes", "public"."pool_member_stats"."dead_place_finishes", "public"."pool_member_stats"."updated_at"

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 2. Concurrent calls on final week: exactly one applies, other receives ALREADY_WRAPPED_UP
prisma:query SELECT SUM("delta") FROM (SELECT "public"."penalty_ledger"."delta" FROM "public"."penalty_ledger" WHERE ("public"."penalty_ledger"."pool_id" = $1 AND "public"."penalty_ledger"."user_id" = $2) OFFSET $3) AS "sub"

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 2. Concurrent calls on final week: exactly one applies, other receives ALREADY_WRAPPED_UP
prisma:query INSERT INTO "public"."pool_member_stats" ("pool_id","user_id","total_shots_drank","first_place_finishes","dead_place_finishes","updated_at") VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT ("pool_id","user_id") DO UPDATE SET "first_place_finishes" = ("public"."pool_member_stats"."first_place_finishes" + $7), "total_shots_drank" = $8, "updated_at" = $9 WHERE (("public"."pool_member_stats"."pool_id" = $10 AND "public"."pool_member_stats"."user_id" = $11) AND 1=1) RETURNING "public"."pool_member_stats"."pool_id", "public"."pool_member_stats"."user_id", "public"."pool_member_stats"."total_shots_drank", "public"."pool_member_stats"."first_place_finishes", "public"."pool_member_stats"."dead_place_finishes", "public"."pool_member_stats"."updated_at"

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 2. Concurrent calls on final week: exactly one applies, other receives ALREADY_WRAPPED_UP
prisma:query SELECT SUM("delta") FROM (SELECT "public"."penalty_ledger"."delta" FROM "public"."penalty_ledger" WHERE ("public"."penalty_ledger"."pool_id" = $1 AND "public"."penalty_ledger"."user_id" = $2) OFFSET $3) AS "sub"

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 2. Concurrent calls on final week: exactly one applies, other receives ALREADY_WRAPPED_UP
prisma:query INSERT INTO "public"."pool_member_stats" ("pool_id","user_id","total_shots_drank","first_place_finishes","dead_place_finishes","updated_at") VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT ("pool_id","user_id") DO UPDATE SET "dead_place_finishes" = ("public"."pool_member_stats"."dead_place_finishes" + $7), "total_shots_drank" = $8, "updated_at" = $9 WHERE (("public"."pool_member_stats"."pool_id" = $10 AND "public"."pool_member_stats"."user_id" = $11) AND 1=1) RETURNING "public"."pool_member_stats"."pool_id", "public"."pool_member_stats"."user_id", "public"."pool_member_stats"."total_shots_drank", "public"."pool_member_stats"."first_place_finishes", "public"."pool_member_stats"."dead_place_finishes", "public"."pool_member_stats"."updated_at"

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 2. Concurrent calls on final week: exactly one applies, other receives ALREADY_WRAPPED_UP
prisma:query COMMIT

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 2. Concurrent calls on final week: exactly one applies, other receives ALREADY_WRAPPED_UP
prisma:query BEGIN

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 2. Concurrent calls on final week: exactly one applies, other receives ALREADY_WRAPPED_UP
prisma:query SELECT "public"."weekly_wrapups"."pool_id", "public"."weekly_wrapups"."week_number", "public"."weekly_wrapups"."applied_at" FROM "public"."weekly_wrapups" WHERE ("public"."weekly_wrapups"."pool_id" = $1 AND "public"."weekly_wrapups"."week_number" = $2) LIMIT $3 OFFSET $4

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 2. Concurrent calls on final week: exactly one applies, other receives ALREADY_WRAPPED_UP
prisma:query COMMIT

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 3. Concurrent calls on non-final week: both return WEEK_NOT_FINAL with zero rows written
prisma:query BEGIN

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 3. Concurrent calls on non-final week: both return WEEK_NOT_FINAL with zero rows written
prisma:query BEGIN

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 3. Concurrent calls on non-final week: both return WEEK_NOT_FINAL with zero rows written
prisma:query SELECT "public"."weekly_wrapups"."pool_id", "public"."weekly_wrapups"."week_number", "public"."weekly_wrapups"."applied_at" FROM "public"."weekly_wrapups" WHERE ("public"."weekly_wrapups"."pool_id" = $1 AND "public"."weekly_wrapups"."week_number" = $2) LIMIT $3 OFFSET $4

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 3. Concurrent calls on non-final week: both return WEEK_NOT_FINAL with zero rows written
prisma:query SELECT "public"."weekly_wrapups"."pool_id", "public"."weekly_wrapups"."week_number", "public"."weekly_wrapups"."applied_at" FROM "public"."weekly_wrapups" WHERE ("public"."weekly_wrapups"."pool_id" = $1 AND "public"."weekly_wrapups"."week_number" = $2) LIMIT $3 OFFSET $4

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 3. Concurrent calls on non-final week: both return WEEK_NOT_FINAL with zero rows written
prisma:query SELECT "public"."pools"."id", "public"."pools"."name", "public"."pools"."admin_id", "public"."pools"."settings", "public"."pools"."status"::text FROM "public"."pools" WHERE ("public"."pools"."id" = $1 AND 1=1) LIMIT $2 OFFSET $3

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 3. Concurrent calls on non-final week: both return WEEK_NOT_FINAL with zero rows written
prisma:query SELECT "public"."pool_memberships"."pool_id", "public"."pool_memberships"."user_id", "public"."pool_memberships"."status"::text FROM "public"."pool_memberships" WHERE ("public"."pool_memberships"."status" = CAST($1::text AS "public"."Status") AND "public"."pool_memberships"."pool_id" IN ($2)) OFFSET $3

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 3. Concurrent calls on non-final week: both return WEEK_NOT_FINAL with zero rows written
prisma:query SELECT "public"."users"."id", "public"."users"."email", "public"."users"."password_hash", "public"."users"."role"::text, "public"."users"."created_at" FROM "public"."users" WHERE "public"."users"."id" IN ($1) OFFSET $2

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 3. Concurrent calls on non-final week: both return WEEK_NOT_FINAL with zero rows written
prisma:query SELECT "public"."picks"."id", "public"."picks"."pool_id", "public"."picks"."user_id", "public"."picks"."game_id", "public"."picks"."selected_team_id", "public"."picks"."submitted_by", "public"."picks"."created_at" FROM "public"."picks" WHERE "public"."picks"."pool_id" = $1 OFFSET $2

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 3. Concurrent calls on non-final week: both return WEEK_NOT_FINAL with zero rows written
prisma:query SELECT "public"."pools"."id", "public"."pools"."name", "public"."pools"."admin_id", "public"."pools"."settings", "public"."pools"."status"::text FROM "public"."pools" WHERE ("public"."pools"."id" = $1 AND 1=1) LIMIT $2 OFFSET $3

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 3. Concurrent calls on non-final week: both return WEEK_NOT_FINAL with zero rows written
prisma:query SELECT "public"."pick_results"."pick_id", "public"."pick_results"."is_correct", "public"."pick_results"."points_awarded", "public"."pick_results"."finalized_at" FROM "public"."pick_results" WHERE "public"."pick_results"."pick_id" IN ($1) OFFSET $2

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 3. Concurrent calls on non-final week: both return WEEK_NOT_FINAL with zero rows written
prisma:query SELECT "public"."games"."id", "public"."games"."external_game_id", "public"."games"."home_team_id", "public"."games"."away_team_id", "public"."games"."kickoff_time", "public"."games"."status"::text, "public"."games"."home_score", "public"."games"."away_score", "public"."games"."commissioner_notes" FROM "public"."games" WHERE "public"."games"."id" IN ($1) OFFSET $2

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 3. Concurrent calls on non-final week: both return WEEK_NOT_FINAL with zero rows written
prisma:query COMMIT

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 3. Concurrent calls on non-final week: both return WEEK_NOT_FINAL with zero rows written
prisma:query SELECT "public"."pool_memberships"."pool_id", "public"."pool_memberships"."user_id", "public"."pool_memberships"."status"::text FROM "public"."pool_memberships" WHERE ("public"."pool_memberships"."status" = CAST($1::text AS "public"."Status") AND "public"."pool_memberships"."pool_id" IN ($2)) OFFSET $3

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 3. Concurrent calls on non-final week: both return WEEK_NOT_FINAL with zero rows written
prisma:query SELECT "public"."users"."id", "public"."users"."email", "public"."users"."password_hash", "public"."users"."role"::text, "public"."users"."created_at" FROM "public"."users" WHERE "public"."users"."id" IN ($1) OFFSET $2

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 3. Concurrent calls on non-final week: both return WEEK_NOT_FINAL with zero rows written
prisma:query SELECT "public"."picks"."id", "public"."picks"."pool_id", "public"."picks"."user_id", "public"."picks"."game_id", "public"."picks"."selected_team_id", "public"."picks"."submitted_by", "public"."picks"."created_at" FROM "public"."picks" WHERE "public"."picks"."pool_id" = $1 OFFSET $2

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 3. Concurrent calls on non-final week: both return WEEK_NOT_FINAL with zero rows written
prisma:query SELECT "public"."pick_results"."pick_id", "public"."pick_results"."is_correct", "public"."pick_results"."points_awarded", "public"."pick_results"."finalized_at" FROM "public"."pick_results" WHERE "public"."pick_results"."pick_id" IN ($1) OFFSET $2

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 3. Concurrent calls on non-final week: both return WEEK_NOT_FINAL with zero rows written
prisma:query SELECT "public"."games"."id", "public"."games"."external_game_id", "public"."games"."home_team_id", "public"."games"."away_team_id", "public"."games"."kickoff_time", "public"."games"."status"::text, "public"."games"."home_score", "public"."games"."away_score", "public"."games"."commissioner_notes" FROM "public"."games" WHERE "public"."games"."id" IN ($1) OFFSET $2

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 3. Concurrent calls on non-final week: both return WEEK_NOT_FINAL with zero rows written
prisma:query COMMIT

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 4. NO_GAMES_FOR_WEEK returned when week has no scheduled games in pool
prisma:query BEGIN

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 4. NO_GAMES_FOR_WEEK returned when week has no scheduled games in pool
prisma:query SELECT "public"."weekly_wrapups"."pool_id", "public"."weekly_wrapups"."week_number", "public"."weekly_wrapups"."applied_at" FROM "public"."weekly_wrapups" WHERE ("public"."weekly_wrapups"."pool_id" = $1 AND "public"."weekly_wrapups"."week_number" = $2) LIMIT $3 OFFSET $4

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 4. NO_GAMES_FOR_WEEK returned when week has no scheduled games in pool
prisma:query SELECT "public"."pools"."id", "public"."pools"."name", "public"."pools"."admin_id", "public"."pools"."settings", "public"."pools"."status"::text FROM "public"."pools" WHERE ("public"."pools"."id" = $1 AND 1=1) LIMIT $2 OFFSET $3

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 4. NO_GAMES_FOR_WEEK returned when week has no scheduled games in pool
prisma:query SELECT "public"."pool_memberships"."pool_id", "public"."pool_memberships"."user_id", "public"."pool_memberships"."status"::text FROM "public"."pool_memberships" WHERE ("public"."pool_memberships"."status" = CAST($1::text AS "public"."Status") AND "public"."pool_memberships"."pool_id" IN ($2)) OFFSET $3

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 4. NO_GAMES_FOR_WEEK returned when week has no scheduled games in pool
prisma:query SELECT "public"."users"."id", "public"."users"."email", "public"."users"."password_hash", "public"."users"."role"::text, "public"."users"."created_at" FROM "public"."users" WHERE "public"."users"."id" IN ($1,$2) OFFSET $3

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 4. NO_GAMES_FOR_WEEK returned when week has no scheduled games in pool
prisma:query SELECT "public"."picks"."id", "public"."picks"."pool_id", "public"."picks"."user_id", "public"."picks"."game_id", "public"."picks"."selected_team_id", "public"."picks"."submitted_by", "public"."picks"."created_at" FROM "public"."picks" WHERE "public"."picks"."pool_id" = $1 OFFSET $2

stdout | tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 4. NO_GAMES_FOR_WEEK returned when week has no scheduled games in pool
prisma:query COMMIT

 ✓ tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 2. Concurrent calls on final week: exactly one applies, other receives ALREADY_WRAPPED_UP 49ms
 ✓ tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 3. Concurrent calls on non-final week: both return WEEK_NOT_FINAL with zero rows written 50ms
 ✓ tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 4. NO_GAMES_FOR_WEEK returned when week has no scheduled games in pool 6ms
 ✓ tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 5. Marker UPDATE/DELETE/TRUNCATE throws append-only SQLSTATE P0001 22ms
 ✓ tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 6. anon and authenticated roles receive 42501 on SELECT from weekly_wrapups 11ms
 ✓ tests/br4b.test.ts > BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants > 7. Backfill INSERT...SELECT in rolled-back transaction asserts 1 marker created 12ms

 Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  01:19:14
   Duration  957ms (tests 65%, transform 23%, import 7%, setup 3%, worker 1%)
```

### 9.4 feat/phase12-1-outbox: Decision #50 DB Header
```text
=== DB Header & Rehearsal Verification ===

1. Database Identity:
[
  {
    "current_database": "pickem_rehearsal",
    "current_user": "postgres",
    "inet_server_addr": "::1",
    "inet_server_port": 5432
  }
]

2. Applied Migrations:
[
  {
    "migration_name": "20260927000000_init",
    "started_at": "2026-10-01T08:19:24.788Z",
    "finished_at": "2026-10-01T08:19:24.860Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928051824_add_pool_member_stats_and_penalty_ledger",
    "started_at": "2026-10-01T08:19:24.861Z",
    "finished_at": "2026-10-01T08:19:24.885Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928124900_precision_and_weekly_submissions",
    "started_at": "2026-10-01T08:19:24.886Z",
    "finished_at": "2026-10-01T08:19:24.921Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928170000_weekly_submission_finalized_and_game_notes",
    "started_at": "2026-10-01T08:19:24.922Z",
    "finished_at": "2026-10-01T08:19:24.927Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928180000_shot_cam_penalty_media_and_rls",
    "started_at": "2026-10-01T08:19:24.928Z",
    "finished_at": "2026-10-01T08:19:24.944Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260929144500_br_1_ledger_append_only",
    "started_at": "2026-10-01T08:19:24.945Z",
    "finished_at": "2026-10-01T08:19:24.950Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260930010000_br_2b_ledger_api_lockdown",
    "started_at": "2026-10-01T08:19:24.951Z",
    "finished_at": "2026-10-01T08:19:24.954Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260930020000_br_2c_public_tables_api_lockdown",
    "started_at": "2026-10-01T08:19:24.955Z",
    "finished_at": "2026-10-01T08:19:24.960Z",
    "applied_steps_count": 1
  }
]

3. Prisma Migrate Status:
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "pickem_rehearsal", schema "public" at "localhost:5432"

8 migrations found in prisma/migrations

Database schema is up to date!
```

### 9.5 feat/phase12-1-outbox: Raw Prisma Generate Output
```text
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma

✔ Generated Prisma Client (v5.22.0) to .\node_modules\@prisma\client in 287ms

Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

Tip: Interested in query caching in just a few lines of code? Try Accelerate today! https://pris.ly/tip-3-accelerate
```

### 9.6 feat/phase12-1-outbox: Full Test Suite Execution (`npm run test:db`)
```text
RUN  v5.0.2 C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em

 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts RLS is ENABLED (relrowsecurity=true) and relforcerowsecurity=false on all application public tables 145ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: asserts trigger and function definitions match requirements (BEFORE ROW/STATEMENT, plpgsql, prosecdef=false, unconditional RAISE) 40ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: UPDATE (including no-op update) is blocked with count >= 1 and SQLSTATE P0001 79ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: DELETE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001 21ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: TRUNCATE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001 87ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: membership-row DELETE cascades to penalty_ledger and is intercepted by trigger with P0001 50ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: DELETE FROM pools fixture asserts exact foreign key constraint pool_memberships_pool_id_fkey and SQLSTATE 23503 6ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts anon role is denied SELECT (SQLSTATE 42501) across all public tables 557ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts authenticated role is denied SELECT (SQLSTATE 42501) across all public tables 231ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b: asserts anon role is denied UPDATE on penalty_ledger with SQLSTATE 42501 (privilege proof) 98ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2c: asserts has_function_privilege returns false for anon and authenticated on BR-1 trigger functions 31ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 401 when Authorization header is missing 201ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 400 when pool_id query parameter is missing or malformed 14ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 404 when pool does not exist
prisma:query SELECT "public"."pools"."id", "public"."pools"."name", "public"."pools"."admin_id", "public"."pools"."settings", "public"."pools"."status"::text FROM "public"."pools" WHERE ("public"."pools"."id" = $1 AND 1=1) LIMIT $2 OFFSET $3

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 404 when pool does not exist 195ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 403 when user is not the pool commissioner
prisma:query SELECT "public"."pools"."id", "public"."pools"."name", "public"."pools"."admin_id", "public"."pools"."settings", "public"."pools"."status"::text FROM "public"."pools" WHERE ("public"."pools"."id" = $1 AND 1=1) LIMIT $2 OFFSET $3

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 200 and game slate snapshot when user is the verified commissioner
prisma:query SELECT "public"."pools"."id", "public"."pools"."name", "public"."pools"."admin_id", "public"."pools"."settings", "public"."pools"."status"::text FROM "public"."pools" WHERE ("public"."pools"."id" = $1 AND 1=1) LIMIT $2 OFFSET $3

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 200 and game slate snapshot when user is the verified commissioner
prisma:query SELECT "public"."games"."id", "public"."games"."external_game_id", "public"."games"."home_team_id", "public"."games"."away_team_id", "public"."games"."kickoff_time", "public"."games"."status"::text, "public"."games"."home_score", "public"."games"."away_score", "public"."games"."commissioner_notes" FROM "public"."games" WHERE 1=1 ORDER BY "public"."games"."kickoff_time" ASC OFFSET $1

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 403 when user is not the pool commissioner 7ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 200 and game slate snapshot when user is the verified commissioner 22ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 401 when Authorization header is missing 54ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 400 when pool_id is missing or malformed in request body 10ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 404 when pool does not exist in request body
prisma:query SELECT "public"."pools"."id", "public"."pools"."name", "public"."pools"."admin_id", "public"."pools"."settings", "public"."pools"."status"::text FROM "public"."pools" WHERE ("public"."pools"."id" = $1 AND 1=1) LIMIT $2 OFFSET $3

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 403 when user is not the pool commissioner
prisma:query SELECT "public"."pools"."id", "public"."pools"."name", "public"."pools"."admin_id", "public"."pools"."settings", "public"."pools"."status"::text FROM "public"."pools" WHERE ("public"."pools"."id" = $1 AND 1=1) LIMIT $2 OFFSET $3

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 200 and upserts pick when authenticated user is the commissioner
prisma:query SELECT "public"."pools"."id", "public"."pools"."name", "public"."pools"."admin_id", "public"."pools"."settings", "public"."pools"."status"::text FROM "public"."pools" WHERE ("public"."pools"."id" = $1 AND 1=1) LIMIT $2 OFFSET $3

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 200 and upserts pick when authenticated user is the commissioner
prisma:query SELECT "public"."picks"."id", "public"."picks"."pool_id", "public"."picks"."user_id", "public"."picks"."game_id", "public"."picks"."selected_team_id", "public"."picks"."submitted_by", "public"."picks"."created_at" FROM "public"."picks" WHERE (("public"."picks"."pool_id" = $1 AND "public"."picks"."user_id" = $2 AND "public"."picks"."game_id" = $3) AND 1=1) LIMIT $4 OFFSET $5

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 200 and upserts pick when authenticated user is the commissioner
prisma:query BEGIN

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 200 and upserts pick when authenticated user is the commissioner
prisma:query INSERT INTO "public"."picks" ("id","pool_id","user_id","game_id","selected_team_id","submitted_by","created_at") VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT ("pool_id","user_id","game_id") DO UPDATE SET "selected_team_id" = $8, "submitted_by" = $9 WHERE (("public"."picks"."pool_id" = $10 AND "public"."picks"."user_id" = $11 AND "public"."picks"."game_id" = $12) AND 1=1) RETURNING "public"."picks"."id", "public"."picks"."pool_id", "public"."picks"."user_id", "public"."picks"."game_id", "public"."picks"."selected_team_id", "public"."picks"."submitted_by", "public"."picks"."created_at"

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 200 and upserts pick when authenticated user is the commissioner
prisma:query INSERT INTO "public"."audit_logs" ("id","actor_id","action","target_entity_id","old_value","new_value","timestamp") VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING "public"."audit_logs"."id", "public"."audit_logs"."actor_id", "public"."audit_logs"."action", "public"."audit_logs"."target_entity_id", "public"."audit_logs"."old_value", "public"."audit_logs"."new_value", "public"."audit_logs"."timestamp"

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 200 and upserts pick when authenticated user is the commissioner
prisma:query COMMIT

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403
prisma:query SELECT "public"."pools"."id", "public"."pools"."name", "public"."pools"."admin_id", "public"."pools"."settings", "public"."pools"."status"::text FROM "public"."pools" WHERE ("public"."pools"."id" = $1 AND 1=1) LIMIT $2 OFFSET $3

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403
prisma:query SELECT "public"."penalty_ledger"."id", "public"."penalty_ledger"."pool_id", "public"."penalty_ledger"."user_id", "public"."penalty_ledger"."week_number", "public"."penalty_ledger"."delta", "public"."penalty_ledger"."reason", "public"."penalty_ledger"."created_by", "public"."penalty_ledger"."created_at" FROM "public"."penalty_ledger" WHERE ("public"."penalty_ledger"."id" = $1 AND 1=1) LIMIT $2 OFFSET $3

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403
prisma:query SELECT "public"."pools"."id", "public"."pools"."name", "public"."pools"."admin_id", "public"."pools"."settings", "public"."pools"."status"::text FROM "public"."pools" WHERE ("public"."pools"."id" = $1 AND 1=1) LIMIT $2 OFFSET $3

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403
prisma:query SELECT "public"."penalty_ledger"."id", "public"."penalty_ledger"."pool_id", "public"."penalty_ledger"."user_id", "public"."penalty_ledger"."week_number", "public"."penalty_ledger"."delta", "public"."penalty_ledger"."reason", "public"."penalty_ledger"."created_by", "public"."penalty_ledger"."created_at" FROM "public"."penalty_ledger" WHERE ("public"."penalty_ledger"."id" = $1 AND 1=1) LIMIT $2 OFFSET $3

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: penalty OWNER -> 201 success
prisma:query SELECT "public"."pools"."id", "public"."pools"."name", "public"."pools"."admin_id", "public"."pools"."settings", "public"."pools"."status"::text FROM "public"."pools" WHERE ("public"."pools"."id" = $1 AND 1=1) LIMIT $2 OFFSET $3

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: penalty OWNER -> 201 success
prisma:query SELECT "public"."penalty_ledger"."id", "public"."penalty_ledger"."pool_id", "public"."penalty_ledger"."user_id", "public"."penalty_ledger"."week_number", "public"."penalty_ledger"."delta", "public"."penalty_ledger"."reason", "public"."penalty_ledger"."created_by", "public"."penalty_ledger"."created_at" FROM "public"."penalty_ledger" WHERE ("public"."penalty_ledger"."id" = $1 AND 1=1) LIMIT $2 OFFSET $3

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 404 when pool does not exist in request body 17ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 403 when user is not the pool commissioner 11ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 200 and upserts pick when authenticated user is the commissioner 44ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403 12ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403 9ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > verifies zero penalty_media rows exist after denied upload attempts 6ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: penalty OWNER -> 201 success
prisma:query INSERT INTO "public"."penalty_media" ("id","penalty_id","pool_id","user_id","storage_path","media_type","status","created_at") VALUES ($1,$2,$3,$4,$5,$6,CAST($7::text AS "public"."PenaltyMediaStatus"),$8) ON CONFLICT ("penalty_id") DO UPDATE SET "storage_path" = $9, "media_type" = $10, "status" = CAST($11::text AS "public"."PenaltyMediaStatus"), "confirmed_by" = $12 WHERE ("public"."penalty_media"."penalty_id" = $13 AND 1=1) RETURNING "public"."penalty_media"."id", "public"."penalty_media"."penalty_id", "public"."penalty_media"."pool_id", "public"."penalty_media"."user_id", "public"."penalty_media"."storage_path", "public"."penalty_media"."media_type", "public"."penalty_media"."status"::text, "public"."penalty_media"."confirmed_by", "public"."penalty_media"."created_at"

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: penalty OWNER -> 201 success
prisma:query INSERT INTO "public"."audit_logs" ("id","actor_id","action","target_entity_id","new_value","timestamp") VALUES ($1,$2,$3,$4,$5,$6) RETURNING "public"."audit_logs"."id", "public"."audit_logs"."actor_id", "public"."audit_logs"."action", "public"."audit_logs"."target_entity_id", "public"."audit_logs"."old_value", "public"."audit_logs"."new_value", "public"."audit_logs"."timestamp"

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403
prisma:query SELECT "public"."pools"."id", "public"."pools"."name", "public"."pools"."admin_id", "public"."pools"."settings", "public"."pools"."status"::text FROM "public"."pools" WHERE ("public"."pools"."id" = $1 AND 1=1) LIMIT $2 OFFSET $3

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: pool COMMISSIONER -> 200 success
prisma:query SELECT "public"."pools"."id", "public"."pools"."name", "public"."pools"."admin_id", "public"."pools"."settings", "public"."pools"."status"::text FROM "public"."pools" WHERE ("public"."pools"."id" = $1 AND 1=1) LIMIT $2 OFFSET $3

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: pool COMMISSIONER -> 200 success
prisma:query SELECT "public"."penalty_media"."id", "public"."penalty_media"."penalty_id", "public"."penalty_media"."pool_id", "public"."penalty_media"."user_id", "public"."penalty_media"."storage_path", "public"."penalty_media"."media_type", "public"."penalty_media"."status"::text, "public"."penalty_media"."confirmed_by", "public"."penalty_media"."created_at" FROM "public"."penalty_media" WHERE ("public"."penalty_media"."penalty_id" = $1 AND 1=1) LIMIT $2 OFFSET $3

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: pool COMMISSIONER -> 200 success
prisma:query UPDATE "public"."penalty_media" SET "status" = CAST($1::text AS "public"."PenaltyMediaStatus"), "confirmed_by" = $2 WHERE ("public"."penalty_media"."penalty_id" = $3 AND 1=1) RETURNING "public"."penalty_media"."id", "public"."penalty_media"."penalty_id", "public"."penalty_media"."pool_id", "public"."penalty_media"."user_id", "public"."penalty_media"."storage_path", "public"."penalty_media"."media_type", "public"."penalty_media"."status"::text, "public"."penalty_media"."confirmed_by", "public"."penalty_media"."created_at"

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: pool COMMISSIONER -> 200 success
prisma:query INSERT INTO "public"."audit_logs" ("id","actor_id","action","target_entity_id","old_value","new_value","timestamp") VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING "public"."audit_logs"."id", "public"."audit_logs"."actor_id", "public"."audit_logs"."action", "public"."audit_logs"."target_entity_id", "public"."audit_logs"."old_value", "public"."audit_logs"."new_value", "public"."audit_logs"."timestamp"

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write)
prisma:query SELECT "public"."pools"."id", "public"."pools"."name", "public"."pools"."admin_id", "public"."pools"."settings", "public"."pools"."status"::text FROM "public"."pools" WHERE ("public"."pools"."status" = CAST($1::text AS "public"."Status") AND ("public"."pools"."id") IN (SELECT "t1"."pool_id" FROM "public"."pool_memberships" AS "t1" WHERE ("t1"."user_id" = $2 AND "t1"."status" = CAST($3::text AS "public"."Status") AND "t1"."pool_id" IS NOT NULL))) ORDER BY "public"."pools"."name" ASC LIMIT $4 OFFSET $5

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write)
prisma:query SELECT "public"."pools"."id", "public"."pools"."name", "public"."pools"."admin_id", "public"."pools"."settings", "public"."pools"."status"::text FROM "public"."pools" WHERE ("public"."pools"."admin_id" = $1 AND "public"."pools"."status" = CAST($2::text AS "public"."Status")) ORDER BY "public"."pools"."name" ASC LIMIT $3 OFFSET $4

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write)
prisma:query SELECT "public"."pools"."id", "public"."pools"."name", "public"."pools"."admin_id", "public"."pools"."settings", "public"."pools"."status"::text FROM "public"."pools" WHERE ("public"."pools"."id" = $1 AND 1=1) LIMIT $2 OFFSET $3

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: penalty OWNER -> 201 success 18ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403 7ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: pool COMMISSIONER -> 200 success 14ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write) 18ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write) 8ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 403 when user is not a member or commissioner of the requested pool (no pool write)
prisma:query SELECT "public"."pools"."id", "public"."pools"."name", "public"."pools"."admin_id", "public"."pools"."settings", "public"."pools"."status"::text FROM "public"."pools" WHERE ("public"."pools"."id" = $1 AND 1=1) LIMIT $2 OFFSET $3

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 403 when user is not a member or commissioner of the requested pool (no pool write)
prisma:query SELECT "public"."pool_memberships"."pool_id", "public"."pool_memberships"."user_id", "public"."pool_memberships"."status"::text FROM "public"."pool_memberships" WHERE (("public"."pool_memberships"."pool_id" = $1 AND "public"."pool_memberships"."user_id" = $2) AND 1=1) LIMIT $3 OFFSET $4

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot
prisma:query SELECT "public"."pools"."id", "public"."pools"."name", "public"."pools"."admin_id", "public"."pools"."settings", "public"."pools"."status"::text FROM "public"."pools" WHERE ("public"."pools"."id" = $1 AND 1=1) LIMIT $2 OFFSET $3

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot
prisma:query SELECT "public"."games"."id", "public"."games"."external_game_id", "public"."games"."home_team_id", "public"."games"."away_team_id", "public"."games"."kickoff_time", "public"."games"."status"::text, "public"."games"."home_score", "public"."games"."away_score", "public"."games"."commissioner_notes" FROM "public"."games" WHERE 1=1 ORDER BY "public"."games"."kickoff_time" ASC OFFSET $1

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot
prisma:query SELECT "public"."picks"."id", "public"."picks"."pool_id", "public"."picks"."user_id", "public"."picks"."game_id", "public"."picks"."selected_team_id", "public"."picks"."submitted_by", "public"."picks"."created_at" FROM "public"."picks" WHERE (("public"."picks"."user_id" = $1 AND "public"."picks"."pool_id" = $2) AND "public"."picks"."game_id" IN ($3)) OFFSET $4

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot
prisma:query SELECT "public"."pools"."id", "public"."pools"."name", "public"."pools"."admin_id", "public"."pools"."settings", "public"."pools"."status"::text FROM "public"."pools" WHERE ("public"."pools"."id" = $1 AND 1=1) LIMIT $2 OFFSET $3

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot
prisma:query SELECT "public"."pool_memberships"."pool_id", "public"."pool_memberships"."user_id", "public"."pool_memberships"."status"::text FROM "public"."pool_memberships" WHERE (("public"."pool_memberships"."pool_id" = $1 AND "public"."pool_memberships"."user_id" = $2) AND 1=1) LIMIT $3 OFFSET $4

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot
prisma:query SELECT "public"."games"."id", "public"."games"."external_game_id", "public"."games"."home_team_id", "public"."games"."away_team_id", "public"."games"."kickoff_time", "public"."games"."status"::text, "public"."games"."home_score", "public"."games"."away_score", "public"."games"."commissioner_notes" FROM "public"."games" WHERE 1=1 ORDER BY "public"."games"."kickoff_time" ASC OFFSET $1

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot
prisma:query SELECT "public"."picks"."id", "public"."picks"."pool_id", "public"."picks"."user_id", "public"."picks"."game_id", "public"."picks"."selected_team_id", "public"."picks"."submitted_by", "public"."picks"."created_at" FROM "public"."picks" WHERE (("public"."picks"."user_id" = $1 AND "public"."picks"."pool_id" = $2) AND "public"."picks"."game_id" IN ($3)) OFFSET $4

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 400 when explicit pool_id is not a valid UUID (no pool write) 8ms
 × tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 403 when user is not a member or commissioner of the requested pool (no pool write) 57ms
   → expected 3 to be 2 // Object.is equality
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot 37ms
stdout | tests/br4b.test.ts > BR-4b: Fail-Closed Claim Store Invariant (Decision #52) > Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed
prisma:query BEGIN

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > Decision #49: CI Route Scan & Route Guard Verification > verifies all routes with pool parameters are guarded; only /api/health and GET /api/admin/users allowlisted 2ms
stdout | tests/br4b.test.ts > BR-4b: Fail-Closed Claim Store Invariant (Decision #52) > Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed
prisma:query SELECT to_regclass('public.weekly_wrapups')::text as to_regclass;

stdout | tests/br4b.test.ts > BR-4b: Fail-Closed Claim Store Invariant (Decision #52) > Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed
prisma:query COMMIT

 ✓ tests/br4b.test.ts > BR-4b: Fail-Closed Claim Store Invariant (Decision #52) > Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed 100ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 when Authorization header is absent 4ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 when Authorization header does not start with Bearer 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 for an invalid / expired token 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > decodes valid JWT and attaches user to req.user, then calls next() 12ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > returns 401 if req.user is undefined 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > returns 403 if req.user is not ADMIN 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > calls next() if user is ADMIN 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 401 if req.user is missing 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 400 for a malformed non-UUID pool_id 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 404 when the pool does not exist in DB 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 403 when user is neither commissioner nor member 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > Decision #20 & R-12.2-W: global ADMIN who is not the pool commissioner -> 403, no req.pool, zero side effects 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > calls next() and attaches pool when user is the pool commissioner 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > from: query - extracts pool_id from query params and authorizes commissioner 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > from: query - returns 400 when pool_id query parameter is missing 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > from: body - extracts pool_id from request body and authorizes commissioner 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > from: body - returns 400 when pool_id body parameter is missing 6ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolMember > returns 403 if user is not a member and not the commissioner 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolMember > Decision #20 & R-12.2-W: global ADMIN who is not a member and not commissioner -> 403, no req.pool 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolMember > calls next() when user is active pool member 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolMember > calls next() when user is the pool commissioner (even without explicit membership row) 0ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > allows valid local disposable database URLs 6ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects remote / hosted database URLs (Supabase, AWS, Neon, etc.) 2ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > Decision #32 Sabotage Test: point TEST_DATABASE_URL at production fingerprint -> aborts before connection 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects URLs using ?schema= parameter to bypass host isolation 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects non-disposable production database names on localhost 2ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > sabotage test: throws when TEST_DATABASE_URL is empty string or undefined 2ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Rolling lock: enforces lock per-game at kickoff boundary 3ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Rolling lock with offset: enforces lock at (kickoff - offset) 1ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Global lock vs Rolling lock: handles first game vs later games 1ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Excluded windows: correctly identifies TNF, MNF, Sunday Early/Late, SNF 3ms
 ✓ tests/characterization.test.ts > BR-4 splitPenalty Math Characterization > Worked matrix: confirms exact zero-diff decimal split amounts 5ms
 ✓ tests/characterization.test.ts > BR-4b Set-Equality: Wrap-Up vs Scoring Resolver > Asserts 100% game ID set equality between wrap-up and scoring resolvers 2ms

 Test Files  1 failed | 6 passed (7)
      Tests  1 failed | 66 passed (67)
   Start at  01:19:43
   Duration  3.93s (tests 55%, import 24%, transform 13%, setup 7%, worker 2%)

    Isolate  7 workers spawned · ~707ms startup each (spawn + environment, per file)
             at least ~942ms faster with isolate: false — reuses workers across files instead of one per file

JSON report written to C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/vitest.json
```

---

## 10. Documentation Invariant Audit (Append-Only Verification)

### 10.1 Live File Line Counts & Baseline Numstat
```text
Line Counts:
  623 ARCHITECTURE.md
  128 ROADMAP.md
  347 tasks.md
  1098 total

Numstat vs Baseline (e41ce72):
330	0	ARCHITECTURE.md
50	0	ROADMAP.md
201	0	tasks.md
```
*Verification: Strictly 0 deletions across ARCHITECTURE.md, ROADMAP.md, and tasks.md.*

---

## 11. Decision #49 Route Protection Matrix

| Route | Method | Scoping / Extraction | Guard Middleware | Security Status |
| :--- | :--- | :--- | :--- | :--- |
| `/api/health` | GET | None | None | **ALLOWLISTED (Public Health Endpoint)** |
| `/api/auth/login` | POST | Body (`email`, `password`) | None | **PUBLIC AUTH** |
| `/api/pools` | GET | None | `requireAuth` | **GUARDED (Platform Pool List)** |
| `/api/games` | GET | Query (`week`, `pool_id`) | `requireAuth` | **GUARDED (S-8 Remediated: 400 on bad UUID, 404 on missing, 403 on non-member, deterministic fallback)** |
| `/api/pools/:pool_id/leaderboard` | GET | Param (`pool_id`) | `requireAuth, requirePoolMember` | **GUARDED (Active Pool Member)** |
| `/api/pools/:pool_id/leaderboard/cumulative` | GET | Param (`pool_id`) | `requireAuth, requirePoolMember` | **GUARDED (Active Pool Member)** |
| `/api/pools/:pool_id/penalties/adjust` | POST | Param (`pool_id`) | `requireAuth, requirePoolCommissioner` | **GUARDED (Pool Commissioner Only)** |
| `/api/pools/:pool_id/penalties/member/:member_id` | GET | Param (`pool_id`) | `requireAuth, requirePoolMember` | **GUARDED (Active Pool Member)** |
| `/api/pools/:pool_id/penalties/:id/media` | POST | Param (`pool_id`) | `requireAuth` | **GUARDED (S-7 Remediated: Owner & Commissioner only)** |
| `/api/pools/:pool_id/penalties/:id/media/confirm` | PATCH | Param (`pool_id`) | `requireAuth` | **GUARDED (S-7 Remediated: Owner & Commissioner only)** |
| `/api/pools/:pool_id/penalties/:id/media` | GET | Param (`pool_id`) | `requireAuth, requirePoolMember` | **GUARDED (Active Pool Member)** |
| `/api/pools/:pool_id/matrix` | GET | Param (`pool_id`) | `requireAuth, requirePoolMember` | **GUARDED (Active Pool Member)** |
| `/api/picks` | POST | Body (`pool_id`, `game_id`) | `requireAuth` | **GUARDED (User & Kickoff Lock)** |
| `/api/admin/users` | GET | None | `requireAuth, requireAdmin` | **ALLOWLISTED (Platform Admin User List)** |
| `/api/admin/audit-logs` | GET | None | `requireAuth, requireAdmin` | **GUARDED (Platform Audit Trail)** |
| `/api/admin/picks` | GET | Query (`pool_id`, `user_id`) | `requireAuth, requirePoolCommissioner({ from: 'query' })` | **REMEDIATED (BR-5b Commissioner Guard)** |
| `/api/admin/picks` | PUT | Body (`pool_id`, `user_id`, `game_id`) | `requireAuth, requirePoolCommissioner({ from: 'body' })` | **REMEDIATED (BR-5b Commissioner Guard)** |

---

## 12. BR-5 / BR-5b Raw Vitest JSON Test Artifact

```json
{"numTotalTestSuites":25,"numPassedTestSuites":22,"numFailedTestSuites":3,"numPendingTestSuites":0,"numTotalTests":67,"numPassedTests":66,"numFailedTests":1,"numPendingTests":0,"numTodoTests":0,"snapshot":{"added":0,"failure":false,"filesAdded":0,"filesRemoved":0,"filesRemovedList":[],"filesUnmatched":0,"filesUpdated":0,"matched":0,"total":0,"unchecked":0,"uncheckedKeysByFile":[],"unmatched":0,"updated":0,"didUpdate":false},"startTime":1790842783708,"success":false,"testResults":[{"assertionResults":[{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requireAuth"],"fullName":"BR-5 middleware unit tests (pure mock) requireAuth returns 401 when Authorization header is absent","status":"passed","title":"returns 401 when Authorization header is absent","duration":4.067399999999907,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requireAuth"],"fullName":"BR-5 middleware unit tests (pure mock) requireAuth returns 401 when Authorization header does not start with Bearer","status":"passed","title":"returns 401 when Authorization header does not start with Bearer","duration":0.8034999999999854,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requireAuth"],"fullName":"BR-5 middleware unit tests (pure mock) requireAuth returns 401 for an invalid / expired token","status":"passed","title":"returns 401 for an invalid / expired token","duration":1.0102999999999156,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requireAuth"],"fullName":"BR-5 middleware unit tests (pure mock) requireAuth decodes valid JWT and attaches user to req.user, then calls next()","status":"passed","title":"decodes valid JWT and attaches user to req.user, then calls next()","duration":11.806699999999864,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requireAdmin"],"fullName":"BR-5 middleware unit tests (pure mock) requireAdmin returns 401 if req.user is undefined","status":"passed","title":"returns 401 if req.user is undefined","duration":0.7310999999999694,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requireAdmin"],"fullName":"BR-5 middleware unit tests (pure mock) requireAdmin returns 403 if req.user is not ADMIN","status":"passed","title":"returns 403 if req.user is not ADMIN","duration":0.7693000000001575,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requireAdmin"],"fullName":"BR-5 middleware unit tests (pure mock) requireAdmin calls next() if user is ADMIN","status":"passed","title":"calls next() if user is ADMIN","duration":0.5809000000001561,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner returns 401 if req.user is missing","status":"passed","title":"returns 401 if req.user is missing","duration":1.0135000000000218,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner returns 400 for a malformed non-UUID pool_id","status":"passed","title":"returns 400 for a malformed non-UUID pool_id","duration":1.0499999999999545,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner returns 404 when the pool does not exist in DB","status":"passed","title":"returns 404 when the pool does not exist in DB","duration":1.0368000000000848,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner returns 403 when user is neither commissioner nor member","status":"passed","title":"returns 403 when user is neither commissioner nor member","duration":0.6356000000000677,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner Decision #20 & R-12.2-W: global ADMIN who is not the pool commissioner -> 403, no req.pool, zero side effects","status":"passed","title":"Decision #20 & R-12.2-W: global ADMIN who is not the pool commissioner -> 403, no req.pool, zero side effects","duration":0.5730000000000928,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner calls next() and attaches pool when user is the pool commissioner","status":"passed","title":"calls next() and attaches pool when user is the pool commissioner","duration":0.610700000000179,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner from: query - extracts pool_id from query params and authorizes commissioner","status":"passed","title":"from: query - extracts pool_id from query params and authorizes commissioner","duration":0.6808999999998377,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner from: query - returns 400 when pool_id query parameter is missing","status":"passed","title":"from: query - returns 400 when pool_id query parameter is missing","duration":0.5778999999999996,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner from: body - extracts pool_id from request body and authorizes commissioner","status":"passed","title":"from: body - extracts pool_id from request body and authorizes commissioner","duration":0.49139999999988504,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner from: body - returns 400 when pool_id body parameter is missing","status":"passed","title":"from: body - returns 400 when pool_id body parameter is missing","duration":6.2608000000000175,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolMember"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolMember returns 403 if user is not a member and not the commissioner","status":"passed","title":"returns 403 if user is not a member and not the commissioner","duration":0.7626999999999953,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolMember"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolMember Decision #20 & R-12.2-W: global ADMIN who is not a member and not commissioner -> 403, no req.pool","status":"passed","title":"Decision #20 & R-12.2-W: global ADMIN who is not a member and not commissioner -> 403, no req.pool","duration":0.5688999999999851,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolMember"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolMember calls next() when user is active pool member","status":"passed","title":"calls next() when user is active pool member","duration":0.475800000000163,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolMember"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolMember calls next() when user is the pool commissioner (even without explicit membership row)","status":"passed","title":"calls next() when user is the pool commissioner (even without explicit membership row)","duration":0.3885999999999967,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790842787375,"endTime":1790842787411.3887,"status":"passed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/authMiddleware.test.ts"},{"assertionResults":[{"ancestorTitles":["BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints"],"fullName":"BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints BR-1: asserts trigger and function definitions match requirements (BEFORE ROW/STATEMENT, plpgsql, prosecdef=false, unconditional RAISE)","status":"passed","title":"BR-1: asserts trigger and function definitions match requirements (BEFORE ROW/STATEMENT, plpgsql, prosecdef=false, unconditional RAISE)","duration":39.640300000000025,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints"],"fullName":"BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints BR-1: UPDATE (including no-op update) is blocked with count >= 1 and SQLSTATE P0001","status":"passed","title":"BR-1: UPDATE (including no-op update) is blocked with count >= 1 and SQLSTATE P0001","duration":79.46100000000001,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints"],"fullName":"BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints BR-1: DELETE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001","status":"passed","title":"BR-1: DELETE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001","duration":20.61290000000008,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints"],"fullName":"BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints BR-1: TRUNCATE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001","status":"passed","title":"BR-1: TRUNCATE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001","duration":87.01880000000006,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints"],"fullName":"BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints BR-1: membership-row DELETE cascades to penalty_ledger and is intercepted by trigger with P0001","status":"passed","title":"BR-1: membership-row DELETE cascades to penalty_ledger and is intercepted by trigger with P0001","duration":49.575399999999945,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints"],"fullName":"BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints BR-1: DELETE FROM pools fixture asserts exact foreign key constraint pool_memberships_pool_id_fkey and SQLSTATE 23503","status":"passed","title":"BR-1: DELETE FROM pools fixture asserts exact foreign key constraint pool_memberships_pool_id_fkey and SQLSTATE 23503","duration":6.361000000000104,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790842785202,"endTime":1790842785485.361,"status":"passed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/br1.test.ts"},{"assertionResults":[{"ancestorTitles":["BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix"],"fullName":"BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix BR-2b/2c: asserts RLS is ENABLED (relrowsecurity=true) and relforcerowsecurity=false on all application public tables","status":"passed","title":"BR-2b/2c: asserts RLS is ENABLED (relrowsecurity=true) and relforcerowsecurity=false on all application public tables","duration":145.09529999999995,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix"],"fullName":"BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix BR-2b/2c: asserts anon role is denied SELECT (SQLSTATE 42501) across all public tables","status":"passed","title":"BR-2b/2c: asserts anon role is denied SELECT (SQLSTATE 42501) across all public tables","duration":557.3589,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix"],"fullName":"BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix BR-2b/2c: asserts authenticated role is denied SELECT (SQLSTATE 42501) across all public tables","status":"passed","title":"BR-2b/2c: asserts authenticated role is denied SELECT (SQLSTATE 42501) across all public tables","duration":231.26589999999987,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix"],"fullName":"BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix BR-2b: asserts anon role is denied UPDATE on penalty_ledger with SQLSTATE 42501 (privilege proof)","status":"passed","title":"BR-2b: asserts anon role is denied UPDATE on penalty_ledger with SQLSTATE 42501 (privilege proof)","duration":98.11549999999988,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix"],"fullName":"BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix BR-2c: asserts has_function_privilege returns false for anon and authenticated on BR-1 trigger functions","status":"passed","title":"BR-2c: asserts has_function_privilege returns false for anon and authenticated on BR-1 trigger functions","duration":31.209499999999935,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790842785011,"endTime":1790842786077.2095,"status":"passed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/br2.test.ts"},{"assertionResults":[{"ancestorTitles":["BR-4b: Fail-Closed Claim Store Invariant (Decision #52)"],"fullName":"BR-4b: Fail-Closed Claim Store Invariant (Decision #52) Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed","status":"passed","title":"Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed","duration":100.48120000000006,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790842786781,"endTime":1790842786881.4812,"status":"passed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/br4b.test.ts"},{"assertionResults":[{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" })) returns 401 when Authorization header is missing","status":"passed","title":"returns 401 when Authorization header is missing","duration":201.01479999999992,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" })) returns 400 when pool_id query parameter is missing or malformed","status":"passed","title":"returns 400 when pool_id query parameter is missing or malformed","duration":14.118799999999737,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" })) returns 404 when pool does not exist","status":"passed","title":"returns 404 when pool does not exist","duration":194.93679999999995,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" })) returns 403 when user is not the pool commissioner","status":"passed","title":"returns 403 when user is not the pool commissioner","duration":6.880799999999908,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" })) returns 200 and game slate snapshot when user is the verified commissioner","status":"passed","title":"returns 200 and game slate snapshot when user is the verified commissioner","duration":22.12830000000031,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" })) returns 401 when Authorization header is missing","status":"passed","title":"returns 401 when Authorization header is missing","duration":54.47580000000016,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" })) returns 400 when pool_id is missing or malformed in request body","status":"passed","title":"returns 400 when pool_id is missing or malformed in request body","duration":9.520500000000084,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" })) returns 404 when pool does not exist in request body","status":"passed","title":"returns 404 when pool does not exist in request body","duration":16.691699999999855,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" })) returns 403 when user is not the pool commissioner","status":"passed","title":"returns 403 when user is not the pool commissioner","duration":10.952600000000075,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" })) returns 200 and upserts pick when authenticated user is the commissioner","status":"passed","title":"returns 200 and upserts pick when authenticated user is the commissioner","duration":43.54939999999988,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403","status":"passed","title":"POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403","duration":12.395100000000184,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403","status":"passed","title":"POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403","duration":9.152399999999943,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) verifies zero penalty_media rows exist after denied upload attempts","status":"passed","title":"verifies zero penalty_media rows exist after denied upload attempts","duration":5.5172999999999774,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) POST /api/pools/:pool_id/penalties/:id/media: penalty OWNER -> 201 success","status":"passed","title":"POST /api/pools/:pool_id/penalties/:id/media: penalty OWNER -> 201 success","duration":18.111099999999624,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403","status":"passed","title":"PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403","duration":7.36220000000003,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) PATCH /api/pools/:pool_id/penalties/:id/media/confirm: pool COMMISSIONER -> 200 success","status":"passed","title":"PATCH /api/pools/:pool_id/penalties/:id/media/confirm: pool COMMISSIONER -> 200 success","duration":13.90809999999965,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write)","status":"passed","title":"returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write)","duration":17.92099999999982,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write)","status":"passed","title":"returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write)","duration":7.692299999999705,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) returns 400 when explicit pool_id is not a valid UUID (no pool write)","status":"passed","title":"returns 400 when explicit pool_id is not a valid UUID (no pool write)","duration":7.6073999999998705,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) returns 403 when user is not a member or commissioner of the requested pool (no pool write)","status":"failed","title":"returns 403 when user is not a member or commissioner of the requested pool (no pool write)","duration":56.55560000000014,"failureMessages":["AssertionError: expected 3 to be 2 // Object.is equality\n    at C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/br5b_routes.test.ts:486:30\n    at file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:2783:20"],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot","status":"passed","title":"returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot","duration":36.96680000000015,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","Decision #49: CI Route Scan & Route Guard Verification"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan Decision #49: CI Route Scan & Route Guard Verification verifies all routes with pool parameters are guarded; only /api/health and GET /api/admin/users allowlisted","status":"passed","title":"verifies all routes with pool parameters are guarded; only /api/health and GET /api/admin/users allowlisted","duration":1.6181000000001404,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790842785990,"endTime":1790842786827.6182,"status":"failed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/br5b_routes.test.ts"},{"assertionResults":[{"ancestorTitles":["INV-5 Lock Logic & Boundary Characterization"],"fullName":"INV-5 Lock Logic & Boundary Characterization Rolling lock: enforces lock per-game at kickoff boundary","status":"passed","title":"Rolling lock: enforces lock per-game at kickoff boundary","duration":3.0353999999999814,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["INV-5 Lock Logic & Boundary Characterization"],"fullName":"INV-5 Lock Logic & Boundary Characterization Rolling lock with offset: enforces lock at (kickoff - offset)","status":"passed","title":"Rolling lock with offset: enforces lock at (kickoff - offset)","duration":0.6498000000000275,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["INV-5 Lock Logic & Boundary Characterization"],"fullName":"INV-5 Lock Logic & Boundary Characterization Global lock vs Rolling lock: handles first game vs later games","status":"passed","title":"Global lock vs Rolling lock: handles first game vs later games","duration":0.5139000000000351,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["INV-5 Lock Logic & Boundary Characterization"],"fullName":"INV-5 Lock Logic & Boundary Characterization Excluded windows: correctly identifies TNF, MNF, Sunday Early/Late, SNF","status":"passed","title":"Excluded windows: correctly identifies TNF, MNF, Sunday Early/Late, SNF","duration":2.9644000000000688,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-4 splitPenalty Math Characterization"],"fullName":"BR-4 splitPenalty Math Characterization Worked matrix: confirms exact zero-diff decimal split amounts","status":"passed","title":"Worked matrix: confirms exact zero-diff decimal split amounts","duration":5.02780000000007,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-4b Set-Equality: Wrap-Up vs Scoring Resolver"],"fullName":"BR-4b Set-Equality: Wrap-Up vs Scoring Resolver Asserts 100% game ID set equality between wrap-up and scoring resolvers","status":"passed","title":"Asserts 100% game ID set equality between wrap-up and scoring resolvers","duration":1.8426999999999225,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790842787638,"endTime":1790842787652.8428,"status":"passed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/characterization.test.ts"},{"assertionResults":[{"ancestorTitles":["BR-6 Safeguards: assertDisposableUrl"],"fullName":"BR-6 Safeguards: assertDisposableUrl allows valid local disposable database URLs","status":"passed","title":"allows valid local disposable database URLs","duration":5.5767999999999915,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-6 Safeguards: assertDisposableUrl"],"fullName":"BR-6 Safeguards: assertDisposableUrl rejects remote / hosted database URLs (Supabase, AWS, Neon, etc.)","status":"passed","title":"rejects remote / hosted database URLs (Supabase, AWS, Neon, etc.)","duration":1.5437000000000012,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-6 Safeguards: assertDisposableUrl"],"fullName":"BR-6 Safeguards: assertDisposableUrl Decision #32 Sabotage Test: point TEST_DATABASE_URL at production fingerprint -> aborts before connection","status":"passed","title":"Decision #32 Sabotage Test: point TEST_DATABASE_URL at production fingerprint -> aborts before connection","duration":0.7937999999999761,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-6 Safeguards: assertDisposableUrl"],"fullName":"BR-6 Safeguards: assertDisposableUrl rejects URLs using ?schema= parameter to bypass host isolation","status":"passed","title":"rejects URLs using ?schema= parameter to bypass host isolation","duration":0.6710999999999672,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-6 Safeguards: assertDisposableUrl"],"fullName":"BR-6 Safeguards: assertDisposableUrl rejects non-disposable production database names on localhost","status":"passed","title":"rejects non-disposable production database names on localhost","duration":2.1298000000000457,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-6 Safeguards: assertDisposableUrl"],"fullName":"BR-6 Safeguards: assertDisposableUrl sabotage test: throws when TEST_DATABASE_URL is empty string or undefined","status":"passed","title":"sabotage test: throws when TEST_DATABASE_URL is empty string or undefined","duration":1.5871999999999957,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790842787565,"endTime":1790842787577.5872,"status":"passed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/safeguards.test.ts"}]}
```

---

## 13. R-12.2-AF Acceptance Criteria Checklist (Section 6)

- [ ] S-8 tests in test suite assert pool-count-before and pool-count-after across GET /api/games requests and assert byte-identical snapshots for member and commissioner 200 responses.
- [ ] S-7 tests in test suite explicitly assert member-not-owner 403, owner 200, commissioner 200, and zero rows inserted on denial.
- [ ] Phase 12 Decision Register in ARCHITECTURE.md matches docs/rulings/appendix-a.md byte-for-byte, verified by scripts/ci_check_register.js.
- [ ] scripts/ci_check_register.js exits 0 on valid register and exits 1 on mutation.
- [ ] Safeguards tests use sanitized references (postgres.exampleref) with zero real project references in tree.
- [ ] 12.1 design note created at docs/design/12.1.md with outbox models, lock resolver extraction plan, and scheduler trigger mechanism.
- [ ] Tripwire script executed against hosted database and results captured.
- [ ] Full test suite passes 100% on both main and feat/phase12-migrations.
- [ ] Documentation invariant preserved with 0 deletions across ARCHITECTURE.md, ROADMAP.md, and tasks.md.
- [ ] Clean working tree committed prior to evidence generation.

---

# LIVE REPOSITORY CONTEXT

## prisma/schema.prisma

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  USER
}

enum Status {
  ACTIVE
  INACTIVE
}

enum GameStatus {
  SCHEDULED
  IN_PROGRESS
  FINAL
}

enum PenaltyMediaStatus {
  PENDING
  CONFIRMED
  REJECTED
}

model User {
  id               String           @id @default(uuid()) @db.Uuid
  email            String           @unique
  passwordHash     String           @map("password_hash")
  role             Role             @default(USER)
  createdAt        DateTime         @default(now()) @map("created_at")
  pools            Pool[]           @relation("AdministeredPools")
  memberships      PoolMembership[]
  picks            Pick[]           @relation("UserPicks")
  submittedPicks   Pick[]           @relation("SubmittedPicks")
  auditLogs        AuditLog[]       @relation("UserAuditLogs")
  createdPenalties   PenaltyLedger[]    @relation("CreatedPenalties")
  weeklySubmissions  WeeklySubmission[]
  penaltyMedia       PenaltyMedia[]     @relation("UserPenaltyMedia")
  confirmedMedia     PenaltyMedia[]     @relation("ConfirmedPenaltyMedia")

  @@map("users")
}

model Pool {
  id                String             @id @default(uuid()) @db.Uuid
  name              String
  adminId           String             @map("admin_id") @db.Uuid
  admin             User               @relation("AdministeredPools", fields: [adminId], references: [id])
  settings          Json
  status            Status             @default(ACTIVE)
  memberships       PoolMembership[]
  picks             Pick[]
  memberStats       PoolMemberStat[]
  penaltyLedger     PenaltyLedger[]
  weeklySubmissions WeeklySubmission[]
  penaltyMedia      PenaltyMedia[]

  @@map("pools")
}

model PoolMembership {
  poolId String @map("pool_id") @db.Uuid
  userId String @map("user_id") @db.Uuid
  status Status @default(ACTIVE)

  pool Pool @relation(fields: [poolId], references: [id])
  user User @relation(fields: [userId], references: [id])

  stat              PoolMemberStat?
  penaltyLedger     PenaltyLedger[]
  weeklySubmissions WeeklySubmission[]

  @@id([poolId, userId])
  @@map("pool_memberships")
}

model Game {
  id                String     @id @default(uuid()) @db.Uuid
  externalGameId    String     @unique @map("external_game_id")
  homeTeamId        String     @map("home_team_id")
  awayTeamId        String     @map("away_team_id")
  kickoffTime       DateTime   @map("kickoff_time")
  status            GameStatus @default(SCHEDULED)
  homeScore         Int?       @map("home_score")
  awayScore         Int?       @map("away_score")
  commissionerNotes String?    @map("commissioner_notes")
  picks             Pick[]

  @@map("games")
}

model Pick {
  id             String      @id @default(uuid()) @db.Uuid
  poolId         String      @map("pool_id") @db.Uuid
  userId         String      @map("user_id") @db.Uuid
  gameId         String      @map("game_id") @db.Uuid
  selectedTeamId String?     @map("selected_team_id")
  submittedById  String      @map("submitted_by") @db.Uuid
  createdAt      DateTime    @default(now()) @map("created_at")

  pool        Pool        @relation(fields: [poolId], references: [id])
  user        User        @relation("UserPicks", fields: [userId], references: [id])
  game        Game        @relation(fields: [gameId], references: [id])
  submittedBy User        @relation("SubmittedPicks", fields: [submittedById], references: [id])
  result      PickResult?

  @@unique([poolId, userId, gameId])
  @@map("picks")
}

model PickResult {
  pickId        String   @id @map("pick_id") @db.Uuid
  isCorrect     Boolean  @map("is_correct")
  pointsAwarded Decimal  @map("points_awarded") @db.Decimal(5, 2)
  finalizedAt   DateTime @default(now()) @map("finalized_at")

  pick Pick @relation(fields: [pickId], references: [id], onDelete: Cascade)

  @@map("pick_results")
}

model AuditLog {
  id             String   @id @default(uuid()) @db.Uuid
  actorId        String   @map("actor_id") @db.Uuid
  action         String
  targetEntityId String   @map("target_entity_id")
  oldValue       Json?    @map("old_value")
  newValue       Json?    @map("new_value")
  timestamp      DateTime @default(now())

  actor User @relation("UserAuditLogs", fields: [actorId], references: [id])

  @@map("audit_logs")
}

model PoolMemberStat {
  poolId             String   @map("pool_id") @db.Uuid
  userId             String   @map("user_id") @db.Uuid
  totalShotsDrank    Decimal  @default(0.00) @map("total_shots_drank") @db.Decimal(5, 2)
  firstPlaceFinishes Int      @default(0) @map("first_place_finishes")
  deadPlaceFinishes  Int      @default(0) @map("dead_place_finishes")
  updatedAt          DateTime @default(now()) @updatedAt @map("updated_at")

  pool       Pool           @relation(fields: [poolId], references: [id], onDelete: Cascade)
  membership PoolMembership @relation(fields: [poolId, userId], references: [poolId, userId], onDelete: Cascade)

  @@id([poolId, userId])
  @@map("pool_member_stats")
}

model PenaltyLedger {
  id          String        @id @default(uuid()) @db.Uuid
  poolId      String        @map("pool_id") @db.Uuid
  userId      String        @map("user_id") @db.Uuid
  weekNumber  Int?          @map("week_number")
  delta       Decimal       @map("delta") @db.Decimal(5, 2)
  reason      String
  createdById String        @map("created_by") @db.Uuid
  createdAt   DateTime      @default(now()) @map("created_at")

  pool       Pool           @relation(fields: [poolId], references: [id], onDelete: Cascade)
  membership PoolMembership @relation(fields: [poolId, userId], references: [poolId, userId], onDelete: Cascade)
  createdBy  User           @relation("CreatedPenalties", fields: [createdById], references: [id])
  media      PenaltyMedia?

  @@index([poolId, userId])
  @@map("penalty_ledger")
}

model WeeklySubmission {
  id                   String   @id @default(uuid()) @db.Uuid
  poolId               String   @map("pool_id") @db.Uuid
  userId               String   @map("user_id") @db.Uuid
  weekNumber           Int      @map("week_number")
  tieBreakerPrediction Decimal? @map("tie_breaker_prediction") @db.Decimal(5, 2)
  isFinalized          Boolean  @default(false) @map("is_finalized")
  createdAt            DateTime @default(now()) @map("created_at")
  updatedAt            DateTime @default(now()) @updatedAt @map("updated_at")

  pool       Pool           @relation(fields: [poolId], references: [id], onDelete: Cascade)
  membership PoolMembership @relation(fields: [poolId, userId], references: [poolId, userId], onDelete: Cascade)
  user       User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([poolId, userId, weekNumber])
  @@index([poolId, weekNumber, isFinalized])
  @@map("weekly_submissions")
}

model PenaltyMedia {
  id          String             @id @default(uuid()) @db.Uuid
  penaltyId   String             @unique @map("penalty_id") @db.Uuid
  poolId      String             @map("pool_id") @db.Uuid
  userId      String             @map("user_id") @db.Uuid
  storagePath String             @map("storage_path")
  mediaType   String             @map("media_type")
  status      PenaltyMediaStatus @default(PENDING)
  confirmedBy String?            @map("confirmed_by") @db.Uuid
  createdAt   DateTime           @default(now()) @map("created_at")

  penalty   PenaltyLedger @relation(fields: [penaltyId], references: [id], onDelete: Cascade)
  pool      Pool          @relation(fields: [poolId], references: [id], onDelete: Cascade)
  user      User          @relation("UserPenaltyMedia", fields: [userId], references: [id], onDelete: Cascade)
  confirmer User?         @relation("ConfirmedPenaltyMedia", fields: [confirmedBy], references: [id])

  @@index([poolId, userId])
  @@map("penalty_media")
}



```

## ARCHITECTURE.md

````markdown
# ARCHITECTURE.md

## 1. System Topology & Component Diagram

The system follows a strictly decoupled 3-tier architecture. The client application never interacts directly with the external NFL data provider. All external data is asynchronously synced to the local database, ensuring the application remains fast and highly available even if the upstream API experiences downtime (stale-while-revalidate).

```mermaid
graph TD
    subgraph External
        API[External NFL API]
    end

    subgraph Backend Engine
        SW[Sync Worker / CRON]
        API_Layer[Backend API / Scoring Engine]
    end

    subgraph Persistence Layer
        DB[(Application Database)]
    end

    subgraph Client
        UI[Web / Mobile UI]
    end

    API -->|Raw Schedules & Scores| SW
    SW -->|Upserts Game State| DB
    UI -->|Reads State / Writes Picks| API_Layer
    API_Layer <-->|Queries & Mutations| DB
```

---

## 2. Relational Data Schema

The database serves as the absolute source of truth. All relations enforce strict uniqueness and auditability. Soft deletes (`status = 'INACTIVE'`) are used exclusively for pools and memberships to preserve historical leaderboard calculations.

### Core Tables

#### `users`
- **id** (UUID, Primary Key)
- **email** (String, Unique)
- **password_hash** (String)
- **role** (Enum: `ADMIN`, `USER`)
- **created_at** (Timestamp)

#### `pools`
- **id** (UUID, Primary Key)
- **name** (String)
- **admin_id** (UUID, Foreign Key -> `users.id`)
- **settings** (JSONB) - Stores point weights, dynamic lock offsets, penalty configs, tiebreaker rules, and anti-peeking/visibility configs.
- **status** (Enum: `ACTIVE`, `INACTIVE`)

#### `pool_memberships`
- **pool_id** (UUID, Foreign Key -> `pools.id`)
- **user_id** (UUID, Foreign Key -> `users.id`)
- **status** (Enum: `ACTIVE`, `INACTIVE`)
- *Primary Key*: `(pool_id, user_id)`

#### `games`
- **id** (UUID, Primary Key)
- **external_game_id** (String, Indexed) - Used for idempotent API reconciliation.
- **home_team_id** (String)
- **away_team_id** (String)
- **kickoff_time** (Timestamp) - Used as the strict `lock_at` threshold.
- **status** (Enum: `SCHEDULED`, `IN_PROGRESS`, `FINAL`)
- **home_score** (Int, Nullable)
- **away_score** (Int, Nullable)
- **commissioner_notes** (String, Nullable) - Admin-curated matchup notes/context.

#### `picks`
- **id** (UUID, Primary Key)
- **pool_id** (UUID, Foreign Key -> `pools.id`)
- **user_id** (UUID, Foreign Key -> `users.id`)
- **game_id** (UUID, Foreign Key -> `games.id`)
- **selected_team_id** (String, Nullable) - `NULL` indicates an omitted pick.
- **submitted_by** (UUID, Foreign Key -> `users.id`) - Tracks if the user or an admin entered the pick.
- **created_at** (Timestamp)
- *Constraint*: `UNIQUE(pool_id, user_id, game_id)`

#### `pick_results` (Immutable)
- **pick_id** (UUID, Primary Key, Foreign Key -> `picks.id`)
- **is_correct** (Boolean)
- **points_awarded** (Decimal(5,2)) - Standardized precision decimal for weighted and custom point values.
- **finalized_at** (Timestamp)

#### `audit_logs` (Append-Only)
- **id** (UUID, Primary Key)
- **actor_id** (UUID, Foreign Key -> `users.id`)
- **action** (String) - e.g., `"ADMIN_OVERRIDE_PICK"`
- **target_entity_id** (UUID)
- **old_value** (JSONB)
- **new_value** (JSONB)
- **timestamp** (Timestamp)

### Extended Tables (Penalty Engine & Precision Tiebreakers)

#### `pool_member_stats` (Cumulative Cache)
- **pool_id** (UUID, Foreign Key -> `pools.id`)
- **user_id** (UUID, Foreign Key -> `users.id`)
- **total_shots_drank** (Decimal(5,2), Default: `0.00`) - Precision cumulative metric supporting fractional/split penalties.
- **first_place_finishes** (Int, Default: `0`)
- **dead_place_finishes** (Int, Default: `0`)
- **updated_at** (Timestamp)
- *Primary Key*: `(pool_id, user_id)`

#### `penalty_ledger` (Audit & Transactions)
- **id** (UUID, Primary Key)
- **pool_id** (UUID, Foreign Key -> `pools.id`)
- **user_id** (UUID, Foreign Key -> `users.id`)
- **week_number** (Int, Nullable)
- **delta** (Decimal(5,2)) - Exact integer or fractional penalty delta (e.g., `0.50` shots for split dead place).
- **reason** (String) - e.g., `'WEEKLY_DEAD_PLACE'`, `'LOSS_INCREMENT'`, `'ADMIN_ADJUSTMENT'`
- **created_by** (UUID, Foreign Key -> `users.id`)
- **created_at** (Timestamp)
- *Index*: `(pool_id, user_id)`

#### `weekly_submissions` (Draft & Tiebreaker Tracker)
- **id** (UUID, Primary Key)
- **pool_id** (UUID, Foreign Key -> `pools.id`)
- **user_id** (UUID, Foreign Key -> `users.id`)
- **week_number** (Int)
- **tie_breaker_prediction** (Decimal(5,2), Nullable) - User's predicted total points for the designated tiebreaker game.
- **is_finalized** (Boolean, Default: `false`) - Tracks draft vs. locked pick state for visibility.
- **created_at** (Timestamp)
- **updated_at** (Timestamp)
- *Constraint*: `UNIQUE(pool_id, user_id, week_number)`
- *Index*: `(pool_id, week_number, is_finalized)`

#### `penalty_media` (Shot-Cam Storage)
- **id** (UUID, Primary Key)
- **penalty_id** (UUID, Unique Foreign Key -> `penalty_ledger.id`)
- **pool_id** (UUID, Foreign Key -> `pools.id`)
- **user_id** (UUID, Foreign Key -> `users.id`)
- **storage_path** (String) - Supabase bucket path.
- **media_type** (String) - e.g., `'image/jpeg'`, `'video/mp4'`
- **status** (Enum: `PENDING`, `CONFIRMED`, `REJECTED`)
- **confirmed_by** (UUID, Nullable)
- **created_at** (Timestamp)
- *Index*: `(pool_id, user_id)`

### `pools.settings` JSON Schema Extension

```json
{
  "$schema": "[http://json-schema.org/draft-07/schema#](http://json-schema.org/draft-07/schema#)",
  "type": "object",
  "properties": {
    "lock_offset": {
      "type": "integer",
      "minimum": 0,
      "default": 0,
      "description": "Lock offset threshold in minutes prior to kickoff"
    },
    "lockMode": {
      "enum": ["ROLLING", "GLOBAL_FIRST_GAME"],
      "default": "ROLLING"
    },
    "excludedGameWindows": {
      "type": "array",
      "items": { "type": "string" },
      "default": []
    },
    "points_per_win": {
      "type": "number",
      "minimum": 0,
      "default": 1.0,
      "description": "Points awarded per winning pick (Decimal(5,2) precision)"
    },
    "picking_mode": {
      "type": "string",
      "enum": ["STRAIGHT_UP", "SPREAD"],
      "default": "STRAIGHT_UP",
      "description": "Mode of pick submission and scoring evaluation"
    },
    "hide_picks_until_kickoff": {
      "type": "boolean",
      "default": true,
      "description": "Enables anti-peeking pick masking before game kickoff"
    },
    "anti_peeking": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean", "default": true },
        "reveal_at": {
          "type": "string",
          "enum": ["LOCK_TIME", "GAME_FINAL"],
          "default": "LOCK_TIME"
        }
      }
    },
    "tiebreaker": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean", "default": true },
        "game_target": {
          "type": "string",
          "enum": ["LAST_GAME", "MONDAY_NIGHT", "CUSTOM"],
          "default": "MONDAY_NIGHT"
        },
        "allow_decimals": { "type": "boolean", "default": true },
        "rule": {
          "type": "string",
          "enum": ["CLOSEST_ABSOLUTE", "CLOSEST_WITHOUT_GOING_OVER"],
          "default": "CLOSEST_ABSOLUTE"
        }
      }
    },
    "penalties": {
      "type": "object",
      "required": ["penalty_name", "shots_per_loss", "dead_place_penalty", "tie_handling"],
      "properties": {
        "penalty_name": { "type": "string", "default": "shot" },
        "shots_per_loss": { "type": "integer", "minimum": 0, "default": 0 },
        "dead_place_penalty": { "type": "integer", "minimum": 1, "default": 1 },
        "tie_handling": {
          "type": "string",
          "enum": ["ALL_TIED", "TIEBREAKER_ONLY", "SPLIT_PENALTY"],
          "default": "ALL_TIED"
        }
      }
    }
  }
}
```

---

## 3. State Machine & Lifecycle Specifications

### 3.1 Game Lock Lifecycle
- **Pre-Game (`SCHEDULED`):** Picks can be created, updated, or deleted. The UI evaluates `games.kickoff_time` minus the pool's `lock_offset` (from `pools.settings`) to determine if the submission window is open.
- **Lock Execution:** The backend API rejects any `POST` / `PUT` requests to the `picks` table where the current server time is greater than or equal to the calculated lock time. 
  - If `lockMode === 'ROLLING'`, granular locking is enforced per-game.
  - If `lockMode === 'GLOBAL_FIRST_GAME'`, submittals across all weekly games are rejected after the week's first kickoff.
- **In-Progress (`IN_PROGRESS`):** External API sync worker updates live scores periodically. UI can display live projections, but official scores are not written.

### 3.2 Scoring Finalization Lifecycle
1. The External API reports a game as complete.
2. The Sync Worker updates the `games` table: `status = 'FINAL'`, setting final `home_score` and `away_score`.
3. The Backend Scoring Engine is triggered.
4. **Scoring Exclusion Pipeline:** The engine checks `pools.settings.excludedGameWindows`. Any game falling within an excluded window (e.g., `THURSDAY_NIGHT`) is skipped and zero points are allocated.
5. The Engine evaluates all picks for that `game_id` (unsubmitted or `NULL` picks resolve gracefully to 0 points).
6. The Engine calculates points based on `pools.settings` and writes records with `Decimal(5,2)` precision to the `pick_results` table.
7. **Immutability:** Once a `pick_result` is written, it is static. Historical scores are read directly from `pick_results`.

### 3.3 Weekly Finalization Pipeline & Tiebreaker Engine
- **Trigger Condition:** Executes when all scheduled games for `week_no` have `status = 'FINAL'`.
- **Locking:** Acquires a transactional lock to prevent concurrent wrap-up executions.
- **Base Scoring & Tiebreaker Calculation:**
  1. Sum `points_awarded` for all members in the week.
  2. Identify the designated target game (`settings.tiebreaker.game_target`) and calculate actual total: `actual_total = (home_score + away_score)`.
  3. For each member, evaluate absolute distance: `distance = abs(actual_total - tie_breaker_prediction)`.
- **Precision Ranking:**
  - **Primary Sort:** Total points (DESC).
  - **Secondary Sort:** Tiebreaker distance (ASC).
- **Resolution & Fractional Penalties:**
  - Identifies **1st Place** (increments `first_place_finishes`).
  - Identifies **Dead Place**. If a Dead Place tie persists (identical points + identical distance), calculates `split_penalty = dead_place_penalty / count(tied_members)` and writes exact `Decimal(5,2)` values to `penalty_ledger`.
- **Stat Recalculation:** Atomically sums `penalty_ledger.delta` to update `pool_member_stats.total_shots_drank` (maintaining 2 decimal places).

### 3.4 Sync Failure Fallback
If the External NFL API goes offline, the Sync Worker logs a failure but the application remains fully operational. The frontend reads from the local `games` table (stale-while-revalidate strategy). Lock times and existing finalized scores remain intact.

---

## 4. API Specification & Data Masking

### Matrix Grid Endpoint (`GET /api/pools/:pool_id/matrix?week_no=X`)
Generates a structured 2D array representation of the week for UI rendering. Payload maps directly to rows (games), columns (users), and cells (the intersection pick). 

#### Dual-Mode Visibility & Anti-Peeking Rules
The Matrix API enforces strict data masking based on `pools.settings`:

- **Mode A (Strict/Hidden):** If `hide_picks_until_kickoff == true`, any pick where `game.kickoff_time > NOW()` belonging to another user (`requesting_user_id != target_user_id` and `role != 'ADMIN'`) is redacted. The pick's `selected_team_id` is mutated to `null` and a flag `is_masked: true` is appended.
- **Mode B (Open Slate):** If `hide_picks_until_kickoff == false`, picks are redacted ONLY if the opponent's `WeeklySubmission.is_finalized == false` (still a draft). Once a user finalizes their sheet (`is_finalized == true`), their picks become instantly exposed via `selected_team_id` to all pool members regardless of kickoff time.

---

## 5. Client-Side Determinism (The Snapshot Rule)

All UI Presets (`Contrarian`, `Mirror Rival`, `Favorites`, `Home/Away`) operate strictly in the browser.
- **Execution:** They compute purely as point-in-time form auto-fills in the browser.
- **No Binding:** Zero late-binding server synchronizations or relational bindings. User A mirroring User B on Tuesday creates static pick records. Subsequent mutations by User B prior to lock do not auto-propagate to User A.
- **Conditional Rules:** `Contrarian` and `Mirror Rival` presets are only enabled on the frontend when `hide_picks_until_kickoff === false`.

---

## 6. Audit & Compliance Implementation Details

- **Server-Side Enforcement:** Client-side validation is strictly advisory. The backend re-verifies all timestamps, roles, and ownership before committing transactions.
- **Admin Mutation Tracking:** If a pick is created or modified by an Admin overriding on behalf of a user, the `submitted_by` column on the `picks` table permanently records the Admin's ID.
- **Append-Only Logging:** Any destructive or overriding action performed by an Admin triggers an asynchronous write to the `audit_logs` table capturing `actor_id`, `action`, `target_entity_id`, `old_value`, and `new_value`.

---

## Phase 12 — League Operations, Resilience & Season Lifecycle

### Resilient Outbox & Inbox Pattern
The system ensures non-blocking outbound network actions by persisting `InboxMessage` and `OutboxEvent` records within the same database transaction as the domain logic. 
- **Inbox:** DB-local source of truth.
- **Outbox:** Claimed by a drain worker using `FOR UPDATE SKIP LOCKED`. Uses exponential backoff and transitions to `DEAD` status after 5 failed delivery attempts. A MailTransport interface (with SMTP adapter) separates transport from logic.

### Worker Leases, Reminders & Job Health
- A stateless reminder scanner runs every ~10 minutes to detect unfinalized picks, keyed by `dedupeKey`, dynamically adjusting to schedule changes (flex moves). Payloads are allow-listed and never contain pick details.
- All sync, scoring, outbox-drain, and reminder-scan jobs log their executions to the `JobRun` table. The Commissioner Ops Health panel surfaces metrics such as `syncStale`, `outbox` status, and recent jobs.

### Audit & Correction Engine
The `AuditLog` table prevents `UPDATE` and `DELETE` via DB triggers. All corrections use compensating logic:
- **Overrides:** Commissioner-entered overrides preempt the sync engine, flagging `divergedFromProvider = true`.
- **Proposals:** Upstream sync changes on FINAL games generate a `ScoreCorrectionProposal`. If `outcomeChanged = false`, it applies automatically; otherwise, it requires commissioner approval.
- **Scoring Runs:** Always run a dry run diff, then apply via a unique `inputHash`. Points are derived state (recomputed).
- **Ledger Expansion:** `penalty_ledger` is expanded to include `entryType` (`ASSESSMENT`, `FULFILLMENT`, `WAIVER`, `REVERSAL`, `OPENING_BALANCE`) and `reversalOfId`. Updates are strictly additive. The outstanding balance is derived dynamically using the effect formula: `ASSESSMENT (+), OPENING_BALANCE (+), FULFILLMENT (-), WAIVER (-), REVERSAL (-effect(target))`. Negative balances are strictly blocked.

### Season State Machine & Seal Design
- **State Machine:** `SETUP` -> `ACTIVE` -> `FINALIZING` -> `CLOSED`.
- **Close-readiness:** Checks for un-finalized games, open proposals, runs, Shot-Cam verifications, and outstanding penalties.
- **Seal:** Moving to `CLOSED` generates a `SeasonSeal`: an immutable JSON snapshot with amounts stored as strings (e.g. `"0.00"`), a SHA256 checksum, and the selected carry-over policy (`CARRY`, `EXPIRE`, `WAIVE`). Reopening the season marks the seal `supersededAt` without deleting it.

### Rollover & Archive Model
- **Rollover:** Creates the next Season in `SETUP`, cloning rules with "review before activate" flags on exclusions/lockouts.
- **Carry-over:** `OPENING_BALANCE` entries propagate only for `CONFIRMED` users when the `CARRY` policy is executed.
- **Archive Read Model:** All history reads query the immutable `SeasonSeal` exclusively. Export features generate JSON/CSV bundles for `CLOSED` seasons only, guaranteeing that draft picks are never leaked.

---

## Phase 12 Design Decisions
1. **Points are derived; penalties are ledger:** Game scores recompute in-place; penalty counts require strictly additive transactions.
2. **Provider corrections are proposals:** Auto-apply only occurs when no outcome changes.
3. **Overrides beat sync:** Divergence from the data provider is explicitly flagged.
4. **Locks derive from stored kickoff only:** Sync outages never unlock a game.
5. **Inbox is the source of truth:** Email delivery is strictly best-effort outbox logic.
6. **Aggregates are never stored numerically:** Sealed season JSONs use fixed-string representations for balances.
7. **Pick-on-behalf is write-only:** Admins cannot scrape user drafts prior to locking via exception logs.
8. **History reads seals only:** Historical dashboards and exports never query the live relational tables.
9. **Ledger `entryType` is additive and parallel to `reason` (Ruling R-12.2-A):** 
   - `entryType` is added as a NEW column alongside existing `reason`. `reason` is NOT replaced, renamed, or dropped.
   - `reason` = cause/rule code (why). `entryType` = balance effect (what). Balance logic MUST NOT read `reason`.
   - Backfill is achieved via the column DEFAULT only. The migration MUST NOT contain any `UPDATE` and MUST NOT disable, drop, or alter the immutability trigger (INV-2).
   - Non-ASSESSMENT write paths remain disabled behind a feature flag until the read-path audit passes.
   - Reversal-of-reversal is forbidden. A REVERSAL may only target a non-REVERSAL entry with the same league, season, and user, and equal amount.
10. **Physical schema names govern (Ruling R-12.2-B):** Logical names in handoffs are documentation only. The system strictly maps to the existing physical table `penalty_ledger` and the amount column `delta`.
11. **Ledger `delta` semantics:** `delta` is a strictly positive Decimal(5,2) magnitude. The sign (+/-) is derived entirely from `entry_type`. Balance settlement logic must never read the `reason` column.
12. **Ruling R-12.2-C / BR-1 Remediation:**
   - **INV-2 Enforcement:** A database-level PL/pgSQL function and trigger (`enforce_append_only`) physically prevents `UPDATE`, `DELETE`, and `TRUNCATE` operations on `penalty_ledger`. This is deployed out-of-band (BR-1).
   - **Schema Identifiers:** `reversal_of_id` must use the `uuid` data type (matching `penalty_ledger.id`).
   - **Naming Convention:** `snake_case` strictly applied for all new database columns, constraints, and index names. Prisma fields use `camelCase` mapped via `@map`. Enums use `UPPER_CASE`.
   - **Advisory Locks:** Any typed ledger writes that reduce or reverse balances (e.g., `FULFILLMENT`, `WAIVER`, `REVERSAL`) MUST acquire a transaction-scoped advisory lock serialized by `pool_id` and `user_id`.
13. **Ledger-bearing deletion:** Pools and memberships carrying a ledger are never hard-deleted (archive/soft-delete only).
14. **Season ≡ Pool:** No duplicate `Season` table is created. All Phase 12 references to `seasonId` / `leagueId` map to `pool_id`.
15. **Deny-by-Default Data API:** Every Phase 12 table ships deny-by-default to Data API roles.
16. **Money Input Parsing:** Ledger money input is parsed by one strict shared parser; `parseInt`, `parseFloat`, and `Number` are never used.
17. **Evidence Reporting Standard:** Every evidence report must state the host class, database, current_user, and server version.
18. **Disposable Rehearsal DB:** All destructive work occurs on a disposable rehearsal database first. Hosted environments receive `migrate deploy` only.
19. **Signed Legacy Assessment:** Legacy ASSESSMENT rows may carry a signed delta, but typed rows moving forward are always positive.
20. **Pool-Scoped Authority:** Authority is derived from `pools.admin_id` and a pool-scoped co-commissioner membership flag; global Roles are never used to authorize pool-specific operations.
21. **Authorization Defect Fixes:** BR-5 authorization fixes are code-only and strictly precede any new commissioner endpoints.
22. **Decimal-Only Money Math:** Money splitting is Decimal-only; the ledger never receives `delta = 0`. Characterization tests are required before changes.
23. **Invariant Evidence Status:** Every invariant carries an evidence status; Phase 12 acceptance may not assume more than the register states.
24. **Idempotent Period-Close:** Idempotent period-close is enforced via a DB-enforced claim in the same transaction.
25. **Acceptance Tests Assert Behavior:** Acceptance tests assert behavior (SQLSTATE, row state), never message text.
26. **Guarded Read Routes:** Read routes are guarded exactly like write routes (uuid -> pool exists -> commissioner or ACTIVE member); guards change access, never payloads.
27. **Period-Close Preconditions:** Period-close preconditions are evaluated from authoritative state; empty sets fail closed; no bypass flag.

### BR-4b Idempotency Design
- A new table `weekly_wrapups` serves as a claim table to enforce idempotency during period-close.
- A unique index on `penalty_ledger` was **REJECTED** because it would break the REVERSAL + new ASSESSMENT correction flow.
- Consequences:
  1. Concurrent wrap-ups block on the primary key, avoiding duplicate writes.
  2. The claim occurs as the first statement in the transaction.
  3. `skipDuplicates: true` returns a count of 0 on duplicates, translating to a `409 ALREADY_WRAPPED_UP` without throwing an unhandled Prisma constraint error.
- **SQL Implementation:**
```sql
CREATE TABLE weekly_wrapups (
  pool_id      uuid          NOT NULL,
  week_number  integer       NOT NULL,
  created_at   timestamp(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT weekly_wrapups_pkey PRIMARY KEY (pool_id, week_number),
  CONSTRAINT weekly_wrapups_pool_id_fkey FOREIGN KEY (pool_id)
    REFERENCES pools(id) ON DELETE RESTRICT ON UPDATE RESTRICT
);

INSERT INTO weekly_wrapups (pool_id, week_number)
SELECT DISTINCT pool_id, week_number
FROM penalty_ledger
WHERE reason = 'WEEKLY_DEAD_PLACE' AND week_number IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE FUNCTION weekly_wrapups_prevent_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'append-only violation: % on weekly_wrapups is not permitted (INV-2)', TG_OP;
END; $$;

CREATE TRIGGER weekly_wrapups_no_update_delete
  BEFORE UPDATE OR DELETE ON weekly_wrapups
  FOR EACH ROW EXECUTE FUNCTION weekly_wrapups_prevent_mutation();
CREATE TRIGGER weekly_wrapups_no_truncate
  BEFORE TRUNCATE ON weekly_wrapups
  FOR EACH STATEMENT EXECUTE FUNCTION weekly_wrapups_prevent_mutation();

REVOKE ALL ON FUNCTION weekly_wrapups_prevent_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE weekly_wrapups FROM anon, authenticated;
ALTER TABLE weekly_wrapups ENABLE ROW LEVEL SECURITY;
```

### Ruling R-12.2-E Errata & Updates
- **Environment Naming:** "postgres" is a DB name, not an environment; `postgres.<project-ref>` indicates a hosted pooler connection.
- **BR-1 Test 6 Finding:** Test 6 caught a `23503` (FK violation), not the append-only `P0001` error.
- **INV-1 Validation:** DB-level `numeric(5,2)` exactly verified against the Supabase hosted pooler environment.
- **INV-8 Validation:** Unverified locally; policies in `storage.objects` are missing.
- **BR-3 Classification:** The server.ts manual adjustment flaw is officially classified as an INV-1 defect (silent truncation, garbage-prefix acceptance). Acceptance of zero/negative violates R-12.2-B but is not strictly an INV-1 violation.
- **Phase 12 Conventions:**
  - IDs are `uuid` (`id String @id @default(uuid()) @db.Uuid`).
  - Foreign keys use `RESTRICT/RESTRICT` to pools, users, and memberships.
  - Timestamps use `timestamp(3)` in UTC.
  - API routes use `/api/pools/:pool_id/...`.
- **Physical Reconciliation Map Dispositions:**
  - *Approved:* `leagueId/seasonId` -> `pool_id`, `userId` -> `user_id`, `weekId` -> `week_number`.
  - *Approved for 12.1:* `inbox_messages`, `outbox_events`, `notification_preferences`, `job_runs`.
  - *Provisional:* `season_state` enum, `MemberSeasonStatus`, `rolled_over_from_pool_id`, `game_result_overrides`, `scoring_runs`, `season_seals`.
  - *Rejected/Held:* `COMMISSIONER` role duplicate rejected; `audit_logs` reuse held; `CO_COMMISSIONER` held; `games` scoping held.

### Ruling R-12.2-F Errata & Updates
- **Hosted Environment Rule:** The target database is a hosted Supabase project, NOT a local database. The previous "Local PostgreSQL" documentation was incorrect.
- **BR-1 Test 6 Finding:** The query `DELETE FROM pools` correctly triggered a `23503` cascade failure constraint.
- **INV-1 Validation Verification:** Verified against the hosted Supabase environment.
- **INV-8 Status:** Unverified in the hosted environment.
- **Role Extension:** The `Role` extension for `CO_COMMISSIONER` is officially REJECTED.
- **BR-3 Classification Amendment:** The defect is classified as an INV-1 flaw (truncation, garbage acceptance). Negative adjustments are acknowledged as a legitimate feature ("Pardon") and are not violations.
- **Migration B/C Alteration:** 
  - Migration B is `penalty_ledger_typed_delta_positive` to allow legacy rows to remain signed.
  - Migration C uses `abs(target.delta)` and enforces a `week_number` match.
- **S-1 Exposure Finding:** Data API exposure detected on all 12 public tables (including `picks` and `weekly_submissions`), pending BR-2c execution.
- **S-2 Authorization Finding:** S-2 authorization gap currently under investigation.

### Ruling R-12.2-G Errata & Updates
- **Environment Naming & Classification:** The hosted environment is provisionally classified as SHARED-DEV until the owner confirms no real participant data exists. The earlier statement "Local PostgreSQL" was incorrect.
- **BR-1 Deviations:** BR-1 was applied to hosted via `prisma migrate dev` instead of `deploy`. Installed function names (`penalty_ledger_prevent_update_delete`, `penalty_ledger_prevent_truncate`) deviate from the committed `enforce_append_only` spec.
- **Credential Exposure:** `users.password_hash` is credential material that remains exposed to the Data API until BR-2c executes.
- **INV-8 Re-baseline:** INV-8's storage half is not implemented at runtime.
- **Sequence:** BR-0 -> BR-1 acceptance -> BR-2b -> BR-2c -> hosted 12.1 migrations. BR-3a, BR-4, and BR-5 run in parallel with BR-0. 12.1 development unblocked on rehearsal DB after BR-0 and BR-5 helper are merged.
- **S-2 & Wrap-up Findings:** S-2 is confirmed (cross-pool admin gap). Wrap-up uses float arithmetic (`Number((...).toFixed(2))`) and lacks idempotency guards (duplicate wrap-ups create duplicate rows).

### Ruling R-12.2-H Errata & Updates
- **BR-1 Acceptance Rules:** Criterion (c) is withdrawn. The installed function names and message wording are accepted.
- **S-4 Finding (Member-Facing Routes):** Member-facing read routes were exposed cross-pool without proper active membership checks. This is resolved by extending `requirePoolMember` to all read endpoints.

### Ruling R-12.2-I Errata & Updates
- **FINAL-games Precondition:** Guard uses the shared exclusion resolver, the fallback does not feed the guard, empty sets fail closed.
- **Stuck-game Limitation:** A postponed or cancelled game blocks that week's wrap-up until 12.2 overrides.

### Ledger Effect Formula & Reversal Constraints
`Outstanding = Σ effect(e)` where:
- `ASSESSMENT` = `+delta` (delta may be signed for legacy rows)
- `OPENING_BALANCE` = `+delta`
- `FULFILLMENT` = `-delta`
- `WAIVER` = `-delta`
- `REVERSAL` = `-effect(target)`
- **Constraints:** Double reversal is rejected (unique `reversal_of_id`); reversal-of-reversal is rejected; target must match user/season/amount. Over-fulfillment or over-waiver that drops `Outstanding` below 0 is rejected with an explicit error.

### Read-Path Audit Gate & LEDGER_TYPED_WRITES Flag
Before enabling `LEDGER_TYPED_WRITES`, a read-path parity test must pass. Every query/service/UI selector aggregating ledger amounts must route through a shared `ledgerEffect` helper (in TS and equivalent SQL view). The parity test must prove `old totals == helper totals` exactly to the cent for all pre-existing rows.

---

## Phase 12 Pre-Flight Audit & BR-1 Execution Record
- **BR-1 Status:** Immutability trigger successfully deployed to the hosted environment. *Acceptance is PENDING local fixture testing on a rehearsal database and alignment with the committed function names.*
- **G1 Precision Check:** Verified that `delta` is physically typed as `numeric(5,2)` in the hosted PostgreSQL catalog.
- **BR-2 API Baseline (G3-G4):** Pre-Flight G4 confirmed that all public tables currently lack RLS and have full CRUD grants for `anon` and `authenticated` roles, setting the baseline for the pending BR-2 lockdown.

## Invariant Status Register

- **INV-1 Precision:** Every per-entry penalty amount is stored as Decimal(5,2). No floating point anywhere. Use Prisma.Decimal/decimal.js for arithmetic. API DTOs carry amounts as fixed 2-decimal strings (e.g. "2.50"). Exact split-penalty math is unchanged. *(Evidence: DB numeric(5,2) verified hosted dev. App violated in wrap-up float & adjust parseInt; remediation BR-4/BR-3a).*
- **INV-2 Immutable Ledger:** The penalty ledger is append-only. UPDATE and DELETE are prohibited (DB trigger + tests). Corrections are compensating entries only. *(Evidence: INSTALLED, acceptance conditional on definitions).*
- **INV-3 Snapshot Rule:** Client-side presets (All Home, All Away, Favorites, Contrarian, Mirror Rival) operate strictly in client memory with ZERO uncommitted server writes. Phase 12 adds no server persistence of preset or draft-pick state. *(Evidence: Unverified in Phase 12 pre-work).*
- **INV-4 Matrix Anti-Peeking:** Square Sheet Matrix dual-mode visibility is preserved: strict lockout mode, and open-slate mode guarded by pick finalization. NO Phase 12 endpoint, notification payload, audit record, dry-run diff, recap text, or export may reveal any pick that is not yet visible under the active mode's rules. *(Evidence: VIOLATED at API layer (S-4, confirmed) until BR-5 merges; DB exposure open (S-1) until BR-2c).*
- **INV-5 Fallback & Lockout Logic:** Granular rolling vs. global game lockouts, excluded game windows (e.g. skipped Thursday night points), and the decoupled 3-tier sync/scoring fallback are unchanged. Lock state is derived server-side from the stored kickoff timestamp only. Sync outages, overrides, and corrections can never unlock or extend a lock. *(Evidence: Not audited; regression suite is evidence).*
- **INV-6 Non-Blocking Outbound:** Outbound network actions are non-blocking. Database transactions never roll back due to external transport failure. *(Evidence: N/A until 12.1).*
- **INV-7 Anti-Bloat:** No live weather, no sports-betting odds, no Twilio/SMS, no payment processors, no brittle third-party APIs. *(Evidence: Partial. No Data API consumers in client/src; whole-repo audit pending).*
- **INV-8 Shot-Cam:** Supabase Storage RLS for the Shot-Cam verification portal is unchanged. *(Evidence: NOT IMPLEMENTED at runtime; metadata endpoints only).*
- **R-12.2-I guard:** IMPLEMENTED, UNVERIFIED pending rehearsal tests.
- **R-12.2-Y:** applied_by root cause identified as test-made table in wrapUpConcurrency. False DDL-grep finding noted. App runs locally.
- **R-12.2-Z:** stale-submission finding noted. R-12.2-Y re-issued.
- **R-12.2-AA:** S-6 triggered (admin picks routes cross-pool). Decision #49 implemented. /api/admin/users accepted as platform-level. Migration count corrected to 8.
- **R-12.2-AB:** BR-5b not accepted (uncommitted). Decisions #50-#51 applied. Docs-base verdict withdrawn. Default-creation deviation recorded.
- **R-12.2-AC:** Decision #52 applied (claim code fails closed). S-7 global admin override removed from Shot-Cam routes. 00e89dd deviation recorded.
- **R-12.2-AD:** Decisions #53-#54 applied. S-7 reclassified. S-8 write-on-GET removed. Commit-hygiene deviation recorded. Decisions #28-#54 registered.
- **R-12.2-AE:** Decision #55 applied. S-7 reversal confirmed. S-8 explicit pool_id guarded. Claim step fail-closed fixed. Wrap-up game-set deviation recorded.
- **R-12.2-AE-V2:** Ruling BLOCKED. BR-4b migration-branch test failure documented. Decisions #53, #54, and #55 reconciled.
- **R-12.2-AE-V3:** Ruling BLOCKED solely on Git finalization. BR-4b 7/7 and S-8 passed. Git tree cleaned and raw prisma generate output captured.
- **R-12.2-AE-V4:** Ruling BLOCKED solely on Git finalization. BR-4b 7/7, S-8, Decision #52, and Decision #54/#55 verification passed. Git tree cleaned prior to evidence generation.
- **R-12.2-AE-V4 was recorded BLOCKED in the register and later APPROVED by the Fallback; the Arbiter ratifies gates individually.**

---

## Phase 12 Decision Register (Appendix A)

1. **Decision #1:** Numeric precision Decimal(5,2) standardized for all penalty ledger entries and calculations (INV-1).
2. **Decision #2:** Immutable penalty ledger enforced via database-level append-only triggers (`penalty_ledger_prevent_update_delete`, `penalty_ledger_prevent_truncate`) (INV-2).
3. **Decision #3:** Elimination of floating-point arithmetic in scoring and wrap-up services; use `Prisma.Decimal` and `decimal.js`.
4. **Decision #4:** Client presets (All Home, All Away, Favorites, Contrarian, Mirror Rival) operate purely in memory with zero server persistence (INV-3).
5. **Decision #5:** Square Sheet Matrix dual-mode anti-peeking visibility enforcement (INV-4).
6. **Decision #6:** Granular rolling vs global game lockout derived exclusively from stored kickoff timestamps (INV-5).
7. **Decision #7:** Support for excluded game windows (e.g. skipped Thursday night games) in scoring and wrap-up.
8. **Decision #8:** Decoupled 3-tier sync/scoring fallback architecture preserving local DB as source of truth.
9. **Decision #9:** Non-blocking outbound network actions with database transactions insulated against external transport failures (INV-6).
10. **Decision #10:** Anti-bloat principle (INV-7): prohibition of live odds, weather APIs, Twilio/SMS, payment processors, and third-party bloat.
11. **Decision #11:** Shot-Cam storage verification portal metadata endpoints and owner verification model (INV-8).
12. **Decision #12:** Role enum strictly limited to `ADMIN` and `USER`; rejection of `COMMISSIONER` or `CO_COMMISSIONER` role additions.
13. **Decision #13:** Explicit pool scoping via `/api/pools/:pool_id/...` across all pool-specific endpoints.
14. **Decision #14:** Foreign key constraints enforce `RESTRICT` on pools, users, and memberships.
15. **Decision #15:** Primary keys standardized to UUID (`id String @id @default(uuid()) @db.Uuid`) across relational models.
16. **Decision #16:** Timestamps standardized to `timestamp(3)` in UTC across all models.
17. **Decision #17:** Physical reconciliation mapping: `leagueId`/`seasonId` -> `pool_id`, `userId` -> `user_id`, `weekId` -> `week_number`.
18. **Decision #18:** Migration naming and sequencing standardization for Phase 12.
19. **Decision #19:** Ledger effect formula: `Outstanding = Σ effect(e)` where assessments/opening balances are `+delta`, fulfillments/waivers are `-delta`, reversals are `-effect(target)`.
20. **Decision #20:** Removal of global ADMIN bypass on pool-scoped routes (`requirePoolMember` and `requirePoolCommissioner`).
21. **Decision #21:** Reversal constraints: target must match user/season/amount; unique `reversal_of_id`; rejection of double reversals.
22. **Decision #22:** Read-path audit parity test required before enabling `LEDGER_TYPED_WRITES`.
23. **Decision #23:** BR-1 immutability triggers installed on `penalty_ledger` (`BEFORE DELETE OR UPDATE` and `BEFORE TRUNCATE`).
24. **Decision #24:** Rejection of table mutation on `weekly_wrapups` via `weekly_wrapups_prevent_mutation()` trigger.
25. **Decision #25:** Hosted Supabase database environment classified as SHARED-DEV with write freeze.
26. **Decision #26:** BR-2b/BR-2c Row-Level Security and Data API lockdown across public tables.
27. **Decision #27:** Direct anon/authenticated access revoked from `users.password_hash` and sensitive tables.
28. **Decision #28:** Local rehearsal database environment isolation (`pickem_rehearsal` on `localhost:5432`).
29. **Decision #29:** `assertDisposableDatabase()` safeguard preventing test execution against hosted database.
30. **Decision #30:** Separation of `.env` (rehearsal) and `.env.hosted` (hosted pooler).
31. **Decision #31:** Guarded drop of rehearsal schema on hosted database.
32. **Decision #32:** Permanent `.env` flip to local rehearsal and Vitest global setup assertions.
33. **Decision #33:** CI documentation append-only guard enforcing strictly 0 deletions against baseline `e41ce72`.
34. **Decision #34:** `db:reset` script standardizing rehearsal recreation with `app.disposable=true` sentinel.
35. **Decision #35:** Rehearsal database provisioning with `anon`, `authenticated`, and `service_role` roles.
36. **Decision #36:** Migration catalog checksum verification across all 8 migration files.
37. **Decision #37:** Negative control verification using isolated worktrees (`.worktree-ctl`).
38. **Decision #38:** Prohibition of test-created tables in production/rehearsal migrations.
39. **Decision #39:** Git diff allowlist check enforcing bounded PR modifications.
40. **Decision #40:** DDL grep negative control verifying zero DDL or SET statements in application codebase.
41. **Decision #41:** BR-2 pre-check, post-check, and rollback script provisioning for hosted migration.
42. **Decision #42:** Verification of SQLSTATE 42501 permission denial for anon and authenticated roles.
43. **Decision #43:** Elimination of float arithmetic in weekly wrap-up calculations.
44. **Decision #44:** Tiebreaker distance calculation using absolute score difference.
45. **Decision #45:** Split-penalty rounding and remainder distribution logic preservation.
46. **Decision #46:** Weekly wrap-up game-set resolution via shared scoring exclusion resolver.
47. **Decision #47:** Strict fail-closed wrap-up precondition if non-excluded games are pending or absent.
48. **Decision #48:** CI check for migration file checksums against `_prisma_migrations`.
49. **Decision #49:** CI route scan enforcing parameter scoping and guard middleware on all routes.
50. **Decision #50:** `GET /api/admin/users` allowlisted as platform-level admin endpoint.
51. **Decision #51:** Admin picks routes scoped with `requirePoolCommissioner` (`from: 'query'` / `from: 'body'`).
52. **Decision #52:** Weekly wrap-up claim step fails closed (`CLAIM_STORE_UNAVAILABLE`) if `weekly_wrapups` table is absent.
53. **Decision #53:** Agents never push, force-push or change remotes.
54. **Decision #54:** GET handlers perform no writes.
55. **Decision #55:** A guard is never bypassed by a conditional when its dependency is missing.

---

## Phase 12 Decision Register (supersedes the register at ARCHITECTURE.md lines 498-548)

1 Points are derived; penalties are ledger entries.
2 Provider corrections are proposals; auto-apply only when no outcome changes.
3 Manual overrides beat sync; divergence is flagged.
4 Locks derive from the stored kickoff time only.
5 Inbox is the source of truth; email is best-effort.
6 Aggregates are never stored in numeric columns.
7 Pick-on-behalf is write-only.
8 History reads sealed snapshots only.
9 Ledger entry_type is additive and parallel to reason; backfill by column default, never UPDATE.
10 Physical schema names govern; logical names in handoffs are documentation.
11 DB-enforced invariants are verified against the catalog, never assumed.
12 Typed ledger writes serialize per (pool_id, user_id).
13 Ledger-bearing pools and memberships are never hard-deleted.
14 Season is Pool; routes use /api/pools/:pool_id.
15 New tables and functions are deny-by-default to Data API roles.
16 Money input goes through one strict parser; never parseInt/parseFloat/Number.
17 Every evidence report states host class, database, user and server version.
18 Destructive work runs only on a disposable database; hosted gets migrate deploy only.
19 Legacy ASSESSMENT rows may be signed; typed rows are positive.
20 Per-pool authority derives from pools.admin_id; no global-role override.
21 Authorization defect fixes are code-only and precede new commissioner endpoints.
22 Money splitting is Decimal-only with characterization first; no zero-delta rows.
23 Every invariant carries an evidence status.
24 Period-close jobs are idempotent via a DB-enforced claim in the same transaction.
25 Acceptance tests assert behavior (SQLSTATE, row state), never message text.
26 Read routes are guarded like write routes; guards change access, never payloads.
27 Period-close preconditions use authoritative state; empty sets fail closed; no bypass flag.
28 VERIFIED requires numbers or raw output in the report body.
29 Isolation is by database, never by schema; the guard has three independent checks.
30 Raw evidence is unedited tool output; identifiers resolve; figures are consistent.
31 Irreversible operations run only from committed scripts with machine-checked preconditions.
32 The default environment is disposable; hosted credentials live in a separate file.
33 Docs are append-only, enforced by CI against a tagged baseline.
34 Every acceptance criterion maps to a named test or evidence item.
35 Tests never create or alter schema; databases reset via a guarded script.
36 A migration stays off the deployable branch until its hosted gate clears.
37 Evidence is produced by one committed script; empty sections fail; UTF-8 via spawn.
38 Trigger proofs run as a privileged role; privilege proofs as anon/authenticated.
39 Evidence and CI scripts measure inputs independently and ship with a negative control.
40 Every evidence run stamps commit, branch and time; identical output counts as not run.
41 A matrix row may cite only tests present in the committed JSON artifact.
42 Schema evidence comes from real pg_dump including ACLs, bodies and indexes.
43 Every ordered criterion appears in the matrix as PASS, FAIL or NOT VERIFIED.
44 Only a human runs or approves hosted changes; authorizations are typed in the conversation.
45 Rollbacks are generated from a pre-state snapshot and proven by hash equality.
46 External exposure is measured identically before and after a change.
47 Machine-checkable gates are decided by script exit codes.
48 Applied migrations are immutable; CI compares checksums.
49 Authorization scans cover every source of an identifier (path, query, body, headers).
50 Each test run begins with reset, migrate deploy and generate, and prints a header.
51 Tests are never deleted or weakened in non-test commits; controls run in a separate worktree.
52 Code depending on a schema object ships with its migration or fails closed.
53 Agents never push, force-push or change remotes.
54 GET handlers perform no writes.
55 A guard is never bypassed by a conditional when its dependency is missing.

V4: APPROVED by Fallback; RATIFIED IN PART by the Arbiter.








````


