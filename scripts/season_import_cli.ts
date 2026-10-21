/**
 * Season Schedule & Tiebreaker Ingestion CLI
 * Authority: P42-V78-SEASON-RELEASE-2026-10-21-01
 *
 * Supports:
 *   --dry-run                 Simulates ESPN ingestion and validation without DB writes
 *   --execute                 Performs atomic writes to public.games, weekly manifests, and pool settings
 *   --start <week>            Starting week (default: 7)
 *   --end <week>              Ending week (default: 18)
 *   --season <year>           Season year (default: 2026)
 *   --pool <pool_uuid>        Pool UUID (default: 9b893bef-3b5a-4ffa-951d-8ba27f9c9782)
 *   --operator <user_uuid>    Commissioner/Operator user UUID
 */

import prisma from '../src/db/client';
import {
  fetchAuthoritativeESPNScoreboard,
  refreshWeeklySlateInDb,
  CanonicalGameRecord,
} from '../src/services/authoritativeSlateService';

interface SeasonImportOptions {
  dryRun: boolean;
  execute: boolean;
  startWeek: number;
  endWeek: number;
  seasonYear: number;
  seasonType: number;
  poolId: string;
  operatorId: string;
}

export function parseArgs(args: string[]): SeasonImportOptions {
  const options: SeasonImportOptions = {
    dryRun: true,
    execute: false,
    startWeek: 7,
    endWeek: 18,
    seasonYear: 2026,
    seasonType: 2,
    poolId: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
    operatorId: 'a1111111-1111-1111-1111-111111111111',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
      options.execute = false;
    } else if (arg === '--execute') {
      options.execute = true;
      options.dryRun = false;
    } else if (arg === '--start' && args[i + 1]) {
      options.startWeek = parseInt(args[++i], 10);
    } else if (arg === '--end' && args[i + 1]) {
      options.endWeek = parseInt(args[++i], 10);
    } else if (arg === '--season' && args[i + 1]) {
      options.seasonYear = parseInt(args[++i], 10);
    } else if (arg === '--pool' && args[i + 1]) {
      options.poolId = args[++i];
    } else if (arg === '--operator' && args[i + 1]) {
      options.operatorId = args[++i];
    }
  }

  return options;
}

export function resolveLionsTiebreaker(events: CanonicalGameRecord[]): {
  gameId: string | null;
  matchup: string;
  designation: 'DEFAULT_LIONS' | 'COMMISSIONER_SELECTION_REQUIRED';
} {
  const lionsGame = events.find((e) => e.homeTeamId === 'DET' || e.awayTeamId === 'DET');
  if (lionsGame) {
    return {
      gameId: lionsGame.externalGameId,
      matchup: `${lionsGame.awayTeamId} @ ${lionsGame.homeTeamId}`,
      designation: 'DEFAULT_LIONS',
    };
  }
  return {
    gameId: null,
    matchup: 'BYE_WEEK',
    designation: 'COMMISSIONER_SELECTION_REQUIRED',
  };
}

export async function runSeasonImport(
  opts: SeasonImportOptions,
  customFetch: typeof fetch = fetch
): Promise<{
  success: boolean;
  mode: 'DRY_RUN' | 'EXECUTE';
  weeksProcessed: number[];
  totalGames: number;
  tiebreakerConfig: Record<string, any>;
  errors: string[];
}> {
  console.log(`========================================================================`);
  console.log(`NFL PICK 'EM - FULL SEASON INGESTION & TIEBREAKER SETUP`);
  console.log(`Mode:       ${opts.execute ? 'LIVE EXECUTE' : 'DRY RUN (Simulated)'}`);
  console.log(`Weeks:      ${opts.startWeek} through ${opts.endWeek} (${opts.seasonYear})`);
  console.log(`Pool ID:    ${opts.poolId}`);
  console.log(`========================================================================\n`);

  const weeksProcessed: number[] = [];
  const tiebreakerConfig: Record<string, any> = {};
  const errors: string[] = [];
  let totalGames = 0;

  for (let week = opts.startWeek; week <= opts.endWeek; week++) {
    process.stdout.write(`Fetching & validating Week ${week}... `);
    const observation = await fetchAuthoritativeESPNScoreboard(
      {
        seasonYear: opts.seasonYear,
        seasonType: opts.seasonType,
        weekNumber: week,
      },
      customFetch
    );

    if (observation.status !== 'VERIFIED') {
      const err = `Week ${week} FAILED: ${observation.reasons.join(', ')}`;
      console.log(`[FAILED]`);
      console.error(`  ${err}`);
      errors.push(err);
      continue;
    }

    const tb = resolveLionsTiebreaker(observation.events);
    tiebreakerConfig[String(week)] = {
      week,
      gameId: tb.gameId,
      matchup: tb.matchup,
      designation: tb.designation,
      verifiedFingerprint: observation.manifestFingerprint,
    };

    console.log(`[VERIFIED] - ${observation.events.length} games. Lions: ${tb.matchup} (${tb.designation})`);
    totalGames += observation.events.length;
    weeksProcessed.push(week);

    if (opts.execute) {
      try {
        const result = await refreshWeeklySlateInDb(prisma, {
          poolId: opts.poolId,
          seasonYear: opts.seasonYear,
          seasonType: opts.seasonType,
          weekNumber: week,
          operatorId: opts.operatorId,
          preloadedObservation: observation,
        });
        if (!result.success) {
          errors.push(`Week ${week} DB persistence rejected: ${result.reason}`);
        }
      } catch (dbErr: any) {
        errors.push(`Week ${week} DB persistence exception: ${dbErr.message}`);
      }
    }
  }

  // In execute mode, also persist season tiebreaker config into pool.settings
  if (opts.execute && errors.length === 0) {
    try {
      const pool = await prisma.pool.findUnique({ where: { id: opts.poolId } });
      if (pool) {
        const currentSettings = (pool.settings as any) || {};
        const updatedSettings = {
          ...currentSettings,
          season_tiebreaker_config: {
            ...(currentSettings.season_tiebreaker_config || {}),
            ...tiebreakerConfig,
          },
        };
        await prisma.pool.update({
          where: { id: opts.poolId },
          data: { settings: updatedSettings },
        });
        console.log(`\nPersisted season tiebreaker config to pool ${opts.poolId}.`);
      }
    } catch (poolErr: any) {
      errors.push(`Failed to update pool tiebreaker settings: ${poolErr.message}`);
    }
  }

  console.log(`\n------------------------------------------------------------------------`);
  console.log(`Summary:`);
  console.log(`  Processed Weeks: ${weeksProcessed.join(', ')}`);
  console.log(`  Total Games:     ${totalGames}`);
  console.log(`  Errors:          ${errors.length === 0 ? 'None' : errors.join('; ')}`);
  console.log(`------------------------------------------------------------------------\n`);

  return {
    success: errors.length === 0,
    mode: opts.execute ? 'EXECUTE' : 'DRY_RUN',
    weeksProcessed,
    totalGames,
    tiebreakerConfig,
    errors,
  };
}

if (process.argv[1]?.endsWith('season_import_cli.ts') || process.argv[1]?.endsWith('season_import_cli.js')) {
  const options = parseArgs(process.argv.slice(2));
  runSeasonImport(options)
    .then((result) => {
      if (!result.success) process.exit(1);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal CLI execution error:', err);
      process.exit(1);
    });
}
