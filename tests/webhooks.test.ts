import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import http from 'http';
import { Role, OutboxStatus } from '@prisma/client';
import prisma from '../src/db/client';
import { app } from '../src/server';
import {
  signWebhookPayload,
  verifyWebhookSignature,
  DEFAULT_WEBHOOK_SECRET,
} from '../src/routes/webhooks';

describe('Milestone 12.3: Webhook Ingress Gateway & Signature Verification', () => {
  let server: http.Server;
  let baseUrl: string;

  let testUser: any;
  let testPool: any;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });

    testUser = await prisma.user.create({
      data: {
        email: `webhook_test_user_${Date.now()}@example.com`,
        passwordHash: 'hash',
        role: Role.USER,
      },
    });

    testPool = await prisma.pool.create({
      data: {
        name: `Webhook Test Pool ${Date.now()}`,
        adminId: testUser.id,
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
  });

  describe('1. Cryptographic Signature Verification Unit Tests', () => {
    it('verifies valid HMAC SHA-256 signatures with hex and sha256= prefix', () => {
      const payload = { event: 'delivered', messageId: 'msg_123', dedupeKey: 'dedupe_123' };
      const secret = 'my-super-secret-key';

      const sigWithPrefix = signWebhookPayload(payload, secret);
      const rawHex = sigWithPrefix.replace('sha256=', '');

      expect(verifyWebhookSignature(payload, sigWithPrefix, secret)).toBe(true);
      expect(verifyWebhookSignature(payload, rawHex, secret)).toBe(true);
    });

    it('rejects invalid signature, mismatched secret, or tampered payload (Fail-Closed)', () => {
      const payload = { event: 'delivered', messageId: 'msg_123' };
      const secret = 'correct-secret';

      const validSig = signWebhookPayload(payload, secret);
      const wrongSecretSig = signWebhookPayload(payload, 'wrong-secret');
      const tamperedPayload = { event: 'delivered', messageId: 'msg_tampered' };

      expect(verifyWebhookSignature(payload, undefined, secret)).toBe(false);
      expect(verifyWebhookSignature(payload, '', secret)).toBe(false);
      expect(verifyWebhookSignature(payload, 'invalid-hex-sig', secret)).toBe(false);
      expect(verifyWebhookSignature(payload, wrongSecretSig, secret)).toBe(false);
      expect(verifyWebhookSignature(tamperedPayload, validSig, secret)).toBe(false);
    });
  });

  describe('2. POST /api/webhooks/notifications Ingress Security', () => {
    it('rejects webhook requests with missing signature header with 401 Unauthorized', async () => {
      const payload = { event: 'delivered', dedupeKey: 'k1' };

      const res = await fetch(`${baseUrl}/api/webhooks/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('Unauthorized');
    });

    it('rejects webhook requests with forged or invalid signature with 401 Unauthorized', async () => {
      const payload = { event: 'delivered', dedupeKey: 'k1' };

      const res = await fetch(`${baseUrl}/api/webhooks/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-signature': 'sha256=0000000000000000000000000000000000000000000000000000000000000000',
        },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('Unauthorized');
    });

    it('processes valid signed delivered event and transitions OutboxEvent to SENT', async () => {
      const dedupeKey = `webhook-deliv-${Date.now()}`;

      const outboxEvent = await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: testUser.id,
          type: 'PICK_REMINDER',
          payload: { poolName: testPool.name },
          dedupeKey,
          status: OutboxStatus.PROCESSING,
          attempts: 1,
        },
      });

      const payload = {
        event: 'delivered',
        dedupeKey,
        messageId: `<${dedupeKey}@test>`,
      };

      const signature = signWebhookPayload(payload, DEFAULT_WEBHOOK_SECRET);

      const res = await fetch(`${baseUrl}/api/webhooks/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-signature': signature,
        },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.received).toBe(true);
      expect(data.event).toBe('delivered');

      const updated = await prisma.outboxEvent.findUnique({ where: { id: outboxEvent.id } });
      expect(updated?.status).toBe(OutboxStatus.SENT);
      expect(updated?.sentAt).toBeDefined();
      expect(updated?.leaseExpiresAt).toBeNull();
    });

    it('processes valid signed bounce event and transitions OutboxEvent to DEAD with diagnostic JSON', async () => {
      const dedupeKey = `webhook-bounce-${Date.now()}`;

      const outboxEvent = await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: testUser.id,
          type: 'PICK_REMINDER',
          payload: { poolName: testPool.name },
          dedupeKey,
          status: OutboxStatus.PROCESSING,
          attempts: 1,
        },
      });

      const payload = {
        event: 'bounced',
        dedupeKey,
        recipient: testUser.email,
        error: '550 User mailbox inactive / hard bounce',
      };

      const signature = signWebhookPayload(payload, DEFAULT_WEBHOOK_SECRET);

      const res = await fetch(`${baseUrl}/api/webhooks/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature-sha256': signature,
        },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(200);

      const updated = await prisma.outboxEvent.findUnique({ where: { id: outboxEvent.id } });
      expect(updated?.status).toBe(OutboxStatus.DEAD);
      expect(updated?.leaseExpiresAt).toBeNull();

      expect(updated?.lastErrorCode).toBeDefined();
      const diag = JSON.parse(updated!.lastErrorCode!);
      expect(diag.code).toBe('WEBHOOK_PERMANENT_BOUNCE');
      expect(diag.event).toBe('bounced');
      expect(diag.error).toContain('hard bounce');
    });
  });

  describe('3. Decision #54 Side-Effect Free GET Invariant', () => {
    it('GET /api/webhooks/notifications returns 405 Method Not Allowed and causes ZERO mutations', async () => {
      const dedupeKey = `webhook-get-check-${Date.now()}`;

      await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: testUser.id,
          type: 'PICK_REMINDER',
          payload: { poolName: testPool.name },
          dedupeKey,
          status: OutboxStatus.PENDING,
          attempts: 0,
        },
      });

      const countBefore = await prisma.outboxEvent.count();
      const eventsBefore = await prisma.outboxEvent.findMany({ select: { id: true, status: true, attempts: true } });

      const res = await fetch(`${baseUrl}/api/webhooks/notifications`);
      expect(res.status).toBe(405);
      const data = await res.json();
      expect(data.error).toBe('Method Not Allowed');
      expect(data.allowedMethods).toContain('POST');

      const countAfter = await prisma.outboxEvent.count();
      const eventsAfter = await prisma.outboxEvent.findMany({ select: { id: true, status: true, attempts: true } });

      expect(countAfter).toBe(countBefore);
      expect(eventsAfter).toEqual(eventsBefore);
    });
  });

  describe('4. Decision #55 Fail-Closed Database Fault Tolerance', () => {
    it('returns 500 when database transaction fails during webhook ingestion, refusing receipt acknowledgement', async () => {
      const payload = {
        event: 'delivered',
        dedupeKey: `webhook-fail-closed-${Date.now()}`,
      };

      const signature = signWebhookPayload(payload, DEFAULT_WEBHOOK_SECRET);

      // Simulate database error inside transaction
      vi.spyOn(prisma, '$transaction').mockRejectedValueOnce(new Error('PostgreSQL connection dropped unexpectedly'));

      const res = await fetch(`${baseUrl}/api/webhooks/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-signature': signature,
        },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toContain('Failed to process webhook event');

      vi.restoreAllMocks();
    });
  });
});
