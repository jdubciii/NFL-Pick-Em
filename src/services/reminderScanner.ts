import { Prisma, OutboxStatus } from '@prisma/client';
import prisma from '../db/client';
import { withJobRun } from '../jobs/jobRunner';

export type ClockFn = () => Date;

export interface ReminderScanOptions {
  clock?: ClockFn;
  windowsHours?: number[];
  weekId?: string | number;
  poolId?: string;
  prismaClient?: typeof prisma;
}

export interface ReminderScanResult {
  poolsScanned: number;
  usersScanned: number;
  remindersEnqueued: number;
  skippedOptedOut: number;
  skippedAlreadyPicked: number;
  windowsEvaluated: number[];
  scannedAt: string;
}

/**
 * Scans active pools and upcoming games to identify members with unsubmitted picks
 * within configured lookahead windows (default: 24h and 2h prior to game kickoff).
 * 
 * Invariants:
 * - Decision #20: Operates strictly at the System Tier.
 * - Decision #54: Triggered solely by write (POST) methods or background cron; GETs are read-only.
 * - Decision #55: Fails closed if the database or outbox is unreachable.
 * - Deterministic deduplication key: `remind:v1:user:<user_id>:week:<week_id>:window:<window_hours>`
 */
export async function scanAndEnqueueReminders(
  options: ReminderScanOptions = {}
): Promise<ReminderScanResult> {
  const clock: ClockFn = options.clock || (() => new Date());
  const now = clock();
  const windowsHours = options.windowsHours && options.windowsHours.length > 0
    ? options.windowsHours
    : [24, 2];
  const weekId = String(options.weekId ?? '1');
  const db = options.prismaClient || prisma;

  // Fail-Closed check (Decision #55): If DB client is invalid or unconfigured, throw
  if (!db || typeof db.$transaction !== 'function') {
    throw new Error('CLAIM_STORE_UNAVAILABLE: Database client is unconfigured or unavailable');
  }

  let poolsScanned = 0;
  let usersScanned = 0;
  let remindersEnqueued = 0;
  let skippedOptedOut = 0;
  let skippedAlreadyPicked = 0;

  // 1. Fetch active pools
  const poolWhere: Prisma.PoolWhereInput = {
    status: 'ACTIVE',
  };
  if (options.poolId) {
    poolWhere.id = options.poolId;
  }

  const pools = await db.pool.findMany({
    where: poolWhere,
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

  poolsScanned = pools.length;

  for (const pool of pools) {
    for (const windowHours of windowsHours) {
      // Lookahead window: kickoffTime > now AND kickoffTime <= now + (windowHours * 3600 * 1000)
      const windowEnd = new Date(now.getTime() + windowHours * 3600 * 1000);

      const upcomingGames = await db.game.findMany({
        where: {
          status: 'SCHEDULED',
          kickoffTime: {
            gt: now,
            lte: windowEnd,
          },
        },
        orderBy: { kickoffTime: 'asc' },
      });

      if (upcomingGames.length === 0) {
        continue;
      }

      const earliestKickoff = upcomingGames[0].kickoffTime;
      const gameIds = upcomingGames.map((g) => g.id);

      for (const membership of pool.memberships) {
        usersScanned++;
        const user = membership.user;
        const pref = user.notificationPreference;

        // User preference evaluation:
        // - Global opt-out: emailEnabled === false
        // - Specific window opt-out: reminderOffsetsHours defined and does not include windowHours
        // - pickReminders explicitly set to false
        if (pref) {
          if (pref.emailEnabled === false) {
            skippedOptedOut++;
            continue;
          }
          if (Array.isArray(pref.reminderOffsetsHours) && pref.reminderOffsetsHours.length > 0) {
            if (!pref.reminderOffsetsHours.includes(windowHours)) {
              skippedOptedOut++;
              continue;
            }
          }
          if ((pref as any).pickReminders === false) {
            skippedOptedOut++;
            continue;
          }
        }

        // Check if user has submitted picks for all upcoming games in this window
        const userPicks = await db.pick.findMany({
          where: {
            poolId: pool.id,
            userId: user.id,
            gameId: { in: gameIds },
            selectedTeamId: { not: null },
          },
        });

        const pickedGameIds = new Set(userPicks.map((p) => p.gameId));
        const hasMissingPicks = upcomingGames.some((g) => !pickedGameIds.has(g.id));

        if (!hasMissingPicks) {
          skippedAlreadyPicked++;
          continue;
        }

        // User needs a reminder. Construct deterministic compound deduplication key.
        const dedupeKey = `remind:v1:user:${user.id}:week:${weekId}:window:${windowHours}`;

        const payload = {
          poolName: pool.name,
          windowLabel: `${windowHours}h reminder`,
          lockAtUtc: earliestKickoff.toISOString(),
          deepLink: `/pools/${pool.id}/picks`,
        };

        // Transactional creation with database-enforced unique dedupeKey
        await db.$transaction(async (tx) => {
          const outboxResult = await tx.outboxEvent.createMany({
            data: [
              {
                poolId: pool.id,
                recipientUserId: user.id,
                type: 'REMINDER',
                payload,
                dedupeKey,
                status: OutboxStatus.PENDING,
                attempts: 0,
                nextAttemptAt: now,
              },
            ],
            skipDuplicates: true,
          });

          await tx.inboxMessage.createMany({
            data: [
              {
                poolId: pool.id,
                userId: user.id,
                type: 'REMINDER',
                payload,
                dedupeKey,
              },
            ],
            skipDuplicates: true,
          });

          if (outboxResult.count > 0) {
            remindersEnqueued++;
          }
        });
      }
    }
  }

  return {
    poolsScanned,
    usersScanned,
    remindersEnqueued,
    skippedOptedOut,
    skippedAlreadyPicked,
    windowsEvaluated: windowsHours,
    scannedAt: now.toISOString(),
  };
}

/**
 * Runs the Reminder Scanner within a tracked JobRun.
 */
export async function runReminderScan(options: ReminderScanOptions = {}) {
  let scanResult: ReminderScanResult = {
    poolsScanned: 0,
    usersScanned: 0,
    remindersEnqueued: 0,
    skippedOptedOut: 0,
    skippedAlreadyPicked: 0,
    windowsEvaluated: [],
    scannedAt: new Date().toISOString(),
  };

  const jobRun = await withJobRun('reminder_scan', async () => {
    scanResult = await scanAndEnqueueReminders(options);
    return {
      itemsProcessed: scanResult.remindersEnqueued,
      succeeded: scanResult.remindersEnqueued,
      failed: 0,
      meta: scanResult,
    };
  });

  return { jobRun, scanResult };
}
