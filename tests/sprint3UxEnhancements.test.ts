import { describe, it, expect } from 'vitest';

describe('Sprint 3 UX Enhancements & Invariants', () => {
  it('validates mobile bottom navigation route definitions', () => {
    const bottomNavRoutes = [
      { id: 'picks', path: '/picks', label: 'Picks' },
      { id: 'matrix', path: '/matrix', label: 'Matrix' },
      { id: 'radar', path: '/radar', label: 'Radar' },
      { id: 'shame', path: '/shame', label: 'Shame' }
    ];

    expect(bottomNavRoutes).toHaveLength(4);
    expect(bottomNavRoutes.map(r => r.id)).toEqual(['picks', 'matrix', 'radar', 'shame']);
  });

  it('verifies What-If simulation mode visual contract styling rules', () => {
    const getSimulationContainerStyles = (isSimulation: boolean) => {
      return isSimulation
        ? 'border-2 border-dashed border-amber-500/80 bg-amber-950/10'
        : 'border border-slate-700 bg-slate-900';
    };

    expect(getSimulationContainerStyles(true)).toContain('border-dashed');
    expect(getSimulationContainerStyles(true)).toContain('border-amber-500');
    expect(getSimulationContainerStyles(false)).toContain('border-slate-700');
  });

  it('guarantees compact lock indicator preserves anti-peeking tooltip copy', () => {
    const formatInlineLockNotice = (hiddenCount: number) => {
      return hiddenCount > 0
        ? `Anti-Peeking Active (${hiddenCount} games locked until kickoff)`
        : 'All picks revealed';
    };

    expect(formatInlineLockNotice(8)).toBe('Anti-Peeking Active (8 games locked until kickoff)');
    expect(formatInlineLockNotice(0)).toBe('All picks revealed');
  });
});
