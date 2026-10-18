-- 04_proposal_c_submissions_designation.sql
-- Proposal C: Season-Safe Submissions and Designation

-- Step 1: Add season columns with defaults
ALTER TABLE public.weekly_submissions
  ADD COLUMN IF NOT EXISTS season integer DEFAULT 2026 NOT NULL,
  ADD COLUMN IF NOT EXISTS season_type integer DEFAULT 2 NOT NULL;

-- Step 2: Create replacement unique index
CREATE UNIQUE INDEX IF NOT EXISTS weekly_submissions_pool_season_week_user_idx
  ON public.weekly_submissions (pool_id, season, season_type, week_number, user_id);

-- Step 3: Drop legacy constraint & index
ALTER TABLE public.weekly_submissions
  DROP CONSTRAINT IF EXISTS weekly_submissions_pool_id_user_id_week_number_key;

DROP INDEX IF EXISTS weekly_submissions_pool_id_user_id_week_number_key;

-- Step 4: Attach table constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'weekly_submissions_pool_season_week_user_key'
  ) THEN
    ALTER TABLE public.weekly_submissions
      ADD CONSTRAINT weekly_submissions_pool_season_week_user_key
      UNIQUE USING INDEX weekly_submissions_pool_season_week_user_idx;
  END IF;
END
$$;
