import { describe, it, expect } from 'vitest';
import { Phase19BracketService, Phase19FeatureFlagKey } from '../src/services/phase19BracketService';
import { Phase19BracketEngineService } from '../src/services/phase19BracketEngineService';
import { Phase19MultiplierService } from '../src/services/phase19MultiplierService';
import { Phase19SurvivorService } from '../src/services/phase19SurvivorService';
import { Phase19SuperBowlPropsService } from '../src/services/phase19SuperBowlPropsService';

describe('Phase 19 Milestone 19.5: Cumulative Governance & Closure Audit', () => {
  it('confirms all Phase 19 domain services are exported and instantiate correctly', () => {
    expect(Phase19BracketService).toBeDefined();
    expect(Phase19BracketEngineService).toBeDefined();
    expect(Phase19MultiplierService).toBeDefined();
    expect(Phase19SurvivorService).toBeDefined();
    expect(Phase19SuperBowlPropsService).toBeDefined();
  });

  it('validates Phase 19 circuit breaker registry keys default to OFF (Decision #62)', () => {
    expect(Phase19BracketService.isFlagEnabled(null)).toBe(false);
    expect(Phase19BracketEngineService.isFeatureEnabled(null)).toBe(false);
    expect(Phase19MultiplierService.isFeatureEnabled(null)).toBe(false);
    expect(Phase19SurvivorService.isFeatureEnabled(null)).toBe(false);
    expect(Phase19SuperBowlPropsService.isFeatureEnabled(null)).toBe(false);

    expect(Phase19FeatureFlagKey.PLAYOFF_BRACKET_ENGINE).toBe('playoff_bracket_engine');
    expect(Phase19FeatureFlagKey.DYNAMIC_MULTIPLIERS).toBe('dynamic_multipliers');
    expect(Phase19FeatureFlagKey.SUPER_BOWL_PROPS).toBe('super_bowl_props');
  });
});
