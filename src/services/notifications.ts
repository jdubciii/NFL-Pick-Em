import { Prisma } from '@prisma/client';

export interface EnqueueNotificationInput {
  poolId: string;
  userId: string;
  type: string;
  payload: any;
  dedupeKey: string;
}

export interface EnqueueNotificationResult {
  inboxMessageId?: string;
  outboxEventCreated: boolean;
  dedupeKey: string;
}

/**
 * Enqueues an in-app inbox message and an outbox event transactionally.
 * Conforms to Decision #5 (Inbox is the source of truth; email is best-effort)
 * and INV-6 (Non-blocking outbound: Zero network calls, DB transaction only).
 *
 * Idempotency is guaranteed via unique dedupeKey on outbox_events.
 */
export async function enqueueNotification(
  tx: Prisma.TransactionClient | any,
  input: {
    poolId: string;
    userId: string;
    type: string;
    payload: any;
    dedupeKey: string;
  }
): Promise<EnqueueNotificationResult> {
  const { poolId, userId, type, payload, dedupeKey } = input;

  if (!poolId || !userId || !type || !dedupeKey) {
    throw new Error('poolId, userId, type, and dedupeKey are required to enqueue a notification');
  }

  // 1. Create the Inbox message (source of truth)
  const inboxMessage = await tx.inboxMessage.create({
    data: {
      poolId,
      userId,
      type,
      payload: payload ?? {},
    },
  });

  // 2. Create the Outbox event idempotently using createMany with skipDuplicates: true
  const outboxResult = await tx.outboxEvent.createMany({
    data: [
      {
        poolId,
        recipientUserId: userId,
        type,
        payload: payload ?? {},
        dedupeKey,
        status: 'PENDING',
        attempts: 0,
      },
    ],
    skipDuplicates: true,
  });

  return {
    inboxMessageId: inboxMessage.id,
    outboxEventCreated: outboxResult.count > 0,
    dedupeKey,
  };
}
