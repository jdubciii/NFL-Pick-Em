import { describe, it, expect } from 'vitest';
import {
  resolveSlatePhaseState,
  formatGameScoreOrKickoff,
  evaluateSubmissionReadiness,
  formatDuelSwingOutcome,
  selectTrueLeagueSwingGame,
  formatStandingTieAndTierState,
  formatShotUnit,
  formatAttributedSpread,
  buildPersonalRootingQueue,
  evaluateLateGameEscape,
  summarizeNemesisRecord,
  classifyPickDistributionBadge,
} from '../src/services/dependableInfoService';

describe('Phase 39 Sprint 1 (P39-S1): Dependable Information & Mathematical Truth', () => {
  it('1. resolves PRE_KICKOFF vs LIVE_IN_PROGRESS vs AWAITING_SETTLEMENT vs SETTLED states and suppresses false 0-0 scores before kickoff', () => {
    const futureIso = new Date(Date.now() + 86400000).toISOString();
    const scheduledGames = [
      { id: 'g1', awayTeam: 'SEA', homeTeam: 'DEN', status: 'SCHEDULED', kickoff: futureIso, awayScore: 0, homeScore: 0 },
      { id: 'g2', awayTeam: 'CHI', homeTeam: 'ATL', status: 'SCHEDULED', kickoff: futureIso, awayScore: 0, homeScore: 0 },
    ];

    const preState = resolveSlatePhaseState(scheduledGames, { isSettled: false });
    expect(preState.phase).toBe('PRE_KICKOFF');
    expect(preState.badgeLabel).toBe('PRE-KICKOFF');
    expect(preState.scheduledCount).toBe(2);
    expect(preState.liveCount).toBe(0);

    const scoreDisplay = formatGameScoreOrKickoff(scheduledGames[0], 'Sun 4:05 PM');
    expect(scoreDisplay.isStarted).toBe(false);
    expect(scoreDisplay.displayText).toBe('Sun 4:05 PM');

    const liveGames = [
      { id: 'g1', awayTeam: 'SEA', homeTeam: 'DEN', status: 'IN_PROGRESS', awayScore: 14, homeScore: 10 },
      { id: 'g2', awayTeam: 'CHI', homeTeam: 'ATL', status: 'SCHEDULED', kickoff: futureIso },
    ];
    const liveState = resolveSlatePhaseState(liveGames);
    expect(liveState.phase).toBe('LIVE_IN_PROGRESS');
    expect(liveState.badgeLabel).toBe('GAMES LIVE');
    expect(liveState.liveCount).toBe(1);
    expect(liveState.scheduledCount).toBe(1);

    const startedScore = formatGameScoreOrKickoff(liveGames[0], 'Sun 4:05 PM');
    expect(startedScore.isStarted).toBe(true);
    expect(startedScore.displayText).toBe('SEA 14 - 10 DEN');
  });

  it('2. separates Draft Complete from Submitted and Partial Kickoff Locks (Decision #66)', () => {
    const draftComplete = evaluateSubmissionReadiness({
      totalGames: 14,
      pickedCount: 14,
      isSubmitted: false,
      lockedGameCount: 0,
    });
    expect(draftComplete.readinessCode).toBe('COMPLETE_UNSUBMITTED_DRAFT');
    expect(draftComplete.isCountedInCompetition).toBe(false);
    expect(draftComplete.primaryBadge).toContain('NOT YET SUBMITTED');

    const submittedPartialLock = evaluateSubmissionReadiness({
      totalGames: 14,
      pickedCount: 14,
      isSubmitted: true,
      lockedGameCount: 1,
    });
    expect(submittedPartialLock.readinessCode).toBe('PARTIALLY_LOCKED');
    expect(submittedPartialLock.isCountedInCompetition).toBe(true);
    expect(submittedPartialLock.editableGameCount).toBe(13);
    expect(submittedPartialLock.lockSummary).toBe('1 game locked · 13 editable');
  });

  it('3. computes exact +1 / -1 Radar Duel outcome branches and 2 PT OUTCOME SPAN instead of +-2 PTS NET SWING', () => {
    const splitOutcome = formatDuelSwingOutcome({
      gameId: 'sea-den',
      awayTeam: 'SEA',
      homeTeam: 'DEN',
      viewerPickTeam: 'SEA',
      rivalPickTeam: 'DEN',
      currentViewerGap: 0,
      gameWeight: 1,
    });

    expect(splitOutcome.isSharedPick).toBe(false);
    expect(splitOutcome.ifViewerPickWinsGap).toBe(1);
    expect(splitOutcome.ifRivalPickWinsGap).toBe(-1);
    expect(splitOutcome.outcomeSpan).toBe(2);
    expect(splitOutcome.viewerWinTileLabel).toBe('SEA wins: +1');
    expect(splitOutcome.rivalWinTileLabel).toBe('DEN wins: -1');
    expect(splitOutcome.spanBadgeLabel).toBe('2 PT OUTCOME SPAN (-1 / +1)');
    expect(splitOutcome.spanBadgeLabel).not.toContain('±2');

    const sharedOutcome = formatDuelSwingOutcome({
      gameId: 'chi-atl',
      awayTeam: 'CHI',
      homeTeam: 'ATL',
      viewerPickTeam: 'CHI',
      rivalPickTeam: 'CHI',
      currentViewerGap: 0,
    });
    expect(sharedOutcome.isSharedPick).toBe(true);
    expect(sharedOutcome.outcomeSpan).toBe(0);
    expect(sharedOutcome.spanBadgeLabel).toContain('0 PT GAP LEVERAGE');
  });

  it('4. filters out unanimous shared picks from League Swing Game selection and avoids podium language in a 2-player field', () => {
    const candidates = [
      {
        gameId: 'chi-atl',
        awayTeam: 'CHI',
        homeTeam: 'ATL',
        viewerPickTeam: 'CHI',
        pickedByCount: 2,
        totalActivePickers: 2,
        isUnanimousPick: true,
        rankDeltaIfViewerWins: 0,
        rankDeltaIfViewerLoses: 0,
        pointGapDelta: 0,
        tierChanged: false,
      },
      {
        gameId: 'sea-den',
        awayTeam: 'SEA',
        homeTeam: 'DEN',
        viewerPickTeam: 'SEA',
        pickedByCount: 1,
        totalActivePickers: 2,
        isUnanimousPick: false,
        rankDeltaIfViewerWins: 1,
        rankDeltaIfViewerLoses: -1,
        pointGapDelta: 2,
        tierChanged: true,
        targetTierIfWin: 'Safe Haven',
        targetTierIfLoss: 'The Pit',
      },
    ];

    const result = selectTrueLeagueSwingGame(candidates, 2);
    expect(result.selectedGame?.gameId).toBe('sea-den');
    expect(result.consequenceSummary).toContain('If SEA wins: Projected #1 (Safe Haven) lead');
    expect(result.consequenceSummary).not.toContain('podium');
  });

  it('5. distinguishes unresolved tied ranks from settled tiebreakers and formats shot units & spreads cleanly', () => {
    const unresolvedTie = formatStandingTieAndTierState({
      rank: 1,
      tiedMemberCount: 2,
      isSettled: false,
      tiebreakerResolved: false,
      projectedTierName: 'Safe Haven',
    });
    expect(unresolvedTie.rankBadge).toBe('T-#1');
    expect(unresolvedTie.statusHeadline).toBe('Joint #1 on points · Tiebreak pending');
    expect(unresolvedTie.tierDescription).toBe('Projected Safe Haven if standing holds');

    expect(formatShotUnit(0)).toBe('0 shots');
    expect(formatShotUnit('0.00')).toBe('0 shots');
    expect(formatShotUnit(1)).toBe('1 shot');
    expect(formatShotUnit(2.5)).toBe('2.5 shots');

    expect(formatAttributedSpread({ spread: -2.5, favoredTeam: 'DEN' })).toBe('DEN -2.5');
    expect(formatAttributedSpread({ spread: 0, treatZeroAsUnavailable: true })).toBe('Spread Unavailable');
    expect(formatAttributedSpread({ spread: null })).toBe('Spread Unavailable');
  });

  it('6. verifies Pass-3 signature algorithms: buildPersonalRootingQueue, evaluateLateGameEscape, summarizeNemesisRecord, and classifyPickDistributionBadge', () => {
    // 1. buildPersonalRootingQueue
    const sampleGames = [
      {
        gameId: 'g1',
        awayTeam: 'SEA',
        homeTeam: 'DEN',
        viewerPick: 'SEA',
        rivalPick: 'DEN',
        status: 'IN_PROGRESS',
        changesTier: true,
      },
      {
        gameId: 'g2',
        awayTeam: 'CHI',
        homeTeam: 'ATL',
        viewerPick: 'CHI',
        rivalPick: 'CHI',
        status: 'SCHEDULED',
      },
      {
        gameId: 'g3',
        awayTeam: 'DAL',
        homeTeam: 'GB',
        viewerPick: 'GB',
        rivalPick: 'DAL',
        status: 'SCHEDULED',
        changesTier: false,
      },
    ];
    const rootingQueue = buildPersonalRootingQueue(sampleGames, 3);
    expect(rootingQueue).toHaveLength(3);
    expect(rootingQueue[0].rootForTeam).toBe('SEA');
    expect(rootingQueue[0].reasonBadge).toBe('TIER ESCAPE');
    expect(rootingQueue[0].gameStatus).toBe('LIVE');
    expect(rootingQueue[1].rootForTeam).toBe('GB');
    expect(rootingQueue[1].reasonBadge).toBe('DUEL SWING');
    expect(rootingQueue[2].rootForTeam).toBe('CHI');
    expect(rootingQueue[2].reasonBadge).toBe('SHARED ROOT');

    // 2. evaluateLateGameEscape
    const safeScenario = evaluateLateGameEscape({
      viewerPoints: 10,
      targetSafePoints: 10,
      remainingDisagreementGames: [
        { gameId: 'g1', awayTeam: 'SEA', homeTeam: 'DEN', viewerPick: 'SEA' },
      ],
    });
    expect(safeScenario.canMathematicallyEscape).toBe(true);
    expect(safeScenario.headline).toBe('Holding Safe Ground');

    const escapeScenario = evaluateLateGameEscape({
      viewerPoints: 8,
      targetSafePoints: 10,
      remainingDisagreementGames: [
        { gameId: 'g1', awayTeam: 'SEA', homeTeam: 'DEN', viewerPick: 'SEA' },
        { gameId: 'g2', awayTeam: 'DAL', homeTeam: 'GB', viewerPick: 'GB' },
      ],
      holdsTiebreakerEdge: true,
    });
    expect(escapeScenario.canMathematicallyEscape).toBe(true);
    expect(escapeScenario.requiresTiebreaker).toBe(false);
    expect(escapeScenario.viewerPointDeficit).toBe(2);

    const impossibleScenario = evaluateLateGameEscape({
      viewerPoints: 5,
      targetSafePoints: 8,
      remainingDisagreementGames: [
        { gameId: 'g1', awayTeam: 'SEA', homeTeam: 'DEN', viewerPick: 'SEA' },
      ],
    });
    expect(impossibleScenario.canMathematicallyEscape).toBe(false);
    expect(impossibleScenario.headline).toBe('Mathematical Clinch Against');

    // 3. summarizeNemesisRecord
    const initialNemesis = summarizeNemesisRecord([], 'You', 'jcone2');
    expect(initialNemesis.settledWeeksCount).toBe(0);
    expect(initialNemesis.badgeText).toBe('FIRST SEASON DUEL (0-0)');

    const activeNemesis = summarizeNemesisRecord(
      [
        { week: 5, viewerScore: 10, rivalScore: 9 },
        { week: 6, viewerScore: 8, rivalScore: 8 },
      ],
      'You',
      'jcone2'
    );
    expect(activeNemesis.viewerWins).toBe(1);
    expect(activeNemesis.ties).toBe(1);
    expect(activeNemesis.badgeText).toBe('YOU LEAD RIVALRY 1-0-1');

    // 4. classifyPickDistributionBadge: Split Decision (1 of 2) vs Lone Wolf (Only 1 of 10)
    const splitBadge = classifyPickDistributionBadge(1, 2, 'DEN');
    expect(splitBadge.type).toBe('SPLIT_DECISION');
    expect(splitBadge.label).toBe('Split Decision (1 of 2 backed DEN)');

    const loneWolfBadge = classifyPickDistributionBadge(1, 10, 'DEN');
    expect(loneWolfBadge.type).toBe('LONE_WOLF');
    expect(loneWolfBadge.label).toBe('Lone Wolf (Only 1 of 10 backed DEN)');

    const consensusBadge = classifyPickDistributionBadge(2, 2, 'JAX');
    expect(consensusBadge.type).toBe('CONSENSUS');
    expect(consensusBadge.label).toBe('Unanimous (2 of 2 backed JAX)');
  });
});
