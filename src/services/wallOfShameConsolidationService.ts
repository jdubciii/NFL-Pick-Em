export type ShameTabId = 'REELS' | 'LADDER' | 'INFAMY';

export type ExtendedPunishmentState =
  | 'PENDING_SUBMISSION'
  | 'UNDER_REVIEW'
  | 'DISPUTED'
  | 'CLEARED'
  | 'FAILURE_TO_APPEAR';

export interface SettledLadderParticipant {
  rank: number;
  userId: string;
  userName: string;
  tier: 'SAFE' | 'DANGER' | 'PIT';
  penaltyShots: number;
  fsmStatus: ExtendedPunishmentState;
  submissionDeadlineEndsAt?: string;
  isFailureToAppear: boolean;
}

export interface InfamyArchiveDocket {
  id: string;
  weekNumber: number;
  date: string;
  userId: string;
  userName: string;
  crimeDescription: string;
  shotDebt: number;
  liquorType: string;
  nominationsCount: number;
  hasGoldBorder: boolean;
  isContemptOfCourt: boolean;
  jurors: Array<{
    name: string;
    vote: 'UPHOLD' | 'DISMISS';
  }>;
}

export interface FailureToAppearEscalation {
  poolId: string;
  userId: string;
  originalDebt: number;
  escalatedDebt: number; // e.g. 2.50 + 2.00 = 4.50
  amountAdded: string; // "+2.00"
  reason: string;
  referenceMediaId: string;
  createdAt: string;
}

/**
 * Evaluates Failure to Appear worker logic (Zero DDL).
 * If 48 hours elapse from slate finalization without submission, escalates debt by +2.00 shots.
 */
export function evaluateFailureToAppear(
  poolId: string,
  userId: string,
  currentStatus: ExtendedPunishmentState,
  baseDebt: number,
  slateFinalizedAt: Date,
  now: Date = new Date(),
  deadlineHours: number = 48
): {
  isEscalated: boolean;
  newStatus: ExtendedPunishmentState;
  newDebt: number;
  escalationEntry?: FailureToAppearEscalation;
} {
  if (currentStatus !== 'PENDING_SUBMISSION') {
    return {
      isEscalated: false,
      newStatus: currentStatus,
      newDebt: baseDebt
    };
  }

  const deadlineMs = slateFinalizedAt.getTime() + deadlineHours * 3600 * 1000;
  if (now.getTime() > deadlineMs) {
    const escalatedDebt = baseDebt + 2.00;
    const escalationEntry: FailureToAppearEscalation = {
      poolId,
      userId,
      originalDebt: baseDebt,
      escalatedDebt,
      amountAdded: '+2.00',
      reason: 'FAILURE_TO_APPEAR: 48h deadline expired without video proof',
      referenceMediaId: `fta_${poolId}_${userId}`,
      createdAt: now.toISOString()
    };

    return {
      isEscalated: true,
      newStatus: 'FAILURE_TO_APPEAR',
      newDebt: escalatedDebt,
      escalationEntry
    };
  }

  return {
    isEscalated: false,
    newStatus: currentStatus,
    newDebt: baseDebt
  };
}

/**
 * Organizes finalized weekly roster into Settled Ladder Tiers (Safe, Danger, The Pit).
 */
export function buildSettledLadderTiers(
  standings: Array<{
    rank: number;
    userId: string;
    userName: string;
    penaltyShots: string;
  }>,
  deadPlaceStatus: ExtendedPunishmentState,
  deadPlaceDebt: number,
  slateFinalizedAt: Date
): SettledLadderParticipant[] {
  const deadlineDate = new Date(slateFinalizedAt.getTime() + 48 * 3600 * 1000);

  return standings.map((item) => {
    let tier: SettledLadderParticipant['tier'] = 'DANGER';
    let fsmStatus: ExtendedPunishmentState = 'CLEARED';
    let shots = parseFloat(item.penaltyShots);

    if (item.rank === 1) {
      tier = 'SAFE';
      shots = 0.00;
      fsmStatus = 'CLEARED';
    } else if (item.rank === 10) {
      tier = 'PIT';
      shots = deadPlaceDebt;
      fsmStatus = deadPlaceStatus;
    } else {
      tier = 'DANGER';
      fsmStatus = 'CLEARED';
    }

    return {
      rank: item.rank,
      userId: item.userId,
      userName: item.userName,
      tier,
      penaltyShots: shots,
      fsmStatus,
      submissionDeadlineEndsAt: tier === 'PIT' ? deadlineDate.toISOString() : undefined,
      isFailureToAppear: fsmStatus === 'FAILURE_TO_APPEAR'
    };
  });
}
