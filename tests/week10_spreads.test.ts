import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchLiveNFLScores,
  getJackApprovedHomeSpread,
  getJackApprovedSpreadLine,
  getJackWeek8FavoriteLine,
  getJackWeek8HomeSpread,
  getJackWeek9HomeSpread,
  getJackWeek9SpreadLine,
  getJackWeek10HomeSpread,
  getJackWeek10SpreadLine,
} from '../client/src/services/liveScoreService';
import {
  executeWeeklyWrapUpForPool,
  getApprovedHomeSpreadForWrapUp,
  previewWeeklyWrapUpForPool,
} from '../src/services/wrapUpEngine';

const approved = [
  { id: '401873057', away: 'JAX', home: 'TEN', homeSpread: 10.5, line: 'TEN +10.5 / JAX -10.5' },
  { id: '401873054', away: 'BUF', home: 'NYJ', homeSpread: 8.5, line: 'NYJ +8.5 / BUF -8.5' },
];

const notApproved = [
  ['WAS', 'NYG'], ['NE', 'DET'], ['HOU', 'CLE'], ['KC', 'ATL'],
  ['MIA', 'IND'], ['CAR', 'NO'], ['MIN', 'GB'],
];

afterEach(() => vi.unstubAllGlobals());

describe('Jack-supplied Week 10 display spreads', () => {
  it('returns exactly the two approved home spreads and both team lines', () => {
    for (const game of approved) {
      expect(getJackWeek10HomeSpread(10, game.away, game.home, 2026)).toBe(game.homeSpread);
      expect(getJackWeek10SpreadLine(10, game.away, game.home, 2026)).toBe(game.line);
      expect(getJackApprovedHomeSpread(10, game.away, game.home, 2026)).toBe(game.homeSpread);
      expect(getJackApprovedSpreadLine(10, game.away, game.home, 2026)).toBe(game.line);
      expect(getJackWeek10HomeSpread(9, game.away, game.home, 2026)).toBeNull();
      expect(getJackWeek10HomeSpread(8, game.away, game.home, 2026)).toBeNull();
      expect(getJackWeek10HomeSpread(10, game.away, game.home, 2027)).toBeNull();
      expect(getJackApprovedHomeSpread(10, game.away, game.home, 2027)).toBeNull();
    }
    expect(getJackWeek10HomeSpread(10, 'JAC', 'TEN', 2026)).toBe(10.5);
  });

  it('returns no spread for any other Week 10 matchup', () => {
    const teams = 'ARI ATL BAL BUF CAR CHI CIN CLE DAL DEN DET GB HOU IND JAX KC LAC LAR LV MIA MIN NE NO NYG NYJ PHI PIT SEA SF TB TEN WAS'.split(' ');
    const matches = teams.flatMap(away => teams.filter(home => home !== away).map(home => ({ away, home })))
      .filter(({ away, home }) => getJackWeek10HomeSpread(10, away, home, 2026) !== null);
    expect(matches).toEqual([
      { away: 'BUF', home: 'NYJ' },
      { away: 'JAX', home: 'TEN' },
    ]);
    expect(getJackApprovedHomeSpread(10, 'KC', 'ATL', 2026)).toBeNull();
    expect(getJackApprovedSpreadLine(10, 'TEN', 'JAX', 2026)).toBeNull();
    expect(getJackApprovedSpreadLine(10, 'MIA', 'IND', 2026)).toBeNull();
    expect(getJackWeek10HomeSpread(9, 'JAX', 'BAL', 2026)).toBeNull();
    expect(getJackWeek10HomeSpread(8, 'TEN', 'CIN', 2026)).toBeNull();
  });

  it('ignores feed odds for the seven other Week 10 games', async () => {
    const events = [...approved.map(g => [g.away, g.home, g.id]), ...notApproved.map(([away, home], i) => [away, home, `other-${i}`])]
      .map(([away, home, id]) => ({
        id,
        date: '2026-11-15T18:00:00Z',
        competitions: [{
          odds: [{ details: 'feed line -99.5', spread: -99.5 }],
          competitors: [
            { homeAway: 'away', team: { abbreviation: away } },
            { homeAway: 'home', team: { abbreviation: home } },
          ],
        }],
      }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ season: { year: 2026 }, events }) }));

    const games = await fetchLiveNFLScores(10);
    expect(games).toHaveLength(9);
    for (const game of approved) {
      const result = games.find(g => g.id === game.id);
      expect(result?.spread).toBe(game.homeSpread);
      expect(result?.favoriteLine).toBe(game.line);
    }
    for (const result of games.filter(g => g.id.startsWith('other-'))) {
      expect(result.spread).toBeNull();
      expect(result.favoriteLine).toBeNull();
    }
  });

  it('leaves the approved Week 8 and Week 9 values untouched', () => {
    expect(getJackWeek8HomeSpread(8, 'TEN', 'CIN', 2026)).toBe(-10.5);
    expect(getJackWeek8HomeSpread(8, 'ARI', 'DAL', 2026)).toBe(-7.5);
    expect(getJackWeek8FavoriteLine(8, 'IND', 'JAX', 2026)).toBe('JAX -10.5');
    expect(getJackWeek9HomeSpread(9, 'JAX', 'BAL', 2026)).toBe(10.5);
    expect(getJackWeek9SpreadLine(9, 'NYJ', 'KC', 2026)).toBe('NYJ +10.5 / KC -10.5');
    expect(getJackWeek9SpreadLine(9, 'DET', 'MIA', 2026)).toBe('MIA +7.5 / DET -7.5');
    expect(getJackApprovedHomeSpread(8, 'ARI', 'DAL', 2026)).toBe(-7.5);
    expect(getJackApprovedSpreadLine(9, 'DET', 'MIA', 2026)).toBe('MIA +7.5 / DET -7.5');
    expect(getJackWeek9HomeSpread(10, 'JAX', 'TEN', 2026)).toBeNull();
    expect(getJackWeek8HomeSpread(10, 'BUF', 'NYJ', 2026)).toBeNull();
  });
});

describe('Week 10 settlement against the spread', () => {
  it('selects the Week 10 map for week 10 only', () => {
    expect(getApprovedHomeSpreadForWrapUp(10, 'JAX', 'TEN', 2026)).toBe(10.5);
    expect(getApprovedHomeSpreadForWrapUp(10, 'BUF', 'NYJ', 2026)).toBe(8.5);
    expect(getApprovedHomeSpreadForWrapUp(10, 'JAC', 'TEN', 2026)).toBe(10.5);
    expect(getApprovedHomeSpreadForWrapUp(10, 'KC', 'ATL', 2026)).toBeNull();
    expect(getApprovedHomeSpreadForWrapUp(10, 'JAX', 'TEN', 2027)).toBeNull();
    expect(getApprovedHomeSpreadForWrapUp(8, 'TEN', 'CIN', 2026)).toBe(-10.5);
    expect(getApprovedHomeSpreadForWrapUp(9, 'TEN', 'CIN', 2026)).toBeNull();
    expect(getApprovedHomeSpreadForWrapUp(10, 'TEN', 'CIN', 2026)).toBeNull();
  });

  it('scores synthetic Week 10 finals against the Week 10 lines', async () => {
    const games = [
      { id: 'game-ten-jax', externalGameId: '401873057', homeTeamId: 'TEN', awayTeamId: 'JAX',
        homeScore: 20, awayScore: 30, status: 'FINAL', kickoffTime: new Date('2026-11-15T18:00:00Z') },
      { id: 'game-nyj-buf', externalGameId: '401873054', homeTeamId: 'NYJ', awayTeamId: 'BUF',
        homeScore: 24, awayScore: 17, status: 'FINAL', kickoffTime: new Date('2026-11-15T18:00:00Z') },
    ];
    // Hand math: TEN 20, JAX 30 -> TEN +10.5 wins, JAX -10.5 loses (JAX won by 10, short of 10.5).
    //            NYJ 24, BUF 17 -> NYJ +8.5 wins, BUF -8.5 loses (BUF lost outright).
    const selections: Record<string, [string, string]> = {
      'member-0': ['TEN', 'NYJ'],
      'member-1': ['JAX', 'BUF'],
      'member-2': ['TEN', 'BUF'],
      'member-3': ['JAX', 'NYJ'],
    };
    const picks = Object.entries(selections).flatMap(([userId, [tenOrJax, nyjOrBuf]]) => [
      { user_id: userId, game_id: '401873057', selected_team: tenOrJax, selected_team_id: tenOrJax,
        home_team_id: 'TEN', away_team_id: 'JAX', home_score: 20, away_score: 30, status: 'FINAL' },
      { user_id: userId, game_id: '401873054', selected_team: nyjOrBuf, selected_team_id: nyjOrBuf,
        home_team_id: 'NYJ', away_team_id: 'BUF', home_score: 24, away_score: 17, status: 'FINAL' },
    ]);
    const mockDb: any = {
      pool: { findUnique: async () => ({ id: 'pool', name: 'Pool', adminId: 'admin', settings: { season: 2026 },
        memberships: Object.keys(selections).map(userId => ({ userId, user: { id: userId, notificationPreference: { emailEnabled: false } } })) }) },
      acceptedSlateManifest: { findFirst: async () => ({ season: 2026, seasonType: 2, weekNumber: 10, revision: 1,
        eventIds: ['401873057', '401873054'], manifestFingerprint: 'fixture', observationTime: '2026-11-15T21:00:00Z' }) },
      game: { findMany: async () => games },
      weeklySubmission: { findMany: async () => [] },
      penaltyLedger: { create: async () => ({}), aggregate: async () => ({ _sum: { delta: 0 } }) },
      poolMemberStat: { upsert: async () => ({}) },
      outboxEvent: { createMany: async () => ({ count: 0 }) },
      inboxMessage: { createMany: async () => ({ count: 0 }) },
      $transaction: async (callback: any) => callback(mockDb),
      $queryRaw: async () => [{ to_regclass: 'weekly_wrapups' }],
      $queryRawUnsafe: async (sql: string) => {
        if (sql.includes('FROM public.pools WHERE')) return [{ id: 'pool', status: 'ACTIVE' }];
        if (sql.includes('information_schema.columns')) return [{ column_name: 'season' }];
        if (sql.includes('INSERT INTO public.weekly_wrapups')) return [{ pool_id: 'pool' }];
        if (sql.includes('FROM public.picks')) return picks;
        return [];
      },
    };

    const preview = await previewWeeklyWrapUpForPool('pool', 10, { season: 2026, seasonType: 2,
      tiebreakerOffered: false, prismaClient: mockDb });
    expect(preview.projectedStandings.find(m => m.userId === 'member-0')?.score).toBe(2);
    expect(preview.projectedStandings.find(m => m.userId === 'member-1')?.score).toBe(0);
    expect(preview.projectedStandings.find(m => m.userId === 'member-2')?.score).toBe(1);
    expect(preview.projectedStandings.find(m => m.userId === 'member-3')?.score).toBe(1);

    const settlement = await executeWeeklyWrapUpForPool('pool', 10, { season: 2026, seasonType: 2,
      tiebreakerOffered: false, prismaClient: mockDb });
    expect(settlement.applied).toBe(true);
    expect(settlement.auditSnapshot.standings.find((m: any) => m.userId === 'member-0')?.score).toBe(2);
    expect(settlement.auditSnapshot.standings.find((m: any) => m.userId === 'member-1')?.score).toBe(0);
    expect(settlement.auditSnapshot.standings.find((m: any) => m.userId === 'member-2')?.score).toBe(1);
    expect(settlement.auditSnapshot.standings.find((m: any) => m.userId === 'member-3')?.score).toBe(1);
  });
});
