import { Router, Request, Response } from 'express';
import prisma from '../db/client';
import { requireAuth, requirePoolCommissioner, UUID_REGEX } from '../middleware/auth';

export const opsRouter = Router({ mergeParams: true });

// JobRun-level re-execution is out-of-scope for pool-scoped APIs. Job worker runs operate at the system/service tier.

/**
 * GET /api/pools/:pool_id/ops/health
 * Protected route for pool commissioner.
 * Observational health telemetry: strictly pool-scoped outbox queue depth, dead events, and recent activity.
 * Strictly read-only (Decision #54 compliant).
 * NOTE: Global JobRun records are excluded to prevent cross-pool telemetry leakage.
 */
opsRouter.get('/:pool_id/ops/health', requireAuth, requirePoolCommissioner, async (req: Request, res: Response): Promise<void> => {
  const pool = req.pool;
  const poolId = pool.id;

  try {
    const [
      pendingCount,
      processingCount,
      deadCount,
      failedCount,
      sentCount,
      suppressedCount,
      totalCount,
      deadEvents,
      recentOutboxActivity,
    ] = await Promise.all([
      prisma.outboxEvent.count({ where: { poolId, status: 'PENDING' } }),
      prisma.outboxEvent.count({ where: { poolId, status: 'PROCESSING' } }),
      prisma.outboxEvent.count({ where: { poolId, status: 'DEAD' } }),
      prisma.outboxEvent.count({ where: { poolId, status: 'FAILED' } }),
      prisma.outboxEvent.count({ where: { poolId, status: 'SENT' } }),
      prisma.outboxEvent.count({ where: { poolId, status: 'SUPPRESSED' } }),
      prisma.outboxEvent.count({ where: { poolId } }),
      prisma.outboxEvent.findMany({
        where: { poolId, status: { in: ['DEAD', 'FAILED'] } },
        orderBy: { createdAt: 'desc' },
        take: 25,
        select: {
          id: true,
          type: true,
          status: true,
          attempts: true,
          lastErrorCode: true,
          createdAt: true,
          nextAttemptAt: true,
          leaseExpiresAt: true,
          sentAt: true,
          retriedAt: true,
          retriedBy: true,
        },
      }),
      prisma.outboxEvent.findMany({
        where: { poolId },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: {
          id: true,
          type: true,
          status: true,
          attempts: true,
          lastErrorCode: true,
          createdAt: true,
          sentAt: true,
          retriedAt: true,
        },
      }),
    ]);

    const status = deadCount > 0 || failedCount > 0 ? 'DEGRADED' : 'HEALTHY';

    res.json({
      poolId,
      poolName: pool.name,
      status,
      timestamp: new Date().toISOString(),
      queueDepth: {
        pending: pendingCount,
        processing: processingCount,
        dead: deadCount,
        failed: failedCount,
        sent: sentCount,
        suppressed: suppressedCount,
        total: totalCount,
      },
      deadEvents,
      recentOutboxActivity,
    });
  } catch (error) {
    console.error('Error fetching pool ops health:', error);
    res.status(500).json({ error: 'Failed to fetch pool ops health telemetry.' });
  }
});

/**
 * POST /api/pools/:pool_id/ops/outbox/retry
 * Protected route for pool commissioner.
 * Re-queues DEAD or FAILED outbox events for the pool.
 * Resets status to PENDING, attempts to 0, clears leaseExpiresAt, sets nextAttemptAt to now,
 * and stamps retriedBy/retriedAt.
 * Strictly scoped to OutboxEvent records belonging to poolId.
 */
opsRouter.post('/:pool_id/ops/outbox/retry', requireAuth, requirePoolCommissioner, async (req: Request, res: Response): Promise<void> => {
  const pool = req.pool;
  const poolId = pool.id;
  const rawOutboxId = req.body?.outboxId || req.body?.outbox_id;
  const outboxId = typeof rawOutboxId === 'string' && UUID_REGEX.test(rawOutboxId) ? rawOutboxId : undefined;

  try {
    const where: any = {
      poolId,
      status: { in: ['DEAD', 'FAILED'] },
    };

    if (outboxId) {
      where.id = outboxId;
    }

    const result = await prisma.outboxEvent.updateMany({
      where,
      data: {
        status: 'PENDING',
        attempts: 0,
        leaseExpiresAt: null,
        nextAttemptAt: new Date(),
        retriedBy: req.user!.id,
        retriedAt: new Date(),
      },
    });

    res.json({
      success: true,
      poolId,
      retriedCount: result.count,
    });
  } catch (error) {
    console.error('Error retrying outbox events:', error);
    res.status(500).json({ error: 'Failed to retry outbox events.' });
  }
});
