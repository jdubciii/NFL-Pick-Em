import { describe, it, expect } from 'vitest';
import {
  Phase19BracketEngineService,
  PlayoffGame,
  SubmitBracketPickInput,
} from '../src/services/phase19BracketEngineService';

describe('Phase 19 Milestone 19.1: Playoff Bracket Engine & Lock Supremacy Invariants', () => {
  const roundKickoff = new Date('2027-01-16T18:00:00.000Z');

  const sampleGame: PlayoffGame = {
    id: 'game_wc_afc_1',
    round: 'WILDCARD',
    homeTeamId: 'KC',
    awayTeamId: 'BUF',
    kickoffTime: roundKickoff,
    isFinalized: false,
  };

  const validInput: SubmitBracketPickInput = {
    userId: 'usr_playoff_01',
    poolId: 'pool_afc_championship',
    gameId: 'game_wc_afc_1',
    round: 'WILDCARD',
    selectedTeamId: 'KC',
    submissionTime: new Date('2027-01-16T17:45:00.000Z'),
    roundKickoffTime: roundKickoff,
  };

  it('enforces Decision #62: Fails closed when feature flag is disabled or unconfigured', () => {
    const res = Phase19BracketEngineService.submitBracketPick(validInput, sampleGame, false);
    expect(res.success).toBe(false);
    expect(res.error).toContain('CIRCUIT_BREAKER_DISABLED');
  });

  it('enforces Decision #65: Rejects picks submitted exactly at or after round kickoff', () => {
    const atKickoffInput: SubmitBracketPickInput = {
      ...validInput,
      submissionTime: roundKickoff,
    };
    const resAt = Phase19BracketEngineService.submitBracketPick(atKickoffInput, sampleGame, true);
    expect(resAt.success).toBe(false);
    expect(resAt.error).toContain('LOCK_SUPREMACY_VIOLATION');

    const postKickoffInput: SubmitBracketPickInput = {
      ...validInput,
      submissionTime: new Date('2027-01-16T18:00:01.000Z'),
    };
    const resPost = Phase19BracketEngineService.submitBracketPick(postKickoffInput, sampleGame, true);
    expect(resPost.success).toBe(false);
    expect(resPost.error).toContain('LOCK_SUPREMACY_VIOLATION');
  });

  it('enforces Decision #55: Rejects selection of team not participating in game', () => {
    const invalidTeamInput: SubmitBracketPickInput = {
      ...validInput,
      selectedTeamId: 'MIA', // MIA not KC or BUF
    };
    const res = Phase19BracketEngineService.submitBracketPick(invalidTeamInput, sampleGame, true);
    expect(res.success).toBe(false);
    expect(res.error).toContain('INVALID_TEAM_SELECTION');
  });

  it('accepts valid pick submitted prior to kickoff and preserves pool scope (Decision #20)', () => {
    const res = Phase19BracketEngineService.submitBracketPick(validInput, sampleGame, true);
    expect(res.success).toBe(true);
    expect(res.pick?.selectedTeamId).toBe('KC');
    expect(res.pick?.bracketId).toContain('pool_afc_championship');
  });

  it('grades completed game correctly and refuses grading for unfinalized game (Decision #55)', () => {
    const pick = {
      id: 'bpk_1',
      bracketId: 'brk_1',
      gameId: 'game_wc_afc_1',
      round: 'WILDCARD' as const,
      selectedTeamId: 'KC',
    };

    const unfinalizedGrading = Phase19BracketEngineService.gradeBracketPick(pick, sampleGame);
    expect(unfinalizedGrading.graded).toBe(false);
    expect(unfinalizedGrading.error).toContain('GAME_NOT_FINALIZED');

    const finalizedGame: PlayoffGame = {
      ...sampleGame,
      isFinalized: true,
      winnerTeamId: 'KC',
    };

    const finalizedGrading = Phase19BracketEngineService.gradeBracketPick(pick, finalizedGame);
    expect(finalizedGrading.graded).toBe(true);
    expect(finalizedGrading.isCorrect).toBe(true);
  });
});
