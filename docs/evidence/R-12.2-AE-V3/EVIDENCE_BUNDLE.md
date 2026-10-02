# EVIDENCE BUNDLE — RE: RULING R-12.2-AE-V3
**Date (UTC):** 2026-10-01T06:22:09.117Z  
**Current Commit:** 24dfc38a52d5f42f738b69862878d55dea0e0225  
**Branch:** main  
**Generator Self-Test Exit Code:** 1  
**Generator Execution Exit Code:** 0  

---

## 1. Generator Self-Test Verification

```text
(node:15580) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/scripts/generate_evidence.js is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to \\?\C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\package.json.
(Use `node --trace-warnings ...` to show where the warning was created)
Generator Self-Test Caught Expected Error:
Empty output detected for command: "Write-Output """
```
*Verification: The generator strictness check proved operational by failing on an empty command block and exiting with code 1.*

---

## 2. Git State & Secret Cleanliness

### 2.1 Working Branch Status
```text
## main...origin/main [ahead 9]
 M scripts/generate_evidence.js
?? docs/evidence/R-12.2-AE-V3/
?? prisma_generate_br4b.txt
?? prisma_generate_main.txt
?? test_results_br4b.txt
?? test_results_main.txt
?? vitest.json
```

### 2.2 Recent Commits (Last 5)
```text
24dfc38 chore: finalize code, docs, and scripts for R-12.2-AE-V3
749f6fb docs: regenerate evidence bundle for R-12.2-AE-V2 with BR-4b fixes and live context
8d5cf90 docs: generate evidence bundle and append R-12.2-AE rulings
9eef5e3 fix: claim step fail-closed and S-8 explicit pool_id authorization
e8959ea docs: generate evidence bundle and append R-12.2-AD rulings
```

### 2.3 Secret & Credential Scan (Tests Excluded)
```text
Clean
```
*Verification: Clean repository history confirmed outside test fixtures.*

---

## 3. Migration State & Catalog Verification

### 3.1 Migration Directory Count (Total: 8)
```text
Physical migration directory count: 8
```

### 3.2 Migration Git Tree (`git ls-tree --name-only HEAD prisma/migrations/`)
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

## 4. Source Code Verifications

### 4.1 Wrap-Up Claim Step Fail-Closed (`src/services/weeklyWrapUp.ts:151-215`)
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

### 4.2 S-8 GET /api/games Pool Scoping & Authorization (`src/server.ts:111-160`)
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

## 5. DDL Grep & Worktree Negative Control

### 5.1 Positive Control at HEAD (Clean Live State)
```text
CLEAN: 0 DDL or SET search_path statements found across tests/, scripts/dev/, prisma/seed.ts
```

### 5.2 Negative Control at Pre-Retirement Commit (e0e8579, Isolated `.worktree-ctl`)
```text
tests/wrapUpConcurrency.test.ts:17:      CREATE TABLE IF NOT EXISTS public.weekly_wrapups (
```

---

## 6. Architecture Decision Register (Appendix A Grep)

```text
ARCHITECTURE.md:485:- **R-12.2-AA:** S-6 triggered (admin picks routes cross-pool). Decision #49 implemented. /api/admin/users accepted as platform-level. Migration count corrected to 8.
ARCHITECTURE.md:487:- **R-12.2-AC:** Decision #52 applied (claim code fails closed). S-7 global admin override removed from Shot-Cam routes. 00e89dd deviation recorded.
ARCHITECTURE.md:489:- **R-12.2-AE:** Decision #55 applied. S-7 reversal confirmed. S-8 explicit pool_id guarded. Claim step fail-closed fixed. Wrap-up game-set deviation recorded.
ARCHITECTURE.md:497:1. **Decision #1:** Numeric precision Decimal(5,2) standardized for all penalty ledger entries and calculations (INV-1).
ARCHITECTURE.md:498:2. **Decision #2:** Immutable penalty ledger enforced via database-level append-only triggers (`penalty_ledger_prevent_update_delete`, `penalty_ledger_prevent_truncate`) (INV-2).
ARCHITECTURE.md:499:3. **Decision #3:** Elimination of floating-point arithmetic in scoring and wrap-up services; use `Prisma.Decimal` and `decimal.js`.
ARCHITECTURE.md:500:4. **Decision #4:** Client presets (All Home, All Away, Favorites, Contrarian, Mirror Rival) operate purely in memory with zero server persistence (INV-3).
ARCHITECTURE.md:501:5. **Decision #5:** Square Sheet Matrix dual-mode anti-peeking visibility enforcement (INV-4).
ARCHITECTURE.md:502:6. **Decision #6:** Granular rolling vs global game lockout derived exclusively from stored kickoff timestamps (INV-5).
ARCHITECTURE.md:503:7. **Decision #7:** Support for excluded game windows (e.g. skipped Thursday night games) in scoring and wrap-up.
ARCHITECTURE.md:504:8. **Decision #8:** Decoupled 3-tier sync/scoring fallback architecture preserving local DB as source of truth.
ARCHITECTURE.md:505:9. **Decision #9:** Non-blocking outbound network actions with database transactions insulated against external transport failures (INV-6).
ARCHITECTURE.md:506:10. **Decision #10:** Anti-bloat principle (INV-7): prohibition of live odds, weather APIs, Twilio/SMS, payment processors, and third-party bloat.
ARCHITECTURE.md:507:11. **Decision #11:** Shot-Cam storage verification portal metadata endpoints and owner verification model (INV-8).
ARCHITECTURE.md:508:12. **Decision #12:** Role enum strictly limited to `ADMIN` and `USER`; rejection of `COMMISSIONER` or `CO_COMMISSIONER` role additions.
ARCHITECTURE.md:509:13. **Decision #13:** Explicit pool scoping via `/api/pools/:pool_id/...` across all pool-specific endpoints.
ARCHITECTURE.md:510:14. **Decision #14:** Foreign key constraints enforce `RESTRICT` on pools, users, and memberships.
ARCHITECTURE.md:511:15. **Decision #15:** Primary keys standardized to UUID (`id String @id @default(uuid()) @db.Uuid`) across relational models.
ARCHITECTURE.md:512:16. **Decision #16:** Timestamps standardized to `timestamp(3)` in UTC across all models.
ARCHITECTURE.md:513:17. **Decision #17:** Physical reconciliation mapping: `leagueId`/`seasonId` -> `pool_id`, `userId` -> `user_id`, `weekId` -> `week_number`.
ARCHITECTURE.md:514:18. **Decision #18:** Migration naming and sequencing standardization for Phase 12.
ARCHITECTURE.md:515:19. **Decision #19:** Ledger effect formula: `Outstanding = Σ effect(e)` where assessments/opening balances are `+delta`, fulfillments/waivers are `-delta`, reversals are `-effect(target)`.
ARCHITECTURE.md:516:20. **Decision #20:** Removal of global ADMIN bypass on pool-scoped routes (`requirePoolMember` and `requirePoolCommissioner`).
ARCHITECTURE.md:517:21. **Decision #21:** Reversal constraints: target must match user/season/amount; unique `reversal_of_id`; rejection of double reversals.
ARCHITECTURE.md:518:22. **Decision #22:** Read-path audit parity test required before enabling `LEDGER_TYPED_WRITES`.
ARCHITECTURE.md:519:23. **Decision #23:** BR-1 immutability triggers installed on `penalty_ledger` (`BEFORE DELETE OR UPDATE` and `BEFORE TRUNCATE`).
ARCHITECTURE.md:520:24. **Decision #24:** Rejection of table mutation on `weekly_wrapups` via `weekly_wrapups_prevent_mutation()` trigger.
ARCHITECTURE.md:521:25. **Decision #25:** Hosted Supabase database environment classified as SHARED-DEV with write freeze.
ARCHITECTURE.md:522:26. **Decision #26:** BR-2b/BR-2c Row-Level Security and Data API lockdown across public tables.
ARCHITECTURE.md:523:27. **Decision #27:** Direct anon/authenticated access revoked from `users.password_hash` and sensitive tables.
ARCHITECTURE.md:524:28. **Decision #28:** Local rehearsal database environment isolation (`pickem_rehearsal` on `localhost:5432`).
ARCHITECTURE.md:525:29. **Decision #29:** `assertDisposableDatabase()` safeguard preventing test execution against hosted database.
ARCHITECTURE.md:526:30. **Decision #30:** Separation of `.env` (rehearsal) and `.env.hosted` (hosted pooler).
ARCHITECTURE.md:527:31. **Decision #31:** Guarded drop of rehearsal schema on hosted database.
ARCHITECTURE.md:528:32. **Decision #32:** Permanent `.env` flip to local rehearsal and Vitest global setup assertions.
ARCHITECTURE.md:529:33. **Decision #33:** CI documentation append-only guard enforcing strictly 0 deletions against baseline `e41ce72`.
ARCHITECTURE.md:530:34. **Decision #34:** `db:reset` script standardizing rehearsal recreation with `app.disposable=true` sentinel.
ARCHITECTURE.md:531:35. **Decision #35:** Rehearsal database provisioning with `anon`, `authenticated`, and `service_role` roles.
ARCHITECTURE.md:532:36. **Decision #36:** Migration catalog checksum verification across all 8 migration files.
ARCHITECTURE.md:533:37. **Decision #37:** Negative control verification using isolated worktrees (`.worktree-ctl`).
ARCHITECTURE.md:534:38. **Decision #38:** Prohibition of test-created tables in production/rehearsal migrations.
ARCHITECTURE.md:535:39. **Decision #39:** Git diff allowlist check enforcing bounded PR modifications.
ARCHITECTURE.md:536:40. **Decision #40:** DDL grep negative control verifying zero DDL or SET statements in application codebase.
ARCHITECTURE.md:537:41. **Decision #41:** BR-2 pre-check, post-check, and rollback script provisioning for hosted migration.
ARCHITECTURE.md:538:42. **Decision #42:** Verification of SQLSTATE 42501 permission denial for anon and authenticated roles.
ARCHITECTURE.md:539:43. **Decision #43:** Elimination of float arithmetic in weekly wrap-up calculations.
ARCHITECTURE.md:540:44. **Decision #44:** Tiebreaker distance calculation using absolute score difference.
ARCHITECTURE.md:541:45. **Decision #45:** Split-penalty rounding and remainder distribution logic preservation.
ARCHITECTURE.md:542:46. **Decision #46:** Weekly wrap-up game-set resolution via shared scoring exclusion resolver.
ARCHITECTURE.md:543:47. **Decision #47:** Strict fail-closed wrap-up precondition if non-excluded games are pending or absent.
ARCHITECTURE.md:544:48. **Decision #48:** CI check for migration file checksums against `_prisma_migrations`.
ARCHITECTURE.md:545:49. **Decision #49:** CI route scan enforcing parameter scoping and guard middleware on all routes.
ARCHITECTURE.md:546:50. **Decision #50:** `GET /api/admin/users` allowlisted as platform-level admin endpoint.
ARCHITECTURE.md:547:51. **Decision #51:** Admin picks routes scoped with `requirePoolCommissioner` (`from: 'query'` / `from: 'body'`).
ARCHITECTURE.md:548:52. **Decision #52:** Weekly wrap-up claim step fails closed (`CLAIM_STORE_UNAVAILABLE`) if `weekly_wrapups` table is absent.
ARCHITECTURE.md:549:53. **Decision #53:** Agents never push, force-push or change remotes.
ARCHITECTURE.md:550:54. **Decision #54:** GET handlers perform no writes.
ARCHITECTURE.md:551:55. **Decision #55:** A guard is never bypassed by a conditional when its dependency is missing.
```
*Verification: Full 55-item Decision Register (#1 through #55) registered in ARCHITECTURE.md, including reconciled #53, #54, and #55.*

---

## 7. Main Branch Verification

### 7.1 Raw Prisma Generate Output on Main
```text
��E n v i r o n m e n t   v a r i a b l e s   l o a d e d   f r o m   . e n v  
 P r i s m a   s c h e m a   l o a d e d   f r o m   p r i s m a \ s c h e m a . p r i s m a  
  
 �� �   G e n e r a t e d   P r i s m a   C l i e n t   ( v 5 . 2 2 . 0 )   t o   . \ n o d e _ m o d u l e s \ @ p r i s m a \ c l i e n t   i n   2 3 8 m s  
  
 S t a r t   b y   i m p o r t i n g   y o u r   P r i s m a   C l i e n t   ( S e e :   h t t p s : / / p r i s . l y / d / i m p o r t i n g - c l i e n t )  
  
 T i p :   W a n t   r e a l - t i m e   u p d a t e s   t o   y o u r   d a t a b a s e   w i t h o u t   m a n u a l   p o l l i n g ?   D i s c o v e r   h o w   w i t h   P u l s e :   h t t p s : / / p r i s . l y / t i p - 0 - p u l s e  
  
 
```

### 7.2 Main Full Test Suite Execution (`npm run test:db`)
```text
��n o d e . e x e   :    [ 3 3 m ( ! )   Y o u r   V i t e   c o n f i g   u s e s   f e a t u r e s   t h a t   a r e   u n s u p p o r t e d   b y   ` c o n f i g L o a d e r :   ' n a t i v e ' ` ,   w h i c h   i s   p l a n n e d    
 t o   b e c o m e   t h e   d e f a u l t   i n   a   f u t u r e   m a j o r   v e r s i o n   o f   V i t e :  
 A t   l i n e : 1   c h a r : 1  
 +   &   " C : \ P r o g r a m   F i l e s \ n o d e j s / n o d e . e x e "   " C : \ P r o g r a m   F i l e s \ n o d e j s / n o d e _ m o   . . .  
 +   ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~  
         +   C a t e g o r y I n f o                     :   N o t S p e c i f i e d :   (  [ 3 3 m ( ! )   Y o u r   V . . . e r s i o n   o f   V i t e : : S t r i n g )   [ ] ,   R e m o t e E x c e p t i o n  
         +   F u l l y Q u a l i f i e d E r r o r I d   :   N a t i v e C o m m a n d E r r o r  
    
     -   E S M   s y n t a x   i n   a   f i l e   l o a d e d   a s   C o m m o n J S   ( v i t e s t . c o n f i g . t s : 1 : 1 ) .   U s e   a   ` . m j s `   e x t e n s i o n   o r   s e t   ` " t y p e " :   " m o d u l e " `    
 i n   t h e   c l o s e s t   p a c k a g e . j s o n  
 S e t   ` V I T E _ C O N F I G _ N A T I V E _ I G N O R E _ W A R N I N G = t r u e `   t o   s u p p r e s s   t h i s   w a r n i n g .  [ 3 9 m  
  
  [ 1 m  [ 3 0 m  [ 4 6 m   R U N    [ 4 9 m  [ 3 9 m  [ 2 2 m    [ 3 6 m v 5 . 0 . 2    [ 3 9 m  [ 9 0 m C : / U s e r s / k a c o n e / D o c u m e n t s / A I   a n d   T e c h / A n t i g r a v i t y / N F L   P i c k   E m  [ 3 9 m  
  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 2 . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 2 b   &   B R - 2 c :   R o w - L e v e l   S e c u r i t y   &   P r i v i l e g e   L o c k d o w n   M a t r i x  [ 2 m   >    [ 2 2 m B R - 2 b / 2 c :   a s s e r t s   R L S   i s   E N A B L E D   ( r e l r o w s e c u r i t y = t r u e )   a n d   r e l f o r c e r o w s e c u r i t y = f a l s e   o n   a l l   a p p l i c a t i o n   p u b l i c   t a b l e s  [ 3 3 m   4 5 8  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 4 b . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 4 b :   F a i l - C l o s e d   C l a i m   S t o r e   I n v a r i a n t   ( D e c i s i o n   # 5 2 )  [ 2 m   >    [ 2 2 m D e c i s i o n   # 5 2 :   e x e c u t e W e e k l y W r a p U p   r e t u r n s   C L A I M _ S T O R E _ U N A V A I L A B L E   w h e n   c l a i m   t a b l e   i s   a b s e n t   o r   f a i l s   c l o s e d  [ 3 2 m   2 3 1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 2 . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 2 b   &   B R - 2 c :   R o w - L e v e l   S e c u r i t y   &   P r i v i l e g e   L o c k d o w n   M a t r i x  [ 2 m   >    [ 2 2 m B R - 2 b / 2 c :   a s s e r t s   a n o n   r o l e   i s   d e n i e d   S E L E C T   ( S Q L S T A T E   4 2 5 0 1 )   a c r o s s   a l l   p u b l i c   t a b l e s  [ 3 3 m   1 1 4 0  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 2 . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 2 b   &   B R - 2 c :   R o w - L e v e l   S e c u r i t y   &   P r i v i l e g e   L o c k d o w n   M a t r i x  [ 2 m   >    [ 2 2 m B R - 2 b / 2 c :   a s s e r t s   a u t h e n t i c a t e d   r o l e   i s   d e n i e d   S E L E C T   ( S Q L S T A T E   4 2 5 0 1 )   a c r o s s   a l l   p u b l i c   t a b l e s  [ 3 2 m   1 2 7  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 2 . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 2 b   &   B R - 2 c :   R o w - L e v e l   S e c u r i t y   &   P r i v i l e g e   L o c k d o w n   M a t r i x  [ 2 m   >    [ 2 2 m B R - 2 b :   a s s e r t s   a n o n   r o l e   i s   d e n i e d   U P D A T E   o n   p e n a l t y _ l e d g e r   w i t h   S Q L S T A T E   4 2 5 0 1   ( p r i v i l e g e   p r o o f )  [ 3 2 m   6 1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 2 . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 2 b   &   B R - 2 c :   R o w - L e v e l   S e c u r i t y   &   P r i v i l e g e   L o c k d o w n   M a t r i x  [ 2 m   >    [ 2 2 m B R - 2 c :   a s s e r t s   h a s _ f u n c t i o n _ p r i v i l e g e   r e t u r n s   f a l s e   f o r   a n o n   a n d   a u t h e n t i c a t e d   o n   B R - 1   t r i g g e r   f u n c t i o n s  [ 3 2 m   1 4 4  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 1 . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 1 :   A p p e n d - O n l y   T r i g g e r   D e f i n i t i o n s ,   I m m u t a b i l i t y   &   C a s c a d i n g   C o n s t r a i n t s  [ 2 m   >    [ 2 2 m B R - 1 :   a s s e r t s   t r i g g e r   a n d   f u n c t i o n   d e f i n i t i o n s   m a t c h   r e q u i r e m e n t s   ( B E F O R E   R O W / S T A T E M E N T ,   p l p g s q l ,   p r o s e c d e f = f a l s e ,   u n c o n d i t i o n a l   R A I S E )  [ 3 2 m   6 3  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 1 . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 1 :   A p p e n d - O n l y   T r i g g e r   D e f i n i t i o n s ,   I m m u t a b i l i t y   &   C a s c a d i n g   C o n s t r a i n t s  [ 2 m   >    [ 2 2 m B R - 1 :   U P D A T E   ( i n c l u d i n g   n o - o p   u p d a t e )   i s   b l o c k e d   w i t h   c o u n t   > =   1   a n d   S Q L S T A T E   P 0 0 0 1  [ 3 3 m   3 5 5  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 1 . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 1 :   A p p e n d - O n l y   T r i g g e r   D e f i n i t i o n s ,   I m m u t a b i l i t y   &   C a s c a d i n g   C o n s t r a i n t s  [ 2 m   >    [ 2 2 m B R - 1 :   D E L E T E   o n   p e n a l t y _ l e d g e r   i s   b l o c k e d   w i t h   c o u n t   > =   1   a n d   S Q L S T A T E   P 0 0 0 1  [ 3 2 m   4 7  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e A u t h  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 1   w h e n   A u t h o r i z a t i o n   h e a d e r   i s   a b s e n t  [ 3 2 m   5  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e A u t h  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 1   w h e n   A u t h o r i z a t i o n   h e a d e r   d o e s   n o t   s t a r t   w i t h   B e a r e r  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e A u t h  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 1   f o r   a n   i n v a l i d   /   e x p i r e d   t o k e n  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e A u t h  [ 2 m   >    [ 2 2 m d e c o d e s   v a l i d   J W T   a n d   a t t a c h e s   u s e r   t o   r e q . u s e r ,   t h e n   c a l l s   n e x t ( )  [ 3 2 m   1 7  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e A d m i n  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 1   i f   r e q . u s e r   i s   u n d e f i n e d  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e A d m i n  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 3   i f   r e q . u s e r   i s   n o t   A D M I N  [ 3 2 m   0  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e A d m i n  [ 2 m   >    [ 2 2 m c a l l s   n e x t ( )   i f   u s e r   i s   A D M I N  [ 3 2 m   0  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e P o o l C o m m i s s i o n e r  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 1   i f   r e q . u s e r   i s   m i s s i n g  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e P o o l C o m m i s s i o n e r  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 0   f o r   a   m a l f o r m e d   n o n - U U I D   p o o l _ i d  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e P o o l C o m m i s s i o n e r  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 4   w h e n   t h e   p o o l   d o e s   n o t   e x i s t   i n   D B  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e P o o l C o m m i s s i o n e r  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 3   w h e n   u s e r   i s   n e i t h e r   c o m m i s s i o n e r   n o r   m e m b e r  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e P o o l C o m m i s s i o n e r  [ 2 m   >    [ 2 2 m D e c i s i o n   # 2 0   &   R - 1 2 . 2 - W :   g l o b a l   A D M I N   w h o   i s   n o t   t h e   p o o l   c o m m i s s i o n e r   - >   4 0 3 ,   n o   r e q . p o o l ,   z e r o   s i d e   e f f e c t s  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e P o o l C o m m i s s i o n e r  [ 2 m   >    [ 2 2 m c a l l s   n e x t ( )   a n d   a t t a c h e s   p o o l   w h e n   u s e r   i s   t h e   p o o l   c o m m i s s i o n e r  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e P o o l C o m m i s s i o n e r  [ 2 m   >    [ 2 2 m f r o m :   q u e r y   -   e x t r a c t s   p o o l _ i d   f r o m   q u e r y   p a r a m s   a n d   a u t h o r i z e s   c o m m i s s i o n e r  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e P o o l C o m m i s s i o n e r  [ 2 m   >    [ 2 2 m f r o m :   q u e r y   -   r e t u r n s   4 0 0   w h e n   p o o l _ i d   q u e r y   p a r a m e t e r   i s   m i s s i n g  [ 3 2 m   0  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e P o o l C o m m i s s i o n e r  [ 2 m   >    [ 2 2 m f r o m :   b o d y   -   e x t r a c t s   p o o l _ i d   f r o m   r e q u e s t   b o d y   a n d   a u t h o r i z e s   c o m m i s s i o n e r  [ 3 2 m   0  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e P o o l C o m m i s s i o n e r  [ 2 m   >    [ 2 2 m f r o m :   b o d y   -   r e t u r n s   4 0 0   w h e n   p o o l _ i d   b o d y   p a r a m e t e r   i s   m i s s i n g  [ 3 2 m   0  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e P o o l M e m b e r  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 3   i f   u s e r   i s   n o t   a   m e m b e r   a n d   n o t   t h e   c o m m i s s i o n e r  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e P o o l M e m b e r  [ 2 m   >    [ 2 2 m D e c i s i o n   # 2 0   &   R - 1 2 . 2 - W :   g l o b a l   A D M I N   w h o   i s   n o t   a   m e m b e r   a n d   n o t   c o m m i s s i o n e r   - >   4 0 3 ,   n o   r e q . p o o l  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e P o o l M e m b e r  [ 2 m   >    [ 2 2 m c a l l s   n e x t ( )   w h e n   u s e r   i s   a c t i v e   p o o l   m e m b e r  [ 3 2 m   0  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e P o o l M e m b e r  [ 2 m   >    [ 2 2 m c a l l s   n e x t ( )   w h e n   u s e r   i s   t h e   p o o l   c o m m i s s i o n e r   ( e v e n   w i t h o u t   e x p l i c i t   m e m b e r s h i p   r o w )  [ 3 2 m   0  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 1 . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 1 :   A p p e n d - O n l y   T r i g g e r   D e f i n i t i o n s ,   I m m u t a b i l i t y   &   C a s c a d i n g   C o n s t r a i n t s  [ 2 m   >    [ 2 2 m B R - 1 :   T R U N C A T E   o n   p e n a l t y _ l e d g e r   i s   b l o c k e d   w i t h   c o u n t   > =   1   a n d   S Q L S T A T E   P 0 0 0 1  [ 3 2 m   6 3  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 1 . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 1 :   A p p e n d - O n l y   T r i g g e r   D e f i n i t i o n s ,   I m m u t a b i l i t y   &   C a s c a d i n g   C o n s t r a i n t s  [ 2 m   >    [ 2 2 m B R - 1 :   m e m b e r s h i p - r o w   D E L E T E   c a s c a d e s   t o   p e n a l t y _ l e d g e r   a n d   i s   i n t e r c e p t e d   b y   t r i g g e r   w i t h   P 0 0 0 1  [ 3 2 m   5 2  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 1 . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 1 :   A p p e n d - O n l y   T r i g g e r   D e f i n i t i o n s ,   I m m u t a b i l i t y   &   C a s c a d i n g   C o n s t r a i n t s  [ 2 m   >    [ 2 2 m B R - 1 :   D E L E T E   F R O M   p o o l s   f i x t u r e   a s s e r t s   e x a c t   f o r e i g n   k e y   c o n s t r a i n t   p o o l _ m e m b e r s h i p s _ p o o l _ i d _ f k e y   a n d   S Q L S T A T E   2 3 5 0 3  [ 3 2 m   2 9  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / c h a r a c t e r i z a t i o n . t e s t . t s  [ 2 m   >    [ 2 2 m I N V - 5   L o c k   L o g i c   &   B o u n d a r y   C h a r a c t e r i z a t i o n  [ 2 m   >    [ 2 2 m R o l l i n g   l o c k :   e n f o r c e s   l o c k   p e r - g a m e   a t   k i c k o f f   b o u n d a r y  [ 3 2 m   3  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / c h a r a c t e r i z a t i o n . t e s t . t s  [ 2 m   >    [ 2 2 m I N V - 5   L o c k   L o g i c   &   B o u n d a r y   C h a r a c t e r i z a t i o n  [ 2 m   >    [ 2 2 m R o l l i n g   l o c k   w i t h   o f f s e t :   e n f o r c e s   l o c k   a t   ( k i c k o f f   -   o f f s e t )  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / c h a r a c t e r i z a t i o n . t e s t . t s  [ 2 m   >    [ 2 2 m I N V - 5   L o c k   L o g i c   &   B o u n d a r y   C h a r a c t e r i z a t i o n  [ 2 m   >    [ 2 2 m G l o b a l   l o c k   v s   R o l l i n g   l o c k :   h a n d l e s   f i r s t   g a m e   v s   l a t e r   g a m e s  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / c h a r a c t e r i z a t i o n . t e s t . t s  [ 2 m   >    [ 2 2 m I N V - 5   L o c k   L o g i c   &   B o u n d a r y   C h a r a c t e r i z a t i o n  [ 2 m   >    [ 2 2 m E x c l u d e d   w i n d o w s :   c o r r e c t l y   i d e n t i f i e s   T N F ,   M N F ,   S u n d a y   E a r l y / L a t e ,   S N F  [ 3 2 m   2  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / c h a r a c t e r i z a t i o n . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 4   s p l i t P e n a l t y   M a t h   C h a r a c t e r i z a t i o n  [ 2 m   >    [ 2 2 m W o r k e d   m a t r i x :   c o n f i r m s   e x a c t   z e r o - d i f f   d e c i m a l   s p l i t   a m o u n t s  [ 3 2 m   5  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / c h a r a c t e r i z a t i o n . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 4 b   S e t - E q u a l i t y :   W r a p - U p   v s   S c o r i n g   R e s o l v e r  [ 2 m   >    [ 2 2 m A s s e r t s   1 0 0 %   g a m e   I D   s e t   e q u a l i t y   b e t w e e n   w r a p - u p   a n d   s c o r i n g   r e s o l v e r s  [ 3 2 m   3  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / s a f e g u a r d s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 6   S a f e g u a r d s :   a s s e r t D i s p o s a b l e U r l  [ 2 m   >    [ 2 2 m a l l o w s   v a l i d   l o c a l   d i s p o s a b l e   d a t a b a s e   U R L s  [ 3 2 m   5  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / s a f e g u a r d s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 6   S a f e g u a r d s :   a s s e r t D i s p o s a b l e U r l  [ 2 m   >    [ 2 2 m r e j e c t s   r e m o t e   /   h o s t e d   d a t a b a s e   U R L s   ( S u p a b a s e ,   A W S ,   N e o n ,   e t c . )  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / s a f e g u a r d s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 6   S a f e g u a r d s :   a s s e r t D i s p o s a b l e U r l  [ 2 m   >    [ 2 2 m D e c i s i o n   # 3 2   S a b o t a g e   T e s t :   p o i n t   T E S T _ D A T A B A S E _ U R L   a t   p r o d u c t i o n   f i n g e r p r i n t   - >   a b o r t s   b e f o r e   c o n n e c t i o n  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / s a f e g u a r d s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 6   S a f e g u a r d s :   a s s e r t D i s p o s a b l e U r l  [ 2 m   >    [ 2 2 m r e j e c t s   U R L s   u s i n g   ? s c h e m a =   p a r a m e t e r   t o   b y p a s s   h o s t   i s o l a t i o n  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / s a f e g u a r d s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 6   S a f e g u a r d s :   a s s e r t D i s p o s a b l e U r l  [ 2 m   >    [ 2 2 m r e j e c t s   n o n - d i s p o s a b l e   p r o d u c t i o n   d a t a b a s e   n a m e s   o n   l o c a l h o s t  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / s a f e g u a r d s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 6   S a f e g u a r d s :   a s s e r t D i s p o s a b l e U r l  [ 2 m   >    [ 2 2 m s a b o t a g e   t e s t :   t h r o w s   w h e n   T E S T _ D A T A B A S E _ U R L   i s   e m p t y   s t r i n g   o r   u n d e f i n e d  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m G E T   / a p i / a d m i n / p i c k s   ( G u a r d e d   b y   r e q u i r e P o o l C o m m i s s i o n e r ( {   f r o m :   " q u e r y "   } ) )  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 1   w h e n   A u t h o r i z a t i o n   h e a d e r   i s   m i s s i n g  [ 3 2 m   2 1 4  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m G E T   / a p i / a d m i n / p i c k s   ( G u a r d e d   b y   r e q u i r e P o o l C o m m i s s i o n e r ( {   f r o m :   " q u e r y "   } ) )  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 0   w h e n   p o o l _ i d   q u e r y   p a r a m e t e r   i s   m i s s i n g   o r   m a l f o r m e d  [ 3 2 m   2 4  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m G E T   / a p i / a d m i n / p i c k s   ( G u a r d e d   b y   r e q u i r e P o o l C o m m i s s i o n e r ( {   f r o m :   " q u e r y "   } ) )  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 4   w h e n   p o o l   d o e s   n o t   e x i s t  [ 3 2 m   8 4  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m G E T   / a p i / a d m i n / p i c k s   ( G u a r d e d   b y   r e q u i r e P o o l C o m m i s s i o n e r ( {   f r o m :   " q u e r y "   } ) )  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 3   w h e n   u s e r   i s   n o t   t h e   p o o l   c o m m i s s i o n e r  [ 3 2 m   6  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m G E T   / a p i / a d m i n / p i c k s   ( G u a r d e d   b y   r e q u i r e P o o l C o m m i s s i o n e r ( {   f r o m :   " q u e r y "   } ) )  [ 2 m   >    [ 2 2 m r e t u r n s   2 0 0   a n d   g a m e   s l a t e   s n a p s h o t   w h e n   u s e r   i s   t h e   v e r i f i e d   c o m m i s s i o n e r  [ 3 2 m   1 9  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m P U T   / a p i / a d m i n / p i c k s   ( G u a r d e d   b y   r e q u i r e P o o l C o m m i s s i o n e r ( {   f r o m :   " b o d y "   } ) )  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 1   w h e n   A u t h o r i z a t i o n   h e a d e r   i s   m i s s i n g  [ 3 2 m   4 8  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m P U T   / a p i / a d m i n / p i c k s   ( G u a r d e d   b y   r e q u i r e P o o l C o m m i s s i o n e r ( {   f r o m :   " b o d y "   } ) )  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 0   w h e n   p o o l _ i d   i s   m i s s i n g   o r   m a l f o r m e d   i n   r e q u e s t   b o d y  [ 3 2 m   9  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m P U T   / a p i / a d m i n / p i c k s   ( G u a r d e d   b y   r e q u i r e P o o l C o m m i s s i o n e r ( {   f r o m :   " b o d y "   } ) )  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 4   w h e n   p o o l   d o e s   n o t   e x i s t   i n   r e q u e s t   b o d y  [ 3 2 m   8  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m P U T   / a p i / a d m i n / p i c k s   ( G u a r d e d   b y   r e q u i r e P o o l C o m m i s s i o n e r ( {   f r o m :   " b o d y "   } ) )  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 3   w h e n   u s e r   i s   n o t   t h e   p o o l   c o m m i s s i o n e r  [ 3 2 m   7  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m P U T   / a p i / a d m i n / p i c k s   ( G u a r d e d   b y   r e q u i r e P o o l C o m m i s s i o n e r ( {   f r o m :   " b o d y "   } ) )  [ 2 m   >    [ 2 2 m r e t u r n s   2 0 0   a n d   u p s e r t s   p i c k   w h e n   a u t h e n t i c a t e d   u s e r   i s   t h e   c o m m i s s i o n e r  [ 3 2 m   3 5  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m S - 7 :   S h o t - C a m   M e d i a   R o u t e s   S c o p i n g   ( N o   G l o b a l   A d m i n   B y p a s s )  [ 2 m   >    [ 2 2 m P O S T   / a p i / p o o l s / : p o o l _ i d / p e n a l t i e s / : i d / m e d i a :   g l o b a l   A D M I N   w h o   i s   n e i t h e r   o w n e r   n o r   c o m m i s s i o n e r   - >   4 0 3  [ 3 2 m   1 1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m S - 7 :   S h o t - C a m   M e d i a   R o u t e s   S c o p i n g   ( N o   G l o b a l   A d m i n   B y p a s s )  [ 2 m   >    [ 2 2 m P A T C H   / a p i / p o o l s / : p o o l _ i d / p e n a l t i e s / : i d / m e d i a / c o n f i r m :   g l o b a l   A D M I N   w h o   i s   n o t   c o m m i s s i o n e r   - >   4 0 3  [ 3 2 m   6  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m S - 8 :   G E T   / a p i / g a m e s   P o o l   S c o p i n g   ( N o   P o o l   A u t o - C r e a t i o n   /   W r i t e - o n - G E T )  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 4   P O O L _ N O T _ F O U N D   w h e n   u s e r   i s   n o t   m e m b e r / c o m m i s s i o n e r   o f   a n y   p o o l   a n d   p o o l _ i d   i s   o m i t t e d  [ 3 2 m   3 1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m S - 8 :   G E T   / a p i / g a m e s   P o o l   S c o p i n g   ( N o   P o o l   A u t o - C r e a t i o n   /   W r i t e - o n - G E T )  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 4   P O O L _ N O T _ F O U N D   w h e n   e x p l i c i t   p o o l _ i d   d o e s   n o t   e x i s t  [ 3 2 m   9  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m S - 8 :   G E T   / a p i / g a m e s   P o o l   S c o p i n g   ( N o   P o o l   A u t o - C r e a t i o n   /   W r i t e - o n - G E T )  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 0   w h e n   e x p l i c i t   p o o l _ i d   i s   n o t   a   v a l i d   U U I D  [ 3 2 m   3  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m S - 8 :   G E T   / a p i / g a m e s   P o o l   S c o p i n g   ( N o   P o o l   A u t o - C r e a t i o n   /   W r i t e - o n - G E T )  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 3   w h e n   u s e r   i s   n o t   a   m e m b e r   o r   c o m m i s s i o n e r   o f   t h e   r e q u e s t e d   p o o l  [ 3 2 m   3 8  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m S - 8 :   G E T   / a p i / g a m e s   P o o l   S c o p i n g   ( N o   P o o l   A u t o - C r e a t i o n   /   W r i t e - o n - G E T )  [ 2 m   >    [ 2 2 m r e t u r n s   2 0 0   w i t h   p o o l   a n d   g a m e s   w h e n   p o o l _ i d   i s   v a l i d   a n d   u s e r   i s   c o m m i s s i o n e r   o r   a c t i v e   m e m b e r  [ 3 2 m   1 5  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m D e c i s i o n   # 4 9 :   C I   R o u t e   S c a n   &   R o u t e   G u a r d   V e r i f i c a t i o n  [ 2 m   >    [ 2 2 m v e r i f i e s   a l l   r o u t e s   w i t h   p o o l   p a r a m e t e r s   a r e   g u a r d e d ;   o n l y   / a p i / h e a l t h   a n d   G E T   / a p i / a d m i n / u s e r s   a l l o w l i s t e d  [ 3 2 m   3  [ 2 m m s  [ 2 2 m  [ 3 9 m  
  
  [ 2 m   T e s t   F i l e s    [ 2 2 m    [ 1 m  [ 3 2 m 7   p a s s e d  [ 3 9 m  [ 2 2 m  [ 9 0 m   ( 7 )  [ 3 9 m  
  [ 2 m             T e s t s    [ 2 2 m    [ 1 m  [ 3 2 m 6 3   p a s s e d  [ 3 9 m  [ 2 2 m  [ 9 0 m   ( 6 3 )  [ 3 9 m  
  [ 2 m       S t a r t   a t    [ 2 2 m   2 3 : 2 1 : 1 3  
  [ 2 m       D u r a t i o n    [ 2 2 m   5 . 4 1 s  [ 2 m   ( t e s t s   5 1 % ,   i m p o r t   3 5 % ,   t r a n s f o r m   1 0 % ,   s e t u p   3 % ,   w o r k e r   1 % )  [ 2 2 m  
  
  [ 2 m         I s o l a t e    [ 2 2 m    [ 3 3 m 7   w o r k e r s   s p a w n e d  [ 3 9 m  [ 2 m   ,%V%  ~ 4 6 5 m s   s t a r t u p   e a c h   ( s p a w n   +   e n v i r o n m e n t ,   p e r   f i l e )  [ 2 2 m  
  [ 2 m                          [ 2 2 m    [ 2 m a t   l e a s t   ~ 6 2 0 m s   f a s t e r   w i t h    [ 2 2 m  [ 3 3 m i s o l a t e :   f a l s e  [ 3 9 m  [ 2 m   �� �   r e u s e s   w o r k e r s   a c r o s s   f i l e s   i n s t e a d   o f   o n e   p e r   f i l e  [ 2 2 m  
  
 J S O N   r e p o r t   w r i t t e n   t o   C : / U s e r s / k a c o n e / D o c u m e n t s / A I   a n d   T e c h / A n t i g r a v i t y / N F L   P i c k   E m / v i t e s t . j s o n  
 
```

### 7.3 Main Test Matrix Summary
| Test File | Total Tests | Status | Scope |
| :--- | :--- | :--- | :--- |
| `tests/authMiddleware.test.ts` | **21** | PASS | BR-5 & BR-5b Pure-Mock Auth Guards (param, query, body) |
| `tests/br5b_routes.test.ts` | **18** | PASS | BR-5b Integration HTTP Routes, S-7 Shot-Cam & S-8 Explicit Pool Authorization |
| `tests/br1.test.ts` | **6** | PASS | BR-1 Append-Only Immutability & Rehearsal Assertions |
| `tests/br2.test.ts` | **5** | PASS | BR-2b/2c RLS & Public Privilege Lockdown Matrix |
| `tests/br4b.test.ts` | **1** | PASS | BR-4b Minimal Decision #52 Fail-Closed Verification |
| `tests/characterization.test.ts` | **6** | PASS | INV-5 Lock Logic & Window Exclusions |
| `tests/safeguards.test.ts` | **6** | PASS | Safety Guards & Host Sanitization |
| **Total Test Suite** | **63** | **ALL PASS (100%)** | Full Database Rehearsal & Pure Mock Coverage |

---

## 8. Branch Migration Verification (`feat/phase12-migrations`)

### 8.1 Raw Prisma Generate Output on Migration Branch
```text
��E n v i r o n m e n t   v a r i a b l e s   l o a d e d   f r o m   . e n v  
 P r i s m a   s c h e m a   l o a d e d   f r o m   p r i s m a \ s c h e m a . p r i s m a  
  
 �� �   G e n e r a t e d   P r i s m a   C l i e n t   ( v 5 . 2 2 . 0 )   t o   . \ n o d e _ m o d u l e s \ @ p r i s m a \ c l i e n t   i n   2 5 5 m s  
  
 S t a r t   b y   i m p o r t i n g   y o u r   P r i s m a   C l i e n t   ( S e e :   h t t p s : / / p r i s . l y / d / i m p o r t i n g - c l i e n t )  
  
 T i p :   W a n t   t o   r e a c t   t o   d a t a b a s e   c h a n g e s   i n   y o u r   a p p   a s   t h e y   h a p p e n ?   D i s c o v e r   h o w   w i t h   P u l s e :   h t t p s : / / p r i s . l y / t i p - 1 - p u l s e  
  
 
```

### 8.2 BR-4b Test Results on Migration Branch
```text
��n o d e . e x e   :    [ 3 3 m ( ! )   Y o u r   V i t e   c o n f i g   u s e s   f e a t u r e s   t h a t   a r e   u n s u p p o r t e d   b y   ` c o n f i g L o a d e r :   ' n a t i v e ' ` ,   w h i c h   i s   p l a n n e d    
 t o   b e c o m e   t h e   d e f a u l t   i n   a   f u t u r e   m a j o r   v e r s i o n   o f   V i t e :  
 A t   l i n e : 1   c h a r : 1  
 +   &   " C : \ P r o g r a m   F i l e s \ n o d e j s / n o d e . e x e "   " C : \ P r o g r a m   F i l e s \ n o d e j s / n o d e _ m o   . . .  
 +   ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~  
         +   C a t e g o r y I n f o                     :   N o t S p e c i f i e d :   (  [ 3 3 m ( ! )   Y o u r   V . . . e r s i o n   o f   V i t e : : S t r i n g )   [ ] ,   R e m o t e E x c e p t i o n  
         +   F u l l y Q u a l i f i e d E r r o r I d   :   N a t i v e C o m m a n d E r r o r  
    
     -   E S M   s y n t a x   i n   a   f i l e   l o a d e d   a s   C o m m o n J S   ( v i t e s t . c o n f i g . t s : 1 : 1 ) .   U s e   a   ` . m j s `   e x t e n s i o n   o r   s e t   ` " t y p e " :   " m o d u l e " `    
 i n   t h e   c l o s e s t   p a c k a g e . j s o n  
 S e t   ` V I T E _ C O N F I G _ N A T I V E _ I G N O R E _ W A R N I N G = t r u e `   t o   s u p p r e s s   t h i s   w a r n i n g .  [ 3 9 m  
  
  [ 1 m  [ 3 0 m  [ 4 6 m   R U N    [ 4 9 m  [ 3 9 m  [ 2 2 m    [ 3 6 m v 5 . 0 . 2    [ 3 9 m  [ 9 0 m C : / U s e r s / k a c o n e / D o c u m e n t s / A I   a n d   T e c h / A n t i g r a v i t y / N F L   P i c k   E m  [ 3 9 m  
  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 4 b . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 4 b :   W e e k l y   W r a p - U p   S e r v i c e   L i f e c y c l e ,   C o n c u r r e n c y   &   I n v a r i a n t s  [ 2 m   >    [ 2 2 m 1 .   A p p l y   o n c e ,   s e c o n d   c a l l   r e t u r n s   A L R E A D Y _ W R A P P E D _ U P  [ 3 2 m   1 8 3  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 4 b . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 4 b :   W e e k l y   W r a p - U p   S e r v i c e   L i f e c y c l e ,   C o n c u r r e n c y   &   I n v a r i a n t s  [ 2 m   >    [ 2 2 m 2 .   C o n c u r r e n t   c a l l s   o n   f i n a l   w e e k :   e x a c t l y   o n e   a p p l i e s ,   o t h e r   r e c e i v e s   A L R E A D Y _ W R A P P E D _ U P  [ 3 2 m   6 4  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 4 b . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 4 b :   W e e k l y   W r a p - U p   S e r v i c e   L i f e c y c l e ,   C o n c u r r e n c y   &   I n v a r i a n t s  [ 2 m   >    [ 2 2 m 3 .   C o n c u r r e n t   c a l l s   o n   n o n - f i n a l   w e e k :   b o t h   r e t u r n   W E E K _ N O T _ F I N A L   w i t h   z e r o   r o w s   w r i t t e n  [ 3 2 m   5 7  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 4 b . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 4 b :   W e e k l y   W r a p - U p   S e r v i c e   L i f e c y c l e ,   C o n c u r r e n c y   &   I n v a r i a n t s  [ 2 m   >    [ 2 2 m 4 .   N O _ G A M E S _ F O R _ W E E K   r e t u r n e d   w h e n   w e e k   h a s   n o   s c h e d u l e d   g a m e s   i n   p o o l  [ 3 2 m   7  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 4 b . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 4 b :   W e e k l y   W r a p - U p   S e r v i c e   L i f e c y c l e ,   C o n c u r r e n c y   &   I n v a r i a n t s  [ 2 m   >    [ 2 2 m 5 .   M a r k e r   U P D A T E / D E L E T E / T R U N C A T E   t h r o w s   a p p e n d - o n l y   S Q L S T A T E   P 0 0 0 1  [ 3 2 m   3 4  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 4 b . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 4 b :   W e e k l y   W r a p - U p   S e r v i c e   L i f e c y c l e ,   C o n c u r r e n c y   &   I n v a r i a n t s  [ 2 m   >    [ 2 2 m 6 .   a n o n   a n d   a u t h e n t i c a t e d   r o l e s   r e c e i v e   4 2 5 0 1   o n   S E L E C T   f r o m   w e e k l y _ w r a p u p s  [ 3 2 m   2 3  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 4 b . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 4 b :   W e e k l y   W r a p - U p   S e r v i c e   L i f e c y c l e ,   C o n c u r r e n c y   &   I n v a r i a n t s  [ 2 m   >    [ 2 2 m 7 .   B a c k f i l l   I N S E R T . . . S E L E C T   i n   r o l l e d - b a c k   t r a n s a c t i o n   a s s e r t s   1   m a r k e r   c r e a t e d  [ 3 2 m   8  [ 2 m m s  [ 2 2 m  [ 3 9 m  
  
  [ 2 m   T e s t   F i l e s    [ 2 2 m    [ 1 m  [ 3 2 m 1   p a s s e d  [ 3 9 m  [ 2 2 m  [ 9 0 m   ( 1 )  [ 3 9 m  
  [ 2 m             T e s t s    [ 2 2 m    [ 1 m  [ 3 2 m 7   p a s s e d  [ 3 9 m  [ 2 2 m  [ 9 0 m   ( 7 )  [ 3 9 m  
  [ 2 m       S t a r t   a t    [ 2 2 m   2 3 : 2 0 : 2 9  
  [ 2 m       D u r a t i o n    [ 2 2 m   1 . 1 6 s  [ 2 m   ( t e s t s   6 3 % ,   t r a n s f o r m   2 5 % ,   i m p o r t   9 % ,   s e t u p   3 % ,   w o r k e r   1 % )  [ 2 2 m  
  
 
```
*Verification: Full 7-test lifecycle in `tests/br4b.test.ts` passes cleanly on `feat/phase12-migrations` after `prisma generate`.*

---

## 9. Documentation Invariant Audit (Append-Only Verification)

### 9.1 Live File Line Counts & Baseline Numstat
```text
Line Counts:
  558 ARCHITECTURE.md
  124 ROADMAP.md
  327 tasks.md
  1009 total

Numstat vs Baseline (e41ce72):
265	0	ARCHITECTURE.md
46	0	ROADMAP.md
181	0	tasks.md
```
*Verification: Strictly 0 deletions across ARCHITECTURE.md, ROADMAP.md, and tasks.md.*

---

## 10. Decision #49 Route Protection Matrix

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

## 11. BR-5 / BR-5b Raw Vitest JSON Test Artifact

```json
{"numTotalTestSuites":25,"numPassedTestSuites":25,"numFailedTestSuites":0,"numPendingTestSuites":0,"numTotalTests":63,"numPassedTests":63,"numFailedTests":0,"numPendingTests":0,"numTodoTests":0,"snapshot":{"added":0,"failure":false,"filesAdded":0,"filesRemoved":0,"filesRemovedList":[],"filesUnmatched":0,"filesUpdated":0,"matched":0,"total":0,"unchecked":0,"uncheckedKeysByFile":[],"unmatched":0,"updated":0,"didUpdate":false},"startTime":1790835673788,"success":true,"testResults":[{"assertionResults":[{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requireAuth"],"fullName":"BR-5 middleware unit tests (pure mock) requireAuth returns 401 when Authorization header is absent","status":"passed","title":"returns 401 when Authorization header is absent","duration":5.3134000000000015,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requireAuth"],"fullName":"BR-5 middleware unit tests (pure mock) requireAuth returns 401 when Authorization header does not start with Bearer","status":"passed","title":"returns 401 when Authorization header does not start with Bearer","duration":0.8611999999999398,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requireAuth"],"fullName":"BR-5 middleware unit tests (pure mock) requireAuth returns 401 for an invalid / expired token","status":"passed","title":"returns 401 for an invalid / expired token","duration":1.2611000000000558,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requireAuth"],"fullName":"BR-5 middleware unit tests (pure mock) requireAuth decodes valid JWT and attaches user to req.user, then calls next()","status":"passed","title":"decodes valid JWT and attaches user to req.user, then calls next()","duration":17.36760000000004,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requireAdmin"],"fullName":"BR-5 middleware unit tests (pure mock) requireAdmin returns 401 if req.user is undefined","status":"passed","title":"returns 401 if req.user is undefined","duration":0.8779000000000678,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requireAdmin"],"fullName":"BR-5 middleware unit tests (pure mock) requireAdmin returns 403 if req.user is not ADMIN","status":"passed","title":"returns 403 if req.user is not ADMIN","duration":0.4698999999999387,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requireAdmin"],"fullName":"BR-5 middleware unit tests (pure mock) requireAdmin calls next() if user is ADMIN","status":"passed","title":"calls next() if user is ADMIN","duration":0.45859999999993306,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner returns 401 if req.user is missing","status":"passed","title":"returns 401 if req.user is missing","duration":0.9619000000000142,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner returns 400 for a malformed non-UUID pool_id","status":"passed","title":"returns 400 for a malformed non-UUID pool_id","duration":0.8843000000000529,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner returns 404 when the pool does not exist in DB","status":"passed","title":"returns 404 when the pool does not exist in DB","duration":1.0033999999999423,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner returns 403 when user is neither commissioner nor member","status":"passed","title":"returns 403 when user is neither commissioner nor member","duration":0.596300000000042,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner Decision #20 & R-12.2-W: global ADMIN who is not the pool commissioner -> 403, no req.pool, zero side effects","status":"passed","title":"Decision #20 & R-12.2-W: global ADMIN who is not the pool commissioner -> 403, no req.pool, zero side effects","duration":0.6516000000000304,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner calls next() and attaches pool when user is the pool commissioner","status":"passed","title":"calls next() and attaches pool when user is the pool commissioner","duration":0.6163000000000238,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner from: query - extracts pool_id from query params and authorizes commissioner","status":"passed","title":"from: query - extracts pool_id from query params and authorizes commissioner","duration":0.6080999999999221,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner from: query - returns 400 when pool_id query parameter is missing","status":"passed","title":"from: query - returns 400 when pool_id query parameter is missing","duration":0.3812000000000353,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner from: body - extracts pool_id from request body and authorizes commissioner","status":"passed","title":"from: body - extracts pool_id from request body and authorizes commissioner","duration":0.47490000000004784,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner from: body - returns 400 when pool_id body parameter is missing","status":"passed","title":"from: body - returns 400 when pool_id body parameter is missing","duration":0.40189999999995507,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolMember"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolMember returns 403 if user is not a member and not the commissioner","status":"passed","title":"returns 403 if user is not a member and not the commissioner","duration":0.6725999999999885,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolMember"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolMember Decision #20 & R-12.2-W: global ADMIN who is not a member and not commissioner -> 403, no req.pool","status":"passed","title":"Decision #20 & R-12.2-W: global ADMIN who is not a member and not commissioner -> 403, no req.pool","duration":0.6131000000000313,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolMember"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolMember calls next() when user is active pool member","status":"passed","title":"calls next() when user is active pool member","duration":0.445699999999988,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolMember"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolMember calls next() when user is the pool commissioner (even without explicit membership row)","status":"passed","title":"calls next() when user is the pool commissioner (even without explicit membership row)","duration":0.4017999999999802,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790835677210,"endTime":1790835677246.4019,"status":"passed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/authMiddleware.test.ts"},{"assertionResults":[{"ancestorTitles":["BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints"],"fullName":"BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints BR-1: asserts trigger and function definitions match requirements (BEFORE ROW/STATEMENT, plpgsql, prosecdef=false, unconditional RAISE)","status":"passed","title":"BR-1: asserts trigger and function definitions match requirements (BEFORE ROW/STATEMENT, plpgsql, prosecdef=false, unconditional RAISE)","duration":62.7149,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints"],"fullName":"BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints BR-1: UPDATE (including no-op update) is blocked with count >= 1 and SQLSTATE P0001","status":"passed","title":"BR-1: UPDATE (including no-op update) is blocked with count >= 1 and SQLSTATE P0001","duration":354.546,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints"],"fullName":"BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints BR-1: DELETE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001","status":"passed","title":"BR-1: DELETE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001","duration":46.517099999999914,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints"],"fullName":"BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints BR-1: TRUNCATE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001","status":"passed","title":"BR-1: TRUNCATE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001","duration":62.899099999999976,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints"],"fullName":"BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints BR-1: membership-row DELETE cascades to penalty_ledger and is intercepted by trigger with P0001","status":"passed","title":"BR-1: membership-row DELETE cascades to penalty_ledger and is intercepted by trigger with P0001","duration":51.91640000000007,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints"],"fullName":"BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints BR-1: DELETE FROM pools fixture asserts exact foreign key constraint pool_memberships_pool_id_fkey and SQLSTATE 23503","status":"passed","title":"BR-1: DELETE FROM pools fixture asserts exact foreign key constraint pool_memberships_pool_id_fkey and SQLSTATE 23503","duration":29.460600000000113,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790835676601,"endTime":1790835677209.4607,"status":"passed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/br1.test.ts"},{"assertionResults":[{"ancestorTitles":["BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix"],"fullName":"BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix BR-2b/2c: asserts RLS is ENABLED (relrowsecurity=true) and relforcerowsecurity=false on all application public tables","status":"passed","title":"BR-2b/2c: asserts RLS is ENABLED (relrowsecurity=true) and relforcerowsecurity=false on all application public tables","duration":457.62760000000003,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix"],"fullName":"BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix BR-2b/2c: asserts anon role is denied SELECT (SQLSTATE 42501) across all public tables","status":"passed","title":"BR-2b/2c: asserts anon role is denied SELECT (SQLSTATE 42501) across all public tables","duration":1140.0673000000002,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix"],"fullName":"BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix BR-2b/2c: asserts authenticated role is denied SELECT (SQLSTATE 42501) across all public tables","status":"passed","title":"BR-2b/2c: asserts authenticated role is denied SELECT (SQLSTATE 42501) across all public tables","duration":127.0036,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix"],"fullName":"BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix BR-2b: asserts anon role is denied UPDATE on penalty_ledger with SQLSTATE 42501 (privilege proof)","status":"passed","title":"BR-2b: asserts anon role is denied UPDATE on penalty_ledger with SQLSTATE 42501 (privilege proof)","duration":61.36740000000009,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix"],"fullName":"BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix BR-2c: asserts has_function_privilege returns false for anon and authenticated on BR-1 trigger functions","status":"passed","title":"BR-2c: asserts has_function_privilege returns false for anon and authenticated on BR-1 trigger functions","duration":144.10559999999987,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790835674419,"endTime":1790835676350.1057,"status":"passed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/br2.test.ts"},{"assertionResults":[{"ancestorTitles":["BR-4b: Fail-Closed Claim Store Invariant (Decision #52)"],"fullName":"BR-4b: Fail-Closed Claim Store Invariant (Decision #52) Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed","status":"passed","title":"Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed","duration":230.5585000000001,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790835675098,"endTime":1790835675328.5586,"status":"passed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/br4b.test.ts"},{"assertionResults":[{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" })) returns 401 when Authorization header is missing","status":"passed","title":"returns 401 when Authorization header is missing","duration":214.4966999999997,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" })) returns 400 when pool_id query parameter is missing or malformed","status":"passed","title":"returns 400 when pool_id query parameter is missing or malformed","duration":23.887399999999616,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" })) returns 404 when pool does not exist","status":"passed","title":"returns 404 when pool does not exist","duration":83.67659999999978,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" })) returns 403 when user is not the pool commissioner","status":"passed","title":"returns 403 when user is not the pool commissioner","duration":6.44419999999991,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" })) returns 200 and game slate snapshot when user is the verified commissioner","status":"passed","title":"returns 200 and game slate snapshot when user is the verified commissioner","duration":19.47899999999936,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" })) returns 401 when Authorization header is missing","status":"passed","title":"returns 401 when Authorization header is missing","duration":48.40439999999944,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" })) returns 400 when pool_id is missing or malformed in request body","status":"passed","title":"returns 400 when pool_id is missing or malformed in request body","duration":8.919299999999566,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" })) returns 404 when pool does not exist in request body","status":"passed","title":"returns 404 when pool does not exist in request body","duration":7.891699999999219,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" })) returns 403 when user is not the pool commissioner","status":"passed","title":"returns 403 when user is not the pool commissioner","duration":6.66649999999936,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" })) returns 200 and upserts pick when authenticated user is the commissioner","status":"passed","title":"returns 200 and upserts pick when authenticated user is the commissioner","duration":34.83150000000023,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403","status":"passed","title":"POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403","duration":11.28729999999996,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403","status":"passed","title":"PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403","duration":6.129899999999907,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted","status":"passed","title":"returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted","duration":30.650700000000143,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) returns 404 POOL_NOT_FOUND when explicit pool_id does not exist","status":"passed","title":"returns 404 POOL_NOT_FOUND when explicit pool_id does not exist","duration":8.99369999999999,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) returns 400 when explicit pool_id is not a valid UUID","status":"passed","title":"returns 400 when explicit pool_id is not a valid UUID","duration":3.1702000000004773,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) returns 403 when user is not a member or commissioner of the requested pool","status":"passed","title":"returns 403 when user is not a member or commissioner of the requested pool","duration":38.47230000000036,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) returns 200 with pool and games when pool_id is valid and user is commissioner or active member","status":"passed","title":"returns 200 with pool and games when pool_id is valid and user is commissioner or active member","duration":15.099199999999655,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","Decision #49: CI Route Scan & Route Guard Verification"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan Decision #49: CI Route Scan & Route Guard Verification verifies all routes with pool parameters are guarded; only /api/health and GET /api/admin/users allowlisted","status":"passed","title":"verifies all routes with pool parameters are guarded; only /api/health and GET /api/admin/users allowlisted","duration":2.585700000000543,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790835678502,"endTime":1790835679179.5857,"status":"passed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/br5b_routes.test.ts"},{"assertionResults":[{"ancestorTitles":["INV-5 Lock Logic & Boundary Characterization"],"fullName":"INV-5 Lock Logic & Boundary Characterization Rolling lock: enforces lock per-game at kickoff boundary","status":"passed","title":"Rolling lock: enforces lock per-game at kickoff boundary","duration":3.202699999999936,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["INV-5 Lock Logic & Boundary Characterization"],"fullName":"INV-5 Lock Logic & Boundary Characterization Rolling lock with offset: enforces lock at (kickoff - offset)","status":"passed","title":"Rolling lock with offset: enforces lock at (kickoff - offset)","duration":0.7513999999999896,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["INV-5 Lock Logic & Boundary Characterization"],"fullName":"INV-5 Lock Logic & Boundary Characterization Global lock vs Rolling lock: handles first game vs later games","status":"passed","title":"Global lock vs Rolling lock: handles first game vs later games","duration":0.6052999999999429,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["INV-5 Lock Logic & Boundary Characterization"],"fullName":"INV-5 Lock Logic & Boundary Characterization Excluded windows: correctly identifies TNF, MNF, Sunday Early/Late, SNF","status":"passed","title":"Excluded windows: correctly identifies TNF, MNF, Sunday Early/Late, SNF","duration":2.1779000000000224,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-4 splitPenalty Math Characterization"],"fullName":"BR-4 splitPenalty Math Characterization Worked matrix: confirms exact zero-diff decimal split amounts","status":"passed","title":"Worked matrix: confirms exact zero-diff decimal split amounts","duration":5.304000000000087,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-4b Set-Equality: Wrap-Up vs Scoring Resolver"],"fullName":"BR-4b Set-Equality: Wrap-Up vs Scoring Resolver Asserts 100% game ID set equality between wrap-up and scoring resolvers","status":"passed","title":"Asserts 100% game ID set equality between wrap-up and scoring resolvers","duration":2.608600000000024,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790835678363,"endTime":1790835678378.6086,"status":"passed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/characterization.test.ts"},{"assertionResults":[{"ancestorTitles":["BR-6 Safeguards: assertDisposableUrl"],"fullName":"BR-6 Safeguards: assertDisposableUrl allows valid local disposable database URLs","status":"passed","title":"allows valid local disposable database URLs","duration":5.05639999999994,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-6 Safeguards: assertDisposableUrl"],"fullName":"BR-6 Safeguards: assertDisposableUrl rejects remote / hosted database URLs (Supabase, AWS, Neon, etc.)","status":"passed","title":"rejects remote / hosted database URLs (Supabase, AWS, Neon, etc.)","duration":1.1821999999999662,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-6 Safeguards: assertDisposableUrl"],"fullName":"BR-6 Safeguards: assertDisposableUrl Decision #32 Sabotage Test: point TEST_DATABASE_URL at production fingerprint -> aborts before connection","status":"passed","title":"Decision #32 Sabotage Test: point TEST_DATABASE_URL at production fingerprint -> aborts before connection","duration":0.6141999999999825,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-6 Safeguards: assertDisposableUrl"],"fullName":"BR-6 Safeguards: assertDisposableUrl rejects URLs using ?schema= parameter to bypass host isolation","status":"passed","title":"rejects URLs using ?schema= parameter to bypass host isolation","duration":0.5820999999999685,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-6 Safeguards: assertDisposableUrl"],"fullName":"BR-6 Safeguards: assertDisposableUrl rejects non-disposable production database names on localhost","status":"passed","title":"rejects non-disposable production database names on localhost","duration":1.1675000000000182,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-6 Safeguards: assertDisposableUrl"],"fullName":"BR-6 Safeguards: assertDisposableUrl sabotage test: throws when TEST_DATABASE_URL is empty string or undefined","status":"passed","title":"sabotage test: throws when TEST_DATABASE_URL is empty string or undefined","duration":0.9393999999999778,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790835678398,"endTime":1790835678407.9395,"status":"passed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/safeguards.test.ts"}]}
```

---

## 12. R-12.2-AE-V3 Acceptance Criteria Checklist (Section 8)

- [ ] **1. Documentation Updates:** Append-only updates committed to `ARCHITECTURE.md`, `ROADMAP.md`, and `tasks.md`.
- [ ] **2. Pre-Evidence Git Finalization:** `git add -A` and `git commit` executed before evidence run; clean working tree verified.
- [ ] **3. BR-4b Migration Branch Verification:** `feat/phase12-migrations` verified with raw `prisma generate` and `vitest run tests/br4b.test.ts` (7/7 passing).
- [ ] **4. Main Branch Verification:** `main` branch verified with `npm run db:reset`, `prisma migrate deploy`, raw `prisma generate`, and full test suite (63/63 passing).
- [ ] **5. Evidence Generator Execution:** `scripts/generate_evidence.js` captures raw outputs, git status/log, test logs, JSON artifact, and `# LIVE REPOSITORY CONTEXT`.
- [ ] **6. Cleanup & Final Git Commit:** Temporary files removed, bundle and scripts committed locally, strictly no remote push.

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







````


