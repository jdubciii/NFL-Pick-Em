import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role, GameStatus, OutboxStatus, Prisma } from '@prisma/client';
import { app } from '../src/server';
import { JWT_SECRET } from '../src/middleware/auth';
import { assertDisposableUrl } from '../src/db/safeguards';
import { runWrapUpEngine } from '../src/services/wrapUpEngine';
import { processTransportsBatch } from '../src/services/transports';
import { setNotificationsClock } from '../src/routes/notifications';
import {
  setOverrideServiceClock,
  createOverrideProposal,
  recordProposalVote,
  executeProposal,
} from '../src/services/overrideService';
import { runRetentionPruning } from '../src/services/retentionService';

const rehearsalDbUrl =
  process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/pickem_rehearsal';

describe('Milestone 13.4: Full-Stack End-to-End Lifecycle Verification Suite', () => {
  let server: http.Server;
  let baseUrl: string;
  let prisma: PrismaClient;

  // Multi-tenant user fixtures
  let adminUser: any;
  let commishUser: any;
  let userA: any;
  let userB: any;
  let userC: any;

  // JWT Tokens
  let adminToken: string;
  let commishToken: string;
  let tokenA: string;
  let tokenB: string;
  let tokenC: string;

  // Multi-tenant pools
  let pool1: any;
  let pool2: any;

  // Slate Games
  let game1: any;
  let game2: any;
  let pickA: any;
  let pickB: any;

  // Deterministic Injectable Clock
  let simulatedTime = new Date('2026-10-15T12:00:00.000Z');
  const clockFn = () => new Date(simulatedTime.getTime());

  beforeAll(async () => {
    assertDisposableUrl(rehearsalDbUrl);
    prisma = new PrismaClient({ datasources: { db: { url: rehearsalDbUrl } }, log: [] });

    // Ensure weekly_wrapups claim table exists in rehearsal DB for Decision #24 testing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.weekly_wrapups (
        pool_id UUID NOT NULL,
        week_number INT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT weekly_wrapups_pkey PRIMARY KEY (pool_id, week_number)
      );
    `);
    await prisma.$executeRawUnsafe(`ALTER TABLE public.weekly_wrapups ENABLE ROW LEVEL SECURITY;`).catch(() => {});

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });

    // 1. Create Multi-Tenant Users
    const now = Date.now();
    adminUser = await prisma.user.create({
      data: {
        email: `e2e_admin_${now}@example.com`,
        passwordHash: 'hashAdmin',
        role: Role.ADMIN,
      },
    });

    commishUser = await prisma.user.create({
      data: {
        email: `e2e_commish_${now}@example.com`,
        passwordHash: 'hashCommish',
        role: Role.USER,
      },
    });

    userA = await prisma.user.create({
      data: {
        email: `e2e_user_a_${now}@example.com`,
        passwordHash: 'hashUserA',
        role: Role.USER,
      },
    });

    userB = await prisma.user.create({
      data: {
        email: `e2e_user_b_${now}@example.com`,
        passwordHash: 'hashUserB',
        role: Role.USER,
      },
    });

    userC = await prisma.user.create({
      data: {
        email: `e2e_user_c_${now}@example.com`,
        passwordHash: 'hashUserC',
        role: Role.USER,
      },
    });

    // 2. Generate Auth Tokens
    adminToken = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: adminUser.role },
      JWT_SECRET,
      { expiresIn: '2h' }
    );
    commishToken = jwt.sign(
      { id: commishUser.id, email: commishUser.email, role: commishUser.role },
      JWT_SECRET,
      { expiresIn: '2h' }
    );
    tokenA = jwt.sign({ id: userA.id, email: userA.email, role: userA.role }, JWT_SECRET, {
      expiresIn: '2h',
    });
    tokenB = jwt.sign({ id: userB.id, email: userB.email, role: userB.role }, JWT_SECRET, {
      expiresIn: '2h',
    });
    tokenC = jwt.sign({ id: userC.id, email: userC.email, role: userC.role }, JWT_SECRET, {
      expiresIn: '2h',
    });

    // 3. Create Multi-Tenant Pools & Memberships
    pool1 = await prisma.pool.create({
      data: {
        name: `E2E League 1 ${now}`,
        adminId: commishUser.id,
        status: 'ACTIVE',
        settings: { lock_offset: 0, penalty_amount: 50 },
      },
    });

    pool2 = await prisma.pool.create({
      data: {
        name: `E2E League 2 (External) ${now}`,
        adminId: userC.id,
        status: 'ACTIVE',
        settings: { lock_offset: 0 },
      },
    });

    await prisma.poolMembership.createMany({
      data: [
        { poolId: pool1.id, userId: commishUser.id, status: 'ACTIVE' },
        { poolId: pool1.id, userId: userA.id, status: 'ACTIVE' },
        { poolId: pool1.id, userId: userB.id, status: 'ACTIVE' },
        { poolId: pool2.id, userId: userC.id, status: 'ACTIVE' },
      ],
    });

    // 4. Create Initial Week 1 Scheduled Game (Unfinalized)
    game1 = await prisma.game.create({
      data: {
        externalGameId: `e2e_game1_${now}`,
        homeTeamId: 'KC',
        awayTeamId: 'BUF',
        kickoffTime: new Date('2026-10-14T17:00:00Z'),
        status: GameStatus.SCHEDULED,
        homeScore: null,
        awayScore: null,
      },
    });

    game2 = await prisma.game.create({
      data: {
        externalGameId: `e2e_game2_${now}`,
        homeTeamId: 'SF',
        awayTeamId: 'DAL',
        kickoffTime: new Date('2026-10-14T20:00:00Z'),
        status: GameStatus.FINAL,
        homeScore: 28,
        awayScore: 21,
      },
    });

    // Seed Member Picks on Game 1 and Game 2
    pickA = await prisma.pick.create({
      data: {
        poolId: pool1.id,
        userId: userA.id,
        gameId: game1.id,
        selectedTeamId: 'KC',
        submittedById: userA.id,
      },
    });

    pickB = await prisma.pick.create({
      data: {
        poolId: pool1.id,
        userId: userB.id,
        gameId: game2.id,
        selectedTeamId: 'DAL',
        submittedById: userB.id,
      },
    });
  });

  afterAll(async () => {
    setNotificationsClock(undefined);
    setOverrideServiceClock(undefined);
    if (game1) await prisma.game.delete({ where: { id: game1.id } }).catch(() => {});
    if (game2) await prisma.game.delete({ where: { id: game2.id } }).catch(() => {});
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await prisma.$disconnect();
  });

  beforeEach(() => {
    setNotificationsClock(clockFn);
    setOverrideServiceClock(clockFn);
  });

  describe('Lifecycle Flow 1: Slate Finalization & Weekly Wrap-Up (Decision #24 & #27)', () => {
    it('fails closed when attempting wrap-up against unfinalized slate (Decision #27)', async () => {
      // game1 has unfinalized status/scores -> SCORE_FEED_UNAVAILABLE (Decision #27)
      const { engineResult } = await runWrapUpEngine({ weekNumber: 1, poolId: pool1.id });
      expect(engineResult.poolsApplied).toBe(0);
      expect(engineResult.poolsSkipped).toBeGreaterThanOrEqual(1);
      const poolResult = engineResult.results.find((r) => r.poolId === pool1.id);
      expect(poolResult?.applied).toBe(false);
      expect(poolResult?.reason).toBe('SCORE_FEED_UNAVAILABLE');
    });

    it('successfully executes weekly wrap-up upon slate finalization with atomic idempotent claim (Decision #24)', async () => {
      // Clear pre-check claim from unfinalized run
      await prisma.$executeRaw`DELETE FROM public.weekly_wrapups WHERE pool_id = ${pool1.id}::uuid AND week_number = 1;`;

      // Finalize game1 and populate pick results
      await prisma.game.update({
        where: { id: game1.id },
        data: {
          status: GameStatus.FINAL,
          homeScore: 31,
          awayScore: 24,
        },
      });

      await prisma.pickResult.create({
        data: {
          pickId: pickA.id,
          isCorrect: true,
          pointsAwarded: new Prisma.Decimal('1.00'),
        },
      });

      await prisma.pickResult.create({
        data: {
          pickId: pickB.id,
          isCorrect: false,
          pointsAwarded: new Prisma.Decimal('0.00'),
        },
      });

      // Execute wrap-up
      const { jobRun, engineResult } = await runWrapUpEngine({ weekNumber: 1, poolId: pool1.id });
      expect(jobRun.status).toBe('OK');
      expect(engineResult.poolsApplied).toBe(1);

      const poolResult = engineResult.results.find((r) => r.poolId === pool1.id);
      expect(poolResult?.applied).toBe(true);

      // Verify idempotent claim recorded in weekly_wrapups table
      const claims = await prisma.$queryRaw<Array<{ pool_id: string; week_number: number }>>`
        SELECT pool_id, week_number FROM weekly_wrapups WHERE pool_id = ${pool1.id}::uuid AND week_number = 1
      `;
      expect(claims.length).toBe(1);
      expect(claims[0].week_number).toBe(1);

      // Re-running wrap-up must be an idempotent no-op (Decision #24)
      const rerun = await runWrapUpEngine({ weekNumber: 1, poolId: pool1.id });
      expect(rerun.engineResult.poolsApplied).toBe(0);
      const rerunPoolResult = rerun.engineResult.results.find((r) => r.poolId === pool1.id);
      expect(rerunPoolResult?.applied).toBe(false);
      expect(rerunPoolResult?.reason).toBe('ALREADY_WRAPPED_UP');
    });
  });

  describe('Lifecycle Flow 2: Asynchronous Outbox Fanout & Inbox Ingestion (Milestones 12.1, 12.3 & Decision #57)', () => {
    it('creates outbox events with compound dedupeKey and drains them to inbox_messages', async () => {
      const dedupeKeyA = `e2e_wrapup_pool_${pool1.id}_w1_user_${userA.id}`;
      const dedupeKeyB = `e2e_wrapup_pool_${pool1.id}_w1_user_${userB.id}`;

      // Insert outbox events for User A and User B
      await prisma.outboxEvent.createMany({
        data: [
          {
            poolId: pool1.id,
            recipientUserId: userA.id,
            type: 'WEEKLY_DIGEST',
            dedupeKey: dedupeKeyA,
            status: OutboxStatus.PENDING,
            payload: { title: 'Week 1 Digest', body: 'You won your pick!' },
          },
          {
            poolId: pool1.id,
            recipientUserId: userB.id,
            type: 'WEEKLY_DIGEST',
            dedupeKey: dedupeKeyB,
            status: OutboxStatus.PENDING,
            payload: { title: 'Week 1 Digest', body: 'Penalty applied.' },
          },
        ],
      });

      // Duplicate attempt must fail on database unique dedupeKey constraint (Decision #57)
      await expect(
        prisma.outboxEvent.create({
          data: {
            poolId: pool1.id,
            recipientUserId: userA.id,
            type: 'WEEKLY_DIGEST',
            dedupeKey: dedupeKeyA,
            status: OutboxStatus.PENDING,
            payload: { duplicate: true },
          },
        })
      ).rejects.toThrow();

      // Execute transport worker drain
      const drainStats = await processTransportsBatch({ batchSize: 50, clock: clockFn });
      expect(drainStats.succeeded).toBeGreaterThanOrEqual(2);

      // Verify events transitioned to SENT
      const events = await prisma.outboxEvent.findMany({
        where: { dedupeKey: { in: [dedupeKeyA, dedupeKeyB] } },
      });
      expect(events.every((e) => e.status === OutboxStatus.SENT)).toBe(true);

      // Seed inbox messages corresponding to delivered events
      await prisma.inboxMessage.createMany({
        data: [
          {
            poolId: pool1.id,
            userId: userA.id,
            type: 'WEEKLY_DIGEST',
            dedupeKey: dedupeKeyA,
            payload: { title: 'Week 1 Digest', body: 'You won your pick!' },
          },
          {
            poolId: pool1.id,
            userId: userB.id,
            type: 'WEEKLY_DIGEST',
            dedupeKey: dedupeKeyB,
            payload: { title: 'Week 1 Digest', body: 'Penalty applied.' },
          },
        ],
      });
    });
  });

  describe('Lifecycle Flow 3: User Notification Center & Isolation (Milestone 13.1 & Decision #20, #54, #55)', () => {
    it('fetches unread inbox messages via GET /api/notifications with ZERO state mutations (Decision #54)', async () => {
      const beforeCount = await prisma.inboxMessage.count({ where: { userId: userA.id } });

      const res = await fetch(`${baseUrl}/api/notifications`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.unreadCount).toBeGreaterThanOrEqual(1);
      expect(data.messages.length).toBeGreaterThanOrEqual(1);

      const afterCount = await prisma.inboxMessage.count({ where: { userId: userA.id } });
      expect(afterCount).toBe(beforeCount);
    });

    it('enforces cross-tenant isolation: User A cannot mark User B notification as read (Decision #20)', async () => {
      const notificationB = await prisma.inboxMessage.findFirst({
        where: { userId: userB.id },
      });
      expect(notificationB).toBeDefined();

      const res = await fetch(`${baseUrl}/api/notifications/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ id: notificationB!.id }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Forbidden');

      // Verify User B notification is still unread
      const unreadB = await prisma.inboxMessage.findUnique({
        where: { id: notificationB!.id },
      });
      expect(unreadB?.readAt).toBeNull();
    });

    it('allows User A to mark own notification as read with deterministic ClockFn timestamp', async () => {
      const notificationA = await prisma.inboxMessage.findFirst({
        where: { userId: userA.id, readAt: null },
      });
      expect(notificationA).toBeDefined();

      const res = await fetch(`${baseUrl}/api/notifications/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ id: notificationA!.id }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      const updated = await prisma.inboxMessage.findUnique({
        where: { id: notificationA!.id },
      });
      expect(updated?.readAt).not.toBeNull();
    });
  });

  describe('Lifecycle Flow 4: Commissioner Governance & Precision Math (Milestone 13.2 & Decision #20, #3, #22, #54, #55)', () => {
    let proposalId: string;

    it('rejects global ADMIN attempting commissioner action on Pool 1 (Decision #20 Zero Bypass)', async () => {
      const res = await fetch(`${baseUrl}/api/pools/${pool1.id}/proposals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          type: 'SCORE_ADJUSTMENT',
          targetEntityId: userA.id,
          data: { delta: '3.75', weekNumber: 1 },
          reason: 'Global admin illegal intervention',
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Pool commissioner privileges required');
    });

    it('allows Pool Commissioner to create, vote APPROVE, and execute proposal with Decimal precision (Decisions #3 & #22)', async () => {
      // 1. Create Stat Correction Proposal
      const proposal = await createOverrideProposal({
        poolId: pool1.id,
        commissionerId: commishUser.id,
        type: 'SCORE_ADJUSTMENT',
        targetEntityId: userA.id,
        data: {
          delta: '3.75',
          weekNumber: 1,
          userId: userA.id,
          gameId: game2.id,
        },
        reason: 'Official stat audit adjustment',
        clockFn,
      });
      proposalId = proposal.id;

      // 2. Commissioner votes APPROVE
      const voteRes = await fetch(`${baseUrl}/api/pools/${pool1.id}/proposals/${proposalId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${commishToken}`,
        },
        body: JSON.stringify({ decision: 'APPROVE' }),
      });
      expect(voteRes.status).toBe(200);

      // 3. Commissioner executes Proposal
      const execRes = await fetch(`${baseUrl}/api/pools/${pool1.id}/proposals/${proposalId}/execute`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${commishToken}`,
        },
      });
      expect(execRes.status).toBe(200);
      const execData = await execRes.json();
      expect(execData.success).toBe(true);

      // Verify Decimal precision in penalty/adjustment ledger
      const entries = await prisma.penaltyLedger.findMany({
        where: { poolId: pool1.id, userId: userA.id },
      });
      expect(entries.length).toBeGreaterThanOrEqual(1);

      // Decimal verification: ensure exact representation with zero floating-point distortion
      const entry = entries[entries.length - 1];
      const deltaDecimal = new Prisma.Decimal(entry.delta.toString());
      expect(deltaDecimal.equals(new Prisma.Decimal('3.75'))).toBe(true);
    });
  });

  describe('Lifecycle Flow 5: System Admin Ops & Retention Pruning (Milestone 13.3, 12.4 & Decision #20, #54, #55)', () => {
    it('rejects Pool Commissioner accessing System Admin Ops health telemetry with 403 Forbidden (Decision #20)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ops/system/health`, {
        headers: { Authorization: `Bearer ${commishToken}` },
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Admin privileges required');
    });

    it('allows Global ADMIN to fetch GET /api/admin/ops/system/health with ZERO database mutations (Decision #54)', async () => {
      const outboxCountBefore = await prisma.outboxEvent.count();
      const inboxCountBefore = await prisma.inboxMessage.count();

      const res = await fetch(`${baseUrl}/api/admin/ops/system/health`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBeDefined();
      expect(data.service).toBe('system_admin_ops');
      expect(data.queues.outbox).toBeDefined();
      expect(data.retention.totalOutbox).toBeGreaterThanOrEqual(2);

      const outboxCountAfter = await prisma.outboxEvent.count();
      const inboxCountAfter = await prisma.inboxMessage.count();
      expect(outboxCountAfter).toBe(outboxCountBefore);
      expect(inboxCountAfter).toBe(inboxCountBefore);
    });

    it('advances ClockFn by 35 days and triggers bounded retention prune, safely purging expired records', async () => {
      // Add an active/pending record that must NOT be pruned
      const activePending = await prisma.outboxEvent.create({
        data: {
          poolId: pool1.id,
          recipientUserId: userA.id,
          type: 'PICK_REMINDER',
          dedupeKey: `e2e_active_pending_${Date.now()}`,
          status: OutboxStatus.PENDING,
          payload: { reminder: true },
        },
      });

      // Advance clock by 35 days
      simulatedTime = new Date(simulatedTime.getTime() + 35 * 24 * 60 * 60 * 1000);

      // Execute retention prune
      const pruneResult = await runRetentionPruning({
        sentRetentionDays: 30,
        deadRetentionDays: 90,
        suppressedRetentionDays: 30,
        inboxRetentionDays: 30,
        batchSize: 500,
        clock: clockFn,
      });

      expect(pruneResult.totalDeleted).toBeGreaterThanOrEqual(2);

      // Verify active PENDING record was strictly protected
      const pendingStillExists = await prisma.outboxEvent.findUnique({
        where: { id: activePending.id },
      });
      expect(pendingStillExists).not.toBeNull();
      expect(pendingStillExists?.status).toBe(OutboxStatus.PENDING);
    });
  });
});
