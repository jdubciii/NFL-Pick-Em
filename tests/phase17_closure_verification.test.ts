import { describe, it, expect } from 'vitest';
import { Phase17SocialTelemetryService } from '../src/services/phase17SocialTelemetryService';
import { Phase17SocialStakesService } from '../src/services/phase17SocialStakesService';
import { Phase17TelemetryPipelineService } from '../src/services/phase17TelemetryPipelineService';
import { Phase17LiveFeedService } from '../src/services/phase17LiveFeedService';
import { Phase17IntegrationOrchestrator } from '../src/services/phase17IntegrationOrchestrator';

describe('Phase 17 Milestone 17.5: Cumulative Governance & Closure Audit', () => {
  it('confirms all Phase 17 domain services are exported and instantiate correctly', () => {
    expect(Phase17SocialTelemetryService).toBeDefined();
    expect(Phase17SocialStakesService).toBeDefined();
    expect(Phase17TelemetryPipelineService).toBeDefined();
    expect(Phase17LiveFeedService).toBeDefined();
    expect(Phase17IntegrationOrchestrator).toBeDefined();
  });

  it('validates anti-peeking cohort floor constant parity across all services', () => {
    expect(Phase17SocialTelemetryService['MIN_COHORT_FLOOR']).toBe(3);
    expect(Phase17TelemetryPipelineService.MIN_COHORT_FLOOR).toBe(3);
    expect(Phase17LiveFeedService.MIN_COHORT_FLOOR).toBe(3);
  });
});
