/**
 * Dynamic NFL Current Week Service & Automatic Rollover
 * Authoritative NFL calendar calculation.
 *
 * Rollover Schedule (2026 Season):
 * - Tue Oct 6 – Mon Oct 12, 2026 = Week 5
 * - Tue Oct 13 – Mon Oct 19, 2026 = Week 6
 * - Tue Oct 20 – Mon Oct 26, 2026 = Week 7
 * When date is >= Tuesday Oct 13, 2026, return 6.
 */

export interface NFLWeekBoundary {
  week: number;
  start: Date;
  end: Date;
}

export const NFL_2026_WEEK_WINDOWS: NFLWeekBoundary[] = [
  { week: 1, start: new Date('2026-09-08T00:00:00.000Z'), end: new Date('2026-09-14T23:59:59.999Z') },
  { week: 2, start: new Date('2026-09-15T00:00:00.000Z'), end: new Date('2026-09-21T23:59:59.999Z') },
  { week: 3, start: new Date('2026-09-22T00:00:00.000Z'), end: new Date('2026-09-28T23:59:59.999Z') },
  { week: 4, start: new Date('2026-09-29T00:00:00.000Z'), end: new Date('2026-10-05T23:59:59.999Z') },
  { week: 5, start: new Date('2026-10-06T00:00:00.000Z'), end: new Date('2026-10-12T23:59:59.999Z') },
  { week: 6, start: new Date('2026-10-13T00:00:00.000Z'), end: new Date('2026-10-19T23:59:59.999Z') },
  { week: 7, start: new Date('2026-10-20T00:00:00.000Z'), end: new Date('2026-10-26T23:59:59.999Z') },
  { week: 8, start: new Date('2026-10-27T00:00:00.000Z'), end: new Date('2026-11-02T23:59:59.999Z') },
  { week: 9, start: new Date('2026-11-03T00:00:00.000Z'), end: new Date('2026-11-09T23:59:59.999Z') },
  { week: 10, start: new Date('2026-11-10T00:00:00.000Z'), end: new Date('2026-11-16T23:59:59.999Z') },
  { week: 11, start: new Date('2026-11-17T00:00:00.000Z'), end: new Date('2026-11-23T23:59:59.999Z') },
  { week: 12, start: new Date('2026-11-24T00:00:00.000Z'), end: new Date('2026-11-30T23:59:59.999Z') },
  { week: 13, start: new Date('2026-12-01T00:00:00.000Z'), end: new Date('2026-12-07T23:59:59.999Z') },
  { week: 14, start: new Date('2026-12-08T00:00:00.000Z'), end: new Date('2026-12-14T23:59:59.999Z') },
  { week: 15, start: new Date('2026-12-15T00:00:00.000Z'), end: new Date('2026-12-21T23:59:59.999Z') },
  { week: 16, start: new Date('2026-12-22T00:00:00.000Z'), end: new Date('2026-12-28T23:59:59.999Z') },
  { week: 17, start: new Date('2026-12-29T00:00:00.000Z'), end: new Date('2027-01-04T23:59:59.999Z') },
  { week: 18, start: new Date('2027-01-05T00:00:00.000Z'), end: new Date('2027-01-11T23:59:59.999Z') },
];

/**
 * Helper to determine week for a specific year, month, and day in October 2026
 */
function getWeekForYMD(year: number, month: number, day: number): number | null {
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const t = d.getTime();
  for (const window of NFL_2026_WEEK_WINDOWS) {
    if (t >= window.start.getTime() && t <= window.end.getTime()) {
      return window.week;
    }
  }
  return null;
}

/**
 * Returns the current active NFL week (number).
 * Evaluates date against the 2026 NFL schedule:
 * - Tue Oct 6 – Mon Oct 12, 2026 = Week 5
 * - Tue Oct 13 – Mon Oct 19, 2026 = Week 6
 * - Tue Oct 20 – Mon Oct 26, 2026 = Week 7
 * When date is >= Tuesday Oct 13, 2026, return 6.
 */
export function getCurrentNFLWeek(now: Date = new Date()): number {
  const utcYear = now.getUTCFullYear();
  const utcMonth = now.getUTCMonth() + 1;
  const utcDay = now.getUTCDate();

  const localYear = now.getFullYear();
  const localMonth = now.getMonth() + 1;
  const localDay = now.getDate();

  const utcWeek = getWeekForYMD(utcYear, utcMonth, utcDay);
  const localWeek = getWeekForYMD(localYear, localMonth, localDay);

  if (utcWeek !== null && localWeek !== null) {
    return Math.max(utcWeek, localWeek);
  }
  if (utcWeek !== null) return utcWeek;
  if (localWeek !== null) return localWeek;

  const time = now.getTime();

  // Match against full season window schedule
  for (const window of NFL_2026_WEEK_WINDOWS) {
    if (time >= window.start.getTime() && time <= window.end.getTime()) {
      return window.week;
    }
  }

  // If prior to regular season, default to Week 1
  if (time < NFL_2026_WEEK_WINDOWS[0].start.getTime()) {
    return 1;
  }

  // If >= Tuesday Oct 13, 2026
  const week6StartMs = new Date('2026-10-13T00:00:00.000Z').getTime();
  if (time >= week6StartMs) {
    for (let i = NFL_2026_WEEK_WINDOWS.length - 1; i >= 0; i--) {
      if (time >= NFL_2026_WEEK_WINDOWS[i].start.getTime()) {
        return NFL_2026_WEEK_WINDOWS[i].week;
      }
    }
    return 6;
  }

  return 6;
}
