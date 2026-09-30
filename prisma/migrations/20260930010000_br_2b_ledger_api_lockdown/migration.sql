-- BR-2b: Ledger API Lockdown
ALTER TABLE "penalty_ledger" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "penalty_ledger" FROM anon, authenticated;
