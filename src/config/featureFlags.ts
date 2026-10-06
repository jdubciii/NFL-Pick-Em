export enum FeatureFlagKey {
  PLAYOFF_BRACKET_ENGINE = 'PLAYOFF_BRACKET_ENGINE',
  DYNAMIC_MULTIPLIERS = 'DYNAMIC_MULTIPLIERS',
  SUPER_BOWL_PROPS = 'SUPER_BOWL_PROPS',
  PRD_DEAD_PLACE_RULES = 'PRD_DEAD_PLACE_RULES',
  SHOT_CAM_WORKFLOW = 'SHOT_CAM_WORKFLOW',
  SMS_FALLBACK_INGEST = 'SMS_FALLBACK_INGEST',
}

export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagKey, boolean> = {
  [FeatureFlagKey.PLAYOFF_BRACKET_ENGINE]: false,
  [FeatureFlagKey.DYNAMIC_MULTIPLIERS]: false,
  [FeatureFlagKey.SUPER_BOWL_PROPS]: false,
  [FeatureFlagKey.PRD_DEAD_PLACE_RULES]: false,
  [FeatureFlagKey.SHOT_CAM_WORKFLOW]: false,
  [FeatureFlagKey.SMS_FALLBACK_INGEST]: false,
};

export class FeatureRegistry {
  public static isEnabled(key: FeatureFlagKey, store?: Record<string, boolean>): boolean {
    if (!store || !(key in store)) {
      return DEFAULT_FEATURE_FLAGS[key] ?? false;
    }
    return store[key] === true;
  }
}
