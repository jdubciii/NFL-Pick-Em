import { Router, Request, Response } from 'express';
import prisma from '../db/client';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { runReminderScan } from '../services/reminderScanner';
import { runWrapUpEngine } from '../services/wrapUpEngine';
import { sealSeason, getSeasonSealStatus } from '../services/seasonSeal';
import { processTransportsBatch, getTransportsQueueStatus } from '../services/transports';

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
  const { weekNumber, weekId, poolId } = req.body || {};
  const targetWeek = weekNumber !== undefined ? Number(weekNumber) : (weekId !== undefined ? Number(weekId) : 1);

  try {
    const { jobRun, engineResult } = await runWrapUpEngine({
      weekNumber: targetWeek,
      poolId: typeof poolId === 'string' ? poolId : undefined,
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

