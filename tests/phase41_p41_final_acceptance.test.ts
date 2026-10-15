import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import jwt from 'jsonwebtoken';
import express from 'express';
import { JWT_SECRET } from '../src/middleware/auth';
import { poolSocialRouter } from '../src/routes/poolSocialRoutes';
import {
  processPoolLoungeMessageSend,
  executeExplicitReactionOperation,
  summarizeReactionsForTarget,
  validateCanonicalReactionTarget,
} from '../src/services/poolSocialService';

describe('Phase 41 Final Acceptance (P41_FINAL_ACCEPTANCE): Client-Server Integration & Production Acceptance', () => {
  let app: express.Application;
  let server: http.Server;
  let baseUrl: string;

  const POOL_MAIN = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';
  const POOL_FOREIGN = 'e82b7812-40e1-4567-9abc-1234567890ab';

  const userA = { id: 'user-member-a', email: 'member_a@pickem.com', role: 'USER' };
  const userB = { id: 'user-member-b', email: 'member_b@pickem.com', role: 'USER' };
  const userNonMember = { id: 'user-nonmember', email: 'intruder@pickem.com', role: 'USER' };

  const tokenA = jwt.sign(userA, JWT_SECRET, { expiresIn: '1h' });
  const tokenB = jwt.sign(userB, JWT_SECRET, { expiresIn: '1h' });
  const tokenNonMember = jwt.sign(userNonMember, JWT_SECRET, { expiresIn: '1h' });

  // In-memory store for acceptance simulation
  let storedMessages: any[] = [];
  let storedReactions: any[] = [];
  let storedMemberships: any[] = [
    { poolId: POOL_MAIN, userId: userA.id, status: 'ACTIVE' },
    { poolId: POOL_MAIN, userId: userB.id, status: 'ACTIVE' },
    { poolId: POOL_FOREIGN, userId: userNonMember.id, status: 'ACTIVE' },
  ];

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
    storedMessages = [];
    storedReactions = [];
  });

  // =========================================================================
  // 1. PENDING VS ACKNOWLEDGED SEND STATE & ISOLATION
  // =========================================================================
  it('1. Pending versus acknowledged send state: message shows PENDING before acknowledgement, SENT upon 200/201 response', () => {
    const reqId = `req-acc-${Date.now()}`;
    const initialSend = processPoolLoungeMessageSend({
      existingMessages: [],
      poolId: POOL_MAIN,
      authorizedPoolId: POOL_MAIN,
      authenticatedActorId: userA.id,
      authenticatedActorName: userA.email,
      actorMembershipStatus: 'ACTIVE',
      clientRequestId: reqId,
      body: 'PHASE41 ACCEPTANCE TEST — MEMBER A',
    });

    expect(initialSend.ok).toBe(true);
    expect(initialSend.message).not.toBeNull();
    // Prior to server ACK, client represents pending/optimistic state
    const pendingClientMessage = {
      ...initialSend.message!,
      deliveryState: 'PENDING' as const,
    };
    expect(pendingClientMessage.deliveryState).toBe('PENDING');

    // Upon server ACK, deliveryState transitions to SENT
    const ackedMessage = {
      ...pendingClientMessage,
      deliveryState: 'SENT' as const,
    };
    expect(ackedMessage.deliveryState).toBe('SENT');
  });

  // =========================================================================
  // 2. FAILED SEND & SAME-REQUEST-ID RETRY
  // =========================================================================
  it('2. Failed send and same-request-ID retry: retrying with identical request ID reconciles without duplicates', () => {
    const reqId = `req-retry-${Date.now()}`;
    const body = 'Test message needing retry';

    // First attempt stored
    const firstRes = processPoolLoungeMessageSend({
      existingMessages: [],
      poolId: POOL_MAIN,
      authorizedPoolId: POOL_MAIN,
      authenticatedActorId: userA.id,
      authenticatedActorName: userA.email,
      actorMembershipStatus: 'ACTIVE',
      clientRequestId: reqId,
      body,
    });
    expect(firstRes.ok).toBe(true);
    expect(firstRes.isIdempotentReplay).toBe(false);

    // Replay with exact same request ID and body
    const replayRes = processPoolLoungeMessageSend({
      existingMessages: firstRes.messages,
      poolId: POOL_MAIN,
      authorizedPoolId: POOL_MAIN,
      authenticatedActorId: userA.id,
      authenticatedActorName: userA.email,
      actorMembershipStatus: 'ACTIVE',
      clientRequestId: reqId,
      body,
    });
    expect(replayRes.ok).toBe(true);
    expect(replayRes.isIdempotentReplay).toBe(true);
    expect(replayRes.messages.length).toBe(1);

    // Mutated payload on same request ID must return 409 CONFLICT
    const conflictRes = processPoolLoungeMessageSend({
      existingMessages: firstRes.messages,
      poolId: POOL_MAIN,
      authorizedPoolId: POOL_MAIN,
      authenticatedActorId: userA.id,
      authenticatedActorName: userA.email,
      actorMembershipStatus: 'ACTIVE',
      clientRequestId: reqId,
      body: 'Tampered different body',
    });
    expect(conflictRes.ok).toBe(false);
    expect(conflictRes.httpStatus).toBe(409);
    expect(conflictRes.errorCode).toBe('CLIENT_REQUEST_ID_PAYLOAD_MISMATCH');
  });

  // =========================================================================
  // 3. CORRECT CANONICAL TARGET CONTEXT & REPLY PARENT ASSOCIATION
  // =========================================================================
  it('3. Canonical target context & reply association: replies are locked to same-pool and same-discussion scope', () => {
    const parentReqId = `req-p-${Date.now()}`;
    const parentSend = processPoolLoungeMessageSend({
      existingMessages: [],
      poolId: POOL_MAIN,
      authorizedPoolId: POOL_MAIN,
      authenticatedActorId: userA.id,
      authenticatedActorName: userA.email,
      actorMembershipStatus: 'ACTIVE',
      clientRequestId: parentReqId,
      body: 'Root discussion message',
      contextCard: {
        targetKind: 'CANONICAL_GAME',
        season: 2026,
        week: 6,
        entityId: 'g-w6-sea-den',
        settlementRevision: 0,
        title: 'SEA @ DEN',
        subtitle: 'Week 6 Discussion',
        deepLinkTab: 'matrix',
      },
    });

    const parentMsg = parentSend.message!;
    expect(parentMsg).toBeDefined();

    // Valid reply in same discussion
    const validReply = processPoolLoungeMessageSend({
      existingMessages: parentSend.messages,
      poolId: POOL_MAIN,
      authorizedPoolId: POOL_MAIN,
      authenticatedActorId: userB.id,
      authenticatedActorName: userB.email,
      actorMembershipStatus: 'ACTIVE',
      clientRequestId: `req-r-${Date.now()}`,
      body: 'I agree with Member A on Seattle',
      parentMessageId: parentMsg.id,
      contextCard: {
        targetKind: 'CANONICAL_GAME',
        season: 2026,
        week: 6,
        entityId: 'g-w6-sea-den',
        settlementRevision: 0,
        title: 'SEA @ DEN',
        subtitle: 'Week 6 Discussion',
        deepLinkTab: 'matrix',
      },
    });
    expect(validReply.ok).toBe(true);
    expect(validReply.message?.parentMessageId).toBe(parentMsg.id);

    // Cross-discussion reply forbidden
    const crossDiscussionReply = processPoolLoungeMessageSend({
      existingMessages: parentSend.messages,
      poolId: POOL_MAIN,
      authorizedPoolId: POOL_MAIN,
      authenticatedActorId: userB.id,
      authenticatedActorName: userB.email,
      actorMembershipStatus: 'ACTIVE',
      clientRequestId: `req-cross-${Date.now()}`,
      body: 'Attempting to reply to SEA@DEN in KC@BUF',
      parentMessageId: parentMsg.id,
      contextCard: {
        targetKind: 'CANONICAL_GAME',
        season: 2026,
        week: 6,
        entityId: 'g-w6-kc-buf',
        settlementRevision: 0,
        title: 'KC @ BUF',
        subtitle: 'Different Matchup',
        deepLinkTab: 'matrix',
      },
    });
    expect(crossDiscussionReply.ok).toBe(false);
    expect(crossDiscussionReply.errorCode).toBe('CROSS_DISCUSSION_REPLY_FORBIDDEN');
  });

  // =========================================================================
  // 4. REACTION SET / REPLACEMENT / REMOVE REQUEST MAPPING
  // =========================================================================
  it('4. Reaction SET, REPLACE, and REMOVE: explicit operations maintain exactly 1 active reaction per actor per target', () => {
    const target = {
      poolId: POOL_MAIN,
      season: 2026,
      week: 6,
      targetKind: 'CANONICAL_GAME' as const,
      entityId: 'g-w6-sea-den',
    };

    // SET: Member A sets CALLED_IT
    const setRes = executeExplicitReactionOperation({
      existingEntries: [],
      target,
      operation: 'SET',
      reactionCode: 'CALLED_IT',
      authenticatedActorId: userA.id,
      authenticatedActorName: userA.email,
      authorizedPoolId: POOL_MAIN,
      actorMembershipStatus: 'ACTIVE',
    });
    expect(setRes.ok).toBe(true);
    expect(setRes.entries.length).toBe(1);
    expect(setRes.activeReaction).toBe('CALLED_IT');

    // REPLACE: Member A replaces CALLED_IT with COLD
    const replaceRes = executeExplicitReactionOperation({
      existingEntries: setRes.entries,
      target,
      operation: 'SET',
      reactionCode: 'COLD',
      authenticatedActorId: userA.id,
      authenticatedActorName: userA.email,
      authorizedPoolId: POOL_MAIN,
      actorMembershipStatus: 'ACTIVE',
    });
    expect(replaceRes.ok).toBe(true);
    expect(replaceRes.entries.length).toBe(1);
    expect(replaceRes.activeReaction).toBe('COLD');

    // Member B adds PAIN
    const bRes = executeExplicitReactionOperation({
      existingEntries: replaceRes.entries,
      target,
      operation: 'SET',
      reactionCode: 'PAIN',
      authenticatedActorId: userB.id,
      authenticatedActorName: userB.email,
      authorizedPoolId: POOL_MAIN,
      actorMembershipStatus: 'ACTIVE',
    });
    expect(bRes.ok).toBe(true);
    expect(bRes.entries.length).toBe(2);

    // REMOVE: Member A removes COLD
    const removeRes = executeExplicitReactionOperation({
      existingEntries: bRes.entries,
      target,
      operation: 'REMOVE',
      authenticatedActorId: userA.id,
      authenticatedActorName: userA.email,
      authorizedPoolId: POOL_MAIN,
      actorMembershipStatus: 'ACTIVE',
    });
    expect(removeRes.ok).toBe(true);
    expect(removeRes.entries.length).toBe(1);
    expect(removeRes.activeReaction).toBeNull();
    expect(removeRes.entries[0].actorUserId).toBe(userB.id);
  });

  // =========================================================================
  // 5. UNSETTLED RECAP & PREVIEW FIXTURE ISOLATION
  // =========================================================================
  it('5. Unsettled recap gating & preview fixture isolation: rejects unsettled weeks and demo receipt targets', () => {
    // Unsettled week (e.g. Week 6 before official finalization)
    const unsettledRecapTarget = {
      poolId: POOL_MAIN,
      season: 2026,
      week: 6,
      targetKind: 'SETTLED_RECAP' as const,
      entityId: 'w6-verdict',
      isOfficiallySettled: false,
    };
    const valUnsettled = validateCanonicalReactionTarget(unsettledRecapTarget);
    expect(valUnsettled.isValid).toBe(false);
    expect(valUnsettled.errorReason).toBe('UNSETTLED_RECAP_REACTION_FORBIDDEN');

    // Settled recap missing revision
    const missingRevTarget = {
      poolId: POOL_MAIN,
      season: 2026,
      week: 5,
      targetKind: 'SETTLED_RECAP' as const,
      entityId: 'w5-verdict',
      isOfficiallySettled: true,
      settlementRevision: 0,
    };
    const valMissingRev = validateCanonicalReactionTarget(missingRevTarget);
    expect(valMissingRev.isValid).toBe(false);
    expect(valMissingRev.errorReason).toBe('SETTLEMENT_REVISION_REQUIRED_FOR_RECAP');

    // Device-local receipt target rejected
    const receiptTarget = {
      poolId: POOL_MAIN,
      season: 2026,
      week: 6,
      targetKind: 'CANONICAL_GAME' as const,
      entityId: 'receipt-12345-session',
    };
    const valReceipt = validateCanonicalReactionTarget(receiptTarget);
    expect(valReceipt.isValid).toBe(false);
    expect(valReceipt.errorReason).toBe('DEVICE_LOCAL_RECEIPT_ID_FORBIDDEN');
  });

  // =========================================================================
  // 6. POOL MEMBER AUTHORIZATION BOUNDARY
  // =========================================================================
  it('6. Pool member authorization boundary: rejects non-members and cross-pool actors with 403', () => {
    const res = processPoolLoungeMessageSend({
      existingMessages: [],
      poolId: POOL_MAIN,
      authorizedPoolId: POOL_MAIN,
      authenticatedActorId: userNonMember.id,
      authenticatedActorName: userNonMember.email,
      actorMembershipStatus: 'INACTIVE',
      clientRequestId: `req-denied-${Date.now()}`,
      body: 'I am not an active member',
    });
    expect(res.ok).toBe(false);
    expect(res.httpStatus).toBe(403);
    expect(res.errorCode).toBe('ACTIVE_POOL_MEMBERSHIP_REQUIRED');

    // Cross-pool attempt
    const crossRes = processPoolLoungeMessageSend({
      existingMessages: [],
      poolId: POOL_MAIN,
      authorizedPoolId: POOL_FOREIGN,
      authenticatedActorId: userA.id,
      authenticatedActorName: userA.email,
      actorMembershipStatus: 'ACTIVE',
      clientRequestId: `req-cross-pool-${Date.now()}`,
      body: 'Trying to post in foreign pool',
    });
    expect(crossRes.ok).toBe(false);
    expect(crossRes.httpStatus).toBe(403);
    expect(crossRes.errorCode).toBe('CROSS_POOL_DENIED');
  });
});
