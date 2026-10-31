/**
 * Phase 41 Sprint 1 (P41-S1): Pure Opt-In Deadline Reminder Planner
 * Derives deterministic local notification schedules and cancellation plans from verified kickoff windows.
 * Enforces 60-minute lead time, window grouping, deduplication, simulation exclusion, and neutral copy.
 */

export interface DeadlineGameWindowInput {
  gameId: string;
  awayTeam: string;
  homeTeam: string;
  kickoffIso: string | null | undefined;
  status?: string | null;
  isPicked?: boolean;
}

export interface PlannedDeadlineReminder {
  reminderId: string;
  notificationNumericId: number;
  poolId: string;
  season: number;
  week: number;
  userId: string;
  kickoffIso: string;
  fireAtIso: string;
  gameCountInWindow: number;
  unsubmittedCountInWindow: number;
  matchupSummary: string;
  title: string;
  body: string;
  deepLinkPath: string;
}

export interface DeadlinePlannerResult {
  isEnabled: boolean;
  permissionState: 'GRANTED' | 'DENIED' | 'PROMPT_REQUIRED';
  toSchedule: PlannedDeadlineReminder[];
  toCancelIds: string[];
  unchangedIds: string[];
  statusSummary: string;
  isUnavailable?: boolean;
  unresolvedEventCount?: number;
}

function deterministicNumericId(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash % 2000000000) + 1000;
}

export function planDeadlineReminders(params: {
  userId: string | null | undefined;
  poolId: string | null | undefined;
  season?: number;
  seasonType?: number;
  week: number;
  optInEnabled: boolean;
  permissionState: 'GRANTED' | 'DENIED' | 'PROMPT_REQUIRED';
  isSlateSubmitted: boolean;
  isSimulation?: boolean;
  isFixtureData?: boolean;
  hasAcceptedSlate?: boolean;
  nowMs?: number;
  leadMinutes?: number;
  games: DeadlineGameWindowInput[];
  existingScheduledIds?: string[];
}): DeadlinePlannerResult {
  const existingIds = params.existingScheduledIds || [];
  const season = params.season ?? 2026;

  // Without an accepted weekly slate, return an unavailable reminder state and create no ordinary reminder plan
  if (params.hasAcceptedSlate === false || !params.games || params.games.length === 0) {
    return {
      isEnabled: Boolean(params.optInEnabled && params.permissionState === 'GRANTED'),
      permissionState: params.permissionState,
      toSchedule: [],
      toCancelIds: [...existingIds],
      unchangedIds: [],
      statusSummary: 'No accepted weekly slate available — deadline reminder planning unavailable.',
      isUnavailable: true,
      unresolvedEventCount: 0,
    };
  }

  // Cancel all if logged out, pool invalid, opted out, permission denied, simulation, fixture, or slate already submitted
  if (
    !params.userId ||
    !params.poolId ||
    !params.optInEnabled ||
    params.permissionState !== 'GRANTED' ||
    params.isSimulation ||
    params.isFixtureData ||
    params.isSlateSubmitted
  ) {
    let reason = 'Reminders off';
    if (!params.userId || !params.poolId) reason = 'No active member context — pending reminders cleared';
    else if (!params.optInEnabled) reason = 'Opt-in deadline reminders disabled by member';
    else if (params.permissionState === 'DENIED') reason = 'OS notification permission denied — app remains fully usable';
    else if (params.permissionState === 'PROMPT_REQUIRED') reason = 'Awaiting member permission prompt to enable alerts';
    else if (params.isSimulation || params.isFixtureData) reason = 'Sandbox / fixture data excluded from alert scheduling';
    else if (params.isSlateSubmitted) reason = 'Week ' + params.week + ' slate submitted — pending deadline alerts cleared';

    return {
      isEnabled: Boolean(params.optInEnabled && params.permissionState === 'GRANTED'),
      permissionState: params.permissionState,
      toSchedule: [],
      toCancelIds: [...existingIds],
      unchangedIds: [],
      statusSummary: reason,
      isUnavailable: false,
      unresolvedEventCount: 0,
    };
  }

  const nowMs = params.nowMs ?? Date.now();
  const leadMs = (params.leadMinutes ?? 60) * 60 * 1000;

  // Group valid future scheduled games by exact kickoff minute ISO
  const groups = new Map<string, DeadlineGameWindowInput[]>();
  let unresolvedCount = 0;

  for (const g of params.games) {
    if (!g.gameId || !g.kickoffIso || !g.awayTeam || !g.homeTeam) {
      unresolvedCount++;
      continue;
    }

    const rawStatus = (g.status || 'SCHEDULED').toUpperCase().trim();
    if (
      rawStatus === 'FINAL' ||
      rawStatus === 'F' ||
      rawStatus === 'LIVE' ||
      rawStatus === 'IN_PROGRESS' ||
      rawStatus === 'CANCELLED' ||
      rawStatus === 'POSTPONED'
    ) {
      continue;
    }
    const koMs = new Date(g.kickoffIso).getTime();
    if (Number.isNaN(koMs)) {
      unresolvedCount++;
      continue;
    }
    if (koMs <= nowMs) continue;

    // Normalize to minute precision for simultaneous kickoff grouping
    const minuteIso = new Date(Math.floor(koMs / 60000) * 60000).toISOString();
    const list = groups.get(minuteIso) || [];
    list.push(g);
    groups.set(minuteIso, list);
  }

  const desiredReminders: PlannedDeadlineReminder[] = [];

  for (const [kickoffIso, windowGames] of Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    const unsubmittedInWindow = windowGames.filter((g) => !g.isPicked);
    if (unsubmittedInWindow.length === 0 && params.isSlateSubmitted) {
      continue;
    }

    const koMs = new Date(kickoffIso).getTime();
    const fireMs = Math.max(nowMs + 5000, koMs - leadMs);
    if (fireMs >= koMs) continue;

    const fireAtIso = new Date(fireMs).toISOString();
    const reminderId = `dl::${params.poolId}::s${season}::w${params.week}::u:${params.userId}::ko:${kickoffIso}`;
    const firstMatchup = `${windowGames[0].awayTeam.toUpperCase()} @ ${windowGames[0].homeTeam.toUpperCase()}`;
    const matchupSummary =
      windowGames.length === 1
        ? firstMatchup
        : `${firstMatchup} + ${windowGames.length - 1} more game${windowGames.length - 1 === 1 ? '' : 's'}`;

    const koDate = new Date(kickoffIso);
    const koTimeFormatted = koDate.toLocaleTimeString('en-US', {
      timeZone: 'America/Phoenix',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    // Neutral wording per Arbiter directive: cached state cannot guarantee picks are still missing at delivery time
    const title = `Week ${params.week} Kickoff Window Approaching (${koTimeFormatted})`;
    const body = `${matchupSummary} locks at official kickoff (${koTimeFormatted}). Open NFL Pick'Em to verify or submit your Week ${params.week} picks.`;

    desiredReminders.push({
      reminderId,
      notificationNumericId: deterministicNumericId(reminderId),
      poolId: params.poolId,
      season,
      week: params.week,
      userId: params.userId,
      kickoffIso,
      fireAtIso,
      gameCountInWindow: windowGames.length,
      unsubmittedCountInWindow: unsubmittedInWindow.length,
      matchupSummary,
      title,
      body,
      deepLinkPath: '/picks',
    });
  }

  const desiredIdSet = new Set(desiredReminders.map((r) => r.reminderId));
  const existingIdSet = new Set(existingIds);

  const toCancelIds = existingIds.filter((id) => !desiredIdSet.has(id));
  const unchangedIds = existingIds.filter((id) => desiredIdSet.has(id));
  const toSchedule = desiredReminders.filter((r) => !existingIdSet.has(r.reminderId));

  const incompletenessNote = unresolvedCount > 0 ? ` (${unresolvedCount} unresolved event${unresolvedCount === 1 ? '' : 's'} excluded)` : '';
  const statusSummary =
    desiredReminders.length > 0
      ? `${desiredReminders.length} kickoff window reminder${desiredReminders.length === 1 ? '' : 's'} active (~60m before kickoff)${incompletenessNote}`
      : `No upcoming eligible kickoff windows require reminders${incompletenessNote}`;

  return {
    isEnabled: true,
    permissionState: 'GRANTED',
    toSchedule,
    toCancelIds,
    unchangedIds,
    statusSummary,
    isUnavailable: false,
    unresolvedEventCount: unresolvedCount,
  };
}
