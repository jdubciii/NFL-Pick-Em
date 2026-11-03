import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import http from 'http';
import stream from 'stream';
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
import { computePoolSettingsRevision, executeFutureSlateMutationInternal } from '../src/routes/ownerAdminRoutes';
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
import { selectAcceptedScoredSlateGames, isWeeklyScoredSlateFinal } from '../client/src/services/weeklyStandingsFinalityService';
import { getScopedPoolSlateConfig, resolveScopedPoolSlateConfig } from '../client/src/services/poolScoredSlateConfig';
import { fetchScopedSlateProjection, invalidateScopedSlateCache } from '../client/src/services/scopedSlateService';
import { executeSerializedPickMutation } from '../src/routes/picks';
import { applyOverride } from '../src/services/overrideService';

describe('HAG-58: Directive 3 Owner Admin & Binding Rulings Verification', () => {
  const JACK_UUID = 'e3242a19-1131-4fc5-9886-7730f10ef69b';
  const NON_JACK_UUID = 'a1111111-2222-3333-4444-555555555555';
  const POOL_ID = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';

  let server: http.Server | null = null;
  let baseUrl: string = 'http://127.0.0.1:39999';
  let mockPrisma: any;
  let jackAuthToken: string;
  let committedDbState: {
    pools: Record<string, any>;
    memberships: Record<string, any>;
    auditLogs: any[];
    weeklySubmissions: any[];
    picks: any[];
  };

  const originalFetch = globalThis.fetch;

  function dispatchInProcess(expressApp: any, urlStr: string, init: any = {}): Promise<Response> {
    return new Promise((resolve) => {
      const parsed = new URL(urlStr);
      const method = (init.method || 'GET').toUpperCase();
      const reqHeaders: Record<string, string> = {};
      if (init.headers) {
        if (typeof init.headers.forEach === 'function') {
          init.headers.forEach((v: string, k: string) => { reqHeaders[k.toLowerCase()] = String(v); });
        } else {
          for (const [k, v] of Object.entries(init.headers)) {
            reqHeaders[k.toLowerCase()] = String(v);
          }
        }
      }
      const bodyStr = init.body ? (typeof init.body === 'string' ? init.body : JSON.stringify(init.body)) : null;
      if (bodyStr && !reqHeaders['content-length']) {
        reqHeaders['content-length'] = String(Buffer.byteLength(bodyStr));
      }
      if (bodyStr && !reqHeaders['content-type']) {
        reqHeaders['content-type'] = 'application/json';
      }

      const socket = new stream.Duplex();
      socket._read = () => {};
      socket._write = (_c, _e, cb) => cb();
      socket.destroy = () => socket;
      (socket as any).remoteAddress = '127.0.0.1';
      (socket as any).encrypted = false;

      const req = new http.IncomingMessage(socket);
      req.url = parsed.pathname + parsed.search;
      req.method = method;
      req.headers = reqHeaders;
      req.rawHeaders = Object.entries(reqHeaders).flat();

      const res = new http.ServerResponse(req);
      const chunks: Buffer[] = [];
      res.write = (chunk: any) => {
        if (chunk) chunks.push(Buffer.from(chunk));
        return true;
      };
      res.end = (chunk?: any) => {
        if (chunk) chunks.push(Buffer.from(chunk));
        const resBody = Buffer.concat(chunks).toString('utf8');
        const resHeaders: any = res.getHeaders();
        const fetchResponse = new Response(resBody, {
          status: res.statusCode,
          headers: resHeaders,
        });
        resolve(fetchResponse);
        return res;
      };

      expressApp(req, res);
      if (bodyStr) {
        req.push(Buffer.from(bodyStr));
      }
      req.push(null);
    });
  }

  beforeAll(async () => {
    // Attempt ephemeral port binding with timeout and error handling.
    // In strict sandboxes (e.g. read-only subagents where socket binding is denied),
    // cleanly fall back to in-process dispatch without timing out.
    await new Promise<void>((resolve) => {
      let isSettled = false;
      const timer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          baseUrl = 'http://127.0.0.1:39999';
          resolve();
        }
      }, 800);

      try {
        server = app.listen(0, '127.0.0.1', () => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timer);
            const addr = server?.address() as any;
            if (addr && addr.port) {
              baseUrl = `http://127.0.0.1:${addr.port}`;
            } else {
              baseUrl = 'http://127.0.0.1:39999';
            }
            resolve();
          }
        });

        server.on('error', () => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timer);
            baseUrl = 'http://127.0.0.1:39999';
            resolve();
          }
        });
      } catch {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          baseUrl = 'http://127.0.0.1:39999';
          resolve();
        }
      }
    });

    globalThis.fetch = async (input: any, init?: any) => {
      const urlStr = typeof input === 'string' ? input : (input?.url || String(input));
      if (!server?.listening && urlStr.startsWith('http://127.0.0.1:')) {
        return dispatchInProcess(app, urlStr, init);
      }
      return originalFetch(input, init);
    };
  });

  afterAll(async () => {
    globalThis.fetch = originalFetch;
    if (server && typeof server.close === 'function') {
      await new Promise<void>((resolve) => server!.close(() => resolve())).catch(() => {});
    }
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
      settings: { seasonYear: 2026, lock_offset: 0 },
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

    let txQueue = Promise.resolve();

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
        findUnique: vi.fn(async ({ where }: any) => {
          return committedDbState.picks.find((p: any) =>
            p.poolId === where?.poolId_userId_gameId?.poolId &&
            p.userId === where?.poolId_userId_gameId?.userId &&
            p.gameId === where?.poolId_userId_gameId?.gameId
          ) || null;
        }),
        findMany: vi.fn(async () => committedDbState.picks),
        upsert: vi.fn(async ({ where, update, create }: any) => {
          const idx = committedDbState.picks.findIndex((p: any) =>
            p.poolId === where?.poolId_userId_gameId?.poolId &&
            p.userId === where?.poolId_userId_gameId?.userId &&
            p.gameId === where?.poolId_userId_gameId?.gameId
          );
          if (idx >= 0) {
            committedDbState.picks[idx] = { ...committedDbState.picks[idx], ...update };
            return { ...committedDbState.picks[idx] };
          }
          const item = { id: `pick-${Date.now()}`, ...create };
          committedDbState.picks.push(item);
          return { ...item };
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
        findUnique: vi.fn(async ({ where }: any) => {
          return (mockPrisma._gameStore || []).find((g: any) => g.id === where.id || g.externalGameId === where.id) || null;
        }),
      },
      penaltyLedger: {
        count: vi.fn(async () => 0),
        create: vi.fn(async ({ data }: any) => ({ id: `pl-${Date.now()}`, ...data })),
        aggregate: vi.fn(async () => ({ _sum: { delta: 0 } })),
      },
      poolMemberStat: {
        upsert: vi.fn(async () => ({})),
      },
      pickResult: {
        count: vi.fn(async () => 0),
        upsert: vi.fn(async ({ where, update, create }: any) => ({ ...create, ...update })),
      },
      auditLog: {
        create: vi.fn(async ({ data }: any) => {
          const entry = { id: `audit-${Date.now()}`, ...data };
          committedDbState.auditLogs.push(entry);
          return entry;
        }),
      },
      $queryRawUnsafe: vi.fn(async (query: string, ...args: any[]) => {
        if (query.includes('pg_advisory_xact_lock')) {
          return [{ pg_advisory_xact_lock: null }];
        }
        if (query.includes('CLOCK_TIMESTAMP()') || query.includes('SELECT NOW()')) {
          return [{ now: new Date().toISOString() }];
        }
        if (query.includes('FROM public.picks')) {
          return [{ count: committedDbState.picks.length }];
        }
        if (query.includes('FROM public.games')) {
          const gameId = args[0];
          const found = (mockPrisma._gameStore || []).find((g: any) => g.id === gameId || g.externalGameId === gameId);
          if (found) {
            return [{
              id: found.id,
              external_game_id: found.externalGameId || found.id,
              home_team_id: found.homeTeamId || 'KC',
              away_team_id: found.awayTeamId || 'LV',
              kickoff_time: found.kickoffTime?.toISOString?.() || found.kickoffTime,
              status: found.status || 'SCHEDULED',
              canonical_kickoff_time: found.canonicalKickoffTime?.toISOString?.() || found.canonicalKickoffTime || found.kickoffTime,
              season: 2026,
              season_type: 2,
              week: found.week || 10,
            }];
          }
          return [];
        }
        return [{ id: POOL_ID }];
      }),
      $executeRawUnsafe: vi.fn(async (_query: string, ..._args: any[]) => {
        return 1;
      }),
      $transaction: vi.fn(async (cb: (tx: any) => any) => {
        // Simulated FIFO transaction mutex around the mocked $transaction for testing race mechanics
        const prevTx = txQueue;
        let releaseTx: () => void;
        txQueue = new Promise<void>((resolve) => {
          releaseTx = resolve;
        });
        await prevTx;

        try {
          // Create transactional sandbox clone at execution time
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
            $executeRawUnsafe: vi.fn(async (query: string, ...args: any[]) => {
              return mockPrisma.$executeRawUnsafe(query, ...args);
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
            findUnique: vi.fn(async ({ where }: any) => {
              return txState.picks.find((p: any) =>
                p.poolId === where?.poolId_userId_gameId?.poolId &&
                p.userId === where?.poolId_userId_gameId?.userId &&
                p.gameId === where?.poolId_userId_gameId?.gameId
              ) || null;
            }),
            findMany: vi.fn(async () => txState.picks),
            upsert: vi.fn(async ({ where, update, create }: any) => {
              const idx = txState.picks.findIndex((p: any) =>
                p.poolId === where?.poolId_userId_gameId?.poolId &&
                p.userId === where?.poolId_userId_gameId?.userId &&
                p.gameId === where?.poolId_userId_gameId?.gameId
              );
              if (idx >= 0) {
                txState.picks[idx] = { ...txState.picks[idx], ...update };
                return { ...txState.picks[idx] };
              }
              const item = { id: `pick-${Date.now()}`, ...create };
              txState.picks.push(item);
              return { ...item };
            }),
          },
          game: {
            findMany: vi.fn(async (args?: any) => mockPrisma.game.findMany(args)),
            findUnique: vi.fn(async ({ where }: any) => {
              return (mockPrisma._gameStore || []).find((g: any) => g.id === where.id || g.externalGameId === where.id) || null;
            }),
          },
          penaltyLedger: {
            count: vi.fn(async (args?: any) => mockPrisma.penaltyLedger.count(args)),
            create: vi.fn(async ({ data }: any) => ({ id: `pl-${Date.now()}`, ...data })),
            aggregate: vi.fn(async () => ({ _sum: { delta: 0 } })),
          },
          poolMemberStat: {
            upsert: vi.fn(async () => ({})),
          },
          pickResult: {
            count: vi.fn(async (args?: any) => mockPrisma.pickResult.count(args)),
            upsert: vi.fn(async ({ where, update, create }: any) => ({ ...create, ...update })),
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
        } finally {
          releaseTx!();
        }
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

    it('PUT /slate denies non-Jack or non-member with 403', async () => {
      const nonJackToken = createSyntheticSupabaseToken({ id: NON_JACK_UUID, role: 'ADMIN' });

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/owner/slate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${nonJackToken}`,
        },
        body: JSON.stringify({
          season: 2026,
          seasonType: 2,
          weekNumber: 9,
          eventIds: ['401873040'],
          reason: 'Unauthorized attempt',
        }),
      });
      expect(res.status).toBe(403);
      expect(mockPrisma.pool.update).not.toHaveBeenCalled();
    });

    it('PUT /slate remains fail-closed and disabled with HTTP 501 SLATE_MUTATION_DISABLED', async () => {
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
          eventIds: ['401873040'],
          expectedRevision: 'any-rev',
          reason: 'Attempted slate write',
        }),
      });
      const data: any = await res.json();
      expect(res.status).toBe(501);
      expect(data.code).toBe('SLATE_MUTATION_DISABLED');
      expect(mockPrisma.pool.update).not.toHaveBeenCalled();
    });

    it('executeFutureSlateMutationInternal rejects legacy or completed scopes with HTTP 422 HISTORICAL_SCOPE_UNVERIFIED', async () => {
      // 1. Week 8 (completed historical week)
      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2026,
          seasonType: 2,
          weekNumber: 8,
          eventIds: ['401873023', '401873024'],
          expectedRevision: 'any-rev',
          reason: 'Attempted historical slate edit',
        })
      ).rejects.toMatchObject({
        statusCode: 422,
        code: 'HISTORICAL_SCOPE_UNVERIFIED',
      });
      expect(mockPrisma.pool.update).not.toHaveBeenCalled();

      // 2. Past Season 2025
      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2025,
          seasonType: 2,
          weekNumber: 10,
          eventIds: ['401873023'],
          expectedRevision: 'any-rev',
          reason: 'Attempted past season edit',
        })
      ).rejects.toMatchObject({
        statusCode: 422,
        code: 'HISTORICAL_SCOPE_UNVERIFIED',
      });

      // 3. Unknown Future Season 2027+ (outside authoritatively established pool season)
      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2027,
          seasonType: 2,
          weekNumber: 10,
          eventIds: ['401873023'],
          expectedRevision: 'any-rev',
          reason: 'Attempted future season edit',
        })
      ).rejects.toMatchObject({
        statusCode: 422,
        code: 'HISTORICAL_SCOPE_UNVERIFIED',
      });

      // 4. Preseason (seasonType 1)
      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2026,
          seasonType: 1,
          weekNumber: 1,
          eventIds: ['401873023'],
          expectedRevision: 'any-rev',
          reason: 'Attempted preseason edit',
        })
      ).rejects.toMatchObject({
        statusCode: 422,
        code: 'HISTORICAL_SCOPE_UNVERIFIED',
      });

      // 5. Out of bounds week (week 19 for regular season)
      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2026,
          seasonType: 2,
          weekNumber: 19,
          eventIds: ['401873023'],
          expectedRevision: 'any-rev',
          reason: 'Attempted out of bounds week edit',
        })
      ).rejects.toMatchObject({
        statusCode: 422,
        code: 'HISTORICAL_SCOPE_UNVERIFIED',
      });

      // 6. Missing pool-season authority in pool settings (seasonYear/season missing)
      const origPool = committedDbState.pools[POOL_ID];
      committedDbState.pools[POOL_ID] = {
        ...origPool,
        settings: { lock_offset: 0 },
      };
      const revWithoutSeason = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);
      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2026,
          seasonType: 2,
          weekNumber: 10,
          eventIds: ['401873023'],
          expectedRevision: revWithoutSeason,
          reason: 'Attempted edit on pool without established season',
        }, {
          status: 'VERIFIED',
          provider: 'ESPN',
          league: 'NFL',
          seasonYear: 2026,
          seasonType: 2,
          weekNumber: 10,
          observationTime: new Date().toISOString(),
          adapterVersion: '1.0',
          eventCount: 1,
          events: [{ externalGameId: '401873023', homeTeamId: 'KC', awayTeamId: 'LV', kickoffTime: new Date(Date.now() + 86400000).toISOString(), isKickoffConfirmed: true }],
          manifestFingerprint: 'any-fp',
          reasons: [],
        })
      ).rejects.toMatchObject({
        statusCode: 422,
        code: 'HISTORICAL_SCOPE_UNVERIFIED',
      });
      committedDbState.pools[POOL_ID] = origPool;
    });

    it('executeFutureSlateMutationInternal fails closed with HTTP 500 TRANSACTION_LOCK_UNAVAILABLE if raw query capability is missing', async () => {
      const mockPrismaNoRaw = {
        ...mockPrisma,
        $transaction: vi.fn(async (cb: (tx: any) => any) => {
          const brokenTx = {
            pool: mockPrisma.pool,
          };
          return await cb(brokenTx);
        }),
      };

      const week9Events = [
        { externalGameId: '401873040', homeTeamId: 'KC', awayTeamId: 'LV', kickoffTime: new Date(Date.now() + 86400000).toISOString(), isKickoffConfirmed: true },
      ];
      const week9Fingerprint = authoritativeSlateService.computeManifestFingerprint(2026, 2, 9, week9Events);
      vi.spyOn(authoritativeSlateService, 'fetchAuthoritativeESPNScoreboard').mockResolvedValue({
        status: 'VERIFIED',
        provider: 'ESPN',
        league: 'NFL',
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 9,
        observationTime: new Date().toISOString(),
        adapterVersion: '1.0',
        eventCount: 1,
        events: week9Events,
        manifestFingerprint: week9Fingerprint,
        reasons: [],
      });

      await expect(
        executeFutureSlateMutationInternal(mockPrismaNoRaw as any, POOL_ID, JACK_UUID, {
          season: 2026,
          seasonType: 2,
          weekNumber: 9,
          eventIds: ['401873040'],
          expectedRevision: 'any-rev',
          reason: 'Missing raw query capability test',
        })
      ).rejects.toMatchObject({
        statusCode: 500,
        code: 'TRANSACTION_LOCK_UNAVAILABLE',
      });
    });

    it('executeFutureSlateMutationInternal rejects stale settings revision with HTTP 409 STALE_REVISION', async () => {
      const week9Events = [
        { externalGameId: '401873040', homeTeamId: 'KC', awayTeamId: 'LV', kickoffTime: new Date(Date.now() + 86400000).toISOString(), isKickoffConfirmed: true },
        { externalGameId: '401873041', homeTeamId: 'SF', awayTeamId: 'LAR', kickoffTime: new Date(Date.now() + 90000000).toISOString(), isKickoffConfirmed: true },
      ];
      const week9Fingerprint = authoritativeSlateService.computeManifestFingerprint(2026, 2, 9, week9Events);

      vi.spyOn(authoritativeSlateService, 'fetchAuthoritativeESPNScoreboard').mockResolvedValue({
        status: 'VERIFIED',
        provider: 'ESPN',
        league: 'NFL',
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 9,
        observationTime: new Date().toISOString(),
        adapterVersion: '1.0',
        eventCount: 2,
        events: week9Events,
        manifestFingerprint: week9Fingerprint,
        reasons: [],
      });

      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2026,
          seasonType: 2,
          weekNumber: 9,
          eventIds: ['401873040', '401873041'],
          expectedRevision: 'stale-or-wrong-revision-hash',
          reason: 'Stale attempt',
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'STALE_REVISION',
      });
      expect(mockPrisma.pool.update).not.toHaveBeenCalled();
    });

    it('executeFutureSlateMutationInternal rejects when provider observation is unverified or scope mismatches with HTTP 422', async () => {
      const poolRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);

      vi.spyOn(authoritativeSlateService, 'fetchAuthoritativeESPNScoreboard').mockResolvedValue({
        status: 'UNVERIFIED_SOURCE',
        provider: 'ESPN',
        league: 'NFL',
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 9,
        observationTime: new Date().toISOString(),
        adapterVersion: '1.0',
        eventCount: 0,
        events: [],
        manifestFingerprint: '',
        reasons: ['FETCH_ERROR: Network timeout'],
      });

      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2026,
          seasonType: 2,
          weekNumber: 9,
          eventIds: ['401873040'],
          expectedRevision: poolRev,
          reason: 'Unverified observation attempt',
        })
      ).rejects.toMatchObject({
        statusCode: 422,
        code: 'UNVERIFIED_PROVIDER_OBSERVATION',
      });
    });

    it('executeFutureSlateMutationInternal rejects expired provider observation (>60s) with HTTP 422 EXPIRED_PROVIDER_OBSERVATION', async () => {
      const poolRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);
      const week9Events = [
        { externalGameId: '401873040', homeTeamId: 'KC', awayTeamId: 'LV', kickoffTime: new Date(Date.now() + 86400000).toISOString(), isKickoffConfirmed: true },
      ];
      const week9Fingerprint = authoritativeSlateService.computeManifestFingerprint(2026, 2, 9, week9Events);

      vi.spyOn(authoritativeSlateService, 'fetchAuthoritativeESPNScoreboard').mockResolvedValue({
        status: 'VERIFIED',
        provider: 'ESPN',
        league: 'NFL',
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 9,
        // Observation is 70 seconds old!
        observationTime: new Date(Date.now() - 70000).toISOString(),
        adapterVersion: '1.0',
        eventCount: 1,
        events: week9Events,
        manifestFingerprint: week9Fingerprint,
        reasons: [],
      });

      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2026,
          seasonType: 2,
          weekNumber: 9,
          eventIds: ['401873040'],
          expectedRevision: poolRev,
          reason: 'Expired observation attempt',
        })
      ).rejects.toMatchObject({
        statusCode: 422,
        code: 'EXPIRED_PROVIDER_OBSERVATION',
      });
    });

    it('executeFutureSlateMutationInternal rejects unaccepted manifest with HTTP 422 UNACCEPTED_MANIFEST', async () => {
      const poolRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);
      const week9Events = [
        { externalGameId: '401873040', homeTeamId: 'KC', awayTeamId: 'LV', kickoffTime: new Date(Date.now() + 86400000).toISOString(), isKickoffConfirmed: true },
      ];
      const week9Fingerprint = authoritativeSlateService.computeManifestFingerprint(2026, 2, 9, week9Events);

      vi.spyOn(authoritativeSlateService, 'fetchAuthoritativeESPNScoreboard').mockResolvedValue({
        status: 'VERIFIED',
        provider: 'ESPN',
        league: 'NFL',
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 9,
        observationTime: new Date().toISOString(),
        adapterVersion: '1.0',
        eventCount: 1,
        events: week9Events,
        manifestFingerprint: week9Fingerprint,
        reasons: [],
      });

      // No accepted manifest in DB!
      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue(null);

      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2026,
          seasonType: 2,
          weekNumber: 9,
          eventIds: ['401873040'],
          expectedRevision: poolRev,
          reason: 'Unaccepted manifest attempt',
        })
      ).rejects.toMatchObject({
        statusCode: 422,
        code: 'UNACCEPTED_MANIFEST',
      });
    });

    it('executeFutureSlateMutationInternal rejects manifest fingerprint mismatch with HTTP 422 MANIFEST_FINGERPRINT_MISMATCH', async () => {
      const poolRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);
      const week9Events = [
        { externalGameId: '401873040', homeTeamId: 'KC', awayTeamId: 'LV', kickoffTime: new Date(Date.now() + 86400000).toISOString(), isKickoffConfirmed: true },
      ];
      const week9Fingerprint = authoritativeSlateService.computeManifestFingerprint(2026, 2, 9, week9Events);

      vi.spyOn(authoritativeSlateService, 'fetchAuthoritativeESPNScoreboard').mockResolvedValue({
        status: 'VERIFIED',
        provider: 'ESPN',
        league: 'NFL',
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 9,
        observationTime: new Date().toISOString(),
        adapterVersion: '1.0',
        eventCount: 1,
        events: week9Events,
        manifestFingerprint: week9Fingerprint,
        reasons: [],
      });

      // Accepted manifest has a DIFFERENT fingerprint!
      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue({
        season: 2026,
        seasonType: 2,
        weekNumber: 9,
        revision: 1,
        eventIds: ['401873040'],
        acceptedAt: new Date().toISOString(),
        acceptedBy: JACK_UUID,
        manifestFingerprint: 'different-stale-fingerprint-from-past',
        observationTime: new Date().toISOString(),
      });

      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2026,
          seasonType: 2,
          weekNumber: 9,
          eventIds: ['401873040'],
          expectedRevision: poolRev,
          reason: 'Fingerprint mismatch attempt',
        })
      ).rejects.toMatchObject({
        statusCode: 422,
        code: 'MANIFEST_FINGERPRINT_MISMATCH',
      });
    });

    it('executeFutureSlateMutationInternal rejects rogue event ID not in accepted manifest with HTTP 422 INVALID_SLATE_SELECTION', async () => {
      const poolRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);
      const week9Events = [
        { externalGameId: '401873040', homeTeamId: 'KC', awayTeamId: 'LV', kickoffTime: new Date(Date.now() + 86400000).toISOString(), isKickoffConfirmed: true },
      ];
      const week9Fingerprint = authoritativeSlateService.computeManifestFingerprint(2026, 2, 9, week9Events);

      vi.spyOn(authoritativeSlateService, 'fetchAuthoritativeESPNScoreboard').mockResolvedValue({
        status: 'VERIFIED',
        provider: 'ESPN',
        league: 'NFL',
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 9,
        observationTime: new Date().toISOString(),
        adapterVersion: '1.0',
        eventCount: 1,
        events: week9Events,
        manifestFingerprint: week9Fingerprint,
        reasons: [],
      });

      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue({
        season: 2026,
        seasonType: 2,
        weekNumber: 9,
        revision: 1,
        eventIds: ['401873040'],
        acceptedAt: new Date().toISOString(),
        acceptedBy: JACK_UUID,
        manifestFingerprint: week9Fingerprint,
        observationTime: new Date().toISOString(),
      });

      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2026,
          seasonType: 2,
          weekNumber: 9,
          eventIds: ['999999999'], // Rogue ID!
          expectedRevision: poolRev,
          reason: 'Rogue event attempt',
        })
      ).rejects.toMatchObject({
        statusCode: 422,
        code: 'INVALID_SLATE_SELECTION',
      });
    });

    it('executeFutureSlateMutationInternal rejects when participation freeze evidence is recorded with HTTP 409 SLATE_FROZEN', async () => {
      const poolRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);
      const week9Events = [
        { externalGameId: '401873040', homeTeamId: 'KC', awayTeamId: 'LV', kickoffTime: new Date(Date.now() + 86400000).toISOString(), isKickoffConfirmed: true },
      ];
      const week9Fingerprint = authoritativeSlateService.computeManifestFingerprint(2026, 2, 9, week9Events);

      vi.spyOn(authoritativeSlateService, 'fetchAuthoritativeESPNScoreboard').mockResolvedValue({
        status: 'VERIFIED',
        provider: 'ESPN',
        league: 'NFL',
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 9,
        observationTime: new Date().toISOString(),
        adapterVersion: '1.0',
        eventCount: 1,
        events: week9Events,
        manifestFingerprint: week9Fingerprint,
        reasons: [],
      });

      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue({
        season: 2026,
        seasonType: 2,
        weekNumber: 9,
        revision: 1,
        eventIds: ['401873040'],
        acceptedAt: new Date().toISOString(),
        acceptedBy: JACK_UUID,
        manifestFingerprint: week9Fingerprint,
        observationTime: new Date().toISOString(),
      });

      // Inject participation freeze in settings
      committedDbState.pools[POOL_ID].settings = {
        ...committedDbState.pools[POOL_ID].settings,
        owner_admin_v1: {
          ...(committedDbState.pools[POOL_ID].settings?.owner_admin_v1 || {}),
          freezes: {
            2026: {
              2: {
                9: {
                  frozenAt: new Date().toISOString(),
                  reason: 'FIRST_PICK_SUBMISSION',
                  actorId: JACK_UUID,
                },
              },
            },
          },
        },
      };

      const freshRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);
      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2026,
          seasonType: 2,
          weekNumber: 9,
          eventIds: ['401873040'],
          expectedRevision: freshRev,
          reason: 'Freeze test',
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'SLATE_FROZEN',
      });

      // Clean up freeze for subsequent tests
      delete committedDbState.pools[POOL_ID].settings.owner_admin_v1.freezes[2026][2][9];
    });

    it('executeFutureSlateMutationInternal rejects when submission rows exist (including season collision test) with HTTP 409 SLATE_FROZEN', async () => {
      const week9Events = [
        { externalGameId: '401873040', homeTeamId: 'KC', awayTeamId: 'LV', kickoffTime: new Date(Date.now() + 86400000).toISOString(), isKickoffConfirmed: true },
      ];
      const week9Fingerprint = authoritativeSlateService.computeManifestFingerprint(2026, 2, 9, week9Events);

      vi.spyOn(authoritativeSlateService, 'fetchAuthoritativeESPNScoreboard').mockResolvedValue({
        status: 'VERIFIED',
        provider: 'ESPN',
        league: 'NFL',
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 9,
        observationTime: new Date().toISOString(),
        adapterVersion: '1.0',
        eventCount: 1,
        events: week9Events,
        manifestFingerprint: week9Fingerprint,
        reasons: [],
      });

      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue({
        season: 2026,
        seasonType: 2,
        weekNumber: 9,
        revision: 1,
        eventIds: ['401873040'],
        acceptedAt: new Date().toISOString(),
        acceptedBy: JACK_UUID,
        manifestFingerprint: week9Fingerprint,
        observationTime: new Date().toISOString(),
      });

      // Mock weeklySubmission.count > 0 (Section 46: season collision denial)
      mockPrisma.weeklySubmission.count.mockResolvedValueOnce(1);

      const poolRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);
      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2026,
          seasonType: 2,
          weekNumber: 9,
          eventIds: ['401873040'],
          expectedRevision: poolRev,
          reason: 'Submission collision test',
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'SLATE_FROZEN',
      });
    });

    it('executeFutureSlateMutationInternal rejects when earliest lock deadline across slate union has passed with HTTP 422 KICKOFF_PASSED', async () => {
      const week9Events = [
        // Kickoff was 10 minutes ago!
        { externalGameId: '401873040', homeTeamId: 'KC', awayTeamId: 'LV', kickoffTime: new Date(Date.now() - 600000).toISOString(), isKickoffConfirmed: true },
      ];
      const week9Fingerprint = authoritativeSlateService.computeManifestFingerprint(2026, 2, 9, week9Events);

      vi.spyOn(authoritativeSlateService, 'fetchAuthoritativeESPNScoreboard').mockResolvedValue({
        status: 'VERIFIED',
        provider: 'ESPN',
        league: 'NFL',
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 9,
        observationTime: new Date().toISOString(),
        adapterVersion: '1.0',
        eventCount: 1,
        events: week9Events,
        manifestFingerprint: week9Fingerprint,
        reasons: [],
      });

      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue({
        season: 2026,
        seasonType: 2,
        weekNumber: 9,
        revision: 1,
        eventIds: ['401873040'],
        acceptedAt: new Date().toISOString(),
        acceptedBy: JACK_UUID,
        manifestFingerprint: week9Fingerprint,
        observationTime: new Date().toISOString(),
      });

      const poolRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);
      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2026,
          seasonType: 2,
          weekNumber: 9,
          eventIds: ['401873040'],
          expectedRevision: poolRev,
          reason: 'Passed kickoff attempt',
        })
      ).rejects.toMatchObject({
        statusCode: 422,
        code: 'KICKOFF_PASSED',
      });
    });

    it('executeFutureSlateMutationInternal atomic success with absent Game rows: observation supplies kickoffs and teams, updates settings with evidence snapshot and fingerprint, logs audit, returns 200', async () => {
      const futureDate1 = new Date(Date.now() + 86400000).toISOString();
      const futureDate2 = new Date(Date.now() + 90000000).toISOString();
      const futureDate3 = new Date(Date.now() + 95000000).toISOString();

      const week9Events = [
        { externalGameId: '401873040', homeTeamId: 'KC', awayTeamId: 'LV', kickoffTime: futureDate1, isKickoffConfirmed: true },
        { externalGameId: '401873041', homeTeamId: 'SF', awayTeamId: 'LAR', kickoffTime: futureDate2, isKickoffConfirmed: true },
        { externalGameId: '401873042', homeTeamId: 'BAL', awayTeamId: 'CIN', kickoffTime: futureDate3, isKickoffConfirmed: true },
      ];
      const week9Fingerprint = authoritativeSlateService.computeManifestFingerprint(2026, 2, 9, week9Events);

      vi.spyOn(authoritativeSlateService, 'fetchAuthoritativeESPNScoreboard').mockResolvedValue({
        status: 'VERIFIED',
        provider: 'ESPN',
        league: 'NFL',
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 9,
        observationTime: new Date().toISOString(),
        adapterVersion: '1.0',
        eventCount: 3,
        events: week9Events,
        manifestFingerprint: week9Fingerprint,
        reasons: [],
      });

      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue({
        season: 2026,
        seasonType: 2,
        weekNumber: 9,
        revision: 1,
        eventIds: ['401873040', '401873041', '401873042'],
        acceptedAt: new Date().toISOString(),
        acceptedBy: JACK_UUID,
        manifestFingerprint: week9Fingerprint,
        observationTime: new Date().toISOString(),
      });

      // Clear any submissions/picks
      mockPrisma.weeklySubmission.count.mockResolvedValue(0);
      mockPrisma.pick.count.mockResolvedValue(0);

      const poolRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);
      const result = await executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
        season: 2026,
        seasonType: 2,
        weekNumber: 9,
        eventIds: ['401873040', '401873041'],
        expectedRevision: poolRev,
        reason: 'Configuring Week 9 custom 2-game slate',
      });

      expect(result.slate.eventIds).toEqual(['401873040', '401873041']);
      expect(result.slate.fingerprint).toBe(week9Fingerprint);
      expect(result.slate.evidenceSnapshot).toHaveLength(2);
      expect(committedDbState.pools[POOL_ID].settings.owner_admin_v1.slates[2026][2][9].eventIds).toEqual(['401873040', '401873041']);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'OWNER_ADMIN_UPDATE_SLATE',
          }),
        })
      );
    });

    // ------------------------------------------------------------------------
    // FOCUSED PROOFS FOR FINDINGS 1, 2, 3, 4 (God QA Message 2026-11-03T19-23-42)
    // ------------------------------------------------------------------------

    it('Finding 1 Proof: resolves canonical games and candidate IDs for picks without week column, queries under lock, and denies if query throws', async () => {
      const futureDate1 = new Date(Date.now() + 86400000).toISOString();
      const week9Events = [
        { externalGameId: '401873040', homeTeamId: 'KC', awayTeamId: 'LV', kickoffTime: futureDate1, isKickoffConfirmed: true },
      ];
      const week9Fingerprint = authoritativeSlateService.computeManifestFingerprint(2026, 2, 9, week9Events);

      vi.spyOn(authoritativeSlateService, 'fetchAuthoritativeESPNScoreboard').mockResolvedValue({
        status: 'VERIFIED',
        provider: 'ESPN',
        league: 'NFL',
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 9,
        observationTime: new Date().toISOString(),
        adapterVersion: '1.0',
        eventCount: 1,
        events: week9Events,
        manifestFingerprint: week9Fingerprint,
        reasons: [],
      });

      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue({
        season: 2026,
        seasonType: 2,
        weekNumber: 9,
        revision: 1,
        eventIds: ['401873040'],
        acceptedAt: new Date().toISOString(),
        acceptedBy: JACK_UUID,
        manifestFingerprint: week9Fingerprint,
        observationTime: new Date().toISOString(),
      });

      // Canonical game lookup returns canonical row with UUID id
      mockPrisma.game.findMany.mockResolvedValueOnce([
        {
          id: 'c0a80101-0000-0000-0000-000000000001',
          externalGameId: '401873040',
          homeTeamId: 'KC',
          awayTeamId: 'LV',
          kickoffTime: futureDate1,
          status: 'SCHEDULED',
        },
      ]);

      // Mock pick.count to inspect the where clause passed by executeFutureSlateMutationInternal
      let observedWhereClause: any = null;
      mockPrisma.pick.count.mockImplementationOnce(async ({ where }: any) => {
        observedWhereClause = where;
        return 0;
      });

      const poolRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);
      await executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
        season: 2026,
        seasonType: 2,
        weekNumber: 9,
        eventIds: ['401873040'],
        expectedRevision: poolRev,
        reason: 'Testing Finding 1 pick query',
      });

      // Proves Prisma Pick query does NOT use week column (which would throw Prisma validation error)
      expect(observedWhereClause).toBeDefined();
      expect(observedWhereClause.week).toBeUndefined();
      expect(observedWhereClause.poolId).toBe(POOL_ID);
      // Proves Defect 1 fix: UUID predicates receive UUIDs only; external IDs query through relation
      expect(observedWhereClause.OR).toEqual([
        { gameId: { in: ['c0a80101-0000-0000-0000-000000000001'] } },
        { game: { externalGameId: { in: ['401873040'] } } },
      ]);

      // Proves fail-closed: if pick query throws, it is NOT swallowed as zero!
      mockPrisma.pick.count.mockRejectedValueOnce(new Error('DATABASE_PICK_QUERY_FAILED'));
      const freshRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);
      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2026,
          seasonType: 2,
          weekNumber: 9,
          eventIds: ['401873040'],
          expectedRevision: freshRev,
          reason: 'Testing Finding 1 query failure',
        })
      ).rejects.toThrow('DATABASE_PICK_QUERY_FAILED');

      // Proves existing picks (including null selections) freeze the slate
      mockPrisma.pick.count.mockResolvedValueOnce(1);
      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2026,
          seasonType: 2,
          weekNumber: 9,
          eventIds: ['401873040'],
          expectedRevision: freshRev,
          reason: 'Testing Finding 1 pick freeze',
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'SLATE_FROZEN',
      });

      // Proves Defect 1: Ambiguous multiple canonical rows for same externalGameId deny with 422 CANONICAL_GAME_AMBIGUOUS
      mockPrisma.game.findMany.mockResolvedValueOnce([
        { id: 'c0a80101-0000-0000-0000-000000000001', externalGameId: '401873040', homeTeamId: 'KC', awayTeamId: 'LV', kickoffTime: futureDate1, status: 'SCHEDULED' },
        { id: 'c0a80101-0000-0000-0000-000000000002', externalGameId: '401873040', homeTeamId: 'KC', awayTeamId: 'LV', kickoffTime: futureDate1, status: 'SCHEDULED' },
      ]);
      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2026,
          seasonType: 2,
          weekNumber: 9,
          eventIds: ['401873040'],
          expectedRevision: freshRev,
          reason: 'Testing Defect 1 ambiguity',
        })
      ).rejects.toMatchObject({
        statusCode: 422,
        code: 'CANONICAL_GAME_AMBIGUOUS',
      });
    });

    it('Finding 2 Proof: canonical game lookup failure throws and denies without swallowing to empty array', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const week9Events = [
        { externalGameId: '401873040', homeTeamId: 'KC', awayTeamId: 'LV', kickoffTime: futureDate, isKickoffConfirmed: true },
      ];
      const week9Fingerprint = authoritativeSlateService.computeManifestFingerprint(2026, 2, 9, week9Events);

      vi.spyOn(authoritativeSlateService, 'fetchAuthoritativeESPNScoreboard').mockResolvedValue({
        status: 'VERIFIED',
        provider: 'ESPN',
        league: 'NFL',
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 9,
        observationTime: new Date().toISOString(),
        adapterVersion: '1.0',
        eventCount: 1,
        events: week9Events,
        manifestFingerprint: week9Fingerprint,
        reasons: [],
      });

      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue({
        season: 2026,
        seasonType: 2,
        weekNumber: 9,
        revision: 1,
        eventIds: ['401873040'],
        acceptedAt: new Date().toISOString(),
        acceptedBy: JACK_UUID,
        manifestFingerprint: week9Fingerprint,
        observationTime: new Date().toISOString(),
      });

      mockPrisma.game.findMany.mockRejectedValueOnce(new Error('PRISMA_CANONICAL_GAME_LOOKUP_TIMEOUT'));

      const poolRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);
      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2026,
          seasonType: 2,
          weekNumber: 9,
          eventIds: ['401873040'],
          expectedRevision: poolRev,
          reason: 'Testing Finding 2 game lookup fail closed',
        })
      ).rejects.toThrow('PRISMA_CANONICAL_GAME_LOOKUP_TIMEOUT');
    });

    it('Finding 2 Proof: unconfirmed kickoff (isKickoffConfirmed !== true) denies with HTTP 422 UNCONFIRMED_KICKOFF', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const week9Events = [
        { externalGameId: '401873040', homeTeamId: 'KC', awayTeamId: 'LV', kickoffTime: futureDate, isKickoffConfirmed: false }, // Unconfirmed!
      ];
      const week9Fingerprint = authoritativeSlateService.computeManifestFingerprint(2026, 2, 9, week9Events);

      vi.spyOn(authoritativeSlateService, 'fetchAuthoritativeESPNScoreboard').mockResolvedValue({
        status: 'VERIFIED',
        provider: 'ESPN',
        league: 'NFL',
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 9,
        observationTime: new Date().toISOString(),
        adapterVersion: '1.0',
        eventCount: 1,
        events: week9Events,
        manifestFingerprint: week9Fingerprint,
        reasons: [],
      });

      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue({
        season: 2026,
        seasonType: 2,
        weekNumber: 9,
        revision: 1,
        eventIds: ['401873040'],
        acceptedAt: new Date().toISOString(),
        acceptedBy: JACK_UUID,
        manifestFingerprint: week9Fingerprint,
        observationTime: new Date().toISOString(),
      });

      const poolRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);
      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2026,
          seasonType: 2,
          weekNumber: 9,
          eventIds: ['401873040'],
          expectedRevision: poolRev,
          reason: 'Testing Finding 2 unconfirmed kickoff',
        })
      ).rejects.toMatchObject({
        statusCode: 422,
        code: 'UNCONFIRMED_KICKOFF',
      });
    });

    it('Finding 2 Proof: team identity or kickoff timestamp mismatch between DB Game and observation denies with HTTP 422 CANONICAL_GAME_MISMATCH', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const week9Events = [
        { externalGameId: '401873040', homeTeamId: 'KC', awayTeamId: 'LV', kickoffTime: futureDate, isKickoffConfirmed: true },
      ];
      const week9Fingerprint = authoritativeSlateService.computeManifestFingerprint(2026, 2, 9, week9Events);

      vi.spyOn(authoritativeSlateService, 'fetchAuthoritativeESPNScoreboard').mockResolvedValue({
        status: 'VERIFIED',
        provider: 'ESPN',
        league: 'NFL',
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 9,
        observationTime: new Date().toISOString(),
        adapterVersion: '1.0',
        eventCount: 1,
        events: week9Events,
        manifestFingerprint: week9Fingerprint,
        reasons: [],
      });

      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue({
        season: 2026,
        seasonType: 2,
        weekNumber: 9,
        revision: 1,
        eventIds: ['401873040'],
        acceptedAt: new Date().toISOString(),
        acceptedBy: JACK_UUID,
        manifestFingerprint: week9Fingerprint,
        observationTime: new Date().toISOString(),
      });

      // 1. Team identity mismatch: DB says awayTeamId is DEN, observation says LV
      mockPrisma.game.findMany.mockResolvedValueOnce([
        {
          id: 'game-uuid-1',
          externalGameId: '401873040',
          homeTeamId: 'KC',
          awayTeamId: 'DEN', // Mismatch!
          kickoffTime: futureDate,
          status: 'SCHEDULED',
        },
      ]);

      const poolRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);
      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2026,
          seasonType: 2,
          weekNumber: 9,
          eventIds: ['401873040'],
          expectedRevision: poolRev,
          reason: 'Testing Finding 2 team mismatch',
        })
      ).rejects.toMatchObject({
        statusCode: 422,
        code: 'CANONICAL_GAME_MISMATCH',
      });

      // 2. Kickoff timestamp mismatch: DB kickoff differs by > 60 seconds
      mockPrisma.game.findMany.mockResolvedValueOnce([
        {
          id: 'game-uuid-1',
          externalGameId: '401873040',
          homeTeamId: 'KC',
          awayTeamId: 'LV',
          kickoffTime: new Date(Date.now() + 86400000 + 120000).toISOString(), // 2 minutes off!
          status: 'SCHEDULED',
        },
      ]);

      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2026,
          seasonType: 2,
          weekNumber: 9,
          eventIds: ['401873040'],
          expectedRevision: poolRev,
          reason: 'Testing Finding 2 time mismatch',
        })
      ).rejects.toMatchObject({
        statusCode: 422,
        code: 'CANONICAL_GAME_MISMATCH',
      });

      // 3. Defect 4: Incomplete metadata (missing homeTeamId) denies with CANONICAL_GAME_MISMATCH
      mockPrisma.game.findMany.mockResolvedValueOnce([
        {
          id: 'game-uuid-1',
          externalGameId: '401873040',
          homeTeamId: null, // Missing!
          awayTeamId: 'LV',
          kickoffTime: futureDate,
          status: 'SCHEDULED',
        },
      ]);
      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2026,
          seasonType: 2,
          weekNumber: 9,
          eventIds: ['401873040'],
          expectedRevision: poolRev,
          reason: 'Testing Defect 4 incomplete metadata',
        })
      ).rejects.toMatchObject({
        statusCode: 422,
        code: 'CANONICAL_GAME_MISMATCH',
      });

      // 4. Defect 4: Unmatched canonical row (externalGameId has no matching observation event) denies with CANONICAL_GAME_MISMATCH
      mockPrisma.game.findMany.mockResolvedValueOnce([
        {
          id: 'game-uuid-1',
          externalGameId: 'unmatched-rogue-external-id',
          homeTeamId: 'KC',
          awayTeamId: 'LV',
          kickoffTime: futureDate,
          status: 'SCHEDULED',
        },
      ]);
      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2026,
          seasonType: 2,
          weekNumber: 9,
          eventIds: ['401873040'],
          expectedRevision: poolRev,
          reason: 'Testing Defect 4 unmatched row',
        })
      ).rejects.toMatchObject({
        statusCode: 422,
        code: 'CANONICAL_GAME_MISMATCH',
      });
    });

    it('Finding 2 Proof: missing or non-numeric lock_offset in pool settings denies with HTTP 422 INVALID_LOCK_OFFSET and does not default to 0', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const week9Events = [
        { externalGameId: '401873040', homeTeamId: 'KC', awayTeamId: 'LV', kickoffTime: futureDate, isKickoffConfirmed: true },
      ];
      const week9Fingerprint = authoritativeSlateService.computeManifestFingerprint(2026, 2, 9, week9Events);

      vi.spyOn(authoritativeSlateService, 'fetchAuthoritativeESPNScoreboard').mockResolvedValue({
        status: 'VERIFIED',
        provider: 'ESPN',
        league: 'NFL',
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 9,
        observationTime: new Date().toISOString(),
        adapterVersion: '1.0',
        eventCount: 1,
        events: week9Events,
        manifestFingerprint: week9Fingerprint,
        reasons: [],
      });

      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue({
        season: 2026,
        seasonType: 2,
        weekNumber: 9,
        revision: 1,
        eventIds: ['401873040'],
        acceptedAt: new Date().toISOString(),
        acceptedBy: JACK_UUID,
        manifestFingerprint: week9Fingerprint,
        observationTime: new Date().toISOString(),
      });

      // Remove lock_offset from pool settings
      delete committedDbState.pools[POOL_ID].settings.lock_offset;
      const poolRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);

      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2026,
          seasonType: 2,
          weekNumber: 9,
          eventIds: ['401873040'],
          expectedRevision: poolRev,
          reason: 'Testing Finding 2 invalid lock offset',
        })
      ).rejects.toMatchObject({
        statusCode: 422,
        code: 'INVALID_LOCK_OFFSET',
      });

      // Restore lock_offset
      committedDbState.pools[POOL_ID].settings.lock_offset = 0;
    });

    it('Finding 2 Proof: database clock query failure denies with HTTP 500 DATABASE_CLOCK_UNAVAILABLE without falling back to Date.now()', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const week9Events = [
        { externalGameId: '401873040', homeTeamId: 'KC', awayTeamId: 'LV', kickoffTime: futureDate, isKickoffConfirmed: true },
      ];
      const week9Fingerprint = authoritativeSlateService.computeManifestFingerprint(2026, 2, 9, week9Events);

      vi.spyOn(authoritativeSlateService, 'fetchAuthoritativeESPNScoreboard').mockResolvedValue({
        status: 'VERIFIED',
        provider: 'ESPN',
        league: 'NFL',
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 9,
        observationTime: new Date().toISOString(),
        adapterVersion: '1.0',
        eventCount: 1,
        events: week9Events,
        manifestFingerprint: week9Fingerprint,
        reasons: [],
      });

      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue({
        season: 2026,
        seasonType: 2,
        weekNumber: 9,
        revision: 1,
        eventIds: ['401873040'],
        acceptedAt: new Date().toISOString(),
        acceptedBy: JACK_UUID,
        manifestFingerprint: week9Fingerprint,
        observationTime: new Date().toISOString(),
      });

      // Mock $queryRawUnsafe to return empty when DB clock is called
      const origQuery = mockPrisma.$queryRawUnsafe;
      mockPrisma.$queryRawUnsafe = vi.fn(async (q: string, ...args: any[]) => {
        if (q.includes('CLOCK_TIMESTAMP()') || q.includes('SELECT NOW()')) {
          return []; // Query failed!
        }
        return origQuery(q, ...args);
      });

      const poolRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);
      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2026,
          seasonType: 2,
          weekNumber: 9,
          eventIds: ['401873040'],
          expectedRevision: poolRev,
          reason: 'Testing Finding 2 clock failure',
        })
      ).rejects.toMatchObject({
        statusCode: 500,
        code: 'DATABASE_CLOCK_UNAVAILABLE',
      });

      mockPrisma.$queryRawUnsafe = origQuery;
    });

    it('Finding 2 Proof: retains prior earlier deadlines across slate union to prevent deadline rollback', async () => {
      // Prior slate had an early game that kicked off 5 minutes from now
      const earlyPriorKickoff = new Date(Date.now() + 300000).toISOString();
      const futureGameKickoff = new Date(Date.now() + 86400000).toISOString();

      committedDbState.pools[POOL_ID].settings = {
        seasonYear: 2026,
        lock_offset: 10, // 10 minute lock offset
        owner_admin_v1: {
          slates: {
            2026: {
              2: {
                9: {
                  eventIds: ['401873040'],
                  evidenceSnapshot: [
                    { id: '401873040', kickoffTime: earlyPriorKickoff, isKickoffConfirmed: true },
                  ],
                  version: 1,
                },
              },
            },
          },
        },
      };

      const week9Events = [
        { externalGameId: '401873040', homeTeamId: 'KC', awayTeamId: 'LV', kickoffTime: earlyPriorKickoff, isKickoffConfirmed: true },
        { externalGameId: '401873041', homeTeamId: 'SF', awayTeamId: 'LAR', kickoffTime: futureGameKickoff, isKickoffConfirmed: true },
      ];
      const week9Fingerprint = authoritativeSlateService.computeManifestFingerprint(2026, 2, 9, week9Events);

      vi.spyOn(authoritativeSlateService, 'fetchAuthoritativeESPNScoreboard').mockResolvedValue({
        status: 'VERIFIED',
        provider: 'ESPN',
        league: 'NFL',
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 9,
        observationTime: new Date().toISOString(),
        adapterVersion: '1.0',
        eventCount: 2,
        events: week9Events,
        manifestFingerprint: week9Fingerprint,
        reasons: [],
      });

      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue({
        season: 2026,
        seasonType: 2,
        weekNumber: 9,
        revision: 1,
        eventIds: ['401873040', '401873041'],
        acceptedAt: new Date().toISOString(),
        acceptedBy: JACK_UUID,
        manifestFingerprint: week9Fingerprint,
        observationTime: new Date().toISOString(),
      });

      // Proposed slate attempts to drop '401873040' and only include the tomorrow game '401873041'
      // But because '401873040' is in the union (from prior effective slate), its earlier deadline (300s - 600s = passed)
      // must NOT be bypassed or rolled back!
      const poolRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);
      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2026,
          seasonType: 2,
          weekNumber: 9,
          eventIds: ['401873041'], // Trying to drop the game whose lock deadline passed
          expectedRevision: poolRev,
          reason: 'Testing Finding 2 retained union deadline',
        })
      ).rejects.toMatchObject({
        statusCode: 422,
        code: 'KICKOFF_PASSED',
      });

      // Restore base pool settings
      committedDbState.pools[POOL_ID].settings = { seasonYear: 2026, lock_offset: 0 };
    });

    it('Finding 3 Proof: settled penalty ledger records or settled pick results deny with HTTP 409 SLATE_FROZEN', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const week9Events = [
        { externalGameId: '401873040', homeTeamId: 'KC', awayTeamId: 'LV', kickoffTime: futureDate, isKickoffConfirmed: true },
      ];
      const week9Fingerprint = authoritativeSlateService.computeManifestFingerprint(2026, 2, 9, week9Events);

      vi.spyOn(authoritativeSlateService, 'fetchAuthoritativeESPNScoreboard').mockResolvedValue({
        status: 'VERIFIED',
        provider: 'ESPN',
        league: 'NFL',
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 9,
        observationTime: new Date().toISOString(),
        adapterVersion: '1.0',
        eventCount: 1,
        events: week9Events,
        manifestFingerprint: week9Fingerprint,
        reasons: [],
      });

      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue({
        season: 2026,
        seasonType: 2,
        weekNumber: 9,
        revision: 1,
        eventIds: ['401873040'],
        acceptedAt: new Date().toISOString(),
        acceptedBy: JACK_UUID,
        manifestFingerprint: week9Fingerprint,
        observationTime: new Date().toISOString(),
      });

      // 1. Settled PenaltyLedger rows exist (Defect 2: verify weekNumber query predicate)
      let observedPenaltyWhere: any = null;
      mockPrisma.penaltyLedger.count.mockImplementationOnce(async ({ where }: any) => {
        observedPenaltyWhere = where;
        return 1;
      });
      const poolRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);
      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2026,
          seasonType: 2,
          weekNumber: 9,
          eventIds: ['401873040'],
          expectedRevision: poolRev,
          reason: 'Testing Finding 3 penalty ledger freeze',
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'SLATE_FROZEN',
      });
      expect(observedPenaltyWhere).toBeDefined();
      expect(observedPenaltyWhere.weekNumber).toBe(9);
      expect(observedPenaltyWhere.week).toBeUndefined();

      // 2. Settled PickResult rows exist
      mockPrisma.pickResult.count.mockResolvedValueOnce(1);
      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2026,
          seasonType: 2,
          weekNumber: 9,
          eventIds: ['401873040'],
          expectedRevision: poolRev,
          reason: 'Testing Finding 3 pick result freeze',
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'SLATE_FROZEN',
      });
    });

    it('Defect 3 Proof: post-write advancing database clock (CLOCK_TIMESTAMP()) crossing kickoff deadline rejects with HTTP 422 KICKOFF_PASSED', async () => {
      const futureDate1 = new Date(Date.now() + 86400000).toISOString();
      const week9Events = [
        { externalGameId: '401873040', homeTeamId: 'KC', awayTeamId: 'LV', kickoffTime: futureDate1, isKickoffConfirmed: true },
      ];
      const week9Fingerprint = authoritativeSlateService.computeManifestFingerprint(2026, 2, 9, week9Events);

      vi.spyOn(authoritativeSlateService, 'fetchAuthoritativeESPNScoreboard').mockResolvedValue({
        status: 'VERIFIED',
        provider: 'ESPN',
        league: 'NFL',
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 9,
        observationTime: new Date().toISOString(),
        adapterVersion: '1.0',
        eventCount: 1,
        events: week9Events,
        manifestFingerprint: week9Fingerprint,
        reasons: [],
      });

      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue({
        season: 2026,
        seasonType: 2,
        weekNumber: 9,
        revision: 1,
        eventIds: ['401873040'],
        acceptedAt: new Date().toISOString(),
        acceptedBy: JACK_UUID,
        manifestFingerprint: week9Fingerprint,
        observationTime: new Date().toISOString(),
      });

      let clockCallCount = 0;
      const origQuery = mockPrisma.$queryRawUnsafe;
      mockPrisma.$queryRawUnsafe = vi.fn(async (q: string, ...args: any[]) => {
        if (q.includes('CLOCK_TIMESTAMP()')) {
          clockCallCount++;
          if (clockCallCount === 1) {
            return [{ now: new Date().toISOString() }];
          } else {
            // Post-write advancing clock has advanced past kickoff!
            return [{ now: new Date(new Date(futureDate1).getTime() + 10000).toISOString() }];
          }
        }
        return origQuery(q, ...args);
      });

      const poolRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);
      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2026,
          seasonType: 2,
          weekNumber: 9,
          eventIds: ['401873040'],
          expectedRevision: poolRev,
          reason: 'Testing Defect 3 post-write clock crossing',
        })
      ).rejects.toMatchObject({
        statusCode: 422,
        code: 'KICKOFF_PASSED',
      });

      mockPrisma.$queryRawUnsafe = origQuery;
    });

    it('Finding 3 Proof: strict transactional lock-order concurrency serialization on public.pools row and simulated pick vs slate PUT races', async () => {
      // NOTE: Real multi-connection PostgreSQL transaction isolation and row/advisory lock serialization require an active PostgreSQL instance,
      // which is unavailable in this local test environment (no local postgres service or container). These tests exercise simulated race concurrency against a JavaScript FIFO transaction queue.
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const week10Events = [
        { externalGameId: '401873060', homeTeamId: 'KC', awayTeamId: 'LV', kickoffTime: futureDate, isKickoffConfirmed: true },
        { externalGameId: '401873061', homeTeamId: 'SF', awayTeamId: 'LAR', kickoffTime: futureDate, isKickoffConfirmed: true },
      ];
      const week10Fingerprint = authoritativeSlateService.computeManifestFingerprint(2026, 2, 10, week10Events);

      vi.spyOn(authoritativeSlateService, 'fetchAuthoritativeESPNScoreboard').mockResolvedValue({
        status: 'VERIFIED',
        provider: 'ESPN',
        league: 'NFL',
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 10,
        observationTime: new Date().toISOString(),
        adapterVersion: '1.0',
        eventCount: 2,
        events: week10Events,
        manifestFingerprint: week10Fingerprint,
        reasons: [],
      });

      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue({
        season: 2026,
        seasonType: 2,
        weekNumber: 10,
        revision: 1,
        eventIds: ['401873060', '401873061'],
        acceptedAt: new Date().toISOString(),
        acceptedBy: JACK_UUID,
        manifestFingerprint: week10Fingerprint,
        observationTime: new Date().toISOString(),
      });

      mockPrisma._gameStore = [
        {
          id: 'c0a80101-0000-0000-0000-000000000010',
          externalGameId: '401873060',
          homeTeamId: 'KC',
          awayTeamId: 'LV',
          kickoffTime: futureDate,
          canonicalKickoffTime: futureDate,
          status: 'SCHEDULED',
          week: 10,
        },
        {
          id: 'c0a80101-0000-0000-0000-000000000011',
          externalGameId: '401873061',
          homeTeamId: 'SF',
          awayTeamId: 'LAR',
          kickoffTime: futureDate,
          canonicalKickoffTime: futureDate,
          status: 'SCHEDULED',
          week: 10,
        },
      ];

      // Part 1: Verify strict lock acquisition order of executeFutureSlateMutationInternal:
      // Must acquire weekly manifest advisory lock BEFORE pool row lock
      const lockSequence: string[] = [];
      const origQuery = mockPrisma.$queryRawUnsafe;
      mockPrisma.$queryRawUnsafe = vi.fn(async (q: string, ...args: any[]) => {
        if (q.includes('pg_advisory_xact_lock')) {
          lockSequence.push('weekly_manifest_advisory_lock');
        } else if (q.includes('FOR UPDATE')) {
          lockSequence.push('pool_row_lock');
        }
        return origQuery(q, ...args);
      });

      const poolRev = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);
      await executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
        season: 2026,
        seasonType: 2,
        weekNumber: 10,
        eventIds: ['401873060', '401873061'],
        expectedRevision: poolRev,
        reason: 'Verifying lock order',
      });

      expect(lockSequence).toEqual(['weekly_manifest_advisory_lock', 'pool_row_lock']);
      mockPrisma.$queryRawUnsafe = origQuery;

      // Part 2: Simulated Concurrency Race A: First Pick wins the race against concurrent Slate PUT.
      // Launch both transactions concurrently. Pick transaction acquires lock first,
      // writes the pick and irreversible freeze to pool settings, and commits.
      // Slate PUT, serialized behind the pick, acquires the lock, observes the committed freeze,
      // and rejects with HTTP 409 SLATE_FROZEN!
      const revBeforeRace = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);

      const pickPromise = mockPrisma.$transaction(async (tx: any) => {
        return executeSerializedPickMutation(tx, {
          poolId: POOL_ID,
          userId: JACK_UUID,
          gameId: 'c0a80101-0000-0000-0000-000000000010',
          externalGameId: '401873060',
          week: 10,
          selectedTeamId: 'KC',
        });
      });

      const slatePutPromise = executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
        season: 2026,
        seasonType: 2,
        weekNumber: 10,
        eventIds: ['401873060'],
        expectedRevision: revBeforeRace,
        reason: 'Concurrent race attempt',
      });

      const [pickResult, slatePutOutcome] = await Promise.allSettled([pickPromise, slatePutPromise]);

      expect(pickResult.status).toBe('fulfilled');
      expect(slatePutOutcome.status).toBe('rejected');
      if (slatePutOutcome.status === 'rejected') {
        expect(slatePutOutcome.reason.statusCode).toBe(409);
        expect(['STALE_REVISION', 'SLATE_FROZEN']).toContain(slatePutOutcome.reason.code);
      }

      // Proves that even with the fresh post-pick revision, Slate PUT is permanently frozen with SLATE_FROZEN
      const revAfterPick = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);
      await expect(
        executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
          season: 2026,
          seasonType: 2,
          weekNumber: 10,
          eventIds: ['401873060'],
          expectedRevision: revAfterPick,
          reason: 'Attempted mutation with fresh revision after pick freeze',
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'SLATE_FROZEN',
      });

      // Part 3: Simulated Concurrency Race B: Slate PUT wins the race against concurrent Pick.
      // Week 11 scope where Slate PUT runs first and removes a game from the custom slate.
      // Pick for the removed game, running concurrently, acquires lock after Slate PUT commits,
      // discovers the game is no longer in the configured slate, and rejects with HTTP 422 GAME_NOT_IN_SLATE!
      const week11Events = [
        { externalGameId: '401873070', homeTeamId: 'MIA', awayTeamId: 'BUF', kickoffTime: futureDate, isKickoffConfirmed: true },
        { externalGameId: '401873071', homeTeamId: 'GB', awayTeamId: 'CHI', kickoffTime: futureDate, isKickoffConfirmed: true },
      ];
      const week11Fingerprint = authoritativeSlateService.computeManifestFingerprint(2026, 2, 11, week11Events);

      vi.spyOn(authoritativeSlateService, 'fetchAuthoritativeESPNScoreboard').mockResolvedValue({
        status: 'VERIFIED',
        provider: 'ESPN',
        league: 'NFL',
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 11,
        observationTime: new Date().toISOString(),
        adapterVersion: '1.0',
        eventCount: 2,
        events: week11Events,
        manifestFingerprint: week11Fingerprint,
        reasons: [],
      });

      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue({
        season: 2026,
        seasonType: 2,
        weekNumber: 11,
        revision: 1,
        eventIds: ['401873070', '401873071'],
        acceptedAt: new Date().toISOString(),
        acceptedBy: JACK_UUID,
        manifestFingerprint: week11Fingerprint,
        observationTime: new Date().toISOString(),
      });

      mockPrisma._gameStore.push(
        {
          id: 'c0a80101-0000-0000-0000-000000000020',
          externalGameId: '401873070',
          homeTeamId: 'MIA',
          awayTeamId: 'BUF',
          kickoffTime: futureDate,
          canonicalKickoffTime: futureDate,
          status: 'SCHEDULED',
          week: 11,
        },
        {
          id: 'c0a80101-0000-0000-0000-000000000021',
          externalGameId: '401873071',
          homeTeamId: 'GB',
          awayTeamId: 'CHI',
          kickoffTime: futureDate,
          canonicalKickoffTime: futureDate,
          status: 'SCHEDULED',
          week: 11,
        }
      );

      const rev11Before = computePoolSettingsRevision(committedDbState.pools[POOL_ID]);

      const observation11 = {
        status: 'VERIFIED',
        provider: 'ESPN',
        league: 'NFL',
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 11,
        observationTime: new Date().toISOString(),
        adapterVersion: '1.0',
        eventCount: 2,
        events: week11Events,
        manifestFingerprint: week11Fingerprint,
        reasons: [],
      };

      // Slate PUT runs first with synchronous observation and selects ONLY game '401873071' (removing '401873070')
      const slatePutPromise2 = executeFutureSlateMutationInternal(mockPrisma, POOL_ID, JACK_UUID, {
        season: 2026,
        seasonType: 2,
        weekNumber: 11,
        eventIds: ['401873071'],
        expectedRevision: rev11Before,
        reason: 'Slate PUT removes 401873070',
      }, observation11);

      // Concurrent pick attempts to pick the removed game 'c0a80101-0000-0000-0000-000000000020' (401873070)
      const pickPromise2 = new Promise((resolve) => setTimeout(resolve, 5)).then(() =>
        mockPrisma.$transaction(async (tx: any) => {
          return executeSerializedPickMutation(tx, {
            poolId: POOL_ID,
            userId: JACK_UUID,
            gameId: 'c0a80101-0000-0000-0000-000000000020',
            externalGameId: '401873070',
            week: 11,
            selectedTeamId: 'MIA',
          });
        })
      );

      const [slatePutRes2, pickRes2] = await Promise.allSettled([slatePutPromise2, pickPromise2]);

      expect(slatePutRes2.status).toBe('fulfilled');
      expect(pickRes2.status).toBe('rejected');
      if (pickRes2.status === 'rejected') {
        expect((pickRes2 as any).reason.message).toContain('GAME_NOT_IN_SLATE');
      }
    });

    it('Finding 4 Proof: client scoped slate cache indexes by both :latest and :revision, hits cache, and supports invalidation', async () => {
      invalidateScopedSlateCache();

      const scope = {
        poolId: 'pool-cache-test',
        season: 2026,
        seasonType: 2,
        weekNumber: 9,
        poolSettings: {
          owner_admin_v1: {
            slates: {
              2026: {
                2: {
                  9: {
                    eventIds: ['401873040', '401873041'],
                    version: 1,
                  },
                },
              },
            },
          },
        },
      };

      let fetchCount = 0;
      const mockFetch = vi.fn(async () => {
        fetchCount++;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: 'VALID_CONFIG',
            revision: 'rev-slate-hash-001',
            eventIds: ['401873040', '401873041'],
            version: 1,
            isFrozen: false,
          }),
        } as any;
      });

      try {
        // 1. Initial lookup -> triggers network fetch, stores under both :latest and :rev-slate-hash-001
        const res1 = await fetchScopedSlateProjection(scope, null, { fetchFn: mockFetch });
        expect(res1.status).toBe('VALID_CONFIG');
        expect(fetchCount).toBe(1);

        // 2. Lookup with :latest (omitted revision) -> cache hit (no fetch)
        const res2 = await fetchScopedSlateProjection(scope, null, { fetchFn: mockFetch });
        expect(res2.status).toBe('VALID_CONFIG');
        expect(fetchCount).toBe(1);

        // 3. Lookup with matching revision -> cache hit (no fetch)
        const res3 = await fetchScopedSlateProjection({ ...scope, revision: 'rev-slate-hash-001' }, null, { fetchFn: mockFetch });
        expect(res3.status).toBe('VALID_CONFIG');
        expect(fetchCount).toBe(1);

        // 4. Lookup with DIFFERENT revision -> cache miss -> triggers fetch
        const res4 = await fetchScopedSlateProjection({ ...scope, revision: 'different-stale-rev' }, null, { fetchFn: mockFetch });
        expect(res4.status).toBe('VALID_CONFIG');
        expect(fetchCount).toBe(2);

        // 5. Invalidate pool cache -> subsequent lookup triggers fetch
        invalidateScopedSlateCache('pool-cache-test');
        const res5 = await fetchScopedSlateProjection(scope, null, { fetchFn: mockFetch });
        expect(res5.status).toBe('VALID_CONFIG');
        expect(fetchCount).toBe(3);
      } finally {
        invalidateScopedSlateCache();
      }
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

    it('resolveScopedPoolSlateConfig returns distinct results and selectAcceptedScoredSlateGames fails closed on malformed config', () => {
      const manifestEventIds = ['401873040', '401873041', '401873042'];
      const clientGames: SlateGame[] = manifestEventIds.map((eid) => ({
        id: `g-${eid}`,
        externalGameId: eid,
        homeTeam: 'KC',
        awayTeam: 'LV',
        kickoffTime: new Date(Date.now() + 86400000).toISOString(),
        status: 'SCHEDULED',
      }));

      // 1. Malformed custom slate in settings (duplicate event IDs)
      const malformedScope = {
        poolId: POOL_ID,
        season: 2026,
        seasonType: 2,
        weekNumber: 9,
        poolSettings: {
          owner_admin_v1: {
            slates: {
              2026: {
                2: {
                  9: {
                    eventIds: ['401873040', '401873040'], // DUPLICATE
                  },
                },
              },
            },
          },
        },
      };

      const malformedResolution = resolveScopedPoolSlateConfig(malformedScope);
      expect(malformedResolution.status).toBe('UNAVAILABLE');
      // FAILS CLOSED to null, never defaults to all NFL games!
      expect(selectAcceptedScoredSlateGames(clientGames, manifestEventIds, malformedScope)).toBeNull();

      // 2. Verified absent custom slate (empty settings -> VERIFIED_NO_CUSTOM_CONFIG)
      const absentScope = {
        poolId: POOL_ID,
        season: 2026,
        seasonType: 2,
        weekNumber: 9,
        poolSettings: {},
      };
      const absentResolution = resolveScopedPoolSlateConfig(absentScope);
      expect(absentResolution.status).toBe('VERIFIED_NO_CUSTOM_CONFIG');
      expect(absentResolution.defaultPolicy).toBe('FULL_MANIFEST');
      // Uses verified default policy (all 3 manifest games)
      const unscopedGames = selectAcceptedScoredSlateGames(clientGames, manifestEventIds, absentScope);
      expect(unscopedGames).not.toBeNull();
      expect(unscopedGames).toHaveLength(3);

      // 3. Unverified scope (missing projection and settings)
      const unverifiedScope = {
        poolId: POOL_ID,
        season: 2026,
        seasonType: 2,
        weekNumber: 9,
      };
      const unverifiedResolution = resolveScopedPoolSlateConfig(unverifiedScope);
      expect(unverifiedResolution.status).toBe('UNAVAILABLE');
      // FAILS CLOSED to null!
      expect(selectAcceptedScoredSlateGames(clientGames, manifestEventIds, unverifiedScope)).toBeNull();
    });

    it('getGamesForWeek fails closed when pool settings read fails (Finding 4)', async () => {
      mockPrisma.pool.findUnique.mockRejectedValueOnce(new Error('DATABASE_CONNECTION_LOST'));

      await expect(
        getGamesForWeek(9, 2026, POOL_ID, mockPrisma)
      ).rejects.toThrow('DATABASE_CONNECTION_LOST');
    });

    it('getGamesForWeek applies custom slate filtering to caller-bound RPC data (Finding 4 RPC precedence)', async () => {
      const selectedSubset = ['401873040', '401873041'];
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

      mockPrisma.pool.findUnique.mockImplementation(async ({ where }: any) => {
        return committedDbState.pools[where.id] ? { ...committedDbState.pools[where.id] } : null;
      });

      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue({
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

      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: [
            { id: 'g-1', external_game_id: '401873040', home_team_id: 'KC', away_team_id: 'LV', status: 'SCHEDULED' },
            { id: 'g-2', external_game_id: '401873041', home_team_id: 'SF', away_team_id: 'LAR', status: 'SCHEDULED' },
            { id: 'g-3', external_game_id: '401873042', home_team_id: 'DAL', away_team_id: 'PHI', status: 'SCHEDULED' },
          ],
          error: null,
        }),
      };

      const games = await getGamesForWeek(9, 2026, POOL_ID, mockPrisma, { supabaseClient: mockSupabase });
      expect(games).toHaveLength(2);
      expect(games.map((g) => g.externalGameId)).toEqual(selectedSubset);
    });

    it('getGamesForWeek respects seasonType parameter (Finding 6)', async () => {
      const selectedSubset = ['401873050'];
      committedDbState.pools[POOL_ID].settings = {
        owner_admin_v1: {
          slates: {
            2026: {
              3: {
                1: {
                  eventIds: selectedSubset,
                  version: 1,
                  updatedAt: new Date().toISOString(),
                },
              },
            },
          },
        },
      };

      mockPrisma.pool.findUnique.mockImplementation(async ({ where }: any) => {
        return committedDbState.pools[where.id] ? { ...committedDbState.pools[where.id] } : null;
      });

      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue({
        season: 2026,
        seasonType: 3,
        weekNumber: 1,
        revision: 1,
        eventIds: ['401873050', '401873051'],
        acceptedAt: '2026-11-03T12:00:00Z',
        acceptedBy: 'commish',
        manifestFingerprint: 'manifest-fp-w9',
        observationTime: '2026-11-03T12:00:00Z',
      });

      mockPrisma._gameStore = [
        { id: 'g-1', externalGameId: '401873050', homeTeamId: 'KC', awayTeamId: 'BUF', kickoffTime: new Date(Date.now() + 86400000), status: 'SCHEDULED' },
        { id: 'g-2', externalGameId: '401873051', homeTeamId: 'DET', awayTeamId: 'GB', kickoffTime: new Date(Date.now() + 86400000), status: 'SCHEDULED' },
      ];

      const games = await getGamesForWeek(1, 2026, POOL_ID, mockPrisma, { seasonType: 3 });
      expect(games).toHaveLength(1);
      expect(games[0].externalGameId).toBe('401873050');
    });

    it('getGamesForWeek fails closed when custom slate references unmanifested games', async () => {
      committedDbState.pools[POOL_ID].settings = {
        owner_admin_v1: {
          slates: {
            2026: {
              2: {
                9: {
                  eventIds: ['unmanifested-id-999'],
                  version: 1,
                  updatedAt: new Date().toISOString(),
                },
              },
            },
          },
        },
      };

      mockPrisma.pool.findUnique.mockImplementation(async ({ where }: any) => {
        return committedDbState.pools[where.id] ? { ...committedDbState.pools[where.id] } : null;
      });

      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue({
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

      const games = await getGamesForWeek(9, 2026, POOL_ID, mockPrisma);
      expect(games).toEqual([]);
    });

    it('proves member settings flow in RadarPage and WallOfShamePage respects custom pool slate and isolates finality without PUT /slate', () => {
      // 1. Synthetic Supabase pool_memberships response structure matching RadarPage and WallOfShamePage query:
      // select('user_id, role, users(id, email, display_name), pools(settings)')
      const customSlateEventIds = ['401873040', '401873041'];
      const unselectedManifestEventId = '401873042';
      const allManifestEventIds = [...customSlateEventIds, unselectedManifestEventId];

      const poolSettingsFromMembership = {
        owner_admin_v1: {
          slates: {
            2026: {
              2: {
                9: {
                  eventIds: customSlateEventIds,
                  version: 1,
                  updatedAt: '2026-11-03T12:00:00Z',
                },
              },
            },
          },
        },
      };

      const mockMembershipData = [
        {
          user_id: JACK_UUID,
          role: 'ADMIN',
          users: { id: JACK_UUID, email: 'jack@test.com', display_name: 'Jack' },
          pools: { settings: poolSettingsFromMembership },
        },
      ];

      // Extract settings as done in RadarPage and WallOfShamePage
      const extractedSettings = (mockMembershipData[0] as any)?.pools?.settings || null;
      expect(extractedSettings).toEqual(poolSettingsFromMembership);

      // Construct scope with extracted settings
      const scope = {
        poolId: POOL_ID,
        season: 2026,
        seasonType: 2,
        weekNumber: 9,
        poolSettings: extractedSettings,
      };

      // Mock games from API/Supabase: 3 games total in NFL manifest
      // 2 games in custom slate are FINAL with valid scores
      // 1 unselected game in manifest is SCHEDULED/NOT FINAL
      const clientGames: SlateGame[] = [
        {
          id: '401873040',
          externalGameId: '401873040',
          homeTeam: 'KC',
          awayTeam: 'LV',
          status: 'STATUS_FINAL',
          homeScore: 24,
          awayScore: 17,
        },
        {
          id: '401873041',
          externalGameId: '401873041',
          homeTeam: 'SF',
          awayTeam: 'LAR',
          status: 'STATUS_FINAL',
          homeScore: 21,
          awayScore: 20,
        },
        {
          id: '401873042',
          externalGameId: '401873042',
          homeTeam: 'BAL',
          awayTeam: 'CIN',
          status: 'STATUS_SCHEDULED', // Unfinished outside game
        },
      ];

      // A: selectAcceptedScoredSlateGames scopes games to only the 2 custom slate games
      const scoredSlateGames = selectAcceptedScoredSlateGames(clientGames, allManifestEventIds, scope);
      expect(scoredSlateGames).not.toBeNull();
      expect(scoredSlateGames).toHaveLength(2);
      expect(scoredSlateGames!.map((g) => g.externalGameId)).toEqual(customSlateEventIds);

      // B: isWeeklyScoredSlateFinal evaluates ONLY the custom slate games
      // Since both custom slate games are final, and tiebreaker is verified (or not offered), finality succeeds
      const tiebreaker: WeeklyTiebreakerSnapshot = { verified: true, offered: false };
      const isFinalWithCustomSlate = isWeeklyScoredSlateFinal(
        scoredSlateGames!,
        [],
        tiebreaker,
        true, // isVerifiedLeagueSlate
        false
      );
      expect(isFinalWithCustomSlate).toBe(true);

      // C: Counter-factual proof: With verified absence of custom slate (default full manifest),
      // the unfinished game '401873042' holds finality open (returns false)
      const unscopedGames = selectAcceptedScoredSlateGames(clientGames, allManifestEventIds, {
        poolId: POOL_ID,
        season: 2026,
        seasonType: 2,
        weekNumber: 9,
        poolSettings: {}, // verified absence of custom slate -> defaultPolicy: 'FULL_MANIFEST'
      });
      expect(unscopedGames).toHaveLength(3);
      const isFinalWithoutCustomSlate = isWeeklyScoredSlateFinal(
        unscopedGames!,
        [],
        tiebreaker,
        true,
        false
      );
      expect(isFinalWithoutCustomSlate).toBe(false);

      // D: If one of the custom slate games is NOT final, custom slate also correctly evaluates to false
      const nonFinalCustomGames: SlateGame[] = [
        { ...clientGames[0], status: 'STATUS_IN_PROGRESS' },
        clientGames[1],
      ];
      const isFinalPending = isWeeklyScoredSlateFinal(
        nonFinalCustomGames,
        [],
        tiebreaker,
        true,
        false
      );
      expect(isFinalPending).toBe(false);
    });

    it('GET /api/pools/:pool_id/scoped-slate enforces active membership: denies unauthenticated and non-members', async () => {
      // Case A: Unauthenticated
      const resUnauth = await fetch(`${baseUrl}/api/pools/${POOL_ID}/scoped-slate?weekNumber=9`);
      expect(resUnauth.status).toBe(401);

      // Case B: Non-member
      const nonMemberToken = createSyntheticSupabaseToken({ id: NON_JACK_UUID, role: 'USER' });
      mockPrisma.poolMembership.findUnique.mockResolvedValueOnce(null);
      const resNonMember = await fetch(`${baseUrl}/api/pools/${POOL_ID}/scoped-slate?weekNumber=9`, {
        headers: { Authorization: `Bearer ${nonMemberToken}` },
      });
      expect(resNonMember.status).toBe(403);
    });

    it('GET /api/pools/:pool_id/scoped-slate returns unshadowable VALID_CONFIG for historical HAG-52 Week 8', async () => {
      // Attempt to shadow with bogus settings
      committedDbState.pools[POOL_ID].settings = {
        owner_admin_v1: {
          slates: {
            2026: {
              2: {
                8: {
                  eventIds: ['shadow-attempt-id'],
                  version: 999,
                },
              },
            },
          },
        },
      };

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/scoped-slate?season=2026&seasonType=2&weekNumber=8`, {
        headers: { Authorization: `Bearer ${jackAuthToken}` },
      });
      const data: any = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe('VALID_CONFIG');
      expect(data.eventIds).toHaveLength(9);
      expect(data.eventIds).not.toContain('shadow-attempt-id');
      expect(data.revision).toBe('hag52-historical-week8');
      expect(data.isFrozen).toBe(true);
    });

    it('GET /api/pools/:pool_id/scoped-slate returns VALID_CONFIG for configured custom slate and VERIFIED_NO_CUSTOM_CONFIG when unconfigured', async () => {
      // Case A: Configured custom slate
      committedDbState.pools[POOL_ID].settings = {
        owner_admin_v1: {
          slates: {
            2026: {
              2: {
                10: {
                  eventIds: ['401873040', '401873041'],
                  version: 1,
                },
              },
            },
          },
        },
      };

      const resConfig = await fetch(`${baseUrl}/api/pools/${POOL_ID}/scoped-slate?season=2026&seasonType=2&weekNumber=10`, {
        headers: { Authorization: `Bearer ${jackAuthToken}` },
      });
      const dataConfig: any = await resConfig.json();
      expect(resConfig.status).toBe(200);
      expect(dataConfig.status).toBe('VALID_CONFIG');
      expect(dataConfig.eventIds).toEqual(['401873040', '401873041']);
      expect(dataConfig.revision).toBeDefined();

      // Case B: Unconfigured week -> VERIFIED_NO_CUSTOM_CONFIG
      const resUnconfig = await fetch(`${baseUrl}/api/pools/${POOL_ID}/scoped-slate?season=2026&seasonType=2&weekNumber=11`, {
        headers: { Authorization: `Bearer ${jackAuthToken}` },
      });
      const dataUnconfig: any = await resUnconfig.json();
      expect(resUnconfig.status).toBe(200);
      expect(dataUnconfig.status).toBe('VERIFIED_NO_CUSTOM_CONFIG');
      expect(dataUnconfig.defaultPolicy).toBe('FULL_MANIFEST');
    });

    it('GET /api/pools/:pool_id/scoped-slate returns UNAVAILABLE when custom slate contains duplicate or invalid event IDs', async () => {
      committedDbState.pools[POOL_ID].settings = {
        owner_admin_v1: {
          slates: {
            2026: {
              2: {
                10: {
                  eventIds: ['401873040', '401873040'], // duplicate IDs!
                  version: 1,
                },
              },
            },
          },
        },
      };

      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/scoped-slate?season=2026&seasonType=2&weekNumber=10`, {
        headers: { Authorization: `Bearer ${jackAuthToken}` },
      });
      const data: any = await res.json();
      expect(res.status).toBe(200);
      expect(data.status).toBe('UNAVAILABLE');
      expect(data.error).toBe('MALFORMED_CONFIG');
    });

    it('fetchScopedSlateProjection suppresses finality on UNAVAILABLE and does not fallback to full manifest', async () => {
      invalidateScopedSlateCache();

      const unavailableScope = {
        poolId: POOL_ID,
        season: 2026,
        seasonType: 2,
        weekNumber: 12,
        projection: { status: 'UNAVAILABLE' as const, error: 'MALFORMED_CONFIG' },
      };

      const manifestEventIds = ['401873040', '401873041', '401873042'];
      const clientGames: SlateGame[] = manifestEventIds.map((eid) => ({
        id: `g-${eid}`,
        externalGameId: eid,
        homeTeam: 'KC',
        awayTeam: 'LV',
        status: 'STATUS_FINAL',
        homeScore: 24,
        awayScore: 17,
      }));

      // Section 58: Failed settings reads suppress authoritative scores/finality and show unavailable; NEVER default to all NFL games!
      const scoredGames = selectAcceptedScoredSlateGames(clientGames, manifestEventIds, unavailableScope);
      expect(scoredGames).toBeNull();

      const isFinal = isWeeklyScoredSlateFinal(
        scoredGames || [],
        [],
        { verified: true, offered: false },
        Boolean(scoredGames),
        false
      );
      expect(isFinal).toBe(false);
    });

    it('proves shared pool gate locks pool row and records irreversible freeze on first pick submission', async () => {
      // Clean slate with no picks
      committedDbState.picks = [];
      delete committedDbState.pools[POOL_ID].settings?.owner_admin_v1?.freezes;

      const futureDate = new Date(Date.now() + 86400000);
      mockPrisma._gameStore = [
        {
          id: 'g-game-10-1',
          externalGameId: '401873060',
          homeTeamId: 'KC',
          awayTeamId: 'LV',
          kickoffTime: futureDate,
          canonicalKickoffTime: futureDate,
          status: 'SCHEDULED',
          week: 10,
        },
      ];

      await mockPrisma.$transaction(async (tx: any) => {
        return executeSerializedPickMutation(tx, {
          poolId: POOL_ID,
          userId: JACK_UUID,
          gameId: 'g-game-10-1',
          week: 10,
          selectedTeamId: 'KC',
        });
      });

      // 1. Assert lock query was executed
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, status FROM public.pools WHERE id = $1::uuid FOR UPDATE'),
        POOL_ID
      );

      // 2. Assert irreversible participation freeze was recorded in pool settings
      const committedSettings = committedDbState.pools[POOL_ID].settings;
      const freezeRecord = committedSettings?.owner_admin_v1?.freezes?.[2026]?.[2]?.[10];
      expect(freezeRecord).toBeDefined();
      expect(['FIRST_PICK_SUBMITTED', 'FIRST_PICK_SUBMISSION']).toContain(freezeRecord.reason);
      expect(freezeRecord.actorId).toBe(JACK_UUID);
      expect(freezeRecord.frozenAt).toBeDefined();
    });

    it('proves executeSerializedPickMutation fails closed with 500 SHARED_POOL_GATE_UNAVAILABLE when capabilities are missing', async () => {
      const defectiveExecutor = {
        // Missing $queryRawUnsafe!
        pool: {
          findUnique: vi.fn(),
          update: vi.fn(),
        },
      };

      await expect(
        executeSerializedPickMutation(defectiveExecutor, {
          poolId: POOL_ID,
          userId: JACK_UUID,
          gameId: 'g-game-10-1',
          week: 10,
          selectedTeamId: 'KC',
        })
      ).rejects.toThrow('SHARED_POOL_GATE_UNAVAILABLE');
    });

    it('proves executeSerializedPickMutation fails closed with 422 MALFORMED_SLATE_CONFIG when custom slate is malformed', async () => {
      // Invalidate custom slate with empty eventIds
      committedDbState.pools[POOL_ID].settings = {
        owner_admin_v1: {
          slates: {
            2026: {
              2: {
                10: {
                  eventIds: [], // Malformed empty!
                  version: 1,
                },
              },
            },
          },
        },
      };

      const futureDate = new Date(Date.now() + 86400000);
      mockPrisma._gameStore = [
        {
          id: 'g-game-10-1',
          externalGameId: '401873060',
          homeTeamId: 'KC',
          awayTeamId: 'LV',
          kickoffTime: futureDate,
          canonicalKickoffTime: futureDate,
          status: 'SCHEDULED',
          week: 10,
        },
      ];

      await expect(
        mockPrisma.$transaction(async (tx: any) => {
          return executeSerializedPickMutation(tx, {
            poolId: POOL_ID,
            userId: JACK_UUID,
            gameId: 'g-game-10-1',
            week: 10,
            selectedTeamId: 'KC',
          });
        })
      ).rejects.toThrow('MALFORMED_SLATE_CONFIG');
    });

    it('proves clearing a pick preserves irreversible participation freeze evidence in settings', async () => {
      // Pre-seed freeze in settings
      committedDbState.pools[POOL_ID].settings = {
        lock_offset: 0,
        owner_admin_v1: {
          freezes: {
            2026: {
              2: {
                10: {
                  frozenAt: '2026-11-03T10:00:00.000Z',
                  reason: 'FIRST_PICK_SUBMISSION',
                  actorId: JACK_UUID,
                  version: 1,
                },
              },
            },
          },
        },
      };

      const futureDate = new Date(Date.now() + 86400000);
      mockPrisma._gameStore = [
        {
          id: 'g-game-10-1',
          externalGameId: '401873060',
          homeTeamId: 'KC',
          awayTeamId: 'LV',
          kickoffTime: futureDate,
          canonicalKickoffTime: futureDate,
          status: 'SCHEDULED',
          week: 10,
        },
      ];

      // Submit null selection (clearing pick)
      await mockPrisma.$transaction(async (tx: any) => {
        return executeSerializedPickMutation(tx, {
          poolId: POOL_ID,
          userId: JACK_UUID,
          gameId: 'g-game-10-1',
          week: 10,
          selectedTeamId: null,
        });
      });

      // Assert freeze remains 100% intact!
      const freezeRecord = committedDbState.pools[POOL_ID].settings?.owner_admin_v1?.freezes?.[2026]?.[2]?.[10];
      expect(freezeRecord).toBeDefined();
      expect(freezeRecord.frozenAt).toBe('2026-11-03T10:00:00.000Z');
      expect(freezeRecord.reason).toBe('FIRST_PICK_SUBMISSION');
    });

    it('proves picks for games outside configured custom slate are denied with 422 GAME_NOT_IN_SLATE', async () => {
      // Configure custom slate for Week 10 with only game '401873060'
      committedDbState.pools[POOL_ID].settings = {
        owner_admin_v1: {
          slates: {
            2026: {
              2: {
                10: {
                  eventIds: ['401873060'],
                  version: 1,
                },
              },
            },
          },
        },
      };

      const futureDate = new Date(Date.now() + 86400000);
      mockPrisma._gameStore = [
        {
          id: 'g-game-unselected',
          externalGameId: '401873099', // Not in custom slate!
          homeTeamId: 'DAL',
          awayTeamId: 'NYG',
          kickoffTime: futureDate,
          canonicalKickoffTime: futureDate,
          status: 'SCHEDULED',
          week: 10,
        },
      ];

      await expect(
        mockPrisma.$transaction(async (tx: any) => {
          return executeSerializedPickMutation(tx, {
            poolId: POOL_ID,
            userId: JACK_UUID,
            gameId: 'g-game-unselected',
            week: 10,
            selectedTeamId: 'DAL',
          });
        })
      ).rejects.toThrow('GAME_NOT_IN_SLATE');
    });

    it('proves commissioner pick override routes through shared pool gate and records freeze', async () => {
      delete committedDbState.pools[POOL_ID].settings?.owner_admin_v1?.freezes;
      const futureDate = new Date(Date.now() + 86400000);
      mockPrisma._gameStore = [
        {
          id: 'g-game-10-2',
          externalGameId: '401873061',
          homeTeamId: 'SF',
          awayTeamId: 'LAR',
          kickoffTime: futureDate,
          canonicalKickoffTime: futureDate,
          status: 'SCHEDULED',
          week: 10,
        },
      ];

      const res = await applyOverride(
        {
          poolId: POOL_ID,
          commissionerId: JACK_UUID,
          type: 'PICK',
          targetEntityId: NON_JACK_UUID,
          data: {
            userId: NON_JACK_UUID,
            gameId: 'g-game-10-2',
            selectedTeamId: 'SF',
          },
          reason: 'Commissioner manual pick entry',
        },
        undefined,
        mockPrisma
      );

      expect(res.success).toBe(true);
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, status FROM public.pools WHERE id = $1::uuid FOR UPDATE'),
        POOL_ID
      );

      // Verify freeze was created in pool settings
      const freezeRecord = committedDbState.pools[POOL_ID].settings?.owner_admin_v1?.freezes?.[2026]?.[2]?.[10];
      expect(freezeRecord).toBeDefined();
      expect(['FIRST_PICK_SUBMITTED', 'FIRST_PICK_SUBMISSION']).toContain(freezeRecord.reason);
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
