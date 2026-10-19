import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import { GameStatus } from '@prisma/client';
import { adminOpsRouter } from '../src/routes/adminOps';
import {
  executeWeeklyWrapUpForPool,
  previewWeeklyWrapUpForPool,
} from '../src/services/wrapUpEngine';
import {
  setSupabaseAuthClientForTesting,
  createSyntheticSupabaseToken,
} from '../src/middleware/auth';
import prisma from '../src/db/client';

describe('Phase 41: Slate Settlement Integration & Preview Contract', () => {
  const POOL_ID = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';
  const ADMIN_ID = 'a1111111-1111-1111-1111-111111111111';
  const MEMBER_1_ID = 'b2222222-2222-2222-2222-222222222222';
  const MEMBER_2_ID = 'c3333333-3333-3333-3333-333333333333';
  const MEMBER_3_ID = 'd4444444-4444-4444-4444-444444444444';

  let app: express.Application;

  const createAuthToken = (userId: string, role = 'ADMIN') => {
    return createSyntheticSupabaseToken({ id: userId, email: `${userId}@example.com`, role });
  };

  beforeEach(() => {
    vi.restoreAllMocks();

    const getUserMock = vi.fn().mockImplementation(async (token: string) => {
      const parts = token.split('.');
      if (parts.length < 2) return { data: { user: null }, error: new Error('invalid') };
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      return {
        data: {
          user: {
            id: payload.sub,
            aud: 'authenticated',
            role: 'authenticated',
            email: payload.email || `${payload.sub}@example.com`,
            app_metadata: {},
            user_metadata: {},
            created_at: new Date().toISOString(),
          },
        },
        error: null,
      };
    });
    setSupabaseAuthClientForTesting({ auth: { getUser: getUserMock } } as any);

    (vi.spyOn(prisma.user, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      return {
        id: where.id,
        email: `${where.id}@example.com`,
        role: where.id === ADMIN_ID ? 'ADMIN' : 'USER',
        createdAt: new Date(),
      };
    });

    app = express();
    app.use(express.json());
    app.use('/api/admin/ops', adminOpsRouter);
  });

  describe('1. Read-Only Preview Contract (Stage 1C)', () => {
    it('returns NOT READY when settlement claim store is missing', async () => {
      const mockDb: any = {
        pool: {
          findUnique: vi.fn().mockResolvedValue({
            id: POOL_ID,
            adminId: ADMIN_ID,
            memberships: [{ userId: MEMBER_1_ID, status: 'ACTIVE' }],
            settings: { season: 2026 },
          }),
        },
        game: { findMany: vi.fn().mockResolvedValue([]) },
        weeklySubmission: { findMany: vi.fn().mockResolvedValue([]) },
        $queryRaw: vi.fn().mockResolvedValue([{ to_regclass: null }]),
        $queryRawUnsafe: vi.fn().mockResolvedValue([]),
      };

      const preview = await previewWeeklyWrapUpForPool(POOL_ID, 6, { prismaClient: mockDb });
      expect(preview.readyToSettle).toBe(false);
      expect(preview.reasonsIfNotReady.some((r) => r.includes('CLAIM_STORE_UNAVAILABLE'))).toBe(true);
    });

    it('returns NOT READY when unpicked Monday game is not yet FINAL', async () => {
      const finishedGame = {
        id: 'g-thu',
        externalGameId: '401872995',
        homeTeamId: 'DEN',
        awayTeamId: 'SEA',
        kickoffTime: new Date('2026-10-16T00:15:00Z'),
        status: GameStatus.FINAL,
        homeScore: 17,
        awayScore: 14,
      };
      const unpickedPendingMondayGame = {
        id: 'g-mnf',
        externalGameId: '401873008',
        homeTeamId: 'SF',
        awayTeamId: 'WSH',
        kickoffTime: new Date('2026-10-20T00:15:00Z'),
        status: GameStatus.SCHEDULED, // NOT FINAL!
        homeScore: null,
        awayScore: null,
      };

      const mockDb: any = {
        pool: {
          findUnique: vi.fn().mockResolvedValue({
            id: POOL_ID,
            adminId: ADMIN_ID,
            memberships: [{ userId: MEMBER_1_ID, status: 'ACTIVE' }],
            settings: { season: 2026 },
          }),
        },
        game: { findMany: vi.fn().mockResolvedValue([finishedGame, unpickedPendingMondayGame]) },
        weeklySubmission: { findMany: vi.fn().mockResolvedValue([]) },
        $queryRaw: vi.fn().mockResolvedValue([{ to_regclass: 'public.weekly_wrapups' }]),
        $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string) => {
          if (sql.includes('SELECT p.user_id, p.game_id')) {
            // User only picked the Sunday game
            return [
              {
                user_id: MEMBER_1_ID,
                game_id: '401872995',
                selected_team: 'SF',
                selected_team_id: null,
                home_team_id: 'SF',
                away_team_id: 'SEA',
                home_score: 24,
                away_score: 20,
                status: GameStatus.FINAL,
              },
            ];
          }
          return [];
        }),
      };

      const preview = await previewWeeklyWrapUpForPool(POOL_ID, 6, { prismaClient: mockDb, tiebreakerOffered: false });
      expect(preview.readyToSettle).toBe(false);
      expect(preview.allGamesFinal).toBe(false);
      expect(preview.pendingGamesCount).toBe(1);
      expect(preview.reasonsIfNotReady.some((r) => r.includes('WEEK_NOT_FINAL'))).toBe(true);
    });

    it('generates a stable deterministic inputFingerprint on preview', async () => {
      const mockDb: any = {
        pool: {
          findUnique: vi.fn().mockResolvedValue({
            id: POOL_ID,
            adminId: ADMIN_ID,
            memberships: [{ userId: MEMBER_1_ID, status: 'ACTIVE' }],
            settings: { season: 2026 },
          }),
        },
        game: { findMany: vi.fn().mockResolvedValue([]) },
        weeklySubmission: { findMany: vi.fn().mockResolvedValue([]) },
        $queryRaw: vi.fn().mockResolvedValue([{ to_regclass: 'public.weekly_wrapups' }]),
        $queryRawUnsafe: vi.fn().mockResolvedValue([]),
      };

      const preview1 = await previewWeeklyWrapUpForPool(POOL_ID, 6, { prismaClient: mockDb });
      const preview2 = await previewWeeklyWrapUpForPool(POOL_ID, 6, { prismaClient: mockDb });
      expect(preview1.inputFingerprint).toBe(preview2.inputFingerprint);
      expect(preview1.inputFingerprint).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('2. Settlement Revision & Atomicity Contract (Stage 1D)', () => {
    it('rejects stale preview revision when manifest revision has advanced', async () => {
      const mockTx: any = {
        $queryRaw: vi.fn().mockResolvedValue([{ to_regclass: 'public.weekly_wrapups' }]),
        $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string) => {
          if (sql.includes('weekly_slate_manifests')) {
            if (sql.includes('to_regclass')) {
              return [{ to_regclass: 'public.weekly_slate_manifests' }];
            }
            return [
              {
                season: 2026,
                season_type: 2,
                week_number: 6,
                revision: 2,
                event_ids: ['401872995'],
                manifest_fingerprint: 'abc',
                accepted_at: new Date().toISOString(),
                accepted_by: 'admin-id',
                observation_time: new Date().toISOString(),
              },
            ];
          }
          return [];
        }),
      };

      const mockDb: any = {
        $transaction: vi.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };

      // Client passes stale preview revision 1
      const result = await executeWeeklyWrapUpForPool(POOL_ID, 6, {
        prismaClient: mockDb,
        season: 2026,
        previewRevision: 1, // Stale!
      });

      expect(result.applied).toBe(false);
      expect(result.reason).toBe('STALE_PREVIEW_REVISION');
    });

    it('enforces atomic claim with composite primary key (pool_id, season, week_number)', async () => {
      const mockTx: any = {
        $queryRaw: vi.fn().mockResolvedValue([{ to_regclass: 'public.weekly_wrapups' }]),
        $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string) => {
          if (sql.includes('INSERT INTO public.weekly_wrapups')) {
            // Simulate conflict on (pool_id, season, week_number) -> returns empty array
            return [];
          }
          return [];
        }),
      };

      const mockDb: any = {
        $transaction: vi.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };

      const result = await executeWeeklyWrapUpForPool(POOL_ID, 6, {
        prismaClient: mockDb,
        season: 2026,
      });

      expect(result.applied).toBe(false);
      expect(result.reason).toBe('ALREADY_WRAPPED_UP');
    });

    it('writes individual ledger charges with season-identifiable reasons and preserves durable audit snapshot', async () => {
      const createdCharges: any[] = [];
      const updatedAuditSnapshots: any[] = [];

      const mockGame = {
        id: 'g-final',
        externalGameId: '401872995',
        homeTeamId: 'DEN',
        awayTeamId: 'SEA',
        kickoffTime: new Date('2026-10-16T00:15:00Z'),
        status: GameStatus.FINAL,
        homeScore: 17,
        awayScore: 14,
      };

      const mockTx: any = {
        $queryRaw: vi.fn().mockResolvedValue([{ to_regclass: 'public.weekly_wrapups' }]),
        $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string, ...args: any[]) => {
          if (sql.includes('INSERT INTO public.weekly_wrapups')) {
            return [{ pool_id: POOL_ID, season: 2026, week_number: 6 }];
          }
          if (sql.includes('UPDATE public.weekly_wrapups')) {
            updatedAuditSnapshots.push(JSON.parse(args[0]));
            return [];
          }
          if (sql.includes('SELECT p.user_id, p.game_id')) {
            return [
              // Member 1 picked winner DEN (1 point)
              {
                user_id: MEMBER_1_ID,
                game_id: '401872995',
                selected_team: 'DEN',
                selected_team_id: null,
                home_team_id: 'DEN',
                away_team_id: 'SEA',
                home_score: 17,
                away_score: 14,
                status: GameStatus.FINAL,
              },
              // Members 3..10 picked winner DEN (1 point, shared 1st place)
              ...Array.from({ length: 8 }, (_, i) => ({
                user_id: `mem-${i + 3}`,
                game_id: '401872995',
                selected_team: 'DEN',
                selected_team_id: null,
                home_team_id: 'DEN',
                away_team_id: 'SEA',
                home_score: 17,
                away_score: 14,
                status: GameStatus.FINAL,
              })),
              // Member 2 picked loser SEA (0 points, rank 10 / dead place)
              {
                user_id: MEMBER_2_ID,
                game_id: '401872995',
                selected_team: 'SEA',
                selected_team_id: null,
                home_team_id: 'DEN',
                away_team_id: 'SEA',
                home_score: 17,
                away_score: 14,
                status: GameStatus.FINAL,
              },
            ];
          }
          return [];
        }),
        pool: {
          findUnique: vi.fn().mockResolvedValue({
            id: POOL_ID,
            adminId: ADMIN_ID,
            name: 'Test Pool',
            memberships: [
              { userId: MEMBER_1_ID, status: 'ACTIVE', user: { id: MEMBER_1_ID } },
              { userId: MEMBER_2_ID, status: 'ACTIVE', user: { id: MEMBER_2_ID } },
              ...Array.from({ length: 8 }, (_, i) => ({
                userId: `mem-${i + 3}`,
                status: 'ACTIVE',
                user: { id: `mem-${i + 3}` },
              })),
            ],
            settings: { season: 2026 },
          }),
        },
        game: { findMany: vi.fn().mockResolvedValue([mockGame]) },
        weeklySubmission: { findMany: vi.fn().mockResolvedValue([]) },
        penaltyLedger: {
          create: vi.fn().mockImplementation(async ({ data }: any) => {
            createdCharges.push(data);
            return { id: 'charge-1', ...data };
          }),
          aggregate: vi.fn().mockResolvedValue({ _sum: { delta: null } }),
        },
        poolMemberStat: {
          upsert: vi.fn().mockResolvedValue({}),
        },
        outboxEvent: {
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
        inboxMessage: {
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
      };

      const mockDb: any = {
        $transaction: vi.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };

      const result = await executeWeeklyWrapUpForPool(POOL_ID, 6, {
        prismaClient: mockDb,
        season: 2026,
        tiebreakerOffered: false,
      });

      expect(result.applied).toBe(true);
      expect(result.standings).toBeDefined();

      // Member 1 is 1st (Safe Haven, 0 shots), Member 2 is Dead Place (2.5 shots)
      expect(createdCharges.length).toBe(1);
      const deadPlaceCharge = createdCharges[0];
      expect(deadPlaceCharge.userId).toBe(MEMBER_2_ID);
      expect(Number(deadPlaceCharge.delta)).toBe(2.5);
      expect(deadPlaceCharge.reason).toBe('DEAD_PLACE_MONARCH_S2026_W6');

      // Verify durable audit snapshot was preserved
      expect(updatedAuditSnapshots.length).toBe(1);
      const audit = updatedAuditSnapshots[0];
      expect(audit.poolId).toBe(POOL_ID);
      expect(audit.season).toBe(2026);
      expect(audit.weekNumber).toBe(6);
      expect(audit.standings.length).toBe(10);
    });
  });
});
