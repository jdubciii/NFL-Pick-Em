import { describe, it, expect } from 'vitest';
import {
  validateMediaConstraints,
  generateEvidenceStoragePath,
  DEFAULT_MEDIA_CONSTRAINTS
} from '../src/services/nativeMediaUploadService';

describe('Milestone 35.1: Native Media Capture & Vault Pipeline Invariants', () => {
  it('enforces maximum 30MB file size ceiling', () => {
    const validSize = 28 * 1024 * 1024;
    const oversized = 32 * 1024 * 1024;

    const validRes = validateMediaConstraints(validSize, 'video/mp4');
    expect(validRes.isValid).toBe(true);

    const overRes = validateMediaConstraints(oversized, 'video/mp4');
    expect(overRes.isValid).toBe(false);
    expect(overRes.error).toContain('exceeds maximum allowed limit');
  });

  it('rejects unpermitted media MIME types and accepts approved formats', () => {
    expect(validateMediaConstraints(5000, 'video/mp4').isValid).toBe(true);
    expect(validateMediaConstraints(5000, 'video/quicktime').isValid).toBe(true);
    expect(validateMediaConstraints(5000, 'video/webm').isValid).toBe(true);

    const invalidMime = validateMediaConstraints(5000, 'application/pdf');
    expect(invalidMime.isValid).toBe(false);
    expect(invalidMime.error).toContain('Unsupported format');
  });

  it('rejects video duration exceeding 60-second punishment limit', () => {
    const validDuration = validateMediaConstraints(5000, 'video/mp4', 45);
    expect(validDuration.isValid).toBe(true);

    const excessiveDuration = validateMediaConstraints(5000, 'video/mp4', 75);
    expect(excessiveDuration.isValid).toBe(false);
    expect(excessiveDuration.error).toContain('Duration 75s exceeds maximum limit');
  });

  it('generates isolated, RLS-compliant Supabase storage paths per pool and user', () => {
    const pathInfo = generateEvidenceStoragePath('Pool_Alpha-2026', 'u10_Ben', 5, 1728500000000);

    expect(pathInfo.storageBucket).toBe('penalty-evidence');
    expect(pathInfo.storagePath).toBe('penalties/pool_alpha-2026/u10_ben/w5_1728500000000.mp4');
    expect(pathInfo.publicUrlPlaceholder).toBe('supabase://vault/penalties/pool_alpha-2026/u10_ben/w5_1728500000000.mp4');
  });
});
