import { Router, Request, Response } from 'express';
import prisma from '../db/client';
import { UUID_REGEX } from '../middleware/auth';

export const notificationsRouter = Router();

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
 * Preserves the preference row without deleting it and without creating separate tables.
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
