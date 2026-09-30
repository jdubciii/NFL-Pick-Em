# TO: Principal Product Architect & Senior Arbiter
# FROM: Project Manager & Engineering Team
# RE: RULING R-12.2-X — Section 1 & Section 3 Evidence Submission
# DATE: 2026-09-30T22:08:46Z
# COMMIT: 0619e3dcfbdad1ba16d48fc51e401c1dbc479ec3

---

## 1. Merge Conditions Evidence (Section 1)

### 1.1 Diff Stat & File List (Exactly 2 Files)
\\\
src/middleware/auth.ts       |   8 +-
 tests/authMiddleware.test.ts | 243 +++++++++++++++++++++++++++++++++++++++++++
 2 files changed, 245 insertions(+), 6 deletions(-)
\\\
**Names only:**
\\\
src/middleware/auth.ts
tests/authMiddleware.test.ts
\\\

### 1.2 Full Diff for \src/middleware/auth.ts\
\\\diff
diff --git a/src/middleware/auth.ts b/src/middleware/auth.ts
index 4d2f3c3..0e1b50d 100644
--- a/src/middleware/auth.ts
+++ b/src/middleware/auth.ts
@@ -87,9 +87,7 @@ export async function requirePoolCommissioner(req: Request, res: Response, next:
     }
 
     const isCommissioner = pool.adminId === req.user.id;
-    const isGlobalAdmin = req.user.role === Role.ADMIN;
-
-    if (!isCommissioner && !isGlobalAdmin) {
+    if (!isCommissioner) {
       res.status(403).json({ error: 'Forbidden. Pool commissioner privileges required.' });
       return;
     }
@@ -129,9 +127,7 @@ export async function requirePoolMember(req: Request, res: Response, next: NextF
     }
 
     const isCommissioner = pool.adminId === req.user.id;
-    const isGlobalAdmin = req.user.role === Role.ADMIN;
-
-    if (isCommissioner || isGlobalAdmin) {
+    if (isCommissioner) {
       req.pool = pool;
       next();
       return;
\\\
*Verification: Only global-ADMIN branches removed. Check order unchanged: 401 (Auth) -> 400 (UUID) -> 404 (Pool existence) -> 403 (Authorization).*

### 1.3 Dependency Audit Grep Output
Full output archived to \docs/evidence/R-12.2-X/dependency-grep.txt\.
- All \equirePoolCommissioner\ & \equirePoolMember\ hits are applied as pool-scoped route guards.
- All \Role.ADMIN\ hits are confined to administrative endpoints (\/api/admin/*\) and pure auth tests.
- Zero client flows or routes depend on global-ADMIN bypassing pool commissioner or pool membership checks.

### 1.4 Test Run with DATABASE_URL & TEST_DATABASE_URL Unset
- Status: **17 passed / 17 total (100% green)**
- JSON summary committed to: \docs/evidence/R-12.2-X/vitest.json\
- Verbose output:
\\\
[1m[30m[46m RUN [49m[39m[22m [36mv5.0.2 [39m[90mC:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em[39m

 [32mΓ£ô[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequireAuth[2m > [22mreturns 401 when Authorization header is absent[32m 6[2mms[22m[39m
 [32mΓ£ô[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequireAuth[2m > [22mreturns 401 when Authorization header does not start with Bearer[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequireAuth[2m > [22mreturns 401 for an invalid / expired token[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequireAuth[2m > [22mdecodes valid JWT and attaches user to req.user, then calls next()[32m 9[2mms[22m[39m
 [32mΓ£ô[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequireAdmin[2m > [22mreturns 401 if req.user is undefined[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequireAdmin[2m > [22mreturns 403 if req.user is not ADMIN[32m 0[2mms[22m[39m
 [32mΓ£ô[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequireAdmin[2m > [22mcalls next() if user is ADMIN[32m 2[2mms[22m[39m
 [32mΓ£ô[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolCommissioner[2m > [22mreturns 401 if req.user is missing[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolCommissioner[2m > [22mreturns 400 for a malformed non-UUID pool_id[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolCommissioner[2m > [22mreturns 404 when the pool does not exist in DB[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolCommissioner[2m > [22mreturns 403 when user is neither commissioner nor member[32m 0[2mms[22m[39m
 [32mΓ£ô[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolCommissioner[2m > [22mDecision #20 & R-12.2-W: global ADMIN who is not the pool commissioner -> 403, no req.pool, zero side effects[32m 0[2mms[22m[39m
 [32mΓ£ô[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolCommissioner[2m > [22mcalls next() and attaches pool when user is the pool commissioner[32m 0[2mms[22m[39m
 [32mΓ£ô[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolMember[2m > [22mreturns 403 if user is not a member and not the commissioner[32m 0[2mms[22m[39m
 [32mΓ£ô[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolMember[2m > [22mDecision #20 & R-12.2-W: global ADMIN who is not a member and not commissioner -> 403, no req.pool[32m 0[2mms[22m[39m
 [32mΓ£ô[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolMember[2m > [22mcalls next() when user is active pool member[32m 0[2mms[22m[39m
 [32mΓ£ô[39m tests/authMiddleware.test.ts[2m > [22mBR-5 middleware unit tests (pure mock)[2m > [22mrequirePoolMember[2m > [22mcalls next() when user is the pool commissioner (even without explicit membership row)[32m 0[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m17 passed[39m[22m[90m (17)[39m
[2m   Start at [22m 15:08:40
[2m   Duration [22m 649ms[2m (import 46%, transform 36%, tests 8%, setup 7%, worker 2%)[22m
\\\

---

## 2. wrapUpConcurrency.test.ts & Safeguards Evidence (Section 3)

### 2.1 File Header & DB Connection Setup
\\\	ypescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { assertDisposableUrl } from '../src/db/safeguards';

const localRehearsalUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pickem_rehearsal';

describe('BR-4 Wrap-Up Concurrency & Claim Idempotency', () => {
  let prisma: PrismaClient;
  const poolId = 'b0000000-0000-0000-0000-000000000001';
  const weekNo = 5;

  beforeAll(async () => {
    assertDisposableUrl(localRehearsalUrl);
    prisma = new PrismaClient({ datasources: { db: { url: localRehearsalUrl } } });

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.weekly_wrapups (
        pool_id UUID NOT NULL,
        week_number INTEGER NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        applied_by UUID NOT NULL,
        CONSTRAINT weekly_wrapups_pkey PRIMARY KEY (pool_id, week_number)
      );
    `);

    await prisma.$executeRawUnsafe(`
      DELETE FROM public.weekly_wrapups WHERE pool_id = '${poolId}' AND week_number = ${weekNo};
    `);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });
\\\

### 2.2 applied_by Origin & Source Code Audit
- **Git log for 'applied_by':**
\\\
96fca3d feat: implement database safeguards and testing infrastructure alongside Incident I-1 forensic artifacts
a2362c0 test: add vitest dependency and characterization and concurrency test suites
\\\
- **Source Code Audit (\src/\):**
\\\

\\\
*(Result: Empty string. Zero references to \pplied_by\ exist in \src/\)*

### 2.3 Hosted Connection Grep Proof
Search across \	ests/\, \scripts/\, \prisma/seed.ts\ for hosted patterns (\supabase.com\, \supabase.co\, \pooler\):
\\\
Path                                                                                   LineNumber Line                                                                                                                           
----                                                                                   ---------- ----                                                                                                                           
C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         21       assertDisposableUrl('postgresql://postgres.nsljipyoihcoqkuphhll:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres');
C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         30     const prodFingerprint = 'postgresql://postgres:fake@aws-0-us-east-1.pooler.supabase.com:5432/postgres';                    
C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         33     }).toThrow(/SAFETY_VIOLATION: Database host 'aws-0-us-east-1.pooler.supabase.com' is not permitted for testing/);
\\\
*(Result: Empty / safeguards only. Zero test or script connects to hosted Supabase infrastructure).*

---

## 3. Status Table
| Item | Status |
|---|---|
| Override removal | VERIFIED (code & diff in 1) |
| BR-5 middleware unit tests (17, pure mock) | PASS (mock; 17/17 green with DB URLs unset) |
| BR-5 | IMPLEMENTED-UNVERIFIED |
| S-2 residual | CLOSED IN CODE on merge |
| wrapUpConcurrency test | ISOLATED (3 audit complete) |
| BR-4b | IN PROGRESS (hosted gated) |
| I-1 / I-2 | OPEN (tripwire 2026-10-01T06:15Z) |
| 12.1 | BLOCKED until BR-5 VERIFIED |
