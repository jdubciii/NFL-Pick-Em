import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { Phase17IntegrationOrchestrator, Phase17FullPoolContext } from '../src/services/phase17IntegrationOrchestrator';
import { PickTelemetryInput } from '../src/services/phase17TelemetryPipelineService';

describe('Phase 17 Milestone 17.4: E2E Integration & Invariant Hardening', () => {
  const baseKickoff = new Date('2026-10-04T17:00:00Z');
  const postKickoff = new Date('2026-10-04T17:30:00Z');

  const validContext: Phase17FullPoolContext = {
    poolId: 'pool_governed_01',
    isMember: true,
    featureFlags: {
      socialStakes: true,
      telemetryUi: true,
      liveFeed: true,
    },
  };

  const cohortPicks: PickTelemetryInput[] = [
    { membershipId: 'm1', gameId: 'g1', selectedTeam: 'HOME', submittedAt: new Date() },
    { membershipId: 'm2', gameId: 'g1', selectedTeam: 'HOME', submittedAt: new Date() },
    { membershipId: 'm3', gameId: 'g1', selectedTeam: 'AWAY', submittedAt: new Date() },
  ];

  it('enforces Decision #20: Denies access to non-pool members', () => {
    const unauthContext = { ...validContext, isMember: false };
    const res = Phase17IntegrationOrchestrator.executePoolSocialTelemetrySuite({
      context: unauthContext,
      gameId: 'g1',
      kickoffTime: baseKickoff,
      currentTime: postKickoff,
      picks: cohortPicks,
    });
    expect(res.authorized).toBe(false);
    expect(res.error).toContain('POOL_MEMBERSHIP_REQUIRED');
  });

  it('orchestrates end-to-end telemetry and social stakes with exact Decimal math', () => {
    const res = Phase17IntegrationOrchestrator.executePoolSocialTelemetrySuite({
      context: validContext,
      gameId: 'g1',
      kickoffTime: baseKickoff,
      currentTime: postKickoff,
      picks: cohortPicks,
      stakeInput: {
        creatorMembershipId: 'm1',
        targetMembershipId: 'm2',
        amount: new Prisma.Decimal('25.00'),
        creatorEscrow: new Prisma.Decimal('100.00'),
      },
    });

    expect(res.authorized).toBe(true);
    expect(res.telemetry?.isMasked).toBe(false);
    expect(res.telemetry?.cohortSize).toBe(3);
    expect(Prisma.Decimal.isDecimal(res.telemetry?.sweatIndex)).toBe(true);
    expect(res.stakeResult?.success).toBe(true);
    expect(res.stakeResult?.stake?.amount.toString()).toBe('25');
    expect(res.feedEvents?.length).toBe(1);
    expect(res.feedEvents?.[0].metricDelta?.toString()).toBe('25');
  });

  it('fails closed when all circuit breakers are toggled off', () => {
    const closedFlagsContext: Phase17FullPoolContext = {
      poolId: 'pool_governed_01',
      isMember: true,
      featureFlags: {
        socialStakes: false,
        telemetryUi: false,
        liveFeed: false,
      },
    };

    const res = Phase17IntegrationOrchestrator.executePoolSocialTelemetrySuite({
      context: closedFlagsContext,
      gameId: 'g1',
      kickoffTime: baseKickoff,
      currentTime: postKickoff,
      picks: cohortPicks,
      stakeInput: {
        creatorMembershipId: 'm1',
        targetMembershipId: 'm2',
        amount: new Prisma.Decimal('25.00'),
        creatorEscrow: new Prisma.Decimal('100.00'),
      },
    });

    expect(res.authorized).toBe(true);
    expect(res.telemetry).toBeUndefined();
    expect(res.stakeResult).toBeUndefined();
    expect(res.feedEvents).toBeUndefined();
  });
});
