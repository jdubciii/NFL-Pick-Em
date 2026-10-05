import { Prisma } from '@prisma/client';

export type StakeStatus = 'PENDING' | 'LOCKED' | 'SETTLED' | 'REFUNDED' | 'CANCELLED';

export interface SocialStakeRecord {
  id: string;
  poolId: string;
  gameId: string;
  creatorMembershipId: string;
  targetMembershipId: string;
  amount: Prisma.Decimal;
  status: StakeStatus;
  createdAt: Date;
  settledAt?: Date | null;
}

export interface EscrowLedgerEntry {
  membershipId: string;
  escrowBalance: Prisma.Decimal;
}

export class Phase17SocialStakesService {
  private static readonly CIRCUIT_BREAKER_KEY = 'phase_17_social_stakes';
  private static readonly MAX_SINGLE_STAKE = new Prisma.Decimal('100.00');

  public static isCircuitBreakerOpen(flagStoreValue: boolean | null | undefined): boolean {
    return flagStoreValue !== true;
  }

  public static createStake(params: {
    poolId: string;
    gameId: string;
    creatorMembershipId: string;
    targetMembershipId: string;
    amount: Prisma.Decimal;
    creatorAvailableEscrow: Prisma.Decimal;
    flagStoreValue: boolean | null | undefined;
  }): { success: boolean; stake?: SocialStakeRecord; updatedEscrow?: Prisma.Decimal; error?: string } {
    if (this.isCircuitBreakerOpen(params.flagStoreValue)) {
      return { success: false, error: 'CIRCUIT_BREAKER_DISABLED: Feature unavailable for pool' };
    }

    if (params.creatorMembershipId === params.targetMembershipId) {
      return { success: false, error: 'INVALID_SELF_STAKE: Cannot stake against oneself' };
    }

    if (params.amount.lessThanOrEqualTo(new Prisma.Decimal('0.00'))) {
      return { success: false, error: 'INVALID_AMOUNT: Stake must be greater than 0.00' };
    }

    if (params.amount.greaterThan(this.MAX_SINGLE_STAKE)) {
      return { success: false, error: 'EXCEEDS_MAX_STAKE: Amount exceeds limit of 100.00' };
    }

    if (params.creatorAvailableEscrow.lessThan(params.amount)) {
      return { success: false, error: 'INSUFFICIENT_ESCROW: Available balance cannot cover stake' };
    }

    const updatedEscrow = params.creatorAvailableEscrow.minus(params.amount);
    const stake: SocialStakeRecord = {
      id: 'stake_' + Math.random().toString(36).substring(2, 11),
      poolId: params.poolId,
      gameId: params.gameId,
      creatorMembershipId: params.creatorMembershipId,
      targetMembershipId: params.targetMembershipId,
      amount: params.amount,
      status: 'PENDING',
      createdAt: new Date(),
      settledAt: null,
    };

    return { success: true, stake, updatedEscrow };
  }

  public static settleStake(
    stake: SocialStakeRecord,
    creatorWon: boolean,
    creatorEscrow: Prisma.Decimal,
    targetEscrow: Prisma.Decimal
  ): {
    settledStake: SocialStakeRecord;
    updatedCreatorEscrow: Prisma.Decimal;
    updatedTargetEscrow: Prisma.Decimal;
  } {
    if (stake.status !== 'PENDING' && stake.status !== 'LOCKED') {
      throw new Error('STAKE_NOT_SETTLEABLE: Status is ' + stake.status);
    }

    const potTotal = stake.amount.mul(2);
    let nextCreatorEscrow = creatorEscrow;
    let nextTargetEscrow = targetEscrow;

    if (creatorWon) {
      nextCreatorEscrow = nextCreatorEscrow.add(potTotal);
    } else {
      nextTargetEscrow = nextTargetEscrow.add(potTotal);
    }

    const settledStake: SocialStakeRecord = {
      ...stake,
      status: 'SETTLED',
      settledAt: new Date(),
    };

    return {
      settledStake,
      updatedCreatorEscrow: nextCreatorEscrow,
      updatedTargetEscrow: nextTargetEscrow,
    };
  }
}
