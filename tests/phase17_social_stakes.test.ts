import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { Phase17SocialStakesService } from '../src/services/phase17SocialStakesService';

describe('Phase 17 Milestone 17.1: Social Stakes & Escrow Invariants', () => {
  it('enforces Decision #62: Circuit breaker defaults to closed (feature disabled)', () => {
    const result = Phase17SocialStakesService.createStake({
      poolId: 'pool_123',
      gameId: 'game_456',
      creatorMembershipId: 'mem_1',
      targetMembershipId: 'mem_2',
      amount: new Prisma.Decimal('10.00'),
      creatorAvailableEscrow: new Prisma.Decimal('50.00'),
      flagStoreValue: false,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('CIRCUIT_BREAKER_DISABLED');
  });

  it('prohibits self-wagering between identical membership IDs', () => {
    const result = Phase17SocialStakesService.createStake({
      poolId: 'pool_123',
      gameId: 'game_456',
      creatorMembershipId: 'mem_1',
      targetMembershipId: 'mem_1',
      amount: new Prisma.Decimal('10.00'),
      creatorAvailableEscrow: new Prisma.Decimal('50.00'),
      flagStoreValue: true,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('INVALID_SELF_STAKE');
  });

  it('enforces Decisions #3 & #22: Rejects insufficient escrow balance via Prisma.Decimal', () => {
    const result = Phase17SocialStakesService.createStake({
      poolId: 'pool_123',
      gameId: 'game_456',
      creatorMembershipId: 'mem_1',
      targetMembershipId: 'mem_2',
      amount: new Prisma.Decimal('50.01'),
      creatorAvailableEscrow: new Prisma.Decimal('50.00'),
      flagStoreValue: true,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('INSUFFICIENT_ESCROW');
  });

  it('locks creator escrow upon valid stake creation with zero float rounding errors', () => {
    const result = Phase17SocialStakesService.createStake({
      poolId: 'pool_123',
      gameId: 'game_456',
      creatorMembershipId: 'mem_1',
      targetMembershipId: 'mem_2',
      amount: new Prisma.Decimal('15.50'),
      creatorAvailableEscrow: new Prisma.Decimal('50.00'),
      flagStoreValue: true,
    });
    expect(result.success).toBe(true);
    expect(result.stake?.status).toBe('PENDING');
    expect(result.updatedEscrow?.toFixed(2)).toBe('34.50');
  });

  it('settles pot payout with exact decimal conservation', () => {
    const stakeRes = Phase17SocialStakesService.createStake({
      poolId: 'pool_123',
      gameId: 'game_456',
      creatorMembershipId: 'mem_1',
      targetMembershipId: 'mem_2',
      amount: new Prisma.Decimal('20.00'),
      creatorAvailableEscrow: new Prisma.Decimal('100.00'),
      flagStoreValue: true,
    });

    const stake = stakeRes.stake!;
    const settlement = Phase17SocialStakesService.settleStake(
      stake,
      true,
      new Prisma.Decimal('80.00'),
      new Prisma.Decimal('80.00')
    );

    expect(settlement.settledStake.status).toBe('SETTLED');
    expect(settlement.updatedCreatorEscrow.toFixed(2)).toBe('120.00');
    expect(settlement.updatedTargetEscrow.toFixed(2)).toBe('80.00');
  });
});
