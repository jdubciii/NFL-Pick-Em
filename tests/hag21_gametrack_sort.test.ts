import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { sortGametrackGames } from '../client/src/components/matrix/LiveGametrackStream';
import { WeeklyLadderView } from '../client/src/components/shame/WeeklyLadderView';
import type { LiveGame } from '../client/src/services/liveScoreService';

function game(id: string, status: LiveGame['status'], dateTime?: string): LiveGame {
  return {
    id,
    name: id,
    shortName: id,
    homeTeam: { code: 'HOM', name: 'Home' },
    awayTeam: { code: 'AWY', name: 'Away' },
    status,
    clock: '',
    period: 0,
    dateTime,
  };
}

describe('Gametrack status and kickoff ordering', () => {
  it('groups final games before live and scheduled games, then sorts each group by full timestamp', () => {
    const monday = game('monday', 'SCHEDULED', '2026-11-03T01:15:00Z');
    const sundayNight = game('sunday-night', 'SCHEDULED', '2026-11-02T01:20:00Z');
    const thursday = game('thursday-final', 'FINAL', '2026-10-30T00:15:00Z');
    const sundayEarly = game('sunday-early', 'SCHEDULED', '2026-11-01T18:00:00Z');
    const laterFinal = game('later-final', 'FINAL', '2026-11-01T00:00:00Z');
    const live = game('live', 'IN_PROGRESS', '2026-11-01T20:00:00Z');
    const input = [monday, sundayNight, laterFinal, live, sundayEarly, thursday];

    expect(sortGametrackGames(input).map((item) => 'id' in item ? item.id : item.gameId)).toEqual([
      'thursday-final',
      'later-final',
      'live',
      'sunday-early',
      'sunday-night',
      'monday',
    ]);
    expect(input[0]).toBe(monday);
  });

  it('keeps missing kickoff times in their original order at the end of their status group', () => {
    const input = [game('unknown-a', 'SCHEDULED'), game('known', 'SCHEDULED', '2026-11-01T18:00:00Z'), game('unknown-b', 'SCHEDULED')];
    expect(sortGametrackGames(input).map((item) => 'id' in item ? item.id : item.gameId)).toEqual([
      'known', 'unknown-a', 'unknown-b',
    ]);
  });

  it('uses the kickoff timestamp when the feed dateTime is invalid', () => {
    const fallback = { ...game('fallback', 'SCHEDULED', 'invalid'), kickoffTime: '2026-11-01T18:00:00Z' };
    const later = game('later', 'SCHEDULED', '2026-11-02T01:20:00Z');
    expect(sortGametrackGames([later, fallback]).map((item) => 'id' in item ? item.id : item.gameId)).toEqual([
      'fallback', 'later',
    ]);
  });
});

describe('Shame Ladder zone order', () => {
  it('shows the empty one-shot zone between Safe Haven and High Danger in a full pool', () => {
    const ladder = [
      ...Array.from({ length: 7 }, (_, index) => ({ userId: `safe-${index}`, userName: `Safe ${index}`, tier: 'SAFE', rank: 1 })),
      ...Array.from({ length: 3 }, (_, index) => ({ userId: `high-${index}`, userName: `High ${index}`, tier: 'DANGER_HIGH', rank: 8 })),
    ];
    const html = renderToStaticMarkup(React.createElement(WeeklyLadderView, { ladder, status: 'READY', weekNumber: 8 }));

    const safe = html.indexOf('SAFE HAVEN //');
    const danger = html.indexOf('DANGER ZONE //');
    const high = html.indexOf('HIGH DANGER //');
    expect(safe).toBeGreaterThanOrEqual(0);
    expect(danger).toBeGreaterThan(safe);
    expect(high).toBeGreaterThan(danger);
  });
});
