import { Prisma } from '@prisma/client';

export enum Phase19FeatureFlagKey {
  PLAYOFF_BRACKET_ENGINE = 'playoff_bracket_engine',
  DYNAMIC_MULTIPLIERS = 'dynamic_multipliers',
  SUPER_BOWL_PROPS = 'super_bowl_props',
}

export type PlayoffRound = 'WILDCARD' | 'DIVISIONAL' | 'CONFERENCE' | 'SUPER_BOWL';

export interface PlayoffBracket {
  id: string;
  userId: string;
  poolId: string;
  seasonYear: number;
  picks: BracketPick[];
  isLocked: boolean;
  createdAt: Date;
}

export interface BracketPick {
  id: string;
  bracketId: string;
  gameId: string;
  round: PlayoffRound;
  selectedTeamId: string;
  isCorrect?: boolean;
}

export interface MultiplierConfig {
  wildcard: Prisma.Decimal;
  divisional: Prisma.Decimal;
  conference: Prisma.Decimal;
  superBowl: Prisma.Decimal;
}

export class Phase19BracketService {
  public static readonly DEFAULT_MULTIPLIERS: MultiplierConfig = {
    wildcard: new Prisma.Decimal('1.00'),
    divisional: new Prisma.Decimal('2.00'),
    conference: new Prisma.Decimal('4.00'),
    superBowl: new Prisma.Decimal('8.00'),
  };

  /**
   * Evaluates Decision #62 Circuit Breakers.
   * Default state is strictly OFF (false).
   */
  public static isFlagEnabled(flagStoreValue: boolean | null | undefined): boolean {
    return flagStoreValue === true;
  }

  /**
   * Enforces Decision #65: Lock Supremacy.
   * Bracket picks cannot be modified after the round kickoff timestamp.
   */
  public static isRoundLocked(firstGameKickoff: Date, currentTime: Date = new Date()): boolean {
    return currentTime.getTime() >= firstGameKickoff.getTime();
  }

  /**
   * Enforces Decision #55: Fail-Closed Progression.
   * Prevents advancing or grading if the prior playoff round is unfinalized.
   */
  public static validateRoundProgression(
    targetRound: PlayoffRound,
    isPriorRoundFinalized: boolean
  ): { allowed: boolean; error?: string } {
    if (targetRound === 'WILDCARD') {
      return { allowed: true };
    }
    if (!isPriorRoundFinalized) {
      return {
        allowed: false,
        error: 'FAIL_CLOSED_UNFINALIZED_ROUND: Progression blocked until prior playoff round is finalized',
      };
    }
    return { allowed: true };
  }

  /**
   * Enforces Decisions #3 & #22: Prisma.Decimal precision for multiplier scoring.
   */
  public static calculateMultiplierScore(
    basePoints: Prisma.Decimal,
    round: PlayoffRound,
    customMultipliers?: Partial<MultiplierConfig>
  ): Prisma.Decimal {
    const multipliers = { ...this.DEFAULT_MULTIPLIERS, ...customMultipliers };
    let mult = multipliers.wildcard;
    if (round === 'DIVISIONAL') mult = multipliers.divisional;
    if (round === 'CONFERENCE') mult = multipliers.conference;
    if (round === 'SUPER_BOWL') mult = multipliers.superBowl;

    return basePoints.mul(mult);
  }
}
