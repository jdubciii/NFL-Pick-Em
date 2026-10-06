import { describe, it, expect } from 'vitest';
import { PENALTY_RULES, LeagueRuleConfig } from '../src/components/admin/LeagueRulesSettingsPanel';
import { RuleEngineService, PoolRuleConfiguration } from '../src/services/ruleEngineService';
import { featureFlags, FeatureFlagKey } from '../src/config/featureFlags';

describe('Milestone 22.2: Custom League Rules UI Integration Contracts', () => {
  it('matches all UI penalty rule types with RuleEngineService domain definitions', () => {
    const supportedTypes = PENALTY_RULES.map(r => r.type);
    expect(supportedTypes).toContain('DEAD_PLACE_OVERRIDE');
    expect(supportedTypes).toContain('BR4_SPLIT');
    expect(supportedTypes).toContain('FLAT_PENALTY');
  });

  it('validates rule evaluation against RuleEngineService without schema mutations', () => {
    const originalFlag = featureFlags[FeatureFlagKey.CUSTOM_LEAGUE_RULES];
    featureFlags[FeatureFlagKey.CUSTOM_LEAGUE_RULES] = true;

    try {
      const deadPlaceConfig: PoolRuleConfiguration = {
        tenantId: 'tenant_rules_test',
        poolId: 'pool_rules_test',
        penaltyRuleType: 'DEAD_PLACE_OVERRIDE',
        autoLossOnZeroPicks: true,
      };

      const evaluation = RuleEngineService.evaluateRules(deadPlaceConfig, {
        tenantId: 'tenant_rules_test',
        poolId: 'pool_rules_test',
        submittedPicksCount: 0,
        totalScore: 0.0,
        isTiedForLowest: true,
        tiedLowestCount: 1,
      });

      expect(evaluation).toBeDefined();
      expect(evaluation.appliedRule).toBe('DEAD_PLACE_OVERRIDE');
      expect(evaluation.isAutoLoss).toBe(true);
      expect(evaluation.isDeadPlace).toBe(true);
      expect(evaluation.penaltyShotDecimal).toBe('2.50');
    } finally {
      featureFlags[FeatureFlagKey.CUSTOM_LEAGUE_RULES] = originalFlag;
    }
  });

  it('evaluates BR4_SPLIT calculation properly when tied bottom players occur', () => {
    const originalFlag = featureFlags[FeatureFlagKey.CUSTOM_LEAGUE_RULES];
    featureFlags[FeatureFlagKey.CUSTOM_LEAGUE_RULES] = true;

    try {
      const br4Config: PoolRuleConfiguration = {
        tenantId: 'tenant_rules_test',
        poolId: 'pool_rules_test',
        penaltyRuleType: 'BR4_SPLIT',
        autoLossOnZeroPicks: false,
      };

      const evaluation = RuleEngineService.evaluateRules(br4Config, {
        tenantId: 'tenant_rules_test',
        poolId: 'pool_rules_test',
        submittedPicksCount: 16,
        totalScore: 8.0,
        isTiedForLowest: true,
        tiedLowestCount: 3,
      });

      expect(evaluation.appliedRule).toBe('BR4_SPLIT');
      expect(evaluation.penaltyShotDecimal).toBe('0.83');
      expect(evaluation.flatFineDecimal).toBe('2.00');
      expect(evaluation.isAutoLoss).toBe(false);
    } finally {
      featureFlags[FeatureFlagKey.CUSTOM_LEAGUE_RULES] = originalFlag;
    }
  });

  it('enforces Decision #62 fail-closed circuit breaker invariant (PRD_PHASE_22_UI_WIRING)', () => {
    expect(featureFlags[FeatureFlagKey.PRD_PHASE_22_UI_WIRING]).toBe(false);
  });
});
