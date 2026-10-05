import { Prisma } from '@prisma/client';
import { SeasonArchiveManifest } from './phase18ArchivalService';

export interface PoolRolloverInput {
  poolId: string;
  currentSeasonYear: number;
  nextSeasonYear: number;
  archiveManifest: SeasonArchiveManifest;
  activeMemberIds: string[];
  startingEscrowBalance: Prisma.Decimal;
}

export interface PoolRolloverResult {
  success: boolean;
  poolId?: string;
  nextSeasonYear?: number;
  retainedMembersCount?: number;
  initialEscrowPerMember?: Prisma.Decimal;
  rolloverTimestamp?: Date;
  error?: string;
}

export class Phase18RolloverService {
  private static readonly CIRCUIT_BREAKER_KEY = 'season_archival';

  public static isFeatureEnabled(flagStoreValue: boolean | null | undefined): boolean {
    return flagStoreValue === true;
  }

  /**
   * Enforces Decision #55 (Fail-Closed Rollover), Decision #20 (Pool Isolation),
   * Decision #62 (Circuit Breaker), and Decisions #3 & #22 (Prisma.Decimal precision).
   * Verifies that the previous season's archive manifest is fully locked and validated
   * before allowing state transition to the next season.
   */
  public static executeSeasonRollover(
    params: PoolRolloverInput,
    flagStoreValue: boolean | null | undefined
  ): PoolRolloverResult {
    if (!this.isFeatureEnabled(flagStoreValue)) {
      return { success: false, error: 'CIRCUIT_BREAKER_DISABLED: Rollover & Archival feature is disabled' };
    }

    if (params.nextSeasonYear <= params.currentSeasonYear) {
      return {
        success: false,
        error: 'INVALID_SEASON_TRANSITION: Target season year must be strictly greater than current season',
      };
    }

    // Decision #55: Fail-closed requirement on prior season archival
    if (!params.archiveManifest || !params.archiveManifest.isLocked) {
      return {
        success: false,
        error: 'FAIL_CLOSED_UNARCHIVED_STATE: Rollover rejected because prior season archive is not locked',
      };
    }

    if (params.archiveManifest.poolId !== params.poolId) {
      return {
        success: false,
        error: 'POOL_MISMATCH_VIOLATION: Archive manifest poolId does not match rollover target',
      };
    }

    if (params.activeMemberIds.length === 0) {
      return {
        success: false,
        error: 'ZERO_ROSTER_ROLLOVER: Cannot roll over pool with zero members',
      };
    }

    if (params.startingEscrowBalance.lessThan(new Prisma.Decimal('0.00'))) {
      return {
        success: false,
        error: 'INVALID_ESCROW_BALANCE: Starting escrow cannot be negative',
      };
    }

    return {
      success: true,
      poolId: params.poolId,
      nextSeasonYear: params.nextSeasonYear,
      retainedMembersCount: params.activeMemberIds.length,
      initialEscrowPerMember: params.startingEscrowBalance,
      rolloverTimestamp: new Date(),
    };
  }
}
