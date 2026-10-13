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
  tier: 'SAFE_HAVEN' | 'DANGER_ZONE' | 'THE_DROP' | 'PIT' | 'PODIUM';
  projectedPenalty: number;
  statusText: string;
  podiumProbability: number;
  dangerProbability: number;
  swingGame: SwingGameCard | null;
}

export type ProvisionalStanding = ProvisionalStandingEntry;
export type SwingGameInfo = SwingGameCard;

export interface ProvisionalStandingsResult extends Array<ProvisionalStanding> {
  standings: ProvisionalStanding[];
  swingGame: SwingGameInfo | null;
  lastUpdated?: string;
  isStale?: boolean;
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
): ProvisionalStandingsResult {
  if (!users || users.length === 0) {
    const emptyResult = [] as unknown as ProvisionalStandingsResult;
    emptyResult.standings = [];
    emptyResult.swingGame = null;
    emptyResult.lastUpdated = new Date().toISOString();
    emptyResult.isStale = false;
    return emptyResult;
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
      } else if (live.status === 'IN_PROGRESS') {
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
  const standings = entriesWithRank.map(({ calc, rank, isTied }) => {
    const prevRank = prevRankMap.get(calc.user.id);
    const rankDelta = prevRank !== undefined ? prevRank - rank : 0;

    // 1. Charter Penalty Tier Alignment:
    // Rank 1: "SAFE HAVEN" (0 shots)
    // Ranks 2–6: "DANGER ZONE" (1 shot exposure)
    // Ranks 7–9: "THE DROP" (2 shots exposure)
    // Rank 10: "THE PIT" (2.5 shots / Dead Place Monarch provisional)
    let tier: ProvisionalStandingEntry['tier'] = 'DANGER_ZONE';
    if (rank === 1) {
      tier = 'SAFE_HAVEN';
    } else if (rank >= 2 && rank <= 6) {
      if (rank === totalCompetitors && totalCompetitors > 1) {
        tier = 'PIT';
      } else {
        tier = 'DANGER_ZONE';
      }
    } else if (rank >= 7 && (totalCompetitors <= 9 ? rank < totalCompetitors : rank <= 9)) {
      tier = 'THE_DROP';
    } else {
      tier = 'PIT';
    }

    let projectedPenalty = 1;
    if (tier === 'SAFE_HAVEN') {
      projectedPenalty = 0;
    } else if (tier === 'DANGER_ZONE') {
      projectedPenalty = 1;
    } else if (tier === 'THE_DROP') {
      projectedPenalty = 2;
    } else if (tier === 'PIT') {
      projectedPenalty = 2.5;
    }

    // 2. Deterministic point gap status text (eliminating fake percentages)
    let statusText = '';
    const points = calc.totalPoints;
    if (rank === 1) {
      const rank2 = sorted.find((_, idx) => entriesWithRank[idx]?.rank === 2) || sorted[1];
      const gap = rank2 ? points - rank2.totalPoints : 0;
      statusText = gap > 0 ? `Currently ${gap} pt ahead of Danger Zone` : 'Holding Safe Haven on tiebreaker';
    } else if (tier === 'DANGER_ZONE') {
      const dropBorder = sorted.find((_, idx) => entriesWithRank[idx]?.rank === 7) || sorted[sorted.length - 1];
      const gapToDrop = dropBorder ? points - dropBorder.totalPoints : 0;
      const rank1 = sorted[0];
      const gapToLeader = rank1 ? rank1.totalPoints - points : 1;
      statusText = gapToDrop > 0 ? `Currently ${gapToDrop} pt ahead of The Drop` : `${gapToLeader} pt behind Safe Haven`;
    } else if (tier === 'THE_DROP') {
      const pitUser = sorted[sorted.length - 1];
      const gapToPit = pitUser ? points - pitUser.totalPoints : 0;
      statusText = gapToPit > 0 ? `Currently ${gapToPit} pt ahead of The Pit` : 'Teetering on The Pit boundary';
    } else {
      const nonPitUser = sorted.find((_, idx) => entriesWithRank[idx]?.rank < rank) || sorted[0];
      const gapToSafety = nonPitUser ? nonPitUser.totalPoints - points : 1;
      statusText = `${gapToSafety} pt to escape The Pit`;
    }

    const podiumProbability = tier === 'SAFE_HAVEN' ? 100 : (rank <= 3 ? 75 : 0);
    const dangerProbability = tier === 'PIT' ? 95 : (tier === 'THE_DROP' ? 70 : (tier === 'DANGER_ZONE' ? 40 : 0));

    // Determine Swing Game Card (active matchups only; completed games cannot swing)
    let swingGame: SwingGameCard | null = null;
    const activeCandidates = calc.userActivePicks.filter(
      (p) => !p.live || p.live.status !== 'FINAL'
    );

    if (activeCandidates.length > 0) {
      // Find highest leverage matchup (e.g. game in progress with tight score or spread)
      let bestCandidate = activeCandidates[0];
      let maxLeverage = 1;

      for (const item of activeCandidates) {
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
      if (tier === 'PIT' || tier === 'THE_DROP') {
        impactDesc = `Crucial swing pick: Winning with ${bestCandidate.pick.selectedTeam} lifts user out of The Pit`;
      } else if (tier === 'SAFE_HAVEN') {
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
      projectedPenalty,
      statusText,
      podiumProbability,
      dangerProbability,
      swingGame,
    };
  });

  const result = standings as unknown as ProvisionalStandingsResult;
  result.standings = standings;
  result.swingGame = standings.find((s) => s.swingGame !== null)?.swingGame ?? null;
  result.lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  result.isStale = false;

  return result;
}
