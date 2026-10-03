import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../db/client';
import { OutboxStatus } from '@prisma/client';

export const webhooksRouter = Router();

export const DEFAULT_WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || process.env.NOTIFICATIONS_WEBHOOK_SECRET || 'nfl-pickem-webhook-secret-2026';

/**
 * Constant-time cryptographic signature verification for inbound webhook payloads.
 * Supports raw hex signatures and 'sha256=<hex>' header formats.
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer | object,
  signatureHeader: string | undefined,
  secret: string = DEFAULT_WEBHOOK_SECRET
): boolean {
  if (!signatureHeader || !secret) {
    return false;
  }

  try {
    const cleanSignature = signatureHeader.startsWith('sha256=')
      ? signatureHeader.slice(7).trim()
      : signatureHeader.trim();

    const payloadString = typeof rawBody === 'string'
      ? rawBody
      : Buffer.isBuffer(rawBody)
      ? rawBody.toString('utf8')
      : JSON.stringify(rawBody);

    const computedHex = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');

    if (cleanSignature.length !== computedHex.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(cleanSignature, 'utf8'),
      Buffer.from(computedHex, 'utf8')
    );
  } catch {
    return false;
  }
}

/**
 * Helper to compute an HMAC SHA-256 signature for test requests or provider mock.
 */
export function signWebhookPayload(payload: string | object, secret: string = DEFAULT_WEBHOOK_SECRET): string {
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return `sha256=${crypto.createHmac('sha256', secret).update(payloadString).digest('hex')}`;
}

/**
 * GET /api/webhooks/notifications
 * Enforces Decision #54 (Side-effect free GETs).
 * Rejects GET requests with 405 Method Not Allowed or read-only schema metadata with ZERO state mutation.
 */
webhooksRouter.get('/notifications', (_req: Request, res: Response): void => {
  res.status(405).json({
    error: 'Method Not Allowed',
    allowedMethods: ['POST'],
    message: 'Notification webhook ingress requires POST with valid cryptographic signature.',
  });
});

/**
 * POST /api/webhooks/notifications
 * Inbound provider delivery callbacks (delivery confirmation, bounces, drops).
 * Protected by strict cryptographic HMAC SHA-256 signature verification.
 * Enforces Decision #55 (Fail-closed on DB failure: returns 500 without acknowledging receipt).
 */
webhooksRouter.post('/notifications', async (req: Request, res: Response): Promise<void> => {
  const signatureHeader =
    (req.headers['x-webhook-signature'] as string) ||
    (req.headers['x-signature-sha256'] as string) ||
    (req.headers['x-hub-signature-256'] as string) ||
    (req.headers['x-provider-signature'] as string);

  // 1. Cryptographic Signature Verification (Fail-closed on missing or invalid signature)
  const isValid = verifyWebhookSignature(req.body, signatureHeader, DEFAULT_WEBHOOK_SECRET);
  if (!isValid) {
    res.status(401).json({
      error: 'Unauthorized. Invalid or missing cryptographic webhook signature.',
    });
    return;
  }

  const payload = req.body || {};
  const { event, messageId, dedupeKey, error: providerError, recipient } = payload;

  if (!event) {
    res.status(400).json({ error: 'Missing required field: event' });
    return;
  }

  try {
    // 2. Atomic state mutation inside transaction (Decision #55: rollback and fail closed if DB error occurs)
    await prisma.$transaction(async (tx) => {
      // Lookup outbox event by dedupeKey or messageId
      let outboxEvent = null;

      if (dedupeKey) {
        outboxEvent = await tx.outboxEvent.findUnique({
          where: { dedupeKey: String(dedupeKey) },
        });
      }

      if (!outboxEvent && messageId) {
        // Find by hashed dedupe key or raw message id match if recorded in dedupeKey
        const cleanMessageId = String(messageId).replace(/[<>@].*$/g, '').replace(/^[<>]/g, '');
        outboxEvent = await tx.outboxEvent.findFirst({
          where: {
            OR: [
              { dedupeKey: String(messageId) },
              { dedupeKey: { contains: cleanMessageId } },
            ],
          },
        });
      }

      if (outboxEvent) {
        const normalizedEvent = String(event).toLowerCase();

        if (['delivered', 'sent', 'success'].includes(normalizedEvent)) {
          // Transition to SENT
          await tx.outboxEvent.update({
            where: { id: outboxEvent.id },
            data: {
              status: OutboxStatus.SENT,
              sentAt: new Date(),
              leaseExpiresAt: null,
              lastErrorCode: null,
            },
          });
        } else if (['bounced', 'dropped', 'permanent_failure', 'rejected'].includes(normalizedEvent)) {
          // Permanent failure -> transition to DEAD
          const diag = JSON.stringify({
            code: 'WEBHOOK_PERMANENT_BOUNCE',
            event: normalizedEvent,
            recipient: recipient || outboxEvent.recipientUserId,
            error: providerError || 'Delivery dropped or bounced by provider',
            receivedAt: new Date().toISOString(),
          });

          await tx.outboxEvent.update({
            where: { id: outboxEvent.id },
            data: {
              status: OutboxStatus.DEAD,
              leaseExpiresAt: null,
              lastErrorCode: diag,
            },
          });
        } else if (['failed', 'deferred', 'transient_failure'].includes(normalizedEvent)) {
          // Transient failure reported via webhook
          const diag = JSON.stringify({
            code: 'WEBHOOK_TRANSIENT_FAILURE',
            event: normalizedEvent,
            error: providerError || 'Transient failure reported by provider',
            receivedAt: new Date().toISOString(),
          });

          await tx.outboxEvent.update({
            where: { id: outboxEvent.id },
            data: {
              lastErrorCode: diag,
            },
          });
        }
      }
    });

    res.status(200).json({
      received: true,
      event,
      status: 'processed',
    });
  } catch (err: any) {
    // Fail closed (Decision #55): return 500 without acknowledging receipt so provider retries
    console.error('Webhook ingestion error (failing closed):', err);
    res.status(500).json({
      error: 'Failed to process webhook event',
      details: err?.message || 'Internal error',
    });
  }
});
