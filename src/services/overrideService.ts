import { Prisma } from '@prisma/client';
import prisma from '../db/client';

export type OverrideType = 'PICK' | 'PENALTY' | 'CUSTOM';

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
 * Commissioner Override & Proposal Service (Milestone 12.2)
 *
 * Invariants:
 * - Decision #20: Authority is scoped strictly by pools.admin_id; no global admin bypass on pool routes.
 * - Decision #54: Mutations occur strictly within write (POST/PUT) methods, never on GET.
 * - Serializable transaction execution to prevent race conditions during concurrent pick resolutions.
 */

/**
 * Creates an override proposal within the specified pool.
 */
export async function createOverrideProposal(
  input: OverrideProposalInput,
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

  const auditLog = await db.auditLog.create({
    data: {
      actorId: commissionerId,
      action: 'COMMISSIONER_PROPOSAL_CREATED',
      targetEntityId,
      newValue: {
        poolId,
        type,
        data,
        reason,
        status: 'PROPOSED',
        createdAt: new Date().toISOString(),
      },
    },
  });

  return auditLog as unknown as ProposalRecord;
}

/**
 * Applies a commissioner override inside a serializable transaction.
 */
export async function applyOverride(
  input: OverrideProposalInput,
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
      } else if (type === 'PENALTY') {
        const userId = data.userId || targetEntityId;
        const delta = new Prisma.Decimal(data.delta?.toString() || '1');
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
          },
        });

        // Recalculate member total shots
        const ledgerSum = await tx.penaltyLedger.aggregate({
          where: { poolId, userId },
          _sum: { delta: true },
        });

        await tx.poolMemberStat.upsert({
          where: { poolId_userId: { poolId, userId } },
          update: { totalShotsDrank: ledgerSum._sum.delta ?? new Prisma.Decimal(0) },
          create: { poolId, userId, totalShotsDrank: ledgerSum._sum.delta ?? new Prisma.Decimal(0) },
        });
      } else {
        result = { customData: data, appliedAt: new Date().toISOString() };
      }

      const auditLog = await tx.auditLog.create({
        data: {
          actorId: commissionerId,
          action: actionName,
          targetEntityId: result?.id || targetEntityId,
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
 * Lists proposals and override audit history for a pool.
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
          'COMMISSIONER_OVERRIDE_PICK',
          'COMMISSIONER_OVERRIDE_PENALTY',
          'ADMIN_OVERRIDE_PICK',
        ],
      },
    },
    orderBy: { timestamp: 'desc' },
    take: 50,
  });

  // Filter in-memory for audit logs that target this poolId in newValue
  const poolLogs = auditLogs.filter((log) => {
    if (log.newValue && typeof log.newValue === 'object') {
      return (log.newValue as any).poolId === poolId;
    }
    return false;
  });

  return poolLogs as unknown as ProposalRecord[];
}
