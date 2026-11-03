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
import {
  DEFAULT_SIM_MATCHES,
  DEFAULT_SIM_MEMBERS,
  cloneDefaultSimMatches,
  cloneDefaultSimMembers,
  generateNextMatchId,
  generateNextMemberId,
  updateMatchTeamWithPickSync,
  computeSimulationStandings,
} from '../client/src/owner/OwnerAdminApp';
import * as authoritativeSlateService from '../src/services/authoritativeSlateService';
import { getGamesForWeek } from '../src/routes/poolTiebreakerRoutes';
import { selectAcceptedScoredSlateGames } from '../client/src/services/weeklyStandingsFinalityService';
import { getScopedPoolSlateConfig } from '../client/src/services/poolScoredSlateConfig';

describe('HAG-58: Directive 3 Owner Admin & Binding Rulings Verification', () => {
  const JACK_UUID = 'e3242a19-1131-4fc5-9886-7730f10ef69b';
  const NON_JACK_UUID = 'a1111111-2222-3333-4444-555555555555';
  const POOL_ID = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';

  let server: http.Server;
  let baseUrl: string;
  let mockPrisma: any;
  let jackAuthToken: string;
  let committedDbState: {
    pools: Record<string, any>;
    memberships: Record<string, any>;
    auditLogs: any[];
    weeklySubmissions: any[];
    picks: any[];
  };

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

    committedDbState = {
      pools: {
        [POOL_ID]: JSON.parse(JSON.stringify(basePool)),
      },
      memberships: {
        [`${POOL_ID}:${JACK_UUID}`]: {
          poolId: POOL_ID,
          userId: JACK_UUID,
          status: 'ACTIVE',
          role: 'COMMISSIONER',
        },
      },
      auditLogs: [],
      weeklySubmissions: [],
      picks: [],
    };

    mockPrisma = {
      pool: {
        findUnique: vi.fn(async ({ where }: any) => {
          return committedDbState.pools[where.id] ? { ...committedDbState.pools[where.id] } : null;
        }),
        update: vi.fn(async ({ where, data }: any) => {
          if (!committedDbState.pools[where.id]) throw new Error('Pool not found');
          committedDbState.pools[where.id] = { ...committedDbState.pools[where.id], ...data };
          return { ...committedDbState.pools[where.id] };
        }),
      },
      poolMembership: {
        findUnique: vi.fn(async ({ where }: any) => {
          const key = where?.poolId_userId ? `${where.poolId_userId.poolId}:${where.poolId_userId.userId}` : '';
          return committedDbState.memberships[key] ? { ...committedDbState.memberships[key] } : null;
        }),
        findFirst: vi.fn(async ({ where }: any) => {
          const key = `${where.poolId}:${where.userId}`;
          const m = committedDbState.memberships[key];
          if (m && (!where.status || m.status === where.status)) return { ...m };
          return null;
        }),
        count: vi.fn().mockResolvedValue(10),
      },
      user: {
        findUnique: vi.fn(async ({ where }: any) => ({
          id: where.id,
          email: 'jack.w.cone@gmail.com',
          role: 'ADMIN',
          status: 'ACTIVE',
        })),
      },
      _gameStore: [] as any[],
      weeklySubmission: {
        count: vi.fn(async ({ where }: any) => {
          return committedDbState.weeklySubmissions.filter((s: any) =>
            s.poolId === where.poolId &&
            s.weekNumber === where.weekNumber &&
            (where.tieBreakerPrediction?.not === null ? s.tieBreakerPrediction != null : true)
          ).length;
        }),
      },
      pick: {
        count: vi.fn(async (args?: any) => {
          if (args?.where?.game?.externalGameId?.in) {
            const inSet = new Set(args.where.game.externalGameId.in);
            return committedDbState.picks.filter((p: any) => inSet.has(p.gameId) || inSet.has(p.externalGameId)).length;
          }
          return committedDbState.picks.length;
        }),
      },
      game: {
        findMany: vi.fn(async (args?: any) => {
          if (args?.where?.externalGameId?.in) {
            const inSet = new Set(args.where.externalGameId.in);
            return (mockPrisma._gameStore || []).filter((g: any) => inSet.has(g.externalGameId));
          }
          return mockPrisma._gameStore || [];
        }),
      },
      auditLog: {
        create: vi.fn(async ({ data }: any) => {
          const entry = { id: `audit-${Date.now()}`, ...data };
          committedDbState.auditLogs.push(entry);
          return entry;
        }),
      },
      $queryRawUnsafe: vi.fn(async (query: string, ...args: any[]) => {
        if (query.includes('FROM public.picks')) {
          return [{ count: committedDbState.picks.length }];
        }
        return [{ id: POOL_ID }];
      }),
      $transaction: vi.fn(async (cb: (tx: any) => any) => {
        // Create transactional sandbox clone
        const txState = {
          pools: JSON.parse(JSON.stringify(committedDbState.pools)),
          memberships: JSON.parse(JSON.stringify(committedDbState.memberships)),
          auditLogs: [...committedDbState.auditLogs],
          weeklySubmissions: [...committedDbState.weeklySubmissions],
          picks: [...committedDbState.picks],
        };

        const tx = {
          $queryRawUnsafe: vi.fn(async (query: string, ...args: any[]) => {
            return mockPrisma.$queryRawUnsafe(query, ...args);
          }),
          pool: {
            findUnique: vi.fn(async ({ where }: any) => {
              return txState.pools[where.id] ? { ...txState.pools[where.id] } : null;
            }),
            update: vi.fn(async ({ where, data }: any) => {
              if (!txState.pools[where.id]) throw new Error('Pool not found');
              txState.pools[where.id] = { ...txState.pools[where.id], ...data };
              return { ...txState.pools[where.id] };
            }),
          },
          poolMembership: {
            findFirst: vi.fn(async ({ where }: any) => {
              return mockPrisma.poolMembership.findFirst({ where });
            }),
            findUnique: vi.fn(async ({ where }: any) => {
              return mockPrisma.poolMembership.findUnique({ where });
            }),
          },
          auditLog: {
            create: vi.fn(async ({ data }: any) => {
              const res = await mockPrisma.auditLog.create({ data });
              txState.auditLogs.push(res);
              return res;
            }),
          },
          weeklySubmission: {
            count: vi.fn(async ({ where }: any) => {
              return mockPrisma.weeklySubmission.count({ where });
            }),
          },
          pick: {
            count: vi.fn(async (args?: any) => mockPrisma.pick.count(args)),
          },
          game: {
            findMany: vi.fn(async (args?: any) => mockPrisma.game.findMany(args)),
          },
        };

        // Execute transaction callback
        const result = await cb(tx);
        // On success: COMMIT state!
        committedDbState.pools = txState.pools;
        committedDbState.memberships = txState.memberships;
        committedDbState.auditLogs = txState.auditLogs;
        committedDbState.weeklySubmissions = txState.weeklySubmissions;
        committedDbState.picks = txState.picks;
        return result;
      }),
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
      const currentRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);
      mockPrisma.auditLog.create.mockRejectedValueOnce(new Error('Audit table constraint violation'));

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/owner/details`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jackAuthToken}`,
        },
        body: JSON.stringify({
          name: 'Renamed Pool Should Rollback',
          expectedRevision: currentRev,
          reason: 'Valid reason',
        }),
      });

      expect(res.status).toBe(500);
      // Assert zero committed mutation on the transaction-aware fake state
      expect(committedDbState.pools[POOL_ID].name).toBe('Main Championship Pool');
      expect(committedDbState.auditLogs).toHaveLength(0);
    });

    it('successfully commits details mutation to database state when all transaction checks pass', async () => {
      const currentRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/owner/details`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jackAuthToken}`,
        },
        body: JSON.stringify({
          name: 'Committed New Name',
          expectedRevision: currentRev,
          reason: 'Valid audit reason for change',
        }),
      });
      const data: any = await res.json();

      expect(res.status).toBe(200);
      expect(data.name).toBe('Committed New Name');
      expect(committedDbState.pools[POOL_ID].name).toBe('Committed New Name');
      expect(committedDbState.auditLogs).toHaveLength(1);
      expect(committedDbState.auditLogs[0].action).toBe('OWNER_ADMIN_UPDATE_DETAILS');
    });

    it('POST /tiebreaker-designation rolls back and returns 409 DESIGNATION_FROZEN if predictions received before commit', async () => {
      // Mock game list for week 9
      mockPrisma.game.findMany.mockResolvedValueOnce([
        {
          id: 'game-future-tb',
          externalGameId: '401873099',
          homeTeamId: 'DET',
          awayTeamId: 'GB',
          kickoffTime: new Date(Date.now() + 86400000).toISOString(),
          seasonYear: 2026,
          weekNumber: 9,
        },
      ]);
      const currentRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);

      // Seed a weekly submission in state to trigger freeze
      committedDbState.weeklySubmissions.push({
        poolId: POOL_ID,
        weekNumber: 9,
        tieBreakerPrediction: 45,
      });

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/owner/tiebreaker-designation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jackAuthToken}`,
        },
        body: JSON.stringify({
          season: 2026,
          weekNumber: 9,
          targetGameId: '401873099',
          expectedRevision: currentRev,
          reason: 'Change to DET vs GB',
        }),
      });
      const data: any = await res.json();

      expect(res.status).toBe(409);
      expect(data.code).toBe('DESIGNATION_FROZEN');
      // Assert zero committed settings change
      expect(committedDbState.pools[POOL_ID].settings?.tiebreaker_designations).toBeUndefined();
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

    it('PUT /slate rejects historical or current week: 422 HISTORICAL_SLATE_PROTECTED', async () => {
      mockPrisma.pool.findUnique.mockImplementation(async ({ where }: any) => {
        return committedDbState.pools[where.id] ? { ...committedDbState.pools[where.id] } : null;
      });
      const currentRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/owner/slate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jackAuthToken}`,
        },
        body: JSON.stringify({
          season: 2026,
          seasonType: 2,
          weekNumber: 8, // Current/historical week
          eventIds: ['401873023', '401873024'],
          expectedRevision: currentRev,
          reason: 'Cannot modify historical Week 8',
        }),
      });
      const data: any = await res.json();

      expect(res.status).toBe(422);
      expect(data.code).toBe('HISTORICAL_SLATE_PROTECTED');
      expect(mockPrisma.pool.update).not.toHaveBeenCalled();
    });

    it('PUT /slate rejects stale expectedRevision: 409 STALE_REVISION', async () => {
      mockPrisma.pool.findUnique.mockImplementation(async ({ where }: any) => {
        return committedDbState.pools[where.id] ? { ...committedDbState.pools[where.id] } : null;
      });

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
          expectedRevision: 'stale-wrong-revision-hash',
          reason: 'Update future slate',
        }),
      });
      const data: any = await res.json();

      expect(res.status).toBe(409);
      expect(data.code).toBe('STALE_REVISION');
      expect(mockPrisma.pool.update).not.toHaveBeenCalled();
    });

    it('PUT /slate rejects missing accepted manifest: 422 UNACCEPTED_MANIFEST', async () => {
      mockPrisma.pool.findUnique.mockImplementation(async ({ where }: any) => {
        return committedDbState.pools[where.id] ? { ...committedDbState.pools[where.id] } : null;
      });
      const currentRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);
      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValueOnce(null);

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
          expectedRevision: currentRev,
          reason: 'Attempt unaccepted manifest',
        }),
      });
      const data: any = await res.json();

      expect(res.status).toBe(422);
      expect(data.code).toBe('UNACCEPTED_MANIFEST');
      expect(mockPrisma.pool.update).not.toHaveBeenCalled();
    });

    it('PUT /slate rejects event IDs outside accepted manifest: 422 INVALID_SLATE_SELECTION', async () => {
      mockPrisma.pool.findUnique.mockImplementation(async ({ where }: any) => {
        return committedDbState.pools[where.id] ? { ...committedDbState.pools[where.id] } : null;
      });
      const currentRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);

      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValueOnce({
        season: 2026,
        seasonType: 2,
        weekNumber: 9,
        revision: 1,
        eventIds: ['401873040', '401873041', '401873042'],
        acceptedAt: '2026-11-03T12:00:00Z',
        acceptedBy: 'commish',
        manifestFingerprint: 'manifest-fp-w9',
        observationTime: '2026-11-03T12:00:00Z',
      });

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
          eventIds: ['401873040', '999999999-unmanifested'],
          expectedRevision: currentRev,
          reason: 'Include rogue game',
        }),
      });
      const data: any = await res.json();

      expect(res.status).toBe(422);
      expect(data.code).toBe('INVALID_SLATE_SELECTION');
      expect(mockPrisma.pool.update).not.toHaveBeenCalled();
    });

    it('PUT /slate rejects if earliest effective kickoff has passed: 422 KICKOFF_PASSED', async () => {
      mockPrisma.pool.findUnique.mockImplementation(async ({ where }: any) => {
        return committedDbState.pools[where.id] ? { ...committedDbState.pools[where.id] } : null;
      });
      const currentRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);

      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValueOnce({
        season: 2026,
        seasonType: 2,
        weekNumber: 9,
        revision: 1,
        eventIds: ['401873040', '401873041'],
        acceptedAt: '2026-11-03T12:00:00Z',
        acceptedBy: 'commish',
        manifestFingerprint: 'manifest-fp-w9',
        observationTime: '2026-11-03T12:00:00Z',
      });

      // Matchup already passed kickoff
      mockPrisma._gameStore = [
        {
          id: 'g-past',
          externalGameId: '401873040',
          kickoffTime: new Date(Date.now() - 3600000), // 1 hour ago
          status: 'SCHEDULED',
        },
        {
          id: 'g-future',
          externalGameId: '401873041',
          kickoffTime: new Date(Date.now() + 86400000),
          status: 'SCHEDULED',
        },
      ];

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
          expectedRevision: currentRev,
          reason: 'Past kickoff attempt',
        }),
      });
      const data: any = await res.json();

      expect(res.status).toBe(422);
      expect(data.code).toBe('KICKOFF_PASSED');
      expect(mockPrisma.pool.update).not.toHaveBeenCalled();
    });

    it('PUT /slate rejects if weeklySubmission or prediction rows exist: 409 SLATE_FROZEN', async () => {
      mockPrisma.pool.findUnique.mockImplementation(async ({ where }: any) => {
        return committedDbState.pools[where.id] ? { ...committedDbState.pools[where.id] } : null;
      });
      const currentRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);

      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValueOnce({
        season: 2026,
        seasonType: 2,
        weekNumber: 9,
        revision: 1,
        eventIds: ['401873040', '401873041'],
        acceptedAt: '2026-11-03T12:00:00Z',
        acceptedBy: 'commish',
        manifestFingerprint: 'manifest-fp-w9',
        observationTime: '2026-11-03T12:00:00Z',
      });

      // Add a submission row for week 9
      committedDbState.weeklySubmissions.push({
        id: 'sub-w9',
        poolId: POOL_ID,
        weekNumber: 9,
        userId: JACK_UUID,
        tieBreakerPrediction: 45,
      });

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
          expectedRevision: currentRev,
          reason: 'Frozen week attempt',
        }),
      });
      const data: any = await res.json();

      expect(res.status).toBe(409);
      expect(data.code).toBe('SLATE_FROZEN');
      expect(mockPrisma.pool.update).not.toHaveBeenCalled();
    });

    it('PUT /slate rejects if member pick rows exist (including null picks): 409 SLATE_FROZEN', async () => {
      mockPrisma.pool.findUnique.mockImplementation(async ({ where }: any) => {
        return committedDbState.pools[where.id] ? { ...committedDbState.pools[where.id] } : null;
      });
      const currentRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);

      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValueOnce({
        season: 2026,
        seasonType: 2,
        weekNumber: 9,
        revision: 1,
        eventIds: ['401873040', '401873041'],
        acceptedAt: '2026-11-03T12:00:00Z',
        acceptedBy: 'commish',
        manifestFingerprint: 'manifest-fp-w9',
        observationTime: '2026-11-03T12:00:00Z',
      });

      // Add a pick row for week 9 with null selected_team_id
      committedDbState.picks.push({
        id: 'pick-null-team',
        poolId: POOL_ID,
        week: 9,
        gameId: '401873040',
        externalGameId: '401873040',
        userId: JACK_UUID,
        selectedTeamId: null, // Null pick still freezes slate mutation
      });

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
          expectedRevision: currentRev,
          reason: 'Frozen by null pick attempt',
        }),
      });
      const data: any = await res.json();

      expect(res.status).toBe(409);
      expect(data.code).toBe('SLATE_FROZEN');
      expect(mockPrisma.pool.update).not.toHaveBeenCalled();
    });

    it('PUT /slate successfully persists valid future slate with mandatory row lock, AuditLog, and new revision', async () => {
      mockPrisma.pool.findUnique.mockImplementation(async ({ where }: any) => {
        return committedDbState.pools[where.id] ? { ...committedDbState.pools[where.id] } : null;
      });
      const currentRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);

      const manifestEventIds = [
        '401873040', '401873041', '401873042', '401873043',
        '401873044', '401873045', '401873046', '401873047',
        '401873048', '401873049', '401873050', '401873051',
        '401873052', '401873053',
      ];

      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValueOnce({
        season: 2026,
        seasonType: 2,
        weekNumber: 9,
        revision: 1,
        eventIds: manifestEventIds,
        acceptedAt: '2026-11-03T12:00:00Z',
        acceptedBy: 'commish',
        manifestFingerprint: 'manifest-fp-w9',
        observationTime: '2026-11-03T12:00:00Z',
      });

      // Selected subset of 3 future games
      const selectedSubset = ['401873040', '401873041', '401873042'];
      mockPrisma._gameStore = selectedSubset.map((eid, idx) => ({
        id: `g-${eid}`,
        externalGameId: eid,
        homeTeamId: 'KC',
        awayTeamId: 'LV',
        kickoffTime: new Date(Date.now() + 86400000 * (idx + 1)), // Future kickoffs
        status: 'SCHEDULED',
      }));

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
          eventIds: selectedSubset,
          expectedRevision: currentRev,
          reason: 'Commissioner approved 3-game custom slate for Week 9',
        }),
      });
      const data: any = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.slate.weekNumber).toBe(9);
      expect(data.slate.eventIds).toEqual(selectedSubset);
      expect(typeof data.revision).toBe('string');
      expect(data.revision).not.toBe(currentRev);

      // Verify database commitment under row lock
      const committedPool = committedDbState.pools[POOL_ID];
      const committedSlate = committedPool.settings?.owner_admin_v1?.slates?.[2026]?.[2]?.[9];
      expect(committedSlate).toBeDefined();
      expect(committedSlate.eventIds).toEqual(selectedSubset);
      expect(committedSlate.version).toBe(1);

      // Verify mandatory AuditLog entry
      const audit = committedDbState.auditLogs.find((a) => a.action === 'OWNER_ADMIN_UPDATE_SLATE');
      expect(audit).toBeDefined();
      expect(audit.actorId).toBe(JACK_UUID);
      expect(audit.targetEntityId).toBe(POOL_ID);
      expect(audit.newValue.eventIds).toEqual(selectedSubset);

      // Verify in-transaction row lock was acquired
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        'SELECT id, name, settings, status, admin_id FROM public.pools WHERE id = $1::uuid FOR UPDATE;',
        POOL_ID
      );
    });

    it('wires custom pool slate into server getGamesForWeek and client selectAcceptedScoredSlateGames', async () => {
      mockPrisma.pool.findUnique.mockImplementation(async ({ where }: any) => {
        return committedDbState.pools[where.id] ? { ...committedDbState.pools[where.id] } : null;
      });

      // 1. Server Resolver Verification:
      // Configure pool settings with custom 3-game slate for Week 9
      const selectedSubset = ['401873040', '401873041', '401873042'];
      const manifestEventIds = [
        ...selectedSubset,
        '401873043', '401873044', '401873045',
      ];

      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue({
        season: 2026,
        seasonType: 2,
        weekNumber: 9,
        revision: 1,
        eventIds: manifestEventIds,
        acceptedAt: '2026-11-03T12:00:00Z',
        acceptedBy: 'commish',
        manifestFingerprint: 'manifest-fp-w9',
        observationTime: '2026-11-03T12:00:00Z',
      });

      committedDbState.pools[POOL_ID].settings = {
        owner_admin_v1: {
          slates: {
            2026: {
              2: {
                9: {
                  eventIds: selectedSubset,
                  version: 1,
                  updatedAt: new Date().toISOString(),
                },
              },
            },
          },
        },
      };

      mockPrisma._gameStore = manifestEventIds.map((eid) => ({
        id: `g-${eid}`,
        externalGameId: eid,
        homeTeamId: 'KC',
        awayTeamId: 'LV',
        kickoffTime: new Date(Date.now() + 86400000),
        status: 'SCHEDULED',
      }));

      // getGamesForWeek with poolId returns exactly the 3 scoped games
      const serverGames = await getGamesForWeek(9, 2026, POOL_ID, mockPrisma);
      expect(serverGames).toHaveLength(3);
      expect(serverGames.map((g) => g.externalGameId)).toEqual(selectedSubset);

      // 2. Client Resolver Verification:
      const scope = {
        poolId: POOL_ID,
        season: 2026,
        seasonType: 2,
        weekNumber: 9,
        poolSettings: committedDbState.pools[POOL_ID].settings,
      };

      const scopedConfig = getScopedPoolSlateConfig(scope);
      expect(scopedConfig).not.toBeNull();
      expect(scopedConfig!.scoredEventIds).toEqual(selectedSubset);

      const clientGames: SlateGame[] = manifestEventIds.map((eid) => ({
        id: `g-${eid}`,
        externalGameId: eid,
        homeTeam: 'KC',
        awayTeam: 'LV',
        kickoffTime: new Date(Date.now() + 86400000).toISOString(),
        status: 'SCHEDULED',
      }));

      // selectAcceptedScoredSlateGames scopes down to exactly the 3 custom games
      const scoredGames = selectAcceptedScoredSlateGames(clientGames, manifestEventIds, scope);
      expect(scoredGames).not.toBeNull();
      expect(scoredGames).toHaveLength(3);
      expect(scoredGames!.map((g) => g.externalGameId)).toEqual(selectedSubset);
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

    it('scopedExpressFetch routes relative /api calls to configured HTTPS Render origin from Pages, attaches session token, and fails closed in production', async () => {
      let dispatchedUrl = '';
      let dispatchedHeaders: Headers | undefined;
      const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        dispatchedUrl = input.toString();
        dispatchedHeaders = new Headers(init?.headers);
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      };

      const res = await scopedExpressFetch('/api/pools/0f497f1b-9002-49bd-ad2a-68ae34cb8afd/owner/overview', {
        apiOrigin: 'https://nfl-pick-em-api.onrender.com',
        isProd: true,
        sessionToken: 'test-verified-token',
        originalFetch: customFetch as any,
      });

      expect(res.status).toBe(200);
      expect(dispatchedUrl).toBe('https://nfl-pick-em-api.onrender.com/api/pools/0f497f1b-9002-49bd-ad2a-68ae34cb8afd/owner/overview');
      expect(dispatchedHeaders?.get('Authorization')).toBe('Bearer test-verified-token');

      // Actual production API base failure path: missing VITE_API_URL in production throws
      await expect(
        scopedExpressFetch('/api/pools/0f497f1b-9002-49bd-ad2a-68ae34cb8afd/owner/overview', {
          apiOrigin: '',
          isProd: true,
          originalFetch: customFetch as any,
        })
      ).rejects.toThrow('APPROVED_HTTPS_API_REQUIRED_IN_PRODUCTION: VITE_API_URL is missing');

      // Actual production API base failure path: non-HTTPS origin in production throws
      await expect(
        scopedExpressFetch('/api/pools/0f497f1b-9002-49bd-ad2a-68ae34cb8afd/owner/overview', {
          apiOrigin: 'http://insecure-backend.com',
          isProd: true,
          originalFetch: customFetch as any,
        })
      ).rejects.toThrow('APPROVED_HTTPS_API_REQUIRED_IN_PRODUCTION: Non-HTTPS origin rejected');
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

    it('POST /api/pools/:pool_id/owner/simulations/preview rejects invalid synthetic input bounds with HTTP 422', async () => {
      const validMatch = { id: 'sim-1', homeTeam: 'DET', awayTeam: 'MIN', homeScore: 24, awayScore: 21, status: 'FINAL' };
      const validMember = {
        userId: 'u1',
        userName: 'User 1',
        tiebreakerPrediction: 45,
        picks: [{ gameId: 'sim-1', selectedTeam: 'DET' }],
      };

      const testDenial = async (body: any, label: string) => {
        const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/owner/simulations/preview`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jackAuthToken}`,
          },
          body: JSON.stringify(body),
        });
        const data: any = await res.json();
        expect(res.status, `Expected 422 for ${label}`).toBe(422);
        expect(data.code).toBe('INVALID_SIMULATION');
      };

      // 1. Negative score
      await testDenial({ scenario: [{ ...validMatch, homeScore: -5 }], members: [validMember] }, 'negative score');

      // 2. Oversized score (> 150)
      await testDenial({ scenario: [{ ...validMatch, homeScore: 151 }], members: [validMember] }, 'oversized score');

      // 3. Fractional score
      await testDenial({ scenario: [{ ...validMatch, awayScore: 21.5 }], members: [validMember] }, 'fractional score');

      // 4. Invalid team code
      await testDenial({ scenario: [{ ...validMatch, homeTeam: 'XYZ' }], members: [validMember] }, 'invalid home team code');
      await testDenial({ scenario: [{ ...validMatch, awayTeam: 'BAD' }], members: [validMember] }, 'invalid away team code');

      // 5. Identical home and away teams
      await testDenial({ scenario: [{ ...validMatch, homeTeam: 'DET', awayTeam: 'DET' }], members: [validMember] }, 'identical teams');

      // 6. Malformed synthetic match ID
      await testDenial({ scenario: [{ ...validMatch, id: 'bad id with spaces!' }], members: [validMember] }, 'malformed match ID');

      // 7. Duplicate synthetic match ID
      await testDenial({
        scenario: [validMatch, { ...validMatch, homeTeam: 'GB', awayTeam: 'CHI' }],
        members: [validMember],
      }, 'duplicate match ID');

      // 8. Malformed synthetic member ID
      await testDenial({
        scenario: [validMatch],
        members: [{ ...validMember, userId: 'bad id with spaces!' }],
      }, 'malformed member ID');

      // 9. Duplicate synthetic member ID
      await testDenial({
        scenario: [validMatch],
        members: [validMember, { ...validMember, userName: 'User 2' }],
      }, 'duplicate member ID');

      // 10. Malformed simulatedClock
      await testDenial({
        scenario: [validMatch],
        members: [validMember],
        simulatedClock: 'not-a-valid-date-string',
      }, 'malformed simulatedClock');

      // 11. Nonfinite or fractional tiebreaker prediction
      await testDenial({
        scenario: [validMatch],
        members: [{ ...validMember, tiebreakerPrediction: 'fifty' as any }],
      }, 'non-numeric tiebreaker prediction');
      await testDenial({
        scenario: [validMatch],
        members: [{ ...validMember, tiebreakerPrediction: 45.5 }],
      }, 'fractional tiebreaker prediction');

      // 12. Out-of-bounds tiebreaker prediction (> 200 or < 0)
      await testDenial({
        scenario: [validMatch],
        members: [{ ...validMember, tiebreakerPrediction: 201 }],
      }, 'oversized tiebreaker prediction');
      await testDenial({
        scenario: [validMatch],
        members: [{ ...validMember, tiebreakerPrediction: -1 }],
      }, 'negative tiebreaker prediction');

      // 13. Pick references unknown match ID
      await testDenial({
        scenario: [validMatch],
        members: [{ ...validMember, picks: [{ gameId: 'unknown-game', selectedTeam: 'DET' }] }],
      }, 'unknown match ID in pick');

      // 14. Pick selectedTeam not in match
      await testDenial({
        scenario: [validMatch],
        members: [{ ...validMember, picks: [{ gameId: 'sim-1', selectedTeam: 'KC' }] }],
      }, 'team not in match in pick');

      // 15. Duplicate pick for same match
      await testDenial({
        scenario: [validMatch],
        members: [{
          ...validMember,
          picks: [
            { gameId: 'sim-1', selectedTeam: 'DET' },
            { gameId: 'sim-1', selectedTeam: 'MIN' },
          ],
        }],
      }, 'duplicate pick for same match');

      // 16. Conflicting team aliases
      await testDenial({
        scenario: [{ ...validMatch, homeTeam: 'DET', homeTeamId: 'GB' }],
        members: [validMember],
      }, 'conflicting homeTeam and homeTeamId aliases');
      await testDenial({
        scenario: [{ ...validMatch, awayTeam: 'MIN', awayTeamId: 'CHI' }],
        members: [validMember],
      }, 'conflicting awayTeam and awayTeamId aliases');

      // 17. Conflicting synthetic member aliases
      await testDenial({
        scenario: [validMatch],
        members: [{ ...validMember, userId: 'u1', id: 'u2' }],
      }, 'conflicting userId and id aliases');
      await testDenial({
        scenario: [validMatch],
        members: [{ ...validMember, userName: 'Alice', name: 'Bob' }],
      }, 'conflicting userName and name aliases');
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

    it('POST /api/pools/:pool_id/owner/simulations/preview normalizes case-folded status and consistent aliases', async () => {
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/owner/simulations/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jackAuthToken}`,
        },
        body: JSON.stringify({
          scenario: [
            // Case-folded 'final' and matching aliases
            { id: 'sim-cf-1', homeTeam: 'DET', homeTeamId: 'DET', awayTeam: 'MIN', awayTeamId: 'MIN', homeScore: 24, awayScore: 20, status: 'final' },
            { id: 'sim-cf-2', homeTeam: 'GB', awayTeam: 'CAR', homeScore: 30, awayScore: 10, status: 'Final' },
          ],
          members: [
            { userId: 'u1', id: 'u1', userName: 'Jack', name: 'Jack', tiebreakerPrediction: 44, picks: [{ gameId: 'sim-cf-1', selectedTeam: 'DET' }, { gameId: 'sim-cf-2', selectedTeam: 'GB' }] },
          ],
        }),
      });
      const data: any = await res.json();

      expect(res.status).toBe(200);
      expect(data.simulation).toBe(true);
      expect(data.isFinal).toBe(true);
      expect(data.standings).toHaveLength(1);
      expect(data.standings[0].totalProvisionalPoints).toBe(2);

      // Verify in_progress case-folded normalization
      const resInProgress = await fetch(`${baseUrl}/api/pools/${POOL_ID}/owner/simulations/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jackAuthToken}`,
        },
        body: JSON.stringify({
          scenario: [
            { id: 'sim-cf-1', homeTeam: 'DET', awayTeam: 'MIN', homeScore: 24, awayScore: 20, status: 'final' },
            { id: 'sim-cf-2', homeTeam: 'GB', awayTeam: 'CAR', homeScore: 30, awayScore: 10, status: 'in_progress' },
          ],
          members: [
            { userId: 'u1', userName: 'Jack', tiebreakerPrediction: 44, picks: [{ gameId: 'sim-cf-1', selectedTeam: 'DET' }, { gameId: 'sim-cf-2', selectedTeam: 'GB' }] },
          ],
        }),
      });
      const dataInProgress: any = await resInProgress.json();

      expect(resInProgress.status).toBe(200);
      expect(dataInProgress.simulation).toBe(true);
      expect(dataInProgress.isFinal).toBe(false);
    });

    it('proves deep clone immutability and simulation reset: mutations do not corrupt defaults, reset restores pristine fixtures', () => {
      // 1. Verify defaults are deeply frozen
      expect(Object.isFrozen(DEFAULT_SIM_MATCHES)).toBe(true);
      expect(Object.isFrozen(DEFAULT_SIM_MATCHES[0])).toBe(true);
      expect(Object.isFrozen(DEFAULT_SIM_MEMBERS)).toBe(true);

      // 2. Clone matches and mutate cloned objects
      const clonedMatches = cloneDefaultSimMatches();
      expect(clonedMatches[0].homeScore).toBe(31);
      expect(clonedMatches[0].status).toBe('FINAL');

      clonedMatches[0].homeScore = 99;
      clonedMatches[0].status = 'IN_PROGRESS';
      clonedMatches[0].homeTeam = 'KC';

      // 3. Verify original DEFAULT_SIM_MATCHES is 100% unmutated
      expect(DEFAULT_SIM_MATCHES[0].homeScore).toBe(31);
      expect(DEFAULT_SIM_MATCHES[0].status).toBe('FINAL');
      expect(DEFAULT_SIM_MATCHES[0].homeTeam).toBe('DET');

      // 4. Verify reset restoration
      const resetMatches = cloneDefaultSimMatches();
      expect(resetMatches[0].homeScore).toBe(31);
      expect(resetMatches[0].status).toBe('FINAL');
      expect(resetMatches[0].homeTeam).toBe('DET');
    });

    it('generates collision-free stable IDs across add/remove/add sequences and keeps picks consistent on team change', () => {
      // 1. Match ID sequence: start with 4, remove middle, add, remove another, add
      let matches = cloneDefaultSimMatches(); // ['sim-tb', 'sim-g2', 'sim-g3', 'sim-g4']
      expect(matches).toHaveLength(4);

      matches = matches.filter((m) => m.id !== 'sim-g3');
      const nextMatchId1 = generateNextMatchId(matches);
      expect(['sim-tb', 'sim-g2', 'sim-g4']).not.toContain(nextMatchId1);

      matches.push({ id: nextMatchId1, homeTeam: 'KC', awayTeam: 'LV' });
      matches = matches.filter((m) => m.id !== 'sim-g2');
      const nextMatchId2 = generateNextMatchId(matches);
      expect(matches.map((m) => m.id)).not.toContain(nextMatchId2);
      matches.push({ id: nextMatchId2, homeTeam: 'DAL', awayTeam: 'PHI' });

      const matchIdSet = new Set(matches.map((m) => m.id));
      expect(matchIdSet.size).toBe(matches.length);

      // 2. Member ID sequence: start with 10, remove middle, add, remove, add
      let members = cloneDefaultSimMembers();
      expect(members).toHaveLength(10);

      members = members.filter((m) => m.id !== 'm5');
      const nextMemberId1 = generateNextMemberId(members);
      expect(members.map((m) => m.id)).not.toContain(nextMemberId1);

      members.push({ id: nextMemberId1, name: 'New Member', picks: [] });
      members = members.filter((m) => m.id !== 'm2');
      const nextMemberId2 = generateNextMemberId(members);
      expect(members.map((m) => m.id)).not.toContain(nextMemberId2);
      members.push({ id: nextMemberId2, name: 'Another Member', picks: [] });

      const memberIdSet = new Set(members.map((m) => m.id));
      expect(memberIdSet.size).toBe(members.length);

      // 3. Team change pick synchronization:
      // m1 picked DET (home), m3 picked MIN (away) for sim-tb
      const freshMatches = cloneDefaultSimMatches();
      const freshMembers = cloneDefaultSimMembers();

      const m1PickBefore = freshMembers.find((m) => m.id === 'm1')?.picks.find((p: any) => p.gameId === 'sim-tb');
      const m3PickBefore = freshMembers.find((m) => m.id === 'm3')?.picks.find((p: any) => p.gameId === 'sim-tb');
      expect(m1PickBefore?.selectedTeam).toBe('DET');
      expect(m3PickBefore?.selectedTeam).toBe('MIN');

      // Change away team from MIN to CHI
      const { updatedMatches, updatedMembers } = updateMatchTeamWithPickSync(
        freshMatches,
        freshMembers,
        'sim-tb',
        'away',
        'CHI'
      );

      const simTbUpdated = updatedMatches.find((m) => m.id === 'sim-tb');
      expect(simTbUpdated?.awayTeam).toBe('CHI');

      const m1PickAfter = updatedMembers.find((m) => m.id === 'm1')?.picks.find((p: any) => p.gameId === 'sim-tb');
      const m3PickAfter = updatedMembers.find((m) => m.id === 'm3')?.picks.find((p: any) => p.gameId === 'sim-tb');

      // m1 (home DET) is unaffected
      expect(m1PickAfter?.selectedTeam).toBe('DET');
      // m3 (old away MIN) was synchronized to new away team CHI
      expect(m3PickAfter?.selectedTeam).toBe('CHI');
    });

    it('client pure-calculation: connects simulatedClock to effective status, points, finality, and pending tiebreakers', () => {
      const matchFixture = [
        { id: 'sim-tb', homeTeam: 'DET', awayTeam: 'MIN', homeScore: 31, awayScore: 28, status: 'FINAL', spread: 0, kickoffTime: '2026-11-01T17:00:00.000Z' },
        { id: 'sim-g2', homeTeam: 'GB', awayTeam: 'CAR', homeScore: 24, awayScore: 10, status: 'FINAL', spread: 0, kickoffTime: '2026-11-01T17:00:00.000Z' },
      ];
      const memberFixture = [
        { id: 'u1', name: 'Alice', tb: 50, picks: [{ gameId: 'sim-tb', selectedTeam: 'DET' }, { gameId: 'sim-g2', selectedTeam: 'GB' }] },
        { id: 'u2', name: 'Bob', tb: 60, picks: [{ gameId: 'sim-tb', selectedTeam: 'DET' }, { gameId: 'sim-g2', selectedTeam: 'GB' }] },
      ];

      // 1. Before kickoff: 12:00:00.000Z
      const stateBefore = computeSimulationStandings(matchFixture, memberFixture, '2026-11-01T12:00:00.000Z');

      // Assert effective status is SCHEDULED across slate and live fixtures
      expect(stateBefore.allSimFinal).toBe(false);
      expect(stateBefore.slateGames[0].status).toBe('SCHEDULED');
      expect(stateBefore.slateGames[0].isFinal).toBe(false);
      expect(stateBefore.liveScores[0].status).toBe('SCHEDULED');

      // Assert actualTotal is null because TB game is not effectively FINAL
      expect(stateBefore.actualTotal).toBeNull();

      // Zero banked or live points before kickoff
      expect(stateBefore.standings[0].totalProvisionalPoints).toBe(0);
      expect(stateBefore.standings[1].totalProvisionalPoints).toBe(0);

      // Pending tiebreaker: tie remains unresolved before kickoff (equal rank 1, isTied: true)
      expect(stateBefore.standings[0].provisionalRank).toBe(1);
      expect(stateBefore.standings[1].provisionalRank).toBe(1);
      expect(stateBefore.standings[0].isTied).toBe(true);
      expect(stateBefore.standings[1].isTied).toBe(true);

      // 2. After kickoff: 20:00:00.000Z
      const stateAfter = computeSimulationStandings(matchFixture, memberFixture, '2026-11-01T20:00:00.000Z');

      // Assert effective status is FINAL across slate and live fixtures
      expect(stateAfter.allSimFinal).toBe(true);
      expect(stateAfter.slateGames[0].status).toBe('FINAL');
      expect(stateAfter.slateGames[0].isFinal).toBe(true);
      expect(stateAfter.liveScores[0].status).toBe('FINAL');

      // Assert actualTotal is supplied (31 + 28 = 59)
      expect(stateAfter.actualTotal).toBe(59);

      // Both members scored 2 points
      expect(stateAfter.standings[0].totalProvisionalPoints).toBe(2);
      expect(stateAfter.standings[1].totalProvisionalPoints).toBe(2);

      // Tiebreaker resolved: Bob (tb 60, diff 1 from 59) beats Alice (tb 50, diff 9 from 59)
      expect(stateAfter.standings[0].userId).toBe('u2');
      expect(stateAfter.standings[0].provisionalRank).toBe(1);
      expect(stateAfter.standings[0].isTied).toBe(false);

      expect(stateAfter.standings[1].userId).toBe('u1');
      expect(stateAfter.standings[1].provisionalRank).toBe(2);
      expect(stateAfter.standings[1].isTied).toBe(false);
    });

    it('server route: connects simulatedClock to effective status, points, finality, and pending tiebreakers on POST /simulations/preview', async () => {
      const matchFixture = [
        { id: 'sim-tb', homeTeam: 'DET', awayTeam: 'MIN', homeScore: 31, awayScore: 28, status: 'FINAL', spread: 0, kickoffTime: '2026-11-01T17:00:00.000Z' },
        { id: 'sim-g2', homeTeam: 'GB', awayTeam: 'CAR', homeScore: 24, awayScore: 10, status: 'FINAL', spread: 0, kickoffTime: '2026-11-01T17:00:00.000Z' },
      ];
      const memberFixture = [
        { userId: 'u1', userName: 'Alice', tiebreakerPrediction: 50, picks: [{ gameId: 'sim-tb', selectedTeam: 'DET' }, { gameId: 'sim-g2', selectedTeam: 'GB' }] },
        { userId: 'u2', userName: 'Bob', tiebreakerPrediction: 60, picks: [{ gameId: 'sim-tb', selectedTeam: 'DET' }, { gameId: 'sim-g2', selectedTeam: 'GB' }] },
      ];

      // Case A: 5 hours BEFORE kickoff
      const resBefore = await fetch(`${baseUrl}/api/pools/${POOL_ID}/owner/simulations/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jackAuthToken}`,
        },
        body: JSON.stringify({
          scenario: matchFixture,
          members: memberFixture,
          simulatedClock: '2026-11-01T12:00:00.000Z',
        }),
      });
      const dataBefore: any = await resBefore.json();

      expect(resBefore.status).toBe(200);
      expect(dataBefore.isFinal).toBe(false);
      expect(dataBefore.tiebreakerTotal).toBeNull();
      expect(dataBefore.standings[0].totalProvisionalPoints).toBe(0);
      expect(dataBefore.standings[1].totalProvisionalPoints).toBe(0);

      // Tied with rank 1 before kickoff
      expect(dataBefore.standings[0].provisionalRank).toBe(1);
      expect(dataBefore.standings[1].provisionalRank).toBe(1);
      expect(dataBefore.standings[0].isTied).toBe(true);
      expect(dataBefore.standings[1].isTied).toBe(true);

      // Case B: 3 hours AFTER kickoff
      const resAfter = await fetch(`${baseUrl}/api/pools/${POOL_ID}/owner/simulations/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jackAuthToken}`,
        },
        body: JSON.stringify({
          scenario: matchFixture,
          members: memberFixture,
          simulatedClock: '2026-11-01T20:00:00.000Z',
        }),
      });
      const dataAfter: any = await resAfter.json();

      expect(resAfter.status).toBe(200);
      expect(dataAfter.isFinal).toBe(true);
      expect(dataAfter.tiebreakerTotal).toBe(59);
      expect(dataAfter.standings[0].totalProvisionalPoints).toBe(2);
      expect(dataAfter.standings[1].totalProvisionalPoints).toBe(2);

      // Tiebreaker resolved: Bob wins rank 1, Alice gets rank 2
      expect(dataAfter.standings[0].userId).toBe('u2');
      expect(dataAfter.standings[0].provisionalRank).toBe(1);
      expect(dataAfter.standings[0].isTied).toBe(false);

      expect(dataAfter.standings[1].userId).toBe('u1');
      expect(dataAfter.standings[1].provisionalRank).toBe(2);
      expect(dataAfter.standings[1].isTied).toBe(false);
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
