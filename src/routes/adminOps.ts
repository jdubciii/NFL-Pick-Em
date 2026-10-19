import { Router, Request, Response } from 'express';
import prisma from '../db/client';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { runReminderScan } from '../services/reminderScanner';
import { runWrapUpEngine, previewWeeklyWrapUpForPool } from '../services/wrapUpEngine';
import { sealSeason, getSeasonSealStatus } from '../services/seasonSeal';
import { processTransportsBatch, getTransportsQueueStatus } from '../services/transports';
import { runRetentionPruning, getRetentionStatus } from '../services/retentionService';
import { refreshWeeklySlateInDb } from '../services/authoritativeSlateService';
import { handlePoolWrapUpPreview } from './ops';

export const adminOpsRouter = Router();

/**
 * POST /api/admin/ops/scan-reminders
 * System-tier endpoint to trigger the Automated Reminder Scanner.
 * Protected by requireAuth & requireAdmin (Decision #20: Rejected for standard users and pool commissioners).
 * Enforces Decision #54 (Mutations occur strictly via POST, never GET).
 */
adminOpsRouter.post('/scan-reminders', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { windowsHours, weekId, poolId } = req.body || {};

  try {
    const { jobRun, scanResult } = await runReminderScan({
      windowsHours: Array.isArray(windowsHours) ? windowsHours : undefined,
      weekId: weekId !== undefined ? weekId : undefined,
      poolId: typeof poolId === 'string' ? poolId : undefined,
    });

    res.status(200).json({
      message: 'Reminder scan executed successfully',
      jobRun,
      scanResult,
    });
  } catch (error: any) {
    console.error('Error executing reminder scan:', error);
    res.status(500).json({
      error: 'Failed to execute reminder scan',
      details: error.message,
    });
  }
});

/**
 * GET /api/admin/ops/scan-reminders/status
 * Read-only health and telemetry query for the Reminder Scanner.
 * Strict adherence to Decision #54 (NO WRITES ON GET: zero state mutation or side effects).
 * Protected by requireAuth & requireAdmin.
 */
adminOpsRouter.get('/scan-reminders/status', requireAuth, requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const latestJobRun = await prisma.jobRun.findFirst({
      where: { jobName: 'reminder_scan' },
      orderBy: { startedAt: 'desc' },
    });

    res.status(200).json({
      status: 'ok',
      service: 'reminder_scanner',
      latestJobRun: latestJobRun || null,
    });
  } catch (error: any) {
    console.error('Error querying reminder scanner status:', error);
    res.status(500).json({
      error: 'Failed to retrieve reminder scanner status',
      details: error.message,
    });
  }
});

/**
 * POST /api/admin/ops/wrap-up
 * System-tier endpoint to trigger the Weekly Wrap-Up Engine.
 * Protected by requireAuth & requireAdmin (Decision #20: Rejected for pool commissioners and standard users).
 * Enforces Decision #54 (Mutations occur strictly via POST).
 */
adminOpsRouter.post('/wrap-up', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { weekNumber, weekId, poolId, season, seasonType, previewRevision, inputFingerprint } = req.body || {};
  const targetWeek = weekNumber !== undefined ? Number(weekNumber) : (weekId !== undefined ? Number(weekId) : 1);
  const targetSeason = season !== undefined ? Number(season) : 2026;
  const targetSeasonType = seasonType !== undefined ? Number(seasonType) : 2;

  try {
    const { jobRun, engineResult } = await runWrapUpEngine({
      weekNumber: targetWeek,
      season: targetSeason,
      seasonType: targetSeasonType,
      poolId: typeof poolId === 'string' ? poolId : undefined,
      previewRevision,
      inputFingerprint,
      appliedBy: req.user!.id,
    });

    res.status(200).json({
      message: 'Weekly wrap-up executed successfully',
      jobRun,
      engineResult,
    });
  } catch (error: any) {
    console.error('Error executing weekly wrap-up engine:', error);
    res.status(500).json({
      error: 'Failed to execute weekly wrap-up engine',
      details: error.message,
    });
  }
});

/**
 * GET /api/admin/ops/wrap-up/status
 * Read-only health and telemetry query for the Weekly Wrap-Up Engine.
 * Strict adherence to Decision #54 (NO WRITES ON GET).
 * Protected by requireAuth & requireAdmin.
 */
adminOpsRouter.get('/wrap-up/status', requireAuth, requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const latestJobRun = await prisma.jobRun.findFirst({
      where: { jobName: 'weekly_wrapup' },
      orderBy: { startedAt: 'desc' },
    });

    res.status(200).json({
      status: 'ok',
      service: 'weekly_wrapup_engine',
      latestJobRun: latestJobRun || null,
    });
  } catch (error: any) {
    console.error('Error querying wrap-up status:', error);
    res.status(500).json({
      error: 'Failed to retrieve wrap-up status',
      details: error.message,
    });
  }
});

/**
 * GET /api/admin/ops/wrap-up/preview
 * Read-only settlement preview for commissioners and admins.
 * Evaluates slate completeness, designated game status, and projected rankings/penalties.
 * Strictly adheres to Decision #54 (NO WRITES ON GET).
 */
adminOpsRouter.get('/wrap-up/preview', requireAuth, handlePoolWrapUpPreview);

/**
 * POST /api/admin/ops/slate/refresh
 * Controlled commissioner refresh workflow for authoritative weekly slate.
 * Fetches and validates ESPN observations before persisting accepted revision atomically.
 * Protected by requireAuth & requireAdmin.
 */
adminOpsRouter.post('/slate/refresh', requireAuth, async (req: Request, res: Response): Promise<void> => {
  // Separate route availability from refresh execution authorization (P41 Section 6)
  if (process.env.SLATE_REFRESH_ENABLED !== 'true') {
    res.status(403).json({
      error: 'REFRESH_EXECUTION_DISABLED: Authoritative slate refresh execution is currently disabled by operational controls.',
    });
    return;
  }

  const { poolId, season, seasonType, weekNumber, weekId } = req.body || {};
  if (!poolId || typeof poolId !== 'string') {
    res.status(400).json({ error: 'poolId is required.' });
    return;
  }

  const actorId = req.user!.id;

  // 1. Authenticated actor already verified by requireAuth (req.user)
  // 2. Verify requested pool exists
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
  });
  if (!pool) {
    res.status(404).json({ error: 'Pool not found.' });
    return;
  }

  // 3. Verify ACTIVE pool membership
  const membership = await prisma.poolMembership.findUnique({
    where: {
      poolId_userId: {
        poolId,
        userId: actorId,
      },
    },
  });
  if (!membership || membership.status !== 'ACTIVE') {
    res.status(403).json({ error: 'FORBIDDEN_ACTIVE_MEMBERSHIP_REQUIRED: Must be an ACTIVE member of the requested pool.' });
    return;
  }

  // 4. Verify commissioner authority (pool.adminId === actorId).
  // A global ADMIN role does not provide ambient authority over an unrelated pool.
  if (pool.adminId !== actorId) {
    res.status(403).json({ error: 'FORBIDDEN_COMMISSIONER_REQUIRED: Only the pool commissioner may refresh the authoritative slate.' });
    return;
  }

  const targetWeek = weekNumber !== undefined ? Number(weekNumber) : (weekId !== undefined ? Number(weekId) : 1);
  const targetSeason = season !== undefined ? Number(season) : 2026;
  const targetSeasonType = seasonType !== undefined ? Number(seasonType) : 2;

  try {
    const result = await refreshWeeklySlateInDb(prisma, {
      poolId,
      seasonYear: targetSeason,
      seasonType: targetSeasonType,
      weekNumber: targetWeek,
      operatorId: actorId,
    });

    if (!result.success) {
      res.status(422).json({
        error: 'Authoritative slate refresh rejected',
        reason: result.reason,
      });
      return;
    }

    res.status(200).json({
      message: 'Weekly slate refreshed successfully',
      result,
    });
  } catch (error: any) {
    console.error('Error refreshing weekly slate:', error);
    res.status(500).json({
      error: 'Failed to refresh weekly slate',
      details: error.message,
    });
  }
});

/**
 * POST /api/admin/ops/season-seal
 * System-tier endpoint to seal season standings and record an immutable snapshot.
 * Protected by requireAuth & requireAdmin (Decision #20).
 * Enforces Decision #54 (Mutations occur strictly via POST).
 */
adminOpsRouter.post('/season-seal', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { seasonYear, weekNumber, poolId } = req.body || {};

  try {
    const sealResult = await sealSeason({
      seasonYear: seasonYear ? Number(seasonYear) : undefined,
      weekNumber: weekNumber ? Number(weekNumber) : undefined,
      poolId: typeof poolId === 'string' ? poolId : undefined,
      sealedBy: req.user!.id,
    });

    res.status(200).json({
      message: 'Season seal snapshot recorded successfully',
      seal: sealResult,
    });
  } catch (error: any) {
    console.error('Error executing season seal:', error);
    res.status(500).json({
      error: 'Failed to seal season standings',
      details: error.message,
    });
  }
});

/**
 * GET /api/admin/ops/season-seal/status
 * Read-only status query for season seal snapshot.
 * Strict adherence to Decision #54 (NO WRITES ON GET).
 */
adminOpsRouter.get('/season-seal/status', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const poolId = typeof req.query.pool_id === 'string' ? req.query.pool_id : undefined;

  try {
    const status = await getSeasonSealStatus(poolId);
    res.status(200).json({
      status: 'ok',
      service: 'season_seal',
      ...status,
    });
  } catch (error: any) {
    console.error('Error querying season seal status:', error);
    res.status(500).json({
      error: 'Failed to retrieve season seal status',
      details: error.message,
    });
  }
});

/**
 * POST /api/admin/ops/transports/drain
 * System-tier endpoint to trigger the Notification Transports dispatch sweep.
 * Protected strictly by requireAuth & requireAdmin (Decision #20).
 * Enforces Decision #54 (Mutations occur strictly via POST).
 */
adminOpsRouter.post('/transports/drain', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { batchSize } = req.body || {};

  try {
    const result = await processTransportsBatch({
      batchSize: batchSize !== undefined ? Number(batchSize) : undefined,
    });

    res.status(200).json({
      message: 'Transport sweep executed successfully',
      result,
    });
  } catch (error: any) {
    console.error('Error executing transport sweep:', error);
    res.status(500).json({
      error: 'Failed to execute transport sweep',
      details: error.message,
    });
  }
});

/**
 * GET /api/admin/ops/transports/status
 * Read-only health and queue depth query for Notification Transports & DLQ.
 * Strict adherence to Decision #54 (NO WRITES ON GET: zero state mutation or side effects).
 * Protected strictly by requireAuth & requireAdmin.
 */
adminOpsRouter.get('/transports/status', requireAuth, requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const status = await getTransportsQueueStatus();

    res.status(200).json({
      status: 'ok',
      service: 'transports_engine',
      ...status,
    });
  } catch (error: any) {
    console.error('Error querying transports status:', error);
    res.status(500).json({
      error: 'Failed to retrieve transports status',
      details: error.message,
    });
  }
});

/**
 * POST /api/admin/ops/retention/prune
 * System-tier endpoint to trigger the Notification Retention & Pruning execution sweep.
 * Protected strictly by requireAuth & requireAdmin (Decision #20).
 * Enforces Decision #54 (Mutations occur strictly via POST).
 */
adminOpsRouter.post('/retention/prune', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { sentRetentionDays, deadRetentionDays, suppressedRetentionDays, inboxRetentionDays, batchSize, maxBatches } = req.body || {};

  try {
    const result = await runRetentionPruning({
      sentRetentionDays: sentRetentionDays !== undefined ? Number(sentRetentionDays) : undefined,
      deadRetentionDays: deadRetentionDays !== undefined ? Number(deadRetentionDays) : undefined,
      suppressedRetentionDays: suppressedRetentionDays !== undefined ? Number(suppressedRetentionDays) : undefined,
      inboxRetentionDays: inboxRetentionDays !== undefined ? Number(inboxRetentionDays) : undefined,
      batchSize: batchSize !== undefined ? Number(batchSize) : undefined,
      maxBatches: maxBatches !== undefined ? Number(maxBatches) : undefined,
    });

    res.status(200).json({
      message: 'Notification retention pruning executed successfully',
      result,
    });
  } catch (error: any) {
    console.error('Error executing retention pruning:', error);
    res.status(500).json({
      error: 'Failed to execute retention pruning',
      details: error.message,
    });
  }
});

/**
 * GET /api/admin/ops/retention/status
 * Read-only health, terminal queue depths, and prunable records query.
 * Strict adherence to Decision #54 (NO WRITES ON GET: zero state mutation or side effects).
 * Protected strictly by requireAuth & requireAdmin.
 */
adminOpsRouter.get('/retention/status', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { sentRetentionDays, deadRetentionDays, suppressedRetentionDays, inboxRetentionDays } = req.query || {};

  try {
    const status = await getRetentionStatus({
      sentRetentionDays: sentRetentionDays !== undefined ? Number(sentRetentionDays) : undefined,
      deadRetentionDays: deadRetentionDays !== undefined ? Number(deadRetentionDays) : undefined,
      suppressedRetentionDays: suppressedRetentionDays !== undefined ? Number(suppressedRetentionDays) : undefined,
      inboxRetentionDays: inboxRetentionDays !== undefined ? Number(inboxRetentionDays) : undefined,
    });

    res.status(200).json({
      status: 'ok',
      service: 'retention_pruning_engine',
      ...status,
    });
  } catch (error: any) {
    console.error('Error querying retention status:', error);
    res.status(500).json({
      error: 'Failed to retrieve retention status',
      details: error.message,
    });
  }
});

/**
 * POST /api/admin/ops/reminders/scan
 * Alias for /scan-reminders.
 */
adminOpsRouter.post('/reminders/scan', requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { windowsHours, weekId, poolId } = req.body || {};

  try {
    const { jobRun, scanResult } = await runReminderScan({
      windowsHours: Array.isArray(windowsHours) ? windowsHours : undefined,
      weekId: weekId !== undefined ? weekId : undefined,
      poolId: typeof poolId === 'string' ? poolId : undefined,
    });

    res.status(200).json({
      message: 'Reminder scan executed successfully',
      jobRun,
      scanResult,
    });
  } catch (error: any) {
    console.error('Error executing reminder scan:', error);
    res.status(500).json({
      error: 'Failed to execute reminder scan',
      details: error.message,
    });
  }
});

/**
 * GET /api/admin/ops/system/health
 * System-tier consolidated aggregate telemetry view of daemon health, queue latencies, DLQ, retention, and recent runs.
 * Protected strictly by requireAuth & requireAdmin (Decision #20: No pool commissioner or standard user bypass).
 * Strict adherence to Decision #54 (NO WRITES ON GET: zero state mutations or side effects).
 * Strict adherence to Decision #55 (Fail closed on database or service failure).
 */
adminOpsRouter.get('/system/health', requireAuth, requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      transportsStatus,
      retentionStatus,
      recentJobRuns,
      dlqRecords,
    ] = await Promise.all([
      getTransportsQueueStatus(),
      getRetentionStatus(),
      prisma.jobRun.findMany({
        orderBy: { startedAt: 'desc' },
        take: 10,
      }),
      prisma.outboxEvent.findMany({
        where: { status: 'DEAD' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          poolId: true,
          recipientUserId: true,
          type: true,
          status: true,
          attempts: true,
          lastErrorCode: true,
          createdAt: true,
          sentAt: true,
          payload: true,
        },
      }),
    ]);

    const totalOutbox =
      (retentionStatus.queueDepths.pending || 0) +
      (retentionStatus.queueDepths.processing || 0) +
      (retentionStatus.queueDepths.sent || 0) +
      (retentionStatus.queueDepths.failed || 0) +
      (retentionStatus.queueDepths.dead || 0) +
      (retentionStatus.queueDepths.suppressed || 0);

    const terminalOutbox =
      (retentionStatus.queueDepths.sent || 0) +
      (retentionStatus.queueDepths.dead || 0) +
      (retentionStatus.queueDepths.suppressed || 0);

    const activeOutbox =
      (retentionStatus.queueDepths.pending || 0) +
      (retentionStatus.queueDepths.processing || 0);

    const totalInbox =
      (retentionStatus.queueDepths.inboxUnread || 0) +
      (retentionStatus.queueDepths.inboxRead || 0);

    const hasDeadLetters = (transportsStatus.deadLetterCount || 0) > 0;
    const hasFailedRecentJobs = recentJobRuns.some((j) => j.status === 'FAILED');
    const systemStatus = hasDeadLetters || hasFailedRecentJobs ? 'DEGRADED' : 'HEALTHY';

    res.status(200).json({
      status: systemStatus,
      timestamp: new Date().toISOString(),
      service: 'system_admin_ops',
      queues: {
        outbox: {
          pending: transportsStatus.queueDepth.pending,
          processing: transportsStatus.queueDepth.processing,
          deadLetters: transportsStatus.queueDepth.dead,
          sent: transportsStatus.queueDepth.sent,
          failed: transportsStatus.queueDepth.failed,
          suppressed: transportsStatus.queueDepth.suppressed,
          total: totalOutbox,
        },
        inbox: {
          total: totalInbox,
          unread: retentionStatus.queueDepths.inboxUnread,
          read: retentionStatus.queueDepths.inboxRead,
        },
        dlq: {
          count: transportsStatus.deadLetterCount,
          recentFailures: dlqRecords.length > 0 ? dlqRecords : transportsStatus.recentDeadEvents,
        },
      },
      retention: {
        totalOutbox,
        terminalOutbox,
        activeOutbox,
        prunableOutbox:
          (retentionStatus.prunableCounts.sent || 0) +
          (retentionStatus.prunableCounts.dead || 0) +
          (retentionStatus.prunableCounts.suppressed || 0),
        totalInbox,
        prunableInbox: retentionStatus.prunableCounts.inbox || 0,
        prunableTotal: retentionStatus.prunableCounts.total || 0,
      },
      recentJobRuns,
    });
  } catch (error: any) {
    console.error('Error fetching consolidated system health:', error);
    res.status(500).json({
      error: 'Failed to retrieve consolidated system health telemetry',
      details: error.message,
    });
  }
});



