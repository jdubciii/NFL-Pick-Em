import { Router, Request, Response } from 'express';
import prisma from '../db/client';
import { requireAuth, UUID_REGEX } from '../middleware/auth';

export const notificationsRouter = Router();

export type ClockFn = () => Date;
let injectedClock: ClockFn | undefined;

export function setNotificationsClock(clock: ClockFn | undefined): void {
  injectedClock = clock;
}

function getNow(): Date {
  return injectedClock ? injectedClock() : new Date();
}

/**
 * GET /api/notifications
 * Protected route: Returns current authenticated user's inbox messages with unread count telemetry.
 * Scoped strictly to req.user.id (Decision #20).
 * Strict adherence to Decision #54 (NO WRITES ON GET: zero state mutations).
 */
notificationsRouter.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const poolId = req.query.poolId as string | undefined;
  const unreadOnly = req.query.unreadOnly === 'true' || req.query.unreadOnly === '1';
  const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 50, 1), 100);
  const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);

  try {
    const where: any = {
      userId,
    };

    if (poolId && UUID_REGEX.test(poolId)) {
      where.poolId = poolId;
    }

    if (unreadOnly) {
      where.readAt = null;
    }

    const [messages, totalCount, unreadCount] = await Promise.all([
      prisma.inboxMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.inboxMessage.count({ where: { userId } }),
      prisma.inboxMessage.count({ where: { userId, readAt: null } }),
    ]);

    res.json({
      messages,
      totalCount,
      unreadCount,
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

/**
 * POST /api/notifications/read
 * Protected route: Idempotently marks one or more notification IDs as read for req.user.id.
 * Accepts { id: string } or { ids: string[] }.
 * Fails closed with 404/403 if target notification does not belong to req.user.id (Decision #20 & #55).
 */
notificationsRouter.post('/read', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { id, ids } = req.body || {};

  if (!id && (!Array.isArray(ids) || ids.length === 0)) {
    res.status(400).json({ error: 'Notification id or array of ids is required.' });
    return;
  }

  try {
    const now = getNow();

    if (id) {
      if (typeof id !== 'string' || !UUID_REGEX.test(id)) {
        res.status(400).json({ error: 'Invalid notification id format.' });
        return;
      }

      // Check existence and verify tenant isolation (Decision #20)
      const existing = await prisma.inboxMessage.findUnique({
        where: { id },
      });

      if (!existing) {
        res.status(404).json({ error: 'Notification not found.' });
        return;
      }

      if (existing.userId !== userId) {
        // Cross-tenant access attempt: fail closed with 403 Forbidden
        res.status(403).json({ error: 'Forbidden. You do not have permission to modify this notification.' });
        return;
      }

      // Idempotent update
      const updated = existing.readAt
        ? existing
        : await prisma.inboxMessage.update({
            where: { id },
            data: { readAt: now },
          });

      res.status(200).json({
        success: true,
        message: updated,
      });
      return;
    }

    if (Array.isArray(ids)) {
      // Validate all IDs
      const invalid = ids.find((item) => typeof item !== 'string' || !UUID_REGEX.test(item));
      if (invalid) {
        res.status(400).json({ error: 'Invalid UUID format in notification ids array.' });
        return;
      }

      // Verify no cross-tenant manipulation
      const foreignRecord = await prisma.inboxMessage.findFirst({
        where: {
          id: { in: ids },
          userId: { not: userId },
        },
      });

      if (foreignRecord) {
        res.status(403).json({ error: 'Forbidden. One or more notifications belong to another user.' });
        return;
      }

      const result = await prisma.inboxMessage.updateMany({
        where: {
          id: { in: ids },
          userId,
          readAt: null,
        },
        data: { readAt: now },
      });

      res.status(200).json({
        success: true,
        markedCount: result.count,
      });
      return;
    }
  } catch (error: any) {
    console.error('Error marking notifications read:', error);
    res.status(500).json({ error: 'Failed to update notification read state.' });
  }
});

/**
 * POST /api/notifications/read-all
 * Protected route: Atomically marks all pending unread notifications for req.user.id as read.
 */
notificationsRouter.post('/read-all', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const rawPoolId = req.body?.poolId || req.body?.pool_id;
  const poolId = typeof rawPoolId === 'string' ? rawPoolId : undefined;

  try {
    const where: any = {
      userId,
      readAt: null,
    };

    if (poolId && UUID_REGEX.test(poolId)) {
      where.poolId = poolId;
    }

    const now = getNow();
    const result = await prisma.inboxMessage.updateMany({
      where,
      data: { readAt: now },
    });

    res.status(200).json({
      success: true,
      markedReadCount: result.count,
    });
  } catch (error: any) {
    console.error('Error marking all notifications read:', error);
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
});

/**
 * GET /api/notifications/preferences
 * Protected route: Fetches user Step C notification preferences for req.user.id.
 * Strict adherence to Decision #54 (NO WRITES ON GET: zero state mutations).
 */
notificationsRouter.get('/preferences', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;

  try {
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      res.json({
        userId,
        emailEnabled: true,
        reminderOffsetsHours: [24, 2],
        unsubscribeToken: null,
      });
      return;
    }

    res.json(prefs);
  } catch (error: any) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences.' });
  }
});

/**
 * PUT /api/notifications/preferences
 * Protected route: Validates and updates/upserts user's notification preferences.
 */
notificationsRouter.put('/preferences', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { emailEnabled, reminderOffsetsHours } = req.body || {};

  // Validation: reminderOffsetsHours must be array of 1 to 5 integers between 1 and 168
  if (reminderOffsetsHours !== undefined) {
    if (!Array.isArray(reminderOffsetsHours)) {
      res.status(400).json({ error: 'reminderOffsetsHours must be an array of integers.' });
      return;
    }

    if (reminderOffsetsHours.length < 1 || reminderOffsetsHours.length > 5) {
      res.status(400).json({ error: 'reminderOffsetsHours must contain between 1 and 5 elements.' });
      return;
    }

    const allValid = reminderOffsetsHours.every(
      (val: any) => typeof val === 'number' && Number.isInteger(val) && val >= 1 && val <= 168
    );

    if (!allValid) {
      res.status(400).json({ error: 'Each offset in reminderOffsetsHours must be an integer between 1 and 168.' });
      return;
    }
  }

  // Validation: emailEnabled must be boolean if provided
  if (emailEnabled !== undefined && typeof emailEnabled !== 'boolean') {
    res.status(400).json({ error: 'emailEnabled must be a boolean.' });
    return;
  }

  try {
    const updateData: any = {};
    if (emailEnabled !== undefined) {
      updateData.emailEnabled = emailEnabled;
    }
    if (reminderOffsetsHours !== undefined) {
      updateData.reminderOffsetsHours = reminderOffsetsHours;
    }

    const prefs = await prisma.notificationPreference.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        emailEnabled: emailEnabled !== undefined ? emailEnabled : true,
        reminderOffsetsHours: reminderOffsetsHours !== undefined ? reminderOffsetsHours : [24, 2],
      },
    });

    res.json(prefs);
  } catch (error: any) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update notification preferences.' });
  }
});

/**
 * GET /api/notifications/unsubscribe
 * Public route: Validates unsubscribe token and returns current preference status.
 * Decision #54 compliant (NO WRITES ON GET).
 */
notificationsRouter.get('/unsubscribe', async (req: Request, res: Response): Promise<void> => {
  const token = (req.query.token as string) || (req.query.unsubscribeToken as string);

  if (!token || !UUID_REGEX.test(token)) {
    res.status(400).json({ error: 'Valid unsubscribe token is required.' });
    return;
  }

  try {
    const pref = await prisma.notificationPreference.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!pref) {
      res.status(404).json({ error: 'Unsubscribe token not found.' });
      return;
    }

    res.json({
      valid: true,
      emailEnabled: pref.emailEnabled,
      message: pref.emailEnabled
        ? 'Unsubscribe token is valid. Send POST request to confirm unsubscription.'
        : 'User is already unsubscribed from email notifications.',
    });
  } catch (error) {
    console.error('Error verifying unsubscribe token:', error);
    res.status(500).json({ error: 'Failed to verify unsubscribe token.' });
  }
});

/**
 * POST /api/notifications/unsubscribe
 * Public route: Sets emailEnabled = false on the matching NotificationPreference record.
 */
notificationsRouter.post('/unsubscribe', async (req: Request, res: Response): Promise<void> => {
  const token = req.body?.token || req.body?.unsubscribeToken || req.query?.token;

  if (!token || typeof token !== 'string' || !UUID_REGEX.test(token)) {
    res.status(400).json({ error: 'Valid unsubscribe token is required.' });
    return;
  }

  try {
    const pref = await prisma.notificationPreference.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!pref) {
      res.status(404).json({ error: 'Unsubscribe token not found.' });
      return;
    }

    const updated = await prisma.notificationPreference.update({
      where: { unsubscribeToken: token },
      data: { emailEnabled: false },
    });

    res.json({
      success: true,
      emailEnabled: updated.emailEnabled,
      message: 'Successfully unsubscribed from email notifications.',
    });
  } catch (error) {
    console.error('Error processing unsubscribe request:', error);
    res.status(500).json({ error: 'Failed to process unsubscribe request.' });
  }
});
