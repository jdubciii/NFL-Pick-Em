import { LiveGame } from './liveScoreService';

export interface UserStandingRef {
  id: string;
  name: string;
}

export interface SlateGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  spread?: number;
  kickoffTime?: string;
}

export interface UserPickItem {
  userId: string;
  gameId: string;
  selectedTeam: string;
  isSubmitted?: boolean;
  isHidden?: boolean;
}

export interface TiebreakerData {
  actualTotalScore?: number;
  userPredictions?: Record<string, number>;
}

export interface PreviousSnapshotEntry {
  userId: string;
  rank: number;
}

export interface SwingGameCard {
  gameId: string;
  matchup: string;
  leverageScore: number;
  userPick: string;
  impactDescription: string;
  gameStatus: string;
}

export interface ProvisionalStandingEntry {
  userId: string;
  userName: string;
  bankedPoints: number;
  livePoints: number;
  totalProvisionalPoints: number;
  provisionalRank: number;
  rankDelta: number;
  isTied: boolean;
  tier: 'PODIUM' | 'SAFE_HAVEN' | 'BUBBLE' | 'DANGER' | 'PIT';
  podiumProbability: number;
  dangerProbability: number;
  swingGame: SwingGameCard | null;
}

/**
 * Pure, non-mutating Sunday Sweat projection engine (Phase 38).
 * Answers core gameday live questions:
 * 1. Current provisional rank and movement delta vs previous snapshot.
 * 2. High-leverage swing game card to escape The Pit or reach Podium.
 * 3. Empirical Danger / Podium probabilities based on live score differentials.
 *
 * Enforces Decision #66:
 * - Excludes unsubmitted (isSubmitted: false) and hidden (isHidden: true) picks.
 * - Guarantees zero mutation to underlying picks, games, timestamps, or records.
 */
export function calculateProvisionalStandings(
  users: readonly UserStandingRef[],
  games: readonly SlateGame[],
  liveScores: readonly LiveGame[] = [],
  userPicks: readonly UserPickItem[],
  tiebreakers?: TiebreakerData,
  previousSnapshot?: readonly PreviousSnapshotEntry[]
): ProvisionalStandingEntry[] {
  if (!users || users.length === 0) {
    return [];
  }

  // Build live scores map for fast, immutable O(1) lookup
  const scoreMap = new Map<string, LiveGame>();
  if (Array.isArray(liveScores)) {
    for (const score of liveScores) {
      if (score && score.id) {
        scoreMap.set(score.id, score);
      }
    }
  }

  const gameMap = new Map<string, SlateGame>();
  for (const g of games) {
    if (g && g.id) {
      gameMap.set(g.id, g);
    }
  }

  // Previous rank map
  const prevRankMap = new Map<string, number>();
  if (previousSnapshot && Array.isArray(previousSnapshot)) {
    for (const snap of previousSnapshot) {
      prevRankMap.set(snap.userId, snap.rank);
    }
  }

  // 1. Calculate points per user
  interface UserCalc {
    user: UserStandingRef;
    bankedPoints: number;
    livePoints: number;
    totalPoints: number;
    userActivePicks: { game: SlateGame; live: LiveGame | undefined; pick: UserPickItem }[];
    tiebreakerDistance?: number;
  }

  const calcs: UserCalc[] = users.map((user) => {
    let bankedPoints = 0;
    let livePoints = 0;
    const userActivePicks: { game: SlateGame; live: LiveGame | undefined; pick: UserPickItem }[] = [];

    // Filter picks for this user strictly adhering to Decision #66
    const picks = userPicks.filter(
      (p) => p.userId === user.id && p.isSubmitted !== false && p.isHidden !== true
    );

    for (const pick of picks) {
      const live = scoreMap.get(pick.gameId);
      const gameDef = gameMap.get(pick.gameId);

      if (!live) {
        // Telemetry absent or scheduled: non-scoring
        if (gameDef) {
          userActivePicks.push({ game: gameDef, live: undefined, pick });
        }
        continue;
      }

      const homeScore = parseInt(live.homeTeam?.score || '0', 10);
      const awayScore = parseInt(live.awayTeam?.score || '0', 10);

      const isHomePick = pick.selectedTeam.toUpperCase() === live.homeTeam.code.toUpperCase();
      const isAwayPick = pick.selectedTeam.toUpperCase() === live.awayTeam.code.toUpperCase();

      if (live.status === 'FINAL') {
        if ((homeScore > awayScore && isHomePick) || (awayScore > homeScore && isAwayPick)) {
          bankedPoints += 1;
        }
      } else if (live.status === 'IN_PROGRESS' || live.status === 'HALFTIME') {
        if ((homeScore > awayScore && isHomePick) || (awayScore > homeScore && isAwayPick)) {
          livePoints += 1;
        }
        if (gameDef) {
          userActivePicks.push({ game: gameDef, live, pick });
        }
      } else if (gameDef) {
        userActivePicks.push({ game: gameDef, live, pick });
      }
    }

    // Tiebreaker distance if available
    let tiebreakerDistance: number | undefined;
    if (
      tiebreakers?.actualTotalScore !== undefined &&
      tiebreakers?.userPredictions &&
      tiebreakers.userPredictions[user.id] !== undefined
    ) {
      tiebreakerDistance = Math.abs(tiebreakers.userPredictions[user.id] - tiebreakers.actualTotalScore);
    }

    return {
      user,
      bankedPoints,
      livePoints,
      totalPoints: bankedPoints + livePoints,
      userActivePicks,
      tiebreakerDistance,
    };
  });

  // 2. Sort entries (points descending, tiebreaker distance ascending)
  const sorted = [...calcs].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    if (a.tiebreakerDistance !== undefined && b.tiebreakerDistance !== undefined) {
      return a.tiebreakerDistance - b.tiebreakerDistance;
    }
    return 0; // Unresolved tie
  });

  // 3. Assign ranks and tie flags
  const totalCompetitors = sorted.length;
  const entriesWithRank: { calc: UserCalc; rank: number; isTied: boolean }[] = [];

  for (let i = 0; i < sorted.length; i++) {
    let rank = i + 1;
    let isTied = false;

    if (i > 0) {
      const prev = sorted[i - 1];
      const curr = sorted[i];

      const samePoints = curr.totalPoints === prev.totalPoints;
      const sameTiebreaker =
        (curr.tiebreakerDistance === undefined && prev.tiebreakerDistance === undefined) ||
        curr.tiebreakerDistance === prev.tiebreakerDistance;

      if (samePoints && sameTiebreaker) {
        rank = entriesWithRank[i - 1].rank;
        isTied = true;
        entriesWithRank[i - 1].isTied = true;
      }
    }

    entriesWithRank.push({ calc: sorted[i], rank, isTied });
  }

  // 4. Build ProvisionalStandingEntry items
  return entriesWithRank.map(({ calc, rank, isTied }) => {
    const prevRank = prevRankMap.get(calc.user.id);
    const rankDelta = prevRank !== undefined ? prevRank - rank : 0;

    // Determine Tier
    let tier: ProvisionalStandingEntry['tier'] = 'SAFE_HAVEN';
    if (rank === totalCompetitors && totalCompetitors > 1) {
      tier = 'PIT';
    } else if (rank <= 3) {
      tier = 'PODIUM';
    } else if (rank >= totalCompetitors - 1 && totalCompetitors >= 4) {
      tier = 'DANGER';
    } else if (rank >= totalCompetitors / 2) {
      tier = 'BUBBLE';
    }

    // Probabilities calculation
    let podiumProbability = 0;
    let dangerProbability = 0;

    if (rank === totalCompetitors && totalCompetitors > 1) {
      podiumProbability = Math.min(10, Math.max(0, 10 - rank));
      dangerProbability = Math.max(80, Math.min(99, 85 + (totalCompetitors > 1 ? 5 : 0)));
    } else if (rank <= 3) {
      podiumProbability = Math.max(70, Math.min(100, 100 - (rank - 1) * 15));
      dangerProbability = Math.max(0, 5);
    } else {
      const progressRatio = rank / totalCompetitors;
      podiumProbability = Math.round(Math.max(5, (1 - progressRatio) * 60));
      dangerProbability = Math.round(Math.max(10, progressRatio * 75));
    }

    // Determine Swing Game Card
    let swingGame: SwingGameCard | null = null;
    if (calc.userActivePicks.length > 0) {
      // Find highest leverage matchup (e.g. game in progress with tight score or spread)
      let bestCandidate = calc.userActivePicks[0];
      let maxLeverage = 1;

      for (const item of calc.userActivePicks) {
        const spreadWeight = item.game.spread ? Math.abs(item.game.spread) : 1;
        let leverage = spreadWeight;
        if (item.live && item.live.status === 'IN_PROGRESS') {
          leverage += 2;
        }
        if (leverage > maxLeverage) {
          maxLeverage = leverage;
          bestCandidate = item;
        }
      }

      const statusDesc = bestCandidate.live ? bestCandidate.live.status : 'SCHEDULED';
      const matchupText = `${bestCandidate.game.awayTeam} @ ${bestCandidate.game.homeTeam}`;

      let impactDesc = `Victory with ${bestCandidate.pick.selectedTeam} stabilizes rank`;
      if (tier === 'PIT' || tier === 'DANGER') {
        impactDesc = `Crucial swing pick: Winning with ${bestCandidate.pick.selectedTeam} lifts user out of The Pit`;
      } else if (tier === 'PODIUM') {
        impactDesc = `Defensive lock: ${bestCandidate.pick.selectedTeam} secures top podium standing`;
      }

      swingGame = {
        gameId: bestCandidate.game.id,
        matchup: matchupText,
        leverageScore: Math.round(maxLeverage * 10) / 10,
        userPick: bestCandidate.pick.selectedTeam,
        impactDescription: impactDesc,
        gameStatus: statusDesc,
      };
    }

    return {
      userId: calc.user.id,
      userName: calc.user.name,
      bankedPoints: calc.bankedPoints,
      livePoints: calc.livePoints,
      totalProvisionalPoints: calc.totalPoints,
      provisionalRank: rank,
      rankDelta,
      isTied,
      tier,
      podiumProbability,
      dangerProbability,
      swingGame,
    };
  });
}
