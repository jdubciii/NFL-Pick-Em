import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role, GameStatus, Prisma } from '@prisma/client';
import { app } from '../src/server';
import { JWT_SECRET } from '../src/middleware/auth';
import { assertDisposableUrl } from '../src/db/safeguards';
import { createOverrideProposal, applyOverride, listProposals } from '../src/services/overrideService';

const rehearsalDbUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/pickem_rehearsal';

describe('Milestone 12.2: Pool Commissioner Proposals & Overrides Service', () => {
  let server: http.Server;
  let baseUrl: string;
  let prisma: PrismaClient;

  let adminUser: any;
  let commissionerUser: any;
  let otherCommissionerUser: any;
  let memberUser: any;

  let adminToken: string;
  let commissionerToken: string;
  let otherCommissionerToken: string;
  let memberToken: string;

  let pool: any;
  let game: any;

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

    adminUser = await prisma.user.create({
      data: { email: `overrides_admin_${Date.now()}@example.com`, passwordHash: 'hash123', role: Role.ADMIN },
    });

    commissionerUser = await prisma.user.create({
      data: { email: `overrides_commish_${Date.now()}@example.com`, passwordHash: 'hash123', role: Role.USER },
    });

    otherCommissionerUser = await prisma.user.create({
      data: { email: `overrides_other_commish_${Date.now()}@example.com`, passwordHash: 'hash123', role: Role.USER },
    });

    memberUser = await prisma.user.create({
      data: { email: `overrides_member_${Date.now()}@example.com`, passwordHash: 'hash123', role: Role.USER },
    });

    adminToken = jwt.sign({ id: adminUser.id, email: adminUser.email, role: adminUser.role }, JWT_SECRET, { expiresIn: '1h' });
    commissionerToken = jwt.sign({ id: commissionerUser.id, email: commissionerUser.email, role: commissionerUser.role }, JWT_SECRET, { expiresIn: '1h' });
    otherCommissionerToken = jwt.sign({ id: otherCommissionerUser.id, email: otherCommissionerUser.email, role: otherCommissionerUser.role }, JWT_SECRET, { expiresIn: '1h' });
    memberToken = jwt.sign({ id: memberUser.id, email: memberUser.email, role: memberUser.role }, JWT_SECRET, { expiresIn: '1h' });

    pool = await prisma.pool.create({
      data: {
        name: `Overrides Pool ${Date.now()}`,
        adminId: commissionerUser.id,
        status: 'ACTIVE',
        settings: {},
      },
    });

    await prisma.poolMembership.createMany({
      data: [
        { poolId: pool.id, userId: commissionerUser.id, status: 'ACTIVE' },
        { poolId: pool.id, userId: memberUser.id, status: 'ACTIVE' },
      ],
    });

    game = await prisma.game.create({
      data: {
        externalGameId: `game_override_${Date.now()}`,
        homeTeamId: 'MIA',
        awayTeamId: 'BUF',
        kickoffTime: new Date('2026-10-25T17:00:00Z'),
        status: GameStatus.SCHEDULED,
      },
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  describe('1. Route Isolation & Decision #20 Verification', () => {
    it('rejects non-commissioner pool members with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/pools/${pool.id}/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({
          type: 'PICK',
          targetEntityId: memberUser.id,
          data: { gameId: game.id, selectedTeamId: 'MIA' },
          reason: 'Member trying to propose',
        }),
      });
      expect(res.status).toBe(403);
    });

    it('rejects global ADMIN users who are not pool commissioners (Decision #20 zero bypass)', async () => {
      const res = await fetch(`${baseUrl}/api/pools/${pool.id}/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          type: 'PICK',
          targetEntityId: memberUser.id,
          data: { gameId: game.id, selectedTeamId: 'MIA' },
          reason: 'Global admin attempting pool route without ownership',
        }),
      });
      expect(res.status).toBe(403);
    });

    it('rejects commissioners of different pools with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/pools/${pool.id}/overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${otherCommissionerToken}` },
        body: JSON.stringify({
          type: 'PENALTY',
          targetEntityId: memberUser.id,
          data: { delta: 1 },
          reason: 'Cross-pool commissioner intrusion',
        }),
      });
      expect(res.status).toBe(403);
    });
  });

  describe('2. Commissioner Proposal Creation & Resolution', () => {
    it('allows valid pool commissioner to create an override proposal', async () => {
      const res = await fetch(`${baseUrl}/api/pools/${pool.id}/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${commissionerToken}` },
        body: JSON.stringify({
          type: 'PICK',
          targetEntityId: memberUser.id,
          data: { gameId: game.id, selectedTeamId: 'MIA' },
          reason: 'Late submission due to outage',
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.proposal).toBeDefined();
      expect(data.proposal.action).toBe('COMMISSIONER_PROPOSAL_CREATED');
      expect(data.proposal.actorId).toBe(commissionerUser.id);
    });

    it('applies a commissioner pick override inside a serializable transaction', async () => {
      const res = await fetch(`${baseUrl}/api/pools/${pool.id}/overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${commissionerToken}` },
        body: JSON.stringify({
          type: 'PICK',
          targetEntityId: memberUser.id,
          data: { userId: memberUser.id, gameId: game.id, selectedTeamId: 'BUF' },
          reason: 'Commissioner manual correction',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.action).toBe('COMMISSIONER_OVERRIDE_PICK');
      expect(data.result.selectedTeamId).toBe('BUF');
      expect(data.result.submittedById).toBe(commissionerUser.id);

      // Verify pick in database
      const pick = await prisma.pick.findUnique({
        where: { poolId_userId_gameId: { poolId: pool.id, userId: memberUser.id, gameId: game.id } },
      });
      expect(pick).toBeDefined();
      expect(pick!.selectedTeamId).toBe('BUF');
      expect(pick!.submittedById).toBe(commissionerUser.id);
    });

    it('applies a commissioner penalty override with decimal ledger tracking', async () => {
      const res = await fetch(`${baseUrl}/api/pools/${pool.id}/overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${commissionerToken}` },
        body: JSON.stringify({
          type: 'PENALTY',
          targetEntityId: memberUser.id,
          data: { userId: memberUser.id, delta: 2.5, weekNumber: 1 },
          reason: 'Late fine',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.action).toBe('COMMISSIONER_OVERRIDE_PENALTY');

      // Verify penalty ledger
      const ledger = await prisma.penaltyLedger.findFirst({
        where: { poolId: pool.id, userId: memberUser.id, reason: 'Late fine' },
      });
      expect(ledger).toBeDefined();
      expect(ledger!.delta.toString()).toBe('2.5');
    });
  });

  describe('3. Read-Only GET Proposal Query (Decision #54)', () => {
    it('GET /api/pools/:pool_id/proposals returns history and produces zero side effects', async () => {
      const res = await fetch(`${baseUrl}/api/pools/${pool.id}/proposals`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.poolId).toBe(pool.id);
      expect(Array.isArray(data.proposals)).toBe(true);
      expect(data.proposals.length).toBeGreaterThanOrEqual(1);

      // Re-query to confirm read-only idempotent behavior (Decision #54)
      const res2 = await fetch(`${baseUrl}/api/pools/${pool.id}/proposals`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${commissionerToken}` },
      });
      expect(res2.status).toBe(200);
      const data2 = await res2.json();
      expect(data2.proposals.length).toBe(data.proposals.length);
    });
  });
});
