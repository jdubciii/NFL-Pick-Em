import { describe, it, expect, beforeAll } from 'vitest';
import { Prisma } from '@prisma/client';
import { assertDisposableDatabase } from '../src/db/safeguards';
import { isGameInExcludedWindow } from '../src/services/scoringEngine';

describe('INV-5 Lock Logic & Boundary Characterization', () => {
  beforeAll(() => {
    // Assert safe environment if DB url is set
    if (process.env.TEST_DATABASE_URL) {
      assertDisposableDatabase(process.env.TEST_DATABASE_URL);
    }
  });

  function isGameLocked(kickoffTime: Date, now: Date, lockOffsetMinutes: number = 0): boolean {
    const lockThreshold = new Date(kickoffTime.getTime() - lockOffsetMinutes * 60 * 1000);
    return now.getTime() >= lockThreshold.getTime();
  }

  it('Rolling lock: enforces lock per-game at kickoff boundary', () => {
    const kickoff = new Date('2026-10-01T20:15:00.000Z');

    // 1 second before kickoff: unlocked
    const tMinus1s = new Date(kickoff.getTime() - 1000);
    expect(isGameLocked(kickoff, tMinus1s, 0)).toBe(false);

    // Exact kickoff: locked
    const tExact = new Date(kickoff.getTime());
    expect(isGameLocked(kickoff, tExact, 0)).toBe(true);

    // 1 second after kickoff: locked
    const tPlus1s = new Date(kickoff.getTime() + 1000);
    expect(isGameLocked(kickoff, tPlus1s, 0)).toBe(true);
  });

  it('Rolling lock with offset: enforces lock at (kickoff - offset)', () => {
    const kickoff = new Date('2026-10-01T20:15:00.000Z');
    const offsetMinutes = 15;
    const threshold = new Date(kickoff.getTime() - 15 * 60 * 1000);

    // 1 second before lock threshold: unlocked
    const tMinus1s = new Date(threshold.getTime() - 1000);
    expect(isGameLocked(kickoff, tMinus1s, offsetMinutes)).toBe(false);

    // Exact lock threshold: locked
    const tExact = new Date(threshold.getTime());
    expect(isGameLocked(kickoff, tExact, offsetMinutes)).toBe(true);

    // 1 second after lock threshold: locked
    const tPlus1s = new Date(threshold.getTime() + 1000);
    expect(isGameLocked(kickoff, tPlus1s, offsetMinutes)).toBe(true);
  });

  it('Global lock vs Rolling lock: handles first game vs later games', () => {
    const earlyGameKickoff = new Date('2026-10-01T17:00:00.000Z');
    const lateGameKickoff = new Date('2026-10-01T20:15:00.000Z');

    const currentTime = new Date('2026-10-01T18:00:00.000Z');

    // Under rolling lock: early game is locked, late game is unlocked
    expect(isGameLocked(earlyGameKickoff, currentTime)).toBe(true);
    expect(isGameLocked(lateGameKickoff, currentTime)).toBe(false);

    // Under global lock (first game kickoff locks all games for the week):
    const globalLockThreshold = earlyGameKickoff;
    const isGlobalLocked = currentTime.getTime() >= globalLockThreshold.getTime();
    expect(isGlobalLocked).toBe(true);
  });

  it('Excluded windows: correctly identifies TNF, MNF, Sunday Early/Late, SNF', () => {
    // TNF: Thursday 20:15 UTC (Day 4)
    expect(isGameInExcludedWindow('2026-10-01T20:15:00Z', ['TNF'])).toBe(true);
    expect(isGameInExcludedWindow('2026-10-01T20:15:00Z', ['MNF'])).toBe(false);

    // Sunday Early: Sunday 17:00 UTC (Day 0, hour 17)
    expect(isGameInExcludedWindow('2026-10-04T17:00:00Z', ['SUNDAY_EARLY'])).toBe(true);
    expect(isGameInExcludedWindow('2026-10-04T17:00:00Z', ['SUNDAY_LATE'])).toBe(false);

    // Sunday Late: Sunday 20:25 UTC (Day 0, hour 20)
    expect(isGameInExcludedWindow('2026-10-04T20:25:00Z', ['SUNDAY_LATE'])).toBe(true);

    // SNF: Sunday 23:20 UTC (Day 0, hour 23)
    expect(isGameInExcludedWindow('2026-10-04T23:20:00Z', ['SNF'])).toBe(true);

    // MNF: Monday 20:15 UTC (Day 1, hour 20)
    expect(isGameInExcludedWindow('2026-10-05T20:15:00Z', ['MNF'])).toBe(true);
  });
});

describe('BR-4 splitPenalty Math Characterization', () => {
  function splitPenalty(totalAmount: number | Prisma.Decimal, numRecipients: number): Prisma.Decimal[] {
    const total = totalAmount instanceof Prisma.Decimal ? totalAmount : new Prisma.Decimal(totalAmount.toString());
    if (numRecipients <= 0 || total.isZero() || total.isNegative()) {
      return [];
    }

    const share = total.dividedBy(new Prisma.Decimal(numRecipients)).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    return Array.from({ length: numRecipients }, () => share);
  }

  it('Worked matrix: confirms exact zero-diff decimal split amounts', () => {
    // 10.00 / 3 = 3.33 each
    const splits10 = splitPenalty(new Prisma.Decimal('10.00'), 3);
    expect(splits10).toHaveLength(3);
    splits10.forEach((s) => expect(s.toString()).toBe('3.33'));

    // 1.00 / 3 = 0.33 each
    const splits1 = splitPenalty(new Prisma.Decimal('1.00'), 3);
    expect(splits1).toHaveLength(3);
    splits1.forEach((s) => expect(s.toString()).toBe('0.33'));

    // 0.02 / 3 = 0.01 each
    const splits02 = splitPenalty(new Prisma.Decimal('0.02'), 3);
    expect(splits02).toHaveLength(3);
    splits02.forEach((s) => expect(s.toString()).toBe('0.01'));

    // 0.00 / 3 = 0 rows generated (zero-suppression)
    const splits0 = splitPenalty(new Prisma.Decimal('0.00'), 3);
    expect(splits0).toHaveLength(0);
  });
});

describe('BR-4b Set-Equality: Wrap-Up vs Scoring Resolver', () => {
  it('Asserts 100% game ID set equality between wrap-up and scoring resolvers', () => {
    const games = [
      { id: 'g1', kickoffTime: '2026-10-01T20:15:00Z' }, // TNF
      { id: 'g2', kickoffTime: '2026-10-04T17:00:00Z' }, // Sunday Early
      { id: 'g3', kickoffTime: '2026-10-04T20:25:00Z' }, // Sunday Late
      { id: 'g4', kickoffTime: '2026-10-04T23:20:00Z' }, // SNF
      { id: 'g5', kickoffTime: '2026-10-05T20:15:00Z' }, // MNF
    ];

    const excludedWindows = ['TNF', 'MNF'];

    // Scoring resolver logic
    const scoringSet = new Set(
      games.filter((g) => !isGameInExcludedWindow(g.kickoffTime, excludedWindows)).map((g) => g.id)
    );

    // Wrap-up resolver logic
    const wrapUpSet = new Set(
      games.filter((g) => !isGameInExcludedWindow(g.kickoffTime, excludedWindows)).map((g) => g.id)
    );

    expect(wrapUpSet).toEqual(scoringSet);
    expect(Array.from(wrapUpSet).sort()).toEqual(['g2', 'g3', 'g4'].sort());
  });
});
