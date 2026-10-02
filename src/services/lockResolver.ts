/**
 * Lock Resolver - Pure, stateless calculation engine for game locks and exclusion windows.
 * ZERO database queries, ZERO database mutations, ZERO network calls.
 */

export interface LockContext {
  kickoffTime: Date | string | null | undefined;
  lockOffsetMinutes?: number | null;
  now?: Date | string | null;
}

export interface LockStatus {
  isLocked: boolean;
  effectiveLockTime: Date | null;
  minutesRemaining: number | null;
}

/**
 * Calculates whether a game is locked given kickoff time, lock offset (in minutes), and current time.
 * Fails closed (returns true) if kickoffTime is null, undefined, or invalid Date.
 */
export function isGameLocked(
  kickoffTime: Date | string | null | undefined,
  lockOffsetMinutes: number | null = 0,
  nowTime?: Date | string | null
): boolean {
  if (!kickoffTime) {
    return true; // Fail closed on missing kickoff time
  }

  const kickoff = typeof kickoffTime === 'string' ? new Date(kickoffTime) : kickoffTime;
  if (isNaN(kickoff.getTime())) {
    return true; // Fail closed on invalid date
  }

  const offset = typeof lockOffsetMinutes === 'number' && !isNaN(lockOffsetMinutes) ? lockOffsetMinutes : 0;
  const now = nowTime ? (typeof nowTime === 'string' ? new Date(nowTime) : nowTime) : new Date();

  if (isNaN(now.getTime())) {
    return true; // Fail closed on invalid current time
  }

  const lockThreshold = new Date(kickoff.getTime() - offset * 60 * 1000);
  return now.getTime() >= lockThreshold.getTime();
}

/**
 * Asserts that a game is unlocked. Throws an Error ('Game is locked') if locked or invalid.
 */
export function assertGameUnlocked(
  kickoffTime: Date | string | null | undefined,
  lockOffsetMinutes: number | null = 0,
  nowTime?: Date | string | null
): void {
  if (isGameLocked(kickoffTime, lockOffsetMinutes, nowTime)) {
    throw new Error('Game is locked');
  }
}

/**
 * Computes full lock status including effective lock time and minutes remaining.
 */
export function computeGameLockStatus(context: LockContext): LockStatus {
  const { kickoffTime, lockOffsetMinutes, now } = context;

  if (!kickoffTime) {
    return {
      isLocked: true,
      effectiveLockTime: null,
      minutesRemaining: null,
    };
  }

  const kickoff = typeof kickoffTime === 'string' ? new Date(kickoffTime) : kickoffTime;
  if (isNaN(kickoff.getTime())) {
    return {
      isLocked: true,
      effectiveLockTime: null,
      minutesRemaining: null,
    };
  }

  const offset = typeof lockOffsetMinutes === 'number' && !isNaN(lockOffsetMinutes) ? lockOffsetMinutes : 0;
  const current = now ? (typeof now === 'string' ? new Date(now) : now) : new Date();

  if (isNaN(current.getTime())) {
    return {
      isLocked: true,
      effectiveLockTime: null,
      minutesRemaining: null,
    };
  }

  const effectiveLockTime = new Date(kickoff.getTime() - offset * 60 * 1000);
  const isLocked = current.getTime() >= effectiveLockTime.getTime();
  const msRemaining = effectiveLockTime.getTime() - current.getTime();
  const minutesRemaining = Math.max(0, Math.floor(msRemaining / (60 * 1000)));

  return {
    isLocked,
    effectiveLockTime,
    minutesRemaining: isLocked ? 0 : minutesRemaining,
  };
}

/**
 * Evaluates whether a game's kickoff time falls into any excluded game windows specified by pool settings.
 * Supported windows include:
 * - 'THURSDAY_NIGHT' / 'THURSDAY' / 'TNF'
 * - 'MONDAY_NIGHT' / 'MONDAY' / 'MNF'
 * - 'SATURDAY'
 * - 'FRIDAY'
 * - 'SUNDAY_NIGHT' / 'SNF'
 * - 'SUNDAY_EARLY' / 'EARLY_SUNDAY'
 * - 'SUNDAY_LATE' / 'LATE_SUNDAY'
 * - 'SUNDAY'
 * - 'INTERNATIONAL'
 */
export function isGameInExcludedWindow(
  kickoffTime: Date | string | null | undefined,
  excludedWindows?: string[]
): boolean {
  if (!kickoffTime || !excludedWindows || !Array.isArray(excludedWindows) || excludedWindows.length === 0) {
    return false;
  }

  const kTime = typeof kickoffTime === 'string' ? new Date(kickoffTime) : kickoffTime;
  if (isNaN(kTime.getTime())) {
    return false;
  }

  const dayUtc = kTime.getUTCDay();
  const hoursUtc = kTime.getUTCHours();
  const localDay = kTime.getDay();

  // Normalized list of uppercase excluded window keys
  const normalizedWindows = excludedWindows.map((w) => String(w).toUpperCase().trim());

  for (const windowKey of normalizedWindows) {
    // Thursday Night
    if (windowKey === 'THURSDAY_NIGHT' || windowKey === 'THURSDAY' || windowKey === 'TNF') {
      if (dayUtc === 4 || (dayUtc === 5 && hoursUtc < 6) || localDay === 4) {
        return true;
      }
    }

    // Monday Night
    if (windowKey === 'MONDAY_NIGHT' || windowKey === 'MONDAY' || windowKey === 'MNF') {
      if (dayUtc === 1 || (dayUtc === 2 && hoursUtc < 6) || localDay === 1) {
        return true;
      }
    }

    // Saturday
    if (windowKey === 'SATURDAY') {
      if (dayUtc === 6 || (dayUtc === 0 && hoursUtc < 4) || localDay === 6) {
        return true;
      }
    }

    // Friday
    if (windowKey === 'FRIDAY') {
      if (dayUtc === 5 || (dayUtc === 6 && hoursUtc < 4) || localDay === 5) {
        return true;
      }
    }

    // Sunday Night Football
    if (windowKey === 'SUNDAY_NIGHT' || windowKey === 'SNF') {
      if ((dayUtc === 0 && hoursUtc >= 23) || (dayUtc === 1 && hoursUtc < 6)) {
        return true;
      }
    }

    // Early Sunday
    if (windowKey === 'SUNDAY_EARLY' || windowKey === 'EARLY_SUNDAY') {
      if (dayUtc === 0 && hoursUtc >= 16 && hoursUtc < 20) {
        return true;
      }
    }

    // Late Sunday
    if (windowKey === 'SUNDAY_LATE' || windowKey === 'LATE_SUNDAY') {
      if (dayUtc === 0 && hoursUtc >= 20 && hoursUtc < 24) {
        return true;
      }
    }

    // Sunday (entire day)
    if (windowKey === 'SUNDAY') {
      if (dayUtc === 0 || (dayUtc === 1 && hoursUtc < 6) || localDay === 0) {
        return true;
      }
    }

    // International (morning Sunday)
    if (windowKey === 'INTERNATIONAL') {
      if (dayUtc === 0 && hoursUtc < 16) {
        return true;
      }
    }
  }

  return false;
}
