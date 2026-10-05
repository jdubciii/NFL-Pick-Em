import { Prisma } from '@prisma/client';
import { PlayoffRound, MultiplierConfig } from './phase19BracketService';

export interface PoolMultiplierOverride {
  poolId: string;
  seasonYear: number;
  config: MultiplierConfig;
}

export interface MultiplierScoreResult {
  success: boolean;
  awardedPoints?: Prisma.Decimal;
  effectiveMultiplier?: Prisma.Decimal;
  round?: PlayoffRound;
  error?: string;
}

export class Phase19MultiplierService {
  private static readonly CIRCUIT_BREAKER_KEY = 'dynamic_multipliers';

  public static readonly CANONICAL_DEFAULT: MultiplierConfig = {
    wildcard: new Prisma.Decimal('1.00'),
    divisional: new Prisma.Decimal('2.00'),
    conference: new Prisma.Decimal('4.00'),
    superBowl: new Prisma.Decimal('8.00'),
  };

  public static isFeatureEnabled(flagStoreValue: boolean | null | undefined): boolean {
    return flagStoreValue === true;
  }

  /**
   * Enforces Decision #55: Fail-closed validation for custom pool multiplier configurations.
   * Multipliers must be >= 1.00 and monotonically non-decreasing.
   */
  public static validateMultiplierConfig(config: MultiplierConfig): { valid: boolean; error?: string } {
    const floor = new Prisma.Decimal('1.00');

    if (
      config.wildcard.lessThan(floor) ||
      config.divisional.lessThan(floor) ||
      config.conference.lessThan(floor) ||
      config.superBowl.lessThan(floor)
    ) {
      return { valid: false, error: 'INVALID_MULTIPLIER_FLOOR: All round multipliers must be >= 1.00' };
    }

    if (
      config.divisional.lessThan(config.wildcard) ||
      config.conference.lessThan(config.divisional) ||
      config.superBowl.lessThan(config.conference)
    ) {
      return {
        valid: false,
        error: 'NON_MONOTONIC_MULTIPLIERS: Playoff round multipliers cannot decrease in later rounds',
      };
    }

    return { valid: true };
  }

  /**
   * Enforces Decision #62 (Circuit Breaker), Decision #20 (Pool Isolation),
   * and Decisions #3 & #22 (Prisma.Decimal precision).
   */
  public static scorePlayoffPick(params: {
    basePoints: Prisma.Decimal;
    round: PlayoffRound;
    poolOverride?: PoolMultiplierOverride;
    flagStoreValue: boolean | null | undefined;
  }): MultiplierScoreResult {
    // Decision #62: When flag is disabled, dynamic escalation is suppressed; defaults strictly to 1.00x base
    if (!this.isFeatureEnabled(params.flagStoreValue)) {
      return {
        success: true,
        awardedPoints: params.basePoints.mul(new Prisma.Decimal('1.00')),
        effectiveMultiplier: new Prisma.Decimal('1.00'),
        round: params.round,
      };
    }

    let activeConfig = this.CANONICAL_DEFAULT;

    if (params.poolOverride) {
      const validation = this.validateMultiplierConfig(params.poolOverride.config);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
      activeConfig = params.poolOverride.config;
    }

    let multiplier = activeConfig.wildcard;
    if (params.round === 'DIVISIONAL') multiplier = activeConfig.divisional;
    if (params.round === 'CONFERENCE') multiplier = activeConfig.conference;
    if (params.round === 'SUPER_BOWL') multiplier = activeConfig.superBowl;

    const awardedPoints = params.basePoints.mul(multiplier);

    return {
      success: true,
      awardedPoints,
      effectiveMultiplier: multiplier,
      round: params.round,
    };
  }
}
