import { describe, it, expect } from 'vitest';
import {
  computeSlateTopology,
  computeDuelComparison,
  RawGameDefinition,
  UserSubmittedPick
} from '../src/services/pregameTopologyService';

describe('M30.1 Pre-Game Topology, Consensus Dimming & Rival Crosshairs', () => {
  const games: RawGameDefinition[] = [
    { gameId: 'g1', homeTeam: 'DET', awayTeam: 'GB', spread: -2.5 },
    { gameId: 'g2', homeTeam: 'KC', awayTeam: 'BUF', spread: -1.5 },
    { gameId: 'g3', homeTeam: 'PHI', awayTeam: 'DAL', spread: -4.5 }
  ];

  it('enforces Finding 5.6 Anti-Peeking Cohort Floor: returns AWAITING_COHORT when N < 3', () => {
    const fewPicks: UserSubmittedPick[] = [
      { userId: 'u1', userName: 'Jack', gameId: 'g1', selectedTeam: 'DET' },
      { userId: 'u2', userName: 'Dave', gameId: 'g1', selectedTeam: 'GB' }
    ];

    const topology = computeSlateTopology('pool_alpha', 5, fewPicks, games, 3);
    expect(topology.status).toBe('AWAITING_COHORT');
    expect(topology.lockedCount).toBe(2);
    expect(topology.games).toHaveLength(0);
  });

  it('unlocks READY state and computes distributions when cohort floor N >= 3 is met', () => {
    const validPicks: UserSubmittedPick[] = [
      { userId: 'u1', userName: 'Jack', gameId: 'g1', selectedTeam: 'DET' },
      { userId: 'u2', userName: 'Dave', gameId: 'g1', selectedTeam: 'DET' },
      { userId: 'u3', userName: 'Sarah', gameId: 'g1', selectedTeam: 'GB' }
    ];

    const topology = computeSlateTopology('pool_alpha', 5, validPicks, games, 3);
    expect(topology.status).toBe('READY');
    expect(topology.lockedCount).toBe(3);
    expect(topology.games).toHaveLength(3);
  });

  it('accurately identifies 10/10 Consensus rows for dimming', () => {
    const consensusPicks: UserSubmittedPick[] = [
      { userId: 'u1', userName: 'Jack', gameId: 'g2', selectedTeam: 'KC' },
      { userId: 'u2', userName: 'Dave', gameId: 'g2', selectedTeam: 'KC' },
      { userId: 'u3', userName: 'Sarah', gameId: 'g2', selectedTeam: 'KC' }
    ];

    const topology = computeSlateTopology('pool_alpha', 5, consensusPicks, games, 3);
    const g2Dist = topology.games.find((g) => g.gameId === 'g2');

    expect(g2Dist?.isConsensus).toBe(true);
    expect(g2Dist?.consensusTeam).toBe('KC');
    expect(g2Dist?.isLoneWolf).toBe(false);
  });

  it('accurately identifies Lone Wolf contrarian picks (e.g. 9-1 or (N-1)-1 split)', () => {
    const loneWolfPicks: UserSubmittedPick[] = [
      { userId: 'u1', userName: 'Jack', gameId: 'g1', selectedTeam: 'DET' },
      { userId: 'u2', userName: 'Dave', gameId: 'g1', selectedTeam: 'DET' },
      { userId: 'u3', userName: 'Sarah', gameId: 'g1', selectedTeam: 'DET' },
      { userId: 'u10', userName: 'Ben', gameId: 'g1', selectedTeam: 'GB' } // Ben is Lone Wolf
    ];

    const topology = computeSlateTopology('pool_alpha', 5, loneWolfPicks, games, 3);
    const g1Dist = topology.games.find((g) => g.gameId === 'g1');

    expect(g1Dist?.isLoneWolf).toBe(true);
    expect(g1Dist?.loneWolfUserId).toBe('u10');
    expect(g1Dist?.loneWolfTeam).toBe('GB');
  });

  it('computes 1-on-1 Duel comparison, swing points, and Vegas Tale of the Tape probabilities', () => {
    const duelPicks: UserSubmittedPick[] = [
      { userId: 'u1', userName: 'Jack', gameId: 'g1', selectedTeam: 'DET' },
      { userId: 'u2', userName: 'Dave', gameId: 'g1', selectedTeam: 'GB' }, // Differing
      { userId: 'u1', userName: 'Jack', gameId: 'g2', selectedTeam: 'KC' },
      { userId: 'u2', userName: 'Dave', gameId: 'g2', selectedTeam: 'KC' }, // Matching
      { userId: 'u1', userName: 'Jack', gameId: 'g3', selectedTeam: 'PHI' },
      { userId: 'u2', userName: 'Dave', gameId: 'g3', selectedTeam: 'DAL' }  // Differing
    ];

    const duel = computeDuelComparison('u1', 'Jack', 'u2', 'Dave', duelPicks, games);

    expect(duel.matchingPicksCount).toBe(1);
    expect(duel.differingPicksCount).toBe(2);
    expect(duel.potentialSwingPoints).toBe(2.0);
    expect(duel.differingPicks).toHaveLength(2);
    expect(duel.targetWinProbabilityPct + duel.rivalWinProbabilityPct).toBe(100);
  });
});
