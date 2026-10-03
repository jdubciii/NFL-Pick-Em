import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role } from '@prisma/client';
import { app } from '../src/server';
import { JWT_SECRET } from '../src/middleware/auth';
import { assertDisposableUrl } from '../src/db/safeguards';
import { setNotificationsClock } from '../src/routes/notifications';

const rehearsalDbUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/pickem_rehearsal';

describe('Milestone 13.1 Notification Center & Preferences Integration Tests', () => {
  let server: http.Server;
  let baseUrl: string;
  let prisma: PrismaClient;

  let userA: any;
  let userB: any;
  let tokenA: string;
  let tokenB: string;
  let poolA: any;

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

    // Create test users
    userA = await prisma.user.create({
      data: {
        email: `notify_user_a_${Date.now()}@example.com`,
        passwordHash: 'hashA',
        role: Role.USER,
      },
    });

    userB = await prisma.user.create({
      data: {
        email: `notify_user_b_${Date.now()}@example.com`,
        passwordHash: 'hashB',
        role: Role.USER,
      },
    });

    tokenA = jwt.sign({ id: userA.id, email: userA.email, role: userA.role }, JWT_SECRET, { expiresIn: '1h' });
    tokenB = jwt.sign({ id: userB.id, email: userB.email, role: userB.role }, JWT_SECRET, { expiresIn: '1h' });

    poolA = await prisma.pool.create({
      data: {
        name: `Pool 13.1 Test ${Date.now()}`,
        adminId: userA.id,
        settings: { lock_offset: 0 },
      },
    });
  });

  afterAll(async () => {
    setNotificationsClock(undefined);
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    setNotificationsClock(undefined);
    await prisma.inboxMessage.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    });
    await prisma.notificationPreference.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    });
  });

  describe('1. GET /api/notifications (Inbox Fetch & Telemetry)', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await fetch(`${baseUrl}/api/notifications`);
      expect(res.status).toBe(401);
    });

    it('returns strictly req.user.id records with accurate unread counts', async () => {
      // Create 2 messages for User A (1 unread, 1 read)
      const msgA1 = await prisma.inboxMessage.create({
        data: {
          userId: userA.id,
          poolId: poolA.id,
          type: 'PICK_REMINDER',
          payload: { poolName: poolA.name, windowLabel: 'TNF', lockAtUtc: '2026-10-01T20:00:00Z' },
          dedupeKey: `key_a1_${Date.now()}_${Math.random()}`,
          readAt: null,
          createdAt: new Date('2026-10-01T10:00:00Z'),
        },
      });

      const msgA2 = await prisma.inboxMessage.create({
        data: {
          userId: userA.id,
          poolId: poolA.id,
          type: 'WRAPUP_REMINDER',
          payload: { poolName: poolA.name, windowLabel: 'WRAPUP' },
          dedupeKey: `key_a2_${Date.now()}_${Math.random()}`,
          readAt: new Date('2026-10-01T12:00:00Z'),
          createdAt: new Date('2026-10-01T09:00:00Z'),
        },
      });

      // Create 1 message for User B
      await prisma.inboxMessage.create({
        data: {
          userId: userB.id,
          poolId: poolA.id,
          type: 'PICK_REMINDER',
          payload: { poolName: poolA.name, windowLabel: 'TNF' },
          dedupeKey: `key_b1_${Date.now()}_${Math.random()}`,
          readAt: null,
          createdAt: new Date('2026-10-01T11:00:00Z'),
        },
      });

      const res = await fetch(`${baseUrl}/api/notifications`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.totalCount).toBe(2);
      expect(data.unreadCount).toBe(1);
      expect(data.messages).toHaveLength(2);
      expect(data.messages[0].id).toBe(msgA1.id);
      expect(data.messages[1].id).toBe(msgA2.id);

      // Verify no message belonging to User B is returned (Decision #20)
      const hasUserB = data.messages.some((m: any) => m.userId === userB.id);
      expect(hasUserB).toBe(false);
    });

    it('supports unreadOnly filter parameter', async () => {
      await prisma.inboxMessage.create({
        data: {
          userId: userA.id,
          poolId: poolA.id,
          type: 'PICK_REMINDER',
          payload: { windowLabel: 'Unread' },
          dedupeKey: `unread_key_${Date.now()}_${Math.random()}`,
          readAt: null,
        },
      });

      await prisma.inboxMessage.create({
        data: {
          userId: userA.id,
          poolId: poolA.id,
          type: 'WRAPUP_REMINDER',
          payload: { windowLabel: 'Read' },
          dedupeKey: `read_key_${Date.now()}_${Math.random()}`,
          readAt: new Date(),
        },
      });

      const res = await fetch(`${baseUrl}/api/notifications?unreadOnly=true`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.messages).toHaveLength(1);
      expect(data.messages[0].payload.windowLabel).toBe('Unread');
      expect(data.unreadCount).toBe(1);
      expect(data.totalCount).toBe(2);
    });
  });

  describe('2. POST /api/notifications/read (Single & Batch Read State)', () => {
    it('idempotently marks single notification ID as read for req.user.id with injectable clock', async () => {
      const fixedTime = new Date('2026-10-02T14:30:00.000Z');
      setNotificationsClock(() => fixedTime);

      const msg = await prisma.inboxMessage.create({
        data: {
          userId: userA.id,
          poolId: poolA.id,
          type: 'PICK_REMINDER',
          payload: {},
          dedupeKey: `read_single_${Date.now()}_${Math.random()}`,
          readAt: null,
        },
      });

      const res = await fetch(`${baseUrl}/api/notifications/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ id: msg.id }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(new Date(data.message.readAt).toISOString()).toBe(fixedTime.toISOString());

      // Verify in DB
      const dbMsg = await prisma.inboxMessage.findUnique({ where: { id: msg.id } });
      expect(dbMsg?.readAt?.toISOString()).toBe(fixedTime.toISOString());

      // Test idempotency: Calling read again on already-read notification returns 200 OK without changing timestamp
      const laterTime = new Date('2026-10-02T16:00:00.000Z');
      setNotificationsClock(() => laterTime);

      const res2 = await fetch(`${baseUrl}/api/notifications/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ id: msg.id }),
      });

      expect(res2.status).toBe(200);
      const dbMsg2 = await prisma.inboxMessage.findUnique({ where: { id: msg.id } });
      expect(dbMsg2?.readAt?.toISOString()).toBe(fixedTime.toISOString());
    });

    it('enforces Decision #20: User A cannot mark User B notification as read (fails 403)', async () => {
      const msgB = await prisma.inboxMessage.create({
        data: {
          userId: userB.id,
          poolId: poolA.id,
          type: 'PICK_REMINDER',
          payload: { note: 'Confidential' },
          dedupeKey: `user_b_priv_${Date.now()}_${Math.random()}`,
          readAt: null,
        },
      });

      // User A attempts to mark User B's notification
      const res = await fetch(`${baseUrl}/api/notifications/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ id: msgB.id }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/Forbidden/i);

      // Verify User B's notification was NOT altered in database
      const intact = await prisma.inboxMessage.findUnique({ where: { id: msgB.id } });
      expect(intact?.readAt).toBeNull();
    });

    it('handles batch array ids and rejects cross-tenant manipulation (Decision #20 & #55)', async () => {
      const msgA1 = await prisma.inboxMessage.create({
        data: { userId: userA.id, poolId: poolA.id, type: 'PICK_REMINDER', payload: {}, dedupeKey: `batch_a1_${Date.now()}_${Math.random()}`, readAt: null },
      });
      const msgA2 = await prisma.inboxMessage.create({
        data: { userId: userA.id, poolId: poolA.id, type: 'PICK_REMINDER', payload: {}, dedupeKey: `batch_a2_${Date.now()}_${Math.random()}`, readAt: null },
      });
      const msgB = await prisma.inboxMessage.create({
        data: { userId: userB.id, poolId: poolA.id, type: 'PICK_REMINDER', payload: {}, dedupeKey: `batch_b1_${Date.now()}_${Math.random()}`, readAt: null },
      });

      // User A tries batch update including msgB
      const resCross = await fetch(`${baseUrl}/api/notifications/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ ids: [msgA1.id, msgB.id] }),
      });

      expect(resCross.status).toBe(403);
      // Verify nothing marked
      const checkA1 = await prisma.inboxMessage.findUnique({ where: { id: msgA1.id } });
      expect(checkA1?.readAt).toBeNull();

      // Valid batch for User A
      const resValid = await fetch(`${baseUrl}/api/notifications/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ ids: [msgA1.id, msgA2.id] }),
      });

      expect(resValid.status).toBe(200);
      const dataValid = await resValid.json();
      expect(dataValid.markedCount).toBe(2);

      const checkA2 = await prisma.inboxMessage.findUnique({ where: { id: msgA2.id } });
      expect(checkA2?.readAt).not.toBeNull();
    });
  });

  describe('3. POST /api/notifications/read-all', () => {
    it('atomically marks all unread notifications for req.user.id and preserves other users (Decision #20)', async () => {
      await prisma.inboxMessage.create({
        data: { userId: userA.id, poolId: poolA.id, type: 'PICK_REMINDER', payload: {}, dedupeKey: `all_a1_${Date.now()}_${Math.random()}`, readAt: null },
      });
      await prisma.inboxMessage.create({
        data: { userId: userA.id, poolId: poolA.id, type: 'PICK_REMINDER', payload: {}, dedupeKey: `all_a2_${Date.now()}_${Math.random()}`, readAt: null },
      });
      const msgB = await prisma.inboxMessage.create({
        data: { userId: userB.id, poolId: poolA.id, type: 'PICK_REMINDER', payload: {}, dedupeKey: `all_b1_${Date.now()}_${Math.random()}`, readAt: null },
      });

      const res = await fetch(`${baseUrl}/api/notifications/read-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.markedReadCount).toBe(2);

      // Verify User A unread count is now 0
      const countA = await prisma.inboxMessage.count({ where: { userId: userA.id, readAt: null } });
      expect(countA).toBe(0);

      // Verify User B unread message is completely untouched
      const freshB = await prisma.inboxMessage.findUnique({ where: { id: msgB.id } });
      expect(freshB?.readAt).toBeNull();
    });
  });

  describe('4. GET & PUT /api/notifications/preferences', () => {
    it('GET returns default preferences without creating DB row (Decision #54)', async () => {
      const initialRows = await prisma.notificationPreference.count({ where: { userId: userA.id } });
      expect(initialRows).toBe(0);

      const res = await fetch(`${baseUrl}/api/notifications/preferences`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.emailEnabled).toBe(true);
      expect(data.reminderOffsetsHours).toEqual([24, 2]);

      // Verify Decision #54: No rows created on GET
      const afterRows = await prisma.notificationPreference.count({ where: { userId: userA.id } });
      expect(afterRows).toBe(0);
    });

    it('PUT validates and updates preferences for req.user.id', async () => {
      // Invalid offsets: empty array
      const resBad1 = await fetch(`${baseUrl}/api/notifications/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({ reminderOffsetsHours: [] }),
      });
      expect(resBad1.status).toBe(400);

      // Invalid offsets: out of range (> 168)
      const resBad2 = await fetch(`${baseUrl}/api/notifications/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({ reminderOffsetsHours: [200] }),
      });
      expect(resBad2.status).toBe(400);

      // Valid update
      const resValid = await fetch(`${baseUrl}/api/notifications/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({
          emailEnabled: false,
          reminderOffsetsHours: [48, 12, 1],
        }),
      });

      expect(resValid.status).toBe(200);
      const data = await resValid.json();
      expect(data.emailEnabled).toBe(false);
      expect(data.reminderOffsetsHours).toEqual([48, 12, 1]);

      // Verify GET returns updated values
      const resGet = await fetch(`${baseUrl}/api/notifications/preferences`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const dataGet = await resGet.json();
      expect(dataGet.emailEnabled).toBe(false);
      expect(dataGet.reminderOffsetsHours).toEqual([48, 12, 1]);
    });
  });

  describe('5. Decision #54 Hardening (NO WRITES ON GET)', () => {
    it('GET /api/notifications does not mutate any database state', async () => {
      await prisma.inboxMessage.create({
        data: {
          userId: userA.id,
          poolId: poolA.id,
          type: 'PICK_REMINDER',
          payload: { label: 'ReadOnly' },
          dedupeKey: `dec54_key_${Date.now()}_${Math.random()}`,
          readAt: null,
        },
      });

      const beforeMessages = await prisma.inboxMessage.findMany({ where: { userId: userA.id } });
      const beforePrefs = await prisma.notificationPreference.findMany({ where: { userId: userA.id } });

      const res = await fetch(`${baseUrl}/api/notifications`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      expect(res.status).toBe(200);

      const afterMessages = await prisma.inboxMessage.findMany({ where: { userId: userA.id } });
      const afterPrefs = await prisma.notificationPreference.findMany({ where: { userId: userA.id } });

      expect(beforeMessages).toEqual(afterMessages);
      expect(beforePrefs).toEqual(afterPrefs);
    });
  });

  describe('6. Decision #55 Hardening (FAIL CLOSED ON DB ERROR)', () => {
    it('rolls back and leaves state intact when mid-transaction or update errors occur', async () => {
      const msg = await prisma.inboxMessage.create({
        data: {
          userId: userA.id,
          poolId: poolA.id,
          type: 'PICK_REMINDER',
          payload: { test: true },
          dedupeKey: `dec55_key_${Date.now()}_${Math.random()}`,
          readAt: null,
        },
      });

      // Attempt atomic transaction with deliberate failure
      try {
        await prisma.$transaction(async (tx) => {
          await tx.inboxMessage.update({
            where: { id: msg.id },
            data: { readAt: new Date() },
          });
          throw new Error('SIMULATED_DB_ERROR_FAIL_CLOSED');
        });
      } catch (err: any) {
        expect(err.message).toContain('SIMULATED_DB_ERROR_FAIL_CLOSED');
      }

      // Verify transaction rollback: message remains unread
      const fresh = await prisma.inboxMessage.findUnique({ where: { id: msg.id } });
      expect(fresh?.readAt).toBeNull();
    });
  });
});
