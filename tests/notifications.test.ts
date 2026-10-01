import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import prisma from '../src/db/client';
import { enqueueNotification } from '../src/services/notifications';

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

  it('enqueueNotification creates both inbox_message and outbox_event inside a transaction', async () => {
    const dedupeKey = `wrapup-reminder-${testPool.id}-${testUser.id}-1`;

    const result = await prisma.$transaction(async (tx) => {
      return enqueueNotification(tx, {
        poolId: testPool.id,
        userId: testUser.id,
        type: 'WRAPUP_REMINDER',
        payload: { week: 1, message: 'Your picks are finalized' },
        dedupeKey,
      });
    });

    expect(result.outboxEventCreated).toBe(true);
    expect(result.inboxMessageId).toBeDefined();

    // Verify inbox message in DB
    const inboxMessages = await prisma.inboxMessage.findMany({
      where: { userId: testUser.id },
    });
    expect(inboxMessages).toHaveLength(1);
    expect(inboxMessages[0].type).toBe('WRAPUP_REMINDER');
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

  it('enqueueNotification is idempotent on outbox_event dedupeKey without throwing', async () => {
    const dedupeKey = `idempotent-key-${testPool.id}-${testUser.id}`;

    // First call
    const res1 = await prisma.$transaction(async (tx) => {
      return enqueueNotification(tx, {
        poolId: testPool.id,
        userId: testUser.id,
        type: 'PICK_CONFIRMATION',
        payload: { pickCount: 16 },
        dedupeKey,
      });
    });
    expect(res1.outboxEventCreated).toBe(true);

    // Second call with identical dedupeKey
    const res2 = await prisma.$transaction(async (tx) => {
      return enqueueNotification(tx, {
        poolId: testPool.id,
        userId: testUser.id,
        type: 'PICK_CONFIRMATION',
        payload: { pickCount: 16 },
        dedupeKey,
      });
    });
    expect(res2.outboxEventCreated).toBe(false);

    // Exactly 1 outbox event exists
    const outboxEvents = await prisma.outboxEvent.findMany({
      where: { dedupeKey },
    });
    expect(outboxEvents).toHaveLength(1);

    // 2 inbox messages exist (inbox records the activity, outbox deduplicates delivery)
    const inboxMessages = await prisma.inboxMessage.findMany({
      where: { userId: testUser.id },
    });
    expect(inboxMessages).toHaveLength(2);
  });

  it('notification_preferences and job_runs models function as expected', async () => {
    const pref = await prisma.notificationPreference.create({
      data: {
        userId: testUser.id,
        emailEnabled: true,
        reminderOffsetsHours: [24, 4, 1],
      },
    });
    expect(pref.emailEnabled).toBe(true);
    expect(pref.reminderOffsetsHours).toEqual([24, 4, 1]);
    expect(pref.unsubscribeToken).toBeDefined();

    const job = await prisma.jobRun.create({
      data: {
        jobName: 'OUTBOX_DRAIN',
        status: 'OK',
        itemsProcessed: 5,
        meta: { durationMs: 120 },
      },
    });
    expect(job.jobName).toBe('OUTBOX_DRAIN');
    expect(job.status).toBe('OK');
    expect(job.itemsProcessed).toBe(5);
  });
});
