import { PrismaClient } from '@prisma/client';

/**
 * Validates that the database connection string adheres to strict TLS & security invariants.
 * In production:
 * - Rejects missing or empty DATABASE_URL
 * - Rejects unencrypted protocols (http/plain tcp) or explicit sslmode=disable
 * - Prohibits unauthorized certificate bypass parameters
 */
export function validateDatabaseConnectionUrl(url?: string): { valid: boolean; reason?: string } {
  const target = url !== undefined ? url : process.env.DATABASE_URL;
  if (!target) {
    return { valid: false, reason: 'DATABASE_URL_MISSING' };
  }

  try {
    const parsed = new URL(target);
    if (!['postgresql:', 'postgres:'].includes(parsed.protocol)) {
      return { valid: false, reason: 'INVALID_PROTOCOL' };
    }

    if (process.env.NODE_ENV === 'production') {
      const search = parsed.searchParams;
      const sslmode = search.get('sslmode');
      if (sslmode === 'disable') {
        return { valid: false, reason: 'SSL_DISABLED_IN_PRODUCTION' };
      }
      if (search.get('rejectUnauthorized') === 'false') {
        return { valid: false, reason: 'CERTIFICATE_VALIDATION_BYPASS_PROHIBITED' };
      }
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: 'MALFORMED_URL' };
  }
}

const validation = validateDatabaseConnectionUrl();
if (!validation.valid && process.env.NODE_ENV === 'production') {
  throw new Error(`[DatabaseClient] Fatal configuration error: ${validation.reason}`);
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' && process.env.PRISMA_LOG_QUERY === 'true' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;

