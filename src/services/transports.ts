import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { OutboxStatus } from '@prisma/client';
import prisma from '../db/client';
import { scrubErrorMessage } from '../utils/errorScrubber';
import { formatEmailContent } from '../workers/drain';

export type ClockFn = () => Date;
export const defaultClock: ClockFn = () => new Date();

export const DEFAULT_BASE_BACKOFF_SECONDS = 60; // 1 minute
export const DEFAULT_MAX_ATTEMPTS = 5;
export const DEFAULT_BACKOFF_EXPONENT = 2;
export const LEASE_DURATION_MS = 60 * 1000; // 60 seconds

export interface TransportMessage {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  messageId?: string;
  headers?: Record<string, string>;
  dedupeKey: string;
  metadata?: Record<string, any>;
}

export interface TransportResult {
  success: boolean;
  messageId?: string;
  error?: string;
  permanentFailure?: boolean;
}

export interface TransportAdapter {
  name: string;
  send(message: TransportMessage): Promise<TransportResult>;
}

/**
 * Mock transport adapter for deterministic local and integration testing.
 */
export class MockTransportAdapter implements TransportAdapter {
  public name = 'mock';
  public sentMessages: TransportMessage[] = [];
  public shouldFail = false;
  public failPermanent = false;
  public failError = 'Simulated transport failure';
  public delayMs = 0;

  async send(message: TransportMessage): Promise<TransportResult> {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }

    if (this.shouldFail) {
      return {
        success: false,
        error: this.failError,
        permanentFailure: this.failPermanent,
      };
    }

    this.sentMessages.push(message);
    return {
      success: true,
      messageId: message.messageId || `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    };
  }

  reset(): void {
    this.sentMessages = [];
    this.shouldFail = false;
    this.failPermanent = false;
    this.failError = 'Simulated transport failure';
    this.delayMs = 0;
  }
}

/**
 * Console transport adapter for local development logging.
 */
export class ConsoleTransportAdapter implements TransportAdapter {
  public name = 'console';
  private logPath: string;

  constructor(logPath: string = path.resolve(process.cwd(), 'logs', 'transports-dev.log')) {
    this.logPath = logPath;
  }

  async send(message: TransportMessage): Promise<TransportResult> {
    const dir = path.dirname(this.logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      to: message.to,
      subject: message.subject,
      messageId: message.messageId,
      headers: message.headers,
      text: message.text,
      html: message.html,
      dedupeKey: message.dedupeKey,
      metadata: message.metadata,
    };

    fs.appendFileSync(this.logPath, JSON.stringify(logEntry) + '\n', 'utf8');

    return {
      success: true,
      messageId: message.messageId || `console-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    };
  }
}

let defaultAdapterInstance: TransportAdapter = new ConsoleTransportAdapter();

export function getDefaultTransportAdapter(): TransportAdapter {
  return defaultAdapterInstance;
}

export function setDefaultTransportAdapter(adapter: TransportAdapter): void {
  defaultAdapterInstance = adapter;
}

/**
 * Calculates exponential backoff in seconds based on attempt count.
 * Formula: baseIntervalSeconds * (exponent ^ (attempt - 1))
 * Jitter-free for deterministic unit and integration test assertions.
 */
export function calculateBackoffSeconds(
  attempts: number,
  baseIntervalSeconds: number = DEFAULT_BASE_BACKOFF_SECONDS,
  exponent: number = DEFAULT_BACKOFF_EXPONENT
): number {
  const power = Math.max(0, attempts - 1);
  return baseIntervalSeconds * Math.pow(exponent, power);
}

/**
 * Calculates the next attempt timestamp given attempt count and clock function.
 */
export function calculateNextAttemptAt(
  attempts: number,
  clock: ClockFn = defaultClock,
  baseIntervalSeconds: number = DEFAULT_BASE_BACKOFF_SECONDS,
  exponent: number = DEFAULT_BACKOFF_EXPONENT
): Date {
  const now = clock();
  const backoffSec = calculateBackoffSeconds(attempts, baseIntervalSeconds, exponent);
  return new Date(now.getTime() + backoffSec * 1000);
}

export interface ProcessBatchOptions {
  batchSize?: number;
  adapter?: TransportAdapter;
  clock?: ClockFn;
  maxAttempts?: number;
  baseIntervalSeconds?: number;
  exponent?: number;
}

export interface ProcessBatchResult {
  processed: number;
  succeeded: number;
  failed: number;
  dead: number;
  suppressed: number;
}

/**
 * Processes a batch of pending/retryable outbox events using PostgreSQL row-level locks (FOR UPDATE SKIP LOCKED).
 * Enforces:
 * - State machine transitions: PENDING -> PROCESSING -> SENT / FAILED / DEAD
 * - Deduplication via unique dedupeKey (Decision #57)
 * - Dead-letter queue (DLQ) invariants with structured JSON diagnostic errors
 * - Injectable clock for deterministic verification without wall-clock drift
 */
export async function processTransportsBatch(options: ProcessBatchOptions = {}): Promise<ProcessBatchResult> {
  const batchSize = options.batchSize || 10;
  const adapter = options.adapter || getDefaultTransportAdapter();
  const hasCustomClock = typeof options.clock === 'function';
  const clock = options.clock || defaultClock;
  const maxAttempts = options.maxAttempts || DEFAULT_MAX_ATTEMPTS;
  const baseIntervalSeconds = options.baseIntervalSeconds || DEFAULT_BASE_BACKOFF_SECONDS;
  const exponent = options.exponent || DEFAULT_BACKOFF_EXPONENT;

  const stats: ProcessBatchResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    dead: 0,
    suppressed: 0,
  };

  const now = clock();
  const leaseExpiresAt = new Date(now.getTime() + LEASE_DURATION_MS);

  // Step 1: Claim batch atomically with FOR UPDATE SKIP LOCKED
  const { eventsToProcess, deadCount } = await prisma.$transaction(async (tx) => {
    let rows: Array<{
      id: string;
      pool_id: string;
      recipient_user_id: string;
      type: string;
      payload: any;
      dedupe_key: string;
      status: OutboxStatus;
      attempts: number;
      next_attempt_at: Date;
      lease_expires_at: Date | null;
    }>;

    if (hasCustomClock) {
      rows = await tx.$queryRaw`
        SELECT id, pool_id, recipient_user_id, type, payload, dedupe_key, status, attempts, next_attempt_at, lease_expires_at
        FROM outbox_events
        WHERE (
          (status = 'PENDING'::"OutboxStatus" AND next_attempt_at <= ${now} AND (lease_expires_at IS NULL OR lease_expires_at <= ${now}))
          OR
          (status = 'PROCESSING'::"OutboxStatus" AND lease_expires_at IS NOT NULL AND lease_expires_at <= ${now})
        )
        ORDER BY next_attempt_at ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED;
      `;
    } else {
      rows = await tx.$queryRaw`
        SELECT id, pool_id, recipient_user_id, type, payload, dedupe_key, status, attempts, next_attempt_at, lease_expires_at
        FROM outbox_events
        WHERE (
          (status = 'PENDING'::"OutboxStatus" AND next_attempt_at <= NOW() AND (lease_expires_at IS NULL OR lease_expires_at <= NOW()))
          OR
          (status = 'PROCESSING'::"OutboxStatus" AND lease_expires_at IS NOT NULL AND lease_expires_at <= NOW())
        )
        ORDER BY next_attempt_at ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED;
      `;
    }

    if (rows.length === 0) {
      return { eventsToProcess: [], deadCount: 0 };
    }

    let localDeadCount = 0;
    const claimed: typeof rows = [];

    for (const row of rows) {
      if (row.status === 'PROCESSING') {
        const newAttempts = row.attempts + 1;
        if (newAttempts >= maxAttempts) {
          const dlqDiag = JSON.stringify({
            code: 'MAX_RETRIES_EXCEEDED',
            reason: 'Lease expired repeatedly during processing',
            attempts: newAttempts,
            maxAttempts,
            timestamp: now.toISOString(),
          });

          await tx.$executeRaw`
            UPDATE outbox_events
            SET status = 'DEAD'::"OutboxStatus",
                attempts = ${newAttempts},
                lease_expires_at = NULL,
                last_error_code = ${dlqDiag}
            WHERE id = ${row.id}::uuid
          `;
          localDeadCount++;
        } else {
          if (hasCustomClock) {
            await tx.$executeRaw`
              UPDATE outbox_events
              SET status = 'PROCESSING'::"OutboxStatus",
                  attempts = ${newAttempts},
                  lease_expires_at = ${leaseExpiresAt}
              WHERE id = ${row.id}::uuid
            `;
          } else {
            await tx.$executeRaw`
              UPDATE outbox_events
              SET status = 'PROCESSING'::"OutboxStatus",
                  attempts = ${newAttempts},
                  lease_expires_at = NOW() + interval '60 seconds'
              WHERE id = ${row.id}::uuid
            `;
          }
          claimed.push({ ...row, attempts: newAttempts });
        }
      } else {
        if (hasCustomClock) {
          await tx.$executeRaw`
            UPDATE outbox_events
            SET status = 'PROCESSING'::"OutboxStatus",
                lease_expires_at = ${leaseExpiresAt}
            WHERE id = ${row.id}::uuid
          `;
        } else {
          await tx.$executeRaw`
            UPDATE outbox_events
            SET status = 'PROCESSING'::"OutboxStatus",
                lease_expires_at = NOW() + interval '60 seconds'
            WHERE id = ${row.id}::uuid
          `;
        }
        claimed.push(row);
      }
    }

    return { eventsToProcess: claimed, deadCount: localDeadCount };
  });

  stats.processed += deadCount;
  stats.dead += deadCount;

  if (eventsToProcess.length === 0) {
    return stats;
  }

  // Step 2: Dispatch claimed events through transport adapter
  for (const event of eventsToProcess) {
    stats.processed++;

    try {
      // 1. Verify dedupeKey invariant (Decision #57)
      if (!event.dedupe_key) {
        throw new Error('DEDUPE_KEY_MISSING');
      }

      // 2. Check recipient notification preferences
      const pref = await prisma.notificationPreference.findUnique({
        where: { userId: event.recipient_user_id },
      });

      if (pref && pref.emailEnabled === false) {
        const updated = await prisma.$executeRaw`
          UPDATE outbox_events
          SET status = 'SUPPRESSED'::"OutboxStatus",
              lease_expires_at = NULL,
              last_error_code = NULL
          WHERE id = ${event.id}::uuid AND status = 'PROCESSING'::"OutboxStatus"
        `;
        if (updated > 0) {
          stats.suppressed++;
        }
        continue;
      }

      // 3. Lookup recipient user
      const user = await prisma.user.findUnique({
        where: { id: event.recipient_user_id },
        select: { email: true },
      });

      if (!user || !user.email) {
        throw new Error(`Recipient user ${event.recipient_user_id} has no valid email`);
      }

      // 4. Lease safety check before send (atomic conditional renewal)
      let renewed: number;
      if (hasCustomClock) {
        const currentCheck = clock();
        const newLease = new Date(currentCheck.getTime() + LEASE_DURATION_MS);
        renewed = await prisma.$executeRaw`
          UPDATE outbox_events
          SET lease_expires_at = ${newLease}
          WHERE id = ${event.id}::uuid AND status = 'PROCESSING'::"OutboxStatus" AND lease_expires_at > ${currentCheck}
        `;
      } else {
        renewed = await prisma.$executeRaw`
          UPDATE outbox_events
          SET lease_expires_at = NOW() + interval '60 seconds'
          WHERE id = ${event.id}::uuid AND status = 'PROCESSING'::"OutboxStatus" AND lease_expires_at > NOW()
        `;
      }

      if (renewed === 0) {
        // Lease lost or expired; do not dispatch duplicate
        continue;
      }

      // 5. Format email message
      const { subject, text, html } = formatEmailContent(event);
      const mailDomain = process.env.MAIL_DOMAIN || 'localhost';
      const hashedKey = crypto.createHash('sha256').update(event.dedupe_key).digest('hex');
      const messageId = `<${hashedKey}@${mailDomain}>`;

      // 6. Send via transport adapter
      const sendResult = await adapter.send({
        to: user.email,
        subject,
        text,
        html,
        messageId,
        dedupeKey: event.dedupe_key,
        headers: {
          'X-Dedupe-Key': event.dedupe_key,
          'X-Outbox-ID': event.id,
        },
        metadata: {
          poolId: event.pool_id,
          recipientUserId: event.recipient_user_id,
          type: event.type,
        },
      });

      if (!sendResult.success) {
        const isPermanent = sendResult.permanentFailure === true;
        const errPayload = new Error(sendResult.error || 'Transport dispatch failed');
        (errPayload as any).permanentFailure = isPermanent;
        throw errPayload;
      }

      // 7. Atomic state transition to SENT (DELIVERED)
      let updated: number;
      if (hasCustomClock) {
        const executionNow = clock();
        updated = await prisma.$executeRaw`
          UPDATE outbox_events
          SET status = 'SENT'::"OutboxStatus",
              sent_at = ${executionNow},
              lease_expires_at = NULL,
              last_error_code = NULL
          WHERE id = ${event.id}::uuid AND status = 'PROCESSING'::"OutboxStatus"
        `;
      } else {
        updated = await prisma.$executeRaw`
          UPDATE outbox_events
          SET status = 'SENT'::"OutboxStatus",
              sent_at = NOW(),
              lease_expires_at = NULL,
              last_error_code = NULL
          WHERE id = ${event.id}::uuid AND status = 'PROCESSING'::"OutboxStatus"
        `;
      }

      if (updated > 0) {
        stats.succeeded++;
      }
    } catch (err: any) {
      const isPermanent = err?.permanentFailure === true;
      const scrubbed = scrubErrorMessage(err);
      const nextAttempts = event.attempts + 1;
      const isDead = isPermanent || nextAttempts >= maxAttempts;
      const nextStatus: OutboxStatus = isDead ? 'DEAD' : 'PENDING';

      const diagCode = isPermanent
        ? 'PERMANENT_REJECTION'
        : isDead
        ? 'MAX_RETRIES_EXCEEDED'
        : 'TRANSIENT_FAILURE';

      const diagnosticJson = JSON.stringify({
        code: diagCode,
        reason: scrubbed,
        attempt: nextAttempts,
        maxAttempts,
        timestamp: clock().toISOString(),
      });

      const nextAttemptAt = calculateNextAttemptAt(nextAttempts, clock, baseIntervalSeconds, exponent);

      const updated = await prisma.$executeRaw`
        UPDATE outbox_events
        SET status = ${nextStatus}::"OutboxStatus",
            attempts = ${nextAttempts},
            next_attempt_at = ${nextAttemptAt},
            lease_expires_at = NULL,
            last_error_code = ${diagnosticJson}
        WHERE id = ${event.id}::uuid AND status = 'PROCESSING'::"OutboxStatus"
      `;

      if (updated > 0) {
        if (isDead) {
          stats.dead++;
        } else {
          stats.failed++;
        }
      }
    }
  }

  return stats;
}

/**
 * Read-only status query for transports queue and DLQ metrics (Decision #54).
 */
export async function getTransportsQueueStatus() {
  const [pending, processing, sent, failed, dead, suppressed] = await Promise.all([
    prisma.outboxEvent.count({ where: { status: OutboxStatus.PENDING } }),
    prisma.outboxEvent.count({ where: { status: OutboxStatus.PROCESSING } }),
    prisma.outboxEvent.count({ where: { status: OutboxStatus.SENT } }),
    prisma.outboxEvent.count({ where: { status: OutboxStatus.FAILED } }),
    prisma.outboxEvent.count({ where: { status: OutboxStatus.DEAD } }),
    prisma.outboxEvent.count({ where: { status: OutboxStatus.SUPPRESSED } }),
  ]);

  const recentDead = await prisma.outboxEvent.findMany({
    where: { status: OutboxStatus.DEAD },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      poolId: true,
      recipientUserId: true,
      type: true,
      dedupeKey: true,
      attempts: true,
      lastErrorCode: true,
      createdAt: true,
    },
  });

  return {
    queueDepth: {
      pending,
      processing,
      sent,
      failed,
      dead,
      suppressed,
    },
    deadLetterCount: dead,
    recentDeadEvents: recentDead,
  };
}
