# EVIDENCE BUNDLE — RE: RULING R-12.2-AD
**Date (UTC):** 2026-10-01T03:44:13.040Z  
**Current Commit:** f76d7c1d39d5544e38c8dd85c6f1dc73d27c12b2  
**Branch:** fix/br5b-admin-picks  
**Generator Self-Test Exit Code:** 1  
**Generator Execution Exit Code:** 0  

---

## 1. Generator Self-Test Verification

```text
(node:15000) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/scripts/generate_evidence.js is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to \\?\C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\package.json.
(Use `node --trace-warnings ...` to show where the warning was created)
Generator Self-Test Caught Expected Error:
Empty output detected for command: "Write-Output """
```
*Verification: The generator strictness check proved operational by failing on an empty command block and exiting with code 1.*

---

## 2. Local Git History & Remote Verification (Local Only)

### 2.1 Remote Verification (`git remote -v`)
```text
origin	https://github.com/jdubciii/NFL-Pick-Em.git (fetch)
origin	https://github.com/jdubciii/NFL-Pick-Em.git (push)
```

### 2.2 Post-Rewrite Atomic Commit Sequence (`git log --oneline main..HEAD`)
```text
f76d7c1 test: BR-5b, S-7, S-8, and fail-closed tests
7abab7d fix: BR-5b UI pool_id context
43abc9c fix: S-7 Shot-Cam roles and S-8 GET /api/games pool creation
5c01adf fix: claim code fail-closed (Decision #52)
```
*Verification: Exactly 4 atomic commits on top of main, isolating claim fail-closed, S-7/S-8 server logic, client UI, and tests.*

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

## 4. Source Code Facts & Scoping Verifications

### 4.1 Wrap-Up Game-Set Resolution (`src/services/weeklyWrapUp.ts:130-230`)
```typescript
130:     }
131:     const poolGames = Array.from(gamesMap.values());
132: 
133:     // Resolve non-excluded games using shared scoring resolver
134:     const excludedWindows = settings.excludedGameWindows ?? settings.excluded_game_windows;
135:     const nonExcludedGames = poolGames.filter(
136:       (game) => !isGameInExcludedWindow(game.kickoffTime, excludedWindows)
137:     );
138: 
139:     // If no non-excluded games are found, strictly abort (do NOT trigger database-wide fallback)
140:     if (nonExcludedGames.length === 0) {
141:       return {
142:         applied: false,
143:         reason: 'NO_GAMES_FOR_WEEK',
144:         poolId,
145:         weekNo,
146:       };
147:     }
148: 
149:     // -------------------------------------------------------------------------
150:     // Step 3: READ (Status Check) - All resolved non-excluded games MUST be FINAL
151:     // -------------------------------------------------------------------------
152:     const pendingGames = nonExcludedGames.filter(
153:       (g) => g.status !== GameStatus.FINAL || g.homeScore === null || g.awayScore === null
154:     );
155: 
156:     if (pendingGames.length > 0) {
157:       const sortedPending = [...pendingGames].sort(
158:         (a, b) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime()
159:       );
160:       return {
161:         applied: false,
162:         reason: 'WEEK_NOT_FINAL',
163:         pendingCount: pendingGames.length,
164:         earliestPendingKickoff: sortedPending[0]?.kickoffTime ?? null,
165:         poolId,
166:         weekNo,
167:       };
168:     }
169: 
170:     // -------------------------------------------------------------------------
171:     // Step 4: WRITE (Claim) - Atomic claim insertion
172:     // -------------------------------------------------------------------------
173:     if (claimModel) {
174:       const claim = await claimModel.createMany({
175:         data: [{ poolId, weekNumber: weekNo }],
176:         skipDuplicates: true,
177:       });
178:       if (claim && claim.count === 0) {
179:         return { applied: false, reason: 'ALREADY_WRAPPED_UP', poolId, weekNo };
180:       }
181:     }
182: 
183:     // -------------------------------------------------------------------------
184:     // Step 5: WRITE (Effects) - Grade, Split Penalties, and Update Stats
185:     // -------------------------------------------------------------------------
186:     const targetGame = resolveTiebreakerGame(nonExcludedGames, gameTargetSetting);
187:     const targetGameHomeScore = targetGame?.homeScore ?? 0;
188:     const targetGameAwayScore = targetGame?.awayScore ?? 0;
189:     const actualTiebreakerTotal = targetGame ? targetGameHomeScore + targetGameAwayScore : 0;
190: 
191:     // Fetch weekly submissions for tiebreaker predictions
192:     const weeklySubmissions = await tx.weeklySubmission.findMany({
193:       where: {
194:         poolId: pool.id,
195:         weekNumber: weekNo,
196:       },
197:     });
198: 
199:     const predictionsMap = new Map<string, number | null>();
200:     for (const sub of weeklySubmissions) {
201:       if (sub.tieBreakerPrediction !== null && sub.tieBreakerPrediction !== undefined) {
202:         predictionsMap.set(sub.userId, Number(sub.tieBreakerPrediction));
203:       } else {
204:         predictionsMap.set(sub.userId, null);
205:       }
206:     }
207: 
208:     // Calculate score per member
209:     const memberScoresMap = new Map<string, number>();
210:     for (const membership of pool.memberships) {
211:       memberScoresMap.set(membership.userId, 0);
212:     }
213: 
214:     for (const pick of picks) {
215:       if (memberScoresMap.has(pick.userId) && pick.result) {
216:         const isExcluded = pick.game ? isGameInExcludedWindow(pick.game.kickoffTime, excludedWindows) : false;
217:         if (!isExcluded) {
218:           const currentScore = memberScoresMap.get(pick.userId) || 0;
219:           memberScoresMap.set(pick.userId, currentScore + Number(pick.result.pointsAwarded));
220:         }
221:       }
222:     }
223: 
224:     // Build scored members array with tiebreaker distance
225:     const memberEntries: ScoredMember[] = pool.memberships.map((membership: any) => {
226:       const userId = membership.userId;
227:       const score = memberScoresMap.get(userId) || 0;
228:       const prediction = predictionsMap.has(userId) ? predictionsMap.get(userId)! : null;
229: 
230:       let tiebreakerDistance = Infinity;
```

### 4.2 S-7 Shot-Cam & S-8 GET /api/games Server Diff (`git diff HEAD~3..HEAD~2 -- src/server.ts`)
```diff
diff --git a/src/server.ts b/src/server.ts
index 2865aab..46423aa 100644
--- a/src/server.ts
+++ b/src/server.ts
@@ -112,19 +112,34 @@ app.get('/api/games', requireAuth, async (req: Request, res: Response): Promise<
   const poolId = req.query.pool_id ? String(req.query.pool_id) : undefined;
 
   try {
-    let pool = poolId
-      ? await prisma.pool.findUnique({ where: { id: poolId } })
-      : await prisma.pool.findFirst({ where: { status: 'ACTIVE' } });
-
-    if (!pool) {
-      pool = await prisma.pool.create({
-        data: {
-          name: 'Main NFL Pick \'Em Pool',
-          adminId: userId,
-          settings: { lock_offset: 0, points_per_win: 1 },
+    let pool: any = null;
+    if (poolId) {
+      pool = await prisma.pool.findUnique({ where: { id: poolId } });
+    } else {
+      const membership = await prisma.poolMembership.findFirst({
+        where: {
+          userId,
           status: 'ACTIVE',
+          pool: { status: 'ACTIVE' },
         },
+        include: { pool: true },
       });
+
+      if (membership) {
+        pool = membership.pool;
+      } else {
+        pool = await prisma.pool.findFirst({
+          where: {
+            adminId: userId,
+            status: 'ACTIVE',
+          },
+        });
+      }
+    }
+
+    if (!pool) {
+      res.status(404).json({ error: 'POOL_NOT_FOUND' });
+      return;
     }
 
     const games = await prisma.game.findMany({
@@ -609,13 +624,12 @@ app.post('/api/pools/:pool_id/penalties/:id/media', requireAuth, async (req: Req
       return;
     }
 
-    // 2. Authorization check: penalty owner, pool commissioner, or global admin
+    // 2. Authorization check: penalty owner or pool commissioner
     const requestingUserId = req.user!.id;
     const isOwner = penalty.userId === requestingUserId;
     const isCommissioner = pool.adminId === requestingUserId;
-    const isAdmin = req.user!.role === 'ADMIN';
 
-    if (!isOwner && !isCommissioner && !isAdmin) {
+    if (!isOwner && !isCommissioner) {
       res.status(403).json({ error: 'Forbidden: You do not have permission to upload media for this penalty.' });
       return;
     }
@@ -671,7 +685,7 @@ app.post('/api/pools/:pool_id/penalties/:id/media', requireAuth, async (req: Req
 /**
  * PATCH /api/pools/:pool_id/penalties/:id/media/confirm
  * Commissioner action to flip penalty media status to CONFIRMED (or REJECTED/PENDING).
- * Restricted to the pool commissioner or global admin.
+ * Restricted to the pool commissioner.
  */
 app.patch('/api/pools/:pool_id/penalties/:id/media/confirm', requireAuth, async (req: Request, res: Response): Promise<void> => {
   const poolId = String(req.params.pool_id);
@@ -684,7 +698,7 @@ app.patch('/api/pools/:pool_id/penalties/:id/media/confirm', requireAuth, async
   }
 
   try {
-    // 1. Fetch pool and verify commissioner / admin permissions
+    // 1. Fetch pool and verify commissioner permissions
     const pool = await prisma.pool.findUnique({
       where: { id: poolId },
     });
@@ -696,10 +710,9 @@ app.patch('/api/pools/:pool_id/penalties/:id/media/confirm', requireAuth, async
 
     const requestingUserId = req.user!.id;
     const isCommissioner = pool.adminId === requestingUserId;
-    const isAdmin = req.user!.role === 'ADMIN';
 
-    if (!isCommissioner && !isAdmin) {
-      res.status(403).json({ error: 'Forbidden: Only the pool commissioner or admin can confirm penalty media.' });
+    if (!isCommissioner) {
+      res.status(403).json({ error: 'Forbidden: Only the pool commissioner can confirm penalty media.' });
       return;
     }
```

### 4.3 S-8 Client Calls (`grep -rn "/api/games" client/`)
```text
client/src/components/WeeklyPicks.tsx:60:      const response = await fetch('/api/games', {
```

### 4.4 BR-5b UI Pool Scoping (`client/src/pages/AdminDashboard.tsx:90-165`)
```typescript
90:   // 3. Fetch User's Picks for the week (with pool_id)
91:   const fetchUserPicks = useCallback(async (userId: string, targetPoolId?: string) => {
92:     if (!userId) return;
93:     const currentPoolId = targetPoolId || poolId;
94:     if (!currentPoolId) return;
95:     setLoadingPicks(true);
96:     try {
97:       const res = await fetch(`/api/admin/picks?user_id=${userId}&pool_id=${currentPoolId}`, {
98:         headers: { Authorization: `Bearer ${token}` },
99:       });
100:       if (!res.ok) throw new Error('Failed to fetch user pick slate.');
101:       const data = await res.json();
102:       setGames(data.games || []);
103:       if (data.pool?.id) setPoolId(data.pool.id);
104:     } catch (err: any) {
105:       setToast({ message: err.message || 'Error fetching picks', type: 'error' });
106:     } finally {
107:       setLoadingPicks(false);
108:     }
109:   }, [token, poolId]);
110: 
111:   // 4. Fetch Audit Logs
112:   const fetchAuditLogs = useCallback(async () => {
113:     try {
114:       const res = await fetch('/api/admin/audit-logs', {
115:         headers: { Authorization: `Bearer ${token}` },
116:       });
117:       if (res.ok) {
118:         const data = await res.json();
119:         setAuditLogs(data);
120:       }
121:     } catch (err) {
122:       console.error('Failed to load audit logs:', err);
123:     }
124:   }, [token]);
125: 
126:   useEffect(() => {
127:     fetchUsers();
128:     fetchPools();
129:     fetchAuditLogs();
130:   }, [fetchUsers, fetchPools, fetchAuditLogs]);
131: 
132:   useEffect(() => {
133:     if (selectedUserId && poolId) {
134:       fetchUserPicks(selectedUserId, poolId);
135:     }
136:   }, [selectedUserId, poolId, fetchUserPicks]);
137: 
138:   // 5. Handle Override Submission
139:   const handleAdminOverride = async (game: AdminGameItem, targetTeam: string | null) => {
140:     if (!selectedUserId || !poolId) {
141:       setToast({ message: 'Missing user or pool identifier.', type: 'error' });
142:       return;
143:     }
144: 
145:     setOverridingGameId(game.id);
146: 
147:     try {
148:       const res = await fetch('/api/admin/picks', {
149:         method: 'PUT',
150:         headers: {
151:           'Content-Type': 'application/json',
152:           Authorization: `Bearer ${token}`,
153:         },
154:         body: JSON.stringify({
155:           user_id: selectedUserId,
156:           pool_id: poolId,
157:           game_id: game.id,
158:           selected_team_id: targetTeam,
159:         }),
160:       });
161: 
162:       const data = await res.json();
163: 
164:       if (!res.ok) {
165:         throw new Error(data.error || 'Admin override failed.');
```

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

## 6. Architecture Decision Register

```text
ARCHITECTURE.md:485:- **R-12.2-AA:** S-6 triggered (admin picks routes cross-pool). Decision #49 implemented. /api/admin/users accepted as platform-level. Migration count corrected to 8.
ARCHITECTURE.md:487:- **R-12.2-AC:** Decision #52 applied (claim code fails closed). S-7 global admin override removed from Shot-Cam routes. 00e89dd deviation recorded.
```

---

## 7. Full Test Suite Execution (`npm run test:db`)

```text
> nfl-pick-em@1.0.0 test:db
> npm run db:reset && npx prisma migrate deploy && npx prisma generate && node scripts/db_header.js && vitest --no-color


> nfl-pick-em@1.0.0 db:reset
> tsx scripts/dev/reset-rehearsal.mjs

=== RESET REHEARSAL DATABASE (Decision #35) ===

✅ URL Safety verified (localhost, no schema, pickem_rehearsal).
Terminating active connections to pickem_rehearsal...
Dropping and recreating pickem_rehearsal...
✅ pickem_rehearsal database recreated with timezone=UTC and app.disposable=true.
✅ Server sentinel app.disposable verified.
✅ Role 'anon' provisioned.
✅ Role 'authenticated' provisioned.
✅ Role 'service_role' provisioned.

--- Running prisma migrate deploy on pickem_rehearsal ---
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "pickem_rehearsal", schema "public" at "localhost:5432"

8 migrations found in prisma/migrations

Applying migration `20260927000000_init`
Applying migration `20260928051824_add_pool_member_stats_and_penalty_ledger`
Applying migration `20260928124900_precision_and_weekly_submissions`
Applying migration `20260928170000_weekly_submission_finalized_and_game_notes`
Applying migration `20260928180000_shot_cam_penalty_media_and_rls`
Applying migration `20260929144500_br_1_ledger_append_only`
Applying migration `20260930010000_br_2b_ledger_api_lockdown`
Applying migration `20260930020000_br_2c_public_tables_api_lockdown`

The following migration(s) have been applied:

migrations/
  └─ 20260927000000_init/
    └─ migration.sql
  └─ 20260928051824_add_pool_member_stats_and_penalty_ledger/
    └─ migration.sql
  └─ 20260928124900_precision_and_weekly_submissions/
    └─ migration.sql
  └─ 20260928170000_weekly_submission_finalized_and_game_notes/
    └─ migration.sql
  └─ 20260928180000_shot_cam_penalty_media_and_rls/
    └─ migration.sql
  └─ 20260929144500_br_1_ledger_append_only/
    └─ migration.sql
  └─ 20260930010000_br_2b_ledger_api_lockdown/
    └─ migration.sql
  └─ 20260930020000_br_2c_public_tables_api_lockdown/
    └─ migration.sql
      
All migrations have been successfully applied.

Applied Migrations:
┌─────────┬─────────────────────────────────────────────────────────────┬──────────────────────────┐
│ (index) │ migration_name                                              │ finished_at              │
├─────────┼─────────────────────────────────────────────────────────────┼──────────────────────────┤
│ 0       │ '20260927000000_init'                                       │ 2026-10-01T03:43:51.785Z │
│ 1       │ '20260928051824_add_pool_member_stats_and_penalty_ledger'   │ 2026-10-01T03:43:51.813Z │
│ 2       │ '20260928124900_precision_and_weekly_submissions'           │ 2026-10-01T03:43:51.852Z │
│ 3       │ '20260928170000_weekly_submission_finalized_and_game_notes' │ 2026-10-01T03:43:51.858Z │
│ 4       │ '20260928180000_shot_cam_penalty_media_and_rls'             │ 2026-10-01T03:43:51.877Z │
│ 5       │ '20260929144500_br_1_ledger_append_only'                    │ 2026-10-01T03:43:51.883Z │
│ 6       │ '20260930010000_br_2b_ledger_api_lockdown'                  │ 2026-10-01T03:43:51.886Z │
│ 7       │ '20260930020000_br_2c_public_tables_api_lockdown'           │ 2026-10-01T03:43:51.897Z │
└─────────┴─────────────────────────────────────────────────────────────┴──────────────────────────┘
weekly_wrapups exists in public: false (Expected: false)
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "pickem_rehearsal", schema "public" at "localhost:5432"

8 migrations found in prisma/migrations


No pending migrations to apply.
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma

✔ Generated Prisma Client (v5.22.0) to .\node_modules\@prisma\client in 286ms

Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

Tip: Need your database queries to be 1000x faster? Accelerate offers you that and more: https://pris.ly/tip-2-accelerate

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
    "started_at": "2026-10-01T03:43:51.712Z",
    "finished_at": "2026-10-01T03:43:51.785Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928051824_add_pool_member_stats_and_penalty_ledger",
    "started_at": "2026-10-01T03:43:51.786Z",
    "finished_at": "2026-10-01T03:43:51.813Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928124900_precision_and_weekly_submissions",
    "started_at": "2026-10-01T03:43:51.814Z",
    "finished_at": "2026-10-01T03:43:51.852Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928170000_weekly_submission_finalized_and_game_notes",
    "started_at": "2026-10-01T03:43:51.852Z",
    "finished_at": "2026-10-01T03:43:51.858Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928180000_shot_cam_penalty_media_and_rls",
    "started_at": "2026-10-01T03:43:51.859Z",
    "finished_at": "2026-10-01T03:43:51.877Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260929144500_br_1_ledger_append_only",
    "started_at": "2026-10-01T03:43:51.878Z",
    "finished_at": "2026-10-01T03:43:51.883Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260930010000_br_2b_ledger_api_lockdown",
    "started_at": "2026-10-01T03:43:51.884Z",
    "finished_at": "2026-10-01T03:43:51.886Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260930020000_br_2c_public_tables_api_lockdown",
    "started_at": "2026-10-01T03:43:51.887Z",
    "finished_at": "2026-10-01T03:43:51.897Z",
    "applied_steps_count": 1
  }
]

3. Prisma Migrate Status:
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "pickem_rehearsal", schema "public" at "localhost:5432"

8 migrations found in prisma/migrations

Database schema is up to date!

 RUN  v5.0.2 C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em

 ✓ tests/br1.test.ts (6 tests) 652ms
 ✓ tests/br2.test.ts (5 tests) 893ms
   ✓ BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix (5)
     ✓ BR-2b/2c: asserts anon role is denied SELECT (SQLSTATE 42501) across all public tables 322ms
 ✓ tests/authMiddleware.test.ts (21 tests) 84ms
 ✓ tests/br4b.test.ts (1 test) 435ms
 ✓ tests/br5b_routes.test.ts (16 tests) 1490ms
   ✓ BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan (16)
     ✓ GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) (5)
       ✓ returns 401 when Authorization header is missing 491ms
 ✓ tests/safeguards.test.ts (6 tests) 14ms
 ✓ tests/characterization.test.ts (6 tests) 24ms

 Test Files  7 passed (7)
      Tests  61 passed (61)
   Start at  20:44:06
   Duration  3.75s (tests 57%, import 23%, transform 12%, setup 5%, worker 3%)

    Isolate  7 workers spawned · ~569ms startup each (spawn + environment, per file)
             at least ~758ms faster with isolate: false — reuses workers across files instead of one per file
```

### 7.1 Test Matrix Summary
| Test File | Total Tests | Status | Scope |
| :--- | :--- | :--- | :--- |
| `tests/authMiddleware.test.ts` | **21** | PASS | BR-5 & BR-5b Pure-Mock Auth Guards (param, query, body) |
| `tests/br5b_routes.test.ts` | **16** | PASS | BR-5b Integration HTTP Routes, S-7 Shot-Cam Role Verification & S-8 Pool Scoping |
| `tests/br1.test.ts` | **6** | PASS | BR-1 Append-Only Immutability & Rehearsal Assertions |
| `tests/br2.test.ts` | **5** | PASS | BR-2b/2c RLS & Public Privilege Lockdown Matrix |
| `tests/br4b.test.ts` | **1** | PASS | BR-4b Minimal Decision #52 Fail-Closed Verification |
| `tests/characterization.test.ts` | **6** | PASS | INV-5 Lock Logic & Window Exclusions |
| `tests/safeguards.test.ts` | **6** | PASS | Safety Guards & Host Sanitization |
| **Total Test Suite** | **61** | **ALL PASS (100%)** | Full Database Rehearsal & Pure Mock Coverage |

---

## 8. Documentation Invariant Audit (Append-Only Verification)

### 8.1 Live File Line Counts & Baseline Numstat
```text
Line Counts:
  493 ARCHITECTURE.md
  118 ROADMAP.md
  295 tasks.md
  906 total

Numstat vs Baseline (e41ce72):
200	0	ARCHITECTURE.md
40	0	ROADMAP.md
149	0	tasks.md
```
*Verification: Strictly 0 deletions across ARCHITECTURE.md, ROADMAP.md, and tasks.md.*

---

## 9. Decision #49 Route Protection Matrix

| Route | Method | Scoping / Extraction | Guard Middleware | Security Status |
| :--- | :--- | :--- | :--- | :--- |
| `/api/health` | GET | None | None | **ALLOWLISTED (Public Health Endpoint)** |
| `/api/auth/login` | POST | Body (`email`, `password`) | None | **PUBLIC AUTH** |
| `/api/pools` | GET | None | `requireAuth` | **GUARDED (Platform Pool List)** |
| `/api/games` | GET | Query (`week`, `pool_id`) | `requireAuth` | **GUARDED (S-8 Remediated: 404 on missing, no write-on-GET)** |
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

## 10. R-12.2-AD Acceptance Criteria Checklist (Section 10)

- [ ] **1. History Rewrite (Local Only):** Branch `fix/br5b-admin-picks` rewritten into 4 clean atomic commits on top of `main`; no remote push executed.
- [ ] **2. Evidence Generator Hardening:** Generator strictly uses `spawnSync`, UTF-8 encoding, `NO_COLOR=1`, NUL-byte sanitization (`\x00` stripped), incremental writes, non-empty section validation, and size >= 2000 bytes.
- [ ] **3. Fact Gathering & DB Verification:** All facts captured (commit logs, migrations count 8, `weeklyWrapUp.ts` game resolution, 0 DDL grep, S-7 diff, S-8 client calls, BR-5b UI, Decision register).
- [ ] **4. Decision #53 Applied (S-7 Reclassification):** Shot-Cam routes scoped to owner and pool commissioner only.
- [ ] **5. Decision #54 Applied (S-8 Write-on-GET Removal):** `GET /api/games` returns 404 POOL_NOT_FOUND when missing; resolves active membership/commissioner pool when `pool_id` omitted; zero writes on read.
- [ ] **6. Decision #52 Applied (Claim Store Fails Closed):** Claim store checks `to_regclass` and fails closed with `CLAIM_STORE_UNAVAILABLE`.
- [ ] **7. BR-5b UI:** `client/src/pages/AdminDashboard.tsx` uses pool context for `pool_id` on GET and PUT calls.
- [ ] **8. Test Execution:** `npm run test:db` executes clean DB reset, migrate deploy, client generate, `db_header.js`, and all 61 tests passing.
- [ ] **9. Docs Invariant Upheld:** `ARCHITECTURE.md`, `ROADMAP.md`, `tasks.md` strictly 0 deletions against `e41ce72`.
- [ ] **10. Evidence Bundle Generated:** `docs/evidence/R-12.2-AD/EVIDENCE_BUNDLE.md` generated with size >= 2000 bytes.

---

