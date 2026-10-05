import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  Phase19SuperBowlPropsService,
  SuperBowlPropItem,
  UserPropSubmission,
} from '../src/services/phase19SuperBowlPropsService';

describe('Phase 19 Milestone 19.4: Super Bowl Prop Matrix & Invariant Suite', () => {
  const sbKickoff = new Date('2027-02-14T23:30:00.000Z');

  const coinTossProp: SuperBowlPropItem = {
    id: 'prop_sb_coin_01',
    poolId: 'pool_sb_governed_01',
    category: 'NOVELTY',
    question: 'Coin toss result?',
    options: ['HEADS', 'TAILS'],
    pointValue: new Prisma.Decimal('5.00'),
    isSettled: false,
  };

  const validSubmission: UserPropSubmission = {
    userId: 'usr_sb_picker_1',
    poolId: 'pool_sb_governed_01',
    propId: 'prop_sb_coin_01',
    selectedOption: 'HEADS',
    submissionTime: new Date('2027-02-14T23:15:00.000Z'),
  };

  it('enforces Decision #62: Circuit breaker defaults to closed (feature disabled)', () => {
    const res = Phase19SuperBowlPropsService.submitPropPick({
      prop: coinTossProp,
      submission: validSubmission,
      gameKickoff: sbKickoff,
      flagStoreValue: false,
    });
    expect(res.success).toBe(false);
    expect(res.error).toContain('CIRCUIT_BREAKER_DISABLED');
  });

  it('enforces Decision #65: Rejects prop picks submitted at or after Super Bowl kickoff', () => {
    const atKickoff: UserPropSubmission = { ...validSubmission, submissionTime: sbKickoff };
    const resAt = Phase19SuperBowlPropsService.submitPropPick({
      prop: coinTossProp,
      submission: atKickoff,
      gameKickoff: sbKickoff,
      flagStoreValue: true,
    });
    expect(resAt.success).toBe(false);
    expect(resAt.error).toContain('LOCK_SUPREMACY_VIOLATION');

    const postKickoff: UserPropSubmission = {
      ...validSubmission,
      submissionTime: new Date('2027-02-14T23:30:01.000Z'),
    };
    const resPost = Phase19SuperBowlPropsService.submitPropPick({
      prop: coinTossProp,
      submission: postKickoff,
      gameKickoff: sbKickoff,
      flagStoreValue: true,
    });
    expect(resPost.success).toBe(false);
    expect(resPost.error).toContain('LOCK_SUPREMACY_VIOLATION');
  });

  it('enforces Decision #55: Rejects invalid options not in prop specification', () => {
    const invalidOptionSubmission: UserPropSubmission = {
      ...validSubmission,
      selectedOption: 'EDGE', // Not HEADS or TAILS
    };
    const res = Phase19SuperBowlPropsService.submitPropPick({
      prop: coinTossProp,
      submission: invalidOptionSubmission,
      gameKickoff: sbKickoff,
      flagStoreValue: true,
    });
    expect(res.success).toBe(false);
    expect(res.error).toContain('INVALID_PROP_OPTION');
  });

  it('enforces Decision #20: Rejects submissions when poolId mismatches prop pool scope', () => {
    const poolMismatchSubmission: UserPropSubmission = {
      ...validSubmission,
      poolId: 'pool_other_pool_99',
    };
    const res = Phase19SuperBowlPropsService.submitPropPick({
      prop: coinTossProp,
      submission: poolMismatchSubmission,
      gameKickoff: sbKickoff,
      flagStoreValue: true,
    });
    expect(res.success).toBe(false);
    expect(res.error).toContain('POOL_MISMATCH_VIOLATION');
  });

  it('enforces Decision #55 & Decisions #3 & #22: Fails closed on unsettled props; computes exact Prisma.Decimal points on settlement', () => {
    // Unsettled grading attempt
    const unsettledRes = Phase19SuperBowlPropsService.gradePropPick(coinTossProp, 'HEADS');
    expect(unsettledRes.success).toBe(false);
    expect(unsettledRes.error).toContain('PROP_NOT_SETTLED');

    // Settled grading
    const settledProp: SuperBowlPropItem = {
      ...coinTossProp,
      isSettled: true,
      correctOption: 'HEADS',
    };

    const winGrade = Phase19SuperBowlPropsService.gradePropPick(settledProp, 'HEADS');
    expect(winGrade.success).toBe(true);
    expect(winGrade.awardedPoints?.toFixed(2)).toBe('5.00');
    expect(Prisma.Decimal.isDecimal(winGrade.awardedPoints)).toBe(true);

    const lossGrade = Phase19SuperBowlPropsService.gradePropPick(settledProp, 'TAILS');
    expect(lossGrade.success).toBe(true);
    expect(lossGrade.awardedPoints?.toFixed(2)).toBe('0.00');
  });
});
