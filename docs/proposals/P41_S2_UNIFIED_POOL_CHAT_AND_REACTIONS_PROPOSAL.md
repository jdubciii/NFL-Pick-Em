# Phase 41 Sprint 2 Live Promotion (P41-S2-PROMO) Architectural Proposal: Express-Only Pool Chat & Canonical Reactions

## 1. Executive Summary & Authorizing Context
- **Target Milestone**: Phase 41 Sprint 2 Live Promotion (`P41-S2-PROMO`)
- **Authorizing Ruling**: `P41-S2-R1-REVIEW-2026-10-15-01`
- **Scope & Purpose**: Provide the authoritative, production-hardened PostgreSQL DDL, Prisma schema extensions, and security privilege configuration for:
  1. **Canonical Shared Reactions** across canonical games, settled weekly recaps, penalty reels, and chat messages.
  2. **SMS-Style Unified Pool Group Chat & Threaded Conversations (Pool Lounge)**, enabling persistent banter across seasons/weeks, game-specific discussion cards, and settled verdict threads within authenticated pool boundaries.
- **Invariants Maintained**:
  - **Express-Only Persistence (Decision #55 Fail-Closed)**: Direct database table access is strictly revoked from `PUBLIC`, `anon`, and `authenticated` PostgreSQL roles. All client operations must traverse the authoritative Express service boundary.
  - **Zero Live League Database DDL (Decision #61)**: DDL is verified strictly in isolated disposable local rehearsal databases before any production release.
  - **Decision #54 (No writes on GET)**: Read operations (`GET /api/pools/:pool_id/lounge/messages`, `GET /api/pools/:pool_id/reactions`) are strictly read-only with 0 state mutations.
  - **Decision #66 (Kickoff lock supremacy)**: Chat and reactions have zero bearing on pick lock enforcement.
  - **Composite Discussion Integrity**: Replies are constrained to the exact same `(pool_id, target_kind, target_entity_id, season, week, settlement_revision)`.

---

## 2. Hardened Table Specifications & PostgreSQL DDL (`migration.sql`)

```sql
BEGIN;

-- Table 1: pool_messages
CREATE TABLE public.pool_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL,
    author_user_id UUID NOT NULL,
    client_request_id VARCHAR(64) NOT NULL,
    parent_message_id UUID NULL,
    target_kind VARCHAR(32) NOT NULL DEFAULT 'POOL_LOUNGE',
    target_entity_id VARCHAR(128) NOT NULL DEFAULT 'LOUNGE_ROOT',
    season INTEGER NOT NULL DEFAULT 2026,
    week INTEGER NOT NULL DEFAULT 0,
    settlement_revision INTEGER NOT NULL DEFAULT 0,
    body VARCHAR(500) NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_pool_messages PRIMARY KEY (id),

    CONSTRAINT fk_pool_messages_pool
        FOREIGN KEY (pool_id) REFERENCES public.pools(id) ON DELETE CASCADE ON UPDATE NO ACTION,

    CONSTRAINT fk_pool_messages_author
        FOREIGN KEY (author_user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE NO ACTION,

    CONSTRAINT chk_pool_messages_body_len
        CHECK (char_length(btrim(body)) BETWEEN 1 AND 500),

    CONSTRAINT chk_pool_messages_request_id_len
        CHECK (char_length(btrim(client_request_id)) BETWEEN 6 AND 64),

    CONSTRAINT chk_pool_messages_target_kind
        CHECK (target_kind IN ('POOL_LOUNGE', 'CANONICAL_GAME', 'SETTLED_RECAP', 'PENALTY_REEL')),

    CONSTRAINT chk_pool_messages_lounge_identity
        CHECK (
            (target_kind = 'POOL_LOUNGE' AND week = 0 AND target_entity_id = 'LOUNGE_ROOT' AND settlement_revision = 0)
            OR
            (target_kind IN ('CANONICAL_GAME', 'PENALTY_REEL') AND week >= 1 AND target_entity_id <> 'LOUNGE_ROOT' AND settlement_revision = 0)
            OR
            (target_kind = 'SETTLED_RECAP' AND week >= 1 AND target_entity_id <> 'LOUNGE_ROOT' AND settlement_revision >= 1)
        ),

    CONSTRAINT uq_pool_messages_actor_request
        UNIQUE (pool_id, author_user_id, client_request_id),

    CONSTRAINT uq_pool_messages_discussion_scope
        UNIQUE (id, pool_id, target_kind, target_entity_id, season, week, settlement_revision),

    CONSTRAINT fk_pool_messages_parent_same_discussion
        FOREIGN KEY (parent_message_id, pool_id, target_kind, target_entity_id, season, week, settlement_revision)
        REFERENCES public.pool_messages (id, pool_id, target_kind, target_entity_id, season, week, settlement_revision)
        ON DELETE RESTRICT ON UPDATE NO ACTION
);

CREATE INDEX idx_pool_messages_feed
    ON public.pool_messages (pool_id, created_at ASC, id ASC);

CREATE INDEX idx_pool_messages_context
    ON public.pool_messages (pool_id, target_kind, target_entity_id, season, week, settlement_revision, created_at ASC);

CREATE INDEX idx_pool_messages_author
    ON public.pool_messages (author_user_id, created_at DESC);

CREATE INDEX idx_pool_messages_parent
    ON public.pool_messages (parent_message_id);

-- Table 2: pool_reactions
CREATE TABLE public.pool_reactions (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL,
    actor_user_id UUID NOT NULL,
    season INTEGER NOT NULL DEFAULT 2026,
    week INTEGER NOT NULL DEFAULT 0,
    target_kind VARCHAR(32) NOT NULL,
    target_entity_id VARCHAR(128) NOT NULL,
    settlement_revision INTEGER NOT NULL DEFAULT 0,
    reaction_code VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_pool_reactions PRIMARY KEY (id),

    CONSTRAINT fk_pool_reactions_pool
        FOREIGN KEY (pool_id) REFERENCES public.pools(id) ON DELETE CASCADE ON UPDATE NO ACTION,

    CONSTRAINT fk_pool_reactions_actor
        FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE NO ACTION,

    CONSTRAINT chk_pool_reactions_target_kind
        CHECK (target_kind IN ('CANONICAL_GAME', 'SETTLED_RECAP', 'POOL_CHAT_MESSAGE', 'PENALTY_REEL')),

    CONSTRAINT chk_pool_reactions_code
        CHECK (reaction_code IN ('CALLED_IT', 'COLD', 'PAIN', 'PIT_BOUND')),

    CONSTRAINT chk_pool_reactions_canonical_entity
        CHECK (
            char_length(btrim(target_entity_id)) BETWEEN 1 AND 128
            AND position('::' in target_entity_id) = 0
            AND target_entity_id NOT LIKE 'receipt-%'
            AND target_entity_id NOT LIKE 'session-%'
            AND target_entity_id NOT LIKE 'dl::%'
        ),

    CONSTRAINT chk_pool_reactions_revision_gate
        CHECK (
            (target_kind = 'SETTLED_RECAP' AND week >= 1 AND settlement_revision >= 1)
            OR
            (target_kind = 'POOL_CHAT_MESSAGE' AND week >= 0 AND settlement_revision = 0)
            OR
            (target_kind IN ('CANONICAL_GAME', 'PENALTY_REEL') AND week >= 1 AND settlement_revision = 0)
        ),

    CONSTRAINT uq_pool_reaction_one_per_actor
        UNIQUE (pool_id, season, week, target_kind, target_entity_id, settlement_revision, actor_user_id)
);

CREATE INDEX idx_pool_reactions_aggregation
    ON public.pool_reactions (pool_id, season, week, target_kind, target_entity_id, settlement_revision, reaction_code);

CREATE INDEX idx_pool_reactions_actor
    ON public.pool_reactions (actor_user_id, created_at DESC);

-- Express-Only Persistence Security Boundary
REVOKE ALL ON TABLE public.pool_messages FROM PUBLIC;
REVOKE ALL ON TABLE public.pool_reactions FROM PUBLIC;

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN EXECUTE 'REVOKE ALL ON TABLE public.pool_messages FROM anon'; EXECUTE 'REVOKE ALL ON TABLE public.pool_reactions FROM anon'; END IF; IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN EXECUTE 'REVOKE ALL ON TABLE public.pool_messages FROM authenticated'; EXECUTE 'REVOKE ALL ON TABLE public.pool_reactions FROM authenticated'; END IF; END $$;

ALTER TABLE public.pool_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_messages FORCE ROW LEVEL SECURITY;

ALTER TABLE public.pool_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_reactions FORCE ROW LEVEL SECURITY;

COMMIT;
```

---

## 3. Prisma Schema Alignment (`prisma/schema.prisma`)

```prisma
model PoolMessage {
  id                 String        @id(map: "pk_pool_messages") @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  poolId             String        @map("pool_id") @db.Uuid
  authorUserId       String        @map("author_user_id") @db.Uuid
  clientRequestId    String        @map("client_request_id") @db.VarChar(64)
  parentMessageId    String?       @map("parent_message_id") @db.Uuid
  targetKind         String        @default("POOL_LOUNGE") @map("target_kind") @db.VarChar(32)
  targetEntityId     String        @default("LOUNGE_ROOT") @map("target_entity_id") @db.VarChar(128)
  season             Int           @default(2026)
  week               Int           @default(0)
  settlementRevision Int           @default(0) @map("settlement_revision")
  body               String        @db.VarChar(500)
  isPinned           Boolean       @default(false) @map("is_pinned")
  createdAt          DateTime      @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt          DateTime      @default(now()) @map("updated_at") @db.Timestamptz(6)

  pool               Pool          @relation(fields: [poolId], references: [id], onDelete: Cascade, onUpdate: NoAction, map: "fk_pool_messages_pool")
  author             User          @relation(fields: [authorUserId], references: [id], onDelete: Cascade, onUpdate: NoAction, map: "fk_pool_messages_author")
  parentMessage      PoolMessage?  @relation("ThreadReplies", fields: [parentMessageId, poolId, targetKind, targetEntityId, season, week, settlementRevision], references: [id, poolId, targetKind, targetEntityId, season, week, settlementRevision], onDelete: Restrict, onUpdate: NoAction, map: "fk_pool_messages_parent_same_discussion")
  replies            PoolMessage[] @relation("ThreadReplies")

  @@unique([poolId, authorUserId, clientRequestId], map: "uq_pool_messages_actor_request")
  @@unique([id, poolId, targetKind, targetEntityId, season, week, settlementRevision], map: "uq_pool_messages_discussion_scope")
  @@index([poolId, createdAt, id], map: "idx_pool_messages_feed")
  @@index([poolId, targetKind, targetEntityId, season, week, settlementRevision, createdAt], map: "idx_pool_messages_context")
  @@index([authorUserId, createdAt(sort: Desc)], map: "idx_pool_messages_author")
  @@index([parentMessageId], map: "idx_pool_messages_parent")
  @@map("pool_messages")
}

model PoolReaction {
  id                 String    @id(map: "pk_pool_reactions") @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  poolId             String    @map("pool_id") @db.Uuid
  actorUserId        String    @map("actor_user_id") @db.Uuid
  season             Int       @default(2026)
  week               Int       @default(0)
  targetKind         String    @map("target_kind") @db.VarChar(32)
  targetEntityId     String    @map("target_entity_id") @db.VarChar(128)
  settlementRevision Int       @default(0) @map("settlement_revision")
  reactionCode       String    @map("reaction_code") @db.VarChar(32)
  createdAt          DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt          DateTime  @default(now()) @map("updated_at") @db.Timestamptz(6)

  pool               Pool      @relation(fields: [poolId], references: [id], onDelete: Cascade, onUpdate: NoAction, map: "fk_pool_reactions_pool")
  actor              User      @relation(fields: [actorUserId], references: [id], onDelete: Cascade, onUpdate: NoAction, map: "fk_pool_reactions_actor")

  @@unique([poolId, season, week, targetKind, targetEntityId, settlementRevision, actorUserId], map: "uq_pool_reaction_one_per_actor")
  @@index([poolId, season, week, targetKind, targetEntityId, settlementRevision, reactionCode], map: "idx_pool_reactions_aggregation")
  @@index([actorUserId, createdAt(sort: Desc)], map: "idx_pool_reactions_actor")
  @@map("pool_reactions")
}
```
