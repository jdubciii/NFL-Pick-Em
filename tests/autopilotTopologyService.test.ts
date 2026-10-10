import { describe, it, expect } from 'vitest';
import {
  deriveAutopilotProvenance,
  generateCompressedTopologyDelta,
  createDebouncedTopologyBroadcaster,
  RawGameLine,
  UserSubmittedPick
} from '../src/services/autopilotTopologyService';

describe('M30.2 Runtime Autopilot Provenance & Compressed SSE Topology', () => {
  const games: RawGameLine[] = [
    { gameId: 'g1', homeTeam: 'DET', awayTeam: 'GB', spread: -2.5 }, // DET favored
    { gameId: 'g2', homeTeam: 'KC', awayTeam: 'BUF', spread: -1.5 }, // KC favored
    { gameId: 'g3', homeTeam: 'PHI', awayTeam: 'DAL', spread: -4.5 }  // PHI favored
  ];

  it('correctly derives Autopilot Provenance when picks perfectly match Tuesday Favorites', () => {
    const favoritePicks: UserSubmittedPick[] = [
      { userId: 'u2', userName: 'Dave', gameId: 'g1', selectedTeam: 'DET' },
      { userId: 'u2', userName: 'Dave', gameId: 'g2', selectedTeam: 'KC' },
      { userId: 'u2', userName: 'Dave', gameId: 'g3', selectedTeam: 'PHI' }
    ];

    const result = deriveAutopilotProvenance('u2', favoritePicks, games);

    expect(result.isAutopilot).toBe(true);
    expect(result.presetType).toBe('FAVORITES');
    expect(result.matchingCount).toBe(3);
  });

  it('enforces Shatter Rule: modifying a single pick revokes Autopilot status', () => {
    // User picked DET, KC, but manually took DAL instead of PHI
    const alteredPicks: UserSubmittedPick[] = [
      { userId: 'u2', userName: 'Dave', gameId: 'g1', selectedTeam: 'DET' },
      { userId: 'u2', userName: 'Dave', gameId: 'g2', selectedTeam: 'KC' },
      { userId: 'u2', userName: 'Dave', gameId: 'g3', selectedTeam: 'DAL' } // gut feeling override
    ];

    const result = deriveAutopilotProvenance('u2', alteredPicks, games);

    expect(result.isAutopilot).toBe(false);
    expect(result.matchingCount).toBe(2);
  });

  it('generates an optimized compressed topology delta payload for SSE broadcasts', () => {
    const picks: UserSubmittedPick[] = [
      { userId: 'u1', userName: 'Jack', gameId: 'g1', selectedTeam: 'DET' },
      { userId: 'u2', userName: 'Dave', gameId: 'g1', selectedTeam: 'DET' },
      { userId: 'u10', userName: 'Ben', gameId: 'g1', selectedTeam: 'GB' } // Lone wolf
    ];

    const delta = generateCompressedTopologyDelta('pool_alpha', picks, games);

    expect(delta.event).toBe('TOPOLOGY_UPDATED');
    expect(delta.lockedCohortCount).toBe(3);
    expect(delta.distribution['g1'].home).toBe(2);
    expect(delta.distribution['g1'].away).toBe(1);
    expect(delta.distribution['g1'].loneWolfUserId).toBe('u10');
    expect(delta.distribution['g1'].loneWolfTeam).toBe('GB');
  });

  it('debounces topology broadcasts by 500ms to protect mobile rendering thread', async () => {
    let broadcastCount = 0;
    const broadcaster = createDebouncedTopologyBroadcaster(50, () => {
      broadcastCount++;
    });

    const sampleDelta = generateCompressedTopologyDelta('pool_alpha', [], games);

    // Rapid successive pick locks
    broadcaster.scheduleBroadcast(sampleDelta);
    broadcaster.scheduleBroadcast(sampleDelta);
    broadcaster.scheduleBroadcast(sampleDelta);

    expect(broadcastCount).toBe(0);

    broadcaster.flush();
    expect(broadcastCount).toBe(1);
  });
});
