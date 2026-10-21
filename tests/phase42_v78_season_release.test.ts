import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameStatus } from '@prisma/client';
import {
  validateAndTransformESPNScoreboard,
  computeManifestFingerprint,
  refreshWeeklySlateInDb,
  orchestrateFullSeasonImport,
} from '../src/services/authoritativeSlateService';
import { getCurrentNFLWeek } from '../client/src/services/nflCalendarService';

describe('Phase 42 (v78): Full-Season Release & Authoritative Slate Contract', () => {
  const SAMPLE_WEEK7_SCOPE = {
    seasonYear: 2026,
    seasonType: 2,
    weekNumber: 7,
  };

  const VALID_WEEK7_SCOREBOARD = {
    season: { year: 2026, type: 2 },
    week: { number: 7 },
    events: [
      {
        id: '401873010',
        date: '2026-10-23T00:15:00Z',
        name: 'Detroit Lions at Green Bay Packers',
        competitions: [
          {
            id: '401873010',
            date: '2026-10-23T00:15:00Z',
            timeValid: true,
            competitors: [
              { homeAway: 'home', team: { abbreviation: 'GB', displayName: 'Green Bay Packers' } },
              { homeAway: 'away', team: { abbreviation: 'DET', displayName: 'Detroit Lions' } },
            ],
            status: { type: { name: 'STATUS_SCHEDULED', state: 'pre' } },
          },
        ],
      },
      {
        id: '401873011',
        date: '2026-10-25T17:00:00Z',
        name: 'Dallas Cowboys at San Francisco 49ers',
        competitions: [
          {
            id: '401873011',
            date: '2026-10-25T17:00:00Z',
            timeValid: true,
            competitors: [
              { homeAway: 'home', team: { abbreviation: 'SF', displayName: 'San Francisco 49ers' } },
              { homeAway: 'away', team: { abbreviation: 'DAL', displayName: 'Dallas Cowboys' } },
            ],
            status: { type: { name: 'STATUS_SCHEDULED', state: 'pre' } },
          },
        ],
      },
    ],
  };

  describe('1. ESPN Provider TBD / Unconfirmed Kickoff Detection', () => {
    it('marks games with timeValid=false or status detail TBD as isKickoffConfirmed=false', () => {
      const scoreboardWithTBD = {
        season: { year: 2026, type: 2 },
        week: { number: 7 },
        events: [
          {
            id: '401873020',
            date: '2026-10-25T00:00:00Z',
            name: 'Flex Matchup TBD',
            competitions: [
              {
                id: '401873020',
                date: '2026-10-25T00:00:00Z',
                timeValid: false, // Explicit unconfirmed time!
                competitors: [
                  { homeAway: 'home', team: { abbreviation: 'KC', displayName: 'Kansas City Chiefs' } },
                  { homeAway: 'away', team: { abbreviation: 'LAC', displayName: 'LA Chargers' } },
                ],
                status: { type: { name: 'STATUS_SCHEDULED', state: 'pre', detail: 'TBD' } },
              },
            ],
          },
        ],
      };

      const observation = validateAndTransformESPNScoreboard(scoreboardWithTBD, SAMPLE_WEEK7_SCOPE);
      expect(observation.status).toBe('VERIFIED');
      expect(observation.events.length).toBe(1);
      const ev = observation.events[0];
      expect(ev.externalGameId).toBe('401873020');
      expect(ev.isKickoffConfirmed).toBe(false);
    });

    it('marks games with confirmed timeValid as isKickoffConfirmed=true', () => {
      const observation = validateAndTransformESPNScoreboard(VALID_WEEK7_SCOREBOARD, SAMPLE_WEEK7_SCOPE);
      expect(observation.status).toBe('VERIFIED');
      expect(observation.events.every((e) => e.isKickoffConfirmed === true)).toBe(true);
    });
  });

  describe('2. Atomic Write Transaction & Identity Resolution Contract', () => {
    let mockTx: any;
    let mockDb: any;
    let storedGames: Map<string, any>;

    beforeEach(() => {
      storedGames = new Map();
      mockTx = {
        game: {
          findMany: vi.fn().mockImplementation(async ({ where }: any) => {
            const externalId = where.OR?.[0]?.externalGameId;
            const matches: any[] = [];
            for (const g of storedGames.values()) {
              if (g.externalGameId === externalId || g.externalGameId === `espn_${externalId}`) {
                matches.push(g);
              }
            }
            return matches;
          }),
          create: vi.fn().mockImplementation(async ({ data }: any) => {
            const id = `uuid-${data.externalGameId}`;
            const row = { id, ...data };
            storedGames.set(id, row);
            return row;
          }),
          update: vi.fn().mockImplementation(async ({ where, data }: any) => {
            const existing = storedGames.get(where.id);
            if (!existing) throw new Error('Not found');
            const updated = { ...existing, ...data };
            storedGames.set(where.id, updated);
            return updated;
          }),
        },
        $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string) => {
          if (sql.includes('weekly_slate_manifests')) {
            return [{ to_regclass: 'public.weekly_slate_manifests' }];
          }
          return [];
        }),
      };

      mockDb = {
        $transaction: vi.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };
    });

    it('fails closed when database client lacks $transaction support', async () => {
      const dbWithoutTx = {};
      const observation = validateAndTransformESPNScoreboard(VALID_WEEK7_SCOREBOARD, SAMPLE_WEEK7_SCOPE);

      await expect(
        refreshWeeklySlateInDb(dbWithoutTx as any, {
          seasonYear: 2026,
          seasonType: 2,
          weekNumber: 7,
          operatorId: 'a1111111-1111-1111-1111-111111111111',
          preloadedObservation: observation,
        })
      ).rejects.toThrow('TRANSACTION_UNAVAILABLE');
    });

    it('rejects conflicting duplicate identities with CONFLICTING_GAME_IDENTITY', async () => {
      // Simulate two existing games matching the same externalGameId
      storedGames.set('g1', { id: 'g1', externalGameId: '401873010', status: GameStatus.SCHEDULED });
      storedGames.set('g2', { id: 'g2', externalGameId: 'espn_401873010', status: GameStatus.SCHEDULED });

      const observation = validateAndTransformESPNScoreboard(VALID_WEEK7_SCOREBOARD, SAMPLE_WEEK7_SCOPE);

      await expect(
        refreshWeeklySlateInDb(mockDb, {
          seasonYear: 2026,
          seasonType: 2,
          weekNumber: 7,
          operatorId: 'a1111111-1111-1111-1111-111111111111',
          preloadedObservation: observation,
        })
      ).rejects.toThrow('CONFLICTING_GAME_IDENTITY');
    });

    it('preserves FINAL status and does not regress to SCHEDULED or overwrite valid scores', async () => {
      // Pre-seed an existing FINAL game
      storedGames.set('final-game', {
        id: 'final-game',
        externalGameId: '401873010',
        homeTeamId: 'GB',
        awayTeamId: 'DET',
        kickoffTime: new Date('2026-10-23T00:15:00Z'),
        status: GameStatus.FINAL,
        homeScore: 24,
        awayScore: 21,
      });

      // Incoming observation reports SCHEDULED with null scores
      const observation = validateAndTransformESPNScoreboard(VALID_WEEK7_SCOREBOARD, SAMPLE_WEEK7_SCOPE);
      const result = await refreshWeeklySlateInDb(mockDb, {
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 7,
        operatorId: 'a1111111-1111-1111-1111-111111111111',
        preloadedObservation: observation,
      });

      expect(result.success).toBe(true);
      const updated = storedGames.get('final-game');
      expect(updated.status).toBe(GameStatus.FINAL); // Status did NOT regress
      expect(updated.homeScore).toBe(24); // Score was preserved
      expect(updated.awayScore).toBe(21);
    });

    it('is idempotent when identical manifest observation is refreshed', async () => {
      const observation = validateAndTransformESPNScoreboard(VALID_WEEK7_SCOREBOARD, SAMPLE_WEEK7_SCOPE);

      // Manifest query returns matching fingerprint
      mockTx.$queryRawUnsafe.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT season, season_type, week_number, revision')) {
          return [
            {
              season: 2026,
              season_type: 2,
              week_number: 7,
              revision: 1,
              event_ids: ['401873010', '401873011'],
              accepted_at: new Date().toISOString(),
              accepted_by: 'admin',
              manifest_fingerprint: observation.manifestFingerprint,
              observation_time: new Date().toISOString(),
            },
          ];
        }
        if (sql.includes('weekly_slate_manifests')) {
          return [{ to_regclass: 'public.weekly_slate_manifests' }];
        }
        return [];
      });

      const result = await refreshWeeklySlateInDb(mockDb, {
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 7,
        operatorId: 'a1111111-1111-1111-1111-111111111111',
        preloadedObservation: observation,
      });

      expect(result.success).toBe(true);
      expect(result.revision).toBe(1); // Revision remained 1 (idempotent, no increment)
    });
  });

  describe('3. Dynamic NFL Calendar Across 18 Weeks', () => {
    it('resolves active week for dates in Weeks 7 through 18', () => {
      // Week 7: Oct 21, 2026
      expect(getCurrentNFLWeek(new Date('2026-10-21T12:00:00Z'))).toBe(7);

      // Week 8: Oct 28, 2026
      expect(getCurrentNFLWeek(new Date('2026-10-28T12:00:00Z'))).toBe(8);

      // Week 12: Thanksgiving Nov 26, 2026
      expect(getCurrentNFLWeek(new Date('2026-11-26T18:00:00Z'))).toBe(12);

      // Week 18: Jan 7, 2027
      expect(getCurrentNFLWeek(new Date('2027-01-07T12:00:00Z'))).toBe(18);
    });
  });

  describe('4. Full-Season Ingestion Orchestration', () => {
    it('orchestrates weeks 7..18 using custom fetcher', async () => {
      let mockTx: any;
      let mockDb: any;
      const storedGames = new Map();

      mockTx = {
        game: {
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockImplementation(async ({ data }: any) => {
            const row = { id: `uuid-${data.externalGameId}`, ...data };
            storedGames.set(row.id, row);
            return row;
          }),
          update: vi.fn().mockImplementation(async ({ data }: any) => data),
        },
        $queryRawUnsafe: vi.fn().mockResolvedValue([{ to_regclass: 'public.weekly_slate_manifests' }]),
      };
      mockDb = {
        $transaction: vi.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };

      const customFetch = vi.fn().mockImplementation(async (url: string) => {
        const match = url.match(/week=(\d+)/);
        const wk = match ? parseInt(match[1], 10) : 7;
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({
            season: { year: 2026, type: 2 },
            week: { number: wk },
            events: [
              {
                id: `4018730${wk}0`,
                date: '2026-10-25T17:00:00Z',
                competitions: [
                  {
                    id: `4018730${wk}0`,
                    date: '2026-10-25T17:00:00Z',
                    timeValid: true,
                    competitors: [
                      { homeAway: 'home', team: { abbreviation: 'KC' } },
                      { homeAway: 'away', team: { abbreviation: 'LV' } },
                    ],
                    status: { type: { name: 'STATUS_SCHEDULED', state: 'pre' } },
                  },
                ],
              },
            ],
          }),
        };
      });

      const outcome = await orchestrateFullSeasonImport(mockDb, {
        startWeek: 7,
        endWeek: 18,
        seasonYear: 2026,
        seasonType: 2,
        operatorId: 'admin-uuid',
        customFetch: customFetch as any,
      });

      expect(outcome.success).toBe(true);
      expect(outcome.importedWeeks).toEqual([7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
      expect(outcome.totalGamesUpserted).toBe(12);
      expect(outcome.failedWeeks.length).toBe(0);
    });
  });

  describe('5. Canonical Pool Route & Commissioner Authority Contract', () => {
    it('requires explicit weekNumber and rejects missing week with 400', async () => {
      const { handlePoolSlateRefresh } = await import('../src/routes/ops');

      const req: any = {
        params: { pool_id: '11111111-1111-1111-1111-111111111111' },
        user: { id: 'admin-uuid' },
        body: { season: 2026 }, // Missing weekNumber!
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      // Mock prisma.pool and membership
      const prismaModule = await import('../src/db/client');
      const originalFindUnique = prismaModule.default.pool.findUnique;
      const originalMembership = prismaModule.default.poolMembership.findUnique;

      prismaModule.default.pool.findUnique = vi.fn().mockResolvedValue({
        id: '11111111-1111-1111-1111-111111111111',
        adminId: 'admin-uuid',
      }) as any;
      prismaModule.default.poolMembership.findUnique = vi.fn().mockResolvedValue({
        poolId: '11111111-1111-1111-1111-111111111111',
        userId: 'admin-uuid',
        status: 'ACTIVE',
      }) as any;

      try {
        await handlePoolSlateRefresh(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({ error: expect.stringContaining('EXPLICIT_WEEK_REQUIRED') })
        );
      } finally {
        prismaModule.default.pool.findUnique = originalFindUnique;
        prismaModule.default.poolMembership.findUnique = originalMembership;
      }
    });

    it('denies non-commissioner active members with HTTP 403', async () => {
      const { handlePoolSlateRefresh } = await import('../src/routes/ops');

      const req: any = {
        params: { pool_id: '11111111-1111-1111-1111-111111111111' },
        user: { id: 'regular-member-uuid' },
        body: { season: 2026, weekNumber: 7 },
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      const prismaModule = await import('../src/db/client');
      const originalFindUnique = prismaModule.default.pool.findUnique;
      const originalMembership = prismaModule.default.poolMembership.findUnique;

      prismaModule.default.pool.findUnique = vi.fn().mockResolvedValue({
        id: '11111111-1111-1111-1111-111111111111',
        adminId: 'real-commissioner-uuid', // Different from caller!
      }) as any;
      prismaModule.default.poolMembership.findUnique = vi.fn().mockResolvedValue({
        poolId: '11111111-1111-1111-1111-111111111111',
        userId: 'regular-member-uuid',
        status: 'ACTIVE',
      }) as any;

      try {
        await handlePoolSlateRefresh(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({ error: expect.stringContaining('FORBIDDEN_COMMISSIONER_REQUIRED') })
        );
      } finally {
        prismaModule.default.pool.findUnique = originalFindUnique;
        prismaModule.default.poolMembership.findUnique = originalMembership;
      }
    });
  });
});
