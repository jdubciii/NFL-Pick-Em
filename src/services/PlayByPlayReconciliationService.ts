export interface GameDriveTelemetry {
  gameId: string;
  awayScore: number;
  homeScore: number;
  yardline: number; // 0 to 100
  downAndDistance: string; // e.g. '1st & 10'
  possession: 'HOME' | 'AWAY';
  driveState: 'NORMAL' | 'SCORING_PLAY' | 'TIMEOUT' | 'END_OF_PERIOD';
  scoringEvent: 'TOUCHDOWN' | 'FIELD_GOAL' | 'SAFETY' | null;
  freezeAnimation: boolean;
}

export interface JsonDeltaOp {
  op: 'replace';
  path: string;
  value: any;
}

export class PlayByPlayReconciliationService {
  private cache: Map<string, GameDriveTelemetry> = new Map();

  seedGame(gameId: string, initial: Partial<GameDriveTelemetry>): void {
    this.cache.set(gameId, {
      gameId,
      awayScore: initial.awayScore ?? 0,
      homeScore: initial.homeScore ?? 0,
      yardline: initial.yardline ?? 25,
      downAndDistance: initial.downAndDistance ?? '1st & 10',
      possession: initial.possession ?? 'AWAY',
      driveState: initial.driveState ?? 'NORMAL',
      scoringEvent: initial.scoringEvent ?? null,
      freezeAnimation: initial.freezeAnimation ?? false
    });
  }

  getGameState(gameId: string): GameDriveTelemetry {
    return this.cache.get(gameId) || {
      gameId,
      awayScore: 0,
      homeScore: 0,
      yardline: 25,
      downAndDistance: '1st & 10',
      possession: 'AWAY',
      driveState: 'NORMAL',
      scoringEvent: null,
      freezeAnimation: false
    };
  }

  reconcileBoxScoreUpdate(gameId: string, newAwayScore: number, newHomeScore: number): GameDriveTelemetry {
    const current = this.getGameState(gameId);
    const scoreDiff = (newAwayScore - current.awayScore) + (newHomeScore - current.homeScore);

    if (scoreDiff > 0) {
      let event: 'TOUCHDOWN' | 'FIELD_GOAL' | 'SAFETY' = 'TOUCHDOWN';
      if (scoreDiff === 3) event = 'FIELD_GOAL';
      if (scoreDiff === 2) event = 'SAFETY';

      current.awayScore = newAwayScore;
      current.homeScore = newHomeScore;
      current.driveState = 'SCORING_PLAY';
      current.scoringEvent = event;
      current.freezeAnimation = true;
      this.cache.set(gameId, current);
    }

    return current;
  }

  ingestPlayByPlayDelta(
    gameId: string,
    delta: {
      yardline?: number;
      downAndDistance?: string;
      possession?: 'HOME' | 'AWAY';
      isNewDrive?: boolean;
    }
  ): GameDriveTelemetry {
    const current = this.getGameState(gameId);

    if (delta.isNewDrive && current.driveState === 'SCORING_PLAY') {
      current.driveState = 'NORMAL';
      current.scoringEvent = null;
      current.freezeAnimation = false;
    }

    if (delta.yardline !== undefined) current.yardline = delta.yardline;
    if (delta.downAndDistance !== undefined) current.downAndDistance = delta.downAndDistance;
    if (delta.possession !== undefined) current.possession = delta.possession;

    this.cache.set(gameId, current);
    return current;
  }

  generateJsonDelta(prev: GameDriveTelemetry, next: GameDriveTelemetry): JsonDeltaOp[] {
    const ops: JsonDeltaOp[] = [];
    const keys: (keyof GameDriveTelemetry)[] = [
      'awayScore', 'homeScore', 'yardline', 'downAndDistance', 
      'possession', 'driveState', 'scoringEvent', 'freezeAnimation'
    ];

    for (const key of keys) {
      if (prev[key] !== next[key]) {
        ops.push({
          op: 'replace',
          path: `/${key}`,
          value: next[key]
        });
      }
    }

    return ops;
  }
}

export const playByPlayReconciliationService = new PlayByPlayReconciliationService();
