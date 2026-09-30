-- BR-2c: Public Tables API Lockdown & BR-1 Function Revokes
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "users" FROM anon, authenticated;

ALTER TABLE "pools" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "pools" FROM anon, authenticated;

ALTER TABLE "pool_memberships" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "pool_memberships" FROM anon, authenticated;

ALTER TABLE "games" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "games" FROM anon, authenticated;

ALTER TABLE "picks" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "picks" FROM anon, authenticated;

ALTER TABLE "pick_results" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "pick_results" FROM anon, authenticated;

ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "audit_logs" FROM anon, authenticated;

ALTER TABLE "pool_member_stats" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "pool_member_stats" FROM anon, authenticated;

ALTER TABLE "weekly_submissions" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "weekly_submissions" FROM anon, authenticated;

ALTER TABLE "penalty_media" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "penalty_media" FROM anon, authenticated;

-- Revoke execute on BR-1 trigger functions from PUBLIC, anon, authenticated
REVOKE ALL ON FUNCTION public.penalty_ledger_prevent_update_delete() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.penalty_ledger_prevent_truncate() FROM PUBLIC, anon, authenticated;
