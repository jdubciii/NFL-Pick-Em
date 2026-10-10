import { describe, it, expect } from 'vitest';
import {
  calculateRivalryLeverage,
  checkProximityWarning,
  calculateMomentumTrend,
  finalizeSlateStandings
} from '../src/services/slateFinaleSettlementService';
import { LiveGameTelemetry, UserPick, ParticipantScoreInput } from '../src/services/radarLiveConsequencesService';

describe('M28.2 Momentum, Rivalry Leverage & Slate Finalization', () => {
  const participants: ParticipantScoreInput[] = [
    { userId: 'u1', userName: 'Jack', seasonBankedPoints: 10, tiebreakerMnfDiff: 2 },
    { userId: 'u2', userName: 'Dave', seasonBankedPoints: 9, tiebreakerMnfDiff: 5 },
    { userId: 'u3', userName: 'Sarah', seasonBankedPoints: 8 },
    { userId: 'u4', userName: 'Mike', seasonBankedPoints: 7 },
    { userId: 'u5', userName: 'Tom', seasonBankedPoints: 6 },
    { userId: 'u6', userName: 'Chris', seasonBankedPoints: 5 },
    { userId: 'u7', userName: 'Alex', seasonBankedPoints: 4 },
    { userId: 'u8', userName: 'Emma', seasonBankedPoints: 3 },
    { userId: 'u9', userName: 'Ryan', seasonBankedPoints: 2 },
    { userId: 'u10', userName: 'Ben', seasonBankedPoints: 1, tiebreakerMnfDiff: 10 }
  ];

  const games: LiveGameTelemetry[] = [
    {
      gameId: 'g1',
      homeTeam: 'DET',
      awayTeam: 'GB',
      homeScore: 24,
      awayScore: 21,
      spread: -2.5,
      status: 'IN_PROGRESS'
    },
    {
      gameId: 'g2',
      homeTeam: 'KC',
      awayTeam: 'BUF',
      homeScore: 27,
      awayScore: 24,
      spread: -1.5,
      status: 'FINAL'
    }
  ];

  const picks: UserPick[] = [
    { userId: 'u1', userName: 'Jack', gameId: 'g1', selectedTeam: 'DET' },
    { userId: 'u2', userName: 'Dave', gameId: 'g1', selectedTeam: 'GB' },
    { userId: 'u9', userName: 'Ryan', gameId: 'g1', selectedTeam: 'DET' },
    { userId: 'u10', userName: 'Ben', gameId: 'g1', selectedTeam: 'GB' }
  ];

  it('correctly calculates Rivalry Leverage and delta picks between users', () => {
    const leverage = calculateRivalryLeverage('u1', 'u2', participants, picks, games);

    expect(leverage.targetUserId).toBe('u1');
    expect(leverage.rivalUserId).toBe('u2');
    expect(leverage.deltaPicks).toHaveLength(1);
    expect(leverage.deltaPicks[0].gameId).toBe('g1');
    expect(leverage.deltaPicks[0].userSelection).toBe('DET');
    expect(leverage.deltaPicks[0].rivalSelection).toBe('GB');
    expect(leverage.summaryMicrocopy).toContain('DET (-2.5)');
  });

  it('triggers Proximity Warning when 9th vs 10th differential is less than 3.0 points', () => {
    // Both u9 and u10 have 0 points, gap is 0.0 < 3.0
    const standings = [
      { userId: 'u1', totalProjectedPoints: 10 },
      { userId: 'u2', totalProjectedPoints: 9 },
      { userId: 'u3', totalProjectedPoints: 8 },
      { userId: 'u4', totalProjectedPoints: 7 },
      { userId: 'u5', totalProjectedPoints: 6 },
      { userId: 'u6', totalProjectedPoints: 5 },
      { userId: 'u7', totalProjectedPoints: 4 },
      { userId: 'u8', totalProjectedPoints: 3 },
      { userId: 'u9', totalProjectedPoints: 2.0 },
      { userId: 'u10', totalProjectedPoints: 0.0 }
    ] as any;

    const isTeetering = checkProximityWarning(standings);
    expect(isTeetering).toBe(true);

    const safeStandings = [
      ...standings.slice(0, 8),
      { userId: 'u9', totalProjectedPoints: 4.5 },
      { userId: 'u10', totalProjectedPoints: 1.0 }
    ] as any;
    expect(checkProximityWarning(safeStandings)).toBe(false);
  });

  it('accurately computes momentum trend classification from rolling history snapshots', () => {
    const upTrend = calculateMomentumTrend([1.0, 1.5, 2.0]);
    expect(upTrend.trend).toBe('UP');
    expect(upTrend.delta).toBe(1.0);

    const downTrend = calculateMomentumTrend([2.5, 2.0, 1.0]);
    expect(downTrend.trend).toBe('DOWN');
    expect(downTrend.delta).toBe(-1.5);

    const flatTrend = calculateMomentumTrend([1.0, 1.0, 1.0]);
    expect(flatTrend.trend).toBe('FLAT');
    expect(flatTrend.delta).toBe(0);
  });

  it('enforces Decision #55 & Decision #69 during Slate Settlement when all games are FINAL', () => {
    const finalGames: LiveGameTelemetry[] = games.map((g) => ({ ...g, status: 'FINAL' }));

    const settlement = finalizeSlateStandings('pool_alpha', 5, participants, picks, finalGames);

    expect(settlement.isFinalized).toBe(true);
    expect(settlement.settledStandings).toHaveLength(10);

    const firstPlace = settlement.settledStandings[0];
    expect(firstPlace.finalRank).toBe(1);
    expect(firstPlace.penaltyShots).toBe('0.00');

    const deadPlace = settlement.settledStandings[9];
    expect(deadPlace.finalRank).toBe(10);
    expect(deadPlace.isDeadPlace).toBe(true);
    expect(deadPlace.penaltyShots).toBe('2.50');
    expect(settlement.monarchUserId).toBe(deadPlace.userId);
  });

  it('rejects premature slate finalization if any game is IN_PROGRESS', () => {
    expect(() => finalizeSlateStandings('pool_alpha', 5, participants, picks, games)).toThrow(
      'PREMATURE_SETTLEMENT'
    );
  });
});
