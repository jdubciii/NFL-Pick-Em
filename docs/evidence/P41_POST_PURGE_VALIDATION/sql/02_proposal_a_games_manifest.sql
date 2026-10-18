-- 02_proposal_a_games_manifest.sql
-- Proposal A: Canonical Games & Weekly Slate Manifests DDL

-- Step 1: Add additive columns to public.games
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS season integer DEFAULT 2026 NOT NULL,
  ADD COLUMN IF NOT EXISTS season_type integer DEFAULT 2 NOT NULL,
  ADD COLUMN IF NOT EXISTS week integer NULL,
  ADD COLUMN IF NOT EXISTS observation_time timestamptz NULL,
  ADD COLUMN IF NOT EXISTS manifest_revision integer DEFAULT 1 NOT NULL;

-- Step 2: Performance & scope indexes on public.games
CREATE INDEX IF NOT EXISTS games_season_week_idx
  ON public.games (season, season_type, week);

CREATE INDEX IF NOT EXISTS games_external_id_canonical_idx
  ON public.games (external_game_id);

-- Step 3: Classify existing 16 Week 5 games safely
UPDATE public.games
SET week = 5, season = 2026, season_type = 2
WHERE external_game_id ILIKE '2026_w05_%' AND week IS NULL;

-- Step 4: Compact durable weekly manifest table (League-Wide Canonical Slate)
CREATE TABLE IF NOT EXISTS public.weekly_slate_manifests (
  season integer NOT NULL,
  season_type integer NOT NULL DEFAULT 2,
  week_number integer NOT NULL,
  revision integer NOT NULL DEFAULT 1,
  event_ids text[] NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT NOW(),
  accepted_by uuid NOT NULL REFERENCES auth.users(id),
  manifest_fingerprint text NOT NULL,
  observation_time timestamptz NOT NULL,
  CONSTRAINT weekly_slate_manifests_pkey PRIMARY KEY (season, season_type, week_number)
);

-- RLS & Grants for weekly_slate_manifests
ALTER TABLE public.weekly_slate_manifests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read slate manifests"
  ON public.weekly_slate_manifests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow service role manage slate manifests"
  ON public.weekly_slate_manifests FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.weekly_slate_manifests TO authenticated;
GRANT ALL ON public.weekly_slate_manifests TO service_role;
