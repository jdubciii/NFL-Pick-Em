import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import http from 'http';
import { picksRouter, setLegacyGameAdapterForTesting, setLegacyPickSaveAdapterForTesting } from '../src/routes/picks';
import { adminRouter } from '../src/routes/admin';
import prisma from '../src/db/client';
import {
  setSupabaseAuthClientForTesting,
  createSyntheticSupabaseToken,
} from '../src/middleware/auth';
import { GameStatus } from '@prisma/client';

describe('Trial Workstream: Pick Validation & Non-Participant Rejection', () => {
  const POOL_ID = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';
  const ADMIN_ID = 'a1111111-1111-1111-1111-111111111111';
  const MEMBER_ID = 'b2222222-2222-2222-2222-222222222222';

  let app: express.Application;
  let server: http.Server;
  let baseUrl: string;

  const createAuthToken = (userId: string, role = 'USER') => {
    return createSyntheticSupabaseToken({ id: userId, email: `${userId}@example.com`, role });
  };

  const futureKickoff = new Date(Date.now() + 86400000);
  const pastKickoff = new Date(Date.now() - 3600000);

  const mockPool = {
    id: POOL_ID,
    name: 'Main League',
    adminId: ADMIN_ID,
    settings: { lock_offset: 0 },
    status: 'ACTIVE',
  };

  // WAS @ SF (Home: SF, Away: WAS)
  const mockWasAtSfGame = {
    id: 'g-was-sf-uuid',
    externalGameId: '401873008',
    homeTeamId: 'SF',
    awayTeamId: 'WAS',
    kickoffTime: futureKickoff,
    status: GameStatus.SCHEDULED,
    homeScore: null,
    awayScore: null,
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

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

    (vi.spyOn(prisma.user, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      return {
        id: where.id,
        email: `${where.id}@example.com`,
        role: where.id === ADMIN_ID ? 'ADMIN' : 'USER',
        createdAt: new Date(),
      };
    });

    setLegacyGameAdapterForTesting(async (_db, gameId) => {
      const g = mockWasAtSfGame;
      if (gameId !== g.externalGameId && gameId !== g.id) return null;
      return {
        id: g.id,
        externalGameId: g.externalGameId,
        homeTeamId: g.homeTeamId,
        awayTeamId: g.awayTeamId,
        kickoffTime: g.kickoffTime,
        status: g.status,
        canonicalKickoffTime: g.kickoffTime,
        lockEffectiveAt: g.kickoffTime,
        season: 2026,
        seasonType: 2,
        week: 6,
      };
    });

    app = express();
    app.use(express.json());
    app.use('/api/picks', picksRouter);
    app.use('/api/admin', adminRouter);

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

  describe('POST /api/picks - Participant Validation (Decision #55: Fail-Closed)', () => {
    it('rejects pick when selected team is NOT playing in the game (e.g. DET for WAS @ SF)', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findFirst').mockResolvedValue(mockWasAtSfGame as any);

      const token = createAuthToken(MEMBER_ID);
      const res = await fetch(`${baseUrl}/api/picks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_id: POOL_ID,
          game_id: '401873008',
          selected_team_id: 'DET', // DET is neither SF nor WAS!
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Selected team 'DET' is not a participant in this game");
    });

    it('rejects pick using selected_team alias when team is not playing in the game', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findFirst').mockResolvedValue(mockWasAtSfGame as any);

      const token = createAuthToken(MEMBER_ID);
      const res = await fetch(`${baseUrl}/api/picks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_id: POOL_ID,
          game_id: '401873008',
          selected_team: 'DET', // alias key selected_team
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Selected team 'DET' is not a participant in this game");
    });

    it('accepts pick for home team (SF) and upserts pick', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findFirst').mockResolvedValue(mockWasAtSfGame as any);

      const upsertMock = vi.fn().mockImplementation(async (_db, params) => ({
        id: 'pick-uuid-1',
        poolId: params.poolId,
        userId: params.userId,
        gameId: params.gameId,
        week: params.week,
        selectedTeamId: params.selectedTeamId,
        submittedById: params.userId,
      }));
      setLegacyPickSaveAdapterForTesting(upsertMock);

      const token = createAuthToken(MEMBER_ID);
      const res = await fetch(`${baseUrl}/api/picks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_id: POOL_ID,
          game_id: '401873008',
          selected_team_id: 'SF',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toBe('Pick saved successfully');
      expect(data.pick.selectedTeamId).toBe('SF');
      expect(upsertMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          selectedTeamId: 'SF',
        })
      );
    });

    it('accepts pick for away team (WAS) and accepts legacy alias WSH normalized to WAS', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findFirst').mockResolvedValue(mockWasAtSfGame as any);

      const upsertMock = vi.fn().mockImplementation(async (_db, params) => ({
        id: 'pick-uuid-2',
        poolId: params.poolId,
        userId: params.userId,
        gameId: params.gameId,
        week: params.week,
        selectedTeamId: params.selectedTeamId,
        submittedById: params.userId,
      }));
      setLegacyPickSaveAdapterForTesting(upsertMock);

      const token = createAuthToken(MEMBER_ID);
      const res = await fetch(`${baseUrl}/api/picks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_id: POOL_ID,
          game_id: '401873008',
          selected_team_id: 'WSH', // legacy alias
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toBe('Pick saved successfully');
      expect(upsertMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          selectedTeamId: 'WAS',
        })
      );
    });

    it('permits clearing a pick before kickoff (null selected team)', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findFirst').mockResolvedValue(mockWasAtSfGame as any);

      const upsertMock = vi.fn().mockImplementation(async (_db, params) => ({
        id: 'pick-uuid-3',
        poolId: params.poolId,
        userId: params.userId,
        gameId: params.gameId,
        week: params.week,
        selectedTeamId: params.selectedTeamId,
        submittedById: params.userId,
      }));
      setLegacyPickSaveAdapterForTesting(upsertMock);

      const token = createAuthToken(MEMBER_ID);
      const res = await fetch(`${baseUrl}/api/picks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_id: POOL_ID,
          game_id: '401873008',
          selected_team_id: null,
        }),
      });

      expect(res.status).toBe(200);
      expect(upsertMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          selectedTeamId: null,
        })
      );
    });

    it('fails closed when game participants cannot be verified', async () => {
      const corruptGame = {
        ...mockWasAtSfGame,
        homeTeamId: '',
        awayTeamId: '',
      };

      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findFirst').mockResolvedValue(corruptGame as any);
      setLegacyGameAdapterForTesting(async () => ({
        ...corruptGame,
        canonicalKickoffTime: corruptGame.kickoffTime,
        lockEffectiveAt: corruptGame.kickoffTime,
        season: 2026,
        seasonType: 2,
        week: 6,
      }));

      const token = createAuthToken(MEMBER_ID);
      const res = await fetch(`${baseUrl}/api/picks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_id: POOL_ID,
          game_id: '401873008',
          selected_team_id: 'SF',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Game participants cannot be verified');
    });

    it('rejects pick modification after kickoff (Decision #66: Kickoff Lock Supremacy)', async () => {
      const lockedGame = {
        ...mockWasAtSfGame,
        kickoffTime: pastKickoff,
        status: GameStatus.IN_PROGRESS,
      };

      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findFirst').mockResolvedValue(lockedGame as any);
      setLegacyGameAdapterForTesting(async () => ({
        ...lockedGame,
        canonicalKickoffTime: lockedGame.kickoffTime,
        lockEffectiveAt: lockedGame.kickoffTime,
        season: 2026,
        seasonType: 2,
        week: 6,
      }));

      const token = createAuthToken(MEMBER_ID);
      const res = await fetch(`${baseUrl}/api/picks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_id: POOL_ID,
          game_id: '401873008',
          selected_team_id: 'SF',
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Game is locked');
    });
  });

  describe('POST /api/picks/batch - Batch Pick Filtering', () => {
    it('skips non-participant picks and processes valid participant picks', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findFirst').mockResolvedValue(mockWasAtSfGame as any);

      const upsertMock = vi.fn().mockImplementation(async (_db, params) => ({
        id: 'pick-uuid-batch',
        poolId: params.poolId,
        userId: params.userId,
        gameId: params.gameId,
        week: params.week,
        selectedTeamId: params.selectedTeamId,
        submittedById: params.userId,
      }));
      setLegacyPickSaveAdapterForTesting(upsertMock);

      const token = createAuthToken(MEMBER_ID);
      const res = await fetch(`${baseUrl}/api/picks/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_id: POOL_ID,
          picks: [
            { game_id: '401873008', selected_team: 'DET' }, // invalid: not in game
            { game_id: '401873008', selected_team: 'SF' },  // valid: home team
          ],
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.count).toBe(1);
      expect(upsertMock).toHaveBeenCalledTimes(1);
      expect(upsertMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          selectedTeamId: 'SF',
        })
      );
    });
  });

  describe('POST /api/admin/picks/override - Commissioner Override Participant Validation', () => {
    it('rejects commissioner override pick when selected team is NOT in the game', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.game, 'findFirst').mockResolvedValue(mockWasAtSfGame as any);

      const token = createAuthToken(ADMIN_ID, 'ADMIN');
      const res = await fetch(`${baseUrl}/api/admin/picks/override`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_id: POOL_ID,
          user_id: MEMBER_ID,
          game_id: '401873008',
          selected_team_id: 'DET',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Selected team 'DET' is not a participant in this game");
    });

    it('accepts commissioner override pick for valid participant and writes audit log', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.game, 'findFirst').mockResolvedValue(mockWasAtSfGame as any);
      vi.spyOn(prisma.pick, 'findUnique').mockResolvedValue(null);

      const upsertMock = vi.fn().mockResolvedValue({
        id: 'pick-admin-override',
        poolId: POOL_ID,
        userId: MEMBER_ID,
        gameId: mockWasAtSfGame.id,
        selectedTeamId: 'SF',
        submittedById: ADMIN_ID,
      });

      const auditMock = vi.fn().mockResolvedValue({ id: 'audit-log-1' });

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          pick: { upsert: upsertMock },
          pickResult: { upsert: vi.fn() },
          auditLog: { create: auditMock },
        });
      });

      const token = createAuthToken(ADMIN_ID, 'ADMIN');
      const res = await fetch(`${baseUrl}/api/admin/picks/override`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_id: POOL_ID,
          user_id: MEMBER_ID,
          game_id: '401873008',
          selected_team_id: 'SF',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toBe('Pick successfully updated by admin.');
      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ selectedTeamId: 'SF', submittedById: ADMIN_ID }),
        })
      );
      expect(auditMock).toHaveBeenCalled();
    });
  });
});
