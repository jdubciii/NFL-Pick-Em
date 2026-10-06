import { featureFlags, FeatureFlagKey } from '../config/featureFlags';
import { Prisma } from '@prisma/client';

export type PenaltyRuleType = 'DEAD_PLACE_OVERRIDE' | 'BR4_SPLIT' | 'FLAT_PENALTY';

export interface PoolRuleConfiguration {
  poolId: string;
  tenantId: string;
  penaltyRuleType: PenaltyRuleType;
  customFlatAmountDecimal?: string;
  autoLossOnZeroPicks: boolean;
  metadata?: Record<string, unknown>;
}

export interface RuleEvaluationInput {
  tenantId: string;
  poolId: string;
  submittedPicksCount: number;
  totalScore: number;
  isTiedForLowest: boolean;
  tiedLowestCount: number;
}

export interface RuleEvaluationResult {
  isAutoLoss: boolean;
  isDeadPlace: boolean;
  penaltyShotDecimal: string;
  flatFineDecimal: string;
  appliedRule: PenaltyRuleType;
}

export class RuleEngineService {
  /**
   * Evaluates penalty and scoring rules dynamically.
   * Gated strictly behind CUSTOM_LEAGUE_RULES circuit breaker (Decision #62).
   * Fail-closed on malformed configuration or tenant mismatch (Decision #55, #20).
   * Pure projection with zero database writes (Decision #54).
   */
  public static evaluateRules(
    config: PoolRuleConfiguration,
    input: RuleEvaluationInput
  ): RuleEvaluationResult {
    // Decision #20: Validate Tenant & Pool Scope
    if (!config.tenantId || !input.tenantId || config.tenantId !== input.tenantId) {
      throw new Error('TENANT_ISOLATION_VIOLATION: Tenant mismatch or empty tenantId');
    }
    if (!config.poolId || !input.poolId || config.poolId !== input.poolId) {
      throw new Error('TENANT_ISOLATION_VIOLATION: Pool mismatch or empty poolId');
    }

    // Decision #62: Circuit Breaker Fallback
    // If CUSTOM_LEAGUE_RULES is OFF, fall back strictly to canonical baseline (Decision #69)
    if (!featureFlags[FeatureFlagKey.CUSTOM_LEAGUE_RULES]) {
      return this.evaluateBaselineCanonical(input);
    }

    // Decision #55: Fail-closed on invalid rule configuration
    if (!config.penaltyRuleType) {
      throw new Error('RULE_CONFIGURATION_MALFORMED: penaltyRuleType is required');
    }

    const isAutoLoss = config.autoLossOnZeroPicks && input.submittedPicksCount === 0;

    switch (config.penaltyRuleType) {
      case 'DEAD_PLACE_OVERRIDE': {
        // Decision #69: Absolute 2.50 penalty fine, zero split, 0.00 flat fine
        const penaltyShot = (input.isTiedForLowest || isAutoLoss) ? '2.50' : '0.00';
        return {
          isAutoLoss,
          isDeadPlace: isAutoLoss || input.isTiedForLowest,
          penaltyShotDecimal: penaltyShot,
          flatFineDecimal: '0.00',
          appliedRule: 'DEAD_PLACE_OVERRIDE',
        };
      }

      case 'BR4_SPLIT': {
        // Canonical split: 2.50 / tiedLowestCount, standard 2.00 flat fine
        let penaltyShot = '0.00';
        if (input.isTiedForLowest && input.tiedLowestCount > 0) {
          const split = 2.50 / input.tiedLowestCount;
          penaltyShot = split.toFixed(2);
        }
        return {
          isAutoLoss: false,
          isDeadPlace: false,
          penaltyShotDecimal: penaltyShot,
          flatFineDecimal: input.isTiedForLowest ? '2.00' : '0.00',
          appliedRule: 'BR4_SPLIT',
        };
      }

      case 'FLAT_PENALTY': {
        // Configurable flat penalty with fail-closed validation
        const flatAmount = config.customFlatAmountDecimal ?? '2.00';
        const parsed = Number(flatAmount);
        if (isNaN(parsed) || parsed < 0) {
          throw new Error('RULE_CONFIGURATION_MALFORMED: customFlatAmountDecimal must be a valid positive decimal');
        }
        return {
          isAutoLoss,
          isDeadPlace: false,
          penaltyShotDecimal: '0.00',
          flatFineDecimal: (input.isTiedForLowest || isAutoLoss) ? Number(flatAmount).toFixed(2) : '0.00',
          appliedRule: 'FLAT_PENALTY',
        };
      }

      default:
        throw new Error('RULE_CONFIGURATION_MALFORMED: Unsupported penaltyRuleType');
    }
  }

  /**
   * Canonical baseline fallback when CUSTOM_LEAGUE_RULES is OFF.
   * Preserves ratified Decision #69 behavior.
   */
  private static evaluateBaselineCanonical(input: RuleEvaluationInput): RuleEvaluationResult {
    const isAutoLoss = input.submittedPicksCount === 0;
    const penaltyShot = (input.isTiedForLowest || isAutoLoss) ? '2.50' : '0.00';

    return {
      isAutoLoss,
      isDeadPlace: isAutoLoss || input.isTiedForLowest,
      penaltyShotDecimal: penaltyShot,
      flatFineDecimal: '0.00',
      appliedRule: 'DEAD_PLACE_OVERRIDE',
    };
  }
}
