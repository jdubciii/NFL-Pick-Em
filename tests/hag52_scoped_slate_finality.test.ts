import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WeeklyLadderView } from '../client/src/components/shame/WeeklyLadderView';
import type { LiveGame } from '../client/src/services/liveScoreService';
import {
  type SlateGame,
} from '../client/src/services/sweatProjectionService';
import {
  isWeeklyScoredSlateFinal,
  resolveWeeklyTiebreakerSnapshot,
  selectAcceptedScoredSlateGames,
} from '../client/src/services/weeklyStandingsFinalityService';
import {
  getRadarModalPhaseLabel,
  getRadarSectionHeader,
  getRadarStatusPill,
} from '../client/src/pages/RadarPage';
import {
  clearTestScopedSlatesOverride,
  formatScopeKey,
  getScopedPoolSlateConfig,
  setTestScopedSlatesOverride,
  TARGET_AFFECTED_POOL_ID,
  TARGET_AFFECTED_SEASON,
  TARGET_AFFECTED_SEASON_TYPE,
  TARGET_AFFECTED_WEEK_NUMBER,
  type ScopedPoolSlateEntry,
} from '../client/src/services/poolScoredSlateConfig';

const targetScope = {
  poolId: TARGET_AFFECTED_POOL_ID,
  season: TARGET_AFFECTED_SEASON,
  seasonType: TARGET_AFFECTED_SEASON_TYPE,
  weekNumber: TARGET_AFFECTED_WEEK_NUMBER,
};

// Unmistakably synthetic IDs: string prefixes cannot be confused with real ESPN numeric event IDs.
const synthetic9EventIds = [
  'synth-game-01',
  'synth-game-02',
  'synth-game-03',
  'synth-game-04',
  'synth-game-05',
  'synth-game-06',
  'synth-game-07',
  'synth-game-08',
  'synth-game-09-tb', // Designated Tiebreaker
];

const outside5EventIds = [
  'synth-outside-01',
  'synth-outside-02',
  'synth-outside-03',
  'synth-outside-04',
  'synth-outside-05-mnf', // Monday Night game
];

const manifest14EventIds = [
  ...synthetic9EventIds.slice(0, 8),
  outside5EventIds[0],
  synthetic9EventIds[8],
  ...outside5EventIds.slice(1),
];

const members = [
  { id: 'user-1', name: 'Jack' },
  { id: 'user-2', name: 'Mark' },
];

function buildGames(eventIds: string[], status: string = 'SCHEDULED'): SlateGame[] {
  return eventIds.map((id, index) => ({
    id: `db-${id}`,
    externalGameId: id,
    homeTeam: id === 'synth-game-09-tb' ? 'DET' : `H${index}`,
    awayTeam: id === 'synth-game-09-tb' ? 'MIN' : `A${index}`,
    weekNumber: 8,
    seasonYear: 2026,
    status,
    homeScore: status === 'FINAL' ? (id === 'synth-game-09-tb' ? 19 : 24) : undefined,
    awayScore: status === 'FINAL' ? (id === 'synth-game-09-tb' ? 15 : 17) : undefined,
  }));
}

function buildLiveScores(
  eventIds: string[],
  finalStatusEventIds: Set<string>,
  zeroScoreEventIds: Set<string> = new Set(),
): LiveGame[] {
  return eventIds.map((id) => {
    const isFinal = finalStatusEventIds.has(id);
    const isZero = zeroScoreEventIds.has(id);
    return {
      id,
      name: id,
      shortName: id,
      homeTeam: {
        code: id === 'synth-game-09-tb' ? 'DET' : 'HOM',
        name: 'Home',
        score: isFinal ? (isZero ? 0 : id === 'synth-game-09-tb' ? '19' : '24') : undefined,
      },
      awayTeam: {
        code: id === 'synth-game-09-tb' ? 'MIN' : 'AWY',
        name: 'Away',
        score: isFinal ? (isZero ? 0 : id === 'synth-game-09-tb' ? '15' : '17') : undefined,
      },
      status: isFinal ? 'FINAL' : 'SCHEDULED',
      clock: isFinal ? '0:00' : '',
      period: isFinal ? 4 : 0,
    };
  });
}

function buildTiebreakerPayload(eventId: string = 'synth-game-09-tb') {
  return {
    status: 'DEFAULT_LIONS',
    tiebreakerOffered: true,
    eventId,
    readiness: [
      { userId: 'user-1', prediction: 34.0 },
      { userId: 'user-2', prediction: 40.0 },
    ],
  };
}

describe('HAG-52: Pool Scored Slate Adapter & Finality Regressions (HAG52-SLATE-2026-11-02-01)', () => {
  beforeEach(() => {
    clearTestScopedSlatesOverride();
  });

  afterEach(() => {
    clearTestScopedSlatesOverride();
  });

  it('Regression 1: Nine listed finals plus five outside games including unfinished Monday game triggers final', () => {
    const scopeKey = formatScopeKey(targetScope)!;
    const syntheticEntry: ScopedPoolSlateEntry = {
      ...targetScope,
      version: 1,
      scoredEventIds: synthetic9EventIds,
      description: 'Synthetic 9-game Week 8 slate',
    };
    setTestScopedSlatesOverride({ [scopeKey]: syntheticEntry });

    const staleDbGames = buildGames(manifest14EventIds, 'SCHEDULED');
    const liveFinals = buildLiveScores(manifest14EventIds, new Set(synthetic9EventIds));

    const scoredGames = selectAcceptedScoredSlateGames(staleDbGames, manifest14EventIds, targetScope);
    expect(scoredGames).not.toBeNull();
    expect(scoredGames).toHaveLength(9);

    const tiebreakerSnapshot = resolveWeeklyTiebreakerSnapshot(
      buildTiebreakerPayload('synth-game-09-tb'),
      members.map((m) => m.id),
      scoredGames!,
      liveFinals,
    );
    expect(tiebreakerSnapshot.verified).toBe(true);
    expect(tiebreakerSnapshot.data?.actualTotalScore).toBe(34);

    const isFinal = isWeeklyScoredSlateFinal(
      scoredGames!,
      liveFinals,
      tiebreakerSnapshot,
      Boolean(scoredGames),
      true,
    );
    expect(isFinal).toBe(true);
  });

  it('Regression 2: One selected unfinished/missing/ambiguous game keeps standings provisional', () => {
    const scopeKey = formatScopeKey(targetScope)!;
    setTestScopedSlatesOverride({
      [scopeKey]: { ...targetScope, version: 1, scoredEventIds: synthetic9EventIds },
    });

    const staleDbGames = buildGames(manifest14EventIds, 'SCHEDULED');
    // Only 8 of the 9 games are final; synth-game-08 is still in progress
    const eightFinal = new Set(synthetic9EventIds.filter((id) => id !== 'synth-game-08'));
    const liveEightFinal = buildLiveScores(manifest14EventIds, eightFinal);

    const scoredGames = selectAcceptedScoredSlateGames(staleDbGames, manifest14EventIds, targetScope);
    expect(scoredGames).toHaveLength(9);

    const tiebreakerSnapshot = resolveWeeklyTiebreakerSnapshot(
      buildTiebreakerPayload('synth-game-09-tb'),
      members.map((m) => m.id),
      scoredGames!,
      liveEightFinal,
    );
    expect(tiebreakerSnapshot.verified).toBe(true);

    const isFinal = isWeeklyScoredSlateFinal(
      scoredGames!,
      liveEightFinal,
      tiebreakerSnapshot,
      Boolean(scoredGames),
      true,
    );
    expect(isFinal).toBe(false);
  });

  it('Regression 3: Missing picks do not shrink the slate or gate finality once identity is established', () => {
    const scopeKey = formatScopeKey(targetScope)!;
    setTestScopedSlatesOverride({
      [scopeKey]: { ...targetScope, version: 1, scoredEventIds: synthetic9EventIds },
    });

    const staleDbGames = buildGames(manifest14EventIds, 'SCHEDULED');
    const liveFinals = buildLiveScores(manifest14EventIds, new Set(synthetic9EventIds));

    // Even if picks array is completely empty or missing
    const scoredGames = selectAcceptedScoredSlateGames(staleDbGames, manifest14EventIds, targetScope);
    expect(scoredGames).toHaveLength(9);

    const tiebreakerSnapshot = resolveWeeklyTiebreakerSnapshot(
      buildTiebreakerPayload('synth-game-09-tb'),
      members.map((m) => m.id),
      scoredGames!,
      liveFinals,
    );

    const isFinal = isWeeklyScoredSlateFinal(
      scoredGames!,
      liveFinals,
      tiebreakerSnapshot,
      Boolean(scoredGames),
      true,
    );
    expect(isFinal).toBe(true);
  });

  it('Regression 4: Duplicate identity in configuration, manifest, or games fails closed', () => {
    const scopeKey = formatScopeKey(targetScope)!;
    // Duplicate ID in scoredEventIds config
    setTestScopedSlatesOverride({
      [scopeKey]: {
        ...targetScope,
        version: 1,
        scoredEventIds: [...synthetic9EventIds.slice(0, 8), synthetic9EventIds[0]], // Duplicate!
      },
    });

    const staleDbGames = buildGames(manifest14EventIds, 'SCHEDULED');
    expect(selectAcceptedScoredSlateGames(staleDbGames, manifest14EventIds, targetScope)).toBeNull();

    // Duplicate in manifest
    setTestScopedSlatesOverride({
      [scopeKey]: { ...targetScope, version: 1, scoredEventIds: synthetic9EventIds },
    });
    const duplicateManifest = [...manifest14EventIds, manifest14EventIds[0]];
    expect(selectAcceptedScoredSlateGames(staleDbGames, duplicateManifest, targetScope)).toBeNull();

    // Duplicate in games list
    const duplicateGames = [...staleDbGames, staleDbGames[0]];
    expect(selectAcceptedScoredSlateGames(duplicateGames, manifest14EventIds, targetScope)).toBeNull();
  });

  it('Regression 5: Wrong pool, season, type, or week scope preserves existing behavior', () => {
    const scopeKey = formatScopeKey(targetScope)!;
    setTestScopedSlatesOverride({
      [scopeKey]: { ...targetScope, version: 1, scoredEventIds: synthetic9EventIds },
    });

    const staleDbGames = buildGames(manifest14EventIds, 'SCHEDULED');

    // Wrong pool ID (different pool outside target scope)
    const wrongPoolScope = { ...targetScope, poolId: 'different-pool-uuid' };
    const resultWrongPool = selectAcceptedScoredSlateGames(staleDbGames, manifest14EventIds, wrongPoolScope);
    // Preserves existing behavior outside target scope -> returns all 14 manifest games
    expect(resultWrongPool).toHaveLength(14);

    // Wrong week number (e.g. week 7)
    const wrongWeekScope = { ...targetScope, weekNumber: 7 };
    const resultWrongWeek = selectAcceptedScoredSlateGames(staleDbGames, manifest14EventIds, wrongWeekScope);
    expect(resultWrongWeek).toHaveLength(14);
  });

  it('Regression 6: Absent configuration for affected Week 8 fails closed to null and stays Provisional even when all 14 manifest games are final', () => {
    const scopeKey = formatScopeKey(targetScope)!;
    // Explicitly simulate absent configuration for target scope to verify fail-closed
    setTestScopedSlatesOverride({ [scopeKey]: null });

    const staleDbGames = buildGames(manifest14EventIds, 'SCHEDULED');
    // ALL 14 manifest games are final
    const all14Finals = buildLiveScores(manifest14EventIds, new Set(manifest14EventIds));

    // For the target affected scope, absent config must return null directly
    const scoredGames = selectAcceptedScoredSlateGames(staleDbGames, manifest14EventIds, targetScope);
    expect(scoredGames).toBeNull();

    const tiebreakerSnapshot = resolveWeeklyTiebreakerSnapshot(
      buildTiebreakerPayload('synth-game-09-tb'),
      members.map((m) => m.id),
      staleDbGames,
      all14Finals,
    );

    // Finality check fails closed to false (Provisional) because scoredGames is null
    const isFinal = isWeeklyScoredSlateFinal(
      scoredGames || [],
      all14Finals,
      tiebreakerSnapshot,
      Boolean(scoredGames),
      true,
    );
    expect(isFinal).toBe(false);
  });

  it('Regression 7: Nonnegative zero score is valid, while negative or NaN scores fail closed', () => {
    const scopeKey = formatScopeKey(targetScope)!;
    setTestScopedSlatesOverride({
      [scopeKey]: { ...targetScope, version: 1, scoredEventIds: synthetic9EventIds },
    });

    const staleDbGames = buildGames(manifest14EventIds, 'SCHEDULED');

    // Zero score (e.g. 0-0 shutout) is valid
    const zeroScores = buildLiveScores(
      manifest14EventIds,
      new Set(synthetic9EventIds),
      new Set(['synth-game-01']),
    );
    const scoredGames = selectAcceptedScoredSlateGames(staleDbGames, manifest14EventIds, targetScope)!;
    const tiebreakerSnapshot = resolveWeeklyTiebreakerSnapshot(
      buildTiebreakerPayload('synth-game-09-tb'),
      members.map((m) => m.id),
      scoredGames,
      zeroScores,
    );
    expect(isWeeklyScoredSlateFinal(scoredGames, zeroScores, tiebreakerSnapshot, true, true)).toBe(true);

    // Invalid negative score fails closed
    const invalidNegativeLive = buildLiveScores(manifest14EventIds, new Set(synthetic9EventIds));
    invalidNegativeLive[0].homeTeam.score = -5 as any;
    expect(isWeeklyScoredSlateFinal(scoredGames, invalidNegativeLive, tiebreakerSnapshot, true, true)).toBe(false);

    // Invalid NaN score fails closed
    const invalidNanLive = buildLiveScores(manifest14EventIds, new Set(synthetic9EventIds));
    invalidNanLive[0].homeTeam.score = 'NaN' as any;
    expect(isWeeklyScoredSlateFinal(scoredGames, invalidNanLive, tiebreakerSnapshot, true, true)).toBe(false);
  });

  it('Regression 8: Unresolved postponement, cancellation, or suspension fails closed', () => {
    const scopeKey = formatScopeKey(targetScope)!;
    setTestScopedSlatesOverride({
      [scopeKey]: { ...targetScope, version: 1, scoredEventIds: synthetic9EventIds },
    });

    const staleDbGames = buildGames(manifest14EventIds, 'SCHEDULED');
    const liveFinals = buildLiveScores(manifest14EventIds, new Set(synthetic9EventIds));
    const scoredGames = selectAcceptedScoredSlateGames(staleDbGames, manifest14EventIds, targetScope)!;
    const tiebreakerSnapshot = resolveWeeklyTiebreakerSnapshot(
      buildTiebreakerPayload('synth-game-09-tb'),
      members.map((m) => m.id),
      scoredGames,
      liveFinals,
    );

    // Postponed game
    const postponedLive = buildLiveScores(manifest14EventIds, new Set(synthetic9EventIds));
    postponedLive[0].status = 'STATUS_POSTPONED';
    expect(isWeeklyScoredSlateFinal(scoredGames, postponedLive, tiebreakerSnapshot, true, true)).toBe(false);

    // Cancelled game
    const cancelledLive = buildLiveScores(manifest14EventIds, new Set(synthetic9EventIds));
    cancelledLive[0].status = 'STATUS_CANCELED';
    expect(isWeeklyScoredSlateFinal(scoredGames, cancelledLive, tiebreakerSnapshot, true, true)).toBe(false);
  });

  it('Regression 9: Pending or unresolved designated tiebreaker keeps standings provisional', () => {
    const scopeKey = formatScopeKey(targetScope)!;
    setTestScopedSlatesOverride({
      [scopeKey]: { ...targetScope, version: 1, scoredEventIds: synthetic9EventIds },
    });

    const staleDbGames = buildGames(manifest14EventIds, 'SCHEDULED');
    // All 9 games final EXCEPT tiebreaker game synth-game-09-tb is still in progress
    const pendingTiebreakerIds = new Set(synthetic9EventIds.filter((id) => id !== 'synth-game-09-tb'));
    const liveScores = buildLiveScores(manifest14EventIds, pendingTiebreakerIds);

    const scoredGames = selectAcceptedScoredSlateGames(staleDbGames, manifest14EventIds, targetScope)!;
    const pendingSnapshot = resolveWeeklyTiebreakerSnapshot(
      buildTiebreakerPayload('synth-game-09-tb'),
      members.map((m) => m.id),
      scoredGames,
      liveScores,
    );
    expect(pendingSnapshot.data?.actualTotalScore).toBeUndefined();

    // With tiebreaker pending, finality stays false
    expect(isWeeklyScoredSlateFinal(scoredGames, liveScores, pendingSnapshot, true, true)).toBe(false);
  });

  it('Regression 10: Consistent label output between Ladder and Radar views across provisional and final states', () => {
    const ladder = [
      { userId: 'user-1', userName: 'Jack', rank: 1, displayRank: '#1', tier: 'SAFE HAVEN', status: 'OFFICIAL SAFE', penaltyShots: 0 },
      { userId: 'user-2', userName: 'Mark', rank: 2, displayRank: '#2', tier: 'PIT', status: 'OFFICIAL PENALTY', penaltyShots: 2.5 },
    ];

    // State 1: PROVISIONAL
    const isFinalPostedFalse = false;

    // Ladder view verification
    const provisionalLadderMarkup = renderToStaticMarkup(
      React.createElement(WeeklyLadderView, {
        ladder,
        status: 'READY',
        weekNumber: 8,
        isFinalPosted: isFinalPostedFalse,
      }),
    );
    expect(provisionalLadderMarkup).toContain('Provisional standings');
    expect(provisionalLadderMarkup).not.toContain('Final weekly standings');

    // Radar view verification (all three label paths from RadarPage.tsx)
    expect(getRadarStatusPill(isFinalPostedFalse)).toBe('PROJECTION');
    expect(getRadarSectionHeader(isFinalPostedFalse)).toBe('SUNDAY SWEAT PROVISIONAL STANDINGS');
    expect(getRadarModalPhaseLabel('FINAL', isFinalPostedFalse)).toBe('FINAL · PROVISIONAL');

    // State 2: FINAL
    const isFinalPostedTrue = true;

    // Ladder view verification
    const finalLadderMarkup = renderToStaticMarkup(
      React.createElement(WeeklyLadderView, {
        ladder,
        status: 'READY',
        weekNumber: 8,
        isFinalPosted: isFinalPostedTrue,
      }),
    );
    expect(finalLadderMarkup).toContain('Final weekly standings');
    expect(finalLadderMarkup).toContain('Shot tiers are the official weekly penalties.');
    expect(finalLadderMarkup).not.toContain('Provisional standings');

    // Radar view verification (all three label paths from RadarPage.tsx)
    expect(getRadarStatusPill(isFinalPostedTrue)).toBe('FINAL STANDINGS');
    expect(getRadarSectionHeader(isFinalPostedTrue)).toBe('WEEKLY FINAL STANDINGS');
    expect(getRadarModalPhaseLabel('FINAL', isFinalPostedTrue)).toBe('FINAL · FINAL STANDINGS');
  });

  it('Regression 11: Scope field mismatch between resolved entry and requested scope fails closed', () => {
    const scopeKey = formatScopeKey(targetScope)!;
    // Mismatched entry: poolId inside object does not match key/scope
    const mismatchedEntry: ScopedPoolSlateEntry = {
      ...targetScope,
      poolId: 'malicious-or-wrong-pool-uuid',
      version: 1,
      scoredEventIds: synthetic9EventIds,
    };
    setTestScopedSlatesOverride({ [scopeKey]: mismatchedEntry });

    // getScopedPoolSlateConfig detects field mismatch and returns null
    expect(getScopedPoolSlateConfig(targetScope)).toBeNull();

    // selectAcceptedScoredSlateGames fails closed to null
    const staleDbGames = buildGames(manifest14EventIds, 'SCHEDULED');
    expect(selectAcceptedScoredSlateGames(staleDbGames, manifest14EventIds, targetScope)).toBeNull();
  });

  it('Regression 12: Real checked-in Week 8 configuration flips to Final on the 14-ID accepted manifest with 9 pool finals and unfinished outside games', () => {
    // Zero test overrides: exercises real CHECKED_IN_SCOPED_SLATES directly
    clearTestScopedSlatesOverride();

    // 1. Verify checked-in entry resolves and matches commissioner authorization
    const checkedInConfig = getScopedPoolSlateConfig(targetScope);
    expect(checkedInConfig).not.toBeNull();
    expect(checkedInConfig!.poolId).toBe(TARGET_AFFECTED_POOL_ID);
    expect(checkedInConfig!.season).toBe(2026);
    expect(checkedInConfig!.seasonType).toBe(2);
    expect(checkedInConfig!.weekNumber).toBe(8);
    expect(checkedInConfig!.version).toBe(1);
    expect(checkedInConfig!.scoredEventIds).toHaveLength(9);

    const expected9Ids = [
      '401873023', // CAR@GB
      '401873024', // ARI@DAL
      '401873025', // ATL@TB
      '401873026', // BAL@BUF
      '401873027', // CLE@PIT
      '401873028', // IND@JAX
      '401873029', // LV@NYJ
      '401873030', // MIN@DET (Tiebreaker)
      '401873031', // TEN@CIN
    ];
    expect(checkedInConfig!.scoredEventIds).toEqual(expected9Ids);

    // 2. Real accepted manifest with 14 canonical event IDs from Supabase
    const realManifest14EventIds = [
      '401873023', '401873026', '401873031', '401873024', '401873030',
      '401873029', '401873027', '401873025', '401873028',
      '401873032', '401873033', '401873034', '401873035', '401873036',
    ];

    // Real DB games (14 games in DB, mostly SCHEDULED)
    const realDbGames: SlateGame[] = realManifest14EventIds.map((id) => ({
      id: `db-${id}`,
      externalGameId: id,
      homeTeam: id === '401873030' ? 'DET' : 'HOM',
      awayTeam: id === '401873030' ? 'MIN' : 'AWY',
      weekNumber: 8,
      seasonYear: 2026,
      status: id === '401873023' ? 'FINAL' : 'SCHEDULED',
      homeScore: id === '401873023' ? 27 : undefined,
      awayScore: id === '401873023' ? 19 : undefined,
    }));

    // 3. Real Live ESPN Scoreboard: 12 FINAL (all 9 pool games + 3 outside games),
    // 1 IN_PROGRESS (SNF 401873035), 1 SCHEDULED (MNF 401873036)
    const realLiveFinalsSet = new Set([
      '401873023', '401873024', '401873025', '401873026', '401873027',
      '401873028', '401873029', '401873030', '401873031',
      '401873032', '401873033', '401873034',
    ]);

    const realLiveScores: LiveGame[] = realManifest14EventIds.map((id) => {
      const isFinal = realLiveFinalsSet.has(id);
      const isInProgress = id === '401873035';
      return {
        id,
        name: id,
        shortName: id,
        homeTeam: {
          code: id === '401873030' ? 'DET' : 'HOM',
          name: 'Home',
          score: isFinal ? (id === '401873030' ? '19' : '24') : isInProgress ? '10' : undefined,
        },
        awayTeam: {
          code: id === '401873030' ? 'MIN' : 'AWY',
          name: 'Away',
          score: isFinal ? (id === '401873030' ? '15' : '17') : isInProgress ? '10' : undefined,
        },
        status: isFinal ? 'FINAL' : isInProgress ? 'IN_PROGRESS' : 'SCHEDULED',
        clock: isFinal ? '0:00' : isInProgress ? '8:42 2Q' : '',
        period: isFinal ? 4 : isInProgress ? 2 : 0,
      };
    });

    // 4. selectAcceptedScoredSlateGames scopes down to exactly the 9 confirmed matchups
    const scoredGames = selectAcceptedScoredSlateGames(realDbGames, realManifest14EventIds, targetScope);
    expect(scoredGames).not.toBeNull();
    expect(scoredGames).toHaveLength(9);
    expect(scoredGames!.map((g) => g.externalGameId)).toEqual(expected9Ids);

    // 5. Tiebreaker payload for MIN@DET 401873030 (resolved at 34)
    const tiebreakerPayload = {
      status: 'DEFAULT_LIONS',
      tiebreakerOffered: true,
      eventId: '401873030',
      readiness: [
        { userId: 'user-1', prediction: 34.0 },
        { userId: 'user-2', prediction: 40.0 },
      ],
    };
    const tiebreakerSnapshot = resolveWeeklyTiebreakerSnapshot(
      tiebreakerPayload,
      members.map((m) => m.id),
      scoredGames!,
      realLiveScores,
    );
    expect(tiebreakerSnapshot.verified).toBe(true);
    expect(tiebreakerSnapshot.offered).toBe(true);
    expect(tiebreakerSnapshot.data?.actualTotalScore).toBe(34);

    // 6. Standings flip to FINAL because all 9 scoped games are final,
    // despite unpicked games 401873035 (SNF) and 401873036 (MNF) not being final!
    const isFinal = isWeeklyScoredSlateFinal(
      scoredGames!,
      realLiveScores,
      tiebreakerSnapshot,
      true,
      true,
    );
    expect(isFinal).toBe(true);

    // 7. Negative control: if any of the 9 scored games is NOT final, finality stays false (Provisional)
    const liveScoresWithPendingGame = realLiveScores.map((g) =>
      g.id === '401873024' ? { ...g, status: 'IN_PROGRESS', clock: '2:15 4Q' } : g,
    );
    expect(
      isWeeklyScoredSlateFinal(scoredGames!, liveScoresWithPendingGame, tiebreakerSnapshot, true, true),
    ).toBe(false);
  });
});
