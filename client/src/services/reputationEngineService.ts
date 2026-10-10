export interface HistoricalWeekRecord {
  weekNumber: number;
  rank: number;
  totalParticipants: number;
  points: number;
  isDeadPlace: boolean; // Rank 10
  isDangerSeat: boolean; // Rank 9
  marginToDeadPlace: number;
  isAutopilot: boolean;
  isWeeklyWinner: boolean; // Rank 1
}

export interface LedgerAuditItem {
  id: string;
  date: string;
  type: 'ASSIGNED' | 'SERVED' | 'CONTEMPT';
  amount: number;
  description: string;
  runningBalance: number;
}

export interface AggregatedDebtMetrics {
  lifetimeAssigned: number;
  servedCleared: number;
  outstandingDebt: number;
  auditTrail: LedgerAuditItem[];
}

export type NarrativeBadgeId =
  | 'DEAD_PLACE_MONARCH'
  | 'ESCAPE_ARTIST'
  | 'THE_MACHINE'
  | 'GHOST';

export interface NarrativeBadge {
  id: NarrativeBadgeId;
  name: string;
  icon: string;
  theme: 'GOLD_RED' | 'CYAN_SMOKE' | 'SILVER_GLITCH' | 'MUTED_GHOST';
  description: string;
  criteriaDescription: string;
  isEarned: boolean;
  earnedDate?: string;
  earnedWeek?: number;
}

export interface HeadToHeadStats {
  targetUserId: string;
  targetUserName: string;
  rivalUserId: string;
  rivalUserName: string;
  targetWins: number;
  rivalWins: number;
  ties: number;
  targetDangerSeatVictories: number;
  summaryMicrocopy: string;
}

export interface UserRapSheetProfile {
  userId: string;
  userName: string;
  avatarInitials: string;
  seasonRank: number;
  activeStreak: string;
  primaryTitle: string;
  totalPicksLifetime: number;
  accuracyPct: number;
  metrics: AggregatedDebtMetrics;
  badges: NarrativeBadge[];
}

/**
 * Aggregates user penalty ledger history into three high-level financial metrics (Zero DDL).
 */
export function calculateUserDebtMetrics(
  rawLedgerEntries: Array<{
    id: string;
    createdAt: string;
    amount: string; // e.g. "+2.50", "-2.50", "+0.50"
    reason: string;
  }>
): AggregatedDebtMetrics {
  let lifetimeAssigned = 0;
  let servedCleared = 0;
  let runningBalance = 0;

  const auditTrail: LedgerAuditItem[] = [];

  for (const entry of rawLedgerEntries) {
    const val = parseFloat(entry.amount);
    runningBalance += val;

    let type: LedgerAuditItem['type'] = 'ASSIGNED';
    if (val < 0) {
      type = 'SERVED';
      servedCleared += Math.abs(val);
    } else if (entry.reason.toLowerCase().includes('contempt')) {
      type = 'CONTEMPT';
      lifetimeAssigned += val;
    } else {
      lifetimeAssigned += val;
    }

    auditTrail.push({
      id: entry.id,
      date: entry.createdAt.slice(0, 10),
      type,
      amount: val,
      description: entry.reason,
      runningBalance: parseFloat(runningBalance.toFixed(2))
    });
  }

  const outstandingDebt = Math.max(0, parseFloat((lifetimeAssigned - servedCleared).toFixed(2)));

  return {
    lifetimeAssigned: parseFloat(lifetimeAssigned.toFixed(2)),
    servedCleared: parseFloat(servedCleared.toFixed(2)),
    outstandingDebt,
    auditTrail
  };
}

/**
 * Derives narrative reputation badges at runtime (Decision #61 Zero DDL).
 */
export function deriveNarrativeBadges(history: HistoricalWeekRecord[]): NarrativeBadge[] {
  // 1. Dead Place Monarch: Finished 10th place 3+ times
  const deadPlaceCount = history.filter((h) => h.isDeadPlace || h.rank >= 10).length;
  const deadPlaceEarned = deadPlaceCount >= 3;
  const deadPlaceRecord = history.find((h) => h.isDeadPlace || h.rank >= 10);

  // 2. Escape Artist: Survived Danger Seat (9th) by < 1.0 point
  const escapeRecord = history.find((h) => h.isDangerSeat && h.marginToDeadPlace < 1.0 && h.marginToDeadPlace > 0);
  const escapeEarned = !!escapeRecord;

  // 3. The Machine: Used Autopilot for 3+ consecutive weeks
  let maxConsecutiveAutopilot = 0;
  let currentConsecutive = 0;
  for (const h of history) {
    if (h.isAutopilot) {
      currentConsecutive++;
      if (currentConsecutive > maxConsecutiveAutopilot) {
        maxConsecutiveAutopilot = currentConsecutive;
      }
    } else {
      currentConsecutive = 0;
    }
  }
  const machineEarned = maxConsecutiveAutopilot >= 3;

  // 4. Ghost: Finished >= 3 weeks, 0 Dead Places, 0 Weekly Wins
  const totalWeeks = history.length;
  const weeklyWins = history.filter((h) => h.isWeeklyWinner || h.rank === 1).length;
  const ghostEarned = totalWeeks >= 3 && deadPlaceCount === 0 && weeklyWins === 0;

  return [
    {
      id: 'DEAD_PLACE_MONARCH',
      name: 'Dead Place Monarch',
      icon: '💀',
      theme: 'GOLD_RED',
      description: 'Crowned in dishonor: Finished 10th place 3+ times.',
      criteriaDescription: `${deadPlaceCount}/3 Dead Place finishes recorded.`,
      isEarned: deadPlaceEarned,
      earnedWeek: deadPlaceRecord?.weekNumber
    },
    {
      id: 'ESCAPE_ARTIST',
      name: 'Escape Artist',
      icon: '💨',
      theme: 'CYAN_SMOKE',
      description: 'Survived the Drop: Cleared 9th place by less than 1.0 point.',
      criteriaDescription: escapeEarned
        ? `Escaped Dead Place by ${escapeRecord?.marginToDeadPlace.toFixed(1)} pts in Week ${escapeRecord?.weekNumber}.`
        : 'Must survive 9th place with margin < 1.0 point.',
      isEarned: escapeEarned,
      earnedWeek: escapeRecord?.weekNumber
    },
    {
      id: 'THE_MACHINE',
      name: 'The Machine',
      icon: '🤖',
      theme: 'SILVER_GLITCH',
      description: 'Algorithm Disciple: Utilized Autopilot for 3 consecutive slates.',
      criteriaDescription: `${maxConsecutiveAutopilot}/3 consecutive Autopilot slates locked.`,
      isEarned: machineEarned
    },
    {
      id: 'GHOST',
      name: 'Ghost',
      icon: '👻',
      theme: 'MUTED_GHOST',
      description: 'The Phantom: Zero 1st place wins, zero Dead Places. Floating in the middle.',
      criteriaDescription: ghostEarned
        ? `${totalWeeks} slates survived with zero spotlight.`
        : 'Must complete >=3 weeks with 0 wins and 0 dead places.',
      isEarned: ghostEarned
    }
  ];
}

/**
 * Computes lifetime Head-to-Head record between two users (cached compute).
 */
export function calculateHeadToHeadStats(
  targetUserId: string,
  targetUserName: string,
  rivalUserId: string,
  rivalUserName: string,
  targetHistory: HistoricalWeekRecord[],
  rivalHistory: HistoricalWeekRecord[]
): HeadToHeadStats {
  let targetWins = 0;
  let rivalWins = 0;
  let ties = 0;
  let dangerVictories = 0;

  for (const tWeek of targetHistory) {
    const rWeek = rivalHistory.find((r) => r.weekNumber === tWeek.weekNumber);
    if (!rWeek) continue;

    if (tWeek.points > rWeek.points) {
      targetWins++;
      if (rWeek.isDangerSeat || rWeek.isDeadPlace) {
        dangerVictories++;
      }
    } else if (rWeek.points > tWeek.points) {
      rivalWins++;
    } else {
      ties++;
    }
  }

  const summaryMicrocopy =
    targetWins >= rivalWins
      ? `${targetUserName} leads rivalry ${targetWins}-${rivalWins}${ties > 0 ? `-${ties}` : ''} (+${dangerVictories} Danger Seat Forces)`
      : `${rivalUserName} leads rivalry ${rivalWins}-${targetWins}${ties > 0 ? `-${ties}` : ''}`;

  return {
    targetUserId,
    targetUserName,
    rivalUserId,
    rivalUserName,
    targetWins,
    rivalWins,
    ties,
    targetDangerSeatVictories: dangerVictories,
    summaryMicrocopy
  };
}
