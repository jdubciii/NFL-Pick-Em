import { describe, it, expect } from 'vitest';
import { LeaguePressBoxService, SettledPlayerStanding } from '../src/services/leaguePressBox';

describe('Milestone 14.6 - League Press Box & 12.2 Reconciliation (Finding 5.6, Decisions #20, #61, #62)', () => {
  const poolId = 'pool-press-box-01';
  const weekNo = 4;
  const snapshotId = 'snap-2026-w4-final';

  const mockStandings: SettledPlayerStanding[] = [
    { membershipId: 'm1', displayName: 'Alice', score: 14, rank: 1, correctPicksCount: 14, totalPicksCount: 16, isDeadPlace: false },
    { membershipId: 'm2', displayName: 'Bob', score: 12, rank: 2, correctPicksCount: 12, totalPicksCount: 16, isDeadPlace: false },
    { membershipId: 'm3', displayName: 'Charlie', score: 6, rank: 3, correctPicksCount: 6, totalPicksCount: 16, isDeadPlace: true }
  ];

  it('Extracts deterministic fact tuples for winner, runner-up, and dead place', () => {
    const facts = LeaguePressBoxService.extractFacts(poolId, weekNo, snapshotId, mockStandings);

    expect(facts).toHaveLength(3);
    expect(facts[0].type).toBe('WEEKLY_WINNER');
    expect(facts[0].subjectMembershipId).toBe('m1');
    expect(facts[0].value).toBe('14');

    expect(facts[1].type).toBe('DEAD_PLACE');
    expect(facts[1].subjectMembershipId).toBe('m3');
    expect(facts[1].value).toBe('3');

    expect(facts[2].type).toBe('CLOSEST_SURVIVOR');
    expect(facts[2].subjectMembershipId).toBe('m2');
  });

  it('Generates deterministic recap copy from structured facts without LLM hallucinations', () => {
    const facts = LeaguePressBoxService.extractFacts(poolId, weekNo, snapshotId, mockStandings);
    const recap = LeaguePressBoxService.generateRecap(poolId, weekNo, facts, mockStandings);

    expect(recap.poolId).toBe(poolId);
    expect(recap.weekNo).toBe(4);
    expect(recap.revisionNumber).toBe(1);
    expect(recap.headline).toContain('Alice Takes the Slate');
    expect(recap.narrativeBody).toContain('Charlie lands in the Dead Place ladder');
  });

  it('Generates an incremented revision artifact instead of in-place mutation upon stat correction', () => {
    const facts = LeaguePressBoxService.extractFacts(poolId, weekNo, snapshotId, mockStandings);
    const initialRecap = LeaguePressBoxService.generateRecap(poolId, weekNo, facts, mockStandings);

    // Stat correction: Bob actually won with 15 points
    const correctedStandings: SettledPlayerStanding[] = [
      { membershipId: 'm2', displayName: 'Bob', score: 15, rank: 1, correctPicksCount: 15, totalPicksCount: 16, isDeadPlace: false },
      { membershipId: 'm1', displayName: 'Alice', score: 14, rank: 2, correctPicksCount: 14, totalPicksCount: 16, isDeadPlace: false },
      { membershipId: 'm3', displayName: 'Charlie', score: 6, rank: 3, correctPicksCount: 6, totalPicksCount: 16, isDeadPlace: true }
    ];

    const revisedRecap = LeaguePressBoxService.createRecapRevision(
      initialRecap,
      correctedStandings,
      'snap-2026-w4-rev2'
    );

    expect(revisedRecap.revisionNumber).toBe(2);
    expect(revisedRecap.headline).toContain('Revision 2');
    expect(revisedRecap.headline).toContain('Bob Takes the Slate');
    expect(initialRecap.revisionNumber).toBe(1); // Pristine original artifact
  });
});
