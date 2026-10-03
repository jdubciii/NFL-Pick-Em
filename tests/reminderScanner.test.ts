import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role } from '@prisma/client';
import { app } from '../src/server';
import { JWT_SECRET } from '../src/middleware/auth';
import { assertDisposableUrl } from '../src/db/safeguards';
import { scanAndEnqueueReminders, runReminderScan } from '../src/services/reminderScanner';

const rehearsalDbUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/pickem_rehearsal';

describe('Milestone 12.1-E: Automated Reminder Scanner Engine Tests', () => {
  let server: http.Server;
  let baseUrl: string;
  let prisma: PrismaClient;

  let adminUser: any;
  let commissionerUser: any;
  let standardUser: any;
  let optedOutUser: any;

  let adminToken: string;
  let commissionerToken: string;
  let standardToken: string;
  let optedOutToken: string;

  let pool: any;
  let game24h: any;
  let game2h: any;

  const baseTime = new Date('2026-10-15T12:00:00.000Z');

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
    adminUser = await prisma.user.create({
      data: {
        email: `scanner_admin_${Date.now()}@example.com`,
        passwordHash: 'hash123',
        role: Role.ADMIN,
      },
    });

    commissionerUser = await prisma.user.create({
      data: {
        email: `scanner_commish_${Date.now()}@example.com`,
        passwordHash: 'hash123',
        role: Role.USER,
      },
    });

    standardUser = await prisma.user.create({
      data: {
        email: `scanner_standard_${Date.now()}@example.com`,
        passwordHash: 'hash123',
        role: Role.USER,
      },
    });

    optedOutUser = await prisma.user.create({
      data: {
        email: `scanner_optout_${Date.now()}@example.com`,
        passwordHash: 'hash123',
        role: Role.USER,
      },
    });

    // Create NotificationPreference for optedOutUser (disabled email)
    await prisma.notificationPreference.create({
      data: {
        userId: optedOutUser.id,
        emailEnabled: false,
        reminderOffsetsHours: [24, 2],
      },
    });

    // Create NotificationPreference for standardUser (enabled email with 24h and 2h offsets)
    await prisma.notificationPreference.create({
      data: {
        userId: standardUser.id,
        emailEnabled: true,
        reminderOffsetsHours: [24, 2],
      },
    });

    adminToken = jwt.sign({ id: adminUser.id, email: adminUser.email, role: adminUser.role }, JWT_SECRET, { expiresIn: '1h' });
    commissionerToken = jwt.sign({ id: commissionerUser.id, email: commissionerUser.email, role: commissionerUser.role }, JWT_SECRET, { expiresIn: '1h' });
    standardToken = jwt.sign({ id: standardUser.id, email: standardUser.email, role: standardUser.role }, JWT_SECRET, { expiresIn: '1h' });
    optedOutToken = jwt.sign({ id: optedOutUser.id, email: optedOutUser.email, role: optedOutUser.role }, JWT_SECRET, { expiresIn: '1h' });

    // Create Pool administered by commissionerUser
    pool = await prisma.pool.create({
      data: {
        name: `Scanner Test Pool ${Date.now()}`,
        adminId: commissionerUser.id,
        status: 'ACTIVE',
        settings: { lock_offset: 0 },
      },
    });

    // Add memberships
    await prisma.poolMembership.createMany({
      data: [
        { poolId: pool.id, userId: commissionerUser.id, status: 'ACTIVE' },
        { poolId: pool.id, userId: standardUser.id, status: 'ACTIVE' },
        { poolId: pool.id, userId: optedOutUser.id, status: 'ACTIVE' },
      ],
    });

    // Create upcoming games relative to baseTime (2026-10-15T12:00:00Z)
    // Game 1: Kickoff in 20 hours (inside 24h window, outside 2h window) -> 2026-10-16T08:00:00Z
    game24h = await prisma.game.create({
      data: {
        externalGameId: `game_24h_${Date.now()}`,
        homeTeamId: 'KC',
        awayTeamId: 'BAL',
        kickoffTime: new Date(baseTime.getTime() + 20 * 3600 * 1000),
        status: 'SCHEDULED',
      },
    });

    // Game 2: Kickoff in 1 hour (inside both 24h and 2h window) -> 2026-10-15T13:00:00Z
    game2h = await prisma.game.create({
      data: {
        externalGameId: `game_2h_${Date.now()}`,
        homeTeamId: 'SF',
        awayTeamId: 'DAL',
        kickoffTime: new Date(baseTime.getTime() + 1 * 3600 * 1000),
        status: 'SCHEDULED',
      },
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  describe('1. Idempotency & Outbox Enqueue Invariants', () => {
    it('enqueues outbox reminder for member with unsubmitted picks and deduplicates subsequent runs', async () => {
      // 1st run targeting 24h window
      const result1 = await scanAndEnqueueReminders({
        clock: () => baseTime,
        windowsHours: [24],
        weekId: 1,
        poolId: pool.id,
      });

      expect(result1.poolsScanned).toBe(1);
      // Standard user & commissioner user enqueued; optedOutUser skipped
      expect(result1.remindersEnqueued).toBeGreaterThanOrEqual(1);

      const standardDedupeKey = `remind:v1:user:${standardUser.id}:week:1:window:24`;
      const outboxEventsAfter1 = await prisma.outboxEvent.findMany({
        where: { dedupeKey: standardDedupeKey },
      });
      expect(outboxEventsAfter1.length).toBe(1);
      expect(outboxEventsAfter1[0].status).toBe('PENDING');
      expect(outboxEventsAfter1[0].recipientUserId).toBe(standardUser.id);
      expect(outboxEventsAfter1[0].type).toBe('REMINDER');

      // 2nd run with same parameters (sweeping the same window)
      const result2 = await scanAndEnqueueReminders({
        clock: () => baseTime,
        windowsHours: [24],
        weekId: 1,
        poolId: pool.id,
      });

      expect(result2.remindersEnqueued).toBe(0); // 0 new outbox records created

      const outboxEventsAfter2 = await prisma.outboxEvent.findMany({
        where: { dedupeKey: standardDedupeKey },
      });
      expect(outboxEventsAfter2.length).toBe(1); // EXACTLY 1 row remains
    });
  });

  describe('2. User Notification Preferences Enforcement', () => {
    it('skips users who have opted out of email / pick reminders (generates 0 outbox events)', async () => {
      const optoutDedupeKey24 = `remind:v1:user:${optedOutUser.id}:week:1:window:24`;
      const optoutDedupeKey2 = `remind:v1:user:${optedOutUser.id}:week:1:window:2`;

      const events = await prisma.outboxEvent.findMany({
        where: {
          dedupeKey: { in: [optoutDedupeKey24, optoutDedupeKey2] },
        },
      });

      expect(events.length).toBe(0);
    });

    it('skips members who have already submitted picks for all upcoming games in the window', async () => {
      // 1. Create a dedicated isolated user for this assertion
      const fullyPickedUser = await prisma.user.create({
        data: {
          email: `fully_picked_${Date.now()}@example.com`,
          passwordHash: 'hash123',
          role: Role.USER,
        },
      });

      await prisma.poolMembership.create({
        data: { poolId: pool.id, userId: fullyPickedUser.id, status: 'ACTIVE' },
      });

      await prisma.notificationPreference.create({
        data: {
          userId: fullyPickedUser.id,
          emailEnabled: true,
          reminderOffsetsHours: [24, 2],
        },
      });

      // 2. Submit picks for all scheduled upcoming games in the pool
      const upcomingGames = await prisma.game.findMany({
        where: {
          status: 'SCHEDULED',
          kickoffTime: { gt: baseTime },
        },
      });

      await prisma.pick.createMany({
        data: upcomingGames.map((g) => ({
          poolId: pool.id,
          userId: fullyPickedUser.id,
          gameId: g.id,
          selectedTeamId: g.homeTeamId,
          submittedById: fullyPickedUser.id,
        })),
      });

      // 3. Scan the 24h window
      const scanResult = await scanAndEnqueueReminders({
        clock: () => baseTime,
        windowsHours: [24],
        weekId: 1,
        poolId: pool.id,
      });

      // 4. Assert 0 outbox events were generated for the fully-picked user
      const userOutbox = await prisma.outboxEvent.findMany({
        where: { recipientUserId: fullyPickedUser.id },
      });

      expect(userOutbox.length).toBe(0);
      expect(scanResult.skippedAlreadyPicked).toBeGreaterThanOrEqual(1);
    });
  });

  describe('3. Injectable Clock Time-Window Boundary Testing', () => {
    it('moving clock forward cleanly transitions games in and out of windows without real-time delay', async () => {
      // Create user needing picks
      const newUser = await prisma.user.create({
        data: {
          email: `clock_user_${Date.now()}@example.com`,
          passwordHash: 'hash123',
          role: Role.USER,
        },
      });
      await prisma.poolMembership.create({
        data: { poolId: pool.id, userId: newUser.id, status: 'ACTIVE' },
      });

      // Target only 2h window
      // At baseTime (12:00Z), game2h kickoffs at 13:00Z (1h away -> in 2h window).
      // game24h kickoffs at +20h (8:00Z next day -> outside 2h window).
      const scan2h = await scanAndEnqueueReminders({
        clock: () => baseTime,
        windowsHours: [2],
        weekId: 3,
        poolId: pool.id,
      });

      const user2hEvent = await prisma.outboxEvent.findUnique({
        where: { dedupeKey: `remind:v1:user:${newUser.id}:week:3:window:2` },
      });
      expect(user2hEvent).not.toBeNull();
      expect(user2hEvent?.recipientUserId).toBe(newUser.id);

      // Now shift clock to 2 hours AFTER game2h kickoff (15:00Z)
      const pastTime = new Date(baseTime.getTime() + 3 * 3600 * 1000);
      const scanAfterKickoff = await scanAndEnqueueReminders({
        clock: () => pastTime,
        windowsHours: [2],
        weekId: 4,
        poolId: pool.id,
      });

      // game2h is now in the past (kickoff < now) and game24h is 17h away (> 2h) -> 0 reminders for 2h window
      const userPastEvent = await prisma.outboxEvent.findUnique({
        where: { dedupeKey: `remind:v1:user:${newUser.id}:week:4:window:2` },
      });
      expect(userPastEvent).toBeNull();
    });
  });

  describe('4. Tier Separation & System Route Access Guards (Decision #20 & #54)', () => {
    it('rejects unauthenticated requests to POST /api/admin/ops/scan-reminders with 401', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ops/scan-reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      expect(res.status).toBe(401);
    });

    it('rejects standard users from triggering reminder scan with 403 (Decision #20)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ops/scan-reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${standardToken}`,
        },
      });
      expect(res.status).toBe(403);
    });

    it('rejects pool commissioners who lack global ADMIN role with 403 (Decision #20)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ops/scan-reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${commissionerToken}`,
        },
      });
      expect(res.status).toBe(403);
    });

    it('allows global ADMIN to trigger reminder scan via POST with 200', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ops/scan-reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          windowsHours: [24],
          weekId: 5,
          poolId: pool.id,
        }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.message).toBe('Reminder scan executed successfully');
      expect(json.jobRun).toBeDefined();
      expect(json.scanResult).toBeDefined();
    });

    it('Decision #54 & Invariant: GET /api/admin/ops/scan-reminders/status is strictly read-only', async () => {
      const beforeJobRuns = await prisma.jobRun.count();
      const beforeOutbox = await prisma.outboxEvent.count();

      const res = await fetch(`${baseUrl}/api/admin/ops/scan-reminders/status`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('ok');
      expect(json.service).toBe('reminder_scanner');

      const afterJobRuns = await prisma.jobRun.count();
      const afterOutbox = await prisma.outboxEvent.count();

      expect(afterJobRuns).toBe(beforeJobRuns);
      expect(afterOutbox).toBe(beforeOutbox);
    });
  });

  describe('5. Fail-Closed Resilience (Decision #55)', () => {
    it('aborts and fails closed when database client is unconfigured or throws', async () => {
      const brokenClient = {} as any;

      await expect(
        scanAndEnqueueReminders({
          clock: () => baseTime,
          prismaClient: brokenClient,
        })
      ).rejects.toThrow('CLAIM_STORE_UNAVAILABLE');
    });

    it('withJobRun tracks failure and returns FAILED status upon unexpected error', async () => {
      const brokenClient = {
        $transaction: async () => {
          throw new Error('Database connection reset');
        },
        pool: {
          findMany: async () => {
            throw new Error('Database connection reset');
          },
        },
      } as any;

      const { jobRun } = await runReminderScan({
        prismaClient: brokenClient,
      });

      expect(jobRun.status).toBe('FAILED');
      expect(jobRun.errorCode).toContain('Database connection reset');
    });
  });
});
