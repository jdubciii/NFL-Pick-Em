import crypto from 'crypto';
import { OutboxStatus } from '@prisma/client';
import prisma from '../db/client';
import { MailTransport, getMailTransport } from '../transport/mail';
import { scrubErrorMessage } from '../utils/errorScrubber';

export const BACKOFF_SCHEDULE_SECONDS = [60, 300, 1800, 7200, 43200] as const; // 1m, 5m, 30m, 2h, 12h
export const MAX_ATTEMPTS = 5;
export const LEASE_DURATION_MS = 60 * 1000; // 60 seconds

export interface DrainOptions {
  batchSize?: number;
  transport?: MailTransport;
}

export interface DrainResult {
  processed: number;
  succeeded: number;
  failed: number;
  dead: number;
  suppressed: number;
}

export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Renders subject, plain text, and HTML-escaped body content from an outbox event.
 */
export function formatEmailContent(event: { type: string; payload: any }): { subject: string; text: string; html: string } {
  const payload = event.payload || {};
  const rawPoolName = payload.poolName || 'NFL Pick Em';
  const rawWindowLabel = payload.windowLabel || 'Upcoming Games';
  const rawLockAtUtc = payload.lockAtUtc ? new Date(payload.lockAtUtc).toUTCString() : '';
  const rawDeepLink = payload.deepLink || '/';

  const poolName = escapeHtml(rawPoolName);
  const windowLabel = escapeHtml(rawWindowLabel);
  const lockAtUtc = escapeHtml(rawLockAtUtc);
  const deepLink = escapeHtml(rawDeepLink);

  let subject = `[${rawPoolName}] Reminder: ${rawWindowLabel}`;
  let text = `Hello,\n\nThis is a reminder for ${rawPoolName} (${rawWindowLabel}). Picks lock at ${rawLockAtUtc}.\n\nMake your picks here: ${rawDeepLink}\n`;
  let html = `<p>Hello,</p><p>This is a reminder for <strong>${poolName}</strong> (<em>${windowLabel}</em>). Picks lock at <strong>${lockAtUtc}</strong>.</p><p><a href="${deepLink}">Make your picks here</a></p>`;

  if (event.type === 'WRAPUP_REMINDER') {
    subject = `[${rawPoolName}] Weekly Wrap-up Available: ${rawWindowLabel}`;
    text = `Hello,\n\nThe weekly results and penalty standings for ${rawPoolName} are now finalized for ${rawWindowLabel}.\n\nView standings: ${rawDeepLink}\n`;
    html = `<p>Hello,</p><p>The weekly results and penalty standings for <strong>${poolName}</strong> are now finalized for <em>${windowLabel}</em>.</p><p><a href="${deepLink}">View standings here</a></p>`;
  }

  return { subject, text, html };
}

/**
 * Claims and processes a batch of pending outbox events using PostgreSQL FOR UPDATE SKIP LOCKED.
 * Conforms to:
 * - Decision #5: Outbox is best-effort dispatch
 * - Decision #57: Dedupe key used as basis for provider Message-ID
 * - Decision #59: FOR UPDATE SKIP LOCKED with explicit lease timeouts and discrete backoff
 * - Decision #60: Every claim of a leased job item counts as an attempt; verified before send and when recorded
 */
export async function drainOutbox(options: DrainOptions = {}): Promise<DrainResult> {
  const batchSize = options.batchSize || 10;
  const transport = options.transport || getMailTransport();

  const stats: DrainResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    dead: 0,
    suppressed: 0,
  };

  // Step 1: Claim batch with FOR UPDATE SKIP LOCKED and increment attempts on expired leases
  const { eventsToProcess, deadCount } = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + LEASE_DURATION_MS);

    const rows = await tx.$queryRaw<
      Array<{
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
      }>
    >`
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

    if (rows.length === 0) {
      return { eventsToProcess: [], deadCount: 0 };
    }

    let deadCount = 0;
    const eventsToProcess: typeof rows = [];

    for (const row of rows) {
      if (row.status === 'PROCESSING') {
        const newAttempts = row.attempts + 1;
        if (newAttempts >= MAX_ATTEMPTS) {
          await tx.$executeRaw`
            UPDATE outbox_events
            SET status = 'DEAD'::"OutboxStatus",
                attempts = ${newAttempts},
                lease_expires_at = NULL
            WHERE id = ${row.id}::uuid
          `;
          deadCount++;
        } else {
          await tx.$executeRaw`
            UPDATE outbox_events
            SET status = 'PROCESSING'::"OutboxStatus",
                attempts = ${newAttempts},
                lease_expires_at = ${leaseExpiresAt}
            WHERE id = ${row.id}::uuid
          `;
          eventsToProcess.push({ ...row, attempts: newAttempts });
        }
      } else {
        await tx.$executeRaw`
          UPDATE outbox_events
          SET status = 'PROCESSING'::"OutboxStatus",
              lease_expires_at = ${leaseExpiresAt}
          WHERE id = ${row.id}::uuid
        `;
        eventsToProcess.push(row);
      }
    }

    return { eventsToProcess, deadCount };
  });

  stats.processed += deadCount;
  stats.dead += deadCount;

  if (eventsToProcess.length === 0) {
    return stats;
  }

  // Step 2: Process each claimed event
  for (const event of eventsToProcess) {
    stats.processed++;

    try {
      // Check recipient email notification preferences (SUPPRESSED check)
      const pref = await prisma.notificationPreference.findUnique({
        where: { userId: event.recipient_user_id },
      });

      if (pref && pref.emailEnabled === false) {
        // Suppress email dispatch - Must include WHERE id = $1 AND status = 'PROCESSING'
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

      // Lookup recipient user
      const user = await prisma.user.findUnique({
        where: { id: event.recipient_user_id },
        select: { email: true },
      });

      if (!user || !user.email) {
        throw new Error(`Recipient user ${event.recipient_user_id} has no valid email`);
      }

      // Lease safety check: conditional renewal before each send
      const renewed = await prisma.$executeRaw`
        UPDATE outbox_events
        SET lease_expires_at = now() + interval '60 seconds'
        WHERE id = ${event.id}::uuid AND status = 'PROCESSING'::"OutboxStatus" AND lease_expires_at > now()
      `;

      if (renewed === 0) {
        // Lease lost or expired; skip sending
        continue;
      }

      const { subject, text, html } = formatEmailContent(event);

      // Format Message-ID as <sha256(dedupe_key)@MAIL_DOMAIN> with raw key in X-Dedupe-Key
      const mailDomain = process.env.MAIL_DOMAIN || 'localhost';
      const hashedKey = crypto.createHash('sha256').update(event.dedupe_key).digest('hex');
      const messageId = `<${hashedKey}@${mailDomain}>`;

      const sendResult = await transport.sendMail({
        to: user.email,
        subject,
        text,
        html,
        messageId,
        headers: {
          'X-Dedupe-Key': event.dedupe_key,
        },
      });

      if (!sendResult.success) {
        throw new Error(sendResult.error || 'Mail transport reported failure');
      }

      // Mark SENT on success - Must include WHERE id = $1 AND status = 'PROCESSING'
      const updated = await prisma.$executeRaw`
        UPDATE outbox_events
        SET status = 'SENT'::"OutboxStatus",
            sent_at = NOW(),
            lease_expires_at = NULL,
            last_error_code = NULL
        WHERE id = ${event.id}::uuid AND status = 'PROCESSING'::"OutboxStatus"
      `;

      if (updated > 0) {
        stats.succeeded++;
      }
    } catch (err: any) {
      const scrubbed = scrubErrorMessage(err);
      const nextAttempts = event.attempts + 1;
      const isDead = nextAttempts >= MAX_ATTEMPTS;
      const nextStatus: OutboxStatus = isDead ? 'DEAD' : 'PENDING';

      // Compute discrete backoff schedule
      const backoffSec = BACKOFF_SCHEDULE_SECONDS[Math.min(nextAttempts - 1, BACKOFF_SCHEDULE_SECONDS.length - 1)];
      const nextAttemptAt = new Date(Date.now() + backoffSec * 1000);

      // Record result - Must include WHERE id = $1 AND status = 'PROCESSING'
      const updated = await prisma.$executeRaw`
        UPDATE outbox_events
        SET status = ${nextStatus}::"OutboxStatus",
            attempts = ${nextAttempts},
            next_attempt_at = ${nextAttemptAt},
            lease_expires_at = NULL,
            last_error_code = ${scrubbed}
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
