/**
 * Authoritative Open Slate Policy Service
 * Decision #20 Tenant Boundary & Decision #66 Lock Supremacy
 */
export interface SlateVisibilityParams {
  userPoolId: string;
  targetPoolId: string;
  isDraft: boolean;
  hidePicksUntilKickoff?: boolean;
  gameLocked?: boolean;
}

export function evaluatePickVisibility(params: SlateVisibilityParams): boolean {
  if (!params.userPoolId || !params.targetPoolId || params.userPoolId !== params.targetPoolId) {
    return false; // Strict tenant isolation (Decision #20)
  }
  if (params.isDraft) return false; // Never reveal unsubmitted drafts
  if (params.hidePicksUntilKickoff && !params.gameLocked) return false;
  return true;
}
