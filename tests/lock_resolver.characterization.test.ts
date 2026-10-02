import { describe, it, expect } from 'vitest';
import {
  isGameLocked,
  assertGameUnlocked,
  computeGameLockStatus,
  isGameInExcludedWindow,
} from '../src/services/lockResolver';

describe('Step D: Lock Resolver Characterization & Pure Invariants', () => {
  const baseKickoff = new Date('2026-10-04T17:00:00.000Z');

  describe('1. Kickoff Future vs Past (Standard 0 Offset)', () => {
    it('returns false (unlocked) when kickoff is in the future', () => {
      const now = new Date('2026-10-04T16:59:00.000Z'); // 1 minute before kickoff
      expect(isGameLocked(baseKickoff, 0, now)).toBe(false);
      expect(() => assertGameUnlocked(baseKickoff, 0, now)).not.toThrow();
    });

    it('returns true (locked) when kickoff is in the past', () => {
      const now = new Date('2026-10-04T17:01:00.000Z'); // 1 minute after kickoff
      expect(isGameLocked(baseKickoff, 0, now)).toBe(true);
      expect(() => assertGameUnlocked(baseKickoff, 0, now)).toThrow('Game is locked');
    });

    it('returns true (locked) at exact kickoff boundary (now === kickoff)', () => {
      const now = new Date('2026-10-04T17:00:00.000Z');
      expect(isGameLocked(baseKickoff, 0, now)).toBe(true);
      expect(() => assertGameUnlocked(baseKickoff, 0, now)).toThrow('Game is locked');
    });
  });

  describe('2. Pool-Specific Lock Offsets', () => {
    it('locks early when positive offset is configured (e.g., 60 minutes before kickoff)', () => {
      const lockOffsetMinutes = 60; // lock at 16:00:00Z
      const beforeLock = new Date('2026-10-04T15:59:59.000Z');
      const atLock = new Date('2026-10-04T16:00:00.000Z');
      const afterLockBeforeKickoff = new Date('2026-10-04T16:30:00.000Z');

      expect(isGameLocked(baseKickoff, lockOffsetMinutes, beforeLock)).toBe(false);
      expect(isGameLocked(baseKickoff, lockOffsetMinutes, atLock)).toBe(true);
      expect(isGameLocked(baseKickoff, lockOffsetMinutes, afterLockBeforeKickoff)).toBe(true);
    });

    it('supports negative offsets (e.g., locking 15 minutes after kickoff)', () => {
      const lockOffsetMinutes = -15; // lock at 17:15:00Z
      const atKickoff = new Date('2026-10-04T17:00:00.000Z');
      const tenMinsAfter = new Date('2026-10-04T17:10:00.000Z');
      const fifteenMinsAfter = new Date('2026-10-04T17:15:00.000Z');

      expect(isGameLocked(baseKickoff, lockOffsetMinutes, atKickoff)).toBe(false);
      expect(isGameLocked(baseKickoff, lockOffsetMinutes, tenMinsAfter)).toBe(false);
      expect(isGameLocked(baseKickoff, lockOffsetMinutes, fifteenMinsAfter)).toBe(true);
    });
  });

  describe('3. Fail-Closed Edge Cases (Null, Undefined, Invalid)', () => {
    it('fails closed (returns true / throws) when kickoffTime is null or undefined', () => {
      const now = new Date('2026-10-04T12:00:00.000Z');
      expect(isGameLocked(null, 0, now)).toBe(true);
      expect(isGameLocked(undefined, 0, now)).toBe(true);
      expect(() => assertGameUnlocked(null, 0, now)).toThrow('Game is locked');
      expect(() => assertGameUnlocked(undefined, 0, now)).toThrow('Game is locked');
    });

    it('fails closed when kickoffTime is an invalid date string', () => {
      const now = new Date('2026-10-04T12:00:00.000Z');
      expect(isGameLocked('invalid-date-string', 0, now)).toBe(true);
      expect(() => assertGameUnlocked('invalid-date-string', 0, now)).toThrow('Game is locked');
    });

    it('handles null, undefined, or NaN offset by defaulting to 0 offset', () => {
      const futureNow = new Date('2026-10-04T16:50:00.000Z');
      const pastNow = new Date('2026-10-04T17:10:00.000Z');

      expect(isGameLocked(baseKickoff, null, futureNow)).toBe(false);
      expect(isGameLocked(baseKickoff, null, pastNow)).toBe(true);

      expect(isGameLocked(baseKickoff, NaN as any, futureNow)).toBe(false);
      expect(isGameLocked(baseKickoff, NaN as any, pastNow)).toBe(true);
    });
  });

  describe('4. computeGameLockStatus', () => {
    it('returns full lock metadata correctly for unlocked game', () => {
      const now = new Date('2026-10-04T15:00:00.000Z');
      const status = computeGameLockStatus({
        kickoffTime: baseKickoff,
        lockOffsetMinutes: 30, // effective lock: 16:30:00Z (90 mins from now)
        now,
      });

      expect(status.isLocked).toBe(false);
      expect(status.effectiveLockTime).toEqual(new Date('2026-10-04T16:30:00.000Z'));
      expect(status.minutesRemaining).toBe(90);
    });

    it('returns full lock metadata correctly for locked game', () => {
      const now = new Date('2026-10-04T16:35:00.000Z');
      const status = computeGameLockStatus({
        kickoffTime: baseKickoff,
        lockOffsetMinutes: 30, // effective lock was 16:30:00Z
        now,
      });

      expect(status.isLocked).toBe(true);
      expect(status.effectiveLockTime).toEqual(new Date('2026-10-04T16:30:00.000Z'));
      expect(status.minutesRemaining).toBe(0);
    });

    it('returns safe fallback on missing kickoffTime', () => {
      const status = computeGameLockStatus({
        kickoffTime: null,
      });

      expect(status.isLocked).toBe(true);
      expect(status.effectiveLockTime).toBeNull();
      expect(status.minutesRemaining).toBeNull();
    });
  });

  describe('5. isGameInExcludedWindow', () => {
    it('returns false if no excluded windows are passed or list is empty', () => {
      expect(isGameInExcludedWindow(baseKickoff, [])).toBe(false);
      expect(isGameInExcludedWindow(baseKickoff, undefined)).toBe(false);
      expect(isGameInExcludedWindow(null, ['TNF'])).toBe(false);
    });

    it('identifies Thursday Night Football correctly', () => {
      const thursdayGame = new Date('2026-10-08T20:15:00-04:00'); // Thursday night EDT -> Friday 00:15 UTC
      expect(isGameInExcludedWindow(thursdayGame, ['TNF'])).toBe(true);
      expect(isGameInExcludedWindow(thursdayGame, ['THURSDAY_NIGHT'])).toBe(true);
      expect(isGameInExcludedWindow(thursdayGame, ['MNF'])).toBe(false);
    });

    it('identifies Monday Night Football correctly', () => {
      const mondayGame = new Date('2026-10-12T20:15:00-04:00'); // Monday night EDT -> Tuesday 00:15 UTC
      expect(isGameInExcludedWindow(mondayGame, ['MNF'])).toBe(true);
      expect(isGameInExcludedWindow(mondayGame, ['MONDAY_NIGHT'])).toBe(true);
      expect(isGameInExcludedWindow(mondayGame, ['TNF'])).toBe(false);
    });
  });
});
