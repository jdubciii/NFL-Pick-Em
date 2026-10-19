export interface PickVisibilityContext {
  viewerMembershipId: string;
  targetMembershipId: string;
  viewerPoolId?: string;
  targetPoolId?: string;
  viewerMembershipStatus?: string;
  isSamePoolActiveMember?: boolean;
  isGameLocked?: boolean;
  hidePicksUntilKickoff?: boolean;
}

export class PickVisibilityService {
  // Decision #20 tenant boundary & P41-POOL-VISIBILITY-2026-10-19-08 immediate pool visibility
  static canViewPick(ctx: PickVisibilityContext): boolean {
    if (!ctx.viewerMembershipId || !ctx.targetMembershipId) {
      return false;
    }

    // Explicit trusted same-pool ACTIVE authorization context is mandatory (Decisions #20, #55, -08 directive)
    // Deny absent, false, inactive, or cross-pool mismatched context.
    if (ctx.isSamePoolActiveMember === false) {
      return false;
    }
    if (ctx.viewerMembershipStatus && ctx.viewerMembershipStatus !== 'ACTIVE') {
      return false;
    }
    if (ctx.viewerPoolId && ctx.targetPoolId && ctx.viewerPoolId !== ctx.targetPoolId) {
      return false;
    }

    // Require positive trusted proof: either explicit isSamePoolActiveMember === true,
    // or verified matching pool IDs with ACTIVE viewer membership status.
    const hasTrustedActiveSamePoolContext =
      ctx.isSamePoolActiveMember === true ||
      Boolean(
        ctx.viewerPoolId &&
        ctx.targetPoolId &&
        ctx.viewerPoolId === ctx.targetPoolId &&
        ctx.viewerMembershipStatus === 'ACTIVE'
      );

    if (!hasTrustedActiveSamePoolContext) {
      // Absent or unverified authorization context fails closed (Decision #55)
      return false;
    }

    // Under P41-POOL-VISIBILITY-2026-10-19-08: All saved picks are immediately visible
    // to verified ACTIVE members of the same pool (regardless of kickoff or legacy hide settings).
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
