import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { Phase18LeaderboardService, RawMemberSeasonPerformance } from '../src/services/phase18LeaderboardService';

describe('Phase 18 Milestone 18.1: Leaderboards & Tenant Privacy Invariants', () => {
  const sampleRecords: RawMemberSeasonPerformance[] = [
    {
      userId: 'usr_alpha_1',
      poolId: 'pool_a',
      membershipId: 'mem_a1',
      displayName: 'Alice Champion',
      correctPicksCount: 140,
      totalPicksCount: 200,
      totalPoints: new Prisma.Decimal('145.50'),
      optInGlobalLeaderboard: true,
    },
    {
      userId: 'usr_beta_2',
      poolId: 'pool_a',
      membershipId: 'mem_a2',
      displayName: 'Bob Private',
      correctPicksCount: 135,
      totalPicksCount: 200,
      totalPoints: new Prisma.Decimal('138.25'),
      optInGlobalLeaderboard: false,
    },
    {
      userId: 'usr_gamma_3',
      poolId: 'pool_b',
      membershipId: 'mem_b3',
      displayName: 'Charlie Outsider',
      correctPicksCount: 150,
      totalPicksCount: 200,
      totalPoints: new Prisma.Decimal('152.00'),
      optInGlobalLeaderboard: false,
    },
  ];

  it('enforces Decision #62: Global leaderboard requests fail closed when flag is disabled or unconfigured', () => {
    const res = Phase18LeaderboardService.aggregateLeaderboard(sampleRecords, {
      isGlobal: true,
      flagStoreValue: false,
    });
    expect(res.success).toBe(false);
    expect(res.error).toContain('CIRCUIT_BREAKER_DISABLED');
  });

  it('enforces Decision #20: Pool-tier leaderboard strictly isolates to poolId and exposes full names', () => {
    const res = Phase18LeaderboardService.aggregateLeaderboard(sampleRecords, {
      poolId: 'pool_a',
      isGlobal: false,
      flagStoreValue: false, // Flag irrelevant for pool-scoped tier
    });

    expect(res.success).toBe(true);
    expect(res.leaderboard?.length).toBe(2);
    expect(res.leaderboard?.[0].displayName).toBe('Alice Champion');
    expect(res.leaderboard?.[0].poolId).toBe('pool_a');
    expect(res.leaderboard?.[1].displayName).toBe('Bob Private');
    expect(res.leaderboard?.every((r) => r.poolId === 'pool_a')).toBe(true);
  });

  it('enforces Decision #20 & Privacy: Global leaderboard anonymizes non-opted-in users and strips poolId', () => {
    const res = Phase18LeaderboardService.aggregateLeaderboard(sampleRecords, {
      isGlobal: true,
      flagStoreValue: true,
    });

    expect(res.success).toBe(true);
    expect(res.leaderboard?.length).toBe(3);

    // Rank 1: Charlie Outsider (152.00, non-opted-in)
    const rank1 = res.leaderboard?.[0];
    expect(rank1?.displayName).toBe('Anonymous Picker');
    expect(rank1?.userId).toContain('anon_usr_');
    expect(rank1?.poolId).toBeUndefined();
    expect(rank1?.seasonScore.toFixed(2)).toBe('152.00');

    // Rank 2: Alice Champion (145.50, opted-in)
    const rank2 = res.leaderboard?.[1];
    expect(rank2?.displayName).toBe('Alice Champion');
    expect(rank2?.userId).toBe('usr_alpha_1');
    expect(rank2?.poolId).toBeUndefined();
    expect(rank2?.seasonScore.toFixed(2)).toBe('145.50');
  });

  it('enforces Decisions #3 & #22: Prisma.Decimal ranking precision with zero floating-point drift', () => {
    const res = Phase18LeaderboardService.aggregateLeaderboard(sampleRecords, {
      poolId: 'pool_a',
      isGlobal: false,
      flagStoreValue: false,
    });

    expect(res.success).toBe(true);
    expect(Prisma.Decimal.isDecimal(res.leaderboard?.[0].seasonScore)).toBe(true);
    expect(res.leaderboard?.[0].seasonScore.greaterThan(res.leaderboard?.[1].seasonScore!)).toBe(true);
  });
});
