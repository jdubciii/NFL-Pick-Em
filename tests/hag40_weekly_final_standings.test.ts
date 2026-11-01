import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WeeklyLadderView } from '../client/src/components/shame/WeeklyLadderView';
import type { LiveGame } from '../client/src/services/liveScoreService';
import { calculateProvisionalStandings, type SlateGame, type UserPickItem } from '../client/src/services/sweatProjectionService';
import {
  isWeeklyScoredSlateFinal,
  resolveWeeklyTiebreakerSnapshot,
} from '../client/src/services/weeklyStandingsFinalityService';

const members = [{ id: 'jack', name: 'Jack' }, { id: 'mark', name: 'Mark' }];
const games: SlateGame[] = Array.from({ length: 9 }, (_, index) => ({
  id: `db-${index + 1}`,
  externalGameId: `espn-${index + 1}`,
  homeTeam: index === 8 ? 'DET' : `H${index + 1}`,
  awayTeam: index === 8 ? 'MIN' : `A${index + 1}`,
  weekNumber: 8,
  seasonYear: 2026,
  kickoffTime: `2026-11-01T${String(10 + index).padStart(2, '0')}:00:00Z`,
}));
const picks: UserPickItem[] = members.map((member) => ({
  userId: member.id,
  gameId: 'db-1',
  selectedTeam: 'H1',
  isSubmitted: true,
}));

function scores(lastStatus: LiveGame['status']): LiveGame[] {
  return games.map((game, index) => ({
    id: game.externalGameId!,
    name: game.id,
    shortName: game.id,
    homeTeam: { code: game.homeTeam, name: game.homeTeam, score: index === 8 ? 21 : 14 },
    awayTeam: { code: game.awayTeam, name: game.awayTeam, score: index === 8 ? 19 : 7 },
    status: index === 8 ? lastStatus : 'FINAL',
    kickoffTime: game.kickoffTime!,
    clock: '',
    period: 4,
  }));
}

const tiebreakerPayload = {
  status: 'DEFAULT_LIONS',
  tiebreakerOffered: true,
  eventId: 'espn-9',
  readiness: [
    { userId: 'jack', prediction: 38.465 },
    { userId: 'mark', prediction: 38.47 },
  ],
};

describe('weekly scored-slate final posting', () => {
  it('stays provisional with eight of nine final, then posts final on the ninth; a Monday game is outside the slate', () => {
    const eightFinal = scores('IN_PROGRESS');
    const pending = resolveWeeklyTiebreakerSnapshot(tiebreakerPayload, members.map((m) => m.id), games, eightFinal);
    expect(pending.verified).toBe(true);
    expect(pending.data?.actualTotalScore).toBeUndefined();
    expect(isWeeklyScoredSlateFinal(games, eightFinal, pending, true)).toBe(false);

    const allFinal = scores('FINAL');
    const resolved = resolveWeeklyTiebreakerSnapshot(tiebreakerPayload, members.map((m) => m.id), games, allFinal);
    expect(resolved.data?.actualTotalScore).toBe(40);
    expect(isWeeklyScoredSlateFinal(games, allFinal, resolved, true)).toBe(true);
    const monday: LiveGame = {
      ...allFinal[0], id: 'monday-not-scored', status: 'SCHEDULED',
    };
    expect(isWeeklyScoredSlateFinal(games, [...allFinal, monday], resolved, true)).toBe(true);

    const finalStandings = calculateProvisionalStandings(members, games, allFinal, picks, resolved.data);
    expect(finalStandings.map(({ userId, totalProvisionalPoints, provisionalRank, isTied, tier }) =>
      ({ userId, totalProvisionalPoints, provisionalRank, isTied, tier }))).toEqual([
      { userId: 'mark', totalProvisionalPoints: 1, provisionalRank: 1, isTied: false, tier: 'SAFE_HAVEN' },
      { userId: 'jack', totalProvisionalPoints: 1, provisionalRank: 2, isTied: false, tier: 'PIT' },
    ]);
  });

  it('fails closed on missing scores, unverified slate, or designation outside the scored slate', () => {
    const allFinal = scores('FINAL');
    const resolved = resolveWeeklyTiebreakerSnapshot(tiebreakerPayload, members.map((m) => m.id), games, allFinal);
    expect(isWeeklyScoredSlateFinal(games, allFinal.slice(0, 8), resolved, true)).toBe(false);
    expect(isWeeklyScoredSlateFinal(games, allFinal, resolved, false)).toBe(false);
    expect(isWeeklyScoredSlateFinal(games, allFinal, { ...resolved, eventId: 'monday-not-scored' }, true)).toBe(false);
    const unavailable = resolveWeeklyTiebreakerSnapshot(
      { status: 'UNAVAILABLE', tiebreakerOffered: false, readiness: [] },
      members.map((member) => member.id), games, allFinal,
    );
    // Radar and Ladder must both require the Week 8 designation, even after 9/9 finals.
    expect(isWeeklyScoredSlateFinal(games, allFinal, unavailable, true, true)).toBe(false);
    expect(isWeeklyScoredSlateFinal(games, allFinal, { verified: true, offered: false }, true, true)).toBe(false);
    const invalidReadiness = { ...tiebreakerPayload, readiness: [{ userId: 'jack', prediction: 38.465 }] };
    expect(resolveWeeklyTiebreakerSnapshot(invalidReadiness, members.map((m) => m.id), games, allFinal).verified).toBe(false);
  });

  it('renders official penalties only after final posting, keeping competition ties', () => {
    const ladder = [
      { userId: 'jack', userName: 'Jack', rank: 1, displayRank: 'Tied #1', tier: 'SAFE HAVEN', status: 'OFFICIAL SAFE' },
      { userId: 'mark', userName: 'Mark', rank: 1, displayRank: 'Tied #1', tier: 'SAFE HAVEN', status: 'OFFICIAL SAFE' },
    ];
    const provisional = renderToStaticMarkup(React.createElement(WeeklyLadderView, {
      ladder, status: 'READY', weekNumber: 8, isFinalPosted: false,
    }));
    const final = renderToStaticMarkup(React.createElement(WeeklyLadderView, {
      ladder, status: 'READY', weekNumber: 8, isFinalPosted: true,
    }));
    expect(provisional).toContain('Provisional standings');
    expect(final).toContain('Final weekly standings');
    expect(final).toContain('Shot tiers are the official weekly penalties.');
    expect((final.match(/Tied #1/g) || [])).toHaveLength(2);
    expect(final).not.toContain('Monday Night settlement');
  });
});
