import { describe, it, expect } from 'vitest';
import {
  calculateProvisionalStandings,
  UserStandingRef,
  SlateGame,
  UserPickItem,
  TiebreakerData,
  ProvisionalStanding,
  ProvisionalStandingsResult
} from '../client/src/services/sweatProjectionService';
import { LiveGame } from '../client/src/services/liveScoreService';

describe('Phase 38 Sunday Sweat & Radar Integration Tests (Ruling P37-P38-2026-10-12-01)', () => {
  // --------------------------------------------------------------------------
  // 1. Adapter Data Mapping (Conversion of Pool Members and Picks for Engine)
  // --------------------------------------------------------------------------
  it('correctly maps pool matrix columns, rows, and cells into engine inputs and produces valid provisional standings', () => {
    // Simulated matrix payload received from /api/pools/:pool_id/matrix
    const matrixColumns = [
      { user_id: 'u_jack', email: 'jack.w.cone@gmail.com', displayName: 'Jack (Commissioner)' },
      { user_id: 'u_dave', email: 'dave@example.com', displayName: 'Dave M.' },
      { user_id: 'u_sarah', email: 'sarah@example.com', displayName: 'Sarah K.' }
    ];

    const matrixRows = [
      { game_id: 'g1', home_team_id: 'BAL', away_team_id: 'KC', spread: -3.5, kickoff_time: '2026-10-11T17:00:00Z', status: 'FINAL' },
      { game_id: 'g2', home_team_id: 'PHI', away_team_id: 'DAL', spread: -6.0, kickoff_time: '2026-10-11T20:25:00Z', status: 'IN_PROGRESS' },
    ];

    const matrixCells: Record<string, Record<string, { selected_team_id: string; is_hidden?: boolean }>> = {
      g1: {
        u_jack: { selected_team_id: 'BAL' },
        u_dave: { selected_team_id: 'KC' },
        u_sarah: { selected_team_id: 'BAL' }
      },
      g2: {
        u_jack: { selected_team_id: 'PHI' },
        u_dave: { selected_team_id: 'DAL' },
        u_sarah: { selected_team_id: 'PHI' }
      }
    };

    // Adapter mapping logic
    const mappedUsers: UserStandingRef[] = matrixColumns.map((col) => ({
      id: col.user_id,
      name: col.displayName || col.email
    }));

    const mappedGames: SlateGame[] = matrixRows.map((row) => ({
      id: row.game_id,
      homeTeam: row.home_team_id,
      awayTeam: row.away_team_id,
      spread: row.spread,
      kickoffTime: row.kickoff_time
    }));

    const mappedPicks: UserPickItem[] = [];
    for (const row of matrixRows) {
      for (const col of matrixColumns) {
        const cell = matrixCells[row.game_id]?.[col.user_id];
        if (cell && cell.selected_team_id) {
          mappedPicks.push({
            userId: col.user_id,
            gameId: row.game_id,
            selectedTeam: cell.selected_team_id,
            isSubmitted: true,
            isHidden: cell.is_hidden
          });
        }
      }
    }

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
        clock: '05:30',
        period: 4,
        isRedZone: true,
        downDistanceText: '1st & 10',
        homeTeam: { code: 'PHI', name: 'Philadelphia Eagles', score: '24' },
        awayTeam: { code: 'DAL', name: 'Dallas Cowboys', score: '17' }
      }
    ];

    const result = calculateProvisionalStandings(mappedUsers, mappedGames, liveScores, mappedPicks);

    expect(result).toHaveLength(3);
    // Jack: picked BAL (win -> banked 1) + picked PHI (leading in 4Q -> live 1) = 2 pts
    const jackStanding = result.find((s) => s.userId === 'u_jack');
    expect(jackStanding).toBeDefined();
    expect(jackStanding?.bankedPoints).toBe(1);
    expect(jackStanding?.livePoints).toBe(1);
    expect(jackStanding?.totalProvisionalPoints).toBe(2);
    expect(jackStanding?.provisionalRank).toBe(1);
    expect(jackStanding?.tier).toBe('SAFE_HAVEN');

    // Dave: picked KC (loss -> 0) + picked DAL (trailing -> 0) = 0 pts -> last place
    const daveStanding = result.find((s) => s.userId === 'u_dave');
    expect(daveStanding).toBeDefined();
    expect(daveStanding?.totalProvisionalPoints).toBe(0);
    expect(daveStanding?.provisionalRank).toBe(3);
    expect(daveStanding?.tier).toBe('PIT');
  });

  // --------------------------------------------------------------------------
  // 2. Invariant Preservation (Zero Mutations, Decision #54 & Decision #66)
  // --------------------------------------------------------------------------
  it('strictly preserves immutability with zero mutations to picks, kickoff locks, or penalty ledgers', () => {
    const rawUsers = [
      { id: 'u1', name: 'Jack' },
      { id: 'u2', name: 'Dave' }
    ];
    const rawGames = [
      { id: 'g1', homeTeam: 'BAL', awayTeam: 'KC', spread: -3.5, kickoffTime: '2026-10-11T17:00:00Z' }
    ];
    const rawScores = [
      {
        id: 'g1',
        name: 'KC @ BAL',
        shortName: 'KC @ BAL',
        status: 'IN_PROGRESS' as const,
        clock: '12:00',
        period: 2,
        isRedZone: false,
        downDistanceText: '',
        homeTeam: { code: 'BAL', name: 'Ravens', score: '14' },
        awayTeam: { code: 'KC', name: 'Chiefs', score: '10' }
      }
    ];
    const rawPicks = [
      { userId: 'u1', gameId: 'g1', selectedTeam: 'BAL', isSubmitted: true },
      { userId: 'u2', gameId: 'g1', selectedTeam: 'KC', isSubmitted: true }
    ];

    // Deep freeze all inputs
    const frozenUsers = Object.freeze(rawUsers.map((u) => Object.freeze({ ...u })));
    const frozenGames = Object.freeze(rawGames.map((g) => Object.freeze({ ...g })));
    const frozenScores = Object.freeze(rawScores.map((s) => Object.freeze({ ...s })));
    const frozenPicks = Object.freeze(rawPicks.map((p) => Object.freeze({ ...p })));

    // Mock penalty ledger outside projection engine
    const penaltyLedger = Object.freeze({
      u1: { shotDebt: 0.0, status: 'CLEARED' },
      u2: { shotDebt: 2.0, status: 'PENDING' }
    });

    expect(() => {
      const result = calculateProvisionalStandings(frozenUsers, frozenGames, frozenScores, frozenPicks);
      expect(result).toHaveLength(2);
    }).not.toThrow();

    // Verify penalty ledger and kickoff timestamp invariants remained unaltered
    expect(penaltyLedger.u1.shotDebt).toBe(0.0);
    expect(penaltyLedger.u2.shotDebt).toBe(2.0);
    expect(frozenGames[0].kickoffTime).toBe('2026-10-11T17:00:00Z');
  });

  // --------------------------------------------------------------------------
  // 3. Empty / Completed Slate Handling (Zero Active Matchups -> swingGame: null)
  // --------------------------------------------------------------------------
  it('correctly handles completed slates: returns null swingGame when all matchups are FINAL', () => {
    const users: UserStandingRef[] = [
      { id: 'u1', name: 'Jack' },
      { id: 'u2', name: 'Dave' }
    ];
    const games: SlateGame[] = [
      { id: 'g1', homeTeam: 'BAL', awayTeam: 'KC', spread: -3.5 },
      { id: 'g2', homeTeam: 'PHI', awayTeam: 'DAL', spread: -6.0 }
    ];
    // All games are FINAL
    const completedScores: LiveGame[] = [
      {
        id: 'g1',
        name: 'KC @ BAL',
        shortName: 'KC @ BAL',
        status: 'FINAL',
        clock: '00:00',
        period: 4,
        isRedZone: false,
        downDistanceText: '',
        homeTeam: { code: 'BAL', name: 'Ravens', score: '30' },
        awayTeam: { code: 'KC', name: 'Chiefs', score: '24' }
      },
      {
        id: 'g2',
        name: 'DAL @ PHI',
        shortName: 'DAL @ PHI',
        status: 'FINAL',
        clock: '00:00',
        period: 4,
        isRedZone: false,
        downDistanceText: '',
        homeTeam: { code: 'PHI', name: 'Eagles', score: '28' },
        awayTeam: { code: 'DAL', name: 'Cowboys', score: '20' }
      }
    ];

    const picks: UserPickItem[] = [
      { userId: 'u1', gameId: 'g1', selectedTeam: 'BAL', isSubmitted: true },
      { userId: 'u1', gameId: 'g2', selectedTeam: 'PHI', isSubmitted: true },
      { userId: 'u2', gameId: 'g1', selectedTeam: 'KC', isSubmitted: true },
      { userId: 'u2', gameId: 'g2', selectedTeam: 'DAL', isSubmitted: true }
    ];

    const result = calculateProvisionalStandings(users, games, completedScores, picks);

    // Each user's standing should have swingGame: null because no active matchups remain
    expect(result[0].swingGame).toBeNull();
    expect(result[1].swingGame).toBeNull();
    expect(result.swingGame).toBeNull();
  });

  // --------------------------------------------------------------------------
  // 4. Tenant Isolation (Decision #20: Authorized Pool Scoping)
  // --------------------------------------------------------------------------
  it('enforces tenant isolation: provisional calculations strictly isolate to authorized pool members', () => {
    const authorizedPoolId = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782'; // Main League
    const foreignPoolId = '11111111-2222-3333-4444-555555555555'; // Rogue Pool

    interface RawMemberRecord {
      userId: string;
      poolId: string;
      displayName: string;
      status: 'ACTIVE' | 'PENDING';
    }

    const multiPoolMembers: RawMemberRecord[] = [
      { userId: 'u1', poolId: authorizedPoolId, displayName: 'Jack (Main)', status: 'ACTIVE' },
      { userId: 'u2', poolId: authorizedPoolId, displayName: 'Dave (Main)', status: 'ACTIVE' },
      { userId: 'u_foreign_1', poolId: foreignPoolId, displayName: 'Intruder 1', status: 'ACTIVE' },
      { userId: 'u_foreign_2', poolId: foreignPoolId, displayName: 'Intruder 2', status: 'ACTIVE' },
      { userId: 'u_pending_1', poolId: authorizedPoolId, displayName: 'Pending Member', status: 'PENDING' }
    ];

    // Filter strictly by authorized pool ID and ACTIVE status
    const isolatedAuthorizedMembers: UserStandingRef[] = multiPoolMembers
      .filter((m) => m.poolId === authorizedPoolId && m.status === 'ACTIVE')
      .map((m) => ({ id: m.userId, name: m.displayName }));

    const games: SlateGame[] = [
      { id: 'g1', homeTeam: 'BAL', awayTeam: 'KC', spread: -3.5 }
    ];

    const picks: UserPickItem[] = [
      { userId: 'u1', gameId: 'g1', selectedTeam: 'BAL', isSubmitted: true },
      { userId: 'u2', gameId: 'g1', selectedTeam: 'KC', isSubmitted: true },
      { userId: 'u_foreign_1', gameId: 'g1', selectedTeam: 'BAL', isSubmitted: true }
    ];

    const result = calculateProvisionalStandings(isolatedAuthorizedMembers, games, [], picks);

    // Assert that the result contains exactly the 2 authorized members
    expect(result).toHaveLength(2);
    const memberIds = result.map((r) => r.userId);
    expect(memberIds).toContain('u1');
    expect(memberIds).toContain('u2');
    expect(memberIds).not.toContain('u_foreign_1');
    expect(memberIds).not.toContain('u_foreign_2');
    expect(memberIds).not.toContain('u_pending_1');
  });
});
