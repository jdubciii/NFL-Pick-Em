import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameStatus } from '@prisma/client';
import {
  validateAndTransformESPNScoreboard,
  computeManifestFingerprint,
  refreshWeeklySlateInDb,
  getAcceptedSlateManifest,
  ADAPTER_VERSION,
} from '../src/services/authoritativeSlateService';

describe('Phase 41: Authoritative Slate & Persistence Contract', () => {
  const SAMPLE_WEEK6_SCOPE = {
    seasonYear: 2026,
    seasonType: 2,
    weekNumber: 6,
  };

  const VALID_RAW_SCOREBOARD = {
    season: { year: 2026, type: 2 },
    week: { number: 6 },
    events: [
      {
        id: '401872995',
        date: '2026-10-16T00:15:00Z',
        name: 'Seattle Seahawks at Denver Broncos',
        competitions: [
          {
            id: '401872995',
            date: '2026-10-16T00:15:00Z',
            competitors: [
              { homeAway: 'home', team: { abbreviation: 'DEN', displayName: 'Denver Broncos' }, score: '17' },
              { homeAway: 'away', team: { abbreviation: 'SEA', displayName: 'Seattle Seahawks' }, score: '14' },
            ],
            status: { type: { name: 'STATUS_FINAL', completed: true, state: 'post', detail: 'Final/OT' } },
          },
        ],
      },
      {
        id: '401872996',
        date: '2026-10-18T13:30:00Z',
        name: 'Houston Texans at Jacksonville Jaguars',
        competitions: [
          {
            id: '401872996',
            date: '2026-10-18T13:30:00Z',
            competitors: [
              { homeAway: 'home', team: { abbreviation: 'JAX', displayName: 'Jacksonville Jaguars' } },
              { homeAway: 'away', team: { abbreviation: 'HOU', displayName: 'Houston Texans' } },
            ],
            status: { type: { name: 'STATUS_SCHEDULED', state: 'pre' } },
          },
        ],
      },
      {
        id: '401872997',
        date: '2026-10-18T17:00:00Z',
        name: 'Baltimore Ravens at Cleveland Browns',
        competitions: [
          {
            id: '401872997',
            date: '2026-10-18T17:00:00Z',
            competitors: [
              { homeAway: 'home', team: { abbreviation: 'CLE', displayName: 'Cleveland Browns' } },
              { homeAway: 'away', team: { abbreviation: 'BAL', displayName: 'Baltimore Ravens' } },
            ],
            status: { type: { name: 'STATUS_SCHEDULED', state: 'pre' } },
          },
        ],
      },
    ],
  };

  describe('1. ESPN Provider Adapter & Scope Validation', () => {
    it('accepts and transforms a valid raw ESPN scoreboard payload', () => {
      const observation = validateAndTransformESPNScoreboard(VALID_RAW_SCOREBOARD, SAMPLE_WEEK6_SCOPE);
      expect(observation.status).toBe('VERIFIED');
      expect(observation.provider).toBe('ESPN');
      expect(observation.league).toBe('NFL');
      expect(observation.adapterVersion).toBe(ADAPTER_VERSION);
      expect(observation.eventCount).toBe(3);
      expect(observation.events.length).toBe(3);

      const game1 = observation.events[0];
      expect(game1.externalGameId).toBe('401872995');
      expect(game1.homeTeamId).toBe('DEN');
      expect(game1.awayTeamId).toBe('SEA');
      expect(game1.status).toBe(GameStatus.FINAL);
      expect(game1.homeScore).toBe(17);
      expect(game1.awayScore).toBe(14);
      expect(observation.manifestFingerprint).toMatch(/^[0-9a-f]{64}$/);
    });

    it('rejects wrong season metadata with UNVERIFIED_SOURCE', () => {
      const wrongSeason = {
        ...VALID_RAW_SCOREBOARD,
        season: { year: 2025, type: 2 },
      };
      const observation = validateAndTransformESPNScoreboard(wrongSeason, SAMPLE_WEEK6_SCOPE);
      expect(observation.status).toBe('UNVERIFIED_SOURCE');
      expect(observation.reasons.some((r) => r.includes('SCOPE_MISMATCH_SEASON'))).toBe(true);
    });

    it('rejects wrong week number with UNVERIFIED_SOURCE', () => {
      const wrongWeek = {
        ...VALID_RAW_SCOREBOARD,
        week: { number: 7 },
      };
      const observation = validateAndTransformESPNScoreboard(wrongWeek, SAMPLE_WEEK6_SCOPE);
      expect(observation.status).toBe('UNVERIFIED_SOURCE');
      expect(observation.reasons.some((r) => r.includes('SCOPE_MISMATCH_WEEK'))).toBe(true);
    });

    it('rejects duplicate event IDs with UNVERIFIED_SOURCE', () => {
      const duplicateEvents = {
        ...VALID_RAW_SCOREBOARD,
        events: [
          VALID_RAW_SCOREBOARD.events[0],
          VALID_RAW_SCOREBOARD.events[0], // Duplicate!
        ],
      };
      const observation = validateAndTransformESPNScoreboard(duplicateEvents, SAMPLE_WEEK6_SCOPE);
      expect(observation.status).toBe('UNVERIFIED_SOURCE');
      expect(observation.reasons.some((r) => r.includes('DUPLICATE_EVENT_ID'))).toBe(true);
    });

    it('rejects contradictory home/away team mappings', () => {
      const contradictory = {
        ...VALID_RAW_SCOREBOARD,
        events: [
          {
            id: '401872995',
            date: '2026-10-15T20:15:00Z',
            competitions: [
              {
                id: '401872995',
                date: '2026-10-15T20:15:00Z',
                competitors: [
                  { homeAway: 'home', team: { abbreviation: 'SF' } },
                  { homeAway: 'away', team: { abbreviation: 'SF' } }, // Same team!
                ],
                status: { type: { name: 'STATUS_SCHEDULED', state: 'pre' } },
              },
            ],
          },
        ],
      };
      const observation = validateAndTransformESPNScoreboard(contradictory, SAMPLE_WEEK6_SCOPE);
      expect(observation.status).toBe('UNVERIFIED_SOURCE');
      expect(observation.reasons.some((r) => r.includes('CONTRADICTORY_TEAMS'))).toBe(true);
    });

    it('rejects missing or invalid kickoff timestamp', () => {
      const invalidDate = {
        ...VALID_RAW_SCOREBOARD,
        events: [
          {
            id: '401872995',
            date: 'not-a-valid-date',
            competitions: [
              {
                id: '401872995',
                date: 'not-a-valid-date',
                competitors: [
                  { homeAway: 'home', team: { abbreviation: 'SF' } },
                  { homeAway: 'away', team: { abbreviation: 'SEA' } },
                ],
                status: { type: { name: 'STATUS_SCHEDULED', state: 'pre' } },
              },
            ],
          },
        ],
      };
      const observation = validateAndTransformESPNScoreboard(invalidDate, SAMPLE_WEEK6_SCOPE);
      expect(observation.status).toBe('UNVERIFIED_SOURCE');
      expect(observation.reasons.some((r) => r.includes('INVALID_KICKOFF'))).toBe(true);
    });

    it('rejects FINAL game status without valid numeric scores', () => {
      const finalWithoutScores = {
        ...VALID_RAW_SCOREBOARD,
        events: [
          {
            id: '401872995',
            date: '2026-10-15T20:15:00Z',
            competitions: [
              {
                id: '401872995',
                date: '2026-10-15T20:15:00Z',
                competitors: [
                  { homeAway: 'home', team: { abbreviation: 'SF' } }, // score missing
                  { homeAway: 'away', team: { abbreviation: 'SEA' } }, // score missing
                ],
                status: { type: { name: 'STATUS_FINAL', completed: true, state: 'post' } },
              },
            ],
          },
        ],
      };
      const observation = validateAndTransformESPNScoreboard(finalWithoutScores, SAMPLE_WEEK6_SCOPE);
      expect(observation.status).toBe('UNVERIFIED_SOURCE');
      expect(observation.reasons.some((r) => r.includes('FINAL_WITHOUT_SCORES'))).toBe(true);
    });

    it('generates deterministic SHA-256 manifest fingerprints independent of event ordering', () => {
      const eventsA = [
        { externalGameId: '401872995', homeTeamId: 'DEN', awayTeamId: 'SEA', kickoffTime: '2026-10-16T00:15:00.000Z' },
        { externalGameId: '401872996', homeTeamId: 'JAX', awayTeamId: 'HOU', kickoffTime: '2026-10-18T13:30:00.000Z' },
      ];
      const eventsB = [
        { externalGameId: '401872996', homeTeamId: 'JAX', awayTeamId: 'HOU', kickoffTime: '2026-10-18T13:30:00.000Z' },
        { externalGameId: '401872995', homeTeamId: 'DEN', awayTeamId: 'SEA', kickoffTime: '2026-10-16T00:15:00.000Z' },
      ];

      const hashA = computeManifestFingerprint(2026, 2, 6, eventsA);
      const hashB = computeManifestFingerprint(2026, 2, 6, eventsB);
      expect(hashA).toBe(hashB);
    });
  });

  describe('2. Canonical Persistence Contract & Manifest Integrity', () => {
    let mockTx: any;
    let mockDb: any;
    let storedGames: Map<string, any>;

    beforeEach(() => {
      storedGames = new Map();
      // Pre-seed with existing 16 Week 5 games
      storedGames.set('g-w05-1', {
        id: '11111111-1111-1111-1111-111111111101',
        externalGameId: '2026_w05_TB_DAL',
        homeTeamId: 'DAL',
        awayTeamId: 'TB',
        kickoffTime: new Date('2026-10-09T00:15:00Z'),
        status: GameStatus.SCHEDULED,
      });

      mockTx = {
        game: {
          findFirst: vi.fn().mockImplementation(async ({ where }: any) => {
            const externalId = where.OR?.[0]?.externalGameId || where.externalGameId;
            for (const g of storedGames.values()) {
              if (g.externalGameId === externalId) return g;
            }
            return null;
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

    it('persists canonical games while preserving existing Game identities', async () => {
      const observation = validateAndTransformESPNScoreboard(VALID_RAW_SCOREBOARD, SAMPLE_WEEK6_SCOPE);
      const result = await refreshWeeklySlateInDb(mockDb, {
        seasonYear: 2026,
        seasonType: 2,
        weekNumber: 6,
        operatorId: 'a1111111-1111-1111-1111-111111111111',
        preloadedObservation: observation,
      });

      expect(result.success).toBe(true);
      expect(result.eventCount).toBe(3);
      expect(result.revision).toBe(1);

      // Verify original Week 5 game identity was NOT mutated or overwritten
      const originalWeek5 = storedGames.get('g-w05-1');
      expect(originalWeek5.externalGameId).toBe('2026_w05_TB_DAL');
      expect(originalWeek5.id).toBe('11111111-1111-1111-1111-111111111101');
    });

    it('refuses to shrink a verified manifest when incoming candidate drops an accepted event', async () => {
      // 1. Initial accepted manifest has 3 events
      const observation1 = validateAndTransformESPNScoreboard(VALID_RAW_SCOREBOARD, SAMPLE_WEEK6_SCOPE);

      // Mock manifest exists in DB with 3 events
      mockTx.$queryRawUnsafe.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT season, season_type, week_number, revision')) {
          return [
            {
              season: 2026,
              season_type: 2,
              week_number: 6,
              revision: 1,
              event_ids: ['401872995', '401872996', '401872997'],
              accepted_at: new Date().toISOString(),
              accepted_by: 'admin',
              manifest_fingerprint: observation1.manifestFingerprint,
              observation_time: new Date().toISOString(),
            },
          ];
        }
        if (sql.includes('weekly_slate_manifests')) {
          return [{ to_regclass: 'public.weekly_slate_manifests' }];
        }
        return [];
      });

      // 2. Incoming candidate only has 2 events (dropped 401872997)
      const partialRaw = {
        ...VALID_RAW_SCOREBOARD,
        events: [VALID_RAW_SCOREBOARD.events[0], VALID_RAW_SCOREBOARD.events[1]],
      };
      const partialObservation = validateAndTransformESPNScoreboard(partialRaw, SAMPLE_WEEK6_SCOPE);

      await expect(
        refreshWeeklySlateInDb(mockDb, {
          seasonYear: 2026,
          seasonType: 2,
          weekNumber: 6,
          operatorId: 'a1111111-1111-1111-1111-111111111111',
          preloadedObservation: partialObservation,
        })
      ).rejects.toThrow('CANNOT_SHRINK_MANIFEST');
    });
  });
});
