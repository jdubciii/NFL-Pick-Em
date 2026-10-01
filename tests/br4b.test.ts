import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { assertDisposableUrl } from '../src/db/safeguards';
import { runWeeklyWrapUp } from '../src/services/weeklyWrapUp';

const localRehearsalUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pickem_rehearsal';

describe('BR-4b: Fail-Closed Claim Store Invariant (Decision #52)', () => {
  let prisma: PrismaClient;
  let adminUser: any;
  let pool: any;

  beforeAll(async () => {
    assertDisposableUrl(localRehearsalUrl);
    prisma = new PrismaClient({ datasources: { db: { url: localRehearsalUrl } } });

    adminUser = await prisma.user.create({
      data: { email: `br4b_failclosed_${Date.now()}@example.com`, passwordHash: 'hash' },
    });

    pool = await prisma.pool.create({
      data: {
        name: 'BR4b FailClosed Pool',
        adminId: adminUser.id,
        settings: {},
      },
    });

    await prisma.poolMembership.create({
      data: { poolId: pool.id, userId: adminUser.id, status: 'ACTIVE' },
    });
  });

  afterAll(async () => {
    if (prisma) {
      if (pool) {
        await prisma.penaltyLedger.deleteMany({ where: { poolId: pool.id } }).catch(() => {});
        await prisma.poolMemberStat.deleteMany({ where: { poolId: pool.id } }).catch(() => {});
        await prisma.poolMembership.deleteMany({ where: { poolId: pool.id } }).catch(() => {});
        await prisma.pool.delete({ where: { id: pool.id } }).catch(() => {});
      }
      if (adminUser) await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
      await prisma.$disconnect();
    }
  });

  it('Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed', async () => {
    const tableCheck = await prisma.$queryRaw<any[]>`SELECT to_regclass('public.weekly_wrapups')::text as tbl;`;
    if (tableCheck && tableCheck[0] && tableCheck[0].tbl) {
      const res = await runWeeklyWrapUp(pool.id, 99);
      expect(['NO_GAMES_FOR_WEEK', 'WEEK_NOT_FINAL', 'ALREADY_WRAPPED_UP']).toContain(res.reason);
      expect(res.applied).toBe(false);
    } else {
      const res = await runWeeklyWrapUp(pool.id, 1);
      expect(res.applied).toBe(false);
      expect(res.reason).toBe('CLAIM_STORE_UNAVAILABLE');
    }
  });
});
