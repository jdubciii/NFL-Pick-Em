import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import prisma from '../src/db/client';
import { enqueueNotification } from '../src/services/notifications';
import { drainOutbox, formatEmailContent, BACKOFF_SCHEDULE_SECONDS, MAX_ATTEMPTS } from '../src/workers/drain';
import { ConsoleMailTransport, MailTransport, SendMailOptions, SendMailResult } from '../src/transport/mail';
import { scrubErrorMessage } from '../src/utils/errorScrubber';
import { withJobRun, runOutboxDrain } from '../src/jobs/jobRunner';
import { JobStatus, OutboxStatus } from '@prisma/client';

class MockMailTransport implements MailTransport {
  public sentMails: SendMailOptions[] = [];
  public shouldFail = false;
  public failErrorMessage = 'SMTP 550 Connection Refused';

  async sendMail(options: SendMailOptions): Promise<SendMailResult> {
    if (this.shouldFail) {
      return { success: false, error: this.failErrorMessage };
    }
    this.sentMails.push(options);
    return { success: true, messageId: options.messageId || 'mock-id' };
  }
}

describe('12.1 Step B: Transport, Drain Worker, and Job Runners', () => {
  let testUser: any;
  let testPool: any;

  beforeEach(async () => {
    // Clean up notification tables
    await prisma.outboxEvent.deleteMany({});
    await prisma.inboxMessage.deleteMany({});
    await prisma.notificationPreference.deleteMany({});
    await prisma.jobRun.deleteMany({});

    testUser = await prisma.user.create({
      data: {
        email: `drain_test_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`,
        passwordHash: 'hash',
      },
    });

    testPool = await prisma.pool.create({
      data: {
        name: `Drain Test Pool ${Date.now()}`,
        adminId: testUser.id,
        settings: {},
      },
    });
  });

  describe('Error Scrubber', () => {
    it('strips database URLs, API keys, passwords, tokens and truncates to 200 chars', () => {
      const rawError = 'Connection failed at postgresql://postgres:supersecretpassword123@db.internal:5432/pickem_db?token=secret_token_abc&apiKey=secret_key_123 while querying users';
      const scrubbed = scrubErrorMessage(rawError);

      expect(scrubbed).not.toContain('supersecretpassword123');
      expect(scrubbed).not.toContain('secret_token_abc');
      expect(scrubbed).not.toContain('secret_key_123');
      expect(scrubbed).toContain('[REDACTED_URL]');
      expect(scrubbed.length).toBeLessThanOrEqual(200);
    });

    it('handles extremely long error messages by truncating to 200 chars', () => {
      const longMessage = 'A'.repeat(500);
      const scrubbed = scrubErrorMessage(longMessage);
      expect(scrubbed.length).toBe(200);
      expect(scrubbed.endsWith('...')).toBe(true);
    });
  });

  describe('Console Mail Transport', () => {
    it('appends formatted json logs to outbox-dev.log', async () => {
      const logFile = path.resolve(process.cwd(), 'logs', 'test-outbox.log');
      if (fs.existsSync(logFile)) {
        fs.unlinkSync(logFile);
      }

      const transport = new ConsoleMailTransport(logFile);
      const res = await transport.sendMail({
        to: 'user@example.com',
        subject: 'Test Subject',
        text: 'Test Body',
        messageId: '<test-dedupe-key@domain>',
      });

      expect(res.success).toBe(true);
      expect(fs.existsSync(logFile)).toBe(true);

      const content = fs.readFileSync(logFile, 'utf8');
      const parsed = JSON.parse(content.trim());
      expect(parsed.to).toBe('user@example.com');
      expect(parsed.subject).toBe('Test Subject');
      expect(parsed.messageId).toBe('<test-dedupe-key@domain>');

      // Cleanup
      fs.unlinkSync(logFile);
    });
  });

  describe('Drain Worker Lifecycle & Invariants', () => {
    it('drains pending outbox event, sets status SENT and records sentAt', async () => {
      const dedupeKey = `drain-success-${Date.now()}`;
      const mockTransport = new MockMailTransport();

      await prisma.$transaction(async (tx) => {
        await enqueueNotification(tx, {
          poolId: testPool.id,
          userId: testUser.id,
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

      const drainRes = await drainOutbox({ transport: mockTransport });
      expect(drainRes.processed).toBe(1);
      expect(drainRes.succeeded).toBe(1);
      expect(mockTransport.sentMails).toHaveLength(1);
      expect(mockTransport.sentMails[0].to).toBe(testUser.email);
      expect(mockTransport.sentMails[0].messageId).toBe(`<${dedupeKey}@nflpickem.local>`);

      const event = await prisma.outboxEvent.findUnique({ where: { dedupeKey } });
      expect(event?.status).toBe(OutboxStatus.SENT);
      expect(event?.sentAt).toBeDefined();
      expect(event?.leaseExpiresAt).toBeNull();
      expect(event?.lastErrorCode).toBeNull();
    });

    it('sets status SUPPRESSED when user email preference is disabled', async () => {
      const dedupeKey = `drain-suppressed-${Date.now()}`;
      const mockTransport = new MockMailTransport();

      // Create outbox event directly in PENDING state
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

      // Set user preference to email disabled
      await prisma.notificationPreference.create({
        data: {
          userId: testUser.id,
          emailEnabled: false,
        },
      });

      const drainRes = await drainOutbox({ transport: mockTransport });
      expect(drainRes.processed).toBe(1);
      expect(drainRes.suppressed).toBe(1);
      expect(drainRes.succeeded).toBe(0);
      expect(mockTransport.sentMails).toHaveLength(0);

      const event = await prisma.outboxEvent.findUnique({ where: { dedupeKey } });
      expect(event?.status).toBe(OutboxStatus.SUPPRESSED);
      expect(event?.leaseExpiresAt).toBeNull();
    });

    it('applies discrete backoff schedule on transport failure', async () => {
      const dedupeKey = `drain-backoff-${Date.now()}`;
      const mockTransport = new MockMailTransport();
      mockTransport.shouldFail = true;
      mockTransport.failErrorMessage = 'SMTP connection timeout to smtp://user:pass@smtp.internal:25';

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

      const beforeDrain = Date.now();
      const drainRes = await drainOutbox({ transport: mockTransport });

      expect(drainRes.processed).toBe(1);
      expect(drainRes.failed).toBe(1);

      const event = await prisma.outboxEvent.findUnique({ where: { dedupeKey } });
      expect(event?.status).toBe(OutboxStatus.PENDING);
      expect(event?.attempts).toBe(1);
      expect(event?.leaseExpiresAt).toBeNull();
      expect(event?.lastErrorCode).not.toContain('pass@smtp.internal');
      expect(event?.lastErrorCode).toContain('[REDACTED_URL]');

      // First attempt backoff is 60 seconds (1 minute)
      const expectedMinNext = new Date(beforeDrain + 59 * 1000);
      expect(event?.nextAttemptAt.getTime()).toBeGreaterThanOrEqual(expectedMinNext.getTime());
    });

    it('transitions to DEAD on 5th failure', async () => {
      const dedupeKey = `drain-dead-${Date.now()}`;
      const mockTransport = new MockMailTransport();
      mockTransport.shouldFail = true;

      // Create event that has already failed 4 times
      await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: testUser.id,
          type: 'PICK_REMINDER',
          payload: { poolName: testPool.name },
          dedupeKey,
          status: OutboxStatus.PENDING,
          attempts: 4,
        },
      });

      const drainRes = await drainOutbox({ transport: mockTransport });

      expect(drainRes.processed).toBe(1);
      expect(drainRes.dead).toBe(1);
      expect(drainRes.failed).toBe(0);

      const event = await prisma.outboxEvent.findUnique({ where: { dedupeKey } });
      expect(event?.status).toBe(OutboxStatus.DEAD);
      expect(event?.attempts).toBe(5);
    });
  });

  describe('withJobRun Lifecycle & Job Runners', () => {
    it('creates JobRun with RUNNING and transitions to OK with itemsProcessed', async () => {
      const job = await withJobRun('test_worker', async () => {
        return { itemsProcessed: 42, meta: { batch: 1 } };
      });

      expect(job.jobName).toBe('test_worker');
      expect(job.status).toBe(JobStatus.OK);
      expect(job.itemsProcessed).toBe(42);
      expect(job.finishedAt).toBeDefined();
      expect(job.errorCode).toBeNull();

      const stored = await prisma.jobRun.findUnique({ where: { id: job.id } });
      expect(stored?.status).toBe(JobStatus.OK);
      expect(stored?.itemsProcessed).toBe(42);
    });

    it('records FAILED status and scrubbed errorCode when job execution throws', async () => {
      const job = await withJobRun('failing_worker', async () => {
        throw new Error('Fatal unhandled error with secret https://api.service.internal/v1?token=verysecret');
      });

      expect(job.status).toBe(JobStatus.FAILED);
      expect(job.errorCode).not.toContain('verysecret');
      expect(job.errorCode).toContain('[REDACTED_URL]');
      expect(job.finishedAt).toBeDefined();

      const stored = await prisma.jobRun.findUnique({ where: { id: job.id } });
      expect(stored?.status).toBe(JobStatus.FAILED);
    });

    it('runOutboxDrain integrates with withJobRun', async () => {
      const { jobRun, drainResult } = await runOutboxDrain({ batchSize: 10 });
      expect(jobRun.jobName).toBe('outbox_drain');
      expect(jobRun.status).toBe(JobStatus.OK);
      expect(drainResult).toBeDefined();
    });
  });
});
