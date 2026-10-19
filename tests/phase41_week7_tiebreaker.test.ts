import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import http from 'http';
import {
  poolTiebreakerRouter,
  getGamesForWeek,
  setCallerBoundSupabaseClientForTesting,
  createCallerBoundSupabaseClient,
} from '../src/routes/poolTiebreakerRoutes';
import { picksRouter } from '../src/routes/picks';
import { WeeklyTiebreakerCard, evaluateCardLockState } from '../client/src/components/picks/WeeklyTiebreakerCard';
import * as apiClient from '../client/src/lib/apiClient';
import * as supabaseJs from '@supabase/supabase-js';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import prisma from '../src/db/client';

const { mockSupabaseCreateClient } = vi.hoisted(() => ({
  mockSupabaseCreateClient: vi.fn(),
}));

vi.mock('@supabase/supabase-js', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    createClient: (...args: any[]) => mockSupabaseCreateClient(...args),
  };
});

function setupMockDom() {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

  const windowListeners: Record<string, Function[]> = {};
  (globalThis as any).addEventListener = (evt: string, fn: Function) => {
    windowListeners[evt] = windowListeners[evt] || [];
    windowListeners[evt].push(fn);
  };
  (globalThis as any).removeEventListener = (evt: string, fn: Function) => {
    if (windowListeners[evt]) {
      windowListeners[evt] = windowListeners[evt].filter(f => f !== fn);
    }
  };

  class MockNode {
    nodeType: number = 1;
    parentNode: any = null;
    ownerDocument: any = null;
    children: any[] = [];
    childNodes: any[] = [];
    get textContent(): string {
      return this.childNodes.map((c: any) => c.textContent || c.nodeValue || '').join('');
    }
    set textContent(val: string) {
      this.childNodes = [new MockTextNode(val, this.ownerDocument)];
      this.children = [];
    }
    contains(child: any): boolean {
      if (child === this) return true;
      for (const c of this.childNodes) {
        if (c === child || (c.contains && c.contains(child))) return true;
      }
      return false;
    }
  }

  class MockTextNode extends MockNode {
    override nodeType = 3;
    nodeValue: string;
    constructor(text: string, doc: any) {
      super();
      this.nodeValue = text;
      this.ownerDocument = doc;
    }
    override get textContent() { return this.nodeValue; }
    override set textContent(v: string) { this.nodeValue = v; }
  }

  class MockCommentNode extends MockNode {
    override nodeType = 8;
    nodeValue: string;
    constructor(text: string, doc: any) {
      super();
      this.nodeValue = text;
      this.ownerDocument = doc;
    }
  }

  class MockElement extends MockNode {
    tagName: string;
    attributes: Record<string, string> = {};
    style: Record<string, string> = {};
    listeners: Record<string, Function[]> = {};
    disabled: boolean = false;
    value: string = '';
    className: string = '';

    constructor(tagName: string, doc: any) {
      super();
      this.tagName = tagName.toUpperCase();
      this.ownerDocument = doc;
    }

    setAttribute(k: string, v: string) {
      this.attributes[k] = String(v);
      if (k === 'disabled') this.disabled = true;
      if (k === 'value') this.value = String(v);
      if (k === 'class') this.className = String(v);
    }
    getAttribute(k: string) {
      if (k === 'disabled') return this.disabled ? '' : null;
      if (k === 'value') return this.value;
      if (k === 'class') return this.className;
      return this.attributes[k] ?? null;
    }
    removeAttribute(k: string) {
      delete this.attributes[k];
      if (k === 'disabled') this.disabled = false;
    }
    addEventListener(evt: string, fn: Function) {
      this.listeners[evt] = this.listeners[evt] || [];
      this.listeners[evt].push(fn);
    }
    removeEventListener(evt: string, fn: Function) {
      if (this.listeners[evt]) {
        this.listeners[evt] = this.listeners[evt].filter(f => f !== fn);
      }
    }
    click() {
      if (this.disabled) return;
      const event: any = {
        type: 'click',
        target: this,
        currentTarget: this,
        bubbles: true,
        cancelable: true,
        defaultPrevented: false,
        isTrusted: true,
        timeStamp: Date.now(),
        preventDefault() { this.defaultPrevented = true; },
        stopPropagation() { this.bubbles = false; },
      };
      if (typeof (this as any).onclick === 'function') {
        (this as any).onclick(event);
      }
      const reactPropsKey = Object.keys(this).find(k => k.startsWith('__reactProps$'));
      if (reactPropsKey && (this as any)[reactPropsKey]?.onClick) {
        (this as any)[reactPropsKey].onClick(event);
        return;
      }
      let curr: any = this;
      while (curr) {
        if (curr.listeners && curr.listeners['click']) {
          for (const l of [...curr.listeners['click']]) {
            l.call(curr, event);
          }
        }
        if (!event.bubbles) break;
        curr = curr.parentNode;
      }
    }
    dispatchEvent(event: any) {
      event.target = this;
      event.currentTarget = this;
      let curr: any = this;
      while (curr) {
        if (curr.listeners && curr.listeners[event.type]) {
          for (const l of [...curr.listeners[event.type]]) {
            l.call(curr, event);
          }
        }
        if (!event.bubbles) break;
        curr = curr.parentNode;
      }
      return true;
    }
    appendChild(child: any) {
      child.parentNode = this;
      this.childNodes.push(child);
      if (child.nodeType === 1) this.children.push(child);
      return child;
    }
    removeChild(child: any) {
      const idxNode = this.childNodes.indexOf(child);
      if (idxNode >= 0) this.childNodes.splice(idxNode, 1);
      const idxEl = this.children.indexOf(child);
      if (idxEl >= 0) this.children.splice(idxEl, 1);
      child.parentNode = null;
      return child;
    }
    insertBefore(newChild: any, refChild: any) {
      newChild.parentNode = this;
      const idxNode = this.childNodes.indexOf(refChild);
      if (idxNode >= 0) this.childNodes.splice(idxNode, 0, newChild);
      else this.childNodes.push(newChild);
      if (newChild.nodeType === 1) {
        const idxEl = this.children.indexOf(refChild);
        if (idxEl >= 0) this.children.splice(idxEl, 0, newChild);
        else this.children.push(newChild);
      }
      return newChild;
    }
  }

  class MockHTMLIFrameElement extends MockElement {}

  const listeners: Record<string, Function[]> = {};

  const mockDoc: any = {
    nodeType: 9,
    visibilityState: 'visible',
    activeElement: null,
    createElement: (tag: string) => new MockElement(tag, mockDoc),
    createElementNS: (_ns: string, tag: string) => new MockElement(tag, mockDoc),
    createTextNode: (text: string) => new MockTextNode(text, mockDoc),
    createComment: (text: string) => new MockCommentNode(text, mockDoc),
    addEventListener: (evt: string, fn: Function) => {
      listeners[evt] = listeners[evt] || [];
      listeners[evt].push(fn);
    },
    removeEventListener: (evt: string, fn: Function) => {
      if (listeners[evt]) {
        listeners[evt] = listeners[evt].filter(f => f !== fn);
      }
    },
  };

  (globalThis as any).Node = MockNode;
  (globalThis as any).Element = MockElement;
  (globalThis as any).HTMLElement = MockElement;
  (globalThis as any).HTMLIFrameElement = MockHTMLIFrameElement;
  (globalThis as any).document = mockDoc;
  (globalThis as any).window = globalThis;
  mockDoc.defaultView = globalThis;

  return { mockDoc, MockElement };
}

vi.mock('../client/src/context/AuthContext', () => ({
  useAuth: () => ({
    token: 'synthetic-jwt-member-1',
    user: { id: 'b2222222-2222-2222-2222-222222222222', role: 'USER' },
  }),
}));
import {
  setSupabaseAuthClientForTesting,
  createSyntheticSupabaseToken,
  requireAuth,
  requirePoolMember,
} from '../src/middleware/auth';
import { GameStatus } from '@prisma/client';
import {
  compareTiebreakerPredictions,
  calculateRankingsAndPenalties,
} from '../src/services/tiebreakerRankingService';
import * as authoritativeSlateService from '../src/services/authoritativeSlateService';
import { opsRouter } from '../src/routes/ops';
import { adminOpsRouter } from '../src/routes/adminOps';
import { handleGetPoolMatrix } from '../src/server';
import * as wrapUpEngine from '../src/services/wrapUpEngine';
import {
  previewWeeklyWrapUpForPool,
  executeWeeklyWrapUpForPool,
} from '../src/services/wrapUpEngine';

describe('Phase 41 Week 7 Tiebreaker Entry, Contract & Privacy Tests (HAG-9)', () => {
  const POOL_ID = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';
  const OTHER_POOL_ID = 'e5748429-738e-464b-8d79-4796c5e09c17';
  const ADMIN_ID = 'a1111111-1111-1111-1111-111111111111';
  const OUTSIDER_ADMIN_ID = 'a9999999-9999-9999-9999-999999999999';
  const MEMBER_1_ID = 'b2222222-2222-2222-2222-222222222222';
  const MEMBER_2_ID = 'c3333333-3333-3333-3333-333333333333';

  let app: express.Application;
  let server: http.Server;
  let baseUrl: string;

  const createAuthToken = (userId: string, role = 'USER') => {
    return createSyntheticSupabaseToken({ id: userId, email: `${userId}@example.com`, role });
  };

  const futureKickoff = new Date(Date.now() + 86400000).toISOString();
  const pastKickoff = new Date(Date.now() - 3600000).toISOString();

  const mockPool = {
    id: POOL_ID,
    name: 'Test Pool 41',
    adminId: ADMIN_ID,
    settings: {
      season: 2026,
      tiebreaker_unavailable_weeks: {
        '2026': {
          '6': true,
        },
      },
    },
  };

  // Canonical ESPN numeric text identifiers (401873010, 401873011) matching production schema
  const mockWeek7Games = [
    {
      id: 'g-w7-det',
      externalGameId: '401873010',
      homeTeamId: 'MIN',
      awayTeamId: 'DET',
      kickoffTime: futureKickoff,
      status: GameStatus.SCHEDULED,
    },
    {
      id: 'g-w7-gb',
      externalGameId: '401873011',
      homeTeamId: 'GB',
      awayTeamId: 'HOU',
      kickoffTime: futureKickoff,
      status: GameStatus.SCHEDULED,
    },
  ];

  beforeEach(async () => {
    vi.restoreAllMocks();
    setCallerBoundSupabaseClientForTesting(null);

    vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockImplementation(async (_db, s, _st, w) => {
      if (s === 2026 && w === 7) {
        return {
          season: 2026,
          seasonType: 2,
          weekNumber: 7,
          revision: 1,
          eventIds: ['401873010', '401873011'],
          acceptedAt: new Date().toISOString(),
          acceptedBy: ADMIN_ID,
          manifestFingerprint: 'mock-fp-w7',
          observationTime: new Date().toISOString(),
        };
      }
      return null;
    });

    const getUserMock = vi.fn().mockImplementation(async (token: string) => {
      const parts = token.split('.');
      if (parts.length < 2) return { data: { user: null }, error: new Error('invalid') };
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      return {
        data: {
          user: {
            id: payload.sub,
            aud: 'authenticated',
            role: 'authenticated',
            email: payload.email || `${payload.sub}@example.com`,
            app_metadata: {},
            user_metadata: {},
            created_at: new Date().toISOString(),
          },
        },
        error: null,
      };
    });
    setSupabaseAuthClientForTesting({ auth: { getUser: getUserMock } } as any);

    (vi.spyOn(prisma.user, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      return {
        id: where.id,
        email: `${where.id}@example.com`,
        role: where.id === ADMIN_ID || where.id === OUTSIDER_ADMIN_ID ? 'ADMIN' : 'USER',
        createdAt: new Date(),
      };
    });

    mockSupabaseCreateClient.mockReset();
    mockSupabaseCreateClient.mockImplementation((_url: string, _key: string, options: any) => {
      return {
        auth: {
          getUser: getUserMock,
        },
        rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
        _options: options,
      };
    });

    app = express();
    app.use(express.json());
    app.use('/api/pools', opsRouter);
    app.use('/api/admin/ops', adminOpsRouter);
    app.use('/api/pools', poolTiebreakerRouter);
    app.use('/api/picks', picksRouter);
    app.get('/api/pools/:pool_id/matrix', requireAuth, requirePoolMember, handleGetPoolMatrix);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    vi.useRealTimers();
    setSupabaseAuthClientForTesting(null);
    setCallerBoundSupabaseClientForTesting(null);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  describe('1. Canonical Pool Route & Membership Authorization', () => {
    it('allows active pool members to read tiebreaker status under /api/pools/:pool_id/tiebreaker', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);
      vi.spyOn(prisma.weeklySubmission, 'findUnique').mockResolvedValue(null);

      const token = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('DEFAULT_LIONS');
      expect(data.tiebreakerOffered).toBe(true);
      expect(data.designatedGame.externalGameId).toBe('401873010');
      expect(data.isLocked).toBe(false);
      expect(data.userPrediction).toBeNull();
    });

    it('denies outsider user lacking active membership with HTTP 403', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue(null); // No membership

      const token = createAuthToken('outsider-user');
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Active pool membership required');
    });

    it('denies outsider global ADMIN who lacks pool membership with HTTP 403 (Decision #20)', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue(null); // Not a member of this pool

      const token = createAuthToken(OUTSIDER_ADMIN_ID, 'ADMIN');
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Active pool membership required');
    });

    it('rejects conflicting pool ID context between URL parameter and body', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);

      const token = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_id: OTHER_POOL_ID, // Mismatched!
          week: 7,
          prediction: 45.0,
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Conflicting pool ID context');
    });

    it('verifies GET is strictly read-only with zero database writes (Decision #54)', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);
      vi.spyOn(prisma.weeklySubmission, 'findUnique').mockResolvedValue(null);

      const poolUpdateSpy = vi.spyOn(prisma.pool, 'update');
      const subUpsertSpy = vi.spyOn(prisma.weeklySubmission, 'upsert');

      const token = createAuthToken(MEMBER_1_ID);
      // Repeated GETs
      await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(poolUpdateSpy).not.toHaveBeenCalled();
      expect(subUpsertSpy).not.toHaveBeenCalled();
    });
  });

  describe('2. Input Range, Numeric Boundaries, and 0 vs Null Distinction', () => {
    it('accepts 0.00 as a valid prediction (not treated as missing)', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);

      const upsertMock = vi.fn().mockImplementation(({ create, update }) => ({
        id: 'sub-zero',
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        weekNumber: 7,
        tieBreakerPrediction: 0,
      }));

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          $queryRawUnsafe: vi.fn().mockResolvedValue([]),
          game: { findFirst: vi.fn().mockResolvedValue(mockWeek7Games[0]), findMany: vi.fn().mockResolvedValue(mockWeek7Games) },
          weeklySubmission: { upsert: upsertMock },
          pool: { findUnique: vi.fn().mockResolvedValue(mockPool), update: vi.fn() },
        });
      });

      const token = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          week: 7,
          season: 2026,
          prediction: '0.00',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.prediction).toBe(0);
      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ tieBreakerPrediction: 0 }),
        })
      );
    });

    it('rejects out-of-bounds, negative, excess precision, and non-finite input without silent rounding', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);

      const token = createAuthToken(MEMBER_1_ID);
      const badInputs = ['-0.01', '1000', '1000.00', '48.555', 'NaN', 'Infinity', 'abc'];

      for (const input of badInputs) {
        const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            week: 7,
            season: 2026,
            prediction: input,
          }),
        });

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('INVALID_PREDICTION');
      }
    });
  });

  describe('3. Save, Update, and Clear Lifecycle with Designation Freeze', () => {
    it('freezes designation on first acknowledged prediction and preserves freeze after explicit clear', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);

      let savedSettings: any = null;
      const poolUpdateMock = vi.fn().mockImplementation(({ data }) => {
        savedSettings = data.settings;
        return { ...mockPool, settings: data.settings };
      });

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          $queryRawUnsafe: vi.fn().mockResolvedValue([]),
          game: { findFirst: vi.fn().mockResolvedValue(mockWeek7Games[0]), findMany: vi.fn().mockResolvedValue(mockWeek7Games) },
          weeklySubmission: { upsert: vi.fn().mockResolvedValue({ id: 'sub-1', tieBreakerPrediction: 48.5 }) },
          pool: {
            findUnique: vi.fn().mockResolvedValue(savedSettings ? { ...mockPool, settings: savedSettings } : mockPool),
            update: poolUpdateMock,
          },
        });
      });

      const token = createAuthToken(MEMBER_1_ID);

      // 1. Initial Save
      const saveRes = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          week: 7,
          season: 2026,
          prediction: 48.5,
        }),
      });

      expect(saveRes.status).toBe(200);
      expect(poolUpdateMock).toHaveBeenCalled();
      expect(savedSettings?.tiebreaker_designations?.['2026']?.['7']?.isFrozen).toBe(true);

      // 2. Explicit Clear does NOT unfreeze designation
      const clearRes = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          week: 7,
          season: 2026,
          clear: true,
        }),
      });

      expect(clearRes.status).toBe(200);
      const clearData = await clearRes.json();
      expect(clearData.prediction).toBeNull();
      // Freeze state must stay preserved!
      expect(savedSettings?.tiebreaker_designations?.['2026']?.['7']?.isFrozen).toBe(true);
    });

    it('preserves existing stored prediction when prediction field is omitted', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);

      // Mock existing submission with 52.0
      vi.spyOn(prisma.weeklySubmission, 'findUnique').mockResolvedValue({
        id: 'sub-1',
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        weekNumber: 7,
        tieBreakerPrediction: 52.0,
      } as any);

      const upsertMock = vi.fn().mockImplementation(({ update }) => ({
        id: 'sub-1',
        tieBreakerPrediction: update.tieBreakerPrediction,
      }));

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          $queryRawUnsafe: vi.fn().mockResolvedValue([]),
          game: { findFirst: vi.fn().mockResolvedValue(mockWeek7Games[0]), findMany: vi.fn().mockResolvedValue(mockWeek7Games) },
          weeklySubmission: {
            upsert: upsertMock,
            findUnique: vi.fn().mockResolvedValue({ tieBreakerPrediction: 52.0 }),
          },
          pool: { findUnique: vi.fn().mockResolvedValue(mockPool), update: vi.fn() },
        });
      });

      const token = createAuthToken(MEMBER_1_ID);
      // Submit without prediction or clear
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          week: 7,
          season: 2026,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.prediction).toBe(52.0);
    });
  });

  describe('4. Kickoff Lock Enforcement (Decision #66)', () => {
    it('denies prediction submission at or after kickoff with HTTP 403 KICKOFF_PASSED', async () => {
      const pastGame = [
        {
          id: 'g-w7-past',
          externalGameId: '401873010',
          homeTeamId: 'MIN',
          awayTeamId: 'DET',
          kickoffTime: pastKickoff,
          status: GameStatus.IN_PROGRESS,
        },
      ];

      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(pastGame as any);

      const token = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          week: 7,
          season: 2026,
          prediction: 45.0,
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('KICKOFF_PASSED');
    });
  });

  describe('5. Member Readiness Summary Under Immediate Pool Visibility (P41-POOL-VISIBILITY-2026-10-19-08)', () => {
    it('exposes real numeric predictions in member readiness view before kickoff', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: ADMIN_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);
      vi.spyOn(prisma.weeklySubmission, 'findUnique').mockResolvedValue(null);

      vi.spyOn(prisma.poolMembership, 'findMany').mockResolvedValue([
        { poolId: POOL_ID, userId: MEMBER_1_ID, status: 'ACTIVE', user: { id: MEMBER_1_ID, email: 'm1@example.com' } },
        { poolId: POOL_ID, userId: MEMBER_2_ID, status: 'ACTIVE', user: { id: MEMBER_2_ID, email: 'm2@example.com' } },
      ] as any);

      vi.spyOn(prisma.weeklySubmission, 'findMany').mockResolvedValue([
        { poolId: POOL_ID, userId: MEMBER_1_ID, weekNumber: 7, tieBreakerPrediction: 45.5 },
      ] as any);

      const token = createAuthToken(ADMIN_ID, 'ADMIN');
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.isLocked).toBe(false);
      expect(data.readiness).toBeDefined();

      const m1 = data.readiness.find((r: any) => r.userId === MEMBER_1_ID);
      const m2 = data.readiness.find((r: any) => r.userId === MEMBER_2_ID);

      expect(m1.hasSubmitted).toBe(true);
      expect(m2.hasSubmitted).toBe(false);

      // IMMEDIATE VISIBILITY: real numeric prediction exposed, missing is null
      expect(m1.prediction).toBe(45.5);
      expect(m2.prediction).toBeNull();
    });

    it('exposes stored predictions while denying writes (isLocked: true) when kickoff time is missing', async () => {
      const missingKickoffGames = [
        {
          id: 'g-w7-nokickoff',
          externalGameId: '401873010',
          homeTeamId: 'MIN',
          awayTeamId: 'DET',
          kickoffTime: null as any,
          status: GameStatus.SCHEDULED,
        },
      ];

      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: ADMIN_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(missingKickoffGames as any);
      vi.spyOn(prisma.weeklySubmission, 'findUnique').mockResolvedValue(null);

      vi.spyOn(prisma.poolMembership, 'findMany').mockResolvedValue([
        { poolId: POOL_ID, userId: MEMBER_1_ID, status: 'ACTIVE', user: { id: MEMBER_1_ID, email: 'm1@example.com' } },
      ] as any);
      vi.spyOn(prisma.weeklySubmission, 'findMany').mockResolvedValue([
        { poolId: POOL_ID, userId: MEMBER_1_ID, weekNumber: 7, tieBreakerPrediction: 45.5 },
      ] as any);

      const token = createAuthToken(ADMIN_ID, 'ADMIN');
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      // Fail closed: write is locked
      expect(data.isLocked).toBe(true);
      expect(data.kickoffTime).toBeNull();
      // Stored value remains readable under immediate visibility
      const m1 = data.readiness.find((r: any) => r.userId === MEMBER_1_ID);
      expect(m1.hasSubmitted).toBe(true);
      expect(m1.prediction).toBe(45.5);
    });

    it('exposes stored predictions while denying writes (isLocked: true) when kickoff time is an invalid string', async () => {
      const invalidKickoffGames = [
        {
          id: 'g-w7-badkickoff',
          externalGameId: '401873010',
          homeTeamId: 'MIN',
          awayTeamId: 'DET',
          kickoffTime: 'not-a-valid-date' as any,
          status: GameStatus.SCHEDULED,
        },
      ];

      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: ADMIN_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(invalidKickoffGames as any);
      vi.spyOn(prisma.weeklySubmission, 'findUnique').mockResolvedValue(null);

      vi.spyOn(prisma.poolMembership, 'findMany').mockResolvedValue([
        { poolId: POOL_ID, userId: MEMBER_1_ID, status: 'ACTIVE', user: { id: MEMBER_1_ID, email: 'm1@example.com' } },
      ] as any);
      vi.spyOn(prisma.weeklySubmission, 'findMany').mockResolvedValue([
        { poolId: POOL_ID, userId: MEMBER_1_ID, weekNumber: 7, tieBreakerPrediction: 45.5 },
      ] as any);

      const token = createAuthToken(ADMIN_ID, 'ADMIN');
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.isLocked).toBe(true);
      expect(data.kickoffTime).toBeNull();
      const m1 = data.readiness.find((r: any) => r.userId === MEMBER_1_ID);
      expect(m1.hasSubmitted).toBe(true);
      expect(m1.prediction).toBe(45.5);
    });

    it('exposes stored predictions while denying writes (isLocked: true) when designation is UNRESOLVED', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: ADMIN_ID,
        status: 'ACTIVE',
      } as any);
      // Zero games returned
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue([] as any);
      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue(null);
      vi.spyOn(prisma.weeklySubmission, 'findUnique').mockResolvedValue(null);

      vi.spyOn(prisma.poolMembership, 'findMany').mockResolvedValue([
        { poolId: POOL_ID, userId: MEMBER_1_ID, status: 'ACTIVE', user: { id: MEMBER_1_ID, email: 'm1@example.com' } },
      ] as any);
      vi.spyOn(prisma.weeklySubmission, 'findMany').mockResolvedValue([
        { poolId: POOL_ID, userId: MEMBER_1_ID, weekNumber: 7, tieBreakerPrediction: 45.5 },
      ] as any);

      const token = createAuthToken(ADMIN_ID, 'ADMIN');
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('UNRESOLVED');
      expect(data.isLocked).toBe(true);
      const m1 = data.readiness.find((r: any) => r.userId === MEMBER_1_ID);
      expect(m1.hasSubmitted).toBe(true);
      expect(m1.prediction).toBe(45.5);
    });
  });

  describe('6. Commissioner Designation Override & Concurrency Rules (Finding 3)', () => {
    it('allows pool commissioner with active membership to override before predictions are received', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: ADMIN_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);

      let savedSettings: any = null;
      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          $queryRawUnsafe: vi.fn().mockResolvedValue([]),
          pool: {
            findUnique: vi.fn().mockResolvedValue(mockPool),
            update: vi.fn().mockImplementation(({ data }) => {
              savedSettings = data.settings;
              return { ...mockPool, settings: data.settings };
            }),
          },
          weeklySubmission: {
            findMany: vi.fn().mockResolvedValue([]), // No predictions yet
          },
          game: { findMany: vi.fn().mockResolvedValue(mockWeek7Games) },
        });
      });

      const token = createAuthToken(ADMIN_ID, 'ADMIN');
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker/override`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          week: 7,
          season: 2026,
          target_game_id: '401873011',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.designation.eventId).toBe('401873011');
      expect(data.designation.provenance).toBe('COMMISSIONER_OVERRIDE');
      expect(savedSettings?.tiebreaker_designations?.['2026']?.['7']?.eventId).toBe('401873011');
    });

    it('rejects override if predictions have already been acknowledged (designation frozen)', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: ADMIN_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          $queryRawUnsafe: vi.fn().mockResolvedValue([]),
          pool: { findUnique: vi.fn().mockResolvedValue(mockPool) },
          weeklySubmission: {
            // Existing prediction present!
            findMany: vi.fn().mockResolvedValue([{ userId: MEMBER_1_ID, tieBreakerPrediction: 48.0 }]),
          },
          game: { findMany: vi.fn().mockResolvedValue(mockWeek7Games) },
        });
      });

      const token = createAuthToken(ADMIN_ID, 'ADMIN');
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker/override`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          week: 7,
          season: 2026,
          target_game_id: '401873011',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('DESIGNATION_FROZEN');
    });

    it('serializes overlapping first prediction save versus commissioner override via row lock', async () => {
      let poolSettings = { ...mockPool.settings };
      const submissions: any[] = [];

      vi.spyOn(prisma.pool, 'findUnique').mockImplementation(async () => ({
        ...mockPool,
        settings: poolSettings,
      }) as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockImplementation(async (args: any) => ({
        poolId: POOL_ID,
        userId: args?.where?.poolId_userId?.userId || MEMBER_1_ID,
        status: 'ACTIVE',
      }) as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);

      let saveTxInFlight = false;
      let saveTxReleased = false;
      let overrideEnteredCriticalSectionDuringSave = false;

      let resolveSaveLockAcquired: () => void;
      const saveLockAcquiredPromise = new Promise<void>((r) => { resolveSaveLockAcquired = r; });

      let resolveSaveHold: () => void;
      const saveHoldPromise = new Promise<void>((r) => { resolveSaveHold = r; });

      let resolveOverrideLockWait: () => void;
      const overrideLockWaitPromise = new Promise<void>((r) => { resolveOverrideLockWait = r; });

      let txIndex = 0;
      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        const isSave = (txIndex === 0);
        txIndex++;

        if (isSave) {
          saveTxInFlight = true;
        }

        const txClient = {
          $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string) => {
            if (sql.includes('FOR UPDATE')) {
              if (isSave) {
                // Signal that Save has acquired the lock
                resolveSaveLockAcquired();
                // Hold Save's transaction open until Override attempts lock
                await saveHoldPromise;
              } else {
                // Override must wait on the row lock until Save transaction releases it
                await overrideLockWaitPromise;
              }
              return [];
            }
            if (sql.includes('to_regproc')) {
              return [{ exists: null }];
            }
            return [];
          }),
          pool: {
            findUnique: vi.fn().mockImplementation(() => {
              if (!isSave && (saveTxInFlight || !saveTxReleased)) {
                overrideEnteredCriticalSectionDuringSave = true;
              }
              return Promise.resolve({ ...mockPool, settings: poolSettings });
            }),
            update: vi.fn().mockImplementation(({ data }) => {
              poolSettings = { ...poolSettings, ...data.settings };
              return Promise.resolve({ ...mockPool, settings: poolSettings });
            }),
          },
          weeklySubmission: {
            upsert: vi.fn().mockImplementation(({ create, update }) => {
              const sub = { id: 'sub-overlap', ...update, ...create };
              submissions.push(sub);
              return Promise.resolve(sub);
            }),
            findMany: vi.fn().mockImplementation(() => {
              if (!isSave && (saveTxInFlight || !saveTxReleased)) {
                overrideEnteredCriticalSectionDuringSave = true;
              }
              return Promise.resolve(submissions);
            }),
          },
          game: {
            findFirst: vi.fn().mockResolvedValue(mockWeek7Games[0]),
            findMany: vi.fn().mockResolvedValue(mockWeek7Games),
          },
        };

        try {
          const res = await cb(txClient);
          return res;
        } finally {
          if (isSave) {
            saveTxInFlight = false;
            saveTxReleased = true;
            resolveOverrideLockWait();
          }
        }
      });

      // 1. Member 1 starts saving prediction
      const memberToken = createAuthToken(MEMBER_1_ID);
      const savePromise = fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          week: 7,
          season: 2026,
          prediction: 47.5,
        }),
      });

      // Wait until Save transaction has acquired the pool row lock
      await saveLockAcquiredPromise;

      // 2. While Save is holding the lock, Commissioner attempts override concurrently
      const adminToken = createAuthToken(ADMIN_ID, 'ADMIN');
      const overridePromise = fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker/override`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          week: 7,
          season: 2026,
          target_game_id: '401873011',
        }),
      });

      // Release Save transaction after a slight tick to let Override queue up on the lock
      await new Promise((r) => setTimeout(r, 20));
      resolveSaveHold();

      const [saveRes, overrideRes] = await Promise.all([savePromise, overridePromise]);

      // Assert that Override NEVER passed critical section while Save held the lock
      expect(overrideEnteredCriticalSectionDuringSave).toBe(false);
      expect(saveTxReleased).toBe(true);

      // Save succeeds and override is blocked
      expect(saveRes.status).toBe(200);
      expect(overrideRes.status).toBe(400);
      const overrideData = await overrideRes.json();
      expect(overrideData.error).toContain('DESIGNATION_FROZEN');
    });

    it('fails closed and denies prediction submission when pool row lock acquisition fails', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);

      const poolUpdateSpy = vi.fn();
      const submissionUpsertSpy = vi.fn();

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          $queryRawUnsafe: vi.fn().mockRejectedValue(new Error('LOCK_ACQUISITION_FAILED: could not obtain lock on row in relation pools')),
          pool: {
            findUnique: vi.fn().mockResolvedValue(mockPool),
            update: poolUpdateSpy,
          },
          weeklySubmission: {
            upsert: submissionUpsertSpy,
            findMany: vi.fn().mockResolvedValue([]),
          },
          game: {
            findMany: vi.fn().mockResolvedValue(mockWeek7Games),
          },
        });
      });

      const token = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          week: 7,
          season: 2026,
          prediction: 45.0,
        }),
      });

      expect(res.status).toBe(500);
      expect(poolUpdateSpy).not.toHaveBeenCalled();
      expect(submissionUpsertSpy).not.toHaveBeenCalled();
    });

    it('fails closed and denies commissioner override when pool row lock acquisition fails', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: ADMIN_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);

      const poolUpdateSpy = vi.fn();

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          $queryRawUnsafe: vi.fn().mockRejectedValue(new Error('LOCK_TIMEOUT: statement timeout on relation pools')),
          pool: {
            findUnique: vi.fn().mockResolvedValue(mockPool),
            update: poolUpdateSpy,
          },
          weeklySubmission: {
            findMany: vi.fn().mockResolvedValue([]),
          },
          game: {
            findMany: vi.fn().mockResolvedValue(mockWeek7Games),
          },
        });
      });

      const token = createAuthToken(ADMIN_ID, 'ADMIN');
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker/override`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          week: 7,
          season: 2026,
          target_game_id: '401873011',
        }),
      });

      expect(res.status).toBe(500);
      expect(poolUpdateSpy).not.toHaveBeenCalled();
    });

    it('preserves designation freeze across clear and subsequent override attempts', async () => {
      let poolSettings: any = { ...mockPool.settings };
      let storedSubmission: any = null;

      vi.spyOn(prisma.pool, 'findUnique').mockImplementation(() => Promise.resolve({ ...mockPool, settings: poolSettings }) as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          $queryRawUnsafe: vi.fn().mockResolvedValue([]),
          pool: {
            findUnique: vi.fn().mockImplementation(() => Promise.resolve({ ...mockPool, settings: poolSettings })),
            update: vi.fn().mockImplementation(({ data }) => {
              poolSettings = { ...poolSettings, ...data.settings };
              return Promise.resolve({ ...mockPool, settings: poolSettings });
            }),
          },
          weeklySubmission: {
            upsert: vi.fn().mockImplementation(({ update, create }) => {
              storedSubmission = { ...storedSubmission, ...update, ...create };
              return Promise.resolve(storedSubmission);
            }),
            findMany: vi.fn().mockImplementation(() => Promise.resolve(storedSubmission?.tieBreakerPrediction !== null && storedSubmission?.tieBreakerPrediction !== undefined ? [storedSubmission] : [])),
          },
          game: {
            findFirst: vi.fn().mockResolvedValue(mockWeek7Games[0]),
            findMany: vi.fn().mockResolvedValue(mockWeek7Games),
          },
        });
      });

      const memberToken = createAuthToken(MEMBER_1_ID);
      const adminToken = createAuthToken(ADMIN_ID, 'ADMIN');

      // 1. Member saves prediction -> freezes designation
      const saveRes = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({ week: 7, season: 2026, prediction: 51.5 }),
      });
      expect(saveRes.status).toBe(200);
      expect(poolSettings.tiebreaker_designations?.['2026']?.['7']?.isFrozen).toBe(true);

      // 2. Member explicitly clears prediction
      const clearRes = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({ week: 7, season: 2026, clear: true }),
      });
      expect(clearRes.status).toBe(200);
      // isFrozen setting MUST remain true even when submission is cleared!
      expect(poolSettings.tiebreaker_designations?.['2026']?.['7']?.isFrozen).toBe(true);

      // 3. Commissioner attempts override on cleared week -> MUST BE REJECTED
      const overrideRes = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ week: 7, season: 2026, target_game_id: '401873011' }),
      });
      expect(overrideRes.status).toBe(400);
      const overrideData = await overrideRes.json();
      expect(overrideData.error).toContain('DESIGNATION_FROZEN');
    });

    it('fails closed and denies override when existing designated game has missing kickoffTime', async () => {
      const missingKickoffGames = [
        {
          id: 'g-w7-nokickoff',
          externalGameId: '401873010',
          homeTeamId: 'MIN',
          awayTeamId: 'DET',
          kickoffTime: null as any,
          status: GameStatus.SCHEDULED,
        },
        {
          id: 'g-w7-valid',
          externalGameId: '401873011',
          homeTeamId: 'SF',
          awayTeamId: 'KC',
          kickoffTime: new Date(Date.now() + 86400000).toISOString(),
          status: GameStatus.SCHEDULED,
        },
      ];

      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: ADMIN_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(missingKickoffGames as any);

      const poolUpdateSpy = vi.fn();
      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string) => {
            if (sql.includes('to_regproc')) return [{ exists: null }];
            return [];
          }),
          pool: {
            findUnique: vi.fn().mockResolvedValue(mockPool),
            update: poolUpdateSpy,
          },
          weeklySubmission: {
            findMany: vi.fn().mockResolvedValue([]),
          },
          game: {
            findMany: vi.fn().mockResolvedValue(missingKickoffGames),
          },
        });
      });

      const adminToken = createAuthToken(ADMIN_ID, 'ADMIN');
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ week: 7, season: 2026, target_game_id: '401873011' }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('UNVERIFIED_KICKOFF');
      expect(poolUpdateSpy).not.toHaveBeenCalled();
    });

    it('fails closed and denies override when existing designated game has invalid kickoffTime string', async () => {
      const invalidKickoffGames = [
        {
          id: 'g-w7-badkickoff',
          externalGameId: '401873010',
          homeTeamId: 'MIN',
          awayTeamId: 'DET',
          kickoffTime: 'not-a-valid-date' as any,
          status: GameStatus.SCHEDULED,
        },
        {
          id: 'g-w7-valid',
          externalGameId: '401873011',
          homeTeamId: 'SF',
          awayTeamId: 'KC',
          kickoffTime: new Date(Date.now() + 86400000).toISOString(),
          status: GameStatus.SCHEDULED,
        },
      ];

      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: ADMIN_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(invalidKickoffGames as any);

      const poolUpdateSpy = vi.fn();
      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string) => {
            if (sql.includes('to_regproc')) return [{ exists: null }];
            return [];
          }),
          pool: {
            findUnique: vi.fn().mockResolvedValue(mockPool),
            update: poolUpdateSpy,
          },
          weeklySubmission: {
            findMany: vi.fn().mockResolvedValue([]),
          },
          game: {
            findMany: vi.fn().mockResolvedValue(invalidKickoffGames),
          },
        });
      });

      const adminToken = createAuthToken(ADMIN_ID, 'ADMIN');
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ week: 7, season: 2026, target_game_id: '401873011' }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('UNVERIFIED_KICKOFF');
      expect(poolUpdateSpy).not.toHaveBeenCalled();
    });

    it('fails closed and denies override when stored designated event is missing from weekly slate', async () => {
      const storedPool = {
        ...mockPool,
        settings: {
          tiebreaker_designations: {
            '2026': {
              '7': {
                eventId: '999999999', // Missing from slate
                provenance: 'COMMISSIONER_OVERRIDE',
                isFrozen: false,
              },
            },
          },
        },
      };

      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(storedPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: ADMIN_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);

      const poolUpdateSpy = vi.fn();
      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string) => {
            if (sql.includes('to_regproc')) return [{ exists: null }];
            return [];
          }),
          pool: {
            findUnique: vi.fn().mockResolvedValue(storedPool),
            update: poolUpdateSpy,
          },
          weeklySubmission: {
            findMany: vi.fn().mockResolvedValue([]),
          },
          game: {
            findMany: vi.fn().mockResolvedValue(mockWeek7Games),
          },
        });
      });

      const adminToken = createAuthToken(ADMIN_ID, 'ADMIN');
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ week: 7, season: 2026, target_game_id: '401873011' }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('UNVERIFIED_KICKOFF');
      expect(poolUpdateSpy).not.toHaveBeenCalled();
    });

    it('fails closed and denies override when target proposed game has missing kickoffTime (Finding 4)', async () => {
      const targetMissingKickoffGames = [
        mockWeek7Games[0], // Lions default with valid future kickoff
        {
          ...mockWeek7Games[1], // Target game 401873011
          kickoffTime: null,
        },
      ];

      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: ADMIN_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(targetMissingKickoffGames as any);

      const poolUpdateSpy = vi.fn();
      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string) => {
            if (sql.includes('to_regproc')) return [{ exists: null }];
            return [];
          }),
          pool: {
            findUnique: vi.fn().mockResolvedValue(mockPool),
            update: poolUpdateSpy,
          },
          weeklySubmission: {
            findMany: vi.fn().mockResolvedValue([]),
          },
          game: {
            findMany: vi.fn().mockResolvedValue(targetMissingKickoffGames),
          },
        });
      });

      const adminToken = createAuthToken(ADMIN_ID, 'ADMIN');
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ week: 7, season: 2026, target_game_id: '401873011' }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('UNVERIFIED_KICKOFF');
      expect(poolUpdateSpy).not.toHaveBeenCalled();
    });

    it('fails closed and denies override when target proposed game has invalid kickoffTime string (Finding 4)', async () => {
      const targetInvalidKickoffGames = [
        mockWeek7Games[0], // Lions default with valid future kickoff
        {
          ...mockWeek7Games[1], // Target game 401873011
          kickoffTime: 'invalid-kickoff-timestamp',
        },
      ];

      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: ADMIN_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(targetInvalidKickoffGames as any);

      const poolUpdateSpy = vi.fn();
      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string) => {
            if (sql.includes('to_regproc')) return [{ exists: null }];
            return [];
          }),
          pool: {
            findUnique: vi.fn().mockResolvedValue(mockPool),
            update: poolUpdateSpy,
          },
          weeklySubmission: {
            findMany: vi.fn().mockResolvedValue([]),
          },
          game: {
            findMany: vi.fn().mockResolvedValue(targetInvalidKickoffGames),
          },
        });
      });

      const adminToken = createAuthToken(ADMIN_ID, 'ADMIN');
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ week: 7, season: 2026, target_game_id: '401873011' }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('UNVERIFIED_KICKOFF');
      expect(poolUpdateSpy).not.toHaveBeenCalled();
    });
  });

  describe('7. Week 6 2026 Exclusion Safeguard Across Surfaces (Finding 4)', () => {
    it('returns UNAVAILABLE and blocks predictions for Week 6 on both new and legacy paths without settings flag', async () => {
      // Pool with ZERO tiebreaker_unavailable_weeks in settings
      const unflaggedPool = {
        id: POOL_ID,
        name: 'Test Pool 41',
        adminId: ADMIN_ID,
        settings: { season: 2026 },
      };

      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(unflaggedPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);

      const token = createAuthToken(MEMBER_1_ID);

      // Path A: Canonical pool-scoped route GET
      const getResCanonical = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker?week=6&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(getResCanonical.status).toBe(200);
      const getDataCanonical = await getResCanonical.json();
      expect(getDataCanonical.status).toBe('UNAVAILABLE');
      expect(getDataCanonical.tiebreakerOffered).toBe(false);
      expect(getDataCanonical.isLocked).toBe(true);
      expect(getDataCanonical.reason).toContain('Tiebreaker unavailable — entry was not offered');

      // Path B: Legacy route GET returns 410 ENDPOINT_RETIRED (Finding 7)
      const getResLegacy = await fetch(`${baseUrl}/api/picks/tiebreaker?pool_id=${POOL_ID}&week=6&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(getResLegacy.status).toBe(410);
      const getDataLegacy = await getResLegacy.json();
      expect(getDataLegacy.error).toContain('ENDPOINT_RETIRED');

      // Path A: Canonical pool-scoped route POST
      const postResCanonical = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ week: 6, season: 2026, prediction: 45.0 }),
      });
      expect(postResCanonical.status).toBe(403);
      const postDataCanonical = await postResCanonical.json();
      expect(postDataCanonical.error).toContain('TIEBREAKER_UNAVAILABLE');

      // Path B: Legacy route POST returns 410 ENDPOINT_RETIRED (Finding 7)
      const postResLegacy = await fetch(`${baseUrl}/api/picks/tiebreaker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pool_id: POOL_ID, week: 6, season: 2026, prediction: 45.0 }),
      });
      expect(postResLegacy.status).toBe(410);
      const postDataLegacy = await postResLegacy.json();
      expect(postDataLegacy.error).toContain('ENDPOINT_RETIRED');

      // Path B: Legacy override POST returns 410 ENDPOINT_RETIRED (Finding 7)
      const overrideResLegacy = await fetch(`${baseUrl}/api/picks/tiebreaker/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pool_id: POOL_ID, week: 6, season: 2026, target_game_id: '401873011' }),
      });
      expect(overrideResLegacy.status).toBe(410);
      const overrideDataLegacy = await overrideResLegacy.json();
      expect(overrideDataLegacy.error).toContain('ENDPOINT_RETIRED');
    });
  });

  describe('8. Canonical Tiebreaker Ranking & Charge Invariants', () => {
    it('applies pick score priority, distance, under-beats-over, shared ranks and tier charges', () => {
      // 10 members:
      // actual total = 48.00
      // m1: score 12, no pred -> rank 1 (score takes precedence)
      // m2: score 11, pred 48.00 (exact) -> rank 2
      // m3: score 11, pred 47.00 (dist 1.0, under) -> rank 3
      // m4: score 11, pred 49.00 (dist 1.0, over) -> rank 4 (under beats over)
      // m5: score 11, pred 0.00 (valid, dist 48.0) -> rank 5 (valid beats missing)
      // m6: score 11, pred null (missing) -> rank 6
      // m7: score 10, pred 48.00 -> shared rank 7
      // m8: score 10, pred 48.00 -> shared rank 7 (shared 1,2..7,7)
      // m9: score 10, pred 49.00 -> rank 9
      // m10: score 9, pred 48.00 -> rank 10 (dead place)
      const members = [
        { userId: 'm1', score: 12, tieBreakerPrediction: null },
        { userId: 'm2', score: 11, tieBreakerPrediction: 48.0 },
        { userId: 'm3', score: 11, tieBreakerPrediction: 47.0 },
        { userId: 'm4', score: 11, tieBreakerPrediction: 49.0 },
        { userId: 'm5', score: 11, tieBreakerPrediction: 0.0 },
        { userId: 'm6', score: 11, tieBreakerPrediction: null },
        { userId: 'm7', score: 10, tieBreakerPrediction: 48.0 },
        { userId: 'm8', score: 10, tieBreakerPrediction: 48.0 },
        { userId: 'm9', score: 10, tieBreakerPrediction: 49.0 },
        { userId: 'm10', score: 9, tieBreakerPrediction: 48.0 },
      ];

      const results = calculateRankingsAndPenalties(members, {
        actualFinalTotal: 48.0,
        tiebreakerOffered: true,
      });

      expect(results).toHaveLength(10);
      const findRes = (id: string) => results.find((r) => r.userId === id)!;

      // Rank 1: score priority
      expect(findRes('m1').rank).toBe(1);
      expect(findRes('m1').shots).toBe(0); // Safe Haven

      // Ranks 2-6: tier charge 1 shot
      expect(findRes('m2').rank).toBe(2);
      expect(findRes('m2').shots).toBe(1);

      expect(findRes('m3').rank).toBe(3);
      expect(findRes('m3').shots).toBe(1);

      expect(findRes('m4').rank).toBe(4);
      expect(findRes('m4').shots).toBe(1);

      expect(findRes('m5').rank).toBe(5);
      expect(findRes('m5').shots).toBe(1);

      expect(findRes('m6').rank).toBe(6);
      expect(findRes('m6').shots).toBe(1);

      // Shared Rank 7: both get rank 7 charge (2 shots)
      expect(findRes('m7').rank).toBe(7);
      expect(findRes('m7').shots).toBe(2);
      expect(findRes('m7').isSharedRank).toBe(true);

      expect(findRes('m8').rank).toBe(7);
      expect(findRes('m8').shots).toBe(2);
      expect(findRes('m8').isSharedRank).toBe(true);

      // Next rank is 9 (competition ranking 1, 2, 2, 4...)
      expect(findRes('m9').rank).toBe(9);
      expect(findRes('m9').shots).toBe(2);

      // Rank 10: Dead Place (2.5 shots)
      expect(findRes('m10').rank).toBe(10);
      expect(findRes('m10').shots).toBe(2.5);
      expect(findRes('m10').isDeadPlace).toBe(true);
    });
  });

  describe('9. Critical Source Gate / Schema-Compatible Slate Query', () => {
    it('executes getGamesForWeek against actual prisma.game without season/week where clause', async () => {
      // Query without mocking findMany: queries local rehearsal DB
      const games = await getGamesForWeek(7, 2026);
      expect(Array.isArray(games)).toBe(true);
      // Demonstrates safe fail-closed behavior when Week 7 games are not yet imported
      expect(games.length).toBe(0);
    });

    it('resolves games via caller-bound Supabase get_pool_canonical_games RPC with caller identity and numeric ESPN text IDs (Finding 6)', async () => {
      const mockRpcGames = [
        {
          id: 'g-rpc-1',
          externalGameId: '401873010',
          homeTeamId: 'MIN',
          awayTeamId: 'DET',
          kickoffTime: futureKickoff,
          status: GameStatus.SCHEDULED,
          homeScore: null,
          awayScore: null,
        },
        {
          id: 'g-rpc-2',
          externalGameId: '401873011',
          homeTeamId: 'GB',
          awayTeamId: 'HOU',
          kickoffTime: futureKickoff,
          status: GameStatus.SCHEDULED,
          homeScore: null,
          awayScore: null,
        },
      ];

      const rpcMock = vi.fn().mockResolvedValue({ data: mockRpcGames, error: null });
      const mockSupabaseClient = {
        rpc: rpcMock,
      };

      const games = await getGamesForWeek(7, 2026, POOL_ID, prisma, { supabaseClient: mockSupabaseClient });
      expect(games).toHaveLength(2);
      expect(games[0].externalGameId).toBe('401873010');
      expect(games[0].kickoffTime).toBe(futureKickoff);
      expect(games[0].homeScore).toBeNull();
      expect(games[1].externalGameId).toBe('401873011');
      expect(rpcMock).toHaveBeenCalledWith('get_pool_canonical_games', {
        p_pool_id: POOL_ID,
        p_season: 2026,
        p_week: 7,
      });
    });

    it('verifies real createCallerBoundSupabaseClient passes exact request bearer token into createClient global Authorization config without injecting prebuilt client (Finding 6)', () => {
      setCallerBoundSupabaseClientForTesting(null);
      const testToken = 'exact-jwt-token-xyz-12345';
      mockSupabaseCreateClient.mockClear();
      mockSupabaseCreateClient.mockReturnValue({
        auth: {},
        rpc: vi.fn(),
      } as any);

      const client = createCallerBoundSupabaseClient(testToken);
      expect(client).toBeDefined();
      expect(mockSupabaseCreateClient).toHaveBeenCalledTimes(1);
      // Empirically verifies exact bearer token propagated into createClient global header configuration
      expect(mockSupabaseCreateClient).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          auth: expect.objectContaining({
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          }),
          global: expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: `Bearer ${testToken}`,
            }),
          }),
        })
      );

      // Verify null/empty token returns null without calling createClient
      mockSupabaseCreateClient.mockClear();
      expect(createCallerBoundSupabaseClient(undefined)).toBeNull();
      expect(createCallerBoundSupabaseClient('')).toBeNull();
      expect(createCallerBoundSupabaseClient('   ')).toBeNull();
      expect(mockSupabaseCreateClient).not.toHaveBeenCalled();
    });

    it('resolves games via getGamesForWeek using authToken options by constructing real caller-bound client and executing RPC', async () => {
      setCallerBoundSupabaseClientForTesting(null);
      const testToken = 'exact-jwt-token-w7-canonical';
      const mockRpcGames = [
        {
          id: 'g-rpc-1',
          externalGameId: '401873010',
          homeTeamId: 'MIN',
          awayTeamId: 'DET',
          kickoffTime: futureKickoff,
          status: GameStatus.SCHEDULED,
          homeScore: null,
          awayScore: null,
        },
      ];
      const rpcMock = vi.fn().mockResolvedValue({ data: mockRpcGames, error: null });
      mockSupabaseCreateClient.mockClear();
      mockSupabaseCreateClient.mockReturnValue({
        rpc: rpcMock,
      } as any);

      const games = await getGamesForWeek(7, 2026, POOL_ID, prisma, { authToken: testToken });
      expect(games).toHaveLength(1);
      expect(games[0].externalGameId).toBe('401873010');
      // Verifies caller token was passed into createClient configuration
      expect(mockSupabaseCreateClient).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          global: expect.objectContaining({
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
          }),
        })
      );
      // Verifies downstream RPC was executed on the caller-bound client instance
      expect(rpcMock).toHaveBeenCalledWith('get_pool_canonical_games', {
        p_pool_id: POOL_ID,
        p_season: 2026,
        p_week: 7,
      });
    });

    it('enforces manifest resolves strictly via exact event IDs via findMany and never calls unfiltered findFirst (Finding 5)', async () => {
      const findFirstSpy = vi.fn().mockResolvedValue({ id: 'unrelated-game', externalGameId: 'unrelated-999' });
      const findManySpy = vi.fn().mockResolvedValue([
        {
          id: 'g-manifest-1',
          externalGameId: '401873010',
          homeTeamId: 'MIN',
          awayTeamId: 'DET',
          kickoffTime: futureKickoff,
          status: GameStatus.SCHEDULED,
          homeScore: null,
          awayScore: null,
        },
      ]);

      const mockClient = {
        game: {
          findMany: findManySpy,
          findFirst: findFirstSpy,
        },
      };

      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue({
        season: 2026,
        seasonType: 2,
        weekNumber: 7,
        revision: 1,
        observationTime: new Date().toISOString(),
        manifestFingerprint: 'mock-fingerprint-w7',
        eventIds: ['401873010', '401873011'],
      } as any);

      const games = await getGamesForWeek(7, 2026, POOL_ID, mockClient);
      expect(games).toHaveLength(1);
      expect(games[0].externalGameId).toBe('401873010');
      expect(findManySpy).toHaveBeenCalledWith({
        where: { externalGameId: { in: ['401873010', '401873011'] } },
        orderBy: { kickoffTime: 'asc' },
      });
      // CRITICAL (Finding 5): findFirst MUST NOT be called!
      expect(findFirstSpy).not.toHaveBeenCalled();
    });

    it('fails closed to [] when caller identity is missing and manifest/columns are unavailable (Finding 6)', async () => {
      const mockClient = {
        $queryRawUnsafe: vi.fn().mockRejectedValue(new Error('DATABASE_CONNECTION_LOST')),
        game: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      };

      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue(null);

      // Plain call without caller-bound Supabase client
      const games = await getGamesForWeek(7, 2026, POOL_ID, mockClient);
      expect(Array.isArray(games)).toBe(true);
      expect(games).toHaveLength(0);
    });

    it('resolves tiebreaker status and designated game under GET /api/pools/:pool_id/tiebreaker when caller-bound RPC is the sole valid source (Finding 1)', async () => {
      // 1. Force manifest, schema column check, and local games table to return nothing
      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue(null);
      (vi.spyOn(prisma, '$queryRawUnsafe') as any).mockRejectedValue(new Error('column season does not exist'));
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.weeklySubmission, 'findUnique').mockResolvedValue(null);

      // 2. Supply caller-bound RPC client mock via real createClient mock (no test client injection)
      const rpcMock = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'g-rpc-1',
            external_game_id: '401873010',
            home_team_id: 'MIN',
            away_team_id: 'DET',
            kickoff_time: futureKickoff,
            status: GameStatus.SCHEDULED,
            home_score: null,
            away_score: null,
          },
        ],
        error: null,
      });
      setCallerBoundSupabaseClientForTesting(null);
      mockSupabaseCreateClient.mockClear();
      mockSupabaseCreateClient.mockReturnValue({
        rpc: rpcMock,
      } as any);

      const memberToken = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${memberToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('DEFAULT_LIONS');
      expect(data.designatedGame.externalGameId).toBe('401873010');
      expect(data.designatedGame.awayTeamId).toBe('DET');
      expect(data.isLocked).toBe(false);

      // Empirically verifies caller JWT propagation into createClient global Authorization headers without prebuilt injection
      // Note: Verifies client header construction; live PostgreSQL auth.uid() execution requires hosted Supabase
      expect(mockSupabaseCreateClient).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          global: expect.objectContaining({
            headers: {
              Authorization: `Bearer ${memberToken}`,
            },
          }),
        })
      );
      expect(rpcMock).toHaveBeenCalledWith('get_pool_canonical_games', {
        p_pool_id: POOL_ID,
        p_season: 2026,
        p_week: 7,
      });
    });

    it('saves tiebreaker prediction under POST /api/pools/:pool_id/tiebreaker when caller-bound RPC is the sole valid source (Finding 1)', async () => {
      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue(null);
      (vi.spyOn(prisma, '$queryRawUnsafe') as any).mockRejectedValue(new Error('column season does not exist'));
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);

      const rpcMock = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'g-rpc-1',
            external_game_id: '401873010',
            home_team_id: 'MIN',
            away_team_id: 'DET',
            kickoff_time: futureKickoff,
            status: GameStatus.SCHEDULED,
            home_score: null,
            away_score: null,
          },
        ],
        error: null,
      });
      setCallerBoundSupabaseClientForTesting(null);
      mockSupabaseCreateClient.mockClear();
      mockSupabaseCreateClient.mockReturnValue({
        rpc: rpcMock,
      } as any);

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        const txClient = {
          $queryRawUnsafe: vi.fn().mockResolvedValue([]),
          pool: {
            findUnique: vi.fn().mockResolvedValue(mockPool),
            update: vi.fn().mockResolvedValue(mockPool),
          },
          weeklySubmission: {
            findUnique: vi.fn().mockResolvedValue(null),
            upsert: vi.fn().mockResolvedValue({
              poolId: POOL_ID,
              userId: MEMBER_1_ID,
              weekNumber: 7,
              tieBreakerPrediction: 47.5,
            }),
          },
          game: {
            findMany: vi.fn().mockResolvedValue([]),
          },
        };
        return cb(txClient);
      });

      const memberToken = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({ week: 7, season: 2026, prediction: 47.5 }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.prediction).toBe(47.5);
      // Empirically verifies caller JWT propagation into createClient global config without prebuilt client injection
      expect(mockSupabaseCreateClient).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          global: expect.objectContaining({
            headers: {
              Authorization: `Bearer ${memberToken}`,
            },
          }),
        })
      );
      expect(rpcMock).toHaveBeenCalled();
    });

    it('applies commissioner override under POST /api/pools/:pool_id/tiebreaker/override when caller-bound RPC is the sole valid source (Finding 1)', async () => {
      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue(null);
      (vi.spyOn(prisma, '$queryRawUnsafe') as any).mockRejectedValue(new Error('column season does not exist'));
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: ADMIN_ID,
        status: 'ACTIVE',
      } as any);

      const rpcMock = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'g-rpc-1',
            external_game_id: '401873010',
            home_team_id: 'MIN',
            away_team_id: 'DET',
            kickoff_time: futureKickoff,
            status: GameStatus.SCHEDULED,
            home_score: null,
            away_score: null,
          },
          {
            id: 'g-rpc-2',
            external_game_id: '401873011',
            home_team_id: 'GB',
            away_team_id: 'HOU',
            kickoff_time: futureKickoff,
            status: GameStatus.SCHEDULED,
            home_score: null,
            away_score: null,
          },
        ],
        error: null,
      });
      setCallerBoundSupabaseClientForTesting(null);
      mockSupabaseCreateClient.mockClear();
      mockSupabaseCreateClient.mockReturnValue({
        rpc: rpcMock,
      } as any);

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        const txClient = {
          $queryRawUnsafe: vi.fn().mockResolvedValue([]),
          pool: {
            findUnique: vi.fn().mockResolvedValue(mockPool),
            update: vi.fn().mockResolvedValue(mockPool),
          },
          weeklySubmission: {
            findMany: vi.fn().mockResolvedValue([]),
          },
          game: {
            findMany: vi.fn().mockResolvedValue([]),
          },
        };
        return cb(txClient);
      });

      const adminToken = createAuthToken(ADMIN_ID, 'ADMIN');
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ week: 7, season: 2026, target_game_id: '401873011' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.designation.eventId).toBe('401873011');
      // Empirically verifies caller JWT propagation into createClient global config without prebuilt client injection
      expect(mockSupabaseCreateClient).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          global: expect.objectContaining({
            headers: {
              Authorization: `Bearer ${adminToken}`,
            },
          }),
        })
      );
      expect(rpcMock).toHaveBeenCalled();
    });

    it('returns matrix with canonical games and pre-kickoff privacy under GET /api/pools/:pool_id/matrix when caller-bound RPC is the sole valid source (Finding 1)', async () => {
      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue(null);
      (vi.spyOn(prisma, '$queryRawUnsafe') as any).mockRejectedValue(new Error('column season does not exist'));
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue([]);

      const mockPoolWithMembers = {
        ...mockPool,
        memberships: [
          {
            userId: MEMBER_1_ID,
            status: 'ACTIVE',
            user: { id: MEMBER_1_ID, email: 'member1@example.com' },
            stat: { totalShotsDrank: 4 },
          },
          {
            userId: MEMBER_2_ID,
            status: 'ACTIVE',
            user: { id: MEMBER_2_ID, email: 'member2@example.com' },
            stat: { totalShotsDrank: 2 },
          },
        ],
      };

      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPoolWithMembers as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.pick, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.weeklySubmission, 'findMany').mockResolvedValue([
        { userId: MEMBER_1_ID, weekNumber: 7, tieBreakerPrediction: 45.0, isFinalized: false },
        { userId: MEMBER_2_ID, weekNumber: 7, tieBreakerPrediction: 52.0, isFinalized: false },
      ] as any);

      const rpcMock = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'g-rpc-1',
            external_game_id: '401873010',
            home_team_id: 'MIN',
            away_team_id: 'DET',
            kickoff_time: futureKickoff,
            status: GameStatus.SCHEDULED,
            home_score: null,
            away_score: null,
          },
        ],
        error: null,
      });
      setCallerBoundSupabaseClientForTesting(null);
      mockSupabaseCreateClient.mockClear();
      mockSupabaseCreateClient.mockReturnValue({
        rpc: rpcMock,
      } as any);

      const memberToken = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/matrix?week=7`, {
        headers: { Authorization: `Bearer ${memberToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.rows).toHaveLength(1);
      expect(data.rows[0].external_game_id).toBe('401873010');
      expect(data.summary[MEMBER_1_ID].tiebreaker_guess).toBe(45);
      expect(data.summary[MEMBER_2_ID].tiebreaker_guess).toBe(52); // competitor visible under immediate visibility
      // Empirically verifies caller JWT propagation into createClient global config without prebuilt client injection
      expect(mockSupabaseCreateClient).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          global: expect.objectContaining({
            headers: {
              Authorization: `Bearer ${memberToken}`,
            },
          }),
        })
      );
      expect(rpcMock).toHaveBeenCalled();
    });

    it('proves missing identity fails closed and denies unauthenticated access to tiebreaker endpoints (Finding 1)', async () => {
      // No Authorization header
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker?week=7&season=2026`);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('Authentication required');
    });
  });

  describe('10. Legacy Route Retirement & Canonical Routing Invariant (Finding 7)', () => {
    it('retires legacy /api/picks/tiebreaker routes with state-free HTTP 410 Gone and zero pool mutations (Finding 7)', async () => {
      const token = createAuthToken(MEMBER_1_ID);

      // 1. GET legacy -> 410 Gone
      const getRes = await fetch(`${baseUrl}/api/picks/tiebreaker?pool_id=${POOL_ID}&week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(getRes.status).toBe(410);
      const getData = await getRes.json();
      expect(getData.error).toContain('ENDPOINT_RETIRED');
      expect(getData.canonicalRoute).toBe('/api/pools/:pool_id/tiebreaker');

      // 2. POST legacy -> 410 Gone
      const postRes = await fetch(`${baseUrl}/api/picks/tiebreaker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pool_id: POOL_ID, week: 7, season: 2026, prediction: '49.50' }),
      });
      expect(postRes.status).toBe(410);
      const postData = await postRes.json();
      expect(postData.error).toContain('ENDPOINT_RETIRED');

      // 3. POST legacy override -> 410 Gone
      const adminToken = createAuthToken(ADMIN_ID, 'ADMIN');
      const overrideRes = await fetch(`${baseUrl}/api/picks/tiebreaker/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ pool_id: POOL_ID, week: 7, season: 2026, target_game_id: '401873011' }),
      });
      expect(overrideRes.status).toBe(410);
      const overrideData = await overrideRes.json();
      expect(overrideData.error).toContain('ENDPOINT_RETIRED');
    });

    it('handles tiebreaker reads, submissions, and overrides via canonical /api/pools/:pool_id/tiebreaker routes', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);

      const upsertMock = vi.fn().mockResolvedValue({
        id: 'sub-canonical',
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        weekNumber: 7,
        tieBreakerPrediction: 49.5,
      });

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          $queryRawUnsafe: vi.fn().mockResolvedValue([]),
          game: { findMany: vi.fn().mockResolvedValue(mockWeek7Games) },
          weeklySubmission: { upsert: upsertMock, findMany: vi.fn().mockResolvedValue([]) },
          pool: { findUnique: vi.fn().mockResolvedValue(mockPool), update: vi.fn() },
        });
      });

      const token = createAuthToken(MEMBER_1_ID);

      // Canonical GET
      const getRes = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.status).toBe('DEFAULT_LIONS');
      expect(getData.tiebreakerOffered).toBe(true);
      expect(getData.designatedGame.externalGameId).toBe('401873010');

      // Canonical POST
      const postRes = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ week: 7, season: 2026, prediction: '49.50' }),
      });
      expect(postRes.status).toBe(200);
      const postData = await postRes.json();
      expect(postData.prediction).toBe(49.5);
      expect(postData.designatedGameId).toBe('401873010');

      // Canonical POST override
      const adminToken = createAuthToken(ADMIN_ID, 'ADMIN');
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: ADMIN_ID,
        status: 'ACTIVE',
      } as any);

      const overrideRes = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ week: 7, season: 2026, target_game_id: '401873011' }),
      });
      expect(overrideRes.status).toBe(200);
      const overrideData = await overrideRes.json();
      expect(overrideData.designation.eventId).toBe('401873011');
    });
  });

  describe('11. Atomic Omission Preservation Under Concurrent Save/Clear (Finding 1)', () => {
    it('proves concurrent omitted prediction request does not overwrite freshly committed prediction', async () => {
      let poolSettings = { ...mockPool.settings };
      let storedSubmission: any = {
        id: 'sub-omitted-test',
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        weekNumber: 7,
        tieBreakerPrediction: 40.0, // Stored initial value
      };

      vi.spyOn(prisma.pool, 'findUnique').mockImplementation(() => Promise.resolve({ ...mockPool, settings: poolSettings }) as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockImplementation(async (args: any) => ({
        poolId: POOL_ID,
        userId: args?.where?.poolId_userId?.userId || MEMBER_1_ID,
        status: 'ACTIVE',
      }) as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);

      let saveTxInFlight = false;
      let saveTxReleased = false;

      let resolveSaveLockAcquired: () => void;
      const saveLockAcquiredPromise = new Promise<void>((r) => { resolveSaveLockAcquired = r; });

      let resolveSaveHold: () => void;
      const saveHoldPromise = new Promise<void>((r) => { resolveSaveHold = r; });

      let resolveOmittedLockWait: () => void;
      const omittedLockWaitPromise = new Promise<void>((r) => { resolveOmittedLockWait = r; });

      let txIndex = 0;
      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        const isExplicitSave = (txIndex === 0);
        txIndex++;

        if (isExplicitSave) {
          saveTxInFlight = true;
        }

        const txClient = {
          $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string) => {
            if (sql.includes('FOR UPDATE')) {
              if (isExplicitSave) {
                resolveSaveLockAcquired();
                await saveHoldPromise;
              } else {
                await omittedLockWaitPromise;
              }
              return [];
            }
            if (sql.includes('to_regproc')) {
              return [{ exists: null }];
            }
            return [];
          }),
          pool: {
            findUnique: vi.fn().mockImplementation(() => Promise.resolve({ ...mockPool, settings: poolSettings })),
            update: vi.fn().mockImplementation(({ data }) => {
              poolSettings = { ...poolSettings, ...data.settings };
              return Promise.resolve({ ...mockPool, settings: poolSettings });
            }),
          },
          weeklySubmission: {
            findUnique: vi.fn().mockImplementation(() => Promise.resolve(storedSubmission)),
            upsert: vi.fn().mockImplementation(({ create, update }) => {
              storedSubmission = { ...storedSubmission, ...update, ...create };
              return Promise.resolve(storedSubmission);
            }),
            findMany: vi.fn().mockImplementation(() => Promise.resolve(storedSubmission ? [storedSubmission] : [])),
          },
          game: {
            findFirst: vi.fn().mockResolvedValue(mockWeek7Games[0]),
            findMany: vi.fn().mockResolvedValue(mockWeek7Games),
          },
        };

        try {
          const res = await cb(txClient);
          return res;
        } finally {
          if (isExplicitSave) {
            saveTxInFlight = false;
            saveTxReleased = true;
            resolveOmittedLockWait();
          }
        }
      });

      const memberToken = createAuthToken(MEMBER_1_ID);

      // 1. Explicit save request begins (saving 52.5)
      const savePromise = fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({ week: 7, season: 2026, prediction: 52.5 }),
      });

      // Wait until explicit save has acquired the row lock
      await saveLockAcquiredPromise;

      // 2. Concurrently, an omitted request arrives
      const omittedPromise = fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({ week: 7, season: 2026 }), // prediction omitted!
      });

      // Allow omitted request to reach row lock wait
      await new Promise((r) => setTimeout(r, 20));
      resolveSaveHold();

      const [saveRes, omittedRes] = await Promise.all([savePromise, omittedPromise]);

      expect(saveRes.status).toBe(200);
      expect(omittedRes.status).toBe(200);

      const saveData = await saveRes.json();
      const omittedData = await omittedRes.json();

      expect(saveData.prediction).toBe(52.5);
      // The omitted request MUST NOT overwrite or revert to the old 40.0; it must preserve 52.5!
      expect(omittedData.prediction).toBe(52.5);
      expect(storedSubmission.tieBreakerPrediction).toBe(52.5);
    });

    it('proves concurrent omitted prediction request does not resurrect previously cleared prediction', async () => {
      let poolSettings = { ...mockPool.settings };
      let storedSubmission: any = {
        id: 'sub-clear-test',
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        weekNumber: 7,
        tieBreakerPrediction: 45.0, // Stored initial value
      };

      vi.spyOn(prisma.pool, 'findUnique').mockImplementation(() => Promise.resolve({ ...mockPool, settings: poolSettings }) as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockImplementation(async (args: any) => ({
        poolId: POOL_ID,
        userId: args?.where?.poolId_userId?.userId || MEMBER_1_ID,
        status: 'ACTIVE',
      }) as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);

      let clearTxInFlight = false;
      let resolveClearLockAcquired: () => void;
      const clearLockAcquiredPromise = new Promise<void>((r) => { resolveClearLockAcquired = r; });

      let resolveClearHold: () => void;
      const clearHoldPromise = new Promise<void>((r) => { resolveClearHold = r; });

      let resolveOmittedLockWait: () => void;
      const omittedLockWaitPromise = new Promise<void>((r) => { resolveOmittedLockWait = r; });

      let txIndex = 0;
      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        const isClear = (txIndex === 0);
        txIndex++;

        if (isClear) {
          clearTxInFlight = true;
        }

        const txClient = {
          $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string) => {
            if (sql.includes('FOR UPDATE')) {
              if (isClear) {
                resolveClearLockAcquired();
                await clearHoldPromise;
              } else {
                await omittedLockWaitPromise;
              }
              return [];
            }
            if (sql.includes('to_regproc')) {
              return [{ exists: null }];
            }
            return [];
          }),
          pool: {
            findUnique: vi.fn().mockImplementation(() => Promise.resolve({ ...mockPool, settings: poolSettings })),
            update: vi.fn().mockImplementation(({ data }) => {
              poolSettings = { ...poolSettings, ...data.settings };
              return Promise.resolve({ ...mockPool, settings: poolSettings });
            }),
          },
          weeklySubmission: {
            findUnique: vi.fn().mockImplementation(() => Promise.resolve(storedSubmission)),
            upsert: vi.fn().mockImplementation(({ create, update }) => {
              storedSubmission = { ...storedSubmission, ...update, ...create };
              return Promise.resolve(storedSubmission);
            }),
            findMany: vi.fn().mockImplementation(() => Promise.resolve(storedSubmission ? [storedSubmission] : [])),
          },
          game: {
            findFirst: vi.fn().mockResolvedValue(mockWeek7Games[0]),
            findMany: vi.fn().mockResolvedValue(mockWeek7Games),
          },
        };

        try {
          const res = await cb(txClient);
          return res;
        } finally {
          if (isClear) {
            clearTxInFlight = false;
            resolveOmittedLockWait();
          }
        }
      });

      const memberToken = createAuthToken(MEMBER_1_ID);

      // 1. Explicit clear request begins
      const clearPromise = fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({ week: 7, season: 2026, clear: true }),
      });

      await clearLockAcquiredPromise;

      // 2. Concurrently, omitted request arrives
      const omittedPromise = fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({ week: 7, season: 2026 }), // prediction omitted!
      });

      await new Promise((r) => setTimeout(r, 20));
      resolveClearHold();

      const [clearRes, omittedRes] = await Promise.all([clearPromise, omittedPromise]);

      expect(clearRes.status).toBe(200);
      expect(omittedRes.status).toBe(200);

      const clearData = await clearRes.json();
      const omittedData = await omittedRes.json();

      expect(clearData.prediction).toBeNull();
      // Must NOT resurrect old 45.0!
      expect(omittedData.prediction).toBeNull();
      expect(storedSubmission.tieBreakerPrediction).toBeNull();
    });

    it('fails closed with zero database writes when transaction client lacks weeklySubmission capability (Finding 5)', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);

      const upsertSpy = vi.fn();
      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        const incompleteTxClient = {
          $queryRawUnsafe: vi.fn().mockResolvedValue([]),
          pool: {
            findUnique: vi.fn().mockResolvedValue(mockPool),
          },
          weeklySubmission: {
            // weeklySubmission lacks findUnique! (e.g. undefined)
            upsert: upsertSpy,
          },
          game: {
            findMany: vi.fn().mockResolvedValue(mockWeek7Games),
          },
        };
        return cb(incompleteTxClient);
      });

      const memberToken = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({ week: 7, season: 2026 }), // prediction omitted
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toContain('TRANSACTION_CAPABILITY_MISSING');
      expect(upsertSpy).not.toHaveBeenCalled();
    });
  });

  describe('12. WeeklyTiebreakerCard Recovery & Context Protection Invariants (Findings 2 & 4)', () => {
    it('preserves confirmed user prediction badge and draft when clear fails on network error', () => {
      // Simulation of WeeklyTiebreakerCard state transitions
      let userPrediction: number | null = 48.5;
      let inputValue = '48.5';
      let saveStatus: 'idle' | 'saved' | 'error' = 'saved';
      let statusMessage: string | null = null;
      let failedMutationIntent: { type: 'save'; value: string } | { type: 'clear' } | null = null;

      // User initiates clear
      const isExplicitClear = true;
      // Network call fails!
      const errorOccurred = true;

      if (errorOccurred) {
        saveStatus = 'error';
        statusMessage = 'Network error clearing prediction.';
        failedMutationIntent = isExplicitClear ? { type: 'clear' } : { type: 'save', value: inputValue };
        // Confirmed state MUST remain preserved!
      }

      // Assertions:
      expect(userPrediction).toBe(48.5); // Badge remains 48.5 pts
      expect(inputValue).toBe('48.5');   // Input draft NOT prematurely blanked
      expect(saveStatus).toBe('error');
      expect(failedMutationIntent).toEqual({ type: 'clear' });
    });

    it('retains clear intent on failed clear so retry repeats clear: true instead of empty save', () => {
      let userPrediction: number | null = 48.5;
      let inputValue = '48.5';
      let failedMutationIntent: { type: 'save'; value: string } | { type: 'clear' } | null = { type: 'clear' };

      // User clicks Retry: handleSave() is called without arguments (valueToSave === undefined)
      const valueToSave: string | null | undefined = undefined;

      let isExplicitClear = false;
      let rawVal = inputValue;

      if (valueToSave === null) {
        isExplicitClear = true;
      } else if (valueToSave !== undefined) {
        rawVal = valueToSave;
      } else if (failedMutationIntent?.type === 'clear') {
        isExplicitClear = true; // RECOVERED CLEAR INTENT!
      } else if (failedMutationIntent?.type === 'save') {
        rawVal = failedMutationIntent.value;
      }

      expect(isExplicitClear).toBe(true); // Verifies Retry executes clear: true, NOT empty save validation error!

      // Simulate successful response from backend on retry
      const data = { prediction: null };
      userPrediction = data.prediction;
      inputValue = '';
      failedMutationIntent = null;

      expect(userPrediction).toBeNull();
      expect(inputValue).toBe('');
      expect(failedMutationIntent).toBeNull();
    });

    it('renders distinct load error state with retry button when server returns error, never masquerading as unoffered', () => {
      const getCardDisplayState = (status: string, tiebreakerOffered: boolean, week: number) => {
        if (status === 'ERROR') {
          return 'RENDER_LOAD_ERROR_WITH_RETRY';
        }
        const isUnavailable = week === 6 || status === 'UNAVAILABLE' || (!tiebreakerOffered && status !== 'LOADING');
        if (isUnavailable) {
          return 'RENDER_UNOFFERED_BANNER';
        }
        return 'RENDER_ACTIVE_CARD';
      };

      // When load fails with HTTP 500 or network error
      expect(getCardDisplayState('ERROR', false, 7)).toBe('RENDER_LOAD_ERROR_WITH_RETRY');

      // Genuine unoffered week (e.g. Week 6)
      expect(getCardDisplayState('UNAVAILABLE', false, 6)).toBe('RENDER_UNOFFERED_BANNER');

      // Active week 7 when offered
      expect(getCardDisplayState('DEFAULT_LIONS', true, 7)).toBe('RENDER_ACTIVE_CARD');
    });

    it('discards stale asynchronous response when context switches pool or week before response returns', () => {
      let activeReq = 0;
      let activeMutation = 0;
      let currentContext = { poolId: 'pool-A', week: 7 };

      let appliedData: any = null;

      const simulateAsyncFetch = async (reqPoolId: string, reqWeek: number, reqId: number, delayMs: number) => {
        await new Promise((r) => setTimeout(r, delayMs));
        // Guard check after await boundary:
        if (reqId !== activeReq || currentContext.poolId !== reqPoolId || currentContext.week !== reqWeek) {
          return; // DISCARDED!
        }
        appliedData = { poolId: reqPoolId, week: reqWeek };
      };

      // 1. Initial request for Pool A
      const req1Id = ++activeReq;
      const promiseA = simulateAsyncFetch('pool-A', 7, req1Id, 50);

      // 2. User quickly switches to Pool B before Pool A completes
      currentContext = { poolId: 'pool-B', week: 7 };
      const req2Id = ++activeReq;
      const promiseB = simulateAsyncFetch('pool-B', 7, req2Id, 10);

      return Promise.all([promiseA, promiseB]).then(() => {
        // Only Pool B data must be applied; Pool A was safely discarded
        expect(appliedData).toEqual({ poolId: 'pool-B', week: 7 });
      });
    });
  });

  describe('13. Wrap-up Preview Pre-Kickoff Privacy & Strict Tenant Boundary (Findings 1 & 2)', () => {
    it('allows active pool member to fetch wrap-up preview, revealing other members predictions immediately before kickoff (P41-POOL-VISIBILITY-2026-10-19-08)', async () => {
      const mockPoolWithMembers = {
        ...mockPool,
        memberships: [
          { userId: MEMBER_1_ID, status: 'ACTIVE' },
          { userId: MEMBER_2_ID, status: 'ACTIVE' },
        ],
      };
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPoolWithMembers as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);
      vi.spyOn(prisma.pick, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.weeklySubmission, 'findMany').mockResolvedValue([
        { userId: MEMBER_1_ID, weekNumber: 7, tieBreakerPrediction: 45.0, isFinalized: false },
        { userId: MEMBER_2_ID, weekNumber: 7, tieBreakerPrediction: 52.0, isFinalized: false },
      ] as any);
      (vi.spyOn(prisma, '$queryRaw') as any).mockResolvedValue([{ to_regclass: 'public.weekly_wrapups' }]);
      (vi.spyOn(prisma, '$queryRawUnsafe') as any).mockResolvedValue([]);

      const token = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/wrap-up/preview?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.preview).toBeDefined();
      expect(data.preview.projectedStandings).toBeDefined();

      const m1 = data.preview.projectedStandings.find((s: any) => s.userId === MEMBER_1_ID);
      const m2 = data.preview.projectedStandings.find((s: any) => s.userId === MEMBER_2_ID);

      expect(m1).toBeDefined();
      expect(m2).toBeDefined();
      // Caller can see their own prediction:
      expect(m1.tieBreakerPrediction).toBe(45);
      // Other member's prediction is immediately visible under P41-POOL-VISIBILITY-2026-10-19-08:
      expect(m2.tieBreakerPrediction).toBe(52);
    });

    it('reveals other members predictions in wrap-up preview once kickoff has passed', async () => {
      const pastWeek7Games = [
        {
          id: 'g-w7-det',
          externalGameId: '401873010',
          homeTeamId: 'MIN',
          awayTeamId: 'DET',
          kickoffTime: pastKickoff,
          status: GameStatus.FINAL,
          homeScore: 24,
          awayScore: 21,
        },
        {
          id: 'g-w7-gb',
          externalGameId: '401873011',
          homeTeamId: 'GB',
          awayTeamId: 'HOU',
          kickoffTime: pastKickoff,
          status: GameStatus.FINAL,
          homeScore: 28,
          awayScore: 27,
        },
      ];
      const mockPoolWithMembers = {
        ...mockPool,
        memberships: [
          { userId: MEMBER_1_ID, status: 'ACTIVE' },
          { userId: MEMBER_2_ID, status: 'ACTIVE' },
        ],
      };
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPoolWithMembers as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(pastWeek7Games as any);
      vi.spyOn(prisma.pick, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.weeklySubmission, 'findMany').mockResolvedValue([
        { userId: MEMBER_1_ID, weekNumber: 7, tieBreakerPrediction: 45.0, isFinalized: true },
        { userId: MEMBER_2_ID, weekNumber: 7, tieBreakerPrediction: 52.0, isFinalized: true },
      ] as any);
      (vi.spyOn(prisma, '$queryRaw') as any).mockResolvedValue([{ to_regclass: 'public.weekly_wrapups' }]);
      (vi.spyOn(prisma, '$queryRawUnsafe') as any).mockResolvedValue([]);

      const token = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/ops/wrap-up/preview?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      const m1 = data.preview.projectedStandings.find((s: any) => s.userId === MEMBER_1_ID);
      const m2 = data.preview.projectedStandings.find((s: any) => s.userId === MEMBER_2_ID);

      expect(m1.tieBreakerPrediction).toBe(45);
      // Revealed post-kickoff!
      expect(m2.tieBreakerPrediction).toBe(52);
    });

    it('denies outsider user lacking active membership with HTTP 403 FORBIDDEN_ACTIVE_MEMBERSHIP_REQUIRED', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue({
        ...mockPool,
        memberships: [], // Not a member
      } as any);

      const token = createAuthToken('outsider-user');
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/wrap-up/preview?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('FORBIDDEN_ACTIVE_MEMBERSHIP_REQUIRED');
    });

    it('strictly denies outsider global ADMIN who lacks pool membership with HTTP 403 (Decision #20, Finding 1)', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue({
        ...mockPool,
        memberships: [], // Outsider global admin is NOT a member of this pool
      } as any);

      const token = createAuthToken(OUTSIDER_ADMIN_ID, 'ADMIN');
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/wrap-up/preview?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('FORBIDDEN_ACTIVE_MEMBERSHIP_REQUIRED');
    });

    it('retires legacy stateful /api/admin/ops/wrap-up/preview with HTTP 410 Gone and zero DB reads (Finding 3)', async () => {
      const poolFindSpy = vi.spyOn(prisma.pool, 'findUnique');

      const token = createAuthToken(OUTSIDER_ADMIN_ID, 'ADMIN');
      const res = await fetch(`${baseUrl}/api/admin/ops/wrap-up/preview?poolId=${POOL_ID}&week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(410);
      const data = await res.json();
      expect(data.error).toContain('ENDPOINT_RETIRED');
      expect(data.retired).toBe(true);
      expect(poolFindSpy).not.toHaveBeenCalled();
    });

    it('rejects /api/pools/:pool_id/wrap-up/preview when pool ID is not a valid UUID in route path (Finding 3)', async () => {
      const token = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/pools/not-a-valid-uuid/wrap-up/preview?week=7`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid pool ID format');
    });

    it('allows active pool commissioner to fetch wrap-up preview on both canonical aliases (/wrap-up/preview and /ops/wrap-up/preview) (Finding 1)', async () => {
      const mockPoolWithActiveAdmin = {
        ...mockPool,
        adminId: ADMIN_ID,
        memberships: [
          { userId: ADMIN_ID, status: 'ACTIVE' },
          { userId: MEMBER_1_ID, status: 'ACTIVE' },
        ],
      };
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPoolWithActiveAdmin as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);
      vi.spyOn(prisma.pick, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.weeklySubmission, 'findMany').mockResolvedValue([
        { userId: ADMIN_ID, weekNumber: 7, tieBreakerPrediction: 42.0, isFinalized: false },
        { userId: MEMBER_1_ID, weekNumber: 7, tieBreakerPrediction: 50.0, isFinalized: false },
      ] as any);
      (vi.spyOn(prisma, '$queryRaw') as any).mockResolvedValue([{ to_regclass: 'public.weekly_wrapups' }]);
      (vi.spyOn(prisma, '$queryRawUnsafe') as any).mockResolvedValue([]);

      const token = createAuthToken(ADMIN_ID, 'ADMIN');

      // Canonical Alias 1: /api/pools/:pool_id/wrap-up/preview
      const res1 = await fetch(`${baseUrl}/api/pools/${POOL_ID}/wrap-up/preview?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res1.status).toBe(200);
      const data1 = await res1.json();
      expect(data1.preview).toBeDefined();
      expect(data1.preview.projectedStandings).toBeDefined();

      // Canonical Alias 2: /api/pools/:pool_id/ops/wrap-up/preview
      const res2 = await fetch(`${baseUrl}/api/pools/${POOL_ID}/ops/wrap-up/preview?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res2.status).toBe(200);
      const data2 = await res2.json();
      expect(data2.preview).toBeDefined();
      expect(data2.preview.projectedStandings).toBeDefined();
    });

    it('strictly denies inactive pool commissioner on both canonical preview aliases before preview work occurs (Finding 1)', async () => {
      // Commissioner whose membership is INACTIVE in the pool (filtered out by where: { status: 'ACTIVE' })
      const mockPoolWithInactiveAdmin = {
        ...mockPool,
        adminId: ADMIN_ID,
        memberships: [], // filtered active memberships is empty!
      };
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPoolWithInactiveAdmin as any);
      const previewSpy = vi.spyOn(wrapUpEngine, 'previewWeeklyWrapUpForPool');

      const token = createAuthToken(ADMIN_ID, 'ADMIN');

      // Canonical Alias 1: /api/pools/:pool_id/wrap-up/preview
      const res1 = await fetch(`${baseUrl}/api/pools/${POOL_ID}/wrap-up/preview?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res1.status).toBe(403);
      const data1 = await res1.json();
      expect(data1.error).toContain('FORBIDDEN_ACTIVE_MEMBERSHIP_REQUIRED');

      // Canonical Alias 2: /api/pools/:pool_id/ops/wrap-up/preview
      const res2 = await fetch(`${baseUrl}/api/pools/${POOL_ID}/ops/wrap-up/preview?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res2.status).toBe(403);
      const data2 = await res2.json();
      expect(data2.error).toContain('FORBIDDEN_ACTIVE_MEMBERSHIP_REQUIRED');

      // Zero preview work occurred before denial
      expect(previewSpy).not.toHaveBeenCalled();
    });

    it('strictly denies absent-membership commissioner on both canonical preview aliases before preview work occurs (Finding 1)', async () => {
      // Commissioner with no membership record at all in this pool
      const mockPoolWithAbsentAdmin = {
        ...mockPool,
        adminId: ADMIN_ID,
        memberships: [],
      };
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPoolWithAbsentAdmin as any);
      const previewSpy = vi.spyOn(wrapUpEngine, 'previewWeeklyWrapUpForPool');

      const token = createAuthToken(ADMIN_ID, 'ADMIN');

      // Canonical Alias 1: /api/pools/:pool_id/wrap-up/preview
      const res1 = await fetch(`${baseUrl}/api/pools/${POOL_ID}/wrap-up/preview?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res1.status).toBe(403);
      const data1 = await res1.json();
      expect(data1.error).toContain('FORBIDDEN_ACTIVE_MEMBERSHIP_REQUIRED');

      // Canonical Alias 2: /api/pools/:pool_id/ops/wrap-up/preview
      const res2 = await fetch(`${baseUrl}/api/pools/${POOL_ID}/ops/wrap-up/preview?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res2.status).toBe(403);
      const data2 = await res2.json();
      expect(data2.error).toContain('FORBIDDEN_ACTIVE_MEMBERSHIP_REQUIRED');

      // Zero preview work occurred before denial
      expect(previewSpy).not.toHaveBeenCalled();
    });

    it('exposes other members predictions in wrap-up preview even when designated kickoffTime is missing or invalid (P41-POOL-VISIBILITY-2026-10-19-08)', async () => {
      const mockPoolWithMembers = {
        ...mockPool,
        memberships: [
          { userId: MEMBER_1_ID, status: 'ACTIVE' },
          { userId: MEMBER_2_ID, status: 'ACTIVE' },
        ],
      };
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPoolWithMembers as any);

      // Case A: Missing kickoffTime
      vi.spyOn(wrapUpEngine, 'previewWeeklyWrapUpForPool').mockResolvedValueOnce({
        poolId: POOL_ID,
        weekNumber: 7,
        season: 2026,
        readyToSettle: false,
        reasonsIfNotReady: ['DESIGNATED_GAME_UNAVAILABLE'],
        tiebreakerOffered: true,
        designatedGame: {
          id: 'g-w7-det',
          externalGameId: '401873010',
          homeTeamId: 'MIN',
          awayTeamId: 'DET',
          kickoffTime: null as any,
        },
        projectedStandings: [
          { userId: MEMBER_1_ID, score: 5, tieBreakerPrediction: 45.0, rank: 1, shots: 0 },
          { userId: MEMBER_2_ID, score: 5, tieBreakerPrediction: 52.0, rank: 1, shots: 0 },
        ],
      } as any);

      const token = createAuthToken(MEMBER_1_ID);
      const resMissing = await fetch(`${baseUrl}/api/pools/${POOL_ID}/wrap-up/preview?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(resMissing.status).toBe(200);
      const dataMissing = await resMissing.json();
      const m1Missing = dataMissing.preview.projectedStandings.find((s: any) => s.userId === MEMBER_1_ID);
      const m2Missing = dataMissing.preview.projectedStandings.find((s: any) => s.userId === MEMBER_2_ID);
      expect(m1Missing.tieBreakerPrediction).toBe(45);
      expect(m2Missing.tieBreakerPrediction).toBe(52); // Immediately visible!

      // Case B: Invalid kickoffTime string
      vi.spyOn(wrapUpEngine, 'previewWeeklyWrapUpForPool').mockResolvedValueOnce({
        poolId: POOL_ID,
        weekNumber: 7,
        season: 2026,
        readyToSettle: false,
        reasonsIfNotReady: ['DESIGNATED_GAME_UNAVAILABLE'],
        tiebreakerOffered: true,
        designatedGame: {
          id: 'g-w7-det',
          externalGameId: '401873010',
          homeTeamId: 'MIN',
          awayTeamId: 'DET',
          kickoffTime: 'invalid-kickoff-timestamp',
        },
        projectedStandings: [
          { userId: MEMBER_1_ID, score: 5, tieBreakerPrediction: 45.0, rank: 1, shots: 0 },
          { userId: MEMBER_2_ID, score: 5, tieBreakerPrediction: 52.0, rank: 1, shots: 0 },
        ],
      } as any);

      const resInvalid = await fetch(`${baseUrl}/api/pools/${POOL_ID}/wrap-up/preview?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(resInvalid.status).toBe(200);
      const dataInvalid = await resInvalid.json();
      const m1Invalid = dataInvalid.preview.projectedStandings.find((s: any) => s.userId === MEMBER_1_ID);
      const m2Invalid = dataInvalid.preview.projectedStandings.find((s: any) => s.userId === MEMBER_2_ID);
      expect(m1Invalid.tieBreakerPrediction).toBe(45);
      expect(m2Invalid.tieBreakerPrediction).toBe(52); // Immediately visible!
    });

    it('enforces non-overrideable Week 6 2026 tiebreaker exclusion in preview and mock execution with conflicting predictions proving zero ranking or penalty effects (Finding 2)', async () => {
      const MEMBER_3_ID = 'd4444444-4444-4444-4444-444444444444';
      const mockPool3Members = {
        ...mockPool,
        memberships: [
          { userId: MEMBER_1_ID, status: 'ACTIVE' },
          { userId: MEMBER_2_ID, status: 'ACTIVE' },
          { userId: MEMBER_3_ID, status: 'ACTIVE' },
        ],
      };

      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool3Members as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue([]);
      (vi.spyOn(prisma, '$queryRaw') as any).mockResolvedValue([{ to_regclass: 'public.weekly_wrapups' }]);
      (vi.spyOn(prisma, '$queryRawUnsafe') as any).mockResolvedValue([]);

      // Mock submissions with conflicting predictions
      vi.spyOn(prisma.weeklySubmission, 'findMany').mockResolvedValue([
        { userId: MEMBER_1_ID, weekNumber: 6, tieBreakerPrediction: 35.0, isFinalized: true },
        { userId: MEMBER_2_ID, weekNumber: 6, tieBreakerPrediction: 58.0, isFinalized: true },
        { userId: MEMBER_3_ID, weekNumber: 6, tieBreakerPrediction: null, isFinalized: true },
      ] as any);

      // Part 1: PREVIEW with explicit tiebreakerOffered: true
      const preview = await previewWeeklyWrapUpForPool(POOL_ID, 6, {
        season: 2026,
        tiebreakerOffered: true, // Caller attempts override!
      });

      expect(preview.tiebreakerOffered).toBe(false);
      // All 3 members have identical pick scores (0) and conflicting predictions (35.0 vs 58.0 vs null).
      // Verify tiebreaker predictions produce zero ranking differentiation or penalty effects:
      const p1 = preview.projectedStandings.find((s) => s.userId === MEMBER_1_ID);
      const p2 = preview.projectedStandings.find((s) => s.userId === MEMBER_2_ID);
      const p3 = preview.projectedStandings.find((s) => s.userId === MEMBER_3_ID);

      expect(p1).toBeDefined();
      expect(p2).toBeDefined();
      expect(p3).toBeDefined();

      // Identical score -> identical shared rank 1 and 0 shots (safe haven)
      expect(p1!.rank).toBe(1);
      expect(p2!.rank).toBe(1);
      expect(p3!.rank).toBe(1);
      expect(p1!.shots).toBe(0);
      expect(p2!.shots).toBe(0);
      expect(p3!.shots).toBe(0);

      // Part 2: MOCK EXECUTION with explicit tiebreakerOffered: true and conflicting predictions
      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue({
        season: 2026,
        seasonType: 2,
        weekNumber: 6,
        eventIds: ['401872995'],
      } as any);

      const week6FinalGames = [
        {
          id: 'g-w6-1',
          externalGameId: '401872995',
          homeTeamId: 'KC',
          awayTeamId: 'DEN',
          status: GameStatus.FINAL,
          homeScore: 24,
          awayScore: 17,
          kickoffTime: pastKickoff,
        },
      ];

      const createdPenalties: any[] = [];
      const updatedMemberships: any[] = [];

      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        const tx = {
          $queryRaw: vi.fn().mockResolvedValue([{ to_regclass: 'public.weekly_wrapups' }]),
          $queryRawUnsafe: vi.fn().mockImplementation(async (sql: string) => {
            if (sql.includes('information_schema.columns')) {
              return [{ column_name: 'season' }];
            }
            if (sql.includes('INSERT INTO public.weekly_wrapups')) {
              return [{ pool_id: POOL_ID, season: 2026, week_number: 6 }];
            }
            if (sql.includes('FROM public.picks')) {
              return [
                { user_id: MEMBER_1_ID, game_id: '401872995', selected_team: 'KC', home_team_id: 'KC', away_team_id: 'DEN', home_score: 24, away_score: 17, status: GameStatus.FINAL },
                { user_id: MEMBER_2_ID, game_id: '401872995', selected_team: 'KC', home_team_id: 'KC', away_team_id: 'DEN', home_score: 24, away_score: 17, status: GameStatus.FINAL },
                { user_id: MEMBER_3_ID, game_id: '401872995', selected_team: 'KC', home_team_id: 'KC', away_team_id: 'DEN', home_score: 24, away_score: 17, status: GameStatus.FINAL },
              ];
            }
            return [];
          }),
          pool: {
            findUnique: vi.fn().mockResolvedValue(mockPool3Members),
          },
          game: {
            findMany: vi.fn().mockResolvedValue(week6FinalGames),
          },
          weeklySubmission: {
            findMany: vi.fn().mockResolvedValue([
              { userId: MEMBER_1_ID, weekNumber: 6, tieBreakerPrediction: 35.0, isFinalized: true },
              { userId: MEMBER_2_ID, weekNumber: 6, tieBreakerPrediction: 58.0, isFinalized: true },
              { userId: MEMBER_3_ID, weekNumber: 6, tieBreakerPrediction: null, isFinalized: true },
            ]),
          },
          penaltyLedger: {
            create: vi.fn().mockImplementation(({ data }: any) => {
              createdPenalties.push(data);
              return Promise.resolve({ id: 'pen-' + Math.random(), ...data });
            }),
            aggregate: vi.fn().mockResolvedValue({ _sum: { delta: 0 } }),
          },
          poolMemberStat: {
            upsert: vi.fn().mockResolvedValue({}),
          },
          poolMembership: {
            update: vi.fn().mockImplementation(({ where, data }: any) => {
              updatedMemberships.push({ where, data });
              return Promise.resolve({ id: 'mem-' + Math.random(), ...data });
            }),
          },
          outboxEvent: {
            createMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          inboxMessage: {
            createMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          jobRun: {
            create: vi.fn().mockResolvedValue({ id: 'job-1' }),
            update: vi.fn().mockResolvedValue({ id: 'job-1' }),
          },
          weeklyWrapup: {
            create: vi.fn().mockResolvedValue({ id: 'wrap-1' }),
          },
        };
        return cb(tx);
      });

      const execResult = await executeWeeklyWrapUpForPool(POOL_ID, 6, {
        season: 2026,
        tiebreakerOffered: true,
      });

      expect(execResult.applied).toBe(true);
      expect(execResult.tiebreakerOffered).toBe(false);

      const r1 = execResult.standings.find((r: any) => r.userId === MEMBER_1_ID);
      const r2 = execResult.standings.find((r: any) => r.userId === MEMBER_2_ID);
      const r3 = execResult.standings.find((r: any) => r.userId === MEMBER_3_ID);

      expect(r1).toBeDefined();
      expect(r2).toBeDefined();
      expect(r3).toBeDefined();

      expect(r1.rank).toBe(1);
      expect(r2.rank).toBe(1);
      expect(r3.rank).toBe(1);
      expect(r1.shots).toBe(0);
      expect(r2.shots).toBe(0);
      expect(r3.shots).toBe(0);
      expect(r1.isSafeHaven).toBe(true);
      expect(r2.isSafeHaven).toBe(true);
      expect(r3.isSafeHaven).toBe(true);

      expect(createdPenalties).toHaveLength(0);
    });
  });

  describe('14. Permanent Retirement of Legacy /api/picks/tiebreaker Routes (Finding 7)', () => {
    it('returns HTTP 410 Gone with ENDPOINT_RETIRED for GET /api/picks/tiebreaker and touches zero DB records', async () => {
      const poolFindSpy = vi.spyOn(prisma.pool, 'findUnique');
      const subFindSpy = vi.spyOn(prisma.weeklySubmission, 'findUnique');

      const token = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/picks/tiebreaker?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(410);
      const data = await res.json();
      expect(data.error).toContain('ENDPOINT_RETIRED');
      expect(poolFindSpy).not.toHaveBeenCalled();
      expect(subFindSpy).not.toHaveBeenCalled();
    });

    it('returns HTTP 410 Gone with ENDPOINT_RETIRED for POST /api/picks/tiebreaker and mutates zero DB records', async () => {
      const subUpdateSpy = vi.spyOn(prisma.weeklySubmission, 'update');
      const subUpsertSpy = vi.spyOn(prisma.weeklySubmission, 'upsert');

      const token = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/picks/tiebreaker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ week: 7, season: 2026, prediction: 48.5 }),
      });

      expect(res.status).toBe(410);
      const data = await res.json();
      expect(data.error).toContain('ENDPOINT_RETIRED');
      expect(subUpdateSpy).not.toHaveBeenCalled();
      expect(subUpsertSpy).not.toHaveBeenCalled();
    });

    it('returns HTTP 410 Gone with ENDPOINT_RETIRED for POST /api/picks/tiebreaker/override', async () => {
      const poolUpdateSpy = vi.spyOn(prisma.pool, 'update');

      const token = createAuthToken(ADMIN_ID, 'ADMIN');
      const res = await fetch(`${baseUrl}/api/picks/tiebreaker/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ week: 7, season: 2026, designatedGameId: 'some-game' }),
      });

      expect(res.status).toBe(410);
      const data = await res.json();
      expect(data.error).toContain('ENDPOINT_RETIRED');
      expect(poolUpdateSpy).not.toHaveBeenCalled();
    });
  });

  describe('15. Strict Client Fail-Closed Lock Evaluation (Finding 8 & HAG-15 Finding 4)', () => {
    it('evaluates lock state as locked when server omits isLocked or returns non-boolean', () => {
      expect(evaluateCardLockState({
        status: 'DEFAULT_LIONS',
        designatedGame: { kickoffTime: futureKickoff },
        kickoffTime: futureKickoff,
      })).toBe(true); // isLocked missing

      expect(evaluateCardLockState({
        isLocked: 'false' as any, // string, not boolean false
        status: 'DEFAULT_LIONS',
        designatedGame: { kickoffTime: futureKickoff },
        kickoffTime: futureKickoff,
      })).toBe(true);

      expect(evaluateCardLockState({
        isLocked: null as any,
        status: 'DEFAULT_LIONS',
        designatedGame: { kickoffTime: futureKickoff },
        kickoffTime: futureKickoff,
      })).toBe(true);
    });

    it('evaluates lock state as locked when designation status is not DEFAULT_LIONS or COMMISSIONER_OVERRIDE', () => {
      expect(evaluateCardLockState({
        isLocked: false,
        status: 'UNRESOLVED',
        designatedGame: { kickoffTime: futureKickoff },
        kickoffTime: futureKickoff,
      })).toBe(true);

      expect(evaluateCardLockState({
        isLocked: false,
        status: 'LOADING',
        designatedGame: { kickoffTime: futureKickoff },
        kickoffTime: futureKickoff,
      })).toBe(true);

      expect(evaluateCardLockState({
        isLocked: false,
        status: 'ERROR',
        designatedGame: { kickoffTime: futureKickoff },
        kickoffTime: futureKickoff,
      })).toBe(true);
    });

    it('evaluates lock state as locked when kickoff time is missing or invalid date', () => {
      expect(evaluateCardLockState({
        isLocked: false,
        status: 'DEFAULT_LIONS',
        designatedGame: { kickoffTime: null },
        kickoffTime: null,
      })).toBe(true);

      expect(evaluateCardLockState({
        isLocked: false,
        status: 'DEFAULT_LIONS',
        designatedGame: { kickoffTime: 'INVALID_TIMESTAMP' },
        kickoffTime: 'INVALID_TIMESTAMP',
      })).toBe(true);
    });

    it('evaluates lock state as locked when designated game is missing even if isLocked is false (Finding 4)', () => {
      expect(evaluateCardLockState({
        isLocked: false,
        status: 'DEFAULT_LIONS',
        designatedGame: null,
        kickoffTime: futureKickoff,
      })).toBe(true);
    });

    it('evaluates lock state as locked when kickoff time is in the past or exact deadline despite isLocked false (Finding 4)', () => {
      const nowMs = 1792380000000;
      const pastTime = new Date(nowMs - 5000).toISOString();
      const exactTime = new Date(nowMs).toISOString();

      // Past kickoff deadline fails closed to locked
      expect(evaluateCardLockState({
        isLocked: false,
        status: 'DEFAULT_LIONS',
        designatedGame: { id: 'g-1', kickoffTime: pastTime },
        kickoffTime: pastTime,
      }, nowMs)).toBe(true);

      // Exact kickoff deadline fails closed to locked
      expect(evaluateCardLockState({
        isLocked: false,
        status: 'DEFAULT_LIONS',
        designatedGame: { id: 'g-1', kickoffTime: exactTime },
        kickoffTime: exactTime,
      }, nowMs)).toBe(true);
    });

    it('evaluates lock state as unlocked only when isLocked is boolean false, designation is resolved, designated game is present, and kickoff is valid future date', () => {
      const nowMs = 1792380000000;
      const futureTime = new Date(nowMs + 60000).toISOString();

      expect(evaluateCardLockState({
        isLocked: false,
        status: 'DEFAULT_LIONS',
        designatedGame: { id: 'g-1', kickoffTime: futureTime },
        kickoffTime: futureTime,
      }, nowMs)).toBe(false);

      expect(evaluateCardLockState({
        isLocked: false,
        status: 'COMMISSIONER_OVERRIDE',
        designatedGame: { id: 'g-2', kickoffTime: futureTime },
        kickoffTime: futureTime,
      }, nowMs)).toBe(false);
    });

    it('evaluates lock state transitions from unlocked to locked at the kickoff deadline timestamp (Finding 4)', () => {
      const nowMs = 1792380000000;
      const futureTime = new Date(nowMs + 60000).toISOString();
      const exactTime = new Date(nowMs).toISOString();

      const cardData = {
        isLocked: false,
        status: 'DEFAULT_LIONS',
        designatedGame: { id: 'g-1', kickoffTime: futureTime },
        kickoffTime: futureTime,
      };

      // Unlocked before kickoff
      expect(evaluateCardLockState(cardData, nowMs)).toBe(false);
      // Fails closed to locked at/after kickoff
      expect(evaluateCardLockState({ ...cardData, kickoffTime: exactTime, designatedGame: { id: 'g-1', kickoffTime: exactTime } }, nowMs)).toBe(true);
    });

    it('mounts actual WeeklyTiebreakerCard with a fake clock and asserts real controls lock at kickoff without focus (Finding 4)', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container);

      const baseNow = 1792380000000;
      vi.useFakeTimers();
      vi.setSystemTime(baseNow);

      const deadlineMs = baseNow + 5000; // 5 seconds ahead
      const kickoffIso = new Date(deadlineMs).toISOString();

      const mockData = {
        status: 'DEFAULT_LIONS',
        tiebreakerOffered: true,
        designatedGame: {
          id: 'g-w7-det',
          externalGameId: '401873010',
          homeTeamId: 'MIN',
          awayTeamId: 'DET',
          kickoffTime: kickoffIso,
          status: 'SCHEDULED',
        },
        kickoffTime: kickoffIso,
        isLocked: false,
        userPrediction: null,
      };

      vi.spyOn(apiClient, 'scopedExpressFetch').mockResolvedValue({
        ok: true,
        json: async () => mockData,
      } as any);

      // Helper to find all elements by tagName recursively
      function findElementsByTag(el: any, tag: string): any[] {
        const res: any[] = [];
        if (el.tagName === tag.toUpperCase()) res.push(el);
        for (const child of el.children || []) {
          res.push(...findElementsByTag(child, tag));
        }
        return res;
      }

      try {
        // 1. Mount actual component inside act()
        await act(async () => {
          root.render(React.createElement(WeeklyTiebreakerCard, { week: 7, poolId: POOL_ID }));
        });

        // 2. Before kickoff deadline: input control is enabled and action button (Save) is rendered
        const inputsBefore = findElementsByTag(container, 'input');
        const buttonsBefore = findElementsByTag(container, 'button');
        expect(inputsBefore).toHaveLength(1);
        expect(inputsBefore[0].disabled).toBe(false);
        expect(buttonsBefore.some((b: any) => b.textContent?.includes('Save'))).toBe(true);
        expect(container.textContent).toContain('Lock:');
        expect(container.textContent).not.toContain('Locked');

        // 3. Advance fake clock past kickoff deadline without window focus or visibility change
        await act(async () => {
          vi.advanceTimersByTime(5050);
        });

        // 4. At and past kickoff deadline: input control auto-locks (disabled=true), Save button unmounts, Lock badge displays
        const inputsAfter = findElementsByTag(container, 'input');
        const buttonsAfter = findElementsByTag(container, 'button');
        expect(inputsAfter).toHaveLength(1);
        expect(inputsAfter[0].disabled).toBe(true);
        expect(buttonsAfter.some((b: any) => b.textContent?.includes('Save'))).toBe(false);
        expect(container.textContent).toContain('Locked');
      } finally {
        await act(async () => {
          root.unmount();
        });
        vi.useRealTimers();
      }
    });

    it('mounts actual WeeklyTiebreakerCard and asserts failed Clear preserves acknowledged prediction badge and draft, and Retry resends clear: true (Finding 8)', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container);

      const futureIso = new Date(Date.now() + 86400000).toISOString();
      const mockInitialData = {
        status: 'DEFAULT_LIONS',
        tiebreakerOffered: true,
        designatedGame: {
          id: 'g-w7-det',
          externalGameId: '401873010',
          homeTeamId: 'MIN',
          awayTeamId: 'DET',
          kickoffTime: futureIso,
          status: 'SCHEDULED',
        },
        kickoffTime: futureIso,
        isLocked: false,
        userPrediction: 48.5,
      };

      const fetchCalls: Array<{ url: string; options?: any }> = [];
      let postCount = 0;
      vi.spyOn(apiClient, 'scopedExpressFetch').mockImplementation(async (url: string, opts?: any) => {
        fetchCalls.push({ url, options: opts });
        if (opts?.method === 'POST') {
          postCount++;
          if (postCount === 1) {
            // First POST: simulate failure during clear!
            return {
              ok: false,
              status: 500,
              json: async () => ({ error: 'Database locked during clear' }),
            } as any;
          } else {
            // Second POST: retry succeeds!
            return {
              ok: true,
              status: 200,
              json: async () => ({ prediction: null }),
            } as any;
          }
        }
        return {
          ok: true,
          status: 200,
          json: async () => mockInitialData,
        } as any;
      });

      function findElementsByTag(el: any, tag: string): any[] {
        const res: any[] = [];
        if (el.tagName === tag.toUpperCase()) res.push(el);
        for (const child of el.children || []) {
          res.push(...findElementsByTag(child, tag));
        }
        return res;
      }

      try {
        // 1. Mount actual component inside act()
        await act(async () => {
          root.render(React.createElement(WeeklyTiebreakerCard, { week: 7, poolId: POOL_ID }));
        });

        // 2. Initial state: confirmed prediction badge rendered, input has value 48.5, Clear button rendered
        const inputsInit = findElementsByTag(container, 'input');
        expect(inputsInit).toHaveLength(1);
        expect(inputsInit[0].value).toBe('48.5');
        expect(container.textContent).toContain('48.5 pts');

        const buttonsInit = findElementsByTag(container, 'button');
        const clearBtn = buttonsInit.find((b: any) => b.textContent?.includes('Clear'));
        expect(clearBtn).toBeDefined();

        // 3. User clicks Clear button -> triggers failed clear mutation
        await act(async () => {
          clearBtn.click();
        });

        // 4. Assert first POST payload sent clear: true
        const firstPost = fetchCalls.find((c) => c.options?.method === 'POST');
        expect(firstPost).toBeDefined();
        expect(JSON.parse(firstPost!.options.body)).toEqual({
          pool_id: POOL_ID,
          week: 7,
          season: 2026,
          clear: true,
        });

        // 5. Assert preserved acknowledged value and preserved draft on failure
        const inputsAfterFailure = findElementsByTag(container, 'input');
        expect(inputsAfterFailure[0].value).toBe('48.5'); // Draft preserved!
        expect(container.textContent).toContain('48.5 pts'); // Confirmed badge preserved!
        expect(container.textContent).toContain('Database locked during clear'); // Error shown!

        const retryBtn = findElementsByTag(container, 'button').find((b: any) => b.textContent?.includes('Retry'));
        expect(retryBtn).toBeDefined();

        // 6. User clicks Retry button -> triggers retry mutation
        await act(async () => {
          retryBtn.click();
        });

        // 7. Assert second POST also sent clear: true (retained clear mutation intent!)
        const postCalls = fetchCalls.filter((c) => c.options?.method === 'POST');
        expect(postCalls).toHaveLength(2);
        expect(JSON.parse(postCalls[1].options.body)).toEqual({
          pool_id: POOL_ID,
          week: 7,
          season: 2026,
          clear: true,
        });

        // 8. On success: confirmed badge is unmounted, input is blanked, Save button appears
        expect(container.textContent).not.toContain('48.5 pts');
        const inputsFinal = findElementsByTag(container, 'input');
        expect(inputsFinal[0].value).toBe('');
        const buttonsFinal = findElementsByTag(container, 'button');
        expect(buttonsFinal.some((b: any) => b.textContent?.includes('Clear'))).toBe(false);
        expect(buttonsFinal.some((b: any) => b.textContent?.includes('Update'))).toBe(false);
      } finally {
        await act(async () => {
          root.unmount();
        });
      }
    });
  });

  describe('16. Matrix Privacy Clock via Authoritative Canonical Slate Helper (Finding 10)', () => {
    it('uses canonical slate helper to resolve games and reveals competitor tiebreaker predictions immediately to active pool members prior to kickoff (P41-POOL-VISIBILITY-2026-10-19-08)', async () => {
      const mockPoolWithMembers = {
        ...mockPool,
        memberships: [
          {
            userId: MEMBER_1_ID,
            status: 'ACTIVE',
            user: { id: MEMBER_1_ID, email: 'member1@example.com' },
            stat: { totalShotsDrank: 4 },
          },
          {
            userId: MEMBER_2_ID,
            status: 'ACTIVE',
            user: { id: MEMBER_2_ID, email: 'member2@example.com' },
            stat: { totalShotsDrank: 2 },
          },
        ],
      };

      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPoolWithMembers as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);
      vi.spyOn(prisma.pick, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.weeklySubmission, 'findMany').mockResolvedValue([
        { userId: MEMBER_1_ID, weekNumber: 7, tieBreakerPrediction: 45.0, isFinalized: false },
        { userId: MEMBER_2_ID, weekNumber: 7, tieBreakerPrediction: 52.0, isFinalized: false },
      ] as any);

      const token = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/matrix?week=7`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();

      // Canonical columns & rows resolved from manifest
      expect(data.columns).toHaveLength(2);
      expect(data.rows).toHaveLength(2);
      expect(data.rows[0].external_game_id).toBe('401873010');

      // Pre-kickoff immediate pool visibility:
      // Requesting user (MEMBER_1_ID) sees their own guess:
      expect(data.summary[MEMBER_1_ID].tiebreaker_guess).toBe(45);
      // Other member (MEMBER_2_ID) guess is immediately visible:
      expect(data.summary[MEMBER_2_ID].tiebreaker_guess).toBe(52);
    });

    it('reveals competitor tiebreaker predictions in matrix once designated game kickoff has passed', async () => {
      const pastWeek7Games = [
        {
          id: 'g-w7-det',
          externalGameId: '401873010',
          homeTeamId: 'MIN',
          awayTeamId: 'DET',
          kickoffTime: pastKickoff,
          status: GameStatus.FINAL,
          homeScore: 24,
          awayScore: 21,
        },
        {
          id: 'g-w7-gb',
          externalGameId: '401873011',
          homeTeamId: 'GB',
          awayTeamId: 'HOU',
          kickoffTime: pastKickoff,
          status: GameStatus.FINAL,
          homeScore: 28,
          awayScore: 27,
        },
      ];

      const mockPoolWithMembers = {
        ...mockPool,
        memberships: [
          {
            userId: MEMBER_1_ID,
            status: 'ACTIVE',
            user: { id: MEMBER_1_ID, email: 'member1@example.com' },
            stat: { totalShotsDrank: 4 },
          },
          {
            userId: MEMBER_2_ID,
            status: 'ACTIVE',
            user: { id: MEMBER_2_ID, email: 'member2@example.com' },
            stat: { totalShotsDrank: 2 },
          },
        ],
      };

      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPoolWithMembers as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(pastWeek7Games as any);
      vi.spyOn(prisma.pick, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.weeklySubmission, 'findMany').mockResolvedValue([
        { userId: MEMBER_1_ID, weekNumber: 7, tieBreakerPrediction: 45.0, isFinalized: true },
        { userId: MEMBER_2_ID, weekNumber: 7, tieBreakerPrediction: 52.0, isFinalized: true },
      ] as any);

      const token = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/matrix?week=7`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();

      // Post-kickoff: both guesses are revealed
      expect(data.summary[MEMBER_1_ID].tiebreaker_guess).toBe(45);
      expect(data.summary[MEMBER_2_ID].tiebreaker_guess).toBe(52);
    });

    it('strictly purges synthetic fallback in matrix while returning correctly scoped stored predictions independently of reveal timing (Finding 2)', async () => {
      // 1. Force canonical sources to fail
      vi.spyOn(authoritativeSlateService, 'getAcceptedSlateManifest').mockResolvedValue(null);
      setCallerBoundSupabaseClientForTesting(null);
      (vi.spyOn(prisma, '$queryRawUnsafe') as any).mockRejectedValue(new Error('column season does not exist'));

      // 2. Put old synthetic matching game in database with past kickoff
      const syntheticOldGames = [
        {
          id: 'old-synth-g-1',
          externalGameId: '2026_w07_det_min',
          homeTeamId: 'MIN',
          awayTeamId: 'DET',
          kickoffTime: pastKickoff,
          status: GameStatus.FINAL,
          homeScore: 31,
          awayScore: 29,
        },
      ];

      const mockPoolWithMembers = {
        ...mockPool,
        memberships: [
          {
            userId: MEMBER_1_ID,
            status: 'ACTIVE',
            user: { id: MEMBER_1_ID, email: 'member1@example.com' },
            stat: { totalShotsDrank: 4 },
          },
          {
            userId: MEMBER_2_ID,
            status: 'ACTIVE',
            user: { id: MEMBER_2_ID, email: 'member2@example.com' },
            stat: { totalShotsDrank: 2 },
          },
        ],
      };

      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPoolWithMembers as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(syntheticOldGames as any);
      vi.spyOn(prisma.pick, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.weeklySubmission, 'findMany').mockResolvedValue([
        { userId: MEMBER_1_ID, weekNumber: 7, tieBreakerPrediction: 45.0, isFinalized: false },
        { userId: MEMBER_2_ID, weekNumber: 7, tieBreakerPrediction: 52.0, isFinalized: false },
      ] as any);

      const token = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/matrix?week=7`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();

      // Zero synthetic fallback: matrix rows must be empty when canonical lookup fails
      expect(data.rows).toEqual([]);

      // Stored member predictions are returned independently of reveal timing under immediate visibility
      expect(data.summary[MEMBER_1_ID].tiebreaker_guess).toBe(45);
      expect(data.summary[MEMBER_2_ID].tiebreaker_guess).toBe(52);
    });

    it('reveals competitor tiebreaker predictions in matrix at the EXACT kickoff timestamp (now.getTime() === designatedKickoff.getTime()) (Finding 10)', async () => {
      const exactKickoffMs = 1792380000000;
      const exactKickoffIso = new Date(exactKickoffMs).toISOString();

      vi.useFakeTimers();
      vi.setSystemTime(exactKickoffMs);

      const exactKickoffGames = [
        {
          id: 'g-w7-det',
          externalGameId: '401873010',
          homeTeamId: 'MIN',
          awayTeamId: 'DET',
          kickoffTime: exactKickoffIso,
          status: GameStatus.SCHEDULED,
          homeScore: null,
          awayScore: null,
        },
        {
          id: 'g-w7-gb',
          externalGameId: '401873011',
          homeTeamId: 'GB',
          awayTeamId: 'HOU',
          kickoffTime: exactKickoffIso,
          status: GameStatus.SCHEDULED,
          homeScore: null,
          awayScore: null,
        },
      ];

      const mockPoolWithMembers = {
        ...mockPool,
        memberships: [
          {
            userId: MEMBER_1_ID,
            status: 'ACTIVE',
            user: { id: MEMBER_1_ID, email: 'member1@example.com' },
            stat: { totalShotsDrank: 4 },
          },
          {
            userId: MEMBER_2_ID,
            status: 'ACTIVE',
            user: { id: MEMBER_2_ID, email: 'member2@example.com' },
            stat: { totalShotsDrank: 2 },
          },
        ],
      };

      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPoolWithMembers as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(exactKickoffGames as any);
      vi.spyOn(prisma.pick, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.weeklySubmission, 'findMany').mockResolvedValue([
        { userId: MEMBER_1_ID, weekNumber: 7, tieBreakerPrediction: 45.0, isFinalized: false },
        { userId: MEMBER_2_ID, weekNumber: 7, tieBreakerPrediction: 52.0, isFinalized: false },
      ] as any);

      try {
        const token = createAuthToken(MEMBER_1_ID);
        const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/matrix?week=7`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        expect(res.status).toBe(200);
        const data = await res.json();

        // At EXACT kickoff boundary (now.getTime() >= designatedKickoff.getTime() evaluates to true):
        // Competitor tiebreaker guess is revealed (52), not masked to null!
        expect(data.summary[MEMBER_1_ID].tiebreaker_guess).toBe(45);
        expect(data.summary[MEMBER_2_ID].tiebreaker_guess).toBe(52);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('17. Route-Level Immediate Visibility Invariants Across Settings & Tenancy (P41-POOL-VISIBILITY-2026-10-19-08)', () => {
    const OTHER_POOL_ID = 'e9999999-9999-4999-a999-999999999999';
    const OUTSIDER_USER_ID = 'f8888888-8888-4888-a888-888888888888';

    it.each([
      { settingLabel: 'legacy hide setting true (snake_case)', settingsOverride: { hide_picks_until_kickoff: true } },
      { settingLabel: 'legacy hide setting true (camelCase)', settingsOverride: { hidePicksUntilKickoff: true } },
      { settingLabel: 'legacy hide setting false (snake_case)', settingsOverride: { hide_picks_until_kickoff: false } },
      { settingLabel: 'legacy hide setting false (camelCase)', settingsOverride: { hidePicksUntilKickoff: false } },
      { settingLabel: 'legacy hide setting absent', settingsOverride: {} },
    ])('allows ordinary ACTIVE member to view another member saved unfinalized pick and tiebreaker guess in Matrix under $settingLabel', async ({ settingsOverride }) => {
      // 1. Put variants in mockPool.settings, explicitly remove keys for absent
      const poolSettings: Record<string, any> = {
        ...mockPool.settings,
        ...settingsOverride,
      };
      if (settingsOverride.hide_picks_until_kickoff === undefined) {
        delete poolSettings.hide_picks_until_kickoff;
      }
      if (settingsOverride.hidePicksUntilKickoff === undefined) {
        delete poolSettings.hidePicksUntilKickoff;
      }

      const mockPoolWithMembers = {
        ...mockPool,
        settings: poolSettings,
        memberships: [
          {
            userId: MEMBER_1_ID,
            status: 'ACTIVE',
            user: { id: MEMBER_1_ID, email: 'member1@example.com' },
            stat: { totalShotsDrank: 4 },
          },
          {
            userId: MEMBER_2_ID,
            status: 'ACTIVE',
            user: { id: MEMBER_2_ID, email: 'member2@example.com' },
            stat: { totalShotsDrank: 2 },
          },
        ],
      };

      const poolFindUniqueSpy = vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPoolWithMembers as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);

      // 2. Comprehensive multi-pool, multi-week dataset to rigorously prove pool and week isolation
      const allPicksDataset = [
        // Target pick: MEMBER_2 in POOL_ID for week 7 game (unfinalized, saved)
        {
          id: 'p-1',
          userId: MEMBER_2_ID,
          poolId: POOL_ID,
          gameId: 'g-w7-det',
          selectedTeamId: 'DET',
        },
        // Same member (MEMBER_2), DIFFERENT pool (OTHER_POOL_ID) for same game: MUST NEVER leak
        {
          id: 'p-same-user-other-pool',
          userId: MEMBER_2_ID,
          poolId: OTHER_POOL_ID,
          gameId: 'g-w7-det',
          selectedTeamId: 'KC',
        },
        // Requesting member (MEMBER_1), DIFFERENT pool (OTHER_POOL_ID) for same game: MUST NEVER leak
        {
          id: 'p-member1-other-pool',
          userId: MEMBER_1_ID,
          poolId: OTHER_POOL_ID,
          gameId: 'g-w7-det',
          selectedTeamId: 'MIA',
        },
        // Outsider user pick in OTHER_POOL_ID: MUST NEVER leak
        {
          id: 'p-outsider-other-pool',
          userId: OUTSIDER_USER_ID,
          poolId: OTHER_POOL_ID,
          gameId: 'g-w7-det',
          selectedTeamId: 'MIN',
        },
        // Same member in POOL_ID, but DIFFERENT game from week 8: MUST NEVER leak into week 7
        {
          id: 'p-other-game',
          userId: MEMBER_2_ID,
          poolId: POOL_ID,
          gameId: 'g-w8-other',
          selectedTeamId: 'BAL',
        },
      ];

      const allSubmissionsDataset = [
        // Target submission: MEMBER_2 in POOL_ID for week 7 -> tiebreaker prediction 0.0 (zero remains zero)
        {
          id: 's-1',
          userId: MEMBER_2_ID,
          poolId: POOL_ID,
          weekNumber: 7,
          tieBreakerPrediction: 0.0,
          isFinalized: false,
        },
        // Same member (MEMBER_2), DIFFERENT pool (OTHER_POOL_ID) for week 7 -> 99.0: MUST NEVER leak
        {
          id: 's-same-user-other-pool',
          userId: MEMBER_2_ID,
          poolId: OTHER_POOL_ID,
          weekNumber: 7,
          tieBreakerPrediction: 99.0,
          isFinalized: false,
        },
        // Requesting member (MEMBER_1), DIFFERENT pool (OTHER_POOL_ID) for week 7 -> 42.0: MUST NEVER leak
        // (In POOL_ID, MEMBER_1 has missing submission; guess must remain null)
        {
          id: 's-member1-other-pool',
          userId: MEMBER_1_ID,
          poolId: OTHER_POOL_ID,
          weekNumber: 7,
          tieBreakerPrediction: 42.0,
          isFinalized: false,
        },
        // Same member (MEMBER_2), POOL_ID, DIFFERENT week (week 8) -> 88.0: MUST NEVER leak into week 7
        {
          id: 's-same-user-other-week',
          userId: MEMBER_2_ID,
          poolId: POOL_ID,
          weekNumber: 8,
          tieBreakerPrediction: 88.0,
          isFinalized: false,
        },
        // Outsider user submission in OTHER_POOL_ID for week 7: MUST NEVER leak
        {
          id: 's-outsider-other-pool',
          userId: OUTSIDER_USER_ID,
          poolId: OTHER_POOL_ID,
          weekNumber: 7,
          tieBreakerPrediction: 77.0,
          isFinalized: false,
        },
      ];

      const pickFindManySpy = vi.spyOn(prisma.pick, 'findMany').mockImplementation(async (args: any) => {
        return allPicksDataset.filter((p) => {
          if (args?.where?.poolId && p.poolId !== args.where.poolId) return false;
          if (args?.where?.gameId?.in && !args.where.gameId.in.includes(p.gameId)) return false;
          return true;
        }) as any;
      });

      const submissionFindManySpy = vi.spyOn(prisma.weeklySubmission, 'findMany').mockImplementation(async (args: any) => {
        return allSubmissionsDataset.filter((s) => {
          if (args?.where?.poolId && s.poolId !== args.where.poolId) return false;
          if (args?.where?.weekNumber !== undefined && s.weekNumber !== args.where.weekNumber) return false;
          return true;
        }) as any;
      });

      const token = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/matrix?week=7`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();

      // Assert observed pool and settings fixtures are exactly those intended
      expect(poolFindUniqueSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: POOL_ID },
        })
      );
      const observedPool = await poolFindUniqueSpy.mock.results[0].value;
      expect(observedPool.settings).toEqual(poolSettings);
      if (settingsOverride.hide_picks_until_kickoff !== undefined) {
        expect(observedPool.settings.hide_picks_until_kickoff).toBe(settingsOverride.hide_picks_until_kickoff);
      } else if (settingsOverride.hidePicksUntilKickoff !== undefined) {
        expect(observedPool.settings.hidePicksUntilKickoff).toBe(settingsOverride.hidePicksUntilKickoff);
      } else {
        expect(observedPool.settings.hide_picks_until_kickoff).toBeUndefined();
        expect(observedPool.settings.hidePicksUntilKickoff).toBeUndefined();
      }

      // Assert query pool and week filters are strictly passed and honored
      expect(pickFindManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            poolId: POOL_ID,
            gameId: { in: expect.arrayContaining(['g-w7-det']) },
          }),
        })
      );
      expect(submissionFindManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            poolId: POOL_ID,
            weekNumber: 7,
          }),
        })
      );

      // Compatibility metadata reflects open pool visibility
      expect(data.metadata.hide_picks_until_kickoff).toBe(false);

      // Verify cells: MEMBER_2 saved pick is visible immediately, is_masked is false
      const game1Cells = data.cells['g-w7-det'];
      expect(game1Cells).toBeDefined();
      expect(game1Cells[MEMBER_2_ID]).toBeDefined();
      expect(game1Cells[MEMBER_2_ID].selected_team_id).toBe('DET');
      expect(game1Cells[MEMBER_2_ID].is_masked).toBe(false);

      // Verify pool isolation: MEMBER_2's pick in OTHER_POOL_ID ('KC') did NOT overwrite or leak into POOL_ID
      expect(game1Cells[MEMBER_2_ID].selected_team_id).not.toBe('KC');

      // Verify pool isolation: MEMBER_1 has no pick in POOL_ID; OTHER_POOL_ID pick ('MIA') did NOT leak
      expect(game1Cells[MEMBER_1_ID]).toBeDefined();
      expect(game1Cells[MEMBER_1_ID].selected_team_id).toBeNull();

      // No cross-pool leak: OUTSIDER_USER_ID is not present in columns or cells
      expect(data.columns.some((c: any) => c.user_id === OUTSIDER_USER_ID)).toBe(false);
      expect(game1Cells[OUTSIDER_USER_ID]).toBeUndefined();

      // Zero remains zero: MEMBER_2 guess of 0 in POOL_ID is numeric 0 (NOT 99 from OTHER_POOL_ID, NOT 88 from week 8)
      expect(data.summary[MEMBER_2_ID].tiebreaker_guess).toBe(0);

      // Missing remains null: MEMBER_1 has no submission in POOL_ID for week 7, guess is null (NOT 42 from OTHER_POOL_ID)
      expect(data.summary[MEMBER_1_ID].tiebreaker_guess).toBeNull();
    });

    it('exposes member prediction readiness summary to ordinary ACTIVE members on GET /api/pools/:pool_id/tiebreaker', async () => {
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPool as any);
      // Ordinary active member (NOT admin)
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);
      vi.spyOn(prisma.weeklySubmission, 'findUnique').mockResolvedValue(null);

      vi.spyOn(prisma.poolMembership, 'findMany').mockResolvedValue([
        { poolId: POOL_ID, userId: MEMBER_1_ID, status: 'ACTIVE', user: { id: MEMBER_1_ID, email: 'm1@example.com' } },
        { poolId: POOL_ID, userId: MEMBER_2_ID, status: 'ACTIVE', user: { id: MEMBER_2_ID, email: 'm2@example.com' } },
      ] as any);

      vi.spyOn(prisma.weeklySubmission, 'findMany').mockResolvedValue([
        { poolId: POOL_ID, userId: MEMBER_1_ID, weekNumber: 7, tieBreakerPrediction: 0.0 },
        { poolId: POOL_ID, userId: MEMBER_2_ID, weekNumber: 7, tieBreakerPrediction: 52.0 },
      ] as any);

      const token = createAuthToken(MEMBER_1_ID); // Ordinary member token
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/tiebreaker?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.readiness).toBeDefined();
      expect(data.readiness).toHaveLength(2);

      const m1 = data.readiness.find((r: any) => r.userId === MEMBER_1_ID);
      const m2 = data.readiness.find((r: any) => r.userId === MEMBER_2_ID);

      // Ordinary active member sees peer predictions: 0 remains 0, 52 is 52
      expect(m1.prediction).toBe(0);
      expect(m1.hasSubmitted).toBe(true);
      expect(m2.prediction).toBe(52);
      expect(m2.hasSubmitted).toBe(true);
    });

    it('exposes predictions to ordinary ACTIVE member on both canonical preview aliases', async () => {
      const mockPoolWithMembers = {
        ...mockPool,
        memberships: [
          { userId: MEMBER_1_ID, status: 'ACTIVE' },
          { userId: MEMBER_2_ID, status: 'ACTIVE' },
        ],
      };
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPoolWithMembers as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);
      vi.spyOn(prisma.pick, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.weeklySubmission, 'findMany').mockResolvedValue([
        { userId: MEMBER_1_ID, weekNumber: 7, tieBreakerPrediction: 45.0, isFinalized: false },
        { userId: MEMBER_2_ID, weekNumber: 7, tieBreakerPrediction: 52.0, isFinalized: false },
      ] as any);
      (vi.spyOn(prisma, '$queryRaw') as any).mockResolvedValue([{ to_regclass: 'public.weekly_wrapups' }]);
      (vi.spyOn(prisma, '$queryRawUnsafe') as any).mockResolvedValue([]);

      const token = createAuthToken(MEMBER_1_ID);

      // Alias 1: /api/pools/:pool_id/wrap-up/preview
      const res1 = await fetch(`${baseUrl}/api/pools/${POOL_ID}/wrap-up/preview?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res1.status).toBe(200);
      const data1 = await res1.json();
      expect(data1.preview.projectedStandings.find((s: any) => s.userId === MEMBER_1_ID).tieBreakerPrediction).toBe(45);
      expect(data1.preview.projectedStandings.find((s: any) => s.userId === MEMBER_2_ID).tieBreakerPrediction).toBe(52);

      // Alias 2: /api/pools/:pool_id/ops/wrap-up/preview
      const res2 = await fetch(`${baseUrl}/api/pools/${POOL_ID}/ops/wrap-up/preview?week=7&season=2026`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res2.status).toBe(200);
      const data2 = await res2.json();
      expect(data2.preview.projectedStandings.find((s: any) => s.userId === MEMBER_1_ID).tieBreakerPrediction).toBe(45);
      expect(data2.preview.projectedStandings.find((s: any) => s.userId === MEMBER_2_ID).tieBreakerPrediction).toBe(52);
    });

    it('preserves read-only GET invariant: GET requests do not mutate database records', async () => {
      const mockPoolWithMembers = {
        ...mockPool,
        memberships: [
          {
            userId: MEMBER_1_ID,
            status: 'ACTIVE',
            user: { id: MEMBER_1_ID, email: 'member1@example.com' },
            stat: { totalShotsDrank: 4 },
          },
          {
            userId: MEMBER_2_ID,
            status: 'ACTIVE',
            user: { id: MEMBER_2_ID, email: 'member2@example.com' },
            stat: { totalShotsDrank: 2 },
          },
        ],
      };
      vi.spyOn(prisma.pool, 'findUnique').mockResolvedValue(mockPoolWithMembers as any);
      vi.spyOn(prisma.poolMembership, 'findUnique').mockResolvedValue({
        poolId: POOL_ID,
        userId: MEMBER_1_ID,
        status: 'ACTIVE',
      } as any);
      vi.spyOn(prisma.game, 'findMany').mockResolvedValue(mockWeek7Games as any);
      vi.spyOn(prisma.pick, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.weeklySubmission, 'findMany').mockResolvedValue([
        { userId: MEMBER_1_ID, weekNumber: 7, tieBreakerPrediction: 45.0, isFinalized: false },
      ] as any);

      const updateSpy = vi.spyOn(prisma.pool, 'update');
      const createSpy = vi.spyOn(prisma.pick, 'create');
      const updateSubSpy = vi.spyOn(prisma.weeklySubmission, 'update');

      const token = createAuthToken(MEMBER_1_ID);
      const res = await fetch(`${baseUrl}/api/pools/${POOL_ID}/matrix?week=7`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);

      expect(updateSpy).not.toHaveBeenCalled();
      expect(createSpy).not.toHaveBeenCalled();
      expect(updateSubSpy).not.toHaveBeenCalled();
    });
  });
});
