import { Prisma } from '@prisma/client';

export interface InsurancePolicy {
  policyId: string;
  poolId: string;
  membershipId: string;
  gameId: string;
  selectedTeam: string;
  premiumAmount: string; // Prisma.Decimal
  payoutPoints: string;  // Prisma.Decimal (points awarded on bad beat)
  isLocked: boolean;
  status: 'ACTIVE' | 'CLAIMED' | 'EXPIRED' | 'VOID';
}

export interface GameFinalScore {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  isFinal: boolean;
}

export interface InsuranceClaimResult {
  policyId: string;
  status: 'CLAIMED' | 'EXPIRED' | 'INELIGIBLE';
  rebateAwarded: string; // Prisma.Decimal points
  pointMargin: number;
  rationale: string;
}

export class BadBeatInsuranceService {
  // Issue insurance policy prior to game lock (Decisions #3, #22, #65)
  static issuePolicy(
    poolId: string,
    membershipId: string,
    gameId: string,
    selectedTeam: string,
    premiumAmount: string = '0.50',
    payoutPoints: string = '0.50',
    isGameLocked: boolean = false
  ): InsurancePolicy {
    if (isGameLocked) {
      throw new Error('Cannot issue insurance policy on an already locked game');
    }

    const premium = new Prisma.Decimal(premiumAmount);
    const payout = new Prisma.Decimal(payoutPoints);

    if (premium.lte(0) || payout.lte(0)) {
      throw new Error('Premium and payout points must be strictly greater than 0');
    }

    return {
      policyId: `ins-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      poolId,
      membershipId,
      gameId,
      selectedTeam,
      premiumAmount: premium.toFixed(2),
      payoutPoints: payout.toFixed(2),
      isLocked: false,
      status: 'ACTIVE'
    };
  }

  // Pure derivation of bad beat claim against final game score (Decisions #3, #22, #54)
  static evaluateClaim(
    policy: InsurancePolicy,
    finalScore: GameFinalScore
  ): InsuranceClaimResult {
    if (!finalScore.isFinal) {
      return {
        policyId: policy.policyId,
        status: 'INELIGIBLE',
        rebateAwarded: '0.00',
        pointMargin: 0,
        rationale: 'Game is not finalized'
      };
    }

    const winningTeam =
      finalScore.homeScore > finalScore.awayScore
        ? finalScore.homeTeam
        : finalScore.awayScore > finalScore.homeScore
        ? finalScore.awayTeam
        : null;

    const pointMargin = Math.abs(finalScore.homeScore - finalScore.awayScore);

    // If user's pick won, policy expires without claim
    if (policy.selectedTeam === winningTeam) {
      return {
        policyId: policy.policyId,
        status: 'EXPIRED',
        rebateAwarded: '0.00',
        pointMargin,
        rationale: 'Selected team won; no bad beat'
      };
    }

    // Bad beat threshold: Loss by 3 or fewer points
    if (pointMargin <= 3) {
      return {
        policyId: policy.policyId,
        status: 'CLAIMED',
        rebateAwarded: new Prisma.Decimal(policy.payoutPoints).toFixed(2),
        pointMargin,
        rationale: `Loss by ${pointMargin} points qualifies for Bad Beat protection`
      };
    }

    return {
      policyId: policy.policyId,
      status: 'EXPIRED',
      rebateAwarded: '0.00',
      pointMargin,
      rationale: `Loss by ${pointMargin} points exceeds Bad Beat threshold (<= 3)`
    };
  }
}
