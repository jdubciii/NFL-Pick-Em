import { describe, it, expect } from 'vitest';
import { QueryAuditService } from '../src/services/perf/queryAuditService';
import { featureFlags, FeatureFlagKey } from '../src/config/featureFlags';

describe('Milestone 23.3: Database Query Optimization & Read Index Audit (Zero DDL)', () => {
  it('confirms audited read projections utilize existing frozen indexes (Decision #61)', () => {
    const auditPicks = QueryAuditService.auditQueryProjection(
      'GetWeeklySweatPicks',
      'picks',
      ['tenant_id', 'pool_id', 'week'],
      ['id', 'user_id', 'team_picked']
    );

    expect(auditPicks.indexCovered).toBe(true);
    expect(auditPicks.tenantFiltered).toBe(true);
    expect(auditPicks.hasNPlusOneRisk).toBe(false);
  });

  it('validates batched leaderboard query strictly scopes tenant_id and pool_id (Decision #20)', () => {
    const query = QueryAuditService.optimizeLeaderboardBatchRead('Tenant_ABC', 'Pool_123', ['user_1', 'user_2']);

    expect(query.whereClause.tenant_id).toBe('tenant_abc');
    expect(query.whereClause.pool_id).toBe('pool_123');
    expect(query.whereClause.user_id.in).toEqual(['user_1', 'user_2']);
    // Verified limited projection (no SELECT * unbounded fetches)
    expect(Object.keys(query.selectFields).length).toBe(4);
  });

  it('fails index coverage check when tenant_id predicate is missing', () => {
    const unsafeAudit = QueryAuditService.auditQueryProjection(
      'UnscopedPicksRead',
      'picks',
      ['week'],
      ['id']
    );

    expect(unsafeAudit.indexCovered).toBe(false);
    expect(unsafeAudit.tenantFiltered).toBe(false);
  });

  it('enforces Decision #62 fail-closed circuit breaker invariant (PRD_PHASE_23_PERF_HARDENING default false)', () => {
    expect(featureFlags[FeatureFlagKey.PRD_PHASE_23_PERF_HARDENING]).toBe(false);
  });
});
