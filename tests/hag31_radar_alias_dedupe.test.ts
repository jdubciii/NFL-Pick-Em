import { describe, expect, it } from 'vitest';
import {
  calculateProvisionalStandings,
  type SlateGame,
  type UserPickItem,
  type UserStandingRef,
} from '../client/src/services/sweatProjectionService';
import type { LiveGame } from '../client/src/services/liveScoreService';

const users: UserStandingRef[] = [
  { id: 'leader', name: 'Leader' },
  { id: 'jack', name: 'Jack' },
];

const games: SlateGame[] = Array.from({ length: 9 }, (_, index) => {
  const gameNumber = index + 1;
  return {
    id: `db-${gameNumber}`,
    externalGameId: `espn-${gameNumber}`,
    homeTeam: `H${gameNumber}`,
    awayTeam: `A${gameNumber}`,
  };
});

function scores(statusForLaterGames: LiveGame['status'] = 'IN_PROGRESS'): LiveGame[] {
  return games.map((game, index) => ({
    id: game.externalGameId!,
    name: `${game.awayTeam} @ ${game.homeTeam}`,
    shortName: `${game.awayTeam} @ ${game.homeTeam}`,
    status: index === 0 ? 'FINAL' : statusForLaterGames,
    clock: index === 0 ? '0:00' : '8:00',
    period: index === 0 ? 4 : 3,
    homeTeam: { code: game.homeTeam, name: game.homeTeam, score: index === 0 || statusForLaterGames === 'IN_PROGRESS' ? '21' : '0' },
    awayTeam: { code: game.awayTeam, name: game.awayTeam, score: index === 0 || statusForLaterGames === 'IN_PROGRESS' ? '14' : '0' },
  }));
}

const storedPicks: UserPickItem[] = users.flatMap((user) =>
  games.map((game, index) => ({
    userId: user.id,
    gameId: game.id,
    // Leader has seven correct picks; Jack has four and misses the one final game.
    selectedTeam: user.id === 'leader' ? (index < 7 ? game.homeTeam : game.awayTeam)
      : (index >= 1 && index <= 4 ? game.homeTeam : game.awayTeam),
    isSubmitted: true,
  }))
);

const aliasedPicks: UserPickItem[] = storedPicks.flatMap((pick) => {
  const game = games.find((entry) => entry.id === pick.gameId)!;
  return [pick, { ...pick, gameId: game.externalGameId! }];
});

describe('HAG-31 Radar pick identity deduplication', () => {
  it('counts each of nine league games once per member while preserving rank order', () => {
    const unique = calculateProvisionalStandings(users, games, scores(), storedPicks);
    const aliased = calculateProvisionalStandings(users, games, scores(), aliasedPicks);

    expect(aliasedPicks).toHaveLength(36); // Two IDs for each of 18 stored picks.
    expect(aliased.map(({ userId }) => userId)).toEqual(['leader', 'jack']);
    expect(aliased.map(({ bankedPoints, livePoints, totalProvisionalPoints }) => ({
      bankedPoints, livePoints, totalProvisionalPoints,
    }))).toEqual([
      { bankedPoints: 1, livePoints: 6, totalProvisionalPoints: 7 },
      { bankedPoints: 0, livePoints: 4, totalProvisionalPoints: 4 },
    ]);
    expect(aliased.every((entry) => entry.totalProvisionalPoints <= 9)).toBe(true);
    expect(aliased.map(({ provisionalRank, tier, isTied }) => ({ provisionalRank, tier, isTied })))
      .toEqual(unique.map(({ provisionalRank, tier, isTied }) => ({ provisionalRank, tier, isTied })));
    expect(aliased.map(({ totalProvisionalPoints }) => totalProvisionalPoints))
      .toEqual(unique.map(({ totalProvisionalPoints }) => totalProvisionalPoints));
  });

  it('banks at most one point for the single final game, even with aliases', () => {
    const standings = calculateProvisionalStandings(users, games, scores('SCHEDULED'), aliasedPicks);
    expect(standings.find((entry) => entry.userId === 'leader')?.bankedPoints).toBe(1);
    expect(standings.find((entry) => entry.userId === 'jack')?.bankedPoints).toBe(0);
    expect(standings.map((entry) => entry.livePoints)).toEqual([0, 0]);
    expect(standings.map((entry) => entry.totalProvisionalPoints)).toEqual([1, 0]);
  });

  it('caps a perfect Week 8 slate at nine points despite both ID aliases', () => {
    const perfectPicks = games.flatMap((game) => [
      { userId: 'leader', gameId: game.id, selectedTeam: game.homeTeam, isSubmitted: true },
      { userId: 'leader', gameId: game.externalGameId!, selectedTeam: game.homeTeam, isSubmitted: true },
    ]);
    const [standing] = calculateProvisionalStandings(users.slice(0, 1), games, scores(), perfectPicks);
    expect(standing.bankedPoints).toBe(1);
    expect(standing.livePoints).toBe(8);
    expect(standing.totalProvisionalPoints).toBe(9);
  });

  it('does not let an unsubmitted alias suppress a valid submitted pick', () => {
    const picks: UserPickItem[] = [
      { ...storedPicks[0], isSubmitted: false },
      { ...storedPicks[0], gameId: games[0].externalGameId! },
    ];
    const standings = calculateProvisionalStandings(users.slice(0, 1), games, scores('SCHEDULED'), picks);
    expect(standings[0].bankedPoints).toBe(1);
  });
});
