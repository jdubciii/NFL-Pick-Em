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
import { savePickAtomically } from '../src/routes/picks';
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
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn(),
      $queryRawUnsafe: vi.fn().mockResolvedValue([]),
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

  function createProductionDbMock(config?: {
    games?: any[];
    picks?: any[];
    poolSettings?: any;
    onAdvisoryLock?: (lockKey: string) => void;
    onBeforeUpdate?: () => void;
    onBeforeInsert?: () => void;
    onBeforeAudit?: () => void;
  }) {
    const gamesTable: any[] = config?.games ? JSON.parse(JSON.stringify(config.games)) : [];
    for (const g of gamesTable) {
      if (g.kickoffTime) g.kickoff_time = g.kickoffTime instanceof Date ? g.kickoffTime.toISOString() : g.kickoffTime;
      if (g.canonicalKickoffTime !== undefined) {
        g.canonical_kickoff_time = g.canonicalKickoffTime instanceof Date ? g.canonicalKickoffTime.toISOString() : g.canonicalKickoffTime;
      }
      if (g.lockEffectiveAt !== undefined) {
        g.lock_effective_at = g.lockEffectiveAt instanceof Date ? g.lockEffectiveAt.toISOString() : g.lockEffectiveAt;
      }
      if (g.homeTeamId) g.home_team_id = g.homeTeamId;
      if (g.awayTeamId) g.away_team_id = g.awayTeamId;
      if (g.externalGameId) g.external_game_id = g.externalGameId;
      if (!g.week) g.week = 8;
    }

    const picksTable: any[] = config?.picks ? JSON.parse(JSON.stringify(config.picks)) : [];
    const auditLogsTable: any[] = [];
    const committedPicks: any[] = JSON.parse(JSON.stringify(picksTable));
    const committedAuditLogs: any[] = [];
    const advisoryLockKeys: string[] = [];

    const handleQuery = async (sql: string, ...params: any[]) => {
      if (sql.includes('FROM public.games')) {
        const paramVal = params[0];
        const matched = gamesTable.filter((g: any) => g.id === paramVal || g.external_game_id === paramVal || g.externalGameId === paramVal);
        return matched.map((g: any) => ({
          id: g.id,
          external_game_id: g.external_game_id || g.externalGameId || g.id,
          home_team_id: g.home_team_id || g.homeTeamId,
          away_team_id: g.away_team_id || g.awayTeamId,
          kickoff_time: g.kickoff_time,
          canonical_kickoff_time: g.canonical_kickoff_time !== undefined ? g.canonical_kickoff_time : g.kickoff_time,
          lock_effective_at: g.lock_effective_at !== undefined ? g.lock_effective_at : null,
          status: g.status,
          season: g.season || 2026,
          season_type: g.season_type || 2,
          week: g.week || 8,
        }));
      }
      if (sql.includes('pg_advisory_xact_lock')) {
        advisoryLockKeys.push(params[0]);
        if (config?.onAdvisoryLock) config.onAdvisoryLock(params[0]);
        return [];
      }
      if (sql.includes('FROM public.picks') && sql.includes('FOR UPDATE')) {
        const poolId = params[0];
        const userId = params[1];
        const week = params[2];
        const candidateIds = params.slice(3);
        return picksTable.filter((p: any) =>
          (p.pool_id === poolId || p.poolId === poolId) &&
          (p.user_id === userId || p.userId === userId) &&
          (Number(p.week) === Number(week)) &&
          candidateIds.includes(p.game_id || p.gameId)
        ).map((p: any) => ({
          id: p.id,
          pool_id: p.pool_id || p.poolId,
          user_id: p.user_id || p.userId,
          week: p.week,
          game_id: p.game_id || p.gameId,
          selected_team_id: p.selected_team_id !== undefined ? p.selected_team_id : p.selectedTeamId,
          submitted_by: p.submitted_by || p.submittedById,
          created_at: p.created_at || p.createdAt || new Date(),
        }));
      }
      if (sql.includes('UPDATE public.picks')) {
        if (config?.onBeforeUpdate) config.onBeforeUpdate();
        const rowId = params[2];
        const existing = picksTable.find((p: any) => p.id === rowId);
        if (existing) {
          existing.selected_team_id = params[0];
          existing.submitted_by = params[1];
          return [{
            id: existing.id,
            pool_id: existing.pool_id || existing.poolId,
            user_id: existing.user_id || existing.userId,
            week: existing.week,
            game_id: existing.game_id || existing.gameId,
            selected_team_id: existing.selected_team_id,
            submitted_by: existing.submitted_by,
            created_at: existing.created_at || new Date(),
          }];
        }
        return [];
      }
      if (sql.includes('INSERT INTO public.picks')) {
        if (config?.onBeforeInsert) config.onBeforeInsert();
        const newRow = {
          id: `pick-gen-${picksTable.length + 1}`,
          pool_id: params[0],
          user_id: params[1],
          week: params[2],
          game_id: params[3],
          selected_team_id: params[4],
          submitted_by: params[5],
          created_at: new Date(),
        };
        picksTable.push(newRow);
        return [newRow];
      }
      return [];
    };

    let currentSettings = config?.poolSettings !== undefined ? config.poolSettings : { lock_offset: 0 };

    const txMock = {
      pool: {
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          if (!currentSettings) return null;
          return { id: where.id, settings: currentSettings };
        }),
      },
      auditLog: {
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          if (config?.onBeforeAudit) config.onBeforeAudit();
          const entry = { id: `audit-log-${auditLogsTable.length + 1}`, ...data };
          auditLogsTable.push(entry);
          return entry;
        }),
      },
      $queryRawUnsafe: vi.fn().mockImplementation(handleQuery),
    };

    return {
      picksTable,
      auditLogsTable,
      advisoryLockKeys,
      txMock,
      gamesTable,
      setPoolSettings: (s: any) => { currentSettings = s; },
      $transaction: vi.fn().mockImplementation(async (cb: any) => {
        const picksSnapshot = JSON.parse(JSON.stringify(picksTable));
        const auditSnapshot = JSON.parse(JSON.stringify(auditLogsTable));
        try {
          const res = await cb(txMock);
          committedPicks.length = 0;
          committedPicks.push(...JSON.parse(JSON.stringify(picksTable)));
          committedAuditLogs.length = 0;
          committedAuditLogs.push(...JSON.parse(JSON.stringify(auditLogsTable)));
          return res;
        } catch (err) {
          picksTable.length = 0;
          picksTable.push(...picksSnapshot);
          auditLogsTable.length = 0;
          auditLogsTable.push(...auditSnapshot);
          throw err;
        }
      }),
      $queryRawUnsafe: vi.fn().mockImplementation(handleQuery),
      getCommittedPicksCount: () => committedPicks.length,
      getCommittedAuditCount: () => committedAuditLogs.length,
    };
  }

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
        const prodDb = createProductionDbMock({
          games: [mockGame],
        });
        mockPrisma.$transaction = prodDb.$transaction;
        mockPrisma.$queryRawUnsafe = prodDb.$queryRawUnsafe;

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
        expect(data.pick.selectedTeamId).toBe('SF');
        expect(data.pick.submittedById).toBe(COMMISH_ID);
        expect(data.auditLogId).toBeDefined();
        expect(prodDb.getCommittedPicksCount()).toBe(1);
        expect(prodDb.getCommittedAuditCount()).toBe(1);
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
        const prodDb = createProductionDbMock({
          games: [mockGame],
        });
        mockPrisma.$transaction = prodDb.$transaction;
        mockPrisma.$queryRawUnsafe = prodDb.$queryRawUnsafe;

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
        expect(data.pick.selectedTeamId).toBe('SF');
        expect(data.pick.submittedById).toBe(COMMISH_ID);
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
        const prodDb = createProductionDbMock({
          games: [mockGame],
        });
        mockPrisma.$transaction = prodDb.$transaction;
        mockPrisma.$queryRawUnsafe = prodDb.$queryRawUnsafe;

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
        expect(data.pick.selectedTeamId).toBe('SF');
        expect(data.pick.submittedById).toBe(COMMISH_ID);
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
      const prodDb = createProductionDbMock({
        games: [mockGame],
      });
      mockPrisma.$transaction = prodDb.$transaction;
      mockPrisma.$queryRawUnsafe = prodDb.$queryRawUnsafe;

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
      expect(data.pick.selectedTeamId).toBe('SF');
      expect(prodDb.getCommittedPicksCount()).toBe(1);
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
      const prodDb = createProductionDbMock({
        games: [{
          ...scheduledGame,
          kickoffTime: pastKickoff,
          canonicalKickoffTime: pastKickoff,
          lockEffectiveAt: pastKickoff,
        }],
      });
      mockPrisma.$transaction = prodDb.$transaction;
      mockPrisma.$queryRawUnsafe = prodDb.$queryRawUnsafe;

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
      expect(prodDb.getCommittedPicksCount()).toBe(0);
      expect(prodDb.getCommittedAuditCount()).toBe(0);
    });

    it('rejects override on FINAL game with HTTP 403 KICKOFF_PASSED and ZERO writes', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      const prodDb = createProductionDbMock({
        games: [{
          ...scheduledGame,
          status: 'FINAL',
        }],
      });
      mockPrisma.$transaction = prodDb.$transaction;
      mockPrisma.$queryRawUnsafe = prodDb.$queryRawUnsafe;

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
      expect(prodDb.getCommittedPicksCount()).toBe(0);
      expect(prodDb.getCommittedAuditCount()).toBe(0);
    });

    it('rejects override on IN_PROGRESS game with HTTP 403 KICKOFF_PASSED and ZERO writes', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      const prodDb = createProductionDbMock({
        games: [{
          ...scheduledGame,
          status: 'IN_PROGRESS',
        }],
      });
      mockPrisma.$transaction = prodDb.$transaction;
      mockPrisma.$queryRawUnsafe = prodDb.$queryRawUnsafe;

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
      expect(prodDb.getCommittedPicksCount()).toBe(0);
      expect(prodDb.getCommittedAuditCount()).toBe(0);
    });

    it('rejects override when canonical kickoff is unconfirmed (null/TBD) with HTTP 403 UNVERIFIED_KICKOFF and ZERO writes', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      const prodDb = createProductionDbMock({
        games: [{
          ...scheduledGame,
          canonicalKickoffTime: null,
        }],
      });
      mockPrisma.$transaction = prodDb.$transaction;
      mockPrisma.$queryRawUnsafe = prodDb.$queryRawUnsafe;

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
      expect(prodDb.getCommittedPicksCount()).toBe(0);
      expect(prodDb.getCommittedAuditCount()).toBe(0);
    });

    it('rejects override when pool lock offset is non-numeric/invalid with HTTP 403 UNVERIFIED_KICKOFF and ZERO writes', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      const prodDb = createProductionDbMock({
        games: [scheduledGame],
        poolSettings: { lock_offset: 'non-numeric-offset' },
      });
      mockPrisma.$transaction = prodDb.$transaction;
      mockPrisma.$queryRawUnsafe = prodDb.$queryRawUnsafe;

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
      expect(prodDb.getCommittedPicksCount()).toBe(0);
      expect(prodDb.getCommittedAuditCount()).toBe(0);
    });

    it('rejects null unselect (clearing pick) on kicked-off game with HTTP 403 KICKOFF_PASSED and ZERO writes', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      const prodDb = createProductionDbMock({
        games: [{
          ...scheduledGame,
          kickoffTime: pastKickoff,
          canonicalKickoffTime: pastKickoff,
          lockEffectiveAt: pastKickoff,
        }],
      });
      mockPrisma.$transaction = prodDb.$transaction;
      mockPrisma.$queryRawUnsafe = prodDb.$queryRawUnsafe;

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
      expect(prodDb.getCommittedPicksCount()).toBe(0);
      expect(prodDb.getCommittedAuditCount()).toBe(0);
    });

    it('rejects null unselect on FINAL game with HTTP 403 KICKOFF_PASSED and ZERO writes', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      const prodDb = createProductionDbMock({
        games: [{
          ...scheduledGame,
          status: 'FINAL',
        }],
      });
      mockPrisma.$transaction = prodDb.$transaction;
      mockPrisma.$queryRawUnsafe = prodDb.$queryRawUnsafe;

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
      expect(prodDb.getCommittedPicksCount()).toBe(0);
      expect(prodDb.getCommittedAuditCount()).toBe(0);
    });

    it('rejects null unselect on unverified kickoff game with HTTP 403 UNVERIFIED_KICKOFF and ZERO writes', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      const prodDb = createProductionDbMock({
        games: [{
          ...scheduledGame,
          canonicalKickoffTime: null,
        }],
      });
      mockPrisma.$transaction = prodDb.$transaction;
      mockPrisma.$queryRawUnsafe = prodDb.$queryRawUnsafe;

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
      expect(prodDb.getCommittedPicksCount()).toBe(0);
      expect(prodDb.getCommittedAuditCount()).toBe(0);
    });

    it('enforces deadline crossing at transactional write boundary if game locks during advisory/row-wait', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      const prodDb = createProductionDbMock({
        games: [scheduledGame],
        onAdvisoryLock: () => {
          // Advance system time past kickoff during advisory lock wait
          vi.useFakeTimers();
          vi.setSystemTime(new Date(futureKickoff.getTime() + 10000));
        },
      });
      mockPrisma.$transaction = prodDb.$transaction;
      mockPrisma.$queryRawUnsafe = prodDb.$queryRawUnsafe;

      try {
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
        expect(prodDb.getCommittedPicksCount()).toBe(0);
        expect(prodDb.getCommittedAuditCount()).toBe(0);
      } finally {
        vi.useRealTimers();
      }
    });

    it('detects duplicate pick rows for matchup and rejects with HTTP 409 DUPLICATE_PICK_IDENTITY and ZERO writes', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      const prodDb = createProductionDbMock({
        games: [scheduledGame],
        picks: [
          { id: 'pick-row-1', pool_id: POOL_ID, user_id: MEMBER_ID, week: 8, game_id: scheduledGame.id, selected_team_id: 'SF' },
          { id: 'pick-row-2', pool_id: POOL_ID, user_id: MEMBER_ID, week: 8, game_id: scheduledGame.externalGameId, selected_team_id: 'WAS' },
        ],
      });
      mockPrisma.$transaction = prodDb.$transaction;
      mockPrisma.$queryRawUnsafe = prodDb.$queryRawUnsafe;

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
      expect(prodDb.getCommittedAuditCount()).toBe(0);
      expect(prodDb.picksTable[0].selected_team_id).toBe('SF');
      expect(prodDb.picksTable[1].selected_team_id).toBe('WAS');
    });

    it('preserves existing pick row and alias identity: updates in-place on existingPick.id with ZERO deletes or re-keying', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      const existingPick = {
        id: 'pick-alias-row-777',
        pool_id: POOL_ID,
        user_id: MEMBER_ID,
        week: 8,
        game_id: scheduledGame.externalGameId,
        selected_team_id: 'SF',
        submitted_by: MEMBER_ID,
      };

      const prodDb = createProductionDbMock({
        games: [scheduledGame],
        picks: [existingPick],
      });
      mockPrisma.$transaction = prodDb.$transaction;
      mockPrisma.$queryRawUnsafe = prodDb.$queryRawUnsafe;

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
      expect(data.pick.gameId).toBe(scheduledGame.externalGameId);
      expect(data.pick.selectedTeamId).toBe('WAS');
      expect(data.pick.submittedById).toBe(COMMISH_ID);

      expect(prodDb.getCommittedPicksCount()).toBe(1);
      expect(prodDb.picksTable[0].id).toBe('pick-alias-row-777');
      expect(prodDb.picksTable[0].game_id).toBe(scheduledGame.externalGameId);
      expect(prodDb.picksTable[0].selected_team_id).toBe('WAS');
      expect(prodDb.picksTable[0].submitted_by).toBe(COMMISH_ID);
      expect(prodDb.getCommittedAuditCount()).toBe(1);
      expect(prodDb.auditLogsTable[0].actorId).toBe(COMMISH_ID);
      expect(prodDb.auditLogsTable[0].targetEntityId).toBe('pick-alias-row-777');
      expect(prodDb.auditLogsTable[0].oldValue.selected_team_id).toBe('SF');
      expect(prodDb.auditLogsTable[0].newValue.selectedTeamId).toBe('WAS');
    });

    it('handles null unselect on unpicked game as confirmed no-op with 200 and ZERO writes', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      const prodDb = createProductionDbMock({
        games: [scheduledGame],
        picks: [],
      });
      mockPrisma.$transaction = prodDb.$transaction;
      mockPrisma.$queryRawUnsafe = prodDb.$queryRawUnsafe;

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
      expect(prodDb.getCommittedPicksCount()).toBe(0);
      expect(prodDb.getCommittedAuditCount()).toBe(0);
    });

    it('rejects non-participant team override with HTTP 400 and ZERO writes', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      const prodDb = createProductionDbMock({
        games: [scheduledGame],
      });
      mockPrisma.$transaction = prodDb.$transaction;
      mockPrisma.$queryRawUnsafe = prodDb.$queryRawUnsafe;

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
      expect(prodDb.getCommittedPicksCount()).toBe(0);
      expect(prodDb.getCommittedAuditCount()).toBe(0);
    });

    it('rejects override when pool settings query fails/missing under lock with HTTP 403 UNVERIFIED_KICKOFF and ZERO writes', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      const prodDb = createProductionDbMock({
        games: [scheduledGame],
        poolSettings: null,
      });
      mockPrisma.$transaction = prodDb.$transaction;
      mockPrisma.$queryRawUnsafe = prodDb.$queryRawUnsafe;

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
      expect(prodDb.getCommittedPicksCount()).toBe(0);
      expect(prodDb.getCommittedAuditCount()).toBe(0);
    });

    it('fails closed when pool settings change during advisory lock wait such that kickoff passed (403 KICKOFF_PASSED)', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      const prodDb = createProductionDbMock({
        games: [scheduledGame],
        onAdvisoryLock: () => {
          // Lock offset changed to 100000 minutes before kickoff (kickoff passed days ago)
          prodDb.setPoolSettings({ lock_offset: 100000 });
        },
      });
      mockPrisma.$transaction = prodDb.$transaction;
      mockPrisma.$queryRawUnsafe = prodDb.$queryRawUnsafe;

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
      expect(prodDb.getCommittedPicksCount()).toBe(0);
      expect(prodDb.getCommittedAuditCount()).toBe(0);
    });

    it('fails closed when game participants change during advisory lock wait (400 UNVERIFIED_PARTICIPANTS)', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      const prodDb = createProductionDbMock({
        games: [scheduledGame],
        onAdvisoryLock: () => {
          // Changing home team under lock
          prodDb.gamesTable[0].home_team_id = 'KC';
        },
      });
      mockPrisma.$transaction = prodDb.$transaction;
      mockPrisma.$queryRawUnsafe = prodDb.$queryRawUnsafe;

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

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(['UNVERIFIED_PARTICIPANTS', 'INVALID_PARTICIPANT']).toContain(data.code);
      expect(prodDb.getCommittedPicksCount()).toBe(0);
      expect(prodDb.getCommittedAuditCount()).toBe(0);
    });

    it('rolls back both pick mutation AND audit log when deadline is crossed during write wait (late selection)', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      vi.useFakeTimers();
      vi.setSystemTime(new Date(futureKickoff.getTime() - 60000));

      const prodDb = createProductionDbMock({
        games: [scheduledGame],
        onBeforeInsert: () => {
          // Time crosses kickoff during insert wait
          vi.setSystemTime(new Date(futureKickoff.getTime() + 10000));
        },
      });
      mockPrisma.$transaction = prodDb.$transaction;
      mockPrisma.$queryRawUnsafe = prodDb.$queryRawUnsafe;

      try {
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
        expect(prodDb.getCommittedPicksCount()).toBe(0);
        expect(prodDb.getCommittedAuditCount()).toBe(0);
      } finally {
        vi.useRealTimers();
      }
    });

    it('rolls back both pick mutation AND audit log when deadline is crossed during null unselect write wait', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      const existingPick = {
        id: 'pick-unselect-wait-1',
        pool_id: POOL_ID,
        user_id: MEMBER_ID,
        week: 8,
        game_id: scheduledGame.id,
        selected_team_id: 'SF',
        submitted_by: MEMBER_ID,
      };

      vi.useFakeTimers();
      vi.setSystemTime(new Date(futureKickoff.getTime() - 60000));

      const prodDb = createProductionDbMock({
        games: [scheduledGame],
        picks: [existingPick],
        onBeforeUpdate: () => {
          // Time crosses kickoff during update wait
          vi.setSystemTime(new Date(futureKickoff.getTime() + 10000));
        },
      });
      mockPrisma.$transaction = prodDb.$transaction;
      mockPrisma.$queryRawUnsafe = prodDb.$queryRawUnsafe;

      try {
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
        expect(prodDb.getCommittedPicksCount()).toBe(1);
        expect(prodDb.picksTable[0].selected_team_id).toBe('SF');
        expect(prodDb.getCommittedAuditCount()).toBe(0);
      } finally {
        vi.useRealTimers();
      }
    });

    it('rolls back both pick mutation AND audit log when deadline is crossed during audit log creation wait', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });
      vi.useFakeTimers();
      vi.setSystemTime(new Date(futureKickoff.getTime() - 60000));

      const prodDb = createProductionDbMock({
        games: [scheduledGame],
        onBeforeAudit: () => {
          // Time crosses kickoff during audit log persistence wait
          vi.setSystemTime(new Date(futureKickoff.getTime() + 10000));
        },
      });
      mockPrisma.$transaction = prodDb.$transaction;
      mockPrisma.$queryRawUnsafe = prodDb.$queryRawUnsafe;

      try {
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
        expect(prodDb.getCommittedPicksCount()).toBe(0);
        expect(prodDb.getCommittedAuditCount()).toBe(0);
      } finally {
        vi.useRealTimers();
      }
    });

    it('concurrent standard user pick (alias) vs commissioner override (UUID) serializes on identical canonical advisory lock key', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue({
        poolId: POOL_ID,
        userId: COMMISH_ID,
        status: 'ACTIVE',
      });

      const lockKeyHistory: string[] = [];
      const prodDb = createProductionDbMock({
        games: [scheduledGame],
        onAdvisoryLock: (key) => {
          lockKeyHistory.push(key);
        },
      });
      mockPrisma.$transaction = prodDb.$transaction;
      mockPrisma.$queryRawUnsafe = prodDb.$queryRawUnsafe;

      // 1. Standard user pick using alias game ID
      await savePickAtomically(mockPrisma as any, {
        poolId: POOL_ID,
        userId: MEMBER_ID,
        gameId: scheduledGame.externalGameId, // alias: '2026_w08_WAS_SF'
        selectedTeamId: 'SF',
        week: 8,
      });

      // 2. Commissioner override using UUID game ID
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/admin/picks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${createAuthToken(COMMISH_ID, 'ADMIN')}`,
        },
        body: JSON.stringify({
          user_id: MEMBER_ID,
          game_id: scheduledGame.id, // UUID: 'game-uuid-auth-1'
          selected_team_id: 'WAS',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.pick.selectedTeamId).toBe('WAS');

      // Both operations must have acquired the EXACT same canonical advisory lock key:
      const expectedLockKey = `${POOL_ID}:${MEMBER_ID}:8:${scheduledGame.id}`;
      expect(lockKeyHistory).toHaveLength(2);
      expect(lockKeyHistory[0]).toBe(expectedLockKey);
      expect(lockKeyHistory[1]).toBe(expectedLockKey);
      expect(prodDb.advisoryLockKeys[0]).toBe(expectedLockKey);
      expect(prodDb.advisoryLockKeys[1]).toBe(expectedLockKey);
    });
  });
});
