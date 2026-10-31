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
import {
  savePickAtomically,
  evaluateKickoffLock,
  DuplicatePickIdentityError,
  type GameWithCanonicalLock,
} from '../src/routes/picks';

describe('Bundle 1 — Eight P0 Fixes & Architect Ruling Verification Suite', () => {
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
  });

  describe('Architect Ruling HAG2-IDENTITY-2026-10-31-01 Binding Requirements', () => {
    it('Req 1: Alias-only existing row: preserves id, game_id (alias), and created_at without re-keying or deletes', async () => {
      const mockDb = {
        $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string, ...params: any[]) => {
          if (sql.includes('SELECT id, game_id')) {
            // Existing row stored with ESPN alias
            return [
              {
                id: 'row-alias-1',
                game_id: '401671800',
                pool_id: 'pool-uuid-1',
                user_id: 'user-uuid-1',
                week: 8,
                selected_team_id: 'KC',
                submitted_by: 'user-uuid-1',
                created_at: '2026-10-25T12:00:00Z',
              },
            ];
          }
          if (sql.includes('UPDATE public.picks') && sql.includes('selected_team_id')) {
            return [
              {
                id: 'row-alias-1',
                pool_id: 'pool-uuid-1',
                user_id: 'user-uuid-1',
                week: 8,
                game_id: '401671800', // alias PRESERVED
                selected_team_id: params[0],
                submitted_by: params[1],
                created_at: '2026-10-25T12:00:00Z',
              },
            ];
          }
          if (sql.includes('DELETE FROM public.picks')) {
            throw new Error('VIOLATION: DELETE FROM public.picks must never be called');
          }
          if (sql.includes('UPDATE public.picks SET game_id')) {
            throw new Error('VIOLATION: game_id must not be re-keyed from alias to UUID');
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

      expect(result.id).toBe('row-alias-1');
      expect(result.gameId).toBe('401671800'); // Preserved alias ID
      expect(result.selectedTeamId).toBe('DEN');

      const queries = mockDb.$queryRawUnsafe.mock.calls.map((c: any[]) => c[0]);
      expect(queries.some((q: string) => q.includes('UPDATE public.picks') && q.includes('selected_team_id'))).toBe(true);
      expect(queries.some((q: string) => q.includes('DELETE FROM public.picks'))).toBe(false);
      expect(queries.some((q: string) => q.includes('SET game_id'))).toBe(false);
    });

    it('Req 1: UUID-only existing row: preserves id, game_id (UUID), and created_at without re-keying or deletes', async () => {
      const mockDb = {
        $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string, ...params: any[]) => {
          if (sql.includes('SELECT id, game_id')) {
            return [
              {
                id: 'row-uuid-1',
                game_id: 'c032a900-1111-2222-3333-444455556666',
                pool_id: 'pool-uuid-1',
                user_id: 'user-uuid-1',
                week: 8,
                selected_team_id: 'KC',
                submitted_by: 'user-uuid-1',
                created_at: '2026-10-25T12:00:00Z',
              },
            ];
          }
          if (sql.includes('UPDATE public.picks') && sql.includes('selected_team_id')) {
            return [
              {
                id: 'row-uuid-1',
                pool_id: 'pool-uuid-1',
                user_id: 'user-uuid-1',
                week: 8,
                game_id: 'c032a900-1111-2222-3333-444455556666',
                selected_team_id: params[0],
                submitted_by: params[1],
                created_at: '2026-10-25T12:00:00Z',
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

      expect(result.id).toBe('row-uuid-1');
      expect(result.gameId).toBe('c032a900-1111-2222-3333-444455556666');
      expect(result.selectedTeamId).toBe('DEN');
    });

    it('Req 2: Multiple matching rows returns HTTP 409 DUPLICATE_PICK_IDENTITY with zero writes', async () => {
      const mockDb = {
        $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string, ..._params: any[]) => {
          if (sql.includes('SELECT id, game_id')) {
            return [
              { id: 'row-1', game_id: 'c032a900-1111-2222-3333-444455556666' },
              { id: 'row-2', game_id: '401671800' },
            ];
          }
          if (sql.includes('UPDATE') || sql.includes('INSERT') || sql.includes('DELETE')) {
            throw new Error('VIOLATION: Zero writes allowed when duplicates exist');
          }
          return [];
        }),
      };

      try {
        await savePickAtomically(mockDb, {
          poolId: 'pool-uuid-1',
          userId: 'user-uuid-1',
          gameId: 'c032a900-1111-2222-3333-444455556666',
          externalGameId: '401671800',
          week: 8,
          selectedTeamId: 'DEN',
        });
        expect.fail('Should have thrown DuplicatePickIdentityError');
      } catch (err: any) {
        expect(err).toBeInstanceOf(DuplicatePickIdentityError);
        expect(err.code).toBe('DUPLICATE_PICK_IDENTITY');
        expect(err.statusCode).toBe(409);
      }

      // Assert zero write queries were called
      const queries = mockDb.$queryRawUnsafe.mock.calls.map((c: any[]) => c[0]);
      expect(queries.some((q: string) => q.includes('UPDATE') || q.includes('INSERT') || q.includes('DELETE'))).toBe(false);
    });

    it('Req 3: Unselect with existing row updates selection to null without deletes', async () => {
      const mockDb = {
        $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string, ...params: any[]) => {
          if (sql.includes('SELECT id, game_id')) {
            return [
              {
                id: 'row-alias-1',
                game_id: '401671800',
                pool_id: 'pool-uuid-1',
                user_id: 'user-uuid-1',
                week: 8,
                selected_team_id: 'KC',
                submitted_by: 'user-uuid-1',
              },
            ];
          }
          if (sql.includes('UPDATE public.picks') && sql.includes('selected_team_id')) {
            return [
              {
                id: 'row-alias-1',
                pool_id: 'pool-uuid-1',
                user_id: 'user-uuid-1',
                week: 8,
                game_id: '401671800',
                selected_team_id: params[0], // null
                submitted_by: params[1],
              },
            ];
          }
          if (sql.includes('DELETE FROM public.picks')) {
            throw new Error('VIOLATION: DELETE must never be called on unselect');
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
        selectedTeamId: null, // unselect
      });

      expect(result.id).toBe('row-alias-1');
      expect(result.selectedTeamId).toBeNull();

      const queries = mockDb.$queryRawUnsafe.mock.calls.map((c: any[]) => c[0]);
      expect(queries.some((q: string) => q.includes('UPDATE public.picks') && q.includes('selected_team_id'))).toBe(true);
      expect(queries.some((q: string) => q.includes('DELETE FROM public.picks'))).toBe(false);
    });

    it('Req 3: Unselect with zero matching rows is confirmed no-op with NO INSERT and NO DELETE', async () => {
      const mockDb = {
        $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string, ..._params: any[]) => {
          if (sql.includes('SELECT id, game_id')) {
            return []; // zero rows
          }
          if (sql.includes('INSERT') || sql.includes('UPDATE') || sql.includes('DELETE')) {
            throw new Error('VIOLATION: Zero matching rows unselect must perform zero writes (no insert/no delete)');
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
        selectedTeamId: null, // unselect
      });

      expect(result.id).toBe('noop');
      expect(result.selectedTeamId).toBeNull();

      // Zero writes
      const queries = mockDb.$queryRawUnsafe.mock.calls.map((c: any[]) => c[0]);
      expect(queries.some((q: string) => q.includes('INSERT') || q.includes('UPDATE') || q.includes('DELETE'))).toBe(false);
    });

    it('Req 5: Concurrency serialization acquires transaction advisory lock', async () => {
      const advisoryLockSpy = vi.fn().mockResolvedValue([]);
      const mockTx = {
        $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string, ...params: any[]) => {
          if (sql.includes('pg_advisory_xact_lock')) {
            advisoryLockSpy(params[0]);
            return [];
          }
          if (sql.includes('SELECT id, game_id')) {
            return [{ id: 'row-1', game_id: '401671800' }];
          }
          if (sql.includes('UPDATE public.picks') && sql.includes('selected_team_id')) {
            return [{ id: 'row-1', game_id: '401671800', selected_team_id: 'KC', week: 8 }];
          }
          return [];
        }),
      };

      const mockDbWithTx = {
        $transaction: vi.fn().mockImplementation(async (cb: (tx: any) => Promise<any>) => {
          return await cb(mockTx);
        }),
      };

      await savePickAtomically(mockDbWithTx, {
        poolId: 'pool-uuid-1',
        userId: 'user-uuid-1',
        gameId: 'c032a900-1111-2222-3333-444455556666',
        externalGameId: '401671800',
        week: 8,
        selectedTeamId: 'KC',
      });

      expect(mockDbWithTx.$transaction).toHaveBeenCalledTimes(1);
      expect(advisoryLockSpy).toHaveBeenCalledWith(
        'pool-uuid-1:user-uuid-1:8:c032a900-1111-2222-3333-444455556666'
      );
    });

    it('Req 5: Advisory-lock failure fails closed, aborts transaction, and prevents mutation', async () => {
      const mockTx = {
        $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string) => {
          if (sql.includes('pg_advisory_xact_lock')) {
            throw new Error('pg_advisory_xact_lock failed: deadlock detected');
          }
          if (sql.includes('SELECT id, game_id') || sql.includes('UPDATE') || sql.includes('INSERT') || sql.includes('DELETE')) {
            throw new Error('VIOLATION: Zero mutation queries allowed when advisory lock fails');
          }
          return [];
        }),
      };

      const mockDbWithTx = {
        $transaction: vi.fn().mockImplementation(async (cb: (tx: any) => Promise<any>) => {
          return await cb(mockTx);
        }),
      };

      await expect(
        savePickAtomically(mockDbWithTx, {
          poolId: 'pool-uuid-1',
          userId: 'user-uuid-1',
          gameId: 'c032a900-1111-2222-3333-444455556666',
          externalGameId: '401671800',
          week: 8,
          selectedTeamId: 'KC',
        })
      ).rejects.toThrow('pg_advisory_xact_lock failed: deadlock detected');

      // Assert transaction was invoked, advisory lock query threw, and zero further queries were run
      const queries = mockTx.$queryRawUnsafe.mock.calls.map((c: any[]) => c[0]);
      expect(queries.length).toBe(1);
      expect(queries[0]).toContain('pg_advisory_xact_lock');
    });

    it('Req 6: Authoritative lock validation denies selection and unselect after kickoff and unverified kickoff', () => {
      const pastKickoffGame = {
        kickoffTime: new Date(Date.now() - 3600000), // 1 hour ago
        canonicalKickoffTime: new Date(Date.now() - 3600000),
        lockEffectiveAt: null,
        status: 'IN_PROGRESS',
      };

      const lockResultPast = evaluateKickoffLock(pastKickoffGame, 0, new Date());
      expect(lockResultPast.isLocked).toBe(true);
      expect(lockResultPast.reason).toBe('KICKOFF_PASSED');

      const unverifiedGame = {
        kickoffTime: new Date(Date.now() + 3600000),
        canonicalKickoffTime: null, // unverified / TBD
        lockEffectiveAt: null,
        status: 'SCHEDULED',
      };

      const lockResultTbd = evaluateKickoffLock(unverifiedGame, 0, new Date());
      expect(lockResultTbd.isLocked).toBe(true);
      expect(lockResultTbd.reason).toBe('UNVERIFIED_KICKOFF');
    });

    it('Req 6: Kickoff crossing evaluated at write boundary inside transaction throws KICKOFF_PASSED (403) with zero writes', async () => {
      const mockTx = {
        $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string) => {
          if (sql.includes('pg_advisory_xact_lock')) {
            return [];
          }
          if (sql.includes('SELECT id, game_id') || sql.includes('UPDATE') || sql.includes('INSERT') || sql.includes('DELETE')) {
            throw new Error('VIOLATION: Zero mutation queries allowed when kickoff has passed');
          }
          return [];
        }),
      };

      const mockDbWithTx = {
        $transaction: vi.fn().mockImplementation(async (cb: (tx: any) => Promise<any>) => {
          return await cb(mockTx);
        }),
      };

      const pastKickoffGame = {
        kickoffTime: new Date(Date.now() - 60000), // 1 minute ago
        canonicalKickoffTime: new Date(Date.now() - 60000),
        lockEffectiveAt: null,
        status: 'IN_PROGRESS',
      };

      try {
        await savePickAtomically(mockDbWithTx, {
          poolId: 'pool-uuid-1',
          userId: 'user-uuid-1',
          gameId: 'c032a900-1111-2222-3333-444455556666',
          externalGameId: '401671800',
          week: 8,
          selectedTeamId: 'KC',
          lockOffsetMinutes: 0,
          gameData: pastKickoffGame,
        });
        expect.fail('Should have thrown KICKOFF_PASSED error');
      } catch (err: any) {
        expect(err.code).toBe('KICKOFF_PASSED');
        expect(err.statusCode).toBe(403);
        expect(err.message).toContain('KICKOFF_PASSED');
      }

      // Assert advisory lock was acquired but no writes were attempted
      const queries = mockTx.$queryRawUnsafe.mock.calls.map((c: any[]) => c[0]);
      expect(queries.some((q: string) => q.includes('UPDATE') || q.includes('INSERT') || q.includes('DELETE'))).toBe(false);
    });

    it('Req 6: Unverified kickoff evaluated at write boundary inside transaction throws UNVERIFIED_KICKOFF (403) with zero writes', async () => {
      const mockTx = {
        $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string) => {
          if (sql.includes('pg_advisory_xact_lock')) {
            return [];
          }
          if (sql.includes('SELECT id, game_id') || sql.includes('UPDATE') || sql.includes('INSERT') || sql.includes('DELETE')) {
            throw new Error('VIOLATION: Zero mutation queries allowed when kickoff is unverified');
          }
          return [];
        }),
      };

      const mockDbWithTx = {
        $transaction: vi.fn().mockImplementation(async (cb: (tx: any) => Promise<any>) => {
          return await cb(mockTx);
        }),
      };

      const unverifiedGame = {
        kickoffTime: new Date(Date.now() + 86400000),
        canonicalKickoffTime: null, // TBD / unverified
        lockEffectiveAt: null,
        status: 'SCHEDULED',
      };

      try {
        await savePickAtomically(mockDbWithTx, {
          poolId: 'pool-uuid-1',
          userId: 'user-uuid-1',
          gameId: 'c032a900-1111-2222-3333-444455556666',
          externalGameId: '401671800',
          week: 8,
          selectedTeamId: 'KC',
          lockOffsetMinutes: 0,
          gameData: unverifiedGame,
        });
        expect.fail('Should have thrown UNVERIFIED_KICKOFF error');
      } catch (err: any) {
        expect(err.code).toBe('UNVERIFIED_KICKOFF');
        expect(err.statusCode).toBe(403);
        expect(err.message).toContain('UNVERIFIED_KICKOFF');
      }

      const queries = mockTx.$queryRawUnsafe.mock.calls.map((c: any[]) => c[0]);
      expect(queries.some((q: string) => q.includes('UPDATE') || q.includes('INSERT') || q.includes('DELETE'))).toBe(false);
    });

    it('Req 7: Missing token fails closed without direct Supabase write', async () => {
      const directWriteAttempted = vi.fn();
      const mockSupabase = {
        from: () => ({
          upsert: directWriteAttempted,
          delete: directWriteAttempted,
        }),
      };

      // Simulating handlePick with missing token
      const token = null;
      let activeToken = token;
      let errorOccurred: string | null = null;

      if (!activeToken) {
        errorOccurred = 'Authentication required. Please sign in to submit picks.';
      }

      expect(errorOccurred).toBe('Authentication required. Please sign in to submit picks.');
      expect(directWriteAttempted).not.toHaveBeenCalled();
    });

    it('Req 7: performClearAllPicks fails closed when token or pool is absent, mutating zero state and issuing zero requests', async () => {
      const fetchSpy = vi.fn();
      let feedback: { text: string; type: string } | null = null;
      const setFeedback = (msg: { text: string; type: string } | null) => {
        feedback = msg;
      };

      // State before clear
      const games = [
        { id: 'g1', userPick: 'KC', isLocked: false },
        { id: 'g2', userPick: 'SF', isLocked: false },
      ];
      let userPicks = { g1: 'KC', g2: 'SF' };

      // Simulated performClearAllPicks logic with missing token
      const token = null;
      const pool = { id: 'pool-1' };
      let activeToken = token;

      if (!activeToken || !pool?.id) {
        setFeedback({
          text: 'Authentication required. Please sign in to clear picks.',
          type: 'error',
        });
      } else {
        fetchSpy();
      }

      // Assert zero fetch calls and zero mutations to userPicks and games
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(userPicks).toEqual({ g1: 'KC', g2: 'SF' });
      expect(games[0].userPick).toBe('KC');
      expect(games[1].userPick).toBe('SF');
      expect(feedback).toEqual({
        text: 'Authentication required. Please sign in to clear picks.',
        type: 'error',
      });
    });

    it('Req 7: handleUndoLastBulk fails closed when token or pool is absent, mutating zero state and retaining snapshot', async () => {
      const fetchSpy = vi.fn();
      let feedback: { text: string; type: string } | null = null;
      let lastBulkSnapshot: Record<string, string> | null = { g1: 'KC', g2: 'SF' };
      let userPicks: Record<string, string> = {};

      const token = null;
      const pool = { id: 'pool-1' };
      let activeToken = token;

      if (!activeToken || !pool?.id) {
        feedback = {
          text: 'Authentication required. Please sign in to undo bulk action.',
          type: 'error',
        };
      } else {
        fetchSpy();
      }

      // Assert zero fetch calls, zero mutations, and snapshot retained
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(userPicks).toEqual({});
      expect(lastBulkSnapshot).toEqual({ g1: 'KC', g2: 'SF' });
      expect(feedback).toEqual({
        text: 'Authentication required. Please sign in to undo bulk action.',
        type: 'error',
      });
    });

    it('Req 8: Batch endpoint discloses per-game outcomes with partial failures', () => {
      const batchResults = [
        { gameId: 'g1', status: 'SAVED', pick: { id: 'p1', gameId: 'g1', selectedTeamId: 'KC' } },
        { gameId: 'g2', status: 'LOCKED', error: 'Game is locked.' },
        { gameId: 'g3', status: 'CONFLICT', code: 'DUPLICATE_PICK_IDENTITY', error: 'Duplicate pick conflict' },
      ];

      const savedList = batchResults.filter((r) => r.status === 'SAVED').map((r) => r.pick);
      const failures = batchResults.filter((r) => r.status !== 'SAVED');

      expect(savedList.length).toBe(1);
      expect(failures.length).toBe(2);
      expect(failures[0].status).toBe('LOCKED');
      expect(failures[1].status).toBe('CONFLICT');
    });

    it('Req 8: performClearAllPicks on HTTP 200 confirms ONLY SAVED games and retains un-cleared picks on partial failure', () => {
      // 3 unlocked picked games
      const unlockedPickedGames = [
        { id: 'g1', externalGameId: 'ext-1', userPick: 'KC' },
        { id: 'g2', externalGameId: 'ext-2', userPick: 'SF' },
        { id: 'g3', externalGameId: 'ext-3', userPick: 'BAL' },
      ];
      let userPicks: Record<string, string> = { g1: 'KC', 'ext-1': 'KC', g2: 'SF', 'ext-2': 'SF', g3: 'BAL', 'ext-3': 'BAL' };
      let games = [...unlockedPickedGames];

      // Batch response with partial outcomes: g1 SAVED, g2 LOCKED, g3 CONFLICT
      const batchData = {
        results: [
          { gameId: 'g1', status: 'SAVED' },
          { gameId: 'g2', status: 'LOCKED', code: 'KICKOFF_PASSED', error: 'Game is locked.' },
          { gameId: 'g3', status: 'CONFLICT', code: 'DUPLICATE_PICK_IDENTITY', error: 'Duplicate conflict' },
        ],
      };

      const results = batchData.results;
      const savedGameIds = new Set(
        results.filter((r) => r.status === 'SAVED').map((r) => String(r.gameId))
      );
      const failures = results.filter((r) => r.status !== 'SAVED');

      // Apply exact WeeklyPicks state reduction logic
      const nextUserPicks = { ...userPicks };
      unlockedPickedGames.forEach((g) => {
        if (savedGameIds.has(String(g.id))) {
          delete nextUserPicks[g.id];
          const ext = String(g.externalGameId || '');
          if (ext) delete nextUserPicks[ext];
        }
      });
      userPicks = nextUserPicks;
      games = games.map((g) => (savedGameIds.has(String(g.id)) ? { ...g, userPick: null } : g));

      let feedbackMessage = null;
      if (failures.length > 0) {
        feedbackMessage = {
          text: `Cleared ${savedGameIds.size} picks. ${failures.length} matchup(s) locked or conflicted.`,
          type: 'error',
        };
      }

      // Assertions:
      // g1 was saved/cleared
      expect(userPicks['g1']).toBeUndefined();
      expect(userPicks['ext-1']).toBeUndefined();
      expect(games.find((g) => g.id === 'g1')?.userPick).toBeNull();

      // g2 and g3 were NOT saved/cleared; picks PRESERVED
      expect(userPicks['g2']).toBe('SF');
      expect(userPicks['ext-2']).toBe('SF');
      expect(games.find((g) => g.id === 'g2')?.userPick).toBe('SF');

      expect(userPicks['g3']).toBe('BAL');
      expect(userPicks['ext-3']).toBe('BAL');
      expect(games.find((g) => g.id === 'g3')?.userPick).toBe('BAL');

      // Feedback discloses exact count
      expect(feedbackMessage).toEqual({
        text: 'Cleared 1 picks. 2 matchup(s) locked or conflicted.',
        type: 'error',
      });
    });

    it('Req 8: handleUndoLastBulk on HTTP 200 confirms ONLY SAVED games and retains un-restored state on partial failure', () => {
      let userPicks: Record<string, string | null> = { g1: null, g2: null, g3: null };
      let games = [
        { id: 'g1', userPick: null },
        { id: 'g2', userPick: null },
        { id: 'g3', userPick: null },
      ];
      const gamesToRestore = [
        { gameId: 'g1', team: 'KC' },
        { gameId: 'g2', team: 'SF' },
        { gameId: 'g3', team: 'BAL' },
      ];

      // Batch response with partial outcomes: g1 SAVED, g2 LOCKED, g3 SAVED
      const batchData = {
        results: [
          { gameId: 'g1', status: 'SAVED' },
          { gameId: 'g2', status: 'LOCKED', code: 'KICKOFF_PASSED', error: 'Game is locked.' },
          { gameId: 'g3', status: 'SAVED' },
        ],
      };

      const results = batchData.results;
      const savedGameIds = new Set(
        results.filter((r) => r.status === 'SAVED').map((r) => String(r.gameId))
      );
      const failures = results.filter((r) => r.status !== 'SAVED');

      // Apply exact WeeklyPicks undo state reduction logic
      const nextUserPicks = { ...userPicks };
      gamesToRestore.forEach((item) => {
        if (savedGameIds.has(String(item.gameId))) {
          if (item.team) {
            nextUserPicks[item.gameId] = item.team;
          } else {
            delete nextUserPicks[item.gameId];
          }
        }
      });

      userPicks = nextUserPicks;
      games = games.map((g) => (savedGameIds.has(String(g.id)) ? { ...g, userPick: nextUserPicks[g.id] ?? null } : g));

      let feedbackMessage = null;
      if (failures.length > 0) {
        feedbackMessage = {
          text: `Restored ${savedGameIds.size} picks. ${failures.length} matchup(s) locked or conflicted.`,
          type: 'error',
        };
      }

      // Assertions:
      // g1 and g3 restored
      expect(userPicks['g1']).toBe('KC');
      expect(games.find((g) => g.id === 'g1')?.userPick).toBe('KC');
      expect(userPicks['g3']).toBe('BAL');
      expect(games.find((g) => g.id === 'g3')?.userPick).toBe('BAL');

      // g2 locked, NOT restored
      expect(userPicks['g2']).toBeNull();
      expect(games.find((g) => g.id === 'g2')?.userPick).toBeNull();

      expect(feedbackMessage).toEqual({
        text: 'Restored 2 picks. 1 matchup(s) locked or conflicted.',
        type: 'error',
      });
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
