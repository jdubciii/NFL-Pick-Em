import { Prisma } from '@prisma/client';

export interface SocialStakeConfig {
  poolId: string;
  enabled: boolean;
  minCohortFloor: number;
  maxStakeAmount: Prisma.Decimal;
}

export interface SweatTelemetryPayload {
  poolId: string;
  gameId: string;
  activePicksCount: number;
  sweatIndex: Prisma.Decimal;
}

export class Phase17SocialTelemetryService {
  private static readonly CIRCUIT_BREAKER_KEY = 'phase_17_social_telemetry';
  private static readonly MIN_COHORT_FLOOR = 3;

  /**
   * Evaluates circuit breaker flag for a given pool.
   * Per Decision #62, missing or unconfigured flags strictly default to false.
   */
  public static isFeatureEnabled(flagStoreValue: boolean | null | undefined): boolean {
    return flagStoreValue === true;
  }

  /**
   * Validates anti-peeking cohort floor.
   * Per invariant, live telemetry sweeps require active cohort >= 3 to prevent algebraic deduction.
   */
  public static validateCohortFloor(activePicksCount: number): { allowed: boolean; reason?: string } {
    if (activePicksCount < this.MIN_COHORT_FLOOR) {
      return {
        allowed: false,
        reason: 'ANTI_PEEKING_COHORT_FLOOR_VIOLATION: Cohort size below minimum floor of 3',
      };
    }
    return { allowed: true };
  }

  /**
   * Safely formats stakes using Prisma.Decimal per Decisions #3 & #22.
   * Floating-point operations strictly avoided.
   */
  public static calculateSocialStakePool(stakes: Prisma.Decimal[]): Prisma.Decimal {
    return stakes.reduce((sum, curr) => sum.add(curr), new Prisma.Decimal('0.00'));
  }
}
