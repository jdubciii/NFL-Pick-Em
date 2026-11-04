import { Prisma } from '@prisma/client';
import prisma from '../db/client';

export interface SeasonSealOptions {
  seasonYear?: number;
  weekNumber?: number;
  poolId?: string;
  sealedBy: string;
}

export interface PoolStandingsSnapshot {
  poolId: string;
  poolName: string;
  sealedAt: string;
  members: Array<{
    userId: string;
    totalShotsDrank: string;
    firstPlaceFinishes: number;
    deadPlaceFinishes: number;
    totalPicks: number;
    totalPoints: string;
  }>;
}

export interface SeasonSealResult {
  sealed: boolean;
  seasonYear: number;
  weekNumber: number;
  sealedAt: string;
  sealedBy: string;
  snapshots: PoolStandingsSnapshot[];
  auditLogId: string;
}

/**
 * Season Seal Service (Milestone 12.2)
 *
 * Invariants:
 * - Decision #20: Operates strictly at the System Tier (invoked by system admin).
 * - Decision #54: Mutations occur strictly via POST, never on GET.
 * - Read-only snapshot invariant: Snapshots current cumulative standings immutably.
 */

/**
 * Seals the season / regular season standings across active pools.
 */
export async function sealSeason(
  options: SeasonSealOptions,
  db: typeof prisma = prisma
): Promise<SeasonSealResult> {
  const { seasonYear = 2026, weekNumber = 18, poolId, sealedBy } = options;

  if (!sealedBy) {
    throw new Error('sealedBy user ID is required');
  }

  const poolWhere: Prisma.PoolWhereInput = {
    status: 'ACTIVE',
  };
  if (poolId) {
    poolWhere.id = poolId;
  }

  const pools = await db.pool.findMany({
    where: poolWhere,
    include: {
      memberships: {
        where: { status: 'ACTIVE' },
        include: {
          stat: true,
        },
      },
    },
  });

  const sealedAt = new Date().toISOString();
  const snapshots: PoolStandingsSnapshot[] = [];

  return await db.$transaction(async (tx) => {
    // Sort pools deterministically to enforce lock order across multi-pool transactions (Ruling § Lock order)
    const sortedPools = [...pools].sort((a, b) => a.id.localeCompare(b.id));

    for (const pool of sortedPools) {
      // 1. Mandatory Pool Gate: lock pool row with FOR UPDATE before authoritative reads or writes (HAG58-SLATE-2026-11-03-01)
      if (typeof (tx as any).$queryRawUnsafe !== 'function') {
        const err: any = new Error('SHARED_POOL_GATE_UNAVAILABLE: Raw query capability unavailable for pool row lock.');
        err.code = 'SHARED_POOL_GATE_UNAVAILABLE';
        throw err;
      }

      const lockedPoolRows: any[] = await (tx as any).$queryRawUnsafe(
        `SELECT id, status FROM public.pools WHERE id = $1::uuid FOR UPDATE;`,
        pool.id
      );
      if (!lockedPoolRows || lockedPoolRows.length !== 1 || lockedPoolRows[0].status !== 'ACTIVE') {
        const err: any = new Error(`SHARED_POOL_GATE_UNAVAILABLE: Pool ${pool.id} row lock failed or pool not ACTIVE`);
        err.code = 'SHARED_POOL_GATE_UNAVAILABLE';
        throw err;
      }

      // Re-read fresh pool state within transaction boundary under acquired row lock
      const freshPool = await tx.pool.findUnique({
        where: { id: pool.id },
        select: { id: true, name: true, status: true, settings: true },
      });
      if (!freshPool || freshPool.status !== 'ACTIVE') {
        const err: any = new Error(`SHARED_POOL_GATE_UNAVAILABLE: Pool ${pool.id} not found or not ACTIVE under lock.`);
        err.code = 'SHARED_POOL_GATE_UNAVAILABLE';
        throw err;
      }

      const memberSnapshots = [];

      for (const membership of pool.memberships) {
        const userId = membership.userId;

        // Sum points awarded for this user in this pool
        const pickResults = await tx.pick.findMany({
          where: { poolId: pool.id, userId },
          include: { result: true },
        });

        let totalPoints = new Prisma.Decimal(0);
        for (const p of pickResults) {
          if (p.result?.pointsAwarded) {
            totalPoints = totalPoints.plus(p.result.pointsAwarded);
          }
        }

        memberSnapshots.push({
          userId,
          totalShotsDrank: membership.stat?.totalShotsDrank?.toString() || '0.00',
          firstPlaceFinishes: membership.stat?.firstPlaceFinishes || 0,
          deadPlaceFinishes: membership.stat?.deadPlaceFinishes || 0,
          totalPicks: pickResults.length,
          totalPoints: totalPoints.toString(),
        });
      }

      // Mark pool settings as sealed under lock using fresh settings
      const existingSettings = (freshPool.settings as any) || {};
      await tx.pool.update({
        where: { id: pool.id },
        data: {
          settings: {
            ...existingSettings,
            seasonSealed: true,
            sealedAt,
            sealSeasonYear: seasonYear,
          },
        },
      });

      snapshots.push({
        poolId: pool.id,
        poolName: pool.name,
        sealedAt,
        members: memberSnapshots,
      });
    }

    // Create immutable audit log snapshot
    const auditLog = await tx.auditLog.create({
      data: {
        actorId: sealedBy,
        action: 'SEASON_SEAL_SNAPSHOT',
        targetEntityId: poolId || 'GLOBAL',
        newValue: {
          seasonYear,
          weekNumber,
          sealedAt,
          snapshots,
        } as any,
      },
    });

    return {
      sealed: true,
      seasonYear,
      weekNumber,
      sealedAt,
      sealedBy,
      snapshots,
      auditLogId: auditLog.id,
    };
  });
}

/**
 * Retrieves the latest season seal status and snapshot.
 * Strict adherence to Decision #54 (NO WRITES ON GET).
 */
export async function getSeasonSealStatus(
  poolId?: string,
  db: typeof prisma = prisma
): Promise<{ sealed: boolean; latestSeal: any | null }> {
  const auditLog = await db.auditLog.findFirst({
    where: {
      action: 'SEASON_SEAL_SNAPSHOT',
      ...(poolId ? { targetEntityId: { in: [poolId, 'GLOBAL'] } } : {}),
    },
    orderBy: { timestamp: 'desc' },
  });

  return {
    sealed: auditLog !== null,
    latestSeal: auditLog ? auditLog.newValue : null,
  };
}
