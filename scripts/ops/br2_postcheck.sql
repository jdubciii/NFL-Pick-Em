-- BR-2 Post-Check Script (Decision #41 / R-12.2-R §5)
-- Validates that BR-2b and BR-2c have been deployed, RLS is enabled without force, and privileges are revoked.

BEGIN READ ONLY;

-- 1. Check applied migration count (expect 8 after BR-2b/2c)
SELECT count(*) AS applied_migrations,
       CASE WHEN count(*) = 8 THEN 'PASS' ELSE 'FAIL: Unexpected migration count' END AS migration_status
FROM _prisma_migrations;

-- 2. Verify RLS is ENABLED (true) and NOT FORCED (false) across all 12 public tables
SELECT relname,
       relrowsecurity,
       relforcerowsecurity,
       CASE WHEN relrowsecurity = true AND relforcerowsecurity = false THEN 'PASS' ELSE 'FAIL' END AS rls_status
FROM pg_class
JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
WHERE pg_namespace.nspname = 'public' 
  AND relkind IN ('r', 'p')
ORDER BY relname;

-- 3. Verify anon and authenticated roles have NO table privileges
SELECT table_name,
       has_table_privilege('anon', 'public.' || table_name, 'select') AS anon_select,
       has_table_privilege('authenticated', 'public.' || table_name, 'select') AS auth_select,
       has_table_privilege('anon', 'public.' || table_name, 'update') AS anon_update
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 4. Verify trigger function execute privileges are revoked
SELECT proname,
       has_function_privilege('anon', oid, 'execute') AS anon_exec,
       has_function_privilege('authenticated', oid, 'execute') AS auth_exec
FROM pg_proc
WHERE proname IN ('penalty_ledger_prevent_update_delete', 'penalty_ledger_prevent_truncate');

COMMIT;
