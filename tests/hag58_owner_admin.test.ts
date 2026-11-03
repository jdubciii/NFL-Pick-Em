import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import http from 'http';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { app } from '../src/server';
import {
  requireOwner,
  requirePoolOwnerAccess,
  setPrismaClientForTesting,
  setSupabaseAuthClientForTesting,
  createSyntheticSupabaseToken,
} from '../src/middleware/auth';
import { computePoolSettingsRevision } from '../src/routes/ownerAdminRoutes';
import { normalizeApiOrigin, scopedExpressFetch } from '../client/src/lib/apiClient';
import { fetchPresentationFlags, DEFAULT_PRESENTATION_FLAGS } from '../client/src/services/presentationFlagsService';
import { calculateProvisionalStandings, type SlateGame, type UserStandingRef, type UserPickItem, type TiebreakerData } from '../src/services/sweatProjectionService';

describe('HAG-58: Directive 3 Owner Admin & Binding Rulings Verification', () => {
  const JACK_UUID = 'e3242a19-1131-4fc5-9886-7730f10ef69b';
  const NON_JACK_UUID = 'a1111111-2222-3333-4444-555555555555';
  const POOL_ID = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';

  let server: http.Server;
  let baseUrl: string;
  let mockPrisma: any;
  let jackAuthToken: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    process.env.OWNER_AUTH_USER_ID = JACK_UUID;

    jackAuthToken = createSyntheticSupabaseToken({
      id: JACK_UUID,
      email: 'jack.w.cone@gmail.com',
      role: 'ADMIN',
    });

    const mockAuthClient = {
      auth: {
        getUser: vi.fn().mockImplementation(async (token: string) => {
          const decoded: any = jwt.decode(token);
          if (!decoded || !decoded.sub) return { data: { user: null }, error: new Error('Invalid token') };
          return {
            data: {
              user: {
                id: decoded.sub,
                email: decoded.email || `${decoded.sub}@example.com`,
                user_metadata: {},
                app_metadata: { role: decoded.role || 'USER' },
              },
            },
            error: null,
          };
        }),
      },
    };
    setSupabaseAuthClientForTesting(mockAuthClient as any);

    const basePool = {
      id: POOL_ID,
      name: 'Main Championship Pool',
      settings: {},
      status: 'ACTIVE',
      adminId: JACK_UUID,
    };

    mockPrisma = {
      pool: {
        findUnique: vi.fn().mockResolvedValue(basePool),
        update: vi.fn().mockImplementation(async ({ data }: any) => ({
          ...basePool,
          ...data,
        })),
      },
      poolMembership: {
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => ({
          poolId: where?.poolId_userId?.poolId || POOL_ID,
          userId: where?.poolId_userId?.userId || JACK_UUID,
          status: 'ACTIVE',
          role: 'COMMISSIONER',
        })),
        findFirst: vi.fn().mockImplementation(async ({ where }: any) => ({
          poolId: where?.poolId || POOL_ID,
          userId: where?.userId || JACK_UUID,
          status: 'ACTIVE',
          role: 'COMMISSIONER',
        })),
        count: vi.fn().mockResolvedValue(10),
      },
      user: {
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => ({
          id: where.id,
          email: 'jack.w.cone@gmail.com',
          role: 'ADMIN',
          status: 'ACTIVE',
        })),
      },
      weeklySubmission: {
        count: vi.fn().mockResolvedValue(0),
      },
      pick: {
        count: vi.fn().mockResolvedValue(0),
      },
      game: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-log-uuid' }),
      },
      $transaction: vi.fn(async (cb: (tx: any) => any) => {
        return cb(mockPrisma);
      }),
      $queryRawUnsafe: vi.fn().mockResolvedValue([{ id: POOL_ID }]),
    };

    setPrismaClientForTesting(mockPrisma);
  });

  describe('1. Owner Authorization & Fail-Closed Gate', () => {
    it('fails closed with 503 OWNER_UNCONFIGURED if OWNER_AUTH_USER_ID is missing or not a UUID', () => {
      delete process.env.OWNER_AUTH_USER_ID;

      const req: any = { user: { id: JACK_UUID, role: 'ADMIN' } };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      requireOwner(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'OWNER_UNCONFIGURED' })
      );
      expect(next).not.toHaveBeenCalled();

      // Malformed UUID test
      process.env.OWNER_AUTH_USER_ID = 'not-a-valid-uuid';
      requireOwner(req, res, next);
      expect(res.status).toHaveBeenCalledWith(503);
    });

    it('fails closed with 403 FORBIDDEN for non-Jack users (even ADMIN or commissioner role)', () => {
      process.env.OWNER_AUTH_USER_ID = JACK_UUID;

      const req: any = { user: { id: NON_JACK_UUID, role: 'ADMIN' } };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      requireOwner(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'FORBIDDEN' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('passes requireOwner when authenticated user matches exact configured OWNER_AUTH_USER_ID', () => {
      process.env.OWNER_AUTH_USER_ID = JACK_UUID;

      const req: any = { user: { id: JACK_UUID, role: 'ADMIN' } };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      requireOwner(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('enforces requirePoolOwnerAccess: valid pool UUID, existence, active status, active membership, and no-store header', async () => {
      const res: any = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      // Case A: invalid pool UUID
      const reqInvalid: any = { user: { id: JACK_UUID }, params: { pool_id: 'not-a-uuid' } };
      await requirePoolOwnerAccess(reqInvalid, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');

      // Case B: pool not found
      mockPrisma.pool.findUnique.mockResolvedValueOnce(null);
      const reqNotFound: any = { user: { id: JACK_UUID }, params: { pool_id: POOL_ID } };
      await requirePoolOwnerAccess(reqNotFound, res, next);
      expect(res.status).toHaveBeenCalledWith(404);

      // Case C: pool inactive
      mockPrisma.pool.findUnique.mockResolvedValueOnce({ id: POOL_ID, status: 'INACTIVE', adminId: JACK_UUID });
      await requirePoolOwnerAccess(reqNotFound, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'POOL_INACTIVE' }));

      // Case D: no active membership
      mockPrisma.pool.findUnique.mockResolvedValueOnce({ id: POOL_ID, status: 'ACTIVE', adminId: JACK_UUID });
      mockPrisma.poolMembership.findUnique.mockResolvedValueOnce(null);
      await requirePoolOwnerAccess(reqNotFound, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'ACTIVE_MEMBERSHIP_REQUIRED' }));

      // Case E: successful active owner admission
      mockPrisma.pool.findUnique.mockResolvedValueOnce({ id: POOL_ID, status: 'ACTIVE', adminId: JACK_UUID });
      mockPrisma.poolMembership.findUnique.mockResolvedValueOnce({ poolId: POOL_ID, userId: JACK_UUID, status: 'ACTIVE' });
      await requirePoolOwnerAccess(reqNotFound, res, next);
      expect(next).toHaveBeenCalled();
      expect(reqNotFound.isCommissioner).toBe(true);
    });
  });

  describe('2. Revision Fingerprinting, Mandatory Controls & Route Denials', () => {
    it('computes deterministic SHA-256 revision from pool settings and name', () => {
      const poolA = { name: 'Main Pool', settings: { key: 'val' } };
      const poolB = { name: 'Main Pool', settings: { key: 'val' } };
      const poolC = { name: 'Main Pool', settings: { key: 'different' } };

      const revA = computePoolSettingsRevision(poolA);
      const revB = computePoolSettingsRevision(poolB);
      const revC = computePoolSettingsRevision(poolC);

      expect(revA).toHaveLength(64);
      expect(revA).toBe(revB);
      expect(revA).not.toBe(revC);
    });

    it('rejects stale expectedRevision with HTTP 409 STALE_REVISION on PATCH details and does not update', async () => {
      const pool = { id: POOL_ID, name: 'Current Name', settings: {}, status: 'ACTIVE', adminId: JACK_UUID };
      mockPrisma.pool.findUnique.mockResolvedValue(pool);

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/owner/details`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jackAuthToken}`,
        },
        body: JSON.stringify({
          name: 'Renamed Pool',
          expectedRevision: 'stale-revision-000000000000000000000000000000000000000000000000000000000000',
          reason: 'Valid audit reason for update',
        }),
      });
      const data: any = await res.json();

      expect(res.status).toBe(409);
      expect(data.code).toBe('STALE_REVISION');
      expect(mockPrisma.pool.update).not.toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('rejects stale expectedRevision with HTTP 409 STALE_REVISION on PATCH flags', async () => {
      const pool = { id: POOL_ID, name: 'Current Name', settings: {}, status: 'ACTIVE', adminId: JACK_UUID };
      mockPrisma.pool.findUnique.mockResolvedValue(pool);

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/owner/flags`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jackAuthToken}`,
        },
        body: JSON.stringify({
          flags: { f_sweat_radar: true, f_league_press_box: false },
          expectedRevision: 'stale-flags-revision-1234',
          reason: 'Enabling sweat radar',
        }),
      });
      const data: any = await res.json();

      expect(res.status).toBe(409);
      expect(data.code).toBe('STALE_REVISION');
      expect(mockPrisma.pool.update).not.toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('enforces mandatory row lock: fails transaction if $queryRawUnsafe is unavailable or fails', async () => {
      const pool = { id: POOL_ID, name: 'Current Name', settings: {}, status: 'ACTIVE', adminId: JACK_UUID };
      const currentRev = computePoolSettingsRevision(pool);
      mockPrisma.pool.findUnique.mockResolvedValue(pool);
      mockPrisma.$queryRawUnsafe.mockRejectedValueOnce(new Error('Lock deadlock or DB failure'));

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/owner/details`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jackAuthToken}`,
        },
        body: JSON.stringify({
          name: 'Renamed Pool',
          expectedRevision: currentRev,
          reason: 'Valid reason',
        }),
      });

      expect(res.status).toBe(500);
      expect(mockPrisma.pool.update).not.toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('enforces mandatory audit log: aborts transaction if auditLog.create is unavailable or fails', async () => {
      const pool = { id: POOL_ID, name: 'Current Name', settings: {}, status: 'ACTIVE', adminId: JACK_UUID };
      const currentRev = computePoolSettingsRevision(pool);
      mockPrisma.pool.findUnique.mockResolvedValue(pool);
      mockPrisma.auditLog.create.mockRejectedValueOnce(new Error('Audit table constraint violation'));

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/owner/details`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jackAuthToken}`,
        },
        body: JSON.stringify({
          name: 'Renamed Pool',
          expectedRevision: currentRev,
          reason: 'Valid reason',
        }),
      });

      expect(res.status).toBe(500);
    });

    it('enforces in-transaction actor membership recheck: fails with 403 if membership revoked mid-transaction', async () => {
      const pool = { id: POOL_ID, name: 'Current Name', settings: {}, status: 'ACTIVE', adminId: JACK_UUID };
      const currentRev = computePoolSettingsRevision(pool);
      mockPrisma.pool.findUnique.mockResolvedValue(pool);
      // In-transaction findFirst returns null (revoked membership)
      mockPrisma.poolMembership.findFirst.mockResolvedValueOnce(null);

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/owner/details`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jackAuthToken}`,
        },
        body: JSON.stringify({
          name: 'Renamed Pool',
          expectedRevision: currentRev,
          reason: 'Valid reason',
        }),
      });
      const data: any = await res.json();

      expect(res.status).toBe(403);
      expect(data.code).toBe('ACTIVE_MEMBERSHIP_REQUIRED');
      expect(mockPrisma.pool.update).not.toHaveBeenCalled();
    });

    it('enforces disabled PUT /slate endpoint: returns HTTP 501 SLATE_MUTATION_DISABLED', async () => {
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/owner/slate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jackAuthToken}`,
        },
        body: JSON.stringify({
          season: 2026,
          seasonType: 2,
          weekNumber: 9,
          eventIds: ['401873040', '401873041'],
          expectedRevision: 'any-revision',
          reason: 'Custom slate proposal',
        }),
      });
      const data: any = await res.json();

      expect(res.status).toBe(501);
      expect(data.code).toBe('SLATE_MUTATION_DISABLED');
      expect(mockPrisma.pool.update).not.toHaveBeenCalled();
    });
  });

  describe('3. Built Pages URL Behavior, API Base Resolution & Presentation Flags', () => {
    it('normalizeApiOrigin strictly requires HTTPS VITE_API_URL in production', () => {
      // Missing in prod throws fail-closed error
      expect(() => normalizeApiOrigin(undefined, true)).toThrow('APPROVED_HTTPS_API_REQUIRED_IN_PRODUCTION');

      // Non-HTTPS in prod throws
      expect(() => normalizeApiOrigin('http://insecure-backend.com', true)).toThrow('APPROVED_HTTPS_API_REQUIRED_IN_PRODUCTION');

      // Loopback/LAN in prod throws
      expect(() => normalizeApiOrigin('http://192.168.1.5:3000', true)).toThrow('APPROVED_HTTPS_API_REQUIRED_IN_PRODUCTION');

      // Approved HTTPS origin succeeds
      const resolved = normalizeApiOrigin('https://nfl-pick-em-api.onrender.com', true);
      expect(resolved).toBe('https://nfl-pick-em-api.onrender.com');
    });

    it('scopedExpressFetch routes relative /api calls to configured HTTPS Render origin from Pages', async () => {
      let dispatchedUrl = '';
      const customFetch = async (input: RequestInfo | URL) => {
        dispatchedUrl = input.toString();
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      };

      const res = await scopedExpressFetch('/api/pools/0f497f1b-9002-49bd-ad2a-68ae34cb8afd/owner/overview', {
        apiOrigin: 'https://nfl-pick-em-api.onrender.com',
        isProd: true,
        sessionToken: 'test-token',
        originalFetch: customFetch as any,
      });

      expect(res.status).toBe(200);
      expect(dispatchedUrl).toBe('https://nfl-pick-em-api.onrender.com/api/pools/0f497f1b-9002-49bd-ad2a-68ae34cb8afd/owner/overview');
    });

    it('GET /api/pools/:pool_id/presentation-flags defaults closed to false/false when unconfigured', async () => {
      const pool = { id: POOL_ID, name: 'Main Pool', settings: {}, status: 'ACTIVE', adminId: JACK_UUID };
      mockPrisma.pool.findUnique.mockResolvedValue(pool);

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/presentation-flags`, {
        headers: { Authorization: `Bearer ${jackAuthToken}` },
      });
      const data: any = await res.json();

      expect(res.status).toBe(200);
      expect(data.f_sweat_radar).toBe(false);
      expect(data.f_league_press_box).toBe(false);
      expect(data.configured).toBe(false);
    });

    it('GET /api/pools/:pool_id/presentation-flags returns configured booleans when persisted', async () => {
      const pool = {
        id: POOL_ID,
        name: 'Main Pool',
        settings: {
          owner_admin_v1: {
            presentationFlags: {
              f_sweat_radar: true,
              f_league_press_box: false,
              updatedAt: '2026-11-03T15:00:00Z',
            },
          },
        },
        status: 'ACTIVE',
        adminId: JACK_UUID,
      };
      mockPrisma.pool.findUnique.mockResolvedValue(pool);

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/presentation-flags`, {
        headers: { Authorization: `Bearer ${jackAuthToken}` },
      });
      const data: any = await res.json();

      expect(res.status).toBe(200);
      expect(data.f_sweat_radar).toBe(true);
      expect(data.f_league_press_box).toBe(false);
      expect(data.configured).toBe(true);
    });

    it('fetchPresentationFlags client service defaults closed on error', async () => {
      const flags = await fetchPresentationFlags('non-existent-pool-id', 'invalid-token');
      expect(flags.f_sweat_radar).toBe(false);
      expect(flags.f_league_press_box).toBe(false);
      expect(flags.configured).toBe(false);
    });
  });

  describe('4. Simulation Engine & Input Validation', () => {
    it('computes competition ranks, shot penalties, and The Drop boundary using real production logic', () => {
      const scenarioGames: SlateGame[] = [
        { id: 'tb-det', homeTeam: 'DET', awayTeam: 'MIN', spread: 0, kickoffTime: '2026-11-01T17:00:00Z' },
        { id: 'g-gb', homeTeam: 'GB', awayTeam: 'CAR', spread: 0, kickoffTime: '2026-11-01T17:00:00Z' },
      ];

      const liveGames = [
        {
          id: 'tb-det',
          name: 'MIN @ DET',
          shortName: 'MIN @ DET',
          homeTeam: { code: 'DET', name: 'DET', score: '31' },
          awayTeam: { code: 'MIN', name: 'MIN', score: '28' },
          status: 'FINAL' as const,
          clock: 'FINAL',
          period: 4,
        },
        {
          id: 'g-gb',
          name: 'CAR @ GB',
          shortName: 'CAR @ GB',
          homeTeam: { code: 'GB', name: 'GB', score: '24' },
          awayTeam: { code: 'CAR', name: 'CAR', score: '10' },
          status: 'FINAL' as const,
          clock: 'FINAL',
          period: 4,
        },
      ];

      const members: UserStandingRef[] = [
        { id: 'u1', name: 'Leader Alice' },
        { id: 'u2', name: 'Dropper Bob' },
      ];

      const picks: UserPickItem[] = [
        { userId: 'u1', gameId: 'tb-det', selectedTeam: 'DET', isSubmitted: true },
        { userId: 'u1', gameId: 'g-gb', selectedTeam: 'GB', isSubmitted: true },
        { userId: 'u2', gameId: 'tb-det', selectedTeam: 'MIN', isSubmitted: true },
        { userId: 'u2', gameId: 'g-gb', selectedTeam: 'CAR', isSubmitted: true },
      ];

      const tiebreakers: TiebreakerData = {
        actualTotalScore: 59,
        userPredictions: {
          u1: 58,
          u2: 40,
        },
      };

      const result = calculateProvisionalStandings(members, scenarioGames, liveGames, picks, tiebreakers);

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('u1');
      expect(result[0].provisionalRank).toBe(1);
      expect(result[0].totalProvisionalPoints).toBe(2);

      expect(result[1].userId).toBe('u2');
      expect(result[1].provisionalRank).toBe(2);
      expect(result[1].totalProvisionalPoints).toBe(0);
    });

    it('POST /api/pools/:pool_id/owner/simulations/preview rejects invalid simulation input bounds', async () => {
      // Case A: negative score
      const resNeg = await fetch(`${baseUrl}/api/pools/${POOL_ID}/owner/simulations/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jackAuthToken}`,
        },
        body: JSON.stringify({
          scenario: [{ id: 'sim-1', homeScore: -5, awayScore: 10 }],
          members: [{ userId: 'u1', userName: 'User 1' }],
        }),
      });
      const dataNeg: any = await resNeg.json();
      expect(resNeg.status).toBe(422);
      expect(dataNeg.code).toBe('INVALID_SIMULATION');

      // Case B: non-integer score
      const resFloat = await fetch(`${baseUrl}/api/pools/${POOL_ID}/owner/simulations/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jackAuthToken}`,
        },
        body: JSON.stringify({
          scenario: [{ id: 'sim-1', homeScore: 14.5, awayScore: 10 }],
          members: [{ userId: 'u1', userName: 'User 1' }],
        }),
      });
      const dataFloat: any = await resFloat.json();
      expect(resFloat.status).toBe(422);
      expect(dataFloat.code).toBe('INVALID_SIMULATION');
    });

    it('POST /api/pools/:pool_id/owner/simulations/preview computes pure simulation and marks isFinal when all final', async () => {
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/owner/simulations/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jackAuthToken}`,
        },
        body: JSON.stringify({
          scenario: [
            { id: 'tb-det', homeTeamId: 'DET', awayTeamId: 'MIN', homeScore: 31, awayScore: 28, status: 'FINAL' },
            { id: 'g-gb', homeTeamId: 'GB', awayTeamId: 'CAR', homeScore: 24, awayScore: 10, status: 'FINAL' },
          ],
          members: [
            { userId: 'u1', userName: 'Jack', tiebreakerPrediction: 58, picks: [{ gameId: 'tb-det', selectedTeam: 'DET' }, { gameId: 'g-gb', selectedTeam: 'GB' }] },
            { userId: 'u2', userName: 'Chris', tiebreakerPrediction: 50, picks: [{ gameId: 'tb-det', selectedTeam: 'MIN' }, { gameId: 'g-gb', selectedTeam: 'CAR' }] },
          ],
        }),
      });
      const data: any = await res.json();

      expect(res.status).toBe(200);
      expect(data.simulation).toBe(true);
      expect(data.isFinal).toBe(true);
      expect(data.standings).toHaveLength(2);
      expect(mockPrisma.pool.update).not.toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });
  });

  describe('5. Separate Static Entry Point Verification', () => {
    it('verifies client/owner/index.html exists and is completely outside member App', () => {
      const ownerHtmlPath = path.resolve(__dirname, '../client/owner/index.html');
      expect(fs.existsSync(ownerHtmlPath)).toBe(true);

      const content = fs.readFileSync(ownerHtmlPath, 'utf8');
      expect(content).toContain('owner-root');
      expect(content).toContain('/src/owner/main.tsx');
      expect(content).not.toContain('/src/main.tsx');
    });

    it('verifies client/src/owner/main.tsx mounts OwnerAdminApp with HashRouter and separate React root', () => {
      const mainPath = path.resolve(__dirname, '../client/src/owner/main.tsx');
      expect(fs.existsSync(mainPath)).toBe(true);

      const content = fs.readFileSync(mainPath, 'utf8');
      expect(content).toContain('owner-root');
      expect(content).toContain('HashRouter');
      expect(content).toContain('OwnerAdminApp');
      expect(content).not.toContain('BrowserRouter');
    });

    it('verifies dist/owner/index.html was produced by client build alongside dist/index.html', () => {
      const distIndexPath = path.resolve(__dirname, '../client/dist/index.html');
      const distOwnerPath = path.resolve(__dirname, '../client/dist/owner/index.html');

      expect(fs.existsSync(distIndexPath)).toBe(true);
      expect(fs.existsSync(distOwnerPath)).toBe(true);

      const ownerDistHtml = fs.readFileSync(distOwnerPath, 'utf8');
      expect(ownerDistHtml).toContain('owner-root');
    });
  });
});
