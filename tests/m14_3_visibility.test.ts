import { describe, it, expect } from 'vitest';
import { PickVisibilityService, PickVisibilityContext } from '../src/services/pickVisibility';

describe('Milestone 14.3 - Central Pick Visibility Service (Decisions #20, #66)', () => {
  const viewer = 'user-member-1';
  const competitor = 'user-member-2';

  describe('Decision #66: Truth-Table Pick Visibility', () => {
    it('Owner can always view their own pick regardless of lock or policy', () => {
      expect(PickVisibilityService.canViewPick({
        viewerMembershipId: viewer,
        targetMembershipId: viewer,
        isGameLocked: false,
        hidePicksUntilKickoff: true
      })).toBe(true);

      expect(PickVisibilityService.canViewPick({
        viewerMembershipId: viewer,
        targetMembershipId: viewer,
        isGameLocked: false,
        hidePicksUntilKickoff: false
      })).toBe(true);
    });

    it('Competitor pick is hidden when policy is active and game is unlocked', () => {
      expect(PickVisibilityService.canViewPick({
        viewerMembershipId: viewer,
        targetMembershipId: competitor,
        isGameLocked: false,
        hidePicksUntilKickoff: true
      })).toBe(false);
    });

    it('Competitor pick is visible when policy is active and game is locked', () => {
      expect(PickVisibilityService.canViewPick({
        viewerMembershipId: viewer,
        targetMembershipId: competitor,
        isGameLocked: true,
        hidePicksUntilKickoff: true
      })).toBe(true);
    });

    it('Competitor pick is visible when policy is disabled even if game is unlocked', () => {
      expect(PickVisibilityService.canViewPick({
        viewerMembershipId: viewer,
        targetMembershipId: competitor,
        isGameLocked: false,
        hidePicksUntilKickoff: false
      })).toBe(true);
    });
  });

  describe('Finding 5.6: Anti-Peeking Cohort Floor (N >= 3)', () => {
    it('Suppresses aggregate exposure if cohort size is below 3', () => {
      expect(PickVisibilityService.canExposeAggregate(0)).toBe(false);
      expect(PickVisibilityService.canExposeAggregate(1)).toBe(false);
      expect(PickVisibilityService.canExposeAggregate(2)).toBe(false);
    });

    it('Permits aggregate exposure if cohort size is 3 or greater', () => {
      expect(PickVisibilityService.canExposeAggregate(3)).toBe(true);
      expect(PickVisibilityService.canExposeAggregate(10)).toBe(true);
    });
  });

  describe('Pick Selection Masking Helper', () => {
    it('Masks selection to null when canView is false', () => {
      const pick = { selection: 'KC' };
      const masked = PickVisibilityService.maskPickSelection(pick, false);
      expect(masked.selection).toBeNull();
    });

    it('Preserves selection when canView is true', () => {
      const pick = { selection: 'KC' };
      const unmasked = PickVisibilityService.maskPickSelection(pick, true);
      expect(unmasked.selection).toBe('KC');
    });
  });
});
