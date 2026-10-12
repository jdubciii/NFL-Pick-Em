import { describe, it, expect } from 'vitest';
import {
  calculateRivalryShowdown,
  RivalryShowdownResult
} from '../client/src/services/rivalryShowdownService';
import { SlateGame, UserPickItem, UserStandingRef } from '../client/src/services/sweatProjectionService';
import { LiveGame } from '../client/src/services/liveScoreService';

describe('Phase 38 Sprint 2: Rivalry Showdown Engine (Ruling P37-P38-2026-10-12-01)', () => {
  const user: UserStandingRef = { id: 'u_jack', name: 'Jack (You)' };
  const rival: UserStandingRef = { id: 'u_dave', name: 'Dave M.' };

  const games: SlateGame[] = [
    { id: 'g1', homeTeam: 'BAL', awayTeam: 'KC', spread: -3.5 },
    { id: 'g2', homeTeam: 'PHI', awayTeam: 'DAL', spread: -6.0 },
    { id: 'g3', homeTeam: 'SF', awayTeam: 'LAR', spread: -4.5 },
    { id: 'g4', homeTeam: 'DET', awayTeam: 'GB', spread: -2.5 }
  ];

  // --------------------------------------------------------------------------
  // 1. Opposite vs Shared Picks Point Gap Calculations
  // --------------------------------------------------------------------------
  it('correctly categorizes opposite picks as battlegrounds and shared picks as neutral leverage', () => {
    const liveScores: LiveGame[] = [
      {
        id: 'g1',
        name: 'KC @ BAL',
        shortName: 'KC @ BAL',
        status: 'FINAL',
        clock: '00:00',
        period: 4,
        isRedZone: false,
        downDistanceText: '',
        homeTeam: { code: 'BAL', name: 'Baltimore Ravens', score: '27' },
        awayTeam: { code: 'KC', name: 'Kansas City Chiefs', score: '20' }
      },
      {
        id: 'g2',
        name: 'DAL @ PHI',
        shortName: 'DAL @ PHI',
        status: 'IN_PROGRESS',
        clock: '08:15',
        period: 3,
        isRedZone: false,
        downDistanceText: '',
        homeTeam: { code: 'PHI', name: 'Philadelphia Eagles', score: '21' },
        awayTeam: { code: 'DAL', name: 'Dallas Cowboys', score: '14' }
      },
      {
        id: 'g3',
        name: 'LAR @ SF',
        shortName: 'LAR @ SF',
        status: 'SCHEDULED',
        clock: '15:00',
        period: 1,
        isRedZone: false,
        downDistanceText: '',
        homeTeam: { code: 'SF', name: 'San Francisco 49ers', score: '0' },
        awayTeam: { code: 'LAR', name: 'Los Angeles Rams', score: '0' }
      }
    ];

    const userPicks: UserPickItem[] = [
      { userId: 'u_jack', gameId: 'g1', selectedTeam: 'BAL', isSubmitted: true }, // Win (banked 1)
      { userId: 'u_jack', gameId: 'g2', selectedTeam: 'PHI', isSubmitted: true }, // Leading (live 1)
      { userId: 'u_jack', gameId: 'g3', selectedTeam: 'SF', isSubmitted: true }   // Opposite pick vs Dave (LAR)
    ];

    const rivalPicks: UserPickItem[] = [
      { userId: 'u_dave', gameId: 'g1', selectedTeam: 'KC', isSubmitted: true },  // Loss (banked 0)
      { userId: 'u_dave', gameId: 'g2', selectedTeam: 'PHI', isSubmitted: true }, // Leading (shared pick!)
      { userId: 'u_dave', gameId: 'g3', selectedTeam: 'LAR', isSubmitted: true }  // Opposite pick (LAR)
    ];

    const result = calculateRivalryShowdown(user, rival, games, liveScores, userPicks, rivalPicks);

    // Jack: Banked 1 (BAL), Live 1 (PHI) -> Total 2
    expect(result.userPoints.banked).toBe(1);
    expect(result.userPoints.live).toBe(1);
    expect(result.userPoints.total).toBe(2);

    // Dave: Banked 0 (KC), Live 1 (PHI) -> Total 1
    expect(result.rivalPoints.banked).toBe(0);
    expect(result.rivalPoints.live).toBe(1);
    expect(result.rivalPoints.total).toBe(1);

    // Point gap: 2 - 1 = +1 Ahead
    expect(result.pointGap).toBe(1);
    expect(result.statusText).toBe('Ahead by 1');

    // Shared picks: g2 (both picked PHI)
    expect(result.sharedPicks).toHaveLength(1);
    expect(result.sharedPicks[0].gameId).toBe('g2');
    expect(result.sharedPicks[0].selectedTeam).toBe('PHI');

    // Battleground: g3 (Jack SF vs Dave LAR, scheduled)
    expect(result.battlegrounds).toHaveLength(1);
    expect(result.battlegrounds[0].gameId).toBe('g3');
    expect(result.battlegrounds[0].userPick).toBe('SF');
    expect(result.battlegrounds[0].rivalPick).toBe('LAR');
  });

  // --------------------------------------------------------------------------
  // 2. Branch Outcome Calculation Accuracy (Two-Point Net Swing)
  // --------------------------------------------------------------------------
  it('calculates exact branch arithmetic demonstrating two-point net swing on opposite picks', () => {
    const liveScores: LiveGame[] = [
      {
        id: 'g2',
        name: 'DAL @ PHI',
        shortName: 'DAL @ PHI',
        status: 'IN_PROGRESS',
        clock: '02:00',
        period: 4,
        isRedZone: true,
        downDistanceText: '1st & Goal',
        homeTeam: { code: 'PHI', name: 'Philadelphia Eagles', score: '24' },
        awayTeam: { code: 'DAL', name: 'Dallas Cowboys', score: '21' }
      }
    ];

    // Jack picked PHI (currently leading -> live point)
    // Dave picked DAL (currently trailing -> 0 live point)
    // Both entered tied at 0 banked points
    const userPicks: UserPickItem[] = [
      { userId: 'u_jack', gameId: 'g2', selectedTeam: 'PHI', isSubmitted: true }
    ];
    const rivalPicks: UserPickItem[] = [
      { userId: 'u_dave', gameId: 'g2', selectedTeam: 'DAL', isSubmitted: true }
    ];

    const result = calculateRivalryShowdown(user, rival, games, liveScores, userPicks, rivalPicks);

    // Current pointGap is +1 because Jack's PHI is currently leading
    expect(result.pointGap).toBe(1);

    // Branch outcomes:
    // If PHI wins: Jack gets 1, Dave gets 0 -> Gap is +1 (lead by 1)
    // If DAL wins: Jack gets 0, Dave gets 1 -> Gap is -1 (trail by 1)
    // Net swing between PHI winning and DAL winning is 2 points!
    const bg = result.battlegrounds[0];
    expect(bg).toBeDefined();
    expect(bg.netSwing).toBe(2);
    expect(bg.branchOutcomes.teamA).toBe('PHI');
    expect(bg.branchOutcomes.ifTeamAWinsGap).toBe(1);
    expect(bg.branchOutcomes.teamB).toBe('DAL');
    expect(bg.branchOutcomes.ifTeamBWinsGap).toBe(-1);
    expect(bg.branchOutcomes.description).toContain('lead by 1');
    expect(bg.branchOutcomes.description).toContain('trail by 1');
  });

  // --------------------------------------------------------------------------
  // 3. Deterministic Duel Decider Selection
  // --------------------------------------------------------------------------
  it('deterministically selects the Duel Decider prioritizing live in-progress battlegrounds', () => {
    const liveScores: LiveGame[] = [
      {
        id: 'g2',
        name: 'DAL @ PHI',
        shortName: 'DAL @ PHI',
        status: 'IN_PROGRESS',
        clock: '09:00',
        period: 2,
        isRedZone: false,
        downDistanceText: '',
        homeTeam: { code: 'PHI', name: 'Eagles', score: '10' },
        awayTeam: { code: 'DAL', name: 'Cowboys', score: '7' }
      },
      {
        id: 'g3',
        name: 'LAR @ SF',
        shortName: 'LAR @ SF',
        status: 'SCHEDULED',
        clock: '15:00',
        period: 1,
        isRedZone: false,
        downDistanceText: '',
        homeTeam: { code: 'SF', name: '49ers', score: '0' },
        awayTeam: { code: 'LAR', name: 'Rams', score: '0' }
      }
    ];

    const userPicks: UserPickItem[] = [
      { userId: 'u_jack', gameId: 'g2', selectedTeam: 'PHI', isSubmitted: true },
      { userId: 'u_jack', gameId: 'g3', selectedTeam: 'SF', isSubmitted: true }
    ];
    const rivalPicks: UserPickItem[] = [
      { userId: 'u_dave', gameId: 'g2', selectedTeam: 'DAL', isSubmitted: true },
      { userId: 'u_dave', gameId: 'g3', selectedTeam: 'LAR', isSubmitted: true }
    ];

    const result = calculateRivalryShowdown(user, rival, games, liveScores, userPicks, rivalPicks);

    expect(result.battlegrounds).toHaveLength(2);
    // Duel Decider must be g2 because it is actively IN_PROGRESS
    expect(result.duelDecider).not.toBeNull();
    expect(result.duelDecider?.gameId).toBe('g2');
  });

  // --------------------------------------------------------------------------
  // 4. Missing Picks & Decision #66 Pure Immutability
  // --------------------------------------------------------------------------
  it('excludes hidden or unsubmitted picks and preserves strict immutability', () => {
    const userPicks: UserPickItem[] = [
      { userId: 'u_jack', gameId: 'g1', selectedTeam: 'BAL', isSubmitted: true },
      // Hidden or draft pick
      { userId: 'u_jack', gameId: 'g2', selectedTeam: 'PHI', isSubmitted: false }
    ];
    const rivalPicks: UserPickItem[] = [
      { userId: 'u_dave', gameId: 'g1', selectedTeam: 'KC', isSubmitted: true },
      // Rival has hidden pick
      { userId: 'u_dave', gameId: 'g2', selectedTeam: 'DAL', isSubmitted: true, isHidden: true }
    ];

    // Deep freeze all input arguments
    const frozenUser = Object.freeze({ ...user });
    const frozenRival = Object.freeze({ ...rival });
    const frozenGames = Object.freeze(games.map((g) => Object.freeze({ ...g })));
    const frozenScores = Object.freeze([]);
    const frozenUserPicks = Object.freeze(userPicks.map((p) => Object.freeze({ ...p })));
    const frozenRivalPicks = Object.freeze(rivalPicks.map((p) => Object.freeze({ ...p })));

    let result: RivalryShowdownResult | null = null;
    expect(() => {
      result = calculateRivalryShowdown(
        frozenUser,
        frozenRival,
        frozenGames,
        frozenScores,
        frozenUserPicks,
        frozenRivalPicks
      );
    }).not.toThrow();

    // g2 had unsubmitted / hidden picks, so it must NOT be a battleground
    expect(result!.battlegrounds).toHaveLength(1);
    expect(result!.battlegrounds[0].gameId).toBe('g1');
  });
});
