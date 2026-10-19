import { describe, it, expect } from 'vitest';
import { PickVisibilityService, PickVisibilityContext } from '../src/services/pickVisibility';

describe('Milestone 14.3 - Central Pick Visibility Service (Decisions #20, #66, P41-POOL-VISIBILITY-2026-10-19-08)', () => {
  const viewer = 'user-member-1';
  const competitor = 'user-member-2';
  const poolId = 'pool-phase14-test';
  const otherPoolId = 'pool-other-tenant';

  describe('Immediate Pool Visibility with Trusted ACTIVE Context', () => {
    it('Owner can view their own pick when trusted active context is present', () => {
      expect(PickVisibilityService.canViewPick({
        viewerMembershipId: viewer,
        targetMembershipId: viewer,
        isSamePoolActiveMember: true,
        isGameLocked: false,
        hidePicksUntilKickoff: true
      })).toBe(true);

      expect(PickVisibilityService.canViewPick({
        viewerMembershipId: viewer,
        targetMembershipId: viewer,
        viewerPoolId: poolId,
        targetPoolId: poolId,
        viewerMembershipStatus: 'ACTIVE',
        isGameLocked: false,
        hidePicksUntilKickoff: false
      })).toBe(true);
    });

    it('Competitor pick is visible immediately to fellow pool members before kickoff with trusted context (P41-POOL-VISIBILITY-2026-10-19-08)', () => {
      expect(PickVisibilityService.canViewPick({
        viewerMembershipId: viewer,
        targetMembershipId: competitor,
        isSamePoolActiveMember: true,
        isGameLocked: false,
        hidePicksUntilKickoff: true
      })).toBe(true);

      expect(PickVisibilityService.canViewPick({
        viewerMembershipId: viewer,
        targetMembershipId: competitor,
        viewerPoolId: poolId,
        targetPoolId: poolId,
        viewerMembershipStatus: 'ACTIVE',
        isGameLocked: false,
        hidePicksUntilKickoff: true
      })).toBe(true);
    });

    it('Competitor pick is visible when game is locked with trusted context', () => {
      expect(PickVisibilityService.canViewPick({
        viewerMembershipId: viewer,
        targetMembershipId: competitor,
        isSamePoolActiveMember: true,
        isGameLocked: true,
        hidePicksUntilKickoff: true
      })).toBe(true);
    });

    it('Competitor pick is visible when legacy policy is disabled with trusted context', () => {
      expect(PickVisibilityService.canViewPick({
        viewerMembershipId: viewer,
        targetMembershipId: competitor,
        isSamePoolActiveMember: true,
        isGameLocked: false,
        hidePicksUntilKickoff: false
      })).toBe(true);
    });
  });

  describe('Fail-Closed Negative Authorization Context (Decisions #20, #55)', () => {
    it('Denies access when authorization context is completely absent', () => {
      expect(PickVisibilityService.canViewPick({
        viewerMembershipId: viewer,
        targetMembershipId: competitor,
        isGameLocked: false,
        hidePicksUntilKickoff: false
      })).toBe(false);

      expect(PickVisibilityService.canViewPick({
        viewerMembershipId: viewer,
        targetMembershipId: viewer,
        isGameLocked: false,
        hidePicksUntilKickoff: false
      })).toBe(false);
    });

    it('Denies access when isSamePoolActiveMember is explicitly false', () => {
      expect(PickVisibilityService.canViewPick({
        viewerMembershipId: viewer,
        targetMembershipId: competitor,
        isSamePoolActiveMember: false,
        isGameLocked: true,
        hidePicksUntilKickoff: false
      })).toBe(false);
    });

    it('Denies access when viewer and target are in mismatched pools', () => {
      expect(PickVisibilityService.canViewPick({
        viewerMembershipId: viewer,
        targetMembershipId: competitor,
        viewerPoolId: poolId,
        targetPoolId: otherPoolId,
        viewerMembershipStatus: 'ACTIVE',
        isGameLocked: true,
        hidePicksUntilKickoff: false
      })).toBe(false);
    });

    it('Denies access when viewer membership status is not ACTIVE', () => {
      expect(PickVisibilityService.canViewPick({
        viewerMembershipId: viewer,
        targetMembershipId: competitor,
        viewerPoolId: poolId,
        targetPoolId: poolId,
        viewerMembershipStatus: 'INACTIVE',
        isGameLocked: false,
        hidePicksUntilKickoff: false
      })).toBe(false);

      expect(PickVisibilityService.canViewPick({
        viewerMembershipId: viewer,
        targetMembershipId: competitor,
        viewerPoolId: poolId,
        targetPoolId: poolId,
        viewerMembershipStatus: 'PENDING',
        isGameLocked: false,
        hidePicksUntilKickoff: false
      })).toBe(false);

      // Even owner cannot view picks if membership is inactive
      expect(PickVisibilityService.canViewPick({
        viewerMembershipId: viewer,
        targetMembershipId: viewer,
        viewerPoolId: poolId,
        targetPoolId: poolId,
        viewerMembershipStatus: 'INACTIVE',
        isGameLocked: false,
        hidePicksUntilKickoff: false
      })).toBe(false);
    });

    it('Fails closed if viewer or target membership ID is empty or missing', () => {
      expect(PickVisibilityService.canViewPick({
        viewerMembershipId: '',
        targetMembershipId: competitor,
        isSamePoolActiveMember: true,
        isGameLocked: false,
        hidePicksUntilKickoff: false
      })).toBe(false);

      expect(PickVisibilityService.canViewPick({
        viewerMembershipId: viewer,
        targetMembershipId: '',
        isSamePoolActiveMember: true,
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
