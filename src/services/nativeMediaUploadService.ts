export interface MediaConstraintConfig {
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  maxDurationSeconds: number;
}

export const DEFAULT_MEDIA_CONSTRAINTS: MediaConstraintConfig = {
  maxSizeBytes: 30 * 1024 * 1024, // 30 MB ceiling
  allowedMimeTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
  maxDurationSeconds: 60 // 60s punishment clip limit
};

export interface MediaValidationResult {
  isValid: boolean;
  error?: string;
}

export interface PreparedUploadPath {
  storageBucket: string;
  storagePath: string;
  publicUrlPlaceholder: string;
}

export function validateMediaConstraints(
  fileSizeBytes: number,
  mimeType: string,
  durationSeconds?: number,
  config: MediaConstraintConfig = DEFAULT_MEDIA_CONSTRAINTS
): MediaValidationResult {
  if (fileSizeBytes > config.maxSizeBytes) {
    return {
      isValid: false,
      error: `File size ${(fileSizeBytes / (1024 * 1024)).toFixed(1)}MB exceeds maximum allowed limit of ${(config.maxSizeBytes / (1024 * 1024)).toFixed(1)}MB.`
    };
  }

  const normalizedMime = mimeType.toLowerCase();
  if (!config.allowedMimeTypes.includes(normalizedMime)) {
    return {
      isValid: false,
      error: `Unsupported format (${mimeType}). Permitted formats: ${config.allowedMimeTypes.join(', ')}.`
    };
  }

  if (durationSeconds !== undefined && durationSeconds > config.maxDurationSeconds) {
    return {
      isValid: false,
      error: `Duration ${durationSeconds}s exceeds maximum limit of ${config.maxDurationSeconds}s.`
    };
  }

  return { isValid: true };
}

export function generateEvidenceStoragePath(
  poolId: string,
  userId: string,
  weekNumber: number,
  timestampMs: number = Date.now()
): PreparedUploadPath {
  const sanitizedPool = poolId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const sanitizedUser = userId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const path = `penalties/${sanitizedPool}/${sanitizedUser}/w${weekNumber}_${timestampMs}.mp4`;

  return {
    storageBucket: 'penalty-evidence',
    storagePath: path,
    publicUrlPlaceholder: `supabase://vault/${path}`
  };
}

export interface MockCaptureResult {
  fileUri: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number;
}

export async function requestMockMediaCapture(
  userId: string,
  weekNumber: number
): Promise<MockCaptureResult> {
  return {
    fileUri: `file:///storage/emulated/0/DCIM/Camera/evidence_w${weekNumber}_${userId}.mp4`,
    mimeType: 'video/mp4',
    sizeBytes: 12.4 * 1024 * 1024,
    durationSeconds: 18.5
  };
}
