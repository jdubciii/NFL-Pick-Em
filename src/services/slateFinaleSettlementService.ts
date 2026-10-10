import { LiveGameTelemetry, UserPick, ParticipantScoreInput, evaluatePickATS, evaluateLiveStandings, ParticipantStandings } from './radarLiveConsequencesService';

export interface DeltaPick {
  gameId: string;
  gameMatchup: string;
  userSelection: string;
  rivalSelection: string;
  userSpread: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINAL';
  marginRequirement: string;
}

export interface RivalryLeverageResult {
  targetUserId: string;
  targetUserName: string;
  rivalUserId: string;
  rivalUserName: string;
  pointDiff: number;
  deltaPicks: DeltaPick[];
  summaryMicrocopy: string;
}

export interface SlateSettlementRecord {
  poolId: string;
  weekNumber: number;
  finalizedAt: string;
  isFinalized: boolean;
  monarchUserId: string;
  monarchUserName: string;
  settledStandings: Array<{
    userId: string;
    userName: string;
    finalRank: number;
    finalPoints: number;
    penaltyShots: string;
    isDeadPlace: boolean;
  }>;
}

/**
 * Calculates differing picks between two users and generates action-oriented leverage microcopy.
 */
export function calculateRivalryLeverage(
  targetUserId: string,
  rivalUserId: string,
  participants: ParticipantScoreInput[],
  picks: UserPick[],
  games: LiveGameTelemetry[]
): RivalryLeverageResult {
  const standings = evaluateLiveStandings(participants, picks, games);
  const target = standings.find((s) => s.userId === targetUserId);
  const rival = standings.find((s) => s.userId === rivalUserId);

  const targetName = target ? target.userName : 'You';
  const rivalName = rival ? rival.userName : 'Rival';
  const pointDiff = target && rival ? target.totalProjectedPoints - rival.totalProjectedPoints : 0;

  const targetPicks = picks.filter((p) => p.userId === targetUserId);
  const rivalPicks = picks.filter((p) => p.userId === rivalUserId);

  const deltaPicks: DeltaPick[] = [];

  for (const tPick of targetPicks) {
    const rPick = rivalPicks.find((rp) => rp.gameId === tPick.gameId);
    if (!rPick) continue;

    if (tPick.selectedTeam !== rPick.selectedTeam) {
      const game = games.find((g) => g.gameId === tPick.gameId);
      if (!game) continue;

      const userSpread = tPick.selectedTeam === game.homeTeam ? game.spread : -game.spread;
      const marginRequirement = `${tPick.selectedTeam} (${userSpread > 0 ? '+' : ''}${userSpread}) to cover against ${rPick.selectedTeam}`;

      deltaPicks.push({
        gameId: game.gameId,
        gameMatchup: `${game.awayTeam} @ ${game.homeTeam}`,
        userSelection: tPick.selectedTeam,
        rivalSelection: rPick.selectedTeam,
        userSpread,
        status: game.status,
        marginRequirement
      });
    }
  }

  let summaryMicrocopy = '';
  if (deltaPicks.length === 0) {
    summaryMicrocopy = `Identical active slate picks with ${rivalName}. Trajectory governed strictly by banked tiebreaker.`;
  } else {
    const leadVerb = pointDiff >= 0 ? 'To hold off' : 'To pass';
    const topReqs = deltaPicks.slice(0, 2).map((d) => `${d.userSelection} (${d.userSpread > 0 ? '+' : ''}${d.userSpread})`).join(' and ');
    summaryMicrocopy = `${leadVerb} ${rivalName}, you need: ${topReqs}.`;
  }

  return {
    targetUserId,
    targetUserName: targetName,
    rivalUserId,
    rivalUserName: rivalName,
    pointDiff: parseFloat(pointDiff.toFixed(1)),
    deltaPicks,
    summaryMicrocopy
  };
}

/**
 * Checks whether the 9th place card is within volatile 1-possession strike distance (< 3.0 pts) of Dead Place.
 */
export function checkProximityWarning(standings: ParticipantStandings[]): boolean {
  if (standings.length < 10) return false;
  const danger9 = standings[8];
  const dead10 = standings[9];
  const diff = danger9.totalProjectedPoints - dead10.totalProjectedPoints;
  return diff < 3.0;
}

/**
 * Computes trend trajectory (-1, 0, 1) and color classification from rolling projected point snapshots.
 */
export function calculateMomentumTrend(history: number[]): { trend: 'UP' | 'DOWN' | 'FLAT'; delta: number } {
  if (!history || history.length < 2) {
    return { trend: 'FLAT', delta: 0 };
  }
  const first = history[0];
  const last = history[history.length - 1];
  const delta = parseFloat((last - first).toFixed(1));

  if (delta > 0) return { trend: 'UP', delta };
  if (delta < 0) return { trend: 'DOWN', delta };
  return { trend: 'FLAT', delta: 0 };
}

/**
 * Idempotent Slate Settlement Engine enforcing Decision #55 and Decision #69.
 */
export function finalizeSlateStandings(
  poolId: string,
  weekNumber: number,
  participants: ParticipantScoreInput[],
  picks: UserPick[],
  games: LiveGameTelemetry[]
): SlateSettlementRecord {
  const allFinal = games.length > 0 && games.every((g) => g.status === 'FINAL');
  if (!allFinal) {
    throw new Error('PREMATURE_SETTLEMENT: All slate games must be FINAL before execution.');
  }

  const finalStandings = evaluateLiveStandings(participants, picks, games);
  const monarch = finalStandings.find((s) => s.isDeadPlace) || finalStandings[finalStandings.length - 1];

  return {
    poolId,
    weekNumber,
    finalizedAt: new Date().toISOString(),
    isFinalized: true,
    monarchUserId: monarch.userId,
    monarchUserName: monarch.userName,
    settledStandings: finalStandings.map((s) => ({
      userId: s.userId,
      userName: s.userName,
      finalRank: s.rank,
      finalPoints: s.totalProjectedPoints,
      penaltyShots: s.penaltyShots,
      isDeadPlace: s.isDeadPlace
    }))
  };
}
