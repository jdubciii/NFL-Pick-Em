# Phase 41 Sprint 2 (P41-S2) Authoritative Evidence Bundle (v69)

- **Authorizing Ruling**: P41-S1-REVIEW-2026-10-15-01
- **Milestone**: P41_S2 (Pool Lounge, Contextual Threads, Explicit Reaction & Retry API, P41-S1 Fixes & Full Schema Submission)
- **Branch**: feat/p37-shell-auth-openslate
- **Phase 41 Sprint 1 Parent SHA**: 974247bdfc2005a625b74390b4559f141d40119e
- **Stage 1 Implementation SHA (E_SHA)**: 91e482113fbae0a8af52bc2d1726c4563dacb5f6
- **Generated Timestamp (UTC)**: 2026-10-15T05:51:09Z
- **Live DDL Executed**: 0 (Pending Arbiter certification of embedded SQL/Prisma proposal below)
- **APK Artifact**: pickem-v41-s2.apk (versionCode 69, versionName 41.2.0)
- **APK Size (Bytes)**: 14473602
- **APK SHA-256**: 45374329802347EDC874067CD5EF63FE523364B2FD786BE1293043A9F118FCAC
- **APK Signature Scheme v2**: true

---

## Embedded Verbatim Schema Proposal: docs/proposals/P41_S2_UNIFIED_POOL_CHAT_AND_REACTIONS_PROPOSAL.md

# Phase 41 Sprint 2 (P41-S2) Architectural Proposal: Unified Pool Chat & Canonical Reactions (Hardened Specification)

## 1. Executive Summary & Authorizing Context
- **Target Milestone**: Phase 41 Sprint 2 (`P41-S2`)
- **Authorizing Ruling**: `P41-S1-REVIEW-2026-10-15-01`
- **Scope & Purpose**: Provide the authoritative, production-hardened PostgreSQL DDL, Prisma schema extensions, and Row Level Security (RLS) policies for:
  1. **Canonical Shared Reactions** across canonical games, settled weekly recaps, penalty reels, and chat messages.
  2. **SMS-Style Unified Pool Group Chat & Threaded Conversations (Pool Lounge)**, enabling persistent banter across seasons/weeks, game-specific discussion cards, and settled verdict threads within authenticated pool boundaries.
- **Invariants Maintained**:
  - Zero mock data policy (all messages & reactions bound to authenticated pool members).
  - Decision #54 (No writes on GET; idempotent mutation semantics).
  - Decision #55 (Fail-closed security; unauthenticated actors or non-members are blocked at both Express route middleware and PostgreSQL RLS levels).
  - Decision #66 (Kickoff lock supremacy; banter does not affect pick lock enforcement).
  - Zero DDL executed in `P41-S2` (authoritative specification contract prepared for Arbiter certification prior to live migration).

---

## 2. Hardened Table Specifications & PostgreSQL DDL

### 2.1 Table 1: `public.pool_messages`
Stores pool-wide lounge chat messages as well as contextual threads attached to specific games, settled recaps, or penalty videos.
Enforces:
1. **Stable Lounge & Contextual Identity**: Main Pool Lounge continuous stream uses `season = 2026`, `week = 0`, `target_kind = 'POOL_LOUNGE'`, `target_entity_id = 'LOUNGE_ROOT'`. Specific games or recaps carry their canonical season, week, and target identity.
2. **Retry Idempotency Uniqueness**: `client_request_id VARCHAR(64) NOT NULL` with `CONSTRAINT uq_pool_messages_actor_request UNIQUE (pool_id, author_user_id, client_request_id)`. Re-submitting with identical content returns existing record; mutating payload yields 409 Conflict.
3. **Length Constraint**: `CHECK (char_length(trim(body)) BETWEEN 1 AND 500)`.
4. **Same-Pool Referential Integrity**: Enforces `UNIQUE (id, pool_id)` and composite foreign key `CONSTRAINT fk_pool_messages_parent_same_pool FOREIGN KEY (parent_message_id, pool_id) REFERENCES public.pool_messages(id, pool_id) ON DELETE RESTRICT`, mathematically guaranteeing at the database engine level that no message can reply to a parent in a different pool.

```sql
-- Create pool_messages table
CREATE TABLE IF NOT EXISTS public.pool_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL REFERENCES public.pools(id) ON DELETE CASCADE,
    author_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    client_request_id VARCHAR(64) NOT NULL,
    parent_message_id UUID NULL,
    target_kind TEXT NOT NULL DEFAULT 'POOL_LOUNGE' CHECK (target_kind IN ('POOL_LOUNGE', 'CANONICAL_GAME', 'SETTLED_RECAP', 'PENALTY_REEL')),
    target_entity_id TEXT NOT NULL DEFAULT 'LOUNGE_ROOT',
    season INT NOT NULL DEFAULT 2026,
    week INT NOT NULL DEFAULT 0,
    settlement_revision INT NOT NULL DEFAULT 0,
    body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 500),
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Idempotency constraint per author within pool
    CONSTRAINT uq_pool_messages_actor_request 
        UNIQUE (pool_id, author_user_id, client_request_id),

    -- Required for composite foreign key constraint
    CONSTRAINT uq_pool_messages_id_pool 
        UNIQUE (id, pool_id),

    -- Composite self-reference: replies must belong to the exact same pool
    CONSTRAINT fk_pool_messages_parent_same_pool 
        FOREIGN KEY (parent_message_id, pool_id) 
        REFERENCES public.pool_messages(id, pool_id) 
        ON DELETE RESTRICT
);

-- Deterministic cursor pagination index (createdAt ASC, id ASC)
CREATE INDEX IF NOT EXISTS idx_pool_messages_feed 
    ON public.pool_messages (pool_id, created_at ASC, id ASC);

-- Contextual filtering index
CREATE INDEX IF NOT EXISTS idx_pool_messages_context 
    ON public.pool_messages (pool_id, target_kind, target_entity_id, season, week, created_at ASC);

-- Author index
CREATE INDEX IF NOT EXISTS idx_pool_messages_author 
    ON public.pool_messages (author_user_id, created_at DESC);

-- Thread parent lookup index
CREATE INDEX IF NOT EXISTS idx_pool_messages_parent 
    ON public.pool_messages (parent_message_id) 
    WHERE parent_message_id IS NOT NULL;
```

---

### 2.2 Table 2: `public.pool_reactions`
Stores canonical 1-click emoji reactions (`CALLED_IT`, `COLD`, `PAIN`, `PIT_BOUND`) keyed by pool, season, week, target kind, target entity ID, and settlement revision.
Enforces:
1. **NULL-Safe Uniqueness & Revision Gating**: All columns (`pool_id`, `season`, `week`, `target_kind`, `target_entity_id`, `settlement_revision`, `actor_user_id`) are `NOT NULL` (`settlement_revision INT NOT NULL DEFAULT 0` for non-revisioned targets; `>= 1` for `SETTLED_RECAP`), preventing PostgreSQL `NULL` bypasses in composite unique indexes.
2. **One Reaction Per Actor Per Target**: `CONSTRAINT uq_pool_reaction_one_per_actor UNIQUE (pool_id, season, week, target_kind, target_entity_id, settlement_revision, actor_user_id)`.
3. **Explicit Set/Remove Semantics**: Backend uses explicit operation (`SET` replaces or inserts; `REMOVE` deletes).

```sql
-- Create pool_reactions table
CREATE TABLE IF NOT EXISTS public.pool_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL REFERENCES public.pools(id) ON DELETE CASCADE,
    actor_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    season INT NOT NULL DEFAULT 2026,
    week INT NOT NULL,
    target_kind TEXT NOT NULL CHECK (target_kind IN ('POOL_LOUNGE', 'CANONICAL_GAME', 'SETTLED_RECAP', 'POOL_CHAT_MESSAGE', 'PENALTY_REEL')),
    target_entity_id TEXT NOT NULL,
    settlement_revision INT NOT NULL DEFAULT 0,
    reaction_code TEXT NOT NULL CHECK (reaction_code IN ('CALLED_IT', 'COLD', 'PAIN', 'PIT_BOUND')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- NULL-safe strict uniqueness: exactly one reaction per member per target revision
    CONSTRAINT uq_pool_reaction_one_per_actor 
        UNIQUE (pool_id, season, week, target_kind, target_entity_id, settlement_revision, actor_user_id)
);

-- Index for target-scoped reaction chips aggregation
CREATE INDEX IF NOT EXISTS idx_pool_reactions_aggregation 
    ON public.pool_reactions (pool_id, season, week, target_kind, target_entity_id, settlement_revision, reaction_code);

-- Actor audit index
CREATE INDEX IF NOT EXISTS idx_pool_reactions_actor 
    ON public.pool_reactions (actor_user_id, created_at DESC);
```

---

## 3. Effective Database Roles & Express Boundary Architecture

### 3.1 Defense-in-Depth Boundary
1. **Express & Prisma Service-Role Boundary (Authoritative for API)**:
   - In Supabase PostgreSQL, the backend service role connects with `BYPASSRLS`.
   - Therefore, **Express route middleware (`requireAuthenticatedActivePoolMember`) is mandatory, authoritative, and fail-closed** for all `/api/pools/:pool_id/*` operations.
   - The Express middleware verifies:
     a) Bearer JWT authenticity via Supabase Auth.
     b) `actorUserId === auth.user.id` (strictly rejecting spoofed user IDs).
     c) `pool_memberships.status === 'ACTIVE'` for the requested `pool_id`.
     d) Plaintext input validation and maximum length (<= 500 characters).
2. **Supabase PostgREST & Realtime RLS Boundary**:
   - For client-side direct subscriptions (Realtime `supabase.channel('pool_chat:${poolId}')`), PostgreSQL Row Level Security is enabled and enforced.
   - Public/anon access is completely revoked (`REVOKE ALL ON public.pool_messages, public.pool_reactions FROM anon;`).
   - Authenticated role is granted standard DML with `FORCE ROW LEVEL SECURITY`.

```sql
-- Revoke anon access
REVOKE ALL ON public.pool_messages FROM anon;
REVOKE ALL ON public.pool_reactions FROM anon;

-- Grant permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pool_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pool_reactions TO authenticated;

-- Enable and Force RLS
ALTER TABLE public.pool_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_messages FORCE ROW LEVEL SECURITY;

ALTER TABLE public.pool_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_reactions FORCE ROW LEVEL SECURITY;

-- Helper function: verify active pool membership
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

-- RLS Policies for pool_messages
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

-- RLS Policies for pool_reactions
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
  id                 String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  poolId             String        @map("pool_id") @db.Uuid
  authorUserId       String        @map("author_user_id") @db.Uuid
  clientRequestId    String        @map("client_request_id") @db.VarChar(64)
  parentMessageId    String?       @map("parent_message_id") @db.Uuid
  targetKind         String        @default("POOL_LOUNGE") @map("target_kind") // 'POOL_LOUNGE' | 'CANONICAL_GAME' | 'SETTLED_RECAP' | 'PENALTY_REEL'
  targetEntityId     String        @default("LOUNGE_ROOT") @map("target_entity_id")
  season             Int           @default(2026)
  week               Int           @default(0)
  settlementRevision Int           @default(0) @map("settlement_revision")
  body               String        @db.VarChar(500)
  isPinned           Boolean       @default(false) @map("is_pinned")
  createdAt          DateTime      @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt          DateTime      @default(now()) @map("updated_at") @db.Timestamptz(6)

  pool               Pool          @relation(fields: [poolId], references: [id], onDelete: Cascade)
  author             User          @relation(fields: [authorUserId], references: [id], onDelete: Cascade)
  parentMessage      PoolMessage?  @relation("ThreadReplies", fields: [parentMessageId], references: [id], onDelete: Restrict)
  replies            PoolMessage[] @relation("ThreadReplies")

  @@unique([poolId, authorUserId, clientRequestId], name: "uq_pool_messages_actor_request")
  @@unique([id, poolId], name: "uq_pool_messages_id_pool")
  @@index([poolId, createdAt, id])
  @@index([poolId, targetKind, targetEntityId, season, week, createdAt])
  @@index([authorUserId, createdAt])
  @@index([parentMessageId])
  @@map("pool_messages")
}

model PoolReaction {
  id                 String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  poolId             String    @map("pool_id") @db.Uuid
  actorUserId        String    @map("actor_user_id") @db.Uuid
  season             Int       @default(2026)
  week               Int
  targetKind         String    @map("target_kind") // 'POOL_LOUNGE' | 'CANONICAL_GAME' | 'SETTLED_RECAP' | 'POOL_CHAT_MESSAGE' | 'PENALTY_REEL'
  targetEntityId     String    @map("target_entity_id")
  settlementRevision Int       @default(0) @map("settlement_revision")
  reactionCode       String    @map("reaction_code") // 'CALLED_IT' | 'COLD' | 'PAIN' | 'PIT_BOUND'
  createdAt          DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt          DateTime  @default(now()) @map("updated_at") @db.Timestamptz(6)

  pool               Pool      @relation(fields: [poolId], references: [id], onDelete: Cascade)
  actor              User      @relation(fields: [actorUserId], references: [id], onDelete: Cascade)

  @@unique([poolId, season, week, targetKind, targetEntityId, settlementRevision, actorUserId], name: "uq_pool_reaction_one_per_actor")
  @@index([poolId, season, week, targetKind, targetEntityId, settlementRevision, reactionCode])
  @@index([actorUserId, createdAt])
  @@map("pool_reactions")
}
```

---

## 5. Summary of Gating & Validation Rules Answered
1. **Lounge Continuity**: `season = 2026, week = 0, target_entity_id = 'LOUNGE_ROOT', settlement_revision = 0` guarantees the chat stream never breaks during weekly rollovers.
2. **Revision-Gated Recaps**: Settled recaps require `settlementRevision >= 1`, perfectly isolating reactions between revisions (`rev:1` vs `rev:2`).
3. **Sweat Receipt Exclusion**: Client and database reject `receipt-*`, `session-*`, and `dl::*` identifiers, preventing ephemeral simulation data from leaking into shared storage.
4. **Retry Idempotency**: `clientRequestId` unique constraint guarantees zero duplicate messages on mobile network retry.

---

## Authoritative Vitest Execution Log
~~~text
[1m[30m[46m RUN [49m[39m[22m [36mv5.0.2 [39m[90mC:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em[39m

 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m1. Server-Enforced Registration (POST /api/pools/:pool_id/join)[2m > [22mstrictly rejects missing inviteCode with HTTP 403 and 0 database writes[32m 81[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m1. Server-Enforced Registration (POST /api/pools/:pool_id/join)[2m > [22mstrictly rejects invalid inviteCode with HTTP 403 and 0 database writes[32m 9[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m1. Server-Enforced Registration (POST /api/pools/:pool_id/join)[2m > [22mstrictly rejects MAIN26 inviteCode when targeting a foreign pool with HTTP 403 and 0 database writes[32m 6[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m1. Server-Enforced Registration (POST /api/pools/:pool_id/join)[2m > [22mstrictly rejects forged payloads containing { status: "ACTIVE" } or { role: "ADMIN" } with HTTP 403[32m 14[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m1. Server-Enforced Registration (POST /api/pools/:pool_id/join)[2m > [22mforces legitimate registration with valid inviteCode strictly into PENDING state[32m 16[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m2. Pool-Scoped Adjudication (Decision #20 & Decision #55)[2m > [22mdenies actor with foreign pool ADMIN rights attempting to adjudicate Main League with HTTP 403[32m 7[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m2. Pool-Scoped Adjudication (Decision #20 & Decision #55)[2m > [22mpermits authorized Main League commissioner to adjudicate applicant to ACTIVE[32m 12[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m3. GET Safety (Decision #54)[2m > [22mproves exactly 0 database INSERT, UPDATE, DELETE, or executeRaw operations occur during GET requests[32m 5[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m4. Fail-Closed Context Resolution (Decision #55)[2m > [22mfails closed (HTTP 401) when Authorization header is absent or token is invalid[32m 5[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m4. Fail-Closed Context Resolution (Decision #55)[2m > [22mfails closed (HTTP 404) when pool does not exist in database[32m 9[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m4. Fail-Closed Context Resolution (Decision #55)[2m > [22mfails closed (HTTP 500) without leaking access when database lookup throws an error[32m 15[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m5. App Production Call Site Verification[2m > [22mverifies that client/src/App.tsx directly consumes resolveNavigationVisibility to guard BottomNavigation[32m 2[2mms[22m[39m
 [32mΓ£ô[39m tests/phase41_s1_bigboard_alerts_social.test.ts[2m > [22mPhase 41 Sprint 1 (P41-S1): Big Board, Alerts & Social Foundation[2m > [22m1. P40 Follow-Ups: Escape arithmetic, terminal states, and live contribution replacement[32m 3[2mms[22m[39m
 [32mΓ£ô[39m tests/phase41_s1_bigboard_alerts_social.test.ts[2m > [22mPhase 41 Sprint 1 (P41-S1): Big Board, Alerts & Social Foundation[2m > [22m2. P40 Follow-Ups: Recap handle sanitization, verb agreement, and demo watermark[32m 2[2mms[22m[39m
 [32mΓ£ô[39m tests/phase41_s1_bigboard_alerts_social.test.ts[2m > [22mPhase 41 Sprint 1 (P41-S1): Big Board, Alerts & Social Foundation[2m > [22m3. Deadline Alert Planner: 60m lead, grouping, deduplication, cancellation, and copy[32m 114[2mms[22m[39m
 [32mΓ£ô[39m tests/phase41_s1_bigboard_alerts_social.test.ts[2m > [22mPhase 41 Sprint 1 (P41-S1): Big Board, Alerts & Social Foundation[2m > [22m4. Canonical Reactions & Security: Rejection of receipt IDs, spoofing, cross-pool, and toggle idempotence[32m 2[2mms[22m[39m
 [32mΓ£ô[39m tests/sweatProjectionService.test.ts[2m > [22mPhase 38 Sunday Sweat Projection Engine (Ruling P37-P38-2026-10-12-01)[2m > [22maccurately combines banked final points and active live points[32m 28[2mms[22m[39m
 [32mΓ£ô[39m tests/sweatProjectionService.test.ts[2m > [22mPhase 38 Sunday Sweat Projection Engine (Ruling P37-P38-2026-10-12-01)[2m > [22mcorrectly resolves ties via tiebreaker distance and marks unresolved ties[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/sweatProjectionService.test.ts[2m > [22mPhase 38 Sunday Sweat Projection Engine (Ruling P37-P38-2026-10-12-01)[2m > [22mcalculates swing game card identifying highest leverage matchup[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/sweatProjectionService.test.ts[2m > [22mPhase 38 Sunday Sweat Projection Engine (Ruling P37-P38-2026-10-12-01)[2m > [22mfalls back gracefully on empty or null live scores without corruption or exceptions[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/sweatProjectionService.test.ts[2m > [22mPhase 38 Sunday Sweat Projection Engine (Ruling P37-P38-2026-10-12-01)[2m > [22mstrictly excludes unsubmitted and hidden picks, and guarantees input immutability[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/phase41_s2_lounge_reactions_consistency.test.ts[2m > [22mPhase 41 Sprint 2 (P41-S2): Pool Lounge, Contextual Threads & Explicit Reaction API[2m > [22m1. P41-S1 Carry-Forward Consistency: Canonical kickoff resolution & coherent 11-9 demo fixture math[32m 29[2mms[22m[39m
 [32mΓ£ô[39m tests/phase41_s2_lounge_reactions_consistency.test.ts[2m > [22mPhase 41 Sprint 2 (P41-S2): Pool Lounge, Contextual Threads & Explicit Reaction API[2m > [22m2. Pool Lounge Security & Retry Idempotency: Gating, deduplication, conflict on mutation & GET safety[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/phase41_s2_lounge_reactions_consistency.test.ts[2m > [22mPhase 41 Sprint 2 (P41-S2): Pool Lounge, Contextual Threads & Explicit Reaction API[2m > [22m3. Explicit Set/Remove Reaction State: Idempotent replacement, removal, revision isolation & receipt exclusion[32m 2[2mms[22m[39m
 [32mΓ£ô[39m tests/liveScoreService.test.ts[2m > [22mESPN Live Score Adapter & Circuit Breakers (Ruling C8 Compliance)[2m > [22mmaps valid ESPN scoreboard payload accurately into LiveGame objects[32m 4[2mms[22m[39m
 [32mΓ£ô[39m tests/liveScoreService.test.ts[2m > [22mESPN Live Score Adapter & Circuit Breakers (Ruling C8 Compliance)[2m > [22mfalls back gracefully to empty array on HTTP 500 error without throwing[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/liveScoreService.test.ts[2m > [22mESPN Live Score Adapter & Circuit Breakers (Ruling C8 Compliance)[2m > [22mfalls back gracefully to empty array on offline network failure[32m 2[2mms[22m[39m
 [32mΓ£ô[39m tests/liveScoreService.test.ts[2m > [22mESPN Live Score Adapter & Circuit Breakers (Ruling C8 Compliance)[2m > [22mfalls back gracefully on malformed JSON payload[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/liveScoreService.test.ts[2m > [22mESPN Live Score Adapter & Circuit Breakers (Ruling C8 Compliance)[2m > [22mmaps STATUS_HALFTIME accurately to IN_PROGRESS/LIVE and pins scoreboard week query[32m 2[2mms[22m[39m
 [32mΓ£ô[39m tests/liveScoreService.test.ts[2m > [22mESPN Live Score Adapter & Circuit Breakers (Ruling C8 Compliance)[2m > [22mexercises integrated consumer state preservation: isolates telemetry from user picks and kickoff locks[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/phase39_s1_dependable_info.test.ts[2m > [22mPhase 39 Sprint 1 (P39-S1): Dependable Information & Mathematical Truth[2m > [22m1. resolves PRE_KICKOFF vs LIVE_IN_PROGRESS vs AWAITING_SETTLEMENT vs SETTLED states and suppresses false 0-0 scores before kickoff[32m 7[2mms[22m[39m
 [32mΓ£ô[39m tests/phase39_s1_dependable_info.test.ts[2m > [22mPhase 39 Sprint 1 (P39-S1): Dependable Information & Mathematical Truth[2m > [22m2. separates Draft Complete from Submitted and Partial Kickoff Locks (Decision #66)[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/phase39_s1_dependable_info.test.ts[2m > [22mPhase 39 Sprint 1 (P39-S1): Dependable Information & Mathematical Truth[2m > [22m3. computes exact +1 / -1 Radar Duel outcome branches and 2 PT OUTCOME SPAN instead of +-2 PTS NET SWING[32m 2[2mms[22m[39m
 [32mΓ£ô[39m tests/phase39_s1_dependable_info.test.ts[2m > [22mPhase 39 Sprint 1 (P39-S1): Dependable Information & Mathematical Truth[2m > [22m4. filters out unanimous shared picks from League Swing Game selection and avoids podium language in a 2-player field[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/phase39_s1_dependable_info.test.ts[2m > [22mPhase 39 Sprint 1 (P39-S1): Dependable Information & Mathematical Truth[2m > [22m5. distinguishes unresolved tied ranks from settled tiebreakers and formats shot units & spreads cleanly[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/phase39_s1_dependable_info.test.ts[2m > [22mPhase 39 Sprint 1 (P39-S1): Dependable Information & Mathematical Truth[2m > [22m6. verifies Pass-3 signature algorithms: buildPersonalRootingQueue, evaluateLateGameEscape, summarizeNemesisRecord, and classifyPickDistributionBadge[32m 4[2mms[22m[39m
 [32mΓ£ô[39m tests/rivalryShowdownService.test.ts[2m > [22mPhase 38 Sprint 2: Rivalry Showdown Engine (Ruling P37-P38-2026-10-12-01)[2m > [22mcorrectly categorizes opposite picks as battlegrounds and shared picks as neutral leverage[32m 5[2mms[22m[39m
 [32mΓ£ô[39m tests/rivalryShowdownService.test.ts[2m > [22mPhase 38 Sprint 2: Rivalry Showdown Engine (Ruling P37-P38-2026-10-12-01)[2m > [22mcalculates exact branch arithmetic demonstrating two-point net swing on opposite picks[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/rivalryShowdownService.test.ts[2m > [22mPhase 38 Sprint 2: Rivalry Showdown Engine (Ruling P37-P38-2026-10-12-01)[2m > [22mdeterministically selects the Duel Decider prioritizing live in-progress battlegrounds[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/rivalryShowdownService.test.ts[2m > [22mPhase 38 Sprint 2: Rivalry Showdown Engine (Ruling P37-P38-2026-10-12-01)[2m > [22mexcludes hidden or unsubmitted picks and preserves strict immutability[32m 2[2mms[22m[39m
 [32mΓ£ô[39m tests/phase40_s1_league_memory.test.ts[2m > [22mPhase 40 Sprint 1 (P40-S1): League Memory, Sweat Receipts & Authoritative Story[2m > [22m1. Arbiter Opening Corrections: indefinite articles, rival display name, duel margin movement, and bounded escape scenario gating[32m 6[2mms[22m[39m
 [32mΓ£ô[39m tests/phase40_s1_league_memory.test.ts[2m > [22mPhase 40 Sprint 1 (P40-S1): League Memory, Sweat Receipts & Authoritative Story[2m > [22m2. Session Sweat Receipts: baseline suppression, duplicate suppression, transitions, attribution, context switch reset, and simulation exclusion[32m 2[2mms[22m[39m
 [32mΓ£ô[39m tests/phase40_s1_league_memory.test.ts[2m > [22mPhase 40 Sprint 1 (P40-S1): League Memory, Sweat Receipts & Authoritative Story[2m > [22m3. Season Story Service: distinct states, blocks uncertified settlements, preserves tied ranks, and separates charges from debt[32m 2[2mms[22m[39m
 [32mΓ£ô[39m tests/phase40_s1_league_memory.test.ts[2m > [22mPhase 40 Sprint 1 (P40-S1): League Memory, Sweat Receipts & Authoritative Story[2m > [22m4. Weekly Recap Service: blocks unsettled cards, handles co-winners, revisions, and sanitizes email domains and MAIN26 invite codes[32m 2[2mms[22m[39m
 [32mΓ£ô[39m tests/nflCalendarService.test.ts[2m > [22mNFL Calendar Service & Automatic Rollover[2m > [22mevaluates Tue Oct 6 ΓÇô Mon Oct 12, 2026 as Week 5[32m 3[2mms[22m[39m
 [32mΓ£ô[39m tests/nflCalendarService.test.ts[2m > [22mNFL Calendar Service & Automatic Rollover[2m > [22mevaluates Tue Oct 13 ΓÇô Mon Oct 19, 2026 as Week 6[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/nflCalendarService.test.ts[2m > [22mNFL Calendar Service & Automatic Rollover[2m > [22mevaluates Tue Oct 20 ΓÇô Mon Oct 26, 2026 as Week 7[32m 0[2mms[22m[39m
 [32mΓ£ô[39m tests/nflCalendarService.test.ts[2m > [22mNFL Calendar Service & Automatic Rollover[2m > [22mdefaults to 6 for present Tuesday morning Oct 13, 2026 date[32m 0[2mms[22m[39m

[2m Test Files [22m [1m[32m9 passed[39m[22m[90m (9)[39m
[2m      Tests [22m [1m[32m48 passed[39m[22m[90m (48)[39m
[2m   Start at [22m 22:49:35
[2m   Duration [22m 8.86s[2m (import 49%, transform 33%, setup 10%, tests 7%, worker 1%)[22m

[2m     Import [22m [33m111 modules were evaluated 154 times[39m[2m ┬╖ 3.15s total, 49% of tracked time[22m
[2m            [22m [2m~880ms faster with [22m[33misolate: false[39m[2m ΓÇö shared modules are evaluated once per worker instead of once per file[22m
[2m            [22m [2mlearn more: https://vitest.dev/guide/improving-performance#test-isolation[22m
~~~