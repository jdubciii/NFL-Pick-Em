/**
 * Phase 41 Sprint 1 (P41-S1): Canonical Reaction & Unified Pool Social Service
 * Enforces canonical target validation, rejects device-local session receipt IDs,
 * and provides idempotent reaction state + Unified Pool Chat message modeling.
 */

export type ReactionCode = 'CALLED_IT' | 'COLD' | 'PAIN' | 'PIT_BOUND';

export type CanonicalTargetKind = 'CANONICAL_GAME' | 'SETTLED_RECAP' | 'POOL_CHAT_MESSAGE';

export interface CanonicalReactionTarget {
  poolId: string;
  season: number;
  week: number;
  targetKind: string;
  entityId: string;
  settlementRevision?: string | number | null;
}

export interface CanonicalTargetValidation {
  isValid: boolean;
  canonicalKey: string | null;
  errorReason: string | null;
}

export interface ReactionEntry {
  canonicalKey: string;
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

export const REACTION_CATALOG: ReadonlyArray<{ code: ReactionCode; emoji: string; label: string }> = [
  { code: 'CALLED_IT', emoji: '🎯', label: 'Called it' },
  { code: 'COLD', emoji: '🥶', label: 'Cold' },
  { code: 'PAIN', emoji: '💀', label: 'Pain' },
  { code: 'PIT_BOUND', emoji: '🕳️', label: 'Pit bound' },
];

export const SOCIAL_STORAGE_MODE = 'SESSION_PREVIEW_PENDING_P41_S2_DDL' as const;

export function validateCanonicalReactionTarget(
  target: CanonicalReactionTarget
): CanonicalTargetValidation {
  if (!target.poolId || !target.entityId || !target.season || !target.week) {
    return { isValid: false, canonicalKey: null, errorReason: 'MISSING_REQUIRED_TARGET_FIELDS' };
  }
  if (
    target.targetKind !== 'CANONICAL_GAME' &&
    target.targetKind !== 'SETTLED_RECAP' &&
    target.targetKind !== 'POOL_CHAT_MESSAGE'
  ) {
    return { isValid: false, canonicalKey: null, errorReason: 'UNSUPPORTED_TARGET_KIND' };
  }
  // Strictly forbid device-local session receipt IDs as shared reaction targets
  if (
    target.entityId.includes('::') ||
    target.entityId.startsWith('receipt-') ||
    target.entityId.startsWith('session-') ||
    target.entityId.startsWith('dl::')
  ) {
    return {
      isValid: false,
      canonicalKey: null,
      errorReason: 'DEVICE_LOCAL_RECEIPT_ID_FORBIDDEN',
    };
  }

  const revSuffix =
    target.targetKind === 'SETTLED_RECAP'
      ? `::rev:${target.settlementRevision ?? 1}`
      : '';
  const canonicalKey = `rx::${target.poolId}::s${target.season}::w${target.week}::${target.targetKind}::${target.entityId}${revSuffix}`;

  return {
    isValid: true,
    canonicalKey,
    errorReason: null,
  };
}

export function applyIdempotentReactionMutation(params: {
  existingEntries: ReactionEntry[];
  target: CanonicalReactionTarget;
  authenticatedActorId: string | null | undefined;
  authenticatedActorName: string;
  claimedActorId?: string | null;
  authorizedPoolId: string;
  reactionCode: ReactionCode | null; // null removes reaction
  nowIso?: string;
}): {
  ok: boolean;
  errorCode: string | null;
  entries: ReactionEntry[];
} {
  if (!params.authenticatedActorId) {
    return { ok: false, errorCode: 'UNAUTHENTICATED_ACTOR', entries: params.existingEntries };
  }
  // Reject actor spoofing
  if (params.claimedActorId && params.claimedActorId !== params.authenticatedActorId) {
    return { ok: false, errorCode: 'ACTOR_SPOOFING_REJECTED', entries: params.existingEntries };
  }
  // Reject cross-pool access
  if (params.target.poolId !== params.authorizedPoolId) {
    return { ok: false, errorCode: 'CROSS_POOL_DENIED', entries: params.existingEntries };
  }

  const validation = validateCanonicalReactionTarget(params.target);
  if (!validation.isValid || !validation.canonicalKey) {
    return { ok: false, errorCode: validation.errorReason || 'INVALID_TARGET', entries: params.existingEntries };
  }

  const key = validation.canonicalKey;
  const nowIso = params.nowIso || new Date().toISOString();
  const filtered = params.existingEntries.filter(
    (e) => !(e.canonicalKey === key && e.actorUserId === params.authenticatedActorId)
  );

  // If reactionCode is null or matches the existing reaction (toggle off), return filtered
  const existingForActor = params.existingEntries.find(
    (e) => e.canonicalKey === key && e.actorUserId === params.authenticatedActorId
  );

  if (params.reactionCode === null || (existingForActor && existingForActor.reactionCode === params.reactionCode)) {
    return { ok: true, errorCode: null, entries: filtered };
  }

  const nextEntry: ReactionEntry = {
    canonicalKey: key,
    actorUserId: params.authenticatedActorId,
    actorDisplayName: params.authenticatedActorName,
    reactionCode: params.reactionCode,
    updatedAtIso: nowIso,
  };

  return {
    ok: true,
    errorCode: null,
    entries: [...filtered, nextEntry],
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
