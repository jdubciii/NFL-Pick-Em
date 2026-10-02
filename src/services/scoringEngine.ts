import prisma from '../db/client';
import type { PoolSettings, PenaltySettings } from '../types/pool';

export type { PoolSettings, PenaltySettings };

export interface GradedPickResult {
  pickId: string;
  isCorrect: boolean;
  pointsAwarded: number;
  finalizedAt: Date;
}

/**
 * Determines the winning team for a game based on home and away scores.
 * Returns winning team id or null in the event of a tie or incomplete score.
 */
export function determineWinningTeam(
  homeTeamId: string,
  awayTeamId: string,
  homeScore: number | null,
  awayScore: number | null
): string | null {
  if (homeScore === null || awayScore === null) {
    return null;
  }

  if (homeScore > awayScore) {
    return homeTeamId;
  }
  if (awayScore > homeScore) {
    return awayTeamId;
  }

  // Tie - no winner
  return null;
}

/**
 * Extracts points awarded for a winning pick from pool settings.
 * Defaults to 1 point if not defined in settings JSON.
 */
export function getPointsForWin(settingsJson: any): number {
  const settings = (settingsJson as PoolSettings) || {};
  const configuredPoints =
    settings.points_per_win ??
    settings.win_value ??
    settings.winValue ??
    settings.pointsPerWin;

  if (typeof configuredPoints === 'number' && !Number.isNaN(configuredPoints)) {
    return configuredPoints;
  }

  return 1;
}

import { isGameInExcludedWindow } from './lockResolver';
export { isGameInExcludedWindow };


/**
 * Grades all picks for a list of finalized games against their respective pool settings.
 * Commits graded results immutably to the PickResult table.
 * Strictly skips any pick that has already been finalized to prevent double-scoring.
 * Respects excludedGameWindows setting by allocating 0 points if game matches an excluded window.
 */
export async function gradeFinalizedGames(gameIds: string[]): Promise<GradedPickResult[]> {
  if (!gameIds || gameIds.length === 0) {
    return [];
  }

  const committedResults: GradedPickResult[] = [];

  for (const gameId of gameIds) {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      console.warn(`[ScoringEngine] Game with ID ${gameId} not found, skipping grading.`);
      continue;
    }

    const winningTeam = determineWinningTeam(
      game.homeTeamId,
      game.awayTeamId,
      game.homeScore,
      game.awayScore
    );

    console.log(
      `[ScoringEngine] Grading Game ${game.id} (${game.homeTeamId} vs ${game.awayTeamId}) | Final Score: ${game.homeScore}-${game.awayScore} | Winner: ${winningTeam || 'TIE'}`
    );

    const picks = await prisma.pick.findMany({
      where: { gameId: game.id },
      include: { pool: true },
    });

    for (const pick of picks) {
      // 1. Strict Immutability Check: Skip any pick that has already been finalized/graded
      const existingResult = await prisma.pickResult.findUnique({
        where: { pickId: pick.id },
      });

      if (existingResult) {
        console.log(`[ScoringEngine] Pick ${pick.id} already finalized. Skipping to enforce immutability.`);
        continue;
      }

      // 2. Check excludedGameWindows in pool settings
      const poolSettings = (pick.pool?.settings as PoolSettings) || {};
      const excludedWindows = poolSettings.excludedGameWindows ?? poolSettings.excluded_game_windows;
      const isExcluded = isGameInExcludedWindow(game.kickoffTime, excludedWindows);

      // 3. Grade the pick against the winning team
      const isPickSelected = pick.selectedTeamId !== null && pick.selectedTeamId.trim().length > 0;
      const isWinnerMatch = winningTeam !== null && pick.selectedTeamId === winningTeam;

      const isCorrect = isPickSelected && isWinnerMatch;
      let pointsAwarded = 0;

      if (isCorrect && !isExcluded) {
        pointsAwarded = getPointsForWin(pick.pool?.settings);
      }

      // 4. Commit the graded result to the PickResult table
      const finalizedAt = new Date();
      const pickResult = await prisma.pickResult.create({
        data: {
          pickId: pick.id,
          isCorrect,
          pointsAwarded,
          finalizedAt,
        },
      });

      committedResults.push({
        pickId: pickResult.pickId,
        isCorrect: pickResult.isCorrect,
        pointsAwarded: Number(pickResult.pointsAwarded),
        finalizedAt: pickResult.finalizedAt,
      });
    }
  }

  console.log(`[ScoringEngine] Successfully committed ${committedResults.length} new pick results.`);
  return committedResults;
}
