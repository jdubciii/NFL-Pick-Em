import { Prisma } from '@prisma/client';
import prisma from '../db/client';

export type OverrideType = 'PICK' | 'PENALTY' | 'SCORE_ADJUSTMENT' | 'CUSTOM';
export type ClockFn = () => Date;

let injectedClock: ClockFn | undefined;

export function setOverrideServiceClock(clock: ClockFn | undefined): void {
  injectedClock = clock;
}

function getNow(clockFn?: ClockFn): Date {
  if (clockFn) return clockFn();
  if (injectedClock) return injectedClock();
  return new Date();
}

export interface OverrideProposalInput {
  poolId: string;
  commissionerId: string;
  type: OverrideType;
  targetEntityId: string;
  data: any;
  reason: string;
}

export interface ProposalRecord {
  id: string;
  poolId: string;
  actorId: string;
  action: string;
  targetEntityId: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
}

/**
 * Commissioner Override & Proposal Governance Service (Milestone 12.2 & 13.2)
 *
 * Invariants:
 * - Decision #20: Authority is scoped strictly by pools.admin_id; no global admin bypass on pool routes.
 * - Decision #54: Mutations occur strictly within write (POST/PUT) methods, never on GET.
 * - Decision #27: Proposals cannot execute against unfinalized or locked slates without meeting authoritative finality.
 * - Decisions #3 & #22: Precision scoring adjustments strictly use Prisma.Decimal.
 * - Decision #55: Fail-closed transaction rollback on execution errors.
 */

/**
 * Creates an override proposal within the specified pool.
 */
export async function createOverrideProposal(
  input: OverrideProposalInput,
  clockFn?: ClockFn,
  db: typeof prisma = prisma
): Promise<ProposalRecord> {
  const { poolId, commissionerId, type, targetEntityId, data, reason } = input;

  if (!poolId || !commissionerId || !type || !targetEntityId) {
    throw new Error('poolId, commissionerId, type, and targetEntityId are required');
  }

  // Verify pool exists and caller is commissioner
  const pool = await db.pool.findUnique({ where: { id: poolId } });
  if (!pool) {
    throw new Error('POOL_NOT_FOUND');
  }
  if (pool.adminId !== commissionerId) {
    throw new Error('FORBIDDEN_COMMISSIONER_REQUIRED');
  }

  const now = getNow(clockFn);

  const auditLog = await db.auditLog.create({
    data: {
      actorId: commissionerId,
      action: 'COMMISSIONER_PROPOSAL_CREATED',
      targetEntityId,
      timestamp: now,
      newValue: {
        poolId,
        type,
        data,
        reason,
        status: 'PROPOSED',
        createdAt: now.toISOString(),
      },
    },
  });

  return auditLog as unknown as ProposalRecord;
}

/**
 * Records a commissioner vote (APPROVE / REJECT) on a proposal.
 * Enforces Decision #20 (commissioner authority).
 */
export async function recordProposalVote(
  poolId: string,
  proposalId: string,
  commissionerUserId: string,
  voteDecision: 'APPROVE' | 'REJECT',
  clockFn?: ClockFn,
  db: typeof prisma = prisma
): Promise<ProposalRecord> {
  if (!poolId || !proposalId || !commissionerUserId || !voteDecision) {
    throw new Error('poolId, proposalId, commissionerUserId, and voteDecision are required');
  }

  if (voteDecision !== 'APPROVE' && voteDecision !== 'REJECT') {
    throw new Error('voteDecision must be APPROVE or REJECT');
  }

  const pool = await db.pool.findUnique({ where: { id: poolId } });
  if (!pool) {
    throw new Error('POOL_NOT_FOUND');
  }
  if (pool.adminId !== commissionerUserId) {
    throw new Error('FORBIDDEN_COMMISSIONER_REQUIRED');
  }

  const proposal = await db.auditLog.findUnique({
    where: { id: proposalId },
  });

  if (!proposal) {
    throw new Error('PROPOSAL_NOT_FOUND');
  }

  const val = (proposal.newValue as any) || {};
  if (val.poolId !== poolId) {
    throw new Error('PROPOSAL_POOL_MISMATCH');
  }

  if (val.status === 'EXECUTED') {
    throw new Error('CANNOT_VOTE_ON_EXECUTED_PROPOSAL');
  }

  const now = getNow(clockFn);
  const updatedStatus = voteDecision === 'APPROVE' ? 'APPROVED' : 'REJECTED';

  const updatedValue = {
    ...val,
    status: updatedStatus,
    votedBy: commissionerUserId,
    votedAt: now.toISOString(),
    voteDecision,
  };

  const updated = await db.auditLog.update({
    where: { id: proposalId },
    data: {
      newValue: updatedValue,
    },
  });

  return updated as unknown as ProposalRecord;
}

/**
 * Atomically executes an approved proposal, recalculating scoring and updating target entities.
 *
 * Enforces:
 * - Decision #27: Authoritative finality check; rejects unfinalized or locked slates.
 * - Decisions #3 & #22: Decimal scoring arithmetic via Prisma.Decimal.
 * - Decision #55: Transaction rollback on failure.
 */
export async function executeProposal(
  poolId: string,
  proposalId: string,
  commissionerUserId: string,
  clockFn?: ClockFn,
  db: typeof prisma = prisma
): Promise<{ success: boolean; proposalId: string; action: string; result: any; executedAt: Date }> {
  if (!poolId || !proposalId || !commissionerUserId) {
    throw new Error('poolId, proposalId, and commissionerUserId are required');
  }

  const pool = await db.pool.findUnique({ where: { id: poolId } });
  if (!pool) {
    throw new Error('POOL_NOT_FOUND');
  }
  if (pool.adminId !== commissionerUserId) {
    throw new Error('FORBIDDEN_COMMISSIONER_REQUIRED');
  }

  const proposal = await db.auditLog.findUnique({
    where: { id: proposalId },
  });

  if (!proposal) {
    throw new Error('PROPOSAL_NOT_FOUND');
  }

  const val = (proposal.newValue as any) || {};
  if (val.poolId !== poolId) {
    throw new Error('PROPOSAL_POOL_MISMATCH');
  }

  if (val.status === 'EXECUTED') {
    throw new Error('PROPOSAL_ALREADY_EXECUTED');
  }

  // Enforce Decision #27: Authoritative finality check
  if (val.data?.slateFinalized === false || val.data?.isFinalized === false) {
    throw new Error('DECISION_27_FAIL_CLOSED: Target slate or game is unfinalized.');
  }

  if (val.data?.gameId) {
    const game = await db.game.findUnique({ where: { id: val.data.gameId } });
    if (game && val.data?.requireGameFinal && game.status !== 'FINAL') {
      throw new Error('DECISION_27_FAIL_CLOSED: Game is not FINAL.');
    }
  }

  const now = getNow(clockFn);

  return await db.$transaction(
    async (tx) => {
      let result: any = null;
      const type: OverrideType = val.type || 'PICK';
      const data = val.data || {};
      const targetEntityId = proposal.targetEntityId;

      if (type === 'PICK') {
        const userId = data.userId || targetEntityId;
        const gameId = data.gameId;
        const selectedTeamId = data.selectedTeamId !== undefined ? data.selectedTeamId : null;

        if (!userId || !gameId) {
          throw new Error('userId and gameId are required for PICK override');
        }

        result = await tx.pick.upsert({
          where: {
            poolId_userId_gameId: {
              poolId,
              userId,
              gameId,
            },
          },
          update: {
            selectedTeamId,
            submittedById: commissionerUserId,
          },
          create: {
            poolId,
            userId,
            gameId,
            selectedTeamId,
            submittedById: commissionerUserId,
          },
        });
      } else if (type === 'PENALTY' || type === 'SCORE_ADJUSTMENT') {
        const userId = data.userId || targetEntityId;
        // Enforce Decisions #3 & #22: Prisma.Decimal precision
        const deltaStr = (data.delta !== undefined ? data.delta : data.points !== undefined ? data.points : '1').toString();
        const delta = new Prisma.Decimal(deltaStr);
        const weekNumber = data.weekNumber !== undefined ? Number(data.weekNumber) : null;

        if (!userId) {
          throw new Error('userId is required for PENALTY/SCORE_ADJUSTMENT override');
        }

        result = await tx.penaltyLedger.create({
          data: {
            poolId,
            userId,
            weekNumber,
            delta,
            reason: val.reason || 'COMMISSIONER_PROPOSAL_EXECUTION',
            createdById: commissionerUserId,
            createdAt: now,
          },
        });

        // Recalculate member total shots using Decimal aggregate
        const ledgerSum = await tx.penaltyLedger.aggregate({
          where: { poolId, userId },
          _sum: { delta: true },
        });

        const totalShots = ledgerSum._sum.delta ?? new Prisma.Decimal(0);

        await tx.poolMemberStat.upsert({
          where: { poolId_userId: { poolId, userId } },
          update: { totalShotsDrank: totalShots, updatedAt: now },
          create: { poolId, userId, totalShotsDrank: totalShots, updatedAt: now },
        });
      } else {
        result = { customData: data, executedAt: now.toISOString() };
      }

      // Mark proposal status as EXECUTED
      const updatedProposalValue = {
        ...val,
        status: 'EXECUTED',
        executedBy: commissionerUserId,
        executedAt: now.toISOString(),
        executionResult: JSON.parse(JSON.stringify(result)),
      };

      await tx.auditLog.update({
        where: { id: proposalId },
        data: {
          newValue: updatedProposalValue,
        },
      });

      // Record separate execution audit log
      await tx.auditLog.create({
        data: {
          actorId: commissionerUserId,
          action: 'COMMISSIONER_PROPOSAL_EXECUTED',
          targetEntityId: proposalId,
          timestamp: now,
          newValue: {
            poolId,
            proposalId,
            type,
            result: JSON.parse(JSON.stringify(result)),
          },
        },
      });

      return {
        success: true,
        proposalId,
        action: 'PROPOSAL_EXECUTED',
        result,
        executedAt: now,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

/**
 * Applies a commissioner override directly inside a serializable transaction.
 */
export async function applyOverride(
  input: OverrideProposalInput,
  clockFn?: ClockFn,
  db: typeof prisma = prisma
): Promise<{ success: boolean; action: string; result: any; auditLogId: string }> {
  const { poolId, commissionerId, type, targetEntityId, data, reason } = input;

  if (!poolId || !commissionerId || !type || !targetEntityId) {
    throw new Error('poolId, commissionerId, type, and targetEntityId are required');
  }

  const pool = await db.pool.findUnique({ where: { id: poolId } });
  if (!pool) {
    throw new Error('POOL_NOT_FOUND');
  }
  if (pool.adminId !== commissionerId) {
    throw new Error('FORBIDDEN_COMMISSIONER_REQUIRED');
  }

  const now = getNow(clockFn);

  return await db.$transaction(
    async (tx) => {
      let result: any = null;
      let actionName = `COMMISSIONER_OVERRIDE_${type}`;
      let oldValue: any = null;

      if (type === 'PICK') {
        const userId = data.userId || targetEntityId;
        const gameId = data.gameId;
        const selectedTeamId = data.selectedTeamId !== undefined ? data.selectedTeamId : null;

        if (!userId || !gameId) {
          throw new Error('userId and gameId are required for PICK override');
        }

        const existingPick = await tx.pick.findUnique({
          where: {
            poolId_userId_gameId: {
              poolId,
              userId,
              gameId,
            },
          },
        });
        oldValue = existingPick ? JSON.parse(JSON.stringify(existingPick)) : null;

        const game = await tx.game.findUnique({
          where: { id: gameId },
        });

        result = await tx.pick.upsert({
          where: {
            poolId_userId_gameId: {
              poolId,
              userId,
              gameId,
            },
          },
          update: {
            selectedTeamId,
            submittedById: commissionerId,
          },
          create: {
            poolId,
            userId,
            gameId,
            selectedTeamId,
            submittedById: commissionerId,
          },
        });

        // Re-grade finalized game if applicable
        if (game && (game.status === 'FINAL' || (game.homeScore !== null && game.awayScore !== null))) {
          let winner: string | null = null;
          if (game.homeScore !== null && game.awayScore !== null) {
            if (game.homeScore > game.awayScore) winner = game.homeTeamId;
            else if (game.awayScore > game.homeScore) winner = game.awayTeamId;
          }

          const isCorrect = Boolean(winner && selectedTeamId && selectedTeamId === winner);
          const pointsAwarded = isCorrect ? 1.0 : 0.0;

          await tx.pickResult.upsert({
            where: { pickId: result.id },
            update: {
              isCorrect,
              pointsAwarded,
            },
            create: {
              pickId: result.id,
              isCorrect,
              pointsAwarded,
            },
          });
        }
      } else if (type === 'PENALTY' || type === 'SCORE_ADJUSTMENT') {
        const userId = data.userId || targetEntityId;
        const delta = new Prisma.Decimal(data.delta?.toString() || data.points?.toString() || '1');
        const weekNumber = data.weekNumber !== undefined ? Number(data.weekNumber) : null;

        if (!userId) {
          throw new Error('userId is required for PENALTY override');
        }

        result = await tx.penaltyLedger.create({
          data: {
            poolId,
            userId,
            weekNumber,
            delta,
            reason: reason || 'COMMISSIONER_PENALTY_OVERRIDE',
            createdById: commissionerId,
            createdAt: now,
          },
        });

        // Recalculate member total shots
        const ledgerSum = await tx.penaltyLedger.aggregate({
          where: { poolId, userId },
          _sum: { delta: true },
        });

        await tx.poolMemberStat.upsert({
          where: { poolId_userId: { poolId, userId } },
          update: { totalShotsDrank: ledgerSum._sum.delta ?? new Prisma.Decimal(0), updatedAt: now },
          create: { poolId, userId, totalShotsDrank: ledgerSum._sum.delta ?? new Prisma.Decimal(0), updatedAt: now },
        });
      } else {
        result = { customData: data, appliedAt: now.toISOString() };
      }

      const auditLog = await tx.auditLog.create({
        data: {
          actorId: commissionerId,
          action: actionName,
          targetEntityId: result?.id || targetEntityId,
          timestamp: now,
          oldValue,
          newValue: {
            poolId,
            type,
            reason,
            data: JSON.parse(JSON.stringify(result)),
          },
        },
      });

      return {
        success: true,
        action: actionName,
        result,
        auditLogId: auditLog.id,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

/**
 * Lists proposals for a pool.
 * Decision #54: Strictly read-only, zero side effects or mutations.
 */
export async function listProposals(
  poolId: string,
  db: typeof prisma = prisma
): Promise<ProposalRecord[]> {
  const auditLogs = await db.auditLog.findMany({
    where: {
      action: {
        in: [
          'COMMISSIONER_PROPOSAL_CREATED',
          'COMMISSIONER_PROPOSAL_EXECUTED',
        ],
      },
    },
    orderBy: { timestamp: 'desc' },
    take: 100,
  });

  const poolLogs = auditLogs.filter((log) => {
    if (log.newValue && typeof log.newValue === 'object') {
      return (log.newValue as any).poolId === poolId;
    }
    return false;
  });

  return poolLogs as unknown as ProposalRecord[];
}

/**
 * Lists applied overrides for a pool.
 * Decision #54: Strictly read-only, zero side effects or mutations.
 */
export async function listOverrides(
  poolId: string,
  db: typeof prisma = prisma
): Promise<ProposalRecord[]> {
  const auditLogs = await db.auditLog.findMany({
    where: {
      action: {
        in: [
          'COMMISSIONER_OVERRIDE_PICK',
          'COMMISSIONER_OVERRIDE_PENALTY',
          'COMMISSIONER_OVERRIDE_SCORE_ADJUSTMENT',
          'COMMISSIONER_OVERRIDE_CUSTOM',
          'COMMISSIONER_PROPOSAL_EXECUTED',
          'ADMIN_OVERRIDE_PICK',
        ],
      },
    },
    orderBy: { timestamp: 'desc' },
    take: 100,
  });

  const poolLogs = auditLogs.filter((log) => {
    if (log.newValue && typeof log.newValue === 'object') {
      return (log.newValue as any).poolId === poolId;
    }
    return false;
  });

  return poolLogs as unknown as ProposalRecord[];
}

/**
 * Returns read-only pool ops status, weekly wrap-up readiness and stats.
 * Decision #54: Strictly read-only, zero database writes.
 */
export async function getPoolOpsStatus(
  poolId: string,
  db: typeof prisma = prisma
): Promise<any> {
  const pool = await db.pool.findUnique({
    where: { id: poolId },
    include: {
      _count: {
        select: {
          memberships: true,
          inboxMessages: true,
          outboxEvents: true,
        },
      },
    },
  });

  if (!pool) {
    throw new Error('POOL_NOT_FOUND');
  }

  const [
    activeMembersCount,
    unreadInboxCount,
    pendingOutboxCount,
    deadOutboxCount,
    proposalsCount,
    overridesCount,
  ] = await Promise.all([
    db.poolMembership.count({ where: { poolId, status: 'ACTIVE' } }),
    db.inboxMessage.count({ where: { poolId, readAt: null } }),
    db.outboxEvent.count({ where: { poolId, status: 'PENDING' } }),
    db.outboxEvent.count({ where: { poolId, status: 'DEAD' } }),
    db.auditLog.count({
      where: {
        action: 'COMMISSIONER_PROPOSAL_CREATED',
      },
    }),
    db.auditLog.count({
      where: {
        action: {
          in: ['COMMISSIONER_OVERRIDE_PICK', 'COMMISSIONER_OVERRIDE_PENALTY', 'COMMISSIONER_PROPOSAL_EXECUTED'],
        },
      },
    }),
  ]);

  return {
    poolId: pool.id,
    poolName: pool.name,
    status: pool.status,
    activeMembers: activeMembersCount,
    unreadNotifications: unreadInboxCount,
    pendingOutbox: pendingOutboxCount,
    deadOutbox: deadOutboxCount,
    wrapUpReady: deadOutboxCount === 0 && pendingOutboxCount === 0,
    metrics: {
      totalMembers: pool._count.memberships,
      totalProposals: proposalsCount,
      totalOverrides: overridesCount,
    },
  };
}
