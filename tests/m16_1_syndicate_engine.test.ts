import { describe, it, expect } from 'vitest';
import { SyndicatePortfolioService, MemberPickVote } from '../src/services/syndicatePortfolio';

describe('Milestone 16.1 - Feature 7: Syndicate Portfolios Engine (Decisions #3, #22, #61, #62, #65)', () => {
  const poolId = 'pool-synd-m16-1';

  const contributions = [
    { membershipId: 'mem-1', amount: '70.00' },
    { membershipId: 'mem-2', amount: '20.00' },
    { membershipId: 'mem-3', amount: '10.00' }
  ];

  const syndicate = SyndicatePortfolioService.createSyndicate(
    poolId,
    'High Rollers',
    'mem-1',
    contributions,
    false
  );

  it('Resolves consensus pick weighted by member stakes (70% mem-1 picks KC, 30% pick BAL)', () => {
    const votes: MemberPickVote[] = [
      { membershipId: 'mem-1', selectedTeam: 'KC' },
      { membershipId: 'mem-2', selectedTeam: 'BAL' },
      { membershipId: 'mem-3', selectedTeam: 'BAL' }
    ];

    const result = SyndicatePortfolioService.resolveStakeWeightedPick(syndicate, 'game-01', votes, false);
    expect(result.isConsensusReached).toBe(true);
    expect(result.winningTeam).toBe('KC');
    expect(result.voteWeights['KC']).toBe('70.00');
    expect(result.voteWeights['BAL']).toBe('30.00');
  });

  it('Declares tie and fail-closed consensus when vote weights are equal', () => {
    const equalSyndicate = SyndicatePortfolioService.createSyndicate(
      poolId,
      'Split Faction',
      'mem-1',
      [
        { membershipId: 'mem-1', amount: '50.00' },
        { membershipId: 'mem-2', amount: '50.00' }
      ],
      false
    );

    const votes: MemberPickVote[] = [
      { membershipId: 'mem-1', selectedTeam: 'KC' },
      { membershipId: 'mem-2', selectedTeam: 'BAL' }
    ];

    const result = SyndicatePortfolioService.resolveStakeWeightedPick(equalSyndicate, 'game-01', votes, false);
    expect(result.isConsensusReached).toBe(false);
    expect(result.winningTeam).toBeNull();
    expect(result.voteWeights['KC']).toBe('50.00');
    expect(result.voteWeights['BAL']).toBe('50.00');
  });

  it('Rejects consensus pick calculation if game is locked (Decision #65)', () => {
    const votes: MemberPickVote[] = [
      { membershipId: 'mem-1', selectedTeam: 'KC' }
    ];

    expect(() => {
      SyndicatePortfolioService.resolveStakeWeightedPick(syndicate, 'game-01', votes, true);
    }).toThrow('locked game');
  });

  it('Ignores votes from non-syndicate members', () => {
    const votes: MemberPickVote[] = [
      { membershipId: 'mem-1', selectedTeam: 'KC' },
      { membershipId: 'rogue-outsider', selectedTeam: 'BAL' }
    ];

    const result = SyndicatePortfolioService.resolveStakeWeightedPick(syndicate, 'game-01', votes, false);
    expect(result.voteWeights['BAL']).toBeUndefined();
    expect(result.voteWeights['KC']).toBe('70.00');
    expect(result.winningTeam).toBe('KC');
  });
});
