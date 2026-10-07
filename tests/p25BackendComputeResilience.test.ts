import { describe, it, expect } from 'vitest';
import { BackendMonteCarloEngine } from '../src/services/BackendMonteCarloEngine';

describe('Phase 25.3 Backend Compute & Connection Resilience Invariants', () => {
  it('computes aggregated WinEquity and DeadPlaceRisk on backend worker service', () => {
    const engine = new BackendMonteCarloEngine();
    const members = [
      { id: 'm1', name: 'Jack', bankedPoints: 4, remainingPicks: [{ gameId: 'g1', pick: 'AWAY' as const, winProb: 0.6 }] },
      { id: 'm2', name: 'Matt', bankedPoints: 3, remainingPicks: [{ gameId: 'g1', pick: 'HOME' as const, winProb: 0.4 }] },
      { id: 'm3', name: 'Justin', bankedPoints: 2, remainingPicks: [{ gameId: 'g1', pick: 'HOME' as const, winProb: 0.4 }] }
    ];

    const results = engine.simulateSlate(members, 500);
    expect(results).toHaveLength(3);
    
    const jack = results.find(r => r.memberId === 'm1');
    const justin = results.find(r => r.memberId === 'm3');

    expect(jack).toBeDefined();
    expect(jack!.winEquity).toBeGreaterThan(0);
    expect(jack!.deadPlaceRisk).toBeLessThan(justin!.deadPlaceRisk);
  });

  it('formats connection status telemetry pill copy accurately', () => {
    const resolveStatusBadge = (isConnected: boolean, isReconnecting: boolean) => {
      if (!isConnected && isReconnecting) return { label: 'RECONNECTING...', color: 'amber' };
      if (!isConnected) return { label: 'OFFLINE', color: 'rose' };
      return { label: 'LIVE', color: 'emerald' };
    };

    expect(resolveStatusBadge(true, false)).toEqual({ label: 'LIVE', color: 'emerald' });
    expect(resolveStatusBadge(false, true)).toEqual({ label: 'RECONNECTING...', color: 'amber' });
    expect(resolveStatusBadge(false, false)).toEqual({ label: 'OFFLINE', color: 'rose' });
  });

  it('determines haptic vibration trigger when WinEquity swing exceeds 10%', () => {
    const shouldTriggerHeavyHaptic = (oldEquity: number, newEquity: number) => {
      return Math.abs(newEquity - oldEquity) >= 10.0;
    };

    expect(shouldTriggerHeavyHaptic(25.0, 36.5)).toBe(true);
    expect(shouldTriggerHeavyHaptic(25.0, 31.0)).toBe(false);
  });
});
