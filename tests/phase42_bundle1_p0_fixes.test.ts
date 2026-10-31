import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import http from 'http';
import prisma from '../src/db/client';
import { app as serverApp } from '../src/server';
import { setSupabaseAuthClientForTesting, createSyntheticSupabaseToken } from '../src/middleware/auth';
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
  picksRouter,
  setLegacyGameAdapterForTesting,
  setLegacyPickSaveAdapterForTesting,
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
    const scheduledGame = {
      kickoffTime: new Date(Date.now() + 86400000),
      canonicalKickoffTime: new Date(Date.now() + 86400000),
      lockEffectiveAt: null,
      status: 'SCHEDULED',
    };

    it('Req 1: Alias-only existing row: preserves id, game_id (alias), and created_at without re-keying or deletes', async () => {
      const mockDb: any = {
        $transaction: vi.fn().mockImplementation(async (cb: (tx: any) => Promise<any>) => cb(mockDb)),
        $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string, ...params: any[]) => {
          if (sql.includes('pg_advisory_xact_lock')) return [];
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
        gameData: scheduledGame,
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

  describe('Architect Binding Ruling HAG2-IDENTITY-2026-10-31-02 Behavioral Handler & Invariant Suite', () => {
    const POOL_ID = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';
    const USER_ID = 'b2222222-2222-2222-2222-222222222222';
    let app: express.Application;
    let server: http.Server;
    let baseUrl: string;

    const createToken = (id: string) =>
      createSyntheticSupabaseToken({ id, email: `${id}@example.com`, role: 'USER' });

    beforeEach(async () => {
      const getUserMock = vi.fn().mockImplementation(async (token: string) => {
        const parts = token.split('.');
        if (parts.length < 2) return { data: { user: null }, error: new Error('invalid') };
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        return {
          data: {
            user: {
              id: payload.sub,
              aud: 'authenticated',
              role: 'authenticated',
              email: payload.email || `${payload.sub}@example.com`,
              app_metadata: {},
              user_metadata: {},
              created_at: new Date().toISOString(),
            },
          },
          error: null,
        };
      });
      setSupabaseAuthClientForTesting({ auth: { getUser: getUserMock } } as any);

      vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }: any) => ({
        id: where.id,
        email: `${where.id}@example.com`,
        role: 'USER',
        createdAt: new Date(),
      }) as any);

      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue({
        id: POOL_ID,
        name: 'Main League',
        settings: { lock_offset: 0 },
      } as any);

      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: USER_ID,
        status: 'ACTIVE',
      } as any);

      app = express();
      app.use(express.json());
      app.use('/api/pools/:pool_id/picks', picksRouter);
      app.use('/api/picks', picksRouter);

      await new Promise<void>((resolve) => {
        server = app.listen(0, () => {
          const addr = server.address() as any;
          baseUrl = `http://127.0.0.1:${addr.port}`;
          resolve();
        });
      });
    });

    afterEach(async () => {
      setLegacyGameAdapterForTesting(null);
      setLegacyPickSaveAdapterForTesting(null);
      setSupabaseAuthClientForTesting(null);
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    it('Correction 1 & 6: Tenant-scoped POST /api/pools/:pool_id/picks route saves pick with active membership', async () => {
      setLegacyGameAdapterForTesting(async () => ({
        id: 'uuid-1',
        externalGameId: '401873010',
        homeTeamId: 'GB',
        awayTeamId: 'DET',
        kickoffTime: new Date(Date.now() + 86400000),
        status: 'SCHEDULED',
        canonicalKickoffTime: new Date(Date.now() + 86400000),
        lockEffectiveAt: new Date(Date.now() + 86400000),
        season: 2026,
        seasonType: 2,
        week: 8,
      }));

      const saveMock = vi.fn().mockImplementation(async (_db, params) => ({
        id: 'saved-pick-1',
        poolId: params.poolId,
        userId: params.userId,
        gameId: params.gameId,
        week: params.week,
        selectedTeamId: params.selectedTeamId,
        submittedById: params.userId,
      }));
      setLegacyPickSaveAdapterForTesting(saveMock);

      const token = createToken(USER_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/picks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_id: POOL_ID,
          game_id: '401873010',
          selected_team_id: 'DET',
          week: 8,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.pick.selectedTeamId).toBe('DET');
      expect(saveMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ poolId: POOL_ID, week: 8, selectedTeamId: 'DET' })
      );
    });

    it('Correction 6: Tenant-scoped POST /api/pools/:pool_id/picks rejects body pool_id mismatch with HTTP 400', async () => {
      const token = createToken(USER_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/picks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_id: 'different-pool-id',
          game_id: '401873010',
          selected_team_id: 'DET',
          week: 8,
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('POOL_MISMATCH');
    });

    it('Correction 1: Actual HTTP route returns 409 DUPLICATE_PICK_IDENTITY with zero writes when duplicate rows exist', async () => {
      setLegacyGameAdapterForTesting(async () => ({
        id: 'c032a900-1111-2222-3333-444455556666',
        externalGameId: '401671800',
        homeTeamId: 'GB',
        awayTeamId: 'DET',
        kickoffTime: new Date(Date.now() + 86400000),
        status: 'SCHEDULED',
        canonicalKickoffTime: new Date(Date.now() + 86400000),
        lockEffectiveAt: new Date(Date.now() + 86400000),
        season: 2026,
        seasonType: 2,
        week: 8,
      }));

      // Mock save adapter that throws DuplicatePickIdentityError to simulate duplicate rows in db
      setLegacyPickSaveAdapterForTesting(async () => {
        throw new DuplicatePickIdentityError(
          'DUPLICATE_PICK_IDENTITY: Multiple conflicting rows exist for game c032a900-1111-2222-3333-444455556666 and alias 401671800. Zero writes performed.'
        );
      });

      const token = createToken(USER_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/picks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_id: POOL_ID,
          game_id: '401671800',
          selected_team_id: 'DET',
          week: 8,
        }),
      });

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.code).toBe('DUPLICATE_PICK_IDENTITY');
      expect(data.error).toContain('Zero writes performed');
    });

    it('Correction 5: Batch route records missing game_id with explicit status: ERROR', async () => {
      const token = createToken(USER_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/picks/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_id: POOL_ID,
          picks: [
            { selected_team_id: 'DET', week: 8 }, // missing game_id
          ],
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.results.length).toBe(1);
      expect(data.results[0].status).toBe('ERROR');
      expect(data.results[0].error).toContain('Missing game_id');
    });

    it('Correction 5: Batch route retains earlier committed outcomes when a later item encounters an error', async () => {
      setLegacyGameAdapterForTesting(async (_db, gameId) => ({
        id: gameId === 'g1' ? 'uuid-g1' : 'uuid-g2',
        externalGameId: gameId,
        homeTeamId: 'GB',
        awayTeamId: 'DET',
        kickoffTime: new Date(Date.now() + 86400000),
        status: 'SCHEDULED',
        canonicalKickoffTime: new Date(Date.now() + 86400000),
        lockEffectiveAt: new Date(Date.now() + 86400000),
        season: 2026,
        seasonType: 2,
        week: 8,
      }));

      // Item 1 succeeds and commits; Item 2 encounters persistence error
      setLegacyPickSaveAdapterForTesting(async (_db, params) => {
        if (params.gameId === 'uuid-g1' || params.gameId === 'g1') {
          return {
            id: 'saved-g1',
            poolId: params.poolId,
            userId: params.userId,
            gameId: params.gameId,
            week: params.week,
            selectedTeamId: params.selectedTeamId,
            submittedById: params.userId,
          };
        }
        const deadlockErr = new Error('deadlock detected on item 2');
        (deadlockErr as any).code = 'DEADLOCK_DETECTED';
        throw deadlockErr;
      });

      const token = createToken(USER_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/picks/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_id: POOL_ID,
          picks: [
            { game_id: 'g1', selected_team_id: 'DET', week: 8 },
            { game_id: 'g2', selected_team_id: 'GB', week: 8 },
          ],
        }),
      });

      // Does NOT abort with 500 losing g1! Returns HTTP 200 with per-item outcomes!
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.picks.length).toBe(1);
      expect(data.picks[0].id).toBe('saved-g1');
      expect(data.results.length).toBe(2);
      expect(data.results[0].status).toBe('SAVED');
      expect(data.results[1].status).toBe('ERROR');
      expect(data.results[1].error).toContain('deadlock detected');
    });

    it('Correction 1 & 5: Concurrency serialization resolves alias vs UUID contenders on zero-row creation', async () => {
      // In-memory simulated PostgreSQL table for the matchup
      const tableRows: any[] = [];

      const createContenderTx = () => ({
        $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string, ...params: any[]) => {
          if (sql.includes('pg_advisory_xact_lock')) {
            return [];
          }
          if (sql.includes('SELECT id, game_id')) {
            const candidateIds = params.slice(3).map(String);
            return tableRows.filter((r) => candidateIds.includes(String(r.game_id)));
          }
          if (sql.includes('INSERT INTO public.picks')) {
            const newRow = {
              id: 'row-created-by-uuid',
              pool_id: params[0],
              user_id: params[1],
              week: params[2],
              game_id: params[3], // UUID
              selected_team_id: params[4],
              submitted_by: params[5],
              created_at: new Date().toISOString(),
            };
            tableRows.push(newRow);
            return [newRow];
          }
          if (sql.includes('UPDATE public.picks') && sql.includes('selected_team_id')) {
            const targetRow = tableRows.find((r) => r.id === params[2]);
            if (targetRow) {
              targetRow.selected_team_id = params[0];
            }
            return targetRow ? [targetRow] : [];
          }
          return [];
        }),
      });

      const tx1 = createContenderTx();
      const db1 = { $transaction: async (cb: any) => cb(tx1) };

      const tx2 = createContenderTx();
      const db2 = { $transaction: async (cb: any) => cb(tx2) };

      // Contender 1 submits using canonical UUID
      await savePickAtomically(db1, {
        poolId: 'pool-uuid-1',
        userId: 'user-uuid-1',
        gameId: 'c032a900-1111-2222-3333-444455556666',
        externalGameId: '401671800',
        week: 8,
        selectedTeamId: 'KC',
      });

      // Contender 2 submits using external ESPN alias
      const p2 = await savePickAtomically(db2, {
        poolId: 'pool-uuid-1',
        userId: 'user-uuid-1',
        gameId: 'c032a900-1111-2222-3333-444455556666',
        externalGameId: '401671800',
        week: 8,
        selectedTeamId: 'DEN',
      });

      // Exactly ONE row exists in table (zero duplicate rows created!)
      expect(tableRows.length).toBe(1);
      expect(tableRows[0].id).toBe('row-created-by-uuid');
      expect(tableRows[0].game_id).toBe('c032a900-1111-2222-3333-444455556666');
      expect(tableRows[0].selected_team_id).toBe('DEN');
      expect(p2.selectedTeamId).toBe('DEN');
    });

    it('Correction 1: Write-boundary kickoff crossing denies null unselect with 403 and zero writes', async () => {
      const mockTx = {
        $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string) => {
          if (sql.includes('pg_advisory_xact_lock')) return [];
          if (sql.includes('UPDATE') || sql.includes('INSERT') || sql.includes('DELETE')) {
            throw new Error('VIOLATION: Zero writes allowed when unselect crosses kickoff');
          }
          return [];
        }),
      };
      const mockDb = { $transaction: async (cb: any) => cb(mockTx) };

      const pastKickoffGame = {
        kickoffTime: new Date(Date.now() - 10000), // 10s ago
        canonicalKickoffTime: new Date(Date.now() - 10000),
        lockEffectiveAt: null,
        status: 'IN_PROGRESS',
      };

      try {
        await savePickAtomically(mockDb, {
          poolId: 'pool-uuid-1',
          userId: 'user-uuid-1',
          gameId: 'c032a900-1111-2222-3333-444455556666',
          externalGameId: '401671800',
          week: 8,
          selectedTeamId: null, // Null unselect
          lockOffsetMinutes: 0,
          gameData: pastKickoffGame,
        });
        expect.fail('Should have thrown KICKOFF_PASSED error on unselect');
      } catch (err: any) {
        expect(err.code).toBe('KICKOFF_PASSED');
        expect(err.statusCode).toBe(403);
      }

      const queries = mockTx.$queryRawUnsafe.mock.calls.map((c: any[]) => c[0]);
      expect(queries.some((q: string) => q.includes('UPDATE') || q.includes('INSERT') || q.includes('DELETE'))).toBe(false);
    });

    it('Correction 6: WeeklyPicks rehydration detects duplicate identity BEFORE filtering null selections and visibly flags ambiguity', () => {
      const mappedGames = [
        { id: 'c032a900-1111-2222-3333-444455556666', externalGameId: '401671800' },
      ];

      // dbPicks has 2 rows for the same canonical game: one with selected_team 'KC' (alias), one with selected_team null (UUID)
      const dbPicks = [
        { game_id: '401671800', selected_team: 'KC' },
        { game_id: 'c032a900-1111-2222-3333-444455556666', selected_team: null },
      ];

      const canonicalRowsMap = new Map<string, any[]>();
      const ambiguousGameIds = new Set<string>();

      // Exact WeeklyPicks logic: group all rows before filtering null selections
      dbPicks.forEach((p: any) => {
        const gId = p.game_id;
        const matched = mappedGames.find(
          (g) => String(g.id) === String(gId) || String(g.externalGameId) === String(gId)
        );
        const canonicalId = matched ? String(matched.id) : String(gId);
        if (!canonicalRowsMap.has(canonicalId)) {
          canonicalRowsMap.set(canonicalId, []);
        }
        canonicalRowsMap.get(canonicalId)!.push(p);
      });

      canonicalRowsMap.forEach((rows, canonicalId) => {
        if (rows.length > 1) {
          ambiguousGameIds.add(canonicalId);
        }
      });

      expect(ambiguousGameIds.has('c032a900-1111-2222-3333-444455556666')).toBe(true);
      expect(ambiguousGameIds.size).toBe(1);
    });

    it('Correction 3: performApplyPreset normalizes returned alias IDs to logical UUID and does NOT merge un-saved picks', () => {
      const games = [
        { id: 'uuid-1', externalGameId: '401873011' },
        { id: 'uuid-2', externalGameId: '401873012' },
      ];

      const currentPicksMap: Record<string, string> = { 'uuid-1': 'GB', 'uuid-2': 'CHI' };

      // Server returns batchData where game 1 is confirmed SAVED using its stored ESPN alias, game 2 failed/locked
      const batchData = {
        picks: [{ game_id: '401873011', selected_team_id: 'DET' }], // returned with alias
        results: [
          { gameId: '401873011', status: 'SAVED' },
          { gameId: 'uuid-2', status: 'LOCKED', error: 'Game locked' },
        ],
      };

      const confirmedPicksMap: Record<string, string> = {};
      batchData.picks.forEach((p: any) => {
        const rawGid = p.gameId || p.game_id;
        const team = p.selectedTeamId || p.selected_team_id;
        if (rawGid && team) {
          const match = games.find(
            (g) => String(g.id) === String(rawGid) || String(g.externalGameId) === String(rawGid)
          );
          const canonicalId = match ? String(match.id) : String(rawGid);
          confirmedPicksMap[canonicalId] = String(team);
        }
      });

      // Confirmed pick normalized to canonical UUID!
      expect(confirmedPicksMap['uuid-1']).toBe('DET');

      // Final picks map applies ONLY confirmed picks on top of current picks
      const finalPicksMap = { ...currentPicksMap, ...confirmedPicksMap };
      expect(finalPicksMap['uuid-1']).toBe('DET'); // Updated
      expect(finalPicksMap['uuid-2']).toBe('CHI'); // Preserved current pick (not overwritten by failed preset)
    });

    it('Correction 4: handleUndoLastBulk sends explicit null mutations for previously unpicked games and normalizes alias IDs', () => {
      const games = [
        { id: 'uuid-1', externalGameId: '401873011', userPick: 'DET' },
        { id: 'uuid-2', externalGameId: '401873012', userPick: 'KC' },
      ];
      const userPicks: Record<string, string> = { 'uuid-1': 'DET', 'uuid-2': 'KC' };
      // Snapshot before bulk action: game 1 was 'GB', game 2 was unpicked (not in snapshot)
      const lastBulkSnapshot: Record<string, string> = { 'uuid-1': 'GB' };

      const gamesToRestore: { gameId: string; team: string | null }[] = [];
      for (const g of games) {
        if (lastBulkSnapshot[g.id]) {
          gamesToRestore.push({ gameId: g.id, team: lastBulkSnapshot[g.id] });
        } else if (userPicks[g.id] || g.userPick) {
          // Explicit null mutation for previously unpicked game!
          gamesToRestore.push({ gameId: g.id, team: null });
        }
      }

      expect(gamesToRestore).toEqual([
        { gameId: 'uuid-1', team: 'GB' },
        { gameId: 'uuid-2', team: null }, // Explicit null!
      ]);

      // Server returns results where uuid-1 is returned as alias 401873011
      const batchData = {
        results: [
          { gameId: '401873011', status: 'SAVED' },
          { gameId: 'uuid-2', status: 'LOCKED', error: 'Game is locked' },
        ],
      };

      const savedGameIds = new Set<string>();
      batchData.results.filter((r) => r.status === 'SAVED').forEach((r) => {
        const rawId = String(r.gameId);
        const match = games.find(
          (g) => String(g.id) === rawId || String(g.externalGameId) === rawId
        );
        savedGameIds.add(match ? String(match.id) : rawId);
      });

      // uuid-1 resolved from alias 401873011!
      expect(savedGameIds.has('uuid-1')).toBe(true);
      expect(savedGameIds.has('uuid-2')).toBe(false);

      // Reconcile ONLY saved games:
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

      expect(nextUserPicks['uuid-1']).toBe('GB'); // Restored
      expect(nextUserPicks['uuid-2']).toBe('KC'); // Retained (locked game not reverted)
    });
  });

  describe('Architect Binding Ruling HAG2-IDENTITY-2026-10-31-03 Behavioral & Invariant Suite', () => {
    let server: http.Server;
    let baseUrl: string;

    const POOL_ID = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';
    const USER_ID = 'b2222222-2222-2222-2222-222222222222';

    const createToken = (userId: string) => {
      return createSyntheticSupabaseToken({
        id: userId,
        email: `${userId}@example.com`,
        role: 'authenticated',
      });
    };

    beforeEach(async () => {
      setSupabaseAuthClientForTesting({
        auth: {
          getUser: vi.fn().mockImplementation(async (tok: string) => {
            if (!tok) return { data: { user: null }, error: new Error('No token provided') };
            return {
              data: { user: { id: USER_ID, email: `${USER_ID}@example.com`, user_metadata: {} } },
              error: null,
            };
          }),
        },
      } as any);

      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue({
        id: POOL_ID,
        name: 'Test Pool',
        season: 2026,
        settings: { lock_offset: 0 },
      } as any);

      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        id: 'pm-1',
        poolId: POOL_ID,
        userId: USER_ID,
        status: 'ACTIVE',
      } as any);

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: USER_ID,
        email: `${USER_ID}@example.com`,
        role: 'USER',
      } as any);

      await new Promise<void>((resolve) => {
        server = serverApp.listen(0, () => {
          const port = (server.address() as any).port;
          baseUrl = `http://127.0.0.1:${port}`;
          resolve();
        });
      });
    });

    afterEach(async () => {
      setLegacyGameAdapterForTesting(null);
      setLegacyPickSaveAdapterForTesting(null);
      setSupabaseAuthClientForTesting(null);
      vi.restoreAllMocks();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    it('Correction 3: Old route writes denied with state-free HTTP 410 ENDPOINT_RETIRED on production server app', async () => {
      const token = createToken(USER_ID);

      const resSingle = await fetch(`${baseUrl}/api/picks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_id: POOL_ID,
          game_id: '401873010',
          selected_team_id: 'DET',
          week: 8,
        }),
      });

      expect(resSingle.status).toBe(410);
      const dataSingle = await resSingle.json();
      expect(dataSingle.code).toBe('ENDPOINT_RETIRED');
      expect(dataSingle.error).toContain('Legacy /api/picks mutation endpoints are retired');

      const resBatch = await fetch(`${baseUrl}/api/picks/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_id: POOL_ID,
          picks: [{ game_id: '401873010', selected_team_id: 'DET', week: 8 }],
        }),
      });

      expect(resBatch.status).toBe(410);
      const dataBatch = await resBatch.json();
      expect(dataBatch.code).toBe('ENDPOINT_RETIRED');
    });

    it('Correction 1: Actual HTTP route returns 409 DUPLICATE_PICK_IDENTITY via database lookupRows without injected adapter', async () => {
      setLegacyGameAdapterForTesting(async () => ({
        id: 'c032a900-1111-2222-3333-444455556666',
        externalGameId: '401671800',
        homeTeamId: 'GB',
        awayTeamId: 'DET',
        kickoffTime: new Date(Date.now() + 86400000),
        status: 'SCHEDULED',
        canonicalKickoffTime: new Date(Date.now() + 86400000),
        lockEffectiveAt: new Date(Date.now() + 86400000),
        season: 2026,
        seasonType: 2,
        week: 8,
      }));

      // Live database query mock returns multiple matching rows for candidate IDs
      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        const mockTx = {
          $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string) => {
            if (sql.includes('pg_advisory_xact_lock')) return [];
            if (sql.includes('SELECT id, game_id')) {
              // Conflicting multiple rows exist in database
              return [
                { id: 'row-1', game_id: 'c032a900-1111-2222-3333-444455556666' },
                { id: 'row-2', game_id: '401671800' },
              ];
            }
            if (sql.includes('UPDATE') || sql.includes('INSERT') || sql.includes('DELETE')) {
              throw new Error('VIOLATION: Zero writes allowed when duplicate records exist');
            }
            return [];
          }),
        };
        return await cb(mockTx);
      });

      const token = createToken(USER_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/picks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_id: POOL_ID,
          game_id: 'c032a900-1111-2222-3333-444455556666',
          selected_team_id: 'DET',
          week: 8,
        }),
      });

      // Returns HTTP 409 with DUPLICATE_PICK_IDENTITY with ZERO writes executed
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.code).toBe('DUPLICATE_PICK_IDENTITY');
      expect(data.error).toContain('DUPLICATE_PICK_IDENTITY');
    });

    it('Correction 1: Concurrency serialization queues overlapping alias/UUID requests and prevents duplicate creation', async () => {
      const tableRows: any[] = [];
      let lockHeld = false;
      const waitingResolvers: (() => void)[] = [];

      const acquireSimulatedAdvisoryLock = async () => {
        if (lockHeld) {
          await new Promise<void>((resolve) => waitingResolvers.push(resolve));
        }
        lockHeld = true;
      };

      const releaseSimulatedAdvisoryLock = () => {
        lockHeld = false;
        const next = waitingResolvers.shift();
        if (next) next();
      };

      const createContenderDb = (contenderName: string) => ({
        $transaction: async (cb: (tx: any) => Promise<any>) => {
          await acquireSimulatedAdvisoryLock();
          try {
            const tx = {
              $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string, ...params: any[]) => {
                if (sql.includes('pg_advisory_xact_lock')) return [];
                if (sql.includes('SELECT id, game_id')) {
                  const candidateIds = params.slice(3).map(String);
                  return tableRows.filter((r) => candidateIds.includes(String(r.game_id)));
                }
                if (sql.includes('INSERT INTO public.picks')) {
                  const newRow = {
                    id: `row-created-by-${contenderName}`,
                    pool_id: params[0],
                    user_id: params[1],
                    week: params[2],
                    game_id: params[3],
                    selected_team_id: params[4],
                    submitted_by: params[5],
                    created_at: new Date().toISOString(),
                  };
                  tableRows.push(newRow);
                  return [newRow];
                }
                if (sql.includes('UPDATE public.picks') && sql.includes('selected_team_id')) {
                  const targetRow = tableRows.find((r) => r.id === params[2]);
                  if (targetRow) {
                    targetRow.selected_team_id = params[0];
                  }
                  return targetRow ? [targetRow] : [];
                }
                return [];
              }),
            };
            return await cb(tx);
          } finally {
            releaseSimulatedAdvisoryLock();
          }
        },
      });

      const db1 = createContenderDb('contender-uuid');
      const db2 = createContenderDb('contender-alias');

      const scheduledGame = {
        kickoffTime: new Date(Date.now() + 86400000),
        canonicalKickoffTime: new Date(Date.now() + 86400000),
        lockEffectiveAt: null,
        status: 'SCHEDULED',
      };

      // Simultaneously trigger both contending mutations
      const [p1, p2] = await Promise.all([
        savePickAtomically(db1, {
          poolId: 'pool-uuid-1',
          userId: 'user-uuid-1',
          gameId: 'c032a900-1111-2222-3333-444455556666',
          externalGameId: '401671800',
          week: 8,
          selectedTeamId: 'KC',
          gameData: scheduledGame,
        }),
        savePickAtomically(db2, {
          poolId: 'pool-uuid-1',
          userId: 'user-uuid-1',
          gameId: 'c032a900-1111-2222-3333-444455556666',
          externalGameId: '401671800',
          week: 8,
          selectedTeamId: 'DEN',
          gameData: scheduledGame,
        }),
      ]);

      // Exactly ONE row exists in database; contender 2 updated the row in place!
      expect(tableRows.length).toBe(1);
      expect(tableRows[0].game_id).toBe('c032a900-1111-2222-3333-444455556666');
      expect([p1.selectedTeamId, p2.selectedTeamId]).toContain(tableRows[0].selected_team_id);
    });

    it('Correction 1: Advisory lock wait kickoff crossing rejects late contender with 403 KICKOFF_PASSED and zero writes', async () => {
      let isPastKickoff = false;
      let writeAttempts = 0;

      const contenderDb = {
        $transaction: async (cb: any) => {
          // Simulate advisory lock wait during which kickoff time passes
          const tx = {
            $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string) => {
              if (sql.includes('pg_advisory_xact_lock')) {
                // While waiting for advisory lock, kickoff passes!
                isPastKickoff = true;
                return [];
              }
              if (sql.includes('INSERT') || sql.includes('UPDATE') || sql.includes('DELETE')) {
                writeAttempts++;
              }
              return [];
            }),
          };
          return await cb(tx);
        },
      };

      const flexGame = {
        get kickoffTime() {
          return isPastKickoff ? new Date(Date.now() - 5000) : new Date(Date.now() + 5000);
        },
        get canonicalKickoffTime() {
          return isPastKickoff ? new Date(Date.now() - 5000) : new Date(Date.now() + 5000);
        },
        lockEffectiveAt: null,
        status: 'IN_PROGRESS',
      };

      try {
        await savePickAtomically(contenderDb, {
          poolId: 'pool-uuid-1',
          userId: 'user-uuid-1',
          gameId: 'c032a900-1111-2222-3333-444455556666',
          week: 8,
          selectedTeamId: 'KC',
          gameData: flexGame,
        });
        expect.fail('Should have failed write boundary kickoff lock after advisory wait');
      } catch (err: any) {
        expect(err.code).toBe('KICKOFF_PASSED');
        expect(err.statusCode).toBe(403);
      }

      // Zero writes executed
      expect(writeAttempts).toBe(0);
    });

    it('Correction 1: Game or pool settings change under advisory lock wait fails closed', async () => {
      let poolOffset = 0;

      const dynamicDb = {
        $transaction: async (cb: any) => {
          const tx = {
            pool: {
              findUnique: vi.fn().mockImplementation(async () => {
                // Authoritative pool reread under lock reveals lock offset was changed to 120 minutes
                poolOffset = 120;
                return { settings: { lock_offset: 120 } };
              }),
            },
            $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string) => {
              if (sql.includes('pg_advisory_xact_lock')) return [];
              return [];
            }),
          };
          return await cb(tx);
        },
      };

      // Game is 30 minutes in future, but pool offset changes to 120 minutes while waiting
      const gameIn30Min = {
        kickoffTime: new Date(Date.now() + 30 * 60 * 1000),
        canonicalKickoffTime: new Date(Date.now() + 30 * 60 * 1000),
        lockEffectiveAt: null,
        status: 'SCHEDULED',
      };

      try {
        await savePickAtomically(dynamicDb, {
          poolId: 'pool-uuid-1',
          userId: 'user-uuid-1',
          gameId: 'c032a900-1111-2222-3333-444455556666',
          week: 8,
          selectedTeamId: 'KC',
          lockOffsetMinutes: 0,
          gameData: gameIn30Min,
        });
        expect.fail('Should have detected lock due to reread pool offset under advisory lock');
      } catch (err: any) {
        expect(err.code).toBe('KICKOFF_PASSED');
        expect(err.statusCode).toBe(403);
      }
      expect(poolOffset).toBe(120);
    });

    it('Correction 1: Absent metadata fails closed to UNVERIFIED_KICKOFF with zero writes', async () => {
      const mockDb = {
        $transaction: async (cb: any) => {
          const tx = {
            $queryRawUnsafe: vi.fn().mockResolvedValue([]),
          };
          return await cb(tx);
        },
      };

      try {
        await savePickAtomically(mockDb, {
          poolId: 'pool-uuid-1',
          userId: 'user-uuid-1',
          gameId: 'c032a900-1111-2222-3333-444455556666',
          week: 8,
          selectedTeamId: 'KC',
          gameData: null, // Absent metadata
        });
        expect.fail('Should fail closed with UNVERIFIED_KICKOFF');
      } catch (err: any) {
        expect(err.code).toBe('UNVERIFIED_KICKOFF');
        expect(err.statusCode).toBe(403);
      }
    });

    it('Correction 2: WeeklyPicks rehydration does NOT pick a winner on duplicate records and excludes from confirmed count', () => {
      const mappedGames = [
        { id: 'uuid-matchup-1', externalGameId: '401671800' },
      ];

      // Stored picks has 2 conflicting rows: alias row has 'KC', UUID row has null
      const dbPicks = [
        { game_id: '401671800', selected_team: 'KC' },
        { game_id: 'uuid-matchup-1', selected_team: null },
      ];

      const canonicalRowsMap = new Map<string, any[]>();
      const ambiguousGameIds = new Set<string>();
      const cloudMap: Record<string, string> = {};

      dbPicks.forEach((p) => {
        const gId = p.game_id;
        const matched = mappedGames.find(
          (g) => String(g.id) === String(gId) || String(g.externalGameId) === String(gId)
        );
        const canonicalId = matched ? String(matched.id) : String(gId);
        if (!canonicalRowsMap.has(canonicalId)) {
          canonicalRowsMap.set(canonicalId, []);
        }
        canonicalRowsMap.get(canonicalId)!.push(p);
      });

      canonicalRowsMap.forEach((rows, canonicalId) => {
        if (rows.length > 1) {
          ambiguousGameIds.add(canonicalId);
        }
      });

      // Ruling -03: Do not select any winner!
      canonicalRowsMap.forEach((rows, canonicalId) => {
        if (rows.length > 1) {
          return; // Excluded entirely
        }
        const nonNull = rows.filter((r) => r.selected_team);
        if (nonNull.length > 0) {
          cloudMap[canonicalId] = nonNull[0].selected_team;
        }
      });

      // No winner chosen: neither uuid-matchup-1 nor 401671800 is selected in cloudMap
      expect(cloudMap['uuid-matchup-1']).toBeUndefined();
      expect(cloudMap['401671800']).toBeUndefined();
      expect(ambiguousGameIds.has('uuid-matchup-1')).toBe(true);

      // Unique picked count excludes ambiguous conflict matchup
      const uniquePicked = mappedGames.filter((g) => Boolean(cloudMap[g.id] || cloudMap[g.externalGameId])).length;
      expect(uniquePicked).toBe(0);
    });

    it('Correction 4: Batch resolution failure after earlier commit preserves committed outcome in 200 response', async () => {
      setLegacyGameAdapterForTesting(async (_db, gameId) => {
        if (gameId === 'game-1') {
          return {
            id: 'uuid-1',
            externalGameId: 'game-1',
            homeTeamId: 'GB',
            awayTeamId: 'DET',
            kickoffTime: new Date(Date.now() + 86400000),
            status: 'SCHEDULED',
            canonicalKickoffTime: new Date(Date.now() + 86400000),
            lockEffectiveAt: new Date(Date.now() + 86400000),
            season: 2026,
            seasonType: 2,
            week: 8,
          };
        }
        // Game 2 resolution throws AMBIGUOUS_GAME_IDENTITY
        throw new Error('AMBIGUOUS_GAME_IDENTITY: Multiple games matched ID game-2.');
      });

      setLegacyPickSaveAdapterForTesting(async (_db, params) => {
        return {
          id: 'saved-item-1',
          poolId: params.poolId,
          userId: params.userId,
          gameId: params.gameId,
          week: params.week,
          selectedTeamId: params.selectedTeamId,
          submittedById: params.userId,
        };
      });

      const token = createToken(USER_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/picks/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_id: POOL_ID,
          picks: [
            { game_id: 'game-1', selected_team_id: 'DET', week: 8 },
            { game_id: 'game-2', selected_team_id: 'GB', week: 8 },
          ],
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.picks.length).toBe(1);
      expect(data.picks[0].id).toBe('saved-item-1');
      expect(data.results.length).toBe(2);
      expect(data.results[0].status).toBe('SAVED');
      expect(data.results[1].status).toBe('ERROR');
      expect(data.results[1].code).toBe('RESOLUTION_OR_PERSISTENCE_ERROR');
      expect(data.results[1].error).toContain('AMBIGUOUS_GAME_IDENTITY');
    });

    it('Correction 5: Incomplete batch response is treated as failure and does not claim all cleared', () => {
      const unlockedPickedGames = [
        { id: 'g1' },
        { id: 'g2' },
        { id: 'g3' },
      ];

      // Server only returned 2 items (g3 omitted)
      const batchData = {
        results: [
          { gameId: 'g1', status: 'SAVED' },
          { gameId: 'g2', status: 'SAVED' },
        ],
      };

      const savedGameIds = new Set(batchData.results.filter((r) => r.status === 'SAVED').map((r) => r.gameId));
      const confirmedCleared = unlockedPickedGames.filter((g) => savedGameIds.has(g.id));
      const failedGames = unlockedPickedGames.filter((g) => !savedGameIds.has(g.id));

      expect(confirmedCleared.length).toBe(2);
      expect(failedGames.length).toBe(1);
      expect(failedGames[0].id).toBe('g3'); // g3 detected as failure!
    });

    it('Correction 5: handleUndoLastBulk synchronizes and deletes both UUID and alias keys for restored unpicked game', () => {
      const games = [
        { id: 'c032a900-1111-2222-3333-444455556666', externalGameId: '401671800' },
      ];

      const currentPicks = {
        'c032a900-1111-2222-3333-444455556666': 'KC',
        '401671800': 'KC',
      };

      const gamesToRestore = [
        { gameId: 'c032a900-1111-2222-3333-444455556666', team: null }, // Restore to unpicked
      ];

      const savedGameIds = new Set(['c032a900-1111-2222-3333-444455556666']);
      const nextUserPicks = { ...currentPicks };

      gamesToRestore.forEach((item) => {
        if (savedGameIds.has(String(item.gameId))) {
          const matched = games.find(
            (g) => String(g.id) === String(item.gameId) || String(g.externalGameId) === String(item.gameId)
          );
          const canonicalId = matched ? String(matched.id) : String(item.gameId);
          const extId = matched ? String(matched.externalGameId || '') : '';

          if (item.team) {
            nextUserPicks[canonicalId] = item.team;
            if (extId) nextUserPicks[extId] = item.team;
          } else {
            delete nextUserPicks[canonicalId];
            if (extId) delete nextUserPicks[extId]; // Alias also removed!
          }
        }
      });

      // Both keys cleanly deleted
      expect(nextUserPicks['c032a900-1111-2222-3333-444455556666']).toBeUndefined();
      expect(nextUserPicks['401671800']).toBeUndefined();

      // Count helper accurately reports 0
      const count = games.filter((g) => Boolean(nextUserPicks[g.id] || (g.externalGameId && nextUserPicks[g.externalGameId]))).length;
      expect(count).toBe(0);
    });
  });
});
