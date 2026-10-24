/**
 * Authoritative Kickoff Lock Evaluator & Slate Eligibility Engine
 * Enforces Decision #66 Lock Supremacy and Fail-Closed Security (Decision #55).
 */

import { LiveGame } from './liveScoreService';

export function isKickoffLocked(kickoffTime: string | number | Date, referenceTime?: number | Date): boolean {
  const target = new Date(kickoffTime).getTime();
  const current = referenceTime ? new Date(referenceTime).getTime() : Date.now();
  if (isNaN(target) || target <= 0) return true; // Fail closed on invalid date (Decision #55)
  return current >= target;
}

export type GameLockState = 'OPEN' | 'LOCKED' | 'UNAVAILABLE';

export interface GameLockEvaluation {
  state: GameLockState;
  isLocked: boolean; // fail-closed write gating: true if LOCKED or UNAVAILABLE
  effectiveDeadline: Date | null;
  lockTimeMs: number | null;
  reason?: 'GAME_STARTED_OR_FINAL' | 'KICKOFF_PASSED' | 'DEADLINE_IN_FUTURE' | 'UNVERIFIED_KICKOFF';
}

export function evaluateCanonicalGameLock(
  game: {
    kickoffTime?: string | number | Date | null;
    kickoff_time?: string | number | Date | null;
    canonicalKickoffTime?: string | number | Date | null;
    canonical_kickoff_time?: string | number | Date | null;
    lockEffectiveAt?: string | number | Date | null;
    lock_effective_at?: string | number | Date | null;
    status?: string | null;
    gameStatus?: string | null;
    isKickoffConfirmed?: boolean;
    is_kickoff_confirmed?: boolean;
  },
  lockOffsetMinutes: number = 0,
  referenceTime: Date | number = Date.now()
): GameLockEvaluation {
  if (!game) {
    return {
      state: 'UNAVAILABLE',
      isLocked: true,
      effectiveDeadline: null,
      lockTimeMs: null,
      reason: 'UNVERIFIED_KICKOFF',
    };
  }

  // 1. Check live / final statuses
  const rawStatus = (game.status || game.gameStatus || '').toUpperCase();
  if (rawStatus === 'FINAL' || rawStatus === 'IN_PROGRESS' || rawStatus === 'LIVE' || rawStatus === 'HALFTIME') {
    return {
      state: 'LOCKED',
      isLocked: true,
      effectiveDeadline: null,
      lockTimeMs: null,
      reason: 'GAME_STARTED_OR_FINAL',
    };
  }

  // 2. Check kickoff confirmation and explicit canonical NULL denial
  if (
    game.isKickoffConfirmed === false ||
    game.is_kickoff_confirmed === false ||
    game.canonicalKickoffTime === null ||
    game.canonical_kickoff_time === null
  ) {
    return {
      state: 'UNAVAILABLE',
      isLocked: true,
      effectiveDeadline: null,
      lockTimeMs: null,
      reason: 'UNVERIFIED_KICKOFF',
    };
  }

  // 3. Resolve effective deadline
  const rawDeadline =
    game.lockEffectiveAt ??
    game.lock_effective_at ??
    game.canonicalKickoffTime ??
    game.canonical_kickoff_time ??
    game.kickoffTime ??
    game.kickoff_time;

  if (rawDeadline === null || rawDeadline === undefined) {
    return {
      state: 'UNAVAILABLE',
      isLocked: true,
      effectiveDeadline: null,
      lockTimeMs: null,
      reason: 'UNVERIFIED_KICKOFF',
    };
  }

  const deadline = new Date(rawDeadline);
  const deadlineMs = deadline.getTime();
  if (isNaN(deadlineMs) || deadlineMs <= 0) {
    return {
      state: 'UNAVAILABLE',
      isLocked: true,
      effectiveDeadline: null,
      lockTimeMs: null,
      reason: 'UNVERIFIED_KICKOFF',
    };
  }

  // 4. Validate lock offset
  const offsetNum = Number(lockOffsetMinutes);
  if (isNaN(offsetNum) || !Number.isFinite(offsetNum)) {
    return {
      state: 'UNAVAILABLE',
      isLocked: true,
      effectiveDeadline: deadline,
      lockTimeMs: null,
      reason: 'UNVERIFIED_KICKOFF',
    };
  }

  // 5. Evaluate against reference time
  const nowMs = typeof referenceTime === 'number' ? referenceTime : new Date(referenceTime).getTime();
  if (isNaN(nowMs) || nowMs <= 0) {
    return {
      state: 'UNAVAILABLE',
      isLocked: true,
      effectiveDeadline: deadline,
      lockTimeMs: null,
      reason: 'UNVERIFIED_KICKOFF',
    };
  }

  // Apply pool lock offset to stored effective deadline
  const lockTimeMs = deadlineMs - offsetNum * 60 * 1000;
  const lockDeadline = new Date(lockTimeMs);
  if (nowMs >= lockTimeMs) {
    return {
      state: 'LOCKED',
      isLocked: true,
      effectiveDeadline: lockDeadline,
      lockTimeMs,
      reason: 'KICKOFF_PASSED',
    };
  }

  return {
    state: 'OPEN',
    isLocked: false,
    effectiveDeadline: lockDeadline,
    lockTimeMs,
    reason: 'DEADLINE_IN_FUTURE',
  };
}

export interface SlateLockSummary {
  openCount: number;
  lockedCount: number;
  unavailableCount: number;
  total: number;
  allGamesFinal: boolean;
  allGamesLocked: boolean;
  anyGameLive: boolean;
  anyStartedOrFinal: boolean;
  anyUpcoming: boolean;
  phaseLabel: 'Status unavailable' | 'Games not started' | 'Week in progress' | 'Games live' | 'All games final';
  lockBadgeText: string;
  isBadgeOpen: boolean;
}

export function evaluateSlateLockSummary(
  games: readonly any[],
  liveScores: readonly LiveGame[] = [],
  lockOffsetMinutes: number = 0,
  referenceTime: Date | number = Date.now()
): SlateLockSummary {
  if (!games || games.length === 0) {
    return {
      openCount: 0,
      lockedCount: 0,
      unavailableCount: 0,
      total: 0,
      allGamesFinal: false,
      allGamesLocked: false,
      anyGameLive: false,
      anyStartedOrFinal: false,
      anyUpcoming: false,
      phaseLabel: 'Status unavailable',
      lockBadgeText: 'UNAVAILABLE',
      isBadgeOpen: false,
    };
  }

  const scoreMap = new Map<string, LiveGame>();
  if (Array.isArray(liveScores)) {
    for (const s of liveScores) {
      if (s && s.id) {
        scoreMap.set(String(s.id), s);
      }
    }
  }

  let openCount = 0;
  let lockedCount = 0;
  let unavailableCount = 0;
  let anyLive = false;
  let allFinal = true;
  let actualStartedOrFinalCount = 0;
  let uncertainCount = 0;

  const nowMs = typeof referenceTime === 'number' ? referenceTime : new Date(referenceTime).getTime();

  for (const g of games) {
    if (!g) {
      unavailableCount++;
      uncertainCount++;
      allFinal = false;
      continue;
    }

    const gExtId = g.externalGameId || g.external_game_id;
    const gId = String(g.id || g.game_id || '');
    const live = (gExtId ? scoreMap.get(String(gExtId)) : undefined) || scoreMap.get(gId);

    const mergedStatus = String(live?.status || g.status || g.gameStatus || '').toUpperCase();
    const isLiveGame = mergedStatus === 'IN_PROGRESS' || mergedStatus === 'LIVE' || mergedStatus === 'HALFTIME';
    const isFinalGame = mergedStatus === 'FINAL';
    const isExplicitPregame = mergedStatus === 'SCHEDULED' || mergedStatus === 'PRE';

    const rawKickoff = g.canonical_kickoff_time || g.canonicalKickoffTime || g.kickoff_time || g.kickoffTime;
    const kickoffMs = rawKickoff ? new Date(rawKickoff).getTime() : NaN;
    const hasValidKickoff = !isNaN(kickoffMs) && kickoffMs > 0;
    const isKickoffPassed = hasValidKickoff && nowMs >= kickoffMs;

    const isVerifiedUpcoming = isExplicitPregame && hasValidKickoff && !isKickoffPassed;
    const isUncertain = !isLiveGame && !isFinalGame && !isVerifiedUpcoming;

    if (isUncertain) {
      uncertainCount++;
    }

    if (isLiveGame) {
      anyLive = true;
      actualStartedOrFinalCount++;
    } else if (isFinalGame) {
      actualStartedOrFinalCount++;
    }

    if (!isFinalGame) {
      allFinal = false;
    }

    const evalResult = evaluateCanonicalGameLock(
      {
        ...g,
        status: mergedStatus,
      },
      lockOffsetMinutes,
      referenceTime
    );

    if (evalResult.state === 'OPEN') {
      openCount++;
    } else if (evalResult.state === 'LOCKED') {
      lockedCount++;
    } else {
      unavailableCount++;
    }
  }

  const total = games.length;
  const allGamesFinal = total > 0 && allFinal;
  const anyStartedOrFinal = actualStartedOrFinalCount > 0;
  const anyUpcoming = total > actualStartedOrFinalCount;
  const allGamesLocked = total > 0 && lockedCount === total && openCount === 0 && unavailableCount === 0;

  let phaseLabel: 'Status unavailable' | 'Games not started' | 'Week in progress' | 'Games live' | 'All games final';
  if (total === 0 || unavailableCount === total || uncertainCount > 0) {
    phaseLabel = 'Status unavailable';
  } else if (allGamesFinal) {
    phaseLabel = 'All games final';
  } else if (anyLive) {
    phaseLabel = 'Games live';
  } else if (anyStartedOrFinal && anyUpcoming) {
    phaseLabel = 'Week in progress';
  } else if (!anyStartedOrFinal && !anyLive && unavailableCount === 0) {
    phaseLabel = 'Games not started';
  } else {
    phaseLabel = 'Status unavailable';
  }

  let lockBadgeText: string;
  let isBadgeOpen = false;

  if (total === 0 || unavailableCount === total) {
    lockBadgeText = 'UNAVAILABLE';
  } else if (openCount > 0) {
    lockBadgeText = `PICKS OPEN: ${openCount}`;
    isBadgeOpen = true;
  } else if (allGamesLocked) {
    lockBadgeText = 'ALL GAMES LOCKED';
  } else {
    lockBadgeText = 'UNAVAILABLE';
  }

  return {
    openCount,
    lockedCount,
    unavailableCount,
    total,
    allGamesFinal,
    allGamesLocked,
    anyGameLive: anyLive,
    anyStartedOrFinal,
    anyUpcoming,
    phaseLabel,
    lockBadgeText,
    isBadgeOpen,
  };
}
