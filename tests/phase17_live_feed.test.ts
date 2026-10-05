import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { Phase17LiveFeedService, FeedEventPayload } from '../src/services/phase17LiveFeedService';

describe('Phase 17 Milestone 17.3: Live Activity Feed & Cohort Floor Invariants', () => {
  const baseEvent: FeedEventPayload = {
    eventId: 'ev_001',
    poolId: 'pool_123',
    gameId: 'game_456',
    type: 'CONSENSUS_SHIFT',
    cohortSize: 2,
    message: 'Shift toward HOME team observed',
    metricDelta: new Prisma.Decimal('0.1500'),
    timestamp: new Date(),
    isRedacted: false,
  };

  it('enforces Decision #62: Circuit breaker defaults to closed (feature disabled)', () => {
    const res = Phase17LiveFeedService.getFeedStream([baseEvent], { game_456: true }, {
      poolId: 'pool_123',
      flagStoreValue: false,
      viewerMembershipId: 'mem_1',
    });
    expect(res.success).toBe(false);
    expect(res.error).toContain('CIRCUIT_BREAKER_DISABLED');
  });

  it('enforces Decision #66: Consensus shift event redacted pre-kickoff even if cohort >= 3', () => {
    const eventWithValidCohort: FeedEventPayload = {
      ...baseEvent,
      cohortSize: 5,
    };

    const res = Phase17LiveFeedService.getFeedStream([eventWithValidCohort], { game_456: false }, {
      poolId: 'pool_123',
      flagStoreValue: true,
      viewerMembershipId: 'mem_1',
    });

    expect(res.success).toBe(true);
    expect(res.stream?.[0].isRedacted).toBe(true);
    expect(res.stream?.[0].message).toBe('[REDACTED: PRE-KICKOFF CONTENT]');
    expect(res.stream?.[0].redactionReason).toContain('PRE_KICKOFF_MASK');
  });

  it('enforces Anti-Peeking Cohort Floor invariant (N >= 3) on locked games', () => {
    const res = Phase17LiveFeedService.getFeedStream([baseEvent], { game_456: true }, {
      poolId: 'pool_123',
      flagStoreValue: true,
      viewerMembershipId: 'mem_1',
    });

    expect(res.success).toBe(true);
    expect(res.stream?.[0].isRedacted).toBe(true);
    expect(res.stream?.[0].message).toBe('[REDACTED: INSUFFICIENT COHORT]');
    expect(res.stream?.[0].redactionReason).toContain('ANTI_PEEKING_COHORT_FLOOR_VIOLATION');
  });

  it('unmasks event telemetry with exact Prisma.Decimal delta when game is locked and N >= 3', () => {
    const validEvent: FeedEventPayload = {
      ...baseEvent,
      cohortSize: 4,
      metricDelta: new Prisma.Decimal('0.2500'),
    };

    const res = Phase17LiveFeedService.getFeedStream([validEvent], { game_456: true }, {
      poolId: 'pool_123',
      flagStoreValue: true,
      viewerMembershipId: 'mem_1',
    });

    expect(res.success).toBe(true);
    expect(res.stream?.[0].isRedacted).toBe(false);
    expect(res.stream?.[0].message).toBe('Shift toward HOME team observed');
    expect(Prisma.Decimal.isDecimal(res.stream?.[0].metricDelta)).toBe(true);
    expect(res.stream?.[0].metricDelta?.toString()).toBe('0.25');
  });
});
