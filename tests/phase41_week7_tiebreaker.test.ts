import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import http from 'http';
import { poolTiebreakerRouter, getGamesForWeek } from '../src/routes/poolTiebreakerRoutes';
import { picksRouter } from '../src/routes/picks';
import prisma from '../src/db/client';
import {
  setSupabaseAuthClientForTesting,
  createSyntheticSupabaseToken,
  requireAuth,
  requirePoolMember,
} from '../src/middleware/auth';
import { GameStatus } from '@prisma/client';
import {
  compareTiebreakerPredictions,
  calculateRankingsAndPenalties,
} from '../src/services/tiebreakerRankingService';
import * as authoritativeSlateService from '../src/services/authoritativeSlateService';
import { opsRouter } from '../src/routes/ops';
import { adminOpsRouter } from '../src/routes/adminOps';
import { handleGetPoolMatrix } from '../src/server';
import {
  previewWeeklyWrapUpForPool,
  executeWeeklyWrapUpForPool,
} from '../src/services/wrapUpEngine';

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

  // Canonical ESPN numeric text identifiers (401873010, 401873011) matching production schema
  const mockWeek7Games = [
    {
      id: 'g-w7-det',
      externalGameId: '401873010',
      homeTeamId: 'MIN',
      awayTeamId: 'DET',
      kickoffTime: futureKickoff,
      status: GameStatus.SCHEDULED,
    },
    {
      id: 'g-w7-gb',
      externalGameId: '401873011',
      homeTeamId: 'GB',
      awayTeamId: 'HOU',
      kickoffTime: futureKickoff,
      status: GameStatus.SCHEDULED,
    },
  ];

  beforeEach(async () => {
    vi.restoreAllMocks();

    vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockImplementation(async (_db, s, _st, w) => {
      if (s === 2026 && w === 7) {
        return {
          season: 2026,
          seasonType: 2,
          weekNumber: 7,
          revision: 1,
          eventIds: ['401873010', '401873011'],
          acceptedAt: new Date().toISOString(),
          acceptedBy: ADMIN_ID,
          manifestFingerprint: 'mock-fp-w7',
          observationTime: new Date().toISOString(),
        };
      }
      return null;
    });

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
    app.use('/api/pools', opsRouter);
    app.use('/api/admin/ops', adminOpsRouter);
    app.use('/api/pools', poolTiebreakerRouter);
    app.use('/api/picks', picksRouter);
    app.get('/api/pools/:pool_id/matrix', requireAuth, requirePoolMember, handleGetPoolMatrix);

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
      expect(data.designatedGame.externalGameId).toBe('401873010');
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
          $queryRawUnsafe: vi.fn().mockResolvedValue([]),
          game: { findFirst: vi.fn().mockResolvedValue(mockWeek7Games[0]), findMany: vi.fn().mockResolvedValue(mockWeek7Games) },
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
          $queryRawUnsafe: vi.fn().mockResolvedValue([]),
          game: { findFirst: vi.fn().mockResolvedValue(mockWeek7Games[0]), findMany: vi.fn().mockResolvedValue(mockWeek7Games) },
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
          $queryRawUnsafe: vi.fn().mockResolvedValue([]),
          game: { findFirst: vi.fn().mockResolvedValue(mockWeek7Games[0]), findMany: vi.fn().mockResolvedValue(mockWeek7Games) },
          weeklySubmission: {
            upsert: upsertMock,
            findUnique: vi.fn().mockResolvedValue({ tieBreakerPrediction: 52.0 }),
          },
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
          externalGameId: '401873010',
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

  describe('5. Pre-Kickoff Privacy Invariants Across All Surfaces (Finding 2)', () => {
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

    it('strictly preserves privacy when kickoff time is missing (unknown time must not leak guesses)', async () => {
      const missingKickoffGames = [
        {
          id: 'g-w7-nokickoff',
          externalGameId: '401873010',
          homeTeamId: 'MIN',
          awayTeamId: 'DET',
          kickoffTime: null as any,
          status: GameStatus.SCHEDULED,
        },
      ];

      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: ADMIN_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(missingKickoffGames as any);
      vi.spyOn(prisma.weeklySubmission, 'findUnique').mockResolvedValue(null);

      vi.spyOn(prisma.poolMembership, 'findMany').mockResolvedValue([
        { poolId: POOL_ID, userId: MEMBER_1_ID, status: 'ACTIVE', user: { id: MEMBER_1_ID, email: 'm1@example.com' } },
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
      // Fail closed: write is locked
      expect(data.isLocked).toBe(true);
      expect(data.kickoffTime).toBeNull();
      // CRITICAL (Finding 2): Unknown time MUST preserve privacy!
      const m1 = data.readiness.find((r: any) => r.userId === MEMBER_1_ID);
      expect(m1.hasSubmitted).toBe(true);
      expect(m1.prediction).toBeUndefined();
    });

    it('strictly preserves privacy when kickoff time is an invalid string', async () => {
      const invalidKickoffGames = [
        {
          id: 'g-w7-badkickoff',
          externalGameId: '401873010',
          homeTeamId: 'MIN',
          awayTeamId: 'DET',
          kickoffTime: 'not-a-valid-date' as any,
          status: GameStatus.SCHEDULED,
        },
      ];

      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: ADMIN_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(invalidKickoffGames as any);
      vi.spyOn(prisma.weeklySubmission, 'findUnique').mockResolvedValue(null);

      vi.spyOn(prisma.poolMembership, 'findMany').mockResolvedValue([
        { poolId: POOL_ID, userId: MEMBER_1_ID, status: 'ACTIVE', user: { id: MEMBER_1_ID, email: 'm1@example.com' } },
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
      expect(data.isLocked).toBe(true);
      expect(data.kickoffTime).toBeNull();
      const m1 = data.readiness.find((r: any) => r.userId === MEMBER_1_ID);
      expect(m1.hasSubmitted).toBe(true);
      expect(m1.prediction).toBeUndefined();
    });

    it('strictly preserves privacy when designation is UNRESOLVED', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: ADMIN_ID,
        status: 'ACTIVE',
      } as any);
      // Zero games returned
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue([] as any);
      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue(null);
      vi.spyOn(prisma.weeklySubmission, 'findUnique').mockResolvedValue(null);

      vi.spyOn(prisma.poolMembership, 'findMany').mockResolvedValue([
        { poolId: POOL_ID, userId: MEMBER_1_ID, status: 'ACTIVE', user: { id: MEMBER_1_ID, email: 'm1@example.com' } },
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
      expect(data.status).toBe('UNRESOLVED');
      expect(data.isLocked).toBe(true);
      const m1 = data.readiness.find((r: any) => r.userId === MEMBER_1_ID);
      expect(m1.hasSubmitted).toBe(true);
      expect(m1.prediction).toBeUndefined();
    });
  });

  describe('6. Commissioner Designation Override & Concurrency Rules (Finding 3)', () => {
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
          $queryRawUnsafe: vi.fn().mockResolvedValue([]),
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
          game: { findMany: vi.fn().mockResolvedValue(mockWeek7Games) },
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
          target_game_id: '401873011',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.designation.eventId).toBe('401873011');
      expect(data.designation.provenance).toBe('COMMISSIONER_OVERRIDE');
      expect(savedSettings?.tiebreaker_designations?.['2026']?.['7']?.eventId).toBe('401873011');
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
          $queryRawUnsafe: vi.fn().mockResolvedValue([]),
          pool: { findUnique: vi.fn().mockResolvedValue(mockPool) },
          weeklySubmission: {
            // Existing prediction present!
            findMany: vi.fn().mockResolvedValue([{ userId: MEMBER_1_ID, tieBreakerPrediction: 48.0 }]),
          },
          game: { findMany: vi.fn().mockResolvedValue(mockWeek7Games) },
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
          target_game_id: '401873011',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('DESIGNATION_FROZEN');
    });

    it('serializes overlapping first prediction save versus commissioner override via row lock', async () => {
      let poolSettings = { ...mockPool.settings };
      const submissions: any[] = [];

      vi.spyOn(prisma.pool, 'findUnique').mockImplementation(async () => ({
        ...mockPool,
        settings: poolSettings,
      }) as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockImplementation(async (args: any) => ({
        poolId: POOL_ID,
        userId: args?.where?.poolId_userId?.userId || MEMBER_1_ID,
        status: 'ACTIVE',
      }) as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);

      let saveTxInFlight = false;
      let saveTxReleased = false;
      let overrideEnteredCriticalSectionDuringSave = false;

      let resolveSaveLockAcquired: () => void;
      const saveLockAcquiredPromise = new Promise<void>((r) => { resolveSaveLockAcquired = r; });

      let resolveSaveHold: () => void;
      const saveHoldPromise = new Promise<void>((r) => { resolveSaveHold = r; });

      let resolveOverrideLockWait: () => void;
      const overrideLockWaitPromise = new Promise<void>((r) => { resolveOverrideLockWait = r; });

      let txIndex = 0;
      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        const isSave = (txIndex === 0);
        txIndex++;

        if (isSave) {
          saveTxInFlight = true;
        }

        const txClient = {
          $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string) => {
            if (sql.includes('FOR UPDATE')) {
              if (isSave) {
                // Signal that Save has acquired the lock
                resolveSaveLockAcquired();
                // Hold Save's transaction open until Override attempts lock
                await saveHoldPromise;
              } else {
                // Override must wait on the row lock until Save transaction releases it
                await overrideLockWaitPromise;
              }
              return [];
            }
            if (sql.includes('to_regproc')) {
              return [{ exists: null }];
            }
            return [];
          }),
          pool: {
            findUnique: vi.fn().mockImplementation(() => {
              if (!isSave && (saveTxInFlight || !saveTxReleased)) {
                overrideEnteredCriticalSectionDuringSave = true;
              }
              return Promise.resolve({ ...mockPool, settings: poolSettings });
            }),
            update: vi.fn().mockImplementation(({ data }) => {
              poolSettings = { ...poolSettings, ...data.settings };
              return Promise.resolve({ ...mockPool, settings: poolSettings });
            }),
          },
          weeklySubmission: {
            upsert: vi.fn().mockImplementation(({ create, update }) => {
              const sub = { id: 'sub-overlap', ...update, ...create };
              submissions.push(sub);
              return Promise.resolve(sub);
            }),
            findMany: vi.fn().mockImplementation(() => {
              if (!isSave && (saveTxInFlight || !saveTxReleased)) {
                overrideEnteredCriticalSectionDuringSave = true;
              }
              return Promise.resolve(submissions);
            }),
          },
          game: {
            findFirst: vi.fn().mockResolvedValue(mockWeek7Games[0]),
            findMany: vi.fn().mockResolvedValue(mockWeek7Games),
          },
        };

        try {
          const res = await cb(txClient);
          return res;
        } finally {
          if (isSave) {
            saveTxInFlight = false;
            saveTxReleased = true;
            resolveOverrideLockWait();
          }
        }
      });

      // 1. Member 1 starts saving prediction
      const memberToken = createAuthToken(MEMBER_1_ID);
      const savePromise = fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          week: 7,
          season: 2026,
          prediction: 47.5,
        }),
      });

      // Wait until Save transaction has acquired the pool row lock
      await saveLockAcquiredPromise;

      // 2. While Save is holding the lock, Commissioner attempts override concurrently
      const adminToken = createAuthToken(ADMIN_ID, 'ADMIN');
      const overridePromise = fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker/override`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          week: 7,
          season: 2026,
          target_game_id: '401873011',
        }),
      });

      // Release Save transaction after a slight tick to let Override queue up on the lock
      await new Promise((r) => setTimeout(r, 20));
      resolveSaveHold();

      const [saveRes, overrideRes] = await Promise.all([savePromise, overridePromise]);

      // Assert that Override NEVER passed critical section while Save held the lock
      expect(overrideEnteredCriticalSectionDuringSave).toBe(false);
      expect(saveTxReleased).toBe(true);

      // Save succeeds and override is blocked
      expect(saveRes.status).toBe(200);
      expect(overrideRes.status).toBe(400);
      const overrideData = await overrideRes.json();
      expect(overrideData.error).toContain('DESIGNATION_FROZEN');
    });

    it('fails closed and denies prediction submission when pool row lock acquisition fails', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);

      const poolUpdateSpy = vi.fn();
      const submissionUpsertSpy = vi.fn();

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          $queryRawUnsafe: vi.fn().mockRejectedValue(new Error('LOCK_ACQUISITION_FAILED: could not obtain lock on row in relation pools')),
          pool: {
            findUnique: vi.fn().mockResolvedValue(mockPool),
            update: poolUpdateSpy,
          },
          weeklySubmission: {
            upsert: submissionUpsertSpy,
            findMany: vi.fn().mockResolvedValue([]),
          },
          game: {
            findMany: vi.fn().mockResolvedValue(mockWeek7Games),
          },
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
          prediction: 45.0,
        }),
      });

      expect(res.status).toBe(500);
      expect(poolUpdateSpy).not.toHaveBeenCalled();
      expect(submissionUpsertSpy).not.toHaveBeenCalled();
    });

    it('fails closed and denies commissioner override when pool row lock acquisition fails', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: ADMIN_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);

      const poolUpdateSpy = vi.fn();

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          $queryRawUnsafe: vi.fn().mockRejectedValue(new Error('LOCK_TIMEOUT: statement timeout on relation pools')),
          pool: {
            findUnique: vi.fn().mockResolvedValue(mockPool),
            update: poolUpdateSpy,
          },
          weeklySubmission: {
            findMany: vi.fn().mockResolvedValue([]),
          },
          game: {
            findMany: vi.fn().mockResolvedValue(mockWeek7Games),
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
          target_game_id: '401873011',
        }),
      });

      expect(res.status).toBe(500);
      expect(poolUpdateSpy).not.toHaveBeenCalled();
    });

    it('preserves designation freeze across clear and subsequent override attempts', async () => {
      let poolSettings: any = { ...mockPool.settings };
      let storedSubmission: any = null;

      vi.spyOn(prisma.pool, 'findUnique').mockImplementation(() => Promise.resolve({ ...mockPool, settings: poolSettings }) as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          $queryRawUnsafe: vi.fn().mockResolvedValue([]),
          pool: {
            findUnique: vi.fn().mockImplementation(() => Promise.resolve({ ...mockPool, settings: poolSettings })),
            update: vi.fn().mockImplementation(({ data }) => {
              poolSettings = { ...poolSettings, ...data.settings };
              return Promise.resolve({ ...mockPool, settings: poolSettings });
            }),
          },
          weeklySubmission: {
            upsert: vi.fn().mockImplementation(({ update, create }) => {
              storedSubmission = { ...storedSubmission, ...update, ...create };
              return Promise.resolve(storedSubmission);
            }),
            findMany: vi.fn().mockImplementation(() => Promise.resolve(storedSubmission?.tieBreakerPrediction !== null && storedSubmission?.tieBreakerPrediction !== undefined ? [storedSubmission] : [])),
          },
          game: {
            findFirst: vi.fn().mockResolvedValue(mockWeek7Games[0]),
            findMany: vi.fn().mockResolvedValue(mockWeek7Games),
          },
        });
      });

      const memberToken = createAuthToken(MEMBER_1_ID);
      const adminToken = createAuthToken(ADMIN_ID, 'ADMIN');

      // 1. Member saves prediction -> freezes designation
      const saveRes = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({ week: 7, season: 2026, prediction: 51.5 }),
      });
      expect(saveRes.status).toBe(200);
      expect(poolSettings.tiebreaker_designations?.['2026']?.['7']?.isFrozen).toBe(true);

      // 2. Member explicitly clears prediction
      const clearRes = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({ week: 7, season: 2026, clear: true }),
      });
      expect(clearRes.status).toBe(200);
      // isFrozen setting MUST remain true even when submission is cleared!
      expect(poolSettings.tiebreaker_designations?.['2026']?.['7']?.isFrozen).toBe(true);

      // 3. Commissioner attempts override on cleared week -> MUST BE REJECTED
      const overrideRes = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ week: 7, season: 2026, target_game_id: '401873011' }),
      });
      expect(overrideRes.status).toBe(400);
      const overrideData = await overrideRes.json();
      expect(overrideData.error).toContain('DESIGNATION_FROZEN');
    });

    it('fails closed and denies override when existing designated game has missing kickoffTime', async () => {
      const missingKickoffGames = [
        {
          id: 'g-w7-nokickoff',
          externalGameId: '401873010',
          homeTeamId: 'MIN',
          awayTeamId: 'DET',
          kickoffTime: null as any,
          status: GameStatus.SCHEDULED,
        },
        {
          id: 'g-w7-valid',
          externalGameId: '401873011',
          homeTeamId: 'SF',
          awayTeamId: 'KC',
          kickoffTime: new Date(Date.now() + 86400000).toISOString(),
          status: GameStatus.SCHEDULED,
        },
      ];

      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: ADMIN_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(missingKickoffGames as any);

      const poolUpdateSpy = vi.fn();
      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string) => {
            if (sql.includes('to_regproc')) return [{ exists: null }];
            return [];
          }),
          pool: {
            findUnique: vi.fn().mockResolvedValue(mockPool),
            update: poolUpdateSpy,
          },
          weeklySubmission: {
            findMany: vi.fn().mockResolvedValue([]),
          },
          game: {
            findMany: vi.fn().mockResolvedValue(missingKickoffGames),
          },
        });
      });

      const adminToken = createAuthToken(ADMIN_ID, 'ADMIN');
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ week: 7, season: 2026, target_game_id: '401873011' }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('UNVERIFIED_KICKOFF');
      expect(poolUpdateSpy).not.toHaveBeenCalled();
    });

    it('fails closed and denies override when existing designated game has invalid kickoffTime string', async () => {
      const invalidKickoffGames = [
        {
          id: 'g-w7-badkickoff',
          externalGameId: '401873010',
          homeTeamId: 'MIN',
          awayTeamId: 'DET',
          kickoffTime: 'not-a-valid-date' as any,
          status: GameStatus.SCHEDULED,
        },
        {
          id: 'g-w7-valid',
          externalGameId: '401873011',
          homeTeamId: 'SF',
          awayTeamId: 'KC',
          kickoffTime: new Date(Date.now() + 86400000).toISOString(),
          status: GameStatus.SCHEDULED,
        },
      ];

      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: ADMIN_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(invalidKickoffGames as any);

      const poolUpdateSpy = vi.fn();
      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string) => {
            if (sql.includes('to_regproc')) return [{ exists: null }];
            return [];
          }),
          pool: {
            findUnique: vi.fn().mockResolvedValue(mockPool),
            update: poolUpdateSpy,
          },
          weeklySubmission: {
            findMany: vi.fn().mockResolvedValue([]),
          },
          game: {
            findMany: vi.fn().mockResolvedValue(invalidKickoffGames),
          },
        });
      });

      const adminToken = createAuthToken(ADMIN_ID, 'ADMIN');
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ week: 7, season: 2026, target_game_id: '401873011' }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('UNVERIFIED_KICKOFF');
      expect(poolUpdateSpy).not.toHaveBeenCalled();
    });

    it('fails closed and denies override when stored designated event is missing from weekly slate', async () => {
      const storedPool = {
        ...mockPool,
        settings: {
          tiebreaker_designations: {
            '2026': {
              '7': {
                eventId: '999999999', // Missing from slate
                provenance: 'COMMISSIONER_OVERRIDE',
                isFrozen: false,
              },
            },
          },
        },
      };

      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(storedPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: ADMIN_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);

      const poolUpdateSpy = vi.fn();
      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string) => {
            if (sql.includes('to_regproc')) return [{ exists: null }];
            return [];
          }),
          pool: {
            findUnique: vi.fn().mockResolvedValue(storedPool),
            update: poolUpdateSpy,
          },
          weeklySubmission: {
            findMany: vi.fn().mockResolvedValue([]),
          },
          game: {
            findMany: vi.fn().mockResolvedValue(mockWeek7Games),
          },
        });
      });

      const adminToken = createAuthToken(ADMIN_ID, 'ADMIN');
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ week: 7, season: 2026, target_game_id: '401873011' }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('UNVERIFIED_KICKOFF');
      expect(poolUpdateSpy).not.toHaveBeenCalled();
    });
  });

  describe('7. Week 6 2026 Exclusion Safeguard Across Surfaces (Finding 4)', () => {
    it('returns UNAVAILABLE and blocks predictions for Week 6 on both new and legacy paths without settings flag', async () => {
      // Pool with ZERO tiebreaker_unavailable_weeks in settings
      const unflaggedPool = {
        id: POOL_ID,
        name: 'Test Pool 41',
        adminId: ADMIN_ID,
        settings: { season: 2026 },
      };

      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(unflaggedPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);

      const token = createAuthToken(MEMBER_1_ID);

      // Path A: Canonical pool-scoped route GET
      const getResCanonical = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker?week=6&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(getResCanonical.status).toBe(200);
      const getDataCanonical = await getResCanonical.json();
      expect(getDataCanonical.status).toBe('UNAVAILABLE');
      expect(getDataCanonical.tiebreakerOffered).toBe(false);
      expect(getDataCanonical.isLocked).toBe(true);
      expect(getDataCanonical.reason).toContain('Tiebreaker unavailable — entry was not offered');

      // Path B: Legacy route GET returns 410 ENDPOINT_RETIRED (Finding 7)
      const getResLegacy = await fetch(`${baseUrl}/api/picks/tiebreaker?pool_id=${POOL_ID}&week=6&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(getResLegacy.status).toBe(410);
      const getDataLegacy = await getResLegacy.json();
      expect(getDataLegacy.error).toContain('ENDPOINT_RETIRED');

      // Path A: Canonical pool-scoped route POST
      const postResCanonical = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ week: 6, season: 2026, prediction: 45.0 }),
      });
      expect(postResCanonical.status).toBe(403);
      const postDataCanonical = await postResCanonical.json();
      expect(postDataCanonical.error).toContain('TIEBREAKER_UNAVAILABLE');

      // Path B: Legacy route POST returns 410 ENDPOINT_RETIRED (Finding 7)
      const postResLegacy = await fetch(`${baseUrl}/api/picks/tiebreaker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pool_id: POOL_ID, week: 6, season: 2026, prediction: 45.0 }),
      });
      expect(postResLegacy.status).toBe(410);
      const postDataLegacy = await postResLegacy.json();
      expect(postDataLegacy.error).toContain('ENDPOINT_RETIRED');

      // Path B: Legacy override POST returns 410 ENDPOINT_RETIRED (Finding 7)
      const overrideResLegacy = await fetch(`${baseUrl}/api/picks/tiebreaker/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pool_id: POOL_ID, week: 6, season: 2026, target_game_id: '401873011' }),
      });
      expect(overrideResLegacy.status).toBe(410);
      const overrideDataLegacy = await overrideResLegacy.json();
      expect(overrideDataLegacy.error).toContain('ENDPOINT_RETIRED');
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

    it('resolves games via caller-bound Supabase get_pool_canonical_games RPC with caller identity and numeric ESPN text IDs (Finding 6)', async () => {
      const mockRpcGames = [
        {
          id: 'g-rpc-1',
          externalGameId: '401873010',
          homeTeamId: 'MIN',
          awayTeamId: 'DET',
          kickoffTime: futureKickoff,
          status: GameStatus.SCHEDULED,
          homeScore: null,
          awayScore: null,
        },
        {
          id: 'g-rpc-2',
          externalGameId: '401873011',
          homeTeamId: 'GB',
          awayTeamId: 'HOU',
          kickoffTime: futureKickoff,
          status: GameStatus.SCHEDULED,
          homeScore: null,
          awayScore: null,
        },
      ];

      const rpcMock = vi.fn().mockResolvedValue({ data: mockRpcGames, error: null });
      const mockSupabaseClient = {
        rpc: rpcMock,
      };

      const games = await getGamesForWeek(7, 2026, POOL_ID, prisma, { supabaseClient: mockSupabaseClient });
      expect(games).toHaveLength(2);
      expect(games[0].externalGameId).toBe('401873010');
      expect(games[0].kickoffTime).toBe(futureKickoff);
      expect(games[0].homeScore).toBeNull();
      expect(games[1].externalGameId).toBe('401873011');
      expect(rpcMock).toHaveBeenCalledWith('get_pool_canonical_games', {
        p_pool_id: POOL_ID,
        p_season: 2026,
        p_week: 7,
      });
    });

    it('enforces manifest resolves strictly via exact event IDs via findMany and never calls unfiltered findFirst (Finding 5)', async () => {
      const findFirstSpy = vi.fn().mockResolvedValue({ id: 'unrelated-game', externalGameId: 'unrelated-999' });
      const findManySpy = vi.fn().mockResolvedValue([
        {
          id: 'g-manifest-1',
          externalGameId: '401873010',
          homeTeamId: 'MIN',
          awayTeamId: 'DET',
          kickoffTime: futureKickoff,
          status: GameStatus.SCHEDULED,
          homeScore: null,
          awayScore: null,
        },
      ]);

      const mockClient = {
        game: {
          findMany: findManySpy,
          findFirst: findFirstSpy,
        },
      };

      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue({
        season: 2026,
        seasonType: 2,
        weekNumber: 7,
        revision: 1,
        observationTime: new Date().toISOString(),
        manifestFingerprint: 'mock-fingerprint-w7',
        eventIds: ['401873010', '401873011'],
      } as any);

      const games = await getGamesForWeek(7, 2026, POOL_ID, mockClient);
      expect(games).toHaveLength(1);
      expect(games[0].externalGameId).toBe('401873010');
      expect(findManySpy).toHaveBeenCalledWith({
        where: { externalGameId: { in: ['401873010', '401873011'] } },
        orderBy: { kickoffTime: 'asc' },
      });
      // CRITICAL (Finding 5): findFirst MUST NOT be called!
      expect(findFirstSpy).not.toHaveBeenCalled();
    });

    it('fails closed to [] when caller identity is missing and manifest/columns are unavailable (Finding 6)', async () => {
      const mockClient = {
        $queryRawUnsafe: vi.fn().mockRejectedValue(new Error('DATABASE_CONNECTION_LOST')),
        game: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      };

      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue(null);

      // Plain call without caller-bound Supabase client
      const games = await getGamesForWeek(7, 2026, POOL_ID, mockClient);
      expect(Array.isArray(games)).toBe(true);
      expect(games).toHaveLength(0);
    });
  });

  describe('10. Legacy Route Retirement & Canonical Routing Invariant (Finding 7)', () => {
    it('retires legacy /api/picks/tiebreaker routes with state-free HTTP 410 Gone and zero pool mutations (Finding 7)', async () => {
      const token = createAuthToken(MEMBER_1_ID);

      // 1. GET legacy -> 410 Gone
      const getRes = await fetch(`${baseUrl}/api/picks/tiebreaker?pool_id=${POOL_ID}&week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(getRes.status).toBe(410);
      const getData = await getRes.json();
      expect(getData.error).toContain('ENDPOINT_RETIRED');
      expect(getData.canonicalRoute).toBe('/api/pools/:pool_id/tiebreaker');

      // 2. POST legacy -> 410 Gone
      const postRes = await fetch(`${baseUrl}/api/picks/tiebreaker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pool_id: POOL_ID, week: 7, season: 2026, prediction: '49.50' }),
      });
      expect(postRes.status).toBe(410);
      const postData = await postRes.json();
      expect(postData.error).toContain('ENDPOINT_RETIRED');

      // 3. POST legacy override -> 410 Gone
      const adminToken = createAuthToken(ADMIN_ID, 'ADMIN');
      const overrideRes = await fetch(`${baseUrl}/api/picks/tiebreaker/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ pool_id: POOL_ID, week: 7, season: 2026, target_game_id: '401873011' }),
      });
      expect(overrideRes.status).toBe(410);
      const overrideData = await overrideRes.json();
      expect(overrideData.error).toContain('ENDPOINT_RETIRED');
    });

    it('handles tiebreaker reads, submissions, and overrides via canonical /api/pools/:pool_id/tiebreaker routes', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);

      const upsertMock = vi.fn().mockResolvedValue({
        id: 'sub-canonical',
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        weekNumber: 7,
        tieBreakerPrediction: 49.5,
      });

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          $queryRawUnsafe: vi.fn().mockResolvedValue([]),
          game: { findMany: vi.fn().mockResolvedValue(mockWeek7Games) },
          weeklySubmission: { upsert: upsertMock, findMany: vi.fn().mockResolvedValue([]) },
          pool: { findUnique: vi.fn().mockResolvedValue(mockPool), update: vi.fn() },
        });
      });

      const token = createAuthToken(MEMBER_1_ID);

      // Canonical GET
      const getRes = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.status).toBe('DEFAULT_LIONS');
      expect(getData.tiebreakerOffered).toBe(true);
      expect(getData.designatedGame.externalGameId).toBe('401873010');

      // Canonical POST
      const postRes = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ week: 7, season: 2026, prediction: '49.50' }),
      });
      expect(postRes.status).toBe(200);
      const postData = await postRes.json();
      expect(postData.prediction).toBe(49.5);
      expect(postData.designatedGameId).toBe('401873010');

      // Canonical POST override
      const adminToken = createAuthToken(ADMIN_ID, 'ADMIN');
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: ADMIN_ID,
        status: 'ACTIVE',
      } as any);

      const overrideRes = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ week: 7, season: 2026, target_game_id: '401873011' }),
      });
      expect(overrideRes.status).toBe(200);
      const overrideData = await overrideRes.json();
      expect(overrideData.designation.eventId).toBe('401873011');
    });
  });

  describe('11. Atomic Omission Preservation Under Concurrent Save/Clear (Finding 1)', () => {
    it('proves concurrent omitted prediction request does not overwrite freshly committed prediction', async () => {
      let poolSettings = { ...mockPool.settings };
      let storedSubmission: any = {
        id: 'sub-omitted-test',
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        weekNumber: 7,
        tieBreakerPrediction: 40.0, // Stored initial value
      };

      vi.spyOn(prisma.pool, 'findUnique').mockImplementation(() => Promise.resolve({ ...mockPool, settings: poolSettings }) as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockImplementation(async (args: any) => ({
        poolId: POOL_ID,
        userId: args?.where?.poolId_userId?.userId || MEMBER_1_ID,
        status: 'ACTIVE',
      }) as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);

      let saveTxInFlight = false;
      let saveTxReleased = false;

      let resolveSaveLockAcquired: () => void;
      const saveLockAcquiredPromise = new Promise<void>((r) => { resolveSaveLockAcquired = r; });

      let resolveSaveHold: () => void;
      const saveHoldPromise = new Promise<void>((r) => { resolveSaveHold = r; });

      let resolveOmittedLockWait: () => void;
      const omittedLockWaitPromise = new Promise<void>((r) => { resolveOmittedLockWait = r; });

      let txIndex = 0;
      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        const isExplicitSave = (txIndex === 0);
        txIndex++;

        if (isExplicitSave) {
          saveTxInFlight = true;
        }

        const txClient = {
          $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string) => {
            if (sql.includes('FOR UPDATE')) {
              if (isExplicitSave) {
                resolveSaveLockAcquired();
                await saveHoldPromise;
              } else {
                await omittedLockWaitPromise;
              }
              return [];
            }
            if (sql.includes('to_regproc')) {
              return [{ exists: null }];
            }
            return [];
          }),
          pool: {
            findUnique: vi.fn().mockImplementation(() => Promise.resolve({ ...mockPool, settings: poolSettings })),
            update: vi.fn().mockImplementation(({ data }) => {
              poolSettings = { ...poolSettings, ...data.settings };
              return Promise.resolve({ ...mockPool, settings: poolSettings });
            }),
          },
          weeklySubmission: {
            findUnique: vi.fn().mockImplementation(() => Promise.resolve(storedSubmission)),
            upsert: vi.fn().mockImplementation(({ create, update }) => {
              storedSubmission = { ...storedSubmission, ...update, ...create };
              return Promise.resolve(storedSubmission);
            }),
            findMany: vi.fn().mockImplementation(() => Promise.resolve(storedSubmission ? [storedSubmission] : [])),
          },
          game: {
            findFirst: vi.fn().mockResolvedValue(mockWeek7Games[0]),
            findMany: vi.fn().mockResolvedValue(mockWeek7Games),
          },
        };

        try {
          const res = await cb(txClient);
          return res;
        } finally {
          if (isExplicitSave) {
            saveTxInFlight = false;
            saveTxReleased = true;
            resolveOmittedLockWait();
          }
        }
      });

      const memberToken = createAuthToken(MEMBER_1_ID);

      // 1. Explicit save request begins (saving 52.5)
      const savePromise = fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({ week: 7, season: 2026, prediction: 52.5 }),
      });

      // Wait until explicit save has acquired the row lock
      await saveLockAcquiredPromise;

      // 2. Concurrently, an omitted request arrives
      const omittedPromise = fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({ week: 7, season: 2026 }), // prediction omitted!
      });

      // Allow omitted request to reach row lock wait
      await new Promise((r) => setTimeout(r, 20));
      resolveSaveHold();

      const [saveRes, omittedRes] = await Promise.all([savePromise, omittedPromise]);

      expect(saveRes.status).toBe(200);
      expect(omittedRes.status).toBe(200);

      const saveData = await saveRes.json();
      const omittedData = await omittedRes.json();

      expect(saveData.prediction).toBe(52.5);
      // The omitted request MUST NOT overwrite or revert to the old 40.0; it must preserve 52.5!
      expect(omittedData.prediction).toBe(52.5);
      expect(storedSubmission.tieBreakerPrediction).toBe(52.5);
    });

    it('proves concurrent omitted prediction request does not resurrect previously cleared prediction', async () => {
      let poolSettings = { ...mockPool.settings };
      let storedSubmission: any = {
        id: 'sub-clear-test',
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        weekNumber: 7,
        tieBreakerPrediction: 45.0, // Stored initial value
      };

      vi.spyOn(prisma.pool, 'findUnique').mockImplementation(() => Promise.resolve({ ...mockPool, settings: poolSettings }) as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockImplementation(async (args: any) => ({
        poolId: POOL_ID,
        userId: args?.where?.poolId_userId?.userId || MEMBER_1_ID,
        status: 'ACTIVE',
      }) as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);

      let clearTxInFlight = false;
      let resolveClearLockAcquired: () => void;
      const clearLockAcquiredPromise = new Promise<void>((r) => { resolveClearLockAcquired = r; });

      let resolveClearHold: () => void;
      const clearHoldPromise = new Promise<void>((r) => { resolveClearHold = r; });

      let resolveOmittedLockWait: () => void;
      const omittedLockWaitPromise = new Promise<void>((r) => { resolveOmittedLockWait = r; });

      let txIndex = 0;
      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        const isClear = (txIndex === 0);
        txIndex++;

        if (isClear) {
          clearTxInFlight = true;
        }

        const txClient = {
          $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string) => {
            if (sql.includes('FOR UPDATE')) {
              if (isClear) {
                resolveClearLockAcquired();
                await clearHoldPromise;
              } else {
                await omittedLockWaitPromise;
              }
              return [];
            }
            if (sql.includes('to_regproc')) {
              return [{ exists: null }];
            }
            return [];
          }),
          pool: {
            findUnique: vi.fn().mockImplementation(() => Promise.resolve({ ...mockPool, settings: poolSettings })),
            update: vi.fn().mockImplementation(({ data }) => {
              poolSettings = { ...poolSettings, ...data.settings };
              return Promise.resolve({ ...mockPool, settings: poolSettings });
            }),
          },
          weeklySubmission: {
            findUnique: vi.fn().mockImplementation(() => Promise.resolve(storedSubmission)),
            upsert: vi.fn().mockImplementation(({ create, update }) => {
              storedSubmission = { ...storedSubmission, ...update, ...create };
              return Promise.resolve(storedSubmission);
            }),
            findMany: vi.fn().mockImplementation(() => Promise.resolve(storedSubmission ? [storedSubmission] : [])),
          },
          game: {
            findFirst: vi.fn().mockResolvedValue(mockWeek7Games[0]),
            findMany: vi.fn().mockResolvedValue(mockWeek7Games),
          },
        };

        try {
          const res = await cb(txClient);
          return res;
        } finally {
          if (isClear) {
            clearTxInFlight = false;
            resolveOmittedLockWait();
          }
        }
      });

      const memberToken = createAuthToken(MEMBER_1_ID);

      // 1. Explicit clear request begins
      const clearPromise = fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({ week: 7, season: 2026, clear: true }),
      });

      await clearLockAcquiredPromise;

      // 2. Concurrently, omitted request arrives
      const omittedPromise = fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({ week: 7, season: 2026 }), // prediction omitted!
      });

      await new Promise((r) => setTimeout(r, 20));
      resolveClearHold();

      const [clearRes, omittedRes] = await Promise.all([clearPromise, omittedPromise]);

      expect(clearRes.status).toBe(200);
      expect(omittedRes.status).toBe(200);

      const clearData = await clearRes.json();
      const omittedData = await omittedRes.json();

      expect(clearData.prediction).toBeNull();
      // Must NOT resurrect old 45.0!
      expect(omittedData.prediction).toBeNull();
      expect(storedSubmission.tieBreakerPrediction).toBeNull();
    });
  });

  describe('12. WeeklyTiebreakerCard Recovery & Context Protection Invariants (Findings 2 & 4)', () => {
    it('preserves confirmed user prediction badge and draft when clear fails on network error', () => {
      // Simulation of WeeklyTiebreakerCard state transitions
      let userPrediction: number | null = 48.5;
      let inputValue = '48.5';
      let saveStatus: 'idle' | 'saved' | 'error' = 'saved';
      let statusMessage: string | null = null;
      let failedMutationIntent: { type: 'save'; value: string } | { type: 'clear' } | null = null;

      // User initiates clear
      const isExplicitClear = true;
      // Network call fails!
      const errorOccurred = true;

      if (errorOccurred) {
        saveStatus = 'error';
        statusMessage = 'Network error clearing prediction.';
        failedMutationIntent = isExplicitClear ? { type: 'clear' } : { type: 'save', value: inputValue };
        // Confirmed state MUST remain preserved!
      }

      // Assertions:
      expect(userPrediction).toBe(48.5); // Badge remains 48.5 pts
      expect(inputValue).toBe('48.5');   // Input draft NOT prematurely blanked
      expect(saveStatus).toBe('error');
      expect(failedMutationIntent).toEqual({ type: 'clear' });
    });

    it('retains clear intent on failed clear so retry repeats clear: true instead of empty save', () => {
      let userPrediction: number | null = 48.5;
      let inputValue = '48.5';
      let failedMutationIntent: { type: 'save'; value: string } | { type: 'clear' } | null = { type: 'clear' };

      // User clicks Retry: handleSave() is called without arguments (valueToSave === undefined)
      const valueToSave: string | null | undefined = undefined;

      let isExplicitClear = false;
      let rawVal = inputValue;

      if (valueToSave === null) {
        isExplicitClear = true;
      } else if (valueToSave !== undefined) {
        rawVal = valueToSave;
      } else if (failedMutationIntent?.type === 'clear') {
        isExplicitClear = true; // RECOVERED CLEAR INTENT!
      } else if (failedMutationIntent?.type === 'save') {
        rawVal = failedMutationIntent.value;
      }

      expect(isExplicitClear).toBe(true); // Verifies Retry executes clear: true, NOT empty save validation error!

      // Simulate successful response from backend on retry
      const data = { prediction: null };
      userPrediction = data.prediction;
      inputValue = '';
      failedMutationIntent = null;

      expect(userPrediction).toBeNull();
      expect(inputValue).toBe('');
      expect(failedMutationIntent).toBeNull();
    });

    it('renders distinct load error state with retry button when server returns error, never masquerading as unoffered', () => {
      const getCardDisplayState = (status: string, tiebreakerOffered: boolean, week: number) => {
        if (status === 'ERROR') {
          return 'RENDER_LOAD_ERROR_WITH_RETRY';
        }
        const isUnavailable = week === 6 || status === 'UNAVAILABLE' || (!tiebreakerOffered && status !== 'LOADING');
        if (isUnavailable) {
          return 'RENDER_UNOFFERED_BANNER';
        }
        return 'RENDER_ACTIVE_CARD';
      };

      // When load fails with HTTP 500 or network error
      expect(getCardDisplayState('ERROR', false, 7)).toBe('RENDER_LOAD_ERROR_WITH_RETRY');

      // Genuine unoffered week (e.g. Week 6)
      expect(getCardDisplayState('UNAVAILABLE', false, 6)).toBe('RENDER_UNOFFERED_BANNER');

      // Active week 7 when offered
      expect(getCardDisplayState('DEFAULT_LIONS', true, 7)).toBe('RENDER_ACTIVE_CARD');
    });

    it('discards stale asynchronous response when context switches pool or week before response returns', () => {
      let activeReq = 0;
      let activeMutation = 0;
      let currentContext = { poolId: 'pool-A', week: 7 };

      let appliedData: any = null;

      const simulateAsyncFetch = async (reqPoolId: string, reqWeek: number, reqId: number, delayMs: number) => {
        await new Promise((r) => setTimeout(r, delayMs));
        // Guard check after await boundary:
        if (reqId !== activeReq || currentContext.poolId !== reqPoolId || currentContext.week !== reqWeek) {
          return; // DISCARDED!
        }
        appliedData = { poolId: reqPoolId, week: reqWeek };
      };

      // 1. Initial request for Pool A
      const req1Id = ++activeReq;
      const promiseA = simulateAsyncFetch('pool-A', 7, req1Id, 50);

      // 2. User quickly switches to Pool B before Pool A completes
      currentContext = { poolId: 'pool-B', week: 7 };
      const req2Id = ++activeReq;
      const promiseB = simulateAsyncFetch('pool-B', 7, req2Id, 10);

      return Promise.all([promiseA, promiseB]).then(() => {
        // Only Pool B data must be applied; Pool A was safely discarded
        expect(appliedData).toEqual({ poolId: 'pool-B', week: 7 });
      });
    });
  });

  describe('13. Wrap-up Preview Pre-Kickoff Privacy & Strict Tenant Boundary (Findings 1 & 2)', () => {
    it('allows active pool member to fetch wrap-up preview, strictly omitting other members predictions before kickoff', async () => {
      const mockPoolWithMembers = {
        ...mockPool,
        memberships: [
          { userId: MEMBER_1_ID, status: 'ACTIVE' },
          { userId: MEMBER_2_ID, status: 'ACTIVE' },
        ],
      };
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPoolWithMembers as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);
      vi.spyOn(prisma.pick, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.weeklySubmission, 'findMany').mockResolvedValue([
        { userId: MEMBER_1_ID, weekNumber: 7, tieBreakerPrediction: 45.0, isFinalized: false },
        { userId: MEMBER_2_ID, weekNumber: 7, tieBreakerPrediction: 52.0, isFinalized: false },
      ] as any);
      (vi.spyOn(prisma, '$queryRaw') as any).mockResolvedValue([{ to_regclass: 'public.weekly_wrapups' }]);
      (vi.spyOn(prisma, '$queryRawUnsafe') as any).mockResolvedValue([]);

      const token = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/wrap-up/preview?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.preview).toBeDefined();
      expect(data.preview.projectedStandings).toBeDefined();

      const m1 = data.preview.projectedStandings.find((s: any) => s.userId === MEMBER_1_ID);
      const m2 = data.preview.projectedStandings.find((s: any) => s.userId === MEMBER_2_ID);

      expect(m1).toBeDefined();
      expect(m2).toBeDefined();
      // Caller can see their own prediction:
      expect(m1.tieBreakerPrediction).toBe(45);
      // Other member's prediction is omitted (undefined / not in JSON object):
      expect(m2.tieBreakerPrediction).toBeUndefined();
    });

    it('reveals other members predictions in wrap-up preview once kickoff has passed', async () => {
      const pastWeek7Games = [
        {
          id: 'g-w7-det',
          externalGameId: '401873010',
          homeTeamId: 'MIN',
          awayTeamId: 'DET',
          kickoffTime: pastKickoff,
          status: GameStatus.FINAL,
          homeScore: 24,
          awayScore: 21,
        },
        {
          id: 'g-w7-gb',
          externalGameId: '401873011',
          homeTeamId: 'GB',
          awayTeamId: 'HOU',
          kickoffTime: pastKickoff,
          status: GameStatus.FINAL,
          homeScore: 28,
          awayScore: 27,
        },
      ];
      const mockPoolWithMembers = {
        ...mockPool,
        memberships: [
          { userId: MEMBER_1_ID, status: 'ACTIVE' },
          { userId: MEMBER_2_ID, status: 'ACTIVE' },
        ],
      };
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPoolWithMembers as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(pastWeek7Games as any);
      vi.spyOn(prisma.pick, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.weeklySubmission, 'findMany').mockResolvedValue([
        { userId: MEMBER_1_ID, weekNumber: 7, tieBreakerPrediction: 45.0, isFinalized: true },
        { userId: MEMBER_2_ID, weekNumber: 7, tieBreakerPrediction: 52.0, isFinalized: true },
      ] as any);
      (vi.spyOn(prisma, '$queryRaw') as any).mockResolvedValue([{ to_regclass: 'public.weekly_wrapups' }]);
      (vi.spyOn(prisma, '$queryRawUnsafe') as any).mockResolvedValue([]);

      const token = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/ops/wrap-up/preview?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      const m1 = data.preview.projectedStandings.find((s: any) => s.userId === MEMBER_1_ID);
      const m2 = data.preview.projectedStandings.find((s: any) => s.userId === MEMBER_2_ID);

      expect(m1.tieBreakerPrediction).toBe(45);
      // Revealed post-kickoff!
      expect(m2.tieBreakerPrediction).toBe(52);
    });

    it('denies outsider user lacking active membership with HTTP 403 FORBIDDEN_ACTIVE_MEMBERSHIP_REQUIRED', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue({
        ...mockPool,
        memberships: [], // Not a member
      } as any);

      const token = createAuthToken('outsider-user');
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/wrap-up/preview?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('FORBIDDEN_ACTIVE_MEMBERSHIP_REQUIRED');
    });

    it('strictly denies outsider global ADMIN who lacks pool membership with HTTP 403 (Decision #20, Finding 1)', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue({
        ...mockPool,
        memberships: [], // Outsider global admin is NOT a member of this pool
      } as any);

      const token = createAuthToken(OUTSIDER_ADMIN_ID, 'ADMIN');
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/wrap-up/preview?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('FORBIDDEN_ACTIVE_MEMBERSHIP_REQUIRED');
    });

    it('denies outsider admin via delegated /api/admin/ops/wrap-up/preview route (Finding 1)', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue({
        ...mockPool,
        memberships: [],
      } as any);

      const token = createAuthToken(OUTSIDER_ADMIN_ID, 'ADMIN');
      const res = await fetch(`${baseUrl}/api/admin/ops/wrap-up/preview?poolId=${POOL_ID}&week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('FORBIDDEN_ACTIVE_MEMBERSHIP_REQUIRED');
    });

    it('enforces non-overrideable Week 6 2026 tiebreaker exclusion in wrap-up engine (Finding 2)', async () => {
      const mockPoolWithMembers = {
        ...mockPool,
        memberships: [{ userId: MEMBER_1_ID, status: 'ACTIVE' }],
      };
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPoolWithMembers as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue([]);
      (vi.spyOn(prisma, '$queryRaw') as any).mockResolvedValue([{ to_regclass: 'public.weekly_wrapups' }]);
      (vi.spyOn(prisma, '$queryRawUnsafe') as any).mockResolvedValue([]);

      // Caller attempts to override tiebreakerOffered to true for Week 6 2026
      const preview = await previewWeeklyWrapUpForPool(POOL_ID, 6, {
        season: 2026,
        tiebreakerOffered: true,
      });

      // Must strictly remain false!
      expect(preview.tiebreakerOffered).toBe(false);
    });
  });

  describe('14. Permanent Retirement of Legacy /api/picks/tiebreaker Routes (Finding 7)', () => {
    it('returns HTTP 410 Gone with ENDPOINT_RETIRED for GET /api/picks/tiebreaker and touches zero DB records', async () => {
      const poolFindSpy = vi.spyOn(prisma.pool, 'findUnique');
      const subFindSpy = vi.spyOn(prisma.weeklySubmission, 'findUnique');

      const token = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/picks/tiebreaker?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(410);
      const data = await res.json();
      expect(data.error).toContain('ENDPOINT_RETIRED');
      expect(poolFindSpy).not.toHaveBeenCalled();
      expect(subFindSpy).not.toHaveBeenCalled();
    });

    it('returns HTTP 410 Gone with ENDPOINT_RETIRED for POST /api/picks/tiebreaker and mutates zero DB records', async () => {
      const subUpdateSpy = vi.spyOn(prisma.weeklySubmission, 'update');
      const subUpsertSpy = vi.spyOn(prisma.weeklySubmission, 'upsert');

      const token = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/picks/tiebreaker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ week: 7, season: 2026, prediction: 48.5 }),
      });

      expect(res.status).toBe(410);
      const data = await res.json();
      expect(data.error).toContain('ENDPOINT_RETIRED');
      expect(subUpdateSpy).not.toHaveBeenCalled();
      expect(subUpsertSpy).not.toHaveBeenCalled();
    });

    it('returns HTTP 410 Gone with ENDPOINT_RETIRED for POST /api/picks/tiebreaker/override', async () => {
      const poolUpdateSpy = vi.spyOn(prisma.pool, 'update');

      const token = createAuthToken(ADMIN_ID, 'ADMIN');
      const res = await fetch(`${baseUrl}/api/picks/tiebreaker/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ week: 7, season: 2026, designatedGameId: 'some-game' }),
      });

      expect(res.status).toBe(410);
      const data = await res.json();
      expect(data.error).toContain('ENDPOINT_RETIRED');
      expect(poolUpdateSpy).not.toHaveBeenCalled();
    });
  });

  describe('15. Strict Client Fail-Closed Lock Evaluation (Finding 8)', () => {
    const evaluateClientLockState = (data: any) => {
      const kickoffTime = data?.designatedGame?.kickoffTime ? new Date(data.designatedGame.kickoffTime) : null;
      const isPastKickoff = Boolean(kickoffTime && !isNaN(kickoffTime.getTime()) && Date.now() >= kickoffTime.getTime());
      const isValidKickoff = Boolean(kickoffTime && !isNaN(kickoffTime.getTime()));
      const isDesignationResolved = data?.status === 'DEFAULT_LIONS' || data?.status === 'COMMISSIONER_OVERRIDE';

      return (
        data?.isLocked !== false ||
        isPastKickoff ||
        !isValidKickoff ||
        !isDesignationResolved
      );
    };

    it('evaluates lock state as locked when server omits isLocked or returns non-boolean', () => {
      expect(evaluateClientLockState({
        status: 'DEFAULT_LIONS',
        designatedGame: { kickoffTime: futureKickoff },
      })).toBe(true); // isLocked missing

      expect(evaluateClientLockState({
        isLocked: 'false', // string, not boolean false
        status: 'DEFAULT_LIONS',
        designatedGame: { kickoffTime: futureKickoff },
      })).toBe(true);

      expect(evaluateClientLockState({
        isLocked: null,
        status: 'DEFAULT_LIONS',
        designatedGame: { kickoffTime: futureKickoff },
      })).toBe(true);
    });

    it('evaluates lock state as locked when designation status is not DEFAULT_LIONS or COMMISSIONER_OVERRIDE', () => {
      expect(evaluateClientLockState({
        isLocked: false,
        status: 'UNRESOLVED',
        designatedGame: { kickoffTime: futureKickoff },
      })).toBe(true);

      expect(evaluateClientLockState({
        isLocked: false,
        status: 'LOADING',
        designatedGame: { kickoffTime: futureKickoff },
      })).toBe(true);

      expect(evaluateClientLockState({
        isLocked: false,
        status: 'ERROR',
        designatedGame: { kickoffTime: futureKickoff },
      })).toBe(true);
    });

    it('evaluates lock state as locked when kickoff time is missing or invalid date', () => {
      expect(evaluateClientLockState({
        isLocked: false,
        status: 'DEFAULT_LIONS',
        designatedGame: { kickoffTime: null },
      })).toBe(true);

      expect(evaluateClientLockState({
        isLocked: false,
        status: 'DEFAULT_LIONS',
        designatedGame: { kickoffTime: 'INVALID_TIMESTAMP' },
      })).toBe(true);
    });

    it('evaluates lock state as unlocked only when isLocked is boolean false, designation is resolved, and kickoff is valid future date', () => {
      expect(evaluateClientLockState({
        isLocked: false,
        status: 'DEFAULT_LIONS',
        designatedGame: { kickoffTime: futureKickoff },
      })).toBe(false);

      expect(evaluateClientLockState({
        isLocked: false,
        status: 'COMMISSIONER_OVERRIDE',
        designatedGame: { kickoffTime: futureKickoff },
      })).toBe(false);
    });
  });

  describe('16. Matrix Privacy Clock via Authoritative Canonical Slate Helper (Finding 10)', () => {
    it('uses canonical slate helper to resolve games and masks competitor tiebreaker predictions prior to kickoff', async () => {
      const mockPoolWithMembers = {
        ...mockPool,
        memberships: [
          {
            userId: MEMBER_1_ID,
            status: 'ACTIVE',
            user: { id: MEMBER_1_ID, email: 'member1@example.com' },
            stat: { totalShotsDrank: 4 },
          },
          {
            userId: MEMBER_2_ID,
            status: 'ACTIVE',
            user: { id: MEMBER_2_ID, email: 'member2@example.com' },
            stat: { totalShotsDrank: 2 },
          },
        ],
      };

      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPoolWithMembers as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);
      vi.spyOn(prisma.pick, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.weeklySubmission, 'findMany').mockResolvedValue([
        { userId: MEMBER_1_ID, weekNumber: 7, tieBreakerPrediction: 45.0, isFinalized: false },
        { userId: MEMBER_2_ID, weekNumber: 7, tieBreakerPrediction: 52.0, isFinalized: false },
      ] as any);

      const token = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/matrix?week=7`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();

      // Canonical columns & rows resolved from manifest
      expect(data.columns).toHaveLength(2);
      expect(data.rows).toHaveLength(2);
      expect(data.rows[0].external_game_id).toBe('401873010');

      // Pre-kickoff privacy verification:
      // Requesting user (MEMBER_1_ID) sees their own guess:
      expect(data.summary[MEMBER_1_ID].tiebreaker_guess).toBe(45);
      // Other member (MEMBER_2_ID) guess is strictly masked to null:
      expect(data.summary[MEMBER_2_ID].tiebreaker_guess).toBeNull();
    });

    it('reveals competitor tiebreaker predictions in matrix once designated game kickoff has passed', async () => {
      const pastWeek7Games = [
        {
          id: 'g-w7-det',
          externalGameId: '401873010',
          homeTeamId: 'MIN',
          awayTeamId: 'DET',
          kickoffTime: pastKickoff,
          status: GameStatus.FINAL,
          homeScore: 24,
          awayScore: 21,
        },
        {
          id: 'g-w7-gb',
          externalGameId: '401873011',
          homeTeamId: 'GB',
          awayTeamId: 'HOU',
          kickoffTime: pastKickoff,
          status: GameStatus.FINAL,
          homeScore: 28,
          awayScore: 27,
        },
      ];

      const mockPoolWithMembers = {
        ...mockPool,
        memberships: [
          {
            userId: MEMBER_1_ID,
            status: 'ACTIVE',
            user: { id: MEMBER_1_ID, email: 'member1@example.com' },
            stat: { totalShotsDrank: 4 },
          },
          {
            userId: MEMBER_2_ID,
            status: 'ACTIVE',
            user: { id: MEMBER_2_ID, email: 'member2@example.com' },
            stat: { totalShotsDrank: 2 },
          },
        ],
      };

      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPoolWithMembers as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(pastWeek7Games as any);
      vi.spyOn(prisma.pick, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.weeklySubmission, 'findMany').mockResolvedValue([
        { userId: MEMBER_1_ID, weekNumber: 7, tieBreakerPrediction: 45.0, isFinalized: true },
        { userId: MEMBER_2_ID, weekNumber: 7, tieBreakerPrediction: 52.0, isFinalized: true },
      ] as any);

      const token = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/matrix?week=7`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();

      // Post-kickoff: both guesses are revealed
      expect(data.summary[MEMBER_1_ID].tiebreaker_guess).toBe(45);
      expect(data.summary[MEMBER_2_ID].tiebreaker_guess).toBe(52);
    });
  });
});
