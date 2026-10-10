export type PunishmentState = 'PENDING_SUBMISSION' | 'UNDER_REVIEW' | 'DISPUTED' | 'CLEARED';

export type DisputeInfraction =
  | 'INCOMPLETE_POUR'
  | 'SPILLED_LIQUOR'
  | 'CHASER_USED_PREMATURELY'
  | 'NOT_WARM_TEQUILA';

export interface DisputeRecord {
  id: string;
  disputerId: string;
  disputerName: string;
  infraction: DisputeInfraction;
  justification: string;
  filedAt: string;
}

export interface PenaltySubmission {
  id: string;
  poolId: string;
  userId: string;
  userName: string;
  weekNumber: number;
  shotDebt: number;
  liquorType: string;
  status: PunishmentState;
  videoUri?: string;
  submittedAt?: string;
  disputeWindowEndsAt?: string;
  disputes: DisputeRecord[];
  nominations: string[];
  clearedAt?: string;
}

export interface LedgerCreditEntry {
  poolId: string;
  userId: string;
  amount: string; // Negative decimal offset, e.g. "-2.50"
  reason: string;
  referenceMediaId: string;
  createdAt: string;
}

/**
 * Creates initial pending penalty record following slate finalization.
 */
export function createPendingPenalty(
  poolId: string,
  userId: string,
  userName: string,
  weekNumber: number,
  shotDebt: number = 2.50,
  liquorType: string = 'WARM TEQUILA'
): PenaltySubmission {
  return {
    id: `pen_${poolId}_w${weekNumber}_${userId}`,
    poolId,
    userId,
    userName,
    weekNumber,
    shotDebt,
    liquorType,
    status: 'PENDING_SUBMISSION',
    disputes: [],
    nominations: []
  };
}

/**
 * Transition: PENDING_SUBMISSION -> UNDER_REVIEW
 * Starts strict 24-hour dispute window.
 */
export function submitPenaltyEvidence(
  submission: PenaltySubmission,
  videoUri: string,
  now: Date = new Date()
): PenaltySubmission {
  if (submission.status !== 'PENDING_SUBMISSION') {
    throw new Error(`INVALID_TRANSITION: Cannot submit evidence from state ${submission.status}`);
  }
  if (!videoUri || videoUri.trim().length === 0) {
    throw new Error('INVALID_URI: Video evidence URI is required.');
  }

  const disputeWindowEnds = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return {
    ...submission,
    status: 'UNDER_REVIEW',
    videoUri,
    submittedAt: now.toISOString(),
    disputeWindowEndsAt: disputeWindowEnds.toISOString()
  };
}

/**
 * Transition: UNDER_REVIEW -> DISPUTED
 * Requires valid infraction category and minimum 50-character justification.
 */
export function filePenaltyDispute(
  submission: PenaltySubmission,
  disputerId: string,
  disputerName: string,
  infraction: DisputeInfraction,
  justification: string,
  now: Date = new Date()
): PenaltySubmission {
  if (submission.status !== 'UNDER_REVIEW') {
    throw new Error(`INVALID_TRANSITION: Disputes can only be filed against submissions UNDER_REVIEW.`);
  }
  if (!justification || justification.trim().length < 50) {
    throw new Error('VALIDATION_FAILED: Dispute justification must be at least 50 characters.');
  }

  const disputeRecord: DisputeRecord = {
    id: `disp_${Date.now()}_${disputerId}`,
    disputerId,
    disputerName,
    infraction,
    justification: justification.trim(),
    filedAt: now.toISOString()
  };

  return {
    ...submission,
    status: 'DISPUTED',
    disputes: [...submission.disputes, disputeRecord]
  };
}

/**
 * Transition: UNDER_REVIEW -> CLEARED
 * Verifies 24-hour dispute timestamp has elapsed with zero unresolved disputes.
 * Generates offsetting double-entry ledger credit (Decision #61).
 */
export function evaluatePenaltyClearance(
  submission: PenaltySubmission,
  now: Date = new Date()
): { updatedSubmission: PenaltySubmission; ledgerCredit: LedgerCreditEntry } {
  if (submission.status !== 'UNDER_REVIEW') {
    throw new Error(`INVALID_TRANSITION: Cannot clear penalty from state ${submission.status}`);
  }
  if (!submission.disputeWindowEndsAt) {
    throw new Error('CORRUPT_STATE: Missing dispute window end timestamp.');
  }

  const windowEnd = new Date(submission.disputeWindowEndsAt);
  if (now.getTime() < windowEnd.getTime()) {
    const remainingMs = windowEnd.getTime() - now.getTime();
    throw new Error(`DISPUTE_WINDOW_ACTIVE: Cannot clear penalty. ${Math.ceil(remainingMs / 1000)} seconds remain.`);
  }

  if (submission.disputes.length > 0) {
    throw new Error('UNRESOLVED_DISPUTES: Submission has active disputes and cannot be auto-cleared.');
  }

  const updatedSubmission: PenaltySubmission = {
    ...submission,
    status: 'CLEARED',
    clearedAt: now.toISOString()
  };

  const ledgerCredit: LedgerCreditEntry = {
    poolId: submission.poolId,
    userId: submission.userId,
    amount: `-${submission.shotDebt.toFixed(2)}`,
    reason: `Fulfillment Cleared: Week ${submission.weekNumber} 24h Window Expired`,
    referenceMediaId: submission.id,
    createdAt: now.toISOString()
  };

  return { updatedSubmission, ledgerCredit };
}

/**
 * Social feature: "Shot of the Week" nominations (>5 nominations unlocks gold border).
 */
export function nominatePenaltyVideo(
  submission: PenaltySubmission,
  nominatorId: string
): { updatedSubmission: PenaltySubmission; hasGoldBorder: boolean } {
  if (submission.nominations.includes(nominatorId)) {
    return { updatedSubmission: submission, hasGoldBorder: submission.nominations.length > 5 };
  }

  const updatedNominations = [...submission.nominations, nominatorId];
  const hasGoldBorder = updatedNominations.length > 5;

  return {
    updatedSubmission: {
      ...submission,
      nominations: updatedNominations
    },
    hasGoldBorder
  };
}
