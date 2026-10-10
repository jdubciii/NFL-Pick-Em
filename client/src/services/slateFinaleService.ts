export interface LiveGameTelemetry {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  spread: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINAL';
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

export function calculateRivalryLeverage(
  targetUserId: string,
  rivalUserId: string,
  participants: ParticipantScoreInput[],
  picks: UserPick[],
  games: LiveGameTelemetry[],
  standings: ParticipantStandings[]
): RivalryLeverageResult {
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
    summaryMicrocopy = `Identical active slate picks with ${rivalName}. Trajectory governed strictly by tiebreaker.`;
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

export function checkProximityWarning(standings: ParticipantStandings[]): boolean {
  if (standings.length < 10) return false;
  const danger9 = standings[8];
  const dead10 = standings[9];
  const diff = danger9.totalProjectedPoints - dead10.totalProjectedPoints;
  return diff < 3.0;
}

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
