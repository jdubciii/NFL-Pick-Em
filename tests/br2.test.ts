import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { assertDisposableUrl } from '../src/db/safeguards';

const localRehearsalUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pickem_rehearsal';

describe('BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix', () => {
  let prisma: PrismaClient;

  const publicTables = [
    'users',
    'pools',
    'pool_memberships',
    'pool_member_stats',
    'games',
    'picks',
    'pick_results',
    'weekly_submissions',
    'penalty_ledger',
    'penalty_media',
    'audit_logs',
    'weekly_wrapups',
  ];

  beforeAll(async () => {
    assertDisposableUrl(localRehearsalUrl);
    prisma = new PrismaClient({ datasources: { db: { url: localRehearsalUrl } } });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  it('BR-2b/2c: asserts RLS is ENABLED (relrowsecurity=true) and relforcerowsecurity=false on all application public tables', async () => {
    const rlsResults = await prisma.$queryRawUnsafe<any[]>(`
      SELECT relname, relrowsecurity, relforcerowsecurity
      FROM pg_class
      JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
      WHERE pg_namespace.nspname = 'public' AND relkind IN ('r', 'p')
      ORDER BY relname;
    `);

    expect(rlsResults.length).toBeGreaterThanOrEqual(11);

    for (const row of rlsResults) {
      expect(row.relrowsecurity, `Table ${row.relname} must have relrowsecurity = true`).toBe(true);
      expect(row.relforcerowsecurity, `Table ${row.relname} must have relforcerowsecurity = false`).toBe(false);
    }
  });

  it('BR-2b/2c: asserts anon role is denied SELECT (SQLSTATE 42501) across all public tables', async () => {
    const tables = await prisma.$queryRawUnsafe<any[]>(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public';
    `);

    for (const t of tables) {
      await expect(
        prisma.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(`SET LOCAL ROLE anon;`);
          return await tx.$queryRawUnsafe(`SELECT * FROM public."${t.tablename}" LIMIT 1;`);
        })
      ).rejects.toThrow(/(42501|permission denied)/);
    }
  });

  it('BR-2b/2c: asserts authenticated role is denied SELECT (SQLSTATE 42501) across all public tables', async () => {
    const tables = await prisma.$queryRawUnsafe<any[]>(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public';
    `);

    for (const t of tables) {
      await expect(
        prisma.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(`SET LOCAL ROLE authenticated;`);
          return await tx.$queryRawUnsafe(`SELECT * FROM public."${t.tablename}" LIMIT 1;`);
        })
      ).rejects.toThrow(/(42501|permission denied)/);
    }
  });

  it('BR-2b: asserts anon role is denied UPDATE on penalty_ledger with SQLSTATE 42501 (privilege proof)', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL ROLE anon;`);
        return await tx.$executeRawUnsafe(`UPDATE public.penalty_ledger SET delta = 1 WHERE true;`);
      })
    ).rejects.toThrow(/(42501|permission denied)/);
  });

  it('BR-2c: asserts has_function_privilege returns false for anon and authenticated on BR-1 trigger functions', async () => {
    const funcs = await prisma.$queryRawUnsafe<any[]>(`
      SELECT proname, oid FROM pg_proc
      WHERE pronamespace = 'public'::regnamespace AND proname LIKE '%prevent%';
    `);

    expect(funcs.length).toBeGreaterThanOrEqual(2);

    for (const fn of funcs) {
      const privs = await prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          has_function_privilege('anon', ${fn.oid}, 'execute') AS anon_priv,
          has_function_privilege('authenticated', ${fn.oid}, 'execute') AS auth_priv;
      `);

      expect(privs[0].anon_priv, `anon must not have execute privilege on ${fn.proname}`).toBe(false);
      expect(privs[0].auth_priv, `authenticated must not have execute privilege on ${fn.proname}`).toBe(false);
    }
  });
});
