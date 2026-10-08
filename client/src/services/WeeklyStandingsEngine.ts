export type PenaltyTier = 'SAFE' | 'STANDARD' | 'DANGER' | 'DEAD_PLACE';

export interface MemberWeeklyStat {
  memberId: string;
  name: string;
  correct: number;
  incorrect: number;
  pending: number;        // Outstanding / live games remaining
  totalGames: number;     // Total slate games (e.g. 15)
  winPercentage: number;
  rank: number;
  penaltyShots: number;
  projectedLabel: string;
  finalizedLabel: string;
  tier: PenaltyTier;
  tiebreakerDiff?: number;
}

export function calculateWeeklyStandings(
  stats: {
    memberId: string;
    name: string;
    correct: number;
    incorrect: number;
    pending: number;
    totalGames?: number;
    tiebreakerDiff?: number;
  }[],
  isFinalized: boolean = false
): MemberWeeklyStat[] {
  // Sort primarily by correct picks (descending), then by tiebreaker delta (ascending)
  const sorted = [...stats].sort((a, b) => {
    if (b.correct !== a.correct) return b.correct - a.correct;
    return (a.tiebreakerDiff ?? 999) - (b.tiebreakerDiff ?? 999);
  });

  return sorted.map((item, idx) => {
    const rank = idx + 1;
    const totalDecided = item.correct + item.incorrect;
    const totalGames = item.totalGames ?? (item.correct + item.incorrect + item.pending);
    const winPercentage = totalDecided > 0 ? (item.correct / totalDecided) * 100 : 0;

    let penaltyShots = 1.0;
    let tier: PenaltyTier = 'STANDARD';
    let projectedLabel = '🍺 Proj: 1.0';
    let finalizedLabel = '🍺 Owed: 1.0';

    if (rank === 1) {
      penaltyShots = 0;
      tier = 'SAFE';
      projectedLabel = '🛡️ Safe (0)';
      finalizedLabel = '🏆 Safe (0)';
    } else if (rank >= 2 && rank <= 6) {
      penaltyShots = 1.0;
      tier = 'STANDARD';
      projectedLabel = '🍺 Proj: 1.0';
      finalizedLabel = '🍺 Owed: 1.0';
    } else if (rank >= 7 && rank <= 9) {
      penaltyShots = 2.0;
      tier = 'DANGER';
      projectedLabel = '⚠️ Danger: 2.0';
      finalizedLabel = '⚠️ Owed: 2.0';
    } else if (rank === 10 || rank === sorted.length) {
      penaltyShots = 2.5;
      tier = 'DEAD_PLACE';
      projectedLabel = '💀 Dead Place: 2.5';
      finalizedLabel = '💀 Owed: 2.5';
    }

    return {
      memberId: item.memberId,
      name: item.name,
      correct: item.correct,
      incorrect: item.incorrect,
      pending: item.pending,
      totalGames,
      winPercentage: Number(winPercentage.toFixed(1)),
      rank,
      penaltyShots,
      projectedLabel,
      finalizedLabel,
      tier,
      tiebreakerDiff: item.tiebreakerDiff
    };
  });
}
