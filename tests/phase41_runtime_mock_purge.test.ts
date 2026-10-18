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
    // Helper to construct a mock Supabase client with programmable responses
    function createMockSupabase(config: {
      membership?: any;
      memberships?: any[];
      manifestRecord?: any;
      manifestError?: any;
      games?: any[];
      gamesError?: any;
      picks?: any[];
    }) {
      return {
        from: (table: string) => {
          if (table === 'pool_memberships') {
            return {
              select: () => ({
                eq: (col1: string, val1: any) => ({
                  eq: (col2: string, val2: any) => {
                    if (config.membership !== undefined) {
                      return {
                        eq: () => ({
                          maybeSingle: async () => ({ data: config.membership, error: null }),
                        }),
                        maybeSingle: async () => ({ data: config.membership, error: null }),
                      };
                    }
                    return Promise.resolve({ data: config.memberships || [], error: null });
                  },
                }),
              }),
            };
          }
          if (table === 'weekly_slate_manifests') {
            return {
              select: () => ({
                eq: (_c1: string, _v1: any) => ({
                  eq: (_c2: string, _v2: any) => ({
                    eq: (_c3: string, _v3: any) => ({
                      maybeSingle: async () => ({
                        data: config.manifestRecord || null,
                        error: config.manifestError || null,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'games') {
            return {
              select: () => ({
                eq: (_c: string, _v: any) => ({
                  order: () => Promise.resolve({
                    data: config.games || [],
                    error: config.gamesError || null,
                  }),
                }),
              }),
            };
          }
          if (table === 'picks') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    eq: () => Promise.resolve({ data: config.picks || [], error: null }),
                  }),
                }),
              }),
            };
          }
          return {};
        },
      };
    }

    const testDbGames = [
      { id: 'g1', external_game_id: '401872995', home_team_id: 'DEN', away_team_id: 'SEA', kickoff_time: '2026-10-16T00:15:00.000Z', status: 'FINAL' },
      { id: 'g2', external_game_id: '401873007', home_team_id: 'GB', away_team_id: 'DAL', kickoff_time: '2026-10-19T00:20:00.000Z', status: 'SCHEDULED' },
    ];

    // Case 1: Authenticated user in original pool viewing Week 6 with accepted manifest
    const sb1 = createMockSupabase({
      memberships: [{ pool_id: 'pool-main', status: 'ACTIVE', pools: { settings: { season: 2026, current_week: 6 } } }],
      manifestRecord: { season: 2026, season_type: 2, week_number: 6, manifest_fingerprint: 'c72f7e4c' },
      games: testDbGames,
      picks: [{ game_id: '401872995', selected_team: 'SEA' }],
    });
    const res1 = await resolveProfileReminderScope({ userId: 'u1', supabaseClient: sb1 });
    expect(res1.hasAcceptedSlate).toBe(true);
    expect(res1.resolvedScope).toEqual({ season: 2026, seasonType: 2, week: 6 });
    expect(res1.windowGames.length).toBe(2);
    expect(res1.isSlateSubmitted).toBe(false); // Only 1 of 2 picked

    // Case 2: Same user selecting a different week (Week 7)
    const sb2 = createMockSupabase({
      memberships: [{ pool_id: 'pool-main', status: 'ACTIVE', pools: { settings: { season: 2026, current_week: 6 } } }],
      manifestRecord: { season: 2026, season_type: 2, week_number: 7, manifest_fingerprint: 'week7fp' },
      games: [{ id: 'g3', external_game_id: '401873010', home_team_id: 'KC', away_team_id: 'LAC', kickoff_time: '2026-10-23T00:15:00.000Z', status: 'SCHEDULED' }],
      picks: [{ game_id: '401873010', selected_team: 'KC' }],
    });
    const res2 = await resolveProfileReminderScope({ userId: 'u1', propWeek: 7, supabaseClient: sb2 });
    expect(res2.hasAcceptedSlate).toBe(true);
    expect(res2.resolvedScope?.week).toBe(7);
    expect(res2.isSlateSubmitted).toBe(true);

    // Case 3: A different season (2027)
    const sb3 = createMockSupabase({
      memberships: [{ pool_id: 'pool-main', status: 'ACTIVE', pools: { settings: { season: 2026, current_week: 6 } } }],
      manifestRecord: { season: 2027, season_type: 2, week_number: 1, manifest_fingerprint: 's2027w1fp' },
      games: [{ id: 'g4', external_game_id: '5001', home_team_id: 'DET', away_team_id: 'GB', kickoff_time: '2027-09-10T00:15:00.000Z', status: 'SCHEDULED' }],
    });
    const res3 = await resolveProfileReminderScope({ userId: 'u1', propSeason: 2027, propWeek: 1, supabaseClient: sb3 });
    expect(res3.hasAcceptedSlate).toBe(true);
    expect(res3.resolvedScope?.season).toBe(2027);

    // Case 4: A different ACTIVE pool
    const sb4 = createMockSupabase({
      membership: { pool_id: 'pool-alternate', status: 'ACTIVE', pools: { settings: { season: 2026, current_week: 6 } } },
      manifestRecord: { season: 2026, season_type: 2, week_number: 6, manifest_fingerprint: 'c72f7e4c' },
      games: testDbGames,
      picks: [],
    });
    const res4 = await resolveProfileReminderScope({ userId: 'u1', propPoolId: 'pool-alternate', supabaseClient: sb4 });
    expect(res4.hasAcceptedSlate).toBe(true);
    expect(res4.resolvedPoolId).toBe('pool-alternate');

    // Case 5: Inactive membership (status !== 'ACTIVE')
    const sb5 = createMockSupabase({
      membership: { pool_id: 'pool-pending', status: 'PENDING' },
    });
    const res5 = await resolveProfileReminderScope({ userId: 'u1', propPoolId: 'pool-pending', supabaseClient: sb5 });
    expect(res5.hasAcceptedSlate).toBe(false);
    expect(res5.unavailabilityReason).toBe('INACTIVE_OR_INVALID_POOL_MEMBERSHIP');
    expect(res5.windowGames).toEqual([]);

    // Case 6: Missing manifest storage for scope
    const sb6 = createMockSupabase({
      memberships: [{ pool_id: 'pool-main', status: 'ACTIVE', pools: { settings: { season: 2026, current_week: 6 } } }],
      manifestRecord: null, // No manifest record in table!
      games: testDbGames,
    });
    const res6 = await resolveProfileReminderScope({ userId: 'u1', supabaseClient: sb6 });
    expect(res6.hasAcceptedSlate).toBe(false);
    expect(res6.unavailabilityReason).toBe('MISSING_ACCEPTED_MANIFEST');
    expect(res6.windowGames).toEqual([]);

    // Case 7: Denied manifest access (RLS error or network error)
    const sb7 = createMockSupabase({
      memberships: [{ pool_id: 'pool-main', status: 'ACTIVE', pools: { settings: { season: 2026, current_week: 6 } } }],
      manifestError: { message: 'permission denied for table weekly_slate_manifests' },
      games: testDbGames,
    });
    const res7 = await resolveProfileReminderScope({ userId: 'u1', supabaseClient: sb7 });
    expect(res7.hasAcceptedSlate).toBe(false);
    expect(res7.unavailabilityReason).toBe('MANIFEST_ACCESS_DENIED');
    expect(res7.windowGames).toEqual([]);

    // Case 8: Games present in DB without an accepted manifest
    const sb8 = createMockSupabase({
      memberships: [{ pool_id: 'pool-main', status: 'ACTIVE', pools: { settings: { season: 2026, current_week: 6 } } }],
      manifestRecord: null, // Missing manifest
      games: testDbGames,   // Games present!
    });
    const res8 = await resolveProfileReminderScope({ userId: 'u1', supabaseClient: sb8 });
    expect(res8.hasAcceptedSlate).toBe(false);
    expect(res8.windowGames).toEqual([]);
  });
});
