import { describe, it, expect } from 'vitest';
import { FeatureFlagKey, FeatureRegistry, featureFlags } from '../src/config/featureFlags';
import { Phase21ConsumerService, TenantPartitionScope } from '../src/services/phase21ConsumerService';

describe('Milestone 21.0: Intake & Scaffolding Invariant Suite', () => {
  describe('Phase 21 Circuit Breaker Defaults (Decision #62)', () => {
    it('asserts PUBLIC_POOL_TEMPLATES defaults strictly to OFF', () => {
      expect(FeatureRegistry.isEnabled(FeatureFlagKey.PUBLIC_POOL_TEMPLATES)).toBe(false);
      expect(FeatureRegistry.isEnabled(FeatureFlagKey.PUBLIC_POOL_TEMPLATES, {})).toBe(false);
      expect(FeatureRegistry.isEnabled(FeatureFlagKey.PUBLIC_POOL_TEMPLATES, { PUBLIC_POOL_TEMPLATES: true })).toBe(true);
    });

    it('asserts CUSTOM_LEAGUE_RULES defaults strictly to OFF', () => {
      expect(FeatureRegistry.isEnabled(FeatureFlagKey.CUSTOM_LEAGUE_RULES)).toBe(false);
      expect(FeatureRegistry.isEnabled(FeatureFlagKey.CUSTOM_LEAGUE_RULES, {})).toBe(false);
      expect(FeatureRegistry.isEnabled(FeatureFlagKey.CUSTOM_LEAGUE_RULES, { CUSTOM_LEAGUE_RULES: true })).toBe(true);
    });

    it('asserts GLOBAL_TENANT_PARTITIONING defaults strictly to OFF', () => {
      expect(FeatureRegistry.isEnabled(FeatureFlagKey.GLOBAL_TENANT_PARTITIONING)).toBe(false);
      expect(FeatureRegistry.isEnabled(FeatureFlagKey.GLOBAL_TENANT_PARTITIONING, {})).toBe(false);
      expect(FeatureRegistry.isEnabled(FeatureFlagKey.GLOBAL_TENANT_PARTITIONING, { GLOBAL_TENANT_PARTITIONING: true })).toBe(true);
    });

    it('asserts PRD_PHASE_21_CORE defaults strictly to OFF', () => {
      expect(FeatureRegistry.isEnabled(FeatureFlagKey.PRD_PHASE_21_CORE)).toBe(false);
      expect(featureFlags[FeatureFlagKey.PRD_PHASE_21_CORE]).toBe(false);
    });
  });

  describe('Consumer Domain Scaffolding & Tenant Isolation (Decision #20)', () => {
    it('returns empty templates when PUBLIC_POOL_TEMPLATES circuit breaker is OFF', () => {
      const templates = Phase21ConsumerService.getPublicTemplates({ PUBLIC_POOL_TEMPLATES: false });
      expect(templates).toEqual([]);
    });

    it('returns templates when PUBLIC_POOL_TEMPLATES circuit breaker is ON', () => {
      const templates = Phase21ConsumerService.getPublicTemplates({ PUBLIC_POOL_TEMPLATES: true });
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0].templateId).toBe('tpl_standard_10');
      expect(templates[0].penaltyRule).toBe('DEAD_PLACE_ABSOLUTE');
    });

    it('validates tenant partition boundaries (Decision #20)', () => {
      const validScope: TenantPartitionScope = {
        tenantId: 'tenant_consumer_01',
        poolId: 'pool_public_100',
        isIsolated: true,
      };
      expect(Phase21ConsumerService.validateTenantScope(validScope)).toBe(true);

      const invalidScope: TenantPartitionScope = {
        tenantId: '',
        poolId: 'pool_public_100',
        isIsolated: true,
      };
      expect(Phase21ConsumerService.validateTenantScope(invalidScope)).toBe(false);

      const nonIsolatedScope: TenantPartitionScope = {
        tenantId: 'tenant_01',
        poolId: 'pool_01',
        isIsolated: false,
      };
      expect(Phase21ConsumerService.validateTenantScope(nonIsolatedScope)).toBe(false);
    });
  });
});
