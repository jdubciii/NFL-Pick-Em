import { describe, it, expect } from 'vitest';
import { ComebackVaultService, PlayerStandingSnapshot } from '../src/services/comebackVault';

describe('Milestone 15.3 - Feature 5: Comeback Vault Mechanics (Decisions #3, #22, #61, #62, #65)', () => {
  const standings: PlayerStandingSnapshot[] = [
    { membershipId: 'leader-1', totalPoints: '100.00' },
    { membershipId: 'middle-2', totalPoints: '90.00' },
    { membershipId: 'trailing-3', totalPoints: '80.00' } // 20.00 points behind leader
  ];

  it('Denies eligibility when slate week is before minimum threshold week', () => {
    const res = ComebackVaultService.evaluateEligibility('trailing-3', 8, standings);
    expect(res.isEligible).toBe(false);
    expect(res.reason).toContain('Vault unlocks in Week 10');
  });

  it('Denies eligibility when deficit is below threshold', () => {
    // middle-2 is 10.00 behind (threshold is 15.00)
    const res = ComebackVaultService.evaluateEligibility('middle-2', 11, standings);
    expect(res.isEligible).toBe(false);
    expect(res.deficitFromLeader).toBe('10.00');
    expect(res.allowedBoostedPicks).toBe(0);
  });

  it('Grants eligibility when week >= 10 and deficit >= 15.00 points', () => {
    // trailing-3 is 20.00 behind leader
    const res = ComebackVaultService.evaluateEligibility('trailing-3', 11, standings);
    expect(res.isEligible).toBe(true);
    expect(res.deficitFromLeader).toBe('20.00');
    expect(res.eligibleBoostMultiplier).toBe('1.50');
    expect(res.allowedBoostedPicks).toBe(2);
  });

  it('Calculates boosted underdog score with exact Decimal math (1 * 1.5 = 1.50)', () => {
    const scored = ComebackVaultService.calculateBoostedPickScore(
      'game-101',
      true,  // isCorrect
      true,  // isUnderdogPick
      true,  // isVaultBoostApplied
      '1.50',
      true
    );

    expect(scored.basePoints).toBe('1.00');
    expect(scored.boostMultiplier).toBe('1.50');
    expect(scored.finalPointsAwarded).toBe('1.50');
  });

  it('Does not apply multiplier if pick is incorrect or not underdog', () => {
    const incorrect = ComebackVaultService.calculateBoostedPickScore('g1', false, true, true, '1.50', true);
    expect(incorrect.finalPointsAwarded).toBe('0.00');

    const favoritePick = ComebackVaultService.calculateBoostedPickScore('g2', true, false, true, '1.50', true);
    expect(favoritePick.finalPointsAwarded).toBe('1.00');
  });
});
