import { FeatureFlagKey, FeatureRegistry } from '../config/featureFlags';

export type PenaltyRuleType = 'DEAD_PLACE_ABSOLUTE' | 'CANONICAL_BR4_SPLIT' | 'CUSTOM_FLAT';

export interface PoolTemplateConfig {
  templateId: string;
  name: string;
  description: string;
  maxParticipants: number;
  entryFeeTier: number;
  penaltyRule: PenaltyRuleType;
  shotCamEnabled: boolean;
  smsIngestEnabled: boolean;
}

export interface TenantPartitionScope {
  tenantId: string;
  poolId: string;
  isIsolated: boolean;
}

export class Phase21ConsumerService {
  public static readonly DEFAULT_TEMPLATES: PoolTemplateConfig[] = [
    {
      templateId: 'tpl_standard_10',
      name: 'Standard Private 10',
      description: '10-person private league with Dead Place penalties and Shot-Cam',
      maxParticipants: 10,
      entryFeeTier: 0,
      penaltyRule: 'DEAD_PLACE_ABSOLUTE',
      shotCamEnabled: true,
      smsIngestEnabled: true,
    },
    {
      templateId: 'tpl_casual_open',
      name: 'Casual Open Pool',
      description: 'Open public pool with standard BR-4 split penalty rules',
      maxParticipants: 100,
      entryFeeTier: 10,
      penaltyRule: 'CANONICAL_BR4_SPLIT',
      shotCamEnabled: false,
      smsIngestEnabled: false,
    },
  ];

  /**
   * Retrieves available public pool templates.
   * Gated behind FeatureFlagKey.PUBLIC_POOL_TEMPLATES (Decision #62).
   */
  public static getPublicTemplates(flagStore?: Record<string, boolean>): PoolTemplateConfig[] {
    const isEnabled = FeatureRegistry.isEnabled(FeatureFlagKey.PUBLIC_POOL_TEMPLATES, flagStore);
    if (!isEnabled) {
      return [];
    }
    return this.DEFAULT_TEMPLATES;
  }

  /**
   * Validates tenant isolation boundary parameters.
   * Enforces Decision #20 (Tenant & Privacy Isolation).
   */
  public static validateTenantScope(scope: TenantPartitionScope): boolean {
    if (!scope.tenantId || !scope.poolId) {
      return false;
    }
    return scope.isIsolated === true;
  }
}
