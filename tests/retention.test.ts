import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import http from 'http';
import jwt from 'jsonwebtoken';
import { Role, OutboxStatus } from '@prisma/client';
import prisma from '../src/db/client';
import { app } from '../src/server';
import { JWT_SECRET } from '../src/middleware/auth';
import {
  runRetentionPruning,
  getRetentionStatus,
  calculateRetentionCutoff,
  ClockFn,
} from '../src/services/retentionService';

describe('Milestone 12.4: Notification Retention, Archival & Pruning Engine', () => {
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
        email: `retention_admin_${Date.now()}@example.com`,
        passwordHash: 'hash',
        role: Role.ADMIN,
      },
    });

    commissionerUser = await prisma.user.create({
      data: {
        email: `retention_commish_${Date.now()}@example.com`,
        passwordHash: 'hash',
        role: Role.USER,
      },
    });

    regularUser = await prisma.user.create({
      data: {
        email: `retention_user_${Date.now()}@example.com`,
        passwordHash: 'hash',
        role: Role.USER,
      },
    });

    adminToken = jwt.sign({ id: adminUser.id, email: adminUser.email, role: Role.ADMIN }, JWT_SECRET, { expiresIn: '1h' });
    commissionerToken = jwt.sign({ id: commissionerUser.id, email: commissionerUser.email, role: Role.USER }, JWT_SECRET, { expiresIn: '1h' });
    regularToken = jwt.sign({ id: regularUser.id, email: regularUser.email, role: Role.USER }, JWT_SECRET, { expiresIn: '1h' });

    testPool = await prisma.pool.create({
      data: {
        name: `Retention Test Pool ${Date.now()}`,
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
    await prisma.jobRun.deleteMany({});
  });

  describe('1. Retention Cutoff & Clock Calculation Unit Tests', () => {
    it('calculates exact retention cutoff date based on injected clock', () => {
      const baseTime = new Date('2026-10-01T12:00:00.000Z');
      const mockClock: ClockFn = () => baseTime;

      const cutoff30d = calculateRetentionCutoff(30, mockClock);
      expect(cutoff30d.toISOString()).toBe('2026-09-01T12:00:00.000Z');

      const cutoff90d = calculateRetentionCutoff(90, mockClock);
      expect(cutoff90d.toISOString()).toBe('2026-07-03T12:00:00.000Z');
    });
  });

  describe('2. State Protection & Terminal Boundaries (Decision #24 & #55)', () => {
    it('NEVER prunes PENDING or PROCESSING records regardless of how old they are (State Protection Guard)', async () => {
      const baseTime = new Date('2026-10-01T12:00:00.000Z');
      const mockClock: ClockFn = () => baseTime;

      // Create very old pending & processing records (120 days old)
      const oldTime = new Date(baseTime.getTime() - 120 * 24 * 60 * 60 * 1000);

      const pendingEvent = await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: regularUser.id,
          type: 'PICK_REMINDER',
          payload: { old: true },
          dedupeKey: `pending-old-${Date.now()}`,
          status: OutboxStatus.PENDING,
          createdAt: oldTime,
        },
      });

      const processingEvent = await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: regularUser.id,
          type: 'PICK_REMINDER',
          payload: { old: true },
          dedupeKey: `processing-old-${Date.now()}`,
          status: OutboxStatus.PROCESSING,
          createdAt: oldTime,
        },
      });

      const result = await runRetentionPruning({
        sentRetentionDays: 30,
        deadRetentionDays: 90,
        clock: mockClock,
      });

      expect(result.totalDeleted).toBe(0);

      // Verify records are intact
      const checkPending = await prisma.outboxEvent.findUnique({ where: { id: pendingEvent.id } });
      const checkProcessing = await prisma.outboxEvent.findUnique({ where: { id: processingEvent.id } });
      expect(checkPending).not.toBeNull();
      expect(checkProcessing).not.toBeNull();
    });

    it('prunes SENT records >30 days and DEAD records >90 days while preserving younger records', async () => {
      const baseTime = new Date('2026-10-01T12:00:00.000Z');
      const mockClock: ClockFn = () => baseTime;

      const time35dOld = new Date(baseTime.getTime() - 35 * 24 * 60 * 60 * 1000);
      const time10dOld = new Date(baseTime.getTime() - 10 * 24 * 60 * 60 * 1000);
      const time95dOld = new Date(baseTime.getTime() - 95 * 24 * 60 * 60 * 1000);
      const time40dOld = new Date(baseTime.getTime() - 40 * 24 * 60 * 60 * 1000);

      // 1. Expired SENT (35d old -> should be pruned)
      const oldSent = await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: regularUser.id,
          type: 'PICK_REMINDER',
          payload: {},
          dedupeKey: `sent-old-${Date.now()}`,
          status: OutboxStatus.SENT,
          createdAt: time35dOld,
        },
      });

      // 2. Young SENT (10d old -> preserved)
      const youngSent = await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: regularUser.id,
          type: 'PICK_REMINDER',
          payload: {},
          dedupeKey: `sent-young-${Date.now()}`,
          status: OutboxStatus.SENT,
          createdAt: time10dOld,
        },
      });

      // 3. Expired DEAD (95d old -> should be pruned)
      const oldDead = await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: regularUser.id,
          type: 'PICK_REMINDER',
          payload: {},
          dedupeKey: `dead-old-${Date.now()}`,
          status: OutboxStatus.DEAD,
          createdAt: time95dOld,
        },
      });

      // 4. Young DEAD (40d old -> preserved under 90d window)
      const youngDead = await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: regularUser.id,
          type: 'PICK_REMINDER',
          payload: {},
          dedupeKey: `dead-young-${Date.now()}`,
          status: OutboxStatus.DEAD,
          createdAt: time40dOld,
        },
      });

      // 5. Expired consumed INBOX (65d old read -> should be pruned)
      const time65dOld = new Date(baseTime.getTime() - 65 * 24 * 60 * 60 * 1000);
      const oldInbox = await prisma.inboxMessage.create({
        data: {
          poolId: testPool.id,
          userId: regularUser.id,
          type: 'PICK_REMINDER',
          payload: {},
          dedupeKey: `inbox-old-${Date.now()}`,
          readAt: time65dOld,
          createdAt: time65dOld,
        },
      });

      // 6. Unread INBOX (65d old unread -> preserved)
      const unreadInbox = await prisma.inboxMessage.create({
        data: {
          poolId: testPool.id,
          userId: regularUser.id,
          type: 'PICK_REMINDER',
          payload: {},
          dedupeKey: `inbox-unread-${Date.now()}`,
          readAt: null,
          createdAt: time65dOld,
        },
      });

      const result = await runRetentionPruning({
        sentRetentionDays: 30,
        deadRetentionDays: 90,
        inboxRetentionDays: 60,
        clock: mockClock,
      });

      expect(result.totalDeleted).toBe(3); // oldSent + oldDead + oldInbox
      expect(result.statusBreakdown.sent).toBe(1);
      expect(result.statusBreakdown.dead).toBe(1);
      expect(result.statusBreakdown.inbox).toBe(1);

      // Verify pruned
      expect(await prisma.outboxEvent.findUnique({ where: { id: oldSent.id } })).toBeNull();
      expect(await prisma.outboxEvent.findUnique({ where: { id: oldDead.id } })).toBeNull();
      expect(await prisma.inboxMessage.findUnique({ where: { id: oldInbox.id } })).toBeNull();

      // Verify preserved
      expect(await prisma.outboxEvent.findUnique({ where: { id: youngSent.id } })).not.toBeNull();
      expect(await prisma.outboxEvent.findUnique({ where: { id: youngDead.id } })).not.toBeNull();
      expect(await prisma.inboxMessage.findUnique({ where: { id: unreadInbox.id } })).not.toBeNull();
    });
  });

  describe('3. Bounded Batching & Pagination Verification', () => {
    it('processes multi-batch deletions with specified batchSize boundaries', async () => {
      const baseTime = new Date('2026-10-01T12:00:00.000Z');
      const mockClock: ClockFn = () => baseTime;
      const oldTime = new Date(baseTime.getTime() - 40 * 24 * 60 * 60 * 1000);

      // Create 25 expired SENT events
      const eventsData = Array.from({ length: 25 }, (_, i) => ({
        poolId: testPool.id,
        recipientUserId: regularUser.id,
        type: 'PICK_REMINDER',
        payload: { idx: i },
        dedupeKey: `batch-sent-${Date.now()}-${i}`,
        status: OutboxStatus.SENT,
        createdAt: oldTime,
      }));

      await prisma.outboxEvent.createMany({ data: eventsData });

      // Run pruning with batchSize = 10 (should process 3 batches: 10 + 10 + 5)
      const result = await runRetentionPruning({
        sentRetentionDays: 30,
        batchSize: 10,
        clock: mockClock,
      });

      expect(result.totalDeleted).toBe(25);
      expect(result.batchesProcessed).toBe(3);
      expect(result.statusBreakdown.sent).toBe(25);

      const remaining = await prisma.outboxEvent.count({ where: { status: OutboxStatus.SENT } });
      expect(remaining).toBe(0);
    });
  });

  describe('4. Decision #20 Tier Separation on Admin Retention Routes', () => {
    it('rejects unauthenticated requests on /api/admin/ops/retention/*', async () => {
      const getRes = await fetch(`${baseUrl}/api/admin/ops/retention/status`);
      expect(getRes.status).toBe(401);

      const postRes = await fetch(`${baseUrl}/api/admin/ops/retention/prune`, {
        method: 'POST',
      });
      expect(postRes.status).toBe(401);
    });

    it('rejects regular users on /api/admin/ops/retention/* with 403', async () => {
      const getRes = await fetch(`${baseUrl}/api/admin/ops/retention/status`, {
        headers: { Authorization: `Bearer ${regularToken}` },
      });
      expect(getRes.status).toBe(403);

      const postRes = await fetch(`${baseUrl}/api/admin/ops/retention/prune`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${regularToken}` },
      });
      expect(postRes.status).toBe(403);
    });

    it('rejects pool commissioners on /api/admin/ops/retention/* with 403 (Decision #20 Hardening)', async () => {
      const getRes = await fetch(`${baseUrl}/api/admin/ops/retention/status`, {
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });
      expect(getRes.status).toBe(403);

      const postRes = await fetch(`${baseUrl}/api/admin/ops/retention/prune`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });
      expect(postRes.status).toBe(403);
    });

    it('allows global ADMIN to trigger retention prune and query retention status', async () => {
      const getRes = await fetch(`${baseUrl}/api/admin/ops/retention/status`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(getRes.status).toBe(200);
      const data = await getRes.json();
      expect(data.status).toBe('ok');
      expect(data.service).toBe('retention_pruning_engine');
      expect(data.queueDepths).toBeDefined();
      expect(data.prunableCounts).toBeDefined();

      const postRes = await fetch(`${baseUrl}/api/admin/ops/retention/prune`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sentRetentionDays: 30, batchSize: 100 }),
      });
      expect(postRes.status).toBe(200);
      const postData = await postRes.json();
      expect(postData.message).toContain('executed successfully');
      expect(postData.result).toBeDefined();
    });
  });

  describe('5. Decision #54 Read-Only Invariant on GET', () => {
    it('GET /api/admin/ops/retention/status produces ZERO deletions or writes', async () => {
      // Create test records
      await prisma.outboxEvent.createMany({
        data: [
          {
            poolId: testPool.id,
            recipientUserId: regularUser.id,
            type: 'PICK_REMINDER',
            payload: {},
            dedupeKey: `get-test-pending-${Date.now()}`,
            status: OutboxStatus.PENDING,
          },
          {
            poolId: testPool.id,
            recipientUserId: regularUser.id,
            type: 'PICK_REMINDER',
            payload: {},
            dedupeKey: `get-test-sent-${Date.now()}`,
            status: OutboxStatus.SENT,
            createdAt: new Date('2020-01-01T00:00:00.000Z'), // Very old
          },
        ],
      });

      const countBefore = await prisma.outboxEvent.count();
      const eventsBefore = await prisma.outboxEvent.findMany();

      const res = await fetch(`${baseUrl}/api/admin/ops/retention/status`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);

      const countAfter = await prisma.outboxEvent.count();
      const eventsAfter = await prisma.outboxEvent.findMany();

      expect(countAfter).toBe(countBefore);
      expect(eventsAfter).toEqual(eventsBefore);
    });
  });

  describe('6. Decision #55 Fail-Closed Database Fault Tolerance', () => {
    it('throws structured error and aborts on database transaction failure', async () => {
      // Mock prisma.$transaction to reject
      vi.spyOn(prisma, '$transaction').mockRejectedValueOnce(new Error('Simulated DB connection reset during pruning'));

      await expect(runRetentionPruning()).rejects.toThrow('RETENTION_PRUNING_FAILED');

      vi.restoreAllMocks();
    });
  });
});
