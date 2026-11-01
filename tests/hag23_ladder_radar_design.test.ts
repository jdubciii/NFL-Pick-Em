import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WeeklyLadderView } from '../client/src/components/shame/WeeklyLadderView';
import { deriveSundaySlatePhase, sundaySlatePhaseLabel } from '../client/src/services/radarSundaySlatePhase';
import type { LiveGame } from '../client/src/services/liveScoreService';
import type { SlateGame } from '../client/src/services/sweatProjectionService';

const saturdayNight = Date.parse('2026-11-01T03:22:00Z');
const sundayEarly = '2026-11-01T18:00:00Z';
const sundayNight = '2026-11-02T01:20:00Z'; // Still Sunday in Arizona.

function game(id: string, kickoffTime: string, status: string): SlateGame {
  return { id, homeTeam: 'GB', awayTeam: 'CAR', kickoffTime, status };
}

function live(id: string, kickoffTime: string, status: LiveGame['status']): LiveGame {
  return {
    id, name: id, shortName: id,
    homeTeam: { code: 'GB', name: 'Green Bay' },
    awayTeam: { code: 'CAR', name: 'Carolina' },
    status, kickoffTime, clock: '', period: 0,
  };
}

describe('Radar Sunday slate phase', () => {
  it('ignores Thursday FINAL and Monday games when Sunday games have not kicked off', () => {
    const games = [
      game('thu', '2026-10-30T00:15:00Z', 'FINAL'),
      game('early', sundayEarly, 'SCHEDULED'),
      game('night', sundayNight, 'SCHEDULED'),
      game('mon', '2026-11-03T01:15:00Z', 'SCHEDULED'),
    ];
    expect(deriveSundaySlatePhase(games, [], { now: saturdayNight })).toBe('PRE-KICKOFF');
    expect(sundaySlatePhaseLabel('PRE-KICKOFF')).toBe('SUNDAY SLATE · PRE-KICKOFF');
  });

  it('moves through in progress and final from included Sunday game results', () => {
    const games = [game('early', sundayEarly, 'SCHEDULED'), game('night', sundayNight, 'SCHEDULED')];
    const inProgress = [live('early', sundayEarly, 'IN_PROGRESS'), live('night', sundayNight, 'SCHEDULED')];
    expect(deriveSundaySlatePhase(games, inProgress, { now: Date.parse(sundayEarly) + 60_000 })).toBe('IN PROGRESS');
    expect(deriveSundaySlatePhase(games, [live('early', sundayEarly, 'FINAL'), inProgress[1]], { now: Date.parse(sundayEarly) + 60_000 })).toBe('IN PROGRESS');
    expect(deriveSundaySlatePhase(games, [live('early', sundayEarly, 'FINAL'), live('night', sundayNight, 'FINAL')], { now: Date.parse(sundayNight) + 60_000 })).toBe('FINAL');
  });

  it('does not claim pre-kickoff from stale or missing updates after scheduled kickoff', () => {
    const games = [game('early', sundayEarly, 'SCHEDULED')];
    expect(deriveSundaySlatePhase(games, [], { now: Date.parse(sundayEarly) + 60_000 })).toBe('AWAITING GAME UPDATES');
    expect(deriveSundaySlatePhase(games, [live('early', sundayEarly, 'SCHEDULED')], { now: saturdayNight, isStale: true })).toBe('AWAITING GAME UPDATES');
    expect(deriveSundaySlatePhase([], [], { now: saturdayNight })).toBe('AWAITING GAME UPDATES');
  });
});

describe('Shame Ladder provisional tie copy', () => {
  it('shows tied competition ranks, pending tiebreaker and quiet empty Danger tier without changing the members', () => {
    const ladder = [
      ...Array.from({ length: 7 }, (_, i) => ({ userId: `safe-${i}`, userName: `Safe ${i}`, tier: 'SAFE', rank: 1, displayRank: 'Tied #1' })),
      ...Array.from({ length: 3 }, (_, i) => ({ userId: `high-${i}`, userName: `High ${i}`, tier: 'DANGER_HIGH', rank: 8, displayRank: 'Tied #8' })),
    ];
    const html = renderToStaticMarkup(React.createElement(WeeklyLadderView, {
      ladder, status: 'READY', weekNumber: 8, tiebreakerPending: true,
    }));
    expect((html.match(/Tied #1/g) || [])).toHaveLength(7);
    expect((html.match(/Tied #8/g) || [])).toHaveLength(3);
    expect(html).toContain('Provisional standings · Tiebreaker pending');
    expect(html).toContain('Shot tiers show current exposure');
    expect(html).toContain('No members currently in this tier.');
    expect(html.indexOf('SAFE HAVEN //')).toBeLessThan(html.indexOf('DANGER ZONE //'));
    expect(html.indexOf('DANGER ZONE //')).toBeLessThan(html.indexOf('HIGH DANGER //'));
  });
});
