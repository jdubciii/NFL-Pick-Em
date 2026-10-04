import { describe, it, expect } from 'vitest';
import { BountyBoardService } from '../src/services/bountyBoard';
import { RivalHexService } from '../src/services/rivalHex';
import { ComebackVaultService, PlayerStandingSnapshot } from '../src/services/comebackVault';
import { SweatRadarService, SlateGame, MemberPick } from '../src/services/sweatRadar';

describe('Milestone 15.5 - Phase 15 E2E Pipeline Integration (Decisions #3, #20, #22, #54, #61, #62, #65, #66)', () => {
  const poolId = 'pool-phase15-e2e';
  const playerA = 'mem-user-A';
  const playerB = 'mem-user-B';
  const playerC = 'mem-user-C';
  const playerD = 'mem-user-D';
  const expiry = new Date('2026-11-15T18:00:00Z');

  it('Executes the complete Phase 15 social stakes & risk telemetry pipeline', () => {
    // 1. M15.1: Bounty Board Offer & Multi-Claimant Settlement (Decisions #3, #22, #65)
    const bounty = BountyBoardService.createBountyOffer(
      poolId,
      playerA,
      'game-sun-night',
      'CORRECT_PICK',
      '99.99',
      expiry,
      false // Target game unlocked
    );
    expect(bounty.escrowAmount).toBe('99.99');

    // Split between Player B and Player C ($99.99 / 2 = $50.00 and $49.99, penny preserved)
    const bountyResult = BountyBoardService.settleBounty(bounty, [playerB, playerC]);
    expect(bountyResult.action).toBe('CLAIMED');
    expect(bountyResult.payouts).toHaveLength(2);
    expect(bountyResult.payouts[0].payoutAmount).toBe('50.00');
    expect(bountyResult.payouts[1].payoutAmount).toBe('49.99');

    // 2. M15.2: Rival Hex Challenge Proposal & Payout Settlement (Decisions #3, #22, #65)
    const challenge = RivalHexService.proposeChallenge(
      poolId,
      10,
      playerA,
      playerB,
      '50.00',
      '2.0', // Player B gets +2.0 handicap
      false  // Slate unlocked
    );
    const accepted = RivalHexService.acceptChallenge(challenge, false);

    // Player A raw score 12 vs Player B raw score 11 (Adjusted B is 13.0 -> B wins)
    const hexResult = RivalHexService.settleChallenge(accepted, 12, 11);
    expect(hexResult.action).toBe('WINNER_PAID');
    expect(hexResult.winnerPayout).toBe('100.00'); // 2x pot
    expect(hexResult.settledChallenge.winnerMembershipId).toBe(playerB);

    // 3. M15.3: Comeback Vault Eligibility & Boost Scoring (Decisions #3, #22, #65)
    const standings: PlayerStandingSnapshot[] = [
      { membershipId: playerB, totalPoints: '110.00' },
      { membershipId: playerA, totalPoints: '90.00' } // 20.00 points behind leader (deficit >= 15.00)
    ];

    const eligibility = ComebackVaultService.evaluateEligibility(playerA, 10, standings);
    expect(eligibility.isEligible).toBe(true);
    expect(eligibility.eligibleBoostMultiplier).toBe('1.50');

    const boostedScore = ComebackVaultService.calculateBoostedPickScore(
      'game-mon-night',
      true, // isCorrect
      true, // isUnderdogPick
      true, // isVaultBoostApplied
      eligibility.eligibleBoostMultiplier,
      true  // isGameLocked
    );
    expect(boostedScore.finalPointsAwarded).toBe('1.50');

    // 4. M15.4: Sweat Radar Live Divergence & Cohort Protection (Decisions #54, #66)
    const games: SlateGame[] = [
      { gameId: 'g1', homeTeamId: 'KC', awayTeamId: 'LV', isLocked: true, homeScore: 24, awayScore: 20, isFinal: true },
      { gameId: 'g2', homeTeamId: 'DAL', awayTeamId: 'PHI', isLocked: true, homeScore: null, awayScore: null, isFinal: false },
      { gameId: 'g3', homeTeamId: 'SF', awayTeamId: 'LAR', isLocked: false, homeScore: null, awayScore: null, isFinal: false }
    ];

    const picks: MemberPick[] = [
      { membershipId: playerA, gameId: 'g1', selectedTeamId: 'KC' },
      { membershipId: playerA, gameId: 'g2', selectedTeamId: 'DAL' },
      { membershipId: playerA, gameId: 'g3', selectedTeamId: 'SF' },

      { membershipId: playerB, gameId: 'g1', selectedTeamId: 'KC' },
      { membershipId: playerB, gameId: 'g2', selectedTeamId: 'PHI' },
      { membershipId: playerB, gameId: 'g3', selectedTeamId: 'LAR' },

      { membershipId: playerC, gameId: 'g1', selectedTeamId: 'LV' },
      { membershipId: playerC, gameId: 'g2', selectedTeamId: 'PHI' },
      { membershipId: playerC, gameId: 'g3', selectedTeamId: 'SF' },

      { membershipId: playerD, gameId: 'g1', selectedTeamId: 'KC' },
      { membershipId: playerD, gameId: 'g2', selectedTeamId: 'DAL' },
      { membershipId: playerD, gameId: 'g3', selectedTeamId: 'SF' }
    ];

    // Compute divergence (Decision #66: unlocked g3 omitted, locked g1/g2 exposed)
    const divergence = SweatRadarService.computeDivergence(games, picks, 3);
    expect(divergence).toHaveLength(2); // Only locked games g1 and g2
    expect(divergence[0].gameId).toBe('g1');
    expect(divergence[0].isSuppressed).toBe(false);
    expect(divergence[0].homePickRate).toBe('0.75'); // 3 of 4 picked KC
    expect(divergence[0].awayPickRate).toBe('0.25'); // 1 of 4 picked LV

    expect(divergence[1].gameId).toBe('g2');
    expect(divergence[1].isSuppressed).toBe(false);
    expect(divergence[1].homePickRate).toBe('0.50'); // 2 DAL, 2 PHI
    expect(divergence[1].awayPickRate).toBe('0.50');

    // Compute leverage for pending locked games (g2)
    const leverage = SweatRadarService.computeLeverage(games, picks);
    expect(leverage.length).toBeGreaterThan(0);
    const playerALeverage = leverage.find(l => l.membershipId === playerA && l.gameId === 'g2');
    expect(playerALeverage).toBeDefined();

    // Snapshot builder test
    const snapshot = SweatRadarService.buildSnapshot(poolId, 10, games, picks);
    expect(snapshot.poolId).toBe(poolId);
    expect(snapshot.weekNo).toBe(10);
    expect(snapshot.gamesFinalized).toBe(1);
    expect(snapshot.gamesRemaining).toBe(2);
    expect(snapshot.divergence).toHaveLength(2);
  });
});
