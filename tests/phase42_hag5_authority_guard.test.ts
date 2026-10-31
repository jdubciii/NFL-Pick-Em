import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { Request, Response } from 'express';
import {
  requireAuth,
  requirePoolCommissioner,
  requirePoolMember,
  setPrismaClientForTesting,
  setSupabaseAuthClientForTesting,
  AuthUserPayload,
} from '../src/middleware/auth';
import { adminOpsRouter } from '../src/routes/adminOps';
import { Role } from '@prisma/client';

describe('HAG-5 / HAG5-AUTHORITY-2026-10-31-01 Authority & Shared Guard Invariant Suite', () => {
  const POOL_ID = '11111111-1111-1111-1111-111111111111';
  const COMMISH_ID = '22222222-2222-2222-2222-222222222222';
  const MEMBER_ID = '33333333-3333-3333-3333-333333333333';
  const OUTSIDER_ID = '44444444-4444-4444-4444-444444444444';

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

    mockPrisma = {
      pool: {
        findUnique: vi.fn(),
      },
      poolMembership: {
        findUnique: vi.fn(),
      },
    };

    setPrismaClientForTesting(mockPrisma);
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

  describe('1. requirePoolCommissioner: Active Actor Membership Requirement', () => {
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

    it('denies commissioner with PENDING membership', async () => {
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

    it('denies outsider user with 403', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue(null);

      const { req, res, next } = createMockReqRes({
        user: { id: OUTSIDER_ID, email: 'outsider@example.com', role: Role.USER },
        params: { pool_id: POOL_ID },
      });

      await requirePoolMember(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.jsonData.error).toContain('Active pool membership required');
      expect(next).not.toHaveBeenCalled();
    });

    it('authorizes regular user with verified ACTIVE pool membership', async () => {
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

      await requirePoolMember(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.pool).toEqual(mockPool);
      expect(req.membership).toEqual(activeMembership);
    });
  });

  describe('3. Route-Level Behavioral Integration Tests', () => {
    let app: express.Express;
    let server: any;
    let baseUrl: string;

    beforeEach(async () => {
      app = express();
      app.use(express.json());

      // Synthetic auth injector for testing routes
      const mockAuth = (req: any, _res: any, next: any) => {
        const actorId = req.headers['x-test-user-id'] as string;
        if (actorId) {
          req.user = {
            id: actorId,
            email: `${actorId}@example.com`,
            role: Role.USER,
          };
        }
        next();
      };

      // Sample commissioner-protected route
      app.post('/api/pools/:pool_id/adjudicate', mockAuth, requirePoolCommissioner, (_req, res) => {
        res.status(200).json({ success: true, message: 'Adjudication executed' });
      });

      // Sample member-protected route
      app.get('/api/pools/:pool_id/matrix', mockAuth, requirePoolMember, (_req, res) => {
        res.status(200).json({ success: true, message: 'Matrix loaded' });
      });

      await new Promise<void>((resolve) => {
        server = app.listen(0, () => {
          const addr = server.address() as any;
          baseUrl = `http://127.0.0.1:${addr.port}`;
          resolve();
        });
      });
    });

    it('HTTP route: commissioner without active membership is denied 403 on commissioner route', async () => {
      mockPrisma.pool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.poolMembership.findUnique.mockResolvedValue(null);

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/adjudicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': COMMISH_ID,
        },
        body: JSON.stringify({ action: 'APPROVE', applicantId: 'app-1' }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Active pool membership required');
    });

    it('HTTP route: commissioner with PENDING membership is denied 403 on commissioner route', async () => {
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
        body: JSON.stringify({ action: 'APPROVE', applicantId: 'app-1' }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Active pool membership required');
    });

    it('HTTP route: commissioner with ACTIVE membership succeeds on commissioner route', async () => {
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
        body: JSON.stringify({ action: 'APPROVE', applicantId: 'app-1' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it('HTTP route: commissioner without membership is denied 403 on member route (matrix)', async () => {
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

      await new Promise<void>((resolve) => {
        server = app.listen(0, () => {
          const addr = server.address() as any;
          baseUrl = `http://127.0.0.1:${addr.port}`;
          resolve();
        });
      });
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
  });
});
