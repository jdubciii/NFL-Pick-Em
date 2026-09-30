/**
 * Safeguard to guarantee tests and migrations never execute against primary/hosted production databases.
 */
export function assertDisposableDatabase(url?: string): void {
  const targetUrl = url || process.env.TEST_DATABASE_URL || '';
  if (!targetUrl) {
    throw new Error('SAFETY_VIOLATION: TEST_DATABASE_URL is not set. Refusing to run tests against primary or unconfigured database.');
  }

  const isDisposable = 
    targetUrl.includes('schema=rehearsal') || 
    targetUrl.includes('test') || 
    targetUrl.includes('rehearsal');

  if (!isDisposable) {
    throw new Error('SAFETY_VIOLATION: Target URL is not recognized as a disposable rehearsal/test database.');
  }
}
