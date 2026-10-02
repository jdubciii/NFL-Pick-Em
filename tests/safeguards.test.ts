import { describe, it, expect } from 'vitest';
import { assertDisposableUrl } from '../src/db/safeguards';

describe('BR-6 Safeguards: assertDisposableUrl', () => {
  it('allows valid local disposable database URLs', () => {
    expect(() => {
      assertDisposableUrl('postgresql://postgres:postgres@localhost:5432/pickem_rehearsal');
    }).not.toThrow();

    expect(() => {
      assertDisposableUrl('postgresql://postgres:postgres@127.0.0.1:5432/pickem_rehearsal');
    }).not.toThrow();

    expect(() => {
      assertDisposableUrl('postgresql://postgres:postgres@host.docker.internal:5432/nfl_pickem_test');
    }).not.toThrow();
  });

  it('rejects remote / hosted database URLs (Supabase, AWS, Neon, etc.)', () => {
    expect(() => {
      assertDisposableUrl('postgresql://postgres.exampleref:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres');
    }).toThrow(/SAFETY_VIOLATION.*Database host/);

    expect(() => {
      assertDisposableUrl('postgresql://user:pass@db.neon.tech/pickem_rehearsal');
    }).toThrow(/SAFETY_VIOLATION.*Database host/);
  });

  it('Decision #32 Sabotage Test: point TEST_DATABASE_URL at production fingerprint -> aborts before connection', () => {
    const prodFingerprint = 'postgresql://postgres.exampleref:fake@aws-0-us-east-1.pooler.supabase.com:5432/postgres';
    expect(() => {
      assertDisposableUrl(prodFingerprint);
    }).toThrow(/SAFETY_VIOLATION: Database host 'aws-0-us-east-1.pooler.supabase.com' is not permitted for testing/);
  });

  it('rejects URLs using ?schema= parameter to bypass host isolation', () => {
    expect(() => {
      assertDisposableUrl('postgresql://postgres:postgres@localhost:5432/pickem_rehearsal?schema=rehearsal');
    }).toThrow(/SAFETY_VIOLATION.*Using \?schema= parameter/);
  });

  it('rejects non-disposable production database names on localhost', () => {
    expect(() => {
      assertDisposableUrl('postgresql://postgres:postgres@localhost:5432/postgres');
    }).toThrow(/SAFETY_VIOLATION.*Database name 'postgres' is not recognized/);

    expect(() => {
      assertDisposableUrl('postgresql://postgres:postgres@localhost:5432/production_db');
    }).toThrow(/SAFETY_VIOLATION.*Database name 'production_db' is not recognized/);
  });

  it('sabotage test: throws when TEST_DATABASE_URL is empty string or undefined', () => {
    expect(() => {
      assertDisposableUrl('');
    }).toThrow(/SAFETY_VIOLATION: TEST_DATABASE_URL is not set/);

    const oldEnv = process.env.TEST_DATABASE_URL;
    try {
      delete process.env.TEST_DATABASE_URL;
      expect(() => {
        assertDisposableUrl(undefined);
      }).toThrow(/SAFETY_VIOLATION: TEST_DATABASE_URL is not set/);
    } finally {
      process.env.TEST_DATABASE_URL = oldEnv;
    }
  });
});
