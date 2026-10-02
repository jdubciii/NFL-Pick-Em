import { Prisma } from '@prisma/client';

export type NotificationChannel = 'IN_APP' | 'EMAIL';

export const REMINDER_PAYLOAD_KEYS = ['poolName', 'windowLabel', 'lockAtUtc', 'deepLink'] as const;

export const ALLOWED_PAYLOAD_KEYS_BY_TYPE: Record<string, readonly string[]> = {
  REMINDER: REMINDER_PAYLOAD_KEYS,
  PICK_REMINDER: REMINDER_PAYLOAD_KEYS,
  WRAPUP_REMINDER: REMINDER_PAYLOAD_KEYS,
};

export interface EnqueueNotificationInput {
  poolId: string;
  userId: string;
  type: string;
  payload: any;
  dedupeKey: string;
  channels: NotificationChannel[];
}

export interface EnqueueNotificationResult {
  inboxMessageCreated: boolean;
  outboxEventCreated: boolean;
  dedupeKey: string;
}

/**
 * DEFAULT-DENY payload sanitizer.
 * Only keys explicitly declared in the registry for the given notification type are allowed.
 * Unregistered types or keys are stripped and logged as errors (does not throw).
 */
export function sanitizePayload(type: string, payload: any): Record<string, any> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {};
  }

  const allowedKeys = ALLOWED_PAYLOAD_KEYS_BY_TYPE[type];
  if (!allowedKeys) {
    console.error(`[notifications] DEFAULT-DENY: Unregistered notification type '${type}', payload stripped`);
    return {};
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (allowedKeys.includes(key)) {
      sanitized[key] = value;
    } else {
      console.error(`[notifications] Stripped unregistered payload key '${key}' for notification type '${type}'`);
    }
  }
  return sanitized;
}

/**
 * Enqueues an in-app inbox message and/or an outbox event transactionally.
 * Conforms to Decision #5 (Inbox is the source of truth; email is best-effort),
 * Decision #54 (No writes on GET),
 * Decision #57 (Every table written by a re-running job carries a database-enforced dedupe key),
 * and INV-6 (Non-blocking outbound: Zero network calls, DB transaction only).
 *
 * Idempotency is guaranteed via unique constraints on (user_id, dedupe_key) for inbox_messages
 * and dedupe_key on outbox_events with skipDuplicates: true.
 */
export async function enqueueNotification(
  tx: Prisma.TransactionClient | any,
  input: EnqueueNotificationInput
): Promise<EnqueueNotificationResult> {
  // Reject non-transaction or missing clients
  if (!tx || typeof (tx as any).$transaction === 'function' || !(tx as any).inboxMessage) {
    throw new Error('enqueueNotification must be called within an interactive transaction client');
  }

  const { poolId, userId, type, payload, dedupeKey, channels = ['IN_APP', 'EMAIL'] } = input;

  if (!poolId || !userId || !type || !dedupeKey) {
    throw new Error('poolId, userId, type, and dedupeKey are required to enqueue a notification');
  }

  const cleanPayload = sanitizePayload(type, payload);

  let inboxMessageCreated = false;
  if (channels.includes('IN_APP')) {
    const inboxResult = await tx.inboxMessage.createMany({
      data: [
        {
          poolId,
          userId,
          type,
          payload: cleanPayload,
          dedupeKey,
        },
      ],
      skipDuplicates: true,
    });
    inboxMessageCreated = inboxResult.count > 0;
  }

  let outboxEventCreated = false;
  if (channels.includes('EMAIL')) {
    const pref = await tx.notificationPreference.findUnique({
      where: { userId },
      select: { emailEnabled: true },
    });

    // Skip EMAIL channel if user preference emailEnabled === false
    if (pref === null || pref.emailEnabled !== false) {
      const outboxResult = await tx.outboxEvent.createMany({
        data: [
          {
            poolId,
            recipientUserId: userId,
            type,
            payload: cleanPayload,
            dedupeKey,
            status: 'PENDING',
            attempts: 0,
          },
        ],
        skipDuplicates: true,
      });
      outboxEventCreated = outboxResult.count > 0;
    }
  }

  return {
    inboxMessageCreated,
    outboxEventCreated,
    dedupeKey,
  };
}
