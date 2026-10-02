import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role } from '@prisma/client';
import { app } from '../src/server';
import { JWT_SECRET } from '../src/middleware/auth';
import { assertDisposableUrl } from '../src/db/safeguards';

const rehearsalDbUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/pickem_rehearsal';

describe('Step C: /api/me & /api/notifications Routes Tests', () => {
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
        email: `user_a_${Date.now()}@example.com`,
        passwordHash: 'hash123',
        role: Role.USER,
      },
    });

    userB = await prisma.user.create({
      data: {
        email: `user_b_${Date.now()}@example.com`,
        passwordHash: 'hash123',
        role: Role.USER,
      },
    });

    tokenA = jwt.sign({ id: userA.id, email: userA.email, role: userA.role }, JWT_SECRET, { expiresIn: '1h' });
    tokenB = jwt.sign({ id: userB.id, email: userB.email, role: userB.role }, JWT_SECRET, { expiresIn: '1h' });

    // Create pool
    poolA = await prisma.pool.create({
      data: {
        name: `Pool Step C ${Date.now()}`,
        adminId: userA.id,
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

  describe('1. GET /api/me/inbox', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await fetch(`${baseUrl}/api/me/inbox`);
      expect(res.status).toBe(401);
    });

    it('returns inbox messages for authenticated user in descending order (Decision #54 compliant)', async () => {
      // Create 2 messages for User A and 1 message for User B
      const msg1 = await prisma.inboxMessage.create({
        data: {
          poolId: poolA.id,
          userId: userA.id,
          type: 'TEST_MSG_1',
          payload: { text: 'Hello A1' },
          dedupeKey: `dedupe-a1-${Date.now()}`,
        },
      });

      // Small delay to ensure timestamp separation
      await new Promise((r) => setTimeout(r, 10));

      const msg2 = await prisma.inboxMessage.create({
        data: {
          poolId: poolA.id,
          userId: userA.id,
          type: 'TEST_MSG_2',
          payload: { text: 'Hello A2' },
          dedupeKey: `dedupe-a2-${Date.now()}`,
        },
      });

      await prisma.inboxMessage.create({
        data: {
          poolId: poolA.id,
          userId: userB.id,
          type: 'TEST_MSG_B',
          payload: { text: 'Hello B' },
          dedupeKey: `dedupe-b-${Date.now()}`,
        },
      });

      const res = await fetch(`${baseUrl}/api/me/inbox`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.messages).toBeInstanceOf(Array);
      expect(data.messages.length).toBeGreaterThanOrEqual(2);
      // User B message must not be in User A list
      const userIds = data.messages.map((m: any) => m.userId);
      expect(userIds.every((id: string) => id === userA.id)).toBe(true);

      // Verify descending order
      expect(data.messages[0].id).toBe(msg2.id);
      expect(data.messages[1].id).toBe(msg1.id);
    });

    it('supports unreadOnly filter and poolId filter', async () => {
      const readMsg = await prisma.inboxMessage.create({
        data: {
          poolId: poolA.id,
          userId: userA.id,
          type: 'TEST_READ',
          payload: { text: 'Already read' },
          dedupeKey: `dedupe-read-${Date.now()}`,
          readAt: new Date(),
        },
      });

      const res = await fetch(`${baseUrl}/api/me/inbox?unreadOnly=true&poolId=${poolA.id}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      const readMsgFound = data.messages.find((m: any) => m.id === readMsg.id);
      expect(readMsgFound).toBeUndefined();
    });
  });

  describe('2. POST /api/me/inbox/:id/read', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await fetch(`${baseUrl}/api/me/inbox/00000000-0000-0000-0000-000000000000/read`, {
        method: 'POST',
      });
      expect(res.status).toBe(401);
    });

    it('returns 404 when message belongs to another user (ownership isolation)', async () => {
      const msgB = await prisma.inboxMessage.create({
        data: {
          poolId: poolA.id,
          userId: userB.id,
          type: 'PRIVATE_B',
          payload: {},
          dedupeKey: `dedupe-priv-b-${Date.now()}`,
        },
      });

      // User A attempts to mark User B's message as read
      const res = await fetch(`${baseUrl}/api/me/inbox/${msgB.id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      expect(res.status).toBe(404);

      // Verify User B's message readAt is still null
      const checkMsg = await prisma.inboxMessage.findUnique({ where: { id: msgB.id } });
      expect(checkMsg?.readAt).toBeNull();
    });

    it('marks single message read successfully and is idempotent', async () => {
      const msg = await prisma.inboxMessage.create({
        data: {
          poolId: poolA.id,
          userId: userA.id,
          type: 'MARK_READ_TEST',
          payload: {},
          dedupeKey: `dedupe-mark-${Date.now()}`,
        },
      });

      const res = await fetch(`${baseUrl}/api/me/inbox/${msg.id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message.readAt).toBeTruthy();

      const firstReadAt = data.message.readAt;

      // Idempotency: call read again
      const res2 = await fetch(`${baseUrl}/api/me/inbox/${msg.id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      expect(res2.status).toBe(200);
      const data2 = await res2.json();
      expect(data2.message.readAt).toBe(firstReadAt);
    });
  });

  describe('3. POST /api/me/inbox/read-all', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await fetch(`${baseUrl}/api/me/inbox/read-all`, {
        method: 'POST',
      });
      expect(res.status).toBe(401);
    });

    it('marks all unread messages for the user as read', async () => {
      await prisma.inboxMessage.createMany({
        data: [
          {
            poolId: poolA.id,
            userId: userA.id,
            type: 'BULK_1',
            payload: {},
            dedupeKey: `dedupe-bulk1-${Date.now()}`,
          },
          {
            poolId: poolA.id,
            userId: userA.id,
            type: 'BULK_2',
            payload: {},
            dedupeKey: `dedupe-bulk2-${Date.now()}`,
          },
        ],
      });

      const res = await fetch(`${baseUrl}/api/me/inbox/read-all`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ poolId: poolA.id }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.markedReadCount).toBeGreaterThanOrEqual(2);

      // Verify unread count for userA is now 0 in poolA
      const unread = await prisma.inboxMessage.count({
        where: { userId: userA.id, poolId: poolA.id, readAt: null },
      });
      expect(unread).toBe(0);
    });
  });

  describe('4. Notification Preferences: GET & PUT /api/me/notification-prefs', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await fetch(`${baseUrl}/api/me/notification-prefs`);
      expect(res.status).toBe(401);

      const putRes = await fetch(`${baseUrl}/api/me/notification-prefs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailEnabled: false }),
      });
      expect(putRes.status).toBe(401);
    });

    it('returns default preferences on GET before upsert without mutating DB (Decision #54)', async () => {
      const res = await fetch(`${baseUrl}/api/me/notification-prefs`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.userId).toBe(userA.id);
      expect(data.emailEnabled).toBe(true);
      expect(data.reminderOffsetsHours).toEqual([24, 2]);
    });

    it('rejects invalid reminderOffsetsHours payloads with 400', async () => {
      // Empty array
      let res = await fetch(`${baseUrl}/api/me/notification-prefs`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderOffsetsHours: [] }),
      });
      expect(res.status).toBe(400);

      // > 5 items
      res = await fetch(`${baseUrl}/api/me/notification-prefs`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderOffsetsHours: [1, 2, 3, 4, 5, 6] }),
      });
      expect(res.status).toBe(400);

      // Non-integer item
      res = await fetch(`${baseUrl}/api/me/notification-prefs`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderOffsetsHours: [24, 2.5] }),
      });
      expect(res.status).toBe(400);

      // Item out of bounds (< 1 or > 168)
      res = await fetch(`${baseUrl}/api/me/notification-prefs`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderOffsetsHours: [0, 24] }),
      });
      expect(res.status).toBe(400);

      res = await fetch(`${baseUrl}/api/me/notification-prefs`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderOffsetsHours: [200] }),
      });
      expect(res.status).toBe(400);
    });

    it('updates valid preferences successfully', async () => {
      const res = await fetch(`${baseUrl}/api/me/notification-prefs`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailEnabled: false,
          reminderOffsetsHours: [48, 12, 1],
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.userId).toBe(userA.id);
      expect(data.emailEnabled).toBe(false);
      expect(data.reminderOffsetsHours).toEqual([48, 12, 1]);
      expect(data.unsubscribeToken).toBeTruthy();

      // Verify in database
      const dbPref = await prisma.notificationPreference.findUnique({ where: { userId: userA.id } });
      expect(dbPref?.emailEnabled).toBe(false);
      expect(dbPref?.reminderOffsetsHours).toEqual([48, 12, 1]);
    });
  });

  describe('5. Token-based Unsubscribe Flow', () => {
    let unsubscribeToken: string;

    beforeAll(async () => {
      const pref = await prisma.notificationPreference.upsert({
        where: { userId: userB.id },
        update: { emailEnabled: true },
        create: {
          userId: userB.id,
          emailEnabled: true,
          reminderOffsetsHours: [24, 2],
        },
      });
      unsubscribeToken = pref.unsubscribeToken;
    });

    it('GET /api/notifications/unsubscribe validates token without modifying DB (Decision #54)', async () => {
      const res = await fetch(`${baseUrl}/api/notifications/unsubscribe?token=${unsubscribeToken}`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.valid).toBe(true);
      expect(data.emailEnabled).toBe(true);

      // Verify in DB emailEnabled is still true
      const pref = await prisma.notificationPreference.findUnique({ where: { unsubscribeToken } });
      expect(pref?.emailEnabled).toBe(true);
    });

    it('GET /api/notifications/unsubscribe returns 400 on malformed token and 404 on unknown token', async () => {
      const badRes = await fetch(`${baseUrl}/api/notifications/unsubscribe?token=not-a-uuid`);
      expect(badRes.status).toBe(400);

      const notFoundRes = await fetch(`${baseUrl}/api/notifications/unsubscribe?token=00000000-0000-0000-0000-000000000000`);
      expect(notFoundRes.status).toBe(404);
    });

    it('POST /api/notifications/unsubscribe disables email without deleting row', async () => {
      const res = await fetch(`${baseUrl}/api/notifications/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: unsubscribeToken }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.emailEnabled).toBe(false);

      // Verify row is preserved in DB and emailEnabled is false
      const pref = await prisma.notificationPreference.findUnique({ where: { unsubscribeToken } });
      expect(pref).not.toBeNull();
      expect(pref?.userId).toBe(userB.id);
      expect(pref?.emailEnabled).toBe(false);
      expect(pref?.reminderOffsetsHours).toEqual([24, 2]);
    });
  });
});
