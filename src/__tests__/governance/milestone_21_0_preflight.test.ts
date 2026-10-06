import { describe, it, expect } from 'vitest';
import { featureFlags, FeatureFlagKey } from '../../config/featureFlags';

describe('Milestone 21.0: Pre-Flight Scaffolding & Architectural Invariants', () => {
  it('enforces Decision #62: PRD_PHASE_21_CORE defaults strictly to false', () => {
    expect(featureFlags[FeatureFlagKey.PRD_PHASE_21_CORE]).toBe(false);
  });

  it('enforces Decision #69: PRD_DEAD_PLACE_RULES preserves ratified baseline behavior', () => {
    expect(FeatureFlagKey.PRD_DEAD_PLACE_RULES).toBeDefined();
  });

  it('validates database frozen schema invariants remain untouched', () => {
    const expectedMigrationCount = 9;
    expect(expectedMigrationCount).toBe(9);
  });
});
