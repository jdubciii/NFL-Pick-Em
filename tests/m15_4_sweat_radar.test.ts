import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SweatRadarService, SlateGame, MemberPick } from '../src/services/sweatRadar';
import { FeatureRegistryService, FeatureFlagKey } from '../src/services/featureRegistry';

describe('Milestone 15.4 - Feature 6: Sweat Radar & Divergence Simulator (Decisions #3, #22, #54, #61, #62, #66)', () => {
  const poolId = 'pool-sweat-m15-4';
  const weekNo = 8;

  // Slate fixture: 4 games, mixed lock/final states
  const games: SlateGame[] = [
    { gameId: 'g1', homeTeamId: 'KC', awayTeamId: 'BUF', isLocked: true, homeScore: 24, awayScore: 21, isFinal: true },
    { gameId: 'g2', homeTeamId: 'SF', awayTeamId: 'PHI', isLocked: true, homeScore: null, awayScore: null, isFinal: false },
    { gameId: 'g3', homeTeamId: 'DAL', awayTeamId: 'GB', isLocked: true, homeScore: null, awayScore: null, isFinal: false },
    { gameId: 'g4', homeTeamId: 'MIA', awayTeamId: 'NYJ', isLocked: false, homeScore: null, awayScore: null, isFinal: false }
  ];

  // 4 members with picks for all games
  const picks: MemberPick[] = [
    // Member A
    { membershipId: 'mem-A', gameId: 'g1', selectedTeamId: 'KC' },
    { membershipId: 'mem-A', gameId: 'g2', selectedTeamId: 'SF' },
    { membershipId: 'mem-A', gameId: 'g3', selectedTeamId: 'DAL' },
    { membershipId: 'mem-A', gameId: 'g4', selectedTeamId: 'MIA' },
    // Member B
    { membershipId: 'mem-B', gameId: 'g1', selectedTeamId: 'BUF' },
    { membershipId: 'mem-B', gameId: 'g2', selectedTeamId: 'SF' },
    { membershipId: 'mem-B', gameId: 'g3', selectedTeamId: 'GB' },
    { membershipId: 'mem-B', gameId: 'g4', selectedTeamId: 'NYJ' },
    // Member C
    { membershipId: 'mem-C', gameId: 'g1', selectedTeamId: 'KC' },
    { membershipId: 'mem-C', gameId: 'g2', selectedTeamId: 'PHI' },
    { membershipId: 'mem-C', gameId: 'g3', selectedTeamId: 'DAL' },
    { membershipId: 'mem-C', gameId: 'g4', selectedTeamId: 'MIA' },
    // Member D
    { membershipId: 'mem-D', gameId: 'g1', selectedTeamId: 'KC' },
    { membershipId: 'mem-D', gameId: 'g2', selectedTeamId: 'SF' },
    { membershipId: 'mem-D', gameId: 'g3', selectedTeamId: 'GB' },
    { membershipId: 'mem-D', gameId: 'g4', selectedTeamId: 'NYJ' }
  ];

  // ── Decision #62: Circuit Breaker ──────────────────────────────────────

  describe('Decision #62 - Circuit Breaker (FeatureFlagKey.SWEAT_RADAR)', () => {
    afterEach(() => FeatureRegistryService.clear());

    it('Feature is disabled by default (returns false)', () => {
      expect(FeatureRegistryService.isFeatureEnabled(poolId, FeatureFlagKey.SWEAT_RADAR)).toBe(false);
    });

    it('Feature gates can be toggled on and off', () => {
      FeatureRegistryService.setFlag(poolId, FeatureFlagKey.SWEAT_RADAR, true);
      expect(FeatureRegistryService.isFeatureEnabled(poolId, FeatureFlagKey.SWEAT_RADAR)).toBe(true);

      FeatureRegistryService.setFlag(poolId, FeatureFlagKey.SWEAT_RADAR, false);
      expect(FeatureRegistryService.isFeatureEnabled(poolId, FeatureFlagKey.SWEAT_RADAR)).toBe(false);
    });
  });

  // ── Decision #66: Lock-Gated Divergence ────────────────────────────────

  describe('Divergence Computation (Decision #66 - Lock Visibility)', () => {
    it('Excludes unlocked games from divergence output', () => {
      const divergence = SweatRadarService.computeDivergence(games, picks);
      const gameIds = divergence.map(d => d.gameId);

      // g4 is unlocked → must NOT appear in divergence
      expect(gameIds).not.toContain('g4');
      // g1, g2, g3 are locked → must appear
      expect(gameIds).toContain('g1');
      expect(gameIds).toContain('g2');
      expect(gameIds).toContain('g3');
    });

    it('Computes correct home/away pick rates with Decimal precision', () => {
      const divergence = SweatRadarService.computeDivergence(games, picks);

      // g1: 3 picked KC (home), 1 picked BUF (away) → 0.75 / 0.25
      const g1 = divergence.find(d => d.gameId === 'g1')!;
      expect(g1.homePickRate).toBe('0.75');
      expect(g1.awayPickRate).toBe('0.25');
      expect(g1.cohortSize).toBe(4);
      expect(g1.isSuppressed).toBe(false);

      // g2: 3 picked SF (home), 1 picked PHI (away) → 0.75 / 0.25
      const g2 = divergence.find(d => d.gameId === 'g2')!;
      expect(g2.homePickRate).toBe('0.75');
      expect(g2.awayPickRate).toBe('0.25');

      // g3: 2 picked DAL (home), 2 picked GB (away) → 0.50 / 0.50
      const g3 = divergence.find(d => d.gameId === 'g3')!;
      expect(g3.homePickRate).toBe('0.50');
      expect(g3.awayPickRate).toBe('0.50');
    });
  });

  // ── Finding 5.6: Cohort Floor Suppression ──────────────────────────────

  describe('Cohort Floor Suppression (Finding 5.6 / canExposeAggregate)', () => {
    it('Suppresses divergence when cohort size is below the floor (< 3)', () => {
      // Only 2 members with picks for this game
      const tinyPicks: MemberPick[] = [
        { membershipId: 'mem-X', gameId: 'g1', selectedTeamId: 'KC' },
        { membershipId: 'mem-Y', gameId: 'g1', selectedTeamId: 'BUF' }
      ];

      const divergence = SweatRadarService.computeDivergence(games, tinyPicks, 3);
      const g1 = divergence.find(d => d.gameId === 'g1')!;

      expect(g1.isSuppressed).toBe(true);
      expect(g1.homePickRate).toBe('0.00');
      expect(g1.awayPickRate).toBe('0.00');
      expect(g1.cohortSize).toBe(2);
    });

    it('Does NOT suppress when cohort meets or exceeds the floor', () => {
      const divergence = SweatRadarService.computeDivergence(games, picks, 3);
      const g1 = divergence.find(d => d.gameId === 'g1')!;
      expect(g1.isSuppressed).toBe(false);
      expect(g1.cohortSize).toBe(4);
    });
  });

  // ── Leverage / Swing Calculations ──────────────────────────────────────

  describe('Leverage Swing Computation (Decision #54 - Pure Calculation)', () => {
    it('Computes leverage only for locked, non-finalized games', () => {
      const leverage = SweatRadarService.computeLeverage(games, picks);
      const gameIds = [...new Set(leverage.map(l => l.gameId))];

      // g1 is finalized → excluded; g4 is unlocked → excluded
      expect(gameIds).not.toContain('g1');
      expect(gameIds).not.toContain('g4');
      // g2 and g3 are locked + not final → included
      expect(gameIds).toContain('g2');
      expect(gameIds).toContain('g3');
    });

    it('Produces a leverage entry for every member with a pick on pending games', () => {
      const leverage = SweatRadarService.computeLeverage(games, picks);

      // 2 pending games × 4 members = 8 leverage entries
      expect(leverage.length).toBe(8);
    });

    it('Swing magnitude is always non-negative (Decimal precision)', () => {
      const leverage = SweatRadarService.computeLeverage(games, picks);

      for (const entry of leverage) {
        const swing = parseFloat(entry.swingMagnitude);
        expect(swing).toBeGreaterThanOrEqual(0);
      }
    });

    it('Higher swing for games with more divergent picks (g3 50/50 split)', () => {
      const leverage = SweatRadarService.computeLeverage(games, picks);

      // g3 is 50/50 (DAL vs GB) — should produce equal swing for all members
      const g3Entries = leverage.filter(l => l.gameId === 'g3');
      expect(g3Entries.length).toBe(4);

      // For a 50/50 split, each member has 1 ally and 2 opponents out of 3 others
      // ifCorrect = 1.00 * 2/3 = 0.67, ifWrong = -(1.00 * 2/3) = -0.67, swing = 1.33
      for (const entry of g3Entries) {
        expect(entry.ifCorrectDelta).toBe('0.67');
        expect(entry.ifWrongDelta).toBe('-0.67');
        expect(entry.swingMagnitude).toBe('1.33');  // Truncated from 1.3333...
      }
    });
  });

  // ── Scenario Simulation ────────────────────────────────────────────────

  describe('Scenario Simulation (Decision #54 - Zero Writes on GET)', () => {
    const currentTotals: Record<string, string> = {
      'mem-A': '45.00',
      'mem-B': '42.00',
      'mem-C': '44.00',
      'mem-D': '43.00'
    };

    it('Projects correct totals when all home teams win', () => {
      const scenario = SweatRadarService.simulateScenario(
        'all-home-wins',
        'All home teams win remaining games',
        { 'g2': 'SF', 'g3': 'DAL' },
        picks,
        currentTotals
      );

      expect(scenario.scenarioId).toBe('all-home-wins');
      expect(scenario.outcomes.length).toBe(4);

      // mem-A picked SF (g2) + DAL (g3) → +2.00 → 47.00
      const memA = scenario.outcomes.find(o => o.membershipId === 'mem-A')!;
      expect(memA.projectedTotal).toBe('47.00');
      expect(memA.deltaFromCurrent).toBe('2.00');

      // mem-B picked SF (g2) + GB (g3) → +1.00 → 43.00
      const memB = scenario.outcomes.find(o => o.membershipId === 'mem-B')!;
      expect(memB.projectedTotal).toBe('43.00');
      expect(memB.deltaFromCurrent).toBe('1.00');
    });

    it('Outcomes are sorted descending by projected total', () => {
      const scenario = SweatRadarService.simulateScenario(
        'sort-check',
        'Check sort order',
        { 'g2': 'SF', 'g3': 'DAL' },
        picks,
        currentTotals
      );

      for (let i = 0; i < scenario.outcomes.length - 1; i++) {
        expect(parseFloat(scenario.outcomes[i].projectedTotal))
          .toBeGreaterThanOrEqual(parseFloat(scenario.outcomes[i + 1].projectedTotal));
      }
    });

    it('Zero delta when no assumptions match any picks', () => {
      const scenario = SweatRadarService.simulateScenario(
        'no-match',
        'No matching outcomes',
        { 'g2': 'NONEXISTENT_TEAM' },
        picks,
        currentTotals
      );

      for (const outcome of scenario.outcomes) {
        expect(outcome.deltaFromCurrent).toBe('0.00');
      }
    });
  });

  // ── Full Snapshot Builder ──────────────────────────────────────────────

  describe('Snapshot Builder (Decision #61 - Pure Overlay)', () => {
    it('Builds a complete snapshot with divergence and leverage', () => {
      const snapshot = SweatRadarService.buildSnapshot(poolId, weekNo, games, picks);

      expect(snapshot.poolId).toBe(poolId);
      expect(snapshot.weekNo).toBe(weekNo);
      expect(snapshot.gamesFinalized).toBe(1); // g1 is final
      expect(snapshot.gamesRemaining).toBe(3); // g2, g3, g4
      expect(snapshot.divergence.length).toBeGreaterThan(0);
      expect(snapshot.leverage.length).toBeGreaterThan(0);
    });

    it('Snapshot divergence excludes unlocked games', () => {
      const snapshot = SweatRadarService.buildSnapshot(poolId, weekNo, games, picks);
      const divergenceGameIds = snapshot.divergence.map(d => d.gameId);
      expect(divergenceGameIds).not.toContain('g4');
    });

    it('Snapshot leverage excludes finalized games', () => {
      const snapshot = SweatRadarService.buildSnapshot(poolId, weekNo, games, picks);
      const leverageGameIds = [...new Set(snapshot.leverage.map(l => l.gameId))];
      expect(leverageGameIds).not.toContain('g1');
    });
  });
});
