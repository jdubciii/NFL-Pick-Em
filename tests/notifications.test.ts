import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import prisma from '../src/db/client';
import {
  enqueueNotification,
  REMINDER_PAYLOAD_KEYS,
} from '../src/services/notifications';

describe('12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant)', () => {
  let testUser: any;
  let testPool: any;

  beforeEach(async () => {
    // Clean up only notification tables
    await prisma.outboxEvent.deleteMany({});
    await prisma.inboxMessage.deleteMany({});
    await prisma.notificationPreference.deleteMany({});
    await prisma.jobRun.deleteMany({});

    testUser = await prisma.user.create({
      data: {
        email: `notify_test_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`,
        passwordHash: 'hash',
      },
    });

    testPool = await prisma.pool.create({
      data: {
        name: `Notification Test Pool ${Date.now()}`,
        adminId: testUser.id,
        settings: {},
      },
    });
  });

  it('both rows created', async () => {
    const dedupeKey = `both-rows-${testPool.id}-${testUser.id}-1`;

    const result = await prisma.$transaction(async (tx) => {
      return enqueueNotification(tx, {
        poolId: testPool.id,
        userId: testUser.id,
        type: 'WRAPUP_REMINDER',
        payload: {
          poolName: 'Championship Pool',
          windowLabel: 'Week 1 Wrapup',
          lockAtUtc: '2026-10-01T20:00:00Z',
          deepLink: '/pools/123/wrapup',
        },
        dedupeKey,
        channels: ['IN_APP', 'EMAIL'],
      });
    });

    expect(result.inboxMessageCreated).toBe(true);
    expect(result.outboxEventCreated).toBe(true);
    expect(result.dedupeKey).toBe(dedupeKey);

    // Verify inbox message in DB
    const inboxMessages = await prisma.inboxMessage.findMany({
      where: { userId: testUser.id },
    });
    expect(inboxMessages).toHaveLength(1);
    expect(inboxMessages[0].type).toBe('WRAPUP_REMINDER');
    expect(inboxMessages[0].dedupeKey).toBe(dedupeKey);
    expect(inboxMessages[0].readAt).toBeNull();

    // Verify outbox event in DB
    const outboxEvents = await prisma.outboxEvent.findMany({
      where: { dedupeKey },
    });
    expect(outboxEvents).toHaveLength(1);
    expect(outboxEvents[0].status).toBe('PENDING');
    expect(outboxEvents[0].attempts).toBe(0);
    expect(outboxEvents[0].recipientUserId).toBe(testUser.id);
  });

  it('duplicate enqueue creates no second outbox OR inbox row', async () => {
    const dedupeKey = `duplicate-key-${testPool.id}-${testUser.id}`;

    // First call
    const res1 = await prisma.$transaction(async (tx) => {
      return enqueueNotification(tx, {
        poolId: testPool.id,
        userId: testUser.id,
        type: 'PICK_REMINDER',
        payload: { poolName: 'Test Pool', windowLabel: 'TNF', lockAtUtc: '2026-10-01T20:00:00Z', deepLink: '/picks' },
        dedupeKey,
        channels: ['IN_APP', 'EMAIL'],
      });
    });
    expect(res1.inboxMessageCreated).toBe(true);
    expect(res1.outboxEventCreated).toBe(true);

    // Second call with identical dedupeKey
    const res2 = await prisma.$transaction(async (tx) => {
      return enqueueNotification(tx, {
        poolId: testPool.id,
        userId: testUser.id,
        type: 'PICK_REMINDER',
        payload: { poolName: 'Test Pool', windowLabel: 'TNF', lockAtUtc: '2026-10-01T20:00:00Z', deepLink: '/picks' },
        dedupeKey,
        channels: ['IN_APP', 'EMAIL'],
      });
    });
    expect(res2.inboxMessageCreated).toBe(false);
    expect(res2.outboxEventCreated).toBe(false);

    // Assert exactly 1 inbox row and 1 outbox row in DB
    const inboxMessages = await prisma.inboxMessage.findMany({
      where: { userId: testUser.id },
    });
    expect(inboxMessages).toHaveLength(1);

    const outboxEvents = await prisma.outboxEvent.findMany({
      where: { dedupeKey },
    });
    expect(outboxEvents).toHaveLength(1);
  });

  it('caller transaction that throws after enqueue leaves zero rows in both tables', async () => {
    const dedupeKey = `rollback-key-${testPool.id}-${testUser.id}`;

    await expect(
      prisma.$transaction(async (tx) => {
        await enqueueNotification(tx, {
          poolId: testPool.id,
          userId: testUser.id,
          type: 'PICK_REMINDER',
          payload: { poolName: 'Test Pool', windowLabel: 'TNF', lockAtUtc: '2026-10-01T20:00:00Z', deepLink: '/picks' },
          dedupeKey,
          channels: ['IN_APP', 'EMAIL'],
        });
        throw new Error('INTENTIONAL_TRANSACTION_ROLLBACK');
      })
    ).rejects.toThrow('INTENTIONAL_TRANSACTION_ROLLBACK');

    const inboxCount = await prisma.inboxMessage.count({
      where: { userId: testUser.id },
    });
    expect(inboxCount).toBe(0);

    const outboxCount = await prisma.outboxEvent.count({
      where: { dedupeKey },
    });
    expect(outboxCount).toBe(0);
  });

  it('IN_APP-only writes no outbox row', async () => {
    const dedupeKey = `inapp-only-${testPool.id}-${testUser.id}`;

    const res = await prisma.$transaction(async (tx) => {
      return enqueueNotification(tx, {
        poolId: testPool.id,
        userId: testUser.id,
        type: 'PICK_REMINDER',
        payload: { poolName: 'Test Pool', windowLabel: 'TNF', lockAtUtc: '2026-10-01T20:00:00Z', deepLink: '/picks' },
        dedupeKey,
        channels: ['IN_APP'],
      });
    });

    expect(res.inboxMessageCreated).toBe(true);
    expect(res.outboxEventCreated).toBe(false);

    const inboxMessages = await prisma.inboxMessage.findMany({
      where: { userId: testUser.id },
    });
    expect(inboxMessages).toHaveLength(1);

    const outboxEvents = await prisma.outboxEvent.findMany({
      where: { dedupeKey },
    });
    expect(outboxEvents).toHaveLength(0);
  });

  it('EMAIL-only writes no inbox row', async () => {
    const dedupeKey = `email-only-${testPool.id}-${testUser.id}`;

    const res = await prisma.$transaction(async (tx) => {
      return enqueueNotification(tx, {
        poolId: testPool.id,
        userId: testUser.id,
        type: 'PICK_REMINDER',
        payload: { poolName: 'Test Pool', windowLabel: 'TNF', lockAtUtc: '2026-10-01T20:00:00Z', deepLink: '/picks' },
        dedupeKey,
        channels: ['EMAIL'],
      });
    });

    expect(res.inboxMessageCreated).toBe(false);
    expect(res.outboxEventCreated).toBe(true);

    const inboxMessages = await prisma.inboxMessage.findMany({
      where: { userId: testUser.id },
    });
    expect(inboxMessages).toHaveLength(0);

    const outboxEvents = await prisma.outboxEvent.findMany({
      where: { dedupeKey },
    });
    expect(outboxEvents).toHaveLength(1);
  });

  it('disallowed payload key is stripped', async () => {
    const dedupeKey = `strip-key-${testPool.id}-${testUser.id}`;

    await prisma.$transaction(async (tx) => {
      return enqueueNotification(tx, {
        poolId: testPool.id,
        userId: testUser.id,
        type: 'REMINDER',
        payload: {
          poolName: 'Allowlist Pool',
          windowLabel: 'Sunday Early',
          lockAtUtc: '2026-10-04T17:00:00Z',
          deepLink: '/pools/123/picks',
          unauthorizedField: 'secret_token_123',
          extraBogusData: { admin: true },
        },
        dedupeKey,
        channels: ['IN_APP', 'EMAIL'],
      });
    });

    const inboxMsg = await prisma.inboxMessage.findFirst({
      where: { userId: testUser.id, dedupeKey },
    });
    expect(inboxMsg).toBeDefined();
    const inboxPayload = inboxMsg?.payload as Record<string, any>;
    expect(inboxPayload).toEqual({
      poolName: 'Allowlist Pool',
      windowLabel: 'Sunday Early',
      lockAtUtc: '2026-10-04T17:00:00Z',
      deepLink: '/pools/123/picks',
    });
    expect(inboxPayload.unauthorizedField).toBeUndefined();
    expect(inboxPayload.extraBogusData).toBeUndefined();

    const outboxEv = await prisma.outboxEvent.findUnique({
      where: { dedupeKey },
    });
    expect(outboxEv).toBeDefined();
    const outboxPayload = outboxEv?.payload as Record<string, any>;
    expect(outboxPayload).toEqual({
      poolName: 'Allowlist Pool',
      windowLabel: 'Sunday Early',
      lockAtUtc: '2026-10-04T17:00:00Z',
      deepLink: '/pools/123/picks',
    });
    expect(outboxPayload.unauthorizedField).toBeUndefined();
    expect(outboxPayload.extraBogusData).toBeUndefined();
  });

  it('reminder payload keys are exactly poolName, windowLabel, lockAtUtc, deepLink', () => {
    expect([...REMINDER_PAYLOAD_KEYS]).toEqual([
      'poolName',
      'windowLabel',
      'lockAtUtc',
      'deepLink',
    ]);
  });

  it('static test fails if the module imports nodemailer, net, http(s) or fetch', () => {
    const serviceFilePath = path.resolve(__dirname, '../src/services/notifications.ts');
    const fileContent = fs.readFileSync(serviceFilePath, 'utf8');

    // Assert strictly no imports or requires of network/transport libraries
    expect(fileContent).not.toMatch(/from\s+['"]nodemailer['"]/i);
    expect(fileContent).not.toMatch(/require\s*\(\s*['"]nodemailer['"]\s*\)/i);
    expect(fileContent).not.toMatch(/from\s+['"]net['"]/i);
    expect(fileContent).not.toMatch(/require\s*\(\s*['"]net['"]\s*\)/i);
    expect(fileContent).not.toMatch(/from\s+['"]https?['"]/i);
    expect(fileContent).not.toMatch(/require\s*\(\s*['"]https?['"]\s*\)/i);
    expect(fileContent).not.toMatch(/from\s+['"]node-fetch['"]/i);
    expect(fileContent).not.toMatch(/require\s*\(\s*['"]node-fetch['"]\s*\)/i);
    expect(fileContent).not.toMatch(/fetch\s*\(/i);
  });
});
