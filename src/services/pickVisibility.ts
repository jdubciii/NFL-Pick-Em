export interface PickVisibilityContext {
  viewerMembershipId: string;
  targetMembershipId: string;
  isGameLocked: boolean;
  hidePicksUntilKickoff: boolean;
}

export class PickVisibilityService {
  // Decision #66: Visibility strictly governed by per-game lock and pool policy
  static canViewPick(ctx: PickVisibilityContext): boolean {
    // 1. A member can always view their own pick
    if (ctx.viewerMembershipId === ctx.targetMembershipId) {
      return true;
    }

    // 2. If the pool does not hide picks until kickoff, competitors are visible
    if (!ctx.hidePicksUntilKickoff) {
      return true;
    }

    // 3. Under hide_picks_until_kickoff, competitor picks are visible ONLY if game is locked
    return ctx.isGameLocked;
  }

  // Anti-peeking cohort floor protection (Decision #66 / Finding 5.6)
  static canExposeAggregate(cohortSize: number, minCohortFloor: number = 3): boolean {
    return cohortSize >= minCohortFloor;
  }

  // Sanitization projection for pick objects
  static maskPickSelection<T extends { selection: string | null }>(
    pick: T,
    canView: boolean
  ): T {
    if (canView) {
      return pick;
    }
    return {
      ...pick,
      selection: null
    };
  }
}
