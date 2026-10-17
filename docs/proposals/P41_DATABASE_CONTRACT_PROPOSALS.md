# P41 — CANONICAL DATABASE CONTRACT & NONEXECUTED PROPOSALS

**AUTHORITIES:** `REVIEW-34BF0025-PHASING-2026-10-17-01`, `P41-TIEBREAKER-CONTRACT-2026-10-17-01`, and `P41-AUTHORITATIVE-SLATE-ARCHITECTURE-2026-10-17-01`  
**STATUS:** Nonexecuted proposals for Architect & Independent Review Gatekeeper review  
**EXECUTION BOUNDARY:** STRICTLY NONEXECUTED IN PRODUCTION. Local isolated testing only.

---

## Proposal A — Canonical Games and Weekly Manifest DDL

### 1. Objective
Add season, season type, week number, and observation tracking to `public.games` while establishing `public.weekly_slate_manifests` for compact durable slate versioning. Preserve internal UUIDs and all 16 existing Week 5 rows.

### 2. DDL Specification
```sql
-- 1. Additive columns to public.games
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS season integer DEFAULT 2026 NOT NULL,
  ADD COLUMN IF NOT EXISTS season_type integer DEFAULT 2 NOT NULL,
  ADD COLUMN IF NOT EXISTS week integer NULL,
  ADD COLUMN IF NOT EXISTS observation_time timestamptz NULL,
  ADD COLUMN IF NOT EXISTS manifest_revision integer DEFAULT 1 NOT NULL;

-- 2. Performance & scope indexes on public.games
CREATE INDEX CONCURRENTLY IF NOT EXISTS games_season_week_idx
  ON public.games (season, season_type, week);

CREATE INDEX CONCURRENTLY IF NOT EXISTS games_external_id_canonical_idx
  ON public.games (external_game_id);

-- 3. Compact durable weekly manifest table
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

-- Only service role / admin write
CREATE POLICY "Allow service role manage slate manifests"
  ON public.weekly_slate_manifests FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

### 3. Compatibility Invariants
- Pre-existing 16 Games rows retain `season = 2026`, `season_type = 2`, and their original `external_game_id` strings (`2026_w05_*`).
- Zero ID reassignment occurs.
- `week` column on existing rows can be backfilled safely to `5` based on `external_game_id ILIKE '%w05%'`.

---

## Proposal B — Canonical Games Import Script & Mapping

### 1. Objective
Synchronize the official 2026 Week 6 NFL schedule from verified ESPN observations into `public.games` using canonical ESPN event text IDs (`401872995`..`401873008`), resolving all 80 existing picks across 9 events without modifying any pick row.

### 2. Candidate Manifest Mapping (2026 Week 6 Regular Season)
| ESPN Event ID | Away Team | Home Team | Canonical Kickoff (UTC) | Pick Count (in 80 picks) |
| :--- | :--- | :--- | :--- | :--- |
| `401872995` | SEA | SF | 2026-10-15T20:15:00.000Z | 1 (SEA) |
| `401872996` | JAX | HOU | 2026-10-18T17:00:00.000Z | 9 (JAX: 8, HOU: 1) |
| `401872997` | BAL | CLE | 2026-10-18T17:00:00.000Z | 10 (BAL: 8, CLE: 2) |
| `401872998` | PHI | CAR | 2026-10-18T17:00:00.000Z | 10 (PHI: 7, CAR: 3) |
| `401872999` | CHI | ATL | 2026-10-18T17:00:00.000Z | 10 (CHI: 7, ATL: 3) |
| `401873000` | NYG | NO | 2026-10-18T17:00:00.000Z | 10 (NYG: 7, NO: 3) |
| `401873001` | NE | NYJ | 2026-10-18T17:00:00.000Z | 10 (NE: 8, NYJ: 2) |
| `401873002` | PIT | TB | 2026-10-18T17:00:00.000Z | 10 (PIT: 9, TB: 1) |
| `401873003` | IND | TEN | 2026-10-18T17:00:00.000Z | 10 (IND: 9, TEN: 1) |
| `401873004` | LAC | MIA | 2026-10-18T20:05:00.000Z | 0 (Unpicked) |
| `401873005` | DAL | DEN | 2026-10-18T20:25:00.000Z | 0 (Unpicked) |
| `401873006` | CIN | GB | 2026-10-18T20:25:00.000Z | 0 (Unpicked) |
| `401873007` | LAR | ARI | 2026-10-18T20:20:00.000Z | 0 (Unpicked — SNF) |
| `401873008` | KC | MIN | 2026-10-19T20:15:00.000Z | 0 (Unpicked — MNF) |

### 3. Preflight & Execution SQL (Nonexecuted)
```sql
BEGIN;

-- 1. Preflight check: verify picks preservation
SELECT count(*)::int AS initial_pick_count FROM public.picks WHERE week = 6;
-- Assert initial_pick_count = 80

-- 2. Upsert canonical Week 6 events
INSERT INTO public.games (
  external_game_id, home_team_id, away_team_id, kickoff_time, status, season, season_type, week
) VALUES
  ('401872995', 'SF',  'SEA', '2026-10-15T20:15:00Z', 'SCHEDULED', 2026, 2, 6),
  ('401872996', 'HOU', 'JAX', '2026-10-18T17:00:00Z', 'SCHEDULED', 2026, 2, 6),
  ('401872997', 'CLE', 'BAL', '2026-10-18T17:00:00Z', 'SCHEDULED', 2026, 2, 6),
  ('401872998', 'CAR', 'PHI', '2026-10-18T17:00:00Z', 'SCHEDULED', 2026, 2, 6),
  ('401872999', 'ATL', 'CHI', '2026-10-18T17:00:00Z', 'SCHEDULED', 2026, 2, 6),
  ('401873000', 'NO',  'NYG', '2026-10-18T17:00:00Z', 'SCHEDULED', 2026, 2, 6),
  ('401873001', 'NYJ', 'NE',  '2026-10-18T17:00:00Z', 'SCHEDULED', 2026, 2, 6),
  ('401873002', 'TB',  'PIT', '2026-10-18T17:00:00Z', 'SCHEDULED', 2026, 2, 6),
  ('401873003', 'TEN', 'IND', '2026-10-18T17:00:00Z', 'SCHEDULED', 2026, 2, 6),
  ('401873004', 'MIA', 'LAC', '2026-10-18T20:05:00Z', 'SCHEDULED', 2026, 2, 6),
  ('401873005', 'DEN', 'DAL', '2026-10-18T20:25:00Z', 'SCHEDULED', 2026, 2, 6),
  ('401873006', 'GB',  'CIN', '2026-10-18T20:25:00Z', 'SCHEDULED', 2026, 2, 6),
  ('401873007', 'ARI', 'LAR', '2026-10-18T20:20:00Z', 'SCHEDULED', 2026, 2, 6),
  ('401873008', 'MIN', 'KC',  '2026-10-19T20:15:00Z', 'SCHEDULED', 2026, 2, 6)
ON CONFLICT (external_game_id) DO UPDATE SET
  home_team_id = EXCLUDED.home_team_id,
  away_team_id = EXCLUDED.away_team_id,
  kickoff_time = EXCLUDED.kickoff_time,
  season = EXCLUDED.season,
  season_type = EXCLUDED.season_type,
  week = EXCLUDED.week;

-- 3. Post-import join verification
SELECT count(*)::int AS joined_picks
FROM public.picks p
JOIN public.games g ON g.external_game_id = p.game_id
WHERE p.week = 6;
-- Assert joined_picks = 80

COMMIT;
```

---

## Proposal C — Season-Safe Submissions and Designation

### 1. Objective
Add `season` and `season_type` to `public.weekly_submissions` to prevent cross-season collision, replacing the legacy unique index on `(pool_id, user_id, week_number)`.

### 2. Migration Sequence (Outside Transaction for Concurrently)
```sql
-- Step 1: Add season columns with defaults
ALTER TABLE public.weekly_submissions
  ADD COLUMN IF NOT EXISTS season integer DEFAULT 2026 NOT NULL,
  ADD COLUMN IF NOT EXISTS season_type integer DEFAULT 2 NOT NULL;

-- Step 2: Create concurrent unique index
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS weekly_submissions_pool_season_week_user_idx
  ON public.weekly_submissions (pool_id, season, season_type, week_number, user_id);

-- Step 3: Verify index validity
SELECT indisvalid FROM pg_index WHERE indexrelid = 'weekly_submissions_pool_season_week_user_idx'::regclass;

-- Step 4: Drop legacy index concurrently
DROP INDEX CONCURRENTLY IF EXISTS weekly_submissions_pool_id_user_id_week_number_key;

-- Step 5: Attach table constraint
ALTER TABLE public.weekly_submissions
  ADD CONSTRAINT weekly_submissions_pool_season_week_user_key
  UNIQUE USING INDEX weekly_submissions_pool_season_week_user_idx;
```

---

## Proposal D — Settlement Records and Ledger

### 1. Objective
Create `public.weekly_wrapups` with composite primary key `(pool_id, season, week_number)`, durable JSONB audit snapshot, and atomic penalty ledger attribution.

### 2. DDL Specification
```sql
CREATE TABLE IF NOT EXISTS public.weekly_wrapups (
  pool_id uuid NOT NULL REFERENCES public.pools(id) ON DELETE CASCADE,
  season integer NOT NULL DEFAULT 2026,
  season_type integer NOT NULL DEFAULT 2,
  week_number integer NOT NULL,
  applied_by uuid NOT NULL REFERENCES auth.users(id),
  completed_at timestamptz NOT NULL DEFAULT NOW(),
  input_hash text NULL,
  summary jsonb NULL,
  CONSTRAINT weekly_wrapups_pkey PRIMARY KEY (pool_id, season, week_number)
);

ALTER TABLE public.weekly_wrapups ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Allow admin write weekly wrapups"
  ON public.weekly_wrapups FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

### 3. Ledger Attribution Contract
- Penalty rows in `public.penalty_ledger` are attributed with:
  `delta`: exact discrete shots (0, 1, 2, or 2.5).
  `reason`: `DEAD_PLACE_MONARCH_S{season}_W{weekNumber}` or `WEEKLY_SETTLEMENT_S{season}_W{weekNumber}_RANK_{rank}`.
- Recovery protocol: offsetting reversal entries (`delta = -original_delta`), never mutating historical rows.

---

## Proposal E — Direct Picks RLS, Grants & Trigger Guards

### 1. Objective
Eliminate over-permissive `Allow authenticated read picks` (`FOR SELECT USING (true)`) and permissive `ALL` policies, establishing strict ownership, active pool membership, and kickoff lock guards while fully preserving the direct Supabase client pick-save flow.

### 2. DDL & Policy Transition (Nonexecuted)
```sql
-- Step 1: Drop over-permissive policies
DROP POLICY IF EXISTS "Allow authenticated read picks" ON public.picks;
DROP POLICY IF EXISTS "Allow authenticated all picks" ON public.picks;

-- Step 2: Enforce league visibility rules for SELECT
-- Users see picks in their pool ONLY after kickoff OR if it is their own pick
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
        AND g.kickoff_time <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
    )
  )
);

-- Step 3: Owner insert scoped to active membership
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
      AND g.kickoff_time > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
  )
);

-- Step 4: Owner update scoped to pre-kickoff
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
      AND g.kickoff_time > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
  )
)
WITH CHECK (
  user_id = auth.uid()
);

-- Step 5: Owner delete scoped to pre-kickoff
CREATE POLICY "picks_delete_policy"
ON public.picks FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.games g
    WHERE (g.external_game_id = picks.game_id OR g.id::text = picks.game_id)
      AND g.kickoff_time > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
  )
);

-- Step 6: Trigger guard for pick identity immutability (pool_id, user_id, game_id, week)
CREATE OR REPLACE FUNCTION public.enforce_pick_identity_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pool_id <> OLD.pool_id THEN
    RAISE EXCEPTION 'CANNOT_MUTATE_PICK_POOL_ID: Pool ID is immutable.';
  END IF;
  IF NEW.user_id <> OLD.user_id THEN
    RAISE EXCEPTION 'CANNOT_MUTATE_PICK_USER_ID: User ID is immutable.';
  END IF;
  IF NEW.game_id <> OLD.game_id THEN
    RAISE EXCEPTION 'CANNOT_MUTATE_PICK_GAME_ID: Game ID is immutable.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_pick_identity_immutability ON public.picks;
CREATE TRIGGER trg_enforce_pick_identity_immutability
  BEFORE UPDATE ON public.picks
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_pick_identity_immutability();
```
