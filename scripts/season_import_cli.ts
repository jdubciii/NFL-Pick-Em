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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SeasonImportOptions {
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
    poolId: '',
    operatorId: '',
  };

  const allowedFlags = new Set([
    '--dry-run',
    '--execute',
    '--start',
    '--end',
    '--season',
    '--season-type',
    '--pool',
    '--operator',
  ]);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!allowedFlags.has(arg)) {
      throw new Error(`UNKNOWN_ARGUMENT: Unrecognized CLI argument "${arg}".`);
    }

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
    } else if (arg === '--season-type' && args[i + 1]) {
      options.seasonType = parseInt(args[++i], 10);
    } else if (arg === '--pool' && args[i + 1]) {
      options.poolId = args[++i];
    } else if (arg === '--operator' && args[i + 1]) {
      options.operatorId = args[++i];
    }
  }

  // Strict numeric range and year validation
  if (
    isNaN(options.startWeek) ||
    isNaN(options.endWeek) ||
    options.startWeek < 1 ||
    options.endWeek > 18 ||
    options.endWeek < options.startWeek
  ) {
    throw new Error(
      `INVALID_WEEK_RANGE: startWeek (${options.startWeek}) and endWeek (${options.endWeek}) must be integers between 1 and 18 with endWeek >= startWeek.`
    );
  }

  if (options.seasonYear !== 2026) {
    throw new Error(`INVALID_SEASON: Season year must be 2026, got ${options.seasonYear}.`);
  }

  if (options.seasonType !== 2) {
    throw new Error(`INVALID_SEASON_TYPE: Season type must be 2 (Regular Season), got ${options.seasonType}.`);
  }

  // In execute mode, validate explicit UUID poolId and operatorId (no placeholders)
  if (options.execute) {
    if (!options.poolId || !UUID_REGEX.test(options.poolId)) {
      throw new Error(`INVALID_ARGUMENT: In --execute mode, a valid pool UUID must be provided via --pool.`);
    }
    if (!options.operatorId || !UUID_REGEX.test(options.operatorId) || options.operatorId === 'a1111111-1111-1111-1111-111111111111') {
      throw new Error(`INVALID_ARGUMENT: In --execute mode, an authentic commissioner UUID must be provided via --operator.`);
    }
  }

  return options;
}

export function resolveLionsTiebreaker(events: CanonicalGameRecord[]): {
  gameId: string | null;
  matchup: string;
  designation: 'DEFAULT_LIONS' | 'COMMISSIONER_SELECTION_REQUIRED';
} {
  const lionsGames = events.filter((e) => e.homeTeamId === 'DET' || e.awayTeamId === 'DET');
  if (lionsGames.length > 1) {
    throw new Error('AMBIGUOUS_LIONS_SCHEDULE: Multiple Detroit Lions games found in weekly slate.');
  }

  if (lionsGames.length === 1) {
    const lionsGame = lionsGames[0];
    return {
      gameId: lionsGame.externalGameId,
      matchup: `${lionsGame.awayTeamId} @ ${lionsGame.homeTeamId}`,
      designation: 'DEFAULT_LIONS',
    };
  }

  // Lions on bye: named bye selection outcome, no invented matchup
  return {
    gameId: null,
    matchup: 'COMMISSIONER_SELECTION_REQUIRED',
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

  if (opts.startWeek > opts.endWeek || isNaN(opts.startWeek) || isNaN(opts.endWeek)) {
    return {
      success: false,
      mode: opts.execute ? 'EXECUTE' : 'DRY_RUN',
      weeksProcessed: [],
      totalGames: 0,
      tiebreakerConfig: {},
      errors: ['INVALID_WEEK_RANGE: startWeek cannot exceed endWeek.'],
    };
  }

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

    let tb: ReturnType<typeof resolveLionsTiebreaker>;
    try {
      tb = resolveLionsTiebreaker(observation.events);
    } catch (tbErr: any) {
      const err = `Week ${week} Tiebreaker FAILED: ${tbErr.message}`;
      console.log(`[FAILED]`);
      console.error(`  ${err}`);
      errors.push(err);
      continue;
    }

    tiebreakerConfig[String(week)] = {
      eventId: tb.gameId,
      gameId: tb.gameId,
      matchup: tb.matchup,
      gameTitle: tb.matchup,
      designatedBy: 'SYSTEM_DEFAULT',
      designatedAt: new Date().toISOString(),
      provenance: tb.designation,
      designation: tb.designation,
      isFrozen: false,
      verifiedFingerprint: observation.manifestFingerprint,
    };

    console.log(`[VERIFIED] - ${observation.events.length} games. Lions: ${tb.matchup} (${tb.designation})`);
    totalGames += observation.events.length;

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
        } else {
          weeksProcessed.push(week);
        }
      } catch (dbErr: any) {
        errors.push(`Week ${week} DB persistence exception: ${dbErr.message}`);
      }
    } else {
      weeksProcessed.push(week);
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
