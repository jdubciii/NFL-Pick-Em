-- BR-2 Emergency Rollback Script (Decision #41 / R-12.2-R §5)
-- Reverts RLS and grants permissions back to anon and authenticated in case of emergency rollback.

BEGIN;

-- 1. Disable RLS across all application tables
ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "pools" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "pool_memberships" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "games" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "picks" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "pick_results" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "pool_member_stats" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "penalty_ledger" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "weekly_submissions" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "penalty_media" DISABLE ROW LEVEL SECURITY;

-- 2. Grant table privileges back to anon and authenticated
GRANT ALL ON TABLE "users" TO anon, authenticated;
GRANT ALL ON TABLE "pools" TO anon, authenticated;
GRANT ALL ON TABLE "pool_memberships" TO anon, authenticated;
GRANT ALL ON TABLE "games" TO anon, authenticated;
GRANT ALL ON TABLE "picks" TO anon, authenticated;
GRANT ALL ON TABLE "pick_results" TO anon, authenticated;
GRANT ALL ON TABLE "audit_logs" TO anon, authenticated;
GRANT ALL ON TABLE "pool_member_stats" TO anon, authenticated;
GRANT ALL ON TABLE "penalty_ledger" TO anon, authenticated;
GRANT ALL ON TABLE "weekly_submissions" TO anon, authenticated;
GRANT ALL ON TABLE "penalty_media" TO anon, authenticated;

-- 3. Grant function execution privileges back
GRANT ALL ON FUNCTION public.penalty_ledger_prevent_update_delete() TO PUBLIC, anon, authenticated;
GRANT ALL ON FUNCTION public.penalty_ledger_prevent_truncate() TO PUBLIC, anon, authenticated;

COMMIT;
