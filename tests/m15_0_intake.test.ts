import { describe, it, expect } from 'vitest';
import { BountyBoardService } from '../src/services/bountyBoard';

describe('Milestone 15.0 - Phase 15 Intake & Bounty Board Scaffolding (Decisions #3, #22, #61, #62)', () => {
  const poolId = 'pool-bounty-01';
  const creator = 'user-creator-1';
  const claimant = 'user-claimant-2';
  const expiry = new Date('2026-10-11T17:00:00Z');

  it('Creates a bounty offer with exact Decimal precision', () => {
    const bounty = BountyBoardService.createBountyOffer(
      poolId,
      creator,
      'game-101',
      'CORRECT_PICK',
      '25.50',
      expiry
    );

    expect(bounty.escrowAmount).toBe('25.50');
    expect(bounty.isSettled).toBe(false);
  });

  it('Rejects non-positive escrow amounts fail-closed', () => {
    expect(() => {
      BountyBoardService.createBountyOffer(poolId, creator, 'game-101', 'CORRECT_PICK', '0.00', expiry);
    }).toThrow('strictly greater than 0');

    expect(() => {
      BountyBoardService.createBountyOffer(poolId, creator, 'game-101', 'CORRECT_PICK', '-10.00', expiry);
    }).toThrow('strictly greater than 0');
  });

  it('Settles bounty as CLAIMED when a qualifying claimant is present', () => {
    const bounty = BountyBoardService.createBountyOffer(poolId, creator, 'game-101', 'CORRECT_PICK', '50.00', expiry);
    const result = BountyBoardService.settleBounty(bounty, claimant);

    expect(result.action).toBe('CLAIMED');
    expect(result.payoutAmount).toBe('50.00');
    expect(result.settledBounty.claimedByMembershipId).toBe(claimant);
    expect(result.settledBounty.isSettled).toBe(true);
  });

  it('Settles bounty as REFUNDED to creator when expired without claimant', () => {
    const bounty = BountyBoardService.createBountyOffer(poolId, creator, 'game-101', 'CORRECT_PICK', '50.00', expiry);
    const result = BountyBoardService.settleBounty(bounty, null);

    expect(result.action).toBe('REFUNDED');
    expect(result.payoutAmount).toBe('50.00');
    expect(result.settledBounty.claimedByMembershipId).toBeUndefined();
    expect(result.settledBounty.isSettled).toBe(true);
  });
});
