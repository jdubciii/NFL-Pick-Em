-- BR-1: Immutable / Append-Only Penalty Ledger Triggers

CREATE OR REPLACE FUNCTION penalty_ledger_prevent_update_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'penalty_ledger is append-only: UPDATE and DELETE operations are prohibited';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER penalty_ledger_no_update_delete
BEFORE UPDATE OR DELETE ON "penalty_ledger"
FOR EACH ROW
EXECUTE FUNCTION penalty_ledger_prevent_update_delete();

CREATE OR REPLACE FUNCTION penalty_ledger_prevent_truncate()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'penalty_ledger is append-only: TRUNCATE operations are prohibited';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER penalty_ledger_no_truncate
BEFORE TRUNCATE ON "penalty_ledger"
FOR EACH STATEMENT
EXECUTE FUNCTION penalty_ledger_prevent_truncate();
