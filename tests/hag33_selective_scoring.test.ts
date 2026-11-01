import { describe, expect, it } from 'vitest';
import { getJackWeek8HomeSpread, type LiveGame } from '../client/src/services/liveScoreService';
import { evaluatePickATS, scoreLeaguePick } from '../client/src/services/radarLiveConsequencesService';
import { calculateProvisionalStandings, type SlateGame, type UserPickItem } from '../client/src/services/sweatProjectionService';
import { calculateRivalryShowdown } from '../client/src/services/rivalryShowdownService';
import { buildPersonalRootingQueue } from '../client/src/services/dependableInfoService';
import { createEmptyReceiptSession, observeProjectionSnapshot, type ProjectionSnapshot } from '../client/src/services/sweatReceiptService';

const members = [{ id: 'jack', name: 'Jack' }, { id: 'jcone2', name: 'jcone2' }];
const games: SlateGame[] = Array.from({ length: 9 }, (_, index) => ({
  id: `db-${index}`, externalGameId: `espn-${index}`,
  awayTeam: `A${index}`, homeTeam: `H${index}`,
  weekNumber: 8, seasonYear: 2026,
}));
games[4] = { ...games[4], awayTeam: 'TEN', homeTeam: 'CIN', spread: -10.5 };

const scores: LiveGame[] = games.map((game, index) => ({
  id: game.externalGameId!, name: `${game.awayTeam} @ ${game.homeTeam}`,
  shortName: `${game.awayTeam} @ ${game.homeTeam}`,
  status: index === 0 ? 'FINAL' : 'IN_PROGRESS',
  clock: index === 0 ? '0:00' : '8:00', period: index === 0 ? 4 : 3,
  seasonYear: 2026,
  homeTeam: { code: game.homeTeam, name: game.homeTeam, score: index === 4 ? '14' : '21' },
  awayTeam: { code: game.awayTeam, name: game.awayTeam, score: index === 4 ? '13' : '14' },
}));

const uniquePicks: UserPickItem[] = members.flatMap((member) => games.map((game, index) => ({
  userId: member.id, gameId: game.id,
  selectedTeam: index === 4 ? (member.id === 'jack' ? 'TEN' : 'CIN')
    : index === 0 || (member.id === 'jack' ? index <= 3 : index <= 6)
      ? game.homeTeam : game.awayTeam,
  isSubmitted: true,
})));
const aliasedPicks = uniquePicks.flatMap((pick) => {
  const game = games.find((item) => item.id === pick.gameId)!;
  return [pick, { ...pick, gameId: game.externalGameId! }];
});

describe('HAG-33 selective Week 8 league scoring', () => {
  it('scores the TEN 13 at CIN 14 halftime cover once per member in standings and Duel', () => {
    const standings = calculateProvisionalStandings(members, games, scores, aliasedPicks);
    const jack = standings.find((entry) => entry.userId === 'jack')!;
    const rival = standings.find((entry) => entry.userId === 'jcone2')!;
    const duel = calculateRivalryShowdown(members[0], members[1], games, scores, aliasedPicks, aliasedPicks);

    expect(jack).toMatchObject({ bankedPoints: 1, livePoints: 4, totalProvisionalPoints: 5 });
    expect(rival).toMatchObject({ bankedPoints: 1, livePoints: 5, totalProvisionalPoints: 6 });
    expect(duel.userPoints).toEqual({ banked: 1, live: 4, total: 5 });
    expect(duel.rivalPoints).toEqual({ banked: 1, live: 5, total: 6 });
    expect(duel.pointGap).toBe(-1);
    expect(duel.userPickCount).toBe(9);
    expect(duel.rivalPickCount).toBe(9);
    expect(standings.map((entry) => entry.totalProvisionalPoints)).toEqual([6, 5]);
    expect(duel.battlegrounds.find((entry) => entry.gameId === games[4].id)?.branchOutcomes.description)
      .toContain('TEN covers');
    const offSlatePick = { userId: 'jack', gameId: 'not-in-league-slate', selectedTeam: 'H0', isSubmitted: true };
    const offSlateScore = { ...scores[0], id: 'not-in-league-slate' };
    const bounded = calculateProvisionalStandings(members, games, [...scores, offSlateScore], [...aliasedPicks, offSlatePick]);
    expect(bounded.find((entry) => entry.userId === 'jack')?.totalProvisionalPoints).toBe(5);

    const queue = buildPersonalRootingQueue([{
      gameId: games[4].id, awayTeam: 'TEN', homeTeam: 'CIN',
      viewerPick: 'TEN', rivalPick: 'CIN', status: 'IN_PROGRESS',
    }], { rivalDisplayName: 'jcone2', currentViewerGap: jack.totalProvisionalPoints - rival.totalProvisionalPoints });
    expect(queue[0].consequenceNote).toContain('from -1 to 0');

    const current: ProjectionSnapshot = {
      poolId: 'pool', week: 8, viewerId: 'jack', viewerName: 'Jack',
      rivalId: 'jcone2', rivalName: 'jcone2',
      viewerPoints: jack.totalProvisionalPoints, rivalPoints: rival.totalProvisionalPoints,
      viewerProjectedTier: jack.tier, observedAtIso: '2026-11-01T20:00:00Z',
    };
    const baseline = observeProjectionSnapshot(createEmptyReceiptSession(), {
      ...current, rivalPoints: jack.totalProvisionalPoints, observedAtIso: '2026-11-01T19:59:00Z',
    });
    const after = observeProjectionSnapshot(baseline, current);
    expect(after.receipts[0]).toMatchObject({ beforeGap: 0, afterGap: -1 });
  });

  it('uses only Jack-approved lines and scores other games straight-up', () => {
    const cases = [
      { away: 'TEN', home: 'CIN', spread: -10.5, awayScore: 13, homeScore: 14, homePoints: 0, awayPoints: 1, status: 'IN_PROGRESS' as const },
      { away: 'IND', home: 'JAX', spread: -10.5, awayScore: 17, homeScore: 24, homePoints: 0, awayPoints: 1, status: 'FINAL' as const },
      { away: 'ARI', home: 'DAL', spread: -7.5, awayScore: 20, homeScore: 28, homePoints: 1, awayPoints: 0, status: 'IN_PROGRESS' as const },
    ];
    for (const [index, item] of cases.entries()) {
      expect(getJackWeek8HomeSpread(8, item.away, item.home, 2026)).toBe(item.spread);
      const game: SlateGame = { id: `g-${index}`, awayTeam: item.away, homeTeam: item.home,
        spread: item.spread, weekNumber: 8, seasonYear: 2026 };
      const live: LiveGame = { id: game.id, name: '', shortName: '', status: item.status,
        clock: '', period: 2, seasonYear: 2026,
        awayTeam: { code: item.away, name: item.away, score: String(item.awayScore) },
        homeTeam: { code: item.home, name: item.home, score: String(item.homeScore) } };
      const picks = [
        { userId: 'jack', gameId: game.id, selectedTeam: item.away, isSubmitted: true },
        { userId: 'jcone2', gameId: game.id, selectedTeam: item.home, isSubmitted: true },
      ];
      const standings = calculateProvisionalStandings(members, [game], [live], picks);
      const duel = calculateRivalryShowdown(members[0], members[1], [game], [live], picks, picks);
      const standingKey = item.status === 'FINAL' ? 'bankedPoints' : 'livePoints';
      const duelKey = item.status === 'FINAL' ? 'banked' : 'live';
      expect(standings.find((entry) => entry.userId === 'jack')?.[standingKey]).toBe(item.awayPoints);
      expect(standings.find((entry) => entry.userId === 'jcone2')?.[standingKey]).toBe(item.homePoints);
      expect(duel.userPoints[duelKey]).toBe(item.awayPoints);
      expect(duel.rivalPoints[duelKey]).toBe(item.homePoints);
    }

    const otherWeek: SlateGame = { id: 'week9', awayTeam: 'TEN', homeTeam: 'CIN',
      weekNumber: 9, seasonYear: 2026, spread: -10.5 };
    const live: LiveGame = { ...scores[4], id: 'week9' };
    const picks = [
      { userId: 'jack', gameId: 'week9', selectedTeam: 'TEN', isSubmitted: true },
      { userId: 'jcone2', gameId: 'week9', selectedTeam: 'CIN', isSubmitted: true },
    ];
    const otherStandings = calculateProvisionalStandings(members, [otherWeek], [live], picks);
    expect(otherStandings.find((entry) => entry.userId === 'jack')?.livePoints).toBe(0);
    expect(otherStandings.find((entry) => entry.userId === 'jcone2')?.livePoints).toBe(1);
    expect(getJackWeek8HomeSpread(8, 'CAR', 'GB', 2026)).toBeNull();
  });

  it('retains generic half-point push arithmetic without adding a live league line', () => {
    const game = { gameId: 'unit-only', awayTeam: 'TEN', homeTeam: 'CIN',
      homeScore: 21, awayScore: 14, spread: -7, status: 'FINAL' as const };
    const pick = { userId: 'jack', userName: 'Jack', gameId: game.gameId, selectedTeam: 'CIN' };
    expect(evaluatePickATS(pick, game).points).toBe(0.5);
    expect(scoreLeaguePick(pick, game)).toBe(0.5);
  });
});
