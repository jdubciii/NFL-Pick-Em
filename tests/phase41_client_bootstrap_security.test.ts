import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../src/middleware/auth';
import { app } from '../src/server';
import prisma from '../src/db/client';
import http from 'http';
import {
  normalizeApiOrigin,
  isScopedExpressApi,
  resolveExpressUrl,
  getMemberSessionToken,
  cleanLegacyBootstrapStorage,
  createInterceptedFetch,
  LEGACY_BOOTSTRAP_USER_ID,
  LEGACY_BOOTSTRAP_POOL_ID,
} from '../client/src/lib/apiClient';

// In-memory mock Storage implementation for isolation
class MockStorage implements Storage {
  private store: Map<string, string> = new Map();
  get length(): number { return this.store.size; }
  clear(): void { this.store.clear(); }
  getItem(key: string): string | null { return this.store.get(key) ?? null; }
  key(index: number): string | null { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string): void { this.store.delete(key); }
  setItem(key: string, value: string): void { this.store.set(key, String(value)); }
}

describe('Phase 41 Client Bootstrap Security & Scoped Express Fetch Interceptor', () => {
  let mockStorage: MockStorage;

  beforeEach(() => {
    mockStorage = new MockStorage();
  });

  describe('1. API Origin Normalization & Production HTTPS Boundary', () => {
    it('requires explicit HTTPS origin in production', () => {
      expect(normalizeApiOrigin('https://nfl-pick-em-api.onrender.com', true)).toBe('https://nfl-pick-em-api.onrender.com');
      expect(normalizeApiOrigin('https://nfl-pick-em-api.onrender.com/', true)).toBe('https://nfl-pick-em-api.onrender.com');
    });

    it('rejects HTTP, LAN IP, localhost, and missing origins in production (fails closed)', () => {
      expect(() => normalizeApiOrigin('http://192.168.1.18:3000', true)).toThrow('APPROVED_HTTPS_API_REQUIRED_IN_PRODUCTION');
      expect(() => normalizeApiOrigin('http://localhost:3000', true)).toThrow('APPROVED_HTTPS_API_REQUIRED_IN_PRODUCTION');
      expect(() => normalizeApiOrigin('http://127.0.0.1:3000', true)).toThrow('APPROVED_HTTPS_API_REQUIRED_IN_PRODUCTION');
      expect(() => normalizeApiOrigin('', true)).toThrow('APPROVED_HTTPS_API_REQUIRED_IN_PRODUCTION');
      expect(() => normalizeApiOrigin(undefined, true)).toThrow('APPROVED_HTTPS_API_REQUIRED_IN_PRODUCTION');
      expect(() => normalizeApiOrigin('not-a-url', true)).toThrow('APPROVED_HTTPS_API_REQUIRED_IN_PRODUCTION');
    });

    it('permits dev origins in non-production environments', () => {
      expect(normalizeApiOrigin('http://192.168.1.18:3000', false)).toBe('http://192.168.1.18:3000');
      expect(normalizeApiOrigin('http://localhost:3000', false)).toBe('http://localhost:3000');
      expect(normalizeApiOrigin('', false)).toBe('');
    });
  });

  describe('2. Express API Boundary Scoping', () => {
    const apiOrigin = 'https://nfl-pick-em-api.onrender.com';

    it('identifies relative Express API routes as scoped', () => {
      expect(isScopedExpressApi('/api/health', apiOrigin)).toBe(true);
      expect(isScopedExpressApi('/api/pools/123/lounge', apiOrigin)).toBe(true);
      expect(isScopedExpressApi('api/me', apiOrigin)).toBe(true);
      expect(isScopedExpressApi('/api', apiOrigin)).toBe(true);
    });

    it('identifies absolute Express API routes matching the configured origin as scoped', () => {
      expect(isScopedExpressApi('https://nfl-pick-em-api.onrender.com/api/pools', apiOrigin)).toBe(true);
      expect(isScopedExpressApi('https://nfl-pick-em-api.onrender.com/api/health', apiOrigin)).toBe(true);
    });

    it('excludes Supabase Auth & Storage from Express API boundary', () => {
      expect(isScopedExpressApi('https://nsljipyoihcoqkuphhll.supabase.co/auth/v1/user', apiOrigin)).toBe(false);
      expect(isScopedExpressApi('https://nsljipyoihcoqkuphhll.supabase.co/storage/v1/object/public/avatars', apiOrigin)).toBe(false);
    });

    it('excludes external feeds and assets from Express API boundary', () => {
      expect(isScopedExpressApi('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard', apiOrigin)).toBe(false);
      expect(isScopedExpressApi('https://unrelated-domain.com/api/other', apiOrigin)).toBe(false);
      expect(isScopedExpressApi('/assets/index-Bql-ZanU.css', apiOrigin)).toBe(false);
      expect(isScopedExpressApi('/vite.svg', apiOrigin)).toBe(false);
    });

    it('resolves relative Express URLs to the approved base origin', () => {
      expect(resolveExpressUrl('/api/health', apiOrigin)).toBe('https://nfl-pick-em-api.onrender.com/api/health');
      expect(resolveExpressUrl('api/me', apiOrigin)).toBe('https://nfl-pick-em-api.onrender.com/api/me');
      expect(resolveExpressUrl('https://nfl-pick-em-api.onrender.com/api/health', apiOrigin)).toBe('https://nfl-pick-em-api.onrender.com/api/health');
      expect(resolveExpressUrl('https://site.api.espn.com/data', apiOrigin)).toBe('https://site.api.espn.com/data');
    });
  });

  describe('3. Legacy Bootstrap Storage Cleanup', () => {
    it('removes legacy hardcoded user and pool from storage', () => {
      mockStorage.setItem('auth_user', JSON.stringify({ id: LEGACY_BOOTSTRAP_USER_ID, email: 'jack@nflpickem.com' }));
      mockStorage.setItem('pool_id', LEGACY_BOOTSTRAP_POOL_ID);
      mockStorage.setItem('unrelated_key', 'safe_data');

      cleanLegacyBootstrapStorage(mockStorage);

      expect(mockStorage.getItem('auth_user')).toBeNull();
      expect(mockStorage.getItem('pool_id')).toBeNull();
      expect(mockStorage.getItem('unrelated_key')).toBe('safe_data');
    });

    it('preserves valid member sessions during cleanup', () => {
      const validUser = { id: 'legit-member-uuid', email: 'member_b@pickem.com', role: 'USER' };
      mockStorage.setItem('auth_user', JSON.stringify(validUser));
      mockStorage.setItem('nfl_pickem_jwt_token', 'synthetic-legit-token-b');
      mockStorage.setItem('pool_id', '9b893bef-3b5a-4ffa-951d-8ba27f9c9782');

      cleanLegacyBootstrapStorage(mockStorage);

      expect(mockStorage.getItem('auth_user')).toBe(JSON.stringify(validUser));
      expect(mockStorage.getItem('nfl_pickem_jwt_token')).toBe('synthetic-legit-token-b');
      expect(mockStorage.getItem('pool_id')).toBe('9b893bef-3b5a-4ffa-951d-8ba27f9c9782');
    });
  });

  describe('4. Intercepted Fetch Request Construction & Header Guarantees', () => {
    const apiOrigin = 'https://nfl-pick-em-api.onrender.com';

    it('emits clean unauthenticated request when no session exists', async () => {
      let capturedUrl = '';
      let capturedHeaders: Headers | undefined;

      const mockBaseFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedUrl = typeof input === 'string' ? input : (input as Request).url;
        capturedHeaders = new Headers(init?.headers);
        return new Response('{}', { status: 200 });
      });

      const customFetch = createInterceptedFetch({
        originalFetch: mockBaseFetch as any,
        storage: mockStorage,
        apiOrigin,
        isProd: true,
      });

      await customFetch('/api/health');

      expect(capturedUrl).toBe('https://nfl-pick-em-api.onrender.com/api/health');
      expect(capturedHeaders?.get('Authorization')).toBeNull();
      expect(capturedHeaders?.get('x-user-email')).toBeNull();
      expect(capturedHeaders?.get('x-user-role')).toBeNull();
      expect(capturedHeaders?.get('x-pool-id')).toBeNull();
    });

    it('attaches legitimate member session Bearer token when present in storage', async () => {
      const tokenB = 'synthetic-jwt-member-b';
      mockStorage.setItem('nfl_pickem_jwt_token', tokenB);

      let capturedHeaders: Headers | undefined;
      const mockBaseFetch = vi.fn(async (_input: any, init?: any) => {
        capturedHeaders = new Headers(init?.headers);
        return new Response('{}', { status: 200 });
      });

      const customFetch = createInterceptedFetch({
        originalFetch: mockBaseFetch as any,
        storage: mockStorage,
        apiOrigin,
        isProd: true,
      });

      await customFetch('/api/pools');

      expect(capturedHeaders?.get('Authorization')).toBe(`Bearer ${tokenB}`);
      // Zero injection of forbidden dev headers
      expect(capturedHeaders?.get('x-user-email')).toBeNull();
      expect(capturedHeaders?.get('x-user-role')).toBeNull();
      expect(capturedHeaders?.get('x-pool-id')).toBeNull();
    });

    it('overrides conflicting caller Authorization with active legitimate session token', async () => {
      const tokenB = 'synthetic-jwt-member-b';
      mockStorage.setItem('nfl_pickem_jwt_token', tokenB);

      let capturedHeaders: Headers | undefined;
      const mockBaseFetch = vi.fn(async (_input: any, init?: any) => {
        capturedHeaders = new Headers(init?.headers);
        return new Response('{}', { status: 200 });
      });

      const customFetch = createInterceptedFetch({
        originalFetch: mockBaseFetch as any,
        storage: mockStorage,
        apiOrigin,
        isProd: true,
      });

      // Caller attempts to supply an old/conflicting bearer
      await customFetch('/api/pools', {
        headers: {
          Authorization: 'Bearer old-stale-token',
        },
      });

      expect(capturedHeaders?.get('Authorization')).toBe(`Bearer ${tokenB}`);
    });

    it('handles session lifecycle changes (login, switch account, logout) dynamically', async () => {
      let capturedHeaders: Headers | undefined;
      const mockBaseFetch = vi.fn(async (_input: any, init?: any) => {
        capturedHeaders = new Headers(init?.headers);
        return new Response('{}', { status: 200 });
      });

      const customFetch = createInterceptedFetch({
        originalFetch: mockBaseFetch as any,
        storage: mockStorage,
        apiOrigin,
        isProd: true,
      });

      // 1. Initial unauthenticated call
      await customFetch('/api/health');
      expect(capturedHeaders?.get('Authorization')).toBeNull();

      // 2. Member A logs in
      mockStorage.setItem('token', 'token-member-a');
      await customFetch('/api/me');
      expect(capturedHeaders?.get('Authorization')).toBe('Bearer token-member-a');

      // 3. Member B switches in
      mockStorage.setItem('token', 'token-member-b');
      await customFetch('/api/me');
      expect(capturedHeaders?.get('Authorization')).toBe('Bearer token-member-b');

      // 4. Member B logs out
      mockStorage.removeItem('token');
      await customFetch('/api/health');
      expect(capturedHeaders?.get('Authorization')).toBeNull();
    });

    it('does not touch Supabase, external APIs, or static assets', async () => {
      mockStorage.setItem('token', 'token-member-b');

      let capturedUrl = '';
      let capturedHeaders: Headers | undefined;
      const mockBaseFetch = vi.fn(async (input: any, init?: any) => {
        capturedUrl = typeof input === 'string' ? input : input.url;
        capturedHeaders = new Headers(init?.headers);
        return new Response('{}', { status: 200 });
      });

      const customFetch = createInterceptedFetch({
        originalFetch: mockBaseFetch as any,
        storage: mockStorage,
        apiOrigin,
        isProd: true,
      });

      // Call to Supabase
      const supabaseUrl = 'https://nsljipyoihcoqkuphhll.supabase.co/auth/v1/user';
      await customFetch(supabaseUrl, {
        headers: {
          apikey: 'anon-key-123',
        },
      });

      expect(capturedUrl).toBe(supabaseUrl);
      expect(capturedHeaders?.get('Authorization')).toBeNull(); // Did NOT inject Express JWT
      expect(capturedHeaders?.get('apikey')).toBe('anon-key-123'); // Preserved Supabase headers

      // Call to ESPN
      const espnUrl = 'https://site.api.espn.com/scoreboard';
      await customFetch(espnUrl);
      expect(capturedUrl).toBe(espnUrl);
      expect(capturedHeaders?.get('Authorization')).toBeNull();
    });

    it('preserves request semantics across String, URL, and Request inputs', async () => {
      mockStorage.setItem('token', 'token-member-b');

      let capturedRequest: Request | undefined;
      const mockBaseFetch = vi.fn(async (input: any) => {
        capturedRequest = input as Request;
        return new Response('{}', { status: 200 });
      });

      const customFetch = createInterceptedFetch({
        originalFetch: mockBaseFetch as any,
        storage: mockStorage,
        apiOrigin,
        isProd: true,
      });

      const controller = new AbortController();
      const originalReq = new Request('https://nfl-pick-em-api.onrender.com/api/pools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': 'req-abc-123',
        },
        body: JSON.stringify({ pick: 'KC' }),
        signal: controller.signal,
      });

      await customFetch(originalReq);

      expect(capturedRequest).toBeDefined();
      expect(capturedRequest?.url).toBe('https://nfl-pick-em-api.onrender.com/api/pools');
      expect(capturedRequest?.method).toBe('POST');
      expect(capturedRequest?.headers.get('Content-Type')).toBe('application/json');
      expect(capturedRequest?.headers.get('x-request-id')).toBe('req-abc-123');
      expect(capturedRequest?.signal.aborted).toBe(false);
      controller.abort();
      expect(capturedRequest?.signal.aborted).toBe(true);
    });
  });

  describe('5. Live Server Actor Recognition & Dynamic User Context', () => {
    let server: http.Server;
    let baseUrl: string;

    const userA = { id: '11111111-1111-4111-8111-111111111111', email: 'member_a@pickem.com', role: 'USER' };
    const userB = { id: '22222222-2222-4222-8222-222222222222', email: 'member_b@pickem.com', role: 'USER' };

    const tokenA = jwt.sign(userA, JWT_SECRET, { expiresIn: '1h' });
    const tokenB = jwt.sign(userB, JWT_SECRET, { expiresIn: '1h' });

    beforeEach(async () => {
      vi.spyOn(prisma.inboxMessage, 'findMany').mockResolvedValue([] as any);
      vi.spyOn(prisma.inboxMessage, 'count').mockResolvedValue(0 as any);

      await new Promise<void>((resolve) => {
        server = app.listen(0, () => {
          const addr = server.address() as any;
          baseUrl = `http://127.0.0.1:${addr.port}`;
          resolve();
        });
      });
    });

    afterEach(async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    it('authenticates Member A and Member B with server-derived actor identity', async () => {
      process.env.NODE_ENV = 'production';

      // 1. Unauthenticated request to protected endpoint receives honest 401
      const resUnauth = await fetch(`${baseUrl}/api/me/inbox`);
      expect(resUnauth.status).toBe(401);

      // 2. Member A request
      const resA = await fetch(`${baseUrl}/api/me/inbox`, {
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
      });
      expect(resA.status).toBe(200);
      const dataA = await resA.json();
      expect(dataA).toHaveProperty('messages');

      // 3. Member B request
      const resB = await fetch(`${baseUrl}/api/me/inbox`, {
        headers: {
          Authorization: `Bearer ${tokenB}`,
        },
      });
      expect(resB.status).toBe(200);
      const dataB = await resB.json();
      expect(dataB).toHaveProperty('messages');
    });
  });
});
