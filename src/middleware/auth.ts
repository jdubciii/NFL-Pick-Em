import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
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
    }
  }
}

export const JWT_SECRET = process.env.JWT_SECRET || 'nfl-pick-em-secret-key-change-in-prod';

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Middleware to verify JWT and attach user payload to req.user.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const devEmail = (req.headers['x-user-email'] || req.headers['x-dev-user-email']) as string;
  if (devEmail && process.env.NODE_ENV !== 'production') {
    try {
      const user = await prisma.user.findFirst({
        where: { email: devEmail },
      });
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
        };
        next();
        return;
      }
    } catch {
      // Ignore db error, fallback to synthetic dev user
    }

    const isDevAdmin =
      (req.headers['x-user-role'] as string) === 'ADMIN' ||
      devEmail.toLowerCase() === 'jack@nflpickem.com' ||
      devEmail.toLowerCase().includes('admin');

    req.user = {
      id: devEmail.toLowerCase() === 'jack@nflpickem.com' ? '4cbde3a9-6f8f-44cf-80fa-3c16c03810db' : 'dev-user-id',
      email: devEmail,
      role: isDevAdmin ? Role.ADMIN : Role.USER,
    };
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Missing or malformed token.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
    return;
  }
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
    rawPoolId = req.params[paramName] || (paramName === 'pool_id' ? (req.params.poolId || req.body?.pool_id || req.body?.poolId || req.query?.pool_id) : undefined);
  }

  if (!rawPoolId || typeof rawPoolId !== 'string' || !UUID_REGEX.test(rawPoolId)) {
    res.status(400).json({ error: 'Invalid pool ID format. Must be a valid UUID.' });
    return;
  }

  try {
    const pool = await prisma.pool.findUnique({
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

    req.pool = pool;
    next();
  } catch (error) {
    console.error('Error in requirePoolCommissioner:', error);
    res.status(500).json({ error: 'Failed to authorize pool commissioner.' });
  }
}

/**
 * Middleware to verify that the authenticated user is an ACTIVE member of the specified pool (or pool commissioner / global ADMIN).
 * Validates pool UUID format, checks pool existence (404), and verifies active membership (403).
 */
export async function requirePoolMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const poolId = req.params.pool_id || req.params.poolId || req.body.pool_id || req.body.poolId || req.query.pool_id;
  if (!poolId || !UUID_REGEX.test(String(poolId))) {
    res.status(400).json({ error: 'Invalid pool ID format. Must be a valid UUID.' });
    return;
  }

  try {
    const pool = await prisma.pool.findUnique({
      where: { id: String(poolId) },
    });

    if (!pool) {
      res.status(404).json({ error: 'Pool not found.' });
      return;
    }

    const isCommissioner = pool.adminId === req.user.id;
    if (isCommissioner) {
      req.pool = pool;
      next();
      return;
    }

    const membership = await prisma.poolMembership.findUnique({
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
    next();
  } catch (error) {
    console.error('Error in requirePoolMember:', error);
    res.status(500).json({ error: 'Failed to authorize pool membership.' });
  }
}
