import { describe, it, expect } from 'vitest';
import { calculateWeeklyStandings } from '../client/src/services/WeeklyStandingsEngine';

describe('WeeklyStandingsEngine Penalty Ladder, W-L & Pending Picks Calculations', () => {
  it('correctly ranks 10 members, calculates outstanding picks, and assigns tier penalties', () => {
    const mock = [
      { memberId: 'm1', name: 'Big Jack', correct: 3, incorrect: 8, pending: 4, totalGames: 15 },
      { memberId: 'm2', name: 'Jake S.', correct: 11, incorrect: 1, pending: 3, totalGames: 15 },
      { memberId: 'm3', name: 'Matt B.', correct: 10, incorrect: 3, pending: 2, totalGames: 15 },
      { memberId: 'm4', name: 'Maria D.', correct: 10, incorrect: 4, pending: 1, totalGames: 15 },
      { memberId: 'm5', name: 'Alex L.', correct: 9, incorrect: 4, pending: 2, totalGames: 15 },
      { memberId: 'm6', name: 'Justin B.', correct: 8, incorrect: 5, pending: 2, totalGames: 15 },
      { memberId: 'm7', name: 'Nick S.', correct: 7, incorrect: 6, pending: 2, totalGames: 15 },
      { memberId: 'm8', name: 'Adam B.', correct: 6, incorrect: 7, pending: 2, totalGames: 15 },
      { memberId: 'm9', name: 'Rich B.', correct: 5, incorrect: 8, pending: 2, totalGames: 15 },
      { memberId: 'm10', name: 'Mike C.', correct: 4, incorrect: 9, pending: 2, totalGames: 15 },
    ];

    const standings = calculateWeeklyStandings(mock, false);

    expect(standings[0].rank).toBe(1);
    expect(standings[0].name).toBe('Jake S.');
    expect(standings[0].tier).toBe('SAFE');
    expect(standings[0].penaltyShots).toBe(0);
    expect(standings[0].pending).toBe(3);

    expect(standings[1].tier).toBe('STANDARD');
    expect(standings[5].tier).toBe('STANDARD');
    expect(standings[1].penaltyShots).toBe(1.0);

    expect(standings[6].tier).toBe('DANGER');
    expect(standings[8].tier).toBe('DANGER');
    expect(standings[6].penaltyShots).toBe(2.0);

    expect(standings[9].rank).toBe(10);
    expect(standings[9].name).toBe('Big Jack');
    expect(standings[9].tier).toBe('DEAD_PLACE');
    expect(standings[9].penaltyShots).toBe(2.5);
    expect(standings[9].pending).toBe(4);
    expect(standings[9].totalGames).toBe(15);
  });
});
