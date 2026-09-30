# Supervised Human Runbook: Deploy BR-2 to Hosted Database (R-12.2-T §2)

**Target Environment**: Supabase PostgreSQL (AWS us-east-1)  
**Host**: `aws-0-us-east-1.pooler.supabase.com`  
**Port**: `5432` (Direct Session Mode, NO `pgbouncer=true`)  
**Database**: `postgres`  
**User**: `postgres`  
**Target Migrations**:  
1. `20260930010000_br_2b_ledger_api_lockdown`
2. `20260930020000_br_2c_public_tables_api_lockdown`

---

## 1. Pre-Deployment Verification (Read-Only)

Run the pre-check script against the hosted database:
```bash
psql "$HOSTED_DATABASE_URL" -f scripts/ops/br2_precheck.sql
```

Expected Output:
- `applied_migrations`: `6`
- `migration_status`: `PASS`
- `current_user`: `postgres`
- `rolbypassrls`: `true`
- All 12 public tables have `relrowsecurity = false` and `relforcerowsecurity = false`.

Verify pending migrations:
```bash
DATABASE_URL="$HOSTED_DATABASE_URL" npx prisma migrate status
```
Expected Output:
- 6 applied migrations.
- 2 unapplied migrations:
  - `20260930010000_br_2b_ledger_api_lockdown`
  - `20260930020000_br_2c_public_tables_api_lockdown`

---

## 2. Migration Deployment

Execute the Prisma migration deploy command:
```bash
DATABASE_URL="$HOSTED_DATABASE_URL" npx prisma migrate deploy
```

Expected Output:
- Applying migration `20260930010000_br_2b_ledger_api_lockdown`
- Applying migration `20260930020000_br_2c_public_tables_api_lockdown`
- `All migrations have been successfully applied.`

---

## 3. Post-Deployment Verification (Read-Only)

Run the post-check script against the hosted database:
```bash
psql "$HOSTED_DATABASE_URL" -f scripts/ops/br2_postcheck.sql
```

Expected Output:
- `applied_migrations`: `8`
- `migration_status`: `PASS`
- All 12 public tables (`users`, `pools`, `pool_memberships`, `games`, `picks`, `pick_results`, `audit_logs`, `pool_member_stats`, `penalty_ledger`, `weekly_submissions`, `penalty_media`, `_prisma_migrations`):
  - `relrowsecurity`: `true`
  - `relforcerowsecurity`: `false`
  - `rls_status`: `PASS`
- `anon_select`, `auth_select`, `anon_update`: `false` across all 12 tables.
- `anon_exec`, `auth_exec`: `false` on trigger functions `penalty_ledger_prevent_update_delete` and `penalty_ledger_prevent_truncate`.

---

## 4. Emergency Rollback (Only if Post-Check Fails)

In the event of an unexpected validation failure, execute the emergency rollback script:
```bash
psql "$HOSTED_DATABASE_URL" -f scripts/ops/br2_rollback.sql
```

Expected Rollback Outcome:
- RLS disabled across all 12 tables (`relrowsecurity = false`).
- Full table and function privileges restored to `anon` and `authenticated`.
