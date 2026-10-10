import { describe, it, expect } from 'vitest';
import {
  OFFICIAL_WEEK_5_GAMES,
  reconcileRadarStandings,
  identifyDecisiveGame
} from '../src/services/radarLiveConsequencesService';

describe('M34.2 Radar Mathematical Integrity & 14-Game Slate Parity', () => {
  it('enforces exact 14-game slate count parity with Week 5 Picks definition', () => {
    expect(OFFICIAL_WEEK_5_GAMES).toHaveLength(14);
  });

  it('guarantees Win Equity across all 10 participants normalizes strictly to 100%', () => {
    const samplePlayers = Array.from({ length: 10 }, (_, i) => ({
      userId: `u${i + 1}`,
      userName: `Player_${i + 1}`,
      bankedPoints: 10 - i,
      livePicksWinning: 1
    }));

    const reconciled = reconcileRadarStandings(samplePlayers);
    const totalWinEquity = reconciled.reduce((sum, p) => sum + p.winEquityPct, 0);

    expect(totalWinEquity).toBe(100);
  });

  it('enforces mathematical inequality P(Podium) >= P(Win Equity) for all players', () => {
    const samplePlayers = Array.from({ length: 10 }, (_, i) => ({
      userId: `u${i + 1}`,
      userName: `Player_${i + 1}`,
      bankedPoints: 10 - i,
      livePicksWinning: 1
    }));

    const reconciled = reconcileRadarStandings(samplePlayers);
    for (const p of reconciled) {
      expect(p.podiumPct).toBeGreaterThanOrEqual(p.winEquityPct);
    }
  });

  it('correctly maps discrete charter penalty tiers: 0s, 1s, 2s, 2.5s', () => {
    const samplePlayers = Array.from({ length: 10 }, (_, i) => ({
      userId: `u${i + 1}`,
      userName: `Player_${i + 1}`,
      bankedPoints: 10 - i,
      livePicksWinning: 1
    }));

    const reconciled = reconcileRadarStandings(samplePlayers);

    // Rank 1: 0.00s
    expect(reconciled[0].penaltyShots).toBe(0.00);
    expect(reconciled[0].tier).toBe('SAFE');

    // Rank 2-6: 1.00s
    expect(reconciled[1].penaltyShots).toBe(1.00);
    expect(reconciled[5].penaltyShots).toBe(1.00);

    // Rank 7-9: 2.00s
    expect(reconciled[6].penaltyShots).toBe(2.00);
    expect(reconciled[8].penaltyShots).toBe(2.00);

    // Rank 10: 2.50s (The Pit)
    expect(reconciled[9].penaltyShots).toBe(2.50);
    expect(reconciled[9].tier).toBe('PIT');
  });

  it('identifies the decisive highest-leverage game with contextual consequence description', () => {
    const decisive = identifyDecisiveGame(7, OFFICIAL_WEEK_5_GAMES);
    expect(decisive.gameId).toBe('g3');
    expect(decisive.swingImpactPts).toBe(1.0);
    expect(decisive.outcomeDescription).toContain('Rank #6');
  });
});
