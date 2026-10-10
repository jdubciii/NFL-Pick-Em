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
  tier: 'SAFE' | 'DANGER_LOW' | 'DANGER_HIGH' | 'PIT';
  tierLabel: string;
  penaltyShots: number;
  fsmStatus: ExtendedPunishmentState;
  fsmDisplayStatus: string;
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
  escalatedDebt: number;
  amountAdded: string;
  reason: string;
  referenceMediaId: string;
  createdAt: string;
}

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
      reason: 'Failure to Appear: 48h deadline expired without video proof',
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
 * Enforces strict League Charter discrete tiers:
 * - Rank 1: 0.00 Shots (Safe Haven)
 * - Rank 2-6: 1.00 Shot (Danger Zone - Tier 1)
 * - Rank 7-9: 2.00 Shots (Danger Zone - Tier 2 / High Risk)
 * - Rank 10: 2.50 Shots (The Pit / Dead Place Monarch)
 */
export function buildSettledLadderTiers(
  standings: Array<{
    rank: number;
    userId: string;
    userName: string;
  }>,
  deadPlaceStatus: ExtendedPunishmentState,
  deadPlaceDebt: number,
  slateFinalizedAt: Date
): SettledLadderParticipant[] {
  const deadlineDate = new Date(slateFinalizedAt.getTime() + 48 * 3600 * 1000);

  return standings.map((item) => {
    let tier: SettledLadderParticipant['tier'] = 'DANGER_LOW';
    let tierLabel = '1.00 Shot';
    let fsmStatus: ExtendedPunishmentState = 'CLEARED';
    let fsmDisplayStatus = 'Cleared';
    let shots = 1.00;

    if (item.rank === 1) {
      tier = 'SAFE';
      tierLabel = '0.00 Shots (Safe)';
      shots = 0.00;
      fsmStatus = 'CLEARED';
      fsmDisplayStatus = 'Safe Haven';
    } else if (item.rank >= 2 && item.rank <= 6) {
      tier = 'DANGER_LOW';
      tierLabel = '1.00 Shot';
      shots = 1.00;
      fsmStatus = 'CLEARED';
      fsmDisplayStatus = 'Settled';
    } else if (item.rank >= 7 && item.rank <= 9) {
      tier = 'DANGER_HIGH';
      tierLabel = '2.00 Shots';
      shots = 2.00;
      fsmStatus = 'CLEARED';
      fsmDisplayStatus = 'Settled';
    } else {
      tier = 'PIT';
      tierLabel = '2.50 Shots (Dead Place)';
      shots = deadPlaceDebt;
      fsmStatus = deadPlaceStatus;
      fsmDisplayStatus =
        deadPlaceStatus === 'PENDING_SUBMISSION'
          ? 'Awaiting Video'
          : deadPlaceStatus === 'FAILURE_TO_APPEAR'
          ? 'Failed to Appear'
          : deadPlaceStatus === 'UNDER_REVIEW'
          ? 'Under Review'
          : 'Cleared';
    }

    return {
      rank: item.rank,
      userId: item.userId,
      userName: item.userName,
      tier,
      tierLabel,
      penaltyShots: shots,
      fsmStatus,
      fsmDisplayStatus,
      submissionDeadlineEndsAt: tier === 'PIT' ? deadlineDate.toISOString() : undefined,
      isFailureToAppear: fsmStatus === 'FAILURE_TO_APPEAR'
    };
  });
}
