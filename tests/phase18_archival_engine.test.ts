import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  Phase18HistoricalArchivalEngine,
  PoolSeasonArchivePayload,
} from '../src/services/phase18HistoricalArchivalEngine';

describe('Phase 18 Milestone 18.3: Historical Archival Engine & Invariant Suite', () => {
  const validPayload: PoolSeasonArchivePayload = {
    seasonYear: 2026,
    poolId: 'pool_historical_omega',
    totalMembers: 3,
    totalPicks: 480,
    ledgerBalanceSum: new Prisma.Decimal('1500.00'),
    finalRankings: [
      { userId: 'usr_1', rank: 1, score: new Prisma.Decimal('165.50') },
      { userId: 'usr_2', rank: 2, score: new Prisma.Decimal('152.00') },
      { userId: 'usr_3', rank: 3, score: new Prisma.Decimal('141.25') },
    ],
  };

  it('enforces Decision #62: Circuit breaker defaults to closed (feature disabled)', () => {
    const res = Phase18HistoricalArchivalEngine.createSeasonSnapshot(validPayload, false);
    expect(res.success).toBe(false);
    expect(res.error).toContain('CIRCUIT_BREAKER_DISABLED');
  });

  it('enforces Decision #55: Fails closed when ranking records mismatch totalMembers count', () => {
    const corruptPayload: PoolSeasonArchivePayload = {
      ...validPayload,
      totalMembers: 4, // 4 members declared, but only 3 ranking items present
    };

    const res = Phase18HistoricalArchivalEngine.createSeasonSnapshot(corruptPayload, true);
    expect(res.success).toBe(false);
    expect(res.error).toContain('FAIL_CLOSED_CORRUPTION');
  });

  it('generates immutable locked archive manifest with deterministic SHA-256 hash', () => {
    const res = Phase18HistoricalArchivalEngine.createSeasonSnapshot(validPayload, true);
    expect(res.success).toBe(true);
    expect(res.manifest?.isLocked).toBe(true);
    expect(res.manifest?.snapshotSha256).toBeDefined();
    expect(res.manifest?.snapshotSha256.length).toBe(64);
    expect(res.manifest?.archiveId).toBe('arch_2026_pool_historical_omega');
  });

  it('enforces Decision #20: Pool isolation preserved in manifest output', () => {
    const res = Phase18HistoricalArchivalEngine.createSeasonSnapshot(validPayload, true);
    expect(res.success).toBe(true);
    expect(res.manifest?.poolId).toBe('pool_historical_omega');
  });

  it('verifies snapshot integrity and detects payload tampering', () => {
    const res = Phase18HistoricalArchivalEngine.createSeasonSnapshot(validPayload, true);
    expect(res.success).toBe(true);

    const serialized = res.serializedPayload!;
    const hash = res.manifest!.snapshotSha256;

    const isValid = Phase18HistoricalArchivalEngine.verifySnapshotIntegrity(serialized, hash);
    expect(isValid).toBe(true);

    const tampered = serialized.replace('pool_historical_omega', 'pool_tampered');
    const isTamperedValid = Phase18HistoricalArchivalEngine.verifySnapshotIntegrity(tampered, hash);
    expect(isTamperedValid).toBe(false);
  });
});
