import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { featureFlags, FeatureFlagKey } from '../src/config/featureFlags';
import {
  ConsumerDashboardService,
  OnboardingDraftPayload,
} from '../src/services/consumerDashboardService';
import { PoolLeaderboardEntry } from '../src/services/tenantPartitioningService';
import { PoolRuleConfiguration } from '../src/services/ruleEngineService';

describe('Milestone 21.4: Consumer League Dashboard & Onboarding Flow Integration', () => {
  const originalPrdFlag = featureFlags[FeatureFlagKey.PRD_PHASE_21_CORE];
  const originalTemplatesFlag = featureFlags[FeatureFlagKey.PUBLIC_POOL_TEMPLATES];
  const originalTenantFlag = featureFlags[FeatureFlagKey.GLOBAL_TENANT_PARTITIONING];

  const defaultRules: PoolRuleConfiguration = {
    poolId: 'pool_dashboard_1',
    tenantId: 'tenant_alpha',
    penaltyRuleType: 'DEAD_PLACE_OVERRIDE',
    autoLossOnZeroPicks: true,
  };

  const sampleLeaderboard: PoolLeaderboardEntry[] = [
    {
      userId: 'user_1',
      username: 'AlphaOne',
      tenantId: 'tenant_alpha',
      poolId: 'pool_dashboard_1',
      totalPoints: 50,
      rank: 1,
    },
  ];

  beforeEach(() => {
    featureFlags[FeatureFlagKey.PRD_PHASE_21_CORE] = false;
    featureFlags[FeatureFlagKey.PUBLIC_POOL_TEMPLATES] = false;
    featureFlags[FeatureFlagKey.GLOBAL_TENANT_PARTITIONING] = false;
  });

  afterEach(() => {
    featureFlags[FeatureFlagKey.PRD_PHASE_21_CORE] = originalPrdFlag;
    featureFlags[FeatureFlagKey.PUBLIC_POOL_TEMPLATES] = originalTemplatesFlag;
    featureFlags[FeatureFlagKey.GLOBAL_TENANT_PARTITIONING] = originalTenantFlag;
  });

  describe('Circuit Breaker (Decision #62)', () => {
    it('returns minimal inactive dashboard state when PRD_PHASE_21_CORE is false', () => {
      const state = ConsumerDashboardService.getDashboardState(
        'tenant_alpha',
        'pool_dashboard_1',
        defaultRules,
        sampleLeaderboard
      );

      expect(state.isPhase21Active).toBe(false);
      expect(state.availableTemplates).toEqual([]);
      expect(state.leaderboard.entries).toEqual([]);
    });

    it('throws CIRCUIT_BREAKER_TRIPPED when processing onboarding with flag OFF', () => {
      const payload: OnboardingDraftPayload = {
        tenantId: 'tenant_alpha',
        templateId: 'tpl_standard_pickem',
        customPoolName: 'Alpha League',
        ruleConfiguration: defaultRules,
      };

      expect(() => {
        ConsumerDashboardService.processOnboardingDraft(payload);
      }).toThrowError(/CIRCUIT_BREAKER_TRIPPED/);
    });
  });

  describe('Tenant Isolation & Boundary Guards (Decisions #20, #55)', () => {
    it('throws TENANT_ISOLATION_VIOLATION when tenantId is empty in dashboard request', () => {
      expect(() => {
        ConsumerDashboardService.getDashboardState('', 'pool_dashboard_1', defaultRules, sampleLeaderboard);
      }).toThrowError(/TENANT_ISOLATION_VIOLATION/);
    });

    it('throws TENANT_ISOLATION_VIOLATION when onboarding tenantId mismatches ruleConfiguration tenantId', () => {
      featureFlags[FeatureFlagKey.PRD_PHASE_21_CORE] = true;
      featureFlags[FeatureFlagKey.PUBLIC_POOL_TEMPLATES] = true;

      const payload: OnboardingDraftPayload = {
        tenantId: 'tenant_alpha',
        templateId: 'tpl_standard_pickem',
        customPoolName: 'Mismatch League',
        ruleConfiguration: {
          ...defaultRules,
          tenantId: 'tenant_foreign',
        },
      };

      expect(() => {
        ConsumerDashboardService.processOnboardingDraft(payload);
      }).toThrowError(/TENANT_ISOLATION_VIOLATION/);
    });
  });

  describe('Integrated Dashboard & Onboarding Flow (Decisions #54, #61)', () => {
    beforeEach(() => {
      featureFlags[FeatureFlagKey.PRD_PHASE_21_CORE] = true;
      featureFlags[FeatureFlagKey.PUBLIC_POOL_TEMPLATES] = true;
      featureFlags[FeatureFlagKey.GLOBAL_TENANT_PARTITIONING] = true;
    });

    it('compiles unified dashboard projection with templates and partitioned leaderboard', () => {
      const state = ConsumerDashboardService.getDashboardState(
        'tenant_alpha',
        'pool_dashboard_1',
        defaultRules,
        sampleLeaderboard
      );

      expect(state.isPhase21Active).toBe(true);
      expect(state.availableTemplates.length).toBeGreaterThan(0);
      expect(state.leaderboard.entries.length).toBe(1);
      expect(state.leaderboard.entries[0].displayName).toBe('AlphaOne');
    });

    it('processes onboarding draft successfully with validated template and frozen schema metadata', () => {
      const payload: OnboardingDraftPayload = {
        tenantId: 'tenant_alpha',
        templateId: 'tpl_standard_pickem',
        customPoolName: 'Alpha Unified League',
        ruleConfiguration: defaultRules,
      };

      const result = ConsumerDashboardService.processOnboardingDraft(payload);
      expect(result.success).toBe(true);
      expect(result.template.id).toBe('tpl_standard_pickem');
      expect(result.metadata.frozenSchemaCompliant).toBe(true);
      expect(result.metadata.persistedInJsonb).toBe(true);
    });
  });
});
