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

    it('Competitor pick is visible immediately to pool members before kickoff regardless of legacy hide policy (P41-POOL-VISIBILITY-2026-10-19-08)', () => {
      expect(PickVisibilityService.canViewPick({
        viewerMembershipId: viewer,
        targetMembershipId: competitor,
        isGameLocked: false,
        hidePicksUntilKickoff: true
      })).toBe(true);
    });

    it('Competitor pick is visible when game is locked', () => {
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

    it('Fails closed if viewer or target membership is empty', () => {
      expect(PickVisibilityService.canViewPick({
        viewerMembershipId: '',
        targetMembershipId: competitor,
        isGameLocked: false,
        hidePicksUntilKickoff: false
      })).toBe(false);
    });
  });

  describe('Cohort Exposure (P41-POOL-VISIBILITY-2026-10-19-08)', () => {
    it('Suppresses aggregate exposure if cohort size is 0 (empty state)', () => {
      expect(PickVisibilityService.canExposeAggregate(0)).toBe(false);
    });

    it('Permits aggregate exposure for active cohorts including 1-2', () => {
      expect(PickVisibilityService.canExposeAggregate(1)).toBe(true);
      expect(PickVisibilityService.canExposeAggregate(2)).toBe(true);
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
