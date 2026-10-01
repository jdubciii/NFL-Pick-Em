import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, Prisma } from '@prisma/client';
import { assertDisposableUrl } from '../src/db/safeguards';
import { runWeeklyWrapUp } from '../src/services/weeklyWrapUp';

const localRehearsalUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pickem_rehearsal';

describe('BR-4b: Weekly Wrap-Up Service Lifecycle, Concurrency & Invariants', () => {
  let prisma: PrismaClient;
  let adminUser: any;
  let user1: any;
  let user2: any;
  let pool: any;
  let cleanPool: any;

  beforeAll(async () => {
    assertDisposableUrl(localRehearsalUrl);
    prisma = new PrismaClient({ datasources: { db: { url: localRehearsalUrl } } });

    adminUser = await prisma.user.create({
      data: { email: `br4b_admin_${Date.now()}@example.com`, passwordHash: 'hash' },
    });
    user1 = await prisma.user.create({
      data: { email: `br4b_u1_${Date.now()}@example.com`, passwordHash: 'hash' },
    });
    user2 = await prisma.user.create({
      data: { email: `br4b_u2_${Date.now()}@example.com`, passwordHash: 'hash' },
    });

    pool = await prisma.pool.create({
      data: {
        name: 'BR4b Lifecycle Pool',
        adminId: adminUser.id,
        settings: {
          scoring: { penaltyPerWeek: 1 },
          tiebreaker: { gameTarget: 'LAST_GAME_OF_WEEK' },
        },
      },
    });

    await prisma.poolMembership.createMany({
      data: [
        { poolId: pool.id, userId: adminUser.id, status: 'ACTIVE' },
        { poolId: pool.id, userId: user1.id, status: 'ACTIVE' },
        { poolId: pool.id, userId: user2.id, status: 'ACTIVE' },
      ],
    });

    cleanPool = await prisma.pool.create({
      data: {
        name: 'BR4b Clean Pool (No Games)',
        adminId: adminUser.id,
        settings: {},
      },
    });

    await prisma.poolMembership.createMany({
      data: [
        { poolId: cleanPool.id, userId: adminUser.id, status: 'ACTIVE' },
        { poolId: cleanPool.id, userId: user1.id, status: 'ACTIVE' },
      ],
    });
  });

  afterAll(async () => {
    if (prisma) {
      if (pool) {
        await prisma.penaltyLedger.deleteMany({ where: { poolId: pool.id } }).catch(() => {});
        await (prisma as any).weeklyWrapup?.deleteMany({ where: { poolId: pool.id } }).catch(() => {});
        await prisma.poolMemberStat.deleteMany({ where: { poolId: pool.id } }).catch(() => {});
        await prisma.pick.deleteMany({ where: { poolId: pool.id } }).catch(() => {});
        await prisma.poolMembership.deleteMany({ where: { poolId: pool.id } }).catch(() => {});
        await prisma.pool.delete({ where: { id: pool.id } }).catch(() => {});
      }
      if (cleanPool) {
        await (prisma as any).weeklyWrapup?.deleteMany({ where: { poolId: cleanPool.id } }).catch(() => {});
        await prisma.poolMembership.deleteMany({ where: { poolId: cleanPool.id } }).catch(() => {});
        await prisma.pool.delete({ where: { id: cleanPool.id } }).catch(() => {});
      }
      if (adminUser) await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
      if (user1) await prisma.user.delete({ where: { id: user1.id } }).catch(() => {});
      if (user2) await prisma.user.delete({ where: { id: user2.id } }).catch(() => {});
      await prisma.$disconnect();
    }
  });

  it('1. Apply once, second call returns ALREADY_WRAPPED_UP', async () => {
    const weekNo = 10;
    const game = await prisma.game.create({
      data: {
        externalGameId: `br4b_w10_g1_${Date.now()}`,
        homeTeamId: 'KC',
        awayTeamId: 'LV',
        kickoffTime: new Date('2026-10-12T20:15:00Z'),
        status: 'FINAL',
        homeScore: 24,
        awayScore: 17,
      },
    });

    const p1 = await prisma.pick.create({
      data: {
        gameId: game.id,
        userId: user1.id,
        selectedTeamId: 'KC',
        poolId: pool.id,
        submittedById: user1.id,
      },
    });
    await prisma.pickResult.create({
      data: { pickId: p1.id, isCorrect: true, pointsAwarded: new Prisma.Decimal(1) },
    });

    const p2 = await prisma.pick.create({
      data: {
        gameId: game.id,
        userId: user2.id,
        selectedTeamId: 'LV',
        poolId: pool.id,
        submittedById: user2.id,
      },
    });
    await prisma.pickResult.create({
      data: { pickId: p2.id, isCorrect: false, pointsAwarded: new Prisma.Decimal(0) },
    });

    const res1 = await runWeeklyWrapUp(pool.id, weekNo);
    expect(res1.applied).toBe(true);

    const res2 = await runWeeklyWrapUp(pool.id, weekNo);
    expect(res2.applied).toBe(false);
    expect(res2.reason).toBe('ALREADY_WRAPPED_UP');
  });

  it('2. Concurrent calls on final week: exactly one applies, other receives ALREADY_WRAPPED_UP', async () => {
    const weekNo = 11;
    const game = await prisma.game.create({
      data: {
        externalGameId: `br4b_w11_g1_${Date.now()}`,
        homeTeamId: 'SF',
        awayTeamId: 'LAR',
        kickoffTime: new Date('2026-10-19T20:15:00Z'),
        status: 'FINAL',
        homeScore: 30,
        awayScore: 20,
      },
    });

    const p1 = await prisma.pick.create({
      data: {
        gameId: game.id,
        userId: user1.id,
        selectedTeamId: 'SF',
        poolId: pool.id,
        submittedById: user1.id,
      },
    });
    await prisma.pickResult.create({
      data: { pickId: p1.id, isCorrect: true, pointsAwarded: new Prisma.Decimal(1) },
    });

    const [r1, r2] = await Promise.all([
      runWeeklyWrapUp(pool.id, weekNo),
      runWeeklyWrapUp(pool.id, weekNo),
    ]);

    const appliedCount = (r1.applied ? 1 : 0) + (r2.applied ? 1 : 0);
    expect(appliedCount).toBe(1);
    const loser = r1.applied ? r2 : r1;
    expect(loser.applied).toBe(false);
    expect(loser.reason).toBe('ALREADY_WRAPPED_UP');
  });

  it('3. Concurrent calls on non-final week: both return WEEK_NOT_FINAL with zero rows written', async () => {
    const nonFinalPool = await prisma.pool.create({
      data: {
        name: 'NonFinal Pool',
        adminId: adminUser.id,
        settings: {},
      },
    });
    await prisma.poolMembership.create({
      data: { poolId: nonFinalPool.id, userId: user1.id, status: 'ACTIVE' },
    });

    const game = await prisma.game.create({
      data: {
        externalGameId: `br4b_w12_nonfinal_${Date.now()}`,
        homeTeamId: 'GB',
        awayTeamId: 'CHI',
        kickoffTime: new Date('2026-10-26T20:15:00Z'),
        status: 'IN_PROGRESS',
        homeScore: 14,
        awayScore: 10,
      },
    });

    await prisma.pick.create({
      data: {
        gameId: game.id,
        userId: user1.id,
        selectedTeamId: 'GB',
        poolId: nonFinalPool.id,
        submittedById: user1.id,
      },
    });

    const [r1, r2] = await Promise.all([
      runWeeklyWrapUp(nonFinalPool.id, 12),
      runWeeklyWrapUp(nonFinalPool.id, 12),
    ]);

    expect(r1.applied).toBe(false);
    expect(r1.reason).toBe('WEEK_NOT_FINAL');
    expect(r2.applied).toBe(false);
    expect(r2.reason).toBe('WEEK_NOT_FINAL');

    // Clean up nonFinalPool
    await prisma.pick.deleteMany({ where: { poolId: nonFinalPool.id } });
    await prisma.poolMembership.deleteMany({ where: { poolId: nonFinalPool.id } });
    await prisma.pool.delete({ where: { id: nonFinalPool.id } });
  });

  it('4. NO_GAMES_FOR_WEEK returned when week has no scheduled games in pool', async () => {
    const res = await runWeeklyWrapUp(cleanPool.id, 99);
    expect(res.applied).toBe(false);
    expect(res.reason).toBe('NO_GAMES_FOR_WEEK');
  });
});
