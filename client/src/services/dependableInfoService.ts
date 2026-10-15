/**
 * Phase 39 Sprint 1 (P39-S1): Dependable Information & Mathematical Truth Service
 * Enforces Decision #61 (Modular Client Boundary Isolation), Decision #66 (Pick Lock Readiness),
 * and Decision #69 (Decimal Shot Obligation Formatting).
 */

export type SlatePhaseCode =
  | 'PRE_KICKOFF'
  | 'LIVE_IN_PROGRESS'
  | 'AWAITING_SETTLEMENT'
  | 'SETTLED'
  | 'SIMULATION';

export interface SlateGameInput {
  id: string;
  awayTeam: string;
  homeTeam: string;
  status?: string | null;
  kickoff?: string | Date | null;
  awayScore?: number | null;
  homeScore?: number | null;
}

export interface SlatePhaseTelemetry {
  phase: SlatePhaseCode;
  badgeLabel: string;
  statusSummary: string;
  totalGames: number;
  scheduledCount: number;
  liveCount: number;
  finalCount: number;
  lockedCount: number;
  editableCount: number;
  relativeUpdatedLabel: string;
}

export interface SubmissionReadinessInput {
  totalGames: number;
  pickedCount: number;
  savedCount?: number;
  isSubmitted: boolean;
  lockedGameCount: number;
  nextKickoffLabel?: string | null;
}

export interface SubmissionReadinessResult {
  readinessCode:
    | 'INCOMPLETE_DRAFT'
    | 'COMPLETE_UNSUBMITTED_DRAFT'
    | 'SUBMITTED_EDITABLE'
    | 'PARTIALLY_LOCKED'
    | 'FULLY_LOCKED';
  primaryBadge: string;
  selectionSummary: string;
  lockSummary: string;
  actionButtonLabel: string | null;
  isCountedInCompetition: boolean;
  editableGameCount: number;
  lockedGameCount: number;
}

export interface DuelSwingOutcomeInput {
  gameId: string;
  awayTeam: string;
  homeTeam: string;
  viewerPickTeam: string;
  rivalPickTeam: string;
  currentViewerGap?: number;
  gameWeight?: number;
}

export interface DuelSwingOutcomeResult {
  isSharedPick: boolean;
  pointWeight: number;
  outcomeSpan: number;
  ifViewerPickWinsGap: number;
  ifRivalPickWinsGap: number;
  viewerWinTileLabel: string;
  rivalWinTileLabel: string;
  spanBadgeLabel: string;
  leverageSummary: string;
}

export interface SwingGameCandidate {
  gameId: string;
  awayTeam: string;
  homeTeam: string;
  viewerPickTeam: string;
  pickedByCount?: number;
  totalActivePickers?: number;
  isUnanimousPick?: boolean;
  rankDeltaIfViewerWins: number;
  rankDeltaIfViewerLoses: number;
  pointGapDelta: number;
  tierChanged: boolean;
  targetTierIfWin?: string;
  targetTierIfLoss?: string;
}

export interface SwingGameSelectionResult {
  selectedGame: SwingGameCandidate | null;
  headline: string;
  consequenceSummary: string;
  emptyStateReason: string | null;
}

export interface StandingTieStateInput {
  rank: number;
  tiedMemberCount: number;
  isSettled: boolean;
  tiebreakerResolved: boolean;
  holdsTiebreakerLead?: boolean;
  projectedTierName: string;
}

export interface StandingTieStateResult {
  rankBadge: string;
  statusHeadline: string;
  tierDescription: string;
  isProvisional: boolean;
}

function classifyGameLifecycle(
  game: SlateGameInput,
  nowMs: number = Date.now()
): 'SCHEDULED' | 'LIVE' | 'FINAL' {
  const raw = (game.status || '').toUpperCase().trim();
  if (raw === 'FINAL' || raw === 'F' || raw === 'COMPLETED' || raw === 'SETTLED' || raw === 'STATUS_FINAL') {
    return 'FINAL';
  }
  if (
    raw === 'LIVE' ||
    raw === 'IN_PROGRESS' ||
    raw === 'IN PROGRESS' ||
    raw === 'HALFTIME' ||
    raw === 'STATUS_IN_PROGRESS' ||
    raw === 'Q1' ||
    raw === 'Q2' ||
    raw === 'Q3' ||
    raw === 'Q4' ||
    raw === 'OT'
  ) {
    return 'LIVE';
  }
  if (game.kickoff) {
    const koMs = new Date(game.kickoff).getTime();
    if (!Number.isNaN(koMs) && koMs <= nowMs && raw !== 'SCHEDULED' && raw !== 'PRE' && raw !== 'UPCOMING') {
      return 'LIVE';
    }
  }
  return 'SCHEDULED';
}

export function resolveSlatePhaseState(
  games: SlateGameInput[],
  options: {
    isSettled?: boolean;
    isSimulation?: boolean;
    nowMs?: number;
    lastUpdatedLabel?: string;
  } = {}
): SlatePhaseTelemetry {
  const nowMs = options.nowMs ?? Date.now();
  let scheduledCount = 0;
  let liveCount = 0;
  let finalCount = 0;
  let lockedCount = 0;

  for (const g of games) {
    const state = classifyGameLifecycle(g, nowMs);
    if (state === 'FINAL') {
      finalCount += 1;
      lockedCount += 1;
    } else if (state === 'LIVE') {
      liveCount += 1;
      lockedCount += 1;
    } else {
      scheduledCount += 1;
      if (g.kickoff) {
        const koMs = new Date(g.kickoff).getTime();
        if (!Number.isNaN(koMs) && koMs <= nowMs) {
          lockedCount += 1;
        }
      }
    }
  }

  const totalGames = games.length;
  const editableCount = Math.max(0, totalGames - lockedCount);
  const relativeUpdatedLabel = options.lastUpdatedLabel || 'Updated just now';

  if (options.isSimulation) {
    return {
      phase: 'SIMULATION',
      badgeLabel: 'SIMULATION MODE',
      statusSummary: `${liveCount} Live · ${finalCount} Final · ${scheduledCount} Scheduled`,
      totalGames,
      scheduledCount,
      liveCount,
      finalCount,
      lockedCount,
      editableCount,
      relativeUpdatedLabel,
    };
  }

  if (options.isSettled) {
    return {
      phase: 'SETTLED',
      badgeLabel: 'OFFICIAL SETTLED',
      statusSummary: `All ${totalGames} games final & settled`,
      totalGames,
      scheduledCount,
      liveCount,
      finalCount,
      lockedCount: totalGames,
      editableCount: 0,
      relativeUpdatedLabel,
    };
  }

  if (liveCount === 0 && finalCount === 0) {
    return {
      phase: 'PRE_KICKOFF',
      badgeLabel: 'PRE-KICKOFF',
      statusSummary:
        lockedCount > 0
          ? `${lockedCount} game${lockedCount === 1 ? '' : 's'} locked · ${editableCount} editable`
          : `${totalGames} games scheduled · Kickoffs pending`,
      totalGames,
      scheduledCount,
      liveCount,
      finalCount,
      lockedCount,
      editableCount,
      relativeUpdatedLabel,
    };
  }

  if (scheduledCount === 0 && liveCount === 0 && finalCount > 0) {
    return {
      phase: 'AWAITING_SETTLEMENT',
      badgeLabel: 'GAMES COMPLETE · AWAITING SETTLEMENT',
      statusSummary: `${finalCount} of ${totalGames} Final · Official settlement pending`,
      totalGames,
      scheduledCount,
      liveCount,
      finalCount,
      lockedCount: totalGames,
      editableCount: 0,
      relativeUpdatedLabel,
    };
  }

  return {
    phase: 'LIVE_IN_PROGRESS',
    badgeLabel: 'GAMES LIVE',
    statusSummary: `${liveCount} Live · ${finalCount} Final · ${scheduledCount} Scheduled`,
    totalGames,
    scheduledCount,
    liveCount,
    finalCount,
    lockedCount,
    editableCount,
    relativeUpdatedLabel,
  };
}

export function formatGameScoreOrKickoff(
  game: SlateGameInput,
  kickoffDisplayFallback: string = 'Scheduled',
  nowMs: number = Date.now()
): { isStarted: boolean; displayText: string } {
  const lifecycle = classifyGameLifecycle(game, nowMs);
  if (lifecycle === 'SCHEDULED') {
    return {
      isStarted: false,
      displayText: kickoffDisplayFallback,
    };
  }
  const away = typeof game.awayScore === 'number' ? game.awayScore : 0;
  const home = typeof game.homeScore === 'number' ? game.homeScore : 0;
  return {
    isStarted: true,
    displayText: `${game.awayTeam} ${away} - ${home} ${game.homeTeam}`,
  };
}

export function evaluateSubmissionReadiness(
  input: SubmissionReadinessInput
): SubmissionReadinessResult {
  const totalGames = Math.max(0, input.totalGames);
  const pickedCount = Math.min(totalGames, Math.max(0, input.pickedCount));
  const lockedGameCount = Math.min(totalGames, Math.max(0, input.lockedGameCount));
  const editableGameCount = Math.max(0, totalGames - lockedGameCount);
  const unpickedCount = Math.max(0, totalGames - pickedCount);

  const selectionSummary = `${pickedCount} Picked · ${unpickedCount} Left`;
  const lockSummary =
    lockedGameCount === 0
      ? `All ${totalGames} games editable`
      : lockedGameCount >= totalGames
      ? `All ${totalGames} games kickoff-locked`
      : `${lockedGameCount} game${lockedGameCount === 1 ? '' : 's'} locked · ${editableGameCount} editable`;

  if (lockedGameCount >= totalGames && totalGames > 0) {
    return {
      readinessCode: 'FULLY_LOCKED',
      primaryBadge: input.isSubmitted ? 'SUBMITTED & LOCKED' : 'SLATE KICKOFF LOCKED',
      selectionSummary,
      lockSummary,
      actionButtonLabel: null,
      isCountedInCompetition: input.isSubmitted,
      editableGameCount,
      lockedGameCount,
    };
  }

  if (lockedGameCount > 0 && input.isSubmitted) {
    return {
      readinessCode: 'PARTIALLY_LOCKED',
      primaryBadge: `SUBMITTED · ${lockedGameCount} LOCKED / ${editableGameCount} EDITABLE`,
      selectionSummary,
      lockSummary,
      actionButtonLabel: 'Update Remaining Picks',
      isCountedInCompetition: true,
      editableGameCount,
      lockedGameCount,
    };
  }

  if (input.isSubmitted && pickedCount === totalGames) {
    return {
      readinessCode: 'SUBMITTED_EDITABLE',
      primaryBadge: 'SUBMITTED · COUNTED IN POOL',
      selectionSummary,
      lockSummary,
      actionButtonLabel: 'Review / Edit Submitted Slate',
      isCountedInCompetition: true,
      editableGameCount,
      lockedGameCount,
    };
  }

  if (pickedCount === totalGames && !input.isSubmitted) {
    return {
      readinessCode: 'COMPLETE_UNSUBMITTED_DRAFT',
      primaryBadge: 'DRAFT COMPLETE · NOT YET SUBMITTED',
      selectionSummary,
      lockSummary,
      actionButtonLabel: 'Confirm & Submit Slate',
      isCountedInCompetition: false,
      editableGameCount,
      lockedGameCount,
    };
  }

  return {
    readinessCode: 'INCOMPLETE_DRAFT',
    primaryBadge: `DRAFT IN PROGRESS · ${unpickedCount} REMAINING`,
    selectionSummary,
    lockSummary,
    actionButtonLabel: 'Complete & Submit Slate',
    isCountedInCompetition: false,
    editableGameCount,
    lockedGameCount,
  };
}

export function formatDuelSwingOutcome(input: DuelSwingOutcomeInput): DuelSwingOutcomeResult {
  const weight = typeof input.gameWeight === 'number' && input.gameWeight > 0 ? input.gameWeight : 1;
  const baseline = typeof input.currentViewerGap === 'number' ? input.currentViewerGap : 0;
  const viewerTeam = (input.viewerPickTeam || '').toUpperCase().trim();
  const rivalTeam = (input.rivalPickTeam || '').toUpperCase().trim();

  if (!viewerTeam || !rivalTeam || viewerTeam === rivalTeam) {
    const formattedCurrent = baseline > 0 ? `+${baseline}` : `${baseline}`;
    return {
      isSharedPick: true,
      pointWeight: weight,
      outcomeSpan: 0,
      ifViewerPickWinsGap: baseline,
      ifRivalPickWinsGap: baseline,
      viewerWinTileLabel: `Both picked ${viewerTeam || 'same team'} (${formattedCurrent})`,
      rivalWinTileLabel: `0 pt gap change`,
      spanBadgeLabel: '0 PT GAP LEVERAGE (SHARED PICK)',
      leverageSummary: 'Shared pick — adds equally to both totals with zero net gap swing.',
    };
  }

  const ifViewerPickWinsGap = baseline + weight;
  const ifRivalPickWinsGap = baseline - weight;
  const outcomeSpan = weight * 2;

  const fmtGap = (val: number) => (val > 0 ? `+${val}` : `${val}`);

  return {
    isSharedPick: false,
    pointWeight: weight,
    outcomeSpan,
    ifViewerPickWinsGap,
    ifRivalPickWinsGap,
    viewerWinTileLabel: `${viewerTeam} wins: ${fmtGap(ifViewerPickWinsGap)}`,
    rivalWinTileLabel: `${rivalTeam} wins: ${fmtGap(ifRivalPickWinsGap)}`,
    spanBadgeLabel: `${outcomeSpan} PT OUTCOME SPAN (${fmtGap(ifRivalPickWinsGap)} / ${fmtGap(ifViewerPickWinsGap)})`,
    leverageSummary: `If ${viewerTeam} wins, your duel margin moves to ${fmtGap(ifViewerPickWinsGap)}; if ${rivalTeam} wins, it moves to ${fmtGap(ifRivalPickWinsGap)} (holding other games constant).`,
  };
}

export function selectTrueLeagueSwingGame(
  candidates: SwingGameCandidate[],
  activeMemberCount: number
): SwingGameSelectionResult {
  const eligible = candidates.filter((c) => {
    if (c.isUnanimousPick) return false;
    if (
      typeof c.pickedByCount === 'number' &&
      typeof c.totalActivePickers === 'number' &&
      c.totalActivePickers > 0 &&
      (c.pickedByCount === c.totalActivePickers || c.pickedByCount === 0)
    ) {
      return false;
    }
    const hasRankEffect = c.rankDeltaIfViewerWins !== 0 || c.rankDeltaIfViewerLoses !== 0;
    const hasGapEffect = c.pointGapDelta !== 0;
    return hasRankEffect || c.tierChanged || hasGapEffect;
  });

  if (eligible.length === 0) {
    return {
      selectedGame: null,
      headline: 'No Active Rank Swing Game',
      consequenceSummary:
        'All active member picks are aligned on the remaining slate — zero relative rank or tier leverage.',
      emptyStateReason: 'ALL_PICKS_ALIGNED',
    };
  }

  const sorted = [...eligible].sort((a, b) => {
    const scoreA =
      (a.tierChanged ? 100 : 0) +
      (Math.abs(a.rankDeltaIfViewerWins) + Math.abs(a.rankDeltaIfViewerLoses)) * 10 +
      Math.abs(a.pointGapDelta);
    const scoreB =
      (b.tierChanged ? 100 : 0) +
      (Math.abs(b.rankDeltaIfViewerWins) + Math.abs(b.rankDeltaIfViewerLoses)) * 10 +
      Math.abs(b.pointGapDelta);
    return scoreB - scoreA;
  });

  const best = sorted[0];
  const viewerTeam = best.viewerPickTeam.toUpperCase();
  const opposingTeam =
    viewerTeam === best.awayTeam.toUpperCase()
      ? best.homeTeam.toUpperCase()
      : best.awayTeam.toUpperCase();

  const winTier = best.targetTierIfWin || 'Safe Haven';
  const lossTier = best.targetTierIfLoss || 'chasing pack';

  let consequenceSummary: string;
  if (activeMemberCount <= 3) {
    consequenceSummary = `If ${viewerTeam} wins: Projected #1 (${winTier}) lead; if ${opposingTeam} wins: Drops toward #2 (${lossTier}).`;
  } else {
    consequenceSummary = `If ${viewerTeam} wins: Moves projected standing toward ${winTier}; if ${opposingTeam} wins: Exposes rank to ${lossTier}.`;
  }

  return {
    selectedGame: best,
    headline: `${best.awayTeam} @ ${best.homeTeam}`,
    consequenceSummary,
    emptyStateReason: null,
  };
}

export function formatStandingTieAndTierState(
  input: StandingTieStateInput
): StandingTieStateResult {
  const rankBadge = `#${input.rank}`;
  if (input.isSettled) {
    return {
      rankBadge,
      statusHeadline:
        input.tiedMemberCount > 1
          ? `Official #${input.rank} (Tiebreaker Resolved)`
          : `Official #${input.rank} Standing`,
      tierDescription: `Official Charter Tier: ${input.projectedTierName}`,
      isProvisional: false,
    };
  }

  if (input.tiedMemberCount > 1) {
    if (!input.tiebreakerResolved) {
      return {
        rankBadge: `T-${rankBadge}`,
        statusHeadline: `Joint #${input.rank} on points · Tiebreak pending`,
        tierDescription: `Projected ${input.projectedTierName} if standing holds`,
        isProvisional: true,
      };
    }
    const edgeWord = input.holdsTiebreakerLead ? 'holding tiebreak edge' : 'trailing on tiebreak';
    return {
      rankBadge,
      statusHeadline: `Joint #${input.rank} on points · Provisional (${edgeWord})`,
      tierDescription: `Projected ${input.projectedTierName} if standing holds`,
      isProvisional: true,
    };
  }

  return {
    rankBadge,
    statusHeadline: `Projected #${input.rank} Standing`,
    tierDescription: `Projected ${input.projectedTierName} if standing holds`,
    isProvisional: true,
  };
}

export function formatShotUnit(
  value: number | string | { toString: () => string } | null | undefined
): string {
  if (value === null || value === undefined || value === '') {
    return '0 shots';
  }
  const numeric = typeof value === 'number' ? value : Number(value.toString().replace(/[^0-9.-]/g, ''));
  if (Number.isNaN(numeric) || Math.abs(numeric) < 0.0001) {
    return '0 shots';
  }
  const rounded = Math.round(numeric * 100) / 100;
  if (Math.abs(rounded - 1) < 0.0001) {
    return '1 shot';
  }
  const formattedNumber = Number.isInteger(rounded)
    ? `${rounded}`
    : `${parseFloat(rounded.toFixed(2))}`;
  return `${formattedNumber} shots`;
}

export function formatAttributedSpread(params: {
  spread?: number | string | null;
  favoredTeam?: string | null;
  homeTeam?: string | null;
  awayTeam?: string | null;
  treatZeroAsUnavailable?: boolean;
}): string {
  const { spread, favoredTeam, homeTeam, awayTeam, treatZeroAsUnavailable = true } = params;
  if (spread === null || spread === undefined || spread === '') {
    return 'Spread Unavailable';
  }
  const num = typeof spread === 'number' ? spread : Number(String(spread).trim());
  if (Number.isNaN(num)) {
    return 'Spread Unavailable';
  }
  if (num === 0) {
    return treatZeroAsUnavailable ? 'Spread Unavailable' : 'EVEN (PK)';
  }
  const absVal = Math.abs(num);
  const team =
    favoredTeam?.toUpperCase().trim() ||
    (num < 0 ? homeTeam?.toUpperCase().trim() : awayTeam?.toUpperCase().trim()) ||
    '';
  return team ? `${team} -${absVal}` : `-${absVal}`;
}

export function getTeamIndefiniteArticle(teamCode: string): 'An' | 'A' {
  const clean = (teamCode || '').toUpperCase().trim();
  const vowelStarts = ['A', 'E', 'I', 'O', 'U'];
  return vowelStarts.includes(clean.charAt(0)) ? 'An' : 'A';
}

export interface PersonalRootingQueueOptions {
  maxItems?: number;
  rivalDisplayName?: string;
  currentViewerGap?: number;
}

export interface RootingQueueItem {
  gameId: string;
  matchupLabel: string;
  rootForTeam: string;
  againstTeam: string;
  gameStatus: 'SCHEDULED' | 'LIVE' | 'FINAL';
  priorityScore: number;
  reasonBadge: 'DUEL SWING' | 'TIER ESCAPE' | 'SHARED ROOT';
  consequenceText: string;
  consequenceNote?: string;
}

export interface LateGameEscapeScenario {
  remainingDisagreements: number;
  viewerPointDeficit: number;
  canMathematicallyEscape: boolean;
  requiresTiebreaker: boolean;
  headline: string;
  requirementSummary: string;
  scenarioMode?: 'SIMULATION_EXCLUDED' | 'MID_SLATE_GUIDANCE' | 'EXACT_CLINCH' | 'HOLDING_SAFE_GROUND' | 'CLINCH_AGAINST';
  canClaimExactClinch?: boolean;
}

export interface NemesisRecordSummary {
  viewerWins: number;
  rivalWins: number;
  ties: number;
  settledWeeksCount: number;
  badgeText: string;
  subText: string;
}

export interface PickDistributionBadge {
  type: 'LONE_WOLF' | 'SPLIT_DECISION' | 'CONSENSUS' | 'MAJORITY';
  label: string;
  pickedCount: number;
  totalPickers: number;
}

export function buildPersonalRootingQueue(
  games: Array<{
    gameId: string;
    awayTeam: string;
    homeTeam: string;
    viewerPick: string;
    rivalPick?: string | null;
    status?: string | null;
    changesTier?: boolean;
  }>,
  options?: number | PersonalRootingQueueOptions
): RootingQueueItem[] {
  const maxItems = typeof options === 'number' ? options : options?.maxItems ?? 3;
  const rivalDisplayName = (typeof options === 'object' && options?.rivalDisplayName ? options.rivalDisplayName : 'your rival').trim();
  const currentViewerGap = typeof options === 'object' && typeof options?.currentViewerGap === 'number' ? options.currentViewerGap : 0;

  const activeOrUpcoming = games.filter((g) => {
    const st = (g.status || 'SCHEDULED').toUpperCase();
    return st !== 'FINAL' && st !== 'F' && st !== 'COMPLETED' && st !== 'SETTLED';
  });

  const formatMargin = (val: number) => (val > 0 ? `+${val}` : `${val}`);

  const mapped: RootingQueueItem[] = activeOrUpcoming
    .filter((g) => Boolean(g.viewerPick))
    .map((g) => {
      const vPick = g.viewerPick.toUpperCase();
      const rPick = (g.rivalPick || '').toUpperCase();
      const against = vPick === g.awayTeam.toUpperCase() ? g.homeTeam.toUpperCase() : g.awayTeam.toUpperCase();
      const rawStatus = (g.status || 'SCHEDULED').toUpperCase();
      const isLive = rawStatus === 'LIVE' || rawStatus === 'IN_PROGRESS' || rawStatus.startsWith('Q') || rawStatus === 'OT';
      const gameStatus: 'SCHEDULED' | 'LIVE' | 'FINAL' = isLive ? 'LIVE' : 'SCHEDULED';
      const isSplit = Boolean(rPick && rPick !== vPick);

      let priorityScore = isLive ? 50 : 10;
      let reasonBadge: 'DUEL SWING' | 'TIER ESCAPE' | 'SHARED ROOT' = 'SHARED ROOT';
      let consequenceText = `Shared pick with ${rivalDisplayName} (${vPick}) — holds current margin`;

      const article = getTeamIndefiniteArticle(vPick);
      const postGap = currentViewerGap + 1;
      const unit = Math.abs(postGap) === 1 ? 'pt' : 'pts';
      const marginChangeStr = `moves your duel margin vs. ${rivalDisplayName} from ${formatMargin(currentViewerGap)} to ${formatMargin(postGap)} ${unit}`;

      if (isSplit && g.changesTier) {
        priorityScore += 100;
        reasonBadge = 'TIER ESCAPE';
        consequenceText = `${article} ${vPick} win ${marginChangeStr}`;
      } else if (isSplit) {
        priorityScore += 75;
        reasonBadge = 'DUEL SWING';
        consequenceText = `${article} ${vPick} win ${marginChangeStr}`;
      }

      return {
        gameId: g.gameId,
        matchupLabel: `${g.awayTeam.toUpperCase()} @ ${g.homeTeam.toUpperCase()}`,
        rootForTeam: vPick,
        againstTeam: against,
        gameStatus,
        priorityScore,
        reasonBadge,
        consequenceText,
        consequenceNote: consequenceText,
      };
    });

  return mapped.sort((a, b) => b.priorityScore - a.priorityScore).slice(0, maxItems);
}

export function evaluateLateGameEscape(params: {
  viewerPoints: number;
  targetSafePoints: number;
  remainingDisagreementGames: Array<{ gameId: string; awayTeam: string; homeTeam: string; viewerPick: string }>;
  holdsTiebreakerEdge?: boolean | null;
  activeMemberCount?: number;
  isSimulation?: boolean;
}): LateGameEscapeScenario {
  const deficit = Math.max(0, params.targetSafePoints - params.viewerPoints);
  const remCount = params.remainingDisagreementGames.length;

  if (params.isSimulation) {
    return {
      remainingDisagreements: remCount,
      viewerPointDeficit: deficit,
      canMathematicallyEscape: false,
      requiresTiebreaker: false,
      scenarioMode: 'SIMULATION_EXCLUDED',
      canClaimExactClinch: false,
      headline: 'Sandbox Simulation Active',
      requirementSummary: 'Simulated outcomes are excluded from official escape/clinch guarantees and league receipts.',
    };
  }

  if (remCount > 2) {
    return {
      remainingDisagreements: remCount,
      viewerPointDeficit: deficit,
      canMathematicallyEscape: deficit <= remCount,
      requiresTiebreaker: false,
      scenarioMode: 'MID_SLATE_GUIDANCE',
      canClaimExactClinch: false,
      headline: `Mid-Slate Rooting Guidance (${remCount} Split Games Open)`,
      requirementSummary: 'Exact escape/clinch guarantees unlock when 1–2 decisive split games remain. Focus on your top Rooting Queue matchups.',
    };
  }

  if (deficit === 0) {
    return {
      remainingDisagreements: remCount,
      viewerPointDeficit: 0,
      canMathematicallyEscape: true,
      requiresTiebreaker: false,
      scenarioMode: 'HOLDING_SAFE_GROUND',
      canClaimExactClinch: true,
      headline: 'Holding Safe Ground',
      requirementSummary:
        remCount > 0
          ? `Currently level or ahead — win ${remCount === 1 ? params.remainingDisagreementGames[0].viewerPick : 'remaining split picks'} to lock Safe Haven.`
          : 'All split matchups complete — current standing holds.',
    };
  }

  if (deficit > remCount) {
    return {
      remainingDisagreements: remCount,
      viewerPointDeficit: deficit,
      canMathematicallyEscape: false,
      requiresTiebreaker: false,
      scenarioMode: 'CLINCH_AGAINST',
      canClaimExactClinch: true,
      headline: 'Mathematical Clinch Against',
      requirementSummary: `Trailing by ${deficit} pt${deficit === 1 ? '' : 's'} with only ${remCount} split game${remCount === 1 ? '' : 's'} remaining.`,
    };
  }

  const neededTeams = params.remainingDisagreementGames.slice(0, deficit).map((g) => g.viewerPick.toUpperCase());
  const requiresTiebreak = deficit === remCount && params.holdsTiebreakerEdge !== true;

  const isDuelScoped = Boolean(params.activeMemberCount && params.activeMemberCount > 2);
  const headline = isDuelScoped
    ? 'Duel Escape Path Active'
    : remCount <= 2
    ? 'Late-Slate Escape Path Active'
    : `${deficit}-Game Comeback Path Open`;

  return {
    remainingDisagreements: remCount,
    viewerPointDeficit: deficit,
    canMathematicallyEscape: true,
    requiresTiebreaker: requiresTiebreak,
    scenarioMode: 'EXACT_CLINCH',
    canClaimExactClinch: true,
    headline,
    requirementSummary: requiresTiebreak
      ? `Need ${neededTeams.join(' + ')} win${neededTeams.length > 1 ? 's' : ''} to force a tie, plus Monday Night tiebreaker differential.`
      : `Need ${neededTeams.join(' + ')} win${neededTeams.length > 1 ? 's' : ''} to erase the ${deficit}-pt gap.`,
  };
}

export function summarizeNemesisRecord(
  settledWeeks: Array<{ week: number; viewerScore: number; rivalScore: number }>,
  viewerName: string = 'You',
  rivalName: string = 'Rival'
): NemesisRecordSummary {
  let viewerWins = 0;
  let rivalWins = 0;
  let ties = 0;

  for (const w of settledWeeks) {
    if (w.viewerScore > w.rivalScore) viewerWins += 1;
    else if (w.rivalScore > w.viewerScore) rivalWins += 1;
    else ties += 1;
  }

  const total = settledWeeks.length;
  if (total === 0) {
    return {
      viewerWins: 0,
      rivalWins: 0,
      ties: 0,
      settledWeeksCount: 0,
      badgeText: 'FIRST SEASON DUEL (0-0)',
      subText: 'Official head-to-head Nemesis record begins once your first shared week settles.',
    };
  }

  const recordStr = ties > 0 ? `${viewerWins}-${rivalWins}-${ties}` : `${viewerWins}-${rivalWins}`;
  const leaderText =
    viewerWins > rivalWins
      ? `${viewerName} lead rivalry ${recordStr}`
      : rivalWins > viewerWins
      ? `${rivalName} leads rivalry ${recordStr}`
      : `Rivalry deadlocked ${recordStr}`;

  return {
    viewerWins,
    rivalWins,
    ties,
    settledWeeksCount: total,
    badgeText: leaderText.toUpperCase(),
    subText: `Across ${total} settled week${total === 1 ? '' : 's'}`,
  };
}

export function classifyPickDistributionBadge(
  pickedCount: number,
  totalPickers: number,
  teamCode: string
): PickDistributionBadge {
  const cleanTeam = teamCode.toUpperCase().trim();
  if (totalPickers <= 0 || pickedCount <= 0) {
    return {
      type: 'MAJORITY',
      label: `0 of ${Math.max(0, totalPickers)} backed ${cleanTeam}`,
      pickedCount: 0,
      totalPickers: Math.max(0, totalPickers),
    };
  }
  if (pickedCount === totalPickers) {
    return {
      type: 'CONSENSUS',
      label: `Unanimous (${pickedCount} of ${totalPickers} backed ${cleanTeam})`,
      pickedCount,
      totalPickers,
    };
  }
  if (totalPickers === 2 && pickedCount === 1) {
    return {
      type: 'SPLIT_DECISION',
      label: `Split Decision (1 of 2 backed ${cleanTeam})`,
      pickedCount,
      totalPickers,
    };
  }
  if (pickedCount === 1 && totalPickers >= 3) {
    return {
      type: 'LONE_WOLF',
      label: `Lone Wolf (Only 1 of ${totalPickers} backed ${cleanTeam})`,
      pickedCount,
      totalPickers,
    };
  }
  return {
    type: 'MAJORITY',
    label: `${pickedCount} of ${totalPickers} backed ${cleanTeam}`,
    pickedCount,
    totalPickers,
  };
}

export * from './sweatReceiptService';
export * from './seasonStoryService';
export * from './weeklyRecapService';

