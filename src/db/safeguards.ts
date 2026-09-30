/**
 * Safeguard module to guarantee tests, seeds, and rehearsals never execute
 * against primary/hosted production databases (Senior Arbiter Ruling R-12.2-L / BR-6).
 */

export interface ParsedDbUrl {
  protocol: string;
  host: string;
  port: string;
  database: string;
  searchParams: URLSearchParams;
}

const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', 'host.docker.internal', '::1']);
const DISALLOWED_HOST_PATTERNS = [
  'supabase.co',
  'pooler.supabase.com',
  'aws',
  'neon.tech',
  'render.com',
  'railway.app',
  'azure',
  'rds.amazonaws.com',
];

/**
 * Validates a PostgreSQL connection URL to ensure it points strictly to a local, disposable test database.
 * Throws a descriptive Error if the URL points to a hosted database or violates isolation rules.
 */
export function assertDisposableUrl(rawUrl?: string): void {
  const targetUrl = rawUrl !== undefined ? rawUrl : (process.env.TEST_DATABASE_URL || '');
  if (!targetUrl) {
    throw new Error('SAFETY_VIOLATION: TEST_DATABASE_URL is not set. Refusing to run tests against primary or unconfigured database.');
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch (err) {
    throw new Error(`SAFETY_VIOLATION: Invalid database connection URL format: ${targetUrl}`);
  }

  const hostname = parsed.hostname.toLowerCase();

  // 1. Host isolation check: must strictly be local loopback / docker container
  if (!ALLOWED_HOSTS.has(hostname)) {
    throw new Error(`SAFETY_VIOLATION: Database host '${hostname}' is not permitted for testing. Only local hosts (${Array.from(ALLOWED_HOSTS).join(', ')}) are allowed.`);
  }

  for (const pattern of DISALLOWED_HOST_PATTERNS) {
    if (hostname.includes(pattern)) {
      throw new Error(`SAFETY_VIOLATION: Database host '${hostname}' matches prohibited remote pattern '${pattern}'.`);
    }
  }

  // 2. Query param check: forbid ?schema= bypass tricks
  if (parsed.searchParams.has('schema')) {
    throw new Error('SAFETY_VIOLATION: Using ?schema= parameter to partition tests on shared databases is strictly prohibited by Ruling R-12.2-L.');
  }

  // 3. Database name check: must be a disposable database
  const dbName = parsed.pathname.replace(/^\//, '');
  const isValidDbName = 
    dbName === 'pickem_rehearsal' || 
    dbName.startsWith('pickem_rehearsal') ||
    dbName.startsWith('pickem_test') ||
    dbName.endsWith('_test') || 
    dbName.endsWith('_rehearsal') ||
    dbName === 'test';

  if (!isValidDbName) {
    throw new Error(`SAFETY_VIOLATION: Database name '${dbName}' is not recognized as a disposable test database (e.g. 'pickem_rehearsal').`);
  }
}

/**
 * Validates that the active database session is connected to a disposable server instance
 * with the 'app.disposable' sentinel set to 'true'.
 */
export async function assertDisposableServer(prismaOrClient: any): Promise<void> {
  try {
    const rows = await prismaOrClient.$queryRawUnsafe(`
      SELECT 
        current_setting('app.disposable', true) AS is_disposable,
        current_database() AS db_name,
        inet_server_addr()::text AS server_ip;
    `);

    const result = rows && rows[0];
    if (!result || result.is_disposable !== 'true') {
      throw new Error(`SAFETY_VIOLATION: Database session sentinel 'app.disposable' is not 'true'. Current value: '${result?.is_disposable}'.`);
    }
  } catch (err: any) {
    if (err.message.includes('SAFETY_VIOLATION')) {
      throw err;
    }
    throw new Error(`SAFETY_VIOLATION: Failed server sentinel verification: ${err.message}`);
  }
}

/**
 * Backward compatibility alias for assertDisposableUrl.
 */
export function assertDisposableDatabase(url?: string): void {
  assertDisposableUrl(url);
}
