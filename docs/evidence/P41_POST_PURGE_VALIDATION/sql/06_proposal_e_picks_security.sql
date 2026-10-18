-- 06_proposal_e_picks_security.sql
-- Proposal E: Direct Supabase Pick Security, Grants & Trigger Guards
-- Authority: P41-SECURE-CUTOVER-AND-ACTIVATION-2026-10-18-01

-- Step 1: Schema expansion on public.picks (backward-compatible additive columns)
ALTER TABLE public.picks
  ADD COLUMN IF NOT EXISTS matchup_id text NULL,
  ADD COLUMN IF NOT EXISTS selected_team text NULL;

-- Step 2: Drop legacy over-permissive live policies
DROP POLICY IF EXISTS "Allow authenticated read picks" ON public.picks;
DROP POLICY IF EXISTS "Allow user upsert own picks" ON public.picks;
DROP POLICY IF EXISTS "Allow authenticated all picks" ON public.picks;
DROP POLICY IF EXISTS "picks_select_pool_member_policy" ON public.picks;
DROP POLICY IF EXISTS "picks_insert_policy" ON public.picks;
DROP POLICY IF EXISTS "picks_update_policy" ON public.picks;
DROP POLICY IF EXISTS "picks_delete_policy" ON public.picks;

-- Step 2: Narrowly scoped database lookup helpers (SECURITY DEFINER)
-- Allows RLS policies to evaluate game kickoff status without granting blanket SELECT on public.games
CREATE OR REPLACE FUNCTION public.is_game_locked(p_game_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.games g
    WHERE (g.external_game_id = p_game_id OR g.id::text = p_game_id)
      AND COALESCE(g.lock_effective_at, g.canonical_kickoff_time, g.kickoff_time) <= clock_timestamp()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_game_open(p_game_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.games g
    WHERE (g.external_game_id = p_game_id OR g.id::text = p_game_id)
      AND COALESCE(g.lock_effective_at, g.canonical_kickoff_time, g.kickoff_time) > clock_timestamp()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_game_locked(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_game_open(text) TO authenticated;

-- Step 3: Privacy-preserving SELECT policy
-- Owner can always view own picks; other members can only view post-kickoff if ACTIVE in pool
CREATE POLICY "picks_select_pool_member_policy"
ON public.picks FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (
    EXISTS (
      SELECT 1 FROM public.pool_memberships pm
      WHERE pm.pool_id = picks.pool_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'ACTIVE'
    )
    AND public.is_game_locked(picks.game_id)
  )
);

-- Step 4: Owner INSERT policy (active membership + before kickoff)
CREATE POLICY "picks_insert_policy"
ON public.picks FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.pool_memberships pm
    WHERE pm.pool_id = picks.pool_id
      AND pm.user_id = auth.uid()
      AND pm.status = 'ACTIVE'
  )
  AND public.is_game_open(picks.game_id)
);

-- Step 5: Owner UPDATE policy (active membership + before kickoff)
CREATE POLICY "picks_update_policy"
ON public.picks FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.pool_memberships pm
    WHERE pm.pool_id = picks.pool_id
      AND pm.user_id = auth.uid()
      AND pm.status = 'ACTIVE'
  )
  AND public.is_game_open(picks.game_id)
)
WITH CHECK (
  user_id = auth.uid()
);

-- Step 6: Owner DELETE policy (before kickoff only)
CREATE POLICY "picks_delete_policy"
ON public.picks FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  AND public.is_game_open(picks.game_id)
);

-- Step 6: Trigger guard for pick immutability, canonical event/team validation, and clock_timestamp() kickoff lock
CREATE OR REPLACE FUNCTION public.check_pick_kickoff_and_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_game RECORD;
  v_effective_kickoff timestamptz;
  v_selected_team text;
  v_target_game_id text;
BEGIN
  -- 1. Immutability checks on UPDATE: protect id, pool_id, user_id, game_id, matchup_id, week
  -- Allow unchanged upsert values (NEW.col IS NOT DISTINCT FROM OLD.col)
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'CANNOT_MUTATE_PICK_ID: id is immutable';
    END IF;
    IF NEW.pool_id IS DISTINCT FROM OLD.pool_id THEN
      RAISE EXCEPTION 'CANNOT_MUTATE_PICK_POOL_ID: pool_id is immutable';
    END IF;
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'CANNOT_MUTATE_PICK_USER_ID: user_id is immutable';
    END IF;
    IF NEW.game_id IS DISTINCT FROM OLD.game_id THEN
      RAISE EXCEPTION 'CANNOT_MUTATE_PICK_GAME_ID: game_id is immutable';
    END IF;
    IF NEW.matchup_id IS DISTINCT FROM OLD.matchup_id THEN
      RAISE EXCEPTION 'CANNOT_MUTATE_PICK_MATCHUP_ID: matchup_id is immutable';
    END IF;
    IF NEW.week IS DISTINCT FROM OLD.week THEN
      RAISE EXCEPTION 'CANNOT_MUTATE_PICK_WEEK: week is immutable';
    END IF;
  END IF;

  -- 2. Derive omitted matchup_id only on new INSERT; never allow it to become an independent event identity
  IF TG_OP = 'INSERT' THEN
    IF NEW.matchup_id IS NULL THEN
      NEW.matchup_id := NEW.game_id;
    END IF;
  END IF;

  -- Determine target game id
  IF TG_OP = 'DELETE' THEN
    v_target_game_id := OLD.game_id;
  ELSE
    v_target_game_id := NEW.game_id;
  END IF;

  -- 3. Canonical Game & Kickoff Verification
  SELECT id, external_game_id, home_team_id, away_team_id, kickoff_time, canonical_kickoff_time, lock_effective_at, status
  INTO v_game
  FROM public.games
  WHERE external_game_id = v_target_game_id OR id::text = v_target_game_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'UNKNOWN_GAME: Game % not found in games registry', v_target_game_id;
  END IF;

  -- 4. Participating Team Validation on INSERT / UPDATE
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_selected_team := COALESCE(NEW.selected_team_id, NEW.selected_team);
    IF v_selected_team IS NOT NULL THEN
      -- Normalize platform aliases
      IF v_selected_team = 'WSH' THEN v_selected_team := 'WAS'; END IF;
      IF v_selected_team = 'JAC' THEN v_selected_team := 'JAX'; END IF;
      
      IF v_selected_team <> v_game.home_team_id AND v_selected_team <> v_game.away_team_id THEN
        RAISE EXCEPTION 'INVALID_TEAM: % is not playing in game % (home: %, away: %)',
          v_selected_team, v_game.external_game_id, v_game.home_team_id, v_game.away_team_id;
      END IF;
      
      -- Store normalized value
      IF NEW.selected_team_id IS NOT NULL THEN
        NEW.selected_team_id := v_selected_team;
      END IF;
      IF NEW.selected_team IS NOT NULL THEN
        NEW.selected_team := v_selected_team;
      END IF;
    END IF;
  END IF;

  -- 5. Effective Kickoff Lock Evaluation (clock_timestamp() ensures writes waiting across kickoff fail closed)
  v_effective_kickoff := COALESCE(v_game.lock_effective_at, v_game.canonical_kickoff_time, v_game.kickoff_time);

  IF v_effective_kickoff IS NULL THEN
    RAISE EXCEPTION 'UNVERIFIED_KICKOFF: Cannot verify kickoff time for game %', v_game.external_game_id;
  END IF;

  IF clock_timestamp() >= v_effective_kickoff THEN
    RAISE EXCEPTION 'KICKOFF_LOCKED: Pick modification closed at %', v_effective_kickoff;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_pick_kickoff_and_immutability ON public.picks;
CREATE TRIGGER trg_check_pick_kickoff_and_immutability
  BEFORE INSERT OR UPDATE OR DELETE ON public.picks
  FOR EACH ROW
  EXECUTE FUNCTION public.check_pick_kickoff_and_immutability();

-- Step 7: Revoke unauthorized mutations and blanket reads on public.games
-- Protect commissioner_notes and unclassified legacy games from direct client inspection
REVOKE ALL ON public.games FROM anon, authenticated;

-- Step 8: Safe Authenticated Pool-Scoped Canonical Games Lookup RPC
CREATE OR REPLACE FUNCTION public.get_pool_canonical_games(p_pool_id uuid, p_season int, p_week int)
RETURNS TABLE (
  id uuid,
  external_game_id text,
  home_team_id text,
  away_team_id text,
  kickoff_time timestamptz,
  status "GameStatus",
  home_score int,
  away_score int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT g.id, g.external_game_id, g.home_team_id, g.away_team_id,
         COALESCE(g.canonical_kickoff_time, g.kickoff_time) as kickoff_time,
         g.status, g.home_score, g.away_score
  FROM public.games g
  JOIN public.weekly_slate_manifests m
    ON m.season = g.season AND m.season_type = g.season_type AND m.week_number = g.week
  WHERE g.season = p_season AND g.week = p_week
    AND g.manifest_revision IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.pool_memberships pm
      WHERE pm.pool_id = p_pool_id AND pm.user_id = auth.uid() AND pm.status = 'ACTIVE'
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_pool_canonical_games(uuid, int, int) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_pool_canonical_games(uuid, int, int) FROM anon;
