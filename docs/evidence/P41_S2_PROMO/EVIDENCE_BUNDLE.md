# Phase 41 Sprint 2 Live Promotion (P41-S2-PROMO) Authoritative Evidence Bundle (v71)

- **Authorizing Ruling**: P41-S2-R1-REVIEW-2026-10-15-01
- **Milestone**: P41_S2_PROMO (Native PostgreSQL Rehearsal, Live Migration & Production Express Persistence)
- **Branch**: feat/p37-shell-auth-openslate
- **Parent SHA**: f94559e655961e3c5d13d6bf4744ebc3d2ac1929
- **Stage 1 Implementation SHA (E_SHA)**: fa9b255478ace28062ff058104ebe542c1cd616e
- **Generated Timestamp (UTC)**: 2026-10-15T18:38:47Z
- **Live Database Migration Executed**: Successfully applied to public schema on hosted database
- **APK Artifact**: pickem-v41-s2.apk (versionCode 71, versionName 41.2.2)
- **APK Size (Bytes)**: 14719600
- **APK SHA-256**: BCC10F78899282FF3EB7F1B6FA127C3682986E60D1B58C025A626040509BF437
- **APK Signature Scheme v2**: true

---

## 1. Verbatim Applied Migration (prisma/migrations/20261015_p41_s2_express_only_social_persistence/migration.sql)
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

## 2. Verbatim Aligned Proposal & Prisma Models (docs/proposals/P41_S2_UNIFIED_POOL_CHAT_AND_REACTIONS_PROPOSAL.md)

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

---

## 3. Authoritative Vitest Execution Log (10 Suites / 52 Tests)
```text
[1m[30m[46m RUN [49m[39m[22m [36mv5.0.2 [39m[90mC:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em[39m

 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m1. Server-Enforced Registration (POST /api/pools/:pool_id/join)[2m > [22mstrictly rejects missing inviteCode with HTTP 403 and 0 database writes[32m 95[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m1. Server-Enforced Registration (POST /api/pools/:pool_id/join)[2m > [22mstrictly rejects invalid inviteCode with HTTP 403 and 0 database writes[32m 6[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m1. Server-Enforced Registration (POST /api/pools/:pool_id/join)[2m > [22mstrictly rejects MAIN26 inviteCode when targeting a foreign pool with HTTP 403 and 0 database writes[32m 4[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m1. Server-Enforced Registration (POST /api/pools/:pool_id/join)[2m > [22mstrictly rejects forged payloads containing { status: "ACTIVE" } or { role: "ADMIN" } with HTTP 403[32m 7[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m1. Server-Enforced Registration (POST /api/pools/:pool_id/join)[2m > [22mforces legitimate registration with valid inviteCode strictly into PENDING state[32m 6[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m2. Pool-Scoped Adjudication (Decision #20 & Decision #55)[2m > [22mdenies actor with foreign pool ADMIN rights attempting to adjudicate Main League with HTTP 403[32m 5[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m2. Pool-Scoped Adjudication (Decision #20 & Decision #55)[2m > [22mpermits authorized Main League commissioner to adjudicate applicant to ACTIVE[32m 5[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m3. GET Safety (Decision #54)[2m > [22mproves exactly 0 database INSERT, UPDATE, DELETE, or executeRaw operations occur during GET requests[32m 4[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m4. Fail-Closed Context Resolution (Decision #55)[2m > [22mfails closed (HTTP 401) when Authorization header is absent or token is invalid[32m 3[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m4. Fail-Closed Context Resolution (Decision #55)[2m > [22mfails closed (HTTP 404) when pool does not exist in database[32m 3[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m4. Fail-Closed Context Resolution (Decision #55)[2m > [22mfails closed (HTTP 500) without leaking access when database lookup throws an error[32m 9[2mms[22m[39m
 [32mΓ£ô[39m tests/phase37_authoritative.test.ts[2m > [22mPhase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)[2m > [22m5. App Production Call Site Verification[2m > [22mverifies that client/src/App.tsx directly consumes resolveNavigationVisibility to guard BottomNavigation[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/phase41_s2_persistence_rehearsal.test.ts[2m > [22mPhase 41 Sprint 2 Remediation (P41-S2-R1): Express-Only Persistence & Database Rehearsal[2m > [22m1. Schema & Prisma Alignment: Assert exact DDL and Prisma model synchronization[32m 5[2mms[22m[39m
 [32mΓ£ô[39m tests/phase41_s2_persistence_rehearsal.test.ts[2m > [22mPhase 41 Sprint 2 Remediation (P41-S2-R1): Express-Only Persistence & Database Rehearsal[2m > [22m2. Direct Client Access Denial & Database Constraints: Rejection of invalid revisions, receipt IDs and cross-discussion replies[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/phase41_s2_persistence_rehearsal.test.ts[2m > [22mPhase 41 Sprint 2 Remediation (P41-S2-R1): Express-Only Persistence & Database Rehearsal[2m > [22m3. Express Persistence Route & Membership Security: Enforce fail-closed active membership & Decision #54 GET safety[32m 86[2mms[22m[39m
 [32mΓ£ô[39m tests/phase41_s2_persistence_rehearsal.test.ts[2m > [22mPhase 41 Sprint 2 Remediation (P41-S2-R1): Express-Only Persistence & Database Rehearsal[2m > [22m4. Concurrent Message Retries & Reaction SET/REMOVE: Atomic deduplication, 409 conflict on mutation, and idempotent set/remove[32m 37[2mms[22m[39m
 [32mΓ£ô[39m tests/phase41_s1_bigboard_alerts_social.test.ts[2m > [22mPhase 41 Sprint 1 (P41-S1): Big Board, Alerts & Social Foundation[2m > [22m1. P40 Follow-Ups: Escape arithmetic, terminal states, and live contribution replacement[32m 2[2mms[22m[39m
 [32mΓ£ô[39m tests/phase41_s1_bigboard_alerts_social.test.ts[2m > [22mPhase 41 Sprint 1 (P41-S1): Big Board, Alerts & Social Foundation[2m > [22m2. P40 Follow-Ups: Recap handle sanitization, verb agreement, and demo watermark[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/phase41_s1_bigboard_alerts_social.test.ts[2m > [22mPhase 41 Sprint 1 (P41-S1): Big Board, Alerts & Social Foundation[2m > [22m3. Deadline Alert Planner: 60m lead, grouping, deduplication, cancellation, and copy[32m 132[2mms[22m[39m
 [32mΓ£ô[39m tests/phase41_s1_bigboard_alerts_social.test.ts[2m > [22mPhase 41 Sprint 1 (P41-S1): Big Board, Alerts & Social Foundation[2m > [22m4. Canonical Reactions & Security: Rejection of receipt IDs, spoofing, cross-pool, and toggle idempotence[32m 2[2mms[22m[39m
 [32mΓ£ô[39m tests/sweatProjectionService.test.ts[2m > [22mPhase 38 Sunday Sweat Projection Engine (Ruling P37-P38-2026-10-12-01)[2m > [22maccurately combines banked final points and active live points[32m 24[2mms[22m[39m
 [32mΓ£ô[39m tests/sweatProjectionService.test.ts[2m > [22mPhase 38 Sunday Sweat Projection Engine (Ruling P37-P38-2026-10-12-01)[2m > [22mcorrectly resolves ties via tiebreaker distance and marks unresolved ties[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/sweatProjectionService.test.ts[2m > [22mPhase 38 Sunday Sweat Projection Engine (Ruling P37-P38-2026-10-12-01)[2m > [22mcalculates swing game card identifying highest leverage matchup[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/sweatProjectionService.test.ts[2m > [22mPhase 38 Sunday Sweat Projection Engine (Ruling P37-P38-2026-10-12-01)[2m > [22mfalls back gracefully on empty or null live scores without corruption or exceptions[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/sweatProjectionService.test.ts[2m > [22mPhase 38 Sunday Sweat Projection Engine (Ruling P37-P38-2026-10-12-01)[2m > [22mstrictly excludes unsubmitted and hidden picks, and guarantees input immutability[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/phase41_s2_lounge_reactions_consistency.test.ts[2m > [22mPhase 41 Sprint 2 (P41-S2): Pool Lounge, Contextual Threads & Explicit Reaction API[2m > [22m1. P41-S1 Carry-Forward Consistency: Canonical kickoff resolution & coherent 11-9 demo fixture math[32m 22[2mms[22m[39m
 [32mΓ£ô[39m tests/phase41_s2_lounge_reactions_consistency.test.ts[2m > [22mPhase 41 Sprint 2 (P41-S2): Pool Lounge, Contextual Threads & Explicit Reaction API[2m > [22m2. Pool Lounge Security & Retry Idempotency: Gating, deduplication, conflict on mutation & GET safety[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/phase41_s2_lounge_reactions_consistency.test.ts[2m > [22mPhase 41 Sprint 2 (P41-S2): Pool Lounge, Contextual Threads & Explicit Reaction API[2m > [22m3. Explicit Set/Remove Reaction State: Idempotent replacement, removal, revision isolation & receipt exclusion[32m 2[2mms[22m[39m
 [32mΓ£ô[39m tests/liveScoreService.test.ts[2m > [22mESPN Live Score Adapter & Circuit Breakers (Ruling C8 Compliance)[2m > [22mmaps valid ESPN scoreboard payload accurately into LiveGame objects[32m 4[2mms[22m[39m
 [32mΓ£ô[39m tests/liveScoreService.test.ts[2m > [22mESPN Live Score Adapter & Circuit Breakers (Ruling C8 Compliance)[2m > [22mfalls back gracefully to empty array on HTTP 500 error without throwing[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/liveScoreService.test.ts[2m > [22mESPN Live Score Adapter & Circuit Breakers (Ruling C8 Compliance)[2m > [22mfalls back gracefully to empty array on offline network failure[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/liveScoreService.test.ts[2m > [22mESPN Live Score Adapter & Circuit Breakers (Ruling C8 Compliance)[2m > [22mfalls back gracefully on malformed JSON payload[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/liveScoreService.test.ts[2m > [22mESPN Live Score Adapter & Circuit Breakers (Ruling C8 Compliance)[2m > [22mmaps STATUS_HALFTIME accurately to IN_PROGRESS/LIVE and pins scoreboard week query[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/liveScoreService.test.ts[2m > [22mESPN Live Score Adapter & Circuit Breakers (Ruling C8 Compliance)[2m > [22mexercises integrated consumer state preservation: isolates telemetry from user picks and kickoff locks[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/phase39_s1_dependable_info.test.ts[2m > [22mPhase 39 Sprint 1 (P39-S1): Dependable Information & Mathematical Truth[2m > [22m1. resolves PRE_KICKOFF vs LIVE_IN_PROGRESS vs AWAITING_SETTLEMENT vs SETTLED states and suppresses false 0-0 scores before kickoff[32m 3[2mms[22m[39m
 [32mΓ£ô[39m tests/phase39_s1_dependable_info.test.ts[2m > [22mPhase 39 Sprint 1 (P39-S1): Dependable Information & Mathematical Truth[2m > [22m2. separates Draft Complete from Submitted and Partial Kickoff Locks (Decision #66)[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/phase39_s1_dependable_info.test.ts[2m > [22mPhase 39 Sprint 1 (P39-S1): Dependable Information & Mathematical Truth[2m > [22m3. computes exact +1 / -1 Radar Duel outcome branches and 2 PT OUTCOME SPAN instead of +-2 PTS NET SWING[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/phase39_s1_dependable_info.test.ts[2m > [22mPhase 39 Sprint 1 (P39-S1): Dependable Information & Mathematical Truth[2m > [22m4. filters out unanimous shared picks from League Swing Game selection and avoids podium language in a 2-player field[32m 0[2mms[22m[39m
 [32mΓ£ô[39m tests/phase39_s1_dependable_info.test.ts[2m > [22mPhase 39 Sprint 1 (P39-S1): Dependable Information & Mathematical Truth[2m > [22m5. distinguishes unresolved tied ranks from settled tiebreakers and formats shot units & spreads cleanly[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/phase39_s1_dependable_info.test.ts[2m > [22mPhase 39 Sprint 1 (P39-S1): Dependable Information & Mathematical Truth[2m > [22m6. verifies Pass-3 signature algorithms: buildPersonalRootingQueue, evaluateLateGameEscape, summarizeNemesisRecord, and classifyPickDistributionBadge[32m 2[2mms[22m[39m
 [32mΓ£ô[39m tests/phase40_s1_league_memory.test.ts[2m > [22mPhase 40 Sprint 1 (P40-S1): League Memory, Sweat Receipts & Authoritative Story[2m > [22m1. Arbiter Opening Corrections: indefinite articles, rival display name, duel margin movement, and bounded escape scenario gating[32m 3[2mms[22m[39m
 [32mΓ£ô[39m tests/phase40_s1_league_memory.test.ts[2m > [22mPhase 40 Sprint 1 (P40-S1): League Memory, Sweat Receipts & Authoritative Story[2m > [22m2. Session Sweat Receipts: baseline suppression, duplicate suppression, transitions, attribution, context switch reset, and simulation exclusion[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/phase40_s1_league_memory.test.ts[2m > [22mPhase 40 Sprint 1 (P40-S1): League Memory, Sweat Receipts & Authoritative Story[2m > [22m3. Season Story Service: distinct states, blocks uncertified settlements, preserves tied ranks, and separates charges from debt[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/phase40_s1_league_memory.test.ts[2m > [22mPhase 40 Sprint 1 (P40-S1): League Memory, Sweat Receipts & Authoritative Story[2m > [22m4. Weekly Recap Service: blocks unsettled cards, handles co-winners, revisions, and sanitizes email domains and MAIN26 invite codes[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/rivalryShowdownService.test.ts[2m > [22mPhase 38 Sprint 2: Rivalry Showdown Engine (Ruling P37-P38-2026-10-12-01)[2m > [22mcorrectly categorizes opposite picks as battlegrounds and shared picks as neutral leverage[32m 3[2mms[22m[39m
 [32mΓ£ô[39m tests/rivalryShowdownService.test.ts[2m > [22mPhase 38 Sprint 2: Rivalry Showdown Engine (Ruling P37-P38-2026-10-12-01)[2m > [22mcalculates exact branch arithmetic demonstrating two-point net swing on opposite picks[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/rivalryShowdownService.test.ts[2m > [22mPhase 38 Sprint 2: Rivalry Showdown Engine (Ruling P37-P38-2026-10-12-01)[2m > [22mdeterministically selects the Duel Decider prioritizing live in-progress battlegrounds[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/rivalryShowdownService.test.ts[2m > [22mPhase 38 Sprint 2: Rivalry Showdown Engine (Ruling P37-P38-2026-10-12-01)[2m > [22mexcludes hidden or unsubmitted picks and preserves strict immutability[32m 1[2mms[22m[39m
 [32mΓ£ô[39m tests/nflCalendarService.test.ts[2m > [22mNFL Calendar Service & Automatic Rollover[2m > [22mevaluates Tue Oct 6 ΓÇô Mon Oct 12, 2026 as Week 5[32m 2[2mms[22m[39m
 [32mΓ£ô[39m tests/nflCalendarService.test.ts[2m > [22mNFL Calendar Service & Automatic Rollover[2m > [22mevaluates Tue Oct 13 ΓÇô Mon Oct 19, 2026 as Week 6[32m 0[2mms[22m[39m
 [32mΓ£ô[39m tests/nflCalendarService.test.ts[2m > [22mNFL Calendar Service & Automatic Rollover[2m > [22mevaluates Tue Oct 20 ΓÇô Mon Oct 26, 2026 as Week 7[32m 0[2mms[22m[39m
 [32mΓ£ô[39m tests/nflCalendarService.test.ts[2m > [22mNFL Calendar Service & Automatic Rollover[2m > [22mdefaults to 6 for present Tuesday morning Oct 13, 2026 date[32m 0[2mms[22m[39m

[2m Test Files [22m [1m[32m10 passed[39m[22m[90m (10)[39m
[2m      Tests [22m [1m[32m52 passed[39m[22m[90m (52)[39m
[2m   Start at [22m 11:37:18
[2m   Duration [22m 13.11s[2m (import 73%, transform 17%, tests 5%, setup 4%, worker 1%)[22m

[2m     Import [22m [33m113 modules were evaluated 161 times[39m[2m ┬╖ 8.11s total, 73% of tracked time[22m
[2m            [22m [2m~2.42s faster with [22m[33misolate: false[39m[2m ΓÇö shared modules are evaluated once per worker instead of once per file[22m
[2m            [22m [2mlearn more: https://vitest.dev/guide/improving-performance#test-isolation[22m
```