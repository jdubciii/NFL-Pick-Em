import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  Phase19BracketService,
  Phase19FeatureFlagKey,
} from '../src/services/phase19BracketService';

describe('Phase 19 Milestone 19.0: Intake & Playoff Invariants', () => {
  it('enforces Decision #62: All Phase 19 circuit breakers default to OFF (false)', () => {
    expect(Phase19BracketService.isFlagEnabled(null)).toBe(false);
    expect(Phase19BracketService.isFlagEnabled(undefined)).toBe(false);
    expect(Phase19BracketService.isFlagEnabled(false)).toBe(false);
    expect(Phase19BracketService.isFlagEnabled(true)).toBe(true);

    expect(Phase19FeatureFlagKey.PLAYOFF_BRACKET_ENGINE).toBe('playoff_bracket_engine');
    expect(Phase19FeatureFlagKey.DYNAMIC_MULTIPLIERS).toBe('dynamic_multipliers');
    expect(Phase19FeatureFlagKey.SUPER_BOWL_PROPS).toBe('super_bowl_props');
  });

  it('enforces Decision #65: Lock Supremacy locks bracket submissions at first game kickoff', () => {
    const kickoff = new Date('2027-01-16T18:00:00.000Z');
    const beforeKickoff = new Date('2027-01-16T17:59:59.000Z');
    const atKickoff = new Date('2027-01-16T18:00:00.000Z');
    const afterKickoff = new Date('2027-01-16T18:05:00.000Z');

    expect(Phase19BracketService.isRoundLocked(kickoff, beforeKickoff)).toBe(false);
    expect(Phase19BracketService.isRoundLocked(kickoff, atKickoff)).toBe(true);
    expect(Phase19BracketService.isRoundLocked(kickoff, afterKickoff)).toBe(true);
  });

  it('enforces Decision #55: Fails closed when prior playoff round is unfinalized', () => {
    const wildcardCheck = Phase19BracketService.validateRoundProgression('WILDCARD', false);
    expect(wildcardCheck.allowed).toBe(true);

    const divisionalFail = Phase19BracketService.validateRoundProgression('DIVISIONAL', false);
    expect(divisionalFail.allowed).toBe(false);
    expect(divisionalFail.error).toContain('FAIL_CLOSED_UNFINALIZED_ROUND');

    const divisionalPass = Phase19BracketService.validateRoundProgression('DIVISIONAL', true);
    expect(divisionalPass.allowed).toBe(true);
  });

  it('enforces Decisions #3 & #22: Prisma.Decimal multiplier calculations with zero float drift', () => {
    const base = new Prisma.Decimal('10.00');

    const wildcardScore = Phase19BracketService.calculateMultiplierScore(base, 'WILDCARD');
    expect(wildcardScore.toFixed(2)).toBe('10.00');

    const divisionalScore = Phase19BracketService.calculateMultiplierScore(base, 'DIVISIONAL');
    expect(divisionalScore.toFixed(2)).toBe('20.00');

    const conferenceScore = Phase19BracketService.calculateMultiplierScore(base, 'CONFERENCE');
    expect(conferenceScore.toFixed(2)).toBe('40.00');

    const superBowlScore = Phase19BracketService.calculateMultiplierScore(base, 'SUPER_BOWL');
    expect(superBowlScore.toFixed(2)).toBe('80.00');
    expect(Prisma.Decimal.isDecimal(superBowlScore)).toBe(true);
  });
});
