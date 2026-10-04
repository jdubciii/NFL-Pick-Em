import { describe, it, expect } from 'vitest';
import { WeeklyStateGraphService, SlateState, GameLockState } from '../src/services/weeklyStateGraph';

describe('Milestone 14.2 - Weekly State Graph & Amendments A1-A8 (Decision #65)', () => {
  const t0 = new Date('2026-10-04T17:00:00Z'); // Sunday 1:00 PM ET
  const games: GameLockState[] = [
    { id: 'g1', kickoffTime: new Date('2026-10-04T17:00:00Z'), status: 'SCHEDULED' },
    { id: 'g2', kickoffTime: new Date('2026-10-04T20:25:00Z'), status: 'SCHEDULED' },
    { id: 'g3', kickoffTime: new Date('2026-10-05T00:20:00Z'), status: 'SCHEDULED' }
  ];

  it('A1: Derives OPEN when no games have reached kickoff', () => {
    const beforeT0 = new Date('2026-10-04T16:59:59Z');
    const state = WeeklyStateGraphService.deriveSlateState(games, beforeT0);
    expect(state).toBe(SlateState.OPEN);
  });

  it('A1 & A7: Derives PARTIAL_LOCK when at least one game locked and at least one unlocked', () => {
    const atT0 = new Date('2026-10-04T17:00:00Z');
    const state = WeeklyStateGraphService.deriveSlateState(games, atT0);
    expect(state).toBe(SlateState.PARTIAL_LOCK);
  });

  it('A1 & A7: Derives LIVE when all games are locked but not all final', () => {
    const afterAllKickoff = new Date('2026-10-05T01:00:00Z');
    const state = WeeklyStateGraphService.deriveSlateState(games, afterAllKickoff);
    expect(state).toBe(SlateState.LIVE);
  });

  it('A1: Derives SETTLEMENT when all games are final', () => {
    const finalGames: GameLockState[] = games.map(g => ({ ...g, status: 'FINAL' }));
    const afterAllFinal = new Date('2026-10-05T04:00:00Z');
    const state = WeeklyStateGraphService.deriveSlateState(finalGames, afterAllFinal);
    expect(state).toBe(SlateState.SETTLEMENT);
  });

  it('A6: Derives FINALIZED when slate is committed', () => {
    const finalGames: GameLockState[] = games.map(g => ({ ...g, status: 'FINAL' }));
    const state = WeeklyStateGraphService.deriveSlateState(finalGames, new Date(), true);
    expect(state).toBe(SlateState.FINALIZED);
  });

  it('A2: Game lock remains authoritative independent of slate state', () => {
    const game1 = games[0];
    const game2 = games[1];
    const currentTime = new Date('2026-10-04T17:05:00Z');

    expect(WeeklyStateGraphService.isGameLocked(game1, currentTime)).toBe(true);
    expect(WeeklyStateGraphService.isGameLocked(game2, currentTime)).toBe(false);
  });
});
