import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { featureFlags, FeatureFlagKey } from '../src/config/featureFlags';
import {
  RuleEngineService,
  PoolRuleConfiguration,
  RuleEvaluationInput,
} from '../src/services/ruleEngineService';

describe('Milestone 21.2: Custom League Rules Configuration Engine', () => {
  const originalFlag = featureFlags[FeatureFlagKey.CUSTOM_LEAGUE_RULES];

  const validScope = {
    tenantId: 'tenant_omega_21',
    poolId: 'pool_sigma_21',
  };

  const sampleInput: RuleEvaluationInput = {
    tenantId: 'tenant_omega_21',
    poolId: 'pool_sigma_21',
    submittedPicksCount: 16,
    totalScore: 10.0,
    isTiedForLowest: true,
    tiedLowestCount: 2,
  };

  beforeEach(() => {
    featureFlags[FeatureFlagKey.CUSTOM_LEAGUE_RULES] = false;
  });

  afterEach(() => {
    featureFlags[FeatureFlagKey.CUSTOM_LEAGUE_RULES] = originalFlag;
  });

  describe('Circuit Breaker (Decision #62)', () => {
    it('falls back to baseline canonical rules when CUSTOM_LEAGUE_RULES is false', () => {
      const config: PoolRuleConfiguration = {
        tenantId: validScope.tenantId,
        poolId: validScope.poolId,
        penaltyRuleType: 'BR4_SPLIT',
        autoLossOnZeroPicks: true,
      };

      const result = RuleEngineService.evaluateRules(config, sampleInput);
      expect(result.appliedRule).toBe('DEAD_PLACE_OVERRIDE');
      expect(result.penaltyShotDecimal).toBe('2.50');
      expect(result.flatFineDecimal).toBe('0.00');
    });
  });

  describe('Tenant and Scope Validation (Decision #20)', () => {
    it('throws TENANT_ISOLATION_VIOLATION when tenant IDs do not match', () => {
      featureFlags[FeatureFlagKey.CUSTOM_LEAGUE_RULES] = true;
      const config: PoolRuleConfiguration = {
        tenantId: 'tenant_A',
        poolId: validScope.poolId,
        penaltyRuleType: 'DEAD_PLACE_OVERRIDE',
        autoLossOnZeroPicks: true,
      };

      expect(() => {
        RuleEngineService.evaluateRules(config, sampleInput);
      }).toThrowError(/TENANT_ISOLATION_VIOLATION/);
    });

    it('throws TENANT_ISOLATION_VIOLATION when pool IDs do not match', () => {
      featureFlags[FeatureFlagKey.CUSTOM_LEAGUE_RULES] = true;
      const config: PoolRuleConfiguration = {
        tenantId: validScope.tenantId,
        poolId: 'pool_mismatch',
        penaltyRuleType: 'DEAD_PLACE_OVERRIDE',
        autoLossOnZeroPicks: true,
      };

      expect(() => {
        RuleEngineService.evaluateRules(config, sampleInput);
      }).toThrowError(/TENANT_ISOLATION_VIOLATION/);
    });
  });

  describe('Fail-Closed Error Handling (Decision #55)', () => {
    it('throws RULE_CONFIGURATION_MALFORMED on unknown penaltyRuleType', () => {
      featureFlags[FeatureFlagKey.CUSTOM_LEAGUE_RULES] = true;
      const config = {
        tenantId: validScope.tenantId,
        poolId: validScope.poolId,
        penaltyRuleType: 'INVALID_TYPE' as any,
        autoLossOnZeroPicks: true,
      };

      expect(() => {
        RuleEngineService.evaluateRules(config, sampleInput);
      }).toThrowError(/RULE_CONFIGURATION_MALFORMED/);
    });

    it('throws RULE_CONFIGURATION_MALFORMED on negative customFlatAmountDecimal', () => {
      featureFlags[FeatureFlagKey.CUSTOM_LEAGUE_RULES] = true;
      const config: PoolRuleConfiguration = {
        tenantId: validScope.tenantId,
        poolId: validScope.poolId,
        penaltyRuleType: 'FLAT_PENALTY',
        customFlatAmountDecimal: '-5.00',
        autoLossOnZeroPicks: true,
      };

      expect(() => {
        RuleEngineService.evaluateRules(config, sampleInput);
      }).toThrowError(/RULE_CONFIGURATION_MALFORMED/);
    });
  });

  describe('Dynamic Rule Evaluation Modes', () => {
    beforeEach(() => {
      featureFlags[FeatureFlagKey.CUSTOM_LEAGUE_RULES] = true;
    });

    it('evaluates DEAD_PLACE_OVERRIDE with 2.50 absolute fine and zero split', () => {
      const config: PoolRuleConfiguration = {
        tenantId: validScope.tenantId,
        poolId: validScope.poolId,
        penaltyRuleType: 'DEAD_PLACE_OVERRIDE',
        autoLossOnZeroPicks: true,
      };

      const result = RuleEngineService.evaluateRules(config, sampleInput);
      expect(result.appliedRule).toBe('DEAD_PLACE_OVERRIDE');
      expect(result.penaltyShotDecimal).toBe('2.50');
      expect(result.flatFineDecimal).toBe('0.00');
      expect(result.isDeadPlace).toBe(true);
    });

    it('evaluates BR4_SPLIT correctly dividing 2.50 by tied count with flat +2.00 fine', () => {
      const config: PoolRuleConfiguration = {
        tenantId: validScope.tenantId,
        poolId: validScope.poolId,
        penaltyRuleType: 'BR4_SPLIT',
        autoLossOnZeroPicks: true,
      };

      const result = RuleEngineService.evaluateRules(config, sampleInput);
      expect(result.appliedRule).toBe('BR4_SPLIT');
      expect(result.penaltyShotDecimal).toBe('1.25');
      expect(result.flatFineDecimal).toBe('2.00');
      expect(result.isDeadPlace).toBe(false);
    });

    it('evaluates FLAT_PENALTY with custom decimal amount and 0.00 shot fine', () => {
      const config: PoolRuleConfiguration = {
        tenantId: validScope.tenantId,
        poolId: validScope.poolId,
        penaltyRuleType: 'FLAT_PENALTY',
        customFlatAmountDecimal: '7.50',
        autoLossOnZeroPicks: true,
      };

      const result = RuleEngineService.evaluateRules(config, sampleInput);
      expect(result.appliedRule).toBe('FLAT_PENALTY');
      expect(result.penaltyShotDecimal).toBe('0.00');
      expect(result.flatFineDecimal).toBe('7.50');
    });

    it('triggers auto-loss when submittedPicksCount is 0', () => {
      const config: PoolRuleConfiguration = {
        tenantId: validScope.tenantId,
        poolId: validScope.poolId,
        penaltyRuleType: 'DEAD_PLACE_OVERRIDE',
        autoLossOnZeroPicks: true,
      };

      const zeroPickInput: RuleEvaluationInput = {
        ...sampleInput,
        submittedPicksCount: 0,
        isTiedForLowest: false,
      };

      const result = RuleEngineService.evaluateRules(config, zeroPickInput);
      expect(result.isAutoLoss).toBe(true);
      expect(result.isDeadPlace).toBe(true);
      expect(result.penaltyShotDecimal).toBe('2.50');
    });
  });
});
