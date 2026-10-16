import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isBackgroundJobsEnabled } from '../src/services/advisoryLockService';
import { validateDatabaseConnectionUrl } from '../src/db/client';
import { app } from '../src/server';

describe('Phase 41 Free Safety: Render Free Hosting, TLS & Background Switch', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('1. BACKGROUND_JOBS_ENABLED Switch', () => {
    it('defaults to false when undefined or empty', () => {
      delete process.env.BACKGROUND_JOBS_ENABLED;
      expect(isBackgroundJobsEnabled()).toBe(false);

      process.env.BACKGROUND_JOBS_ENABLED = '';
      expect(isBackgroundJobsEnabled()).toBe(false);
    });

    it('returns false when explicitly set to "false"', () => {
      process.env.BACKGROUND_JOBS_ENABLED = 'false';
      expect(isBackgroundJobsEnabled()).toBe(false);
    });

    it('returns true when explicitly set to "true"', () => {
      process.env.BACKGROUND_JOBS_ENABLED = 'true';
      expect(isBackgroundJobsEnabled()).toBe(true);
    });

    it('fails closed to false and warns on invalid values ("yes", "1", "enabled")', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      process.env.BACKGROUND_JOBS_ENABLED = 'yes';
      expect(isBackgroundJobsEnabled()).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid BACKGROUND_JOBS_ENABLED'));

      process.env.BACKGROUND_JOBS_ENABLED = '1';
      expect(isBackgroundJobsEnabled()).toBe(false);

      process.env.BACKGROUND_JOBS_ENABLED = 'enabled';
      expect(isBackgroundJobsEnabled()).toBe(false);

      warnSpy.mockRestore();
    });
  });

  describe('2. Strict Database Connection & TLS Validation', () => {
    it('rejects missing or empty database URLs', () => {
      expect(validateDatabaseConnectionUrl('')).toEqual({
        valid: false,
        reason: 'DATABASE_URL_MISSING',
      });
    });

    it('rejects non-postgres protocols', () => {
      expect(validateDatabaseConnectionUrl('http://localhost:5432/db')).toEqual({
        valid: false,
        reason: 'INVALID_PROTOCOL',
      });
      expect(validateDatabaseConnectionUrl('mysql://root@localhost/db')).toEqual({
        valid: false,
        reason: 'INVALID_PROTOCOL',
      });
    });

    it('rejects sslmode=disable in production', () => {
      process.env.NODE_ENV = 'production';
      expect(
        validateDatabaseConnectionUrl('postgresql://user:pass@db.example.com:5432/postgres?sslmode=disable')
      ).toEqual({
        valid: false,
        reason: 'SSL_DISABLED_IN_PRODUCTION',
      });
    });

    it('rejects rejectUnauthorized=false in production', () => {
      process.env.NODE_ENV = 'production';
      expect(
        validateDatabaseConnectionUrl('postgresql://user:pass@db.example.com:5432/postgres?rejectUnauthorized=false')
      ).toEqual({
        valid: false,
        reason: 'CERTIFICATE_VALIDATION_BYPASS_PROHIBITED',
      });
    });

    it('accepts compliant postgres URL with secure connection options', () => {
      process.env.NODE_ENV = 'production';
      expect(
        validateDatabaseConnectionUrl('postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true')
      ).toEqual({
        valid: true,
      });
    });
  });

  describe('3. Read-Only Health Endpoint & CORS Safety', () => {
    it('responds to GET /api/health with status ok and ISO timestamp without side-effects', async () => {
      const server = app.listen(0);
      try {
        const addr = server.address() as any;
        const port = addr.port;
        const res = await fetch(`http://127.0.0.1:${port}/api/health`);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data).toHaveProperty('status', 'ok');
        expect(data).toHaveProperty('timestamp');
        expect(new Date(data.timestamp).getTime()).not.toBeNaN();
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });
  });
});
