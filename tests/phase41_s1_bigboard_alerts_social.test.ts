import { describe, it, expect } from 'vitest';
import {
  evaluateLateGameEscape,
  DisagreementGameInput,
} from '../src/services/dependableInfoService';
import {
  sanitizeDisplayHandle,
  buildDeterministicWeeklyRecap,
  SettledParticipantSummary,
} from '../src/services/weeklyRecapService';
import {
  planDeadlineReminders,
  DeadlineGameWindowInput,
} from '../src/services/deadlineAlertPlanner';
import {
  validateCanonicalReactionTarget,
  applyIdempotentReactionMutation,
  summarizeReactionsForTarget,
  CanonicalReactionTarget,
  ReactionEntry,
} from '../src/services/poolSocialService';

describe('Phase 41 Sprint 1 (P41-S1): Big Board, Alerts & Social Foundation', () => {
  // =========================================================================
  // TEST 1: P40 Follow-Ups — Escape Arithmetic & Live Contribution Replacement
  // =========================================================================
  it('1. P40 Follow-Ups: Escape arithmetic, terminal states, and live contribution replacement', () => {
    // 1A. Impossible Escape (baseDeficit > remCount)
    const impossibleGames: DisagreementGameInput[] = [
      {
        gameId: 'g1',
        awayTeam: 'KC',
        homeTeam: 'SF',
        viewerPick: 'SF',
      },
    ];
    const impossible = evaluateLateGameEscape({
      viewerPoints: 8,
      targetSafePoints: 11,
      remainingDisagreementGames: impossibleGames,
      holdsTiebreakerEdge: true,
      activeMemberCount: 2,
    });
    expect(impossible.canMathematicallyEscape).toBe(false);
    expect(impossible.canClaimExactClinch).toBe(false);
    expect(impossible.scenarioMode).toBe('IMPOSSIBLE_ESCAPE');
    expect(impossible.headline).toBe('Mathematical Clinch Against');
    expect(impossible.requirementSummary).toContain('mathematically impossible');

    // 1B. Tie-Only Ceiling (baseDeficit === remCount with lost tiebreaker)
    const tieOnly = evaluateLateGameEscape({
      viewerPoints: 9,
      targetSafePoints: 10,
      remainingDisagreementGames: impossibleGames,
      holdsTiebreakerEdge: false,
      activeMemberCount: 2,
    });
    expect(tieOnly.canMathematicallyEscape).toBe(false);
    expect(tieOnly.canClaimExactClinch).toBe(false);
    expect(tieOnly.scenarioMode).toBe('TIE_ONLY_NO_TIEBREAKER');
    expect(tieOnly.headline).toBe('Point Tie Ceiling Only (Tiebreaker Lost)');
    expect(tieOnly.requirementSummary).toContain('rival holds the tiebreaker edge');

    // 1C. Live Contribution Replacement (avoid double-counting currently credited live points)
    // Suppose viewer has 10 points and rival has 10 points (rawDeficit = 0).
    // But 1 point of viewer's total is currently credited from game g_live.
    // When evaluating hypothetical branches, that 1 live point must be subtracted before applying outcomes.
    const liveDisagreement: DisagreementGameInput[] = [
      {
        gameId: 'g_live',
        awayTeam: 'SEA',
        homeTeam: 'DEN',
        viewerPick: 'SEA',
        currentlyCreditedToViewer: true,
        currentlyCreditedToRival: false,
      },
    ];
    const liveReplacement = evaluateLateGameEscape({
      viewerPoints: 10,
      targetSafePoints: 10,
      remainingDisagreementGames: liveDisagreement,
      holdsTiebreakerEdge: false,
      activeMemberCount: 2,
    });
    // With netCredited = 1, baseDeficit becomes 1 instead of 0!
    // Since baseDeficit === 1 and remCount === 1, with holdsTiebreakerEdge: false, it is TIE_ONLY_NO_TIEBREAKER
    expect(liveReplacement.viewerPointDeficit).toBe(1);
    expect(liveReplacement.scenarioMode).toBe('TIE_ONLY_NO_TIEBREAKER');

    // Also test with explicit currentCreditedDiffFromRemaining:
    const explicitReplacement = evaluateLateGameEscape({
      viewerPoints: 10,
      targetSafePoints: 10,
      remainingDisagreementGames: [
        { gameId: 'g2', awayTeam: 'BUF', homeTeam: 'NYJ', viewerPick: 'BUF' },
      ],
      currentCreditedDiffFromRemaining: 2,
      activeMemberCount: 2,
    });
    expect(explicitReplacement.viewerPointDeficit).toBe(2);
    expect(explicitReplacement.scenarioMode).toBe('IMPOSSIBLE_ESCAPE');
  });

  // =========================================================================
  // TEST 2: P40 Follow-Ups — Recap Handle Sanitization & Burned-In Demo Flag
  // =========================================================================
  it('2. P40 Follow-Ups: Recap handle sanitization, verb agreement, and demo watermark', () => {
    // 2A. Never allow viewer-relative pronoun "You" to appear on exported card
    expect(sanitizeDisplayHandle('You', 'jack.w.cone')).toBe('jack.w.cone');
    expect(sanitizeDisplayHandle('you', 'jack.w.cone')).toBe('jack.w.cone');
    expect(sanitizeDisplayHandle('   You   ', 'jack.w.cone')).toBe('jack.w.cone');
    expect(sanitizeDisplayHandle('', 'jack.w.cone')).toBe('jack.w.cone');

    // 2B. Strip emails and MAIN26 invite code
    expect(sanitizeDisplayHandle('jack.w.cone@gmail.com')).toBe('jack.w.cone');
    expect(sanitizeDisplayHandle('MAIN26 Champion')).toBe('POOL Champion');

    // 2C. Third-person verb agreement in recap headlines
    const participants: SettledParticipantSummary[] = [
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
      {
        userId: 'u2',
        displayName: 'jcone2',
        rank: 2,
        points: 9,
        totalGames: 14,
        shotsIncurred: 1,
        tierName: 'DANGER ZONE',
        tiebreakResolved: true,
      },
    ];

    const recap = buildDeterministicWeeklyRecap({
      format: 'RIVALRY_RESULT',
      season: 2026,
      week: 5,
      isOfficiallySettled: true,
      participants,
      viewerUserId: 'u1',
      viewerDisplayNameFallback: 'jack.w.cone',
      rivalUserId: 'u2',
      rivalDisplayNameFallback: 'jcone2',
      isDemoFixture: true,
    });

    expect(recap.primaryHeadline).toContain('jack.w.cone defeats jcone2');
    expect(recap.primaryHeadline).not.toContain('You defeats');
    expect(recap.isDemoFixture).toBe(true);
    expect(recap.demoWatermarkBanner).toBe('DEMO FIXTURE — NOT A LEAGUE RECORD');
    expect(recap.footerWatermark).toContain('DEMO FIXTURE — NOT A LEAGUE RECORD');
  });

  // =========================================================================
  // TEST 3: Deadline Alert Planner
  // =========================================================================
  it('3. Deadline Alert Planner: 60m lead, grouping, deduplication, cancellation, and copy', () => {
    const fixedNowMs = new Date('2026-10-15T12:00:00.000Z').getTime(); // Thu 12:00 PM UTC

    const sampleGames: DeadlineGameWindowInput[] = [
      // Window 1: Thursday 5:15 PM MST = 2026-10-16T00:15:00.000Z
      {
        gameId: 'g_thu',
        awayTeam: 'DEN',
        homeTeam: 'NO',
        kickoffIso: '2026-10-16T00:15:00.000Z',
        status: 'SCHEDULED',
        isPicked: false,
      },
      // Window 2: Sunday London 6:30 AM MST = 2026-10-18T13:30:00.000Z
      {
        gameId: 'g_lon',
        awayTeam: 'NE',
        homeTeam: 'JAX',
        kickoffIso: '2026-10-18T13:30:00.000Z',
        status: 'SCHEDULED',
        isPicked: false,
      },
      // Window 3: Sunday 10:00 AM MST = 2026-10-18T17:00:00.000Z (Multiple simultaneous games)
      {
        gameId: 'g_sun_1',
        awayTeam: 'SEA',
        homeTeam: 'ATL',
        kickoffIso: '2026-10-18T17:00:00.000Z',
        status: 'SCHEDULED',
        isPicked: false,
      },
      {
        gameId: 'g_sun_2',
        awayTeam: 'MIA',
        homeTeam: 'IND',
        kickoffIso: '2026-10-18T17:00:00.000Z',
        status: 'SCHEDULED',
        isPicked: false,
      },
      {
        gameId: 'g_sun_3',
        awayTeam: 'DET',
        homeTeam: 'MIN',
        kickoffIso: '2026-10-18T17:00:00.000Z',
        status: 'SCHEDULED',
        isPicked: false,
      },
    ];

    // 3A. 60-minute lead time and grouping
    const plan = planDeadlineReminders({
      userId: 'u_jack',
      poolId: 'pool_main',
      season: 2026,
      week: 6,
      optInEnabled: true,
      permissionState: 'GRANTED',
      isSlateSubmitted: false,
      nowMs: fixedNowMs,
      leadMinutes: 60,
      games: sampleGames,
    });

    expect(plan.isEnabled).toBe(true);
    expect(plan.toSchedule.length).toBe(3); // 3 distinct kickoff windows

    // Check Sunday 10:00 AM window has 3 games grouped together
    const sundayWindow = plan.toSchedule.find((w) => w.kickoffIso.includes('2026-10-18T17:00:00.000Z'));
    expect(sundayWindow).toBeDefined();
    expect(sundayWindow?.gameCountInWindow).toBe(3);
    expect(sundayWindow?.matchupSummary).toContain('SEA @ ATL + 2 more games');

    // Check 60m lead calculation: fireAtIso is exactly 60 minutes before kickoff
    const thuWindow = plan.toSchedule[0];
    const koMs = new Date(thuWindow.kickoffIso).getTime();
    const fireMs = new Date(thuWindow.fireAtIso).getTime();
    expect(koMs - fireMs).toBe(60 * 60 * 1000);

    // Neutral notification copy
    expect(thuWindow.body).toContain('locks at official kickoff');
    expect(thuWindow.body).toContain("Open NFL Pick'Em to verify or submit");

    // 3B. Deduplication against existingScheduledIds
    const existingThuId = thuWindow.reminderId;
    const planWithExisting = planDeadlineReminders({
      userId: 'u_jack',
      poolId: 'pool_main',
      season: 2026,
      week: 6,
      optInEnabled: true,
      permissionState: 'GRANTED',
      isSlateSubmitted: false,
      nowMs: fixedNowMs,
      games: sampleGames,
      existingScheduledIds: [existingThuId],
    });
    expect(planWithExisting.unchangedIds).toContain(existingThuId);
    expect(planWithExisting.toSchedule.some((r) => r.reminderId === existingThuId)).toBe(false);

    // 3C. Cancellation when slate already submitted
    const submittedPlan = planDeadlineReminders({
      userId: 'u_jack',
      poolId: 'pool_main',
      season: 2026,
      week: 6,
      optInEnabled: true,
      permissionState: 'GRANTED',
      isSlateSubmitted: true,
      nowMs: fixedNowMs,
      games: sampleGames,
      existingScheduledIds: [existingThuId],
    });
    expect(submittedPlan.toSchedule.length).toBe(0);
    expect(submittedPlan.toCancelIds).toContain(existingThuId);
    expect(submittedPlan.statusSummary).toContain('slate submitted');

    // 3D. Cancellation when permission denied
    const deniedPlan = planDeadlineReminders({
      userId: 'u_jack',
      poolId: 'pool_main',
      season: 2026,
      week: 6,
      optInEnabled: true,
      permissionState: 'DENIED',
      isSlateSubmitted: false,
      games: sampleGames,
      existingScheduledIds: [existingThuId],
    });
    expect(deniedPlan.isEnabled).toBe(false);
    expect(deniedPlan.toCancelIds).toContain(existingThuId);
    expect(deniedPlan.statusSummary).toContain('permission denied');

    // 3E. Sandbox / Simulation / Fixture exclusion
    const simPlan = planDeadlineReminders({
      userId: 'u_jack',
      poolId: 'pool_main',
      season: 2026,
      week: 6,
      optInEnabled: true,
      permissionState: 'GRANTED',
      isSlateSubmitted: false,
      isSimulation: true,
      games: sampleGames,
    });
    expect(simPlan.toSchedule.length).toBe(0);
    expect(simPlan.statusSummary).toContain('Sandbox / fixture data excluded');
  });

  // =========================================================================
  // TEST 4: Canonical Reactions & Security Boundaries
  // =========================================================================
  it('4. Canonical Reactions & Security: Rejection of receipt IDs, spoofing, cross-pool, and toggle idempotence', () => {
    const validTarget: CanonicalReactionTarget = {
      poolId: 'pool_123',
      season: 2026,
      week: 6,
      targetKind: 'CANONICAL_GAME',
      entityId: 'game_401',
    };

    // 4A. Validate valid canonical target
    const validVal = validateCanonicalReactionTarget(validTarget);
    expect(validVal.isValid).toBe(true);
    expect(validVal.canonicalKey).toBe('rx::pool_123::s2026::w6::CANONICAL_GAME::game_401');

    // 4B. Rejection of device-local session receipt IDs (fail-closed)
    const receiptTarget: CanonicalReactionTarget = {
      poolId: 'pool_123',
      season: 2026,
      week: 6,
      targetKind: 'CANONICAL_GAME',
      entityId: 'receipt-local-session-123',
    };
    const receiptVal = validateCanonicalReactionTarget(receiptTarget);
    expect(receiptVal.isValid).toBe(false);
    expect(receiptVal.errorReason).toBe('DEVICE_LOCAL_RECEIPT_ID_FORBIDDEN');

    const colonReceiptTarget: CanonicalReactionTarget = {
      poolId: 'pool_123',
      season: 2026,
      week: 6,
      targetKind: 'CANONICAL_GAME',
      entityId: 'dl::pool_123::local_item',
    };
    expect(validateCanonicalReactionTarget(colonReceiptTarget).errorReason).toBe(
      'DEVICE_LOCAL_RECEIPT_ID_FORBIDDEN'
    );

    // 4C. Rejection of actor spoofing
    const spoofedMutation = applyIdempotentReactionMutation({
      existingEntries: [],
      target: validTarget,
      authenticatedActorId: 'user_real',
      authenticatedActorName: 'Real User',
      claimedActorId: 'user_impostor',
      authorizedPoolId: 'pool_123',
      reactionCode: 'CALLED_IT',
    });
    expect(spoofedMutation.ok).toBe(false);
    expect(spoofedMutation.errorCode).toBe('ACTOR_SPOOFING_REJECTED');

    // 4D. Rejection of cross-pool access
    const crossPoolMutation = applyIdempotentReactionMutation({
      existingEntries: [],
      target: validTarget,
      authenticatedActorId: 'user_real',
      authenticatedActorName: 'Real User',
      authorizedPoolId: 'pool_DIFFERENT',
      reactionCode: 'CALLED_IT',
    });
    expect(crossPoolMutation.ok).toBe(false);
    expect(crossPoolMutation.errorCode).toBe('CROSS_POOL_DENIED');

    // 4E. Idempotent toggle and replacement
    // Step 1: Add CALLED_IT
    const step1 = applyIdempotentReactionMutation({
      existingEntries: [],
      target: validTarget,
      authenticatedActorId: 'user_real',
      authenticatedActorName: 'Real User',
      authorizedPoolId: 'pool_123',
      reactionCode: 'CALLED_IT',
    });
    expect(step1.ok).toBe(true);
    expect(step1.entries.length).toBe(1);
    expect(step1.entries[0].reactionCode).toBe('CALLED_IT');

    // Step 2: Toggle off (same code clicked again)
    const step2 = applyIdempotentReactionMutation({
      existingEntries: step1.entries,
      target: validTarget,
      authenticatedActorId: 'user_real',
      authenticatedActorName: 'Real User',
      authorizedPoolId: 'pool_123',
      reactionCode: 'CALLED_IT',
    });
    expect(step2.ok).toBe(true);
    expect(step2.entries.length).toBe(0);

    // Step 3: Add CALLED_IT then replace with PAIN
    const step3a = applyIdempotentReactionMutation({
      existingEntries: [],
      target: validTarget,
      authenticatedActorId: 'user_real',
      authenticatedActorName: 'Real User',
      authorizedPoolId: 'pool_123',
      reactionCode: 'CALLED_IT',
    });
    const step3b = applyIdempotentReactionMutation({
      existingEntries: step3a.entries,
      target: validTarget,
      authenticatedActorId: 'user_real',
      authenticatedActorName: 'Real User',
      authorizedPoolId: 'pool_123',
      reactionCode: 'PAIN',
    });
    expect(step3b.ok).toBe(true);
    expect(step3b.entries.length).toBe(1);
    expect(step3b.entries[0].reactionCode).toBe('PAIN');

    // Step 4: Summarize reactions for chips
    const summary = summarizeReactionsForTarget(
      step3b.entries,
      validVal.canonicalKey!,
      'user_real'
    );
    const painChip = summary.find((c) => c.code === 'PAIN');
    const calledItChip = summary.find((c) => c.code === 'CALLED_IT');
    expect(painChip?.count).toBe(1);
    expect(painChip?.viewerSelected).toBe(true);
    expect(calledItChip?.count).toBe(0);
    expect(calledItChip?.viewerSelected).toBe(false);
  });
});
