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
