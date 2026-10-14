import { describe, it, expect } from 'vitest';
import {
  calculateProvisionalStandings,
  UserStandingRef,
  SlateGame,
  UserPickItem,
  TiebreakerData,
  PreviousSnapshotEntry
} from '../client/src/services/sweatProjectionService';
import { LiveGame } from '../client/src/services/liveScoreService';

describe('Phase 38 Sunday Sweat Projection Engine (Ruling P37-P38-2026-10-12-01)', () => {
  const users: UserStandingRef[] = [
    { id: 'u1', name: 'Jack (Commissioner)' },
    { id: 'u2', name: 'Alice' },
    { id: 'u3', name: 'Bob' },
    { id: 'u4', name: 'Charlie' }
  ];

  const games: SlateGame[] = [
    { id: 'g1', homeTeam: 'BAL', awayTeam: 'KC', spread: -3.5 },
    { id: 'g2', homeTeam: 'PHI', awayTeam: 'DAL', spread: -6.0 },
    { id: 'g3', homeTeam: 'SF', awayTeam: 'LAR', spread: -4.5 }
  ];

  // --------------------------------------------------------------------------
  // 1. Provisional Point Tallying (Banked Final + Active Live Points)
  // --------------------------------------------------------------------------
  it('accurately combines banked final points and active live points', () => {
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
        clock: '06:45',
        period: 3,
        isRedZone: true,
        downDistanceText: '2nd & Goal',
        homeTeam: { code: 'PHI', name: 'Philadelphia Eagles', score: '17' },
        awayTeam: { code: 'DAL', name: 'Dallas Cowboys', score: '10' }
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

    const picks: UserPickItem[] = [
      // Jack: picked BAL (final win -> banked 1), picked PHI (leading in 3Q -> live 1) -> total 2
      { userId: 'u1', gameId: 'g1', selectedTeam: 'BAL', isSubmitted: true },
      { userId: 'u1', gameId: 'g2', selectedTeam: 'PHI', isSubmitted: true },

      // Alice: picked KC (final loss -> banked 0), picked PHI (leading in 3Q -> live 1) -> total 1
      { userId: 'u2', gameId: 'g1', selectedTeam: 'KC', isSubmitted: true },
      { userId: 'u2', gameId: 'g2', selectedTeam: 'PHI', isSubmitted: true },

      // Bob: picked KC (loss -> 0), picked DAL (trailing -> 0) -> total 0
      { userId: 'u3', gameId: 'g1', selectedTeam: 'KC', isSubmitted: true },
      { userId: 'u3', gameId: 'g2', selectedTeam: 'DAL', isSubmitted: true }
    ];

    const prevSnapshot: PreviousSnapshotEntry[] = [
      { userId: 'u1', rank: 2 },
      { userId: 'u2', rank: 1 },
      { userId: 'u3', rank: 3 }
    ];

    const standings = calculateProvisionalStandings(
      users.slice(0, 3),
      games,
      liveScores,
      picks,
      undefined,
      prevSnapshot
    );

    expect(standings).toHaveLength(3);

    // Jack should be Rank 1 (2 pts, +1 delta)
    const jack = standings.find((s) => s.userId === 'u1')!;
    expect(jack.bankedPoints).toBe(1);
    expect(jack.livePoints).toBe(1);
    expect(jack.totalProvisionalPoints).toBe(2);
    expect(jack.provisionalRank).toBe(1);
    expect(jack.rankDelta).toBe(1); // Improved from rank 2 to 1 (+1)
    expect(jack.tier).toBe('SAFE_HAVEN');

    // Alice should be Rank 2 (1 pt, -1 delta)
    const alice = standings.find((s) => s.userId === 'u2')!;
    expect(alice.bankedPoints).toBe(0);
    expect(alice.livePoints).toBe(1);
    expect(alice.totalProvisionalPoints).toBe(1);
    expect(alice.provisionalRank).toBe(2);
    expect(alice.rankDelta).toBe(-1); // Dropped from 1 to 2 (-1)

    // Bob should be Rank 3 (The Pit)
    const bob = standings.find((s) => s.userId === 'u3')!;
    expect(bob.bankedPoints).toBe(0);
    expect(bob.livePoints).toBe(0);
    expect(bob.totalProvisionalPoints).toBe(0);
    expect(bob.provisionalRank).toBe(3);
    expect(bob.tier).toBe('PIT');
    expect(bob.dangerProbability).toBeGreaterThan(80);
  });

  // --------------------------------------------------------------------------
  // 2. Tiebreak Stepping & Explicit Handling of Unresolved Ties
  // --------------------------------------------------------------------------
  it('correctly resolves ties via tiebreaker distance and marks unresolved ties', () => {
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
        homeTeam: { code: 'BAL', name: 'Baltimore Ravens', score: '28' },
        awayTeam: { code: 'KC', name: 'Kansas City Chiefs', score: '21' }
      }
    ];

    const picks: UserPickItem[] = [
      { userId: 'u1', gameId: 'g1', selectedTeam: 'BAL', isSubmitted: true },
      { userId: 'u2', gameId: 'g1', selectedTeam: 'BAL', isSubmitted: true },
      { userId: 'u3', gameId: 'g1', selectedTeam: 'BAL', isSubmitted: true }
    ];

    // Case A: Resolved tiebreak (Actual MNF total is 49.0)
    // Jack predicted 48.5 (dist 0.5)
    // Alice predicted 45.0 (dist 4.0)
    // Bob predicted 45.0 (dist 4.0)
    const tiebreakers: TiebreakerData = {
      actualTotalScore: 49.0,
      userPredictions: {
        u1: 48.5,
        u2: 45.0,
        u3: 45.0
      }
    };

    const standings = calculateProvisionalStandings(users.slice(0, 3), games, liveScores, picks, tiebreakers);

    expect(standings[0].userId).toBe('u1');
    expect(standings[0].provisionalRank).toBe(1);
    expect(standings[0].isTied).toBe(false);

    // Alice and Bob have exact same distance (4.0) -> unresolved tie for rank 2
    expect(standings[1].provisionalRank).toBe(2);
    expect(standings[1].isTied).toBe(true);
    expect(standings[2].provisionalRank).toBe(2);
    expect(standings[2].isTied).toBe(true);
  });

  // --------------------------------------------------------------------------
  // 3. Swing Game Calculation Across Multi-Point Spreads
  // --------------------------------------------------------------------------
  it('calculates swing game card identifying highest leverage matchup', () => {
    const liveScores: LiveGame[] = [
      {
        id: 'g1',
        name: 'KC @ BAL',
        shortName: 'KC @ BAL',
        status: 'IN_PROGRESS',
        clock: '10:00',
        period: 2,
        isRedZone: false,
        downDistanceText: '',
        homeTeam: { code: 'BAL', name: 'Baltimore Ravens', score: '7' },
        awayTeam: { code: 'KC', name: 'Kansas City Chiefs', score: '3' }
      },
      {
        id: 'g2',
        name: 'DAL @ PHI',
        shortName: 'DAL @ PHI',
        status: 'IN_PROGRESS',
        clock: '04:12',
        period: 4,
        isRedZone: true,
        downDistanceText: '',
        homeTeam: { code: 'PHI', name: 'Philadelphia Eagles', score: '24' },
        awayTeam: { code: 'DAL', name: 'Dallas Cowboys', score: '21' }
      }
    ];

    const picks: UserPickItem[] = [
      { userId: 'u1', gameId: 'g1', selectedTeam: 'BAL', isSubmitted: true },
      // Game 2 has spread -6.0 (higher weight) + IN_PROGRESS
      { userId: 'u1', gameId: 'g2', selectedTeam: 'PHI', isSubmitted: true }
    ];

    const standings = calculateProvisionalStandings(users.slice(0, 1), games, liveScores, picks);
    const jack = standings[0];

    expect(jack.swingGame).not.toBeNull();
    // PHI @ DAL has spread -6.0 -> leverage 8.0, higher than KC @ BAL (spread -3.5 -> 5.5)
    expect(jack.swingGame?.gameId).toBe('g2');
    expect(jack.swingGame?.userPick).toBe('PHI');
    expect(jack.swingGame?.leverageScore).toBe(8.0);
    expect(jack.swingGame?.impactDescription).toMatch(/Podium|Safe Haven/i);
  });

  // --------------------------------------------------------------------------
  // 4. Offline / Stale Telemetry Fallback (Retains Calculation Integrity)
  // --------------------------------------------------------------------------
  it('falls back gracefully on empty or null live scores without corruption or exceptions', () => {
    const picks: UserPickItem[] = [
      { userId: 'u1', gameId: 'g1', selectedTeam: 'BAL', isSubmitted: true }
    ];

    // Pass empty liveScores array (simulating network dropout)
    const standingsEmpty = calculateProvisionalStandings(users.slice(0, 1), games, [], picks);
    expect(standingsEmpty).toHaveLength(1);
    expect(standingsEmpty[0].totalProvisionalPoints).toBe(0);
    expect(standingsEmpty[0].swingGame?.gameStatus).toBe('SCHEDULED');

    // Pass undefined liveScores
    const standingsUndefined = calculateProvisionalStandings(users.slice(0, 1), games, undefined as any, picks);
    expect(standingsUndefined).toHaveLength(1);
    expect(standingsUndefined[0].totalProvisionalPoints).toBe(0);
  });

  // --------------------------------------------------------------------------
  // 5. Decision #66: Exclusion of Unsubmitted/Hidden Picks & Input Immutability
  // --------------------------------------------------------------------------
  it('strictly excludes unsubmitted and hidden picks, and guarantees input immutability', () => {
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
        homeTeam: { code: 'BAL', name: 'Baltimore Ravens', score: '30' },
        awayTeam: { code: 'KC', name: 'Kansas City Chiefs', score: '20' }
      }
    ];

    const picks: UserPickItem[] = [
      // Draft pick: not yet submitted (Decision #66 violation if scored)
      { userId: 'u1', gameId: 'g1', selectedTeam: 'BAL', isSubmitted: false },
      // Hidden pick: pending kickoff release
      { userId: 'u2', gameId: 'g1', selectedTeam: 'BAL', isSubmitted: true, isHidden: true },
      // Valid submitted pick
      { userId: 'u3', gameId: 'g1', selectedTeam: 'BAL', isSubmitted: true, isHidden: false }
    ];

    const frozenPicks = Object.freeze(JSON.parse(JSON.stringify(picks)));
    const frozenGames = Object.freeze(JSON.parse(JSON.stringify(games)));

    const standings = calculateProvisionalStandings(users.slice(0, 3), frozenGames, liveScores, frozenPicks);

    const jack = standings.find((s) => s.userId === 'u1')!;
    const alice = standings.find((s) => s.userId === 'u2')!;
    const bob = standings.find((s) => s.userId === 'u3')!;

    // Jack's unsubmitted pick MUST NOT award points
    expect(jack.totalProvisionalPoints).toBe(0);

    // Alice's hidden pick MUST NOT award points
    expect(alice.totalProvisionalPoints).toBe(0);

    // Bob's submitted, visible pick MUST award 1 point
    expect(bob.totalProvisionalPoints).toBe(1);
    expect(bob.provisionalRank).toBe(1);
  });
});
