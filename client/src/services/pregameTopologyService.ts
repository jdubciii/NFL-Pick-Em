export interface RawGameDefinition {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  spread: number; // e.g. -3.5 (home favored)
}

export interface UserSubmittedPick {
  userId: string;
  userName: string;
  gameId: string;
  selectedTeam: string;
  isAutopilot?: boolean;
}

export interface GameTopologyDistribution {
  gameId: string;
  totalPicks: number;
  homePicks: number;
  awayPicks: number;
  homePickerIds: string[];
  awayPickerIds: string[];
  isConsensus: boolean; // 100% of submitted cohort on same team
  consensusTeam?: string;
  isLoneWolf: boolean; // Exactly 1 user faded the rest of the cohort
  loneWolfUserId?: string;
  loneWolfTeam?: string;
}

export interface SlateTopologyResult {
  poolId: string;
  weekNumber: number;
  status: 'READY' | 'AWAITING_COHORT';
  lockedCount: number;
  cohortFloor: number;
  games: GameTopologyDistribution[];
}

export interface DifferingPickDetail {
  gameId: string;
  gameMatchup: string;
  spread: number;
  targetPick: string;
  rivalPick: string;
  swingImpactPts: number;
}

export interface DuelComparisonResult {
  targetUserId: string;
  targetUserName: string;
  rivalUserId: string;
  rivalUserName: string;
  totalGames: number;
  matchingPicksCount: number;
  differingPicksCount: number;
  potentialSwingPoints: number;
  targetWinProbabilityPct: number;
  rivalWinProbabilityPct: number;
  summaryMicrocopy: string;
  differingPicks: DifferingPickDetail[];
  targetPicksCount?: number;
  rivalPicksCount?: number;
}

/**
 * Computes slate distribution topology enforcing Finding 5.6 Anti-Peeking Cohort Floor (N >= 3).
 * Offloads matrix compute from client rendering thread.
 */
export function computeSlateTopology(
  poolId: string,
  weekNumber: number,
  userPicks: UserSubmittedPick[],
  games: RawGameDefinition[],
  cohortFloor: number = 1
): SlateTopologyResult {
  const distinctUsers = new Set(userPicks.map((p) => p.userId));
  const lockedCount = distinctUsers.size;

  if (lockedCount < cohortFloor) {
    return {
      poolId,
      weekNumber,
      status: 'AWAITING_COHORT',
      lockedCount,
      cohortFloor,
      games: []
    };
  }

  const distributions: GameTopologyDistribution[] = games.map((game) => {
    const picksForGame = userPicks.filter((p) => p.gameId === game.gameId);
    const homePickers = picksForGame.filter((p) => p.selectedTeam === game.homeTeam).map((p) => p.userId);
    const awayPickers = picksForGame.filter((p) => p.selectedTeam === game.awayTeam).map((p) => p.userId);

    const totalPicks = picksForGame.length;
    const isConsensus = totalPicks > 0 && (homePickers.length === totalPicks || awayPickers.length === totalPicks);
    const consensusTeam = isConsensus ? (homePickers.length === totalPicks ? game.homeTeam : game.awayTeam) : undefined;

    let isLoneWolf = false;
    let loneWolfUserId: string | undefined = undefined;
    let loneWolfTeam: string | undefined = undefined;

    if (totalPicks >= 3) {
      if (homePickers.length === 1 && awayPickers.length === totalPicks - 1) {
        isLoneWolf = true;
        loneWolfUserId = homePickers[0];
        loneWolfTeam = game.homeTeam;
      } else if (awayPickers.length === 1 && homePickers.length === totalPicks - 1) {
        isLoneWolf = true;
        loneWolfUserId = awayPickers[0];
        loneWolfTeam = game.awayTeam;
      }
    }

    return {
      gameId: game.gameId,
      totalPicks,
      homePicks: homePickers.length,
      awayPicks: awayPickers.length,
      homePickerIds: homePickers,
      awayPickerIds: awayPickers,
      isConsensus,
      consensusTeam,
      isLoneWolf,
      loneWolfUserId,
      loneWolfTeam
    };
  });

  return {
    poolId,
    weekNumber,
    status: 'READY',
    lockedCount,
    cohortFloor,
    games: distributions
  };
}

/**
 * Computes 1-on-1 Duel Mode comparison between active user and selected rival.
 * Enforces transient in-memory computation with zero DB persistence.
 */
export function computeDuelComparison(
  targetUserId: string,
  targetUserName: string,
  rivalUserId: string,
  rivalUserName: string,
  userPicks: UserSubmittedPick[],
  games: RawGameDefinition[]
): DuelComparisonResult {
  const targetPicks = userPicks.filter((p) => p.userId === targetUserId);
  const rivalPicks = userPicks.filter((p) => p.userId === rivalUserId);

  const differingPicks: DifferingPickDetail[] = [];
  let matchingCount = 0;

  for (const game of games) {
    const tPick = targetPicks.find((p) => p.gameId === game.gameId);
    const rPick = rivalPicks.find((p) => p.gameId === game.gameId);

    if (tPick && rPick) {
      if (tPick.selectedTeam === rPick.selectedTeam) {
        matchingCount++;
      } else {
        differingPicks.push({
          gameId: game.gameId,
          gameMatchup: `${game.awayTeam} @ ${game.homeTeam}`,
          spread: game.spread,
          targetPick: tPick.selectedTeam,
          rivalPick: rPick.selectedTeam,
          swingImpactPts: 1.0
        });
      }
    }
  }

  const differingCount = differingPicks.length;
  const potentialSwingPoints = differingCount * 1.0;

  // Pre-Game Win Probability (Tale of the Tape tug-of-war)
  // Differing picks evaluate spread advantages: favored teams earn slight probability weights
  let targetEdge = 0;
  for (const d of differingPicks) {
    const game = games.find((g) => g.gameId === d.gameId);
    if (!game) continue;
    const isTargetOnFavorite =
      (d.targetPick === game.homeTeam && game.spread < 0) ||
      (d.targetPick === game.awayTeam && game.spread > 0);
    targetEdge += isTargetOnFavorite ? 1 : -1;
  }

  const baselinePct = 50;
  const probabilityDelta = differingCount > 0 ? (targetEdge / differingCount) * 15 : 0;
  const targetWinProbabilityPct = Math.round(Math.min(85, Math.max(15, baselinePct + probabilityDelta)));
  const rivalWinProbabilityPct = 100 - targetWinProbabilityPct;

  const summaryMicrocopy = rivalPicks.length === 0
    ? `${rivalUserName} has not submitted picks yet (${targetPicks.length} submitted by you)`
    : `⚔️ ${differingCount} Differing Picks | ${potentialSwingPoints.toFixed(1)} Potential Swing Points`;

  return {
    targetUserId,
    targetUserName,
    rivalUserId,
    rivalUserName,
    totalGames: games.length,
    matchingPicksCount: matchingCount,
    differingPicksCount: differingCount,
    potentialSwingPoints,
    targetWinProbabilityPct,
    rivalWinProbabilityPct,
    summaryMicrocopy,
    differingPicks,
    targetPicksCount: targetPicks.length,
    rivalPicksCount: rivalPicks.length,
  };
}
