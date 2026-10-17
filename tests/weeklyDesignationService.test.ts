import { describe, it, expect } from 'vitest';
import {
  resolveDefaultDesignation,
  getWeeklyDesignation,
  applyCommissionerOverride,
  freezeDesignation,
  GameSlateItem,
} from '../src/services/weeklyDesignationService';

describe('Weekly Game Designation & Freeze Contract (Section 5)', () => {
  const futureKickoff = new Date(Date.now() + 86400000).toISOString();
  const pastKickoff = new Date(Date.now() - 3600000).toISOString();

  const sampleGames: GameSlateItem[] = [
    {
      id: 'g1',
      externalGameId: '401872999',
      homeTeamId: 'DET',
      awayTeamId: 'CHI',
      kickoffTime: futureKickoff,
    },
    {
      id: 'g2',
      externalGameId: '401873000',
      homeTeamId: 'GB',
      awayTeamId: 'MIN',
      kickoffTime: futureKickoff,
    },
    {
      id: 'g3',
      externalGameId: '401873001',
      homeTeamId: 'KC',
      awayTeamId: 'BUF',
      kickoffTime: futureKickoff,
    },
  ];

  describe('Default Designation', () => {
    it('designates Detroit Lions game when Lions are home', () => {
      const res = resolveDefaultDesignation(sampleGames);
      expect(res.status).toBe('DEFAULT_LIONS');
      expect(res.eventId).toBe('401872999');
      expect(res.game?.homeTeamId).toBe('DET');
    });

    it('designates Detroit Lions game when Lions are away', () => {
      const awayLionsGames: GameSlateItem[] = [
        {
          id: 'g1',
          externalGameId: '401872995',
          homeTeamId: 'DAL',
          awayTeamId: 'DET',
          kickoffTime: futureKickoff,
        },
        {
          id: 'g2',
          externalGameId: '401873000',
          homeTeamId: 'GB',
          awayTeamId: 'MIN',
          kickoffTime: futureKickoff,
        },
      ];
      const res = resolveDefaultDesignation(awayLionsGames);
      expect(res.status).toBe('DEFAULT_LIONS');
      expect(res.eventId).toBe('401872995');
      expect(res.game?.awayTeamId).toBe('DET');
    });

    it('returns COMMISSIONER_SELECTION_REQUIRED when Detroit is on bye or no Lions game exists', () => {
      const byeWeekGames: GameSlateItem[] = [
        {
          id: 'g2',
          externalGameId: '401873000',
          homeTeamId: 'GB',
          awayTeamId: 'MIN',
          kickoffTime: futureKickoff,
        },
      ];
      const res = resolveDefaultDesignation(byeWeekGames);
      expect(res.status).toBe('COMMISSIONER_SELECTION_REQUIRED');
      expect(res.game).toBeNull();
      expect(res.reason).toContain('Detroit Lions have a bye week');
    });

    it('returns UNRESOLVED when schedule is empty or unavailable', () => {
      const res = resolveDefaultDesignation([]);
      expect(res.status).toBe('UNRESOLVED');
      expect(res.game).toBeNull();
    });

    it('returns UNRESOLVED when schedule is ambiguous (multiple Lions games)', () => {
      const ambiguousGames: GameSlateItem[] = [
        {
          id: 'g1',
          externalGameId: '401872999',
          homeTeamId: 'DET',
          awayTeamId: 'CHI',
          kickoffTime: futureKickoff,
        },
        {
          id: 'g2',
          externalGameId: '401873002',
          homeTeamId: 'DET',
          awayTeamId: 'GB',
          kickoffTime: futureKickoff,
        },
      ];
      const res = resolveDefaultDesignation(ambiguousGames);
      expect(res.status).toBe('UNRESOLVED');
      expect(res.reason).toContain('Ambiguous');
    });
  });

  describe('Commissioner Override and Freeze Rule', () => {
    const adminId = 'admin-uuid-123';
    const nonAdminId = 'user-uuid-456';
    const poolSettings: any = { season: 2026 };

    it('permits authorized commissioner to override to another game from the weekly slate before kickoff', () => {
      const result = applyCommissionerOverride({
        currentSettings: poolSettings,
        season: 2026,
        week: 6,
        targetGameId: '401873000', // GB @ MIN
        games: sampleGames,
        requestingUserId: adminId,
        poolAdminId: adminId,
        isUserActiveMember: true,
      });

      expect(result.designation.eventId).toBe('401873000');
      expect(result.designation.provenance).toBe('COMMISSIONER_OVERRIDE');
      expect(result.designation.isFrozen).toBe(false);

      // Verify that getWeeklyDesignation returns the override
      const resolved = getWeeklyDesignation(result.updatedSettings, 2026, 6, sampleGames);
      expect(resolved.status).toBe('COMMISSIONER_OVERRIDE');
      expect(resolved.eventId).toBe('401873000');
    });

    it('rejects override from non-commissioner', () => {
      expect(() => {
        applyCommissionerOverride({
          currentSettings: poolSettings,
          season: 2026,
          week: 6,
          targetGameId: '401873000',
          games: sampleGames,
          requestingUserId: nonAdminId,
          poolAdminId: adminId,
          isUserActiveMember: true,
        });
      }).toThrow('FORBIDDEN: Only the pool commissioner may override');
    });

    it('rejects override from inactive member commissioner', () => {
      expect(() => {
        applyCommissionerOverride({
          currentSettings: poolSettings,
          season: 2026,
          week: 6,
          targetGameId: '401873000',
          games: sampleGames,
          requestingUserId: adminId,
          poolAdminId: adminId,
          isUserActiveMember: false,
        });
      }).toThrow('FORBIDDEN: Commissioner must have an active pool membership');
    });

    it('rejects target game that is not in the specified weekly slate', () => {
      expect(() => {
        applyCommissionerOverride({
          currentSettings: poolSettings,
          season: 2026,
          week: 6,
          targetGameId: 'non-existent-game-id',
          games: sampleGames,
          requestingUserId: adminId,
          poolAdminId: adminId,
          isUserActiveMember: true,
        });
      }).toThrow('INVALID_TARGET');
    });

    it('rejects override if proposed target game kickoff has already passed', () => {
      const pastGames: GameSlateItem[] = [
        ...sampleGames,
        {
          id: 'g-past',
          externalGameId: '401873999',
          homeTeamId: 'ARI',
          awayTeamId: 'LAR',
          kickoffTime: pastKickoff,
        },
      ];

      expect(() => {
        applyCommissionerOverride({
          currentSettings: poolSettings,
          season: 2026,
          week: 6,
          targetGameId: '401873999',
          games: pastGames,
          requestingUserId: adminId,
          poolAdminId: adminId,
          isUserActiveMember: true,
        });
      }).toThrow('KICKOFF_PASSED');
    });

    it('freezes designation after first acknowledged prediction and blocks subsequent overrides', () => {
      // 1. Initial commissioner override
      const initial = applyCommissionerOverride({
        currentSettings: poolSettings,
        season: 2026,
        week: 6,
        targetGameId: '401873000',
        games: sampleGames,
        requestingUserId: adminId,
        poolAdminId: adminId,
        isUserActiveMember: true,
      });

      // 2. First prediction is submitted -> designation freezes!
      const frozenSettings = freezeDesignation({
        currentSettings: initial.updatedSettings,
        season: 2026,
        week: 6,
        designatedEventId: '401873000',
        firstPredictionUserId: 'user-pred-1',
        games: sampleGames,
      });

      const effective = getWeeklyDesignation(frozenSettings, 2026, 6, sampleGames);
      expect(effective.isFrozen).toBe(true);
      expect(effective.firstPredictionUserId).toBe('user-pred-1');

      // 3. Attempting to override frozen designation is strictly forbidden
      expect(() => {
        applyCommissionerOverride({
          currentSettings: frozenSettings,
          season: 2026,
          week: 6,
          targetGameId: '401873001',
          games: sampleGames,
          requestingUserId: adminId,
          poolAdminId: adminId,
          isUserActiveMember: true,
        });
      }).toThrow('DESIGNATION_FROZEN');
    });
  });
});
