import { Prisma } from '@prisma/client';
import { PlayoffRound, BracketPick } from './phase19BracketService';

export interface PlayoffGame {
  id: string;
  round: PlayoffRound;
  homeTeamId: string;
  awayTeamId: string;
  kickoffTime: Date;
  winnerTeamId?: string;
  isFinalized: boolean;
}

export interface SubmitBracketPickInput {
  userId: string;
  poolId: string;
  gameId: string;
  round: PlayoffRound;
  selectedTeamId: string;
  submissionTime: Date;
  roundKickoffTime: Date;
}

export interface BracketSubmissionResult {
  success: boolean;
  pick?: BracketPick;
  error?: string;
}

export class Phase19BracketEngineService {
  private static readonly CIRCUIT_BREAKER_KEY = 'playoff_bracket_engine';

  public static isFeatureEnabled(flagStoreValue: boolean | null | undefined): boolean {
    return flagStoreValue === true;
  }

  /**
   * Enforces Decision #62 (Circuit Breaker), Decision #65 (Lock Supremacy),
   * Decision #20 (Pool Isolation), and Decision #55 (Fail-Closed Team Eligibility).
   */
  public static submitBracketPick(
    input: SubmitBracketPickInput,
    game: PlayoffGame,
    flagStoreValue: boolean | null | undefined
  ): BracketSubmissionResult {
    if (!this.isFeatureEnabled(flagStoreValue)) {
      return { success: false, error: 'CIRCUIT_BREAKER_DISABLED: Playoff bracket engine is disabled' };
    }

    if (game.id !== input.gameId || game.round !== input.round) {
      return { success: false, error: 'GAME_ROUND_MISMATCH: Pick target does not match game configuration' };
    }

    // Decision #65: Strict Lock Supremacy at round kickoff
    if (input.submissionTime.getTime() >= input.roundKickoffTime.getTime()) {
      return {
        success: false,
        error: 'LOCK_SUPREMACY_VIOLATION: Submissions locked after round kickoff timestamp',
      };
    }

    // Decision #55: Fail-closed verification of selected team in pairing
    if (input.selectedTeamId !== game.homeTeamId && input.selectedTeamId !== game.awayTeamId) {
      return {
        success: false,
        error: 'INVALID_TEAM_SELECTION: Selected team is not participating in specified game',
      };
    }

    const pick: BracketPick = {
      id: 'bpk_' + input.userId + '_' + input.gameId,
      bracketId: 'brk_' + input.userId + '_' + input.poolId,
      gameId: input.gameId,
      round: input.round,
      selectedTeamId: input.selectedTeamId,
    };

    return {
      success: true,
      pick,
    };
  }

  /**
   * Evaluates bracket pick accuracy.
   * Enforces Decision #54 (Read-Only GET/Evaluation) and Decision #55 (Fail-Closed Finality).
   */
  public static gradeBracketPick(
    pick: BracketPick,
    game: PlayoffGame
  ): { graded: boolean; isCorrect?: boolean; error?: string } {
    if (!game.isFinalized || !game.winnerTeamId) {
      return {
        graded: false,
        error: 'GAME_NOT_FINALIZED: Cannot grade pick prior to game finalization',
      };
    }

    return {
      graded: true,
      isCorrect: pick.selectedTeamId === game.winnerTeamId,
    };
  }
}
