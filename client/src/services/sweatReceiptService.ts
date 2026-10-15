/**
 * Phase 40 Sprint 1 (P40-S1): Session-Bounded Sweat Receipt Service
 * Compares consecutive valid projection snapshots in memory.
 * Enforces initial-load suppression, duplicate-refresh suppression, context-switch resets,
 * and strict exclusion of Sandbox Simulation or stale snapshots.
 */

export type SweatTransitionType =
  | 'TOOK_LEAD'
  | 'LOST_LEAD'
  | 'DREW_LEVEL'
  | 'ENTERED_SAFE_HAVEN'
  | 'ENTERED_DANGER_TIER';

export interface ProjectionSnapshot {
  poolId: string;
  week: number;
  viewerId: string;
  viewerName: string;
  rivalId: string;
  rivalName: string;
  viewerPoints: number;
  rivalPoints: number;
  viewerProjectedTier: string;
  isSimulation?: boolean;
  isStale?: boolean;
  isSettled?: boolean;
  observedAtIso: string;
  changedGames?: Array<{
    gameId: string;
    matchupLabel: string;
  }>;
}

export interface SessionSweatReceipt {
  id: string;
  poolId: string;
  week: number;
  viewerId: string;
  viewerName: string;
  rivalId: string;
  rivalName: string;
  transitionType: SweatTransitionType;
  headline: string;
  attributionLabel: string;
  beforeGap: number;
  afterGap: number;
  beforeTier: string;
  afterTier: string;
  observedAtIso: string;
  provisionalBadge: 'PROVISIONAL SESSION RECEIPT';
  scopeDisclosure: string;
}

export interface SweatReceiptSessionState {
  contextKey: string | null;
  baselineSnapshot: ProjectionSnapshot | null;
  lastSnapshot: ProjectionSnapshot | null;
  receipts: SessionSweatReceipt[];
}

export function createEmptyReceiptSession(): SweatReceiptSessionState {
  return {
    contextKey: null,
    baselineSnapshot: null,
    lastSnapshot: null,
    receipts: [],
  };
}

export function buildReceiptContextKey(snap: ProjectionSnapshot): string {
  return `${snap.poolId}::w${snap.week}::v:${snap.viewerId}::r:${snap.rivalId}`;
}

function formatSignedGap(gap: number): string {
  return gap > 0 ? `+${gap}` : `${gap}`;
}

export function observeProjectionSnapshot(
  state: SweatReceiptSessionState,
  incoming: ProjectionSnapshot,
  maxReceipts: number = 10
): SweatReceiptSessionState {
  // 1. Strictly ignore simulation or stale/unusable snapshots
  if (incoming.isSimulation || incoming.isStale) {
    return state;
  }
  if (!incoming.poolId || !incoming.viewerId || !incoming.rivalId) {
    return state;
  }

  const incomingKey = buildReceiptContextKey(incoming);

  // 2. Context switch reset (account, pool, week, or rival changed) -> establish fresh baseline, zero receipts emitted
  if (state.contextKey !== incomingKey || !state.lastSnapshot) {
    return {
      contextKey: incomingKey,
      baselineSnapshot: { ...incoming },
      lastSnapshot: { ...incoming },
      receipts: state.contextKey === incomingKey ? state.receipts : [],
    };
  }

  const prev = state.lastSnapshot;
  const prevGap = prev.viewerPoints - prev.rivalPoints;
  const nextGap = incoming.viewerPoints - incoming.rivalPoints;
  const tierChanged = prev.viewerProjectedTier !== incoming.viewerProjectedTier;

  // 3. Suppress duplicate / unchanged refreshes
  if (prevGap === nextGap && !tierChanged) {
    return state;
  }

  // 4. Determine transition type
  let transitionType: SweatTransitionType | null = null;
  let headline = '';

  if (prevGap <= 0 && nextGap > 0) {
    transitionType = 'TOOK_LEAD';
    headline = `${incoming.viewerName} took a ${formatSignedGap(nextGap)} pt lead over ${incoming.rivalName}`;
  } else if (prevGap >= 0 && nextGap < 0) {
    transitionType = 'LOST_LEAD';
    headline = `${incoming.rivalName} took the lead (${formatSignedGap(nextGap)}) against ${incoming.viewerName}`;
  } else if (prevGap !== 0 && nextGap === 0) {
    transitionType = 'DREW_LEVEL';
    headline = `${incoming.viewerName} and ${incoming.rivalName} drew level (0 pt gap)`;
  } else if (tierChanged) {
    const isSafe = incoming.viewerProjectedTier.toUpperCase().includes('SAFE');
    transitionType = isSafe ? 'ENTERED_SAFE_HAVEN' : 'ENTERED_DANGER_TIER';
    headline = `${incoming.viewerName} moved from ${prev.viewerProjectedTier} to ${incoming.viewerProjectedTier}`;
  }

  if (!transitionType) {
    return {
      ...state,
      lastSnapshot: { ...incoming },
    };
  }

  // 5. Honest game attribution: attribute to a specific game ONLY when exactly 1 game changed
  const changed = incoming.changedGames || [];
  let attributionLabel = 'Scoreboard update across active slate';
  if (changed.length === 1 && changed[0].matchupLabel) {
    attributionLabel = `Triggered by ${changed[0].matchupLabel}`;
  } else if (changed.length > 1) {
    attributionLabel = `Multi-game scoreboard update (${changed.length} games updated simultaneously)`;
  }

  const newReceipt: SessionSweatReceipt = {
    id: `${incomingKey}::${incoming.observedAtIso}::${prevGap}->${nextGap}`,
    poolId: incoming.poolId,
    week: incoming.week,
    viewerId: incoming.viewerId,
    viewerName: incoming.viewerName,
    rivalId: incoming.rivalId,
    rivalName: incoming.rivalName,
    transitionType,
    headline,
    attributionLabel,
    beforeGap: prevGap,
    afterGap: nextGap,
    beforeTier: prev.viewerProjectedTier,
    afterTier: incoming.viewerProjectedTier,
    observedAtIso: incoming.observedAtIso,
    provisionalBadge: 'PROVISIONAL SESSION RECEIPT',
    scopeDisclosure: 'Captured live during this active session. Provisional until official weekly settlement.',
  };

  return {
    contextKey: incomingKey,
    baselineSnapshot: state.baselineSnapshot,
    lastSnapshot: { ...incoming },
    receipts: [newReceipt, ...state.receipts].slice(0, maxReceipts),
  };
}
