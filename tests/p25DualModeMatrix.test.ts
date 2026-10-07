import { describe, it, expect } from 'vitest';

describe('Phase 25.1 Dual-Mode Matrix & Cohort Invariants', () => {
  it('supports open transparency mode where picks are visible before kickoff', () => {
    const evaluateCohortDisplay = (isOpenSlate: boolean, cohortCount: number) => {
      if (isOpenSlate) {
        return { isMasked: false, label: 'Revealed' };
      }
      return { isMasked: true, label: `🔒 ${cohortCount} Picks Hidden` };
    };

    const result = evaluateCohortDisplay(true, 10);
    expect(result.isMasked).toBe(false);
    expect(result.label).toBe('Revealed');
  });

  it('evaluates member matchState accurately based on live scores', () => {
    const deriveMatchState = (
      userTeam: 'HOME' | 'AWAY',
      homeScore: number,
      awayScore: number,
      status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINAL'
    ) => {
      if (status === 'SCHEDULED') return 'PENDING';
      const isLeading = userTeam === 'HOME' ? homeScore > awayScore : awayScore > homeScore;
      const isTied = homeScore === awayScore;

      if (status === 'FINAL') {
        return isLeading ? 'WON' : 'LOST';
      }
      if (isTied) return 'TIED';
      return isLeading ? 'WINNING' : 'LOSING';
    };

    expect(deriveMatchState('AWAY', 14, 21, 'IN_PROGRESS')).toBe('WINNING');
    expect(deriveMatchState('HOME', 14, 21, 'IN_PROGRESS')).toBe('LOSING');
    expect(deriveMatchState('HOME', 21, 21, 'IN_PROGRESS')).toBe('TIED');
    expect(deriveMatchState('AWAY', 14, 21, 'FINAL')).toBe('WON');
    expect(deriveMatchState('HOME', 14, 21, 'FINAL')).toBe('LOST');
    expect(deriveMatchState('HOME', 0, 0, 'SCHEDULED')).toBe('PENDING');
  });

  it('determines responsive view mode defaulting to cards on mobile and preserving user preference', () => {
    const resolveViewMode = (isMobile: boolean, savedPref: string | null) => {
      if (savedPref === 'grid' || savedPref === 'cards') return savedPref;
      return isMobile ? 'cards' : 'grid';
    };

    expect(resolveViewMode(true, null)).toBe('cards');
    expect(resolveViewMode(false, null)).toBe('grid');
    expect(resolveViewMode(true, 'grid')).toBe('grid');
    expect(resolveViewMode(false, 'cards')).toBe('cards');
  });
});
