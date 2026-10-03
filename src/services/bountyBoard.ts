import { Prisma } from '@prisma/client';

export interface BountyOffer {
  id: string;
  poolId: string;
  creatorMembershipId: string;
  targetGameId: string;
  targetCondition: 'CORRECT_PICK' | 'UPSET_PICK' | 'HIGH_SCORE';
  escrowAmount: string; // Decimal string
  isSettled: boolean;
  claimedByMembershipId?: string;
  expiresAt: Date;
}

export class BountyBoardService {
  // Escrow balance validation using Prisma.Decimal (Decisions #3, #22)
  static createBountyOffer(
    poolId: string,
    creatorMembershipId: string,
    targetGameId: string,
    condition: 'CORRECT_PICK' | 'UPSET_PICK' | 'HIGH_SCORE',
    amount: string,
    expiresAt: Date
  ): BountyOffer {
    const decimalAmount = new Prisma.Decimal(amount);
    if (decimalAmount.lte(0)) {
      throw new Error('Bounty escrow amount must be strictly greater than 0');
    }

    return {
      id: `bounty-${Date.now()}`,
      poolId,
      creatorMembershipId,
      targetGameId,
      targetCondition: condition,
      escrowAmount: decimalAmount.toFixed(2),
      isSettled: false,
      expiresAt
    };
  }

  // Pure settlement function enforcing append-only resolution
  static settleBounty(
    bounty: BountyOffer,
    qualifyingMembershipId: string | null
  ): {
    settledBounty: BountyOffer;
    payoutAmount: string;
    action: 'CLAIMED' | 'REFUNDED';
  } {
    if (bounty.isSettled) {
      throw new Error('Bounty has already been settled');
    }

    if (qualifyingMembershipId) {
      return {
        settledBounty: {
          ...bounty,
          isSettled: true,
          claimedByMembershipId: qualifyingMembershipId
        },
        payoutAmount: bounty.escrowAmount,
        action: 'CLAIMED'
      };
    }

    // Unclaimed / expired: refund to creator
    return {
      settledBounty: {
        ...bounty,
        isSettled: true
      },
      payoutAmount: bounty.escrowAmount,
      action: 'REFUNDED'
    };
  }
}
