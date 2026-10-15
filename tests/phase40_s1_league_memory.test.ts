import { describe, it, expect } from 'vitest';
import {
  buildPersonalRootingQueue,
  evaluateLateGameEscape,
  getTeamIndefiniteArticle,
} from '../src/services/dependableInfoService';
import {
  createEmptyReceiptSession,
  observeProjectionSnapshot,
  ProjectionSnapshot,
} from '../src/services/sweatReceiptService';
import {
  deriveSeasonStoryViewModel,
  AuthoritativeWeeklyStandingRow,
} from '../src/services/seasonStoryService';
import {
  buildDeterministicWeeklyRecap,
  SettledParticipantSummary,
} from '../src/services/weeklyRecapService';

describe('Phase 40 Sprint 1 (P40-S1): League Memory, Sweat Receipts & Authoritative Story', () => {
  it('1. Arbiter Opening Corrections: indefinite articles, rival display name, duel margin movement, and bounded escape scenario gating', () => {
    // A. Indefinite article grammar helper
    expect(getTeamIndefiniteArticle('ATL')).toBe('An');
    expect(getTeamIndefiniteArticle('ARI')).toBe('An');
    expect(getTeamIndefiniteArticle('IND')).toBe('An');
    expect(getTeamIndefiniteArticle('SEA')).toBe('A');
    expect(getTeamIndefiniteArticle('DEN')).toBe('A');

    // B. Rooting queue with rival display name and nonzero baseline gap
    const queueGames = [
      {
        gameId: 'g1',
        awayTeam: 'ATL',
        homeTeam: 'DEN',
        viewerPick: 'ATL',
        rivalPick: 'DEN',
        status: 'SCHEDULED',
        changesTier: true,
      },
      {
        gameId: 'g2',
        awayTeam: 'SEA',
        homeTeam: 'CHI',
        viewerPick: 'SEA',
        rivalPick: 'CHI',
        status: 'SCHEDULED',
        changesTier: true,
      },
    ];

    // Gap is 0 -> moves from 0 to +1 pt
    const queueTied = buildPersonalRootingQueue(queueGames, {
      maxItems: 2,
      rivalDisplayName: 'jcone2',
      currentViewerGap: 0,
    });
    expect(queueTied[0].consequenceNote).toBe('An ATL win moves your duel margin vs. jcone2 from 0 to +1 pt');
    expect(queueTied[0].consequenceNote).not.toContain('ahead of DEN');

    // Gap is -2 -> moves from -2 to -1 pt
    const queueBehind = buildPersonalRootingQueue(queueGames, {
      maxItems: 2,
      rivalDisplayName: 'jcone2',
      currentViewerGap: -2,
    });
    expect(queueBehind[1].consequenceNote).toBe('A SEA win moves your duel margin vs. jcone2 from -2 to -1 pt');

    // C. Bounded Late-Game Escape Scenario Gating
    // 1) Simulation excluded
    const simEscape = evaluateLateGameEscape({
      viewerPoints: 8,
      targetSafePoints: 9,
      remainingDisagreementGames: [
        { gameId: 'g1', awayTeam: 'ATL', homeTeam: 'DEN', viewerPick: 'ATL' },
      ],
      isSimulation: true,
    });
    expect(simEscape.scenarioMode).toBe('SIMULATION_EXCLUDED');
    expect(simEscape.canClaimExactClinch).toBe(false);
    expect(simEscape.headline).toContain('Sandbox Simulation Active');

    // 2) Mid-slate guidance when > 2 disagreement games remain
    const midSlateEscape = evaluateLateGameEscape({
      viewerPoints: 8,
      targetSafePoints: 10,
      remainingDisagreementGames: [
        { gameId: 'g1', awayTeam: 'ATL', homeTeam: 'DEN', viewerPick: 'ATL' },
        { gameId: 'g2', awayTeam: 'SEA', homeTeam: 'CHI', viewerPick: 'SEA' },
        { gameId: 'g3', awayTeam: 'SF', homeTeam: 'LAR', viewerPick: 'SF' },
      ],
    });
    expect(midSlateEscape.scenarioMode).toBe('MID_SLATE_GUIDANCE');
    expect(midSlateEscape.canClaimExactClinch).toBe(false);
    expect(midSlateEscape.headline).toContain('Mid-Slate Rooting Guidance (3 Split Games Open)');

    // 3) Head-to-head duel scoping when activeMemberCount > 2
    const duelScopedEscape = evaluateLateGameEscape({
      viewerPoints: 8,
      targetSafePoints: 9,
      remainingDisagreementGames: [
        { gameId: 'g1', awayTeam: 'ATL', homeTeam: 'DEN', viewerPick: 'ATL' },
      ],
      activeMemberCount: 10,
      holdsTiebreakerEdge: true,
    });
    expect(duelScopedEscape.canClaimExactClinch).toBe(true);
    expect(duelScopedEscape.headline).toContain('Duel Escape Path');

    // 4) Exact clinch unlocked when 1-2 games remain
    const clinchEscape = evaluateLateGameEscape({
      viewerPoints: 8,
      targetSafePoints: 9,
      remainingDisagreementGames: [
        { gameId: 'g1', awayTeam: 'ATL', homeTeam: 'DEN', viewerPick: 'ATL' },
      ],
      holdsTiebreakerEdge: true,
    });
    expect(clinchEscape.canClaimExactClinch).toBe(true);
    expect(clinchEscape.scenarioMode).toBe('EXACT_CLINCH');
  });

  it('2. Session Sweat Receipts: baseline suppression, duplicate suppression, transitions, attribution, context switch reset, and simulation exclusion', () => {
    let session = createEmptyReceiptSession();

    const baseSnapshot: ProjectionSnapshot = {
      poolId: 'pool-main',
      week: 6,
      viewerId: 'u1',
      viewerName: 'You',
      rivalId: 'u2',
      rivalName: 'jcone2',
      viewerPoints: 5,
      rivalPoints: 5,
      viewerProjectedTier: 'SAFE HAVEN',
      isSimulation: false,
      isStale: false,
      observedAtIso: '2026-10-14T20:00:00Z',
    };

    // 1) First load: baseline established, zero receipts emitted
    session = observeProjectionSnapshot(session, baseSnapshot);
    expect(session.receipts.length).toBe(0);
    expect(session.baselineSnapshot).not.toBeNull();

    // 2) Duplicate / unchanged refresh: zero receipts emitted
    session = observeProjectionSnapshot(session, {
      ...baseSnapshot,
      observedAtIso: '2026-10-14T20:00:30Z',
    });
    expect(session.receipts.length).toBe(0);

    // 3) Lead change transition: viewer takes lead (+1) triggered by 1 game
    session = observeProjectionSnapshot(session, {
      ...baseSnapshot,
      viewerPoints: 6,
      observedAtIso: '2026-10-14T20:01:00Z',
      changedGames: [{ gameId: 'g1', matchupLabel: 'SEA vs. DEN' }],
    });
    expect(session.receipts.length).toBe(1);
    expect(session.receipts[0].transitionType).toBe('TOOK_LEAD');
    expect(session.receipts[0].headline).toBe('You took a +1 pt lead over jcone2');
    expect(session.receipts[0].attributionLabel).toBe('Triggered by SEA vs. DEN');
    expect(session.receipts[0].provisionalBadge).toBe('PROVISIONAL SESSION RECEIPT');

    // 4) Lost lead transition: rival overtakes viewer (-1) triggered simultaneously by multiple games
    session = observeProjectionSnapshot(session, {
      ...baseSnapshot,
      viewerPoints: 6,
      rivalPoints: 7,
      viewerProjectedTier: 'DANGER ZONE',
      observedAtIso: '2026-10-14T20:02:00Z',
      changedGames: [
        { gameId: 'g1', matchupLabel: 'SEA vs. DEN' },
        { gameId: 'g2', matchupLabel: 'CHI vs. ATL' },
      ],
    });
    expect(session.receipts.length).toBe(2);
    expect(session.receipts[0].transitionType).toBe('LOST_LEAD');
    expect(session.receipts[0].headline).toBe('jcone2 took the lead (-1) against You');
    expect(session.receipts[0].attributionLabel).toContain('Multi-game scoreboard update (2 games updated simultaneously)');

    // 5) Simulation snapshot: strictly excluded (no new receipts, session unchanged)
    const countBeforeSim = session.receipts.length;
    session = observeProjectionSnapshot(session, {
      ...baseSnapshot,
      viewerPoints: 10,
      isSimulation: true,
      observedAtIso: '2026-10-14T20:03:00Z',
    });
    expect(session.receipts.length).toBe(countBeforeSim);

    // 6) Stale snapshot: strictly excluded
    session = observeProjectionSnapshot(session, {
      ...baseSnapshot,
      viewerPoints: 10,
      isStale: true,
      observedAtIso: '2026-10-14T20:04:00Z',
    });
    expect(session.receipts.length).toBe(countBeforeSim);

    // 7) Context switch reset (e.g. week changed or rival switched)
    const switchedContextSnapshot: ProjectionSnapshot = {
      ...baseSnapshot,
      week: 7,
      observedAtIso: '2026-10-14T20:05:00Z',
    };
    session = observeProjectionSnapshot(session, switchedContextSnapshot);
    expect(session.receipts.length).toBe(0); // Receipts reset on context change
    expect(session.contextKey).toContain('w7');
  });

  it('3. Season Story Service: distinct states, blocks uncertified settlements, preserves tied ranks, and separates charges from debt', () => {
    // 1) LOADING state
    const loadingModel = deriveSeasonStoryViewModel({
      isLoading: true,
      poolId: 'pool-main',
      viewerUserId: 'u1',
    });
    expect(loadingModel.status).toBe('LOADING');
    expect(loadingModel.totalCorrectPicks).toBeNull();
    expect(loadingModel.accuracyPercentLabel).toBe('—');

    // 2) UNAVAILABLE_ERROR state (never coerced to 0)
    const errorModel = deriveSeasonStoryViewModel({
      isLoading: false,
      fetchError: 'Database connection failed',
      poolId: 'pool-main',
      viewerUserId: 'u1',
      currentOutstandingShotDebt: 2,
    });
    expect(errorModel.status).toBe('UNAVAILABLE_ERROR');
    expect(errorModel.totalCorrectPicks).toBeNull();
    expect(errorModel.accuracyPercentLabel).toBe('Unavailable');
    expect(errorModel.outstandingShotDebtLabel).toBe('2 shots');

    // 3) EMPTY_SETTLED_HISTORY state (honest 0 settled weeks)
    const emptyModel = deriveSeasonStoryViewModel({
      isLoading: false,
      poolId: 'pool-main',
      viewerUserId: 'u1',
      rawRecords: [],
      currentOutstandingShotDebt: 0,
    });
    expect(emptyModel.status).toBe('EMPTY_SETTLED_HISTORY');
    expect(emptyModel.settledWeeksCount).toBe(0);
    expect(emptyModel.headline).toContain('No Settled Weeks on Record Yet');
    expect(emptyModel.accuracyPercentLabel).toBe('No settled slates');

    // 4) Blocks unsettled records (e.g. ESPN games are FINAL but isOfficiallySettled is false)
    const unsettledRecords: AuthoritativeWeeklyStandingRow[] = [
      {
        season: 2026,
        week: 6,
        poolId: 'pool-main',
        userId: 'u1',
        displayName: 'You',
        rank: 1,
        isTiedRank: false,
        participantCount: 2,
        correctPicks: 10,
        totalGames: 14,
        weeklyShotsIncurred: 0,
        tierName: 'SAFE HAVEN',
        isOfficiallySettled: false, // Unsettled!
      },
    ];
    const blockedModel = deriveSeasonStoryViewModel({
      isLoading: false,
      poolId: 'pool-main',
      viewerUserId: 'u1',
      rawRecords: unsettledRecords,
    });
    expect(blockedModel.status).toBe('EMPTY_SETTLED_HISTORY');
    expect(blockedModel.settledWeeksCount).toBe(0);

    // 5) SETTLED_HISTORY state: preserves tied ranks, field size, and separates weekly charges from debt
    const settledRecords: AuthoritativeWeeklyStandingRow[] = [
      {
        season: 2026,
        week: 1,
        poolId: 'pool-main',
        userId: 'u1',
        displayName: 'You',
        rank: 1,
        isTiedRank: true,
        participantCount: 10,
        correctPicks: 11,
        totalGames: 16,
        weeklyShotsIncurred: 0,
        tierName: 'SAFE HAVEN',
        isOfficiallySettled: true,
        settlementRevision: '1',
      },
      {
        season: 2026,
        week: 2,
        poolId: 'pool-main',
        userId: 'u1',
        displayName: 'You',
        rank: 5,
        isTiedRank: false,
        participantCount: 10,
        correctPicks: 8,
        totalGames: 16,
        weeklyShotsIncurred: 1,
        tierName: 'DANGER ZONE',
        isOfficiallySettled: true,
        settlementRevision: '2',
      },
    ];

    const settledModel = deriveSeasonStoryViewModel({
      isLoading: false,
      poolId: 'pool-main',
      viewerUserId: 'u1',
      rawRecords: settledRecords,
      currentOutstandingShotDebt: 3, // Different from cumulative weekly charges (1) due to prior penalty carryover
    });

    expect(settledModel.status).toBe('SETTLED_HISTORY');
    expect(settledModel.settledWeeksCount).toBe(2);
    expect(settledModel.totalCorrectPicks).toBe(19);
    expect(settledModel.totalGradedGames).toBe(32);
    expect(settledModel.accuracyPercentLabel).toBe('59.4% (19/32)');
    expect(settledModel.safeHavenFinishes).toBe(1);
    expect(settledModel.totalWeeklyChargesLabel).toBe('1 shot');
    expect(settledModel.outstandingShotDebtLabel).toBe('3 shots');

    // Check weekly nodes
    expect(settledModel.weeklyNodes[0].rankLabel).toBe('T-#1');
    expect(settledModel.weeklyNodes[0].participationBadge).toBe('10-Player Field');
    expect(settledModel.weeklyNodes[0].settlementRevisionLabel).toBe('Rev 1');

    expect(settledModel.weeklyNodes[1].rankLabel).toBe('#5');
    expect(settledModel.weeklyNodes[1].settlementRevisionLabel).toBe('Rev 2');
  });

  it('4. Weekly Recap Service: blocks unsettled cards, handles co-winners, revisions, and sanitizes email domains and MAIN26 invite codes', () => {
    const rawParticipants: SettledParticipantSummary[] = [
      {
        userId: 'u1',
        displayName: 'jack.w.cone@gmail.com',
        rank: 1,
        points: 10,
        totalGames: 14,
        shotsIncurred: 0,
        tierName: 'SAFE HAVEN',
        tiebreakResolved: true,
      },
      {
        userId: 'u2',
        displayName: 'jcone2 MAIN26',
        rank: 1,
        points: 10,
        totalGames: 14,
        shotsIncurred: 0,
        tierName: 'SAFE HAVEN',
        tiebreakResolved: false, // Tiebreak pending
      },
      {
        userId: 'u3',
        displayName: 'competitor3',
        rank: 3,
        points: 7,
        totalGames: 14,
        shotsIncurred: 1,
        tierName: 'DANGER ZONE',
        tiebreakResolved: true,
      },
    ];

    // 1) Unsettled card: official export blocked
    const unsettledRecap = buildDeterministicWeeklyRecap({
      format: 'LEAGUE_VERDICT',
      week: 6,
      isOfficiallySettled: false,
      participants: rawParticipants,
    });
    expect(unsettledRecap.canExportOfficialVerdict).toBe(false);
    expect(unsettledRecap.headerStamp).toBe('AWAITING OFFICIAL SETTLEMENT');
    expect(unsettledRecap.settlementBasisLabel).toContain('Unsettled Slate');

    // 2) Settled co-winners with tiebreak pending
    const settledCoWinners = buildDeterministicWeeklyRecap({
      format: 'LEAGUE_VERDICT',
      week: 6,
      isOfficiallySettled: true,
      settlementRevision: '2',
      participants: rawParticipants,
    });
    expect(settledCoWinners.canExportOfficialVerdict).toBe(true);
    expect(settledCoWinners.headerStamp).toBe('THE WEEKLY VERDICT');
    expect(settledCoWinners.settlementBasisLabel).toContain('Revision 2');
    expect(settledCoWinners.primaryHeadline).toContain('Co-Leaders');
    expect(settledCoWinners.primaryHeadline).toContain('Tiebreak Pending');

    // 3) PII and Invite code sanitization: @gmail.com stripped and MAIN26 stripped
    expect(settledCoWinners.primaryHeadline).not.toContain('@gmail.com');
    expect(settledCoWinners.primaryHeadline).toContain('jack.w.cone');
    expect(settledCoWinners.primaryHeadline).not.toContain('MAIN26');

    // 4) Rivalry Result Format
    const rivalryRecap = buildDeterministicWeeklyRecap({
      format: 'RIVALRY_RESULT',
      week: 6,
      isOfficiallySettled: true,
      settlementRevision: '1',
      participants: rawParticipants,
      viewerUserId: 'u1',
      rivalUserId: 'u3',
    });
    expect(rivalryRecap.canExportOfficialVerdict).toBe(true);
    expect(rivalryRecap.headerStamp).toBe('RIVALRY RESULT');
    expect(rivalryRecap.primaryHeadline).toBe('jack.w.cone defeats competitor3 (10–7)');
    expect(rivalryRecap.statRows.find((r) => r.label === 'Net Duel Margin')?.value).toBe('+3 pts');
    expect(rivalryRecap.footerWatermark).not.toContain('@gmail.com');
  });
});
