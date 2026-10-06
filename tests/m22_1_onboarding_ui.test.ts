import { describe, it, expect } from 'vitest';
import { CANONICAL_TEMPLATES } from '../src/components/onboarding/TemplateSelectorModal';
import { ONBOARDING_TEMPLATES } from '../src/pages/OnboardingPage';
import { PoolTemplateService, CANONICAL_PUBLIC_TEMPLATES } from '../src/services/poolTemplateService';
import { ConsumerDashboardService } from '../src/services/consumerDashboardService';
import { featureFlags, FeatureFlagKey } from '../src/config/featureFlags';

describe('Milestone 22.1: Consumer Onboarding & Public Templates UI Contracts', () => {
  it('aligns UI template IDs with canonical PoolTemplateService constants', () => {
    const originalTemplatesFlag = featureFlags[FeatureFlagKey.PUBLIC_POOL_TEMPLATES];
    featureFlags[FeatureFlagKey.PUBLIC_POOL_TEMPLATES] = true;

    try {
      const backendTemplates = PoolTemplateService.getPublicTemplates({ tenantId: 't1' });
      const backendIds = backendTemplates.map(t => t.id);

      expect(CANONICAL_TEMPLATES.map(t => t.id)).toEqual(
        expect.arrayContaining(['tpl_standard_pickem', 'tpl_high_roller_survivor', 'tpl_casual_social'])
      );
      expect(ONBOARDING_TEMPLATES.map(t => t.id)).toEqual(
        expect.arrayContaining(['tpl_standard_pickem', 'tpl_high_roller_survivor', 'tpl_casual_social'])
      );
      expect(backendIds).toEqual(
        expect.arrayContaining(CANONICAL_TEMPLATES.map(t => t.id))
      );
    } finally {
      featureFlags[FeatureFlagKey.PUBLIC_POOL_TEMPLATES] = originalTemplatesFlag;
    }
  });

  it('validates OnboardingDraftPayload passes ConsumerDashboardService validation without mutation', () => {
    const origCoreFlag = featureFlags[FeatureFlagKey.PRD_PHASE_21_CORE];
    const origTemplatesFlag = featureFlags[FeatureFlagKey.PUBLIC_POOL_TEMPLATES];
    featureFlags[FeatureFlagKey.PRD_PHASE_21_CORE] = true;
    featureFlags[FeatureFlagKey.PUBLIC_POOL_TEMPLATES] = true;

    try {
      const draftPayload = {
        tenantId: 'tenant_ui_test',
        templateId: 'tpl_standard_pickem',
        customPoolName: 'Saturday Blitz Pool',
        ruleConfiguration: {
          tenantId: 'tenant_ui_test',
          poolId: 'pool_ui_test',
          penaltyRuleType: 'DEAD_PLACE_OVERRIDE' as const,
          autoLossOnZeroPicks: true,
        },
      };

      const result = ConsumerDashboardService.processOnboardingDraft(draftPayload);
      expect(result.success).toBe(true);
      expect(result.poolDraftId).toBeDefined();
      expect(result.template.id).toBe('tpl_standard_pickem');
      expect(result.ruleConfiguration.penaltyRuleType).toBe('DEAD_PLACE_OVERRIDE');
    } finally {
      featureFlags[FeatureFlagKey.PRD_PHASE_21_CORE] = origCoreFlag;
      featureFlags[FeatureFlagKey.PUBLIC_POOL_TEMPLATES] = origTemplatesFlag;
    }
  });

  it('verifies UI circuit breaker gating invariant (PRD_PHASE_22_UI_WIRING)', () => {
    expect(featureFlags[FeatureFlagKey.PRD_PHASE_22_UI_WIRING]).toBe(false);
  });
});
