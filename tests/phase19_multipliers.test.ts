import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  Phase19MultiplierService,
  PoolMultiplierOverride,
} from '../src/services/phase19MultiplierService';
import { MultiplierConfig } from '../src/services/phase19BracketService';

describe('Phase 19 Milestone 19.2: Dynamic Round Multipliers & Precision Scoring', () => {
  const basePoints = new Prisma.Decimal('25.50');

  it('enforces Decision #62: Suppresses dynamic escalation and defaults to 1.00x when circuit breaker is disabled', () => {
    const res = Phase19MultiplierService.scorePlayoffPick({
      basePoints,
      round: 'SUPER_BOWL',
      flagStoreValue: false,
    });

    expect(res.success).toBe(true);
    expect(res.effectiveMultiplier?.toFixed(2)).toBe('1.00');
    expect(res.awardedPoints?.toFixed(2)).toBe('25.50');
  });

  it('applies default canonical progression (1x, 2x, 4x, 8x) when circuit breaker is enabled', () => {
    const wc = Phase19MultiplierService.scorePlayoffPick({ basePoints, round: 'WILDCARD', flagStoreValue: true });
    expect(wc.awardedPoints?.toFixed(2)).toBe('25.50');
    expect(wc.effectiveMultiplier?.toFixed(2)).toBe('1.00');

    const div = Phase19MultiplierService.scorePlayoffPick({ basePoints, round: 'DIVISIONAL', flagStoreValue: true });
    expect(div.awardedPoints?.toFixed(2)).toBe('51.00');
    expect(div.effectiveMultiplier?.toFixed(2)).toBe('2.00');

    const conf = Phase19MultiplierService.scorePlayoffPick({ basePoints, round: 'CONFERENCE', flagStoreValue: true });
    expect(conf.awardedPoints?.toFixed(2)).toBe('102.00');
    expect(conf.effectiveMultiplier?.toFixed(2)).toBe('4.00');

    const sb = Phase19MultiplierService.scorePlayoffPick({ basePoints, round: 'SUPER_BOWL', flagStoreValue: true });
    expect(sb.awardedPoints?.toFixed(2)).toBe('204.00');
    expect(sb.effectiveMultiplier?.toFixed(2)).toBe('8.00');
  });

  it('enforces Decision #55: Fails closed on sub-floor (<1.00) or non-monotonic custom configurations', () => {
    const subFloorConfig: MultiplierConfig = {
      wildcard: new Prisma.Decimal('0.50'),
      divisional: new Prisma.Decimal('2.00'),
      conference: new Prisma.Decimal('4.00'),
      superBowl: new Prisma.Decimal('8.00'),
    };
    const subFloorRes = Phase19MultiplierService.validateMultiplierConfig(subFloorConfig);
    expect(subFloorRes.valid).toBe(false);
    expect(subFloorRes.error).toContain('INVALID_MULTIPLIER_FLOOR');

    const invertedConfig: MultiplierConfig = {
      wildcard: new Prisma.Decimal('2.00'),
      divisional: new Prisma.Decimal('1.50'), // Inverted: Divisional < Wildcard
      conference: new Prisma.Decimal('4.00'),
      superBowl: new Prisma.Decimal('8.00'),
    };
    const invertedRes = Phase19MultiplierService.validateMultiplierConfig(invertedConfig);
    expect(invertedRes.valid).toBe(false);
    expect(invertedRes.error).toContain('NON_MONOTONIC_MULTIPLIERS');
  });

  it('enforces Decision #20: Honors valid custom pool-scoped multiplier override', () => {
    const customOverride: PoolMultiplierOverride = {
      poolId: 'pool_high_stakes_afc',
      seasonYear: 2026,
      config: {
        wildcard: new Prisma.Decimal('1.00'),
        divisional: new Prisma.Decimal('3.00'),
        conference: new Prisma.Decimal('6.00'),
        superBowl: new Prisma.Decimal('12.00'),
      },
    };

    const res = Phase19MultiplierService.scorePlayoffPick({
      basePoints,
      round: 'SUPER_BOWL',
      poolOverride: customOverride,
      flagStoreValue: true,
    });

    expect(res.success).toBe(true);
    expect(res.effectiveMultiplier?.toFixed(2)).toBe('12.00');
    expect(res.awardedPoints?.toFixed(2)).toBe('306.00');
    expect(Prisma.Decimal.isDecimal(res.awardedPoints)).toBe(true);
  });
});
