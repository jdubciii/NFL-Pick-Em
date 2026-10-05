import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { Phase17TelemetryPipelineService, PickTelemetryInput } from '../src/services/phase17TelemetryPipelineService';

describe('Phase 17 Milestone 17.2: Telemetry UI & Sweat Radar Invariants', () => {
  const baseKickoff = new Date('2026-10-04T17:00:00Z');

  it('enforces Decision #62: Circuit breaker defaults to closed (feature disabled)', () => {
    const res = Phase17TelemetryPipelineService.computeGameSweatTelemetry({
      gameId: 'game_101',
      kickoffTime: baseKickoff,
      currentTime: new Date('2026-10-04T18:00:00Z'),
      picks: [],
      flagStoreValue: false,
    });
    expect(res.success).toBe(false);
    expect(res.error).toContain('CIRCUIT_BREAKER_DISABLED');
  });

  it('enforces Decision #66: Pre-kickoff game masks distribution regardless of slate state', () => {
    const picks: PickTelemetryInput[] = [
      { membershipId: 'm1', gameId: 'g1', selectedTeam: 'HOME', submittedAt: new Date() },
      { membershipId: 'm2', gameId: 'g1', selectedTeam: 'HOME', submittedAt: new Date() },
      { membershipId: 'm3', gameId: 'g1', selectedTeam: 'AWAY', submittedAt: new Date() },
      { membershipId: 'm4', gameId: 'g1', selectedTeam: 'AWAY', submittedAt: new Date() },
    ];

    const preKickoff = new Date('2026-10-04T16:59:59Z');
    const res = Phase17TelemetryPipelineService.computeGameSweatTelemetry({
      gameId: 'g1',
      kickoffTime: baseKickoff,
      currentTime: preKickoff,
      picks,
      flagStoreValue: true,
    });

    expect(res.success).toBe(true);
    expect(res.data?.isMasked).toBe(true);
    expect(res.data?.maskReason).toContain('PRE_KICKOFF_MASK');
    expect(res.data?.sweatIndex.toFixed(2)).toBe('0.00');
  });

  it('enforces Anti-Peeking Cohort Floor invariant (N >= 3) on post-kickoff games', () => {
    const subFloorPicks: PickTelemetryInput[] = [
      { membershipId: 'm1', gameId: 'g1', selectedTeam: 'HOME', submittedAt: new Date() },
      { membershipId: 'm2', gameId: 'g1', selectedTeam: 'AWAY', submittedAt: new Date() },
    ];

    const postKickoff = new Date('2026-10-04T17:05:00Z');
    const res = Phase17TelemetryPipelineService.computeGameSweatTelemetry({
      gameId: 'g1',
      kickoffTime: baseKickoff,
      currentTime: postKickoff,
      picks: subFloorPicks,
      flagStoreValue: true,
    });

    expect(res.success).toBe(true);
    expect(res.data?.isMasked).toBe(true);
    expect(res.data?.maskReason).toContain('ANTI_PEEKING_COHORT_FLOOR_VIOLATION');
    expect(res.data?.cohortSize).toBe(2);
  });

  it('calculates unmasked sweat radar metrics using Prisma.Decimal when post-kickoff and N >= 3', () => {
    const validCohortPicks: PickTelemetryInput[] = [
      { membershipId: 'm1', gameId: 'g1', selectedTeam: 'HOME', submittedAt: new Date() },
      { membershipId: 'm2', gameId: 'g1', selectedTeam: 'HOME', submittedAt: new Date() },
      { membershipId: 'm3', gameId: 'g1', selectedTeam: 'AWAY', submittedAt: new Date() },
      { membershipId: 'm4', gameId: 'g1', selectedTeam: 'AWAY', submittedAt: new Date() },
    ];

    const postKickoff = new Date('2026-10-04T17:05:00Z');
    const res = Phase17TelemetryPipelineService.computeGameSweatTelemetry({
      gameId: 'g1',
      kickoffTime: baseKickoff,
      currentTime: postKickoff,
      picks: validCohortPicks,
      flagStoreValue: true,
    });

    expect(res.success).toBe(true);
    expect(res.data?.isMasked).toBe(false);
    expect(res.data?.cohortSize).toBe(4);
    expect(res.data?.homePicks).toBe(2);
    expect(res.data?.awayPicks).toBe(2);
    expect(Prisma.Decimal.isDecimal(res.data?.sweatIndex)).toBe(true);
    expect(res.data?.sweatIndex.toString()).toBe('1');
  });
});
