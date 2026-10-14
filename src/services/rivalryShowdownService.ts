import { LiveGame } from './liveScoreService';
import { SlateGame, UserPickItem, UserStandingRef } from './sweatProjectionService';

export interface CompetitorPoints {
  banked: number;
  live: number;
  total: number;
}

export interface BattlegroundBranchOutcome {
  teamA: string;
  ifTeamAWinsGap: number;
  teamB: string;
  ifTeamBWinsGap: number;
  description: string;
}

export interface BattlegroundGame {
  gameId: string;
  matchup: string;
  game: SlateGame;
  liveScore?: LiveGame;
  userPick: string;
  rivalPick: string;
  currentStatus: string;
  quarterClock?: string;
  homeScore?: number;
  awayScore?: number;
  netSwing: number;
  branchOutcomes: BattlegroundBranchOutcome;
}

export interface SharedPickGame {
  gameId: string;
  matchup: string;
  selectedTeam: string;
  status: string;
}

export interface PendingRivalPickGame {
  gameId: string;
  matchup: string;
  userPick: string;
  status: string;
}

export interface RivalryShowdownResult {
  userId: string;
  userName: string;
  rivalId: string;
  rivalName: string;
  userPoints: CompetitorPoints;
  rivalPoints: CompetitorPoints;
  pointGap: number; // userTotal - rivalTotal
  statusText: string; // "Ahead by N", "Chasing by N", "Level on points", "Rival picks pending"
  battlegrounds: BattlegroundGame[];
  sharedPicks: SharedPickGame[];
  pendingRivalPicks: PendingRivalPickGame[];
  duelDecider: BattlegroundGame | null;
  userPickCount: number;
  rivalPickCount: number;
}

/**
 * Pure, non-mutating Rivalry Showdown evaluation service (Phase 38).
 * Analyzes head-to-head point gaps, opposite picks (battlegrounds),
 * shared picks, and branch arithmetic (Decision #54 & #66).
 */
export function calculateRivalryShowdown(
  user: UserStandingRef,
  rival: UserStandingRef,
  games: readonly SlateGame[],
  liveScores: readonly LiveGame[] = [],
  userPicks: readonly UserPickItem[],
  rivalPicks: readonly UserPickItem[]
): RivalryShowdownResult {
  // Map live scores for O(1) immutable lookup
  const scoreMap = new Map<string, LiveGame>();
  if (Array.isArray(liveScores)) {
    for (const score of liveScores) {
      if (score && score.id) {
        scoreMap.set(score.id, score);
      }
    }
  }

  // Filter server-visible, submitted picks (Decision #66)
  const validUserPicks = new Map<string, UserPickItem>();
  for (const p of userPicks) {
    if (p.userId === user.id && p.isSubmitted !== false && !p.isHidden) {
      validUserPicks.set(p.gameId, p);
    }
  }

  const validRivalPicks = new Map<string, UserPickItem>();
  for (const p of rivalPicks) {
    if (p.userId === rival.id && p.isSubmitted !== false && !p.isHidden) {
      validRivalPicks.set(p.gameId, p);
    }
  }

  const userPickCount = validUserPicks.size;
  const rivalPickCount = validRivalPicks.size;

  let userBanked = 0;
  let userLive = 0;
  let rivalBanked = 0;
  let rivalLive = 0;

  // Track per-game live point contributions for branch arithmetic
  const userGameLivePoints = new Map<string, number>();
  const rivalGameLivePoints = new Map<string, number>();

  const battlegrounds: BattlegroundGame[] = [];
  const sharedPicks: SharedPickGame[] = [];
  const pendingRivalPicks: PendingRivalPickGame[] = [];

  for (const game of games) {
    const live = scoreMap.get(game.id);
    const uPick = validUserPicks.get(game.id);
    const rPick = validRivalPicks.get(game.id);

    const homeScore = live ? parseInt(live.homeTeam?.score || '0', 10) : 0;
    const awayScore = live ? parseInt(live.awayTeam?.score || '0', 10) : 0;
    const isLive = live && live.status === 'IN_PROGRESS';
    const isFinal = live && live.status === 'FINAL';

    // Calculate user points
    if (uPick && live) {
      const isHome = uPick.selectedTeam.toUpperCase() === live.homeTeam.code.toUpperCase();
      const isAway = uPick.selectedTeam.toUpperCase() === live.awayTeam.code.toUpperCase();

      if (isFinal) {
        if ((homeScore > awayScore && isHome) || (awayScore > homeScore && isAway)) {
          userBanked += 1;
        }
      } else if (isLive) {
        if ((homeScore > awayScore && isHome) || (awayScore > homeScore && isAway)) {
          userLive += 1;
          userGameLivePoints.set(game.id, 1);
        }
      }
    }

    // Calculate rival points
    if (rPick && live) {
      const isHome = rPick.selectedTeam.toUpperCase() === live.homeTeam.code.toUpperCase();
      const isAway = rPick.selectedTeam.toUpperCase() === live.awayTeam.code.toUpperCase();

      if (isFinal) {
        if ((homeScore > awayScore && isHome) || (awayScore > homeScore && isAway)) {
          rivalBanked += 1;
        }
      } else if (isLive) {
        if ((homeScore > awayScore && isHome) || (awayScore > homeScore && isAway)) {
          rivalLive += 1;
          rivalGameLivePoints.set(game.id, 1);
        }
      }
    }

    // Classify Battlegrounds vs Shared Picks vs Pending Rival Picks
    const matchup = `${game.awayTeam} @ ${game.homeTeam}`;

    if (uPick && rPick) {
      const uTeam = uPick.selectedTeam.toUpperCase();
      const rTeam = rPick.selectedTeam.toUpperCase();

      if (uTeam === rTeam) {
        sharedPicks.push({
          gameId: game.id,
          matchup,
          selectedTeam: uPick.selectedTeam,
          status: live ? live.status : 'SCHEDULED',
        });
      } else if (!isFinal) {
        // Unfinished game with differing selections -> Battleground!
        const statusDesc = live ? live.status : 'SCHEDULED';
        const qc = live && isLive ? `Q${live.period} ${live.clock}` : undefined;

        battlegrounds.push({
          gameId: game.id,
          matchup,
          game,
          liveScore: live,
          userPick: uPick.selectedTeam,
          rivalPick: rPick.selectedTeam,
          currentStatus: statusDesc,
          quarterClock: qc,
          homeScore: live ? homeScore : undefined,
          awayScore: live ? awayScore : undefined,
          netSwing: 2,
          branchOutcomes: {
            teamA: uPick.selectedTeam,
            ifTeamAWinsGap: 0, // Computed below after total gap is finalized
            teamB: rPick.selectedTeam,
            ifTeamBWinsGap: 0,
            description: '',
          },
        });
      }
    } else if (uPick && !rPick && !isFinal) {
      // User picked Team A and rival has not picked that game yet
      pendingRivalPicks.push({
        gameId: game.id,
        matchup,
        userPick: uPick.selectedTeam,
        status: live ? live.status : 'SCHEDULED',
      });
    }
  }

  const userTotal = userBanked + userLive;
  const rivalTotal = rivalBanked + rivalLive;
  const pointGap = userTotal - rivalTotal;

  // Compute branch outcomes for each battleground
  for (const bg of battlegrounds) {
    const userCurr = userGameLivePoints.get(bg.gameId) || 0;
    const rivalCurr = rivalGameLivePoints.get(bg.gameId) || 0;

    // Base gap holding other games constant
    const baseGap = pointGap - (userCurr - rivalCurr);

    // If Team A (user's pick) wins: user gets 1, rival gets 0
    const ifTeamAWinsGap = baseGap + 1;
    // If Team B (rival's pick) wins: user gets 0, rival gets 1
    const ifTeamBWinsGap = baseGap - 1;

    const teamADesc = ifTeamAWinsGap > 0 ? `you lead by ${ifTeamAWinsGap}` : ifTeamAWinsGap < 0 ? `trail by ${Math.abs(ifTeamAWinsGap)}` : 'level on points';
    const teamBDesc = ifTeamBWinsGap > 0 ? `you lead by ${ifTeamBWinsGap}` : ifTeamBWinsGap < 0 ? `trail by ${Math.abs(ifTeamBWinsGap)}` : 'level on points';

    bg.branchOutcomes = {
      teamA: bg.userPick,
      ifTeamAWinsGap,
      teamB: bg.rivalPick,
      ifTeamBWinsGap,
      description: `If ${bg.userPick} wins: ${teamADesc} | If ${bg.rivalPick} wins: ${teamBDesc}`,
    };
  }

  // Determine Duel Decider: highest leverage battleground
  let duelDecider: BattlegroundGame | null = null;
  if (battlegrounds.length > 0) {
    // Sort by: in-progress first, then game with spread impact
    const sortedBg = [...battlegrounds].sort((a, b) => {
      const aLive = a.liveScore && a.liveScore.status === 'IN_PROGRESS' ? 1 : 0;
      const bLive = b.liveScore && b.liveScore.status === 'IN_PROGRESS' ? 1 : 0;
      if (bLive !== aLive) return bLive - aLive;
      const aSpread = a.game.spread ? Math.abs(a.game.spread) : 0;
      const bSpread = b.game.spread ? Math.abs(b.game.spread) : 0;
      return aSpread - bSpread; // tighter spread = more competitive
    });
    duelDecider = sortedBg[0];
  }

  let statusText = 'Level on points';
  if (rivalPickCount === 0 && pointGap === 0) {
    statusText = 'Rival picks pending';
  } else if (pointGap > 0) {
    statusText = `Ahead by ${pointGap}`;
  } else if (pointGap < 0) {
    statusText = `Chasing by ${Math.abs(pointGap)}`;
  }

  return {
    userId: user.id,
    userName: user.name,
    rivalId: rival.id,
    rivalName: rival.name,
    userPoints: {
      banked: userBanked,
      live: userLive,
      total: userTotal,
    },
    rivalPoints: {
      banked: rivalBanked,
      live: rivalLive,
      total: rivalTotal,
    },
    pointGap,
    statusText,
    battlegrounds,
    sharedPicks,
    pendingRivalPicks,
    duelDecider: rivalPickCount === 0 ? null : duelDecider,
    userPickCount,
    rivalPickCount,
  };
}

export * from './dependableInfoService';

