import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { featureFlags, FeatureFlagKey } from '../src/config/featureFlags';
import { PoolTemplateService, CANONICAL_PUBLIC_TEMPLATES } from '../src/services/poolTemplateService';

describe('Milestone 21.1: Public Pool Templates & Tiered Entry Configurations', () => {
  const originalFlag = featureFlags[FeatureFlagKey.PUBLIC_POOL_TEMPLATES];

  beforeEach(() => {
    featureFlags[FeatureFlagKey.PUBLIC_POOL_TEMPLATES] = false;
  });

  afterEach(() => {
    featureFlags[FeatureFlagKey.PUBLIC_POOL_TEMPLATES] = originalFlag;
  });

  describe('Circuit Breaker (Decision #62)', () => {
    it('returns an empty array when PUBLIC_POOL_TEMPLATES is false (default-OFF fail closed)', () => {
      const templates = PoolTemplateService.getPublicTemplates({ tenantId: 'tenant_test_1' });
      expect(templates).toEqual([]);
    });

    it('returns null for getTemplateById when circuit breaker is closed', () => {
      const template = PoolTemplateService.getTemplateById('tpl_standard_pickem', { tenantId: 'tenant_test_1' });
      expect(template).toBeNull();
    });
  });

  describe('Tenant Boundary & Security (Decision #20)', () => {
    it('throws TENANT_ISOLATION_VIOLATION when tenantId is empty', () => {
      expect(() => {
        PoolTemplateService.getPublicTemplates({ tenantId: '' });
      }).toThrowError(/TENANT_ISOLATION_VIOLATION/);
    });
  });

  describe('Template Ingestion & Tier Projections (Decision #54)', () => {
    it('returns all canonical templates when circuit breaker is enabled', () => {
      featureFlags[FeatureFlagKey.PUBLIC_POOL_TEMPLATES] = true;
      const templates = PoolTemplateService.getPublicTemplates({ tenantId: 'tenant_test_1' });
      expect(templates.length).toBe(3);
      expect(templates.map((t) => t.tier)).toEqual(['STANDARD', 'HIGH_ROLLER', 'CASUAL']);
    });

    it('retrieves specific template with correct decimal entry fee', () => {
      featureFlags[FeatureFlagKey.PUBLIC_POOL_TEMPLATES] = true;
      const tpl = PoolTemplateService.getTemplateById('tpl_high_roller_survivor', { tenantId: 'tenant_test_1' });
      expect(tpl).not.toBeNull();
      expect(tpl?.entryFeeDecimal).toBe('100.00');
      expect(tpl?.tier).toBe('HIGH_ROLLER');
    });

    it('returns null for nonexistent template ID', () => {
      featureFlags[FeatureFlagKey.PUBLIC_POOL_TEMPLATES] = true;
      const tpl = PoolTemplateService.getTemplateById('nonexistent_id', { tenantId: 'tenant_test_1' });
      expect(tpl).toBeNull();
    });
  });
});
