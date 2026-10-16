import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import http from 'http';
import jwt from 'jsonwebtoken';
import { app } from '../src/server';
import { JWT_SECRET } from '../src/middleware/auth';
import prisma from '../src/db/client';
import {
  parseAllowedOrigins,
  isOriginAllowed,
  CONFIRMED_CAPACITOR_ORIGINS,
} from '../src/config/corsConfig';

describe('Phase 41 Render Free Production CORS Hardening', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('1. parseAllowedOrigins Configuration Parsing & Sanitization', () => {
    it('rejects wildcard "*" and "null" origins without throwing', () => {
      expect(parseAllowedOrigins('*').size).toBe(0);
      expect(parseAllowedOrigins('*, null, https://valid.com').size).toBe(1);
      expect(parseAllowedOrigins('*, null, https://valid.com').has('https://valid.com')).toBe(true);
      expect(parseAllowedOrigins('null').size).toBe(0);
      expect(parseAllowedOrigins('NULL').size).toBe(0);
    });

    it('rejects malformed entries and non-http/https protocols', () => {
      expect(parseAllowedOrigins('ftp://bad.com, not-a-url, file:///C:/path').size).toBe(0);
    });

    it('rejects entries with paths, query parameters, or fragments, and normalizes valid root origins', () => {
      expect(parseAllowedOrigins('https://pickem.app/some/path').size).toBe(0);
      expect(parseAllowedOrigins('https://pickem.app?query=1').size).toBe(0);
      expect(parseAllowedOrigins('https://pickem.app#fragment').size).toBe(0);

      const parsed = parseAllowedOrigins('https://pickem.app, https://SECOND.app/');
      expect(parsed.size).toBe(2);
      expect(parsed.has('https://pickem.app')).toBe(true);
      expect(parsed.has('https://second.app')).toBe(true);
    });

    it('handles empty or undefined values safely', () => {
      expect(parseAllowedOrigins(undefined).size).toBe(0);
      expect(parseAllowedOrigins('').size).toBe(0);
      expect(parseAllowedOrigins('   ').size).toBe(0);
    });

    it('parses multiple valid approved origins cleanly', () => {
      const parsed = parseAllowedOrigins('https://pickem.com, https://admin.pickem.com, http://localhost:5173');
      expect(parsed.size).toBe(3);
      expect(parsed.has('https://pickem.com')).toBe(true);
      expect(parsed.has('https://admin.pickem.com')).toBe(true);
      expect(parsed.has('http://localhost:5173')).toBe(true);
    });
  });

  describe('2. isOriginAllowed Evaluation Rules', () => {
    const allowedBrowser = new Set(['https://app.pickem.com', 'https://review.pickem.com']);

    it('allows requests without an Origin header (non-browser or server-to-server)', () => {
      expect(isOriginAllowed(undefined, true, allowedBrowser)).toBe(true);
      expect(isOriginAllowed('', true, allowedBrowser)).toBe(true);
    });

    it('strictly rejects Origin: "null"', () => {
      expect(isOriginAllowed('null', true, allowedBrowser)).toBe(false);
      expect(isOriginAllowed('null', false, allowedBrowser)).toBe(false);
    });

    it('accepts exact approved browser origins in production', () => {
      expect(isOriginAllowed('https://app.pickem.com', true, allowedBrowser)).toBe(true);
      expect(isOriginAllowed('https://review.pickem.com', true, allowedBrowser)).toBe(true);
    });

    it('accepts confirmed Android native origin in production and rejects unconfigured iOS schemes', () => {
      expect(isOriginAllowed('http://localhost', true, allowedBrowser)).toBe(true);
      expect(isOriginAllowed('https://localhost', true, allowedBrowser)).toBe(false);
      expect(isOriginAllowed('capacitor://localhost', true, allowedBrowser)).toBe(false);
    });

    it('rejects unapproved HTTPS browser origins in production', () => {
      expect(isOriginAllowed('https://evil.com', true, allowedBrowser)).toBe(false);
      expect(isOriginAllowed('https://attacker-pickem.com', true, allowedBrowser)).toBe(false);
    });

    it('rejects similar-looking subdomains in production', () => {
      expect(isOriginAllowed('https://sub.app.pickem.com', true, allowedBrowser)).toBe(false);
      expect(isOriginAllowed('https://fakeapp.pickem.com', true, allowedBrowser)).toBe(false);
    });

    it('rejects similar-looking hostname suffixes in production', () => {
      expect(isOriginAllowed('https://app.pickem.com.evil.com', true, allowedBrowser)).toBe(false);
      expect(isOriginAllowed('https://app.pickem.community', true, allowedBrowser)).toBe(false);
    });

    it('rejects unapproved localhost origins in production (non-Capacitor port variants)', () => {
      expect(isOriginAllowed('http://localhost:3000', true, allowedBrowser)).toBe(false);
      expect(isOriginAllowed('http://localhost:5173', true, allowedBrowser)).toBe(false);
      expect(isOriginAllowed('http://127.0.0.1:3000', true, allowedBrowser)).toBe(false);
    });

    it('fails closed when production allowlist is empty or missing', () => {
      const emptyAllowlist = new Set<string>();
      expect(isOriginAllowed('https://app.pickem.com', true, emptyAllowlist)).toBe(false);
      expect(isOriginAllowed('https://anything.com', true, emptyAllowlist)).toBe(false);
      // Confirmed Capacitor native origins still pass
      expect(isOriginAllowed('http://localhost', true, emptyAllowlist)).toBe(true);
    });

    it('allows dev ergonomics only in non-production', () => {
      expect(isOriginAllowed('http://localhost:5173', false, allowedBrowser)).toBe(true);
      expect(isOriginAllowed('http://127.0.0.1:4173', false, allowedBrowser)).toBe(true);
      expect(isOriginAllowed('http://192.168.1.18:5173', false, allowedBrowser)).toBe(true);
    });
  });

  describe('3. Live HTTP Integration & Header Verification', () => {
    let server: http.Server;
    let baseUrl: string;

    beforeAll(async () => {
      await new Promise<void>((resolve) => {
        server = app.listen(0, () => {
          const addr = server.address() as any;
          baseUrl = `http://127.0.0.1:${addr.port}`;
          resolve();
        });
      });
    });

    afterAll(async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    it('emits exact CORS response headers for approved browser origin in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.CORS_ALLOWED_ORIGINS = 'https://portal.nflpickem.com';

      const res = await fetch(`${baseUrl}/api/health`, {
        method: 'GET',
        headers: {
          Origin: 'https://portal.nflpickem.com',
        },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('access-control-allow-origin')).toBe('https://portal.nflpickem.com');
      expect(res.headers.get('access-control-allow-credentials')).toBe('true');
      expect(res.headers.get('vary')).toContain('Origin');
    });

    it('emits CORS response headers for approved Android Capacitor origin in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.CORS_ALLOWED_ORIGINS = 'https://portal.nflpickem.com';

      const res = await fetch(`${baseUrl}/api/health`, {
        method: 'GET',
        headers: {
          Origin: 'http://localhost',
        },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost');
      expect(res.headers.get('access-control-allow-credentials')).toBe('true');
    });

    it('omits permissive CORS headers for unapproved origin in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.CORS_ALLOWED_ORIGINS = 'https://portal.nflpickem.com';

      const res = await fetch(`${baseUrl}/api/health`, {
        method: 'GET',
        headers: {
          Origin: 'https://unauthorized-domain.com',
        },
      });

      expect(res.status).toBe(200); // endpoint responds, but browser blocks due to missing CORS header
      expect(res.headers.get('access-control-allow-origin')).toBeNull();
      expect(res.headers.get('access-control-allow-credentials')).toBeNull();
    });

    it('omits permissive CORS headers for Origin: "null" in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.CORS_ALLOWED_ORIGINS = 'https://portal.nflpickem.com';

      const res = await fetch(`${baseUrl}/api/health`, {
        method: 'GET',
        headers: {
          Origin: 'null',
        },
      });

      expect(res.headers.get('access-control-allow-origin')).toBeNull();
      expect(res.headers.get('access-control-allow-credentials')).toBeNull();
    });

    it('handles preflight OPTIONS requests for approved origin', async () => {
      process.env.NODE_ENV = 'production';
      process.env.CORS_ALLOWED_ORIGINS = 'https://portal.nflpickem.com';

      const res = await fetch(`${baseUrl}/api/health`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://portal.nflpickem.com',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type, Authorization',
        },
      });

      expect(res.status).toBe(204);
      expect(res.headers.get('access-control-allow-origin')).toBe('https://portal.nflpickem.com');
      expect(res.headers.get('access-control-allow-methods')).toContain('GET');
      expect(res.headers.get('access-control-allow-credentials')).toBe('true');
    });

    it('emits no permissive CORS headers on preflight OPTIONS for disallowed origin', async () => {
      process.env.NODE_ENV = 'production';
      process.env.CORS_ALLOWED_ORIGINS = 'https://portal.nflpickem.com';

      const res = await fetch(`${baseUrl}/api/health`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://attacker.com',
          'Access-Control-Request-Method': 'GET',
        },
      });

      expect(res.headers.get('access-control-allow-origin')).toBeNull();
      expect(res.headers.get('access-control-allow-credentials')).toBeNull();
    });

    it('serves requests without an Origin header normally without CORS headers', async () => {
      process.env.NODE_ENV = 'production';

      const res = await fetch(`${baseUrl}/api/health`);
      expect(res.status).toBe(200);
      expect(res.headers.get('access-control-allow-origin')).toBeNull();
    });
  });

  describe('4. Authentication & Security Invariants Under Production CORS', () => {
    let server: http.Server;
    let baseUrl: string;

    const testUser = { id: '11111111-2222-4333-8444-555555555555', email: 'verified@pickem.com', role: 'USER' };
    const validToken = jwt.sign(
      { sub: testUser.id, email: testUser.email, role: testUser.role, iss: 'https://nsljipyoihcoqkuphhll.supabase.co/auth/v1', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 },
      'synthetic-key'
    );

    beforeAll(async () => {
      const { setSupabaseAuthClientForTesting } = await import('../src/middleware/auth');
      setSupabaseAuthClientForTesting({
        auth: {
          getUser: async (token: string) => {
            const decoded = jwt.decode(token) as any;
            if (!decoded || !decoded.sub) return { data: { user: null }, error: { message: 'Invalid token', status: 401 } };
            return {
              data: {
                user: {
                  id: decoded.sub,
                  email: decoded.email,
                },
              },
              error: null,
            };
          },
        },
      } as any);

      await new Promise<void>((resolve) => {
        server = app.listen(0, () => {
          const addr = server.address() as any;
          baseUrl = `http://127.0.0.1:${addr.port}`;
          resolve();
        });
      });
    });

    afterAll(async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    it('production strictly ignores spoofed x-user-email and x-user-role headers', async () => {
      process.env.NODE_ENV = 'production';

      const res = await fetch(`${baseUrl}/api/me/inbox`, {
        headers: {
          'x-user-email': 'admin@pickem.com',
          'x-user-role': 'ADMIN',
        },
      });

      // Must fail closed to 401 because no valid Bearer token is provided
      expect(res.status).toBe(401);
    });

    it('requires valid Bearer token for protected routes regardless of Origin', async () => {
      process.env.NODE_ENV = 'production';
      process.env.CORS_ALLOWED_ORIGINS = 'https://portal.nflpickem.com';

      // Even with an approved Origin, missing Bearer token must return 401
      const res = await fetch(`${baseUrl}/api/me/inbox`, {
        headers: {
          Origin: 'https://portal.nflpickem.com',
        },
      });
      expect(res.status).toBe(401);
      // But CORS header is attached so client receives the 401 response
      expect(res.headers.get('access-control-allow-origin')).toBe('https://portal.nflpickem.com');
    });

    it('accepts verified Bearer token with server-derived identity', async () => {
      process.env.NODE_ENV = 'production';
      process.env.CORS_ALLOWED_ORIGINS = 'https://portal.nflpickem.com';

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(testUser as any);
      vi.spyOn(prisma.inboxMessage, 'findMany').mockResolvedValue([] as any);
      vi.spyOn(prisma.inboxMessage, 'count').mockResolvedValue(0 as any);

      const res = await fetch(`${baseUrl}/api/me/inbox`, {
        headers: {
          Origin: 'https://portal.nflpickem.com',
          Authorization: `Bearer ${validToken}`,
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('messages');
      expect(data).toHaveProperty('totalCount', 0);
      expect(res.headers.get('access-control-allow-origin')).toBe('https://portal.nflpickem.com');
    });

    it('enforces 403 Forbidden for nonmembers on pool-scoped routes under production CORS', async () => {
      process.env.NODE_ENV = 'production';
      process.env.CORS_ALLOWED_ORIGINS = 'https://portal.nflpickem.com';

      const poolId = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(testUser as any);
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue({ id: poolId, name: 'Main Pool' } as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue(null);

      const res = await fetch(`${baseUrl}/api/pools/${poolId}/lounge/messages`, {
        headers: {
          Origin: 'https://portal.nflpickem.com',
          Authorization: `Bearer ${validToken}`,
        },
      });

      expect(res.status).toBe(403);
      expect(res.headers.get('access-control-allow-origin')).toBe('https://portal.nflpickem.com');
    });

    it('enforces 404 Not Found for disabled features or unmapped endpoints', async () => {
      process.env.NODE_ENV = 'production';
      process.env.CORS_ALLOWED_ORIGINS = 'https://portal.nflpickem.com';

      const res = await fetch(`${baseUrl}/api/disabled-or-unmapped-feature`, {
        headers: {
          Origin: 'https://portal.nflpickem.com',
          Authorization: `Bearer ${validToken}`,
        },
      });

      expect(res.status).toBe(404);
      expect(res.headers.get('access-control-allow-origin')).toBe('https://portal.nflpickem.com');
    });

    it('enforces read-only safety on GET /api/health', async () => {
      process.env.NODE_ENV = 'production';
      const res1 = await fetch(`${baseUrl}/api/health`);
      const res2 = await fetch(`${baseUrl}/api/health`);
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
    });
  });
});
