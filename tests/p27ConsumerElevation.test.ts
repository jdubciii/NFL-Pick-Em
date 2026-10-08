import { describe, it, expect } from 'vitest';
import { calculateWeeklyStandings } from '../client/src/services/WeeklyStandingsEngine';

describe('Phase 27 Consumer UX Invariant & Standings Telemetry', () => {
  it('correctly calculates Dead Place deficit for DangerSeatTicker', () => {
    const mock = [
      { memberId: 'm1', name: 'Jake S.', correct: 11, incorrect: 2, pending: 2, totalGames: 15 },
      { memberId: 'm9', name: 'Rich B.', correct: 5, incorrect: 8, pending: 2, totalGames: 15 },
      { memberId: 'm10', name: 'Big Jack', correct: 3, incorrect: 10, pending: 2, totalGames: 15 },
    ];

    const standings = calculateWeeklyStandings(mock, false);
    const deadPlace = standings.find(s => s.tier === 'DEAD_PLACE');
    const ninthPlace = standings[standings.length - 2];

    expect(deadPlace?.name).toBe('Big Jack');
    expect(ninthPlace.correct - (deadPlace?.correct ?? 0)).toBe(2);
  });
});
