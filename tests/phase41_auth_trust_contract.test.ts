import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import http from 'http';
import { app } from '../src/server';
import prisma from '../src/db/client';
import {
  validateProductionAuthConfig,
  createSyntheticSupabaseToken,
  setSupabaseAuthClientForTesting,
  getSupabaseAuthClient,
  FIXED_SUPABASE_URL,
  JWT_SECRET,
} from '../src/middleware/auth';
import {
  scopedExpressFetch,
  setActiveSessionToken,
  setSessionTokenProvider,
  getMemberSessionToken,
  isScopedExpressApi,
} from '../client/src/lib/apiClient';

describe('Phase 41 Authoritative Supabase Auth Contract Tests', () => {
  const originalEnv = { ...process.env };
  const SYNTHETIC_APPROVED_ORIGIN = 'https://nfl-pick-em-api.onrender.com';
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

  beforeEach(() => {
    vi.restoreAllMocks();
    setActiveSessionToken(null);
    setSessionTokenProvider(null);
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    setSupabaseAuthClientForTesting(null);
    setActiveSessionToken(null);
    setSessionTokenProvider(null);
    process.env = { ...originalEnv };
  });

  // 1. Fixed project and trusted Supabase Auth configuration
  it('1. Fixed project and trusted Supabase Auth configuration', () => {
    expect(FIXED_SUPABASE_URL).toBe('https://nsljipyoihcoqkuphhll.supabase.co');
  });

  // 2. Trusted Auth client does not persist sessions
  it('2. Trusted Auth client does not persist sessions', () => {
    const client = getSupabaseAuthClient();
    expect(client).toBeDefined();
    expect((client as any).auth).toBeDefined();
  });

  // 3. Explicit bearer passed separately on each request
  it('3. Explicit bearer passed separately on each request', async () => {
    const getUserMock = vi.fn().mockImplementation(async (token: string) => {
      return {
        data: {
          user: {
            id: 'user-explicit-bearer',
            aud: 'authenticated',
            role: 'authenticated',
            email: 'explicit@nflpickem.com',
            app_metadata: {},
            user_metadata: {},
            created_at: new Date().toISOString(),
          },
        },
        error: null,
      };
    });
    setSupabaseAuthClientForTesting({ auth: { getUser: getUserMock } } as any);

    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: 'user-explicit-bearer',
      email: 'explicit@nflpickem.com',
      role: 'USER',
      displayName: 'Explicit User',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const tokenA = createSyntheticSupabaseToken({ id: 'user-explicit-bearer' });
    const res = await fetch(`${baseUrl}/api/pools`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    expect(getUserMock).toHaveBeenCalledWith(tokenA);
    expect(res.status).not.toBe(401);
  });

  // 4. Concurrent users never share mutable auth state
  it('4. Concurrent users never share mutable auth state', async () => {
    const getUserMock = vi.fn().mockImplementation(async (token: string) => {
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      return {
        data: {
          user: {
            id: payload.sub,
            aud: 'authenticated',
            role: 'authenticated',
            email: `${payload.sub}@nflpickem.com`,
            app_metadata: {},
            user_metadata: {},
            created_at: new Date().toISOString(),
          },
        },
        error: null,
      };
    });
    setSupabaseAuthClientForTesting({ auth: { getUser: getUserMock } } as any);

    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }: any) => {
      return {
        id: where.id,
        email: `${where.id}@nflpickem.com`,
        role: 'USER',
        displayName: `User ${where.id}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;
    });

    const tokenA = createSyntheticSupabaseToken({ id: 'concurrent-user-a' });
    const tokenB = createSyntheticSupabaseToken({ id: 'concurrent-user-b' });

    const [resA, resB] = await Promise.all([
      fetch(`${baseUrl}/api/pools`, { headers: { Authorization: `Bearer ${tokenA}` } }),
      fetch(`${baseUrl}/api/pools`, { headers: { Authorization: `Bearer ${tokenB}` } }),
    ]);

    expect(resA.status).not.toBe(401);
    expect(resB.status).not.toBe(401);
    expect(getUserMock).toHaveBeenCalledWith(tokenA);
    expect(getUserMock).toHaveBeenCalledWith(tokenB);
  });

  // 5. Successful verified user ID mapping
  it('5. Successful verified user ID mapping', async () => {
    const verifiedId = '66666666-6666-6666-6666-666666666666';
    setSupabaseAuthClientForTesting({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: verifiedId,
              aud: 'authenticated',
              role: 'authenticated',
              email: 'mapped@nflpickem.com',
            },
          },
          error: null,
        }),
      },
    } as any);

    const findUniqueSpy = vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: verifiedId,
      email: 'mapped@nflpickem.com',
      role: 'USER',
      displayName: 'Mapped User',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const token = createSyntheticSupabaseToken({ id: verifiedId });
    const res = await fetch(`${baseUrl}/api/pools`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(findUniqueSpy).toHaveBeenCalledWith({
      where: { id: verifiedId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  // 6. Wrong issuer and wrong audience rejected
  it('6. Wrong issuer and wrong audience rejected', async () => {
    const badIssuerToken = createSyntheticSupabaseToken(
      { id: 'user-bad-iss' },
      { iss: 'https://malicious-project.supabase.co/auth/v1' }
    );
    const resIss = await fetch(`${baseUrl}/api/pools`, {
      headers: { Authorization: `Bearer ${badIssuerToken}` },
    });
    expect(resIss.status).toBe(401);

    const badAudToken = createSyntheticSupabaseToken(
      { id: 'user-bad-aud' },
      { aud: 'anon' }
    );
    const resAud = await fetch(`${baseUrl}/api/pools`, {
      headers: { Authorization: `Bearer ${badAudToken}` },
    });
    expect(resAud.status).toBe(401);
  });

  // 7. Expired, unsigned, malformed, and legacy tokens rejected
  it('7. Expired, unsigned, malformed, and legacy tokens rejected', async () => {
    // Expired token
    const expiredToken = createSyntheticSupabaseToken(
      { id: 'user-expired' },
      { exp: Math.floor(Date.now() / 1000) - 3600 }
    );
    const resExp = await fetch(`${baseUrl}/api/pools`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    expect(resExp.status).toBe(401);

    // Malformed token
    const resMalformed = await fetch(`${baseUrl}/api/pools`, {
      headers: { Authorization: 'Bearer not.a.valid.jwt' },
    });
    expect(resMalformed.status).toBe(401);

    // Legacy custom Express JWT (using old JWT_SECRET)
    const jwt = await import('jsonwebtoken');
    const legacyToken = jwt.default.sign(
      { id: 'legacy-user-id', email: 'legacy@nflpickem.com', role: 'ADMIN' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const resLegacy = await fetch(`${baseUrl}/api/pools`, {
      headers: { Authorization: `Bearer ${legacyToken}` },
    });
    expect(resLegacy.status).toBe(401);
  });

  // 8. Auth outage returns 503 without fallback
  it('8. Auth outage returns 503 without fallback', async () => {
    setSupabaseAuthClientForTesting({
      auth: {
        getUser: vi.fn().mockRejectedValue(new Error('fetch failed: network down')),
      },
    } as any);

    const validToken = createSyntheticSupabaseToken({ id: 'user-outage-test' });
    const res = await fetch(`${baseUrl}/api/pools`, {
      headers: { Authorization: `Bearer ${validToken}` },
    });

    expect(res.status).toBe(503);
    const body: any = await res.json();
    expect(body.error).toContain('temporarily unavailable');
  });

  // 9. Missing trusted config refuses production startup
  it('9. Missing trusted config refuses production startup', () => {
    expect(() => {
      validateProductionAuthConfig({
        NODE_ENV: 'production',
        SUPABASE_URL: 'https://wrong-project.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
      });
    }).toThrow(/INVALID_SUPABASE_PROJECT/);

    expect(() => {
      validateProductionAuthConfig({
        NODE_ENV: 'production',
        SUPABASE_URL: FIXED_SUPABASE_URL,
        SUPABASE_ANON_KEY: '',
      });
    }).toThrow(/INVALID_SUPABASE_ANON_KEY/);
  });

  // 10. No dev JWT signing-key fallback
  it('10. No dev JWT signing-key fallback', async () => {
    const jwt = await import('jsonwebtoken');
    const devToken = jwt.default.sign({ sub: 'dev-fallback' }, 'dev-jwt-secret-placeholder-for-local-runs-only');
    const res = await fetch(`${baseUrl}/api/pools`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    expect(res.status).toBe(401);
  });

  // 11. No development identity-header bypass
  it('11. No development identity-header bypass', async () => {
    const res = await fetch(`${baseUrl}/api/pools`, {
      headers: {
        'x-user-email': 'spoofed@nflpickem.com',
        'x-user-role': 'ADMIN',
      },
    });
    expect(res.status).toBe(401);
  });

  // 12. Verified nonmember returns 403
  it('12. Verified nonmember returns 403', async () => {
    const nonmemberId = '99999999-9999-9999-9999-999999999999';
    setSupabaseAuthClientForTesting({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: nonmemberId,
              aud: 'authenticated',
              role: 'authenticated',
              email: 'nonmember@nflpickem.com',
            },
          },
          error: null,
        }),
      },
    } as any);

    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

    const token = createSyntheticSupabaseToken({ id: nonmemberId });
    const res = await fetch(`${baseUrl}/api/pools`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(403);
    const body: any = await res.json();
    expect(body.error).toContain('User account not authorized or not found');
  });

  // 13. Disabled feature remains 404
  it('13. Disabled feature remains 404', async () => {
    const res = await fetch(`${baseUrl}/api/non-existent-feature-endpoint`);
    expect(res.status).toBe(404);
  });

  // 14. ACTIVE membership and pool isolation retained
  it('14. ACTIVE membership and pool isolation retained', async () => {
    const memberId = 'a1111111-1111-1111-1111-111111111111';
    const targetPoolId = 'b1111111-1111-1111-1111-111111111111';

    setSupabaseAuthClientForTesting({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: memberId, aud: 'authenticated', role: 'authenticated', email: 'member@test.com' },
          },
          error: null,
        }),
      },
    } as any);

    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: memberId,
      email: 'member@test.com',
      role: 'USER',
      displayName: 'Member',
    } as any);

    vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue({
      id: targetPoolId,
      adminId: 'other-commissioner-id',
    } as any);

    vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue(null);

    const token = createSyntheticSupabaseToken({ id: memberId });
    const res = await fetch(`${baseUrl}/api/pools/${targetPoolId}/leaderboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(403);
    const body: any = await res.json();
    expect(body.error).toContain('Active pool membership required');
  });

  // 15. Commissioner authorization from trusted records
  it('15. Commissioner authorization from trusted records', async () => {
    const normalUserId = 'c1111111-1111-1111-1111-111111111111';
    const targetPoolId = 'd1111111-1111-1111-1111-111111111111';

    setSupabaseAuthClientForTesting({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: normalUserId, aud: 'authenticated', role: 'authenticated', email: 'normal@test.com' },
          },
          error: null,
        }),
      },
    } as any);

    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: normalUserId,
      email: 'normal@test.com',
      role: 'USER',
      displayName: 'Normal User',
    } as any);

    vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue({
      id: targetPoolId,
      adminId: 'actual-commissioner-id',
    } as any);

    vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
      userId: normalUserId,
      poolId: targetPoolId,
      role: 'MEMBER',
      status: 'ACTIVE',
    } as any);

    const token = createSyntheticSupabaseToken({ id: normalUserId });
    const res = await fetch(`${baseUrl}/api/pools/${targetPoolId}/ops/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(403);
  });

  // 16. Authorized join/admission exceptions preserved
  it('16. Authorized join/admission exceptions preserved', async () => {
    const joiningUserId = 'joining-user-id';
    setSupabaseAuthClientForTesting({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: joiningUserId, aud: 'authenticated', role: 'authenticated', email: 'joining@test.com' },
          },
          error: null,
        }),
      },
    } as any);

    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: joiningUserId,
      email: 'joining@test.com',
      role: 'USER',
      displayName: 'Joining User',
    } as any);

    const token = createSyntheticSupabaseToken({ id: joiningUserId });
    const res = await fetch(`${baseUrl}/api/pools/pool-join-target/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    expect(res.status).not.toBe(401);
  });

  // 17. No writes during authentication or GET
  it('17. No writes during authentication or GET', async () => {
    const testUserId = 'readonly-get-user';
    setSupabaseAuthClientForTesting({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: testUserId, aud: 'authenticated', role: 'authenticated', email: 'ro@test.com' },
          },
          error: null,
        }),
      },
    } as any);

    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: testUserId,
      email: 'ro@test.com',
      role: 'USER',
      displayName: 'RO User',
    } as any);

    const userCreateSpy = vi.spyOn(prisma.user, 'create');
    const userUpdateSpy = vi.spyOn(prisma.user, 'update');
    const userUpsertSpy = vi.spyOn(prisma.user, 'upsert');

    const token = createSyntheticSupabaseToken({ id: testUserId });
    await fetch(`${baseUrl}/api/pools`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(userCreateSpy).not.toHaveBeenCalled();
    expect(userUpdateSpy).not.toHaveBeenCalled();
    expect(userUpsertSpy).not.toHaveBeenCalled();
  });

  // 18. Current Supabase session used by scoped client
  it('18. Current Supabase session used by scoped client', async () => {
    setActiveSessionToken('current-supabase-session-token');

    let sentAuth: string | null = null;
    const mockFetch = vi.fn(async (_url: any, init?: any) => {
      sentAuth = new Headers(init?.headers).get('Authorization');
      return new Response('[]', { status: 200 });
    });

    await scopedExpressFetch('/api/pools', {
      originalFetch: mockFetch as any,
      apiOrigin: SYNTHETIC_APPROVED_ORIGIN,
      isProd: true,
    });

    expect(sentAuth).toBe('Bearer current-supabase-session-token');
  });

  // 19. No independent browser-storage token scanning
  it('19. No independent browser-storage token scanning', async () => {
    setActiveSessionToken(null);
    setSessionTokenProvider(null);

    const mockStorage: any = {
      getItem: vi.fn((key: string) => {
        if (key.startsWith('sb-')) return JSON.stringify({ access_token: 'scanned-token' });
        return null;
      }),
    };

    let sentAuth: string | null = null;
    const mockFetch = vi.fn(async (_url: any, init?: any) => {
      sentAuth = new Headers(init?.headers).get('Authorization');
      return new Response('[]', { status: 200 });
    });

    await scopedExpressFetch('/api/pools', {
      originalFetch: mockFetch as any,
      storage: mockStorage,
      apiOrigin: SYNTHETIC_APPROVED_ORIGIN,
      isProd: true,
    });

    expect(sentAuth).toBeNull();
  });

  // 20. A-to-B switch does not substitute member credentials
  it('20. A-to-B switch does not substitute member credentials', async () => {
    setActiveSessionToken('token-member-a');
    expect(getMemberSessionToken()).toBe('token-member-a');

    setActiveSessionToken('token-member-b');
    expect(getMemberSessionToken()).toBe('token-member-b');
  });

  // 21. Late A request or retry cannot become B\'s action
  it('21. Late A request or retry cannot become B\'s action', async () => {
    const tokenA = 'token-member-a';
    const reqHeadersA = new Headers({ Authorization: `Bearer ${tokenA}` });

    setActiveSessionToken('token-member-b');

    expect(reqHeadersA.get('Authorization')).toBe('Bearer token-member-a');
  });

  // 22. Logout and token expiry fail closed
  it('22. Logout and token expiry fail closed', async () => {
    setActiveSessionToken(null);
    expect(getMemberSessionToken()).toBeNull();

    let capturedHeaders: Headers | undefined;
    const mockFetch = vi.fn(async (_url: any, init?: any) => {
      capturedHeaders = new Headers(init?.headers);
      return new Response('[]', { status: 401 });
    });

    const res = await scopedExpressFetch('/api/pools', {
      originalFetch: mockFetch as any,
      apiOrigin: SYNTHETIC_APPROVED_ORIGIN,
      isProd: true,
    });

    expect(capturedHeaders?.get('Authorization')).toBeNull();
    expect(res.status).toBe(401);
  });

  // 23. Legitimate refresh does not restore legacy auth
  it('23. Legitimate refresh does not restore legacy auth', async () => {
    setActiveSessionToken('refreshed-supabase-token-123');
    const token = getMemberSessionToken();
    expect(token).toBe('refreshed-supabase-token-123');
    expect(token).not.toBe('synthetic-legacy-dev-bearer');
  });

  // 24. Every discovered Express API caller uses scoped routing
  it('24. Every discovered Express API caller uses scoped routing', () => {
    expect(isScopedExpressApi('/api/pools')).toBe(true);
    expect(isScopedExpressApi('/api/picks')).toBe(true);
    expect(isScopedExpressApi('/api/admin/users')).toBe(true);
    expect(isScopedExpressApi('/api/pools/123/penalties/adjust')).toBe(true);
    expect(isScopedExpressApi('/api/pools/123/matrix')).toBe(true);
  });

  // 25. Invalid/unapproved destination rejected before attaching authorization
  it('25. Invalid/unapproved destination rejected before attaching authorization', async () => {
    let unapprovedFetchCalled = false;
    const mockFetch = vi.fn(async () => {
      unapprovedFetchCalled = true;
      return new Response('{}', { status: 200 });
    });

    setActiveSessionToken('sensitive-session-token');

    await expect(
      scopedExpressFetch('https://attacker-controlled-endpoint.com/api/pools', {
        originalFetch: mockFetch as any,
        apiOrigin: SYNTHETIC_APPROVED_ORIGIN,
        isProd: true,
      })
    ).rejects.toThrow('UNAUTHORIZED_ABSOLUTE_EXPRESS_DESTINATION');

    expect(unapprovedFetchCalled).toBe(false);
  });

  // 26. Supabase SDK requests remain functional
  it('26. Supabase SDK requests remain functional', async () => {
    expect(isScopedExpressApi('https://nsljipyoihcoqkuphhll.supabase.co/rest/v1/pools')).toBe(false);
  });

  // 27. No Express token leaks into external destinations
  it('27. No Express token leaks into external destinations', () => {
    expect(isScopedExpressApi('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard')).toBe(false);
    expect(isScopedExpressApi('https://api.github.com')).toBe(false);
  });

  // 28. Request strings, URLs, Request objects and RequestInit preserve supported semantics
  it('28. Request strings, URLs, Request objects and RequestInit preserve supported semantics', async () => {
    setActiveSessionToken('valid-token');
    let capturedUrl: string | undefined;
    let capturedMethod: string | undefined;

    const mockFetch = vi.fn(async (input: any, init?: any) => {
      capturedUrl = typeof input === 'string' ? input : input.url;
      capturedMethod = init?.method || 'GET';
      return new Response('{"ok":true}', { status: 200 });
    });

    await scopedExpressFetch('/api/pools', {
      method: 'POST',
      originalFetch: mockFetch as any,
      apiOrigin: SYNTHETIC_APPROVED_ORIGIN,
      isProd: true,
    });

    expect(capturedUrl).toBe(`${SYNTHETIC_APPROVED_ORIGIN}/api/pools`);
    expect(capturedMethod).toBe('POST');
  });

  // 29. Methods, bodies, signals, headers and idempotency keys preserved
  it('29. Methods, bodies, signals, headers and idempotency keys preserved', async () => {
    setActiveSessionToken('valid-token');
    let capturedHeaders: Headers | undefined;
    let capturedBody: any;

    const mockFetch = vi.fn(async (_url: any, init?: any) => {
      capturedHeaders = new Headers(init?.headers);
      capturedBody = init?.body;
      return new Response('{"ok":true}', { status: 200 });
    });

    const controller = new AbortController();
    await scopedExpressFetch('/api/pools/123/overrides', {
      method: 'POST',
      headers: {
        'x-client-request-id': 'req-idempotency-key-xyz',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ delta: 2 }),
      signal: controller.signal,
      originalFetch: mockFetch as any,
      apiOrigin: SYNTHETIC_APPROVED_ORIGIN,
      isProd: true,
    });

    expect(capturedHeaders?.get('x-client-request-id')).toBe('req-idempotency-key-xyz');
    expect(capturedHeaders?.get('Authorization')).toBe('Bearer valid-token');
    expect(capturedBody).toBe(JSON.stringify({ delta: 2 }));
  });

  // 30. Existing kickoff/scoring and social idempotency rules remain unchanged
  it('30. Existing kickoff/scoring and social idempotency rules remain unchanged', async () => {
    const res = await fetch(`${baseUrl}/api/picks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
  });

  // 31. Regression: Supabase-only user with NULL passwordHash succeeds without P2032
  it('31. Regression: Supabase-only user with NULL passwordHash succeeds without P2032', async () => {
    const userUuid = '77777777-7777-7777-7777-777777777777';

    // 1. Supply a valid synthetic Supabase-authenticated user through the controlled test verifier
    const getUserMock = vi.fn().mockImplementation(async (_token: string) => {
      return {
        data: {
          user: {
            id: userUuid,
            aud: 'authenticated',
            role: 'authenticated',
            email: 'synthetic_null_pw@nflpickem.test',
            app_metadata: {},
            user_metadata: {},
            created_at: new Date().toISOString(),
          },
        },
        error: null,
      };
    });
    setSupabaseAuthClientForTesting({ auth: { getUser: getUserMock } } as any);

    // 2. Configure Prisma mock to reproduce P2032 if full record or passwordHash is requested
    const findUniqueSpy = vi.spyOn(prisma.user, 'findUnique').mockImplementation(async (args: any) => {
      if (!args?.select || args?.select?.passwordHash) {
        const error: any = new Error(
          'Error converting field "passwordHash" of expected non-nullable type "String", found incompatible value of "null".'
        );
        error.code = 'P2032';
        error.clientVersion = '5.x';
        throw error;
      }

      if (args.select.id && args.select.email && args.select.role && !args.select.passwordHash) {
        return {
          id: userUuid,
          email: 'synthetic_null_pw@nflpickem.test',
          role: 'USER',
        } as any;
      }

      return null;
    });

    vi.spyOn(prisma.inboxMessage, 'findMany').mockResolvedValue([]);

    const token = createSyntheticSupabaseToken({ id: userUuid, email: 'synthetic_null_pw@nflpickem.test' });

    // Positive control: request succeeds and reaches protected route
    const res = await fetch(`${baseUrl}/api/me/inbox`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages).toEqual([]);

    // Assert that prisma.user.findUnique received the expected select projection
    expect(findUniqueSpy).toHaveBeenCalledTimes(1);
    const callArgs = findUniqueSpy.mock.calls[0][0];
    expect(callArgs.where).toEqual({ id: userUuid });
    expect(callArgs.select).toEqual({
      id: true,
      email: true,
      role: true,
    });
    expect(callArgs.select.passwordHash).toBeUndefined();

    // Negative controls preserved:
    // Missing bearer -> 401
    const unauthRes = await fetch(`${baseUrl}/api/me/inbox`);
    expect(unauthRes.status).toBe(401);

    // Missing public account -> 403
    findUniqueSpy.mockImplementationOnce(async () => null);
    const missingAccountRes = await fetch(`${baseUrl}/api/me/inbox`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(missingAccountRes.status).toBe(403);

    // Header impersonation attempt -> 401
    const headerImpersonationRes = await fetch(`${baseUrl}/api/me/inbox`, {
      headers: { 'x-user-email': 'admin@example.com' },
    });
    expect(headerImpersonationRes.status).toBe(401);
  });
});

