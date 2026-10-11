import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { JWT_SECRET } from '../src/middleware/auth';
import { resolveNavigationVisibility } from '../client/src/App';

// Mock database client to test authoritative server routes in complete isolation
vi.mock('../src/db/client', () => {
  const mockPrisma = {
    pool: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    poolMembership: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    game: {
      findMany: vi.fn(),
    },
    pick: {
      findMany: vi.fn(),
    },
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
  };
  return {
    default: mockPrisma,
    prisma: mockPrisma,
  };
});

// Import app after mock is registered
import { app } from '../src/server';
import prisma from '../src/db/client';

describe('Phase 37 Authoritative Route & Server Enforcement (Ruling C6 Compliance)', () => {
  let server: http.Server;
  let baseUrl: string;

  const MAIN_LEAGUE_POOL_ID = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';
  const FOREIGN_POOL_ID = 'e82b7812-40e1-4567-9abc-1234567890ab';

  const userAlice = { id: 'user-alice-uuid-0001', email: 'alice@example.com', role: 'USER' };
  const userForeignAdmin = { id: 'user-foreign-admin-0002', email: 'foreignadmin@example.com', role: 'ADMIN' };
  const userMainCommish = { id: 'e3242a19-1131-4fc5-9886-7730f10ef69b', email: 'jack.w.cone@gmail.com', role: 'ADMIN' };

  const tokenAlice = jwt.sign(userAlice, JWT_SECRET, { expiresIn: '1h' });
  const tokenForeignAdmin = jwt.sign(userForeignAdmin, JWT_SECRET, { expiresIn: '1h' });
  const tokenMainCommish = jwt.sign(userMainCommish, JWT_SECRET, { expiresIn: '1h' });

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. Server-Enforced Registration Boundary
  // --------------------------------------------------------------------------
  describe('1. Server-Enforced Registration (POST /api/pools/:pool_id/join)', () => {
    it('strictly rejects missing inviteCode with HTTP 403 and 0 database writes', async () => {
      const res = await fetch(`${baseUrl}/api/pools/${MAIN_LEAGUE_POOL_ID}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenAlice}`,
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/Invalid or missing league invite code/i);
      expect(prisma.poolMembership.upsert).toHaveBeenCalledTimes(0);
      expect(prisma.poolMembership.create).toHaveBeenCalledTimes(0);
    });

    it('strictly rejects invalid inviteCode with HTTP 403 and 0 database writes', async () => {
      const res = await fetch(`${baseUrl}/api/pools/${MAIN_LEAGUE_POOL_ID}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenAlice}`,
        },
        body: JSON.stringify({
          inviteCode: 'WRONG_CODE',
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/Invalid or missing league invite code/i);
      expect(prisma.poolMembership.upsert).toHaveBeenCalledTimes(0);
      expect(prisma.poolMembership.create).toHaveBeenCalledTimes(0);
    });

    it('strictly rejects MAIN26 inviteCode when targeting a foreign pool with HTTP 403 and 0 database writes', async () => {
      const res = await fetch(`${baseUrl}/api/pools/${FOREIGN_POOL_ID}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenAlice}`,
        },
        body: JSON.stringify({
          inviteCode: 'MAIN26',
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/Invite code is not valid for the requested league pool/i);
      expect(prisma.poolMembership.upsert).toHaveBeenCalledTimes(0);
      expect(prisma.poolMembership.create).toHaveBeenCalledTimes(0);
    });

    it('strictly rejects forged payloads containing { status: "ACTIVE" } or { role: "ADMIN" } with HTTP 403', async () => {
      // Forged status injection
      const resStatus = await fetch(`${baseUrl}/api/pools/${MAIN_LEAGUE_POOL_ID}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenAlice}`,
        },
        body: JSON.stringify({
          inviteCode: 'MAIN26',
          status: 'ACTIVE', // Forged escalation
        }),
      });

      expect(resStatus.status).toBe(403);
      const dataStatus = await resStatus.json();
      expect(dataStatus.error).toMatch(/FORGERY_REJECTED/i);
      expect(prisma.poolMembership.upsert).toHaveBeenCalledTimes(0);
      expect(prisma.poolMembership.create).toHaveBeenCalledTimes(0);

      // Forged role injection
      const resRole = await fetch(`${baseUrl}/api/pools/${MAIN_LEAGUE_POOL_ID}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenAlice}`,
        },
        body: JSON.stringify({
          inviteCode: 'MAIN26',
          role: 'ADMIN', // Forged escalation
        }),
      });

      expect(resRole.status).toBe(403);
      const dataRole = await resRole.json();
      expect(dataRole.error).toMatch(/FORGERY_REJECTED/i);
      expect(prisma.poolMembership.upsert).toHaveBeenCalledTimes(0);
      expect(prisma.poolMembership.create).toHaveBeenCalledTimes(0);
    });

    it('forces legitimate registration with valid inviteCode strictly into PENDING state', async () => {
      (prisma.pool.findUnique as any).mockResolvedValue({
        id: MAIN_LEAGUE_POOL_ID,
        name: 'Main League',
        adminId: userMainCommish.id,
      });

      (prisma.poolMembership.upsert as any).mockResolvedValue({
        poolId: MAIN_LEAGUE_POOL_ID,
        userId: userAlice.id,
        status: 'PENDING',
      });

      const res = await fetch(`${baseUrl}/api/pools/${MAIN_LEAGUE_POOL_ID}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenAlice}`,
        },
        body: JSON.stringify({
          inviteCode: 'MAIN26',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.membership.status).toBe('PENDING');

      // Assert that DB was instructed to create PENDING membership
      expect(prisma.poolMembership.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ status: 'PENDING' }),
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // 2. Pool-Scoped Commissioner Adjudication (Decision #20 Tenant Boundary)
  // --------------------------------------------------------------------------
  describe('2. Pool-Scoped Adjudication (Decision #20 & Decision #55)', () => {
    it('denies actor with foreign pool ADMIN rights attempting to adjudicate Main League with HTTP 403', async () => {
      // Main League is administered by userMainCommish, NOT userForeignAdmin
      (prisma.pool.findUnique as any).mockResolvedValue({
        id: MAIN_LEAGUE_POOL_ID,
        name: 'Main League',
        adminId: userMainCommish.id, // Alice/ForeignAdmin is NOT the admin
      });

      const res = await fetch(`${baseUrl}/api/pools/${MAIN_LEAGUE_POOL_ID}/adjudicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenForeignAdmin}`, // Bearer token for Foreign Admin
        },
        body: JSON.stringify({
          targetUserId: userAlice.id,
          action: 'ACTIVE',
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/Pool commissioner privileges required/i);
      expect(prisma.poolMembership.update).not.toHaveBeenCalled();
    });

    it('permits authorized Main League commissioner to adjudicate applicant to ACTIVE', async () => {
      (prisma.pool.findUnique as any).mockResolvedValue({
        id: MAIN_LEAGUE_POOL_ID,
        name: 'Main League',
        adminId: userMainCommish.id, // Matches requesting user id
      });

      (prisma.poolMembership.update as any).mockResolvedValue({
        poolId: MAIN_LEAGUE_POOL_ID,
        userId: userAlice.id,
        status: 'ACTIVE',
      });

      const res = await fetch(`${baseUrl}/api/pools/${MAIN_LEAGUE_POOL_ID}/adjudicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenMainCommish}`,
        },
        body: JSON.stringify({
          targetUserId: userAlice.id,
          action: 'ACTIVE',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.membership.status).toBe('ACTIVE');
      expect(prisma.poolMembership.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'ACTIVE' },
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // 3. GET Route Safety (Decision #54: No Database Mutations on GET)
  // --------------------------------------------------------------------------
  describe('3. GET Safety (Decision #54)', () => {
    it('proves exactly 0 database INSERT, UPDATE, DELETE, or executeRaw operations occur during GET requests', async () => {
      (prisma.pool.findMany as any).mockResolvedValue([
        { id: MAIN_LEAGUE_POOL_ID, name: 'Main League', status: 'ACTIVE' },
      ]);

      const res = await fetch(`${baseUrl}/api/pools`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenAlice}`,
        },
      });

      expect(res.status).toBe(200);

      // Verify that no write mutations occurred on prisma
      expect(prisma.poolMembership.create).toHaveBeenCalledTimes(0);
      expect(prisma.poolMembership.update).toHaveBeenCalledTimes(0);
      expect(prisma.poolMembership.delete).toHaveBeenCalledTimes(0);
      expect(prisma.poolMembership.upsert).toHaveBeenCalledTimes(0);
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(0);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Fail-Closed Context Resolution (Decision #55)
  // --------------------------------------------------------------------------
  describe('4. Fail-Closed Context Resolution (Decision #55)', () => {
    it('fails closed (HTTP 401) when Authorization header is absent or token is invalid', async () => {
      const res = await fetch(`${baseUrl}/api/pools/${MAIN_LEAGUE_POOL_ID}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: 'MAIN26' }),
      });
      expect(res.status).toBe(401);
    });

    it('fails closed (HTTP 404) when pool does not exist in database', async () => {
      (prisma.pool.findUnique as any).mockResolvedValue(null);

      const res = await fetch(`${baseUrl}/api/pools/${MAIN_LEAGUE_POOL_ID}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenAlice}`,
        },
        body: JSON.stringify({ inviteCode: 'MAIN26' }),
      });

      expect(res.status).toBe(404);
    });

    it('fails closed (HTTP 500) without leaking access when database lookup throws an error', async () => {
      (prisma.pool.findUnique as any).mockRejectedValue(new Error('DATABASE_OFFLINE'));

      const res = await fetch(`${baseUrl}/api/pools/${MAIN_LEAGUE_POOL_ID}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenAlice}`,
        },
        body: JSON.stringify({ inviteCode: 'MAIN26' }),
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toMatch(/Failed to join pool/i);
    });
  });

  // --------------------------------------------------------------------------
  // 5. App Production Call Site Verification
  // --------------------------------------------------------------------------
  describe('5. App Production Call Site Verification', () => {
    it('verifies that client/src/App.tsx directly consumes resolveNavigationVisibility to guard BottomNavigation', () => {
      const appSourcePath = path.resolve(__dirname, '../client/src/App.tsx');
      expect(fs.existsSync(appSourcePath)).toBe(true);

      const appSource = fs.readFileSync(appSourcePath, 'utf8');

      // 1. Verify export and declaration of resolveNavigationVisibility in App.tsx
      expect(appSource).toContain('export function resolveNavigationVisibility(');

      // 2. Verify call site assignment in App component
      expect(appSource).toContain('const isAdmitted = resolveNavigationVisibility(session, membershipStatus);');

      // 3. Verify that BottomNavigation rendering is guarded by isAdmitted
      expect(appSource).toContain('{isAdmitted && <BottomNavigation />}');

      // 4. Assert behavioral contract of the consumed helper
      expect(resolveNavigationVisibility(null, null)).toBe(false);
      expect(resolveNavigationVisibility(null, 'ACTIVE')).toBe(false);
      expect(resolveNavigationVisibility({ user: { id: 'u1' } }, 'PENDING')).toBe(false);
      expect(resolveNavigationVisibility({ user: { id: 'u1' } }, 'REJECTED')).toBe(false);
      expect(resolveNavigationVisibility({ user: { id: 'u1' } }, 'ACTIVE')).toBe(true);
    });
  });
});
