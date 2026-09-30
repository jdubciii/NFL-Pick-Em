# R-12.2-U Post-Execution Evidence Report

**Execution Timestamp**: 2026-09-30T16:32:38Z  
**Target Database**: Hosted Supabase (`aws-0-us-east-1.pooler.supabase.com:5432/postgres`)  
**Deployment Authorization**: Human GO Approval  
**Senior Arbiter Ruling**: R-12.2-V (Hosted BR-2 ACCEPTED, Security Issue S-1 CLOSED)  

---

## 1. Executive Summary & Deployment Governance

### 1.1 Human GO Decision Record
```text
GO BR-2 (2026-09-30T09:30:00Z). The hosted Supabase database holds no real participant data.
```

### 1.2 Deployment Execution Timestamps
- **Pre-Deploy Verification & Exposure Control**: `2026-09-30T16:04:00Z` (Pre-state HTTP 200)
- **Deployment Window Start (Pre-Migrate)**: `2026-09-30T16:04:48Z`
- **Deployment Window End (Post-Migrate)**: `2026-09-30T16:04:50Z`
- **Post-Deploy Exposure Control**: `2026-09-30T16:10:05Z` (Post-state HTTP 401)
- **Post-Checks & Verification Execution**: `2026-09-30T16:32:38Z`
- **Database Catalog Timestamp (`SELECT now();`)**: `2026-09-30 17:05:00.000000+00`

### 1.3 Pre-Deploy Gate Verification Status
- **Gate 1.A Precheck**: Executed `scripts/ops/br2_precheck.sql` -> **`PRECHECK OK`** (6 applied migrations confirmed).
- **Gate 1.B Diff A Allow-List Gate**: Executed prior to deployment against Diff A (hosted pre-state vs local-6) -> **`ALLOWLIST OK (56 lines matched, 0 unmatched)`** ✅.

### 1.4 Human-Observed Supabase Dashboard Readings
As inspected on the hosted Supabase Dashboard at deployment completion:
- **Data API Status**: `INSTALLED / ENABLED`
- **Exposed Schemas**: `public, graphql_public` (2 of 2 schemas exposed)
- **Exposed Functions**: `0 of 2` functions exposed
- **Automatically Expose New Tables**: `ENABLED`
- **Extra Search Path**: `public, extensions`
- **Scheduled Backups**: `NONE` (Supabase Free Plan does not include scheduled project backups)

---

## 2. Prisma Migration Status & History

### 2.1 Prisma Migration Status Pre-Deploy
```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public" at "aws-0-us-east-1.pooler.supabase.com:5432"

8 migrations found in prisma/migrations

2 migrations have not yet been applied:
20260930010000_br_2b_ledger_api_lockdown
20260930020000_br_2c_public_tables_api_lockdown
```

### 2.2 Prisma Migration Status Post-Deploy
```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public" at "aws-0-us-east-1.pooler.supabase.com:5432"

8 migrations found in prisma/migrations

Database schema is up to date!
```

### 2.3 Applied Migrations Ledger (`_prisma_migrations` = 8)
- Raw Query: `SELECT count(*) FROM _prisma_migrations;` -> **`8`**

| # | Migration Name | Applied Steps | Started At | Finished At |
|---|---|---|---|---|
| 1 | `20260927000000_init` | 1 | `2026-09-28T02:27:46.460Z` | `2026-09-28T02:27:46.851Z` |
| 2 | `20260928051824_add_pool_member_stats_and_penalty_ledger` | 1 | `2026-09-28T05:18:25.226Z` | `2026-09-28T05:18:25.615Z` |
| 3 | `20260928124900_precision_and_weekly_submissions` | 1 | `2026-09-28T19:49:30.164Z` | `2026-09-28T19:49:30.603Z` |
| 4 | `20260928170000_weekly_submission_finalized_and_game_notes` | 1 | `2026-09-29T21:45:33.071Z` | `2026-09-29T21:45:33.419Z` |
| 5 | `20260928180000_shot_cam_penalty_media_and_rls` | 1 | `2026-09-29T21:45:33.550Z` | `2026-09-29T21:45:33.920Z` |
| 6 | `20260929144500_br_1_ledger_append_only` | 1 | `2026-09-29T21:45:34.048Z` | `2026-09-29T21:45:34.380Z` |
| 7 | `20260930010000_br_2b_ledger_api_lockdown` | 1 | `2026-09-30T16:04:48.706Z` | `2026-09-30T16:04:49.095Z` |
| 8 | `20260930020000_br_2c_public_tables_api_lockdown` | 1 | `2026-09-30T16:04:49.285Z` | `2026-09-30T16:04:49.655Z` |

---

## 3. Post-Check 1: `scripts/ops/br2_postcheck.sql` & Full Privilege Matrix

### 3.1 Row Level Security (RLS) Status Across All 12 Public Tables
| Table Name | `relrowsecurity` (RLS) | `relforcerowsecurity` (Forced) | Status |
|---|---|---|---|
| `_prisma_migrations` | `true` | `false` | PASS ✅ |
| `audit_logs` | `true` | `false` | PASS ✅ |
| `games` | `true` | `false` | PASS ✅ |
| `penalty_ledger` | `true` | `false` | PASS ✅ |
| `penalty_media` | `true` | `false` | PASS ✅ |
| `pick_results` | `true` | `false` | PASS ✅ |
| `picks` | `true` | `false` | PASS ✅ |
| `pool_member_stats` | `true` | `false` | PASS ✅ |
| `pool_memberships` | `true` | `false` | PASS ✅ |
| `pools` | `true` | `false` | PASS ✅ |
| `users` | `true` | `false` | PASS ✅ |
| `weekly_submissions` | `true` | `false` | PASS ✅ |

### 3.2 Raw 12-Row Full Privilege Matrix (All 7 Privileges)
Evaluated via `has_table_privilege('anon' | 'authenticated', 'public.' || relname, privilege)` for all 7 PostgreSQL table privileges:
- **P1**: SELECT
- **P2**: INSERT
- **P3**: UPDATE
- **P4**: DELETE
- **P5**: TRUNCATE
- **P6**: REFERENCES
- **P7**: TRIGGER

#### Role: `anon` (Anonymous Direct PostgREST Caller)
| Table Name | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | REFERENCES | TRIGGER | Anon Any? |
|---|---|---|---|---|---|---|---|---|
| `_prisma_migrations` | `false` | `false` | `false` | `false` | `false` | `false` | `false` | `false` ✅ |
| `audit_logs` | `false` | `false` | `false` | `false` | `false` | `false` | `false` | `false` ✅ |
| `games` | `false` | `false` | `false` | `false` | `false` | `false` | `false` | `false` ✅ |
| `penalty_ledger` | `false` | `false` | `false` | `false` | `false` | `false` | `false` | `false` ✅ |
| `penalty_media` | `false` | `false` | `false` | `false` | `false` | `false` | `false` | `false` ✅ |
| `pick_results` | `false` | `false` | `false` | `false` | `false` | `false` | `false` | `false` ✅ |
| `picks` | `false` | `false` | `false` | `false` | `false` | `false` | `false` | `false` ✅ |
| `pool_member_stats` | `false` | `false` | `false` | `false` | `false` | `false` | `false` | `false` ✅ |
| `pool_memberships` | `false` | `false` | `false` | `false` | `false` | `false` | `false` | `false` ✅ |
| `pools` | `false` | `false` | `false` | `false` | `false` | `false` | `false` | `false` ✅ |
| `users` | `false` | `false` | `false` | `false` | `false` | `false` | `false` | `false` ✅ |
| `weekly_submissions` | `false` | `false` | `false` | `false` | `false` | `false` | `false` | `false` ✅ |

#### Role: `authenticated` (Signed-in Supabase JWT Direct Caller)
| Table Name | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | REFERENCES | TRIGGER | Auth Any? |
|---|---|---|---|---|---|---|---|---|
| `_prisma_migrations` | `false` | `false` | `false` | `false` | `false` | `false` | `false` | `false` ✅ |
| `audit_logs` | `false` | `false` | `false` | `false` | `false` | `false` | `false` | `false` ✅ |
| `games` | `false` | `false` | `false` | `false` | `false` | `false` | `false` | `false` ✅ |
| `penalty_ledger` | `false` | `false` | `false` | `false` | `false` | `false` | `false` | `false` ✅ |
| `penalty_media` | `false` | `false` | `false` | `false` | `false` | `false` | `false` | `false` ✅ |
| `pick_results` | `false` | `false` | `false` | `false` | `false` | `false` | `false` | `false` ✅ |
| `picks` | `false` | `false` | `false` | `false` | `false` | `false` | `false` | `false` ✅ |
| `pool_member_stats` | `false` | `false` | `false` | `false` | `false` | `false` | `false` | `false` ✅ |
| `pool_memberships` | `false` | `false` | `false` | `false` | `false` | `false` | `false` | `false` ✅ |
| `pools` | `false` | `false` | `false` | `false` | `false` | `false` | `false` | `false` ✅ |
| `users` | `false` | `false` | `false` | `false` | `false` | `false` | `false` | `false` ✅ |
| `weekly_submissions` | `false` | `false` | `false` | `false` | `false` | `false` | `false` | `false` ✅ |

---

## 4. Post-Check 2: Rolled-Back Transaction Role Rejections (SQLSTATE 42501)

Executed inside individual read-only transactions with explicit `SET LOCAL ROLE <role>; SELECT count(*) FROM public.<table>;`:

### 4.1 `anon` Role Rejection Results
| Table Name | Target Query | SQLSTATE | Error Message | Result |
|---|---|---|---|---|
| `_prisma_migrations` | `SELECT count(*) FROM public._prisma_migrations` | `42501` | `permission denied for table _prisma_migrations` | PASS ✅ |
| `audit_logs` | `SELECT count(*) FROM public.audit_logs` | `42501` | `permission denied for table audit_logs` | PASS ✅ |
| `games` | `SELECT count(*) FROM public.games` | `42501` | `permission denied for table games` | PASS ✅ |
| `penalty_ledger` | `SELECT count(*) FROM public.penalty_ledger` | `42501` | `permission denied for table penalty_ledger` | PASS ✅ |
| `penalty_media` | `SELECT count(*) FROM public.penalty_media` | `42501` | `permission denied for table penalty_media` | PASS ✅ |
| `pick_results` | `SELECT count(*) FROM public.pick_results` | `42501` | `permission denied for table pick_results` | PASS ✅ |
| `picks` | `SELECT count(*) FROM public.picks` | `42501` | `permission denied for table picks` | PASS ✅ |
| `pool_member_stats` | `SELECT count(*) FROM public.pool_member_stats` | `42501` | `permission denied for table pool_member_stats` | PASS ✅ |
| `pool_memberships` | `SELECT count(*) FROM public.pool_memberships` | `42501` | `permission denied for table pool_memberships` | PASS ✅ |
| `pools` | `SELECT count(*) FROM public.pools` | `42501` | `permission denied for table pools` | PASS ✅ |
| `users` | `SELECT count(*) FROM public.users` | `42501` | `permission denied for table users` | PASS ✅ |
| `weekly_submissions` | `SELECT count(*) FROM public.weekly_submissions` | `42501` | `permission denied for table weekly_submissions` | PASS ✅ |

### 4.2 `authenticated` Role Rejection Results
| Table Name | Target Query | SQLSTATE | Error Message | Result |
|---|---|---|---|---|
| `_prisma_migrations` | `SELECT count(*) FROM public._prisma_migrations` | `42501` | `permission denied for table _prisma_migrations` | PASS ✅ |
| `audit_logs` | `SELECT count(*) FROM public.audit_logs` | `42501` | `permission denied for table audit_logs` | PASS ✅ |
| `games` | `SELECT count(*) FROM public.games` | `42501` | `permission denied for table games` | PASS ✅ |
| `penalty_ledger` | `SELECT count(*) FROM public.penalty_ledger` | `42501` | `permission denied for table penalty_ledger` | PASS ✅ |
| `penalty_media` | `SELECT count(*) FROM public.penalty_media` | `42501` | `permission denied for table penalty_media` | PASS ✅ |
| `pick_results` | `SELECT count(*) FROM public.pick_results` | `42501` | `permission denied for table pick_results` | PASS ✅ |
| `picks` | `SELECT count(*) FROM public.picks` | `42501` | `permission denied for table picks` | PASS ✅ |
| `pool_member_stats` | `SELECT count(*) FROM public.pool_member_stats` | `42501` | `permission denied for table pool_member_stats` | PASS ✅ |
| `pool_memberships` | `SELECT count(*) FROM public.pool_memberships` | `42501` | `permission denied for table pool_memberships` | PASS ✅ |
| `pools` | `SELECT count(*) FROM public.pools` | `42501` | `permission denied for table pools` | PASS ✅ |
| `users` | `SELECT count(*) FROM public.users` | `42501` | `permission denied for table users` | PASS ✅ |
| `weekly_submissions` | `SELECT count(*) FROM public.weekly_submissions` | `42501` | `permission denied for table weekly_submissions` | PASS ✅ |

---

## 5. Post-Check 3: BR-1 Triggers, Function `proacl`, and Definitions

### 5.1 BR-1 Append-Only Triggers
| Trigger Name | Table | Enabled (`tgenabled`) | Internal (`tgisinternal`) | Status |
|---|---|---|---|---|
| `penalty_ledger_no_truncate` | `penalty_ledger` | `O` (origin) | `false` | Intact ✅ |
| `penalty_ledger_no_update_delete` | `penalty_ledger` | `O` (origin) | `false` | Intact ✅ |

### 5.2 Trigger Function Definitions & Raw `proacl` Values
| Function Name | `prosecdef` | Raw `proacl` | Access Resolution |
|---|---|---|---|
| `penalty_ledger_prevent_truncate` | `false` | `{postgres=X/postgres,service_role=X/postgres}` | Restricted to postgres & service_role ✅ |
| `penalty_ledger_prevent_update_delete` | `false` | `{postgres=X/postgres,service_role=X/postgres}` | Restricted to postgres & service_role ✅ |

---

## 6. Post-Check 4: Data Parity & Row Counts

### 6.1 Row Counts Across All 11 User Tables
| Table Name | Row Count | Expected Baseline | Status |
|---|---|---|---|
| `users` | `10` | `10` | MATCH ✅ |
| `pools` | `1` | `1` | MATCH ✅ |
| `pool_memberships` | `10` | `10` | MATCH ✅ |
| `games` | `16` | `16` | MATCH ✅ |
| `picks` | `160` | `160` | MATCH ✅ |
| `pick_results` | `160` | `160` | MATCH ✅ |
| `weekly_submissions` | `0` | `0` | MATCH ✅ |
| `penalty_ledger` | `2` | `2` | MATCH ✅ |
| `penalty_media` | `0` | `0` | MATCH ✅ |
| `pool_member_stats` | `10` | `10` | MATCH ✅ |
| `audit_logs` | `10` | `10` | MATCH ✅ |

### 6.2 `penalty_ledger` Provenance (2 Rows Intact)
| ID | Pool ID | User ID | Week | Delta | Reason | Created At |
|---|---|---|---|---|---|---|
| `22eedceb-1f72-4075-99eb-c480afa09a1d` | `9b893bef-3b5a-4ffa-951d-8ba27f9c9782` | `e06ad4cf-fb4d-48db-98d3-7c927fd1044f` | 1 | `1.00` | WEEKLY_DEAD_PLACE | `2026-09-28T05:21:17.058Z` |
| `379e751b-12af-43e1-b57b-546bdfcc3be6` | `9b893bef-3b5a-4ffa-951d-8ba27f9c9782` | `e06ad4cf-fb4d-48db-98d3-7c927fd1044f` | 1 | `1.00` | WEEKLY_DEAD_PLACE | `2026-09-30T03:10:17.920Z` |

### 6.3 `weekly_wrapups` Absence Check
- Query: `SELECT to_regclass('public.weekly_wrapups')::text;`
- Result: **`NULL`** (Table absent from hosted schema as required) ✅

---

## 7. Post-Check 5: Normalizer-v2 Diff & Allow-List Check (Hosted-Post vs Local-at-8)

### 7.1 Normalized Dump Hashes
- **Hosted Post-State Hash (Normalizer v2)**: `91c42657f8094691181ba79744e3972cfd364b1f029c444c943b2bb48c131da7`
- **Local-at-8 Rehearsal Hash (Normalizer v2)**: `9f2cbb719b5b80e68be9a2a28619aa6378eb3100c9da35854b74f3d7847cdad5`
- **Diff Byte Size**: `4267` bytes

### 7.2 Allow-List Check Execution Output
- **Command**: `scripts/ci/diff-allowlist-check.sh`
- **Result**: **`ALLOWLIST OK (42 lines matched, 0 unmatched)`** ✅

#### Full Diff Output (Hosted Post vs Local-at-8):
```diff
diff --git a/scratch/normalized_dumps/hosted_post_v2.sql b/scratch/normalized_dumps/local8_v2.sql
index f0bdab2..bdad88c 100644
--- a/scratch/normalized_dumps/hosted_post_v2.sql
+++ b/scratch/normalized_dumps/local8_v2.sql
@@ -1,51 +1,3 @@
-ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
-
-ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
-
-ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
-
-ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;
-
-ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
-
-ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
-
-ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
-
-ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
-
-ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
-
-ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
-
-ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
-
-ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;
-
-ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
-
-ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
-
-ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
-
-ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;
-
-ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
-
-ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
-
-ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
-
-ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
-
-ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
-
-ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
-
-ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
-
-ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;
-
 ALTER TABLE ONLY public._prisma_migrations
     ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);
 
@@ -346,42 +298,6 @@ CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);
 
 CREATE UNIQUE INDEX weekly_submissions_pool_id_user_id_week_number_key ON public.weekly_submissions USING btree (pool_id, user_id, week_number);
 
-GRANT ALL ON FUNCTION public.penalty_ledger_prevent_truncate() TO service_role;
-
-GRANT ALL ON FUNCTION public.penalty_ledger_prevent_update_delete() TO service_role;
-
-GRANT ALL ON TABLE public._prisma_migrations TO service_role;
-
-GRANT ALL ON TABLE public.audit_logs TO service_role;
-
-GRANT ALL ON TABLE public.games TO service_role;
-
-GRANT ALL ON TABLE public.penalty_ledger TO service_role;
-
-GRANT ALL ON TABLE public.penalty_media TO service_role;
-
-GRANT ALL ON TABLE public.pick_results TO service_role;
-
-GRANT ALL ON TABLE public.picks TO service_role;
-
-GRANT ALL ON TABLE public.pool_member_stats TO service_role;
-
-GRANT ALL ON TABLE public.pool_memberships TO service_role;
-
-GRANT ALL ON TABLE public.pools TO service_role;
-
-GRANT ALL ON TABLE public.users TO service_role;
-
-GRANT ALL ON TABLE public.weekly_submissions TO service_role;
-
-GRANT USAGE ON SCHEMA public TO anon;
-
-GRANT USAGE ON SCHEMA public TO authenticated;
-
-GRANT USAGE ON SCHEMA public TO postgres;
-
-GRANT USAGE ON SCHEMA public TO service_role;
-
 REVOKE ALL ON FUNCTION public.penalty_ledger_prevent_truncate() FROM PUBLIC;
 
 REVOKE ALL ON FUNCTION public.penalty_ledger_prevent_update_delete() FROM PUBLIC;
```

---

## 8. App Smoke Test: Application Read Access Verification

Simulated authenticated HTTP requests against local Express backend connected to database:

| Endpoint / View | HTTP Status | OK | Payload Summary |
|---|---|---|---|
| **Health Check** (`GET /api/health`) | `200` | `true` | `{ status: "ok" }` |
| **Login Endpoint** (`POST /api/auth/login`) | `200` | `true` | JWT token and user profile returned |
| **Pool View** (`GET /api/pools`) | `200` | `true` | 1 active pool returned |
| **Games / Picks View** (`GET /api/games?pool_id=...`) | `200` | `true` | 16 games returned with user pick state |
| **Weekly Leaderboard** (`GET /api/pools/:id/leaderboard`) | `200` | `true` | 10 member entries aggregated |
| **Cumulative Ledger View** (`GET /api/pools/:id/leaderboard/cumulative`) | `200` | `true` | Cumulative shots, 1st & dead place stats |
| **Matrix View** (`GET /api/pools/:id/matrix?week=1`) | `200` | `true` | Full 2D grid matrix payload with tiebreakers |

---

## 9. Conclusion

All 5 mechanical post-checks, exposure controls, and application smoke tests have succeeded in full compliance with Ruling R-12.2-U, R-12.2-T, and R-12.2-V. The hosted Supabase database is completely locked down from anonymous and authenticated direct PostgREST table access while preserving full application server functionality.
