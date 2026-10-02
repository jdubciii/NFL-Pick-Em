import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import prisma from '../src/db/client';
import { enqueueNotification } from '../src/services/notifications';
import {
  drainOutbox,
  formatEmailContent,
  escapeHtml,
  BACKOFF_SCHEDULE_SECONDS,
  MAX_ATTEMPTS,
} from '../src/workers/drain';
import {
  ConsoleMailTransport,
  MailTransport,
  SendMailOptions,
  SendMailResult,
  SmtpMailTransport,
} from '../src/transport/mail';
import { scrubErrorMessage } from '../src/utils/errorScrubber';
import { withJobRun, runOutboxDrain } from '../src/jobs/jobRunner';
import { JobStatus, OutboxStatus } from '@prisma/client';

class MockMailTransport implements MailTransport {
  public sentMails: SendMailOptions[] = [];
  public shouldFail = false;
  public failErrorMessage = 'SMTP 550 Connection Refused';
  public delayMs = 0;

  async sendMail(options: SendMailOptions): Promise<SendMailResult> {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }
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
      const rawError =
        'Connection failed at postgresql://postgres:supersecretpassword123@db.internal:5432/pickem_db?token=secret_token_abc&apiKey=secret_key_123 while querying users';
      const scrubbed = scrubErrorMessage(rawError);

      expect(scrubbed).not.toContain('supersecretpassword123');
      expect(scrubbed).not.toContain('secret_token_abc');
      expect(scrubbed).not.toContain('secret_key_123');
      expect(scrubbed).toContain('[REDACTED_URL]');
      expect(scrubbed.length).toBeLessThanOrEqual(200);
    });

    it('preserves key names for passwords and tokens while redacting values', () => {
      const errorMsg = 'Invalid request: password=superSecretPassword&token=jwtSecretToken123&api_key=myApiKey999';
      const scrubbed = scrubErrorMessage(errorMsg);

      expect(scrubbed).toContain('password=[REDACTED]');
      expect(scrubbed).toContain('token=[REDACTED]');
      expect(scrubbed).toContain('api_key=[REDACTED]');
      expect(scrubbed).not.toContain('superSecretPassword');
      expect(scrubbed).not.toContain('jwtSecretToken123');
      expect(scrubbed).not.toContain('myApiKey999');
    });

    it('scrubs ECONNREFUSED host:port patterns', () => {
      const ipError = 'connect ECONNREFUSED 127.0.0.1:587';
      const scrubbedIp = scrubErrorMessage(ipError);
      expect(scrubbedIp).toContain('ECONNREFUSED [REDACTED_HOST]:[REDACTED_PORT]');
      expect(scrubbedIp).not.toContain('127.0.0.1:587');

      const hostError = 'Error: ECONNREFUSED smtp.mailservice.internal:25';
      const scrubbedHost = scrubErrorMessage(hostError);
      expect(scrubbedHost).toContain('ECONNREFUSED [REDACTED_HOST]:[REDACTED_PORT]');
      expect(scrubbedHost).not.toContain('smtp.mailservice.internal:25');
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

  describe('SMTP Mail Transport & Timeouts', () => {
    it('throws error on construction if MAIL_TRANSPORT=smtp and SMTP_FROM is missing', () => {
      const originalFrom = process.env.SMTP_FROM;
      delete process.env.SMTP_FROM;

      expect(() => new SmtpMailTransport()).toThrow('SMTP_FROM is required');

      process.env.SMTP_FROM = originalFrom;
    });

    it('fake hanging SMTP transporter times out and maps to error failure', async () => {
      process.env.SMTP_FROM = 'noreply@nflpickem.local';

      // Mock nodemailer transporter that simulates timeout
      const fakeHangingTransporter: any = {
        sendMail: vi.fn().mockRejectedValue(new Error('Connection timeout after 8000ms')),
      };

      const transport = new SmtpMailTransport(fakeHangingTransporter);
      const res = await transport.sendMail({
        to: 'user@example.com',
        subject: 'Test',
        text: 'Test',
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('Connection timeout after 8000ms');
    });
  });

  describe('HTML Escaping & Message-ID SHA256', () => {
    it('HTML escaping verification for interpolated markup in pool names and fields', () => {
      const maliciousPoolName = "<script>alert('xss')</script> & \"Champions\" <b>Pool</b>";
      const windowLabel = "Week 1 <img src='x' onerror='alert(1)'>";
      const deepLink = 'http://localhost:3000/picks?user=<script>';

      const content = formatEmailContent({
        type: 'PICK_REMINDER',
        payload: {
          poolName: maliciousPoolName,
          windowLabel,
          lockAtUtc: '2026-10-04T17:00:00Z',
          deepLink,
        },
      });

      expect(content.html).not.toContain('<script>');
      expect(content.html).not.toContain('<b>Pool</b>');
      expect(content.html).not.toContain("<img src='x'");
      expect(content.html).toContain('&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;');
      expect(content.html).toContain('&amp; &quot;Champions&quot;');
      expect(content.html).toContain('&lt;b&gt;Pool&lt;/b&gt;');
    });

    it('Message-ID SHA256 stability across executions', () => {
      const dedupeKey = 'reminder-pool1-user1-game1-24h';
      const hash1 = crypto.createHash('sha256').update(dedupeKey).digest('hex');
      const hash2 = crypto.createHash('sha256').update(dedupeKey).digest('hex');

      expect(hash1).toBe(hash2);
      expect(hash1).toBe('18f1c1b967db1474afd41c2cda1f0cf739b4f893054db3fd2a16287e0870fe0b');
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

      const expectedHash = crypto.createHash('sha256').update(dedupeKey).digest('hex');
      expect(mockTransport.sentMails[0].messageId).toBe(`<${expectedHash}@localhost>`);
      expect(mockTransport.sentMails[0].headers?.['X-Dedupe-Key']).toBe(dedupeKey);

      const event = await prisma.outboxEvent.findUnique({ where: { dedupeKey } });
      expect(event?.status).toBe(OutboxStatus.SENT);
      expect(event?.sentAt).toBeDefined();
      expect(event?.leaseExpiresAt).toBeNull();
      expect(event?.lastErrorCode).toBeNull();
    });

    it('sets status SUPPRESSED when user email preference is disabled', async () => {
      const dedupeKey = `drain-suppressed-${Date.now()}`;
      const mockTransport = new MockMailTransport();

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

      const expectedMinNext = new Date(beforeDrain + 59 * 1000);
      expect(event?.nextAttemptAt.getTime()).toBeGreaterThanOrEqual(expectedMinNext.getTime());
    });

    it('transitions to DEAD on 5th failure', async () => {
      const dedupeKey = `drain-dead-${Date.now()}`;
      const mockTransport = new MockMailTransport();
      mockTransport.shouldFail = true;

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

    it('Event repeatedly crashing during worker processing increments attempts to 5 and transitions to DEAD', async () => {
      const dedupeKey = `drain-crash-dead-${Date.now()}`;
      const mockTransport = new MockMailTransport();

      // Create event that was previously PROCESSING and lease expired (e.g. worker process crashed)
      await prisma.outboxEvent.create({
        data: {
          poolId: testPool.id,
          recipientUserId: testUser.id,
          type: 'PICK_REMINDER',
          payload: { poolName: testPool.name },
          dedupeKey,
          status: OutboxStatus.PROCESSING,
          attempts: 4, // 4 previous crashed attempts
          leaseExpiresAt: new Date(Date.now() - 1000), // Expired lease
        },
      });

      // Claiming this expired lease increments attempts from 4 to 5, reaching MAX_ATTEMPTS, so it immediately transitions to DEAD
      const drainRes = await drainOutbox({ transport: mockTransport });

      expect(drainRes.dead).toBe(1);
      expect(mockTransport.sentMails).toHaveLength(0); // Never sent

      const event = await prisma.outboxEvent.findUnique({ where: { dedupeKey } });
      expect(event?.status).toBe(OutboxStatus.DEAD);
      expect(event?.attempts).toBe(5);
      expect(event?.leaseExpiresAt).toBeNull();
    });

    it('Two concurrent workers with slow fake transport never duplicate sends (conditional renewal test)', async () => {
      const dedupeKey = `drain-concurrent-${Date.now()}`;
      const slowTransport = new MockMailTransport();
      slowTransport.delayMs = 50;

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

      // Run two concurrent drainOutbox calls
      const [res1, res2] = await Promise.all([
        drainOutbox({ batchSize: 10, transport: slowTransport }),
        drainOutbox({ batchSize: 10, transport: slowTransport }),
      ]);

      // Together, exactly 1 send must occur
      const totalSucceeded = res1.succeeded + res2.succeeded;
      expect(totalSucceeded).toBe(1);
      expect(slowTransport.sentMails).toHaveLength(1);

      const event = await prisma.outboxEvent.findUnique({ where: { dedupeKey } });
      expect(event?.status).toBe(OutboxStatus.SENT);
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

    it('transitions to PARTIAL status when succeeded > 0 and failed + dead > 0', async () => {
      const job = await withJobRun('partial_worker', async () => {
        return {
          itemsProcessed: 10,
          succeeded: 8,
          failed: 1,
          dead: 1,
          meta: { batch: 'partial' },
        };
      });

      expect(job.status).toBe(JobStatus.PARTIAL);
      expect(job.itemsProcessed).toBe(10);

      const stored = await prisma.jobRun.findUnique({ where: { id: job.id } });
      expect(stored?.status).toBe(JobStatus.PARTIAL);
    });

    it('database write failure does not fail or abort the underlying job execution', async () => {
      // Mock prisma.jobRun.create to fail as if DB write failed
      const originalCreate = prisma.jobRun.create;
      vi.spyOn(prisma.jobRun, 'create').mockRejectedValueOnce(new Error('DB Connection Lost'));

      let underlyingExecuted = false;
      const job = await withJobRun('resilient_job', async () => {
        underlyingExecuted = true;
        return { itemsProcessed: 99 };
      });

      expect(underlyingExecuted).toBe(true);
      expect(job.status).toBe(JobStatus.OK);
      expect(job.itemsProcessed).toBe(99);

      // Restore
      vi.restoreAllMocks();
    });

    it('runOutboxDrain integrates with withJobRun', async () => {
      const { jobRun, drainResult } = await runOutboxDrain({ batchSize: 10 });
      expect(jobRun.jobName).toBe('outbox_drain');
      expect(jobRun.status).toBe(JobStatus.OK);
      expect(drainResult).toBeDefined();
    });
  });
});
