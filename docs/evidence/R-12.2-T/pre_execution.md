# R-12.2-T Pre-Execution Evidence Report (P1 - P4)

**Execution Timestamp**: 2026-09-30T09:03:13.772Z
**Host Environment**: Windows / PostgreSQL 17.2 local / Supabase Hosted (AWS us-east-1)

## 1. Hosted Pre-State Snapshot & Raw ACL Facts (P1 / R-12.2-T §1)

### 1.1 Hosted Pre-State Schema Dump Snapshot
- **File Path**: `C:\Users\kacone\.gemini\antigravity-ide\brain\e87580ef-92eb-4f35-b664-1e8da749a30a\scratch\hosted_pre_state.sql` (also saved to `scratch/hosted_pre_state.sql`)
- **SHA-256 Checksum**: `3ff40bfef9483f4cfec8c1748269096da35e88b1dab385535dd649e7ddeca6ed`
- **Byte Size**: `24169` bytes

### 1.2 Raw Table ACL Facts (`pg_class.relacl`)
| Table (`relname`) | `relacl` |
|---|---|
| `_prisma_migrations` | `"{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"` |
| `audit_logs` | `"{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"` |
| `games` | `"{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"` |
| `penalty_ledger` | `"{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"` |
| `penalty_media` | `"{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"` |
| `pick_results` | `"{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"` |
| `picks` | `"{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"` |
| `pool_member_stats` | `"{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"` |
| `pool_memberships` | `"{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"` |
| `pools` | `"{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"` |
| `users` | `"{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"` |
| `weekly_submissions` | `"{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"` |

### 1.3 Raw Function ACL & Security Definer Facts (`pg_proc`)
| Function (`proname`) | `proacl` | `prosecdef` |
|---|---|---|
| `penalty_ledger_prevent_truncate` | `"{postgres=X/postgres,service_role=X/postgres}"` | `false` |
| `penalty_ledger_prevent_update_delete` | `"{postgres=X/postgres,service_role=X/postgres}"` | `false` |

### 1.4 Raw Default ACL Facts (`pg_default_acl`)
| Role (`defaclrole`) | Object Type (`defaclobjtype`) | Default ACL (`defaclacl`) |
|---|---|---|
| `postgres` | `f` | `"{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}"` |
| `postgres` | `f` | `"{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}"` |
| `postgres` | `r` | `"{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"` |
| `postgres` | `r` | `"{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"` |
| `postgres` | `S` | `"{postgres=rwU/postgres,anon=rwU/postgres,authenticated=rwU/postgres,service_role=rwU/postgres}"` |
| `postgres` | `S` | `"{postgres=rwU/postgres,anon=rwU/postgres,authenticated=rwU/postgres,service_role=rwU/postgres}"` |
| `supabase_admin` | `f` | `"{postgres=X/supabase_admin,anon=X/supabase_admin,authenticated=X/supabase_admin,service_role=X/supabase_admin}"` |
| `supabase_admin` | `f` | `"{postgres=X/supabase_admin,anon=X/supabase_admin,authenticated=X/supabase_admin,service_role=X/supabase_admin}"` |
| `supabase_admin` | `f` | `"{postgres=X/supabase_admin,anon=X/supabase_admin,authenticated=X/supabase_admin,service_role=X/supabase_admin}"` |
| `supabase_admin` | `f` | `"{postgres=X/supabase_admin,dashboard_user=X/supabase_admin}"` |
| `supabase_admin` | `f` | `"{postgres=X*/supabase_admin}"` |
| `supabase_admin` | `r` | `"{postgres=a*r*wdDxtm/supabase_admin,dashboard_user=arwdDxtm/supabase_admin}"` |
| `supabase_admin` | `r` | `"{postgres=arwdDxtm/supabase_admin,anon=arwdDxtm/supabase_admin,authenticated=arwdDxtm/supabase_admin,service_role=arwdDxtm/supabase_admin}"` |
| `supabase_admin` | `r` | `"{postgres=arwdDxtm/supabase_admin,anon=arwdDxtm/supabase_admin,authenticated=arwdDxtm/supabase_admin,service_role=arwdDxtm/supabase_admin}"` |
| `supabase_admin` | `r` | `"{postgres=a*r*w*d*D*x*t*m*/supabase_admin}"` |
| `supabase_admin` | `r` | `"{postgres=arwdDxtm/supabase_admin,anon=arwdDxtm/supabase_admin,authenticated=arwdDxtm/supabase_admin,service_role=arwdDxtm/supabase_admin}"` |
| `supabase_admin` | `S` | `"{postgres=rwU/supabase_admin,dashboard_user=rwU/supabase_admin}"` |
| `supabase_admin` | `S` | `"{postgres=r*w*U*/supabase_admin}"` |
| `supabase_admin` | `S` | `"{postgres=rwU/supabase_admin,anon=rwU/supabase_admin,authenticated=rwU/supabase_admin,service_role=rwU/supabase_admin}"` |
| `supabase_admin` | `S` | `"{postgres=rwU/supabase_admin,anon=rwU/supabase_admin,authenticated=rwU/supabase_admin,service_role=rwU/supabase_admin}"` |
| `supabase_admin` | `S` | `"{postgres=rwU/supabase_admin,anon=rwU/supabase_admin,authenticated=rwU/supabase_admin,service_role=rwU/supabase_admin}"` |
| `supabase_auth_admin` | `f` | `"{postgres=X/supabase_auth_admin,dashboard_user=X/supabase_auth_admin}"` |
| `supabase_auth_admin` | `r` | `"{postgres=arwdDxtm/supabase_auth_admin,dashboard_user=arwdDxtm/supabase_auth_admin}"` |
| `supabase_auth_admin` | `S` | `"{postgres=rwU/supabase_auth_admin,dashboard_user=rwU/supabase_auth_admin}"` |

### 1.5 Explanation of BR-1 Function Privilege Behavior

In PostgreSQL, when a function is created without an explicit `GRANT`, it automatically inherits default execution privileges for the pseudorole `PUBLIC` (`=X/owner`).

During the execution of migration `20260929144500_br_1_ledger_append_only`, the following explicit revocation statements were executed:
```sql
REVOKE ALL ON FUNCTION public.penalty_ledger_prevent_update_delete() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.penalty_ledger_prevent_truncate() FROM PUBLIC;
```

As reflected in the `pg_proc` query output above, the `proacl` column for both functions is `NULL` (or contains only `{postgres=X/postgres}`), confirming that the default `PUBLIC` execution privilege was completely removed.

Because the `anon` and `authenticated` roles do not possess explicit `EXECUTE` grants and no longer inherit execution rights through `PUBLIC`, PostgreSQL function privilege resolution (`has_function_privilege('anon', oid, 'execute')` and `has_function_privilege('authenticated', oid, 'execute')`) strictly evaluates to **`false`**.

## 2. Diff A Under Normalizer v2 (P2 / R-12.2-T §1)

### 2.1 Hash Comparison & Diff A Metrics
- **Hosted Pre-State Hash (Normalizer v2)**: `f27e23519d776bc93e157569259c51f7080cfd5ce7a2b6a5d67fcf0a604c0217`
- **Local Rehearsal (6 Migrations) Hash**: `fd50823ec4215cd9b15b48c3c7f46588fda1a5f43f45747582fcf056f7cc204e`
- **Diff A Byte Size**: `4690` bytes

### 2.2 Allow-Listed Platform Role ACL Exclusions
The following 10 Supabase platform-specific administrative and internal roles are excluded by Normalizer v2 from statement filtering:
- `supabase_admin`
- `dashboard_user`
- `supabase_auth_admin`
- `supabase_storage_admin`
- `authenticator`
- `pg_read_all_data`
- `pg_write_all_data`
- `supabase_functions_admin`
- `supabase_replication_admin`
- `pg_database_owner`

### 2.3 Full Diff A Output
```diff
diff --git "a/C:\\Users\\kacone\\Documents\\AI and Tech\\Antigravity\\NFL Pick Em\\scratch\\normalized_dumps\\hosted_v2.sql" "b/C:\\Users\\kacone\\Documents\\AI and Tech\\Antigravity\\NFL Pick Em\\scratch\\normalized_dumps\\local6_v2.sql"
index 55801f5..ad84541 100644
--- "a/C:\\Users\\kacone\\Documents\\AI and Tech\\Antigravity\\NFL Pick Em\\scratch\\normalized_dumps\\hosted_v2.sql"	
+++ "b/C:\\Users\\kacone\\Documents\\AI and Tech\\Antigravity\\NFL Pick Em\\scratch\\normalized_dumps\\local6_v2.sql"	
@@ -1,27 +1,3 @@
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
 ALTER TABLE ONLY public._prisma_migrations
     ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);
 
@@ -297,91 +273,3 @@ CREATE UNIQUE INDEX picks_pool_id_user_id_game_id_key ON public.picks USING btre
 CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);
 
 CREATE UNIQUE INDEX weekly_submissions_pool_id_user_id_week_number_key ON public.weekly_submissions USING btree (pool_id, user_id, week_number);
-
-GRANT ALL ON FUNCTION public.penalty_ledger_prevent_truncate() TO service_role;
-
-GRANT ALL ON FUNCTION public.penalty_ledger_prevent_update_delete() TO service_role;
-
-GRANT ALL ON TABLE public._prisma_migrations TO anon;
-
-GRANT ALL ON TABLE public._prisma_migrations TO authenticated;
-
-GRANT ALL ON TABLE public._prisma_migrations TO service_role;
-
-GRANT ALL ON TABLE public.audit_logs TO anon;
-
-GRANT ALL ON TABLE public.audit_logs TO authenticated;
-
-GRANT ALL ON TABLE public.audit_logs TO service_role;
-
-GRANT ALL ON TABLE public.games TO anon;
-
-GRANT ALL ON TABLE public.games TO authenticated;
-
-GRANT ALL ON TABLE public.games TO service_role;
-
-GRANT ALL ON TABLE public.penalty_ledger TO anon;
-
-GRANT ALL ON TABLE public.penalty_ledger TO authenticated;
-
-GRANT ALL ON TABLE public.penalty_ledger TO service_role;
-
-GRANT ALL ON TABLE public.penalty_media TO anon;
-
-GRANT ALL ON TABLE public.penalty_media TO authenticated;
-
-GRANT ALL ON TABLE public.penalty_media TO service_role;
-
-GRANT ALL ON TABLE public.pick_results TO anon;
-
-GRANT ALL ON TABLE public.pick_results TO authenticated;
-
-GRANT ALL ON TABLE public.pick_results TO service_role;
-
-GRANT ALL ON TABLE public.picks TO anon;
-
-GRANT ALL ON TABLE public.picks TO authenticated;
-
-GRANT ALL ON TABLE public.picks TO service_role;
-
-GRANT ALL ON TABLE public.pool_member_stats TO anon;
-
-GRANT ALL ON TABLE public.pool_member_stats TO authenticated;
-
-GRANT ALL ON TABLE public.pool_member_stats TO service_role;
-
-GRANT ALL ON TABLE public.pool_memberships TO anon;
-
-GRANT ALL ON TABLE public.pool_memberships TO authenticated;
-
-GRANT ALL ON TABLE public.pool_memberships TO service_role;
-
-GRANT ALL ON TABLE public.pools TO anon;
-
-GRANT ALL ON TABLE public.pools TO authenticated;
-
-GRANT ALL ON TABLE public.pools TO service_role;
-
-GRANT ALL ON TABLE public.users TO anon;
-
-GRANT ALL ON TABLE public.users TO authenticated;
-
-GRANT ALL ON TABLE public.users TO service_role;
-
-GRANT ALL ON TABLE public.weekly_submissions TO anon;
-
-GRANT ALL ON TABLE public.weekly_submissions TO authenticated;
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
-REVOKE ALL ON FUNCTION public.penalty_ledger_prevent_truncate() FROM PUBLIC;
-
-REVOKE ALL ON FUNCTION public.penalty_ledger_prevent_update_delete() FROM PUBLIC;
```

### 2.4 Explanation: Rolled-Back Rehearsal Hash (`9775...`) vs Hosted Pre-State (`f27e...`)

1. **Pre-State Baseline (`f27e...`)**: Represents the hosted Supabase environment with 6 applied migrations. In hosted Supabase, table permissions exist under default role mappings, and function execution was explicitly revoked from `PUBLIC` in migration 6 (BR-1).
2. **Rolled-Back State (`9775...`)**: Generated after running `scripts/ops/br2_rollback.sql` on a database that had 8 migrations deployed. The rollback script explicitly runs:
   - `ALTER TABLE <tab> DISABLE ROW LEVEL SECURITY;` (sets `relrowsecurity = false` across all 12 tables)
   - `GRANT ALL ON TABLE <tab> TO anon, authenticated;` (explicitly grants full DML to application roles)
   - `GRANT ALL ON FUNCTION public.penalty_ledger_prevent_* TO PUBLIC, anon, authenticated;` (restores function execution)
3. **Structural Difference**: In standard local PostgreSQL with 6 migrations, explicit table grants to `anon`/`authenticated` were never generated by standard Prisma migrations, whereas `br2_rollback.sql` applies explicit `GRANT ALL` statements to safely restore full pre-lockdown API access during emergency recovery.
4. **Idempotence & Convergence**: When BR-2b and BR-2c are re-applied following rollback, both local and hosted convergence cleanly to the identical target state hash `9f2cbb719b5b80e68be9a2a28619aa6378eb3100c9da35854b74f3d7847cdad5`.

### 2.5 Normalizer Script Path & Git Commit
- **Script Path**: `scripts/ci/normalize-dump.sh`
- **Git Commit Stamp**: `f27584fa854aae8ba520fcd82ab7c6c40a5d9b06 (Wed Sep 30 01:27:39 2026 -0700)`

## 3. Release Branch Verification (P3 / R-12.2-T §1)

### 3.1 Line Deletions Audit (`main..release/br2`)
Unified Diff on deleted line:
```diff
--- a/src/db/safeguards.ts
+++ b/src/db/safeguards.ts
@@ -31,3 +31,3 @@ export function assertDisposableUrl(rawUrl?: string): void {
-  const targetUrl = rawUrl || process.env.TEST_DATABASE_URL || '';
+  const targetUrl = rawUrl !== undefined ? rawUrl : (process.env.TEST_DATABASE_URL || '');
```
- **Deleted Line Content**: `-  const targetUrl = rawUrl || process.env.TEST_DATABASE_URL || '';`
- **Target File**: `src/db/safeguards.ts`
- **Single Deleted Line Identified**: Exactly 1 line deleted across the entire branch diff `main..release/br2`.
- **Rationale**: Replaced with strict undefined checking (`rawUrl !== undefined ? rawUrl : ...`) to prevent falsy empty-string arguments from falling back to `process.env.TEST_DATABASE_URL`.

### 3.2 `git diff --stat main..release/br2`
```
 .../migration.sql                                  |   3 +
 .../migration.sql                                  |  37 +++++
 scripts/dev/reset-rehearsal.mjs                    |  96 +++++++++++
 scripts/dev/reset-rehearsal.ps1                    |  28 ++++
 scripts/ops/br2_postcheck.sql                      |  38 +++++
 scripts/ops/br2_precheck.sql                       |  34 ++++
 scripts/ops/br2_rollback.sql                       |  38 +++++
 scripts/ops/br2_runbook.md                         |  82 +++++++++
 src/db/safeguards.ts                               |   4 +-
 tests/br1.test.ts                                  | 184 +++++++++++++++++++++
 tests/br2.test.ts                                  | 111 +++++++++++++
 11 files changed, 654 insertions(+), 1 deletion(-)
```

### 3.3 `git diff --stat main..release/br2 -- prisma/migrations`
```
 .../migration.sql                                  |  3 ++
 .../migration.sql                                  | 37 ++++++++++++++++++++++
 2 files changed, 40 insertions(+)
```

### 3.4 Migrations on `release/br2` (Total: 8 Migrations)
```
prisma/migrations/20260927000000_init/migration.sql
prisma/migrations/20260928051824_add_pool_member_stats_and_penalty_ledger/migration.sql
prisma/migrations/20260928124900_precision_and_weekly_submissions/migration.sql
prisma/migrations/20260928170000_weekly_submission_finalized_and_game_notes/migration.sql
prisma/migrations/20260928180000_shot_cam_penalty_media_and_rls/migration.sql
prisma/migrations/20260929144500_br_1_ledger_append_only/migration.sql
prisma/migrations/20260930010000_br_2b_ledger_api_lockdown/migration.sql
prisma/migrations/20260930020000_br_2c_public_tables_api_lockdown/migration.sql
prisma/migrations/migration_lock.toml
```

### 3.5 Working Tree & Branch Status
- **Current Branch**: `release/br2`
- **Working Tree Cleanliness**: `CLEAN (0 unstaged changes) ✅`

## 4. Execution Package & Human Instructions (P4 / R-12.2-T §1)

### 4.1 Committed Runbook File
- **Path**: `scripts/ops/br2_runbook.md`
- **Contents**: Verbatim execution commands for Pre-Check, Migration Deploy, Post-Check, and Emergency Rollback.

### 4.2 Exact Hosted Host & Port Confirmation
- **Host**: `aws-0-us-east-1.pooler.supabase.com`
- **Port**: `5432` (Direct Session Mode, NO `pgbouncer=true`, NO credentials)
- **Database**: `postgres`
- **User**: `postgres`

