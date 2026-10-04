import { Prisma } from '@prisma/client';

export interface SyndicateMemberShare {
  membershipId: string;
  contributionAmount: string; // Prisma.Decimal string
  sharePercentage: string; // Prisma.Decimal string (e.g. '0.5000' for 50%)
}

export interface SyndicatePortfolio {
  id: string;
  poolId: string;
  syndicateName: string;
  creatorMembershipId: string;
  totalPoolStake: string; // Prisma.Decimal string
  members: SyndicateMemberShare[];
  isLocked: boolean;
  createdAt: Date;
}

export interface SyndicatePayoutDistribution {
  membershipId: string;
  payoutAmount: string;
}

export interface MemberPickVote {
  membershipId: string;
  selectedTeam: string;
}

export interface ConsensusPickResult {
  gameId: string;
  winningTeam: string | null;
  isConsensusReached: boolean;
  voteWeights: Record<string, string>; // team -> weighted Decimal points
}

export class SyndicatePortfolioService {
  // Create syndicate and calculate exact share percentages via Decimal (Decisions #3, #22)
  static createSyndicate(
    poolId: string,
    syndicateName: string,
    creatorMembershipId: string,
    contributions: { membershipId: string; amount: string }[],
    isSlateLocked: boolean = false
  ): SyndicatePortfolio {
    if (isSlateLocked) {
      throw new Error('Cannot create syndicate on an already locked slate');
    }

    if (!contributions || contributions.length === 0) {
      throw new Error('Syndicate must have at least one contributing member');
    }

    let totalStake = new Prisma.Decimal(0);
    for (const c of contributions) {
      const amt = new Prisma.Decimal(c.amount);
      if (amt.lte(0)) {
        throw new Error('Contribution amount must be strictly greater than 0');
      }
      totalStake = totalStake.add(amt);
    }

    const members: SyndicateMemberShare[] = contributions.map(c => {
      const amt = new Prisma.Decimal(c.amount);
      const share = amt.div(totalStake);
      return {
        membershipId: c.membershipId,
        contributionAmount: amt.toFixed(2),
        sharePercentage: share.toFixed(4)
      };
    });

    return {
      id: `synd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      poolId,
      syndicateName,
      creatorMembershipId,
      totalPoolStake: totalStake.toFixed(2),
      members,
      isLocked: false,
      createdAt: new Date()
    };
  }

  // Resolve consensus pick based on stake-weighted voting (Decisions #3, #22, #65)
  static resolveStakeWeightedPick(
    syndicate: SyndicatePortfolio,
    gameId: string,
    votes: MemberPickVote[],
    isGameLocked: boolean = false
  ): ConsensusPickResult {
    if (isGameLocked) {
      throw new Error('Cannot calculate or modify syndicate pick for a locked game');
    }

    const weightMap: Record<string, Prisma.Decimal> = {};
    const memberStakeMap: Record<string, Prisma.Decimal> = {};

    for (const member of syndicate.members) {
      memberStakeMap[member.membershipId] = new Prisma.Decimal(member.contributionAmount);
    }

    for (const vote of votes) {
      const stake = memberStakeMap[vote.membershipId];
      if (!stake) continue; // Ignore non-member votes

      if (!weightMap[vote.selectedTeam]) {
        weightMap[vote.selectedTeam] = new Prisma.Decimal(0);
      }
      weightMap[vote.selectedTeam] = weightMap[vote.selectedTeam].add(stake);
    }

    let winningTeam: string | null = null;
    let highestWeight = new Prisma.Decimal(0);
    let isTie = false;

    for (const [team, weight] of Object.entries(weightMap)) {
      if (weight.gt(highestWeight)) {
        highestWeight = weight;
        winningTeam = team;
        isTie = false;
      } else if (weight.eq(highestWeight) && weight.gt(0)) {
        isTie = true;
      }
    }

    const formattedWeights: Record<string, string> = {};
    for (const [team, weight] of Object.entries(weightMap)) {
      formattedWeights[team] = weight.toFixed(2);
    }

    return {
      gameId,
      winningTeam: isTie ? null : winningTeam,
      isConsensusReached: !isTie && winningTeam !== null,
      voteWeights: formattedWeights
    };
  }

  // Distribute total winnings proportionally with exact penny remainder preservation
  static distributeWinnings(
    syndicate: SyndicatePortfolio,
    totalWinnings: string
  ): SyndicatePayoutDistribution[] {
    const totalWinningsDecimal = new Prisma.Decimal(totalWinnings);
    if (totalWinningsDecimal.lte(0)) {
      throw new Error('Total winnings must be strictly greater than 0 to distribute');
    }

    const totalCents = totalWinningsDecimal.mul(100).floor().toNumber();
    const stakeTotal = new Prisma.Decimal(syndicate.totalPoolStake);

    let allocatedCents = 0;
    const initialPayouts: { membershipId: string; cents: number; remainderFraction: number }[] = [];

    for (const member of syndicate.members) {
      const memberStake = new Prisma.Decimal(member.contributionAmount);
      const exactCents = memberStake.mul(totalCents).div(stakeTotal).toNumber();
      const floorCents = Math.floor(exactCents);
      const remainder = exactCents - floorCents;

      initialPayouts.push({
        membershipId: member.membershipId,
        cents: floorCents,
        remainderFraction: remainder
      });
      allocatedCents += floorCents;
    }

    let remainingCents = totalCents - allocatedCents;
    initialPayouts.sort((a, b) => b.remainderFraction - a.remainderFraction);

    for (let i = 0; i < initialPayouts.length && remainingCents > 0; i++) {
      initialPayouts[i].cents += 1;
      remainingCents -= 1;
    }

    return initialPayouts.map(p => ({
      membershipId: p.membershipId,
      payoutAmount: new Prisma.Decimal(p.cents).div(100).toFixed(2)
    }));
  }
}
