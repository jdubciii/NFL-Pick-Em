import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import http from 'http';
import jwt from 'jsonwebtoken';
import { Role, OutboxStatus } from '@prisma/client';
import prisma from '../src/db/client';
import { app } from '../src/server';
import { JWT_SECRET } from '../src/middleware/auth';
import {
  processTransportsBatch,
  calculateBackoffSeconds,
  calculateNextAttemptAt,
  MockTransportAdapter,
  ConsoleTransportAdapter,
  getTransportsQueueStatus,
  ClockFn,
} from '../src/services/transports';
import { enqueueNotification } from '../src/services/notifications';

describe('Milestone 12.3: Notification Transports, Retry Engine & DLQ', () => {
  let server: http.Server;
  let baseUrl: string;

  let adminUser: any;
  let commissionerUser: any;
  let regularUser: any;

  let adminToken: string;
  let commissionerToken: string;
  let regularToken: string;

  let testPool: any;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });

    // Create test users
    adminUser = await prisma.user.create({
      data: {
        email: `transports_admin_${Date.now()}@example.com`,
        passwordHash: 'hash',
        role: Role.ADMIN,
      },
    });

    commissionerUser = await prisma.user.create({
      data: {
        email: `transports_commish_${Date.now()}@example.com`,
        passwordHash: 'hash',
        role: Role.USER,
      },
    });

    regularUser = await prisma.user.create({
      data: {
        email: `transports_user_${Date.now()}@example.com`,
        passwordHash: 'hash',
        role: Role.USER,
      },
    });

    adminToken = jwt.sign({ id: adminUser.id, email: adminUser.email, role: Role.ADMIN }, JWT_SECRET, { expiresIn: '1h' });
    commissionerToken = jwt.sign({ id: commissionerUser.id, email: commissionerUser.email, role: Role.USER }, JWT_SECRET, { expiresIn: '1h' });
    regularToken = jwt.sign({ id: regularUser.id, email: regularUser.email, role: Role.USER }, JWT_SECRET, { expiresIn: '1h' });

    testPool = await prisma.pool.create({
      data: {
        name: `Transports Test Pool ${Date.now()}`,
        adminId: commissionerUser.id,
        settings: {},
      },
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.outboxEvent.deleteMany({});
    await prisma.inboxMessage.deleteMany({});
    await prisma.notificationPreference.deleteMany({});
    await prisma.jobRun.deleteMany({});
  });

  describe('1. Exponential Backoff & Injectable Clock Unit Tests', () => {
    it('calculates deterministic exponential backoff intervals without jitter or drift', () => {
      // baseInterval = 60s, exponent = 2
      // attempt 1: 60 * 2^0 = 60s
      // attempt 2: 60 * 2^1 = 120s
      // attempt 3: 60 * 2^2 = 240s
      // attempt 4: 60 * 2^3 = 480s
      // attempt 5: 60 * 2^4 = 960s
      expect(calculateBackoffSeconds(1, 60, 2)).toBe(60);
      expect(calculateBackoffSeconds(2, 60, 2)).toBe(120);
      expect(calculateBackoffSeconds(3, 60, 2)).toBe(240);
      expect(calculateBackoffSeconds(4, 60, 2)).toBe(480);
      expect(calculateBackoffSeconds(5, 60, 2)).toBe(960);
    });

    it('injectable ClockFn allows instant time progression without setTimeout', () => {
      const baseTime = new Date('2026-10-01T12:00:00.000Z');
      let simulatedTime = new Date(baseTime.getTime());
      const mockClock: ClockFn = () => simulatedTime;

      const next1 = calculateNextAttemptAt(1, mockClock, 60, 2);
      expect(next1.toISOString()).toBe('2026-10-01T12:01:00.000Z');

      // Advance clock by 1 minute
      simulatedTime = new Date(simulatedTime.getTime() + 60 * 1000);
      const next2 = calculateNextAttemptAt(2, mockClock, 60, 2);
      expect(next2.toISOString()).toBe('2026-10-01T12:03:00.000Z');
    });
  });

  describe('2. State Machine, Delivery & Dead-Letter Queue (DLQ) Transitions', () => {
    it('successful transport delivery transitions status PENDING -> PROCESSING -> SENT', async () => {
      const mockAdapter = new MockTransportAdapter();
      const dedupeKey = `transports-ok-${Date.now()}`;

      await prisma.$transaction(async (tx) => {
        await enqueueNotification(tx, {
          poolId: testPool.id,
          userId: regularUser.id,
          type: 'PICK_REMINDER',
          payload: {
            poolName: testPool.name,
            windowLabel: 'Sunday Early',
            lockAtUtc: new Date().toISOString(),
            deepLink: `/pools/${testPool.id}/picks`,
          },
          dedupeKey,
          channels: ['EMAIL'],
        });
      });

      const result = await processTransportsBatch({ adapter: mockAdapter });
      expect(result.processed).toBe(1);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.dead).toBe(0);

      expect(mockAdapter.sentMessages).toHaveLength(1);
      expect(mockAdapter.sentMessages[0].to).toBe(regularUser.email);
      expect(mockAdapter.sentMessages[0].dedupeKey).toBe(dedupeKey);

      const event = await prisma.outboxEvent.findUnique({ where: { dedupeKey } });
      expect(event?.status).toBe(OutboxStatus.SENT);
      expect(event?.sentAt).toBeDefined();
      expect(event?.leaseExpiresAt).toBeNull();
      expect(event?.lastErrorCode).toBeNull();
    });

    it('transient failure increments attempts, records diagnostic JSON and sets future backoff', async () => {
      const mockAdapter = new MockTransportAdapter();
      mockAdapter.shouldFail = true;
      mockAdapter.failPermanent = false;
      mockAdapter.failError = 'Network timeout connecting to provider API';

      const baseTime = new Date('2026-10-01T12:00:00.000Z');
      const mockClock: ClockFn = () => baseTime;
      const dedupeKey = `transports-transient-${Date.now()}`;

      await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: regularUser.id,
          type: 'PICK_REMINDER',
          payload: { poolName: testPool.name },
          dedupeKey,
          status: OutboxStatus.PENDING,
          attempts: 0,
          nextAttemptAt: baseTime,
        },
      });

      const result = await processTransportsBatch({
        adapter: mockAdapter,
        clock: mockClock,
        baseIntervalSeconds: 60,
        exponent: 2,
      });

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.dead).toBe(0);

      const event = await prisma.outboxEvent.findUnique({ where: { dedupeKey } });
      expect(event?.status).toBe(OutboxStatus.PENDING);
      expect(event?.attempts).toBe(1);
      expect(event?.leaseExpiresAt).toBeNull();
      expect(event?.nextAttemptAt.toISOString()).toBe('2026-10-01T12:01:00.000Z');

      // Structured diagnostic error validation
      expect(event?.lastErrorCode).toBeDefined();
      const diag = JSON.parse(event!.lastErrorCode!);
      expect(diag.code).toBe('TRANSIENT_FAILURE');
      expect(diag.reason).toContain('Network timeout');
      expect(diag.attempt).toBe(1);
    });

    it('permanent rejection immediately transitions status to DEAD with diagnostic payload', async () => {
      const mockAdapter = new MockTransportAdapter();
      mockAdapter.shouldFail = true;
      mockAdapter.failPermanent = true;
      mockAdapter.failError = '550 5.1.1 User unknown / mailbox not found';

      const dedupeKey = `transports-perm-fail-${Date.now()}`;

      await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: regularUser.id,
          type: 'PICK_REMINDER',
          payload: { poolName: testPool.name },
          dedupeKey,
          status: OutboxStatus.PENDING,
          attempts: 0,
        },
      });

      const result = await processTransportsBatch({ adapter: mockAdapter });
      expect(result.processed).toBe(1);
      expect(result.dead).toBe(1);
      expect(result.failed).toBe(0);

      const event = await prisma.outboxEvent.findUnique({ where: { dedupeKey } });
      expect(event?.status).toBe(OutboxStatus.DEAD);
      expect(event?.leaseExpiresAt).toBeNull();

      const diag = JSON.parse(event!.lastErrorCode!);
      expect(diag.code).toBe('PERMANENT_REJECTION');
      expect(diag.reason).toContain('User unknown');
    });

    it('reaching MAX_ATTEMPTS transitions status to DEAD (Dead-Letter Invariant)', async () => {
      const mockAdapter = new MockTransportAdapter();
      mockAdapter.shouldFail = true;
      mockAdapter.failPermanent = false;
      mockAdapter.failError = 'Repeated upstream provider 500 Internal Error';

      const dedupeKey = `transports-max-retries-${Date.now()}`;

      await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: regularUser.id,
          type: 'PICK_REMINDER',
          payload: { poolName: testPool.name },
          dedupeKey,
          status: OutboxStatus.PENDING,
          attempts: 4, // 4 previous failed attempts
        },
      });

      const result = await processTransportsBatch({
        adapter: mockAdapter,
        maxAttempts: 5,
      });

      expect(result.processed).toBe(1);
      expect(result.dead).toBe(1);
      expect(result.failed).toBe(0);

      const event = await prisma.outboxEvent.findUnique({ where: { dedupeKey } });
      expect(event?.status).toBe(OutboxStatus.DEAD);
      expect(event?.attempts).toBe(5);

      const diag = JSON.parse(event!.lastErrorCode!);
      expect(diag.code).toBe('MAX_RETRIES_EXCEEDED');
      expect(diag.attempt).toBe(5);
    });

    it('advancing simulated clock allows retry after backoff expires', async () => {
      const mockAdapter = new MockTransportAdapter();
      const baseTime = new Date('2026-10-01T12:00:00.000Z');
      let currentTime = new Date(baseTime.getTime());
      const mockClock: ClockFn = () => currentTime;

      const dedupeKey = `transports-clock-advance-${Date.now()}`;

      // Event scheduled for nextAttemptAt in future relative to baseTime
      await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: regularUser.id,
          type: 'PICK_REMINDER',
          payload: { poolName: testPool.name },
          dedupeKey,
          status: OutboxStatus.PENDING,
          attempts: 1,
          nextAttemptAt: new Date(baseTime.getTime() + 120 * 1000), // 2 mins later
        },
      });

      // At baseTime, event is not yet due
      const sweep1 = await processTransportsBatch({ adapter: mockAdapter, clock: mockClock });
      expect(sweep1.processed).toBe(0);
      expect(mockAdapter.sentMessages).toHaveLength(0);

      // Advance clock by 3 minutes (past the 2m backoff window)
      currentTime = new Date(baseTime.getTime() + 180 * 1000);
      const sweep2 = await processTransportsBatch({ adapter: mockAdapter, clock: mockClock });
      expect(sweep2.processed).toBe(1);
      expect(sweep2.succeeded).toBe(1);
      expect(mockAdapter.sentMessages).toHaveLength(1);

      const event = await prisma.outboxEvent.findUnique({ where: { dedupeKey } });
      expect(event?.status).toBe(OutboxStatus.SENT);
    });
  });

  describe('3. Decision #20 Tier Separation: Admin Transport Routes', () => {
    it('rejects unauthenticated requests on /api/admin/ops/transports/*', async () => {
      const getRes = await fetch(`${baseUrl}/api/admin/ops/transports/status`);
      expect(getRes.status).toBe(401);

      const postRes = await fetch(`${baseUrl}/api/admin/ops/transports/drain`, {
        method: 'POST',
      });
      expect(postRes.status).toBe(401);
    });

    it('rejects regular users on /api/admin/ops/transports/* with 403', async () => {
      const getRes = await fetch(`${baseUrl}/api/admin/ops/transports/status`, {
        headers: { Authorization: `Bearer ${regularToken}` },
      });
      expect(getRes.status).toBe(403);

      const postRes = await fetch(`${baseUrl}/api/admin/ops/transports/drain`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${regularToken}` },
      });
      expect(postRes.status).toBe(403);
    });

    it('rejects pool commissioners on /api/admin/ops/transports/* with 403 (Decision #20 Hardening)', async () => {
      const getRes = await fetch(`${baseUrl}/api/admin/ops/transports/status`, {
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });
      expect(getRes.status).toBe(403);

      const postRes = await fetch(`${baseUrl}/api/admin/ops/transports/drain`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });
      expect(postRes.status).toBe(403);
    });

    it('allows global ADMIN to query transports status and trigger dispatch sweep', async () => {
      const getRes = await fetch(`${baseUrl}/api/admin/ops/transports/status`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(getRes.status).toBe(200);
      const data = await getRes.json();
      expect(data.status).toBe('ok');
      expect(data.service).toBe('transports_engine');
      expect(data.queueDepth).toBeDefined();

      const postRes = await fetch(`${baseUrl}/api/admin/ops/transports/drain`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ batchSize: 5 }),
      });
      expect(postRes.status).toBe(200);
      const postData = await postRes.json();
      expect(postData.message).toBe('Transport sweep executed successfully');
      expect(postData.result).toBeDefined();
    });
  });

  describe('4. Decision #54 Strict Read-Only Invariant on GET', () => {
    it('GET /api/admin/ops/transports/status produces ZERO database mutations', async () => {
      // Create pending and dead outbox events
      await prisma.outboxEvent.createMany({
        data: [
          {
            poolId: testPool.id,
            recipientUserId: regularUser.id,
            type: 'REMINDER',
            payload: { a: 1 },
            dedupeKey: `get-status-pending-${Date.now()}`,
            status: OutboxStatus.PENDING,
          },
          {
            poolId: testPool.id,
            recipientUserId: regularUser.id,
            type: 'REMINDER',
            payload: { a: 2 },
            dedupeKey: `get-status-dead-${Date.now()}`,
            status: OutboxStatus.DEAD,
            attempts: 5,
            lastErrorCode: 'DIAG_ERR',
          },
        ],
      });

      const countBefore = await prisma.outboxEvent.count();
      const eventsBefore = await prisma.outboxEvent.findMany({ select: { id: true, status: true, attempts: true, lastErrorCode: true } });

      const res = await fetch(`${baseUrl}/api/admin/ops/transports/status`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.queueDepth.pending).toBeGreaterThanOrEqual(1);
      expect(data.queueDepth.dead).toBeGreaterThanOrEqual(1);

      const countAfter = await prisma.outboxEvent.count();
      const eventsAfter = await prisma.outboxEvent.findMany({ select: { id: true, status: true, attempts: true, lastErrorCode: true } });

      expect(countAfter).toBe(countBefore);
      expect(eventsAfter).toEqual(eventsBefore);
    });
  });
});
