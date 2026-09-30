import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { assertDisposableUrl } from '../src/db/safeguards';

const localRehearsalUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pickem_rehearsal';

describe('BR-4 Wrap-Up Concurrency & Claim Idempotency', () => {
  let prisma: PrismaClient;
  const poolId = 'b0000000-0000-0000-0000-000000000001';
  const weekNo = 5;

  beforeAll(async () => {
    assertDisposableUrl(localRehearsalUrl);
    prisma = new PrismaClient({ datasources: { db: { url: localRehearsalUrl } } });

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.weekly_wrapups (
        pool_id UUID NOT NULL,
        week_number INTEGER NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        applied_by UUID NOT NULL,
        CONSTRAINT weekly_wrapups_pkey PRIMARY KEY (pool_id, week_number)
      );
    `);

    await prisma.$executeRawUnsafe(`
      DELETE FROM public.weekly_wrapups WHERE pool_id = '${poolId}' AND week_number = ${weekNo};
    `);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  it('Atomic claim insert: only 1 worker wins the claim; concurrent duplicates get 0 rows / ALREADY_WRAPPED_UP', async () => {
    const adminId = 'a0000000-0000-0000-0000-000000000001';
    
    // Simulate 3 concurrent workers attempting atomic claim insertion
    const claimAttempts = await Promise.all(
      [1, 2, 3].map(async (workerId) => {
        try {
          const insertCount = await prisma.$executeRawUnsafe(`
            INSERT INTO public.weekly_wrapups (pool_id, week_number, applied_by)
            VALUES ('${poolId}', ${weekNo}, '${adminId}')
            ON CONFLICT (pool_id, week_number) DO NOTHING;
          `);
          return { workerId, acquired: insertCount === 1 };
        } catch (e: any) {
          return { workerId, acquired: false, error: e.message };
        }
      })
    );

    const winners = claimAttempts.filter((c) => c.acquired === true);
    const losers = claimAttempts.filter((c) => c.acquired === false);

    console.log('Claim race result:', { winners: winners.length, losers: losers.length, attempts: claimAttempts });

    // Exactly 1 worker must acquire the claim
    expect(winners.length).toBe(1);
    expect(losers.length).toBe(2);
  });
});
