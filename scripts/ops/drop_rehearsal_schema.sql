-- Decision #31 / Ruling R-12.2-L: Guarded Drop of Rehearsal Schema on Hosted Database
-- Executed on: 2026-09-30T03:49:00Z after full F1-F6 forensic verification and dump.

BEGIN;

-- Verify rehearsal exists and drop with cascade
DROP SCHEMA IF EXISTS rehearsal CASCADE;

COMMIT;
