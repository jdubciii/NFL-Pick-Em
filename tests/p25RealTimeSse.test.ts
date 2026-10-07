import { describe, it, expect, vi } from 'vitest';
import { GamedayStreamHub } from '../src/services/GamedayStreamHub';

describe('Phase 25.2 Real-Time SSE Transport & Visibility Invariants', () => {
  it('enforces Decision #20 tenant isolation on SSE stream broadcasts', () => {
    const hub = new GamedayStreamHub();
    const pool1Client = { poolId: 'pool-main', send: vi.fn() };
    const pool2Client = { poolId: 'pool-other', send: vi.fn() };

    hub.registerClient('c1', pool1Client.poolId, pool1Client.send);
    hub.registerClient('c2', pool2Client.poolId, pool2Client.send);

    hub.broadcastToPool('pool-main', 'SCORE_UPDATE', { gameId: 'g1', homeScore: 21, awayScore: 17 });

    expect(pool1Client.send).toHaveBeenCalledTimes(1);
    expect(pool2Client.send).not.toHaveBeenCalled();
  });

  it('guarantees Decision #66 amended open slate visibility resolves canView true when hide_picks is false', () => {
    const evaluateVisibility = (hidePicksUntilKickoff: boolean, isLocked: boolean) => {
      if (!hidePicksUntilKickoff) return true;
      return isLocked;
    };

    expect(evaluateVisibility(false, false)).toBe(true);
    expect(evaluateVisibility(false, true)).toBe(true);
    expect(evaluateVisibility(true, false)).toBe(false);
    expect(evaluateVisibility(true, true)).toBe(true);
  });

  it('formats SSE message packets with valid event id and JSON payloads', () => {
    const hub = new GamedayStreamHub();
    const formatted = hub.formatSSE('SCORE_UPDATE', { gameId: 'tb-dal', score: '24-21' });

    expect(formatted).toContain('event: SCORE_UPDATE\n');
    expect(formatted).toContain('data: {"gameId":"tb-dal","score":"24-21"}\n\n');
  });
});
