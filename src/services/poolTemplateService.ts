import { featureFlags, FeatureFlagKey } from '../config/featureFlags';

export interface PoolTemplateConfig {
  id: string;
  name: string;
  description: string;
  tier: 'STANDARD' | 'HIGH_ROLLER' | 'CASUAL';
  entryFeeDecimal: string;
  maxParticipants: number;
  pickDeadlines: 'KICKOFF' | 'BATCHED_NOON';
  deadPlaceEnabled: boolean;
  metadata: Record<string, unknown>;
}

export interface TenantTemplateScope {
  tenantId: string;
  poolId?: string;
}

export const CANONICAL_PUBLIC_TEMPLATES: ReadonlyArray<PoolTemplateConfig> = Object.freeze([
  {
    id: 'tpl_standard_pickem',
    name: 'Standard NFL Pick Em',
    description: 'Canonical pool with straight-up picks, kickoff locks, and standard Dead Place rules.',
    tier: 'STANDARD',
    entryFeeDecimal: '25.00',
    maxParticipants: 100,
    pickDeadlines: 'KICKOFF',
    deadPlaceEnabled: true,
    metadata: { version: '2026.1', autoLossZeroPick: true },
  },
  {
    id: 'tpl_high_roller_survivor',
    name: 'High Roller Tier Pick Em',
    description: 'Elevated entry pool with strict penalty shots and zero fine splitting.',
    tier: 'HIGH_ROLLER',
    entryFeeDecimal: '100.00',
    maxParticipants: 50,
    pickDeadlines: 'KICKOFF',
    deadPlaceEnabled: true,
    metadata: { version: '2026.1', penaltyRate: '2.50' },
  },
  {
    id: 'tpl_casual_social',
    name: 'Casual Social League',
    description: 'Low-stakes recreational tier with community defaults.',
    tier: 'CASUAL',
    entryFeeDecimal: '5.00',
    maxParticipants: 250,
    pickDeadlines: 'KICKOFF',
    deadPlaceEnabled: false,
    metadata: { version: '2026.1', recreational: true },
  },
]);

export class PoolTemplateService {
  /**
   * Retrieves public templates.
   * Gated strictly behind PUBLIC_POOL_TEMPLATES flag (Decision #62).
   * Pure read projection without database side effects (Decision #54).
   * Validates tenant scope boundary (Decision #20).
   */
  public static getPublicTemplates(scope: TenantTemplateScope): PoolTemplateConfig[] {
    if (!scope.tenantId || scope.tenantId.trim() === '') {
      throw new Error('TENANT_ISOLATION_VIOLATION: tenantId is required');
    }

    // Circuit Breaker: Fail closed if flag is OFF
    if (!featureFlags[FeatureFlagKey.PUBLIC_POOL_TEMPLATES]) {
      return [];
    }

    return [...CANONICAL_PUBLIC_TEMPLATES];
  }

  /**
   * Retrieves a single template by ID.
   * Gated behind PUBLIC_POOL_TEMPLATES; fail-closed on unknown IDs.
   */
  public static getTemplateById(templateId: string, scope: TenantTemplateScope): PoolTemplateConfig | null {
    if (!scope.tenantId || scope.tenantId.trim() === '') {
      throw new Error('TENANT_ISOLATION_VIOLATION: tenantId is required');
    }

    if (!featureFlags[FeatureFlagKey.PUBLIC_POOL_TEMPLATES]) {
      return null;
    }

    const match = CANONICAL_PUBLIC_TEMPLATES.find((tpl) => tpl.id === templateId);
    return match ? { ...match } : null;
  }
}
