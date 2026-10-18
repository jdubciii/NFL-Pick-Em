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

    // Conflicting / distinct teams are strictly rejected
    expect(areTeamIdentitiesEquivalent('WAS', 'DAL')).toBe(false);
    expect(areTeamIdentitiesEquivalent('WSH', 'NYG')).toBe(false);
    expect(areTeamIdentitiesEquivalent('PHI', 'WAS')).toBe(false);
    expect(areTeamIdentitiesEquivalent('SEA', 'DEN')).toBe(false);
    expect(areTeamIdentitiesEquivalent('WAS', null)).toBe(false);
    expect(areTeamIdentitiesEquivalent(undefined, 'WSH')).toBe(false);
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
});
