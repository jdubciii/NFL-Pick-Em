export enum SlateState {
  PRE_SLATE = 'PRE_SLATE',
  OPEN = 'OPEN',
  PARTIAL_LOCK = 'PARTIAL_LOCK',
  LIVE = 'LIVE',
  SETTLEMENT = 'SETTLEMENT',
  FINALIZED = 'FINALIZED'
}

export interface GameLockState {
  id: string;
  kickoffTime: Date;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINAL';
}

export interface SlateTransitionRecord {
  id: string;
  poolId: string;
  weekNo: number;
  fromState: SlateState;
  toState: SlateState;
  transitionKey: string;
  occurredAt: Date;
}

export class WeeklyStateGraphService {
  // Pure derivation function satisfying Amendments A1-A4 & Decision #65
  static deriveSlateState(
    games: GameLockState[],
    now: Date = new Date(),
    isSlateFinalized: boolean = false
  ): SlateState {
    if (isSlateFinalized) {
      return SlateState.FINALIZED;
    }

    if (!games || games.length === 0) {
      return SlateState.PRE_SLATE;
    }

    const allFinal = games.every(g => g.status === 'FINAL');
    if (allFinal) {
      return SlateState.SETTLEMENT;
    }

    const lockedGames = games.filter(g => new Date(g.kickoffTime) <= now || g.status !== 'SCHEDULED');
    const unlockedGames = games.filter(g => new Date(g.kickoffTime) > now && g.status === 'SCHEDULED');

    if (lockedGames.length === 0) {
      return SlateState.OPEN;
    }

    if (unlockedGames.length > 0 && lockedGames.length > 0) {
      return SlateState.PARTIAL_LOCK;
    }

    // All games locked, but not all final
    return SlateState.LIVE;
  }

  // Irrevocable game lock check satisfying Amendment A2
  static isGameLocked(game: GameLockState, now: Date = new Date()): boolean {
    return new Date(game.kickoffTime) <= now || game.status !== 'SCHEDULED';
  }
}
