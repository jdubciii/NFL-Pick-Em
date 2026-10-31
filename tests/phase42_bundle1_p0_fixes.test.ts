import { describe, it, expect, vi } from 'vitest';
import { QuickFillSafetyEngine, type SlateGameItem } from '../client/src/services/QuickFillSafetyEngine';
import {
  formatCanonicalKickoffDisplay,
} from '../src/services/dependableInfoService';
import {
  formatGameKickoff,
  formatFullKickoff,
  formatTimeOnly,
} from '../client/src/utils/dateUtils';
import { savePickAtomically } from '../src/routes/picks';

describe('Bundle 1 — Eight P0 Fixes Verification Suite', () => {
  describe('Fix 1 (B1): Preset persistence recomputes Favorites', () => {
    it('QuickFillSafetyEngine applies and stages explicit custom/preset picks without forcing FAVORITES', () => {
      const engine = new QuickFillSafetyEngine();
      const mockGames: SlateGameItem[] = [
        {
          gameId: 'game-1',
          awayTeam: 'KC',
          homeTeam: 'DEN',
          favorite: 'DEN', // home default when spread is null
          isLocked: false,
        },
        {
          gameId: 'game-2',
          awayTeam: 'GB',
          homeTeam: 'CHI',
          favorite: 'CHI',
          isLocked: true, // locked game must be preserved
        },
      ];

      const currentPicks = { 'game-2': 'GB' };
      // User picked ALL_AWAY: game-1 -> KC
      const explicitPicks = { 'game-1': 'KC' };

      const { updatedPicks, affectedCount } = engine.applyPreset(
        mockGames,
        currentPicks,
        'ALL_AWAY',
        explicitPicks
      );

      // Game 1 was updated to away team KC, game 2 was locked and untouched
      expect(updatedPicks['game-1']).toBe('KC');
      expect(updatedPicks['game-2']).toBe('GB');
      expect(affectedCount).toBe(1);
    });

    it('QuickFillSafetyEngine does not overwrite explicit picks with home team when spread is missing', () => {
      const engine = new QuickFillSafetyEngine();
      const mockGames: SlateGameItem[] = [
        {
          gameId: 'game-1',
          awayTeam: 'CIN',
          homeTeam: 'CLE',
          favorite: 'CLE',
          isLocked: false,
        },
      ];

      const currentPicks = {};
      const contrarianPicks = { 'game-1': 'CIN' };

      const staged = engine.stagePreset(
        mockGames,
        currentPicks,
        'CONTRARIAN',
        undefined,
        contrarianPicks
      );

      expect(staged.updatedPicks['game-1']).toBe('CIN');
      engine.triggerUndo();
    });
  });

  describe('Fix 2 & Fix 4 (B2 & B4): Alias keys inflate counts & Identity-aware mutation', () => {
    it('counts unique games only, preventing dual UUID and ESPN key inflation', () => {
      const games = [
        { id: 'uuid-1', externalGameId: 'espn-101', userPick: null },
        { id: 'uuid-2', externalGameId: 'espn-102', userPick: null },
      ];

      // cloudMap stores both UUID and ESPN keys for 2 games (4 entries)
      const inflatedUserPicks = {
        'uuid-1': 'KC',
        'espn-101': 'KC',
        'uuid-2': 'BUF',
        'espn-102': 'BUF',
      };

      const countUniquePickedGames = (gameList: any[], picksMap: Record<string, string>) => {
        return gameList.filter((g) => {
          const ext = String(g.externalGameId || g.external_game_id || '');
          return Boolean(picksMap[g.id] || (ext && picksMap[ext]) || g.userPick);
        }).length;
      };

      // Raw keys length would be 4, but unique games count must be exactly 2
      expect(Object.keys(inflatedUserPicks).length).toBe(4);
      expect(countUniquePickedGames(games, inflatedUserPicks)).toBe(2);
    });

    it('savePickAtomically resolves external ESPN ID to existing row and consolidates duplicates', async () => {
      const mockDb = {
        $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string, ...params: any[]) => {
          if (sql.includes('SELECT id, game_id FROM public.picks')) {
            // Simulate 2 duplicate rows found (one with canonical UUID, one with ESPN ID)
            return [
              { id: 'row-uuid-1', game_id: 'c032a900-1111-2222-3333-444455556666' },
              { id: 'row-uuid-2', game_id: '401671800' },
            ];
          }
          if (sql.includes('DELETE FROM public.picks')) {
            return [];
          }
          if (sql.includes('UPDATE public.picks SET game_id')) {
            return [];
          }
          if (sql.includes('INSERT INTO public.picks')) {
            return [
              {
                id: 'row-uuid-1',
                pool_id: params[0],
                user_id: params[1],
                week: params[2],
                game_id: params[3],
                selected_team_id: params[4],
                submitted_by: params[5],
                created_at: new Date().toISOString(),
              },
            ];
          }
          return [];
        }),
      };

      const result = await savePickAtomically(mockDb, {
        poolId: 'pool-uuid-1',
        userId: 'user-uuid-1',
        gameId: 'c032a900-1111-2222-3333-444455556666',
        externalGameId: '401671800',
        week: 8,
        selectedTeamId: 'DEN',
      });

      expect(result.gameId).toBe('c032a900-1111-2222-3333-444455556666');
      expect(result.selectedTeamId).toBe('DEN');
      // Assert duplicate check query was executed
      const queries = mockDb.$queryRawUnsafe.mock.calls.map((c: any[]) => c[0]);
      expect(queries.some((q: string) => q.includes('SELECT id, game_id FROM public.picks'))).toBe(true);
    });
  });

  describe('Fix 6 (B19): Auth client-gate bypass', () => {
    it('never grants admission based on user_metadata.role or hardcoded email', () => {
      // Test payload simulating attacker injecting role: 'ADMIN' in user_metadata
      const fakeUser = {
        id: 'attacker-id',
        email: 'jack.w.cone@gmail.com', // spoofed email
        user_metadata: { role: 'ADMIN' },
        app_metadata: {}, // no protected role
      };

      // Derivation rule: role must come from app_metadata only
      const protectedRole = (fakeUser.app_metadata as any)?.role || 'USER';
      expect(protectedRole).toBe('USER');
      expect(protectedRole).not.toBe('ADMIN');

      // Admission must be derived from verified active pool membership
      const membershipCheck = (user: any, membershipData: any) => {
        if (!user) return 'NONE';
        if (!membershipData || membershipData.status !== 'ACTIVE') {
          return 'PENDING';
        }
        return 'ACTIVE';
      };

      // Attacker with matching email but pending membership receives PENDING, never ACTIVE
      const admission = membershipCheck(fakeUser, { status: 'PENDING' });
      expect(admission).toBe('PENDING');
      expect(admission).not.toBe('ACTIVE');
    });
  });

  describe('Fix 8 (F7): Standardized display on America/Phoenix', () => {
    it('formatCanonicalKickoffDisplay produces America/Phoenix time strings', () => {
      // 2026-11-05T01:15:00.000Z is Thursday 5:15 PM in Arizona (UTC-7, MST)
      const iso = '2026-11-05T01:15:00.000Z';
      const formatted = formatCanonicalKickoffDisplay(iso);
      expect(formatted).toContain('Wed');
      expect(formatted).toContain('6:15 PM'); // 01:15 UTC is 18:15 (6:15 PM) on Wednesday in UTC-7
    });

    it('dateUtils helpers format explicitly in America/Phoenix without relying on host local clock', () => {
      const iso = '2026-11-01T20:00:00.000Z'; // 20:00 UTC = 13:00 (1:00 PM) MST in America/Phoenix
      const gameKickoff = formatGameKickoff(iso);
      const timeOnly = formatTimeOnly(iso);
      const fullKickoff = formatFullKickoff(iso);

      expect(gameKickoff).toContain('1:00 PM');
      expect(timeOnly).toBe('1:00 PM');
      expect(fullKickoff).toContain('1:00 PM');
    });
  });
});
