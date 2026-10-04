import { describe, it, expect } from 'vitest';
import { SyndicatePortfolioService } from '../src/services/syndicatePortfolio';

describe('Milestone 16.0 - Phase 16 Intake & Syndicate Scaffolding (Decisions #3, #22, #61, #62, #65)', () => {
  const poolId = 'pool-synd-01';

  it('Creates a syndicate portfolio and validates share percentages using Decimal precision', () => {
    const contributions = [
      { membershipId: 'user-1', amount: '60.00' },
      { membershipId: 'user-2', amount: '40.00' }
    ];

    const synd = SyndicatePortfolioService.createSyndicate(
      poolId,
      'The Sharps',
      'user-1',
      contributions,
      false
    );

    expect(synd.totalPoolStake).toBe('100.00');
    expect(synd.members).toHaveLength(2);
    expect(synd.members[0].sharePercentage).toBe('0.6000');
    expect(synd.members[1].sharePercentage).toBe('0.4000');
  });

  it('Rejects negative or zero contributions fail-closed', () => {
    expect(() => {
      SyndicatePortfolioService.createSyndicate(
        poolId,
        'Bad Stakes',
        'user-1',
        [{ membershipId: 'user-1', amount: '0.00' }],
        false
      );
    }).toThrow('strictly greater than 0');
  });

  it('Rejects syndicate creation if slate is locked (Decision #65)', () => {
    expect(() => {
      SyndicatePortfolioService.createSyndicate(
        poolId,
        'Late Syndicate',
        'user-1',
        [{ membershipId: 'user-1', amount: '50.00' }],
        true
      );
    }).toThrow('already locked slate');
  });

  it('Distributes winnings proportionally with penny remainder conservation ($150 across 50%, 25%, 25%)', () => {
    const contributions = [
      { membershipId: 'user-1', amount: '50.00' },
      { membershipId: 'user-2', amount: '25.00' },
      { membershipId: 'user-3', amount: '25.00' }
    ];
    const synd = SyndicatePortfolioService.createSyndicate(poolId, 'Trio', 'user-1', contributions, false);

    const payouts = SyndicatePortfolioService.distributeWinnings(synd, '150.00');
    expect(payouts).toHaveLength(3);
    expect(payouts.find(p => p.membershipId === 'user-1')?.payoutAmount).toBe('75.00');
    expect(payouts.find(p => p.membershipId === 'user-2')?.payoutAmount).toBe('37.50');
    expect(payouts.find(p => p.membershipId === 'user-3')?.payoutAmount).toBe('37.50');
  });

  it('Distributes odd penny remainder without loss ($100 winnings to 3 equal stakes)', () => {
    const contributions = [
      { membershipId: 'user-1', amount: '10.00' },
      { membershipId: 'user-2', amount: '10.00' },
      { membershipId: 'user-3', amount: '10.00' }
    ];
    const synd = SyndicatePortfolioService.createSyndicate(poolId, 'Thirds', 'user-1', contributions, false);

    const payouts = SyndicatePortfolioService.distributeWinnings(synd, '100.00');
    const totalDistributed = payouts.reduce((acc, p) => acc + Number(p.payoutAmount), 0);
    expect(totalDistributed).toBe(100.00);
  });
});
