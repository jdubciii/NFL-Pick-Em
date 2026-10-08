import { describe, it, expect } from 'vitest';
import {
  computeAbsolutePosition,
  evaluateRedZoneThreat
} from '../src/services/PlayByPlayReconciliationService';

describe('Option A Fixed Anchor Spatial Coordinates & Red Zone Semantics', () => {
  const away = 'KC';
  const home = 'BUF';

  it('Example 1: KC (Away) driving, ball at BUF 7 -> absolutePosition is 93% (Right End Zone)', () => {
    const pos = computeAbsolutePosition(7, 'BUF', away, home);
    expect(pos).toBe(93);

    const isRedZone = evaluateRedZoneThreat(pos, 'AWAY');
    expect(isRedZone).toBe(true);
  });

  it('Example 2: BUF (Home) driving, ball at KC 5 -> absolutePosition is 5% (Left End Zone)', () => {
    const pos = computeAbsolutePosition(5, 'KC', away, home);
    expect(pos).toBe(5);

    const isRedZone = evaluateRedZoneThreat(pos, 'HOME');
    expect(isRedZone).toBe(true);
  });

  it('handles 50-yard line midline marker symmetrically', () => {
    const pos = computeAbsolutePosition(50, 'KC', away, home);
    expect(pos).toBe(50);
    expect(evaluateRedZoneThreat(pos, 'AWAY')).toBe(false);
    expect(evaluateRedZoneThreat(pos, 'HOME')).toBe(false);
  });

  it('correctly suppresses Red Zone when team is backed up at own 7-yard line', () => {
    // KC at own 7-yard line (backed up) -> 7%
    const posKCBackedUp = computeAbsolutePosition(7, 'KC', away, home);
    expect(posKCBackedUp).toBe(7);
    expect(evaluateRedZoneThreat(posKCBackedUp, 'AWAY')).toBe(false);

    // BUF at own 7-yard line (backed up) -> 93%
    const posBUFBackedUp = computeAbsolutePosition(7, 'BUF', away, home);
    expect(posBUFBackedUp).toBe(93);
    expect(evaluateRedZoneThreat(posBUFBackedUp, 'HOME')).toBe(false);
  });
});
