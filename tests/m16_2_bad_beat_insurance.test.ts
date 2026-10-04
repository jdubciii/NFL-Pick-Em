import { describe, it, expect } from 'vitest';
import { BadBeatInsuranceService, InsurancePolicy, GameFinalScore } from '../src/services/badBeatInsurance';

describe('Milestone 16.2 - Feature 9: Bad Beat Insurance Protocol (Decisions #3, #22, #54, #61, #62, #65)', () => {
  const poolId = 'pool-bb-01';

  it('Issues insurance policy on unlocked game with Decimal values', () => {
    const policy = BadBeatInsuranceService.issuePolicy(
      poolId,
      'user-1',
      'game-01',
      'DET',
      '1.00',
      '0.50',
      false
    );

    expect(policy.status).toBe('ACTIVE');
    expect(policy.premiumAmount).toBe('1.00');
    expect(policy.payoutPoints).toBe('0.50');
  });

  it('Rejects insurance policy issuance if game is locked (Decision #65)', () => {
    expect(() => {
      BadBeatInsuranceService.issuePolicy(
        poolId,
        'user-1',
        'game-01',
        'DET',
        '1.00',
        '0.50',
        true // isGameLocked
      );
    }).toThrow('already locked game');
  });

  it('Approves claim and awards rebate points on loss by <= 3 points (Bad Beat)', () => {
    const policy = BadBeatInsuranceService.issuePolicy(
      poolId,
      'user-1',
      'game-01',
      'DET',
      '1.00',
      '0.50',
      false
    );

    const score: GameFinalScore = {
      gameId: 'game-01',
      homeTeam: 'GB',
      awayTeam: 'DET',
      homeScore: 24,
      awayScore: 21, // DET lost by 3
      isFinal: true
    };

    const claim = BadBeatInsuranceService.evaluateClaim(policy, score);
    expect(claim.status).toBe('CLAIMED');
    expect(claim.rebateAwarded).toBe('0.50');
    expect(claim.pointMargin).toBe(3);
  });

  it('Expires policy when loss exceeds 3 points margin', () => {
    const policy = BadBeatInsuranceService.issuePolicy(
      poolId,
      'user-1',
      'game-01',
      'DET',
      '1.00',
      '0.50',
      false
    );

    const score: GameFinalScore = {
      gameId: 'game-01',
      homeTeam: 'GB',
      awayTeam: 'DET',
      homeScore: 28,
      awayScore: 21, // DET lost by 7
      isFinal: true
    };

    const claim = BadBeatInsuranceService.evaluateClaim(policy, score);
    expect(claim.status).toBe('EXPIRED');
    expect(claim.rebateAwarded).toBe('0.00');
    expect(claim.pointMargin).toBe(7);
  });

  it('Expires policy without claim if selected team won', () => {
    const policy = BadBeatInsuranceService.issuePolicy(
      poolId,
      'user-1',
      'game-01',
      'DET',
      '1.00',
      '0.50',
      false
    );

    const score: GameFinalScore = {
      gameId: 'game-01',
      homeTeam: 'GB',
      awayTeam: 'DET',
      homeScore: 20,
      awayScore: 24, // DET won
      isFinal: true
    };

    const claim = BadBeatInsuranceService.evaluateClaim(policy, score);
    expect(claim.status).toBe('EXPIRED');
    expect(claim.rebateAwarded).toBe('0.00');
  });
});
