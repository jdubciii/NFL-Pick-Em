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
});
