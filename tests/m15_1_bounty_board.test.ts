import { describe, it, expect } from 'vitest';
import { BountyBoardService } from '../src/services/bountyBoard';

describe('Milestone 15.1 - Feature 2: Bounty Board Engine (Decisions #3, #22, #61, #62, #65)', () => {
  const poolId = 'pool-bounty-m15-1';
  const creator = 'user-creator-1';
  const expiry = new Date('2026-10-18T17:00:00Z');

  it('Creates bounty offer and validates strict positive escrow', () => {
    const bounty = BountyBoardService.createBountyOffer(
      poolId,
      creator,
      'game-201',
      'UPSET_PICK',
      '100.00',
      expiry,
      false
    );

    expect(bounty.escrowAmount).toBe('100.00');
    expect(bounty.isSettled).toBe(false);
  });

  it('Rejects bounty creation fail-closed if target game is already locked (Decision #65)', () => {
    expect(() => {
      BountyBoardService.createBountyOffer(
        poolId,
        creator,
        'game-201',
        'UPSET_PICK',
        '50.00',
        expiry,
        true // isTargetGameLocked
      );
    }).toThrow('already locked game');
  });

  it('Settles single-claimant bounty with 100% escrow payout', () => {
    const bounty = BountyBoardService.createBountyOffer(poolId, creator, 'game-201', 'CORRECT_PICK', '50.00', expiry);
    const result = BountyBoardService.settleBounty(bounty, ['user-winner-1']);

    expect(result.action).toBe('CLAIMED');
    expect(result.payouts).toHaveLength(1);
    expect(result.payouts[0].membershipId).toBe('user-winner-1');
    expect(result.payouts[0].payoutAmount).toBe('50.00');
    expect(result.settledBounty.isSettled).toBe(true);
  });

  it('Distributes multi-claimant split with exact penny remainder preservation ($100 / 3 claimants)', () => {
    // $100.00 / 3 = $33.34, $33.33, $33.33 -> Total: $100.00
    const bounty = BountyBoardService.createBountyOffer(poolId, creator, 'game-201', 'CORRECT_PICK', '100.00', expiry);
    const claimants = ['user-1', 'user-2', 'user-3'];
    const result = BountyBoardService.settleBounty(bounty, claimants);

    expect(result.action).toBe('CLAIMED');
    expect(result.payouts).toHaveLength(3);
    expect(result.payouts[0].payoutAmount).toBe('33.34');
    expect(result.payouts[1].payoutAmount).toBe('33.33');
    expect(result.payouts[2].payoutAmount).toBe('33.33');

    // Invariant: sum of payouts must equal exact escrow balance
    const totalPaid = result.payouts
      .map(p => Number(p.payoutAmount))
      .reduce((acc, curr) => acc + curr, 0);
    expect(totalPaid).toBe(100.00);
  });

  it('Settles refund to creator when zero claimants qualify', () => {
    const bounty = BountyBoardService.createBountyOffer(poolId, creator, 'game-201', 'SOLO_SURVIVOR', '75.00', expiry);
    const result = BountyBoardService.settleBounty(bounty, []);

    expect(result.action).toBe('REFUNDED');
    expect(result.payouts[0].membershipId).toBe(creator);
    expect(result.payouts[0].payoutAmount).toBe('75.00');
    expect(result.settledBounty.isSettled).toBe(true);
  });
});
