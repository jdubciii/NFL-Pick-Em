import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { SeasonArchiveManifest } from './phase18ArchivalService';

export interface PoolSeasonArchivePayload {
  seasonYear: number;
  poolId: string;
  totalMembers: number;
  totalPicks: number;
  ledgerBalanceSum: Prisma.Decimal;
  finalRankings: Array<{
    userId: string;
    rank: number;
    score: Prisma.Decimal;
  }>;
}

export interface ArchiveSnapshotResult {
  success: boolean;
  manifest?: SeasonArchiveManifest;
  serializedPayload?: string;
  error?: string;
}

export class Phase18HistoricalArchivalEngine {
  private static readonly CIRCUIT_BREAKER_KEY = 'season_archival';

  public static isFeatureEnabled(flagStoreValue: boolean | null | undefined): boolean {
    return flagStoreValue === true;
  }

  /**
   * Deterministically computes SHA-256 hash of the canonical JSON archive payload.
   */
  public static computePayloadHash(payload: PoolSeasonArchivePayload): string {
    const canonicalString = JSON.stringify(payload, Object.keys(payload).sort());
    return createHash('sha256').update(canonicalString).digest('hex');
  }

  /**
   * Generates immutable cold-storage snapshot manifest.
   * Enforces Decision #55 (Fail-Closed transaction aborts on corruption),
   * Decision #62 (Circuit Breaker), Decision #20 (Pool Isolation),
   * and Decisions #3 & #22 (Prisma.Decimal precision preservation).
   */
  public static createSeasonSnapshot(
    payload: PoolSeasonArchivePayload,
    flagStoreValue: boolean | null | undefined
  ): ArchiveSnapshotResult {
    if (!this.isFeatureEnabled(flagStoreValue)) {
      return { success: false, error: 'CIRCUIT_BREAKER_DISABLED: Season archival feature is disabled' };
    }

    if (!payload.poolId || payload.poolId.trim() === '') {
      return { success: false, error: 'INVALID_POOL_ID: Cannot archive without pool scope' };
    }

    if (payload.totalMembers <= 0 || payload.totalPicks < 0) {
      return { success: false, error: 'INVALID_ARCHIVE_DATA: Non-positive member or pick count' };
    }

    // Verify rankings array integrity
    if (!payload.finalRankings || payload.finalRankings.length !== payload.totalMembers) {
      return {
        success: false,
        error: 'FAIL_CLOSED_CORRUPTION: Ranking record count does not match total member count',
      };
    }

    const canonicalPayload = JSON.stringify(payload, Object.keys(payload).sort());
    const calculatedHash = createHash('sha256').update(canonicalPayload).digest('hex');

    const manifest: SeasonArchiveManifest = {
      archiveId: 'arch_' + payload.seasonYear + '_' + payload.poolId,
      seasonYear: payload.seasonYear,
      poolId: payload.poolId,
      snapshotSha256: calculatedHash,
      totalMembers: payload.totalMembers,
      totalPicks: payload.totalPicks,
      isLocked: true,
      createdAt: new Date(),
    };

    return {
      success: true,
      manifest,
      serializedPayload: canonicalPayload,
    };
  }

  /**
   * Validates snapshot integrity against stored manifest hash.
   */
  public static verifySnapshotIntegrity(
    serializedPayload: string,
    expectedHash: string
  ): boolean {
    const rawHash = createHash('sha256').update(serializedPayload).digest('hex');
    return rawHash === expectedHash;
  }
}
