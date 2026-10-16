import { Prisma } from '@prisma/client';

/**
 * Distinct 32-bit integer pair namespace reserved for NFL Pick'em background worker coordination:
 * Class ID: 4126 (Phase 41, season 2026)
 * Object ID: 1016 (Ruling date 10/16)
 */
export const NFL_ADVISORY_LOCK_CLASS_ID = 4126;
export const NFL_ADVISORY_LOCK_OBJ_ID = 1016;

/**
 * Evaluates whether background worker daemons should be started.
 * Defaults to false (disabled) to ensure safety in local, test, and initial cloud environments.
 * - undefined, '', 'false' -> false
 * - 'true' -> true
 * - invalid values (e.g. 'yes', '1') -> false with console warning
 */
export function isBackgroundJobsEnabled(envVal?: string): boolean {
  const raw = envVal !== undefined ? envVal : process.env.BACKGROUND_JOBS_ENABLED;
  if (raw === undefined || raw === '' || raw === 'false') {
    return false;
  }
  if (raw === 'true') {
    return true;
  }
  console.warn(
    `[BackgroundJobs] Warning: Invalid BACKGROUND_JOBS_ENABLED value "${raw}". Expected "true" or "false". Defaulting to disabled.`
  );
  return false;
}

/**
 * Attempts to acquire a transaction-scoped PostgreSQL advisory lock.
 * Must be executed within a Prisma transaction client (tx).
 * Automatically releases upon transaction COMMIT or ROLLBACK.
 * Returns true if lock was acquired, false if held by another concurrent session.
 */
export async function tryAcquireAdvisoryLock(
  tx: Prisma.TransactionClient,
  classId: number = NFL_ADVISORY_LOCK_CLASS_ID,
  objId: number = NFL_ADVISORY_LOCK_OBJ_ID
): Promise<boolean> {
  try {
    const rows = await tx.$queryRaw<Array<{ acquired: boolean }>>`
      SELECT pg_try_advisory_xact_lock(${classId}, ${objId}) AS acquired;
    `;
    return Boolean(rows?.[0]?.acquired);
  } catch (err) {
    console.warn('[AdvisoryLock] Error acquiring advisory lock, failing closed:', err);
    return false;
  }
}
