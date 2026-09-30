# R-12.2-U Post-Execution Evidence Report

**Execution Timestamp**: 2026-09-30T16:32:38.733Z
**Target Database**: Hosted Supabase (AWS us-east-1 / `aws-0-us-east-1.pooler.supabase.com:5432`)
**Execution Mode**: Read-Only Post-Checks (R-12.2-U §3 / R-12.2-T §3)

## Executive Summary

Following the successful human deployment of migration 7 (`20260930010000_br_2b_rls_enable_all_tables`) and migration 8 (`20260930020000_br_2c_public_tables_api_lockdown`) on hosted Supabase:
- **Pre-State Exposure Control**: Returned HTTP `200`.
- **Prisma Migrations**: Exactly 8 migrations applied, 0 pending.
- **Post-State Exposure Control**: Returned HTTP `401` (Data API lockdown active).
- **Post-Check 1 (RLS & Privilege Matrix)**: All 12 tables have `relrowsecurity = true`, `relforcerowsecurity = false`, `anon_any = false`, and `auth_any = false` across all 7 privileges. ✅
- **Post-Check 2 (Rolled-Back Transaction 42501)**: All 12 tables raise SQLSTATE `42501` (`insufficient_privilege`) when queried under `anon` and `authenticated` roles. ✅
- **Post-Check 3 (BR-1 Triggers & Functions)**: Both append-only triggers intact, function `proacl` unchanged (`{postgres=X/postgres,service_role=X/postgres}`), `_prisma_migrations` equals 8. ✅
- **Post-Check 4 (Data Parity & Row Counts)**: All 11 user tables maintain exact row counts (`penalty_ledger = 2`), and `to_regclass('public.weekly_wrapups')` is `NULL`. ✅
- **Post-Check 5 (Normalizer-v2 Diff Allowlist)**: Diff against local-at-8 matches allowlist with `ALLOWLIST OK`. ✅
- **App Smoke Test**: Full application read access (login, pool view, matrix view, cumulative ledger view) confirmed operational. ✅

---

## 1. Post-Check 1: `scripts/ops/br2_postcheck.sql` & Full Privilege Matrix

### 1.1 Migration Count
- **Applied Migrations**: `8`
- **Status**: `PASS` ✅

### 1.2 Row Level Security (RLS) Status Across All 12 Public Tables
| Table Name | `relrowsecurity` (RLS) | `relforcerowsecurity` (Forced) | Status |
|---|---|---|---|
| `_prisma_migrations` | `true` | `false` | `PASS` |
| `audit_logs` | `true` | `false` | `PASS` |
| `games` | `true` | `false` | `PASS` |
| `penalty_ledger` | `true` | `false` | `PASS` |
| `penalty_media` | `true` | `false` | `PASS` |
| `pick_results` | `true` | `false` | `PASS` |
| `picks` | `true` | `false` | `PASS` |
| `pool_member_stats` | `true` | `false` | `PASS` |
| `pool_memberships` | `true` | `false` | `PASS` |
| `pools` | `true` | `false` | `PASS` |
| `users` | `true` | `false` | `PASS` |
| `weekly_submissions` | `true` | `false` | `PASS` |

### 1.3 Full Privilege Matrix (R-12.2-S §1.4 - All 7 Privileges)
Evaluated via `has_table_privilege` for all 7 PostgreSQL table privileges (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER`):

| Table Name | RLS | Forced | Anon Any Priv? | Auth Any Priv? | Anon Select | Auth Select | Anon Update | Auth Update |
|---|---|---|---|---|---|---|---|---|
| `_prisma_migrations` | `true` | `false` | `false` | `false` | `false` | `false` | `false` | `false` |
| `audit_logs` | `true` | `false` | `false` | `false` | `false` | `false` | `false` | `false` |
| `games` | `true` | `false` | `false` | `false` | `false` | `false` | `false` | `false` |
| `penalty_ledger` | `true` | `false` | `false` | `false` | `false` | `false` | `false` | `false` |
| `penalty_media` | `true` | `false` | `false` | `false` | `false` | `false` | `false` | `false` |
| `pick_results` | `true` | `false` | `false` | `false` | `false` | `false` | `false` | `false` |
| `picks` | `true` | `false` | `false` | `false` | `false` | `false` | `false` | `false` |
| `pool_member_stats` | `true` | `false` | `false` | `false` | `false` | `false` | `false` | `false` |
| `pool_memberships` | `true` | `false` | `false` | `false` | `false` | `false` | `false` | `false` |
| `pools` | `true` | `false` | `false` | `false` | `false` | `false` | `false` | `false` |
| `users` | `true` | `false` | `false` | `false` | `false` | `false` | `false` | `false` |
| `weekly_submissions` | `true` | `false` | `false` | `false` | `false` | `false` | `false` | `false` |

### 1.4 Function Privileges
| Function Name | `anon` Execute | `authenticated` Execute | Status |
|---|---|---|---|
| `penalty_ledger_prevent_truncate` | `false` | `false` | PASS ✅ |
| `penalty_ledger_prevent_update_delete` | `false` | `false` | PASS ✅ |

---

## 2. Post-Check 2: Rolled-Back Transaction Role Rejections (SQLSTATE 42501)

Executed in read-only rolled-back transactions with `SET LOCAL ROLE anon` and `SET LOCAL ROLE authenticated` against all 12 public tables:

### 2.1 `anon` Role Execution Results
| Table Name | Expected Code | Received Code | Error Message | Result |
|---|---|---|---|---|
| `_prisma_migrations` | `42501` | `42501` | `...` | PASS ✅ |
| `audit_logs` | `42501` | `42501` | `...` | PASS ✅ |
| `games` | `42501` | `42501` | `...` | PASS ✅ |
| `penalty_ledger` | `42501` | `42501` | `...` | PASS ✅ |
| `penalty_media` | `42501` | `42501` | `...` | PASS ✅ |
| `pick_results` | `42501` | `42501` | `...` | PASS ✅ |
| `picks` | `42501` | `42501` | `...` | PASS ✅ |
| `pool_member_stats` | `42501` | `42501` | `...` | PASS ✅ |
| `pool_memberships` | `42501` | `42501` | `...` | PASS ✅ |
| `pools` | `42501` | `42501` | `...` | PASS ✅ |
| `users` | `42501` | `42501` | `...` | PASS ✅ |
| `weekly_submissions` | `42501` | `42501` | `...` | PASS ✅ |

### 2.2 `authenticated` Role Execution Results
| Table Name | Expected Code | Received Code | Error Message | Result |
|---|---|---|---|---|
| `_prisma_migrations` | `42501` | `42501` | `...` | PASS ✅ |
| `audit_logs` | `42501` | `42501` | `...` | PASS ✅ |
| `games` | `42501` | `42501` | `...` | PASS ✅ |
| `penalty_ledger` | `42501` | `42501` | `...` | PASS ✅ |
| `penalty_media` | `42501` | `42501` | `...` | PASS ✅ |
| `pick_results` | `42501` | `42501` | `...` | PASS ✅ |
| `picks` | `42501` | `42501` | `...` | PASS ✅ |
| `pool_member_stats` | `42501` | `42501` | `...` | PASS ✅ |
| `pool_memberships` | `42501` | `42501` | `...` | PASS ✅ |
| `pools` | `42501` | `42501` | `...` | PASS ✅ |
| `users` | `42501` | `42501` | `...` | PASS ✅ |
| `weekly_submissions` | `42501` | `42501` | `...` | PASS ✅ |

---

## 3. Post-Check 3: BR-1 Triggers, Function `proacl`, and Migration Ledger

### 3.1 BR-1 Append-Only Triggers
| Trigger Name | Table | Enabled (`tgenabled`) | Internal (`tgisinternal`) | Status |
|---|---|---|---|---|
| `penalty_ledger_no_truncate` | `penalty_ledger` | `O` (`O`) | `false` | Intact ✅ |
| `penalty_ledger_no_update_delete` | `penalty_ledger` | `O` (`O`) | `false` | Intact ✅ |

### 3.2 Trigger Function Definitions & `proacl` Values
| Function Name | `prosecdef` | `proacl` | Definition Summary |
|---|---|---|---|
| `penalty_ledger_prevent_truncate` | `false` | `{postgres=X/postgres,service_role=X/postgres}` | Append-only exception guard |
| `penalty_ledger_prevent_update_delete` | `false` | `{postgres=X/postgres,service_role=X/postgres}` | Append-only exception guard |

### 3.3 Applied Migrations Inventory (`_prisma_migrations` = 8)
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

## 4. Post-Check 4: Data Parity & Row Counts

### 4.1 Row Counts Across All 11 User Tables
| Table Name | Row Count | Expected | Parity Status |
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

### 4.2 `penalty_ledger` Provenance (2 Rows Intact)
| ID | Pool ID | User ID | Week | Delta | Reason | Created At |
|---|---|---|---|---|---|---|
| `22eedceb-1f72-4075-99eb-c480afa09a1d` | `9b893bef-3b5a-4ffa-951d-8ba27f9c9782` | `e06ad4cf-fb4d-48db-98d3-7c927fd1044f` | 1 | `1.00` | WEEKLY_DEAD_PLACE | `2026-09-28T05:21:17.058Z` |
| `379e751b-12af-43e1-b57b-546bdfcc3be6` | `9b893bef-3b5a-4ffa-951d-8ba27f9c9782` | `e06ad4cf-fb4d-48db-98d3-7c927fd1044f` | 1 | `1.00` | WEEKLY_DEAD_PLACE | `2026-09-30T03:10:17.920Z` |

### 4.3 `weekly_wrapups` Absence Check
- Query: `SELECT to_regclass('public.weekly_wrapups')::text;`
- Result: `NULL` (Table absent from hosted schema as expected) ✅

---

## 5. Post-Check 5: Normalizer-v2 Diff & Allow-List Check (Hosted-Post vs Local-at-8)

### 5.1 Normalized Dump Hashes
- **Hosted Post-State Hash (Normalizer v2)**: `91c42657f8094691181ba79744e3972cfd364b1f029c444c943b2bb48c131da7`
- **Local-at-8 Rehearsal Hash (Normalizer v2)**: `9f2cbb719b5b80e68be9a2a28619aa6378eb3100c9da35854b74f3d7847cdad5`
- **Diff Byte Size**: `4267` bytes

### 5.2 Allow-List Check Execution
- **Command**: `scripts/ci/diff-allowlist-check.sh`
- **Matched Allowed Lines**: `42`
- **Unmatched Lines**: `0`
- **CLI Output**: `ALLOWLIST OK (42 lines matched, 0 unmatched)` ✅

#### Diff Output (Hosted Post vs Local-at-8):
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

## 6. App Smoke Test: Application Read Access Verification

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

## Conclusion

All 5 mechanical post-checks and the end-to-end application smoke test have passed with complete adherence to Ruling R-12.2-U and R-12.2-T requirements. The hosted Supabase database is completely locked down from anonymous and authenticated direct PostgREST table access while preserving full Prisma server-side application functionality.
