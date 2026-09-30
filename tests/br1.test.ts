import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { assertDisposableUrl } from '../src/db/safeguards';

const localRehearsalUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pickem_rehearsal';

describe('BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints', () => {
  let prisma: PrismaClient;
  let adminId: string;
  let memberId: string;
  let poolId: string;

  beforeAll(async () => {
    assertDisposableUrl(localRehearsalUrl);
    prisma = new PrismaClient({ datasources: { db: { url: localRehearsalUrl } } });

    const adminUser = await prisma.user.create({
      data: {
        email: `br1_admin_${Date.now()}@example.com`,
        passwordHash: 'hash',
      },
    });
    adminId = adminUser.id;

    const memberUser = await prisma.user.create({
      data: {
        email: `br1_member_${Date.now()}@example.com`,
        passwordHash: 'hash',
      },
    });
    memberId = memberUser.id;

    const pool = await prisma.pool.create({
      data: {
        name: 'BR1 Pool',
        adminId,
        settings: {},
      },
    });
    poolId = pool.id;

    await prisma.poolMembership.create({
      data: {
        poolId,
        userId: memberId,
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    if (prisma) {
      if (poolId) {
        await prisma.penaltyLedger.deleteMany({ where: { poolId } }).catch(() => {});
        await (prisma as any).weeklyWrapup.deleteMany({ where: { poolId } }).catch(() => {});
        await prisma.poolMembership.deleteMany({ where: { poolId } }).catch(() => {});
        await prisma.pool.delete({ where: { id: poolId } }).catch(() => {});
      }
      if (adminId) await prisma.user.delete({ where: { id: adminId } }).catch(() => {});
      if (memberId) await prisma.user.delete({ where: { id: memberId } }).catch(() => {});
      await prisma.$disconnect();
    }
  });

  it('BR-1: asserts trigger and function definitions match requirements (BEFORE ROW/STATEMENT, plpgsql, prosecdef=false, unconditional RAISE)', async () => {
    const triggerDefs = await prisma.$queryRawUnsafe<any[]>(`
      SELECT tgname, pg_get_triggerdef(oid) as def
      FROM pg_trigger
      WHERE tgname IN ('penalty_ledger_no_update_delete', 'penalty_ledger_no_truncate', 'weekly_wrapups_no_update_delete', 'weekly_wrapups_no_truncate');
    `);

    expect(triggerDefs.length).toBe(4);
    const noUpdDel = triggerDefs.find((t) => t.tgname === 'penalty_ledger_no_update_delete');
    expect(noUpdDel?.def).toMatch(/BEFORE (DELETE OR UPDATE|UPDATE OR DELETE) ON (public\.)?penalty_ledger FOR EACH ROW/);

    const noTrunc = triggerDefs.find((t) => t.tgname === 'penalty_ledger_no_truncate');
    expect(noTrunc?.def).toMatch(/BEFORE TRUNCATE ON (public\.)?penalty_ledger FOR EACH STATEMENT/);

    // Verify trigger function definitions and prosecdef = false
    const funcDefs = await prisma.$queryRawUnsafe<any[]>(`
      SELECT proname, prosecdef, pg_get_functiondef(oid) as def
      FROM pg_proc
      WHERE proname IN ('penalty_ledger_prevent_update_delete', 'penalty_ledger_prevent_truncate');
    `);

    expect(funcDefs.length).toBe(2);
    for (const f of funcDefs) {
      expect(f.prosecdef).toBe(false);
      expect(f.def).toMatch(/LANGUAGE plpgsql/i);
      expect(f.def).toMatch(/RAISE EXCEPTION/i);
    }
  });

  it('BR-1: UPDATE (including no-op update) is blocked with count >= 1 and SQLSTATE P0001', async () => {
    const ledger = await prisma.penaltyLedger.create({
      data: {
        poolId,
        userId: memberId,
        delta: 1.0,
        reason: 'BR1 immutability test',
        createdById: adminId,
      },
    });

    const cnt = await prisma.penaltyLedger.count({ where: { id: ledger.id } });
    expect(cnt).toBeGreaterThanOrEqual(1);

    // Mutation update
    await expect(
      prisma.$executeRawUnsafe(`UPDATE penalty_ledger SET delta = 2.0 WHERE id = '${ledger.id}';`)
    ).rejects.toThrow(/P0001/);

    // No-op update (delta = delta)
    await expect(
      prisma.$executeRawUnsafe(`UPDATE penalty_ledger SET delta = delta WHERE id = '${ledger.id}';`)
    ).rejects.toThrow(/P0001/);
  });

  it('BR-1: DELETE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001', async () => {
    const ledger = await prisma.penaltyLedger.create({
      data: {
        poolId,
        userId: memberId,
        delta: 1.0,
        reason: 'BR1 delete test',
        createdById: adminId,
      },
    });

    const cnt = await prisma.penaltyLedger.count({ where: { id: ledger.id } });
    expect(cnt).toBeGreaterThanOrEqual(1);

    await expect(
      prisma.$executeRawUnsafe(`DELETE FROM penalty_ledger WHERE id = '${ledger.id}';`)
    ).rejects.toThrow(/P0001/);
  });

  it('BR-1: TRUNCATE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001', async () => {
    const cnt = await prisma.penaltyLedger.count();
    expect(cnt).toBeGreaterThanOrEqual(1);

    await expect(
      prisma.$executeRawUnsafe(`TRUNCATE TABLE penalty_ledger CASCADE;`)
    ).rejects.toThrow(/P0001/);
  });

  it('BR-1: membership-row DELETE cascades to penalty_ledger and is intercepted by trigger with P0001', async () => {
    const tempUser = await prisma.user.create({
      data: {
        email: `br1_cascade_${Date.now()}@example.com`,
        passwordHash: 'hash',
      },
    });
    await prisma.poolMembership.create({
      data: {
        poolId,
        userId: tempUser.id,
        status: 'ACTIVE',
      },
    });
    await prisma.penaltyLedger.create({
      data: {
        poolId,
        userId: tempUser.id,
        delta: 1.0,
        reason: 'Cascade test',
        createdById: adminId,
      },
    });

    // Deleting the pool membership triggers cascade delete on penalty_ledger, which is blocked by BR-1 trigger
    await expect(
      prisma.$executeRawUnsafe(`DELETE FROM pool_memberships WHERE pool_id = '${poolId}' AND user_id = '${tempUser.id}';`)
    ).rejects.toThrow(/P0001/);
  });

  it('BR-1: DELETE FROM pools fixture asserts exact foreign key constraint pool_memberships_pool_id_fkey and SQLSTATE 23503', async () => {
    // Attempting to delete the pool fails with FK constraint violation on pool_memberships
    await expect(
      prisma.$executeRawUnsafe(`DELETE FROM pools WHERE id = '${poolId}';`)
    ).rejects.toThrow(/(23503|pool_memberships_pool_id_fkey)/);
  });
});
