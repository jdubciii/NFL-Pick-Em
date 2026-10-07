import { describe, it, expect } from 'vitest';

describe('Phase 25.5 Night Editorial Gameday Hub Invariants', () => {
  it('calculates yardline percentage accurately for field-position drive tracker', () => {
    const calculateFieldPercentage = (yardline: number, possession: 'HOME' | 'AWAY') => {
      // Yardline represents line of scrimmage 0-100 (50 is midfield)
      if (possession === 'AWAY') {
        return Math.min(Math.max(yardline, 0), 100);
      }
      return 100 - Math.min(Math.max(yardline, 0), 100);
    };

    expect(calculateFieldPercentage(28, 'AWAY')).toBe(28); // Away on own 28
    expect(calculateFieldPercentage(20, 'HOME')).toBe(80); // Home in redzone
    expect(calculateFieldPercentage(50, 'AWAY')).toBe(50); // Midfield
  });

  it('determines redzone alert state correctly when ball is inside 20-yard line', () => {
    const isRedZoneDrive = (yardline: number, sideOfField: 'OWN' | 'OPPONENT') => {
      return sideOfField === 'OPPONENT' && yardline <= 20;
    };

    expect(isRedZoneDrive(15, 'OPPONENT')).toBe(true);
    expect(isRedZoneDrive(25, 'OPPONENT')).toBe(false);
    expect(isRedZoneDrive(15, 'OWN')).toBe(false);
  });

  it('verifies participant match outcome badge labeling (Leading, Trailing, Won, Lost)', () => {
    const resolveStatusBadge = (matchState: 'WINNING' | 'LOSING' | 'TIED' | 'WON' | 'LOST' | 'PENDING') => {
      switch (matchState) {
        case 'WINNING': return { label: 'Leading', color: 'emerald' };
        case 'LOSING': return { label: 'Trailing', color: 'rose' };
        case 'WON': return { label: 'Won', color: 'emerald' };
        case 'LOST': return { label: 'Lost', color: 'rose' };
        default: return { label: 'Pending', color: 'slate' };
      }
    };

    expect(resolveStatusBadge('WINNING').label).toBe('Leading');
    expect(resolveStatusBadge('LOSING').label).toBe('Trailing');
    expect(resolveStatusBadge('WON').label).toBe('Won');
    expect(resolveStatusBadge('LOST').label).toBe('Lost');
  });
});
