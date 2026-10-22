/**
 * Production Season Import Runner
 * Authority: HAG-26 PO Directive (2026-10-22T07-26-20-380Z-517f73)
 *
 * Executes:
 * 1. Pre-import protected baseline capture
 * 2. Week 7 dry-run
 * 3. Week 7 live additive import
 * 4. Canonical commissioner tiebreaker override for Week 7 (PIT @ NO 401873011, Steelers@Saints)
 * 5. Week 7 readback verification & pickability check
 * 6. Weeks 8..18 live additive import
 * 7. Post-import database verification & baseline preservation check
 */

import dotenv from 'dotenv';
import path from 'path';

// Force override with .env.hosted so Prisma connects to hosted Supabase
dotenv.config({ path: path.resolve(__dirname, '../.env.hosted'), override: true });

(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

import prisma from '../src/db/client';
import {
  fetchAuthoritativeESPNScoreboard,
  refreshWeeklySlateInDb,
  CanonicalGameRecord,
} from '../src/services/authoritativeSlateService';
import {
  resolveLionsTiebreaker,
  runSeasonImport,
} from './season_import_cli';
import { applyCommissionerOverride } from '../src/services/weeklyDesignationService';

const POOL_ID = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';
const COMMISSIONER_ID = 'e3242a19-1131-4fc5-9886-7730f10ef69b';
const STEELERS_SAINTS_EVENT_ID = '401873011';

async function captureBaseline() {
  const gamesCount = await prisma.game.count();
  const picksCount = await prisma.pick.count();
  const membershipsCount = await prisma.poolMembership.count();
  const poolsCount = await prisma.pool.count();
  const manifests: any[] = await prisma.$queryRawUnsafe(
    `SELECT season, season_type, week_number, revision, cardinality(event_ids)::int as count FROM public.weekly_slate_manifests ORDER BY week_number;`
  );
  const baselineGames: any[] = await prisma.$queryRawUnsafe(
    `SELECT week, count(*)::int as count FROM public.games GROUP BY week ORDER BY week;`
  );
  return {
    gamesCount,
    picksCount,
    membershipsCount,
    poolsCount,
    manifests,
    baselineGames,
  };
}

async function main() {
  console.log('========================================================================');
  console.log('HAG-26: PRODUCTION FULL-SEASON IMPORT & WEEK 7 TIEBREAKER SETUP');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Pool: ${POOL_ID}`);
  console.log(`Commissioner: ${COMMISSIONER_ID}`);
  console.log('========================================================================\n');

  // Step 1: Pre-run baseline capture
  console.log('--- Step 1: Capturing Pre-Import Database Baseline ---');
  const baselineBefore = await captureBaseline();
  console.log('Baseline Before:', JSON.stringify(baselineBefore, null, 2));

  // Verify baseline preservation (Week 6 = 14 games, Week null = 16 games, Picks = 84, Memberships = 11, Pools = 1)
  const preW6 = baselineBefore.baselineGames.find((b: any) => b.week === 6);
  const preNull = baselineBefore.baselineGames.find((b: any) => b.week === null);
  if (
    Number(preW6?.count) !== 14 ||
    Number(preNull?.count) !== 16 ||
    baselineBefore.picksCount !== 84 ||
    baselineBefore.membershipsCount !== 11 ||
    baselineBefore.poolsCount !== 1
  ) {
    throw new Error(`BASELINE_SAFETY_VIOLATION: Expected baseline 14 W6 games, 16 null games, 84 picks, 11 memberships, 1 pool. Found: ${JSON.stringify(baselineBefore)}`);
  }
  console.log('✅ Baseline safety verified.\n');

  // Step 2: Week 7 Dry Run
  console.log('--- Step 2: Week 7 Dry Run ---');
  const week7DryRun = await runSeasonImport({
    dryRun: true,
    execute: false,
    startWeek: 7,
    endWeek: 7,
    seasonYear: 2026,
    seasonType: 2,
    poolId: POOL_ID,
    operatorId: COMMISSIONER_ID,
  });
  console.log('Week 7 Dry Run Result:', JSON.stringify(week7DryRun, null, 2));
  if (!week7DryRun.success) {
    throw new Error(`Week 7 dry run failed: ${week7DryRun.errors.join('; ')}`);
  }
  console.log('✅ Week 7 Dry Run completed successfully.\n');

  // Step 3: Week 7 Live Execution
  console.log('--- Step 3: Week 7 Live Execution ---');
  const week7Obs = await fetchAuthoritativeESPNScoreboard({
    seasonYear: 2026,
    seasonType: 2,
    weekNumber: 7,
  });
  if (week7Obs.status !== 'VERIFIED') {
    throw new Error(`Week 7 ESPN fetch failed: ${week7Obs.reasons.join(', ')}`);
  }
  console.log(`Fetched Week 7: ${week7Obs.events.length} verified events.`);

  const week7Refresh = await refreshWeeklySlateInDb(prisma, {
    poolId: POOL_ID,
    seasonYear: 2026,
    seasonType: 2,
    weekNumber: 7,
    operatorId: COMMISSIONER_ID,
    preloadedObservation: week7Obs,
  });
  console.log('Week 7 Slate Refresh Result:', JSON.stringify(week7Refresh, null, 2));
  if (!week7Refresh.success) {
    throw new Error(`Week 7 DB refresh failed: ${week7Refresh.reason}`);
  }
  console.log('✅ Week 7 Slate and Manifest successfully persisted.\n');

  // Step 4: Apply Commissioner Override for Week 7 (PIT @ NO Steelers@Saints)
  console.log('--- Step 4: Applying Commissioner Tiebreaker Override for Week 7 (Steelers @ Saints) ---');
  const overrideResult = await prisma.$transaction(async (tx) => {
    // 1. Row-level lock on pool record (scoped to season_type 2)
    await tx.$queryRawUnsafe(`SELECT id FROM public.pools WHERE id = $1::uuid FOR UPDATE;`, POOL_ID);

    // 2. Fetch fresh pool state
    const pool = await tx.pool.findUnique({ where: { id: POOL_ID } });
    if (!pool) throw new Error('Pool not found');

    // 3. Verify real ACTIVE membership from database (no asserted booleans)
    const memberRows: any[] = await tx.$queryRawUnsafe(
      `SELECT status FROM public.pool_memberships
       WHERE pool_id = $1::uuid AND user_id = $2::uuid AND season_type = 2;`,
      POOL_ID,
      COMMISSIONER_ID
    );
    const isUserActiveMember = memberRows.length > 0 && memberRows[0].status === 'ACTIVE';
    if (!isUserActiveMember) {
      throw new Error('FORBIDDEN_ACTIVE_MEMBERSHIP_REQUIRED: Commissioner does not have ACTIVE season_type=2 membership in pool.');
    }

    // 4. Concurrency check: zero submissions
    const existingSubs = await tx.weeklySubmission.findMany({
      where: { poolId: POOL_ID, weekNumber: 7, tieBreakerPrediction: { not: null } },
    });
    if (existingSubs.length > 0) throw new Error('DESIGNATION_FROZEN: Predictions already received');

    // 5. Query Week 7 games from DB (scoped to season 2026, season_type 2, week 7)
    const games: any[] = await tx.$queryRawUnsafe(
      `SELECT id, external_game_id as "externalGameId", home_team_id as "homeTeamId", away_team_id as "awayTeamId",
              kickoff_time as "kickoffTime", status
       FROM public.games
       WHERE season = 2026 AND season_type = 2 AND week = 7
       ORDER BY kickoff_time ASC;`
    );

    const pitNoGame = games.find((g: any) => g.externalGameId === STEELERS_SAINTS_EVENT_ID);
    if (!pitNoGame) {
      throw new Error(`PIT@NO game ${STEELERS_SAINTS_EVENT_ID} not found in Week 7 season_type=2 games.`);
    }

    const { updatedSettings, designation } = applyCommissionerOverride({
      currentSettings: (pool.settings as any) || {},
      season: 2026,
      week: 7,
      targetGameId: STEELERS_SAINTS_EVENT_ID,
      games: games as any,
      requestingUserId: COMMISSIONER_ID,
      poolAdminId: pool.adminId,
      isUserActiveMember, // verified from real DB query above
      now: new Date(),
    });

    await tx.pool.update({
      where: { id: POOL_ID },
      data: { settings: updatedSettings },
    });

    return designation;
  }, { maxWait: 20000, timeout: 60000 });
  console.log('Commissioner Override Applied:', JSON.stringify(overrideResult, null, 2));
  console.log('✅ Week 7 tiebreaker successfully overridden to Steelers @ Saints.\n');

  // Step 5: Readback & Pickability Verification for Week 7
  console.log('--- Step 5: Week 7 Database Readback & Pickability Verification ---');
  const week7Manifest: any[] = await prisma.$queryRawUnsafe(
    `SELECT season, season_type, week_number, revision, cardinality(event_ids) as count, manifest_fingerprint, accepted_by
     FROM public.weekly_slate_manifests
     WHERE season = 2026 AND week_number = 7;`
  );
  console.log('Week 7 Manifest in DB:', week7Manifest[0]);

  const countRows: any[] = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int as count FROM public.games WHERE season = 2026 AND week = 7;`
  );
  const week7GamesCount = Number(countRows[0]?.count);
  console.log(`Week 7 Games Count in DB: ${week7GamesCount}`);

  const freshPoolAfterW7 = await prisma.pool.findUnique({
    where: { id: POOL_ID },
    select: { settings: true },
  });
  const w7Designation = (freshPoolAfterW7?.settings as any)?.tiebreaker_designations?.['2026']?.['7'];
  console.log('Week 7 Persisted Designation:', w7Designation);

  if (
    !week7Manifest[0] ||
    Number(week7Manifest[0].revision) !== 1 ||
    Number(week7Manifest[0].count) !== 14 ||
    week7GamesCount !== 14 ||
    w7Designation?.eventId !== STEELERS_SAINTS_EVENT_ID ||
    w7Designation?.provenance !== 'COMMISSIONER_OVERRIDE'
  ) {
    throw new Error('WEEK_7_VERIFICATION_FAILED: Database readback does not match expected state.');
  }
  console.log('✅ Week 7 verified: 14 games, manifest revision 1, tiebreaker Steelers @ Saints (401873011).\n');

  // Step 6: Weeks 8..18 Live Ingestion
  console.log('--- Step 6: Weeks 8..18 Additive Import ---');
  for (let week = 8; week <= 18; week++) {
    process.stdout.write(`Fetching and importing Week ${week}... `);
    const obs = await fetchAuthoritativeESPNScoreboard({
      seasonYear: 2026,
      seasonType: 2,
      weekNumber: week,
    });
    if (obs.status !== 'VERIFIED') {
      throw new Error(`Week ${week} observation unverified: ${obs.reasons.join(', ')}`);
    }

    const refresh = await refreshWeeklySlateInDb(prisma, {
      poolId: POOL_ID,
      seasonYear: 2026,
      seasonType: 2,
      weekNumber: week,
      operatorId: COMMISSIONER_ID,
      preloadedObservation: obs,
    });
    if (!refresh.success) {
      throw new Error(`Week ${week} DB persistence failed: ${refresh.reason}`);
    }
    console.log(`[DONE] ${obs.events.length} games imported. Manifest rev ${refresh.revision}.`);
  }
  console.log('✅ Weeks 8..18 successfully imported.\n');

  // Step 7: Post-Run Complete Database Verification
  console.log('--- Step 7: Post-Import Database Verification & Baseline Preservation Check ---');
  const baselineAfter = await captureBaseline();
  console.log('Baseline After:', JSON.stringify(baselineAfter, null, 2));

  // Check baseline preservation
  if (baselineAfter.picksCount !== 84) {
    throw new Error(`SAFETY_ALERT: Picks count mutated! Expected 84, got ${baselineAfter.picksCount}`);
  }
  if (baselineAfter.membershipsCount !== 11) {
    throw new Error(`SAFETY_ALERT: Memberships count mutated! Expected 11, got ${baselineAfter.membershipsCount}`);
  }
  if (baselineAfter.poolsCount !== 1) {
    throw new Error(`SAFETY_ALERT: Pools count mutated! Expected 1, got ${baselineAfter.poolsCount}`);
  }

  // Check baseline games
  const week6Games = baselineAfter.baselineGames.find((b: any) => b.week === 6);
  const weekNullGames = baselineAfter.baselineGames.find((b: any) => b.week === null);
  if (Number(week6Games?.count) !== 14 || Number(weekNullGames?.count) !== 16) {
    throw new Error(`SAFETY_ALERT: Baseline games mutated! Week 6: ${week6Games?.count}, Week null: ${weekNullGames?.count}`);
  }
  console.log('✅ Baseline rows 100% PRESERVED: 84 picks, 30 baseline games (14 w6 + 16 null), 11 memberships, 1 pool.');

  // Total games check: 30 baseline + 179 new = 209
  console.log(`Total games in database: ${baselineAfter.gamesCount} (expected: 209)`);
  if (baselineAfter.gamesCount !== 209) {
    throw new Error(`UNEXPECTED_GAME_COUNT: Expected 209 total games, found ${baselineAfter.gamesCount}`);
  }

  // Check manifests: Weeks 6..18 (13 manifests total)
  console.log(`Total manifests in database: ${baselineAfter.manifests.length} (expected: 13)`);
  if (baselineAfter.manifests.length !== 13) {
    throw new Error(`UNEXPECTED_MANIFEST_COUNT: Expected 13 manifests (Weeks 6..18), found ${baselineAfter.manifests.length}`);
  }

  // Check pool settings tiebreaker designations for all weeks 7..18
  const finalPool = await prisma.pool.findUnique({
    where: { id: POOL_ID },
    select: { settings: true },
  });
  const allDesignations = (finalPool?.settings as any)?.tiebreaker_designations?.['2026'];
  console.log('All 2026 Tiebreaker Designations:');
  for (let w = 7; w <= 18; w++) {
    const d = allDesignations?.[String(w)] || allDesignations?.[w];
    console.log(`  Week ${w}: ${d?.gameTitle || d?.matchup} (Event: ${d?.eventId}, Prov: ${d?.provenance})`);
  }

  console.log('\n========================================================================');
  console.log('ALL PHASES COMPLETED AND EMPIRICALLY VERIFIED AGAINST HOSTED SUPABASE');
  console.log('========================================================================');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('\n❌ FATAL IMPORT ERROR:', err);
  await prisma.$disconnect();
  process.exit(1);
});
