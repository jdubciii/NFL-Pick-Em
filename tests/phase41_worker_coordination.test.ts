import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  NFL_ADVISORY_LOCK_CLASS_ID,
  NFL_ADVISORY_LOCK_OBJ_ID,
  tryAcquireAdvisoryLock,
} from '../src/services/advisoryLockService';
import {
  tickLiveScorePoller,
  startLiveScorePoller,
  stopLiveScorePoller,
} from '../src/services/liveScorePoller';
import { LiveScoreboardService, LiveGame } from '../src/services/LiveScoreboardService';
import prisma from '../src/db/client';
import { GameStatus } from '@prisma/client';

describe('Phase 41 Worker Coordination: PostgreSQL Advisory Locks & Lifecycle Safety', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    stopLiveScorePoller();
  });

  afterEach(() => {
    stopLiveScorePoller();
    vi.restoreAllMocks();
  });

  describe('1. Advisory Lock Namespace & Protocol', () => {
    it('uses designated 32-bit namespace pair (4126, 1016)', () => {
      expect(NFL_ADVISORY_LOCK_CLASS_ID).toBe(4126);
      expect(NFL_ADVISORY_LOCK_OBJ_ID).toBe(1016);
    });

    it('returns true when pg_try_advisory_xact_lock returns acquired true', async () => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([{ acquired: true }]),
      } as any;

      const acquired = await tryAcquireAdvisoryLock(mockTx);
      expect(acquired).toBe(true);
      expect(mockTx.$queryRaw).toHaveBeenCalled();
    });

    it('returns false when pg_try_advisory_xact_lock returns acquired false (lock contention)', async () => {
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([{ acquired: false }]),
      } as any;

      const acquired = await tryAcquireAdvisoryLock(mockTx);
      expect(acquired).toBe(false);
    });

    it('fails closed to false when query throws an error', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockTx = {
        $queryRaw: vi.fn().mockRejectedValue(new Error('Connection lost')),
      } as any;

      const acquired = await tryAcquireAdvisoryLock(mockTx);
      expect(acquired).toBe(false);
      warnSpy.mockRestore();
    });
  });

  describe('2. Live Score Poller Contention & Skip Handling', () => {
    it('skips database updates when advisory lock is unavailable', async () => {
      // Mock ESPN returns a live game
      vi.spyOn(LiveScoreboardService, 'fetchLiveScores').mockResolvedValue([
        {
          gameId: 'g1',
          homeTeam: 'DEN',
          awayTeam: 'SEA',
          homeScore: 14,
          awayScore: 21,
          status: 'LIVE',
          period: 3,
          clock: '8:42',
          isLive: true,
          isFinal: false,
        } as LiveGame,
      ]);

      // Mock transaction with lock returning false
      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const mockTx = {
          $queryRaw: vi.fn().mockResolvedValue([{ acquired: false }]),
          game: {
            findMany: vi.fn(),
            update: vi.fn(),
          },
        };
        return callback(mockTx);
      });

      const res = await tickLiveScorePoller();
      expect(res.skipped).toBe(true);
      expect(res.reason).toBe('LOCK_UNAVAILABLE');
      expect(res.updatedCount).toBe(0);
    });

    it('executes updates when advisory lock is acquired and games are in progress', async () => {
      vi.spyOn(LiveScoreboardService, 'fetchLiveScores').mockResolvedValue([
        {
          gameId: 'g1',
          homeTeam: 'DEN',
          awayTeam: 'SEA',
          homeScore: 14,
          awayScore: 21,
          status: 'LIVE',
          period: 3,
          clock: '8:42',
          isLive: true,
          isFinal: false,
        } as LiveGame,
      ]);

      const updateMock = vi.fn().mockResolvedValue({});
      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const mockTx = {
          $queryRaw: vi.fn().mockResolvedValue([{ acquired: true }]),
          game: {
            findMany: vi.fn().mockResolvedValue([
              {
                id: 'game-uuid-1',
                homeTeamId: 'DEN',
                awayTeamId: 'SEA',
                status: GameStatus.SCHEDULED,
              },
            ]),
            update: updateMock,
          },
        };
        return callback(mockTx);
      });

      const res = await tickLiveScorePoller();
      expect(res.skipped).toBe(false);
      expect(res.updatedCount).toBe(1);
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'game-uuid-1' },
          data: expect.objectContaining({
            awayScore: 21,
            homeScore: 14,
            status: GameStatus.IN_PROGRESS,
          }),
        })
      );
    });

    it('preserves FINAL game immutability: refuses to regress FINAL game to IN_PROGRESS', async () => {
      vi.spyOn(LiveScoreboardService, 'fetchLiveScores').mockResolvedValue([
        {
          gameId: 'g1',
          homeTeam: 'DEN',
          awayTeam: 'SEA',
          homeScore: 14,
          awayScore: 21,
          status: 'LIVE',
          period: 4,
          clock: '0:00',
          isLive: true,
          isFinal: false, // Upstream stale response claims still live
        } as LiveGame,
      ]);

      const updateMock = vi.fn().mockResolvedValue({});
      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const mockTx = {
          $queryRaw: vi.fn().mockResolvedValue([{ acquired: true }]),
          game: {
            findMany: vi.fn().mockResolvedValue([
              {
                id: 'game-final-uuid',
                homeTeamId: 'DEN',
                awayTeamId: 'SEA',
                status: GameStatus.FINAL, // Authoritative state is already FINAL
                homeScore: 24,
                awayScore: 27,
              },
            ]),
            update: updateMock,
          },
        };
        return callback(mockTx);
      });

      const res = await tickLiveScorePoller();
      expect(res.skipped).toBe(false);
      expect(res.updatedCount).toBe(0);
      expect(updateMock).not.toHaveBeenCalled(); // Refused regression
    });
  });

  describe('3. Lifecycle Start & Stop Controls', () => {
    it('initializes and clears timers cleanly', () => {
      const clearSpy = vi.spyOn(global, 'clearInterval');
      startLiveScorePoller(100000);
      stopLiveScorePoller();
      expect(clearSpy).toHaveBeenCalled();
    });
  });
});
