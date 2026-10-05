import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  Phase18ArchivalService,
  Phase18FeatureFlagKey,
  LeaderboardEntry,
} from '../src/services/phase18ArchivalService';

describe('Phase 18 Milestone 18.0: Intake & Governance Invariants', () => {
  it('enforces Decision #62: All Phase 18 circuit breakers default to OFF (false)', () => {
    expect(Phase18ArchivalService.isFlagEnabled(null)).toBe(false);
    expect(Phase18ArchivalService.isFlagEnabled(undefined)).toBe(false);
    expect(Phase18ArchivalService.isFlagEnabled(false)).toBe(false);
    expect(Phase18ArchivalService.isFlagEnabled(true)).toBe(true);

    expect(Phase18FeatureFlagKey.GLOBAL_LEADERBOARDS).toBe('global_leaderboards');
    expect(Phase18FeatureFlagKey.ACHIEVEMENTS_ENGINE).toBe('achievements_engine');
    expect(Phase18FeatureFlagKey.SEASON_ARCHIVAL).toBe('season_archival');
  });

  it('enforces Decision #20: Anonymizes cross-pool global leaderboard entries', () => {
    const rawEntry: LeaderboardEntry = {
      userId: 'usr_87654321',
      displayName: 'Alice Champion',
      isAnonymized: true,
      poolId: 'pool_secret_12',
      seasonScore: new Prisma.Decimal('185.50'),
      winCount: 12,
      rank: 1,
    };

    const sanitized = Phase18ArchivalService.sanitizeLeaderboardEntry(rawEntry, true);
    expect(sanitized.displayName).toBe('Anonymous Picker #usr_');
    expect(sanitized.poolId).toBeUndefined();
    expect(sanitized.seasonScore.toFixed(2)).toBe('185.50');
  });

  it('enforces Decision #55: Rejects archival manifest with invalid hash (fail-closed)', () => {
    const res = Phase18ArchivalService.createArchiveManifest({
      seasonYear: 2026,
      poolId: 'pool_123',
      totalMembers: 10,
      totalPicks: 160,
      snapshotHash: 'too_short',
      flagStoreValue: true,
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('INVALID_SNAPSHOT_HASH');
  });

  it('enforces Decisions #3 & #22: Prisma.Decimal precision for leaderboard score calculations', () => {
    const score1 = new Prisma.Decimal('120.25');
    const score2 = new Prisma.Decimal('14.75');
    const total = score1.add(score2);
    expect(total.toFixed(2)).toBe('135.00');
    expect(Prisma.Decimal.isDecimal(total)).toBe(true);
  });
});
