import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchLiveNFLScores,
  getJackApprovedHomeSpread,
  getJackApprovedSpreadLine,
  getJackWeek9HomeSpread,
  getJackWeek9SpreadLine,
} from '../client/src/services/liveScoreService';

const approved = [
  { id: '401873037', away: 'JAX', home: 'BAL', homeSpread: 10.5, line: 'BAL +10.5 / JAX -10.5' },
  { id: '401873045', away: 'NYJ', home: 'KC', homeSpread: -10.5, line: 'NYJ +10.5 / KC -10.5' },
  { id: '401873042', away: 'DET', home: 'MIA', homeSpread: 7.5, line: 'MIA +7.5 / DET -7.5' },
];

afterEach(() => vi.unstubAllGlobals());

describe('Jack-supplied Week 9 display spreads', () => {
  it('returns exactly the three approved home spreads and both team lines', () => {
    for (const game of approved) {
      expect(getJackWeek9HomeSpread(9, game.away, game.home, 2026)).toBe(game.homeSpread);
      expect(getJackWeek9SpreadLine(9, game.away, game.home, 2026)).toBe(game.line);
      expect(getJackApprovedHomeSpread(9, game.away, game.home, 2026)).toBe(game.homeSpread);
      expect(getJackApprovedSpreadLine(9, game.away, game.home, 2026)).toBe(game.line);
      expect(getJackWeek9HomeSpread(8, game.away, game.home, 2026)).toBeNull();
      expect(getJackWeek9HomeSpread(9, game.away, game.home, 2027)).toBeNull();
    }
  });

  it('returns no spread for any other matchup or week', () => {
    const teams = 'ARI ATL BAL BUF CAR CHI CIN CLE DAL DEN DET GB HOU IND JAX KC LAC LAR LV MIA MIN NE NO NYG NYJ PHI PIT SEA SF TB TEN WAS'.split(' ');
    const matches = teams.flatMap(away => teams.filter(home => home !== away).map(home => ({ away, home })))
      .filter(({ away, home }) => getJackWeek9HomeSpread(9, away, home, 2026) !== null);
    expect(matches).toEqual([
      { away: 'DET', home: 'MIA' },
      { away: 'JAX', home: 'BAL' },
      { away: 'NYJ', home: 'KC' },
    ]);
    expect(getJackApprovedHomeSpread(10, 'JAX', 'BAL', 2026)).toBeNull();
    expect(getJackApprovedSpreadLine(9, 'BAL', 'JAX', 2026)).toBeNull();
    expect(getJackApprovedHomeSpread(8, 'TEN', 'CIN', 2026)).toBe(-10.5);
  });

  it('ignores feed odds for six other games', async () => {
    const other = [
      ['ARI', 'ATL'], ['BUF', 'CAR'], ['CHI', 'CIN'],
      ['CLE', 'DAL'], ['DEN', 'GB'], ['HOU', 'IND'],
    ];
    const events = [...approved.map(g => [g.away, g.home, g.id]), ...other.map(([away, home], i) => [away, home, `other-${i}`])]
      .map(([away, home, id]) => ({
        id,
        date: '2026-11-08T18:00:00Z',
        competitions: [{
          odds: [{ details: 'feed line -99.5', spread: -99.5 }],
          competitors: [
            { homeAway: 'away', team: { abbreviation: away } },
            { homeAway: 'home', team: { abbreviation: home } },
          ],
        }],
      }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ season: { year: 2026 }, events }) }));

    const games = await fetchLiveNFLScores(9);
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
});
