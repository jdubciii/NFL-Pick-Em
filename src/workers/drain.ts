import { OutboxStatus, Prisma } from '@prisma/client';
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

/**
 * Renders simple subject and body content from an outbox event.
 */
export function formatEmailContent(event: { type: string; payload: any }): { subject: string; text: string; html: string } {
  const payload = event.payload || {};
  const poolName = payload.poolName || 'NFL Pick Em';
  const windowLabel = payload.windowLabel || 'Upcoming Games';
  const lockAtUtc = payload.lockAtUtc ? new Date(payload.lockAtUtc).toUTCString() : '';
  const deepLink = payload.deepLink || '/';

  let subject = `[${poolName}] Reminder: ${windowLabel}`;
  let text = `Hello,\n\nThis is a reminder for ${poolName} (${windowLabel}). Picks lock at ${lockAtUtc}.\n\nMake your picks here: ${deepLink}\n`;
  let html = `<p>Hello,</p><p>This is a reminder for <strong>${poolName}</strong> (<em>${windowLabel}</em>). Picks lock at <strong>${lockAtUtc}</strong>.</p><p><a href="${deepLink}">Make your picks here</a></p>`;

  if (event.type === 'WRAPUP_REMINDER') {
    subject = `[${poolName}] Weekly Wrap-up Available: ${windowLabel}`;
    text = `Hello,\n\nThe weekly results and penalty standings for ${poolName} are now finalized for ${windowLabel}.\n\nView standings: ${deepLink}\n`;
    html = `<p>Hello,</p><p>The weekly results and penalty standings for <strong>${poolName}</strong> are now finalized for <em>${windowLabel}</em>.</p><p><a href="${deepLink}">View standings here</a></p>`;
  }

  return { subject, text, html };
}

/**
 * Claims and processes a batch of pending outbox events using PostgreSQL FOR UPDATE SKIP LOCKED.
 * Conforms to Decision #5 (Outbox is best-effort dispatch),
 * Decision #57 (Dedupe key used as provider Message-ID),
 * and 60s lease reclamation.
 */
export async function drainOutbox(options: DrainOptions = {}): Promise<DrainResult> {
  const batchSize = options.batchSize || 50;
  const transport = options.transport || getMailTransport();

  const stats: DrainResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    dead: 0,
    suppressed: 0,
  };

  // Step 1: Claim batch of pending / expired-lease events with FOR UPDATE SKIP LOCKED
  const claimedEvents = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + LEASE_DURATION_MS);

    // Query pending events ready for dispatch
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
      return [];
    }

    const eventIds = rows.map((r) => r.id);

    // Acquire 60-second lease
    await tx.outboxEvent.updateMany({
      where: { id: { in: eventIds } },
      data: {
        status: 'PROCESSING',
        leaseExpiresAt,
      },
    });

    return rows;
  });

  if (claimedEvents.length === 0) {
    return stats;
  }

  // Step 2: Process each claimed event
  for (const event of claimedEvents) {
    stats.processed++;

    try {
      // Check recipient email notification preferences (SUPPRESSED check)
      const pref = await prisma.notificationPreference.findUnique({
        where: { userId: event.recipient_user_id },
      });

      if (pref && pref.emailEnabled === false) {
        // Suppress email dispatch
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'SUPPRESSED',
            leaseExpiresAt: null,
            lastErrorCode: null,
          },
        });
        stats.suppressed++;
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

      const { subject, text, html } = formatEmailContent(event);

      // Send mail with dedupeKey as Message-ID for provider deduplication
      const sendResult = await transport.sendMail({
        to: user.email,
        subject,
        text,
        html,
        messageId: `<${event.dedupe_key}@nflpickem.local>`,
        headers: {
          'X-Dedupe-Key': event.dedupe_key,
        },
      });

      if (!sendResult.success) {
        throw new Error(sendResult.error || 'Mail transport reported failure');
      }

      // Mark SENT on success
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          leaseExpiresAt: null,
          lastErrorCode: null,
        },
      });
      stats.succeeded++;
    } catch (err: any) {
      const scrubbed = scrubErrorMessage(err);
      const nextAttempts = event.attempts + 1;
      const isDead = nextAttempts >= MAX_ATTEMPTS;
      const nextStatus: OutboxStatus = isDead ? 'DEAD' : 'PENDING';

      // Compute discrete backoff schedule
      const backoffSec = BACKOFF_SCHEDULE_SECONDS[Math.min(nextAttempts - 1, BACKOFF_SCHEDULE_SECONDS.length - 1)];
      const nextAttemptAt = new Date(Date.now() + backoffSec * 1000);

      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: nextStatus,
          attempts: nextAttempts,
          nextAttemptAt,
          leaseExpiresAt: null,
          lastErrorCode: scrubbed,
        },
      });

      if (isDead) {
        stats.dead++;
      } else {
        stats.failed++;
      }
    }
  }

  return stats;
}
