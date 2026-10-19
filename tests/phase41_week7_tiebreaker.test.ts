import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import http from 'http';
import { poolTiebreakerRouter, getGamesForWeek } from '../src/routes/poolTiebreakerRoutes';
import { picksRouter } from '../src/routes/picks';
import prisma from '../src/db/client';
import {
  setSupabaseAuthClientForTesting,
  createSyntheticSupabaseToken,
} from '../src/middleware/auth';
import { GameStatus } from '@prisma/client';
import {
  compareTiebreakerPredictions,
  calculateRankingsAndPenalties,
} from '../src/services/tiebreakerRankingService';

describe('Phase 41 Week 7 Tiebreaker Entry, Contract & Privacy Tests (HAG-9)', () => {
  const POOL_ID = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';
  const OTHER_POOL_ID = 'e5748429-738e-464b-8d79-4796c5e09c17';
  const ADMIN_ID = 'a1111111-1111-1111-1111-111111111111';
  const OUTSIDER_ADMIN_ID = 'a9999999-9999-9999-9999-999999999999';
  const MEMBER_1_ID = 'b2222222-2222-2222-2222-222222222222';
  const MEMBER_2_ID = 'c3333333-3333-3333-3333-333333333333';

  let app: express.Application;
  let server: http.Server;
  let baseUrl: string;

  const createAuthToken = (userId: string, role = 'USER') => {
    return createSyntheticSupabaseToken({ id: userId, email: `${userId}@example.com`, role });
  };

  const futureKickoff = new Date(Date.now() + 86400000).toISOString();
  const pastKickoff = new Date(Date.now() - 3600000).toISOString();

  const mockPool = {
    id: POOL_ID,
    name: 'Test Pool 41',
    adminId: ADMIN_ID,
    settings: {
      season: 2026,
      tiebreaker_unavailable_weeks: {
        '2026': {
          '6': true,
        },
      },
    },
  };

  const mockWeek7Games = [
    {
      id: 'g-w7-det',
      externalGameId: '2026_w07_DET_MIN',
      homeTeamId: 'MIN',
      awayTeamId: 'DET',
      kickoffTime: futureKickoff,
      status: GameStatus.SCHEDULED,
    },
    {
      id: 'g-w7-gb',
      externalGameId: '2026_w07_HOU_GB',
      homeTeamId: 'GB',
      awayTeamId: 'HOU',
      kickoffTime: futureKickoff,
      status: GameStatus.SCHEDULED,
    },
  ];

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
        role: where.id === ADMIN_ID || where.id === OUTSIDER_ADMIN_ID ? 'ADMIN' : 'USER',
        createdAt: new Date(),
      };
    });

    app = express();
    app.use(express.json());
    app.use('/api/pools', poolTiebreakerRouter);
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
    setSupabaseAuthClientForTesting(null);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  describe('1. Canonical Pool Route & Membership Authorization', () => {
    it('allows active pool members to read tiebreaker status under /api/pools/:pool_id/tiebreaker', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);
      vi.spyOn(prisma.weeklySubmission, 'findUnique').mockResolvedValue(null);

      const token = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('DEFAULT_LIONS');
      expect(data.tiebreakerOffered).toBe(true);
      expect(data.designatedGame.externalGameId).toBe('2026_w07_DET_MIN');
      expect(data.isLocked).toBe(false);
      expect(data.userPrediction).toBeNull();
    });

    it('denies outsider user lacking active membership with HTTP 403', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue(null); // No membership

      const token = createAuthToken('outsider-user');
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Active pool membership required');
    });

    it('denies outsider global ADMIN who lacks pool membership with HTTP 403 (Decision #20)', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue(null); // Not a member of this pool

      const token = createAuthToken(OUTSIDER_ADMIN_ID, 'ADMIN');
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Active pool membership required');
    });

    it('rejects conflicting pool ID context between URL parameter and body', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);

      const token = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_id: OTHER_POOL_ID, // Mismatched!
          week: 7,
          prediction: 45.0,
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Conflicting pool ID context');
    });

    it('verifies GET is strictly read-only with zero database writes (Decision #54)', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);
      vi.spyOn(prisma.weeklySubmission, 'findUnique').mockResolvedValue(null);

      const poolUpdateSpy = vi.spyOn(prisma.pool, 'update');
      const subUpsertSpy = vi.spyOn(prisma.weeklySubmission, 'upsert');

      const token = createAuthToken(MEMBER_1_ID);
      // Repeated GETs
      await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(poolUpdateSpy).not.toHaveBeenCalled();
      expect(subUpsertSpy).not.toHaveBeenCalled();
    });
  });

  describe('2. Input Range, Numeric Boundaries, and 0 vs Null Distinction', () => {
    it('accepts 0.00 as a valid prediction (not treated as missing)', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);

      const upsertMock = vi.fn().mockImplementation(({ create, update }) => ({
        id: 'sub-zero',
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        weekNumber: 7,
        tieBreakerPrediction: 0,
      }));

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          game: { findFirst: vi.fn().mockResolvedValue(mockWeek7Games[0]) },
          weeklySubmission: { upsert: upsertMock },
          pool: { findUnique: vi.fn().mockResolvedValue(mockPool), update: vi.fn() },
        });
      });

      const token = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          week: 7,
          season: 2026,
          prediction: '0.00',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.prediction).toBe(0);
      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ tieBreakerPrediction: 0 }),
        })
      );
    });

    it('rejects out-of-bounds, negative, excess precision, and non-finite input without silent rounding', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);

      const token = createAuthToken(MEMBER_1_ID);
      const badInputs = ['-0.01', '1000', '1000.00', '48.555', 'NaN', 'Infinity', 'abc'];

      for (const input of badInputs) {
        const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            week: 7,
            season: 2026,
            prediction: input,
          }),
        });

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('INVALID_PREDICTION');
      }
    });
  });

  describe('3. Save, Update, and Clear Lifecycle with Designation Freeze', () => {
    it('freezes designation on first acknowledged prediction and preserves freeze after explicit clear', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);

      let savedSettings: any = null;
      const poolUpdateMock = vi.fn().mockImplementation(({ data }) => {
        savedSettings = data.settings;
        return { ...mockPool, settings: data.settings };
      });

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          game: { findFirst: vi.fn().mockResolvedValue(mockWeek7Games[0]) },
          weeklySubmission: { upsert: vi.fn().mockResolvedValue({ id: 'sub-1', tieBreakerPrediction: 48.5 }) },
          pool: {
            findUnique: vi.fn().mockResolvedValue(savedSettings ? { ...mockPool, settings: savedSettings } : mockPool),
            update: poolUpdateMock,
          },
        });
      });

      const token = createAuthToken(MEMBER_1_ID);

      // 1. Initial Save
      const saveRes = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          week: 7,
          season: 2026,
          prediction: 48.5,
        }),
      });

      expect(saveRes.status).toBe(200);
      expect(poolUpdateMock).toHaveBeenCalled();
      expect(savedSettings?.tiebreaker_designations?.['2026']?.['7']?.isFrozen).toBe(true);

      // 2. Explicit Clear does NOT unfreeze designation
      const clearRes = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          week: 7,
          season: 2026,
          clear: true,
        }),
      });

      expect(clearRes.status).toBe(200);
      const clearData = await clearRes.json();
      expect(clearData.prediction).toBeNull();
      // Freeze state must stay preserved!
      expect(savedSettings?.tiebreaker_designations?.['2026']?.['7']?.isFrozen).toBe(true);
    });

    it('preserves existing stored prediction when prediction field is omitted', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);

      // Mock existing submission with 52.0
      vi.spyOn(prisma.weeklySubmission, 'findUnique').mockResolvedValue({
        id: 'sub-1',
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        weekNumber: 7,
        tieBreakerPrediction: 52.0,
      } as any);

      const upsertMock = vi.fn().mockImplementation(({ update }) => ({
        id: 'sub-1',
        tieBreakerPrediction: update.tieBreakerPrediction,
      }));

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          game: { findFirst: vi.fn().mockResolvedValue(mockWeek7Games[0]) },
          weeklySubmission: { upsert: upsertMock },
          pool: { findUnique: vi.fn().mockResolvedValue(mockPool), update: vi.fn() },
        });
      });

      const token = createAuthToken(MEMBER_1_ID);
      // Submit without prediction or clear
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          week: 7,
          season: 2026,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.prediction).toBe(52.0);
    });
  });

  describe('4. Kickoff Lock Enforcement (Decision #66)', () => {
    it('denies prediction submission at or after kickoff with HTTP 403 KICKOFF_PASSED', async () => {
      const pastGame = [
        {
          id: 'g-w7-past',
          externalGameId: '2026_w07_DET_MIN',
          homeTeamId: 'MIN',
          awayTeamId: 'DET',
          kickoffTime: pastKickoff,
          status: GameStatus.IN_PROGRESS,
        },
      ];

      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(pastGame as any);

      const token = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          week: 7,
          season: 2026,
          prediction: 45.0,
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('KICKOFF_PASSED');
    });
  });

  describe('5. Pre-Kickoff Privacy Invariants Across All Surfaces', () => {
    it('masks all other members numeric predictions before kickoff in commissioner readiness view', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: ADMIN_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);
      vi.spyOn(prisma.weeklySubmission, 'findUnique').mockResolvedValue(null);

      vi.spyOn(prisma.poolMembership, 'findMany').mockResolvedValue([
        { poolId: POOL_ID, userId: MEMBER_1_ID, status: 'ACTIVE', user: { id: MEMBER_1_ID, email: 'm1@example.com' } },
        { poolId: POOL_ID, userId: MEMBER_2_ID, status: 'ACTIVE', user: { id: MEMBER_2_ID, email: 'm2@example.com' } },
      ] as any);

      vi.spyOn(prisma.weeklySubmission, 'findMany').mockResolvedValue([
        { poolId: POOL_ID, userId: MEMBER_1_ID, weekNumber: 7, tieBreakerPrediction: 45.5 },
      ] as any);

      const token = createAuthToken(ADMIN_ID, 'ADMIN');
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.isLocked).toBe(false);
      expect(data.readiness).toBeDefined();

      const m1 = data.readiness.find((r: any) => r.userId === MEMBER_1_ID);
      const m2 = data.readiness.find((r: any) => r.userId === MEMBER_2_ID);

      expect(m1.hasSubmitted).toBe(true);
      expect(m2.hasSubmitted).toBe(false);

      // PRIVACY: prediction property must be undefined prior to kickoff!
      expect(m1.prediction).toBeUndefined();
      expect(m2.prediction).toBeUndefined();
    });
  });

  describe('6. Commissioner Designation Override Rules', () => {
    it('allows pool commissioner with active membership to override before predictions are received', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: ADMIN_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);

      let savedSettings: any = null;
      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          pool: {
            findUnique: vi.fn().mockResolvedValue(mockPool),
            update: vi.fn().mockImplementation(({ data }) => {
              savedSettings = data.settings;
              return { ...mockPool, settings: data.settings };
            }),
          },
          weeklySubmission: {
            findMany: vi.fn().mockResolvedValue([]), // No predictions yet
          },
        });
      });

      const token = createAuthToken(ADMIN_ID, 'ADMIN');
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker/override`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          week: 7,
          season: 2026,
          target_game_id: '2026_w07_HOU_GB',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.designation.eventId).toBe('2026_w07_HOU_GB');
      expect(data.designation.provenance).toBe('COMMISSIONER_OVERRIDE');
      expect(savedSettings?.tiebreaker_designations?.['2026']?.['7']?.eventId).toBe('2026_w07_HOU_GB');
    });

    it('rejects override if predictions have already been acknowledged (designation frozen)', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: ADMIN_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          pool: { findUnique: vi.fn().mockResolvedValue(mockPool) },
          weeklySubmission: {
            // Existing prediction present!
            findMany: vi.fn().mockResolvedValue([{ userId: MEMBER_1_ID, tieBreakerPrediction: 48.0 }]),
          },
        });
      });

      const token = createAuthToken(ADMIN_ID, 'ADMIN');
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker/override`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          week: 7,
          season: 2026,
          target_game_id: '2026_w07_HOU_GB',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('DESIGNATION_FROZEN');
    });
  });

  describe('7. Week 6 2026 Exclusion Safeguard', () => {
    it('returns UNAVAILABLE and blocks predictions for Week 6', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);

      const token = createAuthToken(MEMBER_1_ID);

      // GET Week 6
      const getRes = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker?week=6&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.status).toBe('UNAVAILABLE');
      expect(getData.tiebreakerOffered).toBe(false);
      expect(getData.isLocked).toBe(true);
      expect(getData.reason).toContain('Tiebreaker unavailable — entry was not offered');

      // POST Week 6
      const postRes = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          week: 6,
          season: 2026,
          prediction: 45.0,
        }),
      });
      expect(postRes.status).toBe(403);
      const postData = await postRes.json();
      expect(postData.error).toContain('TIEBREAKER_UNAVAILABLE');
    });
  });

  describe('8. Canonical Tiebreaker Ranking & Charge Invariants', () => {
    it('applies pick score priority, distance, under-beats-over, shared ranks and tier charges', () => {
      // 10 members:
      // actual total = 48.00
      // m1: score 12, no pred -> rank 1 (score takes precedence)
      // m2: score 11, pred 48.00 (exact) -> rank 2
      // m3: score 11, pred 47.00 (dist 1.0, under) -> rank 3
      // m4: score 11, pred 49.00 (dist 1.0, over) -> rank 4 (under beats over)
      // m5: score 11, pred 0.00 (valid, dist 48.0) -> rank 5 (valid beats missing)
      // m6: score 11, pred null (missing) -> rank 6
      // m7: score 10, pred 48.00 -> shared rank 7
      // m8: score 10, pred 48.00 -> shared rank 7 (shared 1,2..7,7)
      // m9: score 10, pred 49.00 -> rank 9
      // m10: score 9, pred 48.00 -> rank 10 (dead place)
      const members = [
        { userId: 'm1', score: 12, tieBreakerPrediction: null },
        { userId: 'm2', score: 11, tieBreakerPrediction: 48.0 },
        { userId: 'm3', score: 11, tieBreakerPrediction: 47.0 },
        { userId: 'm4', score: 11, tieBreakerPrediction: 49.0 },
        { userId: 'm5', score: 11, tieBreakerPrediction: 0.0 },
        { userId: 'm6', score: 11, tieBreakerPrediction: null },
        { userId: 'm7', score: 10, tieBreakerPrediction: 48.0 },
        { userId: 'm8', score: 10, tieBreakerPrediction: 48.0 },
        { userId: 'm9', score: 10, tieBreakerPrediction: 49.0 },
        { userId: 'm10', score: 9, tieBreakerPrediction: 48.0 },
      ];

      const results = calculateRankingsAndPenalties(members, {
        actualFinalTotal: 48.0,
        tiebreakerOffered: true,
      });

      expect(results).toHaveLength(10);
      const findRes = (id: string) => results.find((r) => r.userId === id)!;

      // Rank 1: score priority
      expect(findRes('m1').rank).toBe(1);
      expect(findRes('m1').shots).toBe(0); // Safe Haven

      // Ranks 2-6: tier charge 1 shot
      expect(findRes('m2').rank).toBe(2);
      expect(findRes('m2').shots).toBe(1);

      expect(findRes('m3').rank).toBe(3);
      expect(findRes('m3').shots).toBe(1);

      expect(findRes('m4').rank).toBe(4);
      expect(findRes('m4').shots).toBe(1);

      expect(findRes('m5').rank).toBe(5);
      expect(findRes('m5').shots).toBe(1);

      expect(findRes('m6').rank).toBe(6);
      expect(findRes('m6').shots).toBe(1);

      // Shared Rank 7: both get rank 7 charge (2 shots)
      expect(findRes('m7').rank).toBe(7);
      expect(findRes('m7').shots).toBe(2);
      expect(findRes('m7').isSharedRank).toBe(true);

      expect(findRes('m8').rank).toBe(7);
      expect(findRes('m8').shots).toBe(2);
      expect(findRes('m8').isSharedRank).toBe(true);

      // Next rank is 9 (competition ranking 1, 2, 2, 4...)
      expect(findRes('m9').rank).toBe(9);
      expect(findRes('m9').shots).toBe(2);

      // Rank 10: Dead Place (2.5 shots)
      expect(findRes('m10').rank).toBe(10);
      expect(findRes('m10').shots).toBe(2.5);
      expect(findRes('m10').isDeadPlace).toBe(true);
    });
  });

  describe('9. Critical Source Gate / Schema-Compatible Slate Query', () => {
    it('executes getGamesForWeek against actual prisma.game without season/week where clause', async () => {
      // Query without mocking findMany: queries local rehearsal DB
      const games = await getGamesForWeek(7, 2026);
      expect(Array.isArray(games)).toBe(true);
      // Demonstrates safe fail-closed behavior when Week 7 games are not yet imported
      expect(games.length).toBe(0);
    });
  });
});
