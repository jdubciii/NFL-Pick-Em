import { Prisma } from '@prisma/client';

export type BountyConditionType = 'CORRECT_PICK' | 'UPSET_PICK' | 'SOLO_SURVIVOR' | 'HIGH_SCORE';

export interface BountyOffer {
  id: string;
  poolId: string;
  creatorMembershipId: string;
  targetGameId: string;
  targetCondition: BountyConditionType;
  escrowAmount: string; // Prisma.Decimal string
  isSettled: boolean;
  claimedByMembershipIds: string[];
  claimedByMembershipId?: string;
  expiresAt: Date;
}

export interface SplitPayoutResult {
  membershipId: string;
  payoutAmount: string;
}

export class BountyBoardService {
  // Escrow balance validation using Prisma.Decimal (Decisions #3, #22)
  static createBountyOffer(
    poolId: string,
    creatorMembershipId: string,
    targetGameId: string,
    condition: BountyConditionType,
    amount: string,
    expiresAt: Date,
    isTargetGameLocked: boolean = false
  ): BountyOffer {
    // Decision #65: Cannot create/fund a bounty on an already locked game
    if (isTargetGameLocked) {
      throw new Error('Cannot fund a bounty on an already locked game');
    }

    const decimalAmount = new Prisma.Decimal(amount);
    if (decimalAmount.lte(0)) {
      throw new Error('Bounty escrow amount must be strictly greater than 0');
    }

    return {
      id: `bounty-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      poolId,
      creatorMembershipId,
      targetGameId,
      targetCondition: condition,
      escrowAmount: decimalAmount.toFixed(2),
      isSettled: false,
      claimedByMembershipIds: [],
      expiresAt
    };
  }

  // Multi-claimant settlement with deterministic penny remainder distribution (Decisions #3, #22)
  static settleBounty(
    bounty: BountyOffer,
    qualifyingClaimants: string[] | string | null
  ): {
    settledBounty: BountyOffer;
    payouts: SplitPayoutResult[];
    payoutAmount: string;
    action: 'CLAIMED' | 'REFUNDED';
  } {
    if (bounty.isSettled) {
      throw new Error('Bounty has already been settled');
    }

    const qualifyingMembershipIds: string[] = Array.isArray(qualifyingClaimants)
      ? qualifyingClaimants
      : qualifyingClaimants
      ? [qualifyingClaimants]
      : [];

    // Case 1: Unclaimed or zero qualifying claimants -> 100% Refund to creator
    if (!qualifyingMembershipIds || qualifyingMembershipIds.length === 0) {
      return {
        settledBounty: {
          ...bounty,
          isSettled: true,
          claimedByMembershipIds: [],
          claimedByMembershipId: undefined
        },
        payouts: [{
          membershipId: bounty.creatorMembershipId,
          payoutAmount: bounty.escrowAmount
        }],
        payoutAmount: bounty.escrowAmount,
        action: 'REFUNDED'
      };
    }

    // Case 2: Claimed by 1 or more members -> Even split with remainder penny allocation
    const totalCents = new Prisma.Decimal(bounty.escrowAmount).mul(100).floor().toNumber();
    const count = qualifyingMembershipIds.length;
    const baseCentsPerPerson = Math.floor(totalCents / count);
    let remainderCents = totalCents % count;

    const payouts: SplitPayoutResult[] = qualifyingMembershipIds.map((memId) => {
      let centsForUser = baseCentsPerPerson;
      if (remainderCents > 0) {
        centsForUser += 1;
        remainderCents -= 1;
      }
      return {
        membershipId: memId,
        payoutAmount: new Prisma.Decimal(centsForUser).div(100).toFixed(2)
      };
    });

    return {
      settledBounty: {
        ...bounty,
        isSettled: true,
        claimedByMembershipIds: [...qualifyingMembershipIds],
        claimedByMembershipId: qualifyingMembershipIds[0]
      },
      payouts,
      payoutAmount: bounty.escrowAmount,
      action: 'CLAIMED'
    };
  }
}
