import { Router, Request, Response } from 'express';
import prisma from '../db/client';
import { requireAuth, UUID_REGEX } from '../middleware/auth';

export const meRouter = Router();

/**
 * GET /api/me/inbox
 * Protected route: Returns current authenticated user's inbox messages.
 * Strict adherence to Decision #54 (NO WRITES ON GET).
 */
meRouter.get('/inbox', requireAuth, async (req: Request, res: Response): Promise<void> => {
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
  } catch (error) {
    console.error('Error fetching inbox messages:', error);
    res.status(500).json({ error: 'Failed to fetch inbox messages.' });
  }
});

/**
 * POST /api/me/inbox/:id/read
 * Protected route: Marks a specific inbox message as read.
 * Enforces strict row ownership (returns 404 for unowned or missing message IDs).
 */
meRouter.post('/inbox/:id/read', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const messageId = req.params.id;

  if (!UUID_REGEX.test(messageId)) {
    res.status(404).json({ error: 'Inbox message not found.' });
    return;
  }

  try {
    const message = await prisma.inboxMessage.findFirst({
      where: {
        id: messageId,
        userId,
      },
    });

    if (!message) {
      res.status(404).json({ error: 'Inbox message not found.' });
      return;
    }

    const updated = message.readAt
      ? message
      : await prisma.inboxMessage.update({
          where: { id: message.id },
          data: { readAt: new Date() },
        });

    res.json({
      success: true,
      message: updated,
    });
  } catch (error) {
    console.error('Error marking inbox message read:', error);
    res.status(500).json({ error: 'Failed to update inbox message.' });
  }
});

/**
 * POST /api/me/inbox/read-all
 * Protected route: Marks all unread inbox messages belonging to the authenticated user as read.
 */
meRouter.post('/inbox/read-all', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const poolId = req.body?.poolId || req.body?.pool_id;

  try {
    const where: any = {
      userId,
      readAt: null,
    };

    if (poolId && UUID_REGEX.test(poolId)) {
      where.poolId = poolId;
    }

    const result = await prisma.inboxMessage.updateMany({
      where,
      data: { readAt: new Date() },
    });

    res.json({
      success: true,
      markedReadCount: result.count,
    });
  } catch (error) {
    console.error('Error marking all inbox messages read:', error);
    res.status(500).json({ error: 'Failed to update inbox messages.' });
  }
});

/**
 * GET /api/me/notification-prefs
 * Protected route: Fetches the current user's notification preferences.
 * Strict adherence to Decision #54 (NO WRITES ON GET).
 */
meRouter.get('/notification-prefs', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;

  try {
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      // Default preferences if not yet created in DB (read-only, no write)
      res.json({
        userId,
        emailEnabled: true,
        reminderOffsetsHours: [24, 2],
        unsubscribeToken: null,
      });
      return;
    }

    res.json(prefs);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences.' });
  }
});

/**
 * PUT /api/me/notification-prefs
 * Protected route: Validates and updates/upserts user's notification preferences.
 */
meRouter.put('/notification-prefs', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { emailEnabled, reminderOffsetsHours } = req.body;

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
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update notification preferences.' });
  }
});
