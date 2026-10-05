import { Prisma } from '@prisma/client';

export type PropCategory = 'GAME_EVENT' | 'PLAYER_STATS' | 'NOVELTY' | 'HALFTIME';

export interface SuperBowlPropItem {
  id: string;
  poolId: string;
  category: PropCategory;
  question: string;
  options: string[];
  pointValue: Prisma.Decimal;
  correctOption?: string;
  isSettled: boolean;
}

export interface UserPropSubmission {
  userId: string;
  poolId: string;
  propId: string;
  selectedOption: string;
  submissionTime: Date;
}

export interface PropSubmissionResult {
  success: boolean;
  awardedPoints?: Prisma.Decimal;
  error?: string;
}

export class Phase19SuperBowlPropsService {
  private static readonly CIRCUIT_BREAKER_KEY = 'super_bowl_props';

  public static isFeatureEnabled(flagStoreValue: boolean | null | undefined): boolean {
    return flagStoreValue === true;
  }

  /**
   * Enforces Decision #62 (Circuit Breaker), Decision #65 (Lock Supremacy),
   * Decision #20 (Pool Isolation), and Decision #55 (Option Parity).
   */
  public static submitPropPick(params: {
    prop: SuperBowlPropItem;
    submission: UserPropSubmission;
    gameKickoff: Date;
    flagStoreValue: boolean | null | undefined;
  }): { success: boolean; error?: string } {
    if (!this.isFeatureEnabled(params.flagStoreValue)) {
      return { success: false, error: 'CIRCUIT_BREAKER_DISABLED: Super Bowl props feature is disabled' };
    }

    if (params.prop.poolId !== params.submission.poolId) {
      return { success: false, error: 'POOL_MISMATCH_VIOLATION: Prop poolId does not match submission pool scope' };
    }

    // Decision #65: Strict lock at Super Bowl kickoff timestamp
    if (params.submission.submissionTime.getTime() >= params.gameKickoff.getTime()) {
      return {
        success: false,
        error: 'LOCK_SUPREMACY_VIOLATION: Prop submissions locked at Super Bowl kickoff timestamp',
      };
    }

    // Decision #55: Fail-closed validation of selected option
    if (!params.prop.options.includes(params.submission.selectedOption)) {
      return {
        success: false,
        error: 'INVALID_PROP_OPTION: Selected option is not valid for this prop item',
      };
    }

    return { success: true };
  }

  /**
   * Enforces Decision #54 (Read-Only Evaluation), Decision #55 (Fail-Closed Unsettled Props),
   * and Decisions #3 & #22 (Prisma.Decimal point calculations).
   */
  public static gradePropPick(
    prop: SuperBowlPropItem,
    selectedOption: string
  ): PropSubmissionResult {
    if (!prop.isSettled || !prop.correctOption) {
      return {
        success: false,
        error: 'PROP_NOT_SETTLED: Cannot grade prop pick before official settlement',
      };
    }

    const isCorrect = selectedOption === prop.correctOption;
    return {
      success: true,
      awardedPoints: isCorrect ? prop.pointValue : new Prisma.Decimal('0.00'),
    };
  }
}
