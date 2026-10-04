import { describe, it, expect } from 'vitest';
import { RivalHexService } from '../src/services/rivalHex';

describe('Milestone 15.2 - Feature 4: Rival Hex Pairwise Challenge Engine (Decisions #3, #22, #61, #62, #65)', () => {
  const poolId = 'pool-hex-m15-2';
  const weekNo = 5;
  const challenger = 'user-challenger-1';
  const target = 'user-target-2';

  it('Creates a proposed challenge with valid Decimal stakes and handicap', () => {
    const challenge = RivalHexService.proposeChallenge(
      poolId,
      weekNo,
      challenger,
      target,
      '20.00',
      '1.5',
      false
    );

    expect(challenge.stakeAmount).toBe('20.00');
    expect(challenge.handicapPoints).toBe('1.5');
    expect(challenge.status).toBe('PROPOSED');
  });

  it('Rejects self-challenge fail-closed', () => {
    expect(() => {
      RivalHexService.proposeChallenge(poolId, weekNo, challenger, challenger, '20.00', '0', false);
    }).toThrow('Cannot challenge self');
  });

  it('Rejects challenge proposal on locked slate (Decision #65)', () => {
    expect(() => {
      RivalHexService.proposeChallenge(poolId, weekNo, challenger, target, '20.00', '0', true);
    }).toThrow('already locked slate');
  });

  it('Rejects challenge acceptance once slate has locked (Decision #65)', () => {
    const challenge = RivalHexService.proposeChallenge(poolId, weekNo, challenger, target, '20.00', '0', false);
    expect(() => {
      RivalHexService.acceptChallenge(challenge, true);
    }).toThrow('after slate has locked');
  });

  it('Settles challenger victory and awards 2x side-pot ($40.00)', () => {
    const proposed = RivalHexService.proposeChallenge(poolId, weekNo, challenger, target, '20.00', '0', false);
    const accepted = RivalHexService.acceptChallenge(proposed, false);

    // Challenger 14 vs Target 12
    const res = RivalHexService.settleChallenge(accepted, 14, 12);
    expect(res.action).toBe('WINNER_PAID');
    expect(res.winnerPayout).toBe('40.00');
    expect(res.settledChallenge.winnerMembershipId).toBe(challenger);
    expect(res.settledChallenge.status).toBe('SETTLED');
  });

  it('Applies positive handicap correctly to target player', () => {
    // Target gets +1.5 points handicap
    const proposed = RivalHexService.proposeChallenge(poolId, weekNo, challenger, target, '25.00', '1.5', false);
    const accepted = RivalHexService.acceptChallenge(proposed, false);

    // Challenger raw 13 vs Target raw 12 -> Adjusted Target is 13.5 (Target wins)
    const res = RivalHexService.settleChallenge(accepted, 13, 12);
    expect(res.action).toBe('WINNER_PAID');
    expect(res.winnerPayout).toBe('50.00');
    expect(res.settledChallenge.winnerMembershipId).toBe(target);
  });

  it('Resolves exact score tie to STALEMATE_REFUND returning original stake', () => {
    const proposed = RivalHexService.proposeChallenge(poolId, weekNo, challenger, target, '30.00', '0', false);
    const accepted = RivalHexService.acceptChallenge(proposed, false);

    // Exact tie: 12 vs 12
    const res = RivalHexService.settleChallenge(accepted, 12, 12);
    expect(res.action).toBe('STALEMATE_REFUND');
    expect(res.winnerPayout).toBe('30.00'); // Original single stake refunded
    expect(res.settledChallenge.isStalemateRefund).toBe(true);
    expect(res.settledChallenge.winnerMembershipId).toBeUndefined();
  });
});
