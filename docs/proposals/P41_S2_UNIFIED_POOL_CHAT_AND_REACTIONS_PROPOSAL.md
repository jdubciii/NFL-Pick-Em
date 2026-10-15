# Phase 41 Sprint 2 (P41-S2) Architectural Proposal: Unified Pool Chat & Canonical Reactions

## 1. Executive Summary & Authorizing Context
- **Target Milestone**: Phase 41 Sprint 2 (`P41-S2`)
- **Authorizing Ruling**: `P40-S1-CLOSE-2026-10-14-01`
- **Scope & Purpose**: Provide the authoritative additive DDL, Prisma schema extensions, and Row Level Security (RLS) policies for:
  1. **Canonical Shared Reactions** across canonical games, settled weekly recaps, penalty reels, and chat messages.
  2. **SMS-Style Unified Pool Group Chat & Threaded Conversations**, enabling live banter, game-specific threads, and settled verdict discussion within authenticated pool boundaries.
- **Invariants Maintained**:
  - Zero mock data policy (all messages & reactions bound to authenticated pool members).
  - Decision #54 (No writes on GET; idempotent mutation semantics).
  - Decision #55 (Fail-closed RLS; unauthenticated users or non-members cannot read or post).
  - Decision #66 (Kickoff lock supremacy; banter does not affect pick lock enforcement).
  - Zero DDL executed in `P41-S1`; this document acts as the formal design contract for `P41-S2`.

---

## 2. Table Specifications & PostgreSQL DDL

### 2.1 Table 1: `public.pool_messages`
Stores pool-wide lounge chat messages as well as contextual threads attached to specific games, settled recaps, or penalty videos.

```sql
-- Create pool_messages table
CREATE TABLE IF NOT EXISTS public.pool_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL REFERENCES public.pools(id) ON DELETE CASCADE,
    author_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    parent_message_id UUID NULL REFERENCES public.pool_messages(id) ON DELETE CASCADE,
    target_kind TEXT NOT NULL CHECK (target_kind IN ('POOL_LOUNGE', 'CANONICAL_GAME', 'SETTLED_RECAP', 'PENALTY_REEL')),
    target_entity_id TEXT NULL,
    season INT NOT NULL DEFAULT 2026,
    week INT NOT NULL,
    body TEXT NOT NULL CHECK (char_length(trim(body)) > 0 AND char_length(body) <= 2000),
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pool_messages_feed 
    ON public.pool_messages (pool_id, target_kind, target_entity_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_pool_messages_author 
    ON public.pool_messages (author_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pool_messages_parent 
    ON public.pool_messages (parent_message_id) 
    WHERE parent_message_id IS NOT NULL;
```

### 2.2 Table 2: `public.pool_reactions`
Stores canonical 1-click emoji reactions (`CALLED_IT`, `COLD`, `PAIN`, `PIT_BOUND`, etc.) keyed by pool, season, week, target kind, and target entity ID. Strictly enforces 1 reaction per member per target via a unique composite index.

```sql
-- Create pool_reactions table
CREATE TABLE IF NOT EXISTS public.pool_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL REFERENCES public.pools(id) ON DELETE CASCADE,
    actor_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    season INT NOT NULL DEFAULT 2026,
    week INT NOT NULL,
    target_kind TEXT NOT NULL CHECK (target_kind IN ('CANONICAL_GAME', 'SETTLED_RECAP', 'POOL_CHAT_MESSAGE', 'PENALTY_REEL')),
    target_entity_id TEXT NOT NULL,
    settlement_revision INT NULL,
    reaction_code TEXT NOT NULL CHECK (reaction_code IN ('CALLED_IT', 'COLD', 'PAIN', 'PIT_BOUND')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_pool_reaction_target_actor 
        UNIQUE (pool_id, season, week, target_kind, target_entity_id, actor_user_id)
);

-- Index for target-scoped reaction aggregation
CREATE INDEX IF NOT EXISTS idx_pool_reactions_aggregation 
    ON public.pool_reactions (pool_id, season, week, target_kind, target_entity_id, reaction_code);

CREATE INDEX IF NOT EXISTS idx_pool_reactions_actor 
    ON public.pool_reactions (actor_user_id, created_at DESC);
```

---

## 3. Row Level Security (RLS) & Multi-Tenant Authorization

Both tables implement fail-closed Row Level Security ensuring only **ACTIVE** pool members can read or write data for their respective pool.

```sql
-- Enable RLS
ALTER TABLE public.pool_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_reactions ENABLE ROW LEVEL SECURITY;

-- 1. Helper function: verify active pool membership
CREATE OR REPLACE FUNCTION public.is_active_pool_member(p_pool_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.pool_memberships 
        WHERE pool_id = p_pool_id 
          AND user_id = p_user_id 
          AND status = 'ACTIVE'
    );
$$;

-- 2. RLS Policies for pool_messages
CREATE POLICY "Active pool members can read pool messages"
    ON public.pool_messages
    FOR SELECT
    USING (
        auth.role() = 'service_role' OR
        public.is_active_pool_member(pool_id, auth.uid())
    );

CREATE POLICY "Active pool members can insert pool messages"
    ON public.pool_messages
    FOR INSERT
    WITH CHECK (
        auth.role() = 'service_role' OR (
            auth.uid() = author_user_id AND
            public.is_active_pool_member(pool_id, auth.uid())
        )
    );

CREATE POLICY "Authors or admins can delete their pool messages"
    ON public.pool_messages
    FOR DELETE
    USING (
        auth.role() = 'service_role' OR
        auth.uid() = author_user_id OR
        EXISTS (
            SELECT 1 FROM public.pool_memberships 
            WHERE pool_id = pool_messages.pool_id 
              AND user_id = auth.uid() 
              AND role = 'ADMIN'
        )
    );

-- 3. RLS Policies for pool_reactions
CREATE POLICY "Active pool members can read pool reactions"
    ON public.pool_reactions
    FOR SELECT
    USING (
        auth.role() = 'service_role' OR
        public.is_active_pool_member(pool_id, auth.uid())
    );

CREATE POLICY "Active pool members can insert/update pool reactions"
    ON public.pool_reactions
    FOR ALL
    USING (
        auth.role() = 'service_role' OR (
            auth.uid() = actor_user_id AND
            public.is_active_pool_member(pool_id, auth.uid())
        )
    )
    WITH CHECK (
        auth.role() = 'service_role' OR (
            auth.uid() = actor_user_id AND
            public.is_active_pool_member(pool_id, auth.uid())
        )
    );
```

---

## 4. Prisma Schema Additions (for `prisma/schema.prisma`)

```prisma
model PoolMessage {
  id               String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  poolId           String        @map("pool_id") @db.Uuid
  authorUserId     String        @map("author_user_id") @db.Uuid
  parentMessageId  String?       @map("parent_message_id") @db.Uuid
  targetKind       String        @map("target_kind") // 'POOL_LOUNGE' | 'CANONICAL_GAME' | 'SETTLED_RECAP' | 'PENALTY_REEL'
  targetEntityId   String?       @map("target_entity_id")
  season           Int           @default(2026)
  week             Int
  body             String
  isPinned         Boolean       @default(false) @map("is_pinned")
  createdAt        DateTime      @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt        DateTime      @default(now()) @map("updated_at") @db.Timestamptz(6)

  pool             Pool          @relation(fields: [poolId], references: [id], onDelete: Cascade)
  author           User          @relation(fields: [authorUserId], references: [id], onDelete: Cascade)
  parentMessage    PoolMessage?  @relation("ThreadReplies", fields: [parentMessageId], references: [id], onDelete: Cascade)
  replies          PoolMessage[] @relation("ThreadReplies")

  @@index([poolId, targetKind, targetEntityId, createdAt])
  @@index([authorUserId, createdAt])
  @@map("pool_messages")
}

model PoolReaction {
  id                 String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  poolId             String    @map("pool_id") @db.Uuid
  actorUserId        String    @map("actor_user_id") @db.Uuid
  season             Int       @default(2026)
  week               Int
  targetKind         String    @map("target_kind") // 'CANONICAL_GAME' | 'SETTLED_RECAP' | 'POOL_CHAT_MESSAGE' | 'PENALTY_REEL'
  targetEntityId     String    @map("target_entity_id")
  settlementRevision Int?      @map("settlement_revision")
  reactionCode       String    @map("reaction_code") // 'CALLED_IT' | 'COLD' | 'PAIN' | 'PIT_BOUND'
  createdAt          DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt          DateTime  @default(now()) @map("updated_at") @db.Timestamptz(6)

  pool               Pool      @relation(fields: [poolId], references: [id], onDelete: Cascade)
  actor              User      @relation(fields: [actorUserId], references: [id], onDelete: Cascade)

  @@unique([poolId, season, week, targetKind, targetEntityId, actorUserId], name: "uq_pool_reaction_target_actor")
  @@index([poolId, season, week, targetKind, targetEntityId, reactionCode])
  @@index([actorUserId, createdAt])
  @@map("pool_reactions")
}
```

---

## 5. Integration with `P41-S1` Client Foundation

1. **Target Key Compatibility**:
   - `poolSocialService.validateCanonicalReactionTarget()` constructs canonical keys:
     `rx::{poolId}::s{season}::w{week}::{targetKind}::{entityId}[::rev:{rev}]`
   - In `P41-S2`, the backend endpoint `POST /api/pools/:pool_id/reactions` directly maps this target payload into an `UPSERT` on `public.pool_reactions`:
     ```sql
     INSERT INTO public.pool_reactions (pool_id, actor_user_id, season, week, target_kind, target_entity_id, settlement_revision, reaction_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (pool_id, season, week, target_kind, target_entity_id, actor_user_id)
     DO UPDATE SET reaction_code = EXCLUDED.reaction_code, updated_at = now();
     ```
   - When a user selects an already-active reaction code, it sends `DELETE FROM public.pool_reactions ...` (toggle off).

2. **Group Chat Stream & Realtime**:
   - Realtime channel: `supabase.channel('pool_chat:${poolId}')` listens to `INSERT` and `DELETE` events on `public.pool_messages` and `public.pool_reactions`.
   - Client views (`MatrixPage`, `WeeklyRecapCardView`, `RadarPage`, and new `PoolLoungeModal`) query and subscribe seamlessly to the single unified real-time feed.

3. **Receipt Exclusions**:
   - Device-local session receipts (`receipt-*`, `session-*`, `dl::*`) remain strictly local and are rejected by both client validation and backend API gates, preserving privacy and database cleanliness.
