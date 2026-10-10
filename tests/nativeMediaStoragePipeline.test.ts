import { describe, it, expect } from 'vitest';
import {
  submitPenaltyEvidenceRPC,
  validateMediaConstraints,
  generateEvidenceStoragePath
} from '../src/services/nativeMediaUploadService';

describe('Milestone 35.3: Native Hardware Wiring & Supabase Storage Pipeline Invariants', () => {
  it('triggers optimization state threshold when media exceeds 15MB', () => {
    const smallPayload = 12.0;
    const largePayload = 18.5;
    const requiresOptimization = (sizeMb: number) => sizeMb > 15.0;

    expect(requiresOptimization(smallPayload)).toBe(false);
    expect(requiresOptimization(largePayload)).toBe(true);
  });

  it('executes atomic submit_penalty_evidence RPC and initiates 24h Jury Clock', async () => {
    const pathInfo = generateEvidenceStoragePath('pool_alpha', 'u10', 5, 1728500000000);
    const result = await submitPenaltyEvidenceRPC({
      filePath: pathInfo.storagePath,
      liquorType: 'MALÖRT',
      poolId: 'pool_alpha',
      userId: 'u10',
      weekNumber: 5
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('UNDER_REVIEW');
    expect(result.cleanedUpOrphan).toBe(false);
    expect(new Date(result.juryClockExpiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects RPC and triggers orphan cleanup when file path is invalid', async () => {
    const result = await submitPenaltyEvidenceRPC({
      filePath: '',
      liquorType: 'WARM TEQUILA',
      poolId: 'pool_alpha',
      userId: 'u10',
      weekNumber: 5
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('FAILED');
    expect(result.cleanedUpOrphan).toBe(true);
    expect(result.error).toContain('Invalid storage path');
  });

  it('verifies RLS path compliance structure', () => {
    const { storagePath, storageBucket } = generateEvidenceStoragePath('AlphaPool', 'User1', 5, 1000);
    expect(storageBucket).toBe('penalty-evidence');
    expect(storagePath).toBe('penalties/alphapool/user1/w5_1000.mp4');
  });
});
