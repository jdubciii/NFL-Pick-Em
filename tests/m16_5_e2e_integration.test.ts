import { describe, it, expect } from 'vitest';
import { SyndicatePortfolioService } from '../src/services/syndicatePortfolio';
import { BadBeatInsuranceService } from '../src/services/badBeatInsurance';
import { DynamicSpreadService } from '../src/services/dynamicSpread';
import { LivePropsService } from '../src/services/liveProps';

describe('Milestone 16.5 - Phase 16 End-to-End Pipeline Integration (Decisions #3, #22, #54, #61, #62, #65)', () => {
  const poolId = 'pool-phase16-e2e';
  const gameId = 'game-kc-bal-e2e';

  it('Executes the complete Phase 16 autonomous governance, market & engagement pipeline', () => {
    // 1. Syndicate Portfolios: Form syndicate and resolve stake-weighted pick
    const contributions = [
      { membershipId: 'user-a', amount: '80.00' },
      { membershipId: 'user-b', amount: '20.00' }
    ];
    const syndicate = SyndicatePortfolioService.createSyndicate(poolId, 'Alpha Syndicate', 'user-a', contributions, false);
    expect(syndicate.totalPoolStake).toBe('100.00');

    const votes = [
      { membershipId: 'user-a', selectedTeam: 'KC' },
      { membershipId: 'user-b', selectedTeam: 'BAL' }
    ];
    const consensus = SyndicatePortfolioService.resolveStakeWeightedPick(syndicate, gameId, votes, false);
    expect(consensus.isConsensusReached).toBe(true);
    expect(consensus.winningTeam).toBe('KC');
    expect(consensus.voteWeights['KC']).toBe('80.00');

    // 2. Dynamic Spread Adjustment: Derive market shift based on heavy KC skew
    const poolPicks = [
      { selectedTeam: 'KC' },
      { selectedTeam: 'KC' },
      { selectedTeam: 'KC' },
      { selectedTeam: 'KC' },
      { selectedTeam: 'BAL' } // 80% KC skew
    ];
    const dynamicSpread = DynamicSpreadService.calculateDynamicSpread(gameId, 'KC', 'BAL', '-3.5', poolPicks, false);
    expect(dynamicSpread.lineShift).toBe('-1.0');
    expect(dynamicSpread.adjustedSpread).toBe('-4.5');

    // 3. Bad Beat Insurance: Bind policy pre-lock and evaluate bad beat payout
    const policy = BadBeatInsuranceService.issuePolicy(poolId, 'user-b', gameId, 'BAL', '1.00', '0.50', false);
    const finalScore = {
      gameId,
      homeTeam: 'KC',
      awayTeam: 'BAL',
      homeScore: 24,
      awayScore: 21, // BAL lost by 3 (qualifying bad beat)
      isFinal: true
    };
    const claim = BadBeatInsuranceService.evaluateClaim(policy, finalScore);
    expect(claim.status).toBe('CLAIMED');
    expect(claim.rebateAwarded).toBe('0.50');

    // 4. Live In-Game Props Matrix: Create and grade prop with exact Decimal math
    const prop = LivePropsService.createProp(gameId, 'OVER_UNDER', 'Mahomes Passing Yards', '250.5', '1.00', false);
    const propPick = LivePropsService.submitPropPick(prop, 'user-a', 'OVER');
    const gradedProp = LivePropsService.gradeProp(prop, '275.0', propPick);
    expect(gradedProp.isCorrect).toBe(true);
    expect(gradedProp.pointsAwarded).toBe('1.00');

    // 5. Syndicate Dividend Distribution: Preserves odd penny remainders ($50.00 across 80% / 20%)
    const payouts = SyndicatePortfolioService.distributeWinnings(syndicate, '50.00');
    expect(payouts.find(p => p.membershipId === 'user-a')?.payoutAmount).toBe('40.00');
    expect(payouts.find(p => p.membershipId === 'user-b')?.payoutAmount).toBe('10.00');
  });

  it('Enforces lock supremacy across all Phase 16 modules fail-closed (Decision #65)', () => {
    // Syndicate creation fails on locked slate
    expect(() => {
      SyndicatePortfolioService.createSyndicate(poolId, 'Locked Syndicate', 'user-a', [{ membershipId: 'user-a', amount: '10.00' }], true);
    }).toThrow('already locked slate');

    // Insurance policy issuance fails on locked game
    expect(() => {
      BadBeatInsuranceService.issuePolicy(poolId, 'user-a', gameId, 'KC', '1.00', '0.50', true);
    }).toThrow('already locked game');

    // Dynamic spread freezes on locked game
    const spread = DynamicSpreadService.calculateDynamicSpread(gameId, 'KC', 'BAL', '-3.5', [{ selectedTeam: 'KC' }], true);
    expect(spread.isLocked).toBe(true);
    expect(spread.lineShift).toBe('0.0');

    // Live prop pick submission fails on locked prop
    const lockedProp = LivePropsService.createProp(gameId, 'OVER_UNDER', 'Test Locked', '10.5', '1.00', false);
    lockedProp.isLocked = true;
    expect(() => {
      LivePropsService.submitPropPick(lockedProp, 'user-a', 'OVER');
    }).toThrow('Prop is locked or closed');
  });
});
