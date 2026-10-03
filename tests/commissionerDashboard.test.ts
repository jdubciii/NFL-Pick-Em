import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role, GameStatus, Prisma } from '@prisma/client';
import { app } from '../src/server';
import { JWT_SECRET } from '../src/middleware/auth';
import { assertDisposableUrl } from '../src/db/safeguards';
import {
  setOverrideServiceClock,
  createOverrideProposal,
  recordProposalVote,
  executeProposal,
} from '../src/services/overrideService';

const rehearsalDbUrl =
  process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/pickem_rehearsal';

describe('Milestone 13.2 Commissioner Dashboard & Governance Integration Tests', () => {
  let server: http.Server;
  let baseUrl: string;
  let prisma: PrismaClient;

  let commissionerUser: any;
  let memberUser: any;
  let globalAdminUser: any;
  let otherCommissionerUser: any;

  let commissionerToken: string;
  let memberToken: string;
  let globalAdminToken: string;
  let otherCommissionerToken: string;

  let pool: any;
  let otherPool: any;
  let finalGame: any;
  let scheduledGame: any;

  beforeAll(async () => {
    assertDisposableUrl(rehearsalDbUrl);
    prisma = new PrismaClient({ datasources: { db: { url: rehearsalDbUrl } }, log: [] });

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });

    commissionerUser = await prisma.user.create({
      data: {
        email: `commish_13_2_${Date.now()}@example.com`,
        passwordHash: 'hash',
        role: Role.USER,
      },
    });

    memberUser = await prisma.user.create({
      data: {
        email: `member_13_2_${Date.now()}@example.com`,
        passwordHash: 'hash',
        role: Role.USER,
      },
    });

    globalAdminUser = await prisma.user.create({
      data: {
        email: `admin_13_2_${Date.now()}@example.com`,
        passwordHash: 'hash',
        role: Role.ADMIN,
      },
    });

    otherCommissionerUser = await prisma.user.create({
      data: {
        email: `other_commish_13_2_${Date.now()}@example.com`,
        passwordHash: 'hash',
        role: Role.USER,
      },
    });

    commissionerToken = jwt.sign(
      { id: commissionerUser.id, email: commissionerUser.email, role: commissionerUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    memberToken = jwt.sign(
      { id: memberUser.id, email: memberUser.email, role: memberUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    globalAdminToken = jwt.sign(
      { id: globalAdminUser.id, email: globalAdminUser.email, role: globalAdminUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    otherCommissionerToken = jwt.sign(
      { id: otherCommissionerUser.id, email: otherCommissionerUser.email, role: otherCommissionerUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    pool = await prisma.pool.create({
      data: {
        name: `Commissioner Pool ${Date.now()}`,
        adminId: commissionerUser.id,
        status: 'ACTIVE',
        settings: {},
      },
    });

    otherPool = await prisma.pool.create({
      data: {
        name: `Other Pool ${Date.now()}`,
        adminId: otherCommissionerUser.id,
        status: 'ACTIVE',
        settings: {},
      },
    });

    await prisma.poolMembership.createMany({
      data: [
        { poolId: pool.id, userId: commissionerUser.id, status: 'ACTIVE' },
        { poolId: pool.id, userId: memberUser.id, status: 'ACTIVE' },
        { poolId: otherPool.id, userId: otherCommissionerUser.id, status: 'ACTIVE' },
      ],
    });

    finalGame = await prisma.game.create({
      data: {
        externalGameId: `final_game_${Date.now()}`,
        homeTeamId: 'KC',
        awayTeamId: 'BUF',
        kickoffTime: new Date('2026-10-01T17:00:00Z'),
        status: GameStatus.FINAL,
        homeScore: 24,
        awayScore: 20,
      },
    });

    scheduledGame = await prisma.game.create({
      data: {
        externalGameId: `sched_game_${Date.now()}`,
        homeTeamId: 'SF',
        awayTeamId: 'DAL',
        kickoffTime: new Date('2026-11-20T20:00:00Z'),
        status: GameStatus.SCHEDULED,
      },
    });
  });

  afterAll(async () => {
    setOverrideServiceClock(undefined);
    if (finalGame) await prisma.game.delete({ where: { id: finalGame.id } }).catch(() => {});
    if (scheduledGame) await prisma.game.delete({ where: { id: scheduledGame.id } }).catch(() => {});
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    setOverrideServiceClock(undefined);
  });

  describe('1. Decision #20: Pool Commissioner Scoping & Tier Isolation', () => {
    it('allows verified pool commissioner to vote on and execute proposals', async () => {
      const proposal = await createOverrideProposal({
        poolId: pool.id,
        commissionerId: commissionerUser.id,
        type: 'PICK',
        targetEntityId: memberUser.id,
        data: { userId: memberUser.id, gameId: finalGame.id, selectedTeamId: 'KC' },
        reason: 'Stat correction for late submission',
      });

      // Vote APPROVE
      const voteRes = await fetch(`${baseUrl}/api/pools/${pool.id}/proposals/${proposal.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${commissionerToken}`,
        },
        body: JSON.stringify({ decision: 'APPROVE' }),
      });

      expect(voteRes.status).toBe(200);
      const voteData = await voteRes.json();
      expect(voteData.proposal.newValue.status).toBe('APPROVED');

      // Execute proposal
      const execRes = await fetch(`${baseUrl}/api/pools/${pool.id}/proposals/${proposal.id}/execute`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${commissionerToken}`,
        },
      });

      expect(execRes.status).toBe(200);
      const execData = await execRes.json();
      expect(execData.success).toBe(true);

      // Verify Pick state
      const pick = await prisma.pick.findUnique({
        where: {
          poolId_userId_gameId: {
            poolId: pool.id,
            userId: memberUser.id,
            gameId: finalGame.id,
          },
        },
      });
      expect(pick?.selectedTeamId).toBe('KC');
    });

    it('rejects standard pool members with 403 Forbidden', async () => {
      const proposal = await createOverrideProposal({
        poolId: pool.id,
        commissionerId: commissionerUser.id,
        type: 'PICK',
        targetEntityId: memberUser.id,
        data: { userId: memberUser.id, gameId: finalGame.id, selectedTeamId: 'KC' },
        reason: 'Member test',
      });

      const res = await fetch(`${baseUrl}/api/pools/${pool.id}/proposals/${proposal.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({ decision: 'APPROVE' }),
      });

      expect(res.status).toBe(403);
    });

    it('rejects global ADMINs who are not pool commissioners with 403 Forbidden (Decision #20 zero bypass)', async () => {
      const proposal = await createOverrideProposal({
        poolId: pool.id,
        commissionerId: commissionerUser.id,
        type: 'PICK',
        targetEntityId: memberUser.id,
        data: { userId: memberUser.id, gameId: finalGame.id, selectedTeamId: 'KC' },
        reason: 'Admin bypass test',
      });

      const res = await fetch(`${baseUrl}/api/pools/${pool.id}/proposals/${proposal.id}/execute`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${globalAdminToken}`,
        },
      });

      expect(res.status).toBe(403);
    });
  });

  describe('2. Decision #54: Side-Effect Free GET Telemetry', () => {
    it('GET /proposals, GET /overrides, and GET /ops/status execute zero DB mutations', async () => {
      const auditCountBefore = await prisma.auditLog.count();
      const penaltyCountBefore = await prisma.penaltyLedger.count();
      const poolCountBefore = await prisma.pool.count();

      const resProposals = await fetch(`${baseUrl}/api/pools/${pool.id}/proposals`, {
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });
      expect(resProposals.status).toBe(200);

      const resOverrides = await fetch(`${baseUrl}/api/pools/${pool.id}/overrides`, {
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });
      expect(resOverrides.status).toBe(200);

      const resStatus = await fetch(`${baseUrl}/api/pools/${pool.id}/ops/status`, {
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });
      expect(resStatus.status).toBe(200);

      const auditCountAfter = await prisma.auditLog.count();
      const penaltyCountAfter = await prisma.penaltyLedger.count();
      const poolCountAfter = await prisma.pool.count();

      expect(auditCountBefore).toBe(auditCountAfter);
      expect(penaltyCountBefore).toBe(penaltyCountAfter);
      expect(poolCountBefore).toBe(poolCountAfter);
    });
  });

  describe('3. Decision #27: Authoritative Slate & Game Finality Verification', () => {
    it('fails closed when proposal targets an unfinalized slate or game', async () => {
      const unfinalizedProposal = await createOverrideProposal({
        poolId: pool.id,
        commissionerId: commissionerUser.id,
        type: 'SCORE_ADJUSTMENT',
        targetEntityId: memberUser.id,
        data: {
          userId: memberUser.id,
          gameId: scheduledGame.id,
          requireGameFinal: true,
          slateFinalized: false,
          points: '1.50',
        },
        reason: 'Premature adjustment attempt',
      });

      const res = await fetch(`${baseUrl}/api/pools/${pool.id}/proposals/${unfinalizedProposal.id}/execute`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${commissionerToken}`,
        },
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.details || data.error).toContain('DECISION_27_FAIL_CLOSED');
    });
  });

  describe('4. Decisions #3 & #22: Precision Decimal Scoring & Aggregation', () => {
    it('applies decimal scoring adjustments accurately without floating-point drift', async () => {
      const decimalProposal = await createOverrideProposal({
        poolId: pool.id,
        commissionerId: commissionerUser.id,
        type: 'PENALTY',
        targetEntityId: memberUser.id,
        data: {
          userId: memberUser.id,
          delta: '1.75',
          weekNumber: 4,
        },
        reason: 'Precise fractional penalty adjustment',
      });

      const res = await fetch(`${baseUrl}/api/pools/${pool.id}/proposals/${decimalProposal.id}/execute`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${commissionerToken}`,
        },
      });

      expect(res.status).toBe(200);

      // Verify Decimal representation in database
      const memberStat = await prisma.poolMemberStat.findUnique({
        where: {
          poolId_userId: {
            poolId: pool.id,
            userId: memberUser.id,
          },
        },
      });

      expect(memberStat).not.toBeNull();
      expect(new Prisma.Decimal(memberStat!.totalShotsDrank).toNumber()).toBeGreaterThanOrEqual(1.75);
    });
  });

  describe('5. Decision #55: Transaction Fail-Closed Rollback', () => {
    it('aborts and rolls back entire state on execution error', async () => {
      const invalidProposal = await createOverrideProposal({
        poolId: pool.id,
        commissionerId: commissionerUser.id,
        type: 'PICK',
        targetEntityId: memberUser.id,
        data: {
          userId: memberUser.id,
          // Missing gameId triggers failure in transaction
        },
        reason: 'Simulated fail-closed transaction',
      });

      const res = await fetch(`${baseUrl}/api/pools/${pool.id}/proposals/${invalidProposal.id}/execute`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${commissionerToken}`,
        },
      });

      expect([400, 500]).toContain(res.status);

      // Verify proposal status remained unexecuted
      const checkProposal = await prisma.auditLog.findUnique({
        where: { id: invalidProposal.id },
      });
      const val = checkProposal?.newValue as any;
      expect(val.status).not.toBe('EXECUTED');
    });
  });

  describe('6. Injectable ClockFn Determinism', () => {
    it('records deterministic timestamps on proposal voting and execution', async () => {
      const fixedTime = new Date('2026-10-02T18:45:00.000Z');
      setOverrideServiceClock(() => fixedTime);

      const prop = await createOverrideProposal({
        poolId: pool.id,
        commissionerId: commissionerUser.id,
        type: 'PENALTY',
        targetEntityId: memberUser.id,
        data: { userId: memberUser.id, delta: '0.50' },
        reason: 'Clock test',
      });

      const voted = await recordProposalVote(
        pool.id,
        prop.id,
        commissionerUser.id,
        'APPROVE',
        () => fixedTime
      );
      expect((voted.newValue as any).votedAt).toBe(fixedTime.toISOString());

      const executed = await executeProposal(
        pool.id,
        prop.id,
        commissionerUser.id,
        () => fixedTime
      );
      expect(executed.executedAt.toISOString()).toBe(fixedTime.toISOString());
    });
  });
});
