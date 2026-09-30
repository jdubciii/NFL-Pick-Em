import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import {
  requireAuth,
  requireAdmin,
  requirePoolCommissioner,
  requirePoolMember,
  JWT_SECRET,
  AuthUserPayload,
} from '../src/middleware/auth';
import prisma from '../src/db/client';

vi.mock('../src/db/client', () => ({
  default: {
    pool: {
      findUnique: vi.fn(),
    },
    poolMembership: {
      findUnique: vi.fn(),
    },
  },
}));

function createMockReqRes(options: {
  headers?: Record<string, string>;
  user?: AuthUserPayload;
  params?: Record<string, string>;
  body?: Record<string, any>;
  query?: Record<string, any>;
} = {}) {
  const req: any = {
    headers: options.headers || {},
    user: options.user,
    params: options.params || {},
    body: options.body || {},
    query: options.query || {},
  };

  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
  };

  const next = vi.fn();

  return { req, res, next };
}

describe('BR-5 Route Guard Middleware: Unit & Isolation Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('returns 401 when Authorization header is absent', () => {
      const { req, res, next } = createMockReqRes();
      requireAuth(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ error: 'Authentication required. Missing or malformed token.' });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when Authorization header does not start with Bearer', () => {
      const { req, res, next } = createMockReqRes({
        headers: { authorization: 'Basic 123456' },
      });
      requireAuth(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ error: 'Authentication required. Missing or malformed token.' });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 for an invalid / expired token', () => {
      const { req, res, next } = createMockReqRes({
        headers: { authorization: 'Bearer invalid.token.payload' },
      });
      requireAuth(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ error: 'Invalid or expired token.' });
      expect(next).not.toHaveBeenCalled();
    });

    it('decodes valid JWT and attaches user to req.user, then calls next()', () => {
      const payload: AuthUserPayload = {
        id: 'user-uuid-1',
        email: 'test@example.com',
        role: Role.USER,
      };
      const token = jwt.sign(payload, JWT_SECRET);

      const { req, res, next } = createMockReqRes({
        headers: { authorization: `Bearer ${token}` },
      });
      requireAuth(req, res, next);

      expect(res.statusCode).toBe(200);
      expect(req.user).toMatchObject(payload);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('requireAdmin', () => {
    it('returns 401 if req.user is undefined', () => {
      const { req, res, next } = createMockReqRes();
      requireAdmin(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ error: 'Authentication required.' });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 if req.user is not ADMIN', () => {
      const { req, res, next } = createMockReqRes({
        user: { id: 'user-uuid-1', email: 'user@test.com', role: Role.USER },
      });
      requireAdmin(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ error: 'Forbidden. Admin privileges required.' });
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next() if user is ADMIN', () => {
      const { req, res, next } = createMockReqRes({
        user: { id: 'admin-uuid-1', email: 'admin@test.com', role: Role.ADMIN },
      });
      requireAdmin(req, res, next);

      expect(res.statusCode).toBe(200);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('requirePoolCommissioner', () => {
    const validPoolId = '11111111-1111-1111-1111-111111111111';

    it('returns 401 if req.user is missing', async () => {
      const { req, res, next } = createMockReqRes({
        params: { pool_id: validPoolId },
      });
      await requirePoolCommissioner(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 400 for a malformed non-UUID pool_id', async () => {
      const { req, res, next } = createMockReqRes({
        user: { id: 'user-1', email: 'u@test.com', role: Role.USER },
        params: { pool_id: 'non-uuid-pool-id' },
      });
      await requirePoolCommissioner(req, res, next);

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid pool ID format. Must be a valid UUID.' });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 404 when the pool does not exist in DB', async () => {
      (prisma.pool.findUnique as any).mockResolvedValue(null);

      const { req, res, next } = createMockReqRes({
        user: { id: 'user-1', email: 'u@test.com', role: Role.USER },
        params: { pool_id: validPoolId },
      });
      await requirePoolCommissioner(req, res, next);

      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({ error: 'Pool not found.' });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when user is neither commissioner nor global admin', async () => {
      (prisma.pool.findUnique as any).mockResolvedValue({
        id: validPoolId,
        adminId: 'commissioner-uuid',
      });

      const { req, res, next } = createMockReqRes({
        user: { id: 'some-other-user', email: 'u@test.com', role: Role.USER },
        params: { pool_id: validPoolId },
      });
      await requirePoolCommissioner(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ error: 'Forbidden. Pool commissioner privileges required.' });
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next() and attaches pool when user is pool commissioner', async () => {
      const poolRecord = { id: validPoolId, adminId: 'commissioner-uuid' };
      (prisma.pool.findUnique as any).mockResolvedValue(poolRecord);

      const { req, res, next } = createMockReqRes({
        user: { id: 'commissioner-uuid', email: 'commish@test.com', role: Role.USER },
        params: { pool_id: validPoolId },
      });
      await requirePoolCommissioner(req, res, next);

      expect(req.pool).toEqual(poolRecord);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('calls next() and attaches pool when user is global admin (even if not commissioner)', async () => {
      const poolRecord = { id: validPoolId, adminId: 'commissioner-uuid' };
      (prisma.pool.findUnique as any).mockResolvedValue(poolRecord);

      const { req, res, next } = createMockReqRes({
        user: { id: 'admin-uuid', email: 'admin@test.com', role: Role.ADMIN },
        params: { pool_id: validPoolId },
      });
      await requirePoolCommissioner(req, res, next);

      expect(req.pool).toEqual(poolRecord);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('requirePoolMember', () => {
    const validPoolId = '11111111-1111-1111-1111-111111111111';

    it('returns 403 if user is not a member or status is inactive', async () => {
      (prisma.pool.findUnique as any).mockResolvedValue({
        id: validPoolId,
        adminId: 'commissioner-uuid',
      });
      (prisma.poolMembership.findUnique as any).mockResolvedValue(null);

      const { req, res, next } = createMockReqRes({
        user: { id: 'non-member-uuid', email: 'nm@test.com', role: Role.USER },
        params: { pool_id: validPoolId },
      });
      await requirePoolMember(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ error: 'Forbidden. Active pool membership required.' });
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next() and passes when user is active pool member', async () => {
      const poolRecord = { id: validPoolId, adminId: 'commissioner-uuid' };
      (prisma.pool.findUnique as any).mockResolvedValue(poolRecord);
      (prisma.poolMembership.findUnique as any).mockResolvedValue({
        poolId: validPoolId,
        userId: 'member-uuid',
        status: 'ACTIVE',
      });

      const { req, res, next } = createMockReqRes({
        user: { id: 'member-uuid', email: 'm@test.com', role: Role.USER },
        params: { pool_id: validPoolId },
      });
      await requirePoolMember(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
