import { PenaltySubmission, LedgerCreditEntry } from './punishmentFsmService';

export type TribunalVoteType = 'UPHOLD' | 'DISMISS';

export interface TribunalVoteRecord {
  voterId: string;
  voterName: string;
  vote: TribunalVoteType;
  timestamp: string;
}

export interface TribunalDocketMetadata {
  votes: TribunalVoteRecord[];
  isResolved: boolean;
  verdict?: 'UPHELD' | 'DISMISSED';
  resolvedAt?: string;
}

export interface AdjudicatedPenaltySubmission extends PenaltySubmission {
  tribunalMetadata: TribunalDocketMetadata;
}

export interface ContemptEscalationEntry {
  poolId: string;
  userId: string;
  amount: string; // "+0.50"
  reason: string;
  referenceMediaId: string;
  createdAt: string;
}

/**
 * Initializes tribunal metadata within existing penalty media record (Decision #61 zero DDL).
 */
export function initializeTribunalDocket(submission: PenaltySubmission): AdjudicatedPenaltySubmission {
  return {
    ...submission,
    tribunalMetadata: {
      votes: [],
      isResolved: false
    }
  };
}

/**
 * Casts a blind vote in the 8-juror tribunal.
 * Invariant: Defendant and Accuser cannot vote.
 */
export function castTribunalVote(
  docket: AdjudicatedPenaltySubmission,
  voterId: string,
  voterName: string,
  vote: TribunalVoteType,
  now: Date = new Date()
): AdjudicatedPenaltySubmission {
  if (docket.status !== 'DISPUTED') {
    throw new Error('INVALID_STATE: Votes can only be cast on DISPUTED dockets.');
  }
  if (docket.tribunalMetadata.isResolved) {
    throw new Error('DOCKET_RESOLVED: Adjudication for this docket has already concluded.');
  }

  // Defendant cannot vote
  if (docket.userId === voterId) {
    throw new Error('DEFENDANT_RECUSAL: The defendant cannot vote on their own dispute.');
  }

  // Primary accuser cannot vote (juror impartiality rule)
  const primaryAccuser = docket.disputes[0]?.disputerId;
  if (primaryAccuser === voterId) {
    throw new Error('ACCUSER_RECUSAL: The accuser cannot serve as a juror on their own dispute.');
  }

  // Duplicate vote prevention
  const existingVote = docket.tribunalMetadata.votes.find((v) => v.voterId === voterId);
  if (existingVote) {
    throw new Error('DUPLICATE_VOTE: Juror has already cast a ballot on this docket.');
  }

  const updatedVotes: TribunalVoteRecord[] = [
    ...docket.tribunalMetadata.votes,
    {
      voterId,
      voterName,
      vote,
      timestamp: now.toISOString()
    }
  ];

  return {
    ...docket,
    tribunalMetadata: {
      ...docket.tribunalMetadata,
      votes: updatedVotes
    }
  };
}

/**
 * Evaluates the 8-juror voting math:
 * - 5 votes UPHOLD convicts (Guilty) -> Contempt of court (+0.50 shots, new total 3.00 shots).
 * - 4-4 tie or 4+ DISMISS acquits -> Innocent until proven guilty -> CLEARED (-2.50 offset).
 */
export function evaluateTribunalVerdict(
  docket: AdjudicatedPenaltySubmission,
  now: Date = new Date()
): {
  updatedDocket: AdjudicatedPenaltySubmission;
  isResolved: boolean;
  verdict?: 'UPHELD' | 'DISMISSED';
  escalationEntry?: ContemptEscalationEntry;
  ledgerCredit?: LedgerCreditEntry;
} {
  const votes = docket.tribunalMetadata.votes;
  const upholdCount = votes.filter((v) => v.vote === 'UPHOLD').length;
  const dismissCount = votes.filter((v) => v.vote === 'DISMISS').length;
  const totalVotes = votes.length;

  let isResolved = false;
  let verdict: 'UPHELD' | 'DISMISSED' | undefined = undefined;

  // Threshold: 5 votes UPHOLD = Conviction
  if (upholdCount >= 5) {
    isResolved = true;
    verdict = 'UPHELD';
  } else if (dismissCount >= 4 || totalVotes >= 8) {
    // 4 dismisses guarantees uphold can never reach 5; 4-4 tie acquits defendant
    isResolved = true;
    verdict = 'DISMISSED';
  }

  if (!isResolved || !verdict) {
    return { updatedDocket: docket, isResolved: false };
  }

  if (verdict === 'UPHELD') {
    // Contempt of court escalation: +0.50 shots, reset to PENDING_SUBMISSION with 3.00 debt
    const updatedDocket: AdjudicatedPenaltySubmission = {
      ...docket,
      status: 'PENDING_SUBMISSION',
      shotDebt: 3.00,
      tribunalMetadata: {
        ...docket.tribunalMetadata,
        isResolved: true,
        verdict: 'UPHELD',
        resolvedAt: now.toISOString()
      }
    };

    const escalationEntry: ContemptEscalationEntry = {
      poolId: docket.poolId,
      userId: docket.userId,
      amount: '+0.50',
      reason: `Contempt of Court: Week ${docket.weekNumber} Dispute Upheld by Jury (Debt Escalated to 3.00)`,
      referenceMediaId: docket.id,
      createdAt: now.toISOString()
    };

    return { updatedDocket, isResolved: true, verdict: 'UPHELD', escalationEntry };
  } else {
    // Dismissed: Cleared with -2.50 offsetting credit
    const updatedDocket: AdjudicatedPenaltySubmission = {
      ...docket,
      status: 'CLEARED',
      clearedAt: now.toISOString(),
      tribunalMetadata: {
        ...docket.tribunalMetadata,
        isResolved: true,
        verdict: 'DISMISSED',
        resolvedAt: now.toISOString()
      }
    };

    const ledgerCredit: LedgerCreditEntry = {
      poolId: docket.poolId,
      userId: docket.userId,
      amount: `-${docket.shotDebt.toFixed(2)}`,
      reason: `Fulfillment Cleared: Week ${docket.weekNumber} Dispute Acquitted by Jury`,
      referenceMediaId: docket.id,
      createdAt: now.toISOString()
    };

    return { updatedDocket, isResolved: true, verdict: 'DISMISSED', ledgerCredit };
  }
}
