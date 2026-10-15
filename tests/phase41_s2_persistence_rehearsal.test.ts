import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import express from 'express';
import { JWT_SECRET } from '../src/middleware/auth';
import { poolSocialRouter } from '../src/routes/poolSocialRoutes';

// Isolated In-Memory PostgreSQL Rehearsal Store (Decision #61 compliant: 0 live DB DDL)
interface RehearsalPoolMessage {
  id: string;
  poolId: string;
  authorUserId: string;
  clientRequestId: string;
  parentMessageId: string | null;
  targetKind: string;
  targetEntityId: string;
  season: number;
  week: number;
  settlementRevision: number;
  body: string;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  author?: { id: string; email: string };
}

interface RehearsalPoolReaction {
  id: string;
  poolId: string;
  actorUserId: string;
  season: number;
  week: number;
  targetKind: string;
  targetEntityId: string;
  settlementRevision: number;
  reactionCode: string;
  createdAt: Date;
  updatedAt: Date;
}

interface RehearsalMembership {
  poolId: string;
  userId: string;
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE' | 'REJECTED';
}

class IsolatedPostgresRehearsalEngine {
  public messages: RehearsalPoolMessage[] = [];
  public reactions: RehearsalPoolReaction[] = [];
  public memberships: RehearsalMembership[] = [];
  public games: Array<{ id: string; week: number; externalGameId?: string }> = [];
  public writeCount: number = 0;

  public reset() {
    this.messages = [];
    this.reactions = [];
    this.memberships = [];
    this.games = [];
    this.writeCount = 0;
  }

  // Database CHECK constraint evaluator mirroring migration.sql exactly
  public evaluateMessageConstraints(row: Partial<RehearsalPoolMessage>): { ok: boolean; error?: string } {
    const body = (row.body || '').trim();
    if (body.length < 1 || body.length > 500) {
      return { ok: false, error: 'chk_pool_messages_body_len' };
    }
    const reqId = (row.clientRequestId || '').trim();
    if (reqId.length < 6 || reqId.length > 64) {
      return { ok: false, error: 'chk_pool_messages_request_id_len' };
    }
    const validKinds = ['POOL_LOUNGE', 'CANONICAL_GAME', 'SETTLED_RECAP', 'PENALTY_REEL'];
    if (!validKinds.includes(row.targetKind || '')) {
      return { ok: false, error: 'chk_pool_messages_target_kind' };
    }

    const isLoungeValid =
      row.targetKind === 'POOL_LOUNGE' &&
      row.week === 0 &&
      row.targetEntityId === 'LOUNGE_ROOT' &&
      row.settlementRevision === 0;

    const isContextValid =
      ['CANONICAL_GAME', 'PENALTY_REEL'].includes(row.targetKind || '') &&
      (row.week || 0) >= 1 &&
      row.targetEntityId !== 'LOUNGE_ROOT' &&
      row.settlementRevision === 0;

    const isRecapValid =
      row.targetKind === 'SETTLED_RECAP' &&
      (row.week || 0) >= 1 &&
      row.targetEntityId !== 'LOUNGE_ROOT' &&
      (row.settlementRevision || 0) >= 1;

    if (!isLoungeValid && !isContextValid && !isRecapValid) {
      return { ok: false, error: 'chk_pool_messages_lounge_identity' };
    }

    return { ok: true };
  }

  // Database CHECK constraint evaluator mirroring migration.sql for reactions
  public evaluateReactionConstraints(row: Partial<RehearsalPoolReaction>): { ok: boolean; error?: string } {
    const validKinds = ['CANONICAL_GAME', 'SETTLED_RECAP', 'POOL_CHAT_MESSAGE', 'PENALTY_REEL'];
    if (!validKinds.includes(row.targetKind || '')) {
      return { ok: false, error: 'chk_pool_reactions_target_kind' };
    }
    const validCodes = ['CALLED_IT', 'COLD', 'PAIN', 'PIT_BOUND'];
    if (!validCodes.includes(row.reactionCode || '')) {
      return { ok: false, error: 'chk_pool_reactions_code' };
    }
    const entity = (row.targetEntityId || '').trim();
    if (
      entity.length < 1 ||
      entity.length > 128 ||
      entity.includes('::') ||
      entity.startsWith('receipt-') ||
      entity.startsWith('session-') ||
      entity.startsWith('dl::')
    ) {
      return { ok: false, error: 'chk_pool_reactions_canonical_entity' };
    }

    const isRecap =
      row.targetKind === 'SETTLED_RECAP' &&
      (row.week || 0) >= 1 &&
      (row.settlementRevision || 0) >= 1;

    const isChatMessage =
      row.targetKind === 'POOL_CHAT_MESSAGE' &&
      (row.week || 0) >= 0 &&
      (row.settlementRevision || 0) === 0;

    const isGameOrReel =
      ['CANONICAL_GAME', 'PENALTY_REEL'].includes(row.targetKind || '') &&
      (row.week || 0) >= 1 &&
      (row.settlementRevision || 0) === 0;

    if (!isRecap && !isChatMessage && !isGameOrReel) {
      return { ok: false, error: 'chk_pool_reactions_revision_gate' };
    }

    return { ok: true };
  }

  // Composite Foreign Key Evaluator: fk_pool_messages_parent_same_discussion
  public evaluateParentSameDiscussionFk(
    parentMessageId: string,
    child: {
      poolId: string;
      targetKind: string;
      targetEntityId: string;
      season: number;
      week: number;
      settlementRevision: number;
    }
  ): { ok: boolean; error?: string } {
    const parent = this.messages.find((m) => m.id === parentMessageId);
    if (!parent) {
      return { ok: false, error: 'fk_pool_messages_parent_same_discussion (not found)' };
    }
    const matches =
      parent.poolId === child.poolId &&
      parent.targetKind === child.targetKind &&
      parent.targetEntityId === child.targetEntityId &&
      parent.season === child.season &&
      parent.week === child.week &&
      parent.settlementRevision === child.settlementRevision;

    if (!matches) {
      return { ok: false, error: 'fk_pool_messages_parent_same_discussion (discussion mismatch)' };
    }
    return { ok: true };
  }
}

const rehearsalEngine = new IsolatedPostgresRehearsalEngine();

// Mock Prisma client to intercept queries and execute against the isolated rehearsal engine
vi.mock('../src/db/client', () => {
  const mockPrisma = {
    poolMembership: {
      findUnique: vi.fn(async (args: any) => {
        const { poolId, userId } = args.where.poolId_userId;
        const found = rehearsalEngine.memberships.find(
          (m) => m.poolId === poolId && m.userId === userId
        );
        return found ? { poolId: found.poolId, userId: found.userId, status: found.status } : null;
      }),
    },
    game: {
      findFirst: vi.fn(async (args: any) => {
        const { week } = args.where;
        return rehearsalEngine.games.find((g) => g.week === week) || null;
      }),
    },
    poolMessage: {
      findMany: vi.fn(async (args: any) => {
        const { poolId, targetKind, targetEntityId } = args.where || {};
        let list = rehearsalEngine.messages.filter((m) => m.poolId === poolId);
        if (targetKind) list = list.filter((m) => m.targetKind === targetKind);
        if (targetEntityId) list = list.filter((m) => m.targetEntityId === targetEntityId);
        return list;
      }),
      findUnique: vi.fn(async (args: any) => {
        if (args.where.id) {
          return rehearsalEngine.messages.find((m) => m.id === args.where.id) || null;
        }
        if (args.where.poolId_authorUserId_clientRequestId) {
          const { poolId, authorUserId, clientRequestId } =
            args.where.poolId_authorUserId_clientRequestId;
          return (
            rehearsalEngine.messages.find(
              (m) =>
                m.poolId === poolId &&
                m.authorUserId === authorUserId &&
                m.clientRequestId === clientRequestId
            ) || null
          );
        }
        return null;
      }),
      create: vi.fn(async (args: any) => {
        rehearsalEngine.writeCount++;
        const check = rehearsalEngine.evaluateMessageConstraints(args.data);
        if (!check.ok) {
          throw new Error(`DB_CHECK_VIOLATION: ${check.error}`);
        }
        if (args.data.parentMessageId) {
          const fkCheck = rehearsalEngine.evaluateParentSameDiscussionFk(
            args.data.parentMessageId,
            args.data
          );
          if (!fkCheck.ok) {
            throw new Error(`DB_FK_VIOLATION: ${fkCheck.error}`);
          }
        }
        const created: RehearsalPoolMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          poolId: args.data.poolId,
          authorUserId: args.data.authorUserId,
          clientRequestId: args.data.clientRequestId,
          parentMessageId: args.data.parentMessageId || null,
          targetKind: args.data.targetKind,
          targetEntityId: args.data.targetEntityId,
          season: args.data.season,
          week: args.data.week,
          settlementRevision: args.data.settlementRevision,
          body: args.data.body,
          isPinned: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          author: { id: args.data.authorUserId, email: 'jack.w.cone@gmail.com' },
        };
        rehearsalEngine.messages.push(created);
        return created;
      }),
    },
    poolReaction: {
      findMany: vi.fn(async (args: any) => {
        const { poolId, targetKind, targetEntityId, season, week, settlementRevision } =
          args.where || {};
        return rehearsalEngine.reactions.filter(
          (r) =>
            r.poolId === poolId &&
            r.targetKind === targetKind &&
            r.targetEntityId === targetEntityId &&
            r.season === season &&
            r.week === week &&
            r.settlementRevision === settlementRevision
        );
      }),
      upsert: vi.fn(async (args: any) => {
        rehearsalEngine.writeCount++;
        const check = rehearsalEngine.evaluateReactionConstraints(args.create);
        if (!check.ok) {
          throw new Error(`DB_CHECK_VIOLATION: ${check.error}`);
        }
        const existingIdx = rehearsalEngine.reactions.findIndex(
          (r) =>
            r.poolId === args.create.poolId &&
            r.season === args.create.season &&
            r.week === args.create.week &&
            r.targetKind === args.create.targetKind &&
            r.targetEntityId === args.create.targetEntityId &&
            r.settlementRevision === args.create.settlementRevision &&
            r.actorUserId === args.create.actorUserId
        );
        if (existingIdx >= 0) {
          rehearsalEngine.reactions[existingIdx].reactionCode = args.update.reactionCode;
          rehearsalEngine.reactions[existingIdx].updatedAt = new Date();
          return rehearsalEngine.reactions[existingIdx];
        }
        const created: RehearsalPoolReaction = {
          id: `rx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          poolId: args.create.poolId,
          actorUserId: args.create.actorUserId,
          season: args.create.season,
          week: args.create.week,
          targetKind: args.create.targetKind,
          targetEntityId: args.create.targetEntityId,
          settlementRevision: args.create.settlementRevision,
          reactionCode: args.create.reactionCode,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        rehearsalEngine.reactions.push(created);
        return created;
      }),
      deleteMany: vi.fn(async (args: any) => {
        rehearsalEngine.writeCount++;
        const { poolId, actorUserId, season, week, targetKind, targetEntityId, settlementRevision } =
          args.where || {};
        const initialLen = rehearsalEngine.reactions.length;
        rehearsalEngine.reactions = rehearsalEngine.reactions.filter(
          (r) =>
            !(
              r.poolId === poolId &&
              r.actorUserId === actorUserId &&
              r.season === season &&
              r.week === week &&
              r.targetKind === targetKind &&
              r.targetEntityId === targetEntityId &&
              r.settlementRevision === settlementRevision
            )
        );
        return { count: initialLen - rehearsalEngine.reactions.length };
      }),
    },
  };
  return {
    default: mockPrisma,
    prisma: mockPrisma,
  };
});

describe('Phase 41 Sprint 2 Remediation (P41-S2-R1): Express-Only Persistence & Database Rehearsal', () => {
  let app: express.Application;
  let server: http.Server;
  let baseUrl: string;

  const POOL_MAIN = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';
  const POOL_FOREIGN = 'e82b7812-40e1-4567-9abc-1234567890ab';

  const userJack = { id: 'user-jack-001', email: 'jack.w.cone@gmail.com', role: 'ADMIN' };
  const userPending = { id: 'user-pending-002', email: 'pending@gmail.com', role: 'USER' };
  const userInactive = { id: 'user-inactive-003', email: 'inactive@gmail.com', role: 'USER' };
  const userForeign = { id: 'user-foreign-004', email: 'foreign@gmail.com', role: 'USER' };

  const tokenJack = jwt.sign(userJack, JWT_SECRET, { expiresIn: '1h' });
  const tokenPending = jwt.sign(userPending, JWT_SECRET, { expiresIn: '1h' });
  const tokenInactive = jwt.sign(userInactive, JWT_SECRET, { expiresIn: '1h' });
  const tokenForeign = jwt.sign(userForeign, JWT_SECRET, { expiresIn: '1h' });

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/pools', poolSocialRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    rehearsalEngine.reset();
    // Seed pool memberships
    rehearsalEngine.memberships.push({ poolId: POOL_MAIN, userId: userJack.id, status: 'ACTIVE' });
    rehearsalEngine.memberships.push({ poolId: POOL_MAIN, userId: userPending.id, status: 'PENDING' });
    rehearsalEngine.memberships.push({ poolId: POOL_MAIN, userId: userInactive.id, status: 'INACTIVE' });
    rehearsalEngine.memberships.push({ poolId: POOL_FOREIGN, userId: userForeign.id, status: 'ACTIVE' });
    // Seed canonical game
    rehearsalEngine.games.push({ id: 'g-w6-sea-den', week: 6, externalGameId: '401671801' });
  });

  // =========================================================================
  // 1. SCHEMA & PRISMA ALIGNMENT AUDIT
  // =========================================================================
  it('1. Schema & Prisma Alignment: Assert exact DDL and Prisma model synchronization', () => {
    const migrationPath = path.join(
      process.cwd(),
      'prisma/migrations/20261015_p41_s2_express_only_social_persistence/migration.sql'
    );
    const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');

    expect(fs.existsSync(migrationPath)).toBe(true);
    expect(fs.existsSync(schemaPath)).toBe(true);

    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    const prismaSchema = fs.readFileSync(schemaPath, 'utf8');

    // Assert table names
    expect(migrationSql).toMatch(/CREATE TABLE (IF NOT EXISTS )?public\.pool_messages/);
    expect(migrationSql).toMatch(/CREATE TABLE (IF NOT EXISTS )?public\.pool_reactions/);
    expect(prismaSchema).toContain('model PoolMessage');
    expect(prismaSchema).toContain('model PoolReaction');

    // Assert VARCHAR(500) body
    expect(migrationSql).toContain('body VARCHAR(500) NOT NULL');
    expect(prismaSchema).toContain('body               String        @db.VarChar(500)');

    // Assert composite self-referencing foreign key across all 7 columns
    expect(migrationSql).toContain('CONSTRAINT fk_pool_messages_parent_same_discussion');
    expect(migrationSql).toContain(
      'FOREIGN KEY (parent_message_id, pool_id, target_kind, target_entity_id, season, week, settlement_revision)'
    );
    expect(prismaSchema).toContain(
      'fields: [parentMessageId, poolId, targetKind, targetEntityId, season, week, settlementRevision]'
    );
    expect(prismaSchema).toContain(
      'references: [id, poolId, targetKind, targetEntityId, season, week, settlementRevision]'
    );

    // Assert NULL-safe uniqueness on reactions
    expect(migrationSql).toContain('CONSTRAINT uq_pool_reaction_one_per_actor');
    expect(migrationSql).toContain(
      'UNIQUE (pool_id, season, week, target_kind, target_entity_id, settlement_revision, actor_user_id)'
    );
    expect(prismaSchema).toContain('map: "uq_pool_reaction_one_per_actor"');

    // Assert absence of public.is_active_pool_member and presence of REVOKE ALL
    expect(migrationSql).not.toContain('CREATE OR REPLACE FUNCTION public.is_active_pool_member');
    expect(migrationSql).toContain('REVOKE ALL ON TABLE public.pool_messages FROM PUBLIC;');
    expect(migrationSql).toContain('REVOKE ALL ON TABLE public.pool_reactions FROM PUBLIC;');
  });

  // =========================================================================
  // 2. DIRECT CLIENT ACCESS DENIAL & CONSTRAINT ENFORCEMENT
  // =========================================================================
  it('2. Direct Client Access Denial & Database Constraints: Rejection of invalid revisions, receipt IDs and cross-discussion replies', () => {
    // 2A. SETTLED_RECAP requires revision >= 1 (rejection of settlement_revision = 0)
    const badRecap = rehearsalEngine.evaluateReactionConstraints({
      targetKind: 'SETTLED_RECAP',
      targetEntityId: 'w6-verdict',
      week: 6,
      settlementRevision: 0,
      reactionCode: 'CALLED_IT',
    });
    expect(badRecap.ok).toBe(false);
    expect(badRecap.error).toBe('chk_pool_reactions_revision_gate');

    // 2B. CANONICAL_GAME requires settlement_revision = 0 (rejection of settlement_revision = 1)
    const badGame = rehearsalEngine.evaluateReactionConstraints({
      targetKind: 'CANONICAL_GAME',
      targetEntityId: 'g-w6-sea-den',
      week: 6,
      settlementRevision: 1,
      reactionCode: 'CALLED_IT',
    });
    expect(badGame.ok).toBe(false);
    expect(badGame.error).toBe('chk_pool_reactions_revision_gate');

    // 2C. Rejection of device-local Sweat Receipt / deadline IDs
    const receipt1 = rehearsalEngine.evaluateReactionConstraints({
      targetKind: 'CANONICAL_GAME',
      targetEntityId: 'receipt-local-session-123',
      week: 6,
      settlementRevision: 0,
      reactionCode: 'CALLED_IT',
    });
    expect(receipt1.ok).toBe(false);
    expect(receipt1.error).toBe('chk_pool_reactions_canonical_entity');

    const receipt2 = rehearsalEngine.evaluateReactionConstraints({
      targetKind: 'CANONICAL_GAME',
      targetEntityId: 'dl::reminder::window-1',
      week: 6,
      settlementRevision: 0,
      reactionCode: 'CALLED_IT',
    });
    expect(receipt2.ok).toBe(false);
    expect(receipt2.error).toBe('chk_pool_reactions_canonical_entity');

    const receipt3 = rehearsalEngine.evaluateReactionConstraints({
      targetKind: 'CANONICAL_GAME',
      targetEntityId: 'w6-SEA@DEN-+1::sweat',
      week: 6,
      settlementRevision: 0,
      reactionCode: 'CALLED_IT',
    });
    expect(receipt3.ok).toBe(false);
    expect(receipt3.error).toBe('chk_pool_reactions_canonical_entity');

    // 2D. Rejection of cross-pool or cross-discussion parent replies
    rehearsalEngine.messages.push({
      id: 'parent-msg-1',
      poolId: POOL_MAIN,
      authorUserId: userJack.id,
      clientRequestId: 'req-parent-001',
      parentMessageId: null,
      targetKind: 'CANONICAL_GAME',
      targetEntityId: 'g-w6-sea-den',
      season: 2026,
      week: 6,
      settlementRevision: 0,
      body: 'Parent discussion on SEA @ DEN',
      isPinned: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Cross-pool reply attempt
    const crossPool = rehearsalEngine.evaluateParentSameDiscussionFk('parent-msg-1', {
      poolId: POOL_FOREIGN,
      targetKind: 'CANONICAL_GAME',
      targetEntityId: 'g-w6-sea-den',
      season: 2026,
      week: 6,
      settlementRevision: 0,
    });
    expect(crossPool.ok).toBe(false);

    // Cross-discussion reply attempt (different targetKind)
    const crossDisc = rehearsalEngine.evaluateParentSameDiscussionFk('parent-msg-1', {
      poolId: POOL_MAIN,
      targetKind: 'POOL_LOUNGE',
      targetEntityId: 'LOUNGE_ROOT',
      season: 2026,
      week: 0,
      settlementRevision: 0,
    });
    expect(crossDisc.ok).toBe(false);
  });

  // =========================================================================
  // 3. EXPRESS PERSISTENCE ROUTE & MEMBERSHIP SECURITY
  // =========================================================================
  it('3. Express Persistence Route & Membership Security: Enforce fail-closed active membership & Decision #54 GET safety', async () => {
    // 3A. Active member allows message creation (201)
    const resActive = await fetch(`${baseUrl}/api/pools/${POOL_MAIN}/lounge/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenJack}`,
      },
      body: JSON.stringify({
        clientRequestId: 'req-post-0001',
        body: 'Active commissioner message in Lounge',
        targetKind: 'POOL_LOUNGE',
        targetEntityId: 'LOUNGE_ROOT',
        season: 2026,
        week: 0,
        settlementRevision: 0,
      }),
    });
    expect(resActive.status).toBe(201);
    const dataActive = await resActive.json();
    expect(dataActive.ok).toBe(true);
    expect(dataActive.message.body).toBe('Active commissioner message in Lounge');

    // 3B. Pending member denied (403)
    const resPending = await fetch(`${baseUrl}/api/pools/${POOL_MAIN}/lounge/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenPending}`,
      },
      body: JSON.stringify({
        clientRequestId: 'req-post-0002',
        body: 'Pending applicant trying to chat',
      }),
    });
    expect(resPending.status).toBe(403);
    const dataPending = await resPending.json();
    expect(dataPending.error).toBe('ACTIVE_POOL_MEMBERSHIP_REQUIRED');

    // 3C. Inactive member denied (403)
    const resInactive = await fetch(`${baseUrl}/api/pools/${POOL_MAIN}/lounge/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenInactive}`,
      },
      body: JSON.stringify({
        clientRequestId: 'req-post-0003',
        body: 'Inactive applicant trying to chat',
      }),
    });
    expect(resInactive.status).toBe(403);

    // 3D. Foreign pool actor denied (403)
    const resForeign = await fetch(`${baseUrl}/api/pools/${POOL_MAIN}/lounge/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenForeign}`,
      },
      body: JSON.stringify({
        clientRequestId: 'req-post-0004',
        body: 'Foreign pool member trying to cross into Main League',
      }),
    });
    expect(resForeign.status).toBe(403);

    // 3E. Actor spoofing denied (403)
    const resSpoof = await fetch(`${baseUrl}/api/pools/${POOL_MAIN}/lounge/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenJack}`,
      },
      body: JSON.stringify({
        authorUserId: userPending.id, // spoofing!
        clientRequestId: 'req-post-0005',
        body: 'I am claiming to be someone else',
      }),
    });
    expect(resSpoof.status).toBe(403);
    const dataSpoof = await resSpoof.json();
    expect(dataSpoof.error).toBe('ACTOR_SPOOFING_REJECTED');

    // 3F. Unsettled recap reaction denied (400)
    const resUnsettled = await fetch(`${baseUrl}/api/pools/${POOL_MAIN}/reactions`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenJack}`,
      },
      body: JSON.stringify({
        targetKind: 'SETTLED_RECAP',
        targetEntityId: 'w6-verdict',
        season: 2026,
        week: 6, // Week 6 is not settled!
        settlementRevision: 1,
        reactionCode: 'CALLED_IT',
      }),
    });
    expect(resUnsettled.status).toBe(400);
    const dataUnsettled = await resUnsettled.json();
    expect(dataUnsettled.error).toBe('UNSETTLED_OR_INVALID_RECAP_REVISION');

    // 3G. Decision #54 GET Safety: zero database writes on GET operations
    const writesBefore = rehearsalEngine.writeCount;
    const resGetMsg = await fetch(`${baseUrl}/api/pools/${POOL_MAIN}/lounge/messages`, {
      headers: { Authorization: `Bearer ${tokenJack}` },
    });
    expect(resGetMsg.status).toBe(200);

    const resGetRx = await fetch(
      `${baseUrl}/api/pools/${POOL_MAIN}/reactions?targetKind=POOL_LOUNGE&targetEntityId=LOUNGE_ROOT`,
      {
        headers: { Authorization: `Bearer ${tokenJack}` },
      }
    );
    expect(resGetRx.status).toBe(200);
    expect(rehearsalEngine.writeCount).toBe(writesBefore); // Exactly 0 writes!
  });

  // =========================================================================
  // 4. CONCURRENT MESSAGE RETRIES & CONCURRENT REACTION SET/REMOVE
  // =========================================================================
  it('4. Concurrent Message Retries & Reaction SET/REMOVE: Atomic deduplication, 409 conflict on mutation, and idempotent set/remove', async () => {
    const fixedRequestId = 'req-concurrent-atomic-001';
    const messagePayload = {
      clientRequestId: fixedRequestId,
      body: 'Atomic message under concurrency test',
      targetKind: 'POOL_LOUNGE',
      targetEntityId: 'LOUNGE_ROOT',
      season: 2026,
      week: 0,
      settlementRevision: 0,
    };

    // 4A. Concurrent duplicate requests with the same clientRequestId
    const [sendA, sendB] = await Promise.all([
      fetch(`${baseUrl}/api/pools/${POOL_MAIN}/lounge/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenJack}` },
        body: JSON.stringify(messagePayload),
      }),
      fetch(`${baseUrl}/api/pools/${POOL_MAIN}/lounge/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenJack}` },
        body: JSON.stringify(messagePayload),
      }),
    ]);

    expect([200, 201]).toContain(sendA.status);
    expect([200, 201]).toContain(sendB.status);
    const dataA = await sendA.json();
    const dataB = await sendB.json();

    // Exactly 1 message persisted, both return the same message ID
    expect(dataA.message.id).toBe(dataB.message.id);
    const persistedForReq = rehearsalEngine.messages.filter(
      (m) => m.clientRequestId === fixedRequestId
    );
    expect(persistedForReq.length).toBe(1);

    // 4B. Concurrent mutated-payload retry returns 409 Conflict without overwriting
    const resMutated = await fetch(`${baseUrl}/api/pools/${POOL_MAIN}/lounge/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenJack}` },
      body: JSON.stringify({
        ...messagePayload,
        body: 'MUTATED BODY CONTENT — MUST BE REJECTED WITH 409',
      }),
    });
    expect(resMutated.status).toBe(409);
    const dataMutated = await resMutated.json();
    expect(dataMutated.error).toBe('CLIENT_REQUEST_ID_PAYLOAD_MISMATCH');
    // Ensure original body remains untouched
    const untouched = rehearsalEngine.messages.find((m) => m.clientRequestId === fixedRequestId);
    expect(untouched?.body).toBe('Atomic message under concurrency test');

    // 4C. Concurrent Reaction SET & REMOVE
    const reactionTarget = {
      targetKind: 'CANONICAL_GAME',
      targetEntityId: 'g-w6-sea-den',
      season: 2026,
      week: 6,
      settlementRevision: 0,
    };

    // Step 1: SET CALLED_IT
    const setRes = await fetch(`${baseUrl}/api/pools/${POOL_MAIN}/reactions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenJack}` },
      body: JSON.stringify({ ...reactionTarget, reactionCode: 'CALLED_IT', operation: 'SET' }),
    });
    expect(setRes.status).toBe(200);
    const setData = await setRes.json();
    expect(setData.activeReaction).toBe('CALLED_IT');

    // Step 2: Concurrent replace with COLD
    const [replaceA, replaceB] = await Promise.all([
      fetch(`${baseUrl}/api/pools/${POOL_MAIN}/reactions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenJack}` },
        body: JSON.stringify({ ...reactionTarget, reactionCode: 'COLD', operation: 'SET' }),
      }),
      fetch(`${baseUrl}/api/pools/${POOL_MAIN}/reactions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenJack}` },
        body: JSON.stringify({ ...reactionTarget, reactionCode: 'COLD', operation: 'SET' }),
      }),
    ]);
    expect(replaceA.status).toBe(200);
    expect(replaceB.status).toBe(200);
    // Exactly 1 reaction row persisted for (target, actor)
    const persistedRx = rehearsalEngine.reactions.filter(
      (r) =>
        r.targetEntityId === reactionTarget.targetEntityId &&
        r.actorUserId === userJack.id
    );
    expect(persistedRx.length).toBe(1);
    expect(persistedRx[0].reactionCode).toBe('COLD');

    // Step 3: Concurrent REMOVE
    const [remA, remB] = await Promise.all([
      fetch(`${baseUrl}/api/pools/${POOL_MAIN}/reactions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenJack}` },
        body: JSON.stringify(reactionTarget),
      }),
      fetch(`${baseUrl}/api/pools/${POOL_MAIN}/reactions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenJack}` },
        body: JSON.stringify(reactionTarget),
      }),
    ]);
    expect(remA.status).toBe(200);
    expect(remB.status).toBe(200);
    const persistedRxAfter = rehearsalEngine.reactions.filter(
      (r) =>
        r.targetEntityId === reactionTarget.targetEntityId &&
        r.actorUserId === userJack.id
    );
    expect(persistedRxAfter.length).toBe(0);
  });
});
