export type GameStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'FINAL';

export interface LiveGameTelemetry {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  spread: number;
  status: GameStatus;
  quarter?: string;
  timeRemaining?: string;
  possession?: string;
  yardLine?: number;
  isRedZone?: boolean;
}

export interface UserPick {
  userId: string;
  userName: string;
  gameId: string;
  selectedTeam: string;
}

export interface ParticipantScoreInput {
  userId: string;
  userName: string;
  seasonBankedPoints?: number;
  tiebreakerMnfDiff?: number;
}

export interface WhatIfScenario {
  gameId: string;
  scoreDeltaHome: number;
  scoreDeltaAway: number;
}

export interface ParticipantStandings {
  userId: string;
  userName: string;
  bankedPoints: number;
  projectedLivePoints: number;
  totalProjectedPoints: number;
  rank: number;
  tier: 'SAFE' | 'DANGER_ZONE' | 'DEAD_PLACE';
  isDeadPlace: boolean;
  penaltyShots: string;
  dangerSeatStatus: 'SURVIVAL_LEADER' | 'SURVIVAL_BORDER' | 'SAFE_MIDDLE' | 'DANGER_SEAT_9TH' | 'DEAD_PLACE_10TH';
  gapToSafety: number;
  leadOverDanger: number;
  threatenedByRedZone: boolean;
}

export function evaluatePickATS(pick: UserPick, game: LiveGameTelemetry): { covered: boolean; push: boolean; points: number } {
  const homeMarginWithSpread = (game.homeScore + game.spread) - game.awayScore;

  if (homeMarginWithSpread === 0) {
    return { covered: false, push: true, points: 0.5 };
  }

  if (pick.selectedTeam === game.homeTeam) {
    const covered = homeMarginWithSpread > 0;
    return { covered, push: false, points: covered ? 1.0 : 0.0 };
  } else {
    const covered = homeMarginWithSpread < 0;
    return { covered, push: false, points: covered ? 1.0 : 0.0 };
  }
}

export function evaluateLiveStandings(
  participants: ParticipantScoreInput[],
  picks: UserPick[],
  games: LiveGameTelemetry[],
  whatIfs: WhatIfScenario[] = []
): ParticipantStandings[] {
  const activeGames = games.map((baseGame) => {
    const override = whatIfs.find((w) => w.gameId === baseGame.gameId);
    if (!override) return baseGame;
    return {
      ...baseGame,
      homeScore: baseGame.homeScore + override.scoreDeltaHome,
      awayScore: baseGame.awayScore + override.scoreDeltaAway
    };
  });

  const scoresMap = new Map<string, { banked: number; live: number; threatened: boolean }>();

  for (const p of participants) {
    scoresMap.set(p.userId, { banked: 0, live: 0, threatened: false });
  }

  for (const pick of picks) {
    const game = activeGames.find((g) => g.gameId === pick.gameId);
    if (!game) continue;

    const userScore = scoresMap.get(pick.userId);
    if (!userScore) continue;

    if (game.status === 'FINAL') {
      const outcome = evaluatePickATS(pick, game);
      userScore.banked += outcome.points;
    } else if (game.status === 'IN_PROGRESS') {
      const outcome = evaluatePickATS(pick, game);
      userScore.live += outcome.points;

      const isRedZone = game.isRedZone || (game.yardLine !== undefined && game.yardLine <= 20);
      if (isRedZone) {
        const opposingTeam = pick.selectedTeam === game.homeTeam ? game.awayTeam : game.homeTeam;
        if (game.possession === opposingTeam && outcome.covered) {
          userScore.threatened = true;
        }
      }
    }
  }

  const evaluated = participants.map((p) => {
    const s = scoresMap.get(p.userId) || { banked: 0, live: 0, threatened: false };
    const total = s.banked + s.live;
    return {
      userId: p.userId,
      userName: p.userName,
      bankedPoints: s.banked,
      projectedLivePoints: s.live,
      totalProjectedPoints: total,
      seasonBanked: p.seasonBankedPoints || 0,
      tiebreakerMnf: p.tiebreakerMnfDiff ?? 999,
      threatenedByRedZone: s.threatened
    };
  });

  evaluated.sort((a, b) => {
    if (b.totalProjectedPoints !== a.totalProjectedPoints) {
      return b.totalProjectedPoints - a.totalProjectedPoints;
    }
    if (b.seasonBanked !== a.seasonBanked) {
      return b.seasonBanked - a.seasonBanked;
    }
    return a.tiebreakerMnf - b.tiebreakerMnf;
  });

  const totalCount = evaluated.length;
  const eighthPlaceScore = totalCount >= 8 ? evaluated[7].totalProjectedPoints : 0;
  const secondPlaceScore = totalCount >= 2 ? evaluated[1].totalProjectedPoints : 0;

  return evaluated.map((item, index) => {
    const rank = index + 1;
    let tier: 'SAFE' | 'DANGER_ZONE' | 'DEAD_PLACE' = 'DANGER_ZONE';
    let isDeadPlace = false;
    let penaltyShots = '1.50';
    let dangerSeatStatus: ParticipantStandings['dangerSeatStatus'] = 'SAFE_MIDDLE';

    if (rank === 1) {
      tier = 'SAFE';
      penaltyShots = '0.00';
      dangerSeatStatus = 'SURVIVAL_LEADER';
    } else if (rank === totalCount && totalCount >= 10) {
      tier = 'DEAD_PLACE';
      isDeadPlace = true;
      penaltyShots = '2.50';
      dangerSeatStatus = 'DEAD_PLACE_10TH';
    } else if (rank === totalCount - 1 && totalCount >= 10) {
      tier = 'DANGER_ZONE';
      penaltyShots = '2.00';
      dangerSeatStatus = 'DANGER_SEAT_9TH';
    } else if (rank === 2) {
      tier = 'DANGER_ZONE';
      penaltyShots = '1.00';
      dangerSeatStatus = 'SURVIVAL_BORDER';
    } else {
      tier = 'DANGER_ZONE';
      const step = 1.0 / 7.0;
      const calculated = 1.0 + (rank - 2) * step;
      penaltyShots = calculated.toFixed(2);
      dangerSeatStatus = 'SAFE_MIDDLE';
    }

    const gapToSafety = Math.max(0, eighthPlaceScore - item.totalProjectedPoints);
    const leadOverDanger = Math.max(0, item.totalProjectedPoints - secondPlaceScore);

    return {
      userId: item.userId,
      userName: item.userName,
      bankedPoints: item.bankedPoints,
      projectedLivePoints: item.projectedLivePoints,
      totalProjectedPoints: item.totalProjectedPoints,
      rank,
      tier,
      isDeadPlace,
      penaltyShots,
      dangerSeatStatus,
      gapToSafety: parseFloat(gapToSafety.toFixed(1)),
      leadOverDanger: parseFloat(leadOverDanger.toFixed(1)),
      threatenedByRedZone: item.threatenedByRedZone
    };
  });
}
