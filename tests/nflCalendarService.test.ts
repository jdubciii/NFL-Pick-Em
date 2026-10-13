import { describe, it, expect } from 'vitest';
import { getCurrentNFLWeek } from '../client/src/services/nflCalendarService';

describe('NFL Calendar Service & Automatic Rollover', () => {
  it('evaluates Tue Oct 6 – Mon Oct 12, 2026 as Week 5', () => {
    expect(getCurrentNFLWeek(new Date('2026-10-06T12:00:00Z'))).toBe(5);
    expect(getCurrentNFLWeek(new Date('2026-10-09T18:00:00Z'))).toBe(5);
    expect(getCurrentNFLWeek(new Date('2026-10-12T23:59:00Z'))).toBe(5);
  });

  it('evaluates Tue Oct 13 – Mon Oct 19, 2026 as Week 6', () => {
    expect(getCurrentNFLWeek(new Date('2026-10-13T00:01:00Z'))).toBe(6);
    expect(getCurrentNFLWeek(new Date('2026-10-13T11:28:09-07:00'))).toBe(6);
    expect(getCurrentNFLWeek(new Date('2026-10-15T20:15:00Z'))).toBe(6);
    expect(getCurrentNFLWeek(new Date('2026-10-19T23:59:00Z'))).toBe(6);
  });

  it('evaluates Tue Oct 20 – Mon Oct 26, 2026 as Week 7', () => {
    expect(getCurrentNFLWeek(new Date('2026-10-20T00:01:00Z'))).toBe(7);
    expect(getCurrentNFLWeek(new Date('2026-10-22T20:15:00Z'))).toBe(7);
    expect(getCurrentNFLWeek(new Date('2026-10-26T23:59:00Z'))).toBe(7);
  });

  it('defaults to 6 for present Tuesday morning Oct 13, 2026 date', () => {
    const week = getCurrentNFLWeek();
    expect(week).toBe(6);
  });
});
