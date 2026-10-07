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

function getInitials(email: string): string {
  const lower = email.toLowerCase();
  if (lower.includes('bigjack')) return 'BJ';
  if (lower.includes('jack')) return 'JC';
  if (lower.includes('matt.c')) return 'MC';
  if (lower.includes('matt.b')) return 'MB';
  if (lower.includes('justin.b')) return 'JB';
  if (lower.includes('adam.b')) return 'AB';
  if (lower.includes('rich.b')) return 'RB';
  if (lower.includes('mike.c')) return 'MK';
  if (lower.includes('nick.s')) return 'NS';
  if (lower.includes('mark.b')) return 'MR';
  const name = email.split('@')[0];
  const parts = name.split('.');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

interface MediaMeta {
  isSpotlight: boolean;
  reactions: Record<string, number>;
  caption?: string;
}

const mediaMetaStore = new Map<string, MediaMeta>();

/**
 * Helper to get or initialize metadata for a penalty media record
 */
async function getMediaMeta(mediaId: string, weekNumber: number, reason: string): Promise<MediaMeta> {
  if (mediaMetaStore.has(mediaId)) {
    return mediaMetaStore.get(mediaId)!;
  }

  // Check audit log for saved metadata
  try {
    const audit = await prisma.auditLog.findFirst({
      where: {
        targetEntityId: mediaId,
        action: { in: ['SEED_SHAME_MEDIA_METADATA', 'SET_SHOT_OF_THE_WEEK_SPOTLIGHT', 'REACT_PENALTY_MEDIA'] },
      },
      orderBy: { timestamp: 'desc' },
    });

    if (audit && audit.newValue && typeof audit.newValue === 'object') {
      const val = audit.newValue as any;
      const meta: MediaMeta = {
        isSpotlight: Boolean(val.isSpotlight),
        reactions: val.reactions || { '💀': 0, '🍺': 0, '🔥': 0 },
        caption: val.caption || reason,
      };
      mediaMetaStore.set(mediaId, meta);
      return meta;
    }
  } catch (err) {
    // Fallback to default
  }

  // Default seed-based values for realistic demo
  const isWeek3Spotlight = weekNumber === 3;
  const defaultReactions: Record<string, number> =
    weekNumber === 4 ? { '💀': 29, '🍺': 12, '🔥': 18 } :
    weekNumber === 3 ? { '💀': 22, '🍺': 19, '🔥': 31 } :
    weekNumber === 2 ? { '💀': 8, '🍺': 16, '🔥': 4 } :
    { '💀': 14, '🍺': 9, '🔥': 6 };

  const initialMeta: MediaMeta = {
    isSpotlight: isWeek3Spotlight,
    reactions: defaultReactions,
    caption: reason,
  };
  mediaMetaStore.set(mediaId, initialMeta);
  return initialMeta;
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
 * GET /api/pools/:pool_id/shot-cam/feed AND GET /api/shot-cam/feed
 * Fetches all uploaded PenaltyMedia records for the week or pool, ordered by createdAt desc.
 */
shotCamRouter.get('/feed', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = await resolvePool(req.params.pool_id);

    if (!pool) {
      res.status(404).json({ error: 'Pool not found' });
      return;
    }

    const weekNumber = req.query.weekNumber ? parseInt(String(req.query.weekNumber), 10) : undefined;

    const mediaRecords = await prisma.penaltyMedia.findMany({
      where: {
        poolId: pool.id,
        ...(weekNumber ? { penalty: { weekNumber } } : {}),
      },
      include: {
        user: true,
        penalty: true,
        confirmer: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const feed = await Promise.all(
      mediaRecords.map(async (media) => {
        const email = media.user?.email || '';
        const meta = await getMediaMeta(media.id, media.penalty?.weekNumber || 4, media.penalty?.reason || '');
        return {
          id: media.id,
          penaltyId: media.penaltyId,
          userId: media.userId,
          displayName: getDisplayName(email),
          initials: getInitials(email),
          email,
          avatarUrl: null,
          shots: Number(media.penalty?.delta || 1),
          status: media.status,
          videoUrl: media.storagePath,
          caption: meta.caption || media.penalty?.reason || 'Shot served',
          weekNumber: media.penalty?.weekNumber || 4,
          createdAt: media.createdAt.toISOString(),
          confirmedBy: media.confirmer?.email || null,
          isSpotlight: meta.isSpotlight,
          reactions: meta.reactions,
        };
      })
    );

    res.json({
      weekNumber: weekNumber || 4,
      totalCount: feed.length,
      feed,
    });
  } catch (error) {
    console.error('Error fetching shot-cam feed:', error);
    res.status(500).json({ error: 'Failed to fetch Shot-Cam feed.' });
  }
});

/**
 * POST /api/pools/:pool_id/shot-cam/feed/submit AND POST /api/shot-cam/feed/submit
 * Inline / Floating "Submit Your Shot" allowing any member to submit a shot video.
 */
shotCamRouter.post('/feed/submit', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { weekNumber, videoUrl, caption, shots } = req.body;
  const user = req.user!;

  if (!videoUrl || String(videoUrl).trim().length === 0) {
    res.status(400).json({ error: 'Video URL is required.' });
    return;
  }

  try {
    const pool = await resolvePool(req.params.pool_id);

    if (!pool) {
      res.status(404).json({ error: 'Pool not found' });
      return;
    }

    const week = weekNumber ? parseInt(String(weekNumber), 10) : 4;
    const shotCount = shots ? Number(shots) : 1.0;
    const finalReason = caption || `Week ${week} Penalty Shot submission`;

    // Ensure pool membership
    await prisma.poolMembership.upsert({
      where: {
        poolId_userId: {
          poolId: pool.id,
          userId: user.id,
        },
      },
      update: {},
      create: {
        poolId: pool.id,
        userId: user.id,
      },
    });

    // Check existing penalty or create new penalty entry
    let penalty = await prisma.penaltyLedger.findFirst({
      where: {
        poolId: pool.id,
        userId: user.id,
        weekNumber: week,
      },
    });

    if (!penalty) {
      penalty = await prisma.penaltyLedger.create({
        data: {
          poolId: pool.id,
          userId: user.id,
          weekNumber: week,
          delta: shotCount,
          reason: finalReason,
          createdById: user.id,
        },
      });
    }

    const media = await prisma.penaltyMedia.upsert({
      where: { penaltyId: penalty.id },
      update: {
        storagePath: videoUrl.trim(),
        mediaType: 'video/mp4',
        status: 'PENDING',
        createdAt: new Date(),
      },
      create: {
        penaltyId: penalty.id,
        poolId: pool.id,
        userId: user.id,
        storagePath: videoUrl.trim(),
        mediaType: 'video/mp4',
        status: 'PENDING',
      },
    });

    mediaMetaStore.set(media.id, {
      isSpotlight: false,
      reactions: { '💀': 0, '🍺': 0, '🔥': 0 },
      caption: finalReason,
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'SUBMIT_SHOT_CAM_FEED_MEDIA',
        targetEntityId: media.id,
        newValue: {
          poolId: pool.id,
          mediaId: media.id,
          penaltyId: penalty.id,
          weekNumber: week,
          videoUrl: videoUrl.trim(),
          caption: finalReason,
        },
      },
    });

    res.status(201).json({
      message: 'Shot submission posted to live feed successfully!',
      item: {
        id: media.id,
        penaltyId: media.penaltyId,
        userId: user.id,
        displayName: getDisplayName(user.email),
        initials: getInitials(user.email),
        email: user.email,
        avatarUrl: null,
        shots: shotCount,
        status: media.status,
        videoUrl: media.storagePath,
        caption: finalReason,
        weekNumber: week,
        createdAt: media.createdAt.toISOString(),
        confirmedBy: null,
        isSpotlight: false,
        reactions: { '💀': 0, '🍺': 0, '🔥': 0 },
      },
    });
  } catch (error) {
    console.error('Error submitting shot-cam feed media:', error);
    res.status(500).json({ error: 'Failed to submit shot to feed.' });
  }
});

/**
 * GET /api/pools/:pool_id/shame/vault AND GET /api/shame/vault
 * Accepts query filters: ?memberId=&week=&penaltyType=&isSpotlight=true&search=
 * Returns historical penalty videos across all weeks with reactions, spotlight flag, and metadata.
 */
shotCamRouter.get('/vault', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = await resolvePool(req.params.pool_id);

    if (!pool) {
      res.status(404).json({ error: 'Pool not found' });
      return;
    }

    const { memberId, week, penaltyType, isSpotlight, search } = req.query;

    const mediaRecords = await prisma.penaltyMedia.findMany({
      where: {
        poolId: pool.id,
      },
      include: {
        user: true,
        penalty: true,
        confirmer: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    let items = await Promise.all(
      mediaRecords.map(async (media) => {
        const email = media.user?.email || '';
        const meta = await getMediaMeta(media.id, media.penalty?.weekNumber || 4, media.penalty?.reason || '');
        const shots = Number(media.penalty?.delta || 1);
        const displayName = getDisplayName(email);
        const initials = getInitials(email);

        return {
          id: media.id,
          penaltyId: media.penaltyId,
          userId: media.userId,
          displayName,
          initials,
          email,
          shots,
          status: media.status,
          videoUrl: media.storagePath,
          thumbnailUrl: media.storagePath,
          caption: meta.caption || media.penalty?.reason || '',
          weekNumber: media.penalty?.weekNumber || 4,
          isSpotlight: meta.isSpotlight,
          reactions: meta.reactions,
          createdAt: media.createdAt.toISOString(),
          confirmedBy: media.confirmer?.email || null,
          isMonarch: shots >= 2.5 || (media.penalty?.reason || '').toLowerCase().includes('monarch'),
        };
      })
    );

    // Apply filters
    if (memberId && String(memberId).trim() !== '' && String(memberId).toUpperCase() !== 'ALL') {
      const mStr = String(memberId).toLowerCase();
      items = items.filter(
        (it) =>
          it.userId === memberId ||
          it.email.toLowerCase() === mStr ||
          it.displayName.toLowerCase().includes(mStr) ||
          it.initials.toLowerCase() === mStr
      );
    }

    if (week && String(week).trim() !== '' && String(week).toUpperCase() !== 'ALL') {
      const wNum = parseInt(String(week), 10);
      if (!isNaN(wNum)) {
        items = items.filter((it) => it.weekNumber === wNum);
      }
    }

    if (penaltyType && String(penaltyType).trim() !== '' && String(penaltyType).toUpperCase() !== 'ALL') {
      if (String(penaltyType).toLowerCase() === 'monarch') {
        items = items.filter((it) => it.isMonarch);
      } else if (String(penaltyType).toLowerCase() === 'regular') {
        items = items.filter((it) => !it.isMonarch);
      }
    }

    if (isSpotlight === 'true') {
      items = items.filter((it) => it.isSpotlight);
    }

    if (search && String(search).trim() !== '') {
      const q = String(search).toLowerCase();
      items = items.filter(
        (it) =>
          it.displayName.toLowerCase().includes(q) ||
          it.email.toLowerCase().includes(q) ||
          it.caption.toLowerCase().includes(q)
      );
    }

    const spotlightItem = items.find((it) => it.isSpotlight) || items[0] || null;

    res.json({
      vault: items,
      totalCount: items.length,
      spotlightItem,
    });
  } catch (error) {
    console.error('Error fetching shame vault:', error);
    res.status(500).json({ error: 'Failed to fetch Wall of Shame vault.' });
  }
});

/**
 * POST /api/pools/:pool_id/shame/:media_id/spotlight AND POST /api/shame/:media_id/spotlight
 * Sets isSpotlight: true on the selected video and unsets previous spotlights.
 */
shotCamRouter.post('/:media_id/spotlight', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { media_id } = req.params;
  const user = req.user!;

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
      res.status(403).json({ error: 'Forbidden: Only the Commissioner can feature Shot of the Week.' });
      return;
    }

    const mediaId = Array.isArray(req.params.media_id) ? req.params.media_id[0] : req.params.media_id;
    const targetMedia: any = await prisma.penaltyMedia.findUnique({
      where: { id: mediaId },
      include: { penalty: true },
    });

    if (!targetMedia) {
      res.status(404).json({ error: 'Penalty media not found.' });
      return;
    }

    const weekNumber = targetMedia.penalty?.weekNumber || 4;

    // Unset spotlight on all other media in memory
    for (const [mId, meta] of mediaMetaStore.entries()) {
      if (meta.isSpotlight) {
        mediaMetaStore.set(mId, { ...meta, isSpotlight: false });
      }
    }

    const currentMeta = await getMediaMeta(targetMedia.id, weekNumber, targetMedia.penalty?.reason || '');
    const updatedMeta = { ...currentMeta, isSpotlight: true };
    mediaMetaStore.set(targetMedia.id, updatedMeta);

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'SET_SHOT_OF_THE_WEEK_SPOTLIGHT',
        targetEntityId: targetMedia.id,
        newValue: {
          mediaId: targetMedia.id,
          weekNumber,
          isSpotlight: true,
          curatedBy: user.email,
        },
      },
    });

    res.json({
      success: true,
      message: 'Video featured as Shot of the Week!',
      mediaId: targetMedia.id,
      weekNumber,
      isSpotlight: true,
    });
  } catch (error) {
    console.error('Error toggling spotlight:', error);
    res.status(500).json({ error: 'Failed to update spotlight.' });
  }
});

/**
 * POST /api/pools/:pool_id/shame/:media_id/react AND POST /api/shame/:media_id/react
 * Increments emoji reaction counters (💀, 🍺, 🔥)
 */
shotCamRouter.post('/:media_id/react', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const mediaId = Array.isArray(req.params.media_id) ? req.params.media_id[0] : req.params.media_id;
  const { emoji } = req.body;
  const user = req.user!;

  const validEmojis = ['💀', '🍺', '🔥'];
  if (!emoji || !validEmojis.includes(emoji)) {
    res.status(400).json({ error: 'Invalid emoji. Must be 💀, 🍺, or 🔥.' });
    return;
  }

  try {
    const targetMedia: any = await prisma.penaltyMedia.findUnique({
      where: { id: mediaId },
      include: { penalty: true },
    });

    if (!targetMedia) {
      res.status(404).json({ error: 'Penalty media not found.' });
      return;
    }

    const currentMeta = await getMediaMeta(
      targetMedia.id,
      targetMedia.penalty?.weekNumber || 4,
      targetMedia.penalty?.reason || ''
    );

    const updatedReactions = {
      ...currentMeta.reactions,
      [emoji]: (currentMeta.reactions[emoji] || 0) + 1,
    };

    const updatedMeta = {
      ...currentMeta,
      reactions: updatedReactions,
    };

    mediaMetaStore.set(targetMedia.id, updatedMeta);

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'REACT_PENALTY_MEDIA',
        targetEntityId: targetMedia.id,
        newValue: {
          mediaId: targetMedia.id,
          emoji,
          reactions: updatedReactions,
        },
      },
    });

    res.json({
      success: true,
      mediaId: targetMedia.id,
      emoji,
      reactions: updatedReactions,
    });
  } catch (error) {
    console.error('Error reacting to penalty media:', error);
    res.status(500).json({ error: 'Failed to register reaction.' });
  }
});

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

    // Safely update PenaltyMedia if present or create AuditLog
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
          updatedReason,
        },
      },
    });

    const responseObj = {
      ...buildShotCamResponse(penalty),
      status: 'DISPUTED' as const,
      disputeReason: String(reason).trim(),
    };

    res.json({
      message: 'Dispute submitted successfully. 24h dispute window active.',
      submission: responseObj,
    });
  } catch (error) {
    console.error('Error filing dispute:', error);
    res.status(500).json({ error: 'Failed to submit dispute.' });
  }
});

/**
 * POST /api/pools/:pool_id/shot-cam/review AND POST /api/shot-cam/review
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
          ...buildShotCamResponse(penalty),
          status: 'VERIFIED',
          penaltyShots: 0,
          reviewedBy: user.email,
        },
      });
      return;
    }

    if (action === 'REJECT_DISPUTE') {
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
          ...buildShotCamResponse(penalty),
          status: 'PENDING_SUBMISSION',
          penaltyShots: 2.5,
          reviewedBy: user.email,
        },
      });
      return;
    }

    if (action === 'VERIFY_VIDEO') {
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
          action: 'VERIFY_SHOT_CAM_VIDEO',
          targetEntityId: penalty.id,
          newValue: { action, notes, status: 'CONFIRMED' },
        },
      });

      res.json({
        message: 'Shot-Cam video verified by Commissioner.',
        submission: {
          ...buildShotCamResponse(penalty),
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

const OFFICIAL_WEEK4_ROSTER = [
  { email: 'matt.b@nflpickem.com', name: 'Matt Brickner', initials: 'MB', score: 14, rank: 1, defaultShots: 0 },
  { email: 'matt.c@nflpickem.com', name: 'Matt Cone', initials: 'MC', score: 14, rank: 1, defaultShots: 0 },
  { email: 'jack@nflpickem.com', name: 'Jack (You)', initials: 'JC', score: 14, rank: 1, defaultShots: 0 },
  { email: 'justin.b@nflpickem.com', name: 'Justin Brickner', initials: 'JB', score: 12, rank: 4, defaultShots: 1 },
  { email: 'adam.b@nflpickem.com', name: 'Adam Brickner', initials: 'AB', score: 12, rank: 4, defaultShots: 1 },
  { email: 'rich.b@nflpickem.com', name: 'Rich Brickner', initials: 'RB', score: 12, rank: 4, defaultShots: 1 },
  { email: 'mike.c@nflpickem.com', name: 'Mike Cone', initials: 'MK', score: 10, rank: 7, defaultShots: 2 },
  { email: 'nick.s@nflpickem.com', name: 'Nick Santos', initials: 'NS', score: 10, rank: 7, defaultShots: 2 },
  { email: 'mark.b@nflpickem.com', name: 'Mark Brickner', initials: 'MR', score: 10, rank: 7, defaultShots: 2 },
  { email: 'bigjack@nflpickem.com', name: 'Big Jack', initials: 'BJ', score: 8, rank: 10, defaultShots: 2.5 },
];

/**
 * GET /api/pools/:pool_id/shot-cam/roster AND GET /api/shot-cam/roster
 */
shotCamRouter.get('/roster', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = await resolvePool(req.params.pool_id);

    if (!pool) {
      res.status(404).json({ error: 'Pool not found' });
      return;
    }

    const users = await prisma.user.findMany();
    const userMap = new Map(users.map((u) => [u.email.toLowerCase(), u]));

    const existingPenalties = await prisma.penaltyLedger.findMany({
      where: {
        poolId: pool.id,
        weekNumber: 4,
      },
      include: {
        media: true,
      },
    });

    const penaltyMap = new Map(existingPenalties.map((p) => [p.userId, p]));

    const roster = OFFICIAL_WEEK4_ROSTER.map((item) => {
      const dbUser = userMap.get(item.email.toLowerCase());
      const userId = dbUser?.id || `user_${item.email}`;
      const penalty = penaltyMap.get(userId);

      let status: 'SAFE' | 'PENDING' | 'SERVED' | 'WAIVED' | 'DISPUTED' =
        item.defaultShots === 0 ? 'SAFE' : 'PENDING';

      let penaltyShots = item.defaultShots;

      if (penalty) {
        penaltyShots = Number(penalty.delta);
        if (penalty.reason.includes('[SERVED]')) {
          status = 'SERVED';
        } else if (penalty.reason.includes('[WAIVED]') || penaltyShots === 0) {
          status = 'WAIVED';
        } else if (penalty.reason.includes('[DISPUTED]')) {
          status = 'DISPUTED';
        } else if (penalty.media?.status === 'CONFIRMED') {
          status = 'SERVED';
        } else if (penaltyShots > 0) {
          status = 'PENDING';
        }
      }

      return {
        userId,
        displayName: item.name,
        initials: item.initials,
        email: item.email,
        week4Score: item.score,
        rank: item.rank,
        owedShots: penaltyShots,
        defaultShots: item.defaultShots,
        status,
        penaltyId: penalty?.id || null,
        isMonarch: item.rank === 10,
      };
    });

    res.json({
      weekNumber: 4,
      poolId: pool.id,
      roster,
    });
  } catch (error) {
    console.error('Error fetching shot roster:', error);
    res.status(500).json({ error: 'Failed to fetch shot roster.' });
  }
});

/**
 * POST /api/pools/:pool_id/shot-cam/toggle-served AND POST /api/shot-cam/toggle-served
 */
shotCamRouter.post('/toggle-served', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId, email, served, shots } = req.body;
  const user = req.user!;

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
      res.status(403).json({ error: 'Forbidden: Only the Commissioner can mark shots as served.' });
      return;
    }

    let targetUser = null;
    if (userId && UUID_REGEX.test(userId)) {
      targetUser = await prisma.user.findUnique({ where: { id: userId } });
    }
    if (!targetUser && email) {
      targetUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    }

    if (!targetUser) {
      res.status(404).json({ error: 'Target league member not found.' });
      return;
    }

    // Ensure pool membership exists
    await prisma.poolMembership.upsert({
      where: {
        poolId_userId: {
          poolId: pool.id,
          userId: targetUser.id,
        },
      },
      update: {},
      create: {
        poolId: pool.id,
        userId: targetUser.id,
      },
    });

    let penalty = await prisma.penaltyLedger.findFirst({
      where: {
        poolId: pool.id,
        userId: targetUser.id,
        weekNumber: 4,
      },
    });

    const defaultRosterItem = OFFICIAL_WEEK4_ROSTER.find(
      (r) => r.email.toLowerCase() === targetUser!.email.toLowerCase()
    );
    const assignedShots = shots !== undefined ? Number(shots) : defaultRosterItem?.defaultShots || 1;

    if (!penalty) {
      penalty = await prisma.penaltyLedger.create({
        data: {
          poolId: pool.id,
          userId: targetUser.id,
          weekNumber: 4,
          delta: assignedShots,
          reason: served ? `[SERVED] Week 4 Penalty (${assignedShots} Shots)` : `Week 4 Penalty (${assignedShots} Shots)`,
          createdById: user.id,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: served ? 'MARK_SHOT_PENALTY_SERVED' : 'UNMARK_SHOT_PENALTY_SERVED',
        targetEntityId: penalty.id,
        newValue: {
          poolId: pool.id,
          targetUserId: targetUser.id,
          weekNumber: 4,
          served,
          shots: assignedShots,
        },
      },
    });

    res.json({
      success: true,
      userId: targetUser.id,
      email: targetUser.email,
      served,
      penaltyId: penalty.id,
      message: served
        ? `Marked ${assignedShots} shots as SERVED for ${targetUser.email}.`
        : `Marked penalty as PENDING for ${targetUser.email}.`,
    });
  } catch (error) {
    console.error('Error toggling served status:', error);
    res.status(500).json({ error: 'Failed to update shot status.' });
  }
});

export default shotCamRouter;
