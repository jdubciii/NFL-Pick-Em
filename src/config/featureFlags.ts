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

export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagKey, boolean> = {
  [FeatureFlagKey.PLAYOFF_BRACKET_ENGINE]: false,
  [FeatureFlagKey.DYNAMIC_MULTIPLIERS]: false,
  [FeatureFlagKey.SUPER_BOWL_PROPS]: false,
  [FeatureFlagKey.PRD_DEAD_PLACE_RULES]: false,
  [FeatureFlagKey.SHOT_CAM_WORKFLOW]: false,
  [FeatureFlagKey.SMS_FALLBACK_INGEST]: false,
  [FeatureFlagKey.PUBLIC_POOL_TEMPLATES]: false,
  [FeatureFlagKey.CUSTOM_LEAGUE_RULES]: false,
  [FeatureFlagKey.GLOBAL_TENANT_PARTITIONING]: false,
  [FeatureFlagKey.PRD_PHASE_21_CORE]: false,
  [FeatureFlagKey.PRD_PHASE_22_UI_WIRING]: false,
  [FeatureFlagKey.PRD_PHASE_23_PERF_HARDENING]: false,
  [FeatureFlagKey.PRD_PHASE_24_OBSERVABILITY]: false,
};

export const featureFlags = DEFAULT_FEATURE_FLAGS;

export class FeatureRegistry {
  public static isEnabled(key: FeatureFlagKey, store?: Record<string, boolean>): boolean {
    if (!store || !(key in store)) {
      return DEFAULT_FEATURE_FLAGS[key] ?? false;
    }
    return store[key] === true;
  }
}
