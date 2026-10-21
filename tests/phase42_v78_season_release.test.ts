import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameStatus } from '@prisma/client';
import {
  validateAndTransformESPNScoreboard,
  computeManifestFingerprint,
  refreshWeeklySlateInDb,
  orchestrateFullSeasonImport,
} from '../src/services/authoritativeSlateService';
import { getCurrentNFLWeek } from '../client/src/services/nflCalendarService';
import { resolveLionsTiebreaker, parseArgs, runSeasonImport } from '../scripts/season_import_cli';

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

  describe('1. ESPN Provider TBD / Unconfirmed Kickoff Detection (No Fabricated Date)', () => {
    it('marks games with timeValid=false or status detail TBD as isKickoffConfirmed=false without fabricated date', () => {
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

  describe('2. Parameterized SQL Adapter & Atomic Persistence Contract', () => {
    let mockTx: any;
    let mockDb: any;
    let storedGames: Map<string, any>;
    let storedManifests: Map<string, any>;

    beforeEach(() => {
      storedGames = new Map();
      storedManifests = new Map();

      mockTx = {
        $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string, ...params: any[]) => {
          // Table check
          if (sql.includes("to_regclass('public.weekly_slate_manifests')")) {
            return [{ to_regclass: 'public.weekly_slate_manifests' }];
          }

          // Pool row check
          if (sql.includes('SELECT id, admin_id FROM public.pools')) {
            const poolId = params[0];
            return [{ id: poolId, admin_id: 'a1111111-1111-1111-1111-111111111111' }];
          }

          // Pool membership check
          if (sql.includes('SELECT status FROM public.pool_memberships')) {
            return [{ status: 'ACTIVE' }];
          }

          // Query prior manifest
          if (sql.includes('SELECT season, season_type, week_number, revision, event_ids')) {
            const key = `${params[0]}-${params[1]}-${params[2]}`;
            const m = storedManifests.get(key);
            return m ? [m] : [];
          }

          // Read back manifest verification
          if (sql.includes('SELECT season, season_type, week_number, revision, manifest_fingerprint')) {
            const key = `${params[0]}-${params[1]}-${params[2]}`;
            const m = storedManifests.get(key);
            return m ? [m] : [];
          }

          // Lookup existing games by externalGameId
          if (sql.includes('SELECT id, external_game_id, home_team_id, away_team_id')) {
            const extId1 = params[0];
            const extId2 = params[1];
            const matches: any[] = [];
            for (const g of storedGames.values()) {
              if (g.external_game_id === extId1 || g.external_game_id === extId2) {
                matches.push(g);
              }
            }
            return matches;
          }

          // INSERT into public.games
          if (sql.includes('INSERT INTO public.games')) {
            const externalGameId = params[0];
            const row = {
              id: `uuid-${externalGameId}`,
              external_game_id: externalGameId,
              home_team_id: params[1],
              away_team_id: params[2],
              kickoff_time: params[3],
              status: params[4],
              home_score: params[5],
              away_score: params[6],
              canonical_kickoff_time: params[7],
              lock_effective_at: params[8],
              season: params[9],
              season_type: params[10],
              week: params[11],
              observation_time: params[12],
              manifest_revision: params[13],
            };
            storedGames.set(row.id, row);
            return [row];
          }

          // UPDATE public.games
          if (sql.includes('UPDATE public.games')) {
            const gameId = params[13];
            const existing = storedGames.get(gameId);
            if (!existing) throw new Error('Game not found');
            const updated = {
              ...existing,
              home_team_id: params[0],
              away_team_id: params[1],
              kickoff_time: params[2],
              status: params[3],
              home_score: params[4],
              away_score: params[5],
              canonical_kickoff_time: params[6],
              lock_effective_at: params[7],
              season: params[8],
              season_type: params[9],
              week: params[10],
              observation_time: params[11],
              manifest_revision: params[12],
            };
            storedGames.set(gameId, updated);
            return [updated];
          }

          return [];
        }),

        $executeRawUnsafe: vi.fn().mockImplementation(async (sql: string, ...params: any[]) => {
          if (sql.includes('INSERT INTO public.weekly_slate_manifests')) {
            const key = `${params[0]}-${params[1]}-${params[2]}`;
            const m = {
              season: params[0],
              season_type: params[1],
              week_number: params[2],
              revision: params[3],
              event_ids: params[4],
              accepted_at: new Date().toISOString(),
              accepted_by: params[5],
              manifest_fingerprint: params[6],
              observation_time: params[7],
            };
            storedManifests.set(key, m);
            return 1;
          }
          return 0;
        }),
      };

      mockDb = {
        $transaction: vi.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };
    });

    it('persists all 16 deployed columns into public.games via parameterized adapter', async () => {
      const observation = validateAndTransformESPNScoreboard(VALID_WEEK7_SCOREBOARD, SAMPLE_WEEK7_SCOPE);
      const result = await refreshWeeklySlateInDb(mockDb, {
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 7,
        operatorId: 'a1111111-1111-1111-1111-111111111111',
        preloadedObservation: observation,
      });

      expect(result.success).toBe(true);
      expect(result.eventCount).toBe(2);

      // Verify that all 16 deployed columns were populated
      const savedGame = Array.from(storedGames.values())[0];
      expect(savedGame.id).toBeDefined();
      expect(savedGame.external_game_id).toBe('401873010');
      expect(savedGame.home_team_id).toBe('GB');
      expect(savedGame.away_team_id).toBe('DET');
      expect(savedGame.kickoff_time).toBeDefined();
      expect(savedGame.status).toBe(GameStatus.SCHEDULED);
      expect(savedGame.season).toBe(2026);
      expect(savedGame.season_type).toBe(2);
      expect(savedGame.week).toBe(7);
      expect(savedGame.canonical_kickoff_time).toBeDefined();
      expect(savedGame.lock_effective_at).toBeDefined();
      expect(savedGame.observation_time).toBeDefined();
      expect(savedGame.manifest_revision).toBe(1);
    });

    it('fails closed when manifest table is missing', async () => {
      mockTx.$queryRawUnsafe.mockImplementation(async (sql: string) => {
        if (sql.includes("to_regclass('public.weekly_slate_manifests')")) {
          return [{ to_regclass: null }];
        }
        return [];
      });

      const observation = validateAndTransformESPNScoreboard(VALID_WEEK7_SCOREBOARD, SAMPLE_WEEK7_SCOPE);
      await expect(
        refreshWeeklySlateInDb(mockDb, {
          seasonYear: 2026,
          seasonType: 2,
          weekNumber: 7,
          operatorId: 'a1111111-1111-1111-1111-111111111111',
          preloadedObservation: observation,
        })
      ).rejects.toThrow('MANIFEST_TABLE_MISSING');
    });

    it('rejects team identity mutations on existing baseline rows with TEAM_IDENTITY_MUTATION_FORBIDDEN', async () => {
      // Pre-seed baseline row for 401873010 with GB vs DET
      storedGames.set('g1', {
        id: 'g1',
        external_game_id: '401873010',
        home_team_id: 'GB',
        away_team_id: 'DET',
        kickoff_time: new Date('2026-10-23T00:15:00Z'),
        status: GameStatus.SCHEDULED,
      });

      // Construct rogue observation attempting to change DET to CHI
      const rogueScoreboard = {
        season: { year: 2026, type: 2 },
        week: { number: 7 },
        events: [
          {
            id: '401873010',
            date: '2026-10-23T00:15:00Z',
            competitions: [
              {
                id: '401873010',
                date: '2026-10-23T00:15:00Z',
                timeValid: true,
                competitors: [
                  { homeAway: 'home', team: { abbreviation: 'GB' } },
                  { homeAway: 'away', team: { abbreviation: 'CHI' } }, // MUTATED TEAM!
                ],
                status: { type: { name: 'STATUS_SCHEDULED', state: 'pre' } },
              },
            ],
          },
        ],
      };

      const observation = validateAndTransformESPNScoreboard(rogueScoreboard, SAMPLE_WEEK7_SCOPE);
      await expect(
        refreshWeeklySlateInDb(mockDb, {
          seasonYear: 2026,
          seasonType: 2,
          weekNumber: 7,
          operatorId: 'a1111111-1111-1111-1111-111111111111',
          preloadedObservation: observation,
        })
      ).rejects.toThrow('TEAM_IDENTITY_MUTATION_FORBIDDEN');
    });

    it('enforces earliest flex lock: tightens deadline if game moved earlier, does NOT extend if flexed later', async () => {
      // Baseline game scheduled for Sunday at 17:00Z (5:00 PM UTC)
      const sundayTime = new Date('2026-10-25T17:00:00.000Z');
      storedGames.set('flex-game', {
        id: 'flex-game',
        external_game_id: '401873011',
        home_team_id: 'SF',
        away_team_id: 'DAL',
        kickoff_time: sundayTime,
        canonical_kickoff_time: sundayTime.toISOString(),
        lock_effective_at: sundayTime.toISOString(),
        status: GameStatus.SCHEDULED,
      });

      // Test A: Flexed LATER to Sunday Night 20:20Z (8:20 PM UTC)
      const laterScoreboard = {
        season: { year: 2026, type: 2 },
        week: { number: 7 },
        events: [
          {
            id: '401873011',
            date: '2026-10-25T20:20:00.000Z',
            competitions: [
              {
                id: '401873011',
                date: '2026-10-25T20:20:00.000Z',
                timeValid: true,
                competitors: [
                  { homeAway: 'home', team: { abbreviation: 'SF' } },
                  { homeAway: 'away', team: { abbreviation: 'DAL' } },
                ],
                status: { type: { name: 'STATUS_SCHEDULED', state: 'pre' } },
              },
            ],
          },
        ],
      };

      const observationLater = validateAndTransformESPNScoreboard(laterScoreboard, SAMPLE_WEEK7_SCOPE);
      await refreshWeeklySlateInDb(mockDb, {
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 7,
        operatorId: 'a1111111-1111-1111-1111-111111111111',
        preloadedObservation: observationLater,
      });

      const updatedAfterLater = storedGames.get('flex-game');
      // Canonical kickoff updated to later time:
      expect(new Date(updatedAfterLater.canonical_kickoff_time).toISOString()).toBe('2026-10-25T20:20:00.000Z');
      // BUT effective lock deadline NEVER EXTENDS: remains at earlier 17:00Z!
      expect(new Date(updatedAfterLater.lock_effective_at).toISOString()).toBe('2026-10-25T17:00:00.000Z');

      // Test B: Flexed EARLIER to Thursday night 2026-10-22T00:15:00Z
      const earlierScoreboard = {
        season: { year: 2026, type: 2 },
        week: { number: 7 },
        events: [
          {
            id: '401873011',
            date: '2026-10-22T00:15:00.000Z',
            competitions: [
              {
                id: '401873011',
                date: '2026-10-22T00:15:00.000Z',
                timeValid: true,
                competitors: [
                  { homeAway: 'home', team: { abbreviation: 'SF' } },
                  { homeAway: 'away', team: { abbreviation: 'DAL' } },
                ],
                status: { type: { name: 'STATUS_SCHEDULED', state: 'pre' } },
              },
            ],
          },
        ],
      };

      const observationEarlier = validateAndTransformESPNScoreboard(earlierScoreboard, SAMPLE_WEEK7_SCOPE);
      await refreshWeeklySlateInDb(mockDb, {
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 7,
        operatorId: 'a1111111-1111-1111-1111-111111111111',
        preloadedObservation: observationEarlier,
      });

      const updatedAfterEarlier = storedGames.get('flex-game');
      // Lock deadline tightens to earlier kickoff!
      expect(new Date(updatedAfterEarlier.lock_effective_at).toISOString()).toBe('2026-10-22T00:15:00.000Z');
    });

    it('persists TBD games with null canonical kickoff and epoch lock sentinel', async () => {
      const tbdScoreboard = {
        season: { year: 2026, type: 2 },
        week: { number: 7 },
        events: [
          {
            id: '401873099',
            date: '2026-10-25T00:00:00Z',
            competitions: [
              {
                id: '401873099',
                date: '2026-10-25T00:00:00Z',
                timeValid: false, // Unconfirmed
                competitors: [
                  { homeAway: 'home', team: { abbreviation: 'KC' } },
                  { homeAway: 'away', team: { abbreviation: 'LV' } },
                ],
                status: { type: { name: 'STATUS_SCHEDULED', state: 'pre', detail: 'TBD' } },
              },
            ],
          },
        ],
      };

      const observation = validateAndTransformESPNScoreboard(tbdScoreboard, SAMPLE_WEEK7_SCOPE);
      await refreshWeeklySlateInDb(mockDb, {
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 7,
        operatorId: 'a1111111-1111-1111-1111-111111111111',
        preloadedObservation: observation,
      });

      const tbdGame = storedGames.get('uuid-401873099');
      expect(tbdGame.canonical_kickoff_time).toBeNull();
      // Lock effective at epoch (1970) which locks game unconditionally under DB trigger:
      expect(new Date(tbdGame.lock_effective_at).getTime()).toBe(0);
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

  describe('4. Full-Season Ingestion & Tiebreaker CLI Contract', () => {
    it('resolves DEFAULT_LIONS when Lions play and COMMISSIONER_SELECTION_REQUIRED when bye', () => {
      const observationWithLions = validateAndTransformESPNScoreboard(VALID_WEEK7_SCOREBOARD, SAMPLE_WEEK7_SCOPE);
      const lionsResult = resolveLionsTiebreaker(observationWithLions.events);
      expect(lionsResult.designation).toBe('DEFAULT_LIONS');
      expect(lionsResult.matchup).toBe('DET @ GB');
      expect(lionsResult.gameId).toBe('401873010');

      // Slate without Lions (bye week)
      const slateWithoutLions = [
        {
          externalGameId: '401873099',
          homeTeamId: 'KC',
          awayTeamId: 'LV',
        } as any,
      ];
      const byeResult = resolveLionsTiebreaker(slateWithoutLions);
      expect(byeResult.designation).toBe('COMMISSIONER_SELECTION_REQUIRED');
      expect(byeResult.matchup).toBe('BYE_WEEK');
      expect(byeResult.gameId).toBeNull();
    });

    it('executes season import dry-run cleanly without DB writes', async () => {
      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
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
                timeValid: true,
                competitions: [
                  {
                    id: `4018730${wk}0`,
                    date: '2026-10-25T17:00:00Z',
                    timeValid: true,
                    competitors: [
                      { homeAway: 'home', team: { abbreviation: 'KC' } },
                      { homeAway: 'away', team: { abbreviation: 'DET' } },
                    ],
                    status: { type: { name: 'STATUS_SCHEDULED', state: 'pre' } },
                  },
                ],
              },
            ],
          }),
        };
      });

      const options = parseArgs(['--dry-run', '--start', '7', '--end', '10']);
      const outcome = await runSeasonImport(options, mockFetch as any);

      expect(outcome.success).toBe(true);
      expect(outcome.mode).toBe('DRY_RUN');
      expect(outcome.weeksProcessed).toEqual([7, 8, 9, 10]);
      expect(outcome.totalGames).toBe(4);
      expect(outcome.tiebreakerConfig['7'].designation).toBe('DEFAULT_LIONS');
    });
  });

  describe('5. Canonical Pool Route & Commissioner Authority Contract', () => {
    it('rejects fractional weeks with HTTP 400 INVALID_WEEK', async () => {
      const { handlePoolSlateRefresh } = await import('../src/routes/ops');

      const req: any = {
        params: { pool_id: '11111111-1111-1111-1111-111111111111' },
        user: { id: 'admin-uuid' },
        body: { season: 2026, weekNumber: 7.5 }, // Fractional week!
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
          expect.objectContaining({ error: expect.stringContaining('INVALID_WEEK') })
        );
      } finally {
        prismaModule.default.pool.findUnique = originalFindUnique;
        prismaModule.default.poolMembership.findUnique = originalMembership;
      }
    });

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
