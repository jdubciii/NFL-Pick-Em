import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import http from 'http';
import jwt from 'jsonwebtoken';
import { picksRouter } from '../src/routes/picks';
import { adminOpsRouter } from '../src/routes/adminOps';
import prisma from '../src/db/client';
import { JWT_SECRET } from '../src/middleware/auth';
import {
  setSupabaseAuthClientForTesting,
  createSyntheticSupabaseToken,
} from '../src/middleware/auth';
import {
  executeWeeklyWrapUpForPool,
  previewWeeklyWrapUpForPool,
} from '../src/services/wrapUpEngine';
import { GameStatus } from '@prisma/client';

describe('Phase 41 Phase A: Picks, Tiebreaker and Settlement Contract', () => {
  const POOL_ID = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';
  const ADMIN_ID = 'a1111111-1111-1111-1111-111111111111';
  const MEMBER_1_ID = 'b2222222-2222-2222-2222-222222222222';
  const MEMBER_2_ID = 'c3333333-3333-3333-3333-333333333333';

  let app: express.Application;
  let server: http.Server;
  let baseUrl: string;

  const createAuthToken = (userId: string, role = 'USER') => {
    return createSyntheticSupabaseToken({ id: userId, email: `${userId}@example.com`, role });
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

    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }: any) => {
      return {
        id: where.id,
        email: `${where.id}@example.com`,
        role: where.id === ADMIN_ID ? 'ADMIN' : 'USER',
        createdAt: new Date(),
      } as any;
    });

    app = express();
    app.use(express.json());
    app.use('/api/picks', picksRouter);
    app.use('/api/admin/ops', adminOpsRouter);

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

  describe('Section 6: Member Prediction Entry & Validation', () => {
    const futureKickoff = new Date(Date.now() + 86400000).toISOString();
    const pastKickoff = new Date(Date.now() - 3600000).toISOString();

    const mockPool = {
      id: POOL_ID,
      adminId: ADMIN_ID,
      settings: { season: 2026 },
    };

    const mockGames = [
      {
        id: 'g-det',
        externalGameId: '401872999',
        homeTeamId: 'DET',
        awayTeamId: 'CHI',
        kickoffTime: futureKickoff,
        status: GameStatus.SCHEDULED,
      },
    ];

    it('accepts valid predictions from 0.00 to 999.99 with up to 2 decimal places', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockGames as any);
      vi.spyOn(prisma.game, 'findFirst').mockResolvedValue(mockGames[0] as any);

      const upsertMock = vi.fn().mockResolvedValue({
        id: 'sub-1',
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        weekNumber: 6,
        tieBreakerPrediction: 48.5,
      });

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          game: { findFirst: vi.fn().mockResolvedValue(mockGames[0]) },
          weeklySubmission: { upsert: upsertMock },
          pool: { update: vi.fn() },
        });
      });

      const token = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/picks/tiebreaker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_id: POOL_ID,
          week: 6,
          prediction: '48.50',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.prediction).toBe(48.5);
    });

    it('rejects negative, nonfinite, > 999.99, and excess decimal precision predictions', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockGames as any);

      const token = createAuthToken(MEMBER_1_ID);

      const invalidValues = ['-5.00', '1000.00', '45.123', 'NaN', 'Infinity', 'abc'];

      for (const val of invalidValues) {
        const res = await fetch(`${baseUrl}/api/picks/tiebreaker`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            pool_id: POOL_ID,
            week: 6,
            prediction: val,
          }),
        });

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('INVALID_PREDICTION');
      }
    });

    it('strictly forbids submission, edit, or clear after kickoff', async () => {
      const lockedGames = [
        {
          id: 'g-det',
          externalGameId: '401872999',
          homeTeamId: 'DET',
          awayTeamId: 'CHI',
          kickoffTime: pastKickoff, // kickoff in the past!
          status: GameStatus.IN_PROGRESS,
        },
      ];

      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(lockedGames as any);

      const token = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/picks/tiebreaker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_id: POOL_ID,
          week: 6,
          prediction: 45.0,
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('KICKOFF_PASSED');
    });

    it('permits explicit clear before kickoff and preserves existing prediction on omitted field', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockGames as any);

      const upsertMock = vi.fn().mockResolvedValue({
        id: 'sub-1',
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        weekNumber: 6,
        tieBreakerPrediction: null,
      });

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          game: { findFirst: vi.fn().mockResolvedValue(mockGames[0]) },
          weeklySubmission: { upsert: upsertMock },
          pool: { update: vi.fn() },
        });
      });

      const token = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/picks/tiebreaker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_id: POOL_ID,
          week: 6,
          clear: true,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.prediction).toBeNull();
      expect(data.message).toContain('cleared');
    });

    it('rejects unauthenticated user or inactive pool membership', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue(null); // not a member

      const token = createAuthToken('outsider-user');
      const res = await fetch(`${baseUrl}/api/picks/tiebreaker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_id: POOL_ID,
          week: 6,
          prediction: 45.0,
        }),
      });

      expect(res.status).toBe(403);
    });
  });

  describe('Section 6 Privacy: Prediction Privacy Before Kickoff', () => {
    const futureKickoff = new Date(Date.now() + 86400000).toISOString();
    const mockPool = {
      id: POOL_ID,
      adminId: ADMIN_ID,
      settings: { season: 2026 },
    };
    const mockGames = [
      {
        id: 'g-det',
        externalGameId: '401872999',
        homeTeamId: 'DET',
        awayTeamId: 'CHI',
        kickoffTime: futureKickoff,
        status: GameStatus.SCHEDULED,
      },
    ];

    it('never exposes numeric predictions of other members to commissioner before kickoff', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: ADMIN_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockGames as any);
      vi.spyOn(prisma.weeklySubmission, 'findUnique').mockResolvedValue(null);

      vi.spyOn(prisma.poolMembership, 'findMany').mockResolvedValue([
        { poolId: POOL_ID, userId: MEMBER_1_ID, status: 'ACTIVE', user: { id: MEMBER_1_ID, email: 'm1@ex.com' } },
        { poolId: POOL_ID, userId: MEMBER_2_ID, status: 'ACTIVE', user: { id: MEMBER_2_ID, email: 'm2@ex.com' } },
      ] as any);

      vi.spyOn(prisma.weeklySubmission, 'findMany').mockResolvedValue([
        { poolId: POOL_ID, userId: MEMBER_1_ID, weekNumber: 6, tieBreakerPrediction: 45.5 },
      ] as any);

      // Commissioner requests readiness view
      const token = createAuthToken(ADMIN_ID, 'ADMIN');
      const res = await fetch(`${baseUrl}/api/picks/tiebreaker?pool_id=${POOL_ID}&week=6`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.isLocked).toBe(false);
      expect(data.readiness).toBeDefined();

      // Member 1 has submitted, Member 2 has not
      const m1 = data.readiness.find((r: any) => r.userId === MEMBER_1_ID);
      const m2 = data.readiness.find((r: any) => r.userId === MEMBER_2_ID);
      expect(m1.hasSubmitted).toBe(true);
      expect(m2.hasSubmitted).toBe(false);

      // PRIVACY INVARIANT: prediction value must be undefined/unrevealed before kickoff!
      expect(m1.prediction).toBeUndefined();
      expect(m2.prediction).toBeUndefined();
    });
  });

  describe('Section 8 & 10: Settlement Engine Invariants', () => {
    it('fails closed when games in weekly slate are not yet official FINAL', async () => {
      const incompleteGames = [
        {
          id: 'g1',
          externalGameId: '401872999',
          homeTeamId: 'DET',
          awayTeamId: 'CHI',
          kickoffTime: new Date(Date.now() - 7200000),
          status: GameStatus.IN_PROGRESS, // Not final!
          homeScore: 14,
          awayScore: 10,
        },
      ];

      const mockDb: any = {
        $transaction: async (cb: any) => cb(mockDb),
        $queryRaw: vi.fn().mockResolvedValue([{ to_regclass: 'public.weekly_wrapups' }]),
        $queryRawUnsafe: vi.fn().mockResolvedValue([{ pool_id: POOL_ID, week_number: 6 }]),
        pool: {
          findUnique: vi.fn().mockResolvedValue({
            id: POOL_ID,
            adminId: ADMIN_ID,
            memberships: [{ userId: MEMBER_1_ID, status: 'ACTIVE' }],
            settings: { season: 2026 },
          }),
        },
        game: {
          findMany: vi.fn().mockResolvedValue(incompleteGames),
        },
      };

      const result = await executeWeeklyWrapUpForPool(POOL_ID, 6, { prismaClient: mockDb });
      expect(result.applied).toBe(false);
      expect(result.reason).toBe('WEEK_NOT_FINAL');
      expect(result.pendingCount).toBe(1);
    });

    it('fails closed when designated tiebreaker game is unresolved or missing', async () => {
      const byeGames = [
        {
          id: 'g2',
          externalGameId: '401873000',
          homeTeamId: 'GB',
          awayTeamId: 'MIN',
          kickoffTime: new Date(Date.now() - 7200000),
          status: GameStatus.FINAL,
          homeScore: 24,
          awayScore: 21,
        },
      ];

      const mockDb: any = {
        $transaction: async (cb: any) => cb(mockDb),
        $queryRaw: vi.fn().mockResolvedValue([{ to_regclass: 'public.weekly_wrapups' }]),
        $queryRawUnsafe: vi.fn().mockResolvedValue([{ pool_id: POOL_ID, week_number: 6 }]),
        pool: {
          findUnique: vi.fn().mockResolvedValue({
            id: POOL_ID,
            adminId: ADMIN_ID,
            memberships: [{ userId: MEMBER_1_ID, status: 'ACTIVE' }],
            settings: { season: 2026 },
          }),
        },
        game: {
          findMany: vi.fn().mockResolvedValue(byeGames),
        },
      };

      await expect(
        executeWeeklyWrapUpForPool(POOL_ID, 6, { prismaClient: mockDb })
      ).rejects.toThrow('DESIGNATED_GAME_UNAVAILABLE');
    });

    it('enforces read-only commissioner preview (Decision #54) returning NOT_READY if pending', async () => {
      const mockDb: any = {
        pool: {
          findUnique: vi.fn().mockResolvedValue({
            id: POOL_ID,
            adminId: ADMIN_ID,
            memberships: [{ userId: MEMBER_1_ID, status: 'ACTIVE' }],
            settings: { season: 2026 },
          }),
        },
        game: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: 'g1',
              externalGameId: '401872999',
              homeTeamId: 'DET',
              awayTeamId: 'CHI',
              kickoffTime: new Date(Date.now() - 7200000),
              status: GameStatus.IN_PROGRESS,
              homeScore: null,
              awayScore: null,
            },
          ]),
        },
        $queryRawUnsafe: vi.fn().mockResolvedValue([]),
        weeklySubmission: { findMany: vi.fn().mockResolvedValue([]) },
      };

      const preview = await previewWeeklyWrapUpForPool(POOL_ID, 6, { prismaClient: mockDb });
      expect(preview.readyToSettle).toBe(false);
      expect(preview.reasonsIfNotReady.some((r) => r.includes('WEEK_NOT_FINAL'))).toBe(true);
    });

    it('enforces Section 7 safeguard: Week 6 defaults to tiebreakerOffered: false', async () => {
      const mockDb: any = {
        pool: {
          findUnique: vi.fn().mockResolvedValue({
            id: POOL_ID,
            adminId: ADMIN_ID,
            memberships: [
              { userId: MEMBER_1_ID, status: 'ACTIVE' },
              { userId: MEMBER_2_ID, status: 'ACTIVE' },
            ],
            settings: { season: 2026 },
          }),
        },
        game: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: 'g1',
              externalGameId: '401872999',
              homeTeamId: 'DET',
              awayTeamId: 'CHI',
              kickoffTime: new Date(Date.now() - 7200000),
              status: GameStatus.FINAL,
              homeScore: 28,
              awayScore: 20,
            },
          ]),
        },
        $queryRawUnsafe: vi.fn().mockResolvedValue([]),
        weeklySubmission: { findMany: vi.fn().mockResolvedValue([]) },
      };

      const preview = await previewWeeklyWrapUpForPool(POOL_ID, 6, { prismaClient: mockDb });
      // Week 6 safeguard: tiebreakerOffered must be false!
      expect(preview.tiebreakerOffered).toBe(false);
      // Both tied at 0 points -> both share rank 1 with 0 shots
      expect(preview.projectedStandings[0].rank).toBe(1);
      expect(preview.projectedStandings[0].shots).toBe(0);
      expect(preview.projectedStandings[1].rank).toBe(1);
      expect(preview.projectedStandings[1].shots).toBe(0);
    });
  });
});
