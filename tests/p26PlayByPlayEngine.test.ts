import { describe, it, expect } from 'vitest';
import { PlayByPlayReconciliationService, GameDriveTelemetry } from '../src/services/PlayByPlayReconciliationService';

describe('Phase 26.1 Play-by-Play & State Reconciliation Engine Invariants', () => {
  it('detects scoring play and triggers SCORING_PLAY state when box score updates ahead of drive feed', () => {
    const service = new PlayByPlayReconciliationService();
    const gameId = 'game-kc-buf';

    service.seedGame(gameId, {
      awayScore: 21,
      homeScore: 24,
      yardline: 4,
      downAndDistance: '2nd & Goal',
      possession: 'HOME',
      driveState: 'NORMAL'
    });

    // Box score jumps by 6 points (Touchdown), but drive feed has not caught up
    const state = service.reconcileBoxScoreUpdate(gameId, 21, 30);

    expect(state.driveState).toBe('SCORING_PLAY');
    expect(state.scoringEvent).toBe('TOUCHDOWN');
    expect(state.freezeAnimation).toBe(true);
  });

  it('resumes NORMAL drive tracking once kickoff/new drive is confirmed in play-by-play feed', () => {
    const service = new PlayByPlayReconciliationService();
    const gameId = 'game-sf-sea';

    service.seedGame(gameId, {
      awayScore: 14,
      homeScore: 17,
      yardline: 2,
      downAndDistance: '1st & Goal',
      possession: 'AWAY',
      driveState: 'NORMAL'
    });

    service.reconcileBoxScoreUpdate(gameId, 20, 17); // Scoring play entered
    expect(service.getGameState(gameId).driveState).toBe('SCORING_PLAY');

    // Play-by-play catches up with new kickoff at SEA 25
    const updated = service.ingestPlayByPlayDelta(gameId, {
      yardline: 25,
      downAndDistance: '1st & 10',
      possession: 'HOME',
      isNewDrive: true
    });

    expect(updated.driveState).toBe('NORMAL');
    expect(updated.scoringEvent).toBeNull();
    expect(updated.freezeAnimation).toBe(false);
    expect(updated.yardline).toBe(25);
  });

  it('computes targeted JSON delta patches without broadcasting entire slate payload', () => {
    const service = new PlayByPlayReconciliationService();
    const previous: GameDriveTelemetry = {
      gameId: 'g1',
      awayScore: 14,
      homeScore: 14,
      yardline: 35,
      downAndDistance: '1st & 10',
      possession: 'HOME',
      driveState: 'NORMAL',
      scoringEvent: null,
      freezeAnimation: false
    };

    const next: GameDriveTelemetry = {
      ...previous,
      yardline: 43,
      downAndDistance: '2nd & 2'
    };

    const patch = service.generateJsonDelta(previous, next);
    expect(patch).toHaveLength(2);
    expect(patch).toContainEqual({ op: 'replace', path: '/yardline', value: 43 });
    expect(patch).toContainEqual({ op: 'replace', path: '/downAndDistance', value: '2nd & 2' });
  });
});
