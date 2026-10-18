-- 06_proposal_e_picks_security.sql
-- Proposal E: Direct Supabase Pick Security, Grants & Trigger Guards

-- Step 1: Drop over-permissive live policies
DROP POLICY IF EXISTS "Allow authenticated read picks" ON public.picks;
DROP POLICY IF EXISTS "Allow user upsert own picks" ON public.picks;
DROP POLICY IF EXISTS "Allow authenticated all picks" ON public.picks;
DROP POLICY IF EXISTS "picks_select_pool_member_policy" ON public.picks;
DROP POLICY IF EXISTS "picks_insert_policy" ON public.picks;
DROP POLICY IF EXISTS "picks_update_policy" ON public.picks;
DROP POLICY IF EXISTS "picks_delete_policy" ON public.picks;

-- Step 2: Privacy-preserving SELECT policy
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
    AND EXISTS (
      SELECT 1 FROM public.games g
      WHERE (g.external_game_id = picks.game_id OR g.id::text = picks.game_id)
        AND g.kickoff_time <= now()
    )
  )
);

-- Step 3: Owner INSERT policy (active membership + before kickoff)
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
  AND EXISTS (
    SELECT 1 FROM public.games g
    WHERE (g.external_game_id = picks.game_id OR g.id::text = picks.game_id)
      AND g.kickoff_time > now()
  )
);

-- Step 4: Owner UPDATE policy (active membership + before kickoff)
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
  AND EXISTS (
    SELECT 1 FROM public.games g
    WHERE (g.external_game_id = picks.game_id OR g.id::text = picks.game_id)
      AND g.kickoff_time > now()
  )
)
WITH CHECK (
  user_id = auth.uid()
);

-- Step 5: Owner DELETE policy (before kickoff only)
CREATE POLICY "picks_delete_policy"
ON public.picks FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.games g
    WHERE (g.external_game_id = picks.game_id OR g.id::text = picks.game_id)
      AND g.kickoff_time > now()
  )
);

-- Step 6: Trigger guard for pick immutability and hard kickoff boundary
CREATE OR REPLACE FUNCTION public.check_pick_kickoff_and_immutability()
RETURNS TRIGGER AS $$
DECLARE
  v_kickoff timestamptz;
BEGIN
  -- 1. Immutability checks on UPDATE
  IF TG_OP = 'UPDATE' THEN
    IF NEW.pool_id <> OLD.pool_id THEN
      RAISE EXCEPTION 'CANNOT_MUTATE_PICK_POOL_ID: pool_id is immutable';
    END IF;
    IF NEW.user_id <> OLD.user_id THEN
      RAISE EXCEPTION 'CANNOT_MUTATE_PICK_USER_ID: user_id is immutable';
    END IF;
    IF NEW.game_id <> OLD.game_id THEN
      RAISE EXCEPTION 'CANNOT_MUTATE_PICK_GAME_ID: game_id is immutable';
    END IF;
    IF NEW.week <> OLD.week THEN
      RAISE EXCEPTION 'CANNOT_MUTATE_PICK_WEEK: week is immutable';
    END IF;
  END IF;

  -- 2. Kickoff lock check
  SELECT kickoff_time INTO v_kickoff
  FROM public.games
  WHERE external_game_id = NEW.game_id OR id::text = NEW.game_id;

  IF v_kickoff IS NULL THEN
    RAISE EXCEPTION 'FAIL_CLOSED: Game % not found or kickoff undefined', NEW.game_id;
  END IF;

  IF now() >= v_kickoff THEN
    RAISE EXCEPTION 'KICKOFF_LOCKED: Pick submission closed at %', v_kickoff;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_pick_kickoff_and_immutability ON public.picks;
CREATE TRIGGER trg_check_pick_kickoff_and_immutability
  BEFORE INSERT OR UPDATE ON public.picks
  FOR EACH ROW
  EXECUTE FUNCTION public.check_pick_kickoff_and_immutability();
