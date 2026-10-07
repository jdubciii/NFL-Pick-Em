import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuickFillSafetyEngine, SlateGameItem } from '../client/src/services/QuickFillSafetyEngine';

describe('Phase 26.3 Picks Ergonomics & Preset Safety Net Invariants', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const games: SlateGameItem[] = [
    { gameId: 'g1', awayTeam: 'TB', homeTeam: 'DAL', favorite: 'TB', isLocked: false },
    { gameId: 'g2', awayTeam: 'PHI', homeTeam: 'JAX', favorite: 'PHI', isLocked: false },
    { gameId: 'g3', awayTeam: 'KC', homeTeam: 'BUF', favorite: 'KC', isLocked: true } // Decision #65 Locked
  ];

  it('enforces Decision #65 Lock Supremacy: quick-fill never overwrites locked games', () => {
    const engine = new QuickFillSafetyEngine();
    const currentPicks = { g3: 'BUF' };

    const { updatedPicks, affectedCount } = engine.applyPreset(games, currentPicks, 'FAVORITES');

    expect(affectedCount).toBe(2); // Only g1 and g2 unlocked
    expect(updatedPicks['g1']).toBe('TB');
    expect(updatedPicks['g2']).toBe('PHI');
    expect(updatedPicks['g3']).toBe('BUF'); // Untouched locked pick
  });

  it('reverts optimistic selections when Undo is triggered within 7 seconds', () => {
    const engine = new QuickFillSafetyEngine();
    const originalPicks = { g1: 'DAL', g2: 'JAX' };

    engine.stagePreset(games, originalPicks, 'FAVORITES');
    expect(engine.getActivePicks()['g1']).toBe('TB');

    // Tap UNDO at 3 seconds
    vi.advanceTimersByTime(3000);
    const reverted = engine.triggerUndo();

    expect(reverted['g1']).toBe('DAL');
    expect(reverted['g2']).toBe('JAX');
    expect(engine.isPendingCommit()).toBe(false);
  });

  it('flushes picks to database and triggers commit callback when 7s timer expires', () => {
    const engine = new QuickFillSafetyEngine();
    const commitCallback = vi.fn();
    const originalPicks = { g1: 'DAL' };

    engine.stagePreset(games, originalPicks, 'FAVORITES', commitCallback);
    expect(commitCallback).not.toHaveBeenCalled();

    // Advance 7 seconds
    vi.advanceTimersByTime(7000);
    expect(commitCallback).toHaveBeenCalledTimes(1);
    expect(engine.isPendingCommit()).toBe(false);
  });
});
