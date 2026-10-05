import { describe, it, expect } from 'vitest';
import {
  Phase19SurvivorService,
  PostseasonSurvivorEntry,
  SurvivorPickSubmission,
} from '../src/services/phase19SurvivorService';

describe('Phase 19 Milestone 19.3: Playoff Survivor Mode & Invariant Suite', () => {
  const kickoff = new Date('2027-01-16T18:00:00.000Z');

  const baseEntry: PostseasonSurvivorEntry = {
    userId: 'usr_survivor_01',
    poolId: 'pool_playoff_survivor',
    isEliminated: false,
    usedTeamIds: ['KC'], // KC already used in Wildcard round
  };

  const validSubmission: SurvivorPickSubmission = {
    userId: 'usr_survivor_01',
    poolId: 'pool_playoff_survivor',
    round: 'DIVISIONAL',
    selectedTeamId: 'BUF',
    gameKickoff: kickoff,
    submissionTime: new Date('2027-01-16T17:50:00.000Z'),
  };

  it('enforces Decision #62: Fails closed when feature flag is disabled or unconfigured', () => {
    const res = Phase19SurvivorService.submitSurvivorPick(baseEntry, validSubmission, false);
    expect(res.success).toBe(false);
    expect(res.error).toContain('CIRCUIT_BREAKER_DISABLED');
  });

  it('enforces Decision #65: Rejects picks submitted exactly at or following kickoff', () => {
    const atKickoff: SurvivorPickSubmission = { ...validSubmission, submissionTime: kickoff };
    const resAt = Phase19SurvivorService.submitSurvivorPick(baseEntry, atKickoff, true);
    expect(resAt.success).toBe(false);
    expect(resAt.error).toContain('LOCK_SUPREMACY_VIOLATION');

    const postKickoff: SurvivorPickSubmission = {
      ...validSubmission,
      submissionTime: new Date('2027-01-16T18:00:01.000Z'),
    };
    const resPost = Phase19SurvivorService.submitSurvivorPick(baseEntry, postKickoff, true);
    expect(resPost.success).toBe(false);
    expect(resPost.error).toContain('LOCK_SUPREMACY_VIOLATION');
  });

  it('enforces Decision #55: Rejects previously used teams (strict postseason team exhaustion)', () => {
    const reusedSubmission: SurvivorPickSubmission = {
      ...validSubmission,
      selectedTeamId: 'KC', // Already used
    };
    const res = Phase19SurvivorService.submitSurvivorPick(baseEntry, reusedSubmission, true);
    expect(res.success).toBe(false);
    expect(res.error).toContain('TEAM_EXHAUSTION_VIOLATION');
  });

  it('enforces Decision #55: Rejects submissions from already eliminated participants', () => {
    const eliminatedEntry: PostseasonSurvivorEntry = {
      ...baseEntry,
      isEliminated: true,
      eliminatedInRound: 'WILDCARD',
    };
    const res = Phase19SurvivorService.submitSurvivorPick(eliminatedEntry, validSubmission, true);
    expect(res.success).toBe(false);
    expect(res.error).toContain('FAIL_CLOSED_ELIMINATED_USER');
  });

  it('enforces Decision #20: Rejects submissions when poolId mismatches entry poolId', () => {
    const mismatchSubmission: SurvivorPickSubmission = {
      ...validSubmission,
      poolId: 'pool_other_alien',
    };
    const res = Phase19SurvivorService.submitSurvivorPick(baseEntry, mismatchSubmission, true);
    expect(res.success).toBe(false);
    expect(res.error).toContain('POOL_MISMATCH_VIOLATION');
  });

  it('accepts valid submission and adds team to used list; grades elimination on loss', () => {
    const res = Phase19SurvivorService.submitSurvivorPick(baseEntry, validSubmission, true);
    expect(res.success).toBe(true);
    expect(res.updatedEntry?.usedTeamIds).toContain('BUF');
    expect(res.updatedEntry?.usedTeamIds.length).toBe(2);

    // Grading win: survives
    const winGrade = Phase19SurvivorService.gradeSurvivorPick(res.updatedEntry!, 'BUF', 'BUF', 'DIVISIONAL');
    expect(winGrade.isEliminated).toBe(false);

    // Grading loss: eliminated immediately
    const lossGrade = Phase19SurvivorService.gradeSurvivorPick(res.updatedEntry!, 'BUF', 'BAL', 'DIVISIONAL');
    expect(lossGrade.isEliminated).toBe(true);
    expect(lossGrade.eliminatedInRound).toBe('DIVISIONAL');
  });
});
