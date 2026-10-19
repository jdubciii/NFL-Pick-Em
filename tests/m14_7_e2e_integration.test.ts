import { describe, it, expect, beforeEach } from 'vitest';
import { FeatureRegistryService, FeatureFlagKey } from '../src/services/featureRegistry';
import { WeeklyStateGraphService, SlateState, GameLockState } from '../src/services/weeklyStateGraph';
import { PickVisibilityService } from '../src/services/pickVisibility';
import { MatrixCommandBarService } from '../src/services/matrixCommandBar';
import { DeadPlaceEscalationService } from '../src/services/deadPlaceEscalation';
import { LeaguePressBoxService, SettledPlayerStanding } from '../src/services/leaguePressBox';

describe('Milestone 14.7 - Phase 14 E2E Pipeline Integration (Decisions #3, #20, #22, #54, #61, #62, #65, #66)', () => {
  const poolId = 'pool-phase14-e2e';
  const user1 = 'mem-user-1';
  const user2 = 'mem-user-2';
  const user3 = 'mem-user-3';

  beforeEach(() => {
    FeatureRegistryService.clear();
  });

  it('Executes the complete Phase 14 lifecycle across all 6 modules', () => {
    // 1. M14.1: Feature Registry defaults OFF, selectively enabled
    expect(FeatureRegistryService.isFeatureEnabled(poolId, FeatureFlagKey.MATRIX_COMMAND_BAR)).toBe(false);
    FeatureRegistryService.setFlag(poolId, FeatureFlagKey.MATRIX_COMMAND_BAR, true);
    FeatureRegistryService.setFlag(poolId, FeatureFlagKey.DEAD_PLACE_ESCALATION, true);
    FeatureRegistryService.setFlag(poolId, FeatureFlagKey.LEAGUE_PRESS_BOX, true);
    expect(FeatureRegistryService.isFeatureEnabled(poolId, FeatureFlagKey.MATRIX_COMMAND_BAR)).toBe(true);

    // 2. M14.2: Weekly State Graph derivation across game slate
    const kickoffThursday = new Date('2026-10-08T00:15:00Z');
    const kickoffSunday = new Date('2026-10-11T17:00:00Z');
    const games: GameLockState[] = [
      { id: 'g_thu', kickoffTime: kickoffThursday, status: 'SCHEDULED' },
      { id: 'g_sun', kickoffTime: kickoffSunday, status: 'SCHEDULED' }
    ];

    // Pre-kickoff: Slate is OPEN
    const t0 = new Date('2026-10-07T12:00:00Z');
    expect(WeeklyStateGraphService.deriveSlateState(games, t0)).toBe(SlateState.OPEN);

    // Thursday game locks: Slate is PARTIAL_LOCK (Amendment A7)
    const t1 = new Date('2026-10-08T01:00:00Z');
    expect(WeeklyStateGraphService.deriveSlateState(games, t1)).toBe(SlateState.PARTIAL_LOCK);
    expect(WeeklyStateGraphService.isGameLocked(games[0], t1)).toBe(true);
    expect(WeeklyStateGraphService.isGameLocked(games[1], t1)).toBe(false);

    // 3. M14.3: Pick Visibility allows peer visibility immediately (P41-POOL-VISIBILITY-2026-10-19-08)
    expect(PickVisibilityService.canViewPick({
      viewerMembershipId: user1,
      targetMembershipId: user2,
      isGameLocked: false,
      hidePicksUntilKickoff: true
    })).toBe(true);

    expect(PickVisibilityService.canViewPick({
      viewerMembershipId: user1,
      targetMembershipId: user2,
      isGameLocked: true,
      hidePicksUntilKickoff: true
    })).toBe(true);

    // 4. M14.4: Matrix Command Bar sweeps unlocked games while respecting locked boundaries
    const sweepRes = MatrixCommandBarService.executeSweep({
      action: 'FAVORITES',
      poolId,
      membershipId: user1,
      slateGames: [
        { id: 'g_thu', homeTeam: 'KC', awayTeam: 'DEN', isLocked: true },
        { id: 'g_sun', homeTeam: 'DAL', awayTeam: 'PHI', isLocked: false }
      ],
      currentPicks: {}
    });
    expect(sweepRes.updatedPicks['g_sun']).toBe('DAL');
    expect(sweepRes.updatedPicks['g_thu']).toBeUndefined();
    expect(sweepRes.rejectedGames).toContain('g_thu');

    // 5. M14.2 & Settled State: Games conclude, slate transitions to SETTLEMENT
    const finalizedGames: GameLockState[] = [
      { id: 'g_thu', kickoffTime: kickoffThursday, status: 'FINAL' },
      { id: 'g_sun', kickoffTime: kickoffSunday, status: 'FINAL' }
    ];
    expect(WeeklyStateGraphService.deriveSlateState(finalizedGames, new Date('2026-10-12T04:00:00Z'))).toBe(SlateState.SETTLEMENT);

    // 6. M14.5: Dead Place Escalation processes last-place streak with Decimal precision
    const standings: SettledPlayerStanding[] = [
      { membershipId: user1, displayName: 'Winner User', score: 14, rank: 1, correctPicksCount: 14, totalPicksCount: 16, isDeadPlace: false },
      { membershipId: user2, displayName: 'Middle User', score: 10, rank: 2, correctPicksCount: 10, totalPicksCount: 16, isDeadPlace: false },
      { membershipId: user3, displayName: 'Last User', score: 4, rank: 3, correctPicksCount: 4, totalPicksCount: 16, isDeadPlace: true }
    ];

    // User3 on a 2-week last place streak: 10 * 2^1 = 20.00
    const escalation = DeadPlaceEscalationService.calculateEscalation(user3, 1, true);
    expect(escalation.consecutiveLastPlaces).toBe(2);
    expect(escalation.calculatedPenaltyAmount).toBe('20.00');

    // 7. M14.6: League Press Box extracts facts and generates deterministic recap
    const facts = LeaguePressBoxService.extractFacts(poolId, 5, 'snap-w5', standings);
    expect(facts).toHaveLength(3);
    const recap = LeaguePressBoxService.generateRecap(poolId, 5, facts, standings, 1);
    expect(recap.headline).toContain('Winner User Takes the Slate');
    expect(recap.narrativeBody).toContain('Last User lands in the Dead Place ladder');
  });
});
