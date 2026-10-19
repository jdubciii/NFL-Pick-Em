export interface PickVisibilityContext {
  viewerMembershipId: string;
  targetMembershipId: string;
  isGameLocked?: boolean;
  hidePicksUntilKickoff?: boolean;
}

export class PickVisibilityService {
  // Decision #20 tenant boundary & P41-POOL-VISIBILITY-2026-10-19-08 immediate pool visibility
  static canViewPick(ctx: PickVisibilityContext): boolean {
    if (!ctx.viewerMembershipId || !ctx.targetMembershipId) {
      return false;
    }

    // 1. A member can always view their own pick
    if (ctx.viewerMembershipId === ctx.targetMembershipId) {
      return true;
    }

    // 2. Under P41-POOL-VISIBILITY-2026-10-19-08: All saved picks are immediately visible to fellow pool members
    return true;
  }

  // Active cohort exposure floor (cohort >= 1 permitted; 0 represents empty state)
  static canExposeAggregate(cohortSize: number, minCohortFloor: number = 1): boolean {
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
