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
    prisma = new PrismaClient({ datasources: { db: { url: rehearsalDbUrl } }, log: [] });

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

    await prisma.poolMembership.create({
      data: {
        poolId: testPool.id,
        userId: nonCommissionerUser.id,
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

  describe('S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)', () => {
    let penaltyRecord: any;
    let globalAdminUser: any;
    let globalAdminToken: string;
    let otherMemberUser: any;
    let otherMemberToken: string;

    beforeAll(async () => {
      globalAdminUser = await prisma.user.create({
        data: {
          email: `global_admin_${Date.now()}@example.com`,
          passwordHash: 'hash',
          role: Role.ADMIN,
        },
      });

      globalAdminToken = jwt.sign(
        { id: globalAdminUser.id, email: globalAdminUser.email, role: globalAdminUser.role },
        JWT_SECRET
      );

      otherMemberUser = await prisma.user.create({
        data: {
          email: `other_member_${Date.now()}@example.com`,
          passwordHash: 'hash',
          role: Role.USER,
        },
      });

      await prisma.poolMembership.create({
        data: {
          poolId: testPool.id,
          userId: otherMemberUser.id,
          status: 'ACTIVE',
        },
      });

      otherMemberToken = jwt.sign(
        { id: otherMemberUser.id, email: otherMemberUser.email, role: otherMemberUser.role },
        JWT_SECRET
      );

      penaltyRecord = await prisma.penaltyLedger.create({
        data: {
          poolId: testPool.id,
          userId: nonCommissionerUser.id,
          weekNumber: 1,
          delta: 1.0,
          reason: 'TEST_PENALTY',
          createdById: commissionerUser.id,
        },
      });
    });

    afterAll(async () => {
      if (prisma) {
        if (penaltyRecord) {
          await prisma.penaltyMedia.deleteMany({ where: { penaltyId: penaltyRecord.id } }).catch(() => {});
          await prisma.penaltyLedger.delete({ where: { id: penaltyRecord.id } }).catch(() => {});
        }
        if (otherMemberUser) {
          await prisma.poolMembership.deleteMany({ where: { userId: otherMemberUser.id } }).catch(() => {});
          await prisma.user.delete({ where: { id: otherMemberUser.id } }).catch(() => {});
        }
        if (globalAdminUser) {
          await prisma.user.delete({ where: { id: globalAdminUser.id } }).catch(() => {});
        }
      }
    });

    it('POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403', async () => {
      const res = await fetch(`${baseUrl}/api/pools/${testPool.id}/penalties/${penaltyRecord.id}/media`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${globalAdminToken}`,
        },
        body: JSON.stringify({
          storage_path: 'penalties/test_shot.mp4',
        }),
      });
      expect(res.status).toBe(403);
      const penaltyMediaCount = await prisma.penaltyMedia.count({ where: { penaltyId: penaltyRecord.id } });
      expect(penaltyMediaCount).toBe(0);
    });

    it('POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403', async () => {
      const res = await fetch(`${baseUrl}/api/pools/${testPool.id}/penalties/${penaltyRecord.id}/media`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${otherMemberToken}`,
        },
        body: JSON.stringify({
          storage_path: 'penalties/unauthorized_shot.mp4',
        }),
      });
      expect(res.status).toBe(403);
      const penaltyMediaCount = await prisma.penaltyMedia.count({ where: { penaltyId: penaltyRecord.id } });
      expect(penaltyMediaCount).toBe(0);
    });

    it('verifies zero penalty_media rows exist after denied upload attempts', async () => {
      const penaltyMediaCount = await prisma.penaltyMedia.count({
        where: { penaltyId: penaltyRecord.id },
      });
      expect(penaltyMediaCount).toBe(0);
    });

    it('POST /api/pools/:pool_id/penalties/:id/media: penalty OWNER -> 201 success', async () => {
      const res = await fetch(`${baseUrl}/api/pools/${testPool.id}/penalties/${penaltyRecord.id}/media`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${nonCommissionerToken}`,
        },
        body: JSON.stringify({
          storage_path: 'penalties/owner_shot.mp4',
        }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.media.storagePath).toBe('penalties/owner_shot.mp4');
      expect(data.media.status).toBe('PENDING');
    });

    it('PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403', async () => {
      const res = await fetch(`${baseUrl}/api/pools/${testPool.id}/penalties/${penaltyRecord.id}/media/confirm`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${globalAdminToken}`,
        },
        body: JSON.stringify({
          status: 'CONFIRMED',
        }),
      });
      expect(res.status).toBe(403);
      const confirmedMediaCount = await prisma.penaltyMedia.count({
        where: { penaltyId: penaltyRecord.id, status: 'CONFIRMED' },
      });
      expect(confirmedMediaCount).toBe(0);
    });

    it('PATCH /api/pools/:pool_id/penalties/:id/media/confirm: pool COMMISSIONER -> 200 success', async () => {
      const res = await fetch(`${baseUrl}/api/pools/${testPool.id}/penalties/${penaltyRecord.id}/media/confirm`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${commissionerToken}`,
        },
        body: JSON.stringify({
          status: 'CONFIRMED',
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.media.status).toBe('CONFIRMED');
      expect(data.media.confirmedBy).toBe(commissionerUser.id);
    });
  });

  describe('S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)', () => {
    let unassociatedUser: any;
    let unassociatedToken: string;

    beforeAll(async () => {
      unassociatedUser = await prisma.user.create({
        data: {
          email: `unassociated_${Date.now()}@example.com`,
          passwordHash: 'hash',
          role: Role.USER,
        },
      });
      unassociatedToken = jwt.sign(
        { id: unassociatedUser.id, email: unassociatedUser.email, role: unassociatedUser.role },
        JWT_SECRET
      );
    });

    afterAll(async () => {
      if (prisma && unassociatedUser) {
        await prisma.user.delete({ where: { id: unassociatedUser.id } }).catch(() => {});
      }
    });

    it('returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write)', async () => {
      const poolCountBefore = await prisma.pool.count();
      const res = await fetch(`${baseUrl}/api/games`, {
        headers: { Authorization: `Bearer ${unassociatedToken}` },
      });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('POOL_NOT_FOUND');
      const poolCountAfter = await prisma.pool.count();
      expect(poolCountBefore).toBe(poolCountAfter);
    });

    it('returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write)', async () => {
      const poolCountBefore = await prisma.pool.count();
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      const res = await fetch(`${baseUrl}/api/games?pool_id=${nonExistentUuid}`, {
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('POOL_NOT_FOUND');
      const poolCountAfter = await prisma.pool.count();
      expect(poolCountBefore).toBe(poolCountAfter);
    });

    it('returns 400 when explicit pool_id is not a valid UUID (no pool write)', async () => {
      const poolCountBefore = await prisma.pool.count();
      const res = await fetch(`${baseUrl}/api/games?pool_id=invalid-uuid`, {
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('valid UUID');
      const poolCountAfter = await prisma.pool.count();
      expect(poolCountBefore).toBe(poolCountAfter);
    });

    it('returns 403 when user is not a member or commissioner of the requested pool (no pool write)', async () => {
      const poolCountBefore = await prisma.pool.count();
      const res = await fetch(`${baseUrl}/api/games?pool_id=${testPool.id}`, {
        headers: { Authorization: `Bearer ${unassociatedToken}` },
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Active pool membership required');
      const poolCountAfter = await prisma.pool.count();
      expect(poolCountBefore).toBe(poolCountAfter);
    });

    it('returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot', async () => {
      // Ensure clean state without prior picks for byte-for-byte comparison
      await prisma.pick.deleteMany({ where: { poolId: testPool.id } });
      const poolCountBefore = await prisma.pool.count();

      // Commissioner request
      const commishRes = await fetch(`${baseUrl}/api/games?pool_id=${testPool.id}`, {
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });
      expect(commishRes.status).toBe(200);
      const commishData = await commishRes.json();

      // Member request
      const memberRes = await fetch(`${baseUrl}/api/games?pool_id=${testPool.id}`, {
        headers: { Authorization: `Bearer ${nonCommissionerToken}` },
      });
      expect(memberRes.status).toBe(200);
      const memberData = await memberRes.json();

      const poolCountAfter = await prisma.pool.count();
      expect(poolCountBefore).toBe(poolCountAfter);

      // Snapshot parity and byte-for-byte payload comparisons
      expect(JSON.stringify(memberData)).toBe(JSON.stringify(commishData));
      expect(memberData).toEqual(commishData);
      expect(Object.keys(memberData).sort()).toEqual(Object.keys(commishData).sort());
      expect(memberData.pool.id).toBe(testPool.id);
      expect(commishData.pool.id).toBe(testPool.id);
      expect(memberData.pool.name).toBe(commishData.pool.name);
      expect(memberData.games.length).toBe(commishData.games.length);
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
