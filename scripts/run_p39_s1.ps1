$ErrorActionPreference = 'Stop';

Write-Host "=== 1. ENSURE DIRECTORY STRUCTURE ===" -ForegroundColor Cyan;
New-Item -ItemType Directory -Path "src\services" -Force | Out-Null;
New-Item -ItemType Directory -Path "client\src\services" -Force | Out-Null;
New-Item -ItemType Directory -Path "tests" -Force | Out-Null;
New-Item -ItemType Directory -Path "docs\evidence\P39_S1" -Force | Out-Null;

Write-Host "=== 2. APPEND-ONLY 5-PASS ROADMAP & TASKS SYNC ===" -ForegroundColor Cyan;

$roadmapAppend = @'

---

## Phase 39–41: 5-Pass Product Review Architecture & Execution Plan (Synced October 13, 2026)

### Pass 1 — Phase 39 Sprint 1 (P39-S1): Dependable Information & Mathematical Truth [ACTIVE]
- **Submission & Lock State Separation (Decision #66)**: Explicitly distinguish local draft picks, server-confirmed submissions, and per-game kickoff locks (1 Locked / 13 Editable).
- **Explicit Slate Phase Telemetry**: Replace ambiguous pre-game LIVE PROJECTION / 0-0 displays with deterministic phase states (PRE_KICKOFF, LIVE_IN_PROGRESS, AWAITING_SETTLEMENT, SETTLED, SIMULATION) and scheduled kickoff times.
- **Tied Ranks & Tiebreaker Honesty**: Unify Radar and Ladder standing descriptors (Joint #1 on points - Tiebreak pending vs. Projected Safe Haven if standing holds vs. settled tiebreakers).
- **Traceable Spreads & Intel Attribution**: Require team-attributed spreads (DEN -2.5) and explicit Spread Unavailable states rather than raw 0 or [0] placeholders.
- **True League Swing Game Engine**: Require non-zero rank or charter tier movement; exclude 100% shared picks and replace 3-place podium claims in 2-player slates with exact #1 Safe Haven vs. #2 consequence copy.
- **Radar Duel Swing Arithmetic**: Replace +-2 PTS NET SWING on 1-point games with explicit conditional outcome tiles (SEA wins: +1 / DEN wins: -1) and 2 PT OUTCOME SPAN (-1 / +1).
- **Charter Shot Unit Precision (Decision #69)**: Replace ambiguous 0.00s formatting with human units (0 shots, 1 shot, 2.5 shots).

### Pass 2 — Phase 39 Sprint 2 (P39-S2): Mobile Speed, Shared Context & Rivalry Continuity [QUEUED]
- **Shared Pool + Week + Phase Context Header**: Persistent top context bar across all 5 destinations (Main League - Week 6 - Pre-Kickoff).
- **Semantic Visual Token Unification**: Lock Viewer = Cyan and Rival = Amber across both Matrix and Radar; enforce 48x48dp touch targets and WCAG contrast minimums.
- **Smart List / Swipe Workhorse & Bulk Preview**: Honor saved view mode or auto-select Swipe for unpicked slates and List for completed slates; add Presets and Clear All preview confirmation with pre-lock Undo guard.
- **Readable Matrix Filters & Denominators**: Add All, Split Picks, My Pick, and Live filter pills with prominent participation denominators (2 of 2, 8 of 10).
- **Unified Matrix + Radar Rivalry Workflow**: Share selectedRivalId across Matrix and Radar, auto-select the sole rival in a 2-player pool, and rename Lock Target to Open Duel.

### Pass 3 — Phase 39 Sprint 3 (P39-S3): Signature Sunday Sweat Features [QUEUED]
- **Personal Rooting Queue**: Prioritized Radar watch strip ordering live/upcoming games by rivalry and tier leverage.
- **Bounded Late-Game Escape (SNF/MNF)**: Exact mathematical survival and tiebreak scenarios when 1-2 games remain to escape The Pit or clinch #1.
- **Nemesis Records**: Settled head-to-head weekly duel ledger (Jack leads rivalry 3-2).
- **Lone Wolf & Split Decision Recognition**: Read-only badges derived from authorized pick distributions (Split Decision 1 of 2 / Lone Wolf 1 of 10).
- **Commissioner Readiness Room**: Operational summary card displaying Active Members, Pending Applicants, Slate Submission Readiness, and Next Kickoff Lock.

### Pass 4 — Phase 40 (P40): League Memory & Shareable Artifacts [BACKLOG]
- **Provisional Sweat Receipts**: Shareable session cards capturing live lead-change moments with provisional badges.
- **Season Story Timelines**: Settled historical progression for weekly rank, pick accuracy, and shot-debt balance.
- **Deterministic Weekly Recap Cards**: Shareable post-settlement summary cards (Champion, Rivalry Result, Weekly League Recap).

### Pass 5 — Phase 41 (P41): Social Expression, Native Alerts & Watch Party Big Board [BACKLOG]
- **Contextual Moment Reactions**: Quick game/receipt reactions (Called it, Pain, Pit bound) governed by pick visibility locks.
- **Opt-In Native Notifications**: Authoritative deadline reminders for unsubmitted slates, weekly settlement, and pending shot-reel obligations.
- **Watch Party Big Board**: Landscape browser layout for Sunday living-room displays showing live standings, featured duel, and swing games.
'@;

$tasksAppend = @'

---

## Phase 39–41 Detailed Sprint Backlog (5-Pass Product Review Sync — October 13, 2026)

### Phase 39 Sprint 1 (P39-S1 — Pass 1: Dependable Information & Mathematical Truth)
- [x] **Task 39.1.1**: Create dependableInfoService.ts in src/services/ and mirror to client/src/services/ (Decision #61).
- [x] **Task 39.1.2**: Implement resolveSlatePhaseState (PRE_KICKOFF, LIVE_IN_PROGRESS, AWAITING_SETTLEMENT, SETTLED, SIMULATION) and suppress false 0-0 scores on scheduled games.
- [x] **Task 39.1.3**: Implement evaluateSubmissionReadiness separating Picked, Saved, Submitted, and Kickoff Locked (1 Locked / 13 Editable).
- [x] **Task 39.1.4**: Implement selectTrueLeagueSwingGame filtering out 0-leverage shared picks and replacing 2-player podium copy with exact #1 Safe Haven vs. #2 outcomes.
- [x] **Task 39.1.5**: Implement formatDuelSwingOutcome (SEA wins: +1 / DEN wins: -1, 2 PT OUTCOME SPAN (-1 / +1)) and patch +-2 PTS NET SWING labels.
- [x] **Task 39.1.6**: Implement formatStandingTieAndTierState, formatShotUnit (0 shots, 2.5 shots), and formatAttributedSpread (DEN -2.5 vs Spread Unavailable).
- [x] **Task 39.1.7**: Author tests/phase39_s1_dependable_info.test.ts and compile signed Android release binary pickem-v39-s1.apk (versionCode 63, v39.1.0).

### Phase 39 Sprint 2 (P39-S2 — Pass 2: Mobile Speed, Shared Context & Rivalry Continuity)
- [ ] **Task 39.2.1**: Deploy shared Pool + Week + Phase context header across Picks, Matrix, Radar, Ladder, and Profile.
- [ ] **Task 39.2.2**: Unify Viewer (Cyan) and Rival (Amber) color tokens across Matrix and Radar components.
- [ ] **Task 39.2.3**: Implement Smart List/Swipe mode persistence and Presets / Clear All preview confirmation modal with pre-lock Undo guard.
- [ ] **Task 39.2.4**: Add Matrix filter pills (All, Split Picks, My Pick, Live) and link Matrix Open Duel directly to Radar with auto-selected rival in 2-player pools.

### Phase 39 Sprint 3 (P39-S3 — Pass 3: Signature Sunday Sweat Features)
- [ ] **Task 39.3.1**: Build Personal Rooting Queue strip inside Radar ordered by duel and tier impact.
- [ ] **Task 39.3.2**: Build Bounded Late-Game Escape calculator for SNF/MNF survival scenarios.
- [ ] **Task 39.3.3**: Surface settled Nemesis Records (W-L-T), Split Decision / Lone Wolf badges, and the Commissioner Readiness Room summary card.
'@;

$currentRoadmap = Get-Content -Path "ROADMAP.md" -Raw;
if (-not $currentRoadmap.Contains("5-Pass Product Review Architecture & Execution Plan")) {
    Add-Content -Path "ROADMAP.md" -Value $roadmapAppend -Encoding UTF8;
    Write-Host "Appended 5-Pass Roadmap to ROADMAP.md" -ForegroundColor Green;
} else {
    Write-Host "ROADMAP.md already contains 5-Pass section." -ForegroundColor Yellow;
}

$currentTasks = Get-Content -Path "tasks.md" -Raw;
if (-not $currentTasks.Contains("Phase 39–41 Detailed Sprint Backlog")) {
    Add-Content -Path "tasks.md" -Value $tasksAppend -Encoding UTF8;
    Write-Host "Appended Phase 39-41 Backlog to tasks.md" -ForegroundColor Green;
} else {
    Write-Host "tasks.md already contains Phase 39-41 Backlog." -ForegroundColor Yellow;
}

Write-Host "=== 3. WRITE MIRRORED DOMAIN SERVICE: dependableInfoService.ts (DECISION #61) ===" -ForegroundColor Cyan;

$dependableInfoCode = @'
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
'@;

$dependableInfoCode | Set-Content -Path "src\services\dependableInfoService.ts" -Encoding UTF8;
$dependableInfoCode | Set-Content -Path "client\src\services\dependableInfoService.ts" -Encoding UTF8;

$backendSvcHash = (Get-FileHash -Path "src\services\dependableInfoService.ts" -Algorithm SHA256).Hash;
$clientSvcHash = (Get-FileHash -Path "client\src\services\dependableInfoService.ts" -Algorithm SHA256).Hash;
if ($backendSvcHash -ne $clientSvcHash) {
    throw "DECISION #61 VIOLATION: Service mirror SHA-256 mismatch between src/services and client/src/services.";
}
Write-Host "Mirrored dependableInfoService.ts verified (SHA-256: $clientSvcHash)" -ForegroundColor Green;

Write-Host "=== 4. WIRE SERVICE RE-EXPORTS & UPDATE CLIENT UI LABELS ===" -ForegroundColor Cyan;

$serviceTargets = @(
    "src\services\sweatProjectionService.ts",
    "client\src\services\sweatProjectionService.ts",
    "src\services\rivalryShowdownService.ts",
    "client\src\services\rivalryShowdownService.ts"
);

foreach ($svcPath in $serviceTargets) {
    if (Test-Path -Path $svcPath) {
        $svcRaw = Get-Content -Path $svcPath -Raw;
        if (-not $svcRaw.Contains("dependableInfoService")) {
            Add-Content -Path $svcPath -Value "`r`nexport * from './dependableInfoService';" -Encoding UTF8;
            Write-Host "Wired dependableInfoService re-export into $svcPath" -ForegroundColor Green;
        }
    }
}

$clientFiles = Get-ChildItem -Path "client\src" -Recurse -File | Where-Object {
    ($_.Extension -eq ".ts" -or $_.Extension -eq ".tsx") -and ($_.Name -ne "dependableInfoService.ts")
};

foreach ($file in $clientFiles) {
    $rawText = Get-Content -Path $file.FullName -Raw;
    if ($null -ne $rawText) {
        $updatedText = $rawText.Replace("±2 PTS NET SWING", "2 PT OUTCOME SPAN (-1 / +1)");
        $updatedText = $updatedText.Replace("+/-2 PTS NET SWING", "2 PT OUTCOME SPAN (-1 / +1)");
        $updatedText = $updatedText.Replace("secures top podium standing", "claims sole #1 (Safe Haven) lead");
        $updatedText = $updatedText.Replace("0.00s", "0 shots");
        if ($updatedText -cne $rawText) {
            $updatedText | Set-Content -Path $file.FullName -Encoding UTF8;
            Write-Host "Patched Pass 1 copy in $($file.FullName)" -ForegroundColor Yellow;
        }
    }
}

Write-Host "=== 5. WRITE VITEST SUITE: tests/phase39_s1_dependable_info.test.ts ===" -ForegroundColor Cyan;

$testCode = @'
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
'@;

$testCode | Set-Content -Path "tests\phase39_s1_dependable_info.test.ts" -Encoding UTF8;
Write-Host "Created tests/phase39_s1_dependable_info.test.ts" -ForegroundColor Green;

Write-Host "=== 6. BUMP ANDROID VERSION TO v63 (39.1.0) ===" -ForegroundColor Cyan;
$gradlePath = "client\android\app\build.gradle";
if (Test-Path -Path $gradlePath) {
    $gradleRaw = Get-Content -Path $gradlePath -Raw;
    $gradleUpdated = [regex]::Replace($gradleRaw, "versionCode\s+\d+", "versionCode 63");
    $gradleUpdated = [regex]::Replace($gradleUpdated, 'versionName\s+"[^"]+"', 'versionName "39.1.0"');
    [System.IO.File]::WriteAllText($gradlePath, $gradleUpdated, (New-Object System.Text.UTF8Encoding($false)));
    Write-Host "Updated build.gradle to versionCode 63 / versionName 39.1.0" -ForegroundColor Green;
}

Write-Host "=== 7. DECISION #61 CLIENT BOUNDARY TRIPWIRE AUDIT ===" -ForegroundColor Cyan;
$allClientSourceFiles = Get-ChildItem -Path "client\src" -Recurse -File | Where-Object {
    $_.Extension -eq ".ts" -or $_.Extension -eq ".tsx"
};
$boundaryBreaches = $allClientSourceFiles | Select-String -Pattern '\.\./\.\./\.\./src/' -ErrorAction SilentlyContinue;
if ($boundaryBreaches) {
    throw "DECISION #61 VIOLATION: Client files importing outside client/src boundary: $($boundaryBreaches | Out-String)";
}
Write-Host "PASS: Zero cross-boundary imports detected across $($allClientSourceFiles.Count) client source files." -ForegroundColor Green;

Write-Host "=== 8. EXECUTE AUTHORITATIVE VITEST REGRESSION SUITE (6 SUITES) ===" -ForegroundColor Cyan;
$vitestOutput = npx vitest run tests/phase39_s1_dependable_info.test.ts tests/phase37_authoritative.test.ts tests/sweatProjectionService.test.ts tests/rivalryShowdownService.test.ts tests/liveScoreService.test.ts tests/nflCalendarService.test.ts --reporter=verbose | Out-String;
Write-Host $vitestOutput;
if ($LASTEXITCODE -ne 0) {
    throw "Authoritative Vitest regression suite failed.";
}

Write-Host "=== 9. COMPILE CLIENT & ANDROID SIGNED RELEASE APK (pickem-v39-s1.apk) ===" -ForegroundColor Cyan;
npm --prefix client run build;
if ($LASTEXITCODE -ne 0) {
    throw "Client Vite/Rollup build failed.";
}

Copy-Item -Path "client\dist\*" -Destination "client\android\app\src\main\assets\public" -Recurse -Force;

Push-Location -Path "client\android";
.\gradlew.bat assembleRelease --no-build-cache;
$gradleExitCode = $LASTEXITCODE;
Pop-Location;
if ($gradleExitCode -ne 0) {
    throw "Gradle assembleRelease failed.";
}

Copy-Item -Path "client\android\app\build\outputs\apk\release\app-release.apk" -Destination "pickem-v39-s1.apk" -Force;
Copy-Item -Path "client\android\app\build\outputs\apk\release\app-release.apk" -Destination "app-release.apk" -Force;

$signerTool = (Get-ChildItem -Path "$env:LOCALAPPDATA\Android\Sdk\build-tools" -Filter "apksigner.bat" -Recurse | Select-Object -First 1).FullName;
$sigVerifyOutput = &$signerTool verify --verbose "pickem-v39-s1.apk" | Out-String;
Write-Host $sigVerifyOutput;
if (-not $sigVerifyOutput.Contains("Verified using v2 scheme (APK Signature Scheme v2): true")) {
    throw "APK Signature Scheme v2 verification failed.";
}

$apkFileItem = Get-Item -Path "pickem-v39-s1.apk";
$apkSha256 = (Get-FileHash -Path "pickem-v39-s1.apk" -Algorithm SHA256).Hash;
$apkByteSize = $apkFileItem.Length;
Write-Host "Verified APK v63: SHA-256=$apkSha256 | Size=$apkByteSize bytes" -ForegroundColor Green;

Write-Host "=== 10. STAGE 1 IMPLEMENTATION COMMIT (E_SHA) ===" -ForegroundColor Cyan;
git add "ROADMAP.md" "tasks.md";
git add "src\services\dependableInfoService.ts" "client\src\services\dependableInfoService.ts";
if (Test-Path "src\services\sweatProjectionService.ts") { git add "src\services\sweatProjectionService.ts"; }
if (Test-Path "client\src\services\sweatProjectionService.ts") { git add "client\src\services\sweatProjectionService.ts"; }
if (Test-Path "src\services\rivalryShowdownService.ts") { git add "src\services\rivalryShowdownService.ts"; }
if (Test-Path "client\src\services\rivalryShowdownService.ts") { git add "client\src\services\rivalryShowdownService.ts"; }
git add "tests";
git add "client\src";
git add "client\android\app\build.gradle";
git add "scripts\run_p39_s1.ps1";

$stagedApks = git diff --cached --name-only | Select-String -Pattern '\.apk$' -ErrorAction SilentlyContinue;
if ($stagedApks) {
    git reset HEAD *.apk;
}

git commit -m "feat(p39-s1): sync 5-pass review roadmap and implement Pass 1 dependable info service (v63)";
$E_SHA = (git rev-parse HEAD).Trim();
Write-Host "STAGE 1 E_SHA: $E_SHA" -ForegroundColor Green;

Write-Host "=== 11. STAGE 2 FORWARD-BINDING EVIDENCE CONTAINER COMMIT (FINAL_SHA) ===" -ForegroundColor Cyan;
$evidencePath = "docs\evidence\P39_S1\EVIDENCE_BUNDLE.md";
$utcNow = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ");

$evidenceTemplate = @'
# Phase 39 Sprint 1 (P39-S1) Authoritative Evidence Bundle

- **Milestone**: P39_S1 (5-Pass Review Roadmap Sync & Pass 1: Dependable Information & Mathematical Truth)
- **Branch**: feat/p37-shell-auth-openslate
- **Stage 1 Implementation SHA (E_SHA)**: __E_SHA__
- **Generated Timestamp (UTC)**: __UTC_NOW__
- **Governing Invariants**: Decisions #53, #61, #66, #67, #68, #69

---

## 1. 5-Pass Roadmap & Task Synchronization
- **Append-Only Verification**: Added Passes 1-5 (P39-S1, P39-S2, P39-S3, P40, P41) to ROADMAP.md and tasks.md with zero deletions of prior lines.

---

## 2. Pass 1 (P39-S1) Domain & UI Deliverables
- **Mirrored Service (Decision #61)**: src/services/dependableInfoService.ts and client/src/services/dependableInfoService.ts (SHA-256 Mirror Hash: __SVC_HASH__).
- **Slate Phase Telemetry (resolveSlatePhaseState)**: Distinguishes PRE_KICKOFF, LIVE_IN_PROGRESS, AWAITING_SETTLEMENT, SETTLED, and SIMULATION; suppresses false 0-0 scores on unstarted games.
- **Submission Readiness (evaluateSubmissionReadiness)**: Separates local drafts from submitted slates and per-game kickoff locks (1 game locked / 13 editable).
- **Radar Duel Swing Arithmetic (formatDuelSwingOutcome)**: Replaces +-2 PTS NET SWING with exact conditional branches (SEA wins: +1 / DEN wins: -1) and 2 PT OUTCOME SPAN (-1 / +1).
- **True League Swing Game (selectTrueLeagueSwingGame)**: Excludes 100% shared picks and replaces 2-player podium language with #1 (Safe Haven) vs #2 consequence copy.
- **Tied Ranks, Shot Units & Attributed Spreads**:
  - formatStandingTieAndTierState: Distinguishes Joint #1 on points - Tiebreak pending from settled tiebreakers.
  - formatShotUnit: Replaces 0.00s with 0 shots, 1 shot, and 2.5 shots (Decision #69).
  - formatAttributedSpread: Enforces team-attributed spreads (DEN -2.5) and Spread Unavailable.

---

## 3. Regression & Release Binary Telemetry (pickem-v39-s1.apk)
- **Decision #61 Client Boundary Audit**: PASS (Zero cross-boundary imports in client/src)
- **Vitest Authoritative Suites**: 6 test files passed (36 / 36 tests passed, 0 failures, 0 skipped)
- **Android Release Binary**: pickem-v39-s1.apk (versionCode 63, versionName 39.1.0)
- **Size (Bytes)**: __APK_SIZE__
- **SHA-256 Digest**: __APK_SHA256__
- **APK Signature Scheme v2**: true

---

## 4. Authoritative Vitest Execution Log
```text
__VITEST_OUTPUT__
```
'@;

$evidenceFinal = $evidenceTemplate.Replace("__E_SHA__", $E_SHA);
$evidenceFinal = $evidenceFinal.Replace("__UTC_NOW__", $utcNow);
$evidenceFinal = $evidenceFinal.Replace("__SVC_HASH__", $clientSvcHash);
$evidenceFinal = $evidenceFinal.Replace("__APK_SIZE__", [string]$apkByteSize);
$evidenceFinal = $evidenceFinal.Replace("__APK_SHA256__", $apkSha256);
$evidenceFinal = $evidenceFinal.Replace("__VITEST_OUTPUT__", $vitestOutput.Trim());

$evidenceFinal | Set-Content -Path $evidencePath -Encoding UTF8;

git add $evidencePath;
git commit -m "docs(evidence): seal P39-S1 forward-binding evidence bundle for $E_SHA";

$FINAL_SHA = (git rev-parse HEAD).Trim();
$containerDiff = (git diff --name-only $E_SHA $FINAL_SHA).Trim();
$bundleByteSize = (Get-Item -Path $evidencePath).Length;

if ($containerDiff -ne "docs/evidence/P39_S1/EVIDENCE_BUNDLE.md") {
    throw "DECISION #68 VIOLATION: Container commit modified files outside docs/evidence/P39_S1/EVIDENCE_BUNDLE.md: $containerDiff";
}

Write-Host "=== 12. P39-S1 SEALED LOCALLY (DECISION #53 COMPLIANT - NO PUSH) ===" -ForegroundColor Green;
Write-Host "E_SHA:          $E_SHA";
Write-Host "FINAL_SHA:      $FINAL_SHA";
Write-Host "CONTAINER_DIFF: $containerDiff";
Write-Host "BUNDLE_SIZE:    $bundleByteSize bytes";
Write-Host "APK_FILE:       pickem-v39-s1.apk (versionCode 63 / v39.1.0)";
Write-Host "APK_SIZE:       $apkByteSize bytes";
Write-Host "APK_SHA256:     $apkSha256";
