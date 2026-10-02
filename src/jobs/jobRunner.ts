import { JobRun, JobStatus, Prisma } from '@prisma/client';
import prisma from '../db/client';
import { drainOutbox, DrainResult } from '../workers/drain';
import { scrubErrorMessage } from '../utils/errorScrubber';

export interface JobExecutionResult {
  itemsProcessed: number;
  meta?: any;
}

/**
 * Wraps a background job function with transactional lifecycle auditing in job_runs.
 * Creates a RUNNING record, executes the function, and updates status to OK, PARTIAL, or FAILED.
 */
export async function withJobRun(
  jobName: string,
  fn: (jobRunId: string) => Promise<JobExecutionResult>
): Promise<JobRun> {
  const jobRun = await prisma.jobRun.create({
    data: {
      jobName,
      status: JobStatus.RUNNING,
      startedAt: new Date(),
      itemsProcessed: 0,
    },
  });

  try {
    const result = await fn(jobRun.id);

    return await prisma.jobRun.update({
      where: { id: jobRun.id },
      data: {
        status: JobStatus.OK,
        finishedAt: new Date(),
        itemsProcessed: result.itemsProcessed || 0,
        meta: result.meta ? result.meta : Prisma.DbNull,
      },
    });
  } catch (error: any) {
    const scrubbedError = scrubErrorMessage(error);

    return await prisma.jobRun.update({
      where: { id: jobRun.id },
      data: {
        status: JobStatus.FAILED,
        finishedAt: new Date(),
        errorCode: scrubbedError,
      },
    });
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
      meta: drainResult,
    };
  });

  return { jobRun, drainResult };
}


