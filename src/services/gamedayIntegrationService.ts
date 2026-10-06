import { Prisma } from '@prisma/client';
import { Phase20CoreService } from './phase20CoreService';

export interface MatrixMemberPick {
  userId: string;
  displayName: string;
  gameId: string;
  selectedTeam: string;
  isCorrect?: boolean;
}

export interface LiveGameStatus {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  quarter: string;
  isFinal: boolean;
  kickoff: Date;
}

export interface LoneWolfConsensusIndicator {
  gameId: string;
  majorityTeam: string;
  majorityCount: number;
  loneWolfUserId: string;
  loneWolfTeam: string;
  isLoneWolfActive: boolean;
}

export interface ProjectedStandingsEntry {
  userId: string;
  displayName: string;
  currentPoints: Prisma.Decimal;
  projectedPoints: Prisma.Decimal;
  projectedRank: number;
  isProjectedDeadPlace: boolean;
  projectedPenaltyShots: Prisma.Decimal;
}

export interface PressBoxEvent {
  eventId: string;
  gameId?: string;
  type: 'LONE_WOLF_SWEAT' | 'LEAD_CHANGE' | 'DEAD_PLACE_ALERT';
  headline: string;
  detail: string;
  timestamp: Date;
}

export interface GamedayBoardView {
  poolId: string;
  totalMembers: number;
  loneWolfAlerts: LoneWolfConsensusIndicator[];
  projectedStandings: ProjectedStandingsEntry[];
  pressBoxEvents: PressBoxEvent[];
}

export class GamedayIntegrationService {
  /**
   * Evaluates the 9-1 Lone Wolf consensus indicator across a 10-person pool.
   * If exactly 9 members picked Team A and 1 picked Team B, marks Lone Wolf active.
   */
  public static calculateConsensus(
    gameId: string,
    picks: MatrixMemberPick[]
  ): LoneWolfConsensusIndicator | null {
    if (picks.length < 2) return null;

    const teamCounts = new Map<string, string[]>();
    for (const p of picks) {
      if (!p.selectedTeam) continue;
      const list = teamCounts.get(p.selectedTeam) || [];
      list.push(p.userId);
      teamCounts.set(p.selectedTeam, list);
    }

    if (teamCounts.size !== 2) return null;

    const entries = Array.from(teamCounts.entries());
    const [teamA, usersA] = entries[0];
    const [teamB, usersB] = entries[1];

    if (usersA.length === 9 && usersB.length === 1) {
      return {
        gameId,
        majorityTeam: teamA,
        majorityCount: 9,
        loneWolfUserId: usersB[0],
        loneWolfTeam: teamB,
        isLoneWolfActive: true,
      };
    } else if (usersB.length === 9 && usersA.length === 1) {
      return {
        gameId,
        majorityTeam: teamB,
        majorityCount: 9,
        loneWolfUserId: usersA[0],
        loneWolfTeam: teamA,
        isLoneWolfActive: true,
      };
    }

    return null;
  }

  /**
   * Generates live projected standings and Dead Place alerts.
   * Pure read projection: Enforces Decision #54 (no mutations) and Decision #69 math.
   */
  public static calculateGamedayBoard(
    poolId: string,
    members: { userId: string; displayName: string }[],
    picks: MatrixMemberPick[],
    games: LiveGameStatus[],
    isFlagDeadPlaceOn: boolean = true
  ): GamedayBoardView {
    const memberPoints = new Map<string, { current: number; projected: number; picksCount: number }>();

    for (const m of members) {
      memberPoints.set(m.userId, { current: 0, projected: 0, picksCount: 0 });
    }

    // Tally points based on live games
    for (const p of picks) {
      const stats = memberPoints.get(p.userId);
      if (!stats) continue;
      stats.picksCount += 1;

      const game = games.find((g) => g.gameId === p.gameId);
      if (!game) continue;

      const isHomeWinning = game.homeScore > game.awayScore;
      const isAwayWinning = game.awayScore > game.homeScore;

      const pickIsHome = p.selectedTeam === game.homeTeam;
      const pickIsAway = p.selectedTeam === game.awayTeam;

      if (game.isFinal) {
        if ((pickIsHome && isHomeWinning) || (pickIsAway && isAwayWinning)) {
          stats.current += 1;
          stats.projected += 1;
        }
      } else {
        if ((pickIsHome && isHomeWinning) || (pickIsAway && isAwayWinning)) {
          stats.projected += 1;
        }
      }
    }

    // Sort projected standings descending
    const projectedEntries: { userId: string; displayName: string; points: Prisma.Decimal; picksCount: number }[] = [];
    for (const m of members) {
      const stats = memberPoints.get(m.userId)!;
      projectedEntries.push({
        userId: m.userId,
        displayName: m.displayName,
        points: new Prisma.Decimal(stats.projected.toString()),
        picksCount: stats.picksCount,
      });
    }

    projectedEntries.sort((a, b) => b.points.comparedTo(a.points));

    const totalMembers = projectedEntries.length;
    const lowestScore = projectedEntries.length > 0 ? projectedEntries[projectedEntries.length - 1].points : new Prisma.Decimal('0.00');

    const standings: ProjectedStandingsEntry[] = projectedEntries.map((entry, index) => {
      const rank = index + 1;
      const isNoShow = entry.picksCount === 0;
      const isDeadPlace = rank === totalMembers || entry.points.equals(lowestScore) || (isFlagDeadPlaceOn && isNoShow);

      let penaltyShots = new Prisma.Decimal('1.00');
      if (isDeadPlace) {
        penaltyShots = Phase20CoreService.DEAD_PLACE_ABSOLUTE_PENALTY;
      } else if (rank === 1) {
        penaltyShots = Phase20CoreService.ZERO_DECIMAL;
      }

      return {
        userId: entry.userId,
        displayName: entry.displayName,
        currentPoints: new Prisma.Decimal((memberPoints.get(entry.userId)?.current ?? 0).toString()),
        projectedPoints: entry.points,
        projectedRank: rank,
        isProjectedDeadPlace: isDeadPlace,
        projectedPenaltyShots: penaltyShots,
      };
    });

    // Detect lone wolf sweat indicators
    const loneWolfAlerts: LoneWolfConsensusIndicator[] = [];
    const pressBoxEvents: PressBoxEvent[] = [];

    for (const g of games) {
      const gamePicks = picks.filter((p) => p.gameId === g.gameId);
      const consensus = this.calculateConsensus(g.gameId, gamePicks);
      if (consensus && consensus.isLoneWolfActive) {
        loneWolfAlerts.push(consensus);

        const member = members.find((m) => m.userId === consensus.loneWolfUserId);
        pressBoxEvents.push({
          eventId: `evt_lone_${g.gameId}`,
          gameId: g.gameId,
          type: 'LONE_WOLF_SWEAT',
          headline: `Lone Wolf Sweat: ${member?.displayName ?? 'Member'} vs League`,
          detail: `9 members on ${consensus.majorityTeam}; ${member?.displayName ?? 'Member'} alone on ${consensus.loneWolfTeam}.`,
          timestamp: new Date(),
        });
      }
    }

    return {
      poolId,
      totalMembers: members.length,
      loneWolfAlerts,
      projectedStandings: standings,
      pressBoxEvents,
    };
  }
}
