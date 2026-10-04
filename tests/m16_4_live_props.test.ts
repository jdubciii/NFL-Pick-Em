import { describe, it, expect } from 'vitest';
import { LivePropsService, PropItem, UserPropPick } from '../src/services/liveProps';

describe('Milestone 16.4 - Feature 13: Live In-Game Props Matrix (Decisions #3, #22, #54, #61, #62, #65)', () => {
  const gameId = 'game-kc-bal-prop';

  it('Creates an OVER_UNDER prop with Decimal lines and points', () => {
    const prop = LivePropsService.createProp(
      gameId,
      'OVER_UNDER',
      'Mahomes Passing Yards',
      '275.5',
      '1.50',
      false
    );

    expect(prop.status).toBe('OPEN');
    expect(prop.targetLine).toBe('275.5');
    expect(prop.pointValue).toBe('1.50');
  });

  it('Rejects prop submission when prop is locked (Decision #65)', () => {
    const prop: PropItem = {
      propId: 'prop-locked-01',
      gameId,
      propType: 'OVER_UNDER',
      description: 'Lamar Rushing Yards',
      targetLine: '65.5',
      pointValue: '1.00',
      isLocked: true,
      status: 'OPEN'
    };

    expect(() => {
      LivePropsService.submitPropPick(prop, 'user-1', 'OVER');
    }).toThrow('Prop is locked or closed');
  });

  it('Grades OVER correctly and awards exact Decimal points', () => {
    const prop = LivePropsService.createProp(
      gameId,
      'OVER_UNDER',
      'Mahomes Passing Yards',
      '275.5',
      '1.50',
      false
    );

    const pick: UserPropPick = {
      propId: prop.propId,
      membershipId: 'user-1',
      selection: 'OVER'
    };

    // Actual yards: 280.0 > 275.5 -> OVER wins
    const result = LivePropsService.gradeProp(prop, '280.0', pick);
    expect(result.isCorrect).toBe(true);
    expect(result.winningOutcome).toBe('OVER');
    expect(result.pointsAwarded).toBe('1.50');
  });

  it('Grades UNDER correctly when actual is below line', () => {
    const prop = LivePropsService.createProp(
      gameId,
      'OVER_UNDER',
      'Henry Rushing Yards',
      '80.5',
      '2.00',
      false
    );

    const pick: UserPropPick = {
      propId: prop.propId,
      membershipId: 'user-1',
      selection: 'UNDER'
    };

    // Actual yards: 72.0 < 80.5 -> UNDER wins
    const result = LivePropsService.gradeProp(prop, '72.0', pick);
    expect(result.isCorrect).toBe(true);
    expect(result.winningOutcome).toBe('UNDER');
    expect(result.pointsAwarded).toBe('2.00');
  });

  it('Grades PUSH outcome as 0.00 points fail-closed on exact match', () => {
    const prop = LivePropsService.createProp(
      gameId,
      'OVER_UNDER',
      'Total Touchdowns',
      '5.0',
      '1.00',
      false
    );

    const pick: UserPropPick = {
      propId: prop.propId,
      membershipId: 'user-1',
      selection: 'OVER'
    };

    const result = LivePropsService.gradeProp(prop, '5.0', pick);
    expect(result.winningOutcome).toBe('PUSH');
    expect(result.isCorrect).toBe(false);
    expect(result.pointsAwarded).toBe('0.00');
  });
});
