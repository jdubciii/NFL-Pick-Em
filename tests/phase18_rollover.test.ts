import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { Phase18RolloverService, PoolRolloverInput } from '../src/services/phase18RolloverService';
import { SeasonArchiveManifest } from '../src/services/phase18ArchivalService';

describe('Phase 18 Milestone 18.4: Next-Season Rollover & Invariant Hardening', () => {
  const validManifest: SeasonArchiveManifest = {
    archiveId: 'arch_2026_pool_hardened_01',
    seasonYear: 2026,
    poolId: 'pool_hardened_01',
    snapshotSha256: 'a'.repeat(64),
    totalMembers: 10,
    totalPicks: 1600,
    isLocked: true,
    createdAt: new Date(),
  };

  const validRollover: PoolRolloverInput = {
    poolId: 'pool_hardened_01',
    currentSeasonYear: 2026,
    nextSeasonYear: 2027,
    archiveManifest: validManifest,
    activeMemberIds: ['usr_1', 'usr_2', 'usr_3'],
    startingEscrowBalance: new Prisma.Decimal('0.00'),
  };

  it('enforces Decision #62: Circuit breaker defaults to closed (feature disabled)', () => {
    const res = Phase18RolloverService.executeSeasonRollover(validRollover, false);
    expect(res.success).toBe(false);
    expect(res.error).toContain('CIRCUIT_BREAKER_DISABLED');
  });

  it('enforces Decision #55: Fails closed when prior season archive manifest is not locked', () => {
    const unlockedManifest: SeasonArchiveManifest = {
      ...validManifest,
      isLocked: false,
    };
    const res = Phase18RolloverService.executeSeasonRollover(
      { ...validRollover, archiveManifest: unlockedManifest },
      true
    );
    expect(res.success).toBe(false);
    expect(res.error).toContain('FAIL_CLOSED_UNARCHIVED_STATE');
  });

  it('enforces Decision #20: Rejects rollover when manifest poolId mismatches target poolId', () => {
    const res = Phase18RolloverService.executeSeasonRollover(
      { ...validRollover, poolId: 'pool_different_99' },
      true
    );
    expect(res.success).toBe(false);
    expect(res.error).toContain('POOL_MISMATCH_VIOLATION');
  });

  it('enforces Decisions #3 & #22: Initial escrow balance handles Prisma.Decimal without float drift', () => {
    const res = Phase18RolloverService.executeSeasonRollover(
      { ...validRollover, startingEscrowBalance: new Prisma.Decimal('50.00') },
      true
    );
    expect(res.success).toBe(true);
    expect(Prisma.Decimal.isDecimal(res.initialEscrowPerMember)).toBe(true);
    expect(res.initialEscrowPerMember?.toFixed(2)).toBe('50.00');
    expect(res.retainedMembersCount).toBe(3);
    expect(res.nextSeasonYear).toBe(2027);
  });
});
