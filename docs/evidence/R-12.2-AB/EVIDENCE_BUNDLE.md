# EVIDENCE BUNDLE — RE: RULING R-12.2-AB
**Date (UTC):** 2026-10-01T03:05:58.730Z  
**Current Commit:** 00e89dd64ae5c130b96cd7af476794a2014872b3  
**Branch:** fix/br5b-admin-picks  

---

## 1. Generator Self-Test Verification

```text
(node:9792) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/scripts/generate_evidence.js is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to \\?\C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\package.json.
(Use `node --trace-warnings ...` to show where the warning was created)
=== Running Generator Self-Test ===
Generator Self-Test Caught Expected Error:
Empty output block detected from command: "node -e "process.stdout.write('')""
```
*Verification: The generator strictness check proved operational by failing on an empty command block and exiting with code 1.*

---

## 2. Safe State & Branching Verification (Section 1)

```text
=== GIT STATUS ===
(empty - working tree clean)

=== CURRENT BRANCH ===
fix/br5b-admin-picks

=== RECENT LOG (5 COMMITS) ===
00e89dd docs: generate evidence bundle and finalize changes for R-12.2-AA
8ec0ca5 docs: generate evidence bundle and finalize changes for R-12.2-Z
a28e55d chore: retire wrapUpConcurrency test and sanitize safeguards ref
e0e8579 Merge branch 'feat/phase12-guard-e2e' into main (R-12.2-X: Decision #20 override removal & BR-5 unit tests)
e67ad25 docs(evidence): record R-12.2-X verification bundle, diffs, and test outputs

=== DIFF STAT VS MAIN ===
(no diff - identical to main)
```

---

## 3. Negative & Positive Control Grep (Worktree Isolated Execution)

Verification of DDL and search_path grep controls executing against prior commits via temporary git worktree isolation:

### 3.1 Negative Control at Pre-Retirement Commit (e0e8579, Executed in Isolated `.worktree-ctl`)
```text
tests/wrapUpConcurrency.test.ts:17:      CREATE TABLE IF NOT EXISTS public.weekly_wrapups (
```
*Verification: DDL in wrapUpConcurrency.test.ts was caught inside isolated worktree without touching live working tree.*

### 3.2 Positive Control at HEAD (Clean Live State)
```text
CLEAN: 0 DDL or SET search_path matches found across tests/, scripts/dev/, prisma/seed.ts
```
*Verification: Clean live tree contains 0 DDL or SET search_path statements.*

---

## 4. Fact Gathering & Integrity Checks (Sections 2, 3, 4, 5)

================================================================================
FACT GATHERING & INTEGRITY CHECKS — RULING R-12.2-AB
================================================================================

### 1. Grep for "Main NFL Pick" in src, prisma, client, seed
```text
src/server.ts:122:          name: 'Main NFL Pick \'Em Pool',
```

### 2. Git Working Tree State & Current Branch
```text
Branch: fix/br5b-admin-picks
Status: ?? facts_ab.txt
?? scripts/gather_facts_ab.js
?? state.txt
```

### 3. Rehearsal Database Migration Status (`npx prisma migrate status`)
```text
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "pickem_rehearsal", schema "public" at "localhost:5432"

8 migrations found in prisma/migrations

Database schema is up to date!
```

### 4. Schema & Prisma Client Types Search for `WeeklyWrapup`
```text
Schema & Code search on main:
main:src/services/weeklyWrapUp.ts:13:export interface WeeklyWrapUpResult {
main:src/services/weeklyWrapUp.ts:67: * 4. WRITE (Claim): Create the weekly_wrapups claim via createMany({ skipDuplicates: true }).
main:src/services/weeklyWrapUp.ts:70:export async function executeWeeklyWrapUp(poolId: string, weekNo: number): Promise<WeeklyWrapUpResult> {
main:src/services/weeklyWrapUp.ts:75:    const claimModel = tx.weeklyWrapup || tx.weekly_wrapups || tx.weeklyWrapups;
main:src/services/weeklyWrapUp.ts:354:export const runWeeklyWrapUp = executeWeeklyWrapUp;

Matches for "WeeklyWrapup" in node_modules/.prisma/client/index.d.ts: 707
```

### 5. Audited Route Handlers & Protection Facts
| Endpoint | File Location | Middleware | Authorization & Scoping | Notes / Audit |
| :--- | :--- | :--- | :--- | :--- |
| `POST /api/pools/:pool_id/penalties/:id/media` | `src/server.ts:581` | `requireAuth` | Scoped to pool: checks penalty exists in pool, user is owner/commish/admin | Creates `UPLOAD_PENALTY_MEDIA` audit log |
| `PATCH /api/pools/:pool_id/penalties/:id/media/confirm` | `src/server.ts:676` | `requireAuth` | Scoped to pool: verifies commissioner or admin role | Creates `CONFIRM_PENALTY_MEDIA` audit log |
| `GET /api/games` | `src/server.ts:110` | `requireAuth` | Global game schedule with optional week & pool_id filtering | Read-only |
| `POST /api/picks` | `src/routes/picks.ts:15` | `requireAuth` | Submits/updates user own pick; enforces pool lock offset and game kickoff lock | Upserts pick on [poolId, userId, gameId] |
| `GET /api/pools` | `src/server.ts:93` | `requireAuth` | Platform pool directory; lists all ACTIVE pools | Read-only |
| `GET /api/admin/audit-logs` | `src/routes/admin.ts:71` | `requireAuth, requireAdmin` | Platform-level global audit viewer; recent 50 logs with actor info | Read-only platform management |

---

## 5. Documentation Invariant & Lineage Recovery Audit (Section 6)

================================================================================
DOCUMENTATION AUDIT & INVARIANT VERIFICATION — RULING R-12.2-AB (Section 6)
================================================================================

### 1. Revision Hashes
```text
e41ce72: e41ce7249fc8e5120957cc61ce0e6ce14dcdac4a
phase12-docs-base: e41ce7249fc8e5120957cc61ce0e6ce14dcdac4a
HEAD: 00e89dd64ae5c130b96cd7af476794a2014872b3
```

### 2. Per-File Documentation Metrics & Integrity Verification
```text
--- ARCHITECTURE.md ---
  Baseline lines (e41ce72): 293
  Current lines (HEAD):     487
  Diff Numstat vs baseline: 194	0	ARCHITECTURE.md
  Blob hash:                c23d0066d127e7b84fd5211989c5c82ec97ac365
  Deleted lines:            0 (CLEAN - No deletions)

--- ROADMAP.md ---
  Baseline lines (e41ce72): 78
  Current lines (HEAD):     112
  Diff Numstat vs baseline: 34	0	ROADMAP.md
  Blob hash:                8c92cd54315f0d34b8a0982cdfefa4935d02ce49
  Deleted lines:            0 (CLEAN - No deletions)

--- tasks.md ---
  Baseline lines (e41ce72): 146
  Current lines (HEAD):     262
  Diff Numstat vs baseline: 116	0	tasks.md
  Blob hash:                ff455fb6fadeeabf5e7ec7df25c85e7856aa7215
  Deleted lines:            0 (CLEAN - No deletions)

```

### 5.1 Live File Line Counts & Baseline Numstat
```text
Line Counts:
  489 ARCHITECTURE.md
  114 ROADMAP.md
  271 tasks.md
  874 total

Numstat vs Baseline (e41ce72):
196	0	ARCHITECTURE.md
36	0	ROADMAP.md
125	0	tasks.md
```
*Verification: Strictly 0 deletions across ARCHITECTURE.md, ROADMAP.md, and tasks.md.*

---

## 6. Test Suite Execution & Summary Matrix

### 6.1 Vitest Full Suite Execution (`npx vitest run --reporter=verbose`)
```text
[1m[30m[46m RUN [49m[39m[22m [36mv5.0.2 [39m[90mC:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em[39m

 [32m✓[39m tests/br2.test.ts[2m > [22mBR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix[2m > [22mBR-2b/2c: asserts RLS is ENABLED (relrowsecurity=true) and relforcerowsecurity=false on all application public tables[33m 373[2mms[22m[39m
 [32m✓[39m tests/br2.test.ts[2m > [22mBR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix[2m > [22mBR-2b/2c: asserts anon role is denied SELECT (SQLSTATE 42501) across all public tables[32m 141[2mms[22m[39m
 [32m✓[39m tests/br2.test.ts[2m > [22mBR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix[2m > [22mBR-2b/2c: asserts authenticated role is denied SELECT (SQLSTATE 42501) across all public tables[32m 181[2mms[22m[39m
 [32m✓[39m tests/br2.test.ts[2m > [22mBR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix[2m > [22mBR-2b: asserts anon role is denied UPDATE on penalty_ledger with SQLSTATE 42501 (privilege proof)[32m 4[2mms[22m[39m
 [32m✓[39m tests/br2.test.ts[2m > [22mBR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix[2m > [22mBR-2c: asserts has_function_privilege returns false for anon and authenticated on BR-1 trigger functions[32m 138[2mms[22m[39m
 [32m✓[39m tests/br4b.test.ts[2m > [22mBR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants[2m > [22m1. Apply once, second call returns ALREADY_WRAPPED_UP[33m 526[2mms[22m[39m
 [32m✓[39m tests/br4b.test.ts[2m > [22mBR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants[2m > [22m2. Concurrent calls on final week: exactly one applies, other receives ALREADY_WRAPPED_UP[32m 165[2mms[22m[39m
 [32m✓[39m tests/br4b.test.ts[2m > [22mBR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants[2m > [22m3. Concurrent calls on non-final week: both return WEEK_NOT_FINAL with zero rows written[32m 73[2mms[22m[39m
 [32m✓[39m tests/br4b.test.ts[2m > [22mBR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants[2m > [22m4. NO_GAMES_FOR_WEEK returned when week has no scheduled games in pool[32m 31[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mGET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" }))[2m > [22mreturns 401 when Authorization header is missing[32m 196[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mGET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" }))[2m > [22mreturns 400 when pool_id query parameter is missing or malformed[32m 33[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mGET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" }))[2m > [22mreturns 404 when pool does not exist[32m 222[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mGET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" }))[2m > [22mreturns 403 when user is not the pool commissioner[32m 13[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mGET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" }))[2m > [22mreturns 200 and game slate snapshot when user is the verified commissioner[32m 28[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mPUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" }))[2m > [22mreturns 401 when Authorization header is missing[32m 59[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mPUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" }))[2m > [22mreturns 400 when pool_id is missing or malformed in request body[32m 15[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mPUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" }))[2m > [22mreturns 404 when pool does not exist in request body[32m 22[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mPUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" }))[2m > [22mreturns 403 when user is not the pool commissioner[32m 9[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mPUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" }))[2m > [22mreturns 200 and upserts pick when authenticated user is the commissioner[32m 54[2mms[22m[39m
 [32m✓[39m tests/br1.test.ts[2m > [22mBR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints[2m > [22mBR-1: asserts trigger and function definitions match requirements (BEFORE ROW/STATEMENT, plpgsql, prosecdef=false, unconditional RAISE)[32m 26[2mms[22m[39m
 [32m✓[39m tests/br1.test.ts[2m > [22mBR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints[2m > [22mBR-1: UPDATE (including no-op update) is blocked with count >= 1 and SQLSTATE P0001[32m 55[2mms[22m[39m
 [32m✓[39m tests/br1.test.ts[2m > [22mBR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints[2m > [22mBR-1: DELETE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001[32m 42[2mms[22m[39m
 [32m✓[39m tests/br1.test.ts[2m > [22mBR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints[2m > [22mBR-1: TRUNCATE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001[32m 48[2mms[22m[39m
 [32m✓[39m tests/br1.test.ts[2m > [22mBR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints[2m > [22mBR-1: membership-row DELETE cascades to penalty_ledger and is intercepted by trigger with P0001[32m 12[2mms[22m[39m
 [32m✓[39m tests/br1.test.ts[2m > [22mBR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints[2m > [22mBR-1: DELETE FROM pools fixture asserts exact foreign key constraint pool_memberships_pool_id_fkey and SQLSTATE 23503[32m 4[2mms[22m[39m
 [32m✓[39m tests/br5b_routes.test.ts[2m > [22mBR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan[2m > [22mDecision #49: CI Route Scan & Route Guard Verification[2m > [22mverifies all routes with pool parameters are guarded; only /api/health and GET /api/admin/users allowlisted[32m 2[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequireAuth[2m > [22mreturns 401 when Authorization header is absent[32m 5[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequireAuth[2m > [22mreturns 401 when Authorization header does not start with Bearer[32m 1[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequireAuth[2m > [22mreturns 401 for an invalid / expired token[32m 1[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequireAuth[2m > [22mdecodes valid JWT and attaches user to req.user, then calls next()[32m 13[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequireAdmin[2m > [22mreturns 401 if req.user is undefined[32m 1[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequireAdmin[2m > [22mreturns 403 if req.user is not ADMIN[32m 1[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequireAdmin[2m > [22mcalls next() if user is ADMIN[32m 1[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolCommissioner[2m > [22mreturns 401 if req.user is missing[32m 1[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolCommissioner[2m > [22mreturns 400 for a malformed non-UUID pool_id[32m 2[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolCommissioner[2m > [22mreturns 404 when the pool does not exist in DB[32m 4[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolCommissioner[2m > [22mreturns 403 when user is neither commissioner nor member[32m 1[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolCommissioner[2m > [22mDecision #20 & R-12.2-W: global ADMIN who is not the pool commissioner -> 403, no req.pool, zero side effects[32m 1[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolCommissioner[2m > [22mcalls next() and attaches pool when user is the pool commissioner[32m 1[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolCommissioner[2m > [22mfrom: query - extracts pool_id from query params and authorizes commissioner[32m 1[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolCommissioner[2m > [22mfrom: query - returns 400 when pool_id query parameter is missing[32m 0[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolCommissioner[2m > [22mfrom: body - extracts pool_id from request body and authorizes commissioner[32m 1[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolCommissioner[2m > [22mfrom: body - returns 400 when pool_id body parameter is missing[32m 0[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolMember[2m > [22mreturns 403 if user is not a member and not the commissioner[32m 1[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolMember[2m > [22mDecision #20 & R-12.2-W: global ADMIN who is not a member and not commissioner -> 403, no req.pool[32m 1[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolMember[2m > [22mcalls next() when user is active pool member[32m 0[2mms[22m[39m
 [32m✓[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolMember[2m > [22mcalls next() when user is the pool commissioner (even without explicit membership row)[32m 0[2mms[22m[39m
 [32m✓[39m tests/safeguards.test.ts[2m > [22mBR-6 Safeguards: assertDisposableUrl[2m > [22mallows valid local disposable database URLs[32m 5[2mms[22m[39m
 [32m✓[39m tests/safeguards.test.ts[2m > [22mBR-6 Safeguards: assertDisposableUrl[2m > [22mrejects remote / hosted database URLs (Supabase, AWS, Neon, etc.)[32m 1[2mms[22m[39m
 [32m✓[39m tests/safeguards.test.ts[2m > [22mBR-6 Safeguards: assertDisposableUrl[2m > [22mDecision #32 Sabotage Test: point TEST_DATABASE_URL at production fingerprint -> aborts before connection[32m 1[2mms[22m[39m
 [32m✓[39m tests/safeguards.test.ts[2m > [22mBR-6 Safeguards: assertDisposableUrl[2m > [22mrejects URLs using ?schema= parameter to bypass host isolation[32m 1[2mms[22m[39m
 [32m✓[39m tests/safeguards.test.ts[2m > [22mBR-6 Safeguards: assertDisposableUrl[2m > [22mrejects non-disposable production database names on localhost[32m 2[2mms[22m[39m
 [32m✓[39m tests/safeguards.test.ts[2m > [22mBR-6 Safeguards: assertDisposableUrl[2m > [22msabotage test: throws when TEST_DATABASE_URL is empty string or undefined[32m 2[2mms[22m[39m
 [32m✓[39m tests/characterization.test.ts[2m > [22mINV-5 Lock Logic & Boundary Characterization[2m > [22mRolling lock: enforces lock per-game at kickoff boundary[32m 5[2mms[22m[39m
 [32m✓[39m tests/characterization.test.ts[2m > [22mINV-5 Lock Logic & Boundary Characterization[2m > [22mRolling lock with offset: enforces lock at (kickoff - offset)[32m 1[2mms[22m[39m
 [32m✓[39m tests/characterization.test.ts[2m > [22mINV-5 Lock Logic & Boundary Characterization[2m > [22mGlobal lock vs Rolling lock: handles first game vs later games[32m 1[2mms[22m[39m
 [32m✓[39m tests/characterization.test.ts[2m > [22mINV-5 Lock Logic & Boundary Characterization[2m > [22mExcluded windows: correctly identifies TNF, MNF, Sunday Early/Late, SNF[32m 2[2mms[22m[39m
 [32m✓[39m tests/characterization.test.ts[2m > [22mBR-4 splitPenalty Math Characterization[2m > [22mWorked matrix: confirms exact zero-diff decimal split amounts[32m 5[2mms[22m[39m
 [32m✓[39m tests/characterization.test.ts[2m > [22mBR-4b Set-Equality: Wrap-Up vs Scoring Resolver[2m > [22mAsserts 100% game ID set equality between wrap-up and scoring resolvers[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m7 passed[39m[22m[90m (7)[39m
[2m      Tests [22m [1m[32m59 passed[39m[22m[90m (59)[39m
[2m   Start at [22m 20:05:54
[2m   Duration [22m 3.54s[2m (tests 61%, import 22%, transform 11%, setup 3%, worker 2%)[22m

[2m    Isolate [22m [33m7 workers spawned[39m[2m · ~506ms startup each (spawn + environment, per file)[22m
[2m            [22m [2mat least ~674ms faster with [22m[33misolate: false[39m[2m — reuses workers across files instead of one per file[22m

JSON report written to C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/docs/evidence/R-12.2-AB/vitest.json
```

### 6.2 Test Matrix Summary
| Test File | Total Tests | Status | Scope |
| :--- | :--- | :--- | :--- |
| `tests/authMiddleware.test.ts` | **21** | PASS | BR-5 & BR-5b Pure-Mock Auth Guards (param, query, body) |
| `tests/br5b_routes.test.ts` | **11** | PASS | BR-5b Integration HTTP Routes & Decision #49 Scan |
| `tests/br1.test.ts` | **6** | PASS | BR-1 Append-Only Immutability & Rehearsal Assertions |
| `tests/br2.test.ts` | **5** | PASS | BR-2b/2c RLS & Public Privilege Lockdown Matrix |
| `tests/br4b.test.ts` | **4** | PASS | BR-4b Weekly Wrap-Up Service & Concurrency Invariants |
| `tests/characterization.test.ts` | **6** | PASS | INV-5 Lock Logic & Window Exclusions |
| `tests/safeguards.test.ts` | **6** | PASS | Safety Guards & Host Sanitization |
| **Total Test Suite** | **59** | **ALL PASS (100%)** | Full Rehearsal & Pure Mock Coverage |

---

## 7. Decision #49 Route Inventory & Protection Matrix

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
| `/api/pools/:pool_id/penalties/:id/media` | POST | Param (`pool_id`) | `requireAuth` | **GUARDED** |
| `/api/pools/:pool_id/penalties/:id/media/confirm` | PATCH | Param (`pool_id`) | `requireAuth` | **GUARDED** |
| `/api/pools/:pool_id/penalties/:id/media` | GET | Param (`pool_id`) | `requireAuth, requirePoolMember` | **GUARDED (Active Pool Member)** |
| `/api/pools/:pool_id/matrix` | GET | Param (`pool_id`) | `requireAuth, requirePoolMember` | **GUARDED (Active Pool Member)** |
| `/api/picks` | POST | Body (`pool_id`, `game_id`) | `requireAuth` | **GUARDED (User & Kickoff Lock)** |
| `/api/admin/users` | GET | None | `requireAuth, requireAdmin` | **ALLOWLISTED (Platform Admin User List)** |
| `/api/admin/audit-logs` | GET | None | `requireAuth, requireAdmin` | **GUARDED (Platform Audit Trail)** |
| `/api/admin/picks` | GET | Query (`pool_id`, `user_id`) | `requireAuth, requirePoolCommissioner({ from: 'query' })` | **REMEDIATED (BR-5b Commissioner Guard)** |
| `/api/admin/picks` | PUT | Body (`pool_id`, `user_id`, `game_id`) | `requireAuth, requirePoolCommissioner({ from: 'body' })` | **REMEDIATED (BR-5b Commissioner Guard)** |

---

## 8. R-12.2-AB Acceptance Criteria Checklist (Section 10)

- [ ] **BR-5b Commits on Isolated Branch:** All BR-5b changes committed to `fix/br5b-admin-picks` with clean working tree.
- [ ] **Evidence Generator Negative Control via Worktree:** Strict evidence generator uses `git worktree` isolation for negative control without modifying live working tree.
- [ ] **No Markdown Truncation:** Generator validates that no empty sections or empty code blocks exist in the bundle.
- [ ] **Integrity Checks Completed:** Facts recorded for "Main NFL Pick" occurrences, Prisma migrate status, and route handlers.
- [ ] **Docs Invariant Upheld:** `ARCHITECTURE.md`, `ROADMAP.md`, `tasks.md` strictly 0 deletions against `e41ce72`.
- [ ] **59/59 Tests Passing:** Full suite passes across rehearsal and mock environments.

---
