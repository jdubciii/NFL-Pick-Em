import { Router, Request, Response } from 'express';
import prisma from '../db/client';
import { requireAuth, requireAdmin, requirePoolCommissioner, getPrismaClient } from '../middleware/auth';
import { normalizeTeamCode } from '../services/authoritativeSlateService';
import { savePickAtomically, resolveGameWithCanonicalLock, SavedPickRecord, AmbiguousGameIdentityError } from './picks';

export const adminRouter = Router();
export const poolAdminRouter = Router({ mergeParams: true });

/**
 * State-free HTTP 410 Gone for retired legacy unscoped admin pick and pool routes (Invariant #20, HAG6-AUTHORITY-2026-10-31-01).
 * Executes immediately without authentication or database reads/writes.
 */
adminRouter.use(
  ['/picks', '/pools'],
  (_req: Request, res: Response): void => {
    res.status(410).json({
      error: 'ENDPOINT_RETIRED: Legacy unscoped admin pick and pool endpoints have been retired. Use canonical pool-scoped routes under /api/pools/:pool_id/* (Invariant #20).',
      code: 'ENDPOINT_RETIRED',
      retired: true,
    });
  }
);

/**
 * GET /api/admin/users
 * Returns list of all registered users for admin management.
 */
adminRouter.get('/users', requireAuth, requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = getPrismaClient();
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { email: 'asc' },
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

/**
 * GET /api/admin/audit-logs
 * Returns recent audit logs for the audit trail viewer.
 */
adminRouter.get('/audit-logs', requireAuth, requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = getPrismaClient();
    const logs = await db.auditLog.findMany({
      take: 50,
      orderBy: { timestamp: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

/**
 * GET /api/pools/:pool_id/admin/picks
 * Returns all weekly NFL games populated with the targeted user's picks.
 * Protected by requirePoolCommissioner (strictly path-scoped, requiring ACTIVE commissioner membership).
 */
export const handleAdminPicksGet = async (req: Request, res: Response): Promise<void> => {
  const pool = req.pool!;
  const poolId = pool.id;

  // Reject conflicting query pool_id if supplied
  const queryPoolId = req.query.pool_id || req.query.poolId;
  if (queryPoolId && String(queryPoolId) !== poolId) {
    res.status(400).json({
      error: `POOL_MISMATCH: query pool_id '${queryPoolId}' does not match path parameter pool_id '${poolId}'.`,
    });
    return;
  }

  const targetUserId = req.query.user_id ? String(req.query.user_id) : undefined;
  const requestedWeek = req.query.week || req.query.week_no || req.query.weekNumber;
  const settings = (pool.settings as any) || {};
  const defaultWeek = Number(settings.week_number ?? settings.current_week ?? 5);
  const isAllWeeks = String(requestedWeek).toLowerCase() === 'all';
  const weekNum = requestedWeek !== undefined && requestedWeek !== null && requestedWeek !== ''
    ? (isAllWeeks ? 0 : parseInt(String(requestedWeek), 10) || defaultWeek)
    : defaultWeek;

  try {
    const db = getPrismaClient();
    const allGames = await db.game.findMany({
      orderBy: { kickoffTime: 'asc' },
      include: {
        picks: targetUserId
          ? {
              where: {
                userId: targetUserId,
                poolId: pool.id,
              },
            }
          : false,
      },
    });

    let games = allGames;
    if (!isAllWeeks && weekNum > 0 && allGames.length > 0) {
      const padded = weekNum < 10 ? `_w0${weekNum}_` : `_w${weekNum}_`;
      const unpadded = `_w${weekNum}_`;
      const patternMatched = allGames.filter((g: any) =>
        g.externalGameId && (
          g.externalGameId.toLowerCase().includes(padded.toLowerCase()) ||
          g.externalGameId.toLowerCase().includes(unpadded.toLowerCase())
        )
      );
      if (patternMatched.length > 0) {
        games = patternMatched;
      }
    }

    res.json({
      pool: {
        id: pool.id,
        name: pool.name,
      },
      games: games.map((game: any) => ({
        id: game.id,
        externalGameId: game.externalGameId,
        homeTeamId: game.homeTeamId,
        awayTeamId: game.awayTeamId,
        kickoffTime: game.kickoffTime,
        status: game.status,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        userPick: (game as any).picks?.[0]?.selectedTeamId ?? null,
        pickId: (game as any).picks?.[0]?.id ?? null,
      })),
    });
  } catch (error) {
    console.error('Error fetching admin picks slate:', error);
    res.status(500).json({ error: 'Failed to fetch admin picks slate.' });
  }
};

/**
 * PUT /api/pools/:pool_id/admin/picks
 * POST /api/pools/:pool_id/admin/picks/override
 * POST /api/pools/:pool_id/picks/override
 * Commissioner override route for modifying or creating picks for any user.
 * Protected by requirePoolCommissioner (strictly path-scoped, requiring ACTIVE commissioner membership).
 * Captures previous state, updates pick, immediately re-grades if game is final, and writes an audit log.
 */
export const handleAdminPickOverride = async (req: Request, res: Response): Promise<void> => {
  const pool = req.pool!;
  const poolId = pool.id;

  // Reject conflicting body/query pool IDs (derive authority strictly from path/req.pool)
  const bodyPoolId = req.body?.pool_id !== undefined ? req.body.pool_id : req.body?.poolId;
  if (bodyPoolId && String(bodyPoolId) !== poolId) {
    res.status(400).json({
      error: `POOL_MISMATCH: body pool_id '${bodyPoolId}' does not match path parameter pool_id '${poolId}'.`,
      code: 'POOL_MISMATCH',
    });
    return;
  }

  const queryPoolId = req.query?.pool_id !== undefined ? req.query.pool_id : req.query?.poolId;
  if (queryPoolId && String(queryPoolId) !== poolId) {
    res.status(400).json({
      error: `POOL_MISMATCH: query pool_id '${queryPoolId}' does not match path parameter pool_id '${poolId}'.`,
      code: 'POOL_MISMATCH',
    });
    return;
  }

  const userId = req.body?.user_id || req.body?.userId;
  const rawGameId = req.body?.game_id || req.body?.gameId;
  const rawWeek = req.body?.week !== undefined ? req.body.week : req.body?.selectedWeek;

  const rawSelectedTeamId = req.body?.selected_team_id !== undefined
    ? req.body.selected_team_id
    : (req.body?.selectedTeamId !== undefined
      ? req.body.selectedTeamId
      : (req.body?.selected_team !== undefined
        ? req.body.selected_team
        : (req.body?.selectedTeam !== undefined
          ? req.body.selectedTeam
          : (req.body?.team_id !== undefined
            ? req.body.team_id
            : (req.body?.teamId !== undefined
              ? req.body.teamId
              : req.body?.team)))));

  if (!userId || !rawGameId) {
    res.status(400).json({ error: 'user_id and game_id are required fields.' });
    return;
  }

  const gameId = String(rawGameId).trim();
  const selectedTeamId = rawSelectedTeamId !== undefined && rawSelectedTeamId !== null && String(rawSelectedTeamId).trim().length > 0
    ? String(rawSelectedTeamId).trim()
    : null;

  const adminId = req.user!.id;

  try {
    const db = getPrismaClient();

    // 1. Authoritative game resolution & ambiguous identity check before entering transaction
    const initialGame = await resolveGameWithCanonicalLock(db, gameId);
    if (!initialGame) {
      res.status(404).json({ error: 'Game not found.' });
      return;
    }

    const authoritativeWeek = initialGame.week != null ? Number(initialGame.week) : null;
    if (authoritativeWeek == null || !Number.isInteger(authoritativeWeek) || authoritativeWeek < 1 || authoritativeWeek > 18) {
      res.status(400).json({
        error: 'INVALID_PICK_WEEK: Matchup has invalid or missing authoritative week metadata.',
        code: 'INVALID_PICK_WEEK',
      });
      return;
    }

    if (rawWeek !== undefined && rawWeek !== null) {
      const callerWeek = Number(rawWeek);
      if (!Number.isFinite(callerWeek) || !Number.isInteger(callerWeek) || callerWeek !== authoritativeWeek) {
        res.status(400).json({
          error: `INVALID_PICK_WEEK: Provided week ${rawWeek} does not match authoritative game week ${authoritativeWeek}.`,
          code: 'INVALID_PICK_WEEK',
        });
        return;
      }
    }

    // 2. Early participant check
    const normSelected = selectedTeamId ? normalizeTeamCode(selectedTeamId) : null;
    if (normSelected) {
      const normHome = normalizeTeamCode(initialGame.homeTeamId);
      const normAway = normalizeTeamCode(initialGame.awayTeamId);
      if (normHome === 'UNK' || normAway === 'UNK') {
        res.status(400).json({ error: 'Game participants cannot be verified.' });
        return;
      }
      if (normSelected !== normHome && normSelected !== normAway) {
        res.status(400).json({
          error: `Selected team '${selectedTeamId}' is not a participant in this game (${normAway} @ ${normHome}).`,
        });
        return;
      }
    }

    // 3. Early status check (Decision #66)
    if (initialGame.status === 'FINAL' || initialGame.status === 'IN_PROGRESS') {
      res.status(403).json({
        error: 'KICKOFF_PASSED: Cannot override pick for a game that has kicked off or finalized (Decision #66). Zero writes.',
        code: 'KICKOFF_PASSED',
      });
      return;
    }

    const canonicalGameId = initialGame.id;

    const result = await savePickAtomically(db, {
      poolId,
      userId,
      gameId: canonicalGameId,
      week: authoritativeWeek,
      selectedTeamId: normSelected,
      submittedById: adminId,
      externalGameId: initialGame.externalGameId || undefined,
      validateParticipants: true,
      onBeforeCommit: async (tx: any, savedPick: SavedPickRecord, existingRecord: any | null) => {
        if (savedPick.id === 'noop') {
          return null;
        }
        if (!tx?.auditLog || typeof tx.auditLog.create !== 'function') {
          const auditErr: any = new Error('AUDIT_LOG_UNAVAILABLE: Mandatory audit log capability is unavailable under transaction. Zero writes.');
          auditErr.code = 'AUDIT_LOG_UNAVAILABLE';
          auditErr.statusCode = 500;
          throw auditErr;
        }
        const auditLog = await tx.auditLog.create({
          data: {
            actorId: adminId,
            action: 'ADMIN_OVERRIDE_PICK',
            targetEntityId: savedPick.id,
            oldValue: existingRecord ? JSON.parse(JSON.stringify(existingRecord)) : null,
            newValue: JSON.parse(JSON.stringify(savedPick)),
          },
        });
        if (!auditLog || !auditLog.id || String(auditLog.id).trim().length === 0) {
          const auditErr: any = new Error('AUDIT_LOG_FAILED: Failed to create mandatory audit log entry for admin override. Zero writes.');
          auditErr.code = 'AUDIT_LOG_FAILED';
          auditErr.statusCode = 500;
          throw auditErr;
        }
        return auditLog.id;
      },
    });

    if (result.id === 'noop' || (result.selectedTeamId === null && result.id === 'noop')) {
      res.status(200).json({
        message: 'Pick unselect on unpicked game confirmed no-op.',
        pick: null,
        auditLogId: null,
      });
      return;
    }

    res.status(200).json({
      message: 'Pick successfully updated by admin.',
      pick: result,
      auditLogId: result.auditLogId || null,
    });
  } catch (error: any) {
    console.error('Error during admin pick override:', error);

    if (error.code === 'P2003') {
      res.status(400).json({ error: 'Invalid user_id, pool_id, or game_id reference.' });
      return;
    }

    if (error instanceof AmbiguousGameIdentityError || error.code === 'AMBIGUOUS_GAME_IDENTITY') {
      res.status(409).json({
        error: error.message || 'Ambiguous game identity: multiple games matched. Zero writes performed.',
        code: 'AMBIGUOUS_GAME_IDENTITY',
      });
      return;
    }

    if (error.code === 'DUPLICATE_PICK_IDENTITY') {
      res.status(409).json({
        error: error.message || 'Duplicate pick identity conflict detected. Zero writes performed.',
        code: 'DUPLICATE_PICK_IDENTITY',
      });
      return;
    }

    const statusCode = error.statusCode || error.status || 500;
    res.status(statusCode).json({
      error: error.message || 'Failed to perform admin pick override.',
      code: error.code,
    });
  }
};

// Canonical pool-scoped admin pick routes under /api/pools/:pool_id/* (Invariant #20)
poolAdminRouter.get('/:pool_id/admin/picks', requireAuth, requirePoolCommissioner, handleAdminPicksGet);
poolAdminRouter.get('/:pool_id/picks/admin', requireAuth, requirePoolCommissioner, handleAdminPicksGet);
poolAdminRouter.put('/:pool_id/admin/picks', requireAuth, requirePoolCommissioner, handleAdminPickOverride);
poolAdminRouter.post('/:pool_id/admin/picks', requireAuth, requirePoolCommissioner, handleAdminPickOverride);
poolAdminRouter.post('/:pool_id/admin/picks/override', requireAuth, requirePoolCommissioner, handleAdminPickOverride);
poolAdminRouter.post('/:pool_id/picks/override', requireAuth, requirePoolCommissioner, handleAdminPickOverride);
poolAdminRouter.put('/:pool_id/picks/override', requireAuth, requirePoolCommissioner, handleAdminPickOverride);
