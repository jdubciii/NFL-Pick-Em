# EVIDENCE BUNDLE — RE: RULING R-12.2-AC
**Date (UTC):** 2026-10-01T03:23:55.581Z  
**Current Commit:** 397981d0b31b48539a22870ac5b3da70812bdd28  
**Branch:** fix/br5b-admin-picks  
**Generator Self-Test Exit Code:** 1  
**Generator Execution Exit Code:** 0  

---

## 1. Generator Self-Test Verification

```text
(node:17072) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/scripts/generate_evidence.js is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to \\?\C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\package.json.
(Use `node --trace-warnings ...` to show where the warning was created)
Generator Self-Test Caught Expected Error:
Empty output block detected from command: "node -e "process.stdout.write('')""
```
*Verification: The generator strictness check proved operational by failing on an empty command block and exiting with code 1.*

---

## 2. Negative & Positive Control Grep (Worktree Isolated Execution)

Verification of DDL and search_path grep controls executing against prior commits via temporary git worktree isolation:

### 2.1 Negative Control at Pre-Retirement Commit (e0e8579, Executed in Isolated `.worktree-ctl`)
```text
tests/wrapUpConcurrency.test.ts:17:      CREATE TABLE IF NOT EXISTS public.weekly_wrapups (
```
*Verification: DDL in wrapUpConcurrency.test.ts was caught inside isolated worktree without touching live working tree.*

### 2.2 Positive Control at HEAD (Clean Live State)
```text
CLEAN: 0 DDL or SET search_path matches found across tests/, scripts/dev/, prisma/seed.ts
```
*Verification: Clean live tree contains 0 DDL or SET search_path statements.*

---

## 3. Fact Gathering & Integrity Checks (Phase 1 Read-Only Facts)

================================================================================
FACT GATHERING (PHASE 1 - READ ONLY) — RULING R-12.2-AC
================================================================================

### 1. Commit & Branch Truth
```text
--- git show --stat 00e89dd ---
commit 00e89dd64ae5c130b96cd7af476794a2014872b3
Author: jdubciii <jack.w.cone@gmail.com>
Date:   Wed Sep 30 19:21:10 2026 -0700

    docs: generate evidence bundle and finalize changes for R-12.2-AA

 ARCHITECTURE.md                              |   2 +
 ROADMAP.md                                   |   2 +
 docs/evidence/R-12.2-AA/EVIDENCE_BUNDLE.md   | 462 +++++++++++++++++++++++++++
 docs/evidence/R-12.2-AA/docs_audit.txt       |  80 +++++
 docs/evidence/R-12.2-AA/facts.txt            | 209 ++++++++++++
 docs/evidence/R-12.2-AA/self_test_output.txt |   7 +
 docs/evidence/R-12.2-AA/vitest.json          |   1 +
 scripts/docs_audit_aa.js                     |  89 ++++++
 scripts/gather_facts_aa.js                   | 174 ++++++++++
 scripts/generate_evidence.js                 | 259 ++++++---------
 src/middleware/auth.ts                       |  53 ++-
 src/routes/admin.ts                          |  30 +-
 tasks.md                                     |  11 +
 tests/authMiddleware.test.ts                 |  48 +++
 tests/br5b_routes.test.ts                    | 273 ++++++++++++++++
 15 files changed, 1515 insertions(+), 185 deletions(-)

--- git branch --contains 00e89dd ---
* fix/br5b-admin-picks
  main

--- git rev-parse main fix/br5b-admin-picks ---
00e89dd64ae5c130b96cd7af476794a2014872b3
397981d0b31b48539a22870ac5b3da70812bdd28

--- git log --oneline -n 8 main ---
00e89dd docs: generate evidence bundle and finalize changes for R-12.2-AA
8ec0ca5 docs: generate evidence bundle and finalize changes for R-12.2-Z
a28e55d chore: retire wrapUpConcurrency test and sanitize safeguards ref
e0e8579 Merge branch 'feat/phase12-guard-e2e' into main (R-12.2-X: Decision #20 override removal & BR-5 unit tests)
e67ad25 docs(evidence): record R-12.2-X verification bundle, diffs, and test outputs
0619e3d fix(phase12): remove global-ADMIN override per Decision #20; pure mock tests green
795bc1a test(phase12): add isolated unit & route guard integration suite for BR-5 auth middleware
75c42c5 Merge branch 'release/br2' into main
```

### 2. Claim Code Implementation (`src/services/weeklyWrapUp.ts:60-130`)
```typescript
60: }
61: 
62: /**
63:  * Executes the weekly wrap-up pipeline for a completed week in a pool according to R-12.2-I order of execution:
64:  * 1. READ (Claim Check): Check if marker exists for (poolId, weekNumber).
65:  * 2. READ (Game Resolver & Non-Excluded Set): Resolve non-excluded games for the week via the shared scoring resolver.
66:  * 3. READ (Status Check): Verify that every resolved game has status === 'FINAL'.
67:  * 4. WRITE (Claim): Create the weekly_wrapups claim via createMany({ skipDuplicates: true }).
68:  * 5. WRITE (Effects): Execute BR-4 Decimal split penalty ledger entries and pool_member_stats updates.
69:  */
70: export async function executeWeeklyWrapUp(poolId: string, weekNo: number): Promise<WeeklyWrapUpResult> {
71:   return await prisma.$transaction(async (tx: any) => {
72:     // -------------------------------------------------------------------------
73:     // Step 1: READ (Claim Check) - Fail-closed check if claim store exists
74:     // -------------------------------------------------------------------------
75:     const tableExists = await tx.$queryRaw`SELECT to_regclass('public.weekly_wrapups')::text as tbl;`;
76:     if (!tableExists || !tableExists[0] || !tableExists[0].tbl) {
77:       return { applied: false, reason: 'CLAIM_STORE_UNAVAILABLE', poolId, weekNo };
78:     }
79: 
80:     const existingClaim = await tx.$queryRaw`
81:       SELECT 1 FROM public.weekly_wrapups WHERE pool_id = ${poolId}::uuid AND week_number = ${weekNo} LIMIT 1;
82:     `;
83:     if (existingClaim && existingClaim.length > 0) {
84:       return { applied: false, reason: 'ALREADY_WRAPPED_UP', poolId, weekNo };
85:     }
86: 
87:     // Fetch Pool and all active members
88:     const pool = await tx.pool.findUnique({
89:       where: { id: poolId },
90:       include: {
91:         memberships: {
92:           where: { status: 'ACTIVE' },
93:           include: {
94:             user: true,
95:           },
96:         },
97:       },
98:     });
99: 
100:     if (!pool) {
101:       throw new Error(`Pool with ID ${poolId} not found.`);
102:     }
103: 
104:     if (pool.memberships.length === 0) {
105:       throw new Error(`Pool with ID ${poolId} has no active members.`);
106:     }
107: 
108:     const settings = (pool.settings as PoolSettings) || {};
109:     const penaltiesConfig = settings.penalties || {};
110:     const tiebreakerConfig = settings.tiebreaker || {};
111:     const gameTargetSetting = tiebreakerConfig.game_target || tiebreakerConfig.gameTarget || 'MONDAY_NIGHT';
112: 
113:     // -------------------------------------------------------------------------
114:     // Step 2: READ (Game Resolver & Non-Excluded Set)
115:     // -------------------------------------------------------------------------
116:     // Fetch picks for this pool with associated games and results
117:     const picks = await tx.pick.findMany({
118:       where: { poolId },
119:       include: {
120:         result: true,
121:         game: true,
122:       },
123:     });
124: 
125:     const gamesMap = new Map<string, any>();
126:     for (const pick of picks) {
127:       if (pick.game) {
128:         gamesMap.set(pick.game.id, pick.game);
129:       }
130:     }
```

### 3. Database Facts (Rehearsal DB)
```text
Identity: {"current_database":"pickem_rehearsal","current_user":"postgres","inet_server_addr":"::1","inet_server_port":5432}
to_regclass('public.weekly_wrapups'): {"to_regclass":"weekly_wrapups"}

Applied Migrations (9):
 - 20260927000000_init (finished: YES)
 - 20260928051824_add_pool_member_stats_and_penalty_ledger (finished: YES)
 - 20260928124900_precision_and_weekly_submissions (finished: YES)
 - 20260928170000_weekly_submission_finalized_and_game_notes (finished: YES)
 - 20260928180000_shot_cam_penalty_media_and_rls (finished: YES)
 - 20260929144500_br_1_ledger_append_only (finished: YES)
 - 20260930010000_br_2b_ledger_api_lockdown (finished: YES)
 - 20260930020000_br_2c_public_tables_api_lockdown (finished: YES)
 - 20260930030000_br_4b_weekly_wrapups (finished: YES)
```

### 4. DDL & search_path Grep Verification
```text
CLEAN: 0 DDL or SET search_path matches found across tests/, scripts/dev/, prisma/seed.ts
```

### 5. S-7 Shot-Cam Routes & Authorization Facts
```typescript
--- src/server.ts:580-625 (POST /api/pools/:pool_id/penalties/:id/media) ---
580:  */
581: app.post('/api/pools/:pool_id/penalties/:id/media', requireAuth, async (req: Request, res: Response): Promise<void> => {
582:   const poolId = String(req.params.pool_id);
583:   const penaltyId = String(req.params.id);
584:   const storagePath = req.body.storage_path || req.body.storagePath;
585:   const mediaType = req.body.media_type || req.body.mediaType || 'video/mp4';
586: 
587:   if (!storagePath || typeof storagePath !== 'string' || storagePath.trim().length === 0) {
588:     res.status(400).json({ error: 'storage_path is required.' });
589:     return;
590:   }
591: 
592:   try {
593:     // 1. Fetch pool and penalty ledger record
594:     const pool = await prisma.pool.findUnique({
595:       where: { id: poolId },
596:     });
597: 
598:     if (!pool) {
599:       res.status(404).json({ error: 'Pool not found.' });
600:       return;
601:     }
602: 
603:     const penalty = await db.penaltyLedger.findUnique({
604:       where: { id: penaltyId },
605:     });
606: 
607:     if (!penalty || penalty.poolId !== poolId) {
608:       res.status(404).json({ error: 'Penalty record not found in this pool.' });
609:       return;
610:     }
611: 
612:     // 2. Authorization check: penalty owner or pool commissioner
613:     const requestingUserId = req.user!.id;
614:     const isOwner = penalty.userId === requestingUserId;
615:     const isCommissioner = pool.adminId === requestingUserId;
616: 
617:     if (!isOwner && !isCommissioner) {
618:       res.status(403).json({ error: 'Forbidden: You do not have permission to upload media for this penalty.' });
619:       return;
620:     }
621: 
622:     // 3. Upsert PenaltyMedia record
623:     const penaltyMedia = await db.penaltyMedia.upsert({
624:       where: {
625:         penaltyId,

--- src/server.ts:675-710 (PATCH /api/pools/:pool_id/penalties/:id/media/confirm) ---
675: app.patch('/api/pools/:pool_id/penalties/:id/media/confirm', requireAuth, async (req: Request, res: Response): Promise<void> => {
676:   const poolId = String(req.params.pool_id);
677:   const penaltyId = String(req.params.id);
678:   const targetStatus = String(req.body.status || 'CONFIRMED').toUpperCase();
679: 
680:   if (!['CONFIRMED', 'REJECTED', 'PENDING'].includes(targetStatus)) {
681:     res.status(400).json({ error: 'Invalid status. Allowed values: CONFIRMED, REJECTED, PENDING.' });
682:     return;
683:   }
684: 
685:   try {
686:     // 1. Fetch pool and verify commissioner permissions
687:     const pool = await prisma.pool.findUnique({
688:       where: { id: poolId },
689:     });
690: 
691:     if (!pool) {
692:       res.status(404).json({ error: 'Pool not found.' });
693:       return;
694:     }
695: 
696:     const requestingUserId = req.user!.id;
697:     const isCommissioner = pool.adminId === requestingUserId;
698: 
699:     if (!isCommissioner) {
700:       res.status(403).json({ error: 'Forbidden: Only the pool commissioner can confirm penalty media.' });
701:       return;
702:     }
703: 
704:     // 2. Fetch penalty media
705:     const existingMedia = await db.penaltyMedia.findUnique({
706:       where: { penaltyId },
707:     });
708: 
709:     if (!existingMedia || existingMedia.poolId !== poolId) {
710:       res.status(404).json({ error: 'Penalty media not found for this penalty in this pool.' });
```

### 6. `src/server.ts:105-135` Facts (GET /api/games Pool Scoping)
```typescript
105: 
106: /**
107:  * GET /api/games
108:  * Returns upcoming and current week NFL games with the requesting user's pick status.
109:  */
110: app.get('/api/games', requireAuth, async (req: Request, res: Response): Promise<void> => {
111:   const userId = req.user!.id;
112:   const poolId = req.query.pool_id ? String(req.query.pool_id) : undefined;
113: 
114:   try {
115:     let pool = poolId
116:       ? await prisma.pool.findUnique({ where: { id: poolId } })
117:       : await prisma.pool.findFirst({ where: { status: 'ACTIVE' } });
118: 
119:     if (!pool) {
120:       pool = await prisma.pool.create({
121:         data: {
122:           name: 'Main NFL Pick \'Em Pool',
123:           adminId: userId,
124:           settings: { lock_offset: 0, points_per_win: 1 },
125:           status: 'ACTIVE',
126:         },
127:       });
128:     }
129: 
130:     const games = await prisma.game.findMany({
131:       orderBy: { kickoffTime: 'asc' },
132:       include: {
133:         picks: {
134:           where: {
135:             userId: userId,
```

### 7. BR-5b Client Pool Scoping (`client/src/components/AdminDashboard.tsx`)
```typescript
44:   const [poolId, setPoolId] = useState<string>('');
56:       const res = await fetch('/api/pools', {
62:           setPoolId(data[0].id);
97:       const res = await fetch(`/api/admin/picks?user_id=${userId}&pool_id=${currentPoolId}`, {
103:       if (data.pool?.id) setPoolId(data.pool.id);
148:       const res = await fetch('/api/admin/picks', {
```

### 8. Worktree & Control Hygiene
```text
--- git reflog -n 10 ---
397981d HEAD@{0}: commit: docs: generate evidence bundle and finalize changes for R-12.2-AB
00e89dd HEAD@{1}: checkout: moving from main to fix/br5b-admin-picks
00e89dd HEAD@{2}: commit: docs: generate evidence bundle and finalize changes for R-12.2-AA
8ec0ca5 HEAD@{3}: commit: docs: generate evidence bundle and finalize changes for R-12.2-Z
a28e55d HEAD@{4}: checkout: moving from e0e857933e9a0dc21ca9792804935b947e2dd445 to main
e0e8579 HEAD@{5}: checkout: moving from main to HEAD~1
a28e55d HEAD@{6}: reset: moving to HEAD
a28e55d HEAD@{7}: checkout: moving from e0e857933e9a0dc21ca9792804935b947e2dd445 to main
e0e8579 HEAD@{8}: checkout: moving from main to HEAD~1
a28e55d HEAD@{9}: reset: moving to HEAD

--- git worktree list ---
C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em 397981d [fix/br5b-admin-picks]

--- .gitignore worktree entry ---
.gitignore:29:.worktree-ctl/
```

---

## 4. Test Suite Execution & Summary Matrix (Phase 3 `npm run test:db`)

```text
�� 
  [ 1 m  [ 3 0 m  [ 4 6 m   R U N    [ 4 9 m  [ 3 9 m  [ 2 2 m    [ 3 6 m v 5 . 0 . 2    [ 3 9 m  [ 9 0 m C : / U s e r s / k a c o n e / D o c u m e n t s / A I   a n d   T e c h / A n t i g r a v i t y / N F L   P i c k   E m  [ 3 9 m  
  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 2 . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 2 b   &   B R - 2 c :   R o w - L e v e l   S e c u r i t y   &   P r i v i l e g e   L o c k d o w n   M a t r i x  [ 2 m   >    [ 2 2 m B R - 2 b / 2 c :   a s s e r t s   R L S   i s   E N A B L E D   ( r e l r o w s e c u r i t y = t r u e )   a n d   r e l f o r c e r o w s e c u r i t y = f a l s e   o n   a l l   a p p l i c a t i o n   p u b l i c   t a b l e s  [ 3 3 m   3 7 2  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 4 b . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 4 b :   F a i l - C l o s e d   C l a i m   S t o r e   I n v a r i a n t   ( D e c i s i o n   # 5 2 )  [ 2 m   >    [ 2 2 m D e c i s i o n   # 5 2 :   e x e c u t e W e e k l y W r a p U p   r e t u r n s   C L A I M _ S T O R E _ U N A V A I L A B L E   w h e n   c l a i m   t a b l e   i s   a b s e n t   o r   f a i l s   c l o s e d  [ 3 3 m   3 3 1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 2 . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 2 b   &   B R - 2 c :   R o w - L e v e l   S e c u r i t y   &   P r i v i l e g e   L o c k d o w n   M a t r i x  [ 2 m   >    [ 2 2 m B R - 2 b / 2 c :   a s s e r t s   a n o n   r o l e   i s   d e n i e d   S E L E C T   ( S Q L S T A T E   4 2 5 0 1 )   a c r o s s   a l l   p u b l i c   t a b l e s  [ 3 3 m   3 9 2  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 2 . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 2 b   &   B R - 2 c :   R o w - L e v e l   S e c u r i t y   &   P r i v i l e g e   L o c k d o w n   M a t r i x  [ 2 m   >    [ 2 2 m B R - 2 b / 2 c :   a s s e r t s   a u t h e n t i c a t e d   r o l e   i s   d e n i e d   S E L E C T   ( S Q L S T A T E   4 2 5 0 1 )   a c r o s s   a l l   p u b l i c   t a b l e s  [ 3 2 m   1 6 0  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 2 . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 2 b   &   B R - 2 c :   R o w - L e v e l   S e c u r i t y   &   P r i v i l e g e   L o c k d o w n   M a t r i x  [ 2 m   >    [ 2 2 m B R - 2 b :   a s s e r t s   a n o n   r o l e   i s   d e n i e d   U P D A T E   o n   p e n a l t y _ l e d g e r   w i t h   S Q L S T A T E   4 2 5 0 1   ( p r i v i l e g e   p r o o f )  [ 3 2 m   3 7  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 2 . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 2 b   &   B R - 2 c :   R o w - L e v e l   S e c u r i t y   &   P r i v i l e g e   L o c k d o w n   M a t r i x  [ 2 m   >    [ 2 2 m B R - 2 c :   a s s e r t s   h a s _ f u n c t i o n _ p r i v i l e g e   r e t u r n s   f a l s e   f o r   a n o n   a n d   a u t h e n t i c a t e d   o n   B R - 1   t r i g g e r   f u n c t i o n s  [ 3 2 m   3 5  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m G E T   / a p i / a d m i n / p i c k s   ( G u a r d e d   b y   r e q u i r e P o o l C o m m i s s i o n e r ( {   f r o m :   " q u e r y "   } ) )  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 1   w h e n   A u t h o r i z a t i o n   h e a d e r   i s   m i s s i n g  [ 3 2 m   1 4 1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m G E T   / a p i / a d m i n / p i c k s   ( G u a r d e d   b y   r e q u i r e P o o l C o m m i s s i o n e r ( {   f r o m :   " q u e r y "   } ) )  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 0   w h e n   p o o l _ i d   q u e r y   p a r a m e t e r   i s   m i s s i n g   o r   m a l f o r m e d  [ 3 2 m   1 6  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m G E T   / a p i / a d m i n / p i c k s   ( G u a r d e d   b y   r e q u i r e P o o l C o m m i s s i o n e r ( {   f r o m :   " q u e r y "   } ) )  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 4   w h e n   p o o l   d o e s   n o t   e x i s t  [ 3 2 m   2 2 9  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m G E T   / a p i / a d m i n / p i c k s   ( G u a r d e d   b y   r e q u i r e P o o l C o m m i s s i o n e r ( {   f r o m :   " q u e r y "   } ) )  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 3   w h e n   u s e r   i s   n o t   t h e   p o o l   c o m m i s s i o n e r  [ 3 2 m   5 9  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m G E T   / a p i / a d m i n / p i c k s   ( G u a r d e d   b y   r e q u i r e P o o l C o m m i s s i o n e r ( {   f r o m :   " q u e r y "   } ) )  [ 2 m   >    [ 2 2 m r e t u r n s   2 0 0   a n d   g a m e   s l a t e   s n a p s h o t   w h e n   u s e r   i s   t h e   v e r i f i e d   c o m m i s s i o n e r  [ 3 2 m   7 7  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m P U T   / a p i / a d m i n / p i c k s   ( G u a r d e d   b y   r e q u i r e P o o l C o m m i s s i o n e r ( {   f r o m :   " b o d y "   } ) )  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 1   w h e n   A u t h o r i z a t i o n   h e a d e r   i s   m i s s i n g  [ 3 2 m   4 2  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m P U T   / a p i / a d m i n / p i c k s   ( G u a r d e d   b y   r e q u i r e P o o l C o m m i s s i o n e r ( {   f r o m :   " b o d y "   } ) )  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 0   w h e n   p o o l _ i d   i s   m i s s i n g   o r   m a l f o r m e d   i n   r e q u e s t   b o d y  [ 3 2 m   1 6  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m P U T   / a p i / a d m i n / p i c k s   ( G u a r d e d   b y   r e q u i r e P o o l C o m m i s s i o n e r ( {   f r o m :   " b o d y "   } ) )  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 4   w h e n   p o o l   d o e s   n o t   e x i s t   i n   r e q u e s t   b o d y  [ 3 2 m   3 5  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m P U T   / a p i / a d m i n / p i c k s   ( G u a r d e d   b y   r e q u i r e P o o l C o m m i s s i o n e r ( {   f r o m :   " b o d y "   } ) )  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 3   w h e n   u s e r   i s   n o t   t h e   p o o l   c o m m i s s i o n e r  [ 3 2 m   1 4  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 1 . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 1 :   A p p e n d - O n l y   T r i g g e r   D e f i n i t i o n s ,   I m m u t a b i l i t y   &   C a s c a d i n g   C o n s t r a i n t s  [ 2 m   >    [ 2 2 m B R - 1 :   a s s e r t s   t r i g g e r   a n d   f u n c t i o n   d e f i n i t i o n s   m a t c h   r e q u i r e m e n t s   ( B E F O R E   R O W / S T A T E M E N T ,   p l p g s q l ,   p r o s e c d e f = f a l s e ,   u n c o n d i t i o n a l   R A I S E )  [ 3 2 m   1 7  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 1 . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 1 :   A p p e n d - O n l y   T r i g g e r   D e f i n i t i o n s ,   I m m u t a b i l i t y   &   C a s c a d i n g   C o n s t r a i n t s  [ 2 m   >    [ 2 2 m B R - 1 :   U P D A T E   ( i n c l u d i n g   n o - o p   u p d a t e )   i s   b l o c k e d   w i t h   c o u n t   > =   1   a n d   S Q L S T A T E   P 0 0 0 1  [ 3 2 m   3 6  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 1 . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 1 :   A p p e n d - O n l y   T r i g g e r   D e f i n i t i o n s ,   I m m u t a b i l i t y   &   C a s c a d i n g   C o n s t r a i n t s  [ 2 m   >    [ 2 2 m B R - 1 :   D E L E T E   o n   p e n a l t y _ l e d g e r   i s   b l o c k e d   w i t h   c o u n t   > =   1   a n d   S Q L S T A T E   P 0 0 0 1  [ 3 2 m   7  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 1 . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 1 :   A p p e n d - O n l y   T r i g g e r   D e f i n i t i o n s ,   I m m u t a b i l i t y   &   C a s c a d i n g   C o n s t r a i n t s  [ 2 m   >    [ 2 2 m B R - 1 :   T R U N C A T E   o n   p e n a l t y _ l e d g e r   i s   b l o c k e d   w i t h   c o u n t   > =   1   a n d   S Q L S T A T E   P 0 0 0 1  [ 3 2 m   7  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e A u t h  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 1   w h e n   A u t h o r i z a t i o n   h e a d e r   i s   a b s e n t  [ 3 2 m   5  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e A u t h  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 1   w h e n   A u t h o r i z a t i o n   h e a d e r   d o e s   n o t   s t a r t   w i t h   B e a r e r  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e A u t h  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 1   f o r   a n   i n v a l i d   /   e x p i r e d   t o k e n  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e A u t h  [ 2 m   >    [ 2 2 m d e c o d e s   v a l i d   J W T   a n d   a t t a c h e s   u s e r   t o   r e q . u s e r ,   t h e n   c a l l s   n e x t ( )  [ 3 2 m   1 1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e A d m i n  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 1   i f   r e q . u s e r   i s   u n d e f i n e d  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e A d m i n  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 3   i f   r e q . u s e r   i s   n o t   A D M I N  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e A d m i n  [ 2 m   >    [ 2 2 m c a l l s   n e x t ( )   i f   u s e r   i s   A D M I N  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e P o o l C o m m i s s i o n e r  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 1   i f   r e q . u s e r   i s   m i s s i n g  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e P o o l C o m m i s s i o n e r  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 0   f o r   a   m a l f o r m e d   n o n - U U I D   p o o l _ i d  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e P o o l C o m m i s s i o n e r  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 4   w h e n   t h e   p o o l   d o e s   n o t   e x i s t   i n   D B  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e P o o l C o m m i s s i o n e r  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 3   w h e n   u s e r   i s   n e i t h e r   c o m m i s s i o n e r   n o r   m e m b e r  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e P o o l C o m m i s s i o n e r  [ 2 m   >    [ 2 2 m D e c i s i o n   # 2 0   &   R - 1 2 . 2 - W :   g l o b a l   A D M I N   w h o   i s   n o t   t h e   p o o l   c o m m i s s i o n e r   - >   4 0 3 ,   n o   r e q . p o o l ,   z e r o   s i d e   e f f e c t s  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e P o o l C o m m i s s i o n e r  [ 2 m   >    [ 2 2 m c a l l s   n e x t ( )   a n d   a t t a c h e s   p o o l   w h e n   u s e r   i s   t h e   p o o l   c o m m i s s i o n e r  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e P o o l C o m m i s s i o n e r  [ 2 m   >    [ 2 2 m f r o m :   q u e r y   -   e x t r a c t s   p o o l _ i d   f r o m   q u e r y   p a r a m s   a n d   a u t h o r i z e s   c o m m i s s i o n e r  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e P o o l C o m m i s s i o n e r  [ 2 m   >    [ 2 2 m f r o m :   q u e r y   -   r e t u r n s   4 0 0   w h e n   p o o l _ i d   q u e r y   p a r a m e t e r   i s   m i s s i n g  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e P o o l C o m m i s s i o n e r  [ 2 m   >    [ 2 2 m f r o m :   b o d y   -   e x t r a c t s   p o o l _ i d   f r o m   r e q u e s t   b o d y   a n d   a u t h o r i z e s   c o m m i s s i o n e r  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e P o o l C o m m i s s i o n e r  [ 2 m   >    [ 2 2 m f r o m :   b o d y   -   r e t u r n s   4 0 0   w h e n   p o o l _ i d   b o d y   p a r a m e t e r   i s   m i s s i n g  [ 3 2 m   0  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e P o o l M e m b e r  [ 2 m   >    [ 2 2 m r e t u r n s   4 0 3   i f   u s e r   i s   n o t   a   m e m b e r   a n d   n o t   t h e   c o m m i s s i o n e r  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e P o o l M e m b e r  [ 2 m   >    [ 2 2 m D e c i s i o n   # 2 0   &   R - 1 2 . 2 - W :   g l o b a l   A D M I N   w h o   i s   n o t   a   m e m b e r   a n d   n o t   c o m m i s s i o n e r   - >   4 0 3 ,   n o   r e q . p o o l  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e P o o l M e m b e r  [ 2 m   >    [ 2 2 m c a l l s   n e x t ( )   w h e n   u s e r   i s   a c t i v e   p o o l   m e m b e r  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / a u t h M i d d l e w a r e . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5   m i d d l e w a r e   u n i t   t e s t s   ( p u r e   m o c k )  [ 2 m   >    [ 2 2 m r e q u i r e P o o l M e m b e r  [ 2 m   >    [ 2 2 m c a l l s   n e x t ( )   w h e n   u s e r   i s   t h e   p o o l   c o m m i s s i o n e r   ( e v e n   w i t h o u t   e x p l i c i t   m e m b e r s h i p   r o w )  [ 3 2 m   0  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m P U T   / a p i / a d m i n / p i c k s   ( G u a r d e d   b y   r e q u i r e P o o l C o m m i s s i o n e r ( {   f r o m :   " b o d y "   } ) )  [ 2 m   >    [ 2 2 m r e t u r n s   2 0 0   a n d   u p s e r t s   p i c k   w h e n   a u t h e n t i c a t e d   u s e r   i s   t h e   c o m m i s s i o n e r  [ 3 2 m   8 8  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m S - 7 :   S h o t - C a m   M e d i a   R o u t e s   S c o p i n g   ( N o   G l o b a l   A d m i n   B y p a s s )  [ 2 m   >    [ 2 2 m P O S T   / a p i / p o o l s / : p o o l _ i d / p e n a l t i e s / : i d / m e d i a :   g l o b a l   A D M I N   w h o   i s   n e i t h e r   o w n e r   n o r   c o m m i s s i o n e r   - >   4 0 3  [ 3 2 m   2 3  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m S - 7 :   S h o t - C a m   M e d i a   R o u t e s   S c o p i n g   ( N o   G l o b a l   A d m i n   B y p a s s )  [ 2 m   >    [ 2 2 m P A T C H   / a p i / p o o l s / : p o o l _ i d / p e n a l t i e s / : i d / m e d i a / c o n f i r m :   g l o b a l   A D M I N   w h o   i s   n o t   c o m m i s s i o n e r   - >   4 0 3  [ 3 2 m   4 6  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 1 . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 1 :   A p p e n d - O n l y   T r i g g e r   D e f i n i t i o n s ,   I m m u t a b i l i t y   &   C a s c a d i n g   C o n s t r a i n t s  [ 2 m   >    [ 2 2 m B R - 1 :   m e m b e r s h i p - r o w   D E L E T E   c a s c a d e s   t o   p e n a l t y _ l e d g e r   a n d   i s   i n t e r c e p t e d   b y   t r i g g e r   w i t h   P 0 0 0 1  [ 3 2 m   4 0  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 1 . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 1 :   A p p e n d - O n l y   T r i g g e r   D e f i n i t i o n s ,   I m m u t a b i l i t y   &   C a s c a d i n g   C o n s t r a i n t s  [ 2 m   >    [ 2 2 m B R - 1 :   D E L E T E   F R O M   p o o l s   f i x t u r e   a s s e r t s   e x a c t   f o r e i g n   k e y   c o n s t r a i n t   p o o l _ m e m b e r s h i p s _ p o o l _ i d _ f k e y   a n d   S Q L S T A T E   2 3 5 0 3  [ 3 2 m   1 2  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / b r 5 b _ r o u t e s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 5 b :   A d m i n   P i c k s   R o u t e s   S c o p i n g   &   D e c i s i o n   # 4 9   C I   R o u t e   S c a n  [ 2 m   >    [ 2 2 m D e c i s i o n   # 4 9 :   C I   R o u t e   S c a n   &   R o u t e   G u a r d   V e r i f i c a t i o n  [ 2 m   >    [ 2 2 m v e r i f i e s   a l l   r o u t e s   w i t h   p o o l   p a r a m e t e r s   a r e   g u a r d e d ;   o n l y   / a p i / h e a l t h   a n d   G E T   / a p i / a d m i n / u s e r s   a l l o w l i s t e d  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / s a f e g u a r d s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 6   S a f e g u a r d s :   a s s e r t D i s p o s a b l e U r l  [ 2 m   >    [ 2 2 m a l l o w s   v a l i d   l o c a l   d i s p o s a b l e   d a t a b a s e   U R L s  [ 3 2 m   5  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / s a f e g u a r d s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 6   S a f e g u a r d s :   a s s e r t D i s p o s a b l e U r l  [ 2 m   >    [ 2 2 m r e j e c t s   r e m o t e   /   h o s t e d   d a t a b a s e   U R L s   ( S u p a b a s e ,   A W S ,   N e o n ,   e t c . )  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / s a f e g u a r d s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 6   S a f e g u a r d s :   a s s e r t D i s p o s a b l e U r l  [ 2 m   >    [ 2 2 m D e c i s i o n   # 3 2   S a b o t a g e   T e s t :   p o i n t   T E S T _ D A T A B A S E _ U R L   a t   p r o d u c t i o n   f i n g e r p r i n t   - >   a b o r t s   b e f o r e   c o n n e c t i o n  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / s a f e g u a r d s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 6   S a f e g u a r d s :   a s s e r t D i s p o s a b l e U r l  [ 2 m   >    [ 2 2 m r e j e c t s   U R L s   u s i n g   ? s c h e m a =   p a r a m e t e r   t o   b y p a s s   h o s t   i s o l a t i o n  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / s a f e g u a r d s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 6   S a f e g u a r d s :   a s s e r t D i s p o s a b l e U r l  [ 2 m   >    [ 2 2 m r e j e c t s   n o n - d i s p o s a b l e   p r o d u c t i o n   d a t a b a s e   n a m e s   o n   l o c a l h o s t  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / s a f e g u a r d s . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 6   S a f e g u a r d s :   a s s e r t D i s p o s a b l e U r l  [ 2 m   >    [ 2 2 m s a b o t a g e   t e s t :   t h r o w s   w h e n   T E S T _ D A T A B A S E _ U R L   i s   e m p t y   s t r i n g   o r   u n d e f i n e d  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / c h a r a c t e r i z a t i o n . t e s t . t s  [ 2 m   >    [ 2 2 m I N V - 5   L o c k   L o g i c   &   B o u n d a r y   C h a r a c t e r i z a t i o n  [ 2 m   >    [ 2 2 m R o l l i n g   l o c k :   e n f o r c e s   l o c k   p e r - g a m e   a t   k i c k o f f   b o u n d a r y  [ 3 2 m   3  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / c h a r a c t e r i z a t i o n . t e s t . t s  [ 2 m   >    [ 2 2 m I N V - 5   L o c k   L o g i c   &   B o u n d a r y   C h a r a c t e r i z a t i o n  [ 2 m   >    [ 2 2 m R o l l i n g   l o c k   w i t h   o f f s e t :   e n f o r c e s   l o c k   a t   ( k i c k o f f   -   o f f s e t )  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / c h a r a c t e r i z a t i o n . t e s t . t s  [ 2 m   >    [ 2 2 m I N V - 5   L o c k   L o g i c   &   B o u n d a r y   C h a r a c t e r i z a t i o n  [ 2 m   >    [ 2 2 m G l o b a l   l o c k   v s   R o l l i n g   l o c k :   h a n d l e s   f i r s t   g a m e   v s   l a t e r   g a m e s  [ 3 2 m   1  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / c h a r a c t e r i z a t i o n . t e s t . t s  [ 2 m   >    [ 2 2 m I N V - 5   L o c k   L o g i c   &   B o u n d a r y   C h a r a c t e r i z a t i o n  [ 2 m   >    [ 2 2 m E x c l u d e d   w i n d o w s :   c o r r e c t l y   i d e n t i f i e s   T N F ,   M N F ,   S u n d a y   E a r l y / L a t e ,   S N F  [ 3 2 m   5  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / c h a r a c t e r i z a t i o n . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 4   s p l i t P e n a l t y   M a t h   C h a r a c t e r i z a t i o n  [ 2 m   >    [ 2 2 m W o r k e d   m a t r i x :   c o n f i r m s   e x a c t   z e r o - d i f f   d e c i m a l   s p l i t   a m o u n t s  [ 3 2 m   5  [ 2 m m s  [ 2 2 m  [ 3 9 m  
    [ 3 2 m �� �  [ 3 9 m   t e s t s / c h a r a c t e r i z a t i o n . t e s t . t s  [ 2 m   >    [ 2 2 m B R - 4 b   S e t - E q u a l i t y :   W r a p - U p   v s   S c o r i n g   R e s o l v e r  [ 2 m   >    [ 2 2 m A s s e r t s   1 0 0 %   g a m e   I D   s e t   e q u a l i t y   b e t w e e n   w r a p - u p   a n d   s c o r i n g   r e s o l v e r s  [ 3 2 m   2  [ 2 m m s  [ 2 2 m  [ 3 9 m  
  
  [ 2 m   T e s t   F i l e s    [ 2 2 m    [ 1 m  [ 3 2 m 7   p a s s e d  [ 3 9 m  [ 2 2 m  [ 9 0 m   ( 7 )  [ 3 9 m  
  [ 2 m             T e s t s    [ 2 2 m    [ 1 m  [ 3 2 m 5 8   p a s s e d  [ 3 9 m  [ 2 2 m  [ 9 0 m   ( 5 8 )  [ 3 9 m  
  [ 2 m       S t a r t   a t    [ 2 2 m   2 0 : 2 1 : 1 2  
  [ 2 m       D u r a t i o n    [ 2 2 m   3 . 3 5 s  [ 2 m   ( t e s t s   5 8 % ,   i m p o r t   2 3 % ,   t r a n s f o r m   1 2 % ,   s e t u p   5 % ,   w o r k e r   2 % )  [ 2 2 m  
  
  [ 2 m         I s o l a t e    [ 2 2 m    [ 3 3 m 7   w o r k e r s   s p a w n e d  [ 3 9 m  [ 2 m   ,%V%  ~ 4 8 0 m s   s t a r t u p   e a c h   ( s p a w n   +   e n v i r o n m e n t ,   p e r   f i l e )  [ 2 2 m  
  [ 2 m                          [ 2 2 m    [ 2 m a t   l e a s t   ~ 6 4 0 m s   f a s t e r   w i t h    [ 2 2 m  [ 3 3 m i s o l a t e :   f a l s e  [ 3 9 m  [ 2 m   �� �   r e u s e s   w o r k e r s   a c r o s s   f i l e s   i n s t e a d   o f   o n e   p e r   f i l e  [ 2 2 m  
  
 
```

### 4.1 Test Matrix Summary
| Test File | Total Tests | Status | Scope |
| :--- | :--- | :--- | :--- |
| `tests/authMiddleware.test.ts` | **21** | PASS | BR-5 & BR-5b Pure-Mock Auth Guards (param, query, body) |
| `tests/br5b_routes.test.ts` | **13** | PASS | BR-5b Integration HTTP Routes, S-7 Shot-Cam Role Verification & Decision #49 Scan |
| `tests/br1.test.ts` | **6** | PASS | BR-1 Append-Only Immutability & Rehearsal Assertions |
| `tests/br2.test.ts` | **5** | PASS | BR-2b/2c RLS & Public Privilege Lockdown Matrix |
| `tests/br4b.test.ts` | **1** | PASS | BR-4b Minimal Decision #52 Fail-Closed Verification |
| `tests/characterization.test.ts` | **6** | PASS | INV-5 Lock Logic & Window Exclusions |
| `tests/safeguards.test.ts` | **6** | PASS | Safety Guards & Host Sanitization |
| **Total Test Suite** | **58** | **ALL PASS (100%)** | Full Database Rehearsal & Pure Mock Coverage |

---

## 5. Documentation Invariant Audit (Phase 4 Append-Only Audit)

### 5.1 Live File Line Counts & Baseline Numstat
```text
Line Counts:
  491 ARCHITECTURE.md
  116 ROADMAP.md
  282 tasks.md
  889 total

Numstat vs Baseline (e41ce72):
198	0	ARCHITECTURE.md
38	0	ROADMAP.md
136	0	tasks.md
```
*Verification: Strictly 0 deletions across ARCHITECTURE.md, ROADMAP.md, and tasks.md.*

---

## 6. Decision #49 Route Inventory & Protection Matrix

| Route | Method | Scoping / Extraction | Guard Middleware | Security Status |
| :--- | :--- | :--- | :--- | :--- |
| `/api/health` | GET | None | None | **ALLOWLISTED (Public Health Endpoint)** |
| `/api/auth/login` | POST | Body (`email`, `password`) | None | **PUBLIC AUTH** |
| `/api/pools` | GET | None | `requireAuth` | **GUARDED (Platform Pool List)** |
| `/api/games` | GET | Query (`week`, `pool_id`) | `requireAuth` | **GUARDED** |
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

## 7. R-12.2-AC Acceptance Criteria Checklist (Section 9)

- [ ] **1. Claim Code (Fail Closed):** `src/services/weeklyWrapUp.ts` checks `SELECT to_regclass('public.weekly_wrapups')` and returns `{ applied: false, reason: 'CLAIM_STORE_UNAVAILABLE' }` if false; no fallback to legacy/alternate table names; tested via `br4b.test.ts`.
- [ ] **2. S-7 (Shot-Cam Admin Override):** `POST /api/pools/:pool_id/penalties/:id/media` and `PATCH .../media/confirm` reject non-member, non-commissioner global `Role.ADMIN` with 403; covered by tests.
- [ ] **3. BR-5b UI:** `client/src/pages/AdminDashboard.tsx` (and `client/src/components/AdminDashboard.tsx`) sends `pool_id` on GET and PUT calls, sourced from existing pool context.
- [ ] **4. 00e89dd Deviation:** Recorded in `ARCHITECTURE.md` §Decision Record and §Branch Map; `fix/br5b-admin-picks` preserved.
- [ ] **5. Test Suite:** `npm run test:db` passes with 0 failures, 0 errors, 0 skips, 0 DDL statements.
- [ ] **6. Docs Invariant:** Strictly 0 deletions across `ARCHITECTURE.md`, `ROADMAP.md`, and `tasks.md` (verified by `git diff -w --numstat e41ce72`).
- [ ] **7. Evidence Bundle:** Contains all raw outputs, zero truncated sections, valid markdown, file size >= 1000 bytes.
- [ ] **8. Commit Hygiene:** Exactly two commits on branch (Code commit, Docs/Evidence commit).
- [ ] **9. Branch Push:** `fix/br5b-admin-picks` force pushed to origin.

---

