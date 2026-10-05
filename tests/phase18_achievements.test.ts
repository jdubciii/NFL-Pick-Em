import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { Phase18AchievementsService, MemberSeasonStatsInput } from '../src/services/phase18AchievementsService';

describe('Phase 18 Milestone 18.2: Achievements Engine & Deterministic Invariants', () => {
  const baseMember: MemberSeasonStatsInput = {
    userId: 'usr_mvp_101',
    poolId: 'pool_governed_main',
    membershipId: 'mem_mvp_101',
    hasPerfectSlate: true,
    isCommissioner: true,
    comebackPoints: new Prisma.Decimal('25.50'),
    underdogWins: 7,
    unpaidPenaltiesCount: 0,
  };

  it('enforces Decision #62: Circuit breaker defaults to closed (feature disabled)', () => {
    const res = Phase18AchievementsService.evaluateAchievements(baseMember, false);
    expect(res.success).toBe(false);
    expect(res.error).toContain('CIRCUIT_BREAKER_DISABLED');
  });

  it('deterministically awards all qualified badges under valid pool scope (Decision #20)', () => {
    const res = Phase18AchievementsService.evaluateAchievements(baseMember, true);
    expect(res.success).toBe(true);
    expect(res.badges?.length).toBe(5);

    const types = res.badges?.map((b) => b.badgeType);
    expect(types).toContain('PERFECT_SLATE');
    expect(types).toContain('IRON_COMMISSIONER');
    expect(types).toContain('COMEBACK_KING');
    expect(types).toContain('UNDERDOG_HERO');
    expect(types).toContain('PENALTY_FREE_SEASON');

    expect(res.badges?.every((b) => b.poolId === 'pool_governed_main')).toBe(true);
  });

  it('enforces Decisions #3 & #22: Comeback King requires strict Prisma.Decimal threshold (>= 20.00)', () => {
    const subThresholdMember: MemberSeasonStatsInput = {
      ...baseMember,
      comebackPoints: new Prisma.Decimal('19.99'),
    };

    const res = Phase18AchievementsService.evaluateAchievements(subThresholdMember, true);
    expect(res.success).toBe(true);
    const types = res.badges?.map((b) => b.badgeType);
    expect(types).not.toContain('COMEBACK_KING');
  });

  it('withholds PENALTY_FREE_SEASON when member has outstanding penalties', () => {
    const delinquentMember: MemberSeasonStatsInput = {
      ...baseMember,
      unpaidPenaltiesCount: 1,
    };

    const res = Phase18AchievementsService.evaluateAchievements(delinquentMember, true);
    expect(res.success).toBe(true);
    const types = res.badges?.map((b) => b.badgeType);
    expect(types).not.toContain('PENALTY_FREE_SEASON');
  });
});
