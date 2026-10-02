import { JobRun, JobStatus, Prisma } from '@prisma/client';
import prisma from '../db/client';
import { drainOutbox, DrainResult } from '../workers/drain';
import { enqueueNotification } from '../services/notifications';
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

/**
 * Executes the pick deadline reminder scanner within a tracked JobRun.
 * Scans upcoming scheduled games and enqueues reminder notifications for members with missing picks.
 */
export async function runReminderScan(): Promise<{ jobRun: JobRun; enqueuedCount: number }> {
  let enqueuedCount = 0;

  const jobRun = await withJobRun('reminder_scan', async () => {
    const now = new Date();
    // Look ahead 48 hours for scheduled games
    const upcomingThreshold = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const upcomingGames = await prisma.game.findMany({
      where: {
        status: 'SCHEDULED',
        kickoffTime: {
          gt: now,
          lte: upcomingThreshold,
        },
      },
      orderBy: { kickoffTime: 'asc' },
    });

    if (upcomingGames.length === 0) {
      return { itemsProcessed: 0, meta: { upcomingGames: 0 } };
    }

    const activePools = await prisma.pool.findMany({
      where: { status: 'ACTIVE' },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: {
            user: {
              include: {
                notificationPreference: true,
              },
            },
          },
        },
      },
    });

    for (const pool of activePools) {
      for (const game of upcomingGames) {
        const hoursUntilKickoff = (game.kickoffTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        for (const membership of pool.memberships) {
          const user = membership.user;
          const offsets = user.notificationPreference?.reminderOffsetsHours || [24, 2];

          // Check if current time matches any configured reminder offset (within a 30m window)
          for (const offset of offsets) {
            const matchesOffset = hoursUntilKickoff <= offset && hoursUntilKickoff > (offset - 0.5);

            if (matchesOffset) {
              const existingPick = await prisma.pick.findFirst({
                where: {
                  poolId: pool.id,
                  userId: user.id,
                  gameId: game.id,
                },
              });

              if (!existingPick || existingPick.selectedTeamId === null) {
                const dedupeKey = `reminder-${pool.id}-${user.id}-${game.id}-${offset}h`;

                await prisma.$transaction(async (tx) => {
                  await enqueueNotification(tx, {
                    poolId: pool.id,
                    userId: user.id,
                    type: 'PICK_REMINDER',
                    payload: {
                      poolName: pool.name,
                      windowLabel: `Game ${game.awayTeamId} @ ${game.homeTeamId}`,
                      lockAtUtc: game.kickoffTime.toISOString(),
                      deepLink: `/pools/${pool.id}/picks`,
                    },
                    dedupeKey,
                    channels: ['IN_APP', 'EMAIL'],
                  });
                });
                enqueuedCount++;
              }
            }
          }
        }
      }
    }

    return {
      itemsProcessed: enqueuedCount,
      meta: { upcomingGames: upcomingGames.length, enqueuedCount },
    };
  });

  return { jobRun, enqueuedCount };
}
