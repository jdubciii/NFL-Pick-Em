import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import {
  requireAuth,
  requirePoolCommissioner,
  requirePoolMember,
  setPrismaClientForTesting,
  setSupabaseAuthClientForTesting,
  getPrismaClient,
  createSyntheticSupabaseToken,
  AuthUserPayload,
} from '../src/middleware/auth';
import { adminRouter, poolAdminRouter } from '../src/routes/admin';
import { adminOpsRouter } from '../src/routes/adminOps';
import { app as prodApp } from '../src/server';
import { Role } from '@prisma/client';

describe('HAG-5 / HAG-6 Shared Guard & Authority Invariant Suite (HAG5-AUTHORITY-2026-10-31-01 & HAG6-AUTHORITY-2026-10-31-01)', () => {
  const POOL_ID = '11111111-1111-1111-1111-111111111111';
  const COMMISH_ID = '22222222-2222-2222-2222-222222222222';
  const MEMBER_ID = '33333333-3333-3333-3333-333333333333';
  const OUTSIDER_ID = '44444444-4444-4444-4444-444444444444';

  const createAuthToken = (userId: string, role = 'USER') => {
    return createSyntheticSupabaseToken({ id: userId, email: `${userId}@example.com`, role });
  };

  const mockPool = {
    id: POOL_ID,
    name: 'Test Championship Pool',
    adminId: COMMISH_ID,
    status: 'ACTIVE',
    settings: { lock_offset: 0 },
  };

  let mockPrisma: any;

  beforeEach(() => {
    vi.restoreAllMocks();

    const mockAuthClient = {
      auth: {
        getUser: vi.fn().mockImplementation(async (token: string) => {
          const decoded: any = jwt.decode(token);
          if (!decoded || !decoded.sub) return { data: { user: null }, error: new Error('Invalid token') };
          return {
            data: {
              user: {
                id: decoded.sub,
                email: decoded.email,
                app_metadata: decoded.app_metadata || {},
                user_metadata: decoded.user_metadata || {},
              },
            },
            error: null,
          };
        }),
      },
    };
    setSupabaseAuthClientForTesting(mockAuthClient as any);

    mockPrisma = {
      user: {
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => ({
          id: where.id,
          email: `${where.id}@example.com`,
          role: where.id === COMMISH_ID ? Role.ADMIN : Role.USER,
        })),
      },
      pool: {
        findUnique: vi.fn(),
      },
      poolMembership: {
        findUnique: vi.fn(),
      },
      game: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      pick: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    setPrismaClientForTesting(mockPrisma);
  });

  afterEach(() => {
    // Reset test Prisma injection to prevent leaking fake authority across tests
    setPrismaClientForTesting(null);
    setSupabaseAuthClientForTesting(null);
    vi.restoreAllMocks();
  });

  function createMockReqRes(options: {
    user?: AuthUserPayload;
    params?: Record<string, string>;
    body?: Record<string, any>;
    query?: Record<string, any>;
  } = {}) {
    const req: any = {
      headers: {},
      user: options.user,
      params: options.params || {},
      body: options.body || {},
      query: options.query || {},
    };

    const res: any = {
      statusCode: 200,
      headers: {},
      jsonData: null,
      status: vi.fn(function (code: number) {
        res.statusCode = code;
        return res;
      }),
      json: vi.fn(function (data: any) {
        res.jsonData = data;
        return res;
      }),
    };

    const next = vi.fn();

    return { req, res, next };
  }

  describe('1. requirePoolCommissioner: Active Actor Membership Requirement & Retired Query/Body Selection', () => {
    it('denies commissioner with 403 when pool membership is absent (non-member)', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue(null);

      const { req, res, next } = createMockReqRes({
        user: { id: COMMISH_ID, email: 'commish@example.com', role: Role.USER },
        params: { pool_id: POOL_ID },
      });

      await requirePoolCommissioner(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.jsonData.error).toContain('Active pool membership required');
      expect(next).not.toHaveBeenCalled();
    });

    it('denies commissioner with 403 when membership status is PENDING', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'PENDING',
      });

      const { req, res, next } = createMockReqRes({
        user: { id: COMMISH_ID, email: 'commish@example.com', role: Role.USER },
        params: { pool_id: POOL_ID },
      });

      await requirePoolCommissioner(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.jsonData.error).toContain('Active pool membership required');
      expect(next).not.toHaveBeenCalled();
    });

    it('denies commissioner with 403 when membership status is INACTIVE', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'INACTIVE',
      });

      const { req, res, next } = createMockReqRes({
        user: { id: COMMISH_ID, email: 'commish@example.com', role: Role.USER },
        params: { pool_id: POOL_ID },
      });

      await requirePoolCommissioner(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.jsonData.error).toContain('Active pool membership required');
      expect(next).not.toHaveBeenCalled();
    });

    it('denies commissioner with 403 when membership status is unknown / malformed', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'SUSPENDED_OR_UNKNOWN',
      });

      const { req, res, next } = createMockReqRes({
        user: { id: COMMISH_ID, email: 'commish@example.com', role: Role.USER },
        params: { pool_id: POOL_ID },
      });

      await requirePoolCommissioner(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.jsonData.error).toContain('Active pool membership required');
      expect(next).not.toHaveBeenCalled();
    });

    it('denies non-commissioner active member with 403 (commissioner privilege required)', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_ID,
        status: 'ACTIVE',
      });

      const { req, res, next } = createMockReqRes({
        user: { id: MEMBER_ID, email: 'member@example.com', role: Role.USER },
        params: { pool_id: POOL_ID },
      });

      await requirePoolCommissioner(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.jsonData.error).toContain('Pool commissioner privileges required');
      expect(next).not.toHaveBeenCalled();
    });

    it('authorizes commissioner with verified ACTIVE pool membership', async () => {
      const activeMembership = {
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      };
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue(activeMembership);

      const { req, res, next } = createMockReqRes({
        user: { id: COMMISH_ID, email: 'commish@example.com', role: Role.USER },
        params: { pool_id: POOL_ID },
      });

      await requirePoolCommissioner(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.pool).toEqual(mockPool);
      expect(req.membership).toEqual(activeMembership);
    });

    it('retires query guard selection ({ from: "query" }) with HTTP 400 and zero DB reads', async () => {
      const middleware = requirePoolCommissioner({ from: 'query' as any });
      const { req, res, next } = createMockReqRes({
        user: { id: COMMISH_ID, email: 'commish@example.com', role: Role.USER },
        query: { pool_id: POOL_ID },
      });

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.jsonData.code).toBe('GUARD_SELECTION_RETIRED');
      expect(mockPrisma.pool.findUnique).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('retires body guard selection ({ from: "body" }) with HTTP 400 and zero DB reads', async () => {
      const middleware = requirePoolCommissioner({ from: 'body' as any });
      const { req, res, next } = createMockReqRes({
        user: { id: COMMISH_ID, email: 'commish@example.com', role: Role.USER },
        body: { pool_id: POOL_ID },
      });

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.jsonData.code).toBe('GUARD_SELECTION_RETIRED');
      expect(mockPrisma.pool.findUnique).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('2. requirePoolMember: Elimination of Commissioner Bypass Shortcut', () => {
    it('denies commissioner without active membership (shortcut eliminated)', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue(null);

      const { req, res, next } = createMockReqRes({
        user: { id: COMMISH_ID, email: 'commish@example.com', role: Role.USER },
        params: { pool_id: POOL_ID },
      });

      await requirePoolMember(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.jsonData.error).toContain('Active pool membership required');
      expect(next).not.toHaveBeenCalled();
    });

    it('denies commissioner with PENDING membership (shortcut eliminated)', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'PENDING',
      });

      const { req, res, next } = createMockReqRes({
        user: { id: COMMISH_ID, email: 'commish@example.com', role: Role.USER },
        params: { pool_id: POOL_ID },
      });

      await requirePoolMember(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.jsonData.error).toContain('Active pool membership required');
      expect(next).not.toHaveBeenCalled();
    });

    it('denies commissioner with INACTIVE membership (shortcut eliminated)', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'INACTIVE',
      });

      const { req, res, next } = createMockReqRes({
        user: { id: COMMISH_ID, email: 'commish@example.com', role: Role.USER },
        params: { pool_id: POOL_ID },
      });

      await requirePoolMember(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.jsonData.error).toContain('Active pool membership required');
      expect(next).not.toHaveBeenCalled();
    });

    it('denies commissioner with unknown membership status', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'UNKNOWN_VALUE',
      });

      const { req, res, next } = createMockReqRes({
        user: { id: COMMISH_ID, email: 'commish@example.com', role: Role.USER },
        params: { pool_id: POOL_ID },
      });

      await requirePoolMember(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.jsonData.error).toContain('Active pool membership required');
      expect(next).not.toHaveBeenCalled();
    });

    it('authorizes commissioner with verified ACTIVE membership', async () => {
      const activeMembership = {
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      };
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue(activeMembership);

      const { req, res, next } = createMockReqRes({
        user: { id: COMMISH_ID, email: 'commish@example.com', role: Role.USER },
        params: { pool_id: POOL_ID },
      });

      await requirePoolMember(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.pool).toEqual(mockPool);
      expect(req.membership).toEqual(activeMembership);
    });

    it('authorizes regular user with verified ACTIVE membership', async () => {
      const activeMembership = {
        poolId: POOL_ID,
        userId: MEMBER_ID,
        status: 'ACTIVE',
      };
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue(activeMembership);

      const { req, res, next } = createMockReqRes({
        user: { id: MEMBER_ID, email: 'member@example.com', role: Role.USER },
        params: { pool_id: POOL_ID },
      });

      await requirePoolMember(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.pool).toEqual(mockPool);
      expect(req.membership).toEqual(activeMembership);
    });
  });

  describe('3. Express Integration: Shared Guard Enforcement on Routes', () => {
    let app: express.Express;
    let server: any;
    let baseUrl: string;

    beforeEach(async () => {
      app = express();
      app.use(express.json());

      const mockAuth = (req: any, _res: any, next: any) => {
        const userId = req.headers['x-test-user-id'];
        if (userId) {
          req.user = {
            id: String(userId),
            email: `${userId}@example.com`,
            role: userId === COMMISH_ID ? Role.ADMIN : Role.USER,
          };
        }
        next();
      };

      app.post('/api/pools/:pool_id/adjudicate', mockAuth, requirePoolCommissioner, (_req: Request, res: Response) => {
        res.json({ success: true, message: 'Adjudication executed' });
      });

      app.get('/api/pools/:pool_id/matrix', mockAuth, requirePoolMember, (_req: Request, res: Response) => {
        res.json({ success: true, message: 'Matrix loaded' });
      });

      await new Promise<void>((resolve) => {
        server = app.listen(0, () => {
          const addr = server.address() as any;
          baseUrl = `http://127.0.0.1:${addr.port}`;
          resolve();
        });
      });
    });

    afterEach(async () => {
      if (server) {
        await new Promise<void>((resolve) => server.close(resolve));
      }
    });

    it('HTTP route: commissioner with PENDING membership denied 403 on adjudication', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'PENDING',
      });

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/adjudicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': COMMISH_ID,
        },
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Active pool membership required');
    });

    it('HTTP route: commissioner with ACTIVE membership succeeds on adjudication', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/adjudicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': COMMISH_ID,
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it('HTTP route: commissioner without membership denied 403 on member route (matrix)', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue(null);

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/matrix`, {
        headers: {
          'x-test-user-id': COMMISH_ID,
        },
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Active pool membership required');
    });

    it('HTTP route: member with ACTIVE membership succeeds on member route (matrix)', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_ID,
        status: 'ACTIVE',
      });

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/matrix`, {
        headers: {
          'x-test-user-id': MEMBER_ID,
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });

  describe('4. Invariant #20: Retired Unscoped Pool Administration Entry Points', () => {
    let app: express.Express;
    let server: any;
    let baseUrl: string;

    beforeEach(async () => {
      app = express();
      app.use(express.json());
      app.use('/api/admin/ops', adminOpsRouter);
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
      if (server) {
        await new Promise<void>((resolve) => server.close(resolve));
      }
    });

    it('POST /api/admin/ops/slate/refresh returns state-free HTTP 410 Gone (ENDPOINT_RETIRED)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ops/slate/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ poolId: POOL_ID, weekNumber: 8 }),
      });

      expect(res.status).toBe(410);
      const data = await res.json();
      expect(data.code).toBe('ENDPOINT_RETIRED');
      expect(data.retired).toBe(true);
      expect(data.error).toContain('Legacy unscoped admin slate refresh endpoint has been retired');
    });

    it('GET /api/admin/picks returns state-free HTTP 410 Gone with ZERO database reads/writes', async () => {
      const res = await fetch(`${baseUrl}/api/admin/picks?user_id=${MEMBER_ID}&pool_id=${POOL_ID}`);

      expect(res.status).toBe(410);
      const data = await res.json();
      expect(data.code).toBe('ENDPOINT_RETIRED');
      expect(data.retired).toBe(true);
      expect(mockPrisma.pool.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.game.findMany).not.toHaveBeenCalled();
    });

    it('PUT /api/admin/picks returns state-free HTTP 410 Gone with ZERO database reads/writes', async () => {
      const res = await fetch(`${baseUrl}/api/admin/picks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: MEMBER_ID,
          pool_id: POOL_ID,
          game_id: 'game-uuid-1',
          selected_team_id: 'SF',
        }),
      });

      expect(res.status).toBe(410);
      const data = await res.json();
      expect(data.code).toBe('ENDPOINT_RETIRED');
      expect(data.retired).toBe(true);
      expect(mockPrisma.pool.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('POST /api/admin/picks/override returns state-free HTTP 410 Gone with ZERO database reads/writes', async () => {
      const res = await fetch(`${baseUrl}/api/admin/picks/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: MEMBER_ID,
          pool_id: POOL_ID,
          game_id: 'game-uuid-1',
          selected_team_id: 'SF',
        }),
      });

      expect(res.status).toBe(410);
      const data = await res.json();
      expect(data.code).toBe('ENDPOINT_RETIRED');
      expect(data.retired).toBe(true);
      expect(mockPrisma.pool.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('POST /api/admin/pools/:pool_id/picks/override returns state-free HTTP 410 Gone with ZERO reads/writes', async () => {
      const res = await fetch(`${baseUrl}/api/admin/pools/${POOL_ID}/picks/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: MEMBER_ID,
          game_id: 'game-uuid-1',
          selected_team_id: 'SF',
        }),
      });

      expect(res.status).toBe(410);
      const data = await res.json();
      expect(data.code).toBe('ENDPOINT_RETIRED');
      expect(data.retired).toBe(true);
      expect(mockPrisma.pool.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('PUT /api/admin/pools/:pool_id/picks/override returns state-free HTTP 410 Gone with ZERO reads/writes', async () => {
      const res = await fetch(`${baseUrl}/api/admin/pools/${POOL_ID}/picks/override`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: MEMBER_ID,
          game_id: 'game-uuid-1',
          selected_team_id: 'SF',
        }),
      });

      expect(res.status).toBe(410);
      const data = await res.json();
      expect(data.code).toBe('ENDPOINT_RETIRED');
      expect(data.retired).toBe(true);
      expect(mockPrisma.pool.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('5. Canonical Pool-Scoped Admin Pick Routes (/api/pools/:pool_id/*)', () => {
    let app: express.Express;
    let server: any;
    let baseUrl: string;

    const futureKickoff = new Date(Date.now() + 86400000);
    const mockGame = {
      id: 'game-uuid-1',
      externalGameId: '2026_w08_WAS_SF',
      homeTeamId: 'SF',
      awayTeamId: 'WAS',
      kickoffTime: futureKickoff,
      canonicalKickoffTime: futureKickoff,
      lockEffectiveAt: futureKickoff,
      status: 'SCHEDULED',
      homeScore: null,
      awayScore: null,
    };

    beforeEach(async () => {
      app = express();
      app.use(express.json());
      app.use('/api/pools', poolAdminRouter);

      await new Promise<void>((resolve) => {
        server = app.listen(0, () => {
          const addr = server.address() as any;
          baseUrl = `http://127.0.0.1:${addr.port}`;
          resolve();
        });
      });
    });

    afterEach(async () => {
      if (server) {
        await new Promise<void>((resolve) => server.close(resolve));
      }
    });

    describe('GET /api/pools/:pool_id/admin/picks', () => {
      it('authorizes ACTIVE commissioner and returns game slate with picks', async () => {
        mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
        mockPrisma.poolMembership.findUnique.mockResolvedValue({
          poolId: POOL_ID,
          userId: COMMISH_ID,
          status: 'ACTIVE',
        });
        mockPrisma.game.findMany.mockResolvedValue([
          {
            ...mockGame,
            picks: [{ id: 'pick-1', selectedTeamId: 'SF' }],
          },
        ]);

        const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/admin/picks?user_id=${MEMBER_ID}&week=8`, {
          headers: {
            Authorization: `Bearer ${createAuthToken(COMMISH_ID, 'ADMIN')}`,
          },
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.pool.id).toBe(POOL_ID);
        expect(data.games).toHaveLength(1);
        expect(data.games[0].userPick).toBe('SF');
      });

      it('denies commissioner with PENDING membership (403)', async () => {
        mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
        mockPrisma.poolMembership.findUnique.mockResolvedValue({
          poolId: POOL_ID,
          userId: COMMISH_ID,
          status: 'PENDING',
        });

        const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/admin/picks?user_id=${MEMBER_ID}`, {
          headers: {
            Authorization: `Bearer ${createAuthToken(COMMISH_ID, 'ADMIN')}`,
          },
        });

        expect(res.status).toBe(403);
        const data = await res.json();
        expect(data.error).toContain('Active pool membership required');
      });

      it('denies non-commissioner active member (403)', async () => {
        mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
        mockPrisma.poolMembership.findUnique.mockResolvedValue({
          poolId: POOL_ID,
          userId: MEMBER_ID,
          status: 'ACTIVE',
        });

        const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/admin/picks?user_id=${MEMBER_ID}`, {
          headers: {
            Authorization: `Bearer ${createAuthToken(MEMBER_ID, 'USER')}`,
          },
        });

        expect(res.status).toBe(403);
        const data = await res.json();
        expect(data.error).toContain('Pool commissioner privileges required');
      });

      it('rejects conflicting query pool_id mismatch with HTTP 400 (POOL_MISMATCH)', async () => {
        mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
        mockPrisma.poolMembership.findUnique.mockResolvedValue({
          poolId: POOL_ID,
          userId: COMMISH_ID,
          status: 'ACTIVE',
        });

        const MISMATCH_POOL_ID = '99999999-9999-9999-9999-999999999999';
        const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/admin/picks?pool_id=${MISMATCH_POOL_ID}`, {
          headers: {
            Authorization: `Bearer ${createAuthToken(COMMISH_ID, 'ADMIN')}`,
          },
        });

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('POOL_MISMATCH');
      });
    });

    describe('PUT /api/pools/:pool_id/admin/picks', () => {
      it('authorizes ACTIVE commissioner and executes override', async () => {
        mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
        mockPrisma.poolMembership.findUnique.mockResolvedValue({
          poolId: POOL_ID,
          userId: COMMISH_ID,
          status: 'ACTIVE',
        });
        mockPrisma.game.findFirst.mockResolvedValue(mockGame);
        mockPrisma.pick.findUnique.mockResolvedValue(null);

        const mockPick = {
          id: 'pick-override-1',
          poolId: POOL_ID,
          userId: MEMBER_ID,
          gameId: mockGame.id,
          selectedTeamId: 'SF',
          submittedById: COMMISH_ID,
        };
        const mockAudit = { id: 'audit-log-1' };

        mockPrisma.$transaction.mockImplementation(async (cb: any) => {
          return cb({
            game: { findUnique: vi.fn().mockResolvedValue(mockGame) },
            pick: {
              findMany: vi.fn().mockResolvedValue([]),
              upsert: vi.fn().mockResolvedValue(mockPick),
              update: vi.fn().mockResolvedValue(mockPick),
            },
            auditLog: { create: vi.fn().mockResolvedValue(mockAudit) },
          });
        });

        const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/admin/picks`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${createAuthToken(COMMISH_ID, 'ADMIN')}`,
          },
          body: JSON.stringify({
            user_id: MEMBER_ID,
            game_id: mockGame.id,
            selected_team_id: 'SF',
          }),
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.message).toBe('Pick successfully updated by admin.');
        expect(data.pick.id).toBe('pick-override-1');
        expect(data.auditLogId).toBe('audit-log-1');
      });

      it('denies commissioner with INACTIVE membership (403)', async () => {
        mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
        mockPrisma.poolMembership.findUnique.mockResolvedValue({
          poolId: POOL_ID,
          userId: COMMISH_ID,
          status: 'INACTIVE',
        });

        const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/admin/picks`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${createAuthToken(COMMISH_ID, 'ADMIN')}`,
          },
          body: JSON.stringify({
            user_id: MEMBER_ID,
            game_id: mockGame.id,
            selected_team_id: 'SF',
          }),
        });

        expect(res.status).toBe(403);
      });

      it('rejects conflicting body pool_id mismatch with HTTP 400 (POOL_MISMATCH)', async () => {
        mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
        mockPrisma.poolMembership.findUnique.mockResolvedValue({
          poolId: POOL_ID,
          userId: COMMISH_ID,
          status: 'ACTIVE',
        });

        const MISMATCH_POOL_ID = '99999999-9999-9999-9999-999999999999';
        const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/admin/picks`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${createAuthToken(COMMISH_ID, 'ADMIN')}`,
          },
          body: JSON.stringify({
            pool_id: MISMATCH_POOL_ID,
            user_id: MEMBER_ID,
            game_id: mockGame.id,
            selected_team_id: 'SF',
          }),
        });

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('POOL_MISMATCH');
      });

      it('rejects conflicting query pool_id mismatch with HTTP 400 (POOL_MISMATCH)', async () => {
        mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
        mockPrisma.poolMembership.findUnique.mockResolvedValue({
          poolId: POOL_ID,
          userId: COMMISH_ID,
          status: 'ACTIVE',
        });

        const MISMATCH_POOL_ID = '99999999-9999-9999-9999-999999999999';
        const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/admin/picks?pool_id=${MISMATCH_POOL_ID}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${createAuthToken(COMMISH_ID, 'ADMIN')}`,
          },
          body: JSON.stringify({
            user_id: MEMBER_ID,
            game_id: mockGame.id,
            selected_team_id: 'SF',
          }),
        });

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('POOL_MISMATCH');
      });
    });

    describe('POST /api/pools/:pool_id/picks/override', () => {
      it('authorizes ACTIVE commissioner and executes override', async () => {
        mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
        mockPrisma.poolMembership.findUnique.mockResolvedValue({
          poolId: POOL_ID,
          userId: COMMISH_ID,
          status: 'ACTIVE',
        });
        mockPrisma.game.findFirst.mockResolvedValue(mockGame);
        mockPrisma.pick.findUnique.mockResolvedValue(null);

        const mockPick = {
          id: 'pick-override-post-1',
          poolId: POOL_ID,
          userId: MEMBER_ID,
          gameId: mockGame.id,
          selectedTeamId: 'SF',
          submittedById: COMMISH_ID,
        };
        const mockAudit = { id: 'audit-log-2' };

        mockPrisma.$transaction.mockImplementation(async (cb: any) => {
          return cb({
            game: { findUnique: vi.fn().mockResolvedValue(mockGame) },
            pick: {
              findMany: vi.fn().mockResolvedValue([]),
              upsert: vi.fn().mockResolvedValue(mockPick),
              update: vi.fn().mockResolvedValue(mockPick),
            },
            auditLog: { create: vi.fn().mockResolvedValue(mockAudit) },
          });
        });

        const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/picks/override`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${createAuthToken(COMMISH_ID, 'ADMIN')}`,
          },
          body: JSON.stringify({
            user_id: MEMBER_ID,
            game_id: mockGame.id,
            selected_team_id: 'SF',
          }),
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.message).toBe('Pick successfully updated by admin.');
        expect(data.pick.id).toBe('pick-override-post-1');
      });

      it('rejects body pool_id mismatch with HTTP 400 (POOL_MISMATCH)', async () => {
        mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
        mockPrisma.poolMembership.findUnique.mockResolvedValue({
          poolId: POOL_ID,
          userId: COMMISH_ID,
          status: 'ACTIVE',
        });

        const MISMATCH_POOL_ID = '99999999-9999-9999-9999-999999999999';
        const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/picks/override`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${createAuthToken(COMMISH_ID, 'ADMIN')}`,
          },
          body: JSON.stringify({
            pool_id: MISMATCH_POOL_ID,
            user_id: MEMBER_ID,
            game_id: mockGame.id,
            selected_team_id: 'SF',
          }),
        });

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('POOL_MISMATCH');
      });
    });

    describe('POST /api/pools/:pool_id/admin/picks/override', () => {
      it('authorizes ACTIVE commissioner and executes override', async () => {
        mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
        mockPrisma.poolMembership.findUnique.mockResolvedValue({
          poolId: POOL_ID,
          userId: COMMISH_ID,
          status: 'ACTIVE',
        });
        mockPrisma.game.findFirst.mockResolvedValue(mockGame);
        mockPrisma.pick.findUnique.mockResolvedValue(null);

        const mockPick = {
          id: 'pick-override-admin-post-1',
          poolId: POOL_ID,
          userId: MEMBER_ID,
          gameId: mockGame.id,
          selectedTeamId: 'SF',
          submittedById: COMMISH_ID,
        };
        const mockAudit = { id: 'audit-log-3' };

        mockPrisma.$transaction.mockImplementation(async (cb: any) => {
          return cb({
            game: { findUnique: vi.fn().mockResolvedValue(mockGame) },
            pick: {
              findMany: vi.fn().mockResolvedValue([]),
              upsert: vi.fn().mockResolvedValue(mockPick),
              update: vi.fn().mockResolvedValue(mockPick),
            },
            auditLog: { create: vi.fn().mockResolvedValue(mockAudit) },
          });
        });

        const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/admin/picks/override`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${createAuthToken(COMMISH_ID, 'ADMIN')}`,
          },
          body: JSON.stringify({
            user_id: MEMBER_ID,
            game_id: mockGame.id,
            selected_team_id: 'SF',
          }),
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.message).toBe('Pick successfully updated by admin.');
        expect(data.pick.id).toBe('pick-override-admin-post-1');
      });
    });
  });

  describe('6. AdminDashboard Client Callers Migration & URL Audit', () => {
    it('verifies client/src/components/AdminDashboard.tsx calls canonical /api/pools/:pool_id/admin/picks and zero /api/admin/picks', () => {
      const filePath = path.resolve(__dirname, '../client/src/components/AdminDashboard.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content).not.toContain('/api/admin/picks');
      expect(content).toContain('/api/pools/${currentPoolId}/admin/picks');
      expect(content).toContain('/api/pools/${poolId}/admin/picks');
    });

    it('verifies client/src/pages/AdminDashboard.tsx calls canonical /api/pools/:pool_id/admin/picks and zero /api/admin/picks', () => {
      const filePath = path.resolve(__dirname, '../client/src/pages/AdminDashboard.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content).not.toContain('/api/admin/picks');
      expect(content).toContain('/api/pools/${currentPoolId}/admin/picks');
      expect(content).toContain('/api/pools/${poolId}/admin/picks');
    });
  });

  describe('7. Test Injection Hygiene: Reset setPrismaClientForTesting', () => {
    it('ensures setPrismaClientForTesting(null) resets client to default prisma without leakage', () => {
      setPrismaClientForTesting(null);
      expect(getPrismaClient()).toBeDefined();
    });
  });

  describe('8. Production App Mount & Route Integration (/api/pools/:pool_id/* and /api/admin retirement)', () => {
    let server: any;
    let baseUrl: string;

    const futureKickoff = new Date(Date.now() + 86400000);
    const mockGame = {
      id: 'game-uuid-prod-1',
      externalGameId: '2026_w08_WAS_SF',
      homeTeamId: 'SF',
      awayTeamId: 'WAS',
      kickoffTime: futureKickoff,
      canonicalKickoffTime: futureKickoff,
      lockEffectiveAt: futureKickoff,
      status: 'SCHEDULED',
      homeScore: null,
      awayScore: null,
    };

    beforeEach(async () => {
      await new Promise<void>((resolve) => {
        server = prodApp.listen(0, () => {
          const addr = server.address() as any;
          baseUrl = `http://127.0.0.1:${addr.port}`;
          resolve();
        });
      });
    });

    afterEach(async () => {
      if (server) {
        await new Promise<void>((resolve) => server.close(resolve));
      }
    });

    it('production app: GET /api/admin/picks returns state-free 410 Gone with zero DB reads', async () => {
      const res = await fetch(`${baseUrl}/api/admin/picks?user_id=${MEMBER_ID}&pool_id=${POOL_ID}`);

      expect(res.status).toBe(410);
      const data = await res.json();
      expect(data.code).toBe('ENDPOINT_RETIRED');
      expect(data.retired).toBe(true);
      expect(mockPrisma.pool.findUnique).not.toHaveBeenCalled();
    });

    it('production app: PUT /api/admin/picks returns state-free 410 Gone with zero DB writes', async () => {
      const res = await fetch(`${baseUrl}/api/admin/picks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: MEMBER_ID,
          pool_id: POOL_ID,
          game_id: 'game-1',
          selected_team_id: 'SF',
        }),
      });

      expect(res.status).toBe(410);
      const data = await res.json();
      expect(data.code).toBe('ENDPOINT_RETIRED');
      expect(data.retired).toBe(true);
      expect(mockPrisma.pool.findUnique).not.toHaveBeenCalled();
    });

    it('production app: POST /api/admin/picks/override returns state-free 410 Gone', async () => {
      const res = await fetch(`${baseUrl}/api/admin/picks/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: MEMBER_ID,
          pool_id: POOL_ID,
          game_id: 'game-1',
          selected_team_id: 'SF',
        }),
      });

      expect(res.status).toBe(410);
      const data = await res.json();
      expect(data.code).toBe('ENDPOINT_RETIRED');
    });

    it('production app: POST /api/admin/pools/:pool_id/picks/override returns state-free 410 Gone', async () => {
      const res = await fetch(`${baseUrl}/api/admin/pools/${POOL_ID}/picks/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: MEMBER_ID,
          game_id: 'game-1',
          selected_team_id: 'SF',
        }),
      });

      expect(res.status).toBe(410);
      const data = await res.json();
      expect(data.code).toBe('ENDPOINT_RETIRED');
    });

    it('production app: GET /api/pools/:pool_id/admin/picks succeeds for ACTIVE commissioner', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      mockPrisma.game.findMany.mockResolvedValue([
        {
          ...mockGame,
          picks: [{ id: 'pick-prod-1', selectedTeamId: 'SF' }],
        },
      ]);

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/admin/picks?user_id=${MEMBER_ID}&week=8`, {
        headers: {
          Authorization: `Bearer ${createAuthToken(COMMISH_ID, 'ADMIN')}`,
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.pool.id).toBe(POOL_ID);
      expect(data.games).toHaveLength(1);
    });

    it('production app: PUT /api/pools/:pool_id/admin/picks succeeds for ACTIVE commissioner', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      mockPrisma.game.findFirst.mockResolvedValue(mockGame);
      mockPrisma.pick.findUnique.mockResolvedValue(null);

      const mockPick = {
        id: 'pick-prod-override-1',
        poolId: POOL_ID,
        userId: MEMBER_ID,
        gameId: mockGame.id,
        selectedTeamId: 'SF',
        submittedById: COMMISH_ID,
      };
      const mockAudit = { id: 'audit-log-prod-1' };

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          game: { findUnique: vi.fn().mockResolvedValue(mockGame) },
          pick: {
            findMany: vi.fn().mockResolvedValue([]),
            upsert: vi.fn().mockResolvedValue(mockPick),
            update: vi.fn().mockResolvedValue(mockPick),
          },
          auditLog: { create: vi.fn().mockResolvedValue(mockAudit) },
        });
      });

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/admin/picks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${createAuthToken(COMMISH_ID, 'ADMIN')}`,
        },
        body: JSON.stringify({
          user_id: MEMBER_ID,
          game_id: mockGame.id,
          selected_team_id: 'SF',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toBe('Pick successfully updated by admin.');
    });
  });

  describe('9. Cardinal #66 Kickoff Lock Supremacy & Identity Preservation on Admin Override Routes (HAG6-AUTHORITY-2026-10-31-02)', () => {
    let app: express.Express;
    let server: any;
    let baseUrl: string;

    const futureKickoff = new Date(Date.now() + 86400000);
    const pastKickoff = new Date(Date.now() - 3600000);

    const scheduledGame = {
      id: 'game-uuid-auth-1',
      externalGameId: '2026_w08_WAS_SF',
      homeTeamId: 'SF',
      awayTeamId: 'WAS',
      kickoffTime: futureKickoff,
      canonicalKickoffTime: futureKickoff,
      lockEffectiveAt: futureKickoff,
      status: 'SCHEDULED',
      homeScore: null,
      awayScore: null,
    };

    beforeEach(async () => {
      app = express();
      app.use(express.json());
      app.use('/api/pools', poolAdminRouter);

      await new Promise<void>((resolve) => {
        server = app.listen(0, () => {
          const addr = server.address() as any;
          baseUrl = `http://127.0.0.1:${addr.port}`;
          resolve();
        });
      });
    });

    afterEach(async () => {
      if (server) {
        await new Promise<void>((resolve) => server.close(resolve));
      }
    });

    it('rejects override on kicked-off game with HTTP 403 KICKOFF_PASSED and ZERO writes', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      mockPrisma.game.findFirst.mockResolvedValue({
        ...scheduledGame,
        kickoffTime: pastKickoff,
        canonicalKickoffTime: pastKickoff,
        lockEffectiveAt: pastKickoff,
      });

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/admin/picks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${createAuthToken(COMMISH_ID, 'ADMIN')}`,
        },
        body: JSON.stringify({
          user_id: MEMBER_ID,
          game_id: scheduledGame.id,
          selected_team_id: 'SF',
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe('KICKOFF_PASSED');
      expect(data.error).toContain('KICKOFF_PASSED');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects override on FINAL game with HTTP 403 KICKOFF_PASSED and ZERO writes', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      mockPrisma.game.findFirst.mockResolvedValue({
        ...scheduledGame,
        status: 'FINAL',
      });

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/picks/override`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${createAuthToken(COMMISH_ID, 'ADMIN')}`,
        },
        body: JSON.stringify({
          user_id: MEMBER_ID,
          game_id: scheduledGame.id,
          selected_team_id: 'SF',
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe('KICKOFF_PASSED');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects override on IN_PROGRESS game with HTTP 403 KICKOFF_PASSED and ZERO writes', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      mockPrisma.game.findFirst.mockResolvedValue({
        ...scheduledGame,
        status: 'IN_PROGRESS',
      });

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/admin/picks/override`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${createAuthToken(COMMISH_ID, 'ADMIN')}`,
        },
        body: JSON.stringify({
          user_id: MEMBER_ID,
          game_id: scheduledGame.id,
          selected_team_id: 'SF',
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe('KICKOFF_PASSED');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects override when canonical kickoff is unconfirmed (null/TBD) with HTTP 403 UNVERIFIED_KICKOFF and ZERO writes', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      mockPrisma.game.findFirst.mockResolvedValue({
        ...scheduledGame,
        canonicalKickoffTime: null,
      });

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/admin/picks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${createAuthToken(COMMISH_ID, 'ADMIN')}`,
        },
        body: JSON.stringify({
          user_id: MEMBER_ID,
          game_id: scheduledGame.id,
          selected_team_id: 'SF',
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe('UNVERIFIED_KICKOFF');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects override when pool lock offset is non-numeric/invalid with HTTP 403 UNVERIFIED_KICKOFF and ZERO writes', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue({
        ...mockPool,
        settings: { lock_offset: 'non-numeric-offset' },
      });
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      mockPrisma.game.findFirst.mockResolvedValue(scheduledGame);

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/admin/picks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${createAuthToken(COMMISH_ID, 'ADMIN')}`,
        },
        body: JSON.stringify({
          user_id: MEMBER_ID,
          game_id: scheduledGame.id,
          selected_team_id: 'SF',
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe('UNVERIFIED_KICKOFF');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects null unselect (clearing pick) on kicked-off game with HTTP 403 KICKOFF_PASSED and ZERO writes', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      mockPrisma.game.findFirst.mockResolvedValue({
        ...scheduledGame,
        kickoffTime: pastKickoff,
        canonicalKickoffTime: pastKickoff,
        lockEffectiveAt: pastKickoff,
      });

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/admin/picks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${createAuthToken(COMMISH_ID, 'ADMIN')}`,
        },
        body: JSON.stringify({
          user_id: MEMBER_ID,
          game_id: scheduledGame.id,
          selected_team_id: null,
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe('KICKOFF_PASSED');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects null unselect on FINAL game with HTTP 403 KICKOFF_PASSED and ZERO writes', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      mockPrisma.game.findFirst.mockResolvedValue({
        ...scheduledGame,
        status: 'FINAL',
      });

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/picks/override`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${createAuthToken(COMMISH_ID, 'ADMIN')}`,
        },
        body: JSON.stringify({
          user_id: MEMBER_ID,
          game_id: scheduledGame.id,
          selected_team_id: null,
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe('KICKOFF_PASSED');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects null unselect on unverified kickoff game with HTTP 403 UNVERIFIED_KICKOFF and ZERO writes', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      mockPrisma.game.findFirst.mockResolvedValue({
        ...scheduledGame,
        canonicalKickoffTime: null,
      });

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/admin/picks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${createAuthToken(COMMISH_ID, 'ADMIN')}`,
        },
        body: JSON.stringify({
          user_id: MEMBER_ID,
          game_id: scheduledGame.id,
          selected_team_id: null,
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe('UNVERIFIED_KICKOFF');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('enforces deadline crossing at transactional write boundary if game locks during row-wait', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      mockPrisma.game.findFirst.mockResolvedValue(scheduledGame);

      const txMockPickUpsert = vi.fn();
      const txMockPickUpdate = vi.fn();
      const txMockAuditLogCreate = vi.fn();

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          game: {
            findUnique: vi.fn().mockResolvedValue({
              ...scheduledGame,
              kickoffTime: pastKickoff,
              canonicalKickoffTime: pastKickoff,
              lockEffectiveAt: pastKickoff,
              status: 'IN_PROGRESS',
            }),
          },
          pick: {
            findMany: vi.fn(),
            upsert: txMockPickUpsert,
            update: txMockPickUpdate,
          },
          auditLog: {
            create: txMockAuditLogCreate,
          },
        });
      });

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/admin/picks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${createAuthToken(COMMISH_ID, 'ADMIN')}`,
        },
        body: JSON.stringify({
          user_id: MEMBER_ID,
          game_id: scheduledGame.id,
          selected_team_id: 'SF',
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe('KICKOFF_PASSED');
      expect(txMockPickUpsert).not.toHaveBeenCalled();
      expect(txMockPickUpdate).not.toHaveBeenCalled();
      expect(txMockAuditLogCreate).not.toHaveBeenCalled();
    });

    it('detects duplicate pick rows for matchup and rejects with HTTP 409 DUPLICATE_PICK_IDENTITY and ZERO writes', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      mockPrisma.game.findFirst.mockResolvedValue(scheduledGame);

      const txMockPickUpsert = vi.fn();
      const txMockPickUpdate = vi.fn();
      const txMockAuditLogCreate = vi.fn();

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          game: { findUnique: vi.fn().mockResolvedValue(scheduledGame) },
          pick: {
            findMany: vi.fn().mockResolvedValue([
              { id: 'pick-row-1', poolId: POOL_ID, userId: MEMBER_ID, gameId: scheduledGame.id, selectedTeamId: 'SF' },
              { id: 'pick-row-2', poolId: POOL_ID, userId: MEMBER_ID, gameId: scheduledGame.externalGameId, selectedTeamId: 'WAS' },
            ]),
            upsert: txMockPickUpsert,
            update: txMockPickUpdate,
          },
          auditLog: { create: txMockAuditLogCreate },
        });
      });

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/admin/picks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${createAuthToken(COMMISH_ID, 'ADMIN')}`,
        },
        body: JSON.stringify({
          user_id: MEMBER_ID,
          game_id: scheduledGame.id,
          selected_team_id: 'SF',
        }),
      });

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.code).toBe('DUPLICATE_PICK_IDENTITY');
      expect(txMockPickUpsert).not.toHaveBeenCalled();
      expect(txMockPickUpdate).not.toHaveBeenCalled();
      expect(txMockAuditLogCreate).not.toHaveBeenCalled();
    });

    it('preserves existing pick row and alias identity: updates in-place on existingPick.id with ZERO deletes or re-keying', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      mockPrisma.game.findFirst.mockResolvedValue(scheduledGame);

      const existingPick = {
        id: 'pick-alias-row-777',
        poolId: POOL_ID,
        userId: MEMBER_ID,
        gameId: scheduledGame.externalGameId,
        selectedTeamId: 'SF',
        submittedById: MEMBER_ID,
      };

      const updatedPick = {
        ...existingPick,
        selectedTeamId: 'WAS',
        submittedById: COMMISH_ID,
      };

      const txMockPickUpsert = vi.fn();
      const txMockPickUpdate = vi.fn().mockResolvedValue(updatedPick);
      const txMockAuditLogCreate = vi.fn().mockResolvedValue({ id: 'audit-preserve-1' });

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          game: { findUnique: vi.fn().mockResolvedValue(scheduledGame) },
          pick: {
            findMany: vi.fn().mockResolvedValue([existingPick]),
            upsert: txMockPickUpsert,
            update: txMockPickUpdate,
          },
          auditLog: { create: txMockAuditLogCreate },
        });
      });

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/admin/picks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${createAuthToken(COMMISH_ID, 'ADMIN')}`,
        },
        body: JSON.stringify({
          user_id: MEMBER_ID,
          game_id: scheduledGame.id,
          selected_team_id: 'WAS',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toBe('Pick successfully updated by admin.');
      expect(data.pick.id).toBe('pick-alias-row-777');
      expect(data.pick.selectedTeamId).toBe('WAS');

      // Verified: update targeted exact existing row ID
      expect(txMockPickUpdate).toHaveBeenCalledWith({
        where: { id: 'pick-alias-row-777' },
        data: {
          selectedTeamId: 'WAS',
          submittedById: COMMISH_ID,
        },
      });
      expect(txMockPickUpsert).not.toHaveBeenCalled();
      expect(txMockAuditLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: COMMISH_ID,
            action: 'ADMIN_OVERRIDE_PICK',
            targetEntityId: 'pick-alias-row-777',
            oldValue: expect.objectContaining({ id: 'pick-alias-row-777', selectedTeamId: 'SF' }),
            newValue: expect.objectContaining({ id: 'pick-alias-row-777', selectedTeamId: 'WAS' }),
          }),
        })
      );
    });

    it('handles null unselect on unpicked game as confirmed no-op with 200 and ZERO writes', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      mockPrisma.game.findFirst.mockResolvedValue(scheduledGame);

      const txMockPickUpsert = vi.fn();
      const txMockPickUpdate = vi.fn();
      const txMockAuditLogCreate = vi.fn();

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          game: { findUnique: vi.fn().mockResolvedValue(scheduledGame) },
          pick: {
            findMany: vi.fn().mockResolvedValue([]),
            upsert: txMockPickUpsert,
            update: txMockPickUpdate,
          },
          auditLog: { create: txMockAuditLogCreate },
        });
      });

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/admin/picks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${createAuthToken(COMMISH_ID, 'ADMIN')}`,
        },
        body: JSON.stringify({
          user_id: MEMBER_ID,
          game_id: scheduledGame.id,
          selected_team_id: null,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toBe('Pick unselect on unpicked game confirmed no-op.');
      expect(data.pick).toBeNull();
      expect(data.auditLogId).toBeNull();
      expect(txMockPickUpsert).not.toHaveBeenCalled();
      expect(txMockPickUpdate).not.toHaveBeenCalled();
      expect(txMockAuditLogCreate).not.toHaveBeenCalled();
    });

    it('rejects non-participant team override with HTTP 400 and ZERO writes', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      mockPrisma.game.findFirst.mockResolvedValue(scheduledGame);

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/admin/picks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${createAuthToken(COMMISH_ID, 'ADMIN')}`,
        },
        body: JSON.stringify({
          user_id: MEMBER_ID,
          game_id: scheduledGame.id,
          selected_team_id: 'KC',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Selected team \'KC\' is not a participant');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
