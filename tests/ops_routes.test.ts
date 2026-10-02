import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role } from '@prisma/client';
import { app } from '../src/server';
import { JWT_SECRET } from '../src/middleware/auth';
import { assertDisposableUrl } from '../src/db/safeguards';

const rehearsalDbUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/pickem_rehearsal';

describe('Step F: Pool Ops Health & Outbox Retry Routes Tests', () => {
  let server: http.Server;
  let baseUrl: string;
  let prisma: PrismaClient;

  let commissionerUser: any;
  let regularMemberUser: any;
  let nonMemberUser: any;

  let commissionerToken: string;
  let regularMemberToken: string;
  let nonMemberToken: string;

  let poolA: any;
  let poolB: any;

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
    commissionerUser = await prisma.user.create({
      data: {
        email: `ops_commish_${Date.now()}@example.com`,
        passwordHash: 'hash123',
        role: Role.USER,
      },
    });

    regularMemberUser = await prisma.user.create({
      data: {
        email: `ops_member_${Date.now()}@example.com`,
        passwordHash: 'hash123',
        role: Role.USER,
      },
    });

    nonMemberUser = await prisma.user.create({
      data: {
        email: `ops_nonmember_${Date.now()}@example.com`,
        passwordHash: 'hash123',
        role: Role.USER,
      },
    });

    commissionerToken = jwt.sign(
      { id: commissionerUser.id, email: commissionerUser.email, role: commissionerUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    regularMemberToken = jwt.sign(
      { id: regularMemberUser.id, email: regularMemberUser.email, role: regularMemberUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    nonMemberToken = jwt.sign(
      { id: nonMemberUser.id, email: nonMemberUser.email, role: nonMemberUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create pool with commissioner
    poolA = await prisma.pool.create({
      data: {
        name: `Ops Pool A ${Date.now()}`,
        adminId: commissionerUser.id,
        settings: { lock_offset: 0 },
      },
    });

    // Add regular member to poolA
    await prisma.poolMembership.create({
      data: {
        poolId: poolA.id,
        userId: regularMemberUser.id,
      },
    });

    // Create separate pool B owned by nonMemberUser
    poolB = await prisma.pool.create({
      data: {
        name: `Ops Pool B ${Date.now()}`,
        adminId: nonMemberUser.id,
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

  describe('1. Authorization & Scoping on Pool Ops Routes', () => {
    it('returns 401 when unauthenticated on GET health and POST retry', async () => {
      const getRes = await fetch(`${baseUrl}/api/pools/${poolA.id}/ops/health`);
      expect(getRes.status).toBe(401);

      const postRes = await fetch(`${baseUrl}/api/pools/${poolA.id}/ops/outbox/retry`, {
        method: 'POST',
      });
      expect(postRes.status).toBe(401);
    });

    it('returns 400 when pool_id is not a valid UUID', async () => {
      const getRes = await fetch(`${baseUrl}/api/pools/not-a-uuid/ops/health`, {
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });
      expect(getRes.status).toBe(400);

      const postRes = await fetch(`${baseUrl}/api/pools/not-a-uuid/ops/outbox/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });
      expect(postRes.status).toBe(400);
    });

    it('returns 404 when pool does not exist', async () => {
      const getRes = await fetch(`${baseUrl}/api/pools/00000000-0000-0000-0000-000000000000/ops/health`, {
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });
      expect(getRes.status).toBe(404);

      const postRes = await fetch(`${baseUrl}/api/pools/00000000-0000-0000-0000-000000000000/ops/outbox/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });
      expect(postRes.status).toBe(404);
    });

    it('returns 403 when authenticated user is a regular pool member (not commissioner)', async () => {
      const getRes = await fetch(`${baseUrl}/api/pools/${poolA.id}/ops/health`, {
        headers: { Authorization: `Bearer ${regularMemberToken}` },
      });
      expect(getRes.status).toBe(403);

      const postRes = await fetch(`${baseUrl}/api/pools/${poolA.id}/ops/outbox/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${regularMemberToken}` },
      });
      expect(postRes.status).toBe(403);
    });

    it('returns 403 when authenticated user is not a member of the pool', async () => {
      const getRes = await fetch(`${baseUrl}/api/pools/${poolA.id}/ops/health`, {
        headers: { Authorization: `Bearer ${nonMemberToken}` },
      });
      expect(getRes.status).toBe(403);

      const postRes = await fetch(`${baseUrl}/api/pools/${poolA.id}/ops/outbox/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${nonMemberToken}` },
      });
      expect(postRes.status).toBe(403);
    });
  });

  describe('2. GET /api/pools/:pool_id/ops/health', () => {
    it('returns accurate telemetry and is strictly read-only (Decision #54)', async () => {
      // Create test outbox events for Pool A across different statuses
      await prisma.outboxEvent.createMany({
        data: [
          {
            poolId: poolA.id,
            recipientUserId: regularMemberUser.id,
            type: 'REMINDER',
            payload: { test: 1 },
            dedupeKey: `ops-pending-${Date.now()}`,
            status: 'PENDING',
          },
          {
            poolId: poolA.id,
            recipientUserId: regularMemberUser.id,
            type: 'REMINDER',
            payload: { test: 2 },
            dedupeKey: `ops-dead-${Date.now()}`,
            status: 'DEAD',
            attempts: 5,
            lastErrorCode: 'SMTP_TIMEOUT',
          },
          {
            poolId: poolA.id,
            recipientUserId: regularMemberUser.id,
            type: 'REMINDER',
            payload: { test: 3 },
            dedupeKey: `ops-sent-${Date.now()}`,
            status: 'SENT',
          },
        ],
      });

      // Capture DB snapshot before GET
      const countBefore = await prisma.outboxEvent.count();
      const eventsBefore = await prisma.outboxEvent.findMany({ select: { id: true, status: true, attempts: true } });

      const res = await fetch(`${baseUrl}/api/pools/${poolA.id}/ops/health`, {
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.poolId).toBe(poolA.id);
      expect(data.poolName).toBe(poolA.name);
      expect(data.queueDepth.pending).toBeGreaterThanOrEqual(1);
      expect(data.queueDepth.dead).toBeGreaterThanOrEqual(1);
      expect(data.queueDepth.sent).toBeGreaterThanOrEqual(1);
      expect(data.deadEvents).toBeInstanceOf(Array);
      expect(data.deadEvents.some((e: any) => e.lastErrorCode === 'SMTP_TIMEOUT')).toBe(true);
      expect(data.status).toBe('DEGRADED');

      // Verify global JobRun rows are NOT returned (leakage prevention)
      expect(data.recentJobRuns).toBeUndefined();
      expect(data.recentOutboxActivity).toBeInstanceOf(Array);

      // Verify Decision #54 write-free invariant: zero mutations occurred on GET
      const countAfter = await prisma.outboxEvent.count();
      const eventsAfter = await prisma.outboxEvent.findMany({ select: { id: true, status: true, attempts: true } });
      expect(countAfter).toBe(countBefore);
      expect(eventsAfter).toEqual(eventsBefore);
    });

    it('strictly isolates pool telemetry with zero cross-pool leakage', async () => {
      // Create distinctive outbox event in Pool B
      const poolBEvent = await prisma.outboxEvent.create({
        data: {
          poolId: poolB.id,
          recipientUserId: nonMemberUser.id,
          type: 'REMINDER',
          payload: { secret: 'poolB-sensitive-data' },
          dedupeKey: `ops-leak-check-b-${Date.now()}`,
          status: 'DEAD',
          lastErrorCode: 'POOL_B_SPECIFIC_ERROR',
        },
      });

      // Query Pool A as commissioner of Pool A
      const res = await fetch(`${baseUrl}/api/pools/${poolA.id}/ops/health`, {
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();

      // Ensure Pool B's dead event is not in Pool A's deadEvents
      const leakedDead = data.deadEvents.find((e: any) => e.id === poolBEvent.id);
      expect(leakedDead).toBeUndefined();

      // Ensure Pool B's event is not in Pool A's recentOutboxActivity
      const leakedActivity = data.recentOutboxActivity.find((e: any) => e.id === poolBEvent.id);
      expect(leakedActivity).toBeUndefined();
    });
  });

  describe('3. POST /api/pools/:pool_id/ops/outbox/retry', () => {
    it('retries only DEAD/FAILED outbox events for the specified pool, resetting attempts and lease', async () => {
      // Create a dead event and a sent event in Pool A, and a dead event in Pool B
      const deadEventA = await prisma.outboxEvent.create({
        data: {
          poolId: poolA.id,
          recipientUserId: regularMemberUser.id,
          type: 'REMINDER',
          payload: {},
          dedupeKey: `retry-dead-a-${Date.now()}`,
          status: 'DEAD',
          attempts: 5,
          leaseExpiresAt: new Date(Date.now() + 60000),
          lastErrorCode: 'CONN_ERR',
        },
      });

      const sentEventA = await prisma.outboxEvent.create({
        data: {
          poolId: poolA.id,
          recipientUserId: regularMemberUser.id,
          type: 'REMINDER',
          payload: {},
          dedupeKey: `retry-sent-a-${Date.now()}`,
          status: 'SENT',
          attempts: 1,
        },
      });

      const deadEventB = await prisma.outboxEvent.create({
        data: {
          poolId: poolB.id,
          recipientUserId: nonMemberUser.id,
          type: 'REMINDER',
          payload: {},
          dedupeKey: `retry-dead-b-${Date.now()}`,
          status: 'DEAD',
          attempts: 5,
        },
      });

      // Commissioner retries events for Pool A
      const res = await fetch(`${baseUrl}/api/pools/${poolA.id}/ops/outbox/retry`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${commissionerToken}`,
          'Content-Type': 'application/json',
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.retriedCount).toBeGreaterThanOrEqual(1);

      // Verify deadEventA was transitioned to PENDING, attempts reset to 0, leaseExpiresAt cleared, retriedBy recorded
      const updatedDeadA = await prisma.outboxEvent.findUnique({ where: { id: deadEventA.id } });
      expect(updatedDeadA?.status).toBe('PENDING');
      expect(updatedDeadA?.attempts).toBe(0);
      expect(updatedDeadA?.leaseExpiresAt).toBeNull();
      expect(updatedDeadA?.retriedBy).toBe(commissionerUser.id);
      expect(updatedDeadA?.retriedAt).toBeTruthy();

      // Verify sentEventA was NOT altered
      const checkSentA = await prisma.outboxEvent.findUnique({ where: { id: sentEventA.id } });
      expect(checkSentA?.status).toBe('SENT');

      // Verify deadEventB in Pool B was NOT altered
      const checkDeadB = await prisma.outboxEvent.findUnique({ where: { id: deadEventB.id } });
      expect(checkDeadB?.status).toBe('DEAD');
      expect(checkDeadB?.attempts).toBe(5);
    });

    it('retries a specific event when outboxId is provided', async () => {
      const specificDead = await prisma.outboxEvent.create({
        data: {
          poolId: poolA.id,
          recipientUserId: regularMemberUser.id,
          type: 'REMINDER',
          payload: {},
          dedupeKey: `retry-specific-${Date.now()}`,
          status: 'DEAD',
          attempts: 5,
        },
      });

      const otherDead = await prisma.outboxEvent.create({
        data: {
          poolId: poolA.id,
          recipientUserId: regularMemberUser.id,
          type: 'REMINDER',
          payload: {},
          dedupeKey: `retry-other-${Date.now()}`,
          status: 'DEAD',
          attempts: 5,
        },
      });

      const res = await fetch(`${baseUrl}/api/pools/${poolA.id}/ops/outbox/retry`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${commissionerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ outboxId: specificDead.id }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.retriedCount).toBe(1);

      const checkSpecific = await prisma.outboxEvent.findUnique({ where: { id: specificDead.id } });
      expect(checkSpecific?.status).toBe('PENDING');
      expect(checkSpecific?.attempts).toBe(0);

      const checkOther = await prisma.outboxEvent.findUnique({ where: { id: otherDead.id } });
      expect(checkOther?.status).toBe('DEAD');
    });
  });
});
