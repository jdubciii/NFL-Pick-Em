export enum FeatureFlagKey {
  MATRIX_COMMAND_BAR = 'f_matrix_command_bar',
  BOUNTY_BOARD = 'f_bounty_board',
  FACTION_DRAFT = 'f_faction_draft',
  RIVAL_HEX = 'f_rival_hex',
  COMEBACK_VAULT = 'f_comeback_vault',
  SWEAT_RADAR = 'f_sweat_radar',
  SCENARIO_ENGINE = 'f_scenario_engine',
  LEVERAGE_ALERTS = 'f_leverage_alerts',
  COMMISSIONER_SANDBOX = 'f_commissioner_sandbox',
  DEAD_PLACE_ESCALATION = 'f_dead_place_escalation',
  LEAGUE_PRESS_BOX = 'f_league_press_box',
  SYNDICATE_PORTFOLIOS = 'f_syndicate_portfolios',
  BAD_BEAT_INSURANCE = 'f_bad_beat_insurance',
  DYNAMIC_SPREADS = 'f_dynamic_spreads',
  LIVE_PROPS = 'f_live_props'
}

export interface FeatureFlagState {
  poolId: string;
  featureKey: FeatureFlagKey;
  isEnabled: boolean;
  configJson?: Record<string, unknown>;
}

// In-memory/mockable registry service enforcing Decision #62
export class FeatureRegistryService {
  private static flags: Map<string, boolean> = new Map();

  static getKey(poolId: string, feature: FeatureFlagKey): string {
    return `${poolId}:${feature}`;
  }

  static setFlag(poolId: string, feature: FeatureFlagKey, enabled: boolean): void {
    this.flags.set(this.getKey(poolId, feature), enabled);
  }

  static clear(): void {
    this.flags.clear();
  }

  // Decision #62: Default OFF. Missing row or store failure evaluates to false.
  static isFeatureEnabled(poolId: string, feature: FeatureFlagKey): boolean {
    const key = this.getKey(poolId, feature);
    if (!this.flags.has(key)) {
      return false; // Default OFF
    }
    return this.flags.get(key) === true;
  }
}
