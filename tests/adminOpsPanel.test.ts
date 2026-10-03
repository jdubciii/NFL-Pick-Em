import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import http from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role, OutboxStatus } from '@prisma/client';
import { app } from '../src/server';
import { JWT_SECRET } from '../src/middleware/auth';
import { assertDisposableUrl } from '../src/db/safeguards';
import prismaClient from '../src/db/client';
import * as transportsService from '../src/services/transports';

const rehearsalDbUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/pickem_rehearsal';

describe('Milestone 13.3: System Admin Ops Panel & Health Telemetry Tests', () => {
  let server: http.Server;
  let baseUrl: string;
  let prisma: PrismaClient;

  let adminUser: any;
  let commissionerUser: any;
  let standardUser: any;

  let adminToken: string;
  let commissionerToken: string;
  let standardToken: string;

  let testPool: any;

  beforeAll(async () => {
    assertDisposableUrl(rehearsalDbUrl);
    prisma = new PrismaClient({ datasources: { db: { url: rehearsalDbUrl } }, log: [] });

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });

    // Create users
    adminUser = await prisma.user.create({
      data: {
        email: `admin_ops_${Date.now()}@example.com`,
        passwordHash: 'hash123',
        role: Role.ADMIN,
      },
    });

    commissionerUser = await prisma.user.create({
      data: {
        email: `commish_ops_${Date.now()}@example.com`,
        passwordHash: 'hash123',
        role: Role.USER,
      },
    });

    standardUser = await prisma.user.create({
      data: {
        email: `user_ops_${Date.now()}@example.com`,
        passwordHash: 'hash123',
        role: Role.USER,
      },
    });

    adminToken = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: adminUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    commissionerToken = jwt.sign(
      { id: commissionerUser.id, email: commissionerUser.email, role: commissionerUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    standardToken = jwt.sign(
      { id: standardUser.id, email: standardUser.email, role: standardUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create pool for commissioner
    testPool = await prisma.pool.create({
      data: {
        name: `Admin Ops Pool ${Date.now()}`,
        adminId: commissionerUser.id,
        settings: { lock_offset: 0 },
      },
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await prisma.$disconnect();
  });

  describe('1. Role-Based Access Control (Decision #20 Hardening)', () => {
    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ops/system/health`);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it('rejects standard users on /api/admin/ops/system/health with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ops/system/health`, {
        headers: { Authorization: `Bearer ${standardToken}` },
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe('Forbidden. Admin privileges required.');
    });

    it('rejects pool commissioners on /api/admin/ops/system/health with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ops/system/health`, {
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe('Forbidden. Admin privileges required.');
    });

    it('allows global ADMIN to retrieve health telemetry', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ops/system/health`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBeDefined();
      expect(data.service).toBe('system_admin_ops');
      expect(data.queues).toBeDefined();
      expect(data.queues.outbox).toBeDefined();
      expect(data.queues.inbox).toBeDefined();
      expect(data.queues.dlq).toBeDefined();
      expect(data.retention).toBeDefined();
    });
  });

  describe('2. Read-Only GET Execution & Zero Mutations (Decision #54)', () => {
    it('enforces strictly read-only execution with ZERO database mutations on GET /api/admin/ops/system/health', async () => {
      // Seed test records
      await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: standardUser.id,
          type: 'PICK_REMINDER',
          status: OutboxStatus.PENDING,
          dedupeKey: `readonly_test_${Date.now()}`,
          payload: { test: true },
        },
      });

      const outboxCountBefore = await prisma.outboxEvent.count();
      const inboxCountBefore = await prisma.inboxMessage.count();
      const userCountBefore = await prisma.user.count();

      // Call GET endpoint multiple times
      for (let i = 0; i < 3; i++) {
        const res = await fetch(`${baseUrl}/api/admin/ops/system/health`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        expect(res.status).toBe(200);
      }

      const outboxCountAfter = await prisma.outboxEvent.count();
      const inboxCountAfter = await prisma.inboxMessage.count();
      const userCountAfter = await prisma.user.count();

      expect(outboxCountAfter).toBe(outboxCountBefore);
      expect(inboxCountAfter).toBe(inboxCountBefore);
      expect(userCountAfter).toBe(userCountBefore);
    });
  });

  describe('3. Telemetry Accuracy Across Outbox, Inbox, DLQ, and Retention', () => {
    beforeAll(async () => {
      // Clean and populate known telemetry states
      await prisma.inboxMessage.deleteMany({});
      await prisma.outboxEvent.deleteMany({});

      const now = Date.now();

      // 2 PENDING outbox
      await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: standardUser.id,
          type: 'PICK_REMINDER',
          status: OutboxStatus.PENDING,
          dedupeKey: `telemetry_pending_1_${now}`,
          payload: { msg: 'p1' },
        },
      });
      await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: standardUser.id,
          type: 'PICK_REMINDER',
          status: OutboxStatus.PENDING,
          dedupeKey: `telemetry_pending_2_${now}`,
          payload: { msg: 'p2' },
        },
      });

      // 1 PROCESSING outbox
      await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: standardUser.id,
          type: 'PICK_REMINDER',
          status: OutboxStatus.PROCESSING,
          dedupeKey: `telemetry_proc_1_${now}`,
          payload: { msg: 'proc1' },
        },
      });

      // 1 DEAD outbox (DLQ)
      await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: standardUser.id,
          type: 'SYSTEM_ALERT',
          status: OutboxStatus.DEAD,
          attempts: 5,
          lastErrorCode: 'UNRECOVERABLE_TRANSACTION_FAILURE',
          dedupeKey: `telemetry_dead_1_${now}`,
          payload: { error: 'Fatal delivery error' },
        },
      });

      // 2 SENT outbox (terminal)
      await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: standardUser.id,
          type: 'WEEKLY_DIGEST',
          status: OutboxStatus.SENT,
          sentAt: new Date(),
          dedupeKey: `telemetry_sent_1_${now}`,
          payload: { msg: 'deliv1' },
        },
      });
      await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: standardUser.id,
          type: 'WEEKLY_DIGEST',
          status: OutboxStatus.SENT,
          sentAt: new Date(),
          dedupeKey: `telemetry_sent_2_${now}`,
          payload: { msg: 'deliv2' },
        },
      });

      // 1 SUPPRESSED outbox
      await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: standardUser.id,
          type: 'PICK_REMINDER',
          status: OutboxStatus.SUPPRESSED,
          dedupeKey: `telemetry_suppressed_1_${now}`,
          payload: { msg: 'suppressed1' },
        },
      });

      // Inbox: 1 unread, 2 read
      await prisma.inboxMessage.create({
        data: {
          poolId: testPool.id,
          userId: standardUser.id,
          type: 'PICK_REMINDER',
          dedupeKey: `inbox_unread_1_${now}`,
          payload: { title: 'Unread Reminder', body: 'Picks lock soon' },
          readAt: null,
        },
      });
      await prisma.inboxMessage.create({
        data: {
          poolId: testPool.id,
          userId: standardUser.id,
          type: 'WEEKLY_DIGEST',
          dedupeKey: `inbox_read_1_${now}`,
          payload: { title: 'Read Digest 1', body: 'Digest body 1' },
          readAt: new Date(),
        },
      });
      await prisma.inboxMessage.create({
        data: {
          poolId: testPool.id,
          userId: standardUser.id,
          type: 'WEEKLY_DIGEST',
          dedupeKey: `inbox_read_2_${now}`,
          payload: { title: 'Read Digest 2', body: 'Digest body 2' },
          readAt: new Date(),
        },
      });
    });

    it('returns exact telemetry matching database states', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ops/system/health`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();

      // Outbox queue checks
      expect(data.queues.outbox.pending).toBe(2);
      expect(data.queues.outbox.processing).toBe(1);
      expect(data.queues.outbox.deadLetters).toBe(1);

      // DLQ inspection checks
      expect(data.queues.dlq.count).toBe(1);
      expect(data.queues.dlq.recentFailures.length).toBe(1);
      expect(data.queues.dlq.recentFailures[0].lastErrorCode).toBe('UNRECOVERABLE_TRANSACTION_FAILURE');
      expect(data.queues.dlq.recentFailures[0].recipientUserId).toBe(standardUser.id);

      // Inbox queue checks
      expect(data.queues.inbox.unread).toBe(1);
      expect(data.queues.inbox.total).toBe(3);

      // Retention telemetry checks
      expect(data.retention.totalOutbox).toBe(7);
      expect(data.retention.terminalOutbox).toBe(4); // 2 SENT + 1 DEAD + 1 SUPPRESSED
      expect(data.retention.totalInbox).toBe(3);
    });

    it('verifies /api/admin/ops/reminders/scan alias route executes successfully for ADMIN', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ops/reminders/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toContain('Reminder scan executed successfully');
      expect(data.scanResult).toBeDefined();
    });
  });

  describe('4. Fail-Closed Error Handling (Decision #55)', () => {
    it('fails closed and returns 500 if database telemetry query encounters an error', async () => {
      const spy = vi.spyOn(transportsService, 'getTransportsQueueStatus').mockRejectedValueOnce(
        new Error('DATABASE_OFFLINE_FAIL_CLOSED')
      );

      try {
        const res = await fetch(`${baseUrl}/api/admin/ops/system/health`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });

        expect(res.status).toBe(500);
        const data = await res.json();
        expect(data.error).toBe('Failed to retrieve consolidated system health telemetry');
        expect(data.details).toContain('DATABASE_OFFLINE_FAIL_CLOSED');
      } finally {
        spy.mockRestore();
      }
    });
  });
});
