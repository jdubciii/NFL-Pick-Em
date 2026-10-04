import { describe, it, expect } from 'vitest';
import { DeadPlaceEscalationService } from '../src/services/deadPlaceEscalation';

describe('Milestone 14.5 - Dead Place Escalation Ladder (Decisions #3, #22, #61, #62)', () => {
  const membershipId = 'mem-user-123';

  it('Calculates base penalty for 1st week last place finish', () => {
    const res = DeadPlaceEscalationService.calculateEscalation(membershipId, 0, true);
    expect(res.consecutiveLastPlaces).toBe(1);
    expect(res.escalationLevel).toBe(1);
    expect(res.calculatedPenaltyAmount).toBe('10.00');
  });

  it('Calculates exponential streak escalation for consecutive last place finishes', () => {
    // Week 2 streak: 10 * 2^1 = 20.00
    const week2 = DeadPlaceEscalationService.calculateEscalation(membershipId, 1, true);
    expect(week2.consecutiveLastPlaces).toBe(2);
    expect(week2.escalationLevel).toBe(2);
    expect(week2.calculatedPenaltyAmount).toBe('20.00');

    // Week 3 streak: 10 * 2^2 = 40.00
    const week3 = DeadPlaceEscalationService.calculateEscalation(membershipId, 2, true);
    expect(week3.consecutiveLastPlaces).toBe(3);
    expect(week3.escalationLevel).toBe(3);
    expect(week3.calculatedPenaltyAmount).toBe('40.00');
  });

  it('Caps escalation at maxEscalationLevel', () => {
    // Week 5 streak capped at level 4: 10 * 2^3 = 80.00
    const res = DeadPlaceEscalationService.calculateEscalation(membershipId, 4, true);
    expect(res.consecutiveLastPlaces).toBe(5);
    expect(res.escalationLevel).toBe(4);
    expect(res.calculatedPenaltyAmount).toBe('80.00');
  });

  it('Resets streak to 0 when player escapes last place', () => {
    const res = DeadPlaceEscalationService.calculateEscalation(membershipId, 3, false);
    expect(res.consecutiveLastPlaces).toBe(0);
    expect(res.escalationLevel).toBe(0);
    expect(res.calculatedPenaltyAmount).toBe('0.00');
  });

  it('Emits append-only compensating adjustment without in-place mutation', () => {
    const adjustment = DeadPlaceEscalationService.generateCompensatingAdjustment(
      membershipId,
      '40.00',
      '20.00',
      'Stat correction moved player to 2nd-to-last'
    );
    expect(adjustment.adjustmentAmount).toBe('-20.00');
    expect(adjustment.entryType).toBe('COMPENSATION');
    expect(adjustment.reason).toContain('Stat correction');
  });
});
