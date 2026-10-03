import { Prisma } from '@prisma/client';

export interface EscalationPolicy {
  basePenaltyAmount: number;
  streakMultiplier: number; // e.g. 1.5x per consecutive week
  maxEscalationLevel: number;
}

export interface WeeklyStandingEntry {
  membershipId: string;
  rank: number;
  isLastPlace: boolean;
}

export interface EscalationCalculationResult {
  membershipId: string;
  consecutiveLastPlaces: number;
  escalationLevel: number;
  calculatedPenaltyAmount: string; // Formatted Prisma.Decimal
  appliedCompensatingEntry: boolean;
}

export class DeadPlaceEscalationService {
  // Decision #61: Pure service calculating side-ledger escalation without core mutations
  static calculateEscalation(
    membershipId: string,
    priorConsecutiveWeeks: number,
    isCurrentWeekLastPlace: boolean,
    policy: EscalationPolicy = { basePenaltyAmount: 10, streakMultiplier: 2, maxEscalationLevel: 4 }
  ): EscalationCalculationResult {
    if (!isCurrentWeekLastPlace) {
      return {
        membershipId,
        consecutiveLastPlaces: 0,
        escalationLevel: 0,
        calculatedPenaltyAmount: new Prisma.Decimal(0).toFixed(2),
        appliedCompensatingEntry: false
      };
    }

    const consecutiveLastPlaces = priorConsecutiveWeeks + 1;
    const escalationLevel = Math.min(consecutiveLastPlaces, policy.maxEscalationLevel);

    // Multiplier calculation using Prisma.Decimal (Decisions #3, #22)
    const base = new Prisma.Decimal(policy.basePenaltyAmount);
    const multiplier = new Prisma.Decimal(policy.streakMultiplier).pow(escalationLevel - 1);
    const totalPenalty = base.mul(multiplier);

    return {
      membershipId,
      consecutiveLastPlaces,
      escalationLevel,
      calculatedPenaltyAmount: totalPenalty.toFixed(2),
      appliedCompensatingEntry: false
    };
  }

  // Append-only compensating entry generator for disputes/corrections
  static generateCompensatingAdjustment(
    membershipId: string,
    originalAmount: string,
    correctedAmount: string,
    reason: string
  ): {
    membershipId: string;
    adjustmentAmount: string;
    entryType: 'COMPENSATION';
    reason: string;
  } {
    const orig = new Prisma.Decimal(originalAmount);
    const corrected = new Prisma.Decimal(correctedAmount);
    const delta = corrected.sub(orig);

    return {
      membershipId,
      adjustmentAmount: delta.toFixed(2),
      entryType: 'COMPENSATION',
      reason
    };
  }
}
