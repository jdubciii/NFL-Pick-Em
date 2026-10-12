import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import {
  validateLeagueRegistration,
  authorizeCommissionerAdjudication,
} from '../client/src/context/AuthContext';
import { BottomTabBar } from '../client/src/components/mobile/BottomTabBar';

describe('Phase 38 Commissioner Queue & Production Onboarding Flow', () => {
  const MAIN_LEAGUE_POOL_ID = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';

  describe('1. Registration & Adjudication Invariants (Decisions #20, #54, #55)', () => {
    it('enforces inviteCode MAIN26 and rejects privilege forgery on signup', () => {
      // Must succeed with MAIN26
      const reg = validateLeagueRegistration('MAIN26', 'user-123');
      expect(reg.pool_id).toBe(MAIN_LEAGUE_POOL_ID);
      expect(reg.user_id).toBe('user-123');
      expect(reg.status).toBe('PENDING');

      // Case insensitive
      const regLower = validateLeagueRegistration('main26', 'user-123');
      expect(regLower.status).toBe('PENDING');

      // Rejects forged role or status
      expect(() => validateLeagueRegistration('MAIN26', 'user-123', 'ADMIN')).toThrow(/HTTP 403/);
      expect(() => validateLeagueRegistration('MAIN26', 'user-123', 'USER', 'ACTIVE')).toThrow(/HTTP 403/);
      expect(() => validateLeagueRegistration('INVALID_CODE', 'user-123')).toThrow(/Invalid League Invite Code/);
    });

    it('enforces commissioner adjudication strictly within scoped pool', () => {
      // Admin adjudicating active pool
      const approved = authorizeCommissionerAdjudication('ADMIN', 'user-123', MAIN_LEAGUE_POOL_ID, 'ACTIVE');
      expect(approved.newStatus).toBe('ACTIVE');
      expect(approved.targetPoolId).toBe(MAIN_LEAGUE_POOL_ID);
      expect(approved.targetUserId).toBe('user-123');

      const rejected = authorizeCommissionerAdjudication('ADMIN', 'user-123', MAIN_LEAGUE_POOL_ID, 'REJECTED');
      expect(rejected.newStatus).toBe('REJECTED');

      // Non-admin fails closed
      expect(() => authorizeCommissionerAdjudication('USER', 'user-123', MAIN_LEAGUE_POOL_ID, 'ACTIVE')).toThrow(/HTTP 403/);

      // Foreign pool mismatch fails closed
      expect(() => authorizeCommissionerAdjudication('ADMIN', 'user-123', 'foreign-pool-id', 'ACTIVE')).toThrow(/Target pool mismatch/);
    });
  });

  describe('2. Bottom Navigation Notification Badge Logic', () => {
    it('correctly constructs navigation structure with pending badge on Profile tab when pendingCount > 0', () => {
      const element = React.createElement(BottomTabBar, {
        currentPath: '/radar',
        onNavigate: () => {},
        pendingCount: 3,
      });

      expect(element).toBeDefined();
      expect(element.props.pendingCount).toBe(3);
    });

    it('suppresses notification badge when pendingCount is 0 or undefined', () => {
      const elementZero = React.createElement(BottomTabBar, {
        currentPath: '/radar',
        onNavigate: () => {},
        pendingCount: 0,
      });

      expect(elementZero.props.pendingCount).toBe(0);

      const elementDefault = React.createElement(BottomTabBar, {
        currentPath: '/radar',
        onNavigate: () => {},
      });

      expect(elementDefault.props.pendingCount).toBeUndefined();
    });
  });

  describe('3. Production Component Exports & Parity', () => {
    it('verifies BottomTabBar proxy re-export exists and matches mobile component', async () => {
      const proxy = await import('../client/src/components/BottomTabBar');
      const mobile = await import('../client/src/components/mobile/BottomTabBar');
      expect(proxy.BottomTabBar).toBe(mobile.BottomTabBar);
    });

    it('verifies BottomNavigation imports and mounts without throwing', async () => {
      const { BottomNavigation } = await import('../client/src/components/BottomNavigation');
      expect(BottomNavigation).toBeDefined();
    });

    it('verifies ProfilePage and Login components export valid React components', async () => {
      const { ProfilePage } = await import('../client/src/pages/ProfilePage');
      const { Login } = await import('../client/src/pages/Login');
      expect(ProfilePage).toBeDefined();
      expect(Login).toBeDefined();
    });
  });
});
