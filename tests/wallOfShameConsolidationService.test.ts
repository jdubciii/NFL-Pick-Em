import { describe, it, expect } from 'vitest';
import {
  evaluateFailureToAppear,
  buildSettledLadderTiers
} from '../src/services/wallOfShameConsolidationService';

describe('M32.1 Wall of Shame Consolidation & Failure to Appear Engine', () => {
  it('does not escalate if 48h deadline has not expired', () => {
    const finalizedAt = new Date('2026-10-09T20:00:00Z');
    const now = new Date('2026-10-10T20:00:00Z'); // 24 hours later

    const res = evaluateFailureToAppear(
      'pool_alpha',
      'u10',
      'PENDING_SUBMISSION',
      2.50,
      finalizedAt,
      now
    );

    expect(res.isEscalated).toBe(false);
    expect(res.newStatus).toBe('PENDING_SUBMISSION');
    expect(res.newDebt).toBe(2.50);
  });

  it('enforces Failure to Appear escalation (+2.00 shots to 4.50 total) when NOW > 48h', () => {
    const finalizedAt = new Date('2026-10-07T20:00:00Z');
    const now = new Date('2026-10-09T21:00:00Z'); // 49 hours later

    const res = evaluateFailureToAppear(
      'pool_alpha',
      'u10',
      'PENDING_SUBMISSION',
      2.50,
      finalizedAt,
      now
    );

    expect(res.isEscalated).toBe(true);
    expect(res.newStatus).toBe('FAILURE_TO_APPEAR');
    expect(res.newDebt).toBe(4.50);
    expect(res.escalationEntry?.amountAdded).toBe('+2.00');
    expect(res.escalationEntry?.escalatedDebt).toBe(4.50);
  });

  it('builds settled ladder tiers correctly identifying Safe, Danger, and The Pit', () => {
    const standings = [
      { rank: 1, userId: 'u1', userName: 'Jack', penaltyShots: '0.00' },
      { rank: 2, userId: 'u2', userName: 'Dave', penaltyShots: '1.00' },
      { rank: 10, userId: 'u10', userName: 'Ben', penaltyShots: '2.50' }
    ];

    const finalizedAt = new Date('2026-10-09T20:00:00Z');
    const ladder = buildSettledLadderTiers(standings, 'PENDING_SUBMISSION', 2.50, finalizedAt);

    expect(ladder).toHaveLength(3);
    expect(ladder[0].tier).toBe('SAFE');
    expect(ladder[0].penaltyShots).toBe(0.00);

    expect(ladder[1].tier).toBe('DANGER');
    expect(ladder[1].penaltyShots).toBe(1.00);

    const pit = ladder[2];
    expect(pit.tier).toBe('PIT');
    expect(pit.rank).toBe(10);
    expect(pit.penaltyShots).toBe(2.50);
    expect(pit.fsmStatus).toBe('PENDING_SUBMISSION');
    expect(pit.submissionDeadlineEndsAt).toBeDefined();
  });
});
