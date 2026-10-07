import { describe, it, expect } from 'vitest';
import {
  formatDisputeCountdown,
  isUnderUrgencyThreshold,
  sortHallOfInfamy,
  InfamyRecord
} from '../client/src/services/SocialStakesEngine';

describe('Phase 26.4 Social Stakes Elevation Invariants', () => {
  it('formats monospace 24-hour dispute countdown timer accurately', () => {
    const twoHoursRemaining = 2 * 3600 * 1000 + 15 * 60 * 1000 + 42 * 1000;
    expect(formatDisputeCountdown(twoHoursRemaining)).toBe('02:15:42');

    const expired = -500;
    expect(formatDisputeCountdown(expired)).toBe('00:00:00');
  });

  it('detects urgency threshold when remaining time is under 1 hour (< 3600000 ms)', () => {
    const fiftyNineMinutes = 59 * 60 * 1000;
    const twoHours = 2 * 3600 * 1000;

    expect(isUnderUrgencyThreshold(fiftyNineMinutes)).toBe(true);
    expect(isUnderUrgencyThreshold(twoHours)).toBe(false);
    expect(isUnderUrgencyThreshold(0)).toBe(true);
  });

  it('aggregates and sorts Hall of Infamy records accurately', () => {
    const records: InfamyRecord[] = [
      { memberId: 'm1', name: 'Jack', shotsDrank: 4, deadPlaceFinishes: 2, maxSingleWeekDebt: 2 },
      { memberId: 'm2', name: 'Matt', shotsDrank: 8, deadPlaceFinishes: 1, maxSingleWeekDebt: 3 },
      { memberId: 'm3', name: 'Justin', shotsDrank: 3, deadPlaceFinishes: 4, maxSingleWeekDebt: 1 }
    ];

    const byShots = sortHallOfInfamy(records, 'MOST_SHOTS');
    expect(byShots[0].memberId).toBe('m2'); // Matt: 8 shots

    const byDeadPlaces = sortHallOfInfamy(records, 'MOST_DEAD_PLACES');
    expect(byDeadPlaces[0].memberId).toBe('m3'); // Justin: 4 dead places

    const byDebt = sortHallOfInfamy(records, 'HIGHEST_DEBT');
    expect(byDebt[0].memberId).toBe('m2'); // Matt: max debt 3
  });
});
