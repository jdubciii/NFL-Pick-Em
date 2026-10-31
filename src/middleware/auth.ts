import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import prisma from '../db/client';

export interface AuthUserPayload {
  id: string;
  email: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
      pool?: any;
      membership?: any;
    }
  }
}

export const FIXED_SUPABASE_PROJECT_REF = 'nsljipyoihcoqkuphhll';
export const FIXED_SUPABASE_URL = `https://${FIXED_SUPABASE_PROJECT_REF}.supabase.co`;
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zbGppcHlvaWhjb3FrdXBoaGxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NTY3NDUsImV4cCI6MjEwNjEzMjc0NX0.OD0dom_H-n0cAPeQyngmUPJhrKNNr9G9m6DqpPsFGYw';

export const JWT_SECRET = process.env.JWT_SECRET || 'nfl-pick-em-secret-key-change-in-prod';
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createSyntheticSupabaseToken(
  user: { id: string; email?: string; role?: Role | string },
  overrides?: Record<string, any>
): string {
  const payload = {
    sub: user.id,
    email: user.email || 'user@example.com',
    role: user.role || Role.USER,
    iss: `${FIXED_SUPABASE_URL}/auth/v1`,
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
  return jwt.sign(payload, 'synthetic-test-key');
}

let testSupabaseAuthClient: SupabaseClient | null = null;
let testPrismaClient: any = null;

export function setSupabaseAuthClientForTesting(client: SupabaseClient | null): void {
  testSupabaseAuthClient = client;
}

export function setPrismaClientForTesting(client: any): void {
  testPrismaClient = client;
}

export function getPrismaClient(): any {
  return testPrismaClient || prisma;
}

export function validateProductionAuthConfig(envOverride?: Record<string, string | undefined>): void {
  const env = envOverride || process.env;
  if (env.NODE_ENV === 'production') {
    const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
    if (!url || !url.startsWith(FIXED_SUPABASE_URL)) {
      throw new Error(`INVALID_SUPABASE_PROJECT: Expected ${FIXED_SUPABASE_URL}, got ${url}`);
    }
    const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
    if (!anonKey || typeof anonKey !== 'string' || !anonKey.trim()) {
      throw new Error('INVALID_SUPABASE_ANON_KEY: Missing or empty Supabase publishable key in production');
    }
  }
}

export function getSupabaseAuthClient(): SupabaseClient {
  if (testSupabaseAuthClient) {
    return testSupabaseAuthClient;
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || FIXED_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  validateProductionAuthConfig();

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Middleware to verify Supabase Auth access token and attach user payload to req.user.
 * 
 * Strict Failure Contract:
 * - HTTP 401: Missing, malformed, expired, invalid signature, wrong project/issuer/audience.
 * - HTTP 503: Supabase Auth service outage, timeout, or indeterminate dependency failure.
 * - HTTP 403: Verified Supabase user lacks active application user account.
 * - Read-only invariant: Never mutates, creates, or syncs user rows during authentication.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Missing or malformed token.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token || !token.trim()) {
    res.status(401).json({ error: 'Authentication required. Missing or malformed token.' });
    return;
  }

  // 1. Claim-policy inspection (decoding only, never substitutes for server-backed getUser)
  let decodedPayload: any = null;
  try {
    decodedPayload = jwt.decode(token);
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
    return;
  }

  if (!decodedPayload || typeof decodedPayload !== 'object') {
    res.status(401).json({ error: 'Invalid or expired token.' });
    return;
  }

  // Enforce expected project issuer policy
  const expectedIssuer = `${FIXED_SUPABASE_URL}/auth/v1`;
  if (!decodedPayload.iss || decodedPayload.iss !== expectedIssuer) {
    res.status(401).json({ error: 'Invalid token issuer.' });
    return;
  }

  // Enforce audience "authenticated"
  const aud = decodedPayload.aud;
  const isAudAuthenticated = aud === 'authenticated' || (Array.isArray(aud) && aud.includes('authenticated'));
  if (!aud || !isAudAuthenticated) {
    res.status(401).json({ error: 'Invalid token audience.' });
    return;
  }

  // Enforce expiration
  if (!decodedPayload.exp || decodedPayload.exp < Math.floor(Date.now() / 1000)) {
    res.status(401).json({ error: 'Invalid or expired token.' });
    return;
  }

  // Require non-empty subject
  if (!decodedPayload.sub || typeof decodedPayload.sub !== 'string') {
    res.status(401).json({ error: 'Invalid token subject.' });
    return;
  }

  // 2. Server-backed verification via supabase.auth.getUser(token)
  const authClient = getSupabaseAuthClient();
  let verifiedAuthUser: any = null;

  try {
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data?.user) {
      const errMsg = (error?.message || '').toLowerCase();
      const errStatus = (error as any)?.status;
      const isOutage =
        errStatus >= 500 ||
        errMsg.includes('fetch failed') ||
        errMsg.includes('timeout') ||
        errMsg.includes('network') ||
        errMsg.includes('econnrefused');

      if (isOutage) {
        res.status(503).json({ error: 'Authentication service temporarily unavailable.' });
        return;
      }

      res.status(401).json({ error: 'Invalid or expired token.' });
      return;
    }

    verifiedAuthUser = data.user;
  } catch (err: any) {
    const msg = (err?.message || '').toLowerCase();
    const isOutage =
      msg.includes('fetch failed') ||
      msg.includes('timeout') ||
      msg.includes('enotfound') ||
      msg.includes('econnrefused');

    if (isOutage) {
      res.status(503).json({ error: 'Authentication service temporarily unavailable.' });
      return;
    }

    res.status(401).json({ error: 'Invalid or expired token.' });
    return;
  }

  // Enforce subject consistency with verified Auth user ID
  if (decodedPayload.sub !== verifiedAuthUser.id) {
    res.status(401).json({ error: 'Token subject mismatch.' });
    return;
  }

  // 3. Trusted read-only application user lookup (strictly no writes during authentication)
  let dbUser: { id: string; email: string; role: Role } | null = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { id: verifiedAuthUser.id },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });
  } catch (dbErr) {
    console.error('[requireAuth] Database lookup failed:', dbErr);
    res.status(503).json({ error: 'Database service temporarily unavailable.' });
    return;
  }

  if (!dbUser) {
    res.status(403).json({ error: 'User account not authorized or not found.' });
    return;
  }

  req.user = {
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role,
  };

  next();
}

/**
 * Middleware to verify that the authenticated user has the ADMIN role.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  if (req.user.role !== Role.ADMIN) {
    res.status(403).json({ error: 'Forbidden. Admin privileges required.' });
    return;
  }

  next();
}

export interface PoolGuardOptions {
  from?: 'param' | 'query' | 'body';
  name?: string;
}

/**
 * Middleware to verify that the authenticated user is the commissioner of the specified pool.
 * Accepts optional options { from: 'param' | 'query' | 'body', name?: string }.
 * Validates check order: 401 (auth) -> 400 (missing/invalid UUID) -> 404 (pool not found) -> 403 (not commissioner).
 * Attaches verified pool to req.pool.
 */
export function requirePoolCommissioner(
  optionsOrReq?: PoolGuardOptions | Request,
  maybeRes?: Response,
  maybeNext?: NextFunction
): any {
  // If invoked directly as middleware: requirePoolCommissioner(req, res, next)
  if (optionsOrReq && (optionsOrReq as Request).headers !== undefined && maybeRes && maybeNext) {
    return handlePoolCommissioner({ from: 'param', name: 'pool_id' }, optionsOrReq as Request, maybeRes, maybeNext);
  }

  // Otherwise, invoked as factory: requirePoolCommissioner({ from: 'query' })
  const options: PoolGuardOptions = (optionsOrReq as PoolGuardOptions) || { from: 'param', name: 'pool_id' };
  return (req: Request, res: Response, next: NextFunction) => {
    return handlePoolCommissioner(options, req, res, next);
  };
}

async function handlePoolCommissioner(
  options: PoolGuardOptions,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const from = options.from || 'param';
  const paramName = options.name || 'pool_id';

  let rawPoolId: any;
  if (from === 'query') {
    rawPoolId = req.query[paramName] || (paramName === 'pool_id' ? req.query.poolId : undefined);
  } else if (from === 'body') {
    rawPoolId = req.body?.[paramName] || (paramName === 'pool_id' ? req.body?.poolId : undefined);
  } else {
    // param (default)
    rawPoolId = req.params[paramName] || (paramName === 'pool_id' ? req.params.poolId : undefined);
  }

  if (!rawPoolId || typeof rawPoolId !== 'string' || !UUID_REGEX.test(rawPoolId)) {
    res.status(400).json({ error: 'Invalid pool ID format. Must be a valid UUID.' });
    return;
  }

  try {
    const db = getPrismaClient();
    const pool = await db.pool.findUnique({
      where: { id: rawPoolId },
    });

    if (!pool) {
      res.status(404).json({ error: 'Pool not found.' });
      return;
    }

    const isCommissioner = pool.adminId === req.user.id;
    if (!isCommissioner) {
      res.status(403).json({ error: 'Forbidden. Pool commissioner privileges required.' });
      return;
    }

    // Require verified ACTIVE actor membership (including commissioner requests; unknown state denies)
    const membership = await db.poolMembership.findUnique({
      where: {
        poolId_userId: {
          poolId: pool.id,
          userId: req.user.id,
        },
      },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      res.status(403).json({ error: 'Forbidden. Active pool membership required.' });
      return;
    }

    req.pool = pool;
    req.membership = membership;
    next();
  } catch (error) {
    console.error('Error in requirePoolCommissioner:', error);
    res.status(500).json({ error: 'Failed to authorize pool commissioner.' });
  }
}

/**
 * Middleware to verify that the authenticated user is an ACTIVE member of the specified pool.
 * Validates pool UUID format, checks pool existence (404), and verifies active membership (403).
 * No commissioner bypass shortcut: verified ACTIVE actor membership is required for ALL users, including commissioner.
 */
export async function requirePoolMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const poolId = req.params.pool_id || req.params.poolId;
  if (!poolId || !UUID_REGEX.test(String(poolId))) {
    res.status(400).json({ error: 'Invalid pool ID format. Must be a valid UUID.' });
    return;
  }

  try {
    const db = getPrismaClient();
    const pool = await db.pool.findUnique({
      where: { id: String(poolId) },
    });

    if (!pool) {
      res.status(404).json({ error: 'Pool not found.' });
      return;
    }

    const membership = await db.poolMembership.findUnique({
      where: {
        poolId_userId: {
          poolId: String(poolId),
          userId: req.user.id,
        },
      },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      res.status(403).json({ error: 'Forbidden. Active pool membership required.' });
      return;
    }

    req.pool = pool;
    req.membership = membership;
    next();
  } catch (error) {
    console.error('Error in requirePoolMember:', error);
    res.status(500).json({ error: 'Failed to authorize pool membership.' });
  }
}
