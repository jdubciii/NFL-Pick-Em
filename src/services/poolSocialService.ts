/**
 * Phase 41 Sprint 2 (P41-S2): Pool Lounge, Contextual Threads & Explicit Reaction Service
 * Enforces:
 * - Permanent Pool Lounge continuity across weeks + canonical context cards (GAME_CARD, SETTLED_RECAP, PENALTY_REEL)
 * - Client-generated requestId retry idempotency (409 Conflict if reused with mutated content/target)
 * - Deterministic cursor pagination (createdAtIso ASC, id ASC)
 * - Explicit SET (replace) and REMOVE reaction operations (no toggle-retry ambiguity)
 * - Strict settlement-revision gating for SETTLED_RECAP targets and rejection of Sweat Receipt / simulation IDs
 */

export type ReactionCode = 'CALLED_IT' | 'COLD' | 'PAIN' | 'PIT_BOUND';

export type CanonicalTargetKind =
  | 'POOL_LOUNGE'
  | 'CANONICAL_GAME'
  | 'SETTLED_RECAP'
  | 'PENALTY_REEL'
  | 'POOL_CHAT_MESSAGE';

export interface CanonicalReactionTarget {
  poolId: string;
  season: number;
  week: number;
  targetKind: string;
  entityId: string;
  settlementRevision?: number | null;
  isOfficiallySettled?: boolean;
  isSimulation?: boolean;
  isDemoFixture?: boolean;
}

export interface CanonicalTargetValidation {
  isValid: boolean;
  canonicalKey: string | null;
  normalizedRevision: number;
  errorReason: string | null;
}

export interface ReactionEntry {
  canonicalKey: string;
  poolId: string;
  season: number;
  week: number;
  targetKind: CanonicalTargetKind;
  entityId: string;
  settlementRevision: number; // 0 for non-revisioned targets; >= 1 for SETTLED_RECAP
  actorUserId: string;
  actorDisplayName: string;
  reactionCode: ReactionCode;
  updatedAtIso: string;
}

export interface ReactionSummaryChip {
  code: ReactionCode;
  emoji: string;
  label: string;
  count: number;
  viewerSelected: boolean;
}

export interface CanonicalContextCardAttachment {
  targetKind: 'CANONICAL_GAME' | 'SETTLED_RECAP' | 'PENALTY_REEL';
  season: number;
  week: number;
  entityId: string;
  settlementRevision: number;
  title: string;
  subtitle: string;
  deepLinkTab: 'picks' | 'matrix' | 'radar' | 'shame';
}

export type MessageDeliveryState = 'PENDING' | 'SENT' | 'FAILED';

export interface PoolLoungeMessage {
  id: string;
  poolId: string;
  authorUserId: string;
  authorDisplayName: string;
  clientRequestId: string;
  body: string;
  parentMessageId: string | null;
  contextCard: CanonicalContextCardAttachment | null;
  createdAtIso: string;
  deliveryState: MessageDeliveryState;
}

export const MAX_LOUNGE_MESSAGE_LENGTH = 500;

export const REACTION_CATALOG: ReadonlyArray<{ code: ReactionCode; emoji: string; label: string }> = [
  { code: 'CALLED_IT', emoji: '🎯', label: 'Called it' },
  { code: 'COLD', emoji: '🥶', label: 'Cold' },
  { code: 'PAIN', emoji: '💀', label: 'Pain' },
  { code: 'PIT_BOUND', emoji: '🕳️', label: 'Pit bound' },
];

export function sanitizeChatDisplayHandle(raw: string | null | undefined): string {
  const trimmed = (raw || 'Member').trim();
  const withoutEmail = trimmed.includes('@') ? trimmed.split('@')[0] : trimmed;
  return withoutEmail.replace(/\bMAIN26\b/gi, 'POOL');
}

export function validateCanonicalReactionTarget(
  target: CanonicalReactionTarget
): CanonicalTargetValidation {
  if (!target.poolId || !target.entityId || !target.season || !target.week) {
    return {
      isValid: false,
      canonicalKey: null,
      normalizedRevision: 0,
      errorReason: 'MISSING_REQUIRED_TARGET_FIELDS',
    };
  }

  if (target.isSimulation || target.isDemoFixture) {
    return {
      isValid: false,
      canonicalKey: null,
      normalizedRevision: 0,
      errorReason: 'SIMULATION_OR_FIXTURE_TARGET_FORBIDDEN',
    };
  }

  if (
    target.targetKind !== 'CANONICAL_GAME' &&
    target.targetKind !== 'SETTLED_RECAP' &&
    target.targetKind !== 'POOL_CHAT_MESSAGE' &&
    target.targetKind !== 'PENALTY_REEL'
  ) {
    return {
      isValid: false,
      canonicalKey: null,
      normalizedRevision: 0,
      errorReason: 'UNSUPPORTED_TARGET_KIND',
    };
  }

  // Reject device-local Sweat Receipt IDs or reminder IDs
  const entityClean = target.entityId.trim();
  if (
    entityClean.includes('::') ||
    entityClean.startsWith('receipt-') ||
    entityClean.startsWith('session-') ||
    entityClean.startsWith('dl::') ||
    /^w\d+-[A-Z]+@[A-Z]+-[+-]?\d+$/i.test(entityClean)
  ) {
    return {
      isValid: false,
      canonicalKey: null,
      normalizedRevision: 0,
      errorReason: 'DEVICE_LOCAL_RECEIPT_ID_FORBIDDEN',
    };
  }

  if (target.targetKind === 'SETTLED_RECAP') {
    if (target.isOfficiallySettled === false) {
      return {
        isValid: false,
        canonicalKey: null,
        normalizedRevision: 0,
        errorReason: 'UNSETTLED_RECAP_REACTION_FORBIDDEN',
      };
    }
    const rev = typeof target.settlementRevision === 'number' && target.settlementRevision >= 1
      ? Math.floor(target.settlementRevision)
      : 0;
    if (rev < 1) {
      return {
        isValid: false,
        canonicalKey: null,
        normalizedRevision: 0,
        errorReason: 'SETTLEMENT_REVISION_REQUIRED_FOR_RECAP',
      };
    }
    const canonicalKey = `rx::${target.poolId}::s${target.season}::w${target.week}::SETTLED_RECAP::${entityClean}::rev:${rev}`;
    return {
      isValid: true,
      canonicalKey,
      normalizedRevision: rev,
      errorReason: null,
    };
  }

  const canonicalKey = `rx::${target.poolId}::s${target.season}::w${target.week}::${target.targetKind}::${entityClean}`;
  return {
    isValid: true,
    canonicalKey,
    normalizedRevision: 0,
    errorReason: null,
  };
}

/**
 * Explicit SET / REMOVE reaction operation (Path A).
 * - operation === 'SET': sets or replaces the actor's single active reaction on the target. Repeating SET with the same reactionCode is idempotent (leaves the reaction active).
 * - operation === 'REMOVE': removes the actor's active reaction on the target. Repeating REMOVE is idempotent (leaves it absent).
 */
export function executeExplicitReactionOperation(params: {
  existingEntries: ReactionEntry[];
  target: CanonicalReactionTarget;
  operation: 'SET' | 'REMOVE';
  reactionCode?: ReactionCode | null;
  authenticatedActorId: string | null | undefined;
  authenticatedActorName: string;
  actorMembershipStatus?: 'ACTIVE' | 'PENDING' | 'INACTIVE' | 'REJECTED' | null;
  claimedActorId?: string | null;
  authorizedPoolId: string;
  nowIso?: string;
}): {
  ok: boolean;
  httpStatus: number;
  errorCode: string | null;
  entries: ReactionEntry[];
  activeReaction: ReactionCode | null;
} {
  if (!params.authenticatedActorId) {
    return {
      ok: false,
      httpStatus: 401,
      errorCode: 'UNAUTHENTICATED_ACTOR',
      entries: params.existingEntries,
      activeReaction: null,
    };
  }
  if (params.claimedActorId && params.claimedActorId !== params.authenticatedActorId) {
    return {
      ok: false,
      httpStatus: 403,
      errorCode: 'ACTOR_SPOOFING_REJECTED',
      entries: params.existingEntries,
      activeReaction: null,
    };
  }
  if (params.target.poolId !== params.authorizedPoolId) {
    return {
      ok: false,
      httpStatus: 403,
      errorCode: 'CROSS_POOL_DENIED',
      entries: params.existingEntries,
      activeReaction: null,
    };
  }
  if (params.actorMembershipStatus && params.actorMembershipStatus !== 'ACTIVE') {
    return {
      ok: false,
      httpStatus: 403,
      errorCode: 'ACTIVE_POOL_MEMBERSHIP_REQUIRED',
      entries: params.existingEntries,
      activeReaction: null,
    };
  }

  const validation = validateCanonicalReactionTarget(params.target);
  if (!validation.isValid || !validation.canonicalKey) {
    return {
      ok: false,
      httpStatus: 400,
      errorCode: validation.errorReason || 'INVALID_TARGET',
      entries: params.existingEntries,
      activeReaction: null,
    };
  }

  const key = validation.canonicalKey;
  const withoutActor = params.existingEntries.filter(
    (e) => !(e.canonicalKey === key && e.actorUserId === params.authenticatedActorId)
  );

  if (params.operation === 'REMOVE') {
    return {
      ok: true,
      httpStatus: 200,
      errorCode: null,
      entries: withoutActor,
      activeReaction: null,
    };
  }

  if (!params.reactionCode || !REACTION_CATALOG.some((r) => r.code === params.reactionCode)) {
    return {
      ok: false,
      httpStatus: 400,
      errorCode: 'INVALID_REACTION_CODE',
      entries: params.existingEntries,
      activeReaction: null,
    };
  }

  const nextEntry: ReactionEntry = {
    canonicalKey: key,
    poolId: params.target.poolId,
    season: params.target.season,
    week: params.target.week,
    targetKind: params.target.targetKind as CanonicalTargetKind,
    entityId: params.target.entityId.trim(),
    settlementRevision: validation.normalizedRevision,
    actorUserId: params.authenticatedActorId,
    actorDisplayName: sanitizeChatDisplayHandle(params.authenticatedActorName),
    reactionCode: params.reactionCode,
    updatedAtIso: params.nowIso || new Date().toISOString(),
  };

  return {
    ok: true,
    httpStatus: 200,
    errorCode: null,
    entries: [...withoutActor, nextEntry],
    activeReaction: params.reactionCode,
  };
}

/**
 * Backward-compatible wrapper for P41-S1 tests while routing to explicit validation.
 */
export function applyIdempotentReactionMutation(params: {
  existingEntries: ReactionEntry[];
  target: CanonicalReactionTarget;
  authenticatedActorId: string | null | undefined;
  authenticatedActorName: string;
  claimedActorId?: string | null;
  authorizedPoolId: string;
  reactionCode: ReactionCode | null;
  nowIso?: string;
}): {
  ok: boolean;
  errorCode: string | null;
  entries: ReactionEntry[];
} {
  const existingForActor = params.existingEntries.find(
    (e) =>
      e.actorUserId === params.authenticatedActorId &&
      validateCanonicalReactionTarget(params.target).canonicalKey === e.canonicalKey
  );
  const isToggleOff =
    params.reactionCode === null ||
    Boolean(existingForActor && existingForActor.reactionCode === params.reactionCode);

  const res = executeExplicitReactionOperation({
    existingEntries: params.existingEntries,
    target: params.target,
    operation: isToggleOff ? 'REMOVE' : 'SET',
    reactionCode: params.reactionCode,
    authenticatedActorId: params.authenticatedActorId,
    authenticatedActorName: params.authenticatedActorName,
    claimedActorId: params.claimedActorId,
    authorizedPoolId: params.authorizedPoolId,
    nowIso: params.nowIso,
  });

  return {
    ok: res.ok,
    errorCode: res.errorCode,
    entries: res.entries,
  };
}

export function summarizeReactionsForTarget(
  entries: ReactionEntry[],
  canonicalKey: string,
  viewerUserId?: string | null
): ReactionSummaryChip[] {
  const scoped = entries.filter((e) => e.canonicalKey === canonicalKey);
  return REACTION_CATALOG.map((item) => {
    const matches = scoped.filter((e) => e.reactionCode === item.code);
    return {
      code: item.code,
      emoji: item.emoji,
      label: item.label,
      count: matches.length,
      viewerSelected: Boolean(viewerUserId && matches.some((m) => m.actorUserId === viewerUserId)),
    };
  });
}

/**
 * Authoritative Pool Lounge Message Creation & Idempotent Retry Engine.
 * - Enforces ACTIVE pool membership, cross-pool denial, actor spoofing rejection, plain-text length <= 500,
 *   same-pool/same-discussion parent reply validation, and clientRequestId retry idempotency.
 * - Reusing clientRequestId with identical payload returns the existing message (200 OK, duplicate suppressed).
 * - Reusing clientRequestId with different body/target/parent returns 409 CONFLICT without overwriting.
 */
export function processPoolLoungeMessageSend(params: {
  existingMessages: PoolLoungeMessage[];
  poolId: string;
  authorizedPoolId: string;
  authenticatedActorId: string | null | undefined;
  authenticatedActorName: string;
  actorMembershipStatus: 'ACTIVE' | 'PENDING' | 'INACTIVE' | 'REJECTED' | null;
  claimedAuthorId?: string | null;
  clientRequestId: string;
  body: string;
  parentMessageId?: string | null;
  contextCard?: CanonicalContextCardAttachment | null;
  nowIso?: string;
}): {
  ok: boolean;
  httpStatus: number;
  errorCode: string | null;
  isIdempotentReplay: boolean;
  message: PoolLoungeMessage | null;
  messages: PoolLoungeMessage[];
} {
  if (!params.authenticatedActorId) {
    return {
      ok: false,
      httpStatus: 401,
      errorCode: 'UNAUTHENTICATED_ACTOR',
      isIdempotentReplay: false,
      message: null,
      messages: params.existingMessages,
    };
  }
  if (params.claimedAuthorId && params.claimedAuthorId !== params.authenticatedActorId) {
    return {
      ok: false,
      httpStatus: 403,
      errorCode: 'ACTOR_SPOOFING_REJECTED',
      isIdempotentReplay: false,
      message: null,
      messages: params.existingMessages,
    };
  }
  if (params.poolId !== params.authorizedPoolId) {
    return {
      ok: false,
      httpStatus: 403,
      errorCode: 'CROSS_POOL_DENIED',
      isIdempotentReplay: false,
      message: null,
      messages: params.existingMessages,
    };
  }
  if (params.actorMembershipStatus !== 'ACTIVE') {
    return {
      ok: false,
      httpStatus: 403,
      errorCode: 'ACTIVE_POOL_MEMBERSHIP_REQUIRED',
      isIdempotentReplay: false,
      message: null,
      messages: params.existingMessages,
    };
  }

  const reqId = (params.clientRequestId || '').trim();
  if (!reqId || reqId.length < 6) {
    return {
      ok: false,
      httpStatus: 400,
      errorCode: 'INVALID_CLIENT_REQUEST_ID',
      isIdempotentReplay: false,
      message: null,
      messages: params.existingMessages,
    };
  }

  const cleanBody = (params.body || '').trim();
  if (!cleanBody) {
    return {
      ok: false,
      httpStatus: 400,
      errorCode: 'EMPTY_MESSAGE_BODY',
      isIdempotentReplay: false,
      message: null,
      messages: params.existingMessages,
    };
  }
  if (cleanBody.length > MAX_LOUNGE_MESSAGE_LENGTH) {
    return {
      ok: false,
      httpStatus: 400,
      errorCode: 'MESSAGE_TOO_LONG',
      isIdempotentReplay: false,
      message: null,
      messages: params.existingMessages,
    };
  }

  const parentId = params.parentMessageId || null;
  const contextEntityKey = params.contextCard
    ? `${params.contextCard.targetKind}::s${params.contextCard.season}::w${params.contextCard.week}::${params.contextCard.entityId}`
    : 'POOL_LOUNGE';

  // Check for existing message with same (poolId, authorUserId, clientRequestId)
  const existingByReqId = params.existingMessages.find(
    (m) =>
      m.poolId === params.poolId &&
      m.authorUserId === params.authenticatedActorId &&
      m.clientRequestId === reqId
  );

  if (existingByReqId) {
    const existingContextKey = existingByReqId.contextCard
      ? `${existingByReqId.contextCard.targetKind}::s${existingByReqId.contextCard.season}::w${existingByReqId.contextCard.week}::${existingByReqId.contextCard.entityId}`
      : 'POOL_LOUNGE';

    // Reject payload mutation on retry with 409 CONFLICT
    if (
      existingByReqId.body !== cleanBody ||
      existingByReqId.parentMessageId !== parentId ||
      existingContextKey !== contextEntityKey
    ) {
      return {
        ok: false,
        httpStatus: 409,
        errorCode: 'CLIENT_REQUEST_ID_PAYLOAD_MISMATCH',
        isIdempotentReplay: false,
        message: null,
        messages: params.existingMessages,
      };
    }

    return {
      ok: true,
      httpStatus: 200,
      errorCode: null,
      isIdempotentReplay: true,
      message: existingByReqId,
      messages: params.existingMessages,
    };
  }

  // Referential integrity check for parentMessageId: must exist in the same pool and same discussion context
  if (parentId) {
    const parentMsg = params.existingMessages.find((m) => m.id === parentId);
    if (!parentMsg || parentMsg.poolId !== params.poolId) {
      return {
        ok: false,
        httpStatus: 400,
        errorCode: 'INVALID_CROSS_POOL_OR_MISSING_PARENT',
        isIdempotentReplay: false,
        message: null,
        messages: params.existingMessages,
      };
    }
    if (params.contextCard && parentMsg.contextCard) {
      const parentCtxKey = `${parentMsg.contextCard.targetKind}::s${parentMsg.contextCard.season}::w${parentMsg.contextCard.week}::${parentMsg.contextCard.entityId}`;
      if (parentCtxKey !== contextEntityKey) {
        return {
          ok: false,
          httpStatus: 400,
          errorCode: 'CROSS_DISCUSSION_REPLY_FORBIDDEN',
          isIdempotentReplay: false,
          message: null,
          messages: params.existingMessages,
        };
      }
    }
  }

  const nowIso = params.nowIso || new Date().toISOString();
  const created: PoolLoungeMessage = {
    id: `msg-${params.poolId.slice(0, 8)}-${params.existingMessages.length + 1}-${reqId.slice(-6)}`,
    poolId: params.poolId,
    authorUserId: params.authenticatedActorId,
    authorDisplayName: sanitizeChatDisplayHandle(params.authenticatedActorName),
    clientRequestId: reqId,
    body: cleanBody,
    parentMessageId: parentId,
    contextCard: params.contextCard ? { ...params.contextCard } : null,
    createdAtIso: nowIso,
    deliveryState: 'SENT',
  };

  return {
    ok: true,
    httpStatus: 201,
    errorCode: null,
    isIdempotentReplay: false,
    message: created,
    messages: [...params.existingMessages, created],
  };
}

/**
 * Deterministic cursor pagination ordered by (createdAtIso ASC, id ASC).
 * Pure read-only operation (Decision #54 GET safety).
 */
export function paginatePoolLoungeMessages(params: {
  messages: PoolLoungeMessage[];
  poolId: string;
  afterCursor?: string | null; // format: `${createdAtIso}::${id}`
  limit?: number;
}): {
  items: PoolLoungeMessage[];
  nextCursor: string | null;
  hasMore: boolean;
} {
  const limit = Math.max(1, Math.min(100, params.limit ?? 50));
  const sorted = params.messages
    .filter((m) => m.poolId === params.poolId)
    .sort((a, b) => {
      const cmp = a.createdAtIso.localeCompare(b.createdAtIso);
      return cmp !== 0 ? cmp : a.id.localeCompare(b.id);
    });

  let startIndex = 0;
  if (params.afterCursor) {
    const idx = sorted.findIndex((m) => `${m.createdAtIso}::${m.id}` === params.afterCursor);
    if (idx >= 0) {
      startIndex = idx + 1;
    }
  }

  const slice = sorted.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < sorted.length;
  const last = slice[slice.length - 1];
  const nextCursor = last ? `${last.createdAtIso}::${last.id}` : params.afterCursor || null;

  return {
    items: slice,
    nextCursor,
    hasMore,
  };
}
