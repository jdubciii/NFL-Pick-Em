import { PlayoffRound } from './phase19BracketService';

export interface PostseasonSurvivorEntry {
  userId: string;
  poolId: string;
  isEliminated: boolean;
  eliminatedInRound?: PlayoffRound;
  usedTeamIds: string[]; // Strict no-reuse rule throughout playoffs
}

export interface SurvivorPickSubmission {
  userId: string;
  poolId: string;
  round: PlayoffRound;
  selectedTeamId: string;
  gameKickoff: Date;
  submissionTime: Date;
}

export interface SurvivorSubmissionResult {
  success: boolean;
  updatedEntry?: PostseasonSurvivorEntry;
  error?: string;
}

export class Phase19SurvivorService {
  private static readonly CIRCUIT_BREAKER_KEY = 'playoff_bracket_engine';

  public static isFeatureEnabled(flagStoreValue: boolean | null | undefined): boolean {
    return flagStoreValue === true;
  }

  /**
   * Enforces Decision #62 (Circuit Breaker), Decision #65 (Lock Supremacy),
   * Decision #20 (Pool Isolation), and Decision #55 (Fail-Closed Team Exhaustion).
   */
  public static submitSurvivorPick(
    entry: PostseasonSurvivorEntry,
    submission: SurvivorPickSubmission,
    flagStoreValue: boolean | null | undefined
  ): SurvivorSubmissionResult {
    if (!this.isFeatureEnabled(flagStoreValue)) {
      return { success: false, error: 'CIRCUIT_BREAKER_DISABLED: Playoff survivor feature is disabled' };
    }

    if (entry.poolId !== submission.poolId) {
      return { success: false, error: 'POOL_MISMATCH_VIOLATION: Entry does not match submission pool scope' };
    }

    if (entry.isEliminated) {
      return {
        success: false,
        error: 'FAIL_CLOSED_ELIMINATED_USER: Eliminated participants cannot submit postseason survivor picks',
      };
    }

    // Decision #65: Lock supremacy against selected game kickoff
    if (submission.submissionTime.getTime() >= submission.gameKickoff.getTime()) {
      return {
        success: false,
        error: 'LOCK_SUPREMACY_VIOLATION: Survivor picks lock at game kickoff timestamp',
      };
    }

    // Decision #55: Strict single-use team exhaustion across entire postseason
    if (entry.usedTeamIds.includes(submission.selectedTeamId)) {
      return {
        success: false,
        error: 'TEAM_EXHAUSTION_VIOLATION: Team has already been used in a previous playoff round',
      };
    }

    const updated: PostseasonSurvivorEntry = {
      ...entry,
      usedTeamIds: [...entry.usedTeamIds, submission.selectedTeamId],
    };

    return {
      success: true,
      updatedEntry: updated,
    };
  }

  /**
   * Grades postseason survivor outcome.
   * If selected team loses, participant is immediately marked eliminated.
   */
  public static gradeSurvivorPick(
    entry: PostseasonSurvivorEntry,
    selectedTeamId: string,
    winningTeamId: string,
    round: PlayoffRound
  ): PostseasonSurvivorEntry {
    if (selectedTeamId !== winningTeamId) {
      return {
        ...entry,
        isEliminated: true,
        eliminatedInRound: round,
      };
    }
    return entry;
  }
}
