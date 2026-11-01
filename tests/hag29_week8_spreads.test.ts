import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fetchLiveNFLScores, getJackWeek8HomeSpread, getJackWeek8FavoriteLine, type LiveGame } from '../client/src/services/liveScoreService';
import { resolveAuthoritativeSlate } from '../client/src/services/authoritativeSlateClientService';
import { formatAttributedSpread } from '../client/src/services/dependableInfoService';
import { CompactPicksList } from '../client/src/components/picks/CompactPicksList';
import { SwipePickDeck } from '../client/src/components/picks/SwipePickDeck';
import { LiveGametrackStream } from '../client/src/components/matrix/LiveGametrackStream';
import { evaluatePickATS as evaluateLiveATS } from '../client/src/services/radarLiveConsequencesService';
import { evaluatePickATS as evaluateSimulationATS } from '../client/src/services/radarSimulationEngine';

const cinSpread = getJackWeek8HomeSpread(8, 'TEN', 'CIN', 2026);

function liveGame(status: LiveGame['status']): LiveGame {
  return {
    id: 'espn-ten-cin',
    name: 'TEN at CIN',
    shortName: 'TEN @ CIN',
    awayTeam: { code: 'TEN', name: 'Tennessee Titans', score: '21' },
    homeTeam: { code: 'CIN', name: 'Cincinnati Bengals', score: '28' },
    status,
    clock: status === 'FINAL' ? '0:00' : '8:00',
    period: 4,
    favoriteLine: getJackWeek8FavoriteLine(8, 'TEN', 'CIN', 2026),
    spread: cinSpread,
  };
}

describe('HAG-29 Jack Week 8 spread contract', () => {
  it('provides only the three approved home lines in Week 8', () => {
    expect(getJackWeek8HomeSpread(8, 'TEN', 'CIN', 2026)).toBe(-10.5);
    expect(getJackWeek8HomeSpread(8, 'IND', 'JAX', 2026)).toBe(-10.5);
    expect(getJackWeek8HomeSpread(8, 'ARI', 'DAL', 2026)).toBe(-7.5);
    expect(getJackWeek8HomeSpread(8, 'TEN', 'KC', 2026)).toBeNull();
    expect(getJackWeek8HomeSpread(9, 'TEN', 'CIN', 2026)).toBeNull();
    expect(getJackWeek8HomeSpread(8, 'TEN', 'CIN', 2027)).toBeNull();
    expect(getJackWeek8FavoriteLine(8, 'IND', 'JAX', 2026)).toBe('JAX -10.5');
  });

  it('keeps Jack lines in live/final feed games and ignores provider odds', async () => {
    const event = (id: string, away: string, home: string, status: string) => ({
      id, date: '2026-11-01T18:00:00Z', status: { type: { name: status } },
      competitions: [{ odds: [{ details: 'CIN -99.5' }], competitors: [
        { homeAway: 'away', team: { abbreviation: away }, score: '21' },
        { homeAway: 'home', team: { abbreviation: home }, score: '28' },
      ] }],
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      season: { year: 2026 }, events: [
        event('cin', 'TEN', 'CIN', 'STATUS_IN_PROGRESS'),
        event('jax', 'IND', 'JAC', 'STATUS_FINAL'),
        event('dal', 'ARI', 'DAL', 'STATUS_FINAL'),
        event('other', 'CAR', 'GB', 'STATUS_FINAL'),
      ],
    }) }));
    try {
      const games = await fetchLiveNFLScores(8);
      expect(games.map((game) => game.spread)).toEqual([-10.5, -10.5, -7.5, null]);
      expect(games.map((game) => game.favoriteLine)).toEqual(['CIN -10.5', 'JAX -10.5', 'DAL -7.5', null]);
      expect(games[0].status).toBe('IN_PROGRESS');
      expect(games[1].status).toBe('FINAL');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('maps a canonical live game to the numeric and visible line even when live odds are absent', async () => {
    const result = (data: unknown) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
      then: (resolve: (value: unknown) => unknown) => resolve({ data, error: null }),
    });
    const row = {
      id: 'db-ten-cin', external_game_id: 'espn-ten-cin', home_team_id: 'CIN', away_team_id: 'TEN',
      kickoff_time: '2026-11-01T18:00:00Z', canonical_kickoff_time: '2026-11-01T18:00:00Z',
      lock_effective_at: '2026-11-01T18:00:00Z', season: 2026, season_type: 2,
      week: 8, manifest_revision: 1, status: 'IN_PROGRESS',
    };
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      rpc: vi.fn().mockResolvedValue({ data: [row], error: null }),
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'weekly_slate_manifests') return result({
          season: 2026, season_type: 2, week_number: 8, revision: 1,
          manifest_fingerprint: 'week8', event_ids: ['espn-ten-cin'], accepted_at: '2026-10-30T00:00:00Z',
        });
        if (table === 'pool_memberships') return result({ status: 'ACTIVE', user_id: 'user-1', pool_id: 'pool-1' });
        if (table === 'games') return result([row]);
        return result(null);
      }),
    };
    const slate = await resolveAuthoritativeSlate({
      supabase, activePoolId: 'pool-1', seasonYear: 2026, seasonType: 2, weekNumber: 8,
      liveScores: [{ ...liveGame('IN_PROGRESS'), favoriteLine: null, spread: null }],
    });
    expect(slate.source).toBe('PERSISTED_MANIFEST');
    expect(slate.games[0].spread).toBe(-10.5);
    expect(slate.games[0].favoriteLine).toBe('CIN -10.5');
    expect(formatAttributedSpread({ spread: slate.games[0].spread, homeTeam: 'CIN', awayTeam: 'TEN' }))
      .toBe('CIN -10.5');
  });

  it.each(['IN_PROGRESS', 'FINAL'] as const)('keeps the line beside scores in live and final Picks and Gametrack (%s)', (status) => {
    const line = getJackWeek8FavoriteLine(8, 'TEN', 'CIN', 2026);
    const picksList = renderToStaticMarkup(React.createElement(CompactPicksList, {
      games: [{ gameId: 'g1', awayTeam: 'TEN', homeTeam: 'CIN', kickoffTime: 'Sun 11:00',
        isLocked: true, gameStatus: status === 'FINAL' ? 'FINAL' : 'LIVE',
        awayScore: 21, homeScore: 28, favoriteLine: line }],
      selectedPicks: {}, onSelectTeam: () => undefined,
    }));
    expect(picksList).toContain(line);
    expect(picksList).toContain('21 - 28');

    const swipe = renderToStaticMarkup(React.createElement(SwipePickDeck, {
      matchups: [{ id: 'g1', gameId: 'g1', awayTeam: 'TEN', homeTeam: 'CIN', startTime: 'Sun 11:00',
        gameStatus: status === 'FINAL' ? 'FINAL' : 'LIVE', isLive: status === 'IN_PROGRESS',
        awayScore: 21, homeScore: 28, favoriteLine: line, spread: String(cinSpread) }],
      onSelectPick: () => undefined,
    }));
    expect(swipe).toContain(line);

    const gametrack = renderToStaticMarkup(React.createElement(LiveGametrackStream, {
      games: [liveGame(status)], weekNumber: 8,
    }));
    expect(gametrack).toContain(`FAV: ${line}`);
    expect(gametrack).toContain('28');
    expect(gametrack).toContain('espn.com/nfl/game/_/gameId/espn-ten-cin');
  });

  it('scores a seven-point CIN win as an underdog ATS cover in both engines', () => {
    const game = { gameId: 'g1', homeTeam: 'CIN', awayTeam: 'TEN', homeScore: 28, awayScore: 21,
      spread: cinSpread, status: 'FINAL' as const };
    const favorite = { userId: 'u1', userName: 'Favorite', gameId: 'g1', selectedTeam: 'CIN' };
    const underdog = { userId: 'u2', userName: 'Underdog', gameId: 'g1', selectedTeam: 'TEN' };
    for (const evaluate of [evaluateLiveATS, evaluateSimulationATS]) {
      expect(evaluate(favorite, game).points).toBe(0);
      expect(evaluate(underdog, game).points).toBe(1);
      expect(evaluate(favorite, { ...game, spread: null }).points).toBeNull();
    }
  });
});
