import { describe, it, expect } from 'vitest';
import { MatrixCommandBarService, CommandBarActionRequest } from '../src/services/matrixCommandBar';

describe('Milestone 14.4 - Matrix Command Bar (Finding 5.6, Decisions #20, #62, #66)', () => {
  const slateGames = [
    { id: 'g1', homeTeam: 'KC', awayTeam: 'LV', isLocked: false },
    { id: 'g2', homeTeam: 'DAL', awayTeam: 'NYG', isLocked: false },
    { id: 'g3', homeTeam: 'SF', awayTeam: 'LAR', isLocked: true } // Locked Thursday game
  ];

  it('FAVORITES action picks home team and skips locked games', () => {
    const res = MatrixCommandBarService.executeSweep({
      action: 'FAVORITES',
      poolId: 'p1',
      membershipId: 'm1',
      slateGames,
      currentPicks: {}
    });

    expect(res.updatedPicks['g1']).toBe('KC');
    expect(res.updatedPicks['g2']).toBe('DAL');
    expect(res.updatedPicks['g3']).toBeUndefined();
    expect(res.rejectedGames).toContain('g3');
  });

  it('FLIP_ALL flips current selections and preserves locked game picks', () => {
    const res = MatrixCommandBarService.executeSweep({
      action: 'FLIP_ALL',
      poolId: 'p1',
      membershipId: 'm1',
      slateGames,
      currentPicks: { g1: 'KC', g2: 'NYG', g3: 'SF' }
    });

    expect(res.updatedPicks['g1']).toBe('LV'); // Flipped
    expect(res.updatedPicks['g2']).toBe('DAL'); // Flipped
    expect(res.updatedPicks['g3']).toBe('SF');  // Preserved locked pick
    expect(res.rejectedGames).toContain('g3');
  });

  it('CLEAR_UNLOCKED removes unlocked picks only', () => {
    const res = MatrixCommandBarService.executeSweep({
      action: 'CLEAR_UNLOCKED',
      poolId: 'p1',
      membershipId: 'm1',
      slateGames,
      currentPicks: { g1: 'KC', g2: 'NYG', g3: 'SF' }
    });

    expect(res.updatedPicks['g1']).toBeUndefined();
    expect(res.updatedPicks['g2']).toBeUndefined();
    expect(res.updatedPicks['g3']).toBe('SF');
    expect(res.rejectedGames).toContain('g3');
  });

  it('Finding 5.6: MIRROR_CONSENSUS suppresses action when cohort size < 3', () => {
    const res = MatrixCommandBarService.executeSweep({
      action: 'MIRROR_CONSENSUS',
      poolId: 'p1',
      membershipId: 'm1',
      slateGames,
      currentPicks: {},
      consensusData: [
        { gameId: 'g1', consensusTeam: 'KC', sampleSize: 2 }, // Below floor
        { gameId: 'g2', consensusTeam: 'DAL', sampleSize: 5 }  // Meets floor
      ]
    });

    expect(res.updatedPicks['g1']).toBeUndefined(); // Suppressed (peeking guard)
    expect(res.updatedPicks['g2']).toBe('DAL');     // Permitted
  });
});
