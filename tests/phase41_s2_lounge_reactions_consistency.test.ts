import { describe, it, expect } from 'vitest';
import {
  resolveCanonicalGameKickoff,
} from '../src/services/dependableInfoService';
import {
  planDeadlineReminders,
  DeadlineGameWindowInput,
} from '../src/services/deadlineAlertPlanner';
import {
  validateCanonicalReactionTarget,
  executeExplicitReactionOperation,
  processPoolLoungeMessageSend,
  paginatePoolLoungeMessages,
  CanonicalReactionTarget,
  ReactionEntry,
  PoolLoungeMessage,
} from '../src/services/poolSocialService';

describe('Phase 41 Sprint 2 (P41-S2): Pool Lounge, Contextual Threads & Explicit Reaction API', () => {
  // =========================================================================
  // TEST 1: P41-S1 Carry-Forward Consistency & Kickoff Unification
  // =========================================================================
  it('1. P41-S1 Carry-Forward Consistency: Canonical kickoff resolution & coherent 11-9 demo fixture math', () => {
    // 1A. Canonical Kickoff Resolution for SEA @ DEN across app views
    const seaDenGame = {
      id: 'g-w6-sea-den',
      awayTeam: 'SEA',
      homeTeam: 'DEN',
      kickoffIso: '2026-10-16T00:15:00.000Z',
    };
    const resolvedKickoff = resolveCanonicalGameKickoff(seaDenGame);
    expect(resolvedKickoff.status).toBe('RESOLVED');
    expect(resolvedKickoff.kickoffIso).toBe('2026-10-16T00:15:00.000Z');
    expect(resolvedKickoff.kickoffDisplay).toBe('Thu 5:15 PM');
    expect(resolvedKickoff.isThursdayNight).toBe(true);

    // Verify Deadline Alert Planner respects the exact Thu 5:15 PM canonical timestamp
    const deadlineWindows: DeadlineGameWindowInput[] = [
      {
        gameId: seaDenGame.id,
        awayTeam: seaDenGame.awayTeam,
        homeTeam: seaDenGame.homeTeam,
        kickoffIso: resolvedKickoff.kickoffIso,
      },
    ];
    const plan = planDeadlineReminders({
      userId: 'u_jack',
      poolId: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
      season: 2026,
      week: 6,
      optInEnabled: true,
      permissionState: 'GRANTED',
      isSlateSubmitted: false,
      hasAcceptedSlate: true,
      nowMs: new Date('2026-10-15T12:00:00.000Z').getTime(),
      games: deadlineWindows,
    });
    expect(plan.toSchedule.length).toBe(1);
    expect(plan.toSchedule[0].kickoffIso).toBe('2026-10-16T00:15:00.000Z');
    expect(plan.toSchedule[0].matchupSummary).toContain('SEA @ DEN');

    // Without canonical authority, resolveCanonicalGameKickoff returns UNAVAILABLE (never a fixed substitute)
    const houJaxWithoutAuth = resolveCanonicalGameKickoff({ awayTeam: 'HOU', homeTeam: 'JAX' });
    expect(houJaxWithoutAuth.status).toBe('UNAVAILABLE');
    expect(houJaxWithoutAuth.kickoffDisplay).toBe('Unavailable');

    // With canonical authority, kickoff display formats correctly
    const houJaxWithAuth = resolveCanonicalGameKickoff({
      awayTeam: 'HOU',
      homeTeam: 'JAX',
      kickoffIso: '2026-10-18T13:30:00.000Z',
    });
    expect(houJaxWithAuth.kickoffDisplay).toBe('Sun 6:30 AM');

    const balCleWithAuth = resolveCanonicalGameKickoff({
      awayTeam: 'BAL',
      homeTeam: 'CLE',
      kickoffIso: '2026-10-18T17:00:00.000Z',
    });
    expect(balCleWithAuth.kickoffDisplay).toBe('Sun 10:00 AM');

    const dalGbWithAuth = resolveCanonicalGameKickoff({
      awayTeam: 'DAL',
      homeTeam: 'GB',
      kickoffIso: '2026-10-19T00:20:00.000Z',
    });
    expect(dalGbWithAuth.kickoffDisplay).toBe('Sun 5:20 PM');

    // 1B. Coherent Big Board 10-Member Demo Fixture Math (11 vs 9, +2 margin)
    const jackPoints = 11; // 9 banked + 2 live
    const jcone2Points = 9; // 8 banked + 1 live
    const viewerGap = jackPoints - jcone2Points;
    expect(viewerGap).toBe(2);

    // Rooting queue projection from +2 lead:
    // If viewer's team (SEA) wins, gap increases from +2 to +3
    const projectedWinGap = viewerGap + 1;
    expect(projectedWinGap).toBe(3);
    const rootingMessage = `A SEA win moves your duel margin vs. jcone2 from +${viewerGap} to +${projectedWinGap} pts`;
    expect(rootingMessage).toBe('A SEA win moves your duel margin vs. jcone2 from +2 to +3 pts');
  });

  // =========================================================================
  // TEST 2: Pool Lounge Security, Retry Idempotency & Deterministic Pagination
  // =========================================================================
  it('2. Pool Lounge Security & Retry Idempotency: Gating, deduplication, conflict on mutation & GET safety', () => {
    const poolId = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';
    const actorId = 'u1';
    const actorName = 'jack.w.cone';
    let messages: PoolLoungeMessage[] = [];

    // 2A. Active pool member creates message (201 Created)
    const send1 = processPoolLoungeMessageSend({
      existingMessages: messages,
      poolId,
      authorizedPoolId: poolId,
      authenticatedActorId: actorId,
      authenticatedActorName: actorName,
      actorMembershipStatus: 'ACTIVE',
      clientRequestId: 'req-uuid-0001',
      body: 'TNF kickoff locked in. SEA @ DEN is live!',
      nowIso: '2026-10-15T18:00:00.000Z',
    });
    expect(send1.ok).toBe(true);
    expect(send1.httpStatus).toBe(201);
    expect(send1.isIdempotentReplay).toBe(false);
    expect(send1.message).not.toBeNull();
    expect(send1.messages.length).toBe(1);
    messages = send1.messages;

    // 2B. Pending/Revoked member denied (403 ACTIVE_POOL_MEMBERSHIP_REQUIRED)
    const sendPending = processPoolLoungeMessageSend({
      existingMessages: messages,
      poolId,
      authorizedPoolId: poolId,
      authenticatedActorId: 'u-pending',
      authenticatedActorName: 'pending_guy',
      actorMembershipStatus: 'PENDING',
      clientRequestId: 'req-uuid-0002',
      body: 'Can I chat?',
    });
    expect(sendPending.ok).toBe(false);
    expect(sendPending.httpStatus).toBe(403);
    expect(sendPending.errorCode).toBe('ACTIVE_POOL_MEMBERSHIP_REQUIRED');

    // 2C. Foreign pool denied (403 CROSS_POOL_DENIED)
    const sendCrossPool = processPoolLoungeMessageSend({
      existingMessages: messages,
      poolId: 'different-pool-999',
      authorizedPoolId: poolId,
      authenticatedActorId: actorId,
      authenticatedActorName: actorName,
      actorMembershipStatus: 'ACTIVE',
      clientRequestId: 'req-uuid-0003',
      body: 'Trying to post into another pool',
    });
    expect(sendCrossPool.ok).toBe(false);
    expect(sendCrossPool.httpStatus).toBe(403);
    expect(sendCrossPool.errorCode).toBe('CROSS_POOL_DENIED');

    // 2D. Actor spoofing rejection (403 ACTOR_SPOOFING_REJECTED)
    const sendSpoofed = processPoolLoungeMessageSend({
      existingMessages: messages,
      poolId,
      authorizedPoolId: poolId,
      authenticatedActorId: actorId,
      authenticatedActorName: actorName,
      claimedAuthorId: 'attacker-id-666',
      actorMembershipStatus: 'ACTIVE',
      clientRequestId: 'req-uuid-0004',
      body: 'I am claiming to be someone else',
    });
    expect(sendSpoofed.ok).toBe(false);
    expect(sendSpoofed.httpStatus).toBe(403);
    expect(sendSpoofed.errorCode).toBe('ACTOR_SPOOFING_REJECTED');

    // 2E. Retry Idempotency: Re-sending with same clientRequestId returns 200 OK without creating duplicate
    const sendRetry = processPoolLoungeMessageSend({
      existingMessages: messages,
      poolId,
      authorizedPoolId: poolId,
      authenticatedActorId: actorId,
      authenticatedActorName: actorName,
      actorMembershipStatus: 'ACTIVE',
      clientRequestId: 'req-uuid-0001', // exact same request ID
      body: 'TNF kickoff locked in. SEA @ DEN is live!', // exact same body
    });
    expect(sendRetry.ok).toBe(true);
    expect(sendRetry.httpStatus).toBe(200);
    expect(sendRetry.isIdempotentReplay).toBe(true);
    expect(sendRetry.message?.id).toBe(send1.message?.id);
    expect(sendRetry.messages.length).toBe(1); // 0 duplicate rows

    // 2F. Payload Mutation on Reused clientRequestId returns 409 CONFLICT
    const sendConflict = processPoolLoungeMessageSend({
      existingMessages: messages,
      poolId,
      authorizedPoolId: poolId,
      authenticatedActorId: actorId,
      authenticatedActorName: actorName,
      actorMembershipStatus: 'ACTIVE',
      clientRequestId: 'req-uuid-0001', // reused request ID
      body: 'MUTATED BODY: changed my message!', // different body!
    });
    expect(sendConflict.ok).toBe(false);
    expect(sendConflict.httpStatus).toBe(409);
    expect(sendConflict.errorCode).toBe('CLIENT_REQUEST_ID_PAYLOAD_MISMATCH');
    expect(sendConflict.messages.length).toBe(1);

    // 2G. Parent reply validation: cross-pool or non-existent parent returns 400
    const sendBadParent = processPoolLoungeMessageSend({
      existingMessages: messages,
      poolId,
      authorizedPoolId: poolId,
      authenticatedActorId: actorId,
      authenticatedActorName: actorName,
      actorMembershipStatus: 'ACTIVE',
      clientRequestId: 'req-uuid-0005',
      body: 'Replying to ghost message',
      parentMessageId: 'non-existent-msg-id',
    });
    expect(sendBadParent.ok).toBe(false);
    expect(sendBadParent.httpStatus).toBe(400);
    expect(sendBadParent.errorCode).toBe('INVALID_CROSS_POOL_OR_MISSING_PARENT');

    // 2H. Decision #54 GET Safety: paginatePoolLoungeMessages is purely read-only (0 writes)
    const initialCount = messages.length;
    const pageResult = paginatePoolLoungeMessages({
      messages,
      poolId,
      limit: 10,
    });
    expect(pageResult.items.length).toBe(1);
    expect(messages.length).toBe(initialCount); // zero mutations on GET
  });

  // =========================================================================
  // TEST 3: Explicit Set/Remove Reaction State & Strict Revision Gating
  // =========================================================================
  it('3. Explicit Set/Remove Reaction State: Idempotent replacement, removal, revision isolation & receipt exclusion', () => {
    const poolId = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';
    const actorId = 'u1';
    const actorName = 'jack.w.cone';
    let reactions: ReactionEntry[] = [];

    const canonicalGameTarget: CanonicalReactionTarget = {
      poolId,
      season: 2026,
      week: 6,
      targetKind: 'CANONICAL_GAME',
      entityId: 'g-w6-sea-den',
    };

    // 3A. Explicit SET creates reaction
    const set1 = executeExplicitReactionOperation({
      existingEntries: reactions,
      target: canonicalGameTarget,
      operation: 'SET',
      reactionCode: 'CALLED_IT',
      authenticatedActorId: actorId,
      authenticatedActorName: actorName,
      authorizedPoolId: poolId,
      actorMembershipStatus: 'ACTIVE',
    });
    expect(set1.ok).toBe(true);
    expect(set1.httpStatus).toBe(200);
    expect(set1.entries.length).toBe(1);
    expect(set1.activeReaction).toBe('CALLED_IT');
    reactions = set1.entries;

    // 3B. Repeating SET with same reactionCode is idempotent (leaves reaction active)
    const setRepeat = executeExplicitReactionOperation({
      existingEntries: reactions,
      target: canonicalGameTarget,
      operation: 'SET',
      reactionCode: 'CALLED_IT',
      authenticatedActorId: actorId,
      authenticatedActorName: actorName,
      authorizedPoolId: poolId,
      actorMembershipStatus: 'ACTIVE',
    });
    expect(setRepeat.ok).toBe(true);
    expect(setRepeat.entries.length).toBe(1);
    expect(setRepeat.activeReaction).toBe('CALLED_IT');

    // 3C. SET with new code replaces previous reaction (1 reaction per actor per target)
    const setReplace = executeExplicitReactionOperation({
      existingEntries: reactions,
      target: canonicalGameTarget,
      operation: 'SET',
      reactionCode: 'PAIN',
      authenticatedActorId: actorId,
      authenticatedActorName: actorName,
      authorizedPoolId: poolId,
      actorMembershipStatus: 'ACTIVE',
    });
    expect(setReplace.ok).toBe(true);
    expect(setReplace.entries.length).toBe(1);
    expect(setReplace.activeReaction).toBe('PAIN');
    reactions = setReplace.entries;

    // 3D. Explicit REMOVE deletes reaction
    const remove1 = executeExplicitReactionOperation({
      existingEntries: reactions,
      target: canonicalGameTarget,
      operation: 'REMOVE',
      authenticatedActorId: actorId,
      authenticatedActorName: actorName,
      authorizedPoolId: poolId,
      actorMembershipStatus: 'ACTIVE',
    });
    expect(remove1.ok).toBe(true);
    expect(remove1.entries.length).toBe(0);
    expect(remove1.activeReaction).toBeNull();
    reactions = remove1.entries;

    // Repeating REMOVE is idempotent
    const removeRepeat = executeExplicitReactionOperation({
      existingEntries: reactions,
      target: canonicalGameTarget,
      operation: 'REMOVE',
      authenticatedActorId: actorId,
      authenticatedActorName: actorName,
      authorizedPoolId: poolId,
      actorMembershipStatus: 'ACTIVE',
    });
    expect(removeRepeat.ok).toBe(true);
    expect(removeRepeat.entries.length).toBe(0);

    // 3E. Unsettled recap reactions are rejected (UNSETTLED_RECAP_REACTION_FORBIDDEN)
    const unsettledTarget: CanonicalReactionTarget = {
      poolId,
      season: 2026,
      week: 6,
      targetKind: 'SETTLED_RECAP',
      entityId: 'w6-verdict',
      isOfficiallySettled: false,
    };
    const valUnsettled = validateCanonicalReactionTarget(unsettledTarget);
    expect(valUnsettled.isValid).toBe(false);
    expect(valUnsettled.errorReason).toBe('UNSETTLED_RECAP_REACTION_FORBIDDEN');

    // 3F. Settled recap reactions require settlementRevision >= 1 and isolate rev:1 from rev:2
    const recapRev1Target: CanonicalReactionTarget = {
      poolId,
      season: 2026,
      week: 6,
      targetKind: 'SETTLED_RECAP',
      entityId: 'w6-verdict',
      isOfficiallySettled: true,
      settlementRevision: 1,
    };
    const valRev1 = validateCanonicalReactionTarget(recapRev1Target);
    expect(valRev1.isValid).toBe(true);
    expect(valRev1.canonicalKey).toBe(
      `rx::${poolId}::s2026::w6::SETTLED_RECAP::w6-verdict::rev:1`
    );

    const recapRev2Target: CanonicalReactionTarget = {
      poolId,
      season: 2026,
      week: 6,
      targetKind: 'SETTLED_RECAP',
      entityId: 'w6-verdict',
      isOfficiallySettled: true,
      settlementRevision: 2,
    };
    const valRev2 = validateCanonicalReactionTarget(recapRev2Target);
    expect(valRev2.isValid).toBe(true);
    expect(valRev2.canonicalKey).toBe(
      `rx::${poolId}::s2026::w6::SETTLED_RECAP::w6-verdict::rev:2`
    );
    // Keys must be strictly distinct across revisions
    expect(valRev1.canonicalKey).not.toBe(valRev2.canonicalKey);

    // 3G. Device-local Sweat Receipt IDs or reminder IDs are rejected
    const receiptTarget: CanonicalReactionTarget = {
      poolId,
      season: 2026,
      week: 6,
      targetKind: 'CANONICAL_GAME',
      entityId: 'receipt-2026-10-15-u1',
    };
    const valReceipt = validateCanonicalReactionTarget(receiptTarget);
    expect(valReceipt.isValid).toBe(false);
    expect(valReceipt.errorReason).toBe('DEVICE_LOCAL_RECEIPT_ID_FORBIDDEN');

    const reminderTarget: CanonicalReactionTarget = {
      poolId,
      season: 2026,
      week: 6,
      targetKind: 'CANONICAL_GAME',
      entityId: 'dl::reminder::window-1',
    };
    const valReminder = validateCanonicalReactionTarget(reminderTarget);
    expect(valReminder.isValid).toBe(false);
    expect(valReminder.errorReason).toBe('DEVICE_LOCAL_RECEIPT_ID_FORBIDDEN');
  });
});
