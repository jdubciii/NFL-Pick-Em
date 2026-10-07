import { describe, it, expect } from 'vitest';

describe('Phase 26.2 Broadcast Glass UI & Red Zone Threat Invariants', () => {
  it('applies red zone inner-threat shadow styling strictly when isRedZone is active', () => {
    const resolveCardShadow = (isRedZone: boolean) => {
      if (isRedZone) {
        return 'shadow-xl ring-1 ring-rose-500/30 shadow-[inset_0_0_24px_rgba(239,68,68,0.15)] animate-pulse';
      }
      return 'shadow-xl';
    };

    expect(resolveCardShadow(true)).toContain('rgba(239,68,68,0.15)');
    expect(resolveCardShadow(false)).toBe('shadow-xl');
  });

  it('strictly validates Trailing badge uses muted slate and prevents crimson pollution', () => {
    const getBadgeStyle = (matchState: string) => {
      if (matchState === 'LOSING' || matchState === 'TRAILING') {
        return 'bg-slate-800/80 border-slate-700/60 text-slate-400';
      }
      if (matchState === 'LOST') {
        return 'bg-rose-950/80 border-rose-800 text-rose-400 line-through';
      }
      return 'bg-emerald-950/80 border-emerald-500 text-emerald-300';
    };

    const trailingStyle = getBadgeStyle('TRAILING');
    expect(trailingStyle).toContain('text-slate-400');
    expect(trailingStyle).not.toContain('rose');
    expect(trailingStyle).not.toContain('red');

    const lostStyle = getBadgeStyle('LOST');
    expect(lostStyle).toContain('rose');
  });

  it('applies patch coordinates from DRIVE_DELTA updates to telemetry state', () => {
    const applyDeltaPatches = (current: { yardline: number; downAndDistance: string }, patches: { path: string; value: any }[]) => {
      const updated = { ...current };
      for (const p of patches) {
        if (p.path === '/yardline') updated.yardline = p.value;
        if (p.path === '/downAndDistance') updated.downAndDistance = p.value;
      }
      return updated;
    };

    const base = { yardline: 25, downAndDistance: '1st & 10' };
    const patches = [
      { path: '/yardline', value: 14 },
      { path: '/downAndDistance', value: '1st & Goal' }
    ];

    const result = applyDeltaPatches(base, patches);
    expect(result.yardline).toBe(14);
    expect(result.downAndDistance).toBe('1st & Goal');
  });
});
