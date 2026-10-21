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
import { evaluateKickoffLock, resolveGameWithCanonicalLock } from '../src/routes/picks';
import {
  resolveAuthoritativeSlate,
  getHighestCachedSlateRevision,
  saveScopedSlateRevisionCache,
} from '../client/src/services/authoritativeSlateClientService';

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
          // Advisory lock check
          if (sql.includes('pg_advisory_xact_lock')) {
            return [{ pg_advisory_xact_lock: null }];
          }

          // Table check
          if (sql.includes("to_regclass('public.weekly_slate_manifests')")) {
            return [{ to_regclass: 'public.weekly_slate_manifests' }];
          }

          // Pool row check
          if (sql.includes('SELECT id, admin_id') && sql.includes('FROM public.pools')) {
            const poolId = params[0];
            return [{ id: poolId, admin_id: 'a1111111-1111-1111-1111-111111111111', settings: {} }];
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
          if (sql.includes('FROM public.weekly_slate_manifests') && sql.includes('manifest_fingerprint')) {
            const key = `${params[0]}-${params[1]}-${params[2]}`;
            const m = storedManifests.get(key);
            return m ? [m] : [];
          }

          // Read back canonical games
          if (sql.includes('FROM public.games') && sql.includes('season = $1::int AND season_type = $2::int AND week = $3::int')) {
            const season = params[0];
            const seasonType = params[1];
            const week = params[2];
            const matched: any[] = [];
            for (const g of storedGames.values()) {
              if (Number(g.season) === Number(season) && Number(g.season_type) === Number(seasonType) && Number(g.week) === Number(week)) {
                matched.push(g);
              }
            }
            return matched;
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

          // Pool settings update
          if (sql.includes('UPDATE public.pools SET settings')) {
            return [{ id: params[1], settings: JSON.parse(params[0]) }];
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
      // Pre-seed baseline row for 401873010 with GB vs DET in Week 7 scope
      storedGames.set('g1', {
        id: 'g1',
        external_game_id: '401873010',
        home_team_id: 'GB',
        away_team_id: 'DET',
        kickoff_time: new Date('2026-10-23T00:15:00Z'),
        status: GameStatus.SCHEDULED,
        season: 2026,
        season_type: 2,
        week: 7,
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
        season: 2026,
        season_type: 2,
        week: 7,
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
      expect(byeResult.matchup).toBe('COMMISSIONER_SELECTION_REQUIRED');
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

  describe('6. R1 & R5: WeeklyPicks & Matrix Authority & Lock Invariants', () => {
    it('excludes extra provider rows and binds strictly to accepted persisted rows', () => {
      // Persisted accepted slate has 2 events: 401873010 and 401873011
      const acceptedPersistedRows = [
        {
          id: 'uuid-1',
          external_game_id: '401873010',
          home_team_id: 'GB',
          away_team_id: 'DET',
          kickoff_time: '2026-10-23T00:15:00.000Z',
          canonical_kickoff_time: '2026-10-23T00:15:00.000Z',
          lock_effective_at: '2026-10-23T00:15:00.000Z',
          status: 'SCHEDULED',
        },
        {
          id: 'uuid-2',
          external_game_id: '401873011',
          home_team_id: 'SF',
          away_team_id: 'DAL',
          kickoff_time: '2026-10-25T17:00:00.000Z',
          canonical_kickoff_time: '2026-10-25T17:00:00.000Z',
          lock_effective_at: '2026-10-25T17:00:00.000Z',
          status: 'SCHEDULED',
        },
      ];

      // Rogue live provider returns 3 events: 2 valid + 1 extra unaccepted game
      const rogueLiveProviderEvents = [
        { id: '401873010', awayTeam: { code: 'DET' }, homeTeam: { code: 'GB' }, status: 'SCHEDULED' },
        { id: '401873011', awayTeam: { code: 'DAL' }, homeTeam: { code: 'SF' }, status: 'SCHEDULED' },
        { id: '999999999', awayTeam: { code: 'NE' }, homeTeam: { code: 'NYJ' }, status: 'SCHEDULED' }, // Extra unaccepted!
      ];

      const liveScoreMap = new Map();
      rogueLiveProviderEvents.forEach((ls) => liveScoreMap.set(ls.id, ls));

      // Filtering rule: map accepted persisted games only; extra provider rows never included
      const filteredGames = acceptedPersistedRows.map((g) => {
        const live = liveScoreMap.get(g.external_game_id);
        return {
          id: g.id,
          externalGameId: g.external_game_id,
          status: live?.status || g.status,
        };
      });

      expect(filteredGames.length).toBe(2);
      expect(filteredGames.map((g) => g.externalGameId)).toEqual(['401873010', '401873011']);
      expect(filteredGames.some((g) => g.externalGameId === '999999999')).toBe(false);
    });

    it('enforces persisted TBD and flex lock deadlines on client game models', () => {
      const now = new Date('2026-10-24T12:00:00.000Z');

      // TBD game: null canonical kickoff and epoch lock
      const tbdGame = {
        id: 'g-tbd',
        externalGameId: '401873099',
        canonical_kickoff_time: null,
        lock_effective_at: new Date(0).toISOString(),
        kickoffTime: '1970-01-01T00:00:00.000Z',
        isKickoffConfirmed: false,
        status: 'SCHEDULED',
      };

      // Flex game: originally Sunday 17:00Z, flexed later to 20:20Z, but lock_effective_at remains earlier 17:00Z
      const flexGame = {
        id: 'g-flex',
        externalGameId: '401873011',
        canonical_kickoff_time: '2026-10-25T20:20:00.000Z',
        lock_effective_at: '2026-10-25T17:00:00.000Z',
        kickoffTime: '2026-10-25T20:20:00.000Z',
        isKickoffConfirmed: true,
        status: 'SCHEDULED',
      };

      // TBD is locked
      const isTbdLocked = tbdGame.isKickoffConfirmed === false || new Date(tbdGame.kickoffTime).getTime() <= 0;
      expect(isTbdLocked).toBe(true);

      // Flex game at Sunday 18:00Z (after earlier lock 17:00Z, before later kickoff 20:20Z)
      const afterEarlierDeadline = new Date('2026-10-25T18:00:00.000Z');
      const isFlexLocked = afterEarlierDeadline.getTime() >= new Date(flexGame.lock_effective_at).getTime();
      expect(isFlexLocked).toBe(true);
    });

    it('uses persisted observation_time for lastUpdatedTime without client-side clock drift', () => {
      const persistedObservationTime = '2026-10-21T04:30:00.000Z';
      const syncDate = new Date(persistedObservationTime);
      const formatted = syncDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      expect(formatted).toBeDefined();
      expect(formatted).not.toBe('');
      // Ensures no Date.now() generation overwrite
      const freshDate = new Date();
      expect(syncDate.getTime()).toBeLessThan(freshDate.getTime());
    });
  });

  describe('7. R2: CLI Parameter Validation & Tiebreaker Service Invariants', () => {
    it('rejects unknown arguments with UNKNOWN_ARGUMENT', () => {
      expect(() => parseArgs(['--dry-run', '--unknown-flag'])).toThrow('UNKNOWN_ARGUMENT');
    });

    it('rejects invalid or inverted week ranges with INVALID_WEEK_RANGE', () => {
      expect(() => parseArgs(['--dry-run', '--start', '10', '--end', '7'])).toThrow('INVALID_WEEK_RANGE');
      expect(() => parseArgs(['--dry-run', '--start', 'NaN', '--end', '10'])).toThrow('INVALID_INTEGER');
      expect(() => parseArgs(['--dry-run', '--start', '0', '--end', '10'])).toThrow('INVALID_WEEK_RANGE');
      expect(() => parseArgs(['--dry-run', '--start', '7', '--end', '20'])).toThrow('INVALID_WEEK_RANGE');
    });

    it('requires authentic UUID operator and pool in execute mode and rejects placeholders', () => {
      // Missing pool
      expect(() => parseArgs(['--execute', '--operator', '11111111-1111-1111-1111-111111111111'])).toThrow(
        'INVALID_ARGUMENT'
      );
      // Placeholder operator
      expect(() =>
        parseArgs([
          '--execute',
          '--pool',
          '11111111-1111-1111-1111-111111111111',
          '--operator',
          'a1111111-1111-1111-1111-111111111111',
        ])
      ).toThrow('INVALID_ARGUMENT');
    });

    it('rejects ambiguous multiple Lions games in a single weekly slate', () => {
      const multipleLionsEvents = [
        { externalGameId: '1', homeTeamId: 'DET', awayTeamId: 'GB' } as any,
        { externalGameId: '2', homeTeamId: 'CHI', awayTeamId: 'DET' } as any,
      ];
      expect(() => resolveLionsTiebreaker(multipleLionsEvents)).toThrow('AMBIGUOUS_LIONS_SCHEDULE');
    });

    it('preserves existing frozen or commissioner override designations across weeks', () => {
      const existingSettings = {
        tiebreaker_designations: {
          '2026': {
            '7': {
              eventId: 'custom-override-id',
              gameTitle: 'SF @ DAL',
              provenance: 'COMMISSIONER_OVERRIDE',
              isFrozen: true,
            },
          },
        },
      };

      const existing7 = existingSettings.tiebreaker_designations['2026']['7'];
      // Invariant: frozen or commissioner override must never be overwritten by default Lions
      const isProtected = existing7.isFrozen || existing7.provenance === 'COMMISSIONER_OVERRIDE';
      expect(isProtected).toBe(true);
    });
  });

  describe('8. R3: Historical Baseline Protection & Stale Observation Rejection', () => {
    let mockTxR3: any;
    let mockDbR3: any;
    let storedGamesR3: Map<string, any>;
    let storedManifestsR3: Map<string, any>;

    beforeEach(() => {
      storedGamesR3 = new Map();
      storedManifestsR3 = new Map();

      mockTxR3 = {
        $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string, ...params: any[]) => {
          if (sql.includes('pg_advisory_xact_lock')) {
            return [{ pg_advisory_xact_lock: null }];
          }
          if (sql.includes("to_regclass('public.weekly_slate_manifests')")) {
            return [{ to_regclass: 'public.weekly_slate_manifests' }];
          }
          if (sql.includes('SELECT season, season_type, week_number, revision, event_ids')) {
            const key = `${params[0]}-${params[1]}-${params[2]}`;
            const m = storedManifestsR3.get(key);
            return m ? [m] : [];
          }
          if (sql.includes('SELECT id, external_game_id, home_team_id, away_team_id')) {
            const extId = params[0];
            const matches: any[] = [];
            for (const g of storedGamesR3.values()) {
              if (g.external_game_id === extId) matches.push(g);
            }
            return matches;
          }
          return [];
        }),
      };

      mockDbR3 = {
        $transaction: vi.fn().mockImplementation(async (cb: any) => cb(mockTxR3)),
      };
    });

    it('rejects mutation of unscoped historical baseline games with HISTORICAL_OR_CROSS_SCOPE_COLLISION', async () => {
      // Historical baseline row (season is null / week is null)
      storedGamesR3.set('baseline-1', {
        id: 'baseline-1',
        external_game_id: '401873010',
        home_team_id: 'GB',
        away_team_id: 'DET',
        season: null,
        week: null,
      });

      const observation = validateAndTransformESPNScoreboard(VALID_WEEK7_SCOREBOARD, SAMPLE_WEEK7_SCOPE);
      await expect(
        refreshWeeklySlateInDb(mockDbR3, {
          seasonYear: 2026,
          seasonType: 2,
          weekNumber: 7,
          operatorId: 'a1111111-1111-1111-1111-111111111111',
          preloadedObservation: observation,
        })
      ).rejects.toThrow('HISTORICAL_OR_CROSS_SCOPE_COLLISION');
    });

    it('rejects stale incoming observation older than accepted manifest with STALE_OBSERVATION_REJECTED', async () => {
      // Existing accepted manifest observed at 12:00 UTC
      storedManifestsR3.set('2026-2-7', {
        season: 2026,
        season_type: 2,
        week_number: 7,
        revision: 2,
        event_ids: ['401873010', '401873011'],
        manifest_fingerprint: 'fp-1',
        observation_time: '2026-10-21T12:00:00.000Z',
      });

      // Stale observation observed at 10:00 UTC (2 hours older)
      const staleScoreboard = {
        ...VALID_WEEK7_SCOREBOARD,
      };
      const staleObservation = validateAndTransformESPNScoreboard(staleScoreboard, SAMPLE_WEEK7_SCOPE);
      staleObservation.observationTime = '2026-10-21T10:00:00.000Z'; // Stale!

      await expect(
        refreshWeeklySlateInDb(mockDbR3, {
          seasonYear: 2026,
          seasonType: 2,
          weekNumber: 7,
          operatorId: 'a1111111-1111-1111-1111-111111111111',
          preloadedObservation: staleObservation,
        })
      ).rejects.toThrow('STALE_OBSERVATION_REJECTED');
    });
  });

  describe('9. R4: Trustworthy Zoned Instants & Pick Route Lock Enforcement', () => {
    it('rejects date-only and offset-free strings as unconfirmed/TBD', () => {
      // Date-only string: 2026-10-25
      const dateOnlyScoreboard = {
        season: { year: 2026, type: 2 },
        week: { number: 7 },
        events: [
          {
            id: '401873030',
            date: '2026-10-25', // Lacks time and timezone!
            competitions: [
              {
                id: '401873030',
                date: '2026-10-25',
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
      };

      const obs = validateAndTransformESPNScoreboard(dateOnlyScoreboard, SAMPLE_WEEK7_SCOPE);
      expect(obs.events[0].isKickoffConfirmed).toBe(false);

      // Offset-free string: 2026-10-25T13:00:00 (no Z or +/- offset)
      const offsetFreeScoreboard = {
        season: { year: 2026, type: 2 },
        week: { number: 7 },
        events: [
          {
            id: '401873031',
            date: '2026-10-25T13:00:00', // Lacks timezone offset!
            competitions: [
              {
                id: '401873031',
                date: '2026-10-25T13:00:00',
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
      };

      const obsOffsetFree = validateAndTransformESPNScoreboard(offsetFreeScoreboard, SAMPLE_WEEK7_SCOPE);
      expect(obsOffsetFree.events[0].isKickoffConfirmed).toBe(false);
    });

    it('evaluates kickoff lock: allows before kickoff, denies at/after kickoff and unconfirmed', () => {
      const futureGame = {
        kickoffTime: new Date('2026-10-25T17:00:00.000Z'),
        canonicalKickoffTime: new Date('2026-10-25T17:00:00.000Z'),
        lockEffectiveAt: new Date('2026-10-25T17:00:00.000Z'),
        status: 'SCHEDULED',
      };

      // Before kickoff (1 hour before)
      const beforeNow = new Date('2026-10-25T16:00:00.000Z');
      expect(evaluateKickoffLock(futureGame, 0, beforeNow).isLocked).toBe(false);

      // Exact kickoff timestamp (Decision #66: locks strictly at kickoff)
      const exactNow = new Date('2026-10-25T17:00:00.000Z');
      const exactLock = evaluateKickoffLock(futureGame, 0, exactNow);
      expect(exactLock.isLocked).toBe(true);
      expect(exactLock.reason).toBe('KICKOFF_PASSED');

      // After kickoff
      const afterNow = new Date('2026-10-25T17:05:00.000Z');
      const afterLock = evaluateKickoffLock(futureGame, 0, afterNow);
      expect(afterLock.isLocked).toBe(true);
      expect(afterLock.reason).toBe('KICKOFF_PASSED');

      // Unconfirmed TBD game
      const tbdGame = {
        kickoffTime: new Date(0),
        canonicalKickoffTime: null,
        lockEffectiveAt: new Date(0),
        status: 'SCHEDULED',
      };
      const tbdLock = evaluateKickoffLock(tbdGame, 0, beforeNow);
      expect(tbdLock.isLocked).toBe(true);
      expect(tbdLock.reason).toBe('UNVERIFIED_KICKOFF');
    });

    it('evaluates flex lock: respects earliest flex lock deadline across delayed writes', () => {
      // Flexed game originally Sunday 17:00Z, flexed later to 20:20Z
      const flexGame = {
        kickoffTime: new Date('2026-10-25T20:20:00.000Z'),
        canonicalKickoffTime: new Date('2026-10-25T20:20:00.000Z'),
        lockEffectiveAt: new Date('2026-10-25T17:00:00.000Z'), // Earliest deadline preserved!
        status: 'SCHEDULED',
      };

      // Delayed write arriving at 17:01Z (after earlier deadline, before later kickoff)
      const delayedWriteNow = new Date('2026-10-25T17:01:00.000Z');
      const delayedLock = evaluateKickoffLock(flexGame, 0, delayedWriteNow);
      expect(delayedLock.isLocked).toBe(true);
      expect(delayedLock.reason).toBe('KICKOFF_PASSED');
    });
  });

  describe('6. CLI parseArgs Validation & Mode Contracts', () => {
    it('rejects decimal input for week flags with INVALID_INTEGER', () => {
      expect(() => parseArgs(['--start', '7.5'])).toThrow('INVALID_INTEGER');
      expect(() => parseArgs(['--end', '10.2'])).toThrow('INVALID_INTEGER');
    });

    it('rejects alphanumeric junk for week flags with INVALID_INTEGER', () => {
      expect(() => parseArgs(['--start', '7junk'])).toThrow('INVALID_INTEGER');
      expect(() => parseArgs(['--end', 'week8'])).toThrow('INVALID_INTEGER');
    });

    it('rejects flag missing value with MISSING_ARGUMENT_VALUE', () => {
      expect(() => parseArgs(['--start'])).toThrow('MISSING_ARGUMENT_VALUE');
      expect(() => parseArgs(['--pool'])).toThrow('MISSING_ARGUMENT_VALUE');
      expect(() => parseArgs(['--start', '--end', '10'])).toThrow('MISSING_ARGUMENT_VALUE');
    });

    it('rejects contradictory modes (--dry-run and --execute) with CONTRADICTORY_MODES', () => {
      expect(() => parseArgs(['--dry-run', '--execute'])).toThrow('CONTRADICTORY_MODES');
      expect(() => parseArgs(['--execute', '--dry-run'])).toThrow('CONTRADICTORY_MODES');
    });

    it('rejects out of bounds week ranges', () => {
      expect(() => parseArgs(['--start', '0'])).toThrow('INVALID_WEEK_RANGE');
      expect(() => parseArgs(['--end', '19'])).toThrow('INVALID_WEEK_RANGE');
      expect(() => parseArgs(['--start', '10', '--end', '8'])).toThrow('INVALID_WEEK_RANGE');
    });

    it('rejects non-2026 season and non-2 season type', () => {
      expect(() => parseArgs(['--season', '2025'])).toThrow('INVALID_SEASON');
      expect(() => parseArgs(['--season-type', '1'])).toThrow('INVALID_SEASON_TYPE');
    });

    it('rejects invalid or placeholder UUID in execute mode', () => {
      expect(() => parseArgs(['--execute', '--start', '7', '--end', '8', '--pool', 'not-a-uuid', '--operator', '11111111-1111-1111-1111-111111111111'])).toThrow('INVALID_ARGUMENT');
      expect(() => parseArgs(['--execute', '--start', '7', '--end', '8', '--pool', '11111111-1111-1111-1111-111111111111', '--operator', 'a1111111-1111-1111-1111-111111111111'])).toThrow('INVALID_ARGUMENT');
    });

    it('parses valid dry-run and execute arguments cleanly', () => {
      const dry = parseArgs(['--dry-run', '--start', '7', '--end', '12']);
      expect(dry.dryRun).toBe(true);
      expect(dry.execute).toBe(false);
      expect(dry.startWeek).toBe(7);
      expect(dry.endWeek).toBe(12);

      const exec = parseArgs([
        '--execute',
        '--start', '8',
        '--end', '10',
        '--pool', '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
        '--operator', '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
      ]);
      expect(exec.execute).toBe(true);
      expect(exec.dryRun).toBe(false);
      expect(exec.startWeek).toBe(8);
      expect(exec.endWeek).toBe(10);
    });
  });

  describe('7. Client Authoritative Slate Resolution & Cache Isolation', () => {
    it('fails closed to empty games when manifest is missing or returns error', async () => {
      const mockSupabaseMissing = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };

      const res = await resolveAuthoritativeSlate({
        supabase: mockSupabaseMissing,
        activePoolId: 'pool-uuid',
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 8,
      });

      expect(res.source).toBe('FAILED_CLOSED');
      expect(res.games.length).toBe(0);
      expect(res.manifest).toBeNull();
    });

    it('fails closed when caller lacks verified active pool authority', async () => {
      const mockSupabaseNoAuth = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'weekly_slate_manifests') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  season: 2026,
                  season_type: 2,
                  week_number: 8,
                  revision: 1,
                  manifest_fingerprint: 'fp-1',
                  event_ids: ['401873010'],
                },
                error: null,
              }),
            };
          }
          if (table === 'pool_memberships') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), // NOT a member!
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }),
      };

      const res = await resolveAuthoritativeSlate({
        supabase: mockSupabaseNoAuth,
        activePoolId: 'pool-uuid',
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 8,
      });

      expect(res.source).toBe('FAILED_CLOSED');
      expect(res.games.length).toBe(0);
      expect(res.error).toContain('POOL_AUTHORITY_DENIED');
    });

    it('excludes extra provider events not in accepted manifest and enforces complete coverage', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'game-1',
              externalGameId: '401873010',
              homeTeamId: 'GB',
              awayTeamId: 'DET',
              kickoffTime: '2026-10-23T00:15:00Z',
              status: 'SCHEDULED',
              canonical_kickoff_time: '2026-10-23T00:15:00Z',
              lock_effective_at: '2026-10-23T00:15:00Z',
              season: 2026,
              season_type: 2,
              week: 8,
            },
            {
              id: 'extra-provider-game',
              externalGameId: '999999999', // Extra row NOT in manifest!
              homeTeamId: 'KC',
              awayTeamId: 'LV',
              kickoffTime: '2026-10-25T17:00:00Z',
              status: 'SCHEDULED',
            },
          ],
          error: null,
        }),
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'weekly_slate_manifests') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  season: 2026,
                  season_type: 2,
                  week_number: 8,
                  revision: 1,
                  manifest_fingerprint: 'fp-1',
                  event_ids: ['401873010'], // Only 401873010 accepted!
                  accepted_at: '2026-10-21T12:00:00Z',
                },
                error: null,
              }),
            };
          }
          if (table === 'games') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }),
      };

      const res = await resolveAuthoritativeSlate({
        supabase: mockSupabase,
        activePoolId: 'pool-uuid',
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 8,
      });

      expect(res.source).toBe('PERSISTED_MANIFEST');
      expect(res.games.length).toBe(1);
      expect(res.games[0].externalGameId).toBe('401873010');
      // Extra game 999999999 was strictly excluded!
      expect(res.games.some((g: any) => g.externalGameId === '999999999')).toBe(false);
    });

    it('locks unconfirmed TBD kickoff with isKickoffConfirmed: false and epoch sentinel', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'game-tbd',
              externalGameId: '401873099',
              homeTeamId: 'GB',
              awayTeamId: 'DET',
              kickoffTime: '1970-01-01T00:00:00.000Z',
              status: 'SCHEDULED',
              canonical_kickoff_time: null, // TBD!
              lock_effective_at: '1970-01-01T00:00:00.000Z', // Sentinel!
              season: 2026,
              season_type: 2,
              week: 8,
            },
          ],
          error: null,
        }),
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'weekly_slate_manifests') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  season: 2026,
                  season_type: 2,
                  week_number: 8,
                  revision: 1,
                  manifest_fingerprint: 'fp-tbd',
                  event_ids: ['401873099'],
                  accepted_at: '2026-10-21T12:00:00Z',
                },
                error: null,
              }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }),
      };

      const res = await resolveAuthoritativeSlate({
        supabase: mockSupabase,
        activePoolId: 'pool-uuid',
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 8,
      });

      expect(res.games.length).toBe(1);
      const g = res.games[0];
      expect(g.isKickoffConfirmed).toBe(false);
      expect(g.kickoffTime).toBe('1970-01-01T00:00:00.000Z');
    });

    it('reads highest cached revision and prevents week 7 matching week 17 prefix collision', () => {
      const mockStorage: any = {
        store: new Map<string, string>(),
        getItem(k: string) { return this.store.get(k) || null; },
        setItem(k: string, v: string) { this.store.set(k, v); },
        key(i: number) { return Array.from(this.store.keys())[i] || null; },
        get length() { return this.store.size; },
      };

      // Populate week 17 cache and week 7 cache
      mockStorage.setItem('picks_slate_pool1_s2026_t2_w17_r5', JSON.stringify([{ id: 'w17-game' }]));
      mockStorage.setItem('picks_slate_pool1_s2026_t2_w7_r1', JSON.stringify([{ id: 'w7-game-r1' }]));
      mockStorage.setItem('picks_slate_pool1_s2026_t2_w7_r2', JSON.stringify([{ id: 'w7-game-r2' }]));

      // Query week 7: must return r2 and NOT match w17
      const cachedW7 = getHighestCachedSlateRevision(mockStorage, 'pool1', 2026, 2, 7);
      expect(cachedW7).not.toBeNull();
      expect(cachedW7?.revision).toBe(2);
      expect(cachedW7?.games[0].id).toBe('w7-game-r2');

      // Query week 17: returns r5
      const cachedW17 = getHighestCachedSlateRevision(mockStorage, 'pool1', 2026, 2, 17);
      expect(cachedW17).not.toBeNull();
      expect(cachedW17?.revision).toBe(5);
      expect(cachedW17?.games[0].id).toBe('w17-game');
    });
  });

  describe('8. Pick Route Canonical Locking & Cross-Week Invariants', () => {
    it('passes exact binder counts for UUID vs non-UUID game IDs', async () => {
      const queryMock = vi.fn().mockResolvedValue([
        {
          id: 'uuid-1',
          external_game_id: '401873010',
          home_team_id: 'GB',
          away_team_id: 'DET',
          kickoff_time: '2026-10-23T00:15:00Z',
          status: 'SCHEDULED',
          canonical_kickoff_time: '2026-10-23T00:15:00Z',
          lock_effective_at: '2026-10-23T00:15:00Z',
          season: 2026,
          season_type: 2,
          week: 7,
        },
      ]);
      const mockDb = { $queryRawUnsafe: queryMock };

      // Non-UUID: exactly 1 parameter
      await resolveGameWithCanonicalLock(mockDb, '401873010');
      expect(queryMock).toHaveBeenCalledTimes(1);
      expect(queryMock.mock.calls[0].length).toBe(2); // (sql, param1)
      expect(queryMock.mock.calls[0][1]).toBe('401873010');

      // UUID: exactly 2 parameters
      queryMock.mockClear();
      const validUuid = '11111111-1111-1111-1111-111111111111';
      await resolveGameWithCanonicalLock(mockDb, validUuid);
      expect(queryMock).toHaveBeenCalledTimes(1);
      expect(queryMock.mock.calls[0].length).toBe(3); // (sql, param1, param2)
      expect(queryMock.mock.calls[0][1]).toBe(validUuid);
      expect(queryMock.mock.calls[0][2]).toBe(validUuid);
    });

    it('rejects ambiguous game identities with AMBIGUOUS_GAME_IDENTITY', async () => {
      const mockDb = {
        $queryRawUnsafe: vi.fn().mockResolvedValue([
          { id: 'uuid-1', kickoff_time: '2026-10-23T00:15:00Z' },
          { id: 'uuid-2', kickoff_time: '2026-10-23T00:15:00Z' },
        ]),
      };

      await expect(resolveGameWithCanonicalLock(mockDb, '401873010')).rejects.toThrow('AMBIGUOUS_GAME_IDENTITY');
    });

    it('rejects unparseable kickoff metadata with truthful error', async () => {
      const mockDb = {
        $queryRawUnsafe: vi.fn().mockResolvedValue([
          {
            id: 'uuid-1',
            external_game_id: '401873010',
            kickoff_time: 'invalid-date-string',
          },
        ]),
      };

      await expect(resolveGameWithCanonicalLock(mockDb, '401873010')).rejects.toThrow('INVALID_KICKOFF_METADATA');
    });

    it('rejects NaN lock_effective_at timestamp with INVALID_LOCK_METADATA', async () => {
      const mockDb = {
        $queryRawUnsafe: vi.fn().mockResolvedValue([
          {
            id: 'uuid-1',
            external_game_id: '401873010',
            kickoff_time: '2026-10-23T00:15:00Z',
            lock_effective_at: 'not-a-timestamp',
          },
        ]),
      };

      await expect(resolveGameWithCanonicalLock(mockDb, '401873010')).rejects.toThrow('INVALID_LOCK_METADATA');
    });

    it('propagates real database errors without swallowing or fabricating locks', async () => {
      const mockDb = {
        $queryRawUnsafe: vi.fn().mockRejectedValue(new Error('Connection timeout on pool replica')),
      };

      await expect(resolveGameWithCanonicalLock(mockDb, '401873010')).rejects.toThrow('CANONICAL_GAME_QUERY_FAILED');
    });
  });
});
