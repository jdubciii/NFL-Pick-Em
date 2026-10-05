import { Prisma } from '@prisma/client';
import { AchievementBadge } from './phase18ArchivalService';

export type AchievementType =
  | 'PERFECT_SLATE'
  | 'IRON_COMMISSIONER'
  | 'COMEBACK_KING'
  | 'UNDERDOG_HERO'
  | 'PENALTY_FREE_SEASON';

export interface MemberSeasonStatsInput {
  userId: string;
  poolId: string;
  membershipId: string;
  hasPerfectSlate: boolean;
  isCommissioner: boolean;
  comebackPoints: Prisma.Decimal;
  underdogWins: number;
  unpaidPenaltiesCount: number;
}

export class Phase18AchievementsService {
  private static readonly CIRCUIT_BREAKER_KEY = 'achievements_engine';
  private static readonly COMEBACK_THRESHOLD = new Prisma.Decimal('20.00');
  private static readonly UNDERDOG_MIN_WINS = 5;

  public static isFeatureEnabled(flagStoreValue: boolean | null | undefined): boolean {
    return flagStoreValue === true;
  }

  /**
   * Evaluates and deterministically awards season-long achievement badges.
   * Enforces Decision #62 (Circuit Breaker), Decision #20 (Pool Isolation),
   * Decision #54 (Read-Only Evaluation), and Decisions #3 & #22 (Prisma.Decimal precision).
   */
  public static evaluateAchievements(
    stats: MemberSeasonStatsInput,
    flagStoreValue: boolean | null | undefined
  ): { success: boolean; badges?: AchievementBadge[]; error?: string } {
    if (!this.isFeatureEnabled(flagStoreValue)) {
      return { success: false, error: 'CIRCUIT_BREAKER_DISABLED: Achievements engine is disabled' };
    }

    const awarded: AchievementBadge[] = [];
    const now = new Date();

    if (stats.hasPerfectSlate) {
      awarded.push({
        id: 'ach_ps_' + stats.membershipId,
        userId: stats.userId,
        poolId: stats.poolId,
        badgeType: 'PERFECT_SLATE',
        awardedAt: now,
        metadata: { description: 'Achieved 100% accuracy on a weekly slate' },
      });
    }

    if (stats.isCommissioner) {
      awarded.push({
        id: 'ach_ic_' + stats.membershipId,
        userId: stats.userId,
        poolId: stats.poolId,
        badgeType: 'IRON_COMMISSIONER',
        awardedAt: now,
        metadata: { description: 'Governed and steered pool throughout regular season' },
      });
    }

    if (stats.comebackPoints.greaterThanOrEqualTo(this.COMEBACK_THRESHOLD)) {
      awarded.push({
        id: 'ach_ck_' + stats.membershipId,
        userId: stats.userId,
        poolId: stats.poolId,
        badgeType: 'COMEBACK_KING',
        awardedAt: now,
        metadata: { pointsRecovered: stats.comebackPoints.toString() },
      });
    }

    if (stats.underdogWins >= this.UNDERDOG_MIN_WINS) {
      awarded.push({
        id: 'ach_uh_' + stats.membershipId,
        userId: stats.userId,
        poolId: stats.poolId,
        badgeType: 'UNDERDOG_HERO',
        awardedAt: now,
        metadata: { winsAgainstSpread: stats.underdogWins },
      });
    }

    if (stats.unpaidPenaltiesCount === 0) {
      awarded.push({
        id: 'ach_pf_' + stats.membershipId,
        userId: stats.userId,
        poolId: stats.poolId,
        badgeType: 'PENALTY_FREE_SEASON',
        awardedAt: now,
        metadata: { description: 'Completed season with zero outstanding penalties' },
      });
    }

    return {
      success: true,
      badges: awarded,
    };
  }
}
