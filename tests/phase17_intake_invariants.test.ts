import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { Phase17SocialTelemetryService } from '../src/services/phase17SocialTelemetryService';

describe('Phase 17 Invariant & Pre-Flight Suite', () => {
  it('enforces Decision #62: Circuit breaker defaults to false when flag is unconfigured or null', () => {
    expect(Phase17SocialTelemetryService.isFeatureEnabled(null)).toBe(false);
    expect(Phase17SocialTelemetryService.isFeatureEnabled(undefined)).toBe(false);
    expect(Phase17SocialTelemetryService.isFeatureEnabled(false)).toBe(false);
    expect(Phase17SocialTelemetryService.isFeatureEnabled(true)).toBe(true);
  });

  it('allows active cohort exposure floor (cohorts >= 1)', () => {
    const emptyResult = Phase17SocialTelemetryService.validateCohortFloor(0);
    expect(emptyResult.allowed).toBe(false);
    expect(emptyResult.reason).toContain('INSUFFICIENT_COHORT');

    const singleResult = Phase17SocialTelemetryService.validateCohortFloor(1);
    expect(singleResult.allowed).toBe(true);

    const smallCohortResult = Phase17SocialTelemetryService.validateCohortFloor(2);
    expect(smallCohortResult.allowed).toBe(true);

    const exactFloorResult = Phase17SocialTelemetryService.validateCohortFloor(3);
    expect(exactFloorResult.allowed).toBe(true);

    const aboveFloorResult = Phase17SocialTelemetryService.validateCohortFloor(8);
    expect(aboveFloorResult.allowed).toBe(true);
  });

  it('enforces Decisions #3 & #22: Numeric precision via Prisma.Decimal', () => {
    const stakes = [
      new Prisma.Decimal('10.25'),
      new Prisma.Decimal('20.50'),
      new Prisma.Decimal('5.10'),
    ];
    const total = Phase17SocialTelemetryService.calculateSocialStakePool(stakes);
    expect(total.toString()).toBe('35.85');
    expect(Prisma.Decimal.isDecimal(total)).toBe(true);
  });
});
