# HAG-29 Evidence: Regclass Deserialization Defect Audit & Fix

## 1. Executive Summary
- **Defect Reported in Live Render Logs (backend 3f9cd26)**:
  `prisma:error Invalid prisma.$queryRawUnsafe(): "Failed to deserialize column of type 'regclass'"`
- **Root Cause**: Raw PostgreSQL queries invoking `to_regclass(...)` or returning `regclass` OID types without casting to `::text` or boolean cause the Prisma driver to throw a deserialization failure because Prisma cannot map PostgreSQL's internal `regclass` pseudo-type.
- **Audit Findings**:
  1. **Authoritative Slate Ingestion / Refresh Path** (`src/services/authoritativeSlateService.ts`):
     - In live backend `3f9cd26`: `getAcceptedSlateManifest` and `refreshWeeklySlateInDb` queried `SELECT to_regclass('public.weekly_slate_manifests') as to_regclass;` without cast.
     - In accepted branch HEAD (`5f9bba33d9dbc34f001a860e7582173957399aac`): Lines 386 and 506 were ALREADY cast with `::text` (`SELECT to_regclass('public.weekly_slate_manifests')::text as to_regclass;`). Thus, the slate refresh / full-season import path is ALREADY repaired in the pending release branch.
  2. **Wrap-up Settlement Execution Path** (`src/services/wrapUpEngine.ts` & `src/services/weeklyWrapUp.ts`):
     - `src/services/wrapUpEngine.ts` lines 383 and 385: ALREADY cast with `::text`.
     - `src/services/weeklyWrapUp.ts` line 77: ALREADY cast with `::text`.
     - `scripts/dev/reset-rehearsal.mjs` line 85: ALREADY cast with `::text`.
  3. **Remaining Uncast Callsites** (`src/services/wrapUpEngine.ts` lines 136 and 139):
     - Function: `previewWeeklyWrapUpForPool(poolId, weekNumber, options)`
     - Route: `GET /api/pools/:pool_id/wrap-up/preview` and `GET /api/ops/wrap-up/preview` (via `src/routes/ops.ts:433`).
     - Nature: Read-only commissioner/admin settlement diagnostics preview check (checking whether claim store `public.weekly_wrapups` exists). It is NOT inside the slate refresh or full-season import pipeline.
     - Impact: When uncast, the query threw deserialization error, caught by `catch`, setting `markerTableExists = false` and pushing `CLAIM_STORE_UNAVAILABLE: Settlement claim store (public.weekly_wrapups) does not exist.` while logging the Prisma error.
- **Remediation**:
  - Applied minimal two-line `::text` cast in `src/services/wrapUpEngine.ts` at lines 136 and 139:
    * `$queryRaw` probe: `SELECT to_regclass('public.weekly_wrapups')::text as to_regclass;`
    * `$queryRawUnsafe` probe: `SELECT to_regclass('public.weekly_wrapups')::text as to_regclass;`
  - Re-verified all `src/` files: 100% of `to_regclass` callsites in the repository now cast explicitly to `::text`.

---

## 2. Callsite Inventory & Dispositions

| Path | Line | Context / Function | Route / Pipeline | Prior Status (3f9cd26 / 5f9bba3) | Remediation Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/services/authoritativeSlateService.ts` | 386 | `getAcceptedSlateManifest` | Slate Refresh / Manifest Read | Fixed in 5f9bba3 (`::text`) | Unchanged (Already Fixed) |
| `src/services/authoritativeSlateService.ts` | 506 | `refreshWeeklySlateInDb` | Slate Ingestion / Full Season Import | Fixed in 5f9bba3 (`::text`) | Unchanged (Already Fixed) |
| `src/services/weeklyWrapUp.ts` | 77 | `executeWeeklyWrapUp` | Standalone Weekly Wrap-up Settlement | Fixed in 5f9bba3 (`::text`) | Unchanged (Already Fixed) |
| `src/services/wrapUpEngine.ts` | 383 | `executeWeeklyWrapUpForPool` (`$queryRaw`) | Settlement Engine Execution Step 1 | Fixed in 5f9bba3 (`::text`) | Unchanged (Already Fixed) |
| `src/services/wrapUpEngine.ts` | 385 | `executeWeeklyWrapUpForPool` (`$queryRawUnsafe`) | Settlement Engine Execution Step 1 | Fixed in 5f9bba3 (`::text`) | Unchanged (Already Fixed) |
| `scripts/dev/reset-rehearsal.mjs` | 85 | Dev helper rehearsal reset | CLI / Script | Fixed in 5f9bba3 (`::text`) | Unchanged (Already Fixed) |
| `src/services/wrapUpEngine.ts` | 136 | `previewWeeklyWrapUpForPool` (`$queryRaw`) | Settlement Preview (`GET /api/pools/:pool_id/wrap-up/preview`) | **Uncast** in 3f9cd26 & 5f9bba3 | **Remediated** with `::text` |
| `src/services/wrapUpEngine.ts` | 139 | `previewWeeklyWrapUpForPool` (`$queryRawUnsafe`) | Settlement Preview (`GET /api/pools/:pool_id/wrap-up/preview`) | **Uncast** in 3f9cd26 & 5f9bba3 | **Remediated** with `::text` |

---

## 3. Minimal Source Diff
```diff
diff --git a/src/services/wrapUpEngine.ts b/src/services/wrapUpEngine.ts
index faa4b93..e7ac6ae 100644
--- a/src/services/wrapUpEngine.ts
+++ b/src/services/wrapUpEngine.ts
@@ -133,10 +133,10 @@ export async function previewWeeklyWrapUpForPool(
   let markerTableExists = false;
   try {
     if (typeof (db as any).$queryRaw === 'function') {
-      const check: any[] = (await db.$queryRaw`SELECT to_regclass('public.weekly_wrapups') as to_regclass;` as any[]) || [];
+      const check: any[] = (await db.$queryRaw`SELECT to_regclass('public.weekly_wrapups')::text as to_regclass;` as any[]) || [];
       markerTableExists = check[0]?.to_regclass !== null && check[0]?.to_regclass !== undefined;
     } else if (typeof (db as any).$queryRawUnsafe === 'function') {
-      const check: any[] = (await db.$queryRawUnsafe(`SELECT to_regclass('public.weekly_wrapups') as to_regclass;`) as any[]) || [];
+      const check: any[] = (await db.$queryRawUnsafe(`SELECT to_regclass('public.weekly_wrapups')::text as to_regclass;`) as any[]) || [];
       markerTableExists = check[0]?.to_regclass !== null && check[0]?.to_regclass !== undefined;
     }
   } catch {
```

---

## 4. Verification Evidence & Telemetry
1. **Source Integrity & Diff Check**:
   - `git diff --check`: 0 errors, 0 trailing whitespaces.
   - Retained raw log: `docs/evidence/HAG-29/01_git_diff.log`.
2. **TypeScript Typecheck**:
   - `npx tsc --noEmit`: Exit code 0 (0 compilation errors).
   - Retained raw log: `docs/evidence/HAG-29/02_typescript_typecheck.log`.
3. **Client Production Build**:
   - `npm --prefix client run build`: Exit code 0 (2,394 modules transformed, Vite build clean in 4.09s).
   - Retained raw log: `docs/evidence/HAG-29/03_client_build.log`.
4. **Focused Test Suites**:
   - Vitest executed `tests/phase42_v78_season_release.test.ts`, `tests/phase41_pick_validation.test.ts`, and `tests/phase41_week7_tiebreaker.test.ts`.
   - Results: 3/3 test files passed, 152/152 tests passed.
   - Retained raw log: `docs/evidence/HAG-29/04_focused_tests.log`.
5. **Decision #61 Service Parity**:
   - `src/services/tiebreakerRankingService.ts`: `750A519DF9E42FEBEEA802724077867F14CB2CB514F6117DDADF815C572C6E68`
   - `client/src/services/tiebreakerRankingService.ts`: `750A519DF9E42FEBEEA802724077867F14CB2CB514F6117DDADF815C572C6E68`
   - Bit-identical parity preserved (100% SHA match).
   - Retained raw log: `docs/evidence/HAG-29/05_decision61_mirror_hashes.log`.
6. **Release Artifacts**:
   - Release binary `pickem-v78-season-release.apk` (7,003,436 bytes, SHA-256 `10BD6BCAD6FC3FD29BDE819C5CA9BBA32888B2437F4D60862229F204E1056A05`) remains intact and unmodified.

---

## 5. Deployment & Release Boundaries
- **Code Status**: Code-ready locally.
- **Deployed Status**: PENDING god release deployment. Live backend currently remains `3f9cd26`. Error removal from live logs requires god deployment of the new commit and execution of the preview route on Render.
- **Strict Role Boundaries Respected**: Local edits, verification, and documentation only. Zero remote pushes, zero database DDL, zero production mutations performed by Executor.
