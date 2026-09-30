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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Middleware to verify JWT and attach user payload to req.user.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
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

/**
 * Middleware to verify that the authenticated user is the commissioner of the specified pool (or global ADMIN).
 * Validates pool UUID format, checks pool existence (404), and verifies admin ownership (403).
 */
export async function requirePoolCommissioner(req: Request, res: Response, next: NextFunction): Promise<void> {
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
    const isGlobalAdmin = req.user.role === Role.ADMIN;

    if (!isCommissioner && !isGlobalAdmin) {
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
    const isGlobalAdmin = req.user.role === Role.ADMIN;

    if (isCommissioner || isGlobalAdmin) {
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
