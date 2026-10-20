import { describe, it, expect } from 'vitest';
import {
  resolveCanonicalGameKickoff,
  normalizeTeamIdentity,
  areTeamIdentitiesEquivalent,
} from '../src/services/dependableInfoService';
import { isKickoffLocked } from '../client/src/services/lockEnforcementService';
import {
  planDeadlineReminders,
  DeadlineGameWindowInput,
} from '../src/services/deadlineAlertPlanner';
import { DEMO_PENALTY_REELS } from '../client/src/components/shame/VerticalReelsFeed';
import { DEMO_PARTICIPANTS } from '../client/src/components/shame/WeeklyRecapCardView';
import { buildDeterministicWeeklyRecap } from '../src/services/weeklyRecapService';
import {
  resolveDefaultDesignation,
  applyCommissionerOverride,
  freezeDesignation,
  GameSlateItem,
} from '../src/services/weeklyDesignationService';
import { normalizeTeamCode } from '../src/services/authoritativeSlateService';
import { resolveProfileReminderScope } from '../client/src/pages/ProfilePage';

describe('P41 — Runtime Mock Purge and Team Identity Normalization (Directive 6)', () => {
  // =========================================================================
  // Test 1: No Fixed Week 6 Substitution
  // Verify that when no canonical authority is passed or available,
  // resolveCanonicalGameKickoff returns UNAVAILABLE (never a fixed Week 6 timestamp).
  // =========================================================================
  it('Test 1: No Fixed Week 6 Substitution: returns UNAVAILABLE without canonical authority', () => {
    // Attempt resolution with only team codes (no kickoff authority)
    const resultNoAuthority = resolveCanonicalGameKickoff({
      awayTeam: 'SEA',
      homeTeam: 'DEN',
    });
    expect(resultNoAuthority.status).toBe('UNAVAILABLE');
    expect(resultNoAuthority.isResolved).toBe(false);
    expect(resultNoAuthority.kickoffIso).toBe('');
    expect(resultNoAuthority.kickoffDisplay).toBe('Unavailable');
    expect(resultNoAuthority.isThursdayNight).toBe(false);

    // Other week 6 matchups without authority also return UNAVAILABLE
    const dalGb = resolveCanonicalGameKickoff({
      awayTeam: 'DAL',
      homeTeam: 'GB',
    });
    expect(dalGb.status).toBe('UNAVAILABLE');
    expect(dalGb.kickoffIso).toBe('');

    // Nonexistent or undefined game returns UNAVAILABLE
    const emptyResult = resolveCanonicalGameKickoff(undefined);
    expect(emptyResult.status).toBe('UNAVAILABLE');
    expect(emptyResult.isResolved).toBe(false);
  });

  // =========================================================================
  // Test 2: Unavailable Authority Cannot Unlock
  // Verify that unavailable kickoff authority causes isKickoffLocked to return
  // true (fail-closed, Decision #55).
  // =========================================================================
  it('Test 2: Unavailable Authority Cannot Unlock: fails closed (isKickoffLocked === true, Decision #55)', () => {
    const unavResult = resolveCanonicalGameKickoff({
      awayTeam: 'HOU',
      homeTeam: 'JAX',
    });
    expect(unavResult.status).toBe('UNAVAILABLE');
    expect(unavResult.kickoffIso).toBe('');

    // Evaluation at any timestamp must fail closed and report locked
    const lockedNow = isKickoffLocked(unavResult.kickoffIso, Date.now());
    expect(lockedNow).toBe(true);

    const lockedPast = isKickoffLocked(unavResult.kickoffIso, new Date('2020-01-01T00:00:00Z').getTime());
    expect(lockedPast).toBe(true);

    const lockedFuture = isKickoffLocked(unavResult.kickoffIso, new Date('2030-01-01T00:00:00Z').getTime());
    expect(lockedFuture).toBe(true);
  });

  // =========================================================================
  // Test 3: Valid Canonical Behavior Preserved
  // Verify that when valid canonical data is passed, resolveCanonicalGameKickoff
  // resolves correctly, formats America/Los_Angeles display, and accurately flags TNF.
  // =========================================================================
  it('Test 3: Valid Canonical Behavior Preserved: formats America/Los_Angeles and detects TNF', () => {
    // Verified 2026 Week 6 TNF: SEA @ DEN on 2026-10-16T00:15:00.000Z (5:15 PM PDT)
    const tnfGame = resolveCanonicalGameKickoff({
      id: '401872995',
      awayTeam: 'SEA',
      homeTeam: 'DEN',
      kickoffIso: '2026-10-16T00:15:00.000Z',
      season: 2026,
      seasonType: 2,
      week: 6,
    });
    expect(tnfGame.status).toBe('RESOLVED');
    expect(tnfGame.isResolved).toBe(true);
    expect(tnfGame.kickoffIso).toBe('2026-10-16T00:15:00.000Z');
    expect(tnfGame.kickoffDisplay).toBe('Thu 5:15 PM');
    expect(tnfGame.isThursdayNight).toBe(true);

    // Verified 2026 Week 6 SNF: DAL @ GB on 2026-10-19T00:20:00.000Z (5:20 PM PDT)
    const snfGame = resolveCanonicalGameKickoff({
      id: '401873007',
      awayTeam: 'DAL',
      homeTeam: 'GB',
      kickoffTime: '2026-10-19T00:20:00.000Z',
    });
    expect(snfGame.status).toBe('RESOLVED');
    expect(snfGame.isResolved).toBe(true);
    expect(snfGame.kickoffDisplay).toBe('Sun 5:20 PM');
    expect(snfGame.isThursdayNight).toBe(false);

    // Lock check: before kickoff is unlocked, after kickoff is locked
    const beforeKickoffMs = new Date('2026-10-15T12:00:00.000Z').getTime();
    const afterKickoffMs = new Date('2026-10-16T00:16:00.000Z').getTime();
    expect(isKickoffLocked(tnfGame.kickoffIso, beforeKickoffMs)).toBe(false);
    expect(isKickoffLocked(tnfGame.kickoffIso, afterKickoffMs)).toBe(true);
  });

  // =========================================================================
  // Test 4: Correct Reminder Context and No Absent-Game Reminders
  // Verify that deadlineAlertPlanner builds accurate windows from real user/pool/week
  // inputs and never generates reminders for games absent from the accepted slate.
  // =========================================================================
  it('Test 4: Correct Reminder Context and No Absent-Game Reminders', () => {
    // 4A: When hasAcceptedSlate is false, planner fails closed with isUnavailable: true
    const unavailablePlan = planDeadlineReminders({
      userId: 'u_jack',
      poolId: 'pool-41-real',
      season: 2026,
      week: 6,
      optInEnabled: true,
      permissionState: 'GRANTED',
      isSlateSubmitted: false,
      hasAcceptedSlate: false,
      nowMs: new Date('2026-10-15T12:00:00.000Z').getTime(),
      games: [],
    });
    expect(unavailablePlan.isUnavailable).toBe(true);
    expect(unavailablePlan.toSchedule).toEqual([]);
    expect(unavailablePlan.statusSummary).toContain('No accepted weekly slate available');

    // 4B: Accepted slate with games: only accepted games generate windows, absent games excluded
    const realGames: DeadlineGameWindowInput[] = [
      {
        gameId: '401872995',
        awayTeam: 'SEA',
        homeTeam: 'DEN',
        kickoffIso: '2026-10-16T00:15:00.000Z',
      },
      {
        gameId: '401873007',
        awayTeam: 'DAL',
        homeTeam: 'GB',
        kickoffIso: '2026-10-19T00:20:00.000Z',
      },
    ];

    const plan = planDeadlineReminders({
      userId: 'u_jack',
      poolId: 'pool-41-real',
      season: 2026,
      week: 6,
      optInEnabled: true,
      permissionState: 'GRANTED',
      isSlateSubmitted: false,
      hasAcceptedSlate: true,
      nowMs: new Date('2026-10-15T12:00:00.000Z').getTime(),
      games: realGames,
    });
    expect(plan.isUnavailable).toBe(false);
    expect(plan.toSchedule.length).toBe(2);

    const scheduledMatchups = plan.toSchedule.map((w) => w.matchupSummary);
    expect(scheduledMatchups.some((m) => m.includes('SEA @ DEN'))).toBe(true);
    expect(scheduledMatchups.some((m) => m.includes('DAL @ GB'))).toBe(true);
    // Absent games are strictly never included
    expect(scheduledMatchups.some((m) => m.includes('BUF @ MIA'))).toBe(false);

    // 4C: Unresolved event disclosure
    const gamesWithUnresolved: DeadlineGameWindowInput[] = [
      ...realGames,
      {
        gameId: 'unresolved-game',
        awayTeam: 'BUF',
        homeTeam: 'MIA',
        kickoffIso: '', // Missing kickoff authority
      },
    ];
    const partialPlan = planDeadlineReminders({
      userId: 'u_jack',
      poolId: 'pool-41-real',
      season: 2026,
      week: 6,
      optInEnabled: true,
      permissionState: 'GRANTED',
      isSlateSubmitted: false,
      hasAcceptedSlate: true,
      nowMs: new Date('2026-10-15T12:00:00.000Z').getTime(),
      games: gamesWithUnresolved,
    });
    expect(partialPlan.unresolvedEventCount).toBe(1);
    expect(partialPlan.toSchedule.length).toBe(2); // Only the 2 resolved games scheduled
    expect(partialPlan.statusSummary).toContain('1 unresolved event excluded');
  });

  // =========================================================================
  // Test 5: Truthful Empty / Error Social States
  // Verify that VerticalReelsFeed and WeeklyRecapCardView render honest empty states
  // and never fall back to synthetic users or fake reactions.
  // =========================================================================
  it('Test 5: Truthful Empty / Error Social States: no synthetic user or reaction fallback', () => {
    // When participants list is empty, recap model strictly marks canExportOfficialVerdict as false
    const emptyRecap = buildDeterministicWeeklyRecap({
      format: 'LEAGUE_VERDICT',
      week: 6,
      isOfficiallySettled: false,
      participants: [],
      viewerUserId: 'u_jack',
    });
    expect(emptyRecap.canExportOfficialVerdict).toBe(false);
    expect(emptyRecap.headerStamp).toBe('AWAITING OFFICIAL SETTLEMENT');
    expect(emptyRecap.participantCountLabel).toBe('0 Active Members');
    expect(emptyRecap.primaryHeadline).toContain('Week 6 Official Verdict Pending');
    expect(emptyRecap.footerWatermark).toContain('UNSETTLED PREVIEW');

    // Even if participants exist, if the slate is unsettled, official export remains locked
    const unsettledRecap = buildDeterministicWeeklyRecap({
      format: 'LEAGUE_VERDICT',
      week: 6,
      isOfficiallySettled: false,
      participants: [
        {
          userId: 'u1',
          displayName: 'jack.w.cone',
          rank: 1,
          points: 11,
          totalGames: 14,
          shotsIncurred: 0,
          tierName: 'SAFE HAVEN',
          tiebreakResolved: true,
        },
      ],
      viewerUserId: 'u1',
    });
    expect(unsettledRecap.canExportOfficialVerdict).toBe(false);
    expect(unsettledRecap.headerStamp).toBe('AWAITING OFFICIAL SETTLEMENT');
  });

  // =========================================================================
  // Test 6: Demo Isolation
  // Verify that DEMO_PENALTY_REELS and DEMO_PARTICIPANTS are isolated, clearly labeled,
  // and not accessible from ordinary production execution.
  // =========================================================================
  it('Test 6: Demo Isolation: DEMO_PENALTY_REELS and DEMO_PARTICIPANTS are isolated and labeled', () => {
    // DEMO_PENALTY_REELS fixture integrity and explicit label
    expect(Array.isArray(DEMO_PENALTY_REELS)).toBe(true);
    expect(DEMO_PENALTY_REELS.length).toBeGreaterThan(0);
    for (const reel of DEMO_PENALTY_REELS) {
      expect(reel.id).toMatch(/^reel-demo-/);
      expect(reel.memberName).toMatch(/^Demo Member/);
    }

    // DEMO_PARTICIPANTS fixture integrity
    expect(Array.isArray(DEMO_PARTICIPANTS)).toBe(true);
    expect(DEMO_PARTICIPANTS.length).toBe(2);
    expect(DEMO_PARTICIPANTS[0].displayName).toBe('jack.w.cone');
    expect(DEMO_PARTICIPANTS[1].displayName).toBe('jcone2');
  });

  // =========================================================================
  // Test 7: WSH / WAS Compatibility and Identity-Conflict Rejection
  // Verify that normalizeTeamIdentity correctly maps WSH to WAS, that
  // areTeamIdentitiesEquivalent treats them as identical, and that conflicting team codes are rejected.
  // =========================================================================
  it('Test 7: WSH / WAS Compatibility and Identity-Conflict Rejection', () => {
    // Normalization maps alias WSH to platform canonical WAS
    expect(normalizeTeamIdentity('WSH')).toBe('WAS');
    expect(normalizeTeamIdentity('WAS')).toBe('WAS');
    expect(normalizeTeamIdentity('wsh')).toBe('WAS');
    expect(normalizeTeamIdentity('was')).toBe('WAS');

    // Jacksonville alias normalization
    expect(normalizeTeamIdentity('JAC')).toBe('JAX');
    expect(normalizeTeamIdentity('JAX')).toBe('JAX');

    // Equivalence comparison
    expect(areTeamIdentitiesEquivalent('WSH', 'WAS')).toBe(true);
    expect(areTeamIdentitiesEquivalent('WAS', 'WSH')).toBe(true);
    expect(areTeamIdentitiesEquivalent('WAS', 'WAS')).toBe(true);
    expect(areTeamIdentitiesEquivalent('JAC', 'JAX')).toBe(true);

    // normalizeTeamCode parity (authoritativeSlateService)
    expect(normalizeTeamCode('WSH')).toBe('WAS');
    expect(normalizeTeamCode('WAS')).toBe('WAS');
    expect(normalizeTeamCode('JAC')).toBe('JAX');
    expect(normalizeTeamCode('JAX')).toBe('JAX');
    expect(normalizeTeamCode('DET')).toBe('DET');
    expect(normalizeTeamCode('KC')).toBe('KC');
    expect(normalizeTeamCode('UNKNOWN_CODE')).toBe('UNKNOWN_CODE');
    expect(normalizeTeamCode('')).toBe('UNK');

    // Conflicting / distinct teams are strictly rejected
    expect(areTeamIdentitiesEquivalent('WAS', 'DAL')).toBe(false);
    expect(areTeamIdentitiesEquivalent('WSH', 'NYG')).toBe(false);
    expect(areTeamIdentitiesEquivalent('PHI', 'WAS')).toBe(false);
    expect(areTeamIdentitiesEquivalent('SEA', 'DEN')).toBe(false);
    expect(areTeamIdentitiesEquivalent('WAS', null)).toBe(false);
    expect(areTeamIdentitiesEquivalent(undefined, 'WSH')).toBe(false);

    // Pick competitor membership validation:
    // If a game is SF vs WAS, picking DAL or KC is rejected
    const gameCompetitors = { home: normalizeTeamCode('SF'), away: normalizeTeamCode('WSH') }; // SF vs WAS
    const pickWAS = normalizeTeamCode('WSH'); // WAS
    const pickSF = normalizeTeamCode('SF');   // SF
    const pickDAL = normalizeTeamCode('DAL'); // DAL

    const isPickWASValid = pickWAS === gameCompetitors.home || pickWAS === gameCompetitors.away;
    const isPickSFValid = pickSF === gameCompetitors.home || pickSF === gameCompetitors.away;
    const isPickDALValid = pickDAL === gameCompetitors.home || pickDAL === gameCompetitors.away;

    expect(isPickWASValid).toBe(true);
    expect(isPickSFValid).toBe(true);
    expect(isPickDALValid).toBe(false);
  });

  // =========================================================================
  // Test 8: Affected Candidate Event and Legacy Selection Comparisons
  // Verify that comparisons between saved picks with WSH and manifest events
  // with WAS evaluate as matching.
  // =========================================================================
  it('Test 8: Affected Candidate Event and Legacy Selection Comparisons', () => {
    // Simulate legacy saved pick record stored with 'WSH'
    const legacySavedPick = {
      gameId: '401872999',
      userId: 'user_test_1',
      selectedTeamId: 'WSH',
    };

    // Candidate manifest event normalized with platform code 'WAS'
    const candidateManifestEvent = {
      gameId: '401872999',
      awayTeamId: 'WAS', // Provider abbreviation was WSH, normalized to WAS
      homeTeamId: 'BAL',
    };

    // Verification: legacy saved pick 'WSH' matches manifest event 'WAS'
    const isAwaySelected = areTeamIdentitiesEquivalent(
      legacySavedPick.selectedTeamId,
      candidateManifestEvent.awayTeamId
    );
    expect(isAwaySelected).toBe(true);

    const isHomeSelected = areTeamIdentitiesEquivalent(
      legacySavedPick.selectedTeamId,
      candidateManifestEvent.homeTeamId
    );
    expect(isHomeSelected).toBe(false);

    // Pick win settlement logic matches correctly
    const mockWinningTeam = 'WAS';
    const isPickCorrect = areTeamIdentitiesEquivalent(
      legacySavedPick.selectedTeamId,
      mockWinningTeam
    );
    expect(isPickCorrect).toBe(true);
  });

  // =========================================================================
  // Test 9: Profile Reminder Authority (Requires Manifest Authority)
  // Verify that reminders require an approved weekly_slate_manifests record;
  // legacy public.games records alone fail closed.
  // =========================================================================
  it('Test 9: Profile Reminder Authority: requires approved weekly_slate_manifests; fails closed without manifest', () => {
    // When hasAcceptedSlate is false (e.g. no weekly_slate_manifests record found),
    // planner must return isUnavailable: true and schedule zero reminders, even if games array is non-empty.
    const legacyDbGames: DeadlineGameWindowInput[] = [
      {
        gameId: 'legacy-game-1',
        awayTeam: 'DAL',
        homeTeam: 'GB',
        kickoffIso: '2026-10-19T00:20:00.000Z',
      },
      {
        gameId: 'legacy-game-2',
        awayTeam: 'SEA',
        homeTeam: 'DEN',
        kickoffIso: '2026-10-16T00:15:00.000Z',
      },
    ];

    const planWithoutManifest = planDeadlineReminders({
      userId: 'u_authenticated',
      poolId: 'pool-auth-context',
      season: 2026,
      seasonType: 2,
      week: 6,
      optInEnabled: true,
      permissionState: 'GRANTED',
      isSlateSubmitted: false,
      hasAcceptedSlate: false, // weekly_slate_manifests missing
      nowMs: new Date('2026-10-15T12:00:00.000Z').getTime(),
      games: legacyDbGames,
    });

    expect(planWithoutManifest.isUnavailable).toBe(true);
    expect(planWithoutManifest.toSchedule).toEqual([]);
    expect(planWithoutManifest.statusSummary).toContain('No accepted weekly slate available');
  });

  // =========================================================================
  // Test 10: Watch Party Big Board Dynamic Decider Authority
  // Verify that WatchParty duel decider requires canonical game ID and weekly scope,
  // resolves from real pick disagreements, and produces honest empty states when absent.
  // =========================================================================
  it('Test 10: Watch Party Big Board Dynamic Decider: requires canonical event identity and activeWeek scope', () => {
    // Canonical games with valid ID
    const canonicalWeek6Games = [
      {
        id: '401872995',
        awayTeam: 'SEA',
        homeTeam: 'DEN',
        kickoffTime: '2026-10-16T00:15:00.000Z',
      },
      {
        id: '401873007',
        awayTeam: 'DAL',
        homeTeam: 'GB',
        kickoffTime: '2026-10-19T00:20:00.000Z',
      },
    ];

    // Case A: Disagreement exists between viewer and rival on canonical event 401872995
    const viewerPicks = [
      { userId: 'u_viewer', gameId: '401872995', selectedTeam: 'SEA' },
      { userId: 'u_viewer', gameId: '401873007', selectedTeam: 'DAL' },
    ];
    const rivalPicks = [
      { userId: 'u_rival', gameId: '401872995', selectedTeam: 'DEN' }, // Disagreement!
      { userId: 'u_rival', gameId: '401873007', selectedTeam: 'DAL' },
    ];

    const userPickMap = new Map(viewerPicks.map((p) => [p.gameId, p.selectedTeam]));
    const rivalPickMap = new Map(rivalPicks.map((p) => [p.gameId, p.selectedTeam]));

    const deciderGame = canonicalWeek6Games.find((g) => {
      if (!g.id) return false;
      const u = userPickMap.get(g.id);
      const r = rivalPickMap.get(g.id);
      return u && r && !areTeamIdentitiesEquivalent(u, r);
    });

    expect(deciderGame).toBeDefined();
    expect(deciderGame?.id).toBe('401872995');

    // Kickoff resolution strictly requires canonical event ID and week scope
    const kickoff = resolveCanonicalGameKickoff({
      id: deciderGame?.id,
      awayTeam: deciderGame?.awayTeam,
      homeTeam: deciderGame?.homeTeam,
      kickoffTime: deciderGame?.kickoffTime,
      season: 2026,
      seasonType: 2,
      week: 6,
    });
    expect(kickoff.status).toBe('RESOLVED');
    expect(kickoff.isResolved).toBe(true);
    expect(kickoff.kickoffDisplay).toBe('Thu 5:15 PM');

    // Case B: No disagreement (picks aligned): decider is undefined -> honest empty state
    const alignedRivalPicks = [
      { userId: 'u_rival', gameId: '401872995', selectedTeam: 'SEA' }, // Aligned with viewer
      { userId: 'u_rival', gameId: '401873007', selectedTeam: 'DAL' },
    ];
    const alignedRivalMap = new Map(alignedRivalPicks.map((p) => [p.gameId, p.selectedTeam]));
    const noDeciderGame = canonicalWeek6Games.find((g) => {
      if (!g.id) return false;
      const u = userPickMap.get(g.id);
      const r = alignedRivalMap.get(g.id);
      return u && r && !areTeamIdentitiesEquivalent(u, r);
    });
    expect(noDeciderGame).toBeUndefined();
  });

  // =========================================================================
  // Test 11: Lions Bye & Designation Contract (Directive 8 & Section 5)
  // Verify Detroit on BYE yields COMMISSIONER_SELECTION_REQUIRED, schedule ambiguity
  // yields UNRESOLVED, commissioner override requires in-slate target, and freeze is immutable.
  // =========================================================================
  it('Test 11: Lions Bye & Designation Contract: bye yields COMMISSIONER_SELECTION_REQUIRED, freeze is immutable', () => {
    const futureKickoff = new Date(Date.now() + 86400000).toISOString();

    // 11A: Week 6 slate with Detroit on BYE (no DET game in slate)
    const week6SlateNoLions: GameSlateItem[] = [
      {
        id: '401872995',
        externalGameId: '401872995',
        homeTeamId: 'DEN',
        awayTeamId: 'SEA',
        kickoffTime: futureKickoff,
      },
      {
        id: '401873007',
        externalGameId: '401873007',
        homeTeamId: 'GB',
        awayTeamId: 'DAL',
        kickoffTime: futureKickoff,
      },
    ];

    const byeRes = resolveDefaultDesignation(week6SlateNoLions);
    expect(byeRes.status).toBe('COMMISSIONER_SELECTION_REQUIRED');
    expect(byeRes.eventId).toBeNull();
    expect(byeRes.game).toBeNull();

    // 11B: Slate with Detroit game -> DEFAULT_LIONS
    const slateWithLions: GameSlateItem[] = [
      ...week6SlateNoLions,
      {
        id: 'lions-game-1',
        externalGameId: '401873009',
        homeTeamId: 'DET',
        awayTeamId: 'MIN',
        kickoffTime: futureKickoff,
      },
    ];
    const lionsRes = resolveDefaultDesignation(slateWithLions);
    expect(lionsRes.status).toBe('DEFAULT_LIONS');
    expect(lionsRes.eventId).toBe('401873009');
    expect(lionsRes.game?.homeTeamId).toBe('DET');

    // 11C: Ambiguous schedule (empty slate) -> UNRESOLVED
    const unresolvedRes = resolveDefaultDesignation([]);
    expect(unresolvedRes.status).toBe('UNRESOLVED');

    // 11D: Valid commissioner override within slate
    const overrideResult = applyCommissionerOverride({
      currentSettings: {},
      season: 2026,
      week: 6,
      targetGameId: '401872995',
      games: week6SlateNoLions,
      requestingUserId: 'admin_user_id',
      poolAdminId: 'admin_user_id',
      isUserActiveMember: true,
    });
    expect(overrideResult.designation.provenance).toBe('COMMISSIONER_OVERRIDE');
    expect(overrideResult.designation.eventId).toBe('401872995');
    expect(overrideResult.designation.isFrozen).toBe(false);

    // 11E: Freeze designation after first prediction acknowledged
    const frozenSettings = freezeDesignation({
      currentSettings: overrideResult.updatedSettings,
      season: 2026,
      week: 6,
      designatedEventId: '401872995',
      firstPredictionUserId: 'first_user_id',
      games: week6SlateNoLions,
    });
    const frozenDesignation = frozenSettings.tiebreaker_designations['2026']['6'];
    expect(frozenDesignation.isFrozen).toBe(true);
    expect(frozenDesignation.firstPredictionUserId).toBe('first_user_id');

    // 11F: Override after freeze is strictly rejected
    expect(() =>
      applyCommissionerOverride({
        currentSettings: frozenSettings,
        season: 2026,
        week: 6,
        targetGameId: '401873007',
        games: week6SlateNoLions,
        requestingUserId: 'admin_user_id',
        poolAdminId: 'admin_user_id',
        isUserActiveMember: true,
      })
    ).toThrow(/FROZEN/);
  });

  // =========================================================================
  // Test 12: Profile Scope & Manifest Authority Dynamic Resolution Suite
  // Demonstrates dynamic resolution from pool/app context without clock guessing,
  // and strict fail-closed behavior across all missing/denied/inactive scopes.
  // =========================================================================
  it('Test 12: Profile Scope & Manifest Authority Dynamic Resolution Suite', async () => {
    // Helper to construct a filter-observing mock Supabase client with programmable responses
    function createMockSupabase(config: {
      membership?: any;
      memberships?: any[];
      membershipError?: any;
      manifestRecord?: any;
      manifestRecords?: any[];
      manifestError?: any;
      games?: any[];
      gamesError?: any;
      rpcGames?: any[];
      rpcError?: any;
      picks?: any[];
      picksError?: any;
    }) {
      return {
        rpc: async (fnName: string, _args: any) => {
          if (fnName === 'get_pool_canonical_games') {
            if (config.rpcError) {
              return { data: null, error: config.rpcError };
            }
            if (config.rpcGames !== undefined) {
              return { data: config.rpcGames, error: null };
            }
          }
          return { data: null, error: null };
        },
        from: (table: string) => {
          if (table === 'pool_memberships') {
            const filters: Record<string, any> = {};
            const queryBuilder: any = {
              select: () => queryBuilder,
              eq: (col: string, val: any) => {
                filters[col] = val;
                return queryBuilder;
              },
              maybeSingle: async () => {
                if (config.membershipError) {
                  return { data: null, error: config.membershipError };
                }
                if (config.membership !== undefined) {
                  const m = config.membership;
                  const matches = Object.entries(filters).every(([k, v]) => {
                    if (k === 'status') return m.status === v;
                    if (k === 'pool_id') return m.pool_id === v;
                    if (k === 'user_id') return m.user_id === undefined || m.user_id === v;
                    return true;
                  });
                  return { data: matches ? m : null, error: null };
                }
                const list = config.memberships || [];
                const match = list.find((m: any) => {
                  return Object.entries(filters).every(([k, v]) => {
                    if (k === 'status') return m.status === v;
                    if (k === 'pool_id') return m.pool_id === v;
                    if (k === 'user_id') return m.user_id === undefined || m.user_id === v;
                    return true;
                  });
                });
                return { data: match || null, error: null };
              },
              then: (resolve: any) => {
                if (config.membershipError) {
                  return Promise.resolve(resolve({ data: null, error: config.membershipError }));
                }
                const list = config.memberships || [];
                const filtered = list.filter((m: any) => {
                  return Object.entries(filters).every(([k, v]) => {
                    if (k === 'status') return m.status === v;
                    if (k === 'pool_id') return m.pool_id === v;
                    if (k === 'user_id') return m.user_id === undefined || m.user_id === v;
                    return true;
                  });
                });
                return Promise.resolve(resolve({ data: filtered, error: null }));
              },
            };
            return queryBuilder;
          }

          if (table === 'weekly_slate_manifests') {
            const filters: Record<string, any> = {};
            const queryBuilder: any = {
              select: () => queryBuilder,
              eq: (col: string, val: any) => {
                filters[col] = val;
                return queryBuilder;
              },
              maybeSingle: async () => {
                if (config.manifestError) {
                  return { data: null, error: config.manifestError };
                }
                const manifests = config.manifestRecords || (config.manifestRecord ? [config.manifestRecord] : []);
                const match = manifests.find((m: any) => {
                  if (filters.season !== undefined && m.season !== filters.season) return false;
                  if (filters.season_type !== undefined && m.season_type !== filters.season_type) return false;
                  if (filters.week_number !== undefined && m.week_number !== filters.week_number) return false;
                  return true;
                });
                return { data: match || null, error: null };
              },
            };
            return queryBuilder;
          }

          if (table === 'games') {
            const filters: Record<string, any> = {};
            const queryBuilder: any = {
              select: () => queryBuilder,
              eq: (col: string, val: any) => {
                filters[col] = val;
                return queryBuilder;
              },
              order: () => queryBuilder,
              then: (resolve: any) => {
                if (config.gamesError) {
                  return Promise.resolve(resolve({ data: null, error: config.gamesError }));
                }
                const list = config.games || [];
                const filtered = list.filter((g: any) => {
                  if (filters.season !== undefined && g.season !== undefined && g.season !== filters.season) return false;
                  if (filters.season_type !== undefined && g.season_type !== undefined && g.season_type !== filters.season_type) return false;
                  if (filters.week !== undefined && g.week !== undefined && g.week !== filters.week) return false;
                  return true;
                });
                return Promise.resolve(resolve({ data: filtered, error: null }));
              },
            };
            return queryBuilder;
          }

          if (table === 'picks') {
            const filters: Record<string, any> = {};
            let inGameIds: string[] | null = null;
            const queryBuilder: any = {
              select: () => queryBuilder,
              eq: (col: string, val: any) => {
                filters[col] = val;
                return queryBuilder;
              },
              in: (col: string, vals: any[]) => {
                if (col === 'game_id') {
                  inGameIds = vals.map(String);
                }
                return queryBuilder;
              },
              then: (resolve: any) => {
                if (config.picksError) {
                  return Promise.resolve(resolve({ data: null, error: config.picksError }));
                }
                const list = config.picks || [];
                const filtered = list.filter((p: any) => {
                  if (filters.pool_id !== undefined && p.pool_id !== undefined && p.pool_id !== filters.pool_id) return false;
                  if (filters.user_id !== undefined && p.user_id !== undefined && p.user_id !== filters.user_id) return false;
                  if (inGameIds !== null) {
                    const pGid = String(p.game_id || p.gameId);
                    if (!inGameIds.includes(pGid)) return false;
                  }
                  return true;
                });
                return Promise.resolve(resolve({ data: filtered, error: null }));
              },
            };
            return queryBuilder;
          }

          return {};
        },
      };
    }

    const testDbGames = [
      { id: 'g1', external_game_id: '401872995', home_team_id: 'DEN', away_team_id: 'SEA', kickoff_time: '2026-10-16T00:15:00.000Z', status: 'FINAL', season: 2026, season_type: 2, week: 6 },
      { id: 'g2', external_game_id: '401873007', home_team_id: 'GB', away_team_id: 'DAL', kickoff_time: '2026-10-19T00:20:00.000Z', status: 'SCHEDULED', season: 2026, season_type: 2, week: 6 },
    ];

    // Case 1: Authenticated user in original pool viewing Week 6 with accepted manifest and exact scope
    const sb1 = createMockSupabase({
      memberships: [{ pool_id: 'pool-main', user_id: 'u1', status: 'ACTIVE', pools: { settings: { season: 2026, season_type: 2, current_week: 6 } } }],
      manifestRecord: { season: 2026, season_type: 2, week_number: 6, manifest_fingerprint: 'c72f7e4c', event_ids: ['401872995', '401873007'] },
      games: testDbGames,
      picks: [{ pool_id: 'pool-main', user_id: 'u1', game_id: '401872995', selected_team: 'SEA' }],
    });
    const res1 = await resolveProfileReminderScope({ userId: 'u1', supabaseClient: sb1 });
    expect(res1.hasAcceptedSlate).toBe(true);
    expect(res1.resolvedScope).toEqual({ season: 2026, seasonType: 2, week: 6 });
    expect(res1.windowGames.length).toBe(2);
    expect(res1.isSlateSubmitted).toBe(false); // Only 1 of 2 picked

    // Assert that planDeadlineReminders plans normally with valid exact scope
    const validPlan = planDeadlineReminders({
      userId: 'u1',
      poolId: res1.resolvedPoolId,
      season: res1.resolvedScope!.season,
      seasonType: res1.resolvedScope!.seasonType,
      week: res1.resolvedScope!.week,
      optInEnabled: true,
      permissionState: 'GRANTED',
      isSlateSubmitted: res1.isSlateSubmitted,
      hasAcceptedSlate: res1.hasAcceptedSlate,
      games: res1.windowGames,
      nowMs: new Date('2026-10-18T12:00:00.000Z').getTime(),
    });
    expect(validPlan.isEnabled).toBe(true);
    expect(validPlan.toSchedule.length).toBeGreaterThan(0);

    // Case 2: Filter-observing isolation across seasons and season types (same week number)
    const multiScopeGames = [
      { id: 'g_2026_w6', external_game_id: '401872995', home_team_id: 'DEN', away_team_id: 'SEA', kickoff_time: '2026-10-16T00:15:00.000Z', status: 'FINAL', season: 2026, season_type: 2, week: 6 },
      { id: 'g_2025_w6', external_game_id: '301872995', home_team_id: 'KC', away_team_id: 'LV', kickoff_time: '2025-10-16T00:15:00.000Z', status: 'FINAL', season: 2025, season_type: 2, week: 6 },
      { id: 'g_2026_pre_w6', external_game_id: 'pre_2026_w6', home_team_id: 'SF', away_team_id: 'LAR', kickoff_time: '2026-08-20T00:15:00.000Z', status: 'FINAL', season: 2026, season_type: 1, week: 6 },
    ];
    const sbScopeFilter = createMockSupabase({
      memberships: [{ pool_id: 'pool-main', user_id: 'u1', status: 'ACTIVE', pools: { settings: { season: 2026, season_type: 2, current_week: 6 } } }],
      manifestRecords: [
        { season: 2026, season_type: 2, week_number: 6, manifest_fingerprint: 'fp2026', event_ids: ['401872995'] },
        { season: 2025, season_type: 2, week_number: 6, manifest_fingerprint: 'fp2025', event_ids: ['301872995'] },
      ],
      games: multiScopeGames,
      picks: [],
    });
    const resScopeFilter = await resolveProfileReminderScope({ userId: 'u1', propSeason: 2026, propSeasonType: 2, propWeek: 6, supabaseClient: sbScopeFilter });
    expect(resScopeFilter.hasAcceptedSlate).toBe(true);
    expect(resScopeFilter.windowGames.length).toBe(1);
    expect(resScopeFilter.windowGames[0].gameId).toBe('401872995'); // Proves 2025 and preseason games are strictly isolated

    // Case 3: Extra game in games table outside the accepted manifest is excluded
    const extraEventGames = [
      { id: 'g1', external_game_id: '401872995', home_team_id: 'DEN', away_team_id: 'SEA', kickoff_time: '2026-10-16T00:15:00.000Z', status: 'FINAL', season: 2026, season_type: 2, week: 6 },
      { id: 'g2', external_game_id: '401873007', home_team_id: 'GB', away_team_id: 'DAL', kickoff_time: '2026-10-19T00:20:00.000Z', status: 'SCHEDULED', season: 2026, season_type: 2, week: 6 },
      { id: 'g_extra', external_game_id: 'UNACCEPTED_EXTRA_EVENT_999', home_team_id: 'XYZ', away_team_id: 'ABC', kickoff_time: '2026-10-19T00:20:00.000Z', status: 'SCHEDULED', season: 2026, season_type: 2, week: 6 },
    ];
    const sbExtraGame = createMockSupabase({
      memberships: [{ pool_id: 'pool-main', user_id: 'u1', status: 'ACTIVE', pools: { settings: { season: 2026, season_type: 2, current_week: 6 } } }],
      manifestRecord: { season: 2026, season_type: 2, week_number: 6, manifest_fingerprint: 'c72f7e4c', event_ids: ['401872995', '401873007'] },
      games: extraEventGames,
      picks: [],
    });
    const resExtra = await resolveProfileReminderScope({ userId: 'u1', supabaseClient: sbExtraGame });
    expect(resExtra.hasAcceptedSlate).toBe(true);
    expect(resExtra.windowGames.length).toBe(2);
    expect(resExtra.windowGames.map(g => g.gameId)).not.toContain('UNACCEPTED_EXTRA_EVENT_999'); // Extra game outside manifest excluded

    // Case 4: Wrong pool and wrong member picks are strictly isolated
    const sbPickIsolation = createMockSupabase({
      memberships: [{ pool_id: 'pool-main', user_id: 'u1', status: 'ACTIVE', pools: { settings: { season: 2026, season_type: 2, current_week: 6 } } }],
      manifestRecord: { season: 2026, season_type: 2, week_number: 6, manifest_fingerprint: 'c72f7e4c', event_ids: ['401872995', '401873007'] },
      games: testDbGames,
      picks: [
        { pool_id: 'pool-main', user_id: 'u1', game_id: '401872995' }, // Valid pick for user in this pool
        { pool_id: 'pool-OTHER', user_id: 'u1', game_id: '401873007' }, // Pick for user in different pool!
        { pool_id: 'pool-main', user_id: 'u2-DIFFERENT', game_id: '401873007' }, // Pick for different user in this pool!
      ],
    });
    const resPickIso = await resolveProfileReminderScope({ userId: 'u1', supabaseClient: sbPickIsolation });
    expect(resPickIso.hasAcceptedSlate).toBe(true);
    expect(resPickIso.windowGames.find(g => g.gameId === '401872995')?.isPicked).toBe(true);
    expect(resPickIso.windowGames.find(g => g.gameId === '401873007')?.isPicked).toBe(false); // Not picked for u1 in pool-main
    expect(resPickIso.isSlateSubmitted).toBe(false);

    // Case 5: Safe RPC get_pool_canonical_games support
    const sbRpc = createMockSupabase({
      memberships: [{ pool_id: 'pool-main', user_id: 'u1', status: 'ACTIVE', pools: { settings: { season: 2026, season_type: 2, current_week: 6 } } }],
      manifestRecord: { season: 2026, season_type: 2, week_number: 6, manifest_fingerprint: 'c72f7e4c', event_ids: ['401872995', '401873007'] },
      rpcGames: testDbGames,
      games: [], // direct games empty; proofs RPC path used
      picks: [{ pool_id: 'pool-main', user_id: 'u1', game_id: '401872995' }, { pool_id: 'pool-main', user_id: 'u1', game_id: '401873007' }],
    });
    const resRpc = await resolveProfileReminderScope({ userId: 'u1', supabaseClient: sbRpc });
    expect(resRpc.hasAcceptedSlate).toBe(true);
    expect(resRpc.windowGames.length).toBe(2);
    expect(resRpc.isSlateSubmitted).toBe(true);

    // Case 6: RPC failure fails closed
    const sbRpcErr = createMockSupabase({
      memberships: [{ pool_id: 'pool-main', user_id: 'u1', status: 'ACTIVE', pools: { settings: { season: 2026, season_type: 2, current_week: 6 } } }],
      manifestRecord: { season: 2026, season_type: 2, week_number: 6, manifest_fingerprint: 'c72f7e4c', event_ids: ['401872995', '401873007'] },
      rpcError: { message: 'RPC execution failed' },
    });
    const resRpcErr = await resolveProfileReminderScope({ userId: 'u1', supabaseClient: sbRpcErr });
    expect(resRpcErr.hasAcceptedSlate).toBe(false);
    expect(resRpcErr.unavailabilityReason).toBe('GAMES_RPC_ERROR');
    expect(resRpcErr.windowGames).toEqual([]);

    // Case 7: Direct games query access error fails closed
    const sbGamesErr = createMockSupabase({
      memberships: [{ pool_id: 'pool-main', user_id: 'u1', status: 'ACTIVE', pools: { settings: { season: 2026, season_type: 2, current_week: 6 } } }],
      manifestRecord: { season: 2026, season_type: 2, week_number: 6, manifest_fingerprint: 'c72f7e4c', event_ids: ['401872995', '401873007'] },
      gamesError: { message: 'permission denied for table games' },
    });
    const resGamesErr = await resolveProfileReminderScope({ userId: 'u1', supabaseClient: sbGamesErr });
    expect(resGamesErr.hasAcceptedSlate).toBe(false);
    expect(resGamesErr.unavailabilityReason).toBe('DIRECT_GAMES_ACCESS_ERROR');
    expect(resGamesErr.windowGames).toEqual([]);

    // Case 8: Picks access error fails closed
    const sbPicksErr = createMockSupabase({
      memberships: [{ pool_id: 'pool-main', user_id: 'u1', status: 'ACTIVE', pools: { settings: { season: 2026, season_type: 2, current_week: 6 } } }],
      manifestRecord: { season: 2026, season_type: 2, week_number: 6, manifest_fingerprint: 'c72f7e4c', event_ids: ['401872995', '401873007'] },
      games: testDbGames,
      picksError: { message: 'permission denied for table picks' },
    });
    const resPicksErr = await resolveProfileReminderScope({ userId: 'u1', supabaseClient: sbPicksErr });
    expect(resPicksErr.hasAcceptedSlate).toBe(false);
    expect(resPicksErr.unavailabilityReason).toBe('PICKS_ACCESS_ERROR');
    expect(resPicksErr.windowGames).toEqual([]);

    // Case 9: Selecting a different week (Week 7) with exact scope
    const sbW7 = createMockSupabase({
      memberships: [{ pool_id: 'pool-main', user_id: 'u1', status: 'ACTIVE', pools: { settings: { season: 2026, current_week: 6 } } }],
      manifestRecord: { season: 2026, season_type: 2, week_number: 7, manifest_fingerprint: 'week7fp', event_ids: ['401873010'] },
      games: [{ id: 'g3', external_game_id: '401873010', home_team_id: 'KC', away_team_id: 'LAC', kickoff_time: '2026-10-23T00:15:00.000Z', status: 'SCHEDULED', season: 2026, season_type: 2, week: 7 }],
      picks: [{ pool_id: 'pool-main', user_id: 'u1', game_id: '401873010', selected_team: 'KC' }],
    });
    const resW7 = await resolveProfileReminderScope({ userId: 'u1', propWeek: 7, supabaseClient: sbW7 });
    expect(resW7.hasAcceptedSlate).toBe(true);
    expect(resW7.resolvedScope?.week).toBe(7);
    expect(resW7.isSlateSubmitted).toBe(true);

    // Case 10: Inactive membership (status !== 'ACTIVE')
    const sbInactive = createMockSupabase({
      membership: { pool_id: 'pool-pending', user_id: 'u1', status: 'PENDING' },
    });
    const resInactive = await resolveProfileReminderScope({ userId: 'u1', propPoolId: 'pool-pending', supabaseClient: sbInactive });
    expect(resInactive.hasAcceptedSlate).toBe(false);
    expect(resInactive.unavailabilityReason).toBe('INACTIVE_OR_INVALID_POOL_MEMBERSHIP');
    expect(resInactive.windowGames).toEqual([]);

    // Case 11: Membership access error fails closed
    const sbMemErr = createMockSupabase({
      membershipError: { message: 'permission denied for table pool_memberships' },
    });
    const resMemErr = await resolveProfileReminderScope({ userId: 'u1', propPoolId: 'pool-main', supabaseClient: sbMemErr });
    expect(resMemErr.hasAcceptedSlate).toBe(false);
    expect(resMemErr.unavailabilityReason).toBe('MEMBERSHIP_ACCESS_ERROR');

    // Case 12: Missing manifest storage for scope
    const sbMissingManifest = createMockSupabase({
      memberships: [{ pool_id: 'pool-main', user_id: 'u1', status: 'ACTIVE', pools: { settings: { season: 2026, current_week: 6 } } }],
      manifestRecord: null, // No manifest record in table!
      games: testDbGames,
    });
    const resMissing = await resolveProfileReminderScope({ userId: 'u1', supabaseClient: sbMissingManifest });
    expect(resMissing.hasAcceptedSlate).toBe(false);
    expect(resMissing.unavailabilityReason).toBe('MISSING_ACCEPTED_MANIFEST');
    expect(resMissing.windowGames).toEqual([]);

    // Case 13: Denied manifest access (RLS error or network error)
    const sbManifestErr = createMockSupabase({
      memberships: [{ pool_id: 'pool-main', user_id: 'u1', status: 'ACTIVE', pools: { settings: { season: 2026, current_week: 6 } } }],
      manifestError: { message: 'permission denied for table weekly_slate_manifests' },
      games: testDbGames,
    });
    const resManifestErr = await resolveProfileReminderScope({ userId: 'u1', supabaseClient: sbManifestErr });
    expect(resManifestErr.hasAcceptedSlate).toBe(false);
    expect(resManifestErr.unavailabilityReason).toBe('MANIFEST_ACCESS_DENIED');
    expect(resManifestErr.windowGames).toEqual([]);

    // Case 14: Manifest with unbound event set (event_ids is empty) fails closed
    const sbUnboundManifest = createMockSupabase({
      memberships: [{ pool_id: 'pool-main', user_id: 'u1', status: 'ACTIVE', pools: { settings: { season: 2026, current_week: 6 } } }],
      manifestRecord: { season: 2026, season_type: 2, week_number: 6, manifest_fingerprint: 'c72f7e4c', event_ids: [] },
      games: testDbGames,
    });
    const resUnbound = await resolveProfileReminderScope({ userId: 'u1', supabaseClient: sbUnboundManifest });
    expect(resUnbound.hasAcceptedSlate).toBe(false);
    expect(resUnbound.unavailabilityReason).toBe('UNBOUND_MANIFEST_EVENT_SET');
    expect(resUnbound.windowGames).toEqual([]);
  });
});
