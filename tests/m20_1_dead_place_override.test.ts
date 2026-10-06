import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { Phase20CoreService, FeatureFlagKey, WeeklyScoreEntry } from '../src/services/phase20CoreService';

describe('Milestone 20.1: Dead Place Override & Auto-Loss Engine (Decision #69)', () => {
  const poolId = 'pool_league_private_10';

  it('enforces Decision #69: No-show auto-loss forces 0.00 points and Dead Place when flag is ON', () => {
    const entries: WeeklyScoreEntry[] = [
      { userId: 'u1', membershipId: 'm1', poolId, totalPoints: new Prisma.Decimal('10.00'), picksCount: 16 },
      { userId: 'u2', membershipId: 'm2', poolId, totalPoints: new Prisma.Decimal('6.00'), picksCount: 16 },
      { userId: 'u3', membershipId: 'm3', poolId, totalPoints: new Prisma.Decimal('8.00'), picksCount: 0 }, // No-show caller passed 8
    ];

    const results = Phase20CoreService.evaluateDeadPlacePenalties(entries, true, true);
    const u3 = results.find((r) => r.userId === 'u3')!;

    expect(u3.effectivePoints.toFixed(2)).toBe('0.00');
    expect(u3.isDeadPlace).toBe(true);
    expect(u3.penaltyShotsOwed.toFixed(2)).toBe('2.50');
    expect(u3.flatFineOwed.toFixed(2)).toBe('0.00');
    expect(Prisma.Decimal.isDecimal(u3.penaltyShotsOwed)).toBe(true);
  });

  it('enforces Decision #69: Multi-way ties (two-way and three-way) assess absolute 2.50 Decimal each with zero splitting', () => {
    // Three-way no-show tie
    const entries: WeeklyScoreEntry[] = [
      { userId: 'u1', membershipId: 'm1', poolId, totalPoints: new Prisma.Decimal('10.00'), picksCount: 16 },
      { userId: 'u2', membershipId: 'm2', poolId, totalPoints: new Prisma.Decimal('0.00'), picksCount: 0 },
      { userId: 'u3', membershipId: 'm3', poolId, totalPoints: new Prisma.Decimal('0.00'), picksCount: 0 },
      { userId: 'u4', membershipId: 'm4', poolId, totalPoints: new Prisma.Decimal('0.00'), picksCount: 0 },
    ];

    const results = Phase20CoreService.evaluateDeadPlacePenalties(entries, true, true);
    const deadPlaces = results.filter((r) => r.isDeadPlace);

    expect(deadPlaces.length).toBe(3);
    for (const dp of deadPlaces) {
      expect(dp.penaltyShotsOwed.toFixed(2)).toBe('2.50');
      expect(dp.flatFineOwed.toFixed(2)).toBe('0.00');
    }
  });

  it('enforces Decision #69: Preserves canonical BR-4 behavior when flag is OFF', () => {
    const entries: WeeklyScoreEntry[] = [
      { userId: 'u1', membershipId: 'm1', poolId, totalPoints: new Prisma.Decimal('10.00'), picksCount: 16 },
      { userId: 'u2', membershipId: 'm2', poolId, totalPoints: new Prisma.Decimal('0.00'), picksCount: 0 },
      { userId: 'u3', membershipId: 'm3', poolId, totalPoints: new Prisma.Decimal('0.00'), picksCount: 0 },
    ];

    const results = Phase20CoreService.evaluateDeadPlacePenalties(entries, false, true);
    const deadPlaces = results.filter((r) => r.isDeadPlace);

    expect(deadPlaces.length).toBe(2);
    // Under BR-4 split math: 2.50 / 2 = 1.25 shots, plus 2.00 flat fine for 0 picks
    expect(deadPlaces[0].penaltyShotsOwed.toFixed(2)).toBe('1.25');
    expect(deadPlaces[1].penaltyShotsOwed.toFixed(2)).toBe('1.25');
    expect(deadPlaces[0].flatFineOwed.toFixed(2)).toBe('2.00');
    expect(deadPlaces[1].flatFineOwed.toFixed(2)).toBe('2.00');
  });

  it('enforces Decision #55: Fails closed if week is not finalized', () => {
    const entries: WeeklyScoreEntry[] = [
      { userId: 'u1', membershipId: 'm1', poolId, totalPoints: new Prisma.Decimal('10.00'), picksCount: 16 },
    ];
    expect(() => Phase20CoreService.evaluateDeadPlacePenalties(entries, true, false)).toThrow('WEEK_NOT_FINALIZED');
    expect(() => Phase20CoreService.evaluateDeadPlacePenalties(entries, true, undefined)).toThrow('WEEK_NOT_FINALIZED');
  });
});
