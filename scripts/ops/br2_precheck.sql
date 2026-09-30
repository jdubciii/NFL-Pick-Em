-- BR-2 Pre-Check Script (Decision #41 / R-12.2-R §5)
-- Asserts that hosted public schema is at 6 migrations baseline and ready for BR-2 lockdown.

BEGIN READ ONLY;

-- 1. Check applied migration count (expect 6)
SELECT count(*) AS applied_migrations,
       CASE WHEN count(*) = 6 THEN 'PASS' ELSE 'FAIL: Unexpected migration count' END AS migration_status
FROM _prisma_migrations;

-- 2. Verify RLS is currently FALSE across all 11 public tables
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
WHERE pg_namespace.nspname = 'public' 
  AND relkind = 'r' 
  AND relname NOT LIKE '_prisma%'
ORDER BY relname;

-- 3. Verify public table row counts match baseline
SELECT 
  (SELECT count(*) FROM users) AS users_count,
  (SELECT count(*) FROM pools) AS pools_count,
  (SELECT count(*) FROM pool_memberships) AS pool_memberships_count,
  (SELECT count(*) FROM games) AS games_count,
  (SELECT count(*) FROM picks) AS picks_count,
  (SELECT count(*) FROM pick_results) AS pick_results_count,
  (SELECT count(*) FROM weekly_submissions) AS weekly_submissions_count,
  (SELECT count(*) FROM penalty_ledger) AS penalty_ledger_count,
  (SELECT count(*) FROM penalty_media) AS penalty_media_count,
  (SELECT count(*) FROM pool_member_stats) AS pool_member_stats_count,
  (SELECT count(*) FROM audit_logs) AS audit_logs_count;

COMMIT;
