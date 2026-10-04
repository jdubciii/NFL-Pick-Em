import { Prisma } from '@prisma/client';
import { PickVisibilityService } from './pickVisibility';

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface SlateGame {
  gameId: string;
  homeTeamId: string;
  awayTeamId: string;
  isLocked: boolean;
  homeScore: number | null;
  awayScore: number | null;
  isFinal: boolean;
}

export interface MemberPick {
  membershipId: string;
  gameId: string;
  selectedTeamId: string | null;
}

export interface DivergenceEntry {
  gameId: string;
  /** Fraction of the visible cohort that picked the home team, as a Decimal string */
  homePickRate: string;
  /** Fraction of the visible cohort that picked the away team, as a Decimal string */
  awayPickRate: string;
  /** Total members in the cohort who made a selection for this game */
  cohortSize: number;
  /** Whether this game's divergence data is suppressed due to cohort floor */
  isSuppressed: boolean;
}

export interface LeverageSwing {
  gameId: string;
  membershipId: string;
  /** Points the member would gain if their pick is correct */
  ifCorrectDelta: string;
  /** Points the member would lose (relative advantage lost) if their pick is wrong */
  ifWrongDelta: string;
  /** Absolute swing value = |ifCorrectDelta| + |ifWrongDelta| */
  swingMagnitude: string;
}

export interface ScenarioOutcome {
  membershipId: string;
  /** Projected total points under this scenario */
  projectedTotal: string;
  /** Change from current total */
  deltaFromCurrent: string;
}

export interface ScenarioSimulation {
  scenarioId: string;
  description: string;
  /** Map of gameId -> winning teamId for this scenario */
  assumptions: Record<string, string>;
  outcomes: ScenarioOutcome[];
}

export interface SweatRadarSnapshot {
  poolId: string;
  weekNo: number;
  divergence: DivergenceEntry[];
  leverage: LeverageSwing[];
  gamesRemaining: number;
  gamesFinalized: number;
}

// ─── Service ────────────────────────────────────────────────────────────────

export class SweatRadarService {
  /**
   * Decision #54: Pure calculation — ZERO database writes, ZERO side effects.
   * Decision #66 / Finding 5.6: Suppress divergence when cohort < minCohortFloor.
   * Decisions #3, #22: All arithmetic via Prisma.Decimal.
   */

  // ── Divergence Calculation ──────────────────────────────────────────────

  /**
   * Computes per-game pick divergence for a slate.
   * Only includes picks for LOCKED games (Decision #66 — pre-lock picks are invisible).
   * Suppresses divergence output when the cohort is below the floor (Finding 5.6).
   */
  static computeDivergence(
    games: SlateGame[],
    picks: MemberPick[],
    minCohortFloor: number = 3
  ): DivergenceEntry[] {
    const results: DivergenceEntry[] = [];

    for (const game of games) {
      // Decision #66: Only expose divergence for locked games
      if (!game.isLocked) {
        continue;
      }

      // Gather picks for this game with a valid selection
      const gamePicks = picks.filter(
        p => p.gameId === game.gameId && p.selectedTeamId !== null
      );

      const cohortSize = gamePicks.length;

      // Finding 5.6: Suppress if cohort is below the minimum floor
      if (!PickVisibilityService.canExposeAggregate(cohortSize, minCohortFloor)) {
        results.push({
          gameId: game.gameId,
          homePickRate: '0.00',
          awayPickRate: '0.00',
          cohortSize,
          isSuppressed: true
        });
        continue;
      }

      const total = new Prisma.Decimal(cohortSize);
      const homePickers = gamePicks.filter(p => p.selectedTeamId === game.homeTeamId).length;
      const awayPickers = gamePicks.filter(p => p.selectedTeamId === game.awayTeamId).length;

      const homeRate = new Prisma.Decimal(homePickers).div(total);
      const awayRate = new Prisma.Decimal(awayPickers).div(total);

      results.push({
        gameId: game.gameId,
        homePickRate: homeRate.toFixed(2),
        awayPickRate: awayRate.toFixed(2),
        cohortSize,
        isSuppressed: false
      });
    }

    return results;
  }

  // ── Leverage / Swing Calculation ────────────────────────────────────────

  /**
   * Computes the leverage swing for each member on each pending (locked but not finalized) game.
   * Leverage = how much a game outcome swings a member's relative position.
   *
   * ifCorrectDelta: points gained if the member's pick wins
   * ifWrongDelta: points of relative advantage lost if their pick loses
   * swingMagnitude: absolute sum of both deltas
   */
  static computeLeverage(
    games: SlateGame[],
    picks: MemberPick[],
    pointsPerCorrect: string = '1.00'
  ): LeverageSwing[] {
    const results: LeverageSwing[] = [];
    const ppc = new Prisma.Decimal(pointsPerCorrect);

    // Only consider locked but not-yet-finalized games
    const pendingGames = games.filter(g => g.isLocked && !g.isFinal);

    for (const game of pendingGames) {
      // All picks for this game
      const gamePicks = picks.filter(
        p => p.gameId === game.gameId && p.selectedTeamId !== null
      );

      for (const pick of gamePicks) {
        // How many OTHER members picked the same team?
        const sameTeamCount = gamePicks.filter(
          p => p.membershipId !== pick.membershipId && p.selectedTeamId === pick.selectedTeamId
        ).length;

        // How many OTHER members picked the opposing team?
        const opposingCount = gamePicks.filter(
          p => p.membershipId !== pick.membershipId && p.selectedTeamId !== pick.selectedTeamId
        ).length;

        // If correct: member gains ppc, opposing members gain 0 → net advantage = ppc * (opposing / total_others)
        // If wrong: member gains 0, same-team members also gain 0, opposing members gain ppc → net loss
        const totalOthers = sameTeamCount + opposingCount;

        if (totalOthers === 0) {
          // Solo player — no leverage against anyone
          results.push({
            gameId: game.gameId,
            membershipId: pick.membershipId,
            ifCorrectDelta: ppc.toFixed(2),
            ifWrongDelta: '0.00',
            swingMagnitude: ppc.toFixed(2)
          });
          continue;
        }

        const totalOthersDec = new Prisma.Decimal(totalOthers);
        const opposingDec = new Prisma.Decimal(opposingCount);

        // If correct: member gains ppc advantage over the opposing fraction
        const ifCorrect = ppc.mul(opposingDec).div(totalOthersDec);

        // If wrong: opposing members gain ppc, creating a deficit
        const sameTeamDec = new Prisma.Decimal(sameTeamCount);
        const ifWrong = ppc.mul(opposingDec).div(totalOthersDec).neg();

        const swing = ifCorrect.abs().add(ifWrong.abs());

        results.push({
          gameId: game.gameId,
          membershipId: pick.membershipId,
          ifCorrectDelta: ifCorrect.toFixed(2),
          ifWrongDelta: ifWrong.toFixed(2),
          swingMagnitude: swing.toFixed(2)
        });
      }
    }

    return results;
  }

  // ── Scenario Simulation ─────────────────────────────────────────────────

  /**
   * Runs a "what-if" scenario: given assumed game outcomes, projects each member's
   * total points change.
   *
   * currentTotals: map of membershipId -> current total points (Decimal string)
   * assumptions: map of gameId -> winning teamId
   * picks: all member picks for the slate
   */
  static simulateScenario(
    scenarioId: string,
    description: string,
    assumptions: Record<string, string>,
    picks: MemberPick[],
    currentTotals: Record<string, string>,
    pointsPerCorrect: string = '1.00'
  ): ScenarioSimulation {
    const ppc = new Prisma.Decimal(pointsPerCorrect);
    const outcomes: ScenarioOutcome[] = [];

    // Group picks by member
    const memberPicksMap = new Map<string, MemberPick[]>();
    for (const pick of picks) {
      const existing = memberPicksMap.get(pick.membershipId) || [];
      existing.push(pick);
      memberPicksMap.set(pick.membershipId, existing);
    }

    for (const [membershipId, memberPicks] of memberPicksMap) {
      const currentTotal = new Prisma.Decimal(currentTotals[membershipId] || '0.00');
      let additionalPoints = new Prisma.Decimal('0.00');

      for (const pick of memberPicks) {
        const assumedWinner = assumptions[pick.gameId];
        if (assumedWinner && pick.selectedTeamId === assumedWinner) {
          additionalPoints = additionalPoints.add(ppc);
        }
      }

      const projected = currentTotal.add(additionalPoints);
      const delta = projected.sub(currentTotal);

      outcomes.push({
        membershipId,
        projectedTotal: projected.toFixed(2),
        deltaFromCurrent: delta.toFixed(2)
      });
    }

    // Sort by projected total descending
    outcomes.sort((a, b) =>
      new Prisma.Decimal(b.projectedTotal).sub(new Prisma.Decimal(a.projectedTotal)).toNumber()
    );

    return {
      scenarioId,
      description,
      assumptions,
      outcomes
    };
  }

  // ── Full Snapshot Builder ───────────────────────────────────────────────

  /**
   * Builds a complete SweatRadarSnapshot combining divergence and leverage.
   * Pure calculation — no DB access (Decision #54).
   */
  static buildSnapshot(
    poolId: string,
    weekNo: number,
    games: SlateGame[],
    picks: MemberPick[],
    pointsPerCorrect: string = '1.00',
    minCohortFloor: number = 3
  ): SweatRadarSnapshot {
    const divergence = this.computeDivergence(games, picks, minCohortFloor);
    const leverage = this.computeLeverage(games, picks, pointsPerCorrect);

    const gamesFinalized = games.filter(g => g.isFinal).length;
    const gamesRemaining = games.filter(g => !g.isFinal).length;

    return {
      poolId,
      weekNo,
      divergence,
      leverage,
      gamesRemaining,
      gamesFinalized
    };
  }
}
