/**
 * Authoritative Fail-Closed Authorization Guard
 * Decision #55: Missing dependencies, unverified permissions, or unknown lock states fail closed
 */
export interface AuthorizationContext {
  hasPermission?: boolean;
  settingsLoaded?: boolean;
  lockKnown?: boolean;
  membershipStatus?: 'ACTIVE' | 'PENDING' | 'REJECTED' | null;
}

export function authorizeAccess(ctx: AuthorizationContext): boolean {
  if (!ctx || !ctx.settingsLoaded || !ctx.lockKnown || !ctx.hasPermission) {
    return false; // Deny by default (Decision #55)
  }
  if (ctx.membershipStatus !== 'ACTIVE') {
    return false;
  }
  return true;
}
