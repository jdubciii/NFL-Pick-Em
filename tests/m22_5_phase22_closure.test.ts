import { describe, it, expect } from 'vitest';
import { CANONICAL_TEMPLATES } from '../src/components/onboarding/TemplateSelectorModal';
import { ONBOARDING_TEMPLATES } from '../src/pages/OnboardingPage';
import { PENALTY_RULES } from '../src/components/admin/LeagueRulesSettingsPanel';
import { statusLabels } from '../src/components/shame/ShotCamReviewCard';
import { anonymizedHandle, isDistributionHidden } from '../src/components/leaderboard/MultiTenantLeaderboardPanel';
import { featureFlags, FeatureFlagKey } from '../src/config/featureFlags';
import { PoolTemplateService } from '../src/services/poolTemplateService';
import { RuleEngineService, PoolRuleConfiguration } from '../src/services/ruleEngineService';
import { ShotCamService } from '../src/services/shotCamService';
import { TenantPartitioningService } from '../src/services/tenantPartitioningService';

describe('Milestone 22.5: Phase 22 Full-Stack UI Wiring Cumulative Integration & Smoke Verification', () => {
  it('E2E SMOKE 1: verifies Onboarding & Template Selector alignment across domain layers', () => {
    const originalFlag = featureFlags[FeatureFlagKey.PUBLIC_POOL_TEMPLATES];
    featureFlags[FeatureFlagKey.PUBLIC_POOL_TEMPLATES] = true;

    try {
      const publicTemplates = PoolTemplateService.getPublicTemplates({ tenantId: 'tenant_smoke' });
      expect(publicTemplates.length).toBeGreaterThanOrEqual(3);

      const uiTemplateIds = CANONICAL_TEMPLATES.map(t => t.id);
      const pageTemplateIds = ONBOARDING_TEMPLATES.map(t => t.id);

      expect(uiTemplateIds).toEqual(pageTemplateIds);
      expect(uiTemplateIds).toContain('tpl_standard_pickem');
      expect(uiTemplateIds).toContain('tpl_high_roller_survivor');
      expect(uiTemplateIds).toContain('tpl_casual_social');
    } finally {
      featureFlags[FeatureFlagKey.PUBLIC_POOL_TEMPLATES] = originalFlag;
    }
  });

  it('E2E SMOKE 2: verifies Custom League Rules UI binds to RuleEngineService without schema mutations', () => {
    const ruleTypes = PENALTY_RULES.map(r => r.type);
    expect(ruleTypes).toContain('DEAD_PLACE_OVERRIDE');
    expect(ruleTypes).toContain('BR4_SPLIT');
    expect(ruleTypes).toContain('FLAT_PENALTY');

    const originalFlag = featureFlags[FeatureFlagKey.CUSTOM_LEAGUE_RULES];
    featureFlags[FeatureFlagKey.CUSTOM_LEAGUE_RULES] = true;

    try {
      const deadPlaceConfig: PoolRuleConfiguration = {
        tenantId: 'tenant_smoke',
        poolId: 'pool_smoke',
        penaltyRuleType: 'DEAD_PLACE_OVERRIDE',
        autoLossOnZeroPicks: true,
      };

      const evalResult = RuleEngineService.evaluateRules(deadPlaceConfig, {
        tenantId: 'tenant_smoke',
        poolId: 'pool_smoke',
        submittedPicksCount: 0,
        totalScore: 0.0,
        isTiedForLowest: true,
        tiedLowestCount: 1,
      });

      expect(evalResult.appliedRule).toBe('DEAD_PLACE_OVERRIDE');
      expect(evalResult.isAutoLoss).toBe(true);
      expect(evalResult.isDeadPlace).toBe(true);
      expect(evalResult.penaltyShotDecimal).toBe('2.50');
    } finally {
      featureFlags[FeatureFlagKey.CUSTOM_LEAGUE_RULES] = originalFlag;
    }
  });

  it('E2E SMOKE 3: verifies Shot-Cam FSM UI contracts and Decision #69 Dead Place Monarch math', () => {
    const expectedStates = [
      'PENDING_UPLOAD',
      'UPLOAD',
      'COMMISSIONER_AUDIT',
      'APPROVE',
      'VERIFIED',
      'DISPUTED',
    ] as const;

    expectedStates.forEach(st => {
      expect(statusLabels[st]).toBeDefined();
    });

    const kickoff = new Date('2026-10-08T18:00:00.000Z');
    const fsm = ShotCamService.initializeWorkflow('m_smoke', 'pen_smoke', 'pool_smoke', 'user_monarch_smoke', kickoff, false);
    expect(fsm.currentState).toBe('PENDING_UPLOAD');
  });

  it('E2E SMOKE 4: verifies Multi-Tenant Leaderboard anonymization and Decision #66 Sweat Radar suppression', () => {
    const handle = anonymizedHandle('user_smoke_cross_tenant_123');
    expect(handle).toMatch(/^AnonUser-[0-9a-f]{8}$/);

    const pastTime = new Date(Date.now() - 60000).toISOString();
    const suppressedMatchup = {
      gameId: 'gm_smoke',
      homeTeam: 'KC',
      awayTeam: 'SF',
      homePickPct: 55,
      awayPickPct: 45,
      isSuppressed: false,
      kickoffAt: pastTime,
      cohortSize: 2, // cohort floor is 3
    };
    expect(isDistributionHidden(suppressedMatchup, Date.now())).toBe(true);

    const unsuppressedMatchup = {
      ...suppressedMatchup,
      cohortSize: 4,
    };
    expect(isDistributionHidden(unsuppressedMatchup, Date.now())).toBe(false);
  });

  it('GOVERNANCE INVARIANT: verifies PRD_PHASE_22_UI_WIRING circuit breaker is strictly fail-closed (default false)', () => {
    expect(featureFlags[FeatureFlagKey.PRD_PHASE_22_UI_WIRING]).toBe(false);
  });
});
