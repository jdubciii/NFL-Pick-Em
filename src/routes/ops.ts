import { Router, Request, Response } from 'express';
import prisma from '../db/client';
import { requireAuth, requirePoolCommissioner, UUID_REGEX } from '../middleware/auth';
import {
  createOverrideProposal,
  recordProposalVote,
  executeProposal,
  applyOverride,
  listProposals,
  listOverrides,
  getPoolOpsStatus,
} from '../services/overrideService';
import * as wrapUpEngine from '../services/wrapUpEngine';

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
 * GET /api/pools/:pool_id/ops/status
 * Protected route for pool commissioner.
 * Read-only pool wrap-up readiness, member stats, and operational overview.
 * Strict adherence to Decision #54 (NO WRITES ON GET).
 */
opsRouter.get('/:pool_id/ops/status', requireAuth, requirePoolCommissioner, async (req: Request, res: Response): Promise<void> => {
  const poolId = req.pool.id;

  try {
    const statusData = await getPoolOpsStatus(poolId);
    res.status(200).json(statusData);
  } catch (error: any) {
    console.error('Error fetching pool ops status:', error);
    res.status(500).json({ error: 'Failed to fetch pool ops status', details: error.message });
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

/**
 * GET /api/pools/:pool_id/proposals
 * Pool-tier read-only endpoint listing override proposals for the pool.
 * Protected by requireAuth & requirePoolCommissioner.
 * Strict adherence to Decision #54 (NO WRITES ON GET: zero state mutation).
 */
opsRouter.get('/:pool_id/proposals', requireAuth, requirePoolCommissioner, async (req: Request, res: Response): Promise<void> => {
  const poolId = req.pool.id;

  try {
    const proposals = await listProposals(poolId);
    res.status(200).json({
      poolId,
      proposals,
    });
  } catch (error: any) {
    console.error('Error listing proposals:', error);
    res.status(500).json({
      error: 'Failed to list proposals',
      details: error.message,
    });
  }
});

/**
 * POST /api/pools/:pool_id/proposals
 * Pool-tier endpoint to create a commissioner override proposal.
 * Protected by requireAuth & requirePoolCommissioner (Decision #20: No global admin override bypass).
 * Decision #54 compliant (Mutations occur via POST).
 */
opsRouter.post('/:pool_id/proposals', requireAuth, requirePoolCommissioner, async (req: Request, res: Response): Promise<void> => {
  const poolId = req.pool.id;
  const commissionerId = req.user!.id;
  const { type, targetEntityId, data, reason } = req.body || {};

  if (!type || !targetEntityId) {
    res.status(400).json({ error: 'type and targetEntityId are required fields.' });
    return;
  }

  try {
    const proposal = await createOverrideProposal({
      poolId,
      commissionerId,
      type,
      targetEntityId,
      data: data || {},
      reason: reason || 'Commissioner proposal',
    });

    res.status(201).json({
      message: 'Override proposal recorded successfully',
      proposal,
    });
  } catch (error: any) {
    console.error('Error creating override proposal:', error);
    res.status(500).json({
      error: 'Failed to create override proposal',
      details: error.message,
    });
  }
});

/**
 * POST /api/pools/:pool_id/proposals/:id/vote
 * Records commissioner approval or rejection vote on a proposal.
 * Protected by requireAuth & requirePoolCommissioner (Decision #20).
 */
opsRouter.post('/:pool_id/proposals/:id/vote', requireAuth, requirePoolCommissioner, async (req: Request, res: Response): Promise<void> => {
  const poolId = req.pool.id;
  const commissionerId = req.user!.id;
  const proposalId = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id || '');
  const { decision, vote } = req.body || {};
  const voteDecision = (decision || vote || '').toUpperCase();

  if (!proposalId || !UUID_REGEX.test(proposalId)) {
    res.status(400).json({ error: 'Invalid proposal ID format.' });
    return;
  }

  if (voteDecision !== 'APPROVE' && voteDecision !== 'REJECT') {
    res.status(400).json({ error: 'decision must be APPROVE or REJECT.' });
    return;
  }

  try {
    const updatedProposal = await recordProposalVote(
      poolId,
      proposalId,
      commissionerId,
      voteDecision as 'APPROVE' | 'REJECT'
    );

    res.status(200).json({
      success: true,
      message: `Proposal ${voteDecision.toLowerCase()}d successfully`,
      proposal: updatedProposal,
    });
  } catch (error: any) {
    console.error('Error recording proposal vote:', error);
    const status = error.message.includes('NOT_FOUND') ? 404 : 400;
    res.status(status).json({
      error: 'Failed to record proposal vote',
      details: error.message,
    });
  }
});

/**
 * POST /api/pools/:pool_id/proposals/:id/execute
 * Atomically executes an approved proposal, applying score adjustments via Prisma.Decimal.
 * Protected by requireAuth & requirePoolCommissioner (Decision #20).
 * Enforces Decision #27 (fail closed if slate/game is unfinalized) and Decision #55 (atomic rollback).
 */
opsRouter.post('/:pool_id/proposals/:id/execute', requireAuth, requirePoolCommissioner, async (req: Request, res: Response): Promise<void> => {
  const poolId = req.pool.id;
  const commissionerId = req.user!.id;
  const proposalId = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id || '');

  if (!proposalId || !UUID_REGEX.test(proposalId)) {
    res.status(400).json({ error: 'Invalid proposal ID format.' });
    return;
  }

  try {
    const result = await executeProposal(poolId, proposalId, commissionerId);
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error executing proposal:', error);
    const isClientError =
      error.message.includes('NOT_FOUND') ||
      error.message.includes('DECISION_27') ||
      error.message.includes('FAIL_CLOSED') ||
      error.message.includes('ALREADY_EXECUTED');
    const status = error.message.includes('NOT_FOUND') ? 404 : isClientError ? 400 : 500;

    res.status(status).json({
      error: 'Failed to execute proposal',
      details: error.message,
    });
  }
});

/**
 * GET /api/pools/:pool_id/overrides
 * Pool-tier read-only endpoint listing applied overrides for the pool.
 * Protected by requireAuth & requirePoolCommissioner.
 * Strict adherence to Decision #54 (NO WRITES ON GET: zero state mutation).
 */
opsRouter.get('/:pool_id/overrides', requireAuth, requirePoolCommissioner, async (req: Request, res: Response): Promise<void> => {
  const poolId = req.pool.id;

  try {
    const overrides = await listOverrides(poolId);
    res.status(200).json({
      poolId,
      overrides,
    });
  } catch (error: any) {
    console.error('Error listing overrides:', error);
    res.status(500).json({
      error: 'Failed to list overrides',
      details: error.message,
    });
  }
});

/**
 * POST /api/pools/:pool_id/overrides
 * Pool-tier endpoint to directly apply a commissioner override in a serializable transaction.
 * Protected by requireAuth & requirePoolCommissioner (Decision #20).
 * Decision #54 compliant (Mutations occur via POST).
 */
opsRouter.post('/:pool_id/overrides', requireAuth, requirePoolCommissioner, async (req: Request, res: Response): Promise<void> => {
  const poolId = req.pool.id;
  const commissionerId = req.user!.id;
  const { type, targetEntityId, data, reason } = req.body || {};

  if (!type || !targetEntityId) {
    res.status(400).json({ error: 'type and targetEntityId are required fields.' });
    return;
  }

  try {
    const result = await applyOverride({
      poolId,
      commissionerId,
      type,
      targetEntityId,
      data: data || {},
      reason: reason || 'Commissioner override execution',
    });

    res.status(200).json({
      message: 'Override applied successfully',
      ...result,
    });
  } catch (error: any) {
    console.error('Error applying override:', error);
    res.status(500).json({
      error: 'Failed to apply override',
      details: error.message,
    });
  }
});

/**
 * Handler for GET /api/pools/:pool_id/wrap-up/preview (and /:pool_id/ops/wrap-up/preview)
 * Pool-scoped settlement preview enforcing Decision #20 (no global admin bypass) and pre-kickoff privacy.
 */
export async function handlePoolWrapUpPreview(req: Request, res: Response): Promise<void> {
  const actorId = req.user?.id;
  if (!actorId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const rawPoolId = req.params.pool_id || req.params.poolId;
  if (!rawPoolId || typeof rawPoolId !== 'string' || !UUID_REGEX.test(rawPoolId)) {
    res.status(400).json({ error: 'Invalid pool ID format. Must be a valid UUID in route path.' });
    return;
  }

  const poolId = rawPoolId;
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    include: {
      memberships: {
        where: { userId: actorId, status: 'ACTIVE' },
      },
    },
  });

  if (!pool) {
    res.status(404).json({ error: 'Pool not found.' });
    return;
  }

  const isActiveMember = pool.memberships.length > 0;

  // Strict tenant boundary (Decision #20, Directive Section 6, Architect Finding 1):
  // Active membership is strictly required for all actors (including pool commissioner/owner).
  // Pool ownership or commissioner role does NOT bypass the active membership requirement!
  if (!isActiveMember) {
    res.status(403).json({ error: 'FORBIDDEN_ACTIVE_MEMBERSHIP_REQUIRED: Must be an ACTIVE member of the requested pool.' });
    return;
  }

  const weekParam = req.query.week || req.query.weekNumber;
  const weekNumber = Number(weekParam || (pool.settings as any)?.week_number || 1);
  const season = req.query.season ? Number(req.query.season) : undefined;
  const seasonType = req.query.seasonType ? Number(req.query.seasonType) : undefined;

  try {
    const preview = await wrapUpEngine.previewWeeklyWrapUpForPool(poolId, weekNumber, { season, seasonType });

    // Pre-kickoff privacy gating (Contract & Finding 1):
    // Missing, invalid, or pre-kickoff deadlines strictly omit other members' numeric predictions!
    const kickoffTime = preview.designatedGame?.kickoffTime ? new Date(preview.designatedGame.kickoffTime) : null;
    const isValidKickoff = Boolean(kickoffTime && !isNaN(kickoffTime.getTime()));
    const hasKickoffPassed = isValidKickoff && new Date() >= kickoffTime!;

    const sanitizedStandings = preview.projectedStandings?.map((entry: any) => {
      const isSelf = entry.userId === actorId;
      return {
        ...entry,
        tieBreakerPrediction: (hasKickoffPassed || isSelf) ? entry.tieBreakerPrediction : undefined,
      };
    });

    res.status(200).json({
      status: preview.readyToSettle ? 'READY' : 'NOT_READY',
      preview: {
        ...preview,
        projectedStandings: sanitizedStandings,
      },
    });
  } catch (error: any) {
    console.error('Error generating wrap-up preview:', error);
    res.status(500).json({
      error: 'Failed to generate wrap-up preview',
      details: error.message,
    });
  }
}

opsRouter.get('/:pool_id/wrap-up/preview', requireAuth, handlePoolWrapUpPreview);
opsRouter.get('/:pool_id/ops/wrap-up/preview', requireAuth, handlePoolWrapUpPreview);
