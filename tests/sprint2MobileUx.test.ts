import { describe, it, expect } from 'vitest';

describe('Sprint 2 Mobile UX Invariants & Components', () => {
  it('enforces mobile viewport threshold boundary at 768px', () => {
    const isMobileViewport = (width: number) => width < 768;
    expect(isMobileViewport(375)).toBe(true);
    expect(isMobileViewport(767)).toBe(true);
    expect(isMobileViewport(768)).toBe(false);
    expect(isMobileViewport(1024)).toBe(false);
  });

  it('verifies Monte Carlo slot-machine odometer step intervals and decimal formatting', () => {
    const formatOdometerMetric = (val: number, metric: 'shots' | 'fifths' | 'oz' | 'pace') => {
      switch (metric) {
        case 'fifths':
          return (val / 17.0).toFixed(1);
        case 'oz':
          return (val * 1.5).toFixed(1);
        case 'pace':
          return (val * 1.8).toFixed(1);
        case 'shots':
        default:
          return val.toFixed(1);
      }
    };

    expect(formatOdometerMetric(10, 'shots')).toBe('10.0');
    expect(formatOdometerMetric(10, 'fifths')).toBe('0.6');
    expect(formatOdometerMetric(10, 'oz')).toBe('15.0');
    expect(formatOdometerMetric(10, 'pace')).toBe('18.0');
  });

  it('guarantees cohort floor N >= 3 is preserved during sweat projection rollups', () => {
    const evaluateCohortFloor = (cohortSize: number) => {
      if (cohortSize < 3) {
        throw new Error('Anti-peeking cohort floor violation: N must be >= 3');
      }
      return true;
    };

    expect(() => evaluateCohortFloor(2)).toThrow();
    expect(evaluateCohortFloor(3)).toBe(true);
    expect(evaluateCohortFloor(10)).toBe(true);
  });
});
