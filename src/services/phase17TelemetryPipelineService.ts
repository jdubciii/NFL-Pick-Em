import { Prisma } from '@prisma/client';

export interface GameLockState {
  gameId: string;
  kickoffTime: Date;
  isLocked: boolean;
}

export interface PickTelemetryInput {
  membershipId: string;
  gameId: string;
  selectedTeam: string;
  submittedAt: Date;
}

export interface SweatRadarMetric {
  gameId: string;
  cohortSize: number;
  homePicks: number;
  awayPicks: number;
  sweatIndex: Prisma.Decimal;
  isMasked: boolean;
  maskReason?: string;
}

export class Phase17TelemetryPipelineService {
  private static readonly CIRCUIT_BREAKER_KEY = 'phase_17_telemetry_ui';
  public static readonly MIN_COHORT_FLOOR = 3;

  public static isCircuitBreakerOpen(flagStoreValue: boolean | null | undefined): boolean {
    return flagStoreValue !== true;
  }

  /**
   * Enforces Decision #66: Visibility derives strictly from individual game lock timestamp,
   * never slate-level completion.
   */
  public static evaluateGameLock(kickoffTime: Date, currentTime: Date = new Date()): boolean {
    return currentTime.getTime() >= kickoffTime.getTime();
  }

  /**
   * Computes Sweat Radar telemetry per game.
   * Enforces Decision #62 (Circuit Breaker), Decision #66 (Lock Supremacy),
   * Anti-Peeking Cohort Floor (N >= 3), and Decisions #3 & #22 (Prisma.Decimal precision).
   */
  public static computeGameSweatTelemetry(params: {
    gameId: string;
    kickoffTime: Date;
    currentTime: Date;
    picks: PickTelemetryInput[];
    flagStoreValue: boolean | null | undefined;
  }): { success: boolean; data?: SweatRadarMetric; error?: string } {
    if (this.isCircuitBreakerOpen(params.flagStoreValue)) {
      return { success: false, error: 'CIRCUIT_BREAKER_DISABLED: Feature unavailable for pool' };
    }

    const isLocked = this.evaluateGameLock(params.kickoffTime, params.currentTime);
    const cohortSize = params.picks.length;

    // Decision #66: Unlocked games hide collective distribution if hide_picks_until_kickoff applies
    if (!isLocked) {
      return {
        success: true,
        data: {
          gameId: params.gameId,
          cohortSize,
          homePicks: 0,
          awayPicks: 0,
          sweatIndex: new Prisma.Decimal('0.00'),
          isMasked: true,
          maskReason: 'PRE_KICKOFF_MASK: Individual game has not kicked off yet',
        },
      };
    }

    // Anti-Peeking Cohort Floor invariant: N >= 3 required to expose distribution
    if (cohortSize < this.MIN_COHORT_FLOOR) {
      return {
        success: true,
        data: {
          gameId: params.gameId,
          cohortSize,
          homePicks: 0,
          awayPicks: 0,
          sweatIndex: new Prisma.Decimal('0.00'),
          isMasked: true,
          maskReason: 'ANTI_PEEKING_COHORT_FLOOR_VIOLATION: Cohort size under floor threshold of 3',
        },
      };
    }

    let homeCount = 0;
    let awayCount = 0;

    for (const p of params.picks) {
      if (p.selectedTeam === 'HOME') {
        homeCount++;
      } else {
        awayCount++;
      }
    }

    // Sweat index: Higher dispersion = higher sweat (1.00 - |home - away| / total)
    const diff = Math.abs(homeCount - awayCount);
    const dispersion = 1.0 - diff / cohortSize;
    const sweatIndex = new Prisma.Decimal(dispersion.toFixed(4));

    return {
      success: true,
      data: {
        gameId: params.gameId,
        cohortSize,
        homePicks: homeCount,
        awayPicks: awayCount,
        sweatIndex,
        isMasked: false,
      },
    };
  }
}
