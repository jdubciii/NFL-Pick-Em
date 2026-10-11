import { describe, it, expect } from 'vitest';
import { resolveNavigationVisibility } from '../client/src/App';
import { 
  validateLeagueRegistration, 
  authorizeCommissionerAdjudication, 
  stepTiebreakerScore 
} from '../client/src/context/AuthContext';
import { isKickoffLocked } from '../client/src/services/lockEnforcementService';
import { evaluatePickVisibility } from '../client/src/services/openSlatePolicyService';
import { assertGetSafety } from '../client/src/services/apiSafetyGuard';
import { authorizeAccess } from '../client/src/services/authGateService';

describe('Phase 37 Authoritative Production Invariants (Ruling C5 Compliance)', () => {
  // 1. Navigation Shell Admission Boundary (Imported from App.tsx)
  it('INV-Shell: resolveNavigationVisibility strictly requires session AND status === ACTIVE', () => {
    expect(resolveNavigationVisibility(null, null)).toBe(false);
    expect(resolveNavigationVisibility(null, 'ACTIVE')).toBe(false);
    expect(resolveNavigationVisibility({ user: { id: 'u1' } }, 'PENDING')).toBe(false);
    expect(resolveNavigationVisibility({ user: { id: 'u1' } }, 'REJECTED')).toBe(false);
    expect(resolveNavigationVisibility({ user: { id: 'u1' } }, 'ACTIVE')).toBe(true);
  });

  // 2. Server-Enforced Registration (Imported from AuthContext.tsx)
  it('INV-Admission: validateLeagueRegistration routes MAIN26 exclusively to PENDING; rejects forgery', () => {
    expect(() => validateLeagueRegistration('INVALID', 'u2')).toThrow('Invalid League Invite Code');
    expect(() => validateLeagueRegistration('', 'u2')).toThrow('Invalid League Invite Code');
    
    // Negative test: Forged ACTIVE or ADMIN injection attempts
    expect(() => validateLeagueRegistration('MAIN26', 'u2', 'ADMIN', 'ACTIVE')).toThrow('HTTP 403 Forbidden');
    expect(() => validateLeagueRegistration('MAIN26', 'u2', 'USER', 'ACTIVE')).toThrow('HTTP 403 Forbidden: Forged status injection rejected');
    expect(() => validateLeagueRegistration('MAIN26', 'u2', 'ADMIN', 'PENDING')).toThrow('HTTP 403 Forbidden: Forged role injection rejected');

    const registration = validateLeagueRegistration('MAIN26', 'u2');
    expect(registration.status).toBe('PENDING');
    expect(registration.pool_id).toBe('9b893bef-3b5a-4ffa-951d-8ba27f9c9782');
  });

  // 3. Pool-Scoped Commissioner Adjudication (Imported from AuthContext.tsx - Decision #20)
  it('INV-Queue: authorizeCommissionerAdjudication enforces pool scope and ADMIN role', () => {
    const mainPoolId = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';
    const foreignPoolId = 'foreign-pool-uuid';

    // Must reject non-admin
    expect(() => authorizeCommissionerAdjudication('USER', 'u3', mainPoolId, 'ACTIVE')).toThrow('HTTP 403 Forbidden');
    
    // Negative test: Target foreign pool injection for adjudication (assert 403 Forbidden)
    expect(() => authorizeCommissionerAdjudication('ADMIN', 'u3', foreignPoolId, 'ACTIVE')).toThrow('HTTP 403 Forbidden: Target pool mismatch');
    expect(() => authorizeCommissionerAdjudication('ADMIN', 'u3', '', 'ACTIVE')).toThrow('HTTP 403 Forbidden: Target pool mismatch');

    // Must successfully adjudicate inside scoped pool
    const approval = authorizeCommissionerAdjudication('ADMIN', 'u3', mainPoolId, 'ACTIVE');
    expect(approval.newStatus).toBe('ACTIVE');
    expect(approval.targetPoolId).toBe(mainPoolId);

    const rejection = authorizeCommissionerAdjudication('ADMIN', 'u3', mainPoolId, 'REJECTED');
    expect(rejection.newStatus).toBe('REJECTED');
  });

  // 4. Decimal Stepper Precision (Imported from AuthContext.tsx)
  it('INV-Decimal: stepTiebreakerScore preserves single decimal place without IEEE-754 drift', () => {
    expect(stepTiebreakerScore('48.9', 0.5)).toBe('49.4');
    expect(stepTiebreakerScore('48.9', -0.5)).toBe('48.4');
    expect(stepTiebreakerScore('47.5', 0.5)).toBe('48.0');
    expect(stepTiebreakerScore('0.0', 0.5)).toBe('0.5');
    expect(stepTiebreakerScore('invalid', 0.5)).toBe('0.0');
  });

  // 5. Lock Supremacy (Imported from lockEnforcementService.ts - Decision #66)
  it('INV-Lock: isKickoffLocked enforces immutable kickoff boundary and fail-closed invalid dates', () => {
    const serverNow = new Date('2026-10-11T17:00:00.000Z');
    
    // Past kickoff -> locked
    expect(isKickoffLocked('2026-10-11T16:59:59.000Z', serverNow)).toBe(true);
    // Exact kickoff -> locked
    expect(isKickoffLocked('2026-10-11T17:00:00.000Z', serverNow)).toBe(true);
    // Future kickoff -> open
    expect(isKickoffLocked('2026-10-11T17:01:00.000Z', serverNow)).toBe(false);
    
    // Negative test: Invalid date must fail closed (Decision #55)
    expect(isKickoffLocked('not-a-valid-date', serverNow)).toBe(true);
  });

  // 6. Open Slate Access vs Foreign Tenant Isolation (Imported from openSlatePolicyService.ts - Decision #20 & #66)
  it('INV-OpenSlate: evaluatePickVisibility allows peer reads while denying foreign pools and drafts', () => {
    const mainPool = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';
    const foreignPool = 'other-pool-uuid';

    // Authorized peer view
    expect(evaluatePickVisibility({ userPoolId: mainPool, targetPoolId: mainPool, isDraft: false })).toBe(true);
    
    // Negative tests:
    // Cross-tenant isolation violation (Decision #20)
    expect(evaluatePickVisibility({ userPoolId: mainPool, targetPoolId: foreignPool, isDraft: false })).toBe(false);
    expect(evaluatePickVisibility({ userPoolId: '', targetPoolId: mainPool, isDraft: false })).toBe(false);
    // Unsubmitted draft pick protection
    expect(evaluatePickVisibility({ userPoolId: mainPool, targetPoolId: mainPool, isDraft: true })).toBe(false);
    // Hidden until kickoff policy
    expect(evaluatePickVisibility({ 
      userPoolId: mainPool, 
      targetPoolId: mainPool, 
      isDraft: false, 
      hidePicksUntilKickoff: true, 
      gameLocked: false 
    })).toBe(false);
    expect(evaluatePickVisibility({ 
      userPoolId: mainPool, 
      targetPoolId: mainPool, 
      isDraft: false, 
      hidePicksUntilKickoff: true, 
      gameLocked: true 
    })).toBe(true);
  });

  // 7. Decision #54: Zero Database Writes on GET (Imported from apiSafetyGuard.ts)
  it('INV-GetSafety: assertGetSafety strictly prohibits write mutations and payloads on GET', () => {
    // Valid GET operations with no payload/mutations pass silently
    expect(() => assertGetSafety('GET')).not.toThrow();
    expect(() => assertGetSafety('get', undefined, false)).not.toThrow();
    expect(() => assertGetSafety('POST', { foo: 'bar' }, true)).not.toThrow();

    // Negative tests: Mutating flag or body payload on GET throws Decision #54 violation
    expect(() => assertGetSafety('GET', undefined, true)).toThrow('Decision #54 Violation');
    expect(() => assertGetSafety('GET', { action: 'MUTATE' })).toThrow('Decision #54 Violation');
    expect(() => assertGetSafety('get', { queryMutation: true }, true)).toThrow('Decision #54 Violation');
  });

  // 8. Decision #55: Fail-Closed Authorization (Imported from authGateService.ts)
  it('INV-FailClosed: authorizeAccess denies by default on missing context, pending, or rejected status', () => {
    // Valid authorized context
    expect(authorizeAccess({
      hasPermission: true,
      settingsLoaded: true,
      lockKnown: true,
      membershipStatus: 'ACTIVE'
    })).toBe(true);

    // Negative tests:
    // Missing permission
    expect(authorizeAccess({ hasPermission: false, settingsLoaded: true, lockKnown: true, membershipStatus: 'ACTIVE' })).toBe(false);
    // Missing settings
    expect(authorizeAccess({ hasPermission: true, settingsLoaded: false, lockKnown: true, membershipStatus: 'ACTIVE' })).toBe(false);
    // Missing lock state
    expect(authorizeAccess({ hasPermission: true, settingsLoaded: true, lockKnown: false, membershipStatus: 'ACTIVE' })).toBe(false);
    // Non-ACTIVE membership status (PENDING / REJECTED / null)
    expect(authorizeAccess({ hasPermission: true, settingsLoaded: true, lockKnown: true, membershipStatus: 'PENDING' })).toBe(false);
    expect(authorizeAccess({ hasPermission: true, settingsLoaded: true, lockKnown: true, membershipStatus: 'REJECTED' })).toBe(false);
    expect(authorizeAccess({ hasPermission: true, settingsLoaded: true, lockKnown: true, membershipStatus: null })).toBe(false);
    // Empty context
    expect(authorizeAccess({} as any)).toBe(false);
  });
});
