-- BR-2 Pre-Check Script (Decision #41 / R-12.2-U §1.A Gate 1.A)
-- Asserts that hosted public schema is at 6 migrations baseline and ready for BR-2 lockdown.

BEGIN READ ONLY;

-- Gate 1.A: Ownership & Precondition Assertion Block
DO $$
DECLARE
  v_mig_count int;
  v_non_owner_count int;
  v_bypass bool;
BEGIN
  -- 1. Assert exactly 6 migrations
  SELECT count(*) INTO v_mig_count FROM public._prisma_migrations;
  IF v_mig_count <> 6 THEN
    RAISE EXCEPTION 'GATE_FAIL: Expected exactly 6 migrations in _prisma_migrations, found %', v_mig_count;
  END IF;

  -- 2. Assert current_user has bypassrls or is table owner
  SELECT rolbypassrls INTO v_bypass FROM pg_roles WHERE rolname = current_user;
  IF NOT COALESCE(v_bypass, false) AND current_user <> 'postgres' THEN
    RAISE EXCEPTION 'GATE_FAIL: current_user (%) must have rolbypassrls=true or be postgres', current_user;
  END IF;

  -- 3. Assert all public tables are owned by current_user / postgres
  SELECT count(*) INTO v_non_owner_count
  FROM pg_class
  WHERE relnamespace = 'public'::regnamespace
    AND relkind IN ('r', 'p')
    AND pg_get_userbyid(relowner) <> current_user
    AND pg_get_userbyid(relowner) <> 'postgres';

  IF v_non_owner_count > 0 THEN
    RAISE EXCEPTION 'GATE_FAIL: Found % public tables not owned by % or postgres', v_non_owner_count, current_user;
  END IF;

  RAISE NOTICE 'PRECHECK OK';
END $$;

-- 1. Check applied migration count (expect 6)
SELECT count(*) AS applied_migrations,
       CASE WHEN count(*) = 6 THEN 'PASS' ELSE 'FAIL: Unexpected migration count' END AS migration_status
FROM _prisma_migrations;

-- 2. Verify RLS is currently FALSE across all public tables
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
WHERE pg_namespace.nspname = 'public' 
  AND relkind IN ('r', 'p')
ORDER BY relname;

-- 3. Table Ownership Check
SELECT relname, pg_get_userbyid(relowner) AS owner
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relkind IN ('r', 'p')
ORDER BY 1;

COMMIT;
