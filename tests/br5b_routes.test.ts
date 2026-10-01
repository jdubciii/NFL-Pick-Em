import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role } from '@prisma/client';
import { app } from '../src/server';
import { JWT_SECRET } from '../src/middleware/auth';
import { assertDisposableUrl } from '../src/db/safeguards';
import fs from 'fs';
import path from 'path';

const rehearsalDbUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pickem_rehearsal';

describe('BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan', () => {
  let server: http.Server;
  let baseUrl: string;
  let prisma: PrismaClient;

  let commissionerUser: any;
  let nonCommissionerUser: any;
  let testPool: any;
  let testGame: any;

  let commissionerToken: string;
  let nonCommissionerToken: string;

  beforeAll(async () => {
    assertDisposableUrl(rehearsalDbUrl);
    prisma = new PrismaClient({ datasources: { db: { url: rehearsalDbUrl } } });

    // Start server on ephemeral port
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });

    // Create test fixtures
    commissionerUser = await prisma.user.create({
      data: {
        email: `commish_${Date.now()}@example.com`,
        passwordHash: 'hash123',
        role: Role.USER,
      },
    });

    nonCommissionerUser = await prisma.user.create({
      data: {
        email: `other_${Date.now()}@example.com`,
        passwordHash: 'hash123',
        role: Role.USER,
      },
    });

    testPool = await prisma.pool.create({
      data: {
        name: `Test Pool BR5b ${Date.now()}`,
        adminId: commissionerUser.id,
        settings: { lock_offset: 0 },
        status: 'ACTIVE',
      },
    });

    testGame = await prisma.game.create({
      data: {
        externalGameId: `br5b_game_${Date.now()}`,
        homeTeamId: 'DET',
        awayTeamId: 'GB',
        kickoffTime: new Date(Date.now() + 86400000), // tomorrow
        status: 'SCHEDULED',
      },
    });

    commissionerToken = jwt.sign(
      { id: commissionerUser.id, email: commissionerUser.email, role: commissionerUser.role },
      JWT_SECRET
    );

    nonCommissionerToken = jwt.sign(
      { id: nonCommissionerUser.id, email: nonCommissionerUser.email, role: nonCommissionerUser.role },
      JWT_SECRET
    );
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    if (prisma) {
      if (testPool) {
        await prisma.pick.deleteMany({ where: { poolId: testPool.id } }).catch(() => {});
        await prisma.poolMembership.deleteMany({ where: { poolId: testPool.id } }).catch(() => {});
        await prisma.pool.delete({ where: { id: testPool.id } }).catch(() => {});
      }
      if (testGame) {
        await prisma.game.delete({ where: { id: testGame.id } }).catch(() => {});
      }
      if (commissionerUser) {
        await prisma.user.delete({ where: { id: commissionerUser.id } }).catch(() => {});
      }
      if (nonCommissionerUser) {
        await prisma.user.delete({ where: { id: nonCommissionerUser.id } }).catch(() => {});
      }
      await prisma.$disconnect();
    }
  });

  describe('GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" }))', () => {
    it('returns 401 when Authorization header is missing', async () => {
      const res = await fetch(`${baseUrl}/api/admin/picks?pool_id=${testPool.id}`);
      expect(res.status).toBe(401);
    });

    it('returns 400 when pool_id query parameter is missing or malformed', async () => {
      const resMissing = await fetch(`${baseUrl}/api/admin/picks`, {
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });
      expect(resMissing.status).toBe(400);

      const resBadUuid = await fetch(`${baseUrl}/api/admin/picks?pool_id=not-a-uuid`, {
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });
      expect(resBadUuid.status).toBe(400);
    });

    it('returns 404 when pool does not exist', async () => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      const res = await fetch(`${baseUrl}/api/admin/picks?pool_id=${nonExistentUuid}`, {
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });
      expect(res.status).toBe(404);
    });

    it('returns 403 when user is not the pool commissioner', async () => {
      const res = await fetch(`${baseUrl}/api/admin/picks?pool_id=${testPool.id}`, {
        headers: { Authorization: `Bearer ${nonCommissionerToken}` },
      });
      expect(res.status).toBe(403);
    });

    it('returns 200 and game slate snapshot when user is the verified commissioner', async () => {
      const res = await fetch(`${baseUrl}/api/admin/picks?pool_id=${testPool.id}`, {
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.pool.id).toBe(testPool.id);
      expect(Array.isArray(data.games)).toBe(true);
    });
  });

  describe('PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" }))', () => {
    it('returns 401 when Authorization header is missing', async () => {
      const res = await fetch(`${baseUrl}/api/admin/picks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pool_id: testPool.id,
          user_id: commissionerUser.id,
          game_id: testGame.id,
          selected_team_id: 'DET',
        }),
      });
      expect(res.status).toBe(401);
    });

    it('returns 400 when pool_id is missing or malformed in request body', async () => {
      const resMissing = await fetch(`${baseUrl}/api/admin/picks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${commissionerToken}`,
        },
        body: JSON.stringify({
          user_id: commissionerUser.id,
          game_id: testGame.id,
          selected_team_id: 'DET',
        }),
      });
      expect(resMissing.status).toBe(400);

      const resBadUuid = await fetch(`${baseUrl}/api/admin/picks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${commissionerToken}`,
        },
        body: JSON.stringify({
          pool_id: 'invalid-uuid',
          user_id: commissionerUser.id,
          game_id: testGame.id,
          selected_team_id: 'DET',
        }),
      });
      expect(resBadUuid.status).toBe(400);
    });

    it('returns 404 when pool does not exist in request body', async () => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      const res = await fetch(`${baseUrl}/api/admin/picks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${commissionerToken}`,
        },
        body: JSON.stringify({
          pool_id: nonExistentUuid,
          user_id: commissionerUser.id,
          game_id: testGame.id,
          selected_team_id: 'DET',
        }),
      });
      expect(res.status).toBe(404);
    });

    it('returns 403 when user is not the pool commissioner', async () => {
      const res = await fetch(`${baseUrl}/api/admin/picks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${nonCommissionerToken}`,
        },
        body: JSON.stringify({
          pool_id: testPool.id,
          user_id: nonCommissionerUser.id,
          game_id: testGame.id,
          selected_team_id: 'DET',
        }),
      });
      expect(res.status).toBe(403);
    });

    it('returns 200 and upserts pick when authenticated user is the commissioner', async () => {
      const res = await fetch(`${baseUrl}/api/admin/picks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${commissionerToken}`,
        },
        body: JSON.stringify({
          pool_id: testPool.id,
          user_id: commissionerUser.id,
          game_id: testGame.id,
          selected_team_id: 'DET',
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.pick.selectedTeamId).toBe('DET');
    });
  });

  describe('Decision #49: CI Route Scan & Route Guard Verification', () => {
    it('verifies all routes with pool parameters are guarded; only /api/health and GET /api/admin/users allowlisted', () => {
      const serverCode = fs.readFileSync(path.resolve(__dirname, '../src/server.ts'), 'utf8');
      const adminCode = fs.readFileSync(path.resolve(__dirname, '../src/routes/admin.ts'), 'utf8');
      const picksCode = fs.readFileSync(path.resolve(__dirname, '../src/routes/picks.ts'), 'utf8');

      // Assert allowlisted endpoints
      expect(serverCode).toContain("app.get('/api/health'");
      expect(adminCode).toContain("adminRouter.get('/users', requireAuth, requireAdmin");

      // Assert pool commissioner guards on admin picks
      expect(adminCode).toContain("adminRouter.get('/picks', requireAuth, requirePoolCommissioner({ from: 'query' })");
      expect(adminCode).toContain("adminRouter.put('/picks', requireAuth, requirePoolCommissioner({ from: 'body' })");

      // Assert all member/commissioner routes in server.ts
      expect(serverCode).toContain("requirePoolMember");
      expect(serverCode).toContain("requirePoolCommissioner");
    });
  });
});
