import { OutboxStatus } from '@prisma/client';
import prisma from '../db/client';

export type ClockFn = () => Date;
export const defaultClock: ClockFn = () => new Date();

export const DEFAULT_SENT_RETENTION_DAYS = 30;
export const DEFAULT_DEAD_RETENTION_DAYS = 90;
export const DEFAULT_SUPPRESSED_RETENTION_DAYS = 30;
export const DEFAULT_INBOX_RETENTION_DAYS = 60;
export const DEFAULT_BATCH_SIZE = 500;
export const DEFAULT_MAX_BATCHES = 100;

export interface RetentionPolicyOptions {
  sentRetentionDays?: number;
  deadRetentionDays?: number;
  suppressedRetentionDays?: number;
  inboxRetentionDays?: number;
  batchSize?: number;
  maxBatches?: number;
  clock?: ClockFn;
}

export interface PruningStatusBreakdown {
  sent: number;
  dead: number;
  suppressed: number;
  inbox: number;
}

export interface PruningExecutionResult {
  totalDeleted: number;
  batchesProcessed: number;
  statusBreakdown: PruningStatusBreakdown;
  executionDurationMs: number;
}

/**
 * Calculates cutoff Date for a given number of retention days relative to clock.
 */
export function calculateRetentionCutoff(days: number, clock: ClockFn = defaultClock): Date {
  const now = clock();
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

/**
 * Executes bounded batch deletion of expired terminal notification records and consumed inbox messages.
 * Invariants enforced:
 * - Terminal State Guard: Only records with status IN ('SENT', 'DEAD', 'SUPPRESSED') are eligible.
 *   PENDING and PROCESSING records are NEVER matched or deleted regardless of age.
 * - Bounded Batching: Deletes in bounded chunks (default 500) within discrete transactions to prevent WAL bloat.
 * - Fail-Closed (Decision #55): DB connection or transaction errors abort execution and throw RETENTION_PRUNING_FAILED.
 * - Clock Injection: Accepts ClockFn for deterministic time-horizon testing.
 */
export async function runRetentionPruning(options: RetentionPolicyOptions = {}): Promise<PruningExecutionResult> {
  const startTime = Date.now();
  const clock = options.clock || defaultClock;
  const sentDays = options.sentRetentionDays ?? DEFAULT_SENT_RETENTION_DAYS;
  const deadDays = options.deadRetentionDays ?? DEFAULT_DEAD_RETENTION_DAYS;
  const suppressedDays = options.suppressedRetentionDays ?? DEFAULT_SUPPRESSED_RETENTION_DAYS;
  const inboxDays = options.inboxRetentionDays ?? DEFAULT_INBOX_RETENTION_DAYS;
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const maxBatches = options.maxBatches ?? DEFAULT_MAX_BATCHES;

  const sentCutoff = calculateRetentionCutoff(sentDays, clock);
  const deadCutoff = calculateRetentionCutoff(deadDays, clock);
  const suppressedCutoff = calculateRetentionCutoff(suppressedDays, clock);
  const inboxCutoff = calculateRetentionCutoff(inboxDays, clock);

  const statusBreakdown: PruningStatusBreakdown = {
    sent: 0,
    dead: 0,
    suppressed: 0,
    inbox: 0,
  };

  let totalDeleted = 0;
  let batchesProcessed = 0;

  try {
    // 1. Prune expired SENT records in bounded batches
    batchesProcessed += await pruneOutboxStatusBatch({
      status: OutboxStatus.SENT,
      cutoff: sentCutoff,
      batchSize,
      maxBatches: maxBatches - batchesProcessed,
      onBatchDeleted: (count) => {
        statusBreakdown.sent += count;
        totalDeleted += count;
      },
    });

    // 2. Prune expired DEAD (DLQ) records in bounded batches
    if (batchesProcessed < maxBatches) {
      batchesProcessed += await pruneOutboxStatusBatch({
        status: OutboxStatus.DEAD,
        cutoff: deadCutoff,
        batchSize,
        maxBatches: maxBatches - batchesProcessed,
        onBatchDeleted: (count) => {
          statusBreakdown.dead += count;
          totalDeleted += count;
        },
      });
    }

    // 3. Prune expired SUPPRESSED records in bounded batches
    if (batchesProcessed < maxBatches) {
      batchesProcessed += await pruneOutboxStatusBatch({
        status: OutboxStatus.SUPPRESSED,
        cutoff: suppressedCutoff,
        batchSize,
        maxBatches: maxBatches - batchesProcessed,
        onBatchDeleted: (count) => {
          statusBreakdown.suppressed += count;
          totalDeleted += count;
        },
      });
    }

    // 4. Prune consumed INBOX messages in bounded batches
    if (batchesProcessed < maxBatches) {
      batchesProcessed += await pruneInboxBatch({
        cutoff: inboxCutoff,
        batchSize,
        maxBatches: maxBatches - batchesProcessed,
        onBatchDeleted: (count) => {
          statusBreakdown.inbox += count;
          totalDeleted += count;
        },
      });
    }

    const executionDurationMs = Date.now() - startTime;

    return {
      totalDeleted,
      batchesProcessed,
      statusBreakdown,
      executionDurationMs,
    };
  } catch (error: any) {
    // Fail closed (Decision #55): do not mask failures
    const errMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`RETENTION_PRUNING_FAILED: ${errMsg}`);
  }
}

interface OutboxBatchPruneParams {
  status: OutboxStatus;
  cutoff: Date;
  batchSize: number;
  maxBatches: number;
  onBatchDeleted: (count: number) => void;
}

/**
 * Prunes outbox events of a specific terminal status older than cutoff in sequential, bounded batches.
 */
async function pruneOutboxStatusBatch(params: OutboxBatchPruneParams): Promise<number> {
  const { status, cutoff, batchSize, maxBatches, onBatchDeleted } = params;
  let batchCount = 0;

  // Terminal state safety assertion
  if (status === OutboxStatus.PENDING || status === OutboxStatus.PROCESSING) {
    throw new Error(`CRITICAL_INVARIANT_VIOLATION: Attempted to prune non-terminal status '${status}'`);
  }

  while (batchCount < maxBatches) {
    const deletedCount = await prisma.$transaction(async (tx) => {
      // Find batch of prunable IDs
      const targetRows = await tx.outboxEvent.findMany({
        where: {
          status,
          createdAt: { lte: cutoff },
        },
        select: { id: true },
        take: batchSize,
      });

      if (targetRows.length === 0) {
        return 0;
      }

      const targetIds = targetRows.map((r) => r.id);

      // Delete exactly the claimed batch
      const result = await tx.outboxEvent.deleteMany({
        where: {
          id: { in: targetIds },
          status, // Redundant safety guard against race conditions
        },
      });

      return result.count;
    });

    if (deletedCount === 0) {
      break;
    }

    batchCount++;
    onBatchDeleted(deletedCount);

    if (deletedCount < batchSize) {
      // Exhausted all matching records
      break;
    }
  }

  return batchCount;
}

interface InboxBatchPruneParams {
  cutoff: Date;
  batchSize: number;
  maxBatches: number;
  onBatchDeleted: (count: number) => void;
}

/**
 * Prunes consumed inbox messages (readAt is not null and <= cutoff) in sequential, bounded batches.
 */
async function pruneInboxBatch(params: InboxBatchPruneParams): Promise<number> {
  const { cutoff, batchSize, maxBatches, onBatchDeleted } = params;
  let batchCount = 0;

  while (batchCount < maxBatches) {
    const deletedCount = await prisma.$transaction(async (tx) => {
      const targetRows = await tx.inboxMessage.findMany({
        where: {
          readAt: { not: null, lte: cutoff },
        },
        select: { id: true },
        take: batchSize,
      });

      if (targetRows.length === 0) {
        return 0;
      }

      const targetIds = targetRows.map((r) => r.id);

      const result = await tx.inboxMessage.deleteMany({
        where: {
          id: { in: targetIds },
          readAt: { not: null },
        },
      });

      return result.count;
    });

    if (deletedCount === 0) {
      break;
    }

    batchCount++;
    onBatchDeleted(deletedCount);

    if (deletedCount < batchSize) {
      break;
    }
  }

  return batchCount;
}

/**
 * Strictly read-only query returning queue depths, prunable counts, and oldest timestamps (Decision #54).
 */
export async function getRetentionStatus(options: RetentionPolicyOptions = {}) {
  const clock = options.clock || defaultClock;
  const sentDays = options.sentRetentionDays ?? DEFAULT_SENT_RETENTION_DAYS;
  const deadDays = options.deadRetentionDays ?? DEFAULT_DEAD_RETENTION_DAYS;
  const suppressedDays = options.suppressedRetentionDays ?? DEFAULT_SUPPRESSED_RETENTION_DAYS;
  const inboxDays = options.inboxRetentionDays ?? DEFAULT_INBOX_RETENTION_DAYS;

  const sentCutoff = calculateRetentionCutoff(sentDays, clock);
  const deadCutoff = calculateRetentionCutoff(deadDays, clock);
  const suppressedCutoff = calculateRetentionCutoff(suppressedDays, clock);
  const inboxCutoff = calculateRetentionCutoff(inboxDays, clock);

  const [
    pendingCount,
    processingCount,
    sentCount,
    failedCount,
    deadCount,
    suppressedCount,
    inboxUnreadCount,
    inboxReadCount,
    prunableSentCount,
    prunableDeadCount,
    prunableSuppressedCount,
    prunableInboxCount,
    oldestPending,
    oldestSent,
    oldestDead,
    oldestInbox,
  ] = await Promise.all([
    prisma.outboxEvent.count({ where: { status: OutboxStatus.PENDING } }),
    prisma.outboxEvent.count({ where: { status: OutboxStatus.PROCESSING } }),
    prisma.outboxEvent.count({ where: { status: OutboxStatus.SENT } }),
    prisma.outboxEvent.count({ where: { status: OutboxStatus.FAILED } }),
    prisma.outboxEvent.count({ where: { status: OutboxStatus.DEAD } }),
    prisma.outboxEvent.count({ where: { status: OutboxStatus.SUPPRESSED } }),
    prisma.inboxMessage.count({ where: { readAt: null } }),
    prisma.inboxMessage.count({ where: { readAt: { not: null } } }),
    prisma.outboxEvent.count({ where: { status: OutboxStatus.SENT, createdAt: { lte: sentCutoff } } }),
    prisma.outboxEvent.count({ where: { status: OutboxStatus.DEAD, createdAt: { lte: deadCutoff } } }),
    prisma.outboxEvent.count({ where: { status: OutboxStatus.SUPPRESSED, createdAt: { lte: suppressedCutoff } } }),
    prisma.inboxMessage.count({ where: { readAt: { not: null, lte: inboxCutoff } } }),
    prisma.outboxEvent.findFirst({ where: { status: OutboxStatus.PENDING }, orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
    prisma.outboxEvent.findFirst({ where: { status: OutboxStatus.SENT }, orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
    prisma.outboxEvent.findFirst({ where: { status: OutboxStatus.DEAD }, orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
    prisma.inboxMessage.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
  ]);

  return {
    queueDepths: {
      pending: pendingCount,
      processing: processingCount,
      sent: sentCount,
      failed: failedCount,
      dead: deadCount,
      suppressed: suppressedCount,
      inboxUnread: inboxUnreadCount,
      inboxRead: inboxReadCount,
    },
    prunableCounts: {
      sent: prunableSentCount,
      dead: prunableDeadCount,
      suppressed: prunableSuppressedCount,
      inbox: prunableInboxCount,
      total: prunableSentCount + prunableDeadCount + prunableSuppressedCount + prunableInboxCount,
    },
    oldestTimestamps: {
      oldestPending: oldestPending?.createdAt ?? null,
      oldestSent: oldestSent?.createdAt ?? null,
      oldestDead: oldestDead?.createdAt ?? null,
      oldestInbox: oldestInbox?.createdAt ?? null,
    },
    retentionWindowsDays: {
      sent: sentDays,
      dead: deadDays,
      suppressed: suppressedDays,
      inbox: inboxDays,
    },
  };
}
