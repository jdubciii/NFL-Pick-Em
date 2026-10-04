import { describe, it, expect, beforeEach } from 'vitest';
import { FeatureRegistryService, FeatureFlagKey } from '../src/services/featureRegistry';
import { requireFeatureFlag } from '../src/middleware/featureFlagGuard';
import { Request, Response, NextFunction } from 'express';

describe('Milestone 14.1 - Feature Registry & Circuit Breaker (Decisions #20, #61, #62)', () => {
  const poolId = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';

  beforeEach(() => {
    FeatureRegistryService.clear();
  });

  it('Decision #62: Feature defaults to OFF when not explicitly configured', () => {
    const isEnabled = FeatureRegistryService.isFeatureEnabled(poolId, FeatureFlagKey.DEAD_PLACE_ESCALATION);
    expect(isEnabled).toBe(false);
  });

  it('Decision #62: Returns true only when explicitly enabled for the pool', () => {
    FeatureRegistryService.setFlag(poolId, FeatureFlagKey.DEAD_PLACE_ESCALATION, true);
    expect(FeatureRegistryService.isFeatureEnabled(poolId, FeatureFlagKey.DEAD_PLACE_ESCALATION)).toBe(true);
    expect(FeatureRegistryService.isFeatureEnabled(poolId, FeatureFlagKey.MATRIX_COMMAND_BAR)).toBe(false);
  });

  it('Decision #62: Middleware returns 404 when feature is disabled for pool members', () => {
    const middleware = requireFeatureFlag(FeatureFlagKey.BOUNTY_BOARD);
    const req = { params: { pool_id: poolId } } as unknown as Request;
    let statusSent = 0;
    let jsonSent = null;

    const res = {
      status: (code: number) => {
        statusSent = code;
        return {
          json: (data: any) => { jsonSent = data; }
        };
      }
    } as unknown as Response;

    let nextCalled = false;
    const next = (() => { nextCalled = true; }) as NextFunction;

    middleware(req, res, next);

    expect(nextCalled).toBe(false);
    expect(statusSent).toBe(404);
    expect(jsonSent).toEqual({ error: 'Feature disabled or unavailable' });
  });

  it('Decision #62: Middleware calls next() when feature is enabled', () => {
    FeatureRegistryService.setFlag(poolId, FeatureFlagKey.BOUNTY_BOARD, true);
    const middleware = requireFeatureFlag(FeatureFlagKey.BOUNTY_BOARD);
    const req = { params: { pool_id: poolId } } as unknown as Request;
    const res = {} as unknown as Response;

    let nextCalled = false;
    const next = (() => { nextCalled = true; }) as NextFunction;

    middleware(req, res, next);
    expect(nextCalled).toBe(true);
  });
});
