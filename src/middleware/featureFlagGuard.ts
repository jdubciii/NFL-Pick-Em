import { Request, Response, NextFunction } from 'express';
import { FeatureRegistryService, FeatureFlagKey } from '../services/featureRegistry';

export function requireFeatureFlag(featureKey: FeatureFlagKey) {
  return (req: Request, res: Response, next: NextFunction) => {
    const poolId = req.params.pool_id || req.params.poolId || req.body?.poolId;
    if (!poolId) {
      return res.status(400).json({ error: 'poolId is required for feature flag evaluation' });
    }

    // Decision #20: PoolMembership must already be verified prior to this middleware.
    // Decision #62: Disabled feature returns 404 Not Found to authenticated pool members.
    const isEnabled = FeatureRegistryService.isFeatureEnabled(poolId, featureKey);
    if (!isEnabled) {
      return res.status(404).json({ error: 'Feature disabled or unavailable' });
    }

    next();
  };
}
