import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  GamedayIntegrationService,
  MatrixMemberPick,
  LiveGameStatus,
} from '../src/services/gamedayIntegrationService';

describe('Milestone 20.4: E2E Gameday Integration Invariants', () => {
  const poolId = 'pool_league_private_10';
  const members = Array.from({ length: 10 }, (_, i) => ({
    userId: `u${i + 1}`,
    displayName: `Player ${i + 1}`,
  }));

  const game1: LiveGameStatus = {
    gameId: 'g1',
    homeTeam: 'KC',
    awayTeam: 'LV',
    homeScore: 21,
    awayScore: 17,
    quarter: '4Q 02:00',
    isFinal: false,
    kickoff: new Date('2026-10-08T18:00:00.000Z'),
  };

  it('detects 9-1 Lone Wolf consensus accurately and formats Press Box alert', () => {
    // 9 members pick KC, 1 picks LV
    const picks: MatrixMemberPick[] = members.map((m, i) => ({
      userId: m.userId,
      displayName: m.displayName,
      gameId: 'g1',
      selectedTeam: i === 9 ? 'LV' : 'KC', // u10 is lone wolf
    }));

    const consensus = GamedayIntegrationService.calculateConsensus('g1', picks);
    expect(consensus).not.toBeNull();
    expect(consensus?.isLoneWolfActive).toBe(true);
    expect(consensus?.majorityTeam).toBe('KC');
    expect(consensus?.majorityCount).toBe(9);
    expect(consensus?.loneWolfUserId).toBe('u10');
    expect(consensus?.loneWolfTeam).toBe('LV');

    const board = GamedayIntegrationService.calculateGamedayBoard(poolId, members, picks, [game1]);
    expect(board.loneWolfAlerts.length).toBe(1);
    expect(board.pressBoxEvents.length).toBe(1);
    expect(board.pressBoxEvents[0].type).toBe('LONE_WOLF_SWEAT');
    expect(board.pressBoxEvents[0].headline).toContain('Player 10');
  });

  it('evaluates projected standings and assigns Dead Place penalty (Decision #69)', () => {
    // u1-u9 pick winning KC, u10 picks losing LV
    const picks: MatrixMemberPick[] = members.map((m, i) => ({
      userId: m.userId,
      displayName: m.displayName,
      gameId: 'g1',
      selectedTeam: i === 9 ? 'LV' : 'KC',
    }));

    const board = GamedayIntegrationService.calculateGamedayBoard(poolId, members, picks, [game1], true);
    expect(board.projectedStandings.length).toBe(10);

    const first = board.projectedStandings[0];
    expect(first.projectedRank).toBe(1);
    expect(first.projectedPenaltyShots.toFixed(2)).toBe('0.00');

    const last = board.projectedStandings[9];
    expect(last.userId).toBe('u10');
    expect(last.isProjectedDeadPlace).toBe(true);
    expect(last.projectedPenaltyShots.toFixed(2)).toBe('2.50');
    expect(Prisma.Decimal.isDecimal(last.projectedPenaltyShots)).toBe(true);
  });

  it('enforces Decision #54: Evaluation is pure read projection with zero side effects', () => {
    const picks: MatrixMemberPick[] = [];
    const board = GamedayIntegrationService.calculateGamedayBoard(poolId, members, picks, [game1], true);
    expect(board.poolId).toBe(poolId);
    expect(board.totalMembers).toBe(10);
    // All members tied at 0 points -> all evaluate to co-Dead Place under Decision #69
    const deadPlaces = board.projectedStandings.filter((s) => s.isProjectedDeadPlace);
    expect(deadPlaces.length).toBe(10);
    expect(deadPlaces[0].projectedPenaltyShots.toFixed(2)).toBe('2.50');
  });
});
