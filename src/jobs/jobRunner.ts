import { JobRun, JobStatus, Prisma } from '@prisma/client';
import prisma from '../db/client';
import { drainOutbox, DrainResult } from '../workers/drain';
import { scrubErrorMessage } from '../utils/errorScrubber';

export interface JobExecutionResult {
  itemsProcessed: number;
  succeeded?: number;
  failed?: number;
  dead?: number;
  meta?: any;
}

/**
 * Wraps a background job function with transactional lifecycle auditing in job_runs.
 * Creates a RUNNING record, executes the function, and updates status to OK, PARTIAL, or FAILED.
 * Resilient against database write failures (logs failure, never throws or skips the underlying job).
 */
export async function withJobRun(
  jobName: string,
  fn: (jobRunId: string) => Promise<JobExecutionResult>
): Promise<JobRun> {
  let jobRunRecord: JobRun | null = null;
  const startedAt = new Date();

  // 1. Attempt initial JobRun creation
  try {
    jobRunRecord = await prisma.jobRun.create({
      data: {
        jobName,
        status: JobStatus.RUNNING,
        startedAt,
        itemsProcessed: 0,
      },
    });
  } catch (err) {
    console.error(`[withJobRun] Failed to create JobRun record for ${jobName}:`, err);
  }

  const jobRunId = jobRunRecord?.id || `fallback-${Date.now()}`;

  try {
    const result = await fn(jobRunId);

    const succeeded = result.succeeded ?? result.meta?.succeeded ?? 0;
    const failed = result.failed ?? result.meta?.failed ?? 0;
    const dead = result.dead ?? result.meta?.dead ?? 0;

    const isPartial = succeeded > 0 && (failed + dead) > 0;
    const finalStatus: JobStatus = isPartial ? JobStatus.PARTIAL : JobStatus.OK;
    const finishedAt = new Date();

    if (jobRunRecord) {
      try {
        jobRunRecord = await prisma.jobRun.update({
          where: { id: jobRunRecord.id },
          data: {
            status: finalStatus,
            finishedAt,
            itemsProcessed: result.itemsProcessed || 0,
            meta: result.meta ? result.meta : Prisma.DbNull,
          },
        });
      } catch (updateErr) {
        console.error(`[withJobRun] Failed to update JobRun record ${jobRunRecord.id}:`, updateErr);
      }
    }

    return (
      jobRunRecord || {
        id: jobRunId,
        jobName,
        status: finalStatus,
        startedAt,
        finishedAt,
        itemsProcessed: result.itemsProcessed || 0,
        errorCode: null,
        meta: result.meta || null,
      }
    );
  } catch (error: any) {
    const scrubbedError = scrubErrorMessage(error);
    const finishedAt = new Date();

    if (jobRunRecord) {
      try {
        jobRunRecord = await prisma.jobRun.update({
          where: { id: jobRunRecord.id },
          data: {
            status: JobStatus.FAILED,
            finishedAt,
            errorCode: scrubbedError,
          },
        });
      } catch (updateErr) {
        console.error(`[withJobRun] Failed to update JobRun error status ${jobRunRecord.id}:`, updateErr);
      }
    }

    return (
      jobRunRecord || {
        id: jobRunId,
        jobName,
        status: JobStatus.FAILED,
        startedAt,
        finishedAt,
        itemsProcessed: 0,
        errorCode: scrubbedError,
        meta: null,
      }
    );
  }
}

/**
 * Executes the outbox drain worker within a tracked JobRun.
 */
export async function runOutboxDrain(options: { batchSize?: number } = {}): Promise<{ jobRun: JobRun; drainResult: DrainResult }> {
  let drainResult: DrainResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    dead: 0,
    suppressed: 0,
  };

  const jobRun = await withJobRun('outbox_drain', async () => {
    drainResult = await drainOutbox(options);
    return {
      itemsProcessed: drainResult.processed,
      succeeded: drainResult.succeeded,
      failed: drainResult.failed,
      dead: drainResult.dead,
      meta: drainResult,
    };
  });

  return { jobRun, drainResult };
}
