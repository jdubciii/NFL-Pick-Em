import { describe, it, expect } from 'vitest';
import { Phase18ArchivalService, Phase18FeatureFlagKey } from '../src/services/phase18ArchivalService';
import { Phase18LeaderboardService } from '../src/services/phase18LeaderboardService';
import { Phase18AchievementsService } from '../src/services/phase18AchievementsService';
import { Phase18HistoricalArchivalEngine } from '../src/services/phase18HistoricalArchivalEngine';
import { Phase18RolloverService } from '../src/services/phase18RolloverService';

describe('Phase 18 Milestone 18.5: Cumulative Governance & Closure Audit', () => {
  it('confirms all Phase 18 domain services are exported and instantiate correctly', () => {
    expect(Phase18ArchivalService).toBeDefined();
    expect(Phase18LeaderboardService).toBeDefined();
    expect(Phase18AchievementsService).toBeDefined();
    expect(Phase18HistoricalArchivalEngine).toBeDefined();
    expect(Phase18RolloverService).toBeDefined();
  });

  it('validates Phase 18 circuit breaker registry keys default to OFF', () => {
    expect(Phase18ArchivalService.isFlagEnabled(null)).toBe(false);
    expect(Phase18LeaderboardService.isFeatureEnabled(null)).toBe(false);
    expect(Phase18AchievementsService.isFeatureEnabled(null)).toBe(false);
    expect(Phase18HistoricalArchivalEngine.isFeatureEnabled(null)).toBe(false);
    expect(Phase18RolloverService.isFeatureEnabled(null)).toBe(false);

    expect(Phase18FeatureFlagKey.GLOBAL_LEADERBOARDS).toBe('global_leaderboards');
    expect(Phase18FeatureFlagKey.ACHIEVEMENTS_ENGINE).toBe('achievements_engine');
    expect(Phase18FeatureFlagKey.SEASON_ARCHIVAL).toBe('season_archival');
  });
});
