import { describe, it, expect } from 'vitest';
import { DynamicSpreadService } from '../src/services/dynamicSpread';

describe('Milestone 16.3 - Feature 12: Dynamic Spread Adjustment Engine (Decisions #3, #22, #54, #61, #62, #65)', () => {
  const gameId = 'game-kc-bal';
  const home = 'KC';
  const away = 'BAL';
  const baseSpread = '-3.5';

  it('Calculates baseline spread when picks are balanced 50/50', () => {
    const picks = [
      { selectedTeam: 'KC' },
      { selectedTeam: 'BAL' }
    ];

    const result = DynamicSpreadService.calculateDynamicSpread(gameId, home, away, baseSpread, picks, false);
    expect(result.adjustedSpread).toBe('-3.5');
    expect(result.lineShift).toBe('0.0');
    expect(result.homePicksRatio).toBe('0.5000');
  });

  it('Shifts spread by -1.0 when home pick consensus is >= 70%', () => {
    const picks = [
      { selectedTeam: 'KC' },
      { selectedTeam: 'KC' },
      { selectedTeam: 'KC' },
      { selectedTeam: 'KC' },
      { selectedTeam: 'BAL' } // 4 / 5 = 80%
    ];

    const result = DynamicSpreadService.calculateDynamicSpread(gameId, home, away, baseSpread, picks, false);
    expect(result.lineShift).toBe('-1.0');
    expect(result.adjustedSpread).toBe('-4.5');
    expect(result.homePicksRatio).toBe('0.8000');
  });

  it('Shifts spread by +0.5 when away pick consensus is >= 60% and < 70%', () => {
    const picks = [
      { selectedTeam: 'BAL' },
      { selectedTeam: 'BAL' },
      { selectedTeam: 'BAL' },
      { selectedTeam: 'KC' },
      { selectedTeam: 'KC' } // 3 / 5 = 60%
    ];

    const result = DynamicSpreadService.calculateDynamicSpread(gameId, home, away, baseSpread, picks, false);
    expect(result.lineShift).toBe('0.5');
    expect(result.adjustedSpread).toBe('-3.0'); // -3.5 + 0.5 = -3.0
    expect(result.awayPicksRatio).toBe('0.6000');
  });

  it('Freezes spread and line shift when game is locked (Decision #65)', () => {
    const heavyPicks = [
      { selectedTeam: 'KC' },
      { selectedTeam: 'KC' },
      { selectedTeam: 'KC' }
    ];

    const result = DynamicSpreadService.calculateDynamicSpread(gameId, home, away, baseSpread, heavyPicks, true);
    expect(result.isLocked).toBe(true);
    expect(result.lineShift).toBe('0.0');
    expect(result.adjustedSpread).toBe('-3.5'); // Unchanged from base
  });
});
