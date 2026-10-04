import { Prisma } from '@prisma/client';

export interface VaultEligibilityConfig {
  minWeekNumber: number; // e.g. Week 10
  deficitThreshold: string; // e.g. '15.0' points behind leader
  boostMultiplier: string; // e.g. '1.5'
  maxBoostedPicksPerSlate: number;
}

export interface PlayerStandingSnapshot {
  membershipId: string;
  totalPoints: string; // Decimal string
}

export interface VaultEligibilityResult {
  membershipId: string;
  isEligible: boolean;
  deficitFromLeader: string;
  eligibleBoostMultiplier: string;
  allowedBoostedPicks: number;
  reason?: string;
}

export interface BoostedPickScoring {
  gameId: string;
  isCorrect: boolean;
  isUnderdogPick: boolean;
  basePoints: string;
  boostMultiplier: string;
  finalPointsAwarded: string;
}

export class ComebackVaultService {
  // Evaluates eligibility based on standings deficit and week threshold (Decisions #3, #22)
  static evaluateEligibility(
    membershipId: string,
    currentWeek: number,
    standings: PlayerStandingSnapshot[],
    config: VaultEligibilityConfig = {
      minWeekNumber: 10,
      deficitThreshold: '15.0',
      boostMultiplier: '1.5',
      maxBoostedPicksPerSlate: 2
    }
  ): VaultEligibilityResult {
    if (currentWeek < config.minWeekNumber) {
      return {
        membershipId,
        isEligible: false,
        deficitFromLeader: '0.00',
        eligibleBoostMultiplier: '1.00',
        allowedBoostedPicks: 0,
        reason: `Vault unlocks in Week ${config.minWeekNumber}`
      };
    }

    if (!standings || standings.length === 0) {
      return {
        membershipId,
        isEligible: false,
        deficitFromLeader: '0.00',
        eligibleBoostMultiplier: '1.00',
        allowedBoostedPicks: 0,
        reason: 'No standings data available'
      };
    }

    // Sort descending by totalPoints
    const sorted = [...standings].sort((a, b) =>
      new Prisma.Decimal(b.totalPoints).sub(new Prisma.Decimal(a.totalPoints)).toNumber()
    );

    const leaderPoints = new Prisma.Decimal(sorted[0].totalPoints);
    const playerStanding = standings.find(s => s.membershipId === membershipId);

    if (!playerStanding) {
      return {
        membershipId,
        isEligible: false,
        deficitFromLeader: '0.00',
        eligibleBoostMultiplier: '1.00',
        allowedBoostedPicks: 0,
        reason: 'Player not found in standings'
      };
    }

    const playerPoints = new Prisma.Decimal(playerStanding.totalPoints);
    const deficit = leaderPoints.sub(playerPoints);
    const threshold = new Prisma.Decimal(config.deficitThreshold);

    if (deficit.gte(threshold)) {
      return {
        membershipId,
        isEligible: true,
        deficitFromLeader: deficit.toFixed(2),
        eligibleBoostMultiplier: new Prisma.Decimal(config.boostMultiplier).toFixed(2),
        allowedBoostedPicks: config.maxBoostedPicksPerSlate
      };
    }

    return {
      membershipId,
      isEligible: false,
      deficitFromLeader: deficit.toFixed(2),
      eligibleBoostMultiplier: '1.00',
      allowedBoostedPicks: 0,
      reason: `Deficit ${deficit.toFixed(2)} is less than threshold ${threshold.toFixed(2)}`
    };
  }

  // Pure scoring calculation for a boosted pick with game lock validation
  static calculateBoostedPickScore(
    gameId: string,
    isCorrect: boolean,
    isUnderdogPick: boolean,
    isVaultBoostApplied: boolean,
    boostMultiplier: string,
    isGameLocked: boolean
  ): BoostedPickScoring {
    const base = new Prisma.Decimal(isCorrect ? 1 : 0);
    const mult = new Prisma.Decimal(boostMultiplier);

    // Boost applies only if correct, underdog, and boost active
    if (isVaultBoostApplied && isCorrect && isUnderdogPick) {
      const finalPoints = base.mul(mult);
      return {
        gameId,
        isCorrect,
        isUnderdogPick,
        basePoints: base.toFixed(2),
        boostMultiplier: mult.toFixed(2),
        finalPointsAwarded: finalPoints.toFixed(2)
      };
    }

    return {
      gameId,
      isCorrect,
      isUnderdogPick,
      basePoints: base.toFixed(2),
      boostMultiplier: '1.00',
      finalPointsAwarded: base.toFixed(2)
    };
  }
}
