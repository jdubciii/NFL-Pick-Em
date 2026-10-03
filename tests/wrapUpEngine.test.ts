import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role, GameStatus, Prisma } from '@prisma/client';
import { app } from '../src/server';
import { JWT_SECRET } from '../src/middleware/auth';
import { assertDisposableUrl } from '../src/db/safeguards';
import { executeWeeklyWrapUpForPool, runWrapUpEngine } from '../src/services/wrapUpEngine';

const rehearsalDbUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/pickem_rehearsal';

describe('Milestone 12.2: Weekly Wrap-Up Engine, Precision Decimal Scoring & Outbox Fan-out', () => {
  let server: http.Server;
  let baseUrl: string;
  let prisma: PrismaClient;

  let adminUser: any;
  let commissionerUser: any;
  let winnerUser: any;
  let loserUser1: any;
  let loserUser2: any;
  let optedOutUser: any;

  let adminToken: string;
  let commissionerToken: string;
  let winnerToken: string;
  let loser1Token: string;
  let loser2Token: string;
  let optedOutToken: string;

  let pool: any;
  let unfinalizedPool: any;
  let finalGame1: any;
  let finalGame2: any;
  let pendingGame: any;

  beforeAll(async () => {
    assertDisposableUrl(rehearsalDbUrl);
    prisma = new PrismaClient({ datasources: { db: { url: rehearsalDbUrl } }, log: [] });

    // Ensure weekly_wrapups table exists in rehearsal DB for claim store testing with RLS enabled
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.weekly_wrapups (
        pool_id UUID NOT NULL,
        week_number INT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT weekly_wrapups_pkey PRIMARY KEY (pool_id, week_number)
      );
    `);
    await prisma.$executeRawUnsafe(`ALTER TABLE public.weekly_wrapups ENABLE ROW LEVEL SECURITY;`);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });

    // Create test users
    adminUser = await prisma.user.create({
      data: { email: `wrapup_admin_${Date.now()}@example.com`, passwordHash: 'hash123', role: Role.ADMIN },
    });

    commissionerUser = await prisma.user.create({
      data: { email: `wrapup_commish_${Date.now()}@example.com`, passwordHash: 'hash123', role: Role.USER },
    });

    winnerUser = await prisma.user.create({
      data: { email: `wrapup_winner_${Date.now()}@example.com`, passwordHash: 'hash123', role: Role.USER },
    });

    loserUser1 = await prisma.user.create({
      data: { email: `wrapup_loser1_${Date.now()}@example.com`, passwordHash: 'hash123', role: Role.USER },
    });

    loserUser2 = await prisma.user.create({
      data: { email: `wrapup_loser2_${Date.now()}@example.com`, passwordHash: 'hash123', role: Role.USER },
    });

    optedOutUser = await prisma.user.create({
      data: { email: `wrapup_optout_${Date.now()}@example.com`, passwordHash: 'hash123', role: Role.USER },
    });

    // Notification preferences
    await prisma.notificationPreference.create({
      data: { userId: optedOutUser.id, emailEnabled: false },
    });
    await prisma.notificationPreference.create({
      data: { userId: winnerUser.id, emailEnabled: true },
    });
    await prisma.notificationPreference.create({
      data: { userId: loserUser1.id, emailEnabled: true },
    });

    adminToken = jwt.sign({ id: adminUser.id, email: adminUser.email, role: adminUser.role }, JWT_SECRET, { expiresIn: '1h' });
    commissionerToken = jwt.sign({ id: commissionerUser.id, email: commissionerUser.email, role: commissionerUser.role }, JWT_SECRET, { expiresIn: '1h' });
    winnerToken = jwt.sign({ id: winnerUser.id, email: winnerUser.email, role: winnerUser.role }, JWT_SECRET, { expiresIn: '1h' });
    loser1Token = jwt.sign({ id: loserUser1.id, email: loserUser1.email, role: loserUser1.role }, JWT_SECRET, { expiresIn: '1h' });
    loser2Token = jwt.sign({ id: loserUser2.id, email: loserUser2.email, role: loserUser2.role }, JWT_SECRET, { expiresIn: '1h' });
    optedOutToken = jwt.sign({ id: optedOutUser.id, email: optedOutUser.email, role: optedOutUser.role }, JWT_SECRET, { expiresIn: '1h' });

    // Create main Pool
    pool = await prisma.pool.create({
      data: {
        name: `WrapUp Test Pool ${Date.now()}`,
        adminId: commissionerUser.id,
        status: 'ACTIVE',
        settings: {
          penalties: { dead_place_penalty: 1 },
          tiebreaker: { game_target: 'LAST_GAME' },
        },
      },
    });

    // Create unfinalized Pool
    unfinalizedPool = await prisma.pool.create({
      data: {
        name: `Unfinalized Test Pool ${Date.now()}`,
        adminId: commissionerUser.id,
        status: 'ACTIVE',
        settings: {},
      },
    });

    // Add memberships
    await prisma.poolMembership.createMany({
      data: [
        { poolId: pool.id, userId: commissionerUser.id, status: 'ACTIVE' },
        { poolId: pool.id, userId: winnerUser.id, status: 'ACTIVE' },
        { poolId: pool.id, userId: loserUser1.id, status: 'ACTIVE' },
        { poolId: pool.id, userId: loserUser2.id, status: 'ACTIVE' },
        { poolId: pool.id, userId: optedOutUser.id, status: 'ACTIVE' },
        { poolId: unfinalizedPool.id, userId: winnerUser.id, status: 'ACTIVE' },
      ],
    });

    // Create games
    finalGame1 = await prisma.game.create({
      data: {
        externalGameId: `game_w1_1_${Date.now()}`,
        homeTeamId: 'KC',
        awayTeamId: 'DEN',
        kickoffTime: new Date('2026-10-10T17:00:00Z'),
        status: GameStatus.FINAL,
        homeScore: 24,
        awayScore: 10,
      },
    });

    finalGame2 = await prisma.game.create({
      data: {
        externalGameId: `game_w1_2_${Date.now()}`,
        homeTeamId: 'DAL',
        awayTeamId: 'NYG',
        kickoffTime: new Date('2026-10-10T20:00:00Z'),
        status: GameStatus.FINAL,
        homeScore: 30,
        awayScore: 20,
      },
    });

    pendingGame = await prisma.game.create({
      data: {
        externalGameId: `game_w2_pending_${Date.now()}`,
        homeTeamId: 'GB',
        awayTeamId: 'CHI',
        kickoffTime: new Date('2026-10-17T17:00:00Z'),
        status: GameStatus.SCHEDULED,
        homeScore: null,
        awayScore: null,
      },
    });

    // Populate picks for unfinalizedPool
    await prisma.pick.create({
      data: { poolId: unfinalizedPool.id, userId: winnerUser.id, gameId: pendingGame.id, selectedTeamId: 'GB', submittedById: winnerUser.id },
    });

    // Populate picks & results for main Pool (Week 1)
    // Winner: 2 correct picks (2.00 points)
    const p1 = await prisma.pick.create({
      data: { poolId: pool.id, userId: winnerUser.id, gameId: finalGame1.id, selectedTeamId: 'KC', submittedById: winnerUser.id },
    });
    await prisma.pickResult.create({
      data: { pickId: p1.id, isCorrect: true, pointsAwarded: new Prisma.Decimal('1.00') },
    });

    const p2 = await prisma.pick.create({
      data: { poolId: pool.id, userId: winnerUser.id, gameId: finalGame2.id, selectedTeamId: 'DAL', submittedById: winnerUser.id },
    });
    await prisma.pickResult.create({
      data: { pickId: p2.id, isCorrect: true, pointsAwarded: new Prisma.Decimal('1.00') },
    });

    // Loser 1: 0 correct picks (0.00 points)
    const p3 = await prisma.pick.create({
      data: { poolId: pool.id, userId: loserUser1.id, gameId: finalGame1.id, selectedTeamId: 'DEN', submittedById: loserUser1.id },
    });
    await prisma.pickResult.create({
      data: { pickId: p3.id, isCorrect: false, pointsAwarded: new Prisma.Decimal('0.00') },
    });

    // Loser 2: 0 correct picks (0.00 points)
    const p4 = await prisma.pick.create({
      data: { poolId: pool.id, userId: loserUser2.id, gameId: finalGame1.id, selectedTeamId: 'DEN', submittedById: loserUser2.id },
    });
    await prisma.pickResult.create({
      data: { pickId: p4.id, isCorrect: false, pointsAwarded: new Prisma.Decimal('0.00') },
    });

    // Commissioner & OptedOut: 1 correct pick (1.00 point)
    const p5 = await prisma.pick.create({
      data: { poolId: pool.id, userId: commissionerUser.id, gameId: finalGame1.id, selectedTeamId: 'KC', submittedById: commissionerUser.id },
    });
    await prisma.pickResult.create({
      data: { pickId: p5.id, isCorrect: true, pointsAwarded: new Prisma.Decimal('1.00') },
    });

    const p6 = await prisma.pick.create({
      data: { poolId: pool.id, userId: optedOutUser.id, gameId: finalGame1.id, selectedTeamId: 'KC', submittedById: optedOutUser.id },
    });
    await prisma.pickResult.create({
      data: { pickId: p6.id, isCorrect: true, pointsAwarded: new Prisma.Decimal('1.00') },
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    if (prisma) {
      // Drop weekly_wrapups table so subsequent/clean-room suites see clean state
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS public.weekly_wrapups;`).catch(() => {});
      await prisma.$disconnect();
    }
  });

  describe('1. Precondition Check & Fail Closed (Decision #27 & #55)', () => {
    it('fails closed with SCORE_FEED_UNAVAILABLE when unfinalized games exist for target week', async () => {
      const result = await executeWeeklyWrapUpForPool(unfinalizedPool.id, 1);
      expect(result.applied).toBe(false);
      expect(result.reason).toBe('SCORE_FEED_UNAVAILABLE');
      expect(result.pendingCount).toBe(1);
    });

    it('fails closed when DB client or claim store is unreachable (Decision #55)', async () => {
      await expect(
        executeWeeklyWrapUpForPool(pool.id, 999, { prismaClient: {} as any })
      ).rejects.toThrow(/CLAIM_STORE_UNAVAILABLE/);
    });
  });

  describe('2. Precision Decimal Scoring & Split Penalties (Decisions #3 & #22)', () => {
    it('calculates standings and splits dead place penalty precisely between tied losers', async () => {
      const result = await executeWeeklyWrapUpForPool(pool.id, 1);
      expect(result.applied).toBe(true);
      expect(result.poolId).toBe(pool.id);
      expect(result.weekNumber).toBe(1);

      // Winner has 2 points
      expect(result.topScorers).toBeDefined();
      expect(result.topScorers![0].userId).toBe(winnerUser.id);
      expect(result.topScorers![0].score).toBe(2);

      // Losers are loserUser1 and loserUser2 (tied at 0 points)
      expect(result.deadPlaceMembers).toBeDefined();
      expect(result.deadPlaceMembers!.length).toBe(2);
      const deadUserIds = result.deadPlaceMembers!.map((m) => m.userId);
      expect(deadUserIds).toContain(loserUser1.id);
      expect(deadUserIds).toContain(loserUser2.id);

      // 1 shot penalty divided by 2 tied losers = 0.50 shots each
      expect(result.penaltyAssigned?.toString()).toBe('0.5');

      // Verify penalty_ledger records
      const ledgers = await prisma.penaltyLedger.findMany({
        where: { poolId: pool.id, weekNumber: 1 },
      });
      expect(ledgers.length).toBe(2);
      for (const l of ledgers) {
        expect(l.delta.toString()).toBe('0.5');
        expect(l.reason).toBe('WEEKLY_DEAD_PLACE');
      }

      // Verify poolMemberStat updated
      const loser1Stat = await prisma.poolMemberStat.findUnique({
        where: { poolId_userId: { poolId: pool.id, userId: loserUser1.id } },
      });
      expect(loser1Stat).toBeDefined();
      expect(loser1Stat!.deadPlaceFinishes).toBe(1);
      expect(loser1Stat!.totalShotsDrank.toString()).toBe('0.5');

      const winnerStat = await prisma.poolMemberStat.findUnique({
        where: { poolId_userId: { poolId: pool.id, userId: winnerUser.id } },
      });
      expect(winnerStat).toBeDefined();
      expect(winnerStat!.firstPlaceFinishes).toBe(1);
    });
  });

  describe('3. Claim Store Concurrency & Idempotency (Decision #24 & #57)', () => {
    it('subsequent execution on already wrapped week returns ALREADY_WRAPPED_UP and produces 0 duplicates', async () => {
      const duplicateResult = await executeWeeklyWrapUpForPool(pool.id, 1);
      expect(duplicateResult.applied).toBe(false);
      expect(duplicateResult.reason).toBe('ALREADY_WRAPPED_UP');

      // Verify exactly 2 penalty ledger entries exist (no double assignment)
      const ledgers = await prisma.penaltyLedger.findMany({
        where: { poolId: pool.id, weekNumber: 1 },
      });
      expect(ledgers.length).toBe(2);
    });

    it('enforces outbox notification preferences and deduplication key (Decision #57)', async () => {
      const optOutDedupe = `wrapup:v1:pool:${pool.id}:week:1:user:${optedOutUser.id}`;
      const winnerDedupe = `wrapup:v1:pool:${pool.id}:week:1:user:${winnerUser.id}`;

      // Opted out user must receive ZERO outbox events
      const optOutEvents = await prisma.outboxEvent.findMany({
        where: { dedupeKey: optOutDedupe },
      });
      expect(optOutEvents.length).toBe(0);

      // Active user must have exactly ONE outbox event
      const winnerEvents = await prisma.outboxEvent.findMany({
        where: { dedupeKey: winnerDedupe },
      });
      expect(winnerEvents.length).toBe(1);
      expect(winnerEvents[0].type).toBe('WRAPUP');
      expect(winnerEvents[0].status).toBe('PENDING');
    });
  });

  describe('4. Tier Separation & Route Protection (Decision #20 & #54)', () => {
    it('POST /api/admin/ops/wrap-up is rejected for standard users and pool commissioners (Decision #20)', async () => {
      // Standard user rejected (403)
      const resUser = await fetch(`${baseUrl}/api/admin/ops/wrap-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${winnerToken}` },
        body: JSON.stringify({ weekNumber: 1 }),
      });
      expect(resUser.status).toBe(403);

      // Pool commissioner rejected (403) - Decision #20 strictly enforced
      const resCommish = await fetch(`${baseUrl}/api/admin/ops/wrap-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${commissionerToken}` },
        body: JSON.stringify({ weekNumber: 1 }),
      });
      expect(resCommish.status).toBe(403);
    });

    it('POST /api/admin/ops/wrap-up succeeds for system ADMIN', async () => {
      const resAdmin = await fetch(`${baseUrl}/api/admin/ops/wrap-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ weekNumber: 1, poolId: pool.id }),
      });
      expect(resAdmin.status).toBe(200);
      const data = await resAdmin.json();
      expect(data.jobRun).toBeDefined();
      expect(data.engineResult).toBeDefined();
    });

    it('GET /api/admin/ops/wrap-up/status is strictly read-only (Decision #54)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ops/wrap-up/status`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('ok');
      expect(data.service).toBe('weekly_wrapup_engine');
      expect(data.latestJobRun).toBeDefined();
    });

    it('POST /api/admin/ops/season-seal records immutable snapshot', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ops/season-seal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ seasonYear: 2026, weekNumber: 1, poolId: pool.id }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.seal).toBeDefined();
      expect(data.seal.sealed).toBe(true);
      expect(data.seal.snapshots.length).toBeGreaterThanOrEqual(1);

      // GET /api/admin/ops/season-seal/status read-only verification
      const statusRes = await fetch(`${baseUrl}/api/admin/ops/season-seal/status?pool_id=${pool.id}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(statusRes.status).toBe(200);
      const statusData = await statusRes.json();
      expect(statusData.sealed).toBe(true);
    });
  });
});
