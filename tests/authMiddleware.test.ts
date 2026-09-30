/**
 * BR-5 middleware unit tests (pure mock)
 * Verified against Decision #20 & R-12.2-W:
 * Global ADMIN has ZERO override bypass on pool-scoped commissioner/membership routes.
 */
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

describe('BR-5 middleware unit tests (pure mock)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('returns 401 when Authorization header is absent', () => {
      const { req, res, next } = createMockReqRes();
      requireAuth(req, res, next);
      expect(res.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when Authorization header does not start with Bearer', () => {
      const { req, res, next } = createMockReqRes({ headers: { authorization: 'Basic 123456' } });
      requireAuth(req, res, next);
      expect(res.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 for an invalid / expired token', () => {
      const { req, res, next } = createMockReqRes({ headers: { authorization: 'Bearer bad.token' } });
      requireAuth(req, res, next);
      expect(res.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('decodes valid JWT and attaches user to req.user, then calls next()', () => {
      const payload: AuthUserPayload = { id: 'user-1', email: 'test@example.com', role: Role.USER };
      const token = jwt.sign(payload, JWT_SECRET);
      const { req, res, next } = createMockReqRes({ headers: { authorization: `Bearer ${token}` } });
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
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 if req.user is not ADMIN', () => {
      const { req, res, next } = createMockReqRes({
        user: { id: 'u1', email: 'u@test.com', role: Role.USER },
      });
      requireAdmin(req, res, next);
      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next() if user is ADMIN', () => {
      const { req, res, next } = createMockReqRes({
        user: { id: 'a1', email: 'a@test.com', role: Role.ADMIN },
      });
      requireAdmin(req, res, next);
      expect(res.statusCode).toBe(200);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('requirePoolCommissioner', () => {
    const validPoolId = '11111111-1111-1111-1111-111111111111';

    it('returns 401 if req.user is missing', async () => {
      const { req, res, next } = createMockReqRes({ params: { pool_id: validPoolId } });
      await requirePoolCommissioner(req, res, next);
      expect(res.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 400 for a malformed non-UUID pool_id', async () => {
      const { req, res, next } = createMockReqRes({
        user: { id: 'u1', email: 'u@test.com', role: Role.USER },
        params: { pool_id: 'invalid-uuid' },
      });
      await requirePoolCommissioner(req, res, next);
      expect(res.statusCode).toBe(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 404 when the pool does not exist in DB', async () => {
      (prisma.pool.findUnique as any).mockResolvedValue(null);
      const { req, res, next } = createMockReqRes({
        user: { id: 'u1', email: 'u@test.com', role: Role.USER },
        params: { pool_id: validPoolId },
      });
      await requirePoolCommissioner(req, res, next);
      expect(res.statusCode).toBe(404);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when user is neither commissioner nor member', async () => {
      (prisma.pool.findUnique as any).mockResolvedValue({ id: validPoolId, adminId: 'commish-id' });
      const { req, res, next } = createMockReqRes({
        user: { id: 'other-user', email: 'o@test.com', role: Role.USER },
        params: { pool_id: validPoolId },
      });
      await requirePoolCommissioner(req, res, next);
      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('Decision #20 & R-12.2-W: global ADMIN who is not the pool commissioner -> 403, no req.pool, zero side effects', async () => {
      (prisma.pool.findUnique as any).mockResolvedValue({ id: validPoolId, adminId: 'commish-id' });
      const { req, res, next } = createMockReqRes({
        user: { id: 'admin-not-commish', email: 'admin@test.com', role: Role.ADMIN },
        params: { pool_id: validPoolId },
      });
      await requirePoolCommissioner(req, res, next);
      expect(res.statusCode).toBe(403);
      expect(req.pool).toBeUndefined();
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next() and attaches pool when user is the pool commissioner', async () => {
      const poolRecord = { id: validPoolId, adminId: 'commish-id' };
      (prisma.pool.findUnique as any).mockResolvedValue(poolRecord);
      const { req, res, next } = createMockReqRes({
        user: { id: 'commish-id', email: 'c@test.com', role: Role.USER },
        params: { pool_id: validPoolId },
      });
      await requirePoolCommissioner(req, res, next);
      expect(req.pool).toEqual(poolRecord);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('requirePoolMember', () => {
    const validPoolId = '11111111-1111-1111-1111-111111111111';

    it('returns 403 if user is not a member and not the commissioner', async () => {
      (prisma.pool.findUnique as any).mockResolvedValue({ id: validPoolId, adminId: 'commish-id' });
      (prisma.poolMembership.findUnique as any).mockResolvedValue(null);
      const { req, res, next } = createMockReqRes({
        user: { id: 'non-member', email: 'nm@test.com', role: Role.USER },
        params: { pool_id: validPoolId },
      });
      await requirePoolMember(req, res, next);
      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('Decision #20 & R-12.2-W: global ADMIN who is not a member and not commissioner -> 403, no req.pool', async () => {
      (prisma.pool.findUnique as any).mockResolvedValue({ id: validPoolId, adminId: 'commish-id' });
      (prisma.poolMembership.findUnique as any).mockResolvedValue(null);
      const { req, res, next } = createMockReqRes({
        user: { id: 'global-admin-id', email: 'ga@test.com', role: Role.ADMIN },
        params: { pool_id: validPoolId },
      });
      await requirePoolMember(req, res, next);
      expect(res.statusCode).toBe(403);
      expect(req.pool).toBeUndefined();
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next() when user is active pool member', async () => {
      (prisma.pool.findUnique as any).mockResolvedValue({ id: validPoolId, adminId: 'commish-id' });
      (prisma.poolMembership.findUnique as any).mockResolvedValue({ poolId: validPoolId, userId: 'm1', status: 'ACTIVE' });
      const { req, res, next } = createMockReqRes({
        user: { id: 'm1', email: 'm@test.com', role: Role.USER },
        params: { pool_id: validPoolId },
      });
      await requirePoolMember(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('calls next() when user is the pool commissioner (even without explicit membership row)', async () => {
      (prisma.pool.findUnique as any).mockResolvedValue({ id: validPoolId, adminId: 'commish-id' });
      const { req, res, next } = createMockReqRes({
        user: { id: 'commish-id', email: 'c@test.com', role: Role.USER },
        params: { pool_id: validPoolId },
      });
      await requirePoolMember(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
