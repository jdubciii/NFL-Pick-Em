export enum FeatureFlagKey {
  PLAYOFF_BRACKET_ENGINE = 'PLAYOFF_BRACKET_ENGINE',
  DYNAMIC_MULTIPLIERS = 'DYNAMIC_MULTIPLIERS',
  SUPER_BOWL_PROPS = 'SUPER_BOWL_PROPS',
  PRD_DEAD_PLACE_RULES = 'PRD_DEAD_PLACE_RULES',
  SHOT_CAM_WORKFLOW = 'SHOT_CAM_WORKFLOW',
  SMS_FALLBACK_INGEST = 'SMS_FALLBACK_INGEST',
  PUBLIC_POOL_TEMPLATES = 'PUBLIC_POOL_TEMPLATES',
  CUSTOM_LEAGUE_RULES = 'CUSTOM_LEAGUE_RULES',
  GLOBAL_TENANT_PARTITIONING = 'GLOBAL_TENANT_PARTITIONING',
  PRD_PHASE_21_CORE = 'PRD_PHASE_21_CORE',
  PRD_PHASE_22_UI_WIRING = 'PRD_PHASE_22_UI_WIRING',
  PRD_PHASE_23_PERF_HARDENING = 'PRD_PHASE_23_PERF_HARDENING',
  PRD_PHASE_24_OBSERVABILITY = 'PRD_PHASE_24_OBSERVABILITY',
}

export const featureFlags: Record<FeatureFlagKey, boolean> = {
  [FeatureFlagKey.PLAYOFF_BRACKET_ENGINE]: true,
  [FeatureFlagKey.DYNAMIC_MULTIPLIERS]: true,
  [FeatureFlagKey.SUPER_BOWL_PROPS]: true,
  [FeatureFlagKey.PRD_DEAD_PLACE_RULES]: true,
  [FeatureFlagKey.SHOT_CAM_WORKFLOW]: true,
  [FeatureFlagKey.SMS_FALLBACK_INGEST]: true,
  [FeatureFlagKey.PUBLIC_POOL_TEMPLATES]: true,
  [FeatureFlagKey.CUSTOM_LEAGUE_RULES]: true,
  [FeatureFlagKey.GLOBAL_TENANT_PARTITIONING]: true,
  [FeatureFlagKey.PRD_PHASE_21_CORE]: true,
  [FeatureFlagKey.PRD_PHASE_22_UI_WIRING]: true,
  [FeatureFlagKey.PRD_PHASE_23_PERF_HARDENING]: true,
  [FeatureFlagKey.PRD_PHASE_24_OBSERVABILITY]: true,
};

export const DEFAULT_FEATURE_FLAGS = featureFlags;

export class FeatureRegistry {
  public static isEnabled(_key: any, _store?: Record<string, boolean>): boolean {
    return true;
  }
}

export const isFeatureEnabled = (_key: any): boolean => true;
export default featureFlags;
