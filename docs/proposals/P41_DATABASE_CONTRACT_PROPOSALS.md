# P41 — CANONICAL DATABASE CONTRACT & NONEXECUTED PROPOSALS (RECONCILED)

**AUTHORITIES:** `REVIEW-34BF0025-PHASING-2026-10-17-01`, `P41-TIEBREAKER-CONTRACT-2026-10-17-01`, and `P41-AUTHORITATIVE-SLATE-ARCHITECTURE-2026-10-17-01`  
**STATUS:** Nonexecuted proposals reconciled against live PostgreSQL catalog  
**EXECUTION BOUNDARY:** STRICTLY NONEXECUTED IN PRODUCTION. Local isolated proposal & analysis only.

---

## 1. Catalog Discrepancy & Reconciliation Matrix

| Object / Relation | Live Production Catalog | Legacy / Flawed Proposal | Reconciled Contract Proposal |
| :--- | :--- | :--- | :--- |
| `games.id` | `uuid PRIMARY KEY` | `uuid PRIMARY KEY` | Preserved unchanged (`uuid`) |
| `games.external_game_id` | `text UNIQUE` | Proposed redundant `event_id` | **No duplicate column**. Uses canonical `external_game_id` directly for ESPN event text IDs (`401872995`..`401873008`). |
| `games.home_score`, `away_score` | `integer NULL` | Proposed adding duplicate scores | **No duplicate score columns**. Reuses existing `home_score` and `away_score`. |
| `games.status` | `enum GameStatus` (`SCHEDULED`, `IN_PROGRESS`, `FINAL`, `POSTPONED`, `CANCELED`) | Proposed `source_status text` | **No duplicate status column**. Reuses existing `GameStatus` enum with normalized mappings. |
| `games` additive columns | None | Ad-hoc definitions | `season int NULL`, `season_type int DEFAULT 2 NULL`, `week int NULL`, `observation_time timestamptz NULL`, `manifest_revision int NULL`. Avoids unconditional defaults that silently certify legacy records. |
| Existing 16 `games` rows | 16 rows (`401872964`..`401872979`) with kickoff dates Oct 4–5, 2026 | Incorrect synthetic `2026_w05_*` predicate | **Preserved 100% untouched**. Retracts synthetic `2026_w05_*` predicate. UUIDs, numeric ESPN text IDs, scores, statuses, and notes intact. Unverified season/week remains strictly `NULL` / unassigned until separately reviewed with source-backed provider evidence. |
| `pools.id` | `uuid PRIMARY KEY` | Guessed `TEXT` in summary | Strictly typed `uuid REFERENCES public.pools(id)`. |
| `weekly_submissions` unique key | `weekly_submissions_pool_id_user_id_week_number_key` on `(pool_id, user_id, week_number)` | Guessed `weekly_submissions_pool_id_week_number_user_id_key` | Exact verified name dropped concurrently; replaced with season-aware unique index on `(pool_id, season, season_type, week_number, user_id)`. |
| Pool settings location | `public.pools.settings` (`jsonb`) | Guessed `public.pool_settings` table | **`public.pool_settings` does NOT exist**. Stored strictly within `pools.settings` JSONB under `season_tiebreaker_config`. |
| `weekly_wrapups` primary key | Table does not exist in production | Assumed synthetic `id uuid` or `RETURNING id` | **Composite primary key strictly `(pool_id, season, week_number)`**. Zero synthetic `id` column. |
| `penalty_ledger` columns | `id uuid`, `pool_id uuid`, `user_id uuid`, `week_number int`, `delta numeric(5,2)`, `reason text`, `created_by uuid`, `created_at timestamptz` | Assumed existing `season`, `week`, `type` | Additive `season int NOT NULL DEFAULT 2026`, `settlement_attribution text NULL`. Unique partial index for weekly settlement deduplication. |
| `picks.week` | `integer NOT NULL` named `week` | Mistakenly referenced as `week_number` | Verified column is `week`. Trigger and queries reference `NEW.week`. |
| Live `picks` RLS policies | `Allow authenticated read picks` (`FOR SELECT USING (true)`), `Allow user upsert own picks` | Guessed legacy policy names | Replaces exact live policy names with granular, kickoff-enforced `SELECT`, `INSERT`, `UPDATE`, `DELETE` policies and trigger guard. |

---

## Proposal A — Canonical Games & Weekly Slate Manifests DDL

### 1. Objective
Add season, season type, week number, and observation provenance to `public.games` without duplicating existing score/status columns or silently certifying unverified legacy records. Establish `public.weekly_slate_manifests` for compact durable slate versioning. Preserve internal UUIDs and all 16 existing production games records (`401872964` through `401872979`).

> [!IMPORTANT]
> **PRODUCTION GAMES PRESERVATION & RETRACTION NOTICE (2026-10-18)**
> 1. **Retraction**: The earlier draft statement that the 16 existing games records use synthetic `2026_w05_*` identifiers is **EXPLICITLY RETRACTED**.
> 2. **Live Facts**: Production contains 16 rows with numeric ESPN-style text identifiers `401872964` through `401872979`. Stored kickoffs are October 4, 2026 (15 rows) and October 5, 2026 (1 row). Zero rows match `external_game_id ILIKE '2026_w05_%'`.
> 3. **Preservation**: The earlier proposed `UPDATE public.games SET week = 5 ... WHERE external_game_id ILIKE '2026_w05_%'` is **DELETED**. Unverified historical records are NOT classified solely from kickoff dates or ID ranges.
> 4. **Nullable Provenance**: The additive columns `season`, `week`, and `manifest_revision` are added as **NULLABLE** without unconditional NOT NULL defaults that would silently certify legacy records. Their values remain `NULL` (unassigned) until separately reviewed with source-backed provider evidence.
> 5. **Distinction**: Canonical slate entries (e.g. Week 6) are distinguished in queries by explicit criteria: `WHERE season = 2026 AND week = 6 AND manifest_revision IS NOT NULL`.

### 2. DDL Specification (Nonexecuted)
```sql
-- Step 1: Add additive columns to public.games
-- Existing home_score, away_score, status, and external_game_id are preserved directly.
-- Columns remain nullable so legacy unclassified records are not falsely certified.
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS season integer NULL,
  ADD COLUMN IF NOT EXISTS season_type integer DEFAULT 2 NULL,
  ADD COLUMN IF NOT EXISTS week integer NULL,
  ADD COLUMN IF NOT EXISTS observation_time timestamptz NULL,
  ADD COLUMN IF NOT EXISTS manifest_revision integer NULL;

-- Step 2: Performance & scope indexes on public.games
CREATE INDEX CONCURRENTLY IF NOT EXISTS games_season_week_idx
  ON public.games (season, season_type, week);

CREATE INDEX CONCURRENTLY IF NOT EXISTS games_external_id_canonical_idx
  ON public.games (external_game_id);

-- Step 3: Compact durable weekly manifest table (League-Wide Canonical Slate)
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
```

### 3. Target Prisma Model Alignment
To ensure all reads cleanly distinguish legacy unclassified games from accepted canonical slate entries:
```prisma
model Game {
  id                String     @id @default(uuid()) @db.Uuid
  externalGameId    String     @unique @map("external_game_id")
  homeTeamId        String     @map("home_team_id")
  awayTeamId        String     @map("away_team_id")
  kickoffTime       DateTime   @map("kickoff_time")
  status            GameStatus @default(SCHEDULED)
  homeScore         Int?       @map("home_score")
  awayScore         Int?       @map("away_score")
  commissionerNotes String?    @map("commissioner_notes")
  season            Int?       @map("season")
  seasonType        Int?       @default(2) @map("season_type")
  week              Int?       @map("week")
  observationTime   DateTime?  @map("observation_time")
  manifestRevision  Int?       @map("manifest_revision")
  picks             Pick[]

  @@index([season, seasonType, week])
  @@map("games")
}
```
All affected application queries must filter canonical slate entries explicitly:
`where: { season: 2026, week: targetWeek, manifestRevision: { not: null } }`. Unclassified historical records (`season IS NULL` / `week IS NULL`) remain safely isolated from weekly slate operations.

### 3. Alternative Pool-Scoped Manifest DDL (If custom pool windows are enabled)
```sql
-- If manifests are pool-specific rather than universal NFL schedule:
CREATE TABLE IF NOT EXISTS public.pool_slate_manifests (
  pool_id uuid NOT NULL REFERENCES public.pools(id) ON DELETE CASCADE,
  season integer NOT NULL,
  season_type integer NOT NULL DEFAULT 2,
  week_number integer NOT NULL,
  revision integer NOT NULL DEFAULT 1,
  event_ids text[] NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT NOW(),
  accepted_by uuid NOT NULL REFERENCES auth.users(id),
  manifest_fingerprint text NOT NULL,
  observation_time timestamptz NOT NULL,
  CONSTRAINT pool_slate_manifests_pkey PRIMARY KEY (pool_id, season, season_type, week_number)
);
```

---

## Proposal B — Canonical Games Import (Week 6 Candidate Manifest)

### 1. Objective
Synchronize the official 2026 Week 6 NFL schedule from verified ESPN observations into `public.games` using canonical ESPN event text IDs (`401872995`..`401873008`), resolving all 80 existing picks across 9 events without modifying any pick row.

> [!CAUTION]
> **P0 PROVIDER CONTAMINATION RETRACTION & SUPERSEDED NOTICE (2026-10-18)**
> The initial table draft below contained synthetic test mocks:
> 1. Claimed `401872995` was Seattle Seahawks at San Francisco 49ers (`SEA @ SF`), final score 24–20. **RETRACTED**. Genuine live HTTPS ESPN capture (`docs/evidence/P41_ESPN_LIVE_CAPTURE/espn_week6_2026_raw.json`, SHA-256 `f0826e586f9ccef338076212bd96708ae1d0ce007d7500e7208bc45ee29c3bae`) confirms `401872995` is **Seattle Seahawks at Denver Broncos** (`SEA @ DEN`), Final/OT score: DEN 17, SEA 14, kickoff `2026-10-16T00:15:00.000Z`.
> 2. Inverted home and away teams on games `401872996`..`401873003`.
> 3. Substituted fabricated non-Week-6 matchups for unpicked events `401873004`..`401873008`.
>
> The table below preserves the historical draft as **SUPERSEDED** and provides the **AUTHORITATIVE LIVE CAPTURE MANIFEST**.

#### Verified Authoritative Candidate Manifest (Live ESPN Capture: 2026-10-18T06:18:25.722Z)
*Raw Payload SHA-256: `f0826e586f9ccef338076212bd96708ae1d0ce007d7500e7208bc45ee29c3bae`*
*Manifest Fingerprint: `c72f7e4c7a5579785acd9a4e1e7068f7c7d6bd06144fa531392bf9614ce7ad43`*
*Team Normalization (Directive 5): Platform code `WAS`, input alias `WSH` -> `WAS`, verified ESPN provider team ID `28`, original provider abbreviation `WSH`.*

| ESPN Event ID | Away Team | Home Team | Canonical Kickoff (UTC) | Status / Score | Saved Pick Count (in 80 picks) | Saved Selected Teams |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `401872995` | SEA | DEN | 2026-10-16T00:15:00.000Z | FINAL (DEN 17, SEA 14 OT) | 1 | SEA: 1 |
| `401872996` | HOU | JAX | 2026-10-18T13:30:00.000Z | SCHEDULED | 10 | HOU: 1, JAX: 9 |
| `401872997` | BAL | CLE | 2026-10-18T17:00:00.000Z | SCHEDULED | 10 | BAL: 9, CLE: 1 |
| `401872998` | CAR | PHI | 2026-10-18T17:00:00.000Z | SCHEDULED | 10 | CAR: 3, PHI: 7 |
| `401872999` | CHI | ATL | 2026-10-18T17:00:00.000Z | SCHEDULED | 10 | CHI: 7, ATL: 3 |
| `401873000` | NO | NYG | 2026-10-18T17:00:00.000Z | SCHEDULED | 9 | NO: 3, NYG: 6 |
| `401873001` | NYJ | NE | 2026-10-18T17:00:00.000Z | SCHEDULED | 10 | NYJ: 2, NE: 8 |
| `401873002` | PIT | TB | 2026-10-18T17:00:00.000Z | SCHEDULED | 10 | PIT: 9, TB: 1 |
| `401873003` | TEN | IND | 2026-10-18T17:00:00.000Z | SCHEDULED | 10 | TEN: 1, IND: 9 |
| `401873004` | ARI | LAR | 2026-10-18T20:05:00.000Z | SCHEDULED | 0 | Unpicked |
| `401873005` | BUF | LV | 2026-10-18T20:25:00.000Z | SCHEDULED | 0 | Unpicked |
| `401873006` | LAC | KC | 2026-10-18T20:25:00.000Z | SCHEDULED | 0 | Unpicked |
| `401873007` | DAL | GB | 2026-10-19T00:20:00.000Z | SCHEDULED (SNF) | 0 | Unpicked |
| `401873008` | WAS | SF | 2026-10-20T00:15:00.000Z | SCHEDULED (MNF) | 0 | Unpicked (Provider: WSH, ID: 28) |
| **Total** | | | | | **80 picks** | **100% Resolved & Legitimate** |

*Pick Reconciliation Note*: Every saved pick record (80 out of 80) across all 9 saved events matches an actual participating team of the authoritative ESPN event. There are **0 invalid selected teams** and **0 unresolved event IDs**.

#### Historical Superseded Mapping (Nonauthoritative Initial Draft — For Audit Trace Only)
*Status: SUPERSEDED — DO NOT EXECUTE*
| ESPN Event ID | Claimed Away | Claimed Home | Initial Error Description |
| :--- | :--- | :--- | :--- |
| `401872995` | SEA | SF | Fabricated matchup; actual event is SEA @ DEN (Final 14–17 OT) |
| `401872996` | JAX | HOU | Inverted; actual is HOU @ JAX |
| `401872997` | BAL | CLE | Verified away/home orientation is BAL @ CLE |
| `401872998` | PHI | CAR | Inverted; actual is CAR @ PHI |
| `401872999` | CHI | ATL | Verified away/home orientation is CHI @ ATL |
| `401873000` | NYG | NO | Inverted; actual is NO @ NYG |
| `401873001` | NE | NYJ | Inverted; actual is NYJ @ NE |
| `401873002` | PIT | TB | Verified away/home orientation is PIT @ TB |
| `401873003` | IND | TEN | Inverted; actual is TEN @ IND |
| `401873004` | LAC | MIA | Fabricated; actual is ARI @ LAR |
| `401873005` | DAL | DEN | Fabricated; actual is BUF @ LV |
| `401873006` | CIN | GB | Fabricated; actual is LAC @ KC |
| `401873007` | LAR | ARI | Fabricated; actual is DAL @ GB |
| `401873008` | KC | MIN | Fabricated; actual is WAS @ SF (Provider: WSH) |

### 3. Preflight, Upsert & Join Verification SQL (Nonexecuted — Production Hold)
```sql
BEGIN;

-- 1. Preflight assertion: verify 80 picks exist before import
SELECT count(*)::int AS pre_import_pick_count FROM public.picks WHERE week = 6;
-- Assert pre_import_pick_count = 80

-- 2. Upsert canonical Week 6 events (Verified against Live ESPN Capture)
INSERT INTO public.games (
  external_game_id, home_team_id, away_team_id, kickoff_time, status, season, season_type, week
) VALUES
  ('401872995', 'DEN', 'SEA', '2026-10-16T00:15:00Z', 'FINAL'::"GameStatus",     2026, 2, 6),
  ('401872996', 'JAX', 'HOU', '2026-10-18T13:30:00Z', 'SCHEDULED'::"GameStatus", 2026, 2, 6),
  ('401872997', 'CLE', 'BAL', '2026-10-18T17:00:00Z', 'SCHEDULED'::"GameStatus", 2026, 2, 6),
  ('401872998', 'PHI', 'CAR', '2026-10-18T17:00:00Z', 'SCHEDULED'::"GameStatus", 2026, 2, 6),
  ('401872999', 'ATL', 'CHI', '2026-10-18T17:00:00Z', 'SCHEDULED'::"GameStatus", 2026, 2, 6),
  ('401873000', 'NYG', 'NO',  '2026-10-18T17:00:00Z', 'SCHEDULED'::"GameStatus", 2026, 2, 6),
  ('401873001', 'NE',  'NYJ', '2026-10-18T17:00:00Z', 'SCHEDULED'::"GameStatus", 2026, 2, 6),
  ('401873002', 'TB',  'PIT', '2026-10-18T17:00:00Z', 'SCHEDULED'::"GameStatus", 2026, 2, 6),
  ('401873003', 'IND', 'TEN', '2026-10-18T17:00:00Z', 'SCHEDULED'::"GameStatus", 2026, 2, 6),
  ('401873004', 'LAR', 'ARI', '2026-10-18T20:05:00Z', 'SCHEDULED'::"GameStatus", 2026, 2, 6),
  ('401873005', 'LV',  'BUF', '2026-10-18T20:25:00Z', 'SCHEDULED'::"GameStatus", 2026, 2, 6),
  ('401873006', 'KC',  'LAC', '2026-10-18T20:25:00Z', 'SCHEDULED'::"GameStatus", 2026, 2, 6),
  ('401873007', 'GB',  'DAL', '2026-10-19T00:20:00Z', 'SCHEDULED'::"GameStatus", 2026, 2, 6),
  ('401873008', 'SF',  'WAS', '2026-10-20T00:15:00Z', 'SCHEDULED'::"GameStatus", 2026, 2, 6)
ON CONFLICT (external_game_id) DO UPDATE SET
  home_team_id = EXCLUDED.home_team_id,
  away_team_id = EXCLUDED.away_team_id,
  kickoff_time = EXCLUDED.kickoff_time,
  status = EXCLUDED.status,
  season = EXCLUDED.season,
  season_type = EXCLUDED.season_type,
  week = EXCLUDED.week;

-- 3. Post-import join verification: verify all 80 picks join canonical games
SELECT count(*)::int AS joined_picks
FROM public.picks p
JOIN public.games g ON (g.external_game_id = p.game_id OR g.id::text = p.game_id)
WHERE p.week = 6;
-- Assert joined_picks = 80

COMMIT;
```

---

## Proposal C — Season-Safe Submissions and Designation

### 1. Objective
Add `season` and `season_type` to `public.weekly_submissions` to prevent cross-season collision, replacing the verified legacy unique index `weekly_submissions_pool_id_user_id_week_number_key` on `(pool_id, user_id, week_number)`.

### 2. Settings & Designation Storage
The designated tiebreaker game is stored inside `public.pools.settings` (`jsonb`).

> [!WARNING]
> **CORRECTION: DETROIT LIONS WEEK 6 BYE WEEK**
> In official NFL 2026 Week 6, the Detroit Lions have a **BYE** (`teamsOnBye: [CIN, DET, MIA, MIN]`).
> Per `weeklyDesignationService.ts`:
> - Rule 2: If exactly one eligible Lions game exists -> `DEFAULT_LIONS`.
> - Rule 3: If Detroit has a bye or no Lions game exists -> `COMMISSIONER_SELECTION_REQUIRED`.
> The earlier draft example labeling `401872995` (SEA @ DEN) as `DEFAULT_LIONS` was **DEFECTIVE AND RETRACTED**. An event that is not a Detroit Lions game must never be represented as an automatically designated Lions game.

Correct storage representation for Week 6:
```json
{
  "season_tiebreaker_config": {
    "2026": {
      "6": {
        "status": "COMMISSIONER_SELECTION_REQUIRED",
        "game_id": null,
        "provenance": null,
        "is_frozen": false,
        "reason": "Detroit Lions have a bye week in 2026 Week 6. Commissioner selection required."
      }
    }
  }
}
```
Or when the commissioner designates an eligible Week 6 game (e.g. DAL @ GB):
```json
{
  "season_tiebreaker_config": {
    "2026": {
      "6": {
        "status": "COMMISSIONER_OVERRIDE",
        "game_id": "401873007",
        "provenance": "COMMISSIONER_OVERRIDE",
        "is_frozen": false,
        "designated_by": "00000000-0000-0000-0000-000000000001",
        "designated_at": "2026-10-16T12:00:00Z"
      }
    }
  }
}
```
`public.pool_settings` does NOT exist. Storing within `pools.settings` preserves transactionality and eliminates orphan relations.

### 3. Phased Index Migration Sequence (Nonexecuted)
```sql
-- Step 1: Add season columns with defaults
ALTER TABLE public.weekly_submissions
  ADD COLUMN IF NOT EXISTS season integer DEFAULT 2026 NOT NULL,
  ADD COLUMN IF NOT EXISTS season_type integer DEFAULT 2 NOT NULL;

-- Step 2: Create concurrent replacement unique index
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

## Proposal D — Settlement Records & Penalty Ledger Attribution

### 1. Objective
Establish `public.weekly_wrapups` with composite primary key `(pool_id, season, week_number)`. Extend `public.penalty_ledger` with season attribution and a unique partial index to guarantee exactly one penalty charge per member per week.

### 2. DDL Specification (Nonexecuted)
```sql
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

CREATE POLICY "Allow service role manage weekly wrapups"
  ON public.weekly_wrapups FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 2: Add season column to penalty_ledger
ALTER TABLE public.penalty_ledger
  ADD COLUMN IF NOT EXISTS season integer DEFAULT 2026 NOT NULL,
  ADD COLUMN IF NOT EXISTS settlement_attribution text NULL;

-- Step 3: Settlement charge uniqueness index (prevents double-billing)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_penalty_ledger_settlement_unique
  ON public.penalty_ledger (pool_id, user_id, season, week_number)
  WHERE reason LIKE 'WEEKLY_SETTLEMENT%' OR reason LIKE 'DEAD_PLACE_MONARCH%';
```

### 3. Settlement & Recovery Invariants
- **Atomic Claim**: `INSERT INTO public.weekly_wrapups (pool_id, season, week_number, applied_by, input_fingerprint, accepted_revision) VALUES (...) ON CONFLICT (pool_id, season, week_number) DO NOTHING RETURNING pool_id, season, week_number;`
- **Zero Retries with Additional Charges**: If a week was already settled, `ON CONFLICT` returns 0 rows and the transaction exits idempotently with `ALREADY_SETTLED`.
- **Rollback Protocol**: Committed settlement markers are NEVER deleted. If an erroneous settlement must be corrected, an offsetting reversal entry is inserted into `penalty_ledger`:
  `delta = -original_delta`, `reason = 'REVERSAL_WEEKLY_SETTLEMENT_S2026_W6_RANK_...'`.

---

## Proposal E — Direct Supabase Pick Security, Grants & Trigger Guards

### 1. Objective
Eliminate over-permissive `Allow authenticated read picks` (`FOR SELECT USING (true)`) and `Allow user upsert own picks`, establishing strict authenticated ownership, active pool membership, and kickoff lock enforcement while preserving the direct Supabase client pick-save flow.

### 2. DDL, RLS & Trigger Guard Transition (Nonexecuted)
```sql
-- Step 1: Drop over-permissive live policies
DROP POLICY IF EXISTS "Allow authenticated read picks" ON public.picks;
DROP POLICY IF EXISTS "Allow user upsert own picks" ON public.picks;
DROP POLICY IF EXISTS "Allow authenticated all picks" ON public.picks;

-- Step 2: Privacy-preserving SELECT policy
-- A member sees their own picks anytime; other members' picks ONLY after game kickoff
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

-- Step 7: Revoke unauthorized mutations on public.games from anon and authenticated
REVOKE INSERT, UPDATE, DELETE ON public.games FROM anon, authenticated;
GRANT SELECT ON public.games TO anon, authenticated;
```

---

## 6. Staged Production Cutover & Security-Preserving Forward Recovery Plan

### 6.1 Cutover Staging & Architectural Prerequisites
The cutover must follow a strict non-destructive, staged progression:

```
Stage 1: Preflight Verification & Additive Schema (Proposals A, D part 1)
               ↓
Stage 2: Concurrent Replacement Indexes & Submission Constraint Transition (Proposals C, D part 2)
               ↓
Stage 3: Separately Approved Canonical Games Import (Proposal B)
               ↓
Stage 4: Application Cutover (Deploy New Application Code)
               ↓
Stage 5: RLS Security Cutover (Proposal E — Atomic Drop Old & Grant Granular Policies)
```

#### Detailed Stage Specifications:

1. **Stage 1: Preflight Verification & Additive Schema (Proposals A & D part 1)**
   - *Transactional DDL block*:
     - `ALTER TABLE public.games ADD COLUMN IF NOT EXISTS season integer NULL, ADD COLUMN IF NOT EXISTS season_type integer DEFAULT 2 NULL, ADD COLUMN IF NOT EXISTS week integer NULL, ADD COLUMN IF NOT EXISTS observation_time timestamptz NULL, ADD COLUMN IF NOT EXISTS manifest_revision integer NULL;`
     - `CREATE TABLE IF NOT EXISTS public.weekly_slate_manifests (...)` + RLS + grants.
     - `CREATE TABLE IF NOT EXISTS public.weekly_wrapups (...)` + RLS + grants.
     - `ALTER TABLE public.penalty_ledger ADD COLUMN IF NOT EXISTS season integer DEFAULT 2026 NOT NULL, ADD COLUMN IF NOT EXISTS settlement_attribution text NULL;`
   - *Application Compatibility*: Existing releases (v41/v73) operate with 100% compatibility because all new columns are nullable or have defaults.
   - *Settlement Invariant*: Official settlement fails closed (`CLAIM_STORE_UNAVAILABLE` or `AUTHORITATIVE_SLATE_UNAVAILABLE`) until a verified slate manifest and canonical games exist.
   - *Recovery*: If Stage 1 fails during execution, transaction rolls back automatically before commit. Once committed, additive columns and empty tables are harmless and do not need to be dropped.

2. **Stage 2: Concurrent Replacement Indexes & Submission Constraint Transition (Proposal C & Proposal D part 2)**
   - *Non-transactional / Concurrent Index DDL* (executed individually outside multi-statement transactions):
     - `ALTER TABLE public.weekly_submissions ADD COLUMN IF NOT EXISTS season integer DEFAULT 2026 NOT NULL, ADD COLUMN IF NOT EXISTS season_type integer DEFAULT 2 NOT NULL;`
     - `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS weekly_submissions_pool_season_week_user_idx ON public.weekly_submissions (pool_id, season, season_type, week_number, user_id);`
     - Verify index validity: `SELECT indisvalid FROM pg_index WHERE indexrelid = 'weekly_submissions_pool_season_week_user_idx'::regclass;`
     - `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_penalty_ledger_settlement_unique ON public.penalty_ledger (pool_id, user_id, season, week_number) WHERE reason LIKE 'WEEKLY_SETTLEMENT%' OR reason LIKE 'DEAD_PLACE_MONARCH%';`
     - Verify validity.
     - Atomically drop legacy constraint: `ALTER TABLE public.weekly_submissions DROP CONSTRAINT IF EXISTS weekly_submissions_pool_id_user_id_week_number_key;`
     - Attach table constraint: `ALTER TABLE public.weekly_submissions ADD CONSTRAINT weekly_submissions_pool_season_week_user_key UNIQUE USING INDEX weekly_submissions_pool_season_week_user_idx;`
   - *Duplicate-Write Protection*: The new index is built concurrently while the old constraint remains active; the transition is gapless.
   - *Recovery*: If concurrent index build fails (e.g. deadlocks), drop the invalid index concurrently (`DROP INDEX CONCURRENTLY`) and re-run. Do not drop existing submission rows.

3. **Stage 3: Separately Approved Canonical Games Import (Proposal B)**
   - *Audited Data Operation*:
     - Synchronize authoritative 14 NFL events for Week 6 (`401872995`..`401873008`) from verified ESPN provider capture.
     - Legacy 16 records (`401872964`..`401872979`) are untouched (0 modifications, verified by row hash pre/post check).
     - Joins all 80 existing Week 6 test picks across 9 events.
   - *Recovery*: If import fails, transaction rolls back. If an event has incorrect kickoff, update via authoritative provider reconciliation, not destructive row deletion.

4. **Stage 4: Application Cutover (Deploy New Application Code)**
   - Deploy backend and client code.
   - New code validates manifests, uses season-aware submission keys, and binds wrapup engine to composite keys.
   - All direct pick saves from client continue using existing Supabase client path with `(pool_id, user_id, game_id)`.

5. **Stage 5: RLS Security Cutover (Proposal E)**
   - *Atomic RLS Replacement*:
     - Execute inside single DDL script:
       - Drop old policies: `DROP POLICY IF EXISTS "Allow authenticated read picks" ON public.picks; DROP POLICY IF EXISTS "Allow user upsert own picks" ON public.picks;`
       - Create new granular policies: `picks_select_pool_member_policy`, `picks_insert_policy`, `picks_update_policy`, `picks_delete_policy`.
       - Create immutability and kickoff trigger guard `trg_check_pick_kickoff_and_immutability`.
       - Issue schema reload: `NOTIFY pgrst, 'reload schema';`
   - *Zero Permissive OR Window*: The old policies are dropped and new policies created in the same transaction block, eliminating any window where an insecure permissive OR policy exists.
   - *Preservation*: Member picks submitted before kickoff are accepted; member picks submitted after kickoff fail closed; other members cannot read unkicked picks.

### 6.2 Security-Preserving Forward Recovery Invariants
- **No Insecure Rollback**: In the event of an operational anomaly after Stage 5, the system must **NEVER** reinstate `Allow authenticated read picks` (`FOR SELECT USING (true)`) or `Allow user upsert own picks` (which lacked kickoff guards). Doing so would re-open pre-kickoff opponent pick leakage and post-kickoff modification escapes.
- **No Destructive Drops**: Tables (`weekly_wrapups`, `weekly_slate_manifests`), columns (`season`, `week`), manifests, accepted picks, or committed settlement entries containing user or financial state are **NEVER DROPPED**.
- **Financial & Settlement Invariance**: Committed settlement markers in `weekly_wrapups` are permanent. If an erroneous settlement must be compensated, reviewed offsetting reversal entries are inserted into `penalty_ledger` (`delta = -original_delta` with audit reason).
- **Stop Condition Supremacy**: Any operational condition requiring unvetted destructive reversal SQL is an immediate **STOP CONDITION**.
```
