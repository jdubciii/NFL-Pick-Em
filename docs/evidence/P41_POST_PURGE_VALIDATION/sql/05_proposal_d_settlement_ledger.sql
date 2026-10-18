-- 05_proposal_d_settlement_ledger.sql
-- Proposal D: Settlement Records & Penalty Ledger Attribution

-- Step 1: Composite Primary Key Settlement Store
CREATE TABLE IF NOT EXISTS public.weekly_wrapups (
  pool_id uuid NOT NULL REFERENCES public.pools(id) ON DELETE CASCADE,
  season integer NOT NULL DEFAULT 2026,
  season_type integer NOT NULL DEFAULT 2,
  week_number integer NOT NULL,
  applied_by uuid NULL REFERENCES auth.users(id),
  completed_at timestamptz NOT NULL DEFAULT NOW(),
  input_fingerprint text NULL,
  accepted_revision integer NULL,
  summary jsonb NULL,
  CONSTRAINT weekly_wrapups_pkey PRIMARY KEY (pool_id, season, week_number)
);

ALTER TABLE public.weekly_wrapups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read weekly wrapups" ON public.weekly_wrapups;
CREATE POLICY "Allow authenticated read weekly wrapups"
  ON public.weekly_wrapups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pool_memberships pm
      WHERE pm.pool_id = weekly_wrapups.pool_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS "Allow service role manage weekly wrapups" ON public.weekly_wrapups;
CREATE POLICY "Allow service role manage weekly wrapups"
  ON public.weekly_wrapups FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.weekly_wrapups TO authenticated;
GRANT ALL ON public.weekly_wrapups TO service_role;

-- Step 2: Add season column to penalty_ledger
ALTER TABLE public.penalty_ledger
  ADD COLUMN IF NOT EXISTS season integer DEFAULT 2026 NOT NULL,
  ADD COLUMN IF NOT EXISTS settlement_attribution text NULL;

-- Step 3: Settlement charge uniqueness index (prevents double-billing)
CREATE UNIQUE INDEX IF NOT EXISTS idx_penalty_ledger_settlement_unique
  ON public.penalty_ledger (pool_id, user_id, season, week_number)
  WHERE reason LIKE 'WEEKLY_SETTLEMENT%' OR reason LIKE 'DEAD_PLACE_MONARCH%';
