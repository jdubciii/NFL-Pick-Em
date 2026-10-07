import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import prisma from '../db/client';

export const shotCamRouter = Router({ mergeParams: true });

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MEMBER_DISPLAY_MAP: Record<string, string> = {
  'jack@nflpickem.com': 'Jack (You)',
  'matt.c@nflpickem.com': 'Matt Cone',
  'matt.b@nflpickem.com': 'Matt Brickner',
  'justin.b@nflpickem.com': 'Justin Brickner',
  'adam.b@nflpickem.com': 'Adam Brickner',
  'rich.b@nflpickem.com': 'Rich Brickner',
  'mike.c@nflpickem.com': 'Mike Cone',
  'nick.s@nflpickem.com': 'Nick Santos',
  'mark.b@nflpickem.com': 'Mark Brickner',
  'bigjack@nflpickem.com': 'Big Jack',
};

function getDisplayName(email: string): string {
  const lower = email.toLowerCase();
  if (MEMBER_DISPLAY_MAP[lower]) {
    return MEMBER_DISPLAY_MAP[lower];
  }
  return email.split('@')[0];
}

/**
 * Resiliently resolves a pool by UUID, name, or defaults to 'Main League'
 */
async function resolvePool(poolIdParam?: string | string[]) {
  const normalized = Array.isArray(poolIdParam) ? poolIdParam[0] : poolIdParam;
  if (normalized && UUID_REGEX.test(normalized)) {
    const byId = await prisma.pool.findUnique({ where: { id: normalized } });
    if (byId) return byId;
  }
  if (normalized && normalized !== 'undefined' && normalized !== 'default' && normalized.trim().length > 0) {
    const byName = await prisma.pool.findFirst({ where: { name: normalized } });
    if (byName) return byName;
  }
  return prisma.pool.findFirst({
    where: { name: 'Main League' },
  });
}

/**
 * Helper to build the canonical Shot-Cam response format
 */
function buildShotCamResponse(penalty: any) {
  const media = penalty.media;
  const user = penalty.membership?.user || penalty.user;
  const email = user?.email || '';
  let status: 'DISPUTED' | 'PENDING_SUBMISSION' | 'SUBMITTED' | 'VERIFIED' | 'SERVED' | 'FORFEIT' = 'PENDING_SUBMISSION';

  const reasonText = penalty.reason || '';
  const isDisputed = reasonText.includes('[DISPUTED]') || reasonText.toLowerCase().includes('dispute');

  if (media) {
    if (media.status === 'CONFIRMED') {
      status = 'VERIFIED';
    } else if (media.status === 'REJECTED') {
      status = 'FORFEIT';
    } else if (isDisputed) {
      status = 'DISPUTED';
    } else {
      status = 'SUBMITTED';
    }
  } else if (isDisputed) {
    status = 'DISPUTED';
  }

  // Calculate 24-hour expiration window from createdAt
  const createdTime = new Date(penalty.createdAt).getTime();
  const expiresAt = new Date(createdTime + 24 * 60 * 60 * 1000).toISOString();

  // Extract dispute reason if formatted
  let disputeReason: string | null = null;
  if (reasonText.includes('Dispute Reason:')) {
    disputeReason = reasonText.split('Dispute Reason:')[1]?.trim() || null;
  } else if (isDisputed) {
    disputeReason = reasonText.replace(/\[DISPUTED\]/g, '').trim() || 'Excused claim submitted.';
  }

  return {
    id: penalty.id,
    userId: penalty.userId,
    displayName: getDisplayName(email),
    email,
    weekNumber: penalty.weekNumber || 4,
    penaltyShots: Number(penalty.delta),
    status,
    disputeReason,
    disputeExpiresAt: expiresAt,
    videoUrl: media?.storagePath || null,
    submittedAt: media?.createdAt ? new Date(media.createdAt).toISOString() : null,
    reviewedBy: media?.confirmer?.email || null,
  };
}

/**
 * GET /api/pools/:pool_id/shot-cam/active AND GET /api/shot-cam/active
 * Retrieves the active Dead Place subject for the completed week (Week 4: Big Jack).
 */
shotCamRouter.get('/active', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = await resolvePool(req.params.pool_id);

    if (!pool) {
      res.status(404).json({ error: 'Pool not found' });
      return;
    }

    // Find the latest Dead Place penalty record in this pool
    let penalty = await prisma.penaltyLedger.findFirst({
      where: {
        poolId: pool.id,
        weekNumber: 4,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        membership: {
          include: {
            user: true,
          },
        },
        media: {
          include: {
            confirmer: true,
          },
        },
      },
    });

    if (!penalty) {
      // Look for any penalty in the pool
      penalty = await prisma.penaltyLedger.findFirst({
        where: { poolId: pool.id },
        orderBy: { createdAt: 'desc' },
        include: {
          membership: {
            include: {
              user: true,
            },
          },
          media: {
            include: {
              confirmer: true,
            },
          },
        },
      });
    }

    if (!penalty) {
      // Auto-fallback default structure if database hasn't been seeded yet
      const bigJack = await prisma.user.findUnique({ where: { email: 'bigjack@nflpickem.com' } });
      res.json({
        id: 'shotcam_active_w4',
        userId: bigJack?.id || 'bj_user_id',
        displayName: 'Big Jack',
        email: 'bigjack@nflpickem.com',
        weekNumber: 4,
        penaltyShots: 2.5,
        status: 'DISPUTED',
        disputeReason: 'Claimed flight delay caused missed London kickoff window.',
        disputeExpiresAt: new Date(Date.now() + 14 * 3600 * 1000 + 22 * 60 * 1000).toISOString(),
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        submittedAt: new Date().toISOString(),
        reviewedBy: null,
      });
      return;
    }

    res.json(buildShotCamResponse(penalty));
  } catch (error) {
    console.error('Error fetching active shot-cam record:', error);
    res.status(500).json({ error: 'Failed to fetch active Shot-Cam record.' });
  }
});

/**
 * POST /api/pools/:pool_id/shot-cam/dispute AND POST /api/shot-cam/dispute
 * Allows Dead Place subject to submit a formal excuse/dispute claim, flipping status to DISPUTED.
 */
shotCamRouter.post('/dispute', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { penaltyId, reason } = req.body;
  const requestingUserId = req.user!.id;

  if (!reason || String(reason).trim().length === 0) {
    res.status(400).json({ error: 'Dispute reason is required.' });
    return;
  }

  try {
    const pool = await resolvePool(req.params.pool_id);

    if (!pool) {
      res.status(404).json({ error: 'Pool not found' });
      return;
    }

    let penalty;
    if (penaltyId && penaltyId !== 'shotcam_active_w4' && UUID_REGEX.test(penaltyId)) {
      penalty = await prisma.penaltyLedger.findUnique({
        where: { id: penaltyId },
        include: {
          membership: { include: { user: true } },
          media: { include: { confirmer: true } },
        },
      });
    } else {
      penalty = await prisma.penaltyLedger.findFirst({
        where: { poolId: pool.id, weekNumber: 4 },
        include: {
          membership: { include: { user: true } },
          media: { include: { confirmer: true } },
        },
      });
    }

    if (!penalty) {
      res.status(404).json({ error: 'Penalty record not found.' });
      return;
    }

    const updatedReason = `[DISPUTED] Dead Place Monarch (Week ${penalty.weekNumber || 4}) | Dispute Reason: ${String(reason).trim()}`;

    const updatedPenalty = await prisma.penaltyLedger.update({
      where: { id: penalty.id },
      data: {
        reason: updatedReason,
      },
      include: {
        membership: {
          include: {
            user: true,
          },
        },
        media: {
          include: {
            confirmer: true,
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: requestingUserId,
        action: 'SUBMIT_SHOT_CAM_DISPUTE',
        targetEntityId: penalty.id,
        newValue: {
          poolId: pool.id,
          penaltyId: penalty.id,
          disputeReason: reason,
          status: 'DISPUTED',
        },
      },
    });

    res.json({
      message: 'Dispute submitted successfully. 24h dispute window active.',
      submission: buildShotCamResponse(updatedPenalty),
    });
  } catch (error) {
    console.error('Error filing dispute:', error);
    res.status(500).json({ error: 'Failed to submit dispute.' });
  }
});

/**
 * POST /api/pools/:pool_id/shot-cam/review AND POST /api/shot-cam/review
 * Commissioner Guard: Requires user to be Jack, ADMIN, or pool commissioner.
 * Body: { action: "APPROVE_DISPUTE" | "REJECT_DISPUTE" | "VERIFY_VIDEO", notes?: string }
 */
shotCamRouter.post('/review', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { penaltyId, action, notes } = req.body;
  const user = req.user!;

  if (!['APPROVE_DISPUTE', 'REJECT_DISPUTE', 'VERIFY_VIDEO'].includes(action)) {
    res.status(400).json({ error: 'Invalid action. Must be APPROVE_DISPUTE, REJECT_DISPUTE, or VERIFY_VIDEO.' });
    return;
  }

  try {
    const pool = await resolvePool(req.params.pool_id);

    if (!pool) {
      res.status(404).json({ error: 'Pool not found' });
      return;
    }

    // Commissioner Guard
    const isJack = user.email?.toLowerCase() === 'jack@nflpickem.com';
    const isAdmin = user.role === 'ADMIN';
    const isCommissioner = pool.adminId === user.id;

    if (!isJack && !isAdmin && !isCommissioner) {
      res.status(403).json({ error: 'Forbidden: Only the Commissioner can review Shot-Cam disputes and media.' });
      return;
    }

    let penalty;
    if (penaltyId && penaltyId !== 'shotcam_active_w4' && UUID_REGEX.test(penaltyId)) {
      penalty = await prisma.penaltyLedger.findUnique({
        where: { id: penaltyId },
        include: {
          membership: { include: { user: true } },
          media: { include: { confirmer: true } },
        },
      });
    } else {
      penalty = await prisma.penaltyLedger.findFirst({
        where: { poolId: pool.id, weekNumber: 4 },
        include: {
          membership: { include: { user: true } },
          media: { include: { confirmer: true } },
        },
      });
    }

    if (!penalty) {
      res.status(404).json({ error: 'Penalty record not found.' });
      return;
    }

    if (action === 'APPROVE_DISPUTE') {
      // Waive shots: mark reason with [WAIVED_BY_COMMISSIONER], adjust delta to 0 if approved
      const updatedPenalty = await prisma.penaltyLedger.update({
        where: { id: penalty.id },
        data: {
          delta: 0,
          reason: `[WAIVED_BY_COMMISSIONER] ${penalty.reason}${notes ? ` | Notes: ${notes}` : ''}`,
        },
        include: {
          membership: { include: { user: true } },
          media: { include: { confirmer: true } },
        },
      });

      if (penalty.media) {
        await prisma.penaltyMedia.update({
          where: { id: penalty.media.id },
          data: {
            status: 'CONFIRMED',
            confirmedBy: user.id,
          },
        });
      }

      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: 'APPROVE_SHOT_CAM_DISPUTE',
          targetEntityId: penalty.id,
          newValue: { action, notes, waivedDelta: 0 },
        },
      });

      res.json({
        message: 'Dispute approved and penalty waived by Commissioner.',
        submission: {
          ...buildShotCamResponse(updatedPenalty),
          status: 'VERIFIED',
          penaltyShots: 0,
          reviewedBy: user.email,
        },
      });
      return;
    }

    if (action === 'REJECT_DISPUTE') {
      // Reject dispute: enforce full 2.5 shots
      const updatedPenalty = await prisma.penaltyLedger.update({
        where: { id: penalty.id },
        data: {
          delta: 2.5,
          reason: `[DISPUTE_REJECTED] Enforced 2.5 shots | Original: ${penalty.reason}${notes ? ` | Notes: ${notes}` : ''}`,
        },
        include: {
          membership: { include: { user: true } },
          media: { include: { confirmer: true } },
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: 'REJECT_SHOT_CAM_DISPUTE',
          targetEntityId: penalty.id,
          newValue: { action, notes, enforcedDelta: 2.5 },
        },
      });

      res.json({
        message: 'Dispute rejected. 2.5 shots enforced.',
        submission: {
          ...buildShotCamResponse(updatedPenalty),
          status: 'PENDING_SUBMISSION',
          penaltyShots: 2.5,
          reviewedBy: user.email,
        },
      });
      return;
    }

    if (action === 'VERIFY_VIDEO') {
      // Verify video proof
      if (penalty.media) {
        await prisma.penaltyMedia.update({
          where: { id: penalty.media.id },
          data: {
            status: 'CONFIRMED',
            confirmedBy: user.id,
          },
        });
      }

      const updatedPenalty = await prisma.penaltyLedger.findUnique({
        where: { id: penalty.id },
        include: {
          membership: { include: { user: true } },
          media: { include: { confirmer: true } },
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: 'VERIFY_SHOT_CAM_VIDEO',
          targetEntityId: penalty.id,
          newValue: { action, notes, status: 'CONFIRMED' },
        },
      });

      res.json({
        message: 'Shot-Cam video verified by Commissioner.',
        submission: {
          ...buildShotCamResponse(updatedPenalty),
          status: 'VERIFIED',
          reviewedBy: user.email,
        },
      });
      return;
    }
  } catch (error) {
    console.error('Error reviewing Shot-Cam submission:', error);
    res.status(500).json({ error: 'Failed to process Shot-Cam review.' });
  }
});

/**
 * POST /api/pools/:pool_id/shot-cam/upload AND POST /api/shot-cam/upload
 * Accepts simulated video URL or media payload, flips status to SUBMITTED.
 */
shotCamRouter.post('/upload', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { penaltyId, videoUrl, mediaType } = req.body;
  const user = req.user!;

  const finalVideoUrl = videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

  try {
    const pool = await resolvePool(req.params.pool_id);

    if (!pool) {
      res.status(404).json({ error: 'Pool not found' });
      return;
    }

    let penalty;
    if (penaltyId && penaltyId !== 'shotcam_active_w4' && UUID_REGEX.test(penaltyId)) {
      penalty = await prisma.penaltyLedger.findUnique({
        where: { id: penaltyId },
      });
    } else {
      penalty = await prisma.penaltyLedger.findFirst({
        where: { poolId: pool.id, weekNumber: 4 },
      });
    }

    if (!penalty) {
      res.status(404).json({ error: 'Penalty record not found.' });
      return;
    }

    await prisma.penaltyMedia.upsert({
      where: { penaltyId: penalty.id },
      update: {
        storagePath: finalVideoUrl,
        mediaType: mediaType || 'video/mp4',
        status: 'PENDING',
        confirmedBy: null,
      },
      create: {
        penaltyId: penalty.id,
        poolId: pool.id,
        userId: penalty.userId,
        storagePath: finalVideoUrl,
        mediaType: mediaType || 'video/mp4',
        status: 'PENDING',
      },
    });

    const updatedPenalty = await prisma.penaltyLedger.findUnique({
      where: { id: penalty.id },
      include: {
        membership: { include: { user: true } },
        media: { include: { confirmer: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'UPLOAD_SHOT_CAM_VIDEO',
        targetEntityId: penalty.id,
        newValue: {
          videoUrl: finalVideoUrl,
          mediaType: mediaType || 'video/mp4',
          status: 'SUBMITTED',
        },
      },
    });

    res.status(201).json({
      message: 'Shot-Cam video proof submitted successfully.',
      submission: buildShotCamResponse(updatedPenalty),
    });
  } catch (error) {
    console.error('Error uploading Shot-Cam video:', error);
    res.status(500).json({ error: 'Failed to upload Shot-Cam proof.' });
  }
});

export default shotCamRouter;
