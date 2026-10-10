import { describe, it, expect } from 'vitest';
import {
  evaluateFailureToAppear,
  buildSettledLadderTiers
} from '../src/services/wallOfShameConsolidationService';

describe('M34.1 Wall of Shame Discrete Charter Tiers & Consumer Logic', () => {
  it('enforces League Charter discrete tiers: 1st=0s, 2nd-6th=1s, 7th-9th=2s, 10th=2.5s', () => {
    const standings = [
      { rank: 1, userId: 'u1', userName: 'Jack' },
      { rank: 2, userId: 'u2', userName: 'Dave' },
      { rank: 6, userId: 'u6', userName: 'Chris' },
      { rank: 7, userId: 'u7', userName: 'Alex' },
      { rank: 8, userId: 'u8', userName: 'Emma' },
      { rank: 9, userId: 'u9', userName: 'Ryan' },
      { rank: 10, userId: 'u10', userName: 'Ben' }
    ];

    const finalizedAt = new Date('2026-10-09T20:00:00Z');
    const ladder = buildSettledLadderTiers(standings, 'PENDING_SUBMISSION', 2.50, finalizedAt);

    // Rank 1: Safe Haven (0.00s)
    expect(ladder[0].penaltyShots).toBe(0.00);
    expect(ladder[0].tier).toBe('SAFE');

    // Rank 2 & 6: Danger Zone Low (1.00s)
    expect(ladder[1].penaltyShots).toBe(1.00);
    expect(ladder[1].tier).toBe('DANGER_LOW');
    expect(ladder[2].penaltyShots).toBe(1.00);
    expect(ladder[2].tier).toBe('DANGER_LOW');

    // Rank 7, 8, 9: High Danger Drop (2.00s)
    expect(ladder[3].penaltyShots).toBe(2.00);
    expect(ladder[3].tier).toBe('DANGER_HIGH');
    expect(ladder[4].penaltyShots).toBe(2.00);
    expect(ladder[5].penaltyShots).toBe(2.00);

    // Rank 10: The Pit (2.50s)
    expect(ladder[6].penaltyShots).toBe(2.50);
    expect(ladder[6].tier).toBe('PIT');
    expect(ladder[6].fsmDisplayStatus).toBe('Awaiting Video');
  });

  it('correctly handles 48h Failure to Appear escalation', () => {
    const finalizedAt = new Date('2026-10-07T20:00:00Z');
    const now = new Date('2026-10-09T21:00:00Z');

    const res = evaluateFailureToAppear(
      'pool_alpha',
      'u10',
      'PENDING_SUBMISSION',
      2.50,
      finalizedAt,
      now
    );

    expect(res.isEscalated).toBe(true);
    expect(res.newDebt).toBe(4.50);
  });
});
