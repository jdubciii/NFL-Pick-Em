import { describe, it, expect } from 'vitest';
import {
  evaluatePickATS,
  evaluateLiveStandings,
  LiveGameTelemetry,
  UserPick,
  ParticipantScoreInput,
  WhatIfScenario
} from '../src/services/radarLiveConsequencesService';

describe('M28.1.1 Radar Live Consequences Engine & Decision #69 isDeadPlace', () => {
  const mockGames: LiveGameTelemetry[] = [
    {
      gameId: 'g1',
      homeTeam: 'DET',
      awayTeam: 'GB',
      homeScore: 24,
      awayScore: 21,
      spread: -2.5,
      status: 'IN_PROGRESS',
      possession: 'GB',
      yardLine: 15,
      isRedZone: true
    },
    {
      gameId: 'g2',
      homeTeam: 'KC',
      awayTeam: 'BUF',
      homeScore: 20,
      awayScore: 20,
      spread: -3.0,
      status: 'FINAL'
    }
  ];

  it('correctly grades ATS picks against Tuesday frozen lines', () => {
    const pickDet: UserPick = { userId: 'u1', userName: 'Jack', gameId: 'g1', selectedTeam: 'DET' };
    const pickGb: UserPick = { userId: 'u2', userName: 'Dave', gameId: 'g1', selectedTeam: 'GB' };

    const resDet = evaluatePickATS(pickDet, mockGames[0]);
    const resGb = evaluatePickATS(pickGb, mockGames[0]);

    expect(resDet.covered).toBe(true);
    expect(resDet.points).toBe(1.0);
    expect(resGb.covered).toBe(false);
    expect(resGb.points).toBe(0.0);
  });

  it('enforces Decision #69: 10th Place emits explicit isDeadPlace: true and 2.50 absolute penalty', () => {
    const participants: ParticipantScoreInput[] = Array.from({ length: 10 }, (_, i) => ({
      userId: `user_${i + 1}`,
      userName: `Player ${i + 1}`,
      seasonBankedPoints: 10 - i,
      tiebreakerMnfDiff: i
    }));

    const picks: UserPick[] = [
      { userId: 'user_1', userName: 'Player 1', gameId: 'g1', selectedTeam: 'DET' },
      { userId: 'user_10', userName: 'Player 10', gameId: 'g1', selectedTeam: 'GB' }
    ];

    const standings = evaluateLiveStandings(participants, picks, mockGames);

    expect(standings).toHaveLength(10);
    expect(standings[0].rank).toBe(1);
    expect(standings[0].tier).toBe('SAFE');
    expect(standings[0].isDeadPlace).toBe(false);
    expect(standings[0].penaltyShots).toBe('0.00');

    // 9th Place must NOT be dead place
    const dangerSeat9 = standings[8];
    expect(dangerSeat9.rank).toBe(9);
    expect(dangerSeat9.tier).toBe('DANGER_ZONE');
    expect(dangerSeat9.isDeadPlace).toBe(false);
    expect(dangerSeat9.penaltyShots).toBe('2.00');

    // 10th Place is Dead Place Monarch candidate
    const deadPlace10 = standings[9];
    expect(deadPlace10.rank).toBe(10);
    expect(deadPlace10.tier).toBe('DEAD_PLACE');
    expect(deadPlace10.isDeadPlace).toBe(true);
    expect(deadPlace10.penaltyShots).toBe('2.50');
    expect(deadPlace10.dangerSeatStatus).toBe('DEAD_PLACE_10TH');
  });

  it('detects Red Zone threat when opponent has possession inside the 20', () => {
    const participants: ParticipantScoreInput[] = [
      { userId: 'u1', userName: 'Jack', seasonBankedPoints: 10 },
      { userId: 'u2', userName: 'Dave', seasonBankedPoints: 8 }
    ];

    const picks: UserPick[] = [
      { userId: 'u1', userName: 'Jack', gameId: 'g1', selectedTeam: 'DET' }
    ];

    const standings = evaluateLiveStandings(participants, picks, mockGames);
    const jack = standings.find(s => s.userId === 'u1');

    expect(jack).toBeDefined();
    expect(jack?.threatenedByRedZone).toBe(true);
  });

  it('INV-6: executes in-memory What-If score adjustments without mutating base game state', () => {
    const participants: ParticipantScoreInput[] = [
      { userId: 'u1', userName: 'Jack', seasonBankedPoints: 10 },
      { userId: 'u2', userName: 'Dave', seasonBankedPoints: 8 }
    ];

    const picks: UserPick[] = [
      { userId: 'u1', userName: 'Jack', gameId: 'g1', selectedTeam: 'DET' },
      { userId: 'u2', userName: 'Dave', gameId: 'g1', selectedTeam: 'GB' }
    ];

    const whatIfs: WhatIfScenario[] = [
      { gameId: 'g1', scoreDeltaHome: 0, scoreDeltaAway: 3 }
    ];

    const simulatedStandings = evaluateLiveStandings(participants, picks, mockGames, whatIfs);
    const simulatedDave = simulatedStandings.find(s => s.userId === 'u2');

    expect(simulatedDave?.projectedLivePoints).toBe(1.0);
    expect(mockGames[0].awayScore).toBe(21);
    expect(mockGames[0].homeScore).toBe(24);
  });
});
