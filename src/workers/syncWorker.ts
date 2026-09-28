import cron, { ScheduledTask } from 'node-cron';
import prisma from '../db/client';
import { fetchCurrentWeekNFLGames, NFLGameData } from '../services/nflApiClient';

/**
 * Upserts a single NFL game into PostgreSQL using Prisma.
 */
export async function upsertGame(game: NFLGameData) {
  return prisma.game.upsert({
    where: {
      externalGameId: game.externalGameId,
    },
    update: {
      status: game.status,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      kickoffTime: game.kickoffTime,
    },
    create: {
      externalGameId: game.externalGameId,
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      kickoffTime: game.kickoffTime,
      status: game.status,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
    },
  });
}

/**
 * Executes a sync cycle to fetch NFL game data and upsert into the database.
 * Wrapped in a robust try/catch block to handle API timeouts, network failures,
 * or invalid data gracefully without terminating the worker process.
 */
export async function runSync(): Promise<void> {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Starting NFL sync...`);

  try {
    const games = await fetchCurrentWeekNFLGames();

    if (!Array.isArray(games) || games.length === 0) {
      console.warn(`[${timestamp}] NFL API Sync Warning: No games returned or invalid data structure.`);
      return;
    }

    console.log(`[${timestamp}] Fetched ${games.length} games from ESPN. Upserting into database...`);

    let upsertedCount = 0;
    for (const game of games) {
      await upsertGame(game);
      upsertedCount++;
    }

    console.log(`[${timestamp}] Successfully upserted ${upsertedCount} games into database.`);
  } catch (error) {
    console.warn(
      `[${new Date().toISOString()}] NFL API Sync Failed, skipping cycle to preserve local state:`,
      error instanceof Error ? error.message : error
    );
  }
}

/**
 * Starts the cron worker scheduled to run every 5 minutes.
 */
export function startSyncWorker(): ScheduledTask {
  console.log('Starting NFL Sync Worker (running every 5 minutes)...');

  // Trigger an initial run immediately on startup
  runSync();

  // Schedule task to run every 5 minutes
  const task = cron.schedule('*/5 * * * *', async () => {
    await runSync();
  });

  return task;
}

// If executed directly (e.g. via tsx src/workers/syncWorker.ts or npm run worker:sync)
if (require.main === module) {
  startSyncWorker();
}
