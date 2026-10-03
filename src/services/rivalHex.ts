import { Prisma } from '@prisma/client';

export type ChallengeStatus = 'PROPOSED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'SETTLED';

export interface RivalHexChallenge {
  id: string;
  poolId: string;
  weekNo: number;
  challengerMembershipId: string;
  targetMembershipId: string;
  stakeAmount: string; // Prisma.Decimal string per player
  handicapPoints: string; // Positive means target receives points; negative means challenger receives
  status: ChallengeStatus;
  winnerMembershipId?: string;
  isStalemateRefund: boolean;
  createdAt: Date;
}

export interface ParticipantScore {
  membershipId: string;
  rawScore: number;
}

export class RivalHexService {
  // Propose a new head-to-head challenge with exact Decimal stake validation
  static proposeChallenge(
    poolId: string,
    weekNo: number,
    challengerMembershipId: string,
    targetMembershipId: string,
    stakeAmount: string,
    handicapPoints: string = '0',
    isSlateLocked: boolean = false
  ): RivalHexChallenge {
    if (isSlateLocked) {
      throw new Error('Cannot propose a challenge on an already locked slate');
    }

    if (challengerMembershipId === targetMembershipId) {
      throw new Error('Cannot challenge self in Rival Hex');
    }

    const stakeDecimal = new Prisma.Decimal(stakeAmount);
    if (stakeDecimal.lte(0)) {
      throw new Error('Challenge stake amount must be strictly greater than 0');
    }

    return {
      id: `hex-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      poolId,
      weekNo,
      challengerMembershipId,
      targetMembershipId,
      stakeAmount: stakeDecimal.toFixed(2),
      handicapPoints: new Prisma.Decimal(handicapPoints).toFixed(1),
      status: 'PROPOSED',
      isStalemateRefund: false,
      createdAt: new Date()
    };
  }

  // Accept a proposed challenge before lock
  static acceptChallenge(
    challenge: RivalHexChallenge,
    isSlateLocked: boolean = false
  ): RivalHexChallenge {
    if (challenge.status !== 'PROPOSED') {
      throw new Error(`Cannot accept challenge in status ${challenge.status}`);
    }

    if (isSlateLocked) {
      throw new Error('Cannot accept challenge after slate has locked');
    }

    return {
      ...challenge,
      status: 'ACCEPTED'
    };
  }

  // Settle accepted challenge deterministically from settled participant scores
  static settleChallenge(
    challenge: RivalHexChallenge,
    challengerScore: number,
    targetScore: number
  ): {
    settledChallenge: RivalHexChallenge;
    winnerPayout: string;
    action: 'WINNER_PAID' | 'STALEMATE_REFUND';
  } {
    if (challenge.status !== 'ACCEPTED') {
      throw new Error('Only ACCEPTED challenges can be settled');
    }

    const singleStake = new Prisma.Decimal(challenge.stakeAmount);
    const totalPot = singleStake.mul(2);
    const handicap = new Prisma.Decimal(challenge.handicapPoints);

    // Adjusted Target Score = Raw Target Score + Handicap Points
    const adjustedTargetScore = new Prisma.Decimal(targetScore).add(handicap);
    const cScore = new Prisma.Decimal(challengerScore);

    // Challenger wins
    if (cScore.gt(adjustedTargetScore)) {
      return {
        settledChallenge: {
          ...challenge,
          status: 'SETTLED',
          winnerMembershipId: challenge.challengerMembershipId,
          isStalemateRefund: false
        },
        winnerPayout: totalPot.toFixed(2),
        action: 'WINNER_PAID'
      };
    }

    // Target wins
    if (adjustedTargetScore.gt(cScore)) {
      return {
        settledChallenge: {
          ...challenge,
          status: 'SETTLED',
          winnerMembershipId: challenge.targetMembershipId,
          isStalemateRefund: false
        },
        winnerPayout: totalPot.toFixed(2),
        action: 'WINNER_PAID'
      };
    }

    // Exact Tie -> Stalemate Refund (each player gets original stake back)
    return {
      settledChallenge: {
        ...challenge,
        status: 'SETTLED',
        isStalemateRefund: true
      },
      winnerPayout: singleStake.toFixed(2), // Each refunded their single stake
      action: 'STALEMATE_REFUND'
    };
  }
}
