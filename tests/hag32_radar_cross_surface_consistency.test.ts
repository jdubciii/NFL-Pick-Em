import { describe, expect, it } from 'vitest';
import { buildPersonalRootingQueue } from '../client/src/services/dependableInfoService';
import { calculateRivalryShowdown } from '../client/src/services/rivalryShowdownService';
import {
  calculateProvisionalStandings,
  type SlateGame,
  type UserPickItem,
  type UserStandingRef,
} from '../client/src/services/sweatProjectionService';
import {
  createEmptyReceiptSession,
  observeProjectionSnapshot,
  type ProjectionSnapshot,
} from '../client/src/services/sweatReceiptService';
import type { LiveGame } from '../client/src/services/liveScoreService';

const members: UserStandingRef[] = [
  { id: 'jack', name: 'Jack' },
  { id: 'jcone2', name: 'jcone2' },
];

const games: SlateGame[] = Array.from({ length: 9 }, (_, index) => ({
  id: `db-${index}`,
  externalGameId: `espn-${index}`,
  awayTeam: `A${index}`,
  homeTeam: `H${index}`,
}));

const liveScores: LiveGame[] = games.map((game, index) => ({
  id: game.externalGameId!,
  name: `${game.awayTeam} @ ${game.homeTeam}`,
  shortName: `${game.awayTeam} @ ${game.homeTeam}`,
  status: index === 0 ? 'FINAL' : 'IN_PROGRESS',
  clock: index === 0 ? '0:00' : '8:00',
  period: index === 0 ? 4 : 3,
  homeTeam: { code: game.homeTeam, name: game.homeTeam, score: '21' },
  awayTeam: { code: game.awayTeam, name: game.awayTeam, score: '14' },
}));

const uniquePicks: UserPickItem[] = members.flatMap((member) =>
  games.map((game, index) => ({
    userId: member.id,
    gameId: game.id,
    selectedTeam: index === 0 || (member.id === 'jack' ? index <= 3 : index <= 6)
      ? game.homeTeam : game.awayTeam,
    isSubmitted: true,
  }))
);

const aliasedPicks: UserPickItem[] = uniquePicks.flatMap((pick) => {
  const game = games.find((entry) => entry.id === pick.gameId)!;
  return [pick, { ...pick, gameId: game.externalGameId! }];
});

describe('HAG-32 Radar cross-surface point consistency', () => {
  it('uses one point per game across projection, table, Duel, and rooting queue', () => {
    const standings = calculateProvisionalStandings(members, games, liveScores, aliasedPicks);
    const jack = standings.find((entry) => entry.userId === 'jack')!;
    const rival = standings.find((entry) => entry.userId === 'jcone2')!;
    const duel = calculateRivalryShowdown(
      members[0], members[1], games, liveScores, aliasedPicks, aliasedPicks
    );

    // The League Projection snapshot and table use these same standing entries.
    expect([jack.bankedPoints, jack.livePoints, jack.totalProvisionalPoints]).toEqual([1, 3, 4]);
    expect([rival.bankedPoints, rival.livePoints, rival.totalProvisionalPoints]).toEqual([1, 6, 7]);
    expect(standings.map((entry) => [entry.userId, entry.totalProvisionalPoints])).toEqual([
      ['jcone2', 7], ['jack', 4],
    ]);

    expect(duel.userPoints).toEqual({ banked: 1, live: 3, total: 4 });
    expect(duel.rivalPoints).toEqual({ banked: 1, live: 6, total: 7 });
    expect(duel.pointGap).toBe(jack.totalProvisionalPoints - rival.totalProvisionalPoints);
    expect(duel.pointGap).toBe(-3);
    expect(duel.statusText).toBe('Chasing by 3');

    const splitGame = games[4];
    const queue = buildPersonalRootingQueue([{
      gameId: splitGame.id,
      awayTeam: splitGame.awayTeam,
      homeTeam: splitGame.homeTeam,
      viewerPick: splitGame.awayTeam,
      rivalPick: splitGame.homeTeam,
      status: 'IN_PROGRESS',
    }], {
      rivalDisplayName: members[1].name,
      currentViewerGap: jack.totalProvisionalPoints - rival.totalProvisionalPoints,
    });
    expect(queue[0].consequenceNote).toContain('from -3 to -2 pts');
  });

  it('records a new receipt from undoubled snapshots while keeping history semantics', () => {
    const standings = calculateProvisionalStandings(members, games, liveScores, aliasedPicks);
    const jack = standings.find((entry) => entry.userId === 'jack')!;
    const rival = standings.find((entry) => entry.userId === 'jcone2')!;
    const current: ProjectionSnapshot = {
      poolId: 'pool', week: 8,
      viewerId: jack.userId, viewerName: jack.userName,
      rivalId: rival.userId, rivalName: rival.userName,
      viewerPoints: jack.totalProvisionalPoints,
      rivalPoints: rival.totalProvisionalPoints,
      viewerProjectedTier: jack.tier,
      observedAtIso: '2026-11-01T19:00:00.000Z',
    };

    let session = observeProjectionSnapshot(createEmptyReceiptSession(), {
      ...current,
      rivalPoints: 4,
      observedAtIso: '2026-11-01T18:59:00.000Z',
    });
    expect(session.lastSnapshot?.viewerPoints).toBe(4);
    expect(session.lastSnapshot?.rivalPoints).toBe(4);
    expect(session.receipts).toHaveLength(0); // Initial load establishes a baseline.

    session = observeProjectionSnapshot(session, current);
    expect(session.receipts[0].beforeGap).toBe(0);
    expect(session.receipts[0].afterGap).toBe(-3);
    expect(session.lastSnapshot?.viewerPoints).toBe(4);
    expect(session.lastSnapshot?.rivalPoints).toBe(7);
  });
});
