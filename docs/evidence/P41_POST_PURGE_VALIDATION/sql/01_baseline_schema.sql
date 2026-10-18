-- 01_baseline_schema.sql
-- Exact reproduction of the inspected live production catalog baseline

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GameStatus') THEN
    CREATE TYPE "GameStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'FINAL', 'POSTPONED', 'CANCELED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Status') THEN
    CREATE TYPE "Status" AS ENUM ('ACTIVE', 'INACTIVE');
  END IF;
END
$$;

-- Table: public.pools
CREATE TABLE IF NOT EXISTS public.pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  admin_id uuid NULL REFERENCES auth.users(id),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  status "Status" NOT NULL DEFAULT 'ACTIVE'::"Status",
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: public.pool_memberships
CREATE TABLE IF NOT EXISTS public.pool_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id uuid NOT NULL REFERENCES public.pools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'ACTIVE',
  role text NOT NULL DEFAULT 'MEMBER',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pool_memberships_pool_user_unique UNIQUE (pool_id, user_id)
);

-- Table: public.games (inspected baseline)
CREATE TABLE IF NOT EXISTS public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_game_id text UNIQUE NOT NULL,
  home_team_id text NOT NULL,
  away_team_id text NOT NULL,
  kickoff_time timestamptz NOT NULL,
  status "GameStatus" NOT NULL DEFAULT 'SCHEDULED'::"GameStatus",
  home_score integer NULL,
  away_score integer NULL,
  commissioner_notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: public.picks (inspected baseline)
CREATE TABLE IF NOT EXISTS public.picks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id uuid NOT NULL REFERENCES public.pools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id text NOT NULL,
  selected_team_id text NULL,
  week integer NOT NULL,
  submitted_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT picks_pool_id_user_id_game_id_key UNIQUE (pool_id, user_id, game_id)
);

-- Table: public.weekly_submissions (inspected baseline)
CREATE TABLE IF NOT EXISTS public.weekly_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id uuid NOT NULL REFERENCES public.pools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  tie_breaker_prediction numeric(5,2) NULL,
  is_finalized boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT weekly_submissions_pool_id_user_id_week_number_key UNIQUE (pool_id, user_id, week_number)
);

-- Table: public.penalty_ledger (inspected baseline)
CREATE TABLE IF NOT EXISTS public.penalty_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id uuid NOT NULL REFERENCES public.pools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_number integer NULL,
  delta numeric(5,2) NOT NULL,
  reason text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Baseline Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role, postgres;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Baseline RLS on picks (over-permissive policies matching inspected live state)
ALTER TABLE public.picks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read picks"
  ON public.picks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow user upsert own picks"
  ON public.picks FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
