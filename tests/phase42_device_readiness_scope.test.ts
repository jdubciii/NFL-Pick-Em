import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { DesignationStatus } from '../src/services/weeklyDesignationService';
import {
  validateTelemetryCoverage,
  calculateProvisionalStandings,
  SlateGame,
  UserStandingRef,
  UserPickItem,
} from '../client/src/services/sweatProjectionService';
import {
  WeeklyLadderView,
} from '../client/src/components/shame/WeeklyLadderView';
import {
  ProfilePage,
  resolveProfileReminderScope,
  formatNextKickoffLock,
} from '../client/src/pages/ProfilePage';
import { MatrixPage } from '../client/src/pages/MatrixPage';
import { WeeklyPicks } from '../client/src/components/WeeklyPicks';
import { LiveGame } from '../client/src/services/liveScoreService';
import * as apiClient from '../client/src/lib/apiClient';
import * as liveScoreService from '../client/src/services/liveScoreService';
import { supabase } from '../client/src/lib/supabase';
import { WallOfShamePage } from '../client/src/pages/WallOfShamePage';
import {
  evaluateCanonicalGameLock,
  evaluateSlateLockSummary,
} from '../client/src/services/lockEnforcementService';

let currentMockAuthUser: any = { id: 'u1', email: 'adambrickner@example.com', role: 'MEMBER' };

vi.mock('../client/src/context/AuthContext', () => ({
  useAuth: () => ({
    user: currentMockAuthUser,
    token: 'synthetic-jwt-1',
  }),
}));

// Pick persistence spy tracking across all local and backend persistence channels
interface PickPersistenceTracker {
  upsertCalls: Array<{ payload: any; options?: any }>;
  deleteCalls: Array<{ filters: Record<string, any> }>;
  apiProxyCalls: Array<{ url: string; init?: any }>;
  localStoragePickWrites: Array<{ key: string; val: string }>;
  reset(): void;
}

const pickPersistenceTracker: PickPersistenceTracker = {
  upsertCalls: [],
  deleteCalls: [],
  apiProxyCalls: [],
  localStoragePickWrites: [],
  reset() {
    this.upsertCalls = [];
    this.deleteCalls = [];
    this.apiProxyCalls = [];
    this.localStoragePickWrites = [];
  },
};

// Mock DOM container for React createRoot testing in jsdom/node
function setupMockDom() {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

  const storageMap: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => storageMap[key] ?? null,
    setItem: (key: string, val: string) => {
      storageMap[key] = String(val);
      if (key.startsWith('picks_') && !key.includes('slate') && !key.includes('view') && !key.includes('preference')) {
        pickPersistenceTracker.localStoragePickWrites.push({ key, val: String(val) });
      }
    },
    removeItem: (key: string) => { delete storageMap[key]; },
    clear: () => { Object.keys(storageMap).forEach(k => delete storageMap[k]); },
    get length() { return Object.keys(storageMap).length; },
    key: (i: number) => Object.keys(storageMap)[i] ?? null,
  };

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
  (globalThis as any).dispatchEvent = (evt: any) => {
    const handlers = windowListeners[evt?.type || ''] || [];
    handlers.forEach(h => h(evt));
    return true;
  };
  (globalThis as any).CustomEvent = class CustomEvent {
    constructor(public type: string, public detail?: any) {}
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

  class MockTextNode extends MockNode {
    override nodeType = 3;
    nodeValue: string;
    constructor(val: string, doc: any) {
      super();
      this.nodeValue = String(val);
      this.ownerDocument = doc;
    }
    override get textContent(): string {
      return this.nodeValue;
    }
    override set textContent(val: string) {
      this.nodeValue = String(val);
    }
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

    get options() {
      return this.children.filter((c: any) => c.tagName === 'OPTION');
    }

    querySelector(selector: string): MockElement | null {
      const targetTag = selector.toUpperCase();
      const find = (node: any): any => {
        if (!node) return null;
        if (node.tagName === targetTag) return node;
        for (const child of node.children || []) {
          const res = find(child);
          if (res) return res;
        }
        return null;
      };
      return find(this);
    }

    querySelectorAll(selector: string): MockElement[] {
      const targetTag = selector.toUpperCase();
      const results: MockElement[] = [];
      const traverse = (node: any) => {
        if (!node) return;
        if (node.tagName === targetTag) results.push(node);
        for (const child of node.children || []) {
          traverse(child);
        }
      };
      traverse(this);
      return results;
    }

    getBoundingClientRect() {
      return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 };
    }

    constructor(tag: string, doc: any) {
      super();
      this.tagName = tag.toUpperCase();
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
      if (k === 'class') this.className = '';
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
      const event: any = { type: 'click', target: this, defaultPrevented: false };
      const reactPropsKey = Object.keys(this).find(k => k.startsWith('__reactProps$'));
      if (reactPropsKey && (this as any)[reactPropsKey]?.onClick) {
        (this as any)[reactPropsKey].onClick(event);
        return;
      }
      if (this.listeners['click']) {
        for (const l of [...this.listeners['click']]) {
          l.call(this, event);
        }
      }
    }
  }

  class MockHTMLIFrameElement extends MockElement {}

  const listeners: Record<string, Function[]> = {};

  const mockDoc: any = {
    nodeType: 9,
    visibilityState: 'visible',
    activeElement: null,
    documentElement: new MockElement('html', null),
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
  mockDoc.documentElement.ownerDocument = mockDoc;

  (globalThis as any).Node = MockNode;
  (globalThis as any).Element = MockElement;
  (globalThis as any).HTMLElement = MockElement;
  (globalThis as any).HTMLIFrameElement = MockHTMLIFrameElement;
  (globalThis as any).document = mockDoc;
  (globalThis as any).window = globalThis;
  (globalThis as any).getComputedStyle = (_el: any) => ({
    transform: 'none',
    opacity: '1',
    display: 'block',
    position: 'static',
    getPropertyValue: (_prop: string) => '',
  });
  mockDoc.defaultView = globalThis;

  return { mockDoc, MockElement };
}

function setupWallMocks(options: {
  members?: any[];
  membersError?: any;
  membersDelayMs?: number;
  poolSettings?: any;
  poolError?: any;
  poolDelayMs?: number;
  poolData?: any;
  wrapup?: any;
  wrapupError?: any;
  matrixRows?: any[];
  matrixCells?: any;
  matrixColumns?: any[];
  dbGames?: any[];
  picks?: any[];
  picksError?: any;
  liveScores?: LiveGame[];
  matrixDelayMs?: number;
  matrixShouldFail?: boolean;
  tiebreakerResponse?: any;
  tiebreakerShouldFail?: boolean;
}) {
  const members = options.members ?? [
    { user_id: 'u1', role: 'MEMBER', users: { id: 'u1', email: 'adambrickner@example.com', display_name: 'adambrickner' } },
    { user_id: 'u2', role: 'MEMBER', users: { id: 'u2', email: 'smoketester@example.com', display_name: 'smoke_test_runner' } },
  ];

  if (supabase.auth) {
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: { id: 'u1', email: 'adambrickner@example.com' } },
      error: null,
    } as any);
  }

  vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
    const filters: Record<string, any> = {};
    let isDeleteOp = false;
    const builder: any = {
      select: (cols?: string) => {
        if (cols && table === 'pools' && cols.includes('lock_offset')) {
          throw new Error(`UNSUPPORTED_COLUMN: 'lock_offset' does not exist on table 'pools'. Query cols: ${cols}`);
        }
        if (cols && table === 'pool_memberships' && cols.includes('pools(') && cols.includes('lock_offset')) {
          throw new Error(`UNSUPPORTED_COLUMN: 'lock_offset' does not exist on joined table 'pools'. Query cols: ${cols}`);
        }
        return builder;
      },
      eq: (col: string, val: any) => {
        filters[col] = val;
        return builder;
      },
      in: (col: string, vals: any[]) => {
        filters[col] = vals;
        return builder;
      },
      order: () => builder,
      upsert: (payload: any, opt?: any) => {
        if (table === 'picks') {
          pickPersistenceTracker.upsertCalls.push({ payload, options: opt });
        }
        return Promise.resolve({ data: payload, error: null });
      },
      delete: () => {
        isDeleteOp = true;
        return builder;
      },
      maybeSingle: async () => {
        if (table === 'weekly_wrapups') {
          return { data: options.wrapup ?? null, error: options.wrapupError ?? null };
        }
        if (table === 'pool_memberships') {
          if (options.membersDelayMs) {
            await new Promise((r) => setTimeout(r, options.membersDelayMs));
          }
          return {
            data: options.membersError ? null : { status: 'ACTIVE', user_id: 'u1', pool_id: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782' },
            error: options.membersError ?? null,
          };
        }
        if (table === 'weekly_slate_manifests') {
          const reqWeek = Number(filters.week_number || filters.week || 6);
          const rawEvents = (options.dbGames ?? options.matrixRows ?? [
            { id: 'g1', game_id: 'g1', external_game_id: '401872995' },
          ]).map((g: any) => String(g.external_game_id || g.externalGameId || g.id || g.game_id));
          const eventIds = rawEvents.length > 0 ? rawEvents : ['401872995'];
          return {
            data: {
              season: 2026,
              season_type: 2,
              week_number: reqWeek,
              revision: 1,
              manifest_fingerprint: `fp-mock-${reqWeek}`,
              event_ids: eventIds,
            },
            error: null,
          };
        }
        if (table === 'pools') {
          if (options.poolDelayMs) {
            await new Promise((r) => setTimeout(r, options.poolDelayMs));
          }
          if (options.poolError) {
            return { data: null, error: options.poolError };
          }
          if (options.poolData === null) {
            return { data: null, error: null };
          }
          return {
            data: {
              id: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
              settings: options.poolSettings !== undefined ? options.poolSettings : { lock_offset: 0, lockOffset: 0 },
            },
            error: null,
          };
        }
        return { data: null, error: null };
      },
      then: async (resolve: Function) => {
        if (isDeleteOp) {
          if (table === 'picks') {
            pickPersistenceTracker.deleteCalls.push({ filters: { ...filters } });
          }
          resolve({ data: null, error: null });
          return;
        }
        if (table === 'pool_memberships') {
          if (options.membersDelayMs) {
            await new Promise((r) => setTimeout(r, options.membersDelayMs));
          }
          resolve({ data: options.membersError ? null : members, error: options.membersError ?? null });
        } else if (table === 'picks') {
          resolve({ data: options.picksError ? null : (options.picks ?? []), error: options.picksError ?? null });
        } else if (table === 'games') {
          const reqWeek = Number(filters.week || filters.week_number || 6);
          const rawGames = (options.dbGames ?? options.matrixRows ?? [
            { id: 'g1', game_id: 'g1', external_game_id: '401872995', home_team_id: 'DEN', away_team_id: 'SEA', kickoff_time: '2026-10-18T17:00:00Z' },
          ]).map((r: any) => ({
            id: String(r.game_id || r.id),
            external_game_id: String(r.external_game_id || r.externalGameId || r.game_id || r.id),
            home_team_id: r.home_team_id || 'DEN',
            away_team_id: r.away_team_id || 'SEA',
            kickoff_time: r.kickoff_time || '2026-10-18T17:00:00Z',
            canonical_kickoff_time: r.canonical_kickoff_time || r.kickoff_time || '2026-10-18T17:00:00Z',
            lock_effective_at: r.lock_effective_at || r.kickoff_time || '2026-10-18T17:00:00Z',
            season: 2026,
            season_type: 2,
            week: reqWeek,
            manifest_revision: 1,
            status: r.status || 'SCHEDULED',
          }));
          resolve({ data: rawGames, error: null });
        } else if (table === 'weekly_slate_manifests') {
          const reqWeek = Number(filters.week_number || filters.week || 6);
          const rawEvents = (options.dbGames ?? options.matrixRows ?? [
            { id: 'g1', game_id: 'g1', external_game_id: '401872995' },
          ]).map((g: any) => String(g.external_game_id || g.externalGameId || g.id || g.game_id));
          const eventIds = rawEvents.length > 0 ? rawEvents : ['401872995'];
          resolve({
            data: {
              season: 2026,
              season_type: 2,
              week_number: reqWeek,
              revision: 1,
              manifest_fingerprint: `fp-mock-${reqWeek}`,
              event_ids: eventIds,
            },
            error: null,
          });
        } else if (table === 'pools') {
          resolve({
            data: {
              id: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
              settings: { lock_offset: 0, lockOffset: 0 },
            },
            error: null,
          });
        } else {
          resolve({ data: [], error: null });
        }
      },
    };
    return builder;
  }) as any);

  vi.spyOn(apiClient, 'scopedExpressFetch').mockImplementation((async (url: string, init?: any) => {
    if (url.includes('/api/picks')) {
      pickPersistenceTracker.apiProxyCalls.push({ url, init });
      return { ok: true, json: async () => ({ status: 'success' }) } as any;
    }
    if (url.includes('/matrix')) {
      if (options.matrixDelayMs) {
        await new Promise((r) => setTimeout(r, options.matrixDelayMs));
      }
      if (options.matrixShouldFail) {
        return { ok: false, status: 500, json: async () => ({ error: 'FAILED' }) } as any;
      }
      const weekMatch = url.match(/week_no=(\d+)/);
      const weekNum = weekMatch ? Number(weekMatch[1]) : 7;
      const poolMatch = url.match(/\/api\/pools\/([^/]+)\/matrix/);
      const poolId = poolMatch ? poolMatch[1] : '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';

      let cells = options.matrixCells;
      if (!cells && options.matrixRows) {
        cells = {};
        for (const row of options.matrixRows) {
          const gId = String(row.game_id || row.id);
          cells[gId] = {};
          for (const m of members) {
            const userPick = (options.picks || []).find((p: any) => p.user_id === m.user_id && String(p.game_id) === gId);
            cells[gId][m.user_id] = {
              pick_id: `pick-${gId}-${m.user_id}`,
              selected_team_id: userPick ? userPick.selected_team : null,
            };
          }
        }
      }

      const rows = (options.matrixRows ?? []).map((r: any) => ({
        game_id: String(r.game_id || r.id),
        external_game_id: String(r.external_game_id || r.externalGameId || r.game_id || r.id),
        home_team_id: r.home_team_id || 'DEN',
        away_team_id: r.away_team_id || 'SEA',
        kickoff_time: r.kickoff_time || '2026-10-18T17:00:00Z',
      }));

      return {
        ok: true,
        json: async () => ({
          metadata: {
            pool_id: poolId,
            week_number: weekNum,
          },
          rows,
          cells: cells ?? {},
          columns: options.matrixColumns ?? members.map((m: any) => ({ user_id: m.user_id })),
        }),
      } as any;
    }
    if (url.includes('/tiebreaker')) {
      if (options.tiebreakerShouldFail) {
        return { ok: false, status: 500, json: async () => ({ error: 'FAILED' }) } as any;
      }
      return {
        ok: true,
        json: async () =>
          options.tiebreakerResponse ?? {
            status: 'UNAVAILABLE',
            tiebreakerOffered: false,
            readiness: [],
          },
      } as any;
    }
    return { ok: false, status: 404 } as any;
  }) as any);

  vi.spyOn(liveScoreService, 'fetchLiveNFLScores').mockImplementation((async () => {
    return options.liveScores ?? [];
  }) as any);
}

describe('P42 — Device Readiness & Scope Correction Contract (P42-DEVICE-READINESS-SCOPE-2026-10-24-01)', () => {
  // =========================================================================
  // Case 1: Cold load, network rejection, empty/missing telemetry
  // =========================================================================
  describe('Case 1: Cold load, network rejection, empty/missing telemetry', () => {
    it('validates incomplete telemetry when scoring-relevant FINAL or started game is missing score', () => {
      const games: SlateGame[] = [
        { id: 'g-final', homeTeam: 'DET', awayTeam: 'MIN', kickoffTime: '2026-10-18T17:00:00Z' },
        { id: 'g-future', homeTeam: 'GB', awayTeam: 'CHI', kickoffTime: '2026-10-25T17:00:00Z' },
      ];

      // Missing live score for g-final
      const liveScoresMissing: LiveGame[] = [
        {
          id: 'g-future',
          name: 'GB vs CHI',
          shortName: 'GB vs CHI',
          homeTeam: { code: 'GB', name: 'Packers' },
          awayTeam: { code: 'CHI', name: 'Bears' },
          status: 'SCHEDULED',
          clock: '0:00',
          period: 1,
        },
      ];

      const validation = validateTelemetryCoverage(games, liveScoresMissing);
      expect(validation.isReady).toBe(false);
      expect(validation.isIncomplete).toBe(true);
      expect(validation.missingGameIds).toContain('g-final');
    });

    it('rejects invalid or NaN score values on started games', () => {
      const games: SlateGame[] = [
        { id: 'g-started', homeTeam: 'DET', awayTeam: 'MIN', kickoffTime: '2026-10-18T17:00:00Z' },
      ];

      const liveScoresInvalid: LiveGame[] = [
        {
          id: 'g-started',
          name: 'DET vs MIN',
          shortName: 'DET vs MIN',
          homeTeam: { code: 'DET', name: 'Lions', score: 'NaN' },
          awayTeam: { code: 'MIN', name: 'Vikings', score: '10' },
          status: 'IN_PROGRESS',
          clock: '12:00',
          period: 2,
        },
      ];

      const validation = validateTelemetryCoverage(games, liveScoresInvalid);
      expect(validation.isReady).toBe(false);
      expect(validation.isIncomplete).toBe(true);
      expect(validation.missingGameIds).toContain('g-started');
    });

    it('rejects duplicate telemetry event IDs with DUPLICATE_TELEMETRY_EVENT_ID', () => {
      const games: SlateGame[] = [
        { id: 'g-1', homeTeam: 'DET', awayTeam: 'MIN', kickoffTime: '2026-10-25T17:00:00Z' },
      ];

      const duplicateScores: LiveGame[] = [
        { id: 'g-1', name: 'DET vs MIN', shortName: 'DET vs MIN', homeTeam: { code: 'DET', name: 'Lions' }, awayTeam: { code: 'MIN', name: 'Vikings' }, status: 'SCHEDULED', clock: '0:00', period: 1 },
        { id: 'g-1', name: 'DET vs MIN', shortName: 'DET vs MIN', homeTeam: { code: 'DET', name: 'Lions' }, awayTeam: { code: 'MIN', name: 'Vikings' }, status: 'SCHEDULED', clock: '0:00', period: 1 },
      ];

      const validation = validateTelemetryCoverage(games, duplicateScores);
      expect(validation.isIncomplete).toBe(true);
      expect(validation.reason).toBe('DUPLICATE_TELEMETRY_EVENT_ID');
    });

    it('mounts actual WallOfShamePage in INCOMPLETE_TELEMETRY state and displays retry without SAFE claims', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      setupWallMocks({
        matrixRows: [
          { game_id: 'g-1', home_team_id: 'DET', away_team_id: 'MIN', kickoff_time: '2026-10-18T17:00:00Z' },
        ],
        liveScores: [], // Empty live scores
      });

      await act(async () => {
        root.render(React.createElement(WallOfShamePage, { poolId: 'p-1', week: 6 }));
      });

      const text = container.textContent;
      expect(text).toContain('INCOMPLETE GAME TELEMETRY');
      expect(text).toContain('RETRY');
      expect(text).not.toContain('PROJECTED SAFE');
      expect(text).not.toContain('Safe Haven');

      await act(async () => {
        root.unmount();
      });
    });
  });

  // =========================================================================
  // Case 2: Complete 0-0 scores, all-pregame state, and genuine shared ranks
  // =========================================================================
  describe('Case 2: Complete 0-0 scores, all-pregame state, and genuine shared ranks', () => {
    it('validates complete 0-0 scores as legitimate valid scoring telemetry', () => {
      const games: SlateGame[] = [
        { id: 'g-live-zero', homeTeam: 'DET', awayTeam: 'MIN', kickoffTime: '2026-10-18T17:00:00Z' },
      ];

      const liveScoresZero: LiveGame[] = [
        {
          id: 'g-live-zero',
          name: 'DET vs MIN',
          shortName: 'DET vs MIN',
          homeTeam: { code: 'DET', name: 'Lions', score: '0' },
          awayTeam: { code: 'MIN', name: 'Vikings', score: '0' },
          status: 'IN_PROGRESS',
          clock: '14:50',
          period: 1,
        },
      ];

      const validation = validateTelemetryCoverage(games, liveScoresZero);
      expect(validation.isReady).toBe(true);
      expect(validation.isIncomplete).toBe(false);
      expect(validation.missingGameIds).toHaveLength(0);
    });

    it('identifies confirmed all-future scheduled games as all-pregame without numeric scores required', () => {
      const futureTime = new Date(Date.now() + 86400000).toISOString();
      const games: SlateGame[] = [
        { id: 'g-w7-1', homeTeam: 'DET', awayTeam: 'MIN', kickoffTime: futureTime },
        { id: 'g-w7-2', homeTeam: 'GB', awayTeam: 'CHI', kickoffTime: futureTime },
      ];

      const liveScoresScheduled: LiveGame[] = [
        {
          id: 'g-w7-1',
          name: 'DET vs MIN',
          shortName: 'DET vs MIN',
          homeTeam: { code: 'DET', name: 'Lions' },
          awayTeam: { code: 'MIN', name: 'Vikings' },
          status: 'SCHEDULED',
          clock: '0:00',
          period: 1,
        },
        {
          id: 'g-w7-2',
          name: 'GB vs CHI',
          shortName: 'GB vs CHI',
          homeTeam: { code: 'GB', name: 'Packers' },
          awayTeam: { code: 'CHI', name: 'Bears' },
          status: 'SCHEDULED',
          clock: '0:00',
          period: 1,
        },
      ];

      const validation = validateTelemetryCoverage(games, liveScoresScheduled);
      expect(validation.isReady).toBe(true);
      expect(validation.isAllPregame).toBe(true);
      expect(validation.isIncomplete).toBe(false);
    });

    it('mounts actual WallOfShamePage in GAMES_NOT_STARTED state with zero safety promise', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      const futureTime = new Date(Date.now() + 86400000).toISOString();
      setupWallMocks({
        matrixRows: [
          { game_id: 'g-w7-1', home_team_id: 'DET', away_team_id: 'MIN', kickoff_time: futureTime },
        ],
        liveScores: [
          {
            id: 'g-w7-1',
            name: 'DET vs MIN',
            shortName: 'DET vs MIN',
            homeTeam: { code: 'DET', name: 'Lions' },
            awayTeam: { code: 'MIN', name: 'Vikings' },
            status: 'SCHEDULED',
            clock: '0:00',
            period: 1,
          },
        ],
      });

      await act(async () => {
        root.render(React.createElement(WallOfShamePage, { poolId: 'p-1', week: 7 }));
      });

      const text = container.textContent;
      expect(text).toContain('GAMES NOT STARTED');
      expect(text).not.toContain('PROJECTED SAFE');
      expect(text).not.toContain('0 shots');

      await act(async () => {
        root.unmount();
      });
    });

    it('preserves genuine shared ranks on complete equal standings', () => {
      const users: UserStandingRef[] = [
        { id: 'u1', name: 'Alice' },
        { id: 'u2', name: 'Bob' },
      ];
      const games: SlateGame[] = [
        { id: 'g-1', homeTeam: 'DET', awayTeam: 'MIN', kickoffTime: '2026-10-18T17:00:00Z' },
      ];
      const liveScores: LiveGame[] = [
        {
          id: 'g-1',
          name: 'DET vs MIN',
          shortName: 'DET vs MIN',
          homeTeam: { code: 'DET', name: 'Lions', score: '24' },
          awayTeam: { code: 'MIN', name: 'Vikings', score: '10' },
          status: 'FINAL',
          clock: 'FINAL',
          period: 4,
        },
      ];
      const picks: UserPickItem[] = [
        { userId: 'u1', gameId: 'g-1', selectedTeam: 'DET', isSubmitted: true },
        { userId: 'u2', gameId: 'g-1', selectedTeam: 'DET', isSubmitted: true },
      ];

      const standings = calculateProvisionalStandings(users, games, liveScores, picks);
      expect(standings.length).toBe(2);
      expect(standings[0].provisionalRank).toBe(1);
      expect(standings[1].provisionalRank).toBe(1);
      expect(standings[0].isTied).toBe(true);
      expect(standings[1].isTied).toBe(true);
      expect(standings[0].totalProvisionalPoints).toBe(1);
      expect(standings[1].totalProvisionalPoints).toBe(1);
    });
  });

  // =========================================================================
  // Case 3: Request generation isolation & stale response cancellation
  // =========================================================================
  describe('Case 3: Request generation isolation & stale response cancellation', () => {
    it('proves rapid week switch on actual WallOfShamePage prevents slow earlier response from overwriting newer week', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      let resolveWeek6Matrix: any;
      const week6Promise = new Promise((r) => { resolveWeek6Matrix = r; });

      vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        const builder: any = {
          select: () => builder,
          eq: () => builder,
          maybeSingle: async () => ({ data: null, error: null }),
          then: (resolve: Function) => {
            if (table === 'pool_memberships') {
              resolve({
                data: [
                  { user_id: 'u1', role: 'MEMBER', users: { display_name: 'adambrickner' } },
                ],
                error: null,
              });
            } else {
              resolve({ data: [], error: null });
            }
          },
        };
        return builder;
      }) as any);

      vi.spyOn(apiClient, 'scopedExpressFetch').mockImplementation((async (url: string) => {
        if (url.includes('week_no=6')) {
          await week6Promise;
          return {
            ok: true,
            json: async () => ({ rows: [{ game_id: 'g6', home_team_id: 'KC', away_team_id: 'DEN', kickoff_time: '2026-10-18T17:00:00Z' }] }),
          } as any;
        }
        if (url.includes('week_no=7')) {
          return {
            ok: true,
            json: async () => ({ rows: [{ game_id: 'g7', home_team_id: 'PIT', away_team_id: 'NO', kickoff_time: '2026-10-25T17:00:00Z' }] }),
          } as any;
        }
        return { ok: false } as any;
      }) as any);

      vi.spyOn(liveScoreService, 'fetchLiveNFLScores').mockImplementation((async (week: number) => {
        if (week === 6) {
          return [{ id: 'g6', homeTeam: { code: 'KC', name: 'Chiefs', score: '30' }, awayTeam: { code: 'DEN', name: 'Broncos', score: '10' }, status: 'FINAL' }] as any;
        }
        const futureTime = new Date(Date.now() + 86400000).toISOString();
        return [{ id: 'g7', homeTeam: { code: 'PIT', name: 'Steelers' }, awayTeam: { code: 'NO', name: 'Saints' }, status: 'SCHEDULED', kickoffTime: futureTime }] as any;
      }) as any);

      // Mount Week 6
      await act(async () => {
        root.render(React.createElement(WallOfShamePage, { poolId: 'p-main', week: 6 }));
      });

      // Rapidly switch to Week 7 before Week 6 matrix finishes
      await act(async () => {
        root.render(React.createElement(WallOfShamePage, { poolId: 'p-main', week: 7 }));
      });

      // Let Week 6 resolve late
      resolveWeek6Matrix();
      await act(async () => {
        await new Promise((r) => setTimeout(r, 20));
      });

      // Must display Week 7, not overwritten by Week 6
      expect(container.textContent).toContain('WEEK 7');
      expect(container.textContent).not.toContain('WEEK 6 ·');

      await act(async () => {
        root.unmount();
      });
    });

    it('unmount cleanup invalidates in-flight requests and avoids state publications', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      setupWallMocks({
        matrixDelayMs: 50,
      });

      await act(async () => {
        root.render(React.createElement(WallOfShamePage, { poolId: 'p-main', week: 6 }));
      });

      // Unmount immediately while matrix query is in-flight
      await act(async () => {
        root.unmount();
      });

      // Wait past delay to confirm zero unhandled exceptions
      await act(async () => {
        await new Promise((r) => setTimeout(r, 70));
      });
    });
  });

  // =========================================================================
  // Case 4: Profile explicit vs configured scope precedence
  // =========================================================================
  describe('Case 4: Profile explicit vs configured scope precedence', () => {
    function createMockSupabase(params: {
      membershipSettings?: any;
      manifestRecord?: any;
      games?: any[];
      picks?: any[];
    }) {
      return {
        from: (table: string) => {
          const filters: Record<string, any> = {};

          const queryBuilder = {
            select: (cols?: string) => {
              if (cols && cols.includes('lock_offset')) {
                throw new Error(`UNSUPPORTED_COLUMN: 'lock_offset' queried in ${cols}`);
              }
              return queryBuilder;
            },
            eq: (col: string, val: any) => {
              filters[col] = val;
              return queryBuilder;
            },
            in: () => queryBuilder,
            order: () => queryBuilder,
            maybeSingle: async () => {
              if (table === 'pool_memberships') {
                return {
                  data: {
                    pool_id: filters.pool_id || 'p-main',
                    status: 'ACTIVE',
                    pools: { settings: params.membershipSettings || { season: 2026, season_type: 2, current_week: 6 } },
                  },
                  error: null,
                };
              }
              if (table === 'weekly_slate_manifests') {
                if (params.manifestRecord) {
                  return { data: params.manifestRecord, error: null };
                }
                return { data: null, error: null };
              }
              return { data: null, error: null };
            },
            then: (resolve: Function) => {
              if (table === 'pool_memberships') {
                resolve({
                  data: [{
                    pool_id: 'p-main',
                    status: 'ACTIVE',
                    pools: { settings: params.membershipSettings || { season: 2026, season_type: 2, current_week: 6 } },
                  }],
                  error: null,
                });
                return;
              }
              if (table === 'games') {
                resolve({ data: params.games || [], error: null });
                return;
              }
              if (table === 'picks') {
                resolve({ data: params.picks || [], error: null });
                return;
              }
              resolve({ data: [], error: null });
            },
          };
          return queryBuilder;
        },
      } as any;
    }

    it('resolves explicit propWeek 6 when configured pool current_week is 7', async () => {
      const sb = createMockSupabase({
        membershipSettings: { season: 2026, season_type: 2, current_week: 7 },
        manifestRecord: {
          season: 2026,
          season_type: 2,
          week_number: 6,
          event_ids: ['401872995'],
        },
        games: [
          { id: 'g1', external_game_id: '401872995', home_team_id: 'DEN', away_team_id: 'SEA', kickoff_time: '2026-10-18T17:00:00Z' },
        ],
      });

      const res = await resolveProfileReminderScope({
        userId: 'u1',
        propWeek: 6,
        supabaseClient: sb,
      });

      expect(res.hasAcceptedSlate).toBe(true);
      expect(res.resolvedScope?.week).toBe(6);
    });

    it('resolves configured pool current_week 6 when propWeek is absent', async () => {
      const sb = createMockSupabase({
        membershipSettings: { season: 2026, season_type: 2, current_week: 6 },
        manifestRecord: {
          season: 2026,
          season_type: 2,
          week_number: 6,
          event_ids: ['401872995'],
        },
        games: [
          { id: 'g1', external_game_id: '401872995', home_team_id: 'DEN', away_team_id: 'SEA', kickoff_time: '2026-10-18T17:00:00Z' },
        ],
      });

      const res = await resolveProfileReminderScope({
        userId: 'u1',
        supabaseClient: sb,
      });

      expect(res.hasAcceptedSlate).toBe(true);
      expect(res.resolvedScope?.week).toBe(6);
    });

    it('fails closed when scope cannot be resolved (null season or week)', async () => {
      const sb = createMockSupabase({
        membershipSettings: { season: null, season_type: 2, current_week: null },
      });

      const res = await resolveProfileReminderScope({
        userId: 'u1',
        supabaseClient: sb,
      });

      expect(res.hasAcceptedSlate).toBe(false);
      expect(res.unavailabilityReason).toBe('UNRESOLVED_SEASON_OR_WEEK_SCOPE');
    });

    it('formatNextKickoffLock returns Unavailable when weekNumber is null or games empty', () => {
      expect(formatNextKickoffLock([], null)).toBe('Unavailable');
      expect(formatNextKickoffLock([], 6)).toBe('Unavailable');
    });

    it('formatNextKickoffLock reports All Week N Games Locked only when all games verified in past', () => {
      const pastGames = [
        { id: 'g1', kickoffIso: '2026-10-15T00:00:00Z', isPicked: true },
        { id: 'g2', kickoffIso: '2026-10-16T00:00:00Z', isPicked: false },
      ];
      expect(formatNextKickoffLock(pastGames, 6)).toBe('All Week 6 Games Locked');
    });

    it('formatNextKickoffLock returns next upcoming kickoff deadline when future games exist', () => {
      const futureIso = new Date(Date.now() + 86400000).toISOString();
      const mixedGames = [
        { id: 'g1', kickoffIso: '2026-10-15T00:00:00Z', isPicked: true },
        { id: 'g2', kickoffIso: futureIso, isPicked: false },
      ];
      const text = formatNextKickoffLock(mixedGames, 7);
      expect(text).toContain('Week 7');
      expect(text).not.toContain('All Week 7 Games Locked');
    });

    it('formatNextKickoffLock incorporates lockOffsetMinutes into deadline lock evaluation', () => {
      const nowMs = new Date('2026-10-25T16:56:00Z').getTime();
      const futureKickoff = '2026-10-25T17:00:00Z'; // 4 minutes away
      const games = [{ id: 'g1', kickoffIso: futureKickoff, isPicked: false }];

      // With 5 minute offset, deadline has already passed 1 minute ago
      const lockedWithOffset = formatNextKickoffLock(games, 7, 5, nowMs);
      expect(lockedWithOffset).toBe('All Week 7 Games Locked');

      // With 0 minute offset, deadline is still upcoming
      const openWithoutOffset = formatNextKickoffLock(games, 7, 0, nowMs);
      expect(openWithoutOffset).toContain('Week 7');
      expect(openWithoutOffset).not.toBe('All Week 7 Games Locked');
    });
  });

  // =========================================================================
  // Case 5: Per-game lock and week in progress status
  // =========================================================================
  describe('Case 5: Per-game lock and week in progress status', () => {
    it('evaluates exact kickoff boundary correctly via evaluateCanonicalGameLock', () => {
      const kickoffIso = '2026-10-25T17:00:00Z';
      const kickoffMs = new Date(kickoffIso).getTime();

      // Exactly at kickoff deadline -> LOCKED
      const exactLock = evaluateCanonicalGameLock({ kickoffTime: kickoffIso }, 0, kickoffMs);
      expect(exactLock.isLocked).toBe(true);
      expect(exactLock.state).toBe('LOCKED');

      // 1000ms before kickoff deadline -> OPEN
      const beforeLock = evaluateCanonicalGameLock({ kickoffTime: kickoffIso }, 0, kickoffMs - 1000);
      expect(beforeLock.isLocked).toBe(false);
      expect(beforeLock.state).toBe('OPEN');

      // 1000ms after kickoff deadline -> LOCKED
      const afterLock = evaluateCanonicalGameLock({ kickoffTime: kickoffIso }, 0, kickoffMs + 1000);
      expect(afterLock.isLocked).toBe(true);
      expect(afterLock.state).toBe('LOCKED');
    });

    it('fails closed as UNAVAILABLE on unconfirmed or missing kickoff', () => {
      const unconfirmed = evaluateCanonicalGameLock({ kickoffTime: null, isKickoffConfirmed: false });
      expect(unconfirmed.state).toBe('UNAVAILABLE');
      expect(unconfirmed.isLocked).toBe(true);
      expect(unconfirmed.reason).toBe('UNVERIFIED_KICKOFF');
    });

    it('evaluates mixed slate with Thursday final and Sunday open into Week in progress', () => {
      const nowMs = new Date('2026-10-24T12:00:00Z').getTime(); // Saturday
      const slateGames = [
        { id: 'g-tnf', home_team_id: 'CHI', away_team_id: 'NE', kickoff_time: '2026-10-22T20:15:00Z', status: 'FINAL' },
        { id: 'g-sun', home_team_id: 'PIT', away_team_id: 'NO', kickoff_time: '2026-10-25T17:00:00Z', status: 'SCHEDULED' },
      ];
      const liveScores: LiveGame[] = [
        { id: 'g-tnf', name: 'NE @ CHI', shortName: 'NE @ CHI', homeTeam: { code: 'CHI', name: 'Bears', score: '30' }, awayTeam: { code: 'NE', name: 'Patriots', score: '24' }, status: 'FINAL', clock: 'FINAL', period: 4 },
        { id: 'g-sun', name: 'PIT @ NO', shortName: 'PIT @ NO', homeTeam: { code: 'NO', name: 'Saints' }, awayTeam: { code: 'PIT', name: 'Steelers' }, status: 'SCHEDULED', clock: '0:00', period: 1 },
      ];

      const summary = evaluateSlateLockSummary(slateGames, liveScores, 0, nowMs);
      expect(summary.openCount).toBe(1);
      expect(summary.lockedCount).toBe(1);
      expect(summary.phaseLabel).toBe('Week in progress');
      expect(summary.lockBadgeText).toBe('PICKS OPEN: 1');
      expect(summary.isBadgeOpen).toBe(true);
      expect(summary.allGamesFinal).toBe(false);
    });

    it('evaluates empty slate safely as Status unavailable without inferring all games final', () => {
      const summary = evaluateSlateLockSummary([], []);
      expect(summary.total).toBe(0);
      expect(summary.phaseLabel).toBe('Status unavailable');
      expect(summary.lockBadgeText).toBe('UNAVAILABLE');
      expect(summary.allGamesFinal).toBe(false);
    });
  });

  // =========================================================================
  // Case 6: Settlement separation from game outcome finality
  // =========================================================================
  describe('Case 6: Settlement separation from game outcome finality', () => {
    it('mounts actual WallOfShamePage with all final scores and unconfirmed settlement: shows settlement not confirmed badge', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      setupWallMocks({
        wrapup: null, // No authoritative weekly_wrapups settlement
        matrixRows: [
          { game_id: 'g1', home_team_id: 'KC', away_team_id: 'DEN', kickoff_time: '2026-10-18T17:00:00Z' },
        ],
        liveScores: [
          { id: 'g1', name: 'KC vs DEN', shortName: 'KC vs DEN', homeTeam: { code: 'KC', name: 'Chiefs', score: '24' }, awayTeam: { code: 'DEN', name: 'Broncos', score: '10' }, status: 'FINAL', clock: 'FINAL', period: 4 },
        ],
        picks: [
          { user_id: 'u1', game_id: 'g1', selected_team: 'KC', week: 6 },
          { user_id: 'u2', game_id: 'g1', selected_team: 'DEN', week: 6 },
        ],
      });

      await act(async () => {
        root.render(React.createElement(WallOfShamePage, { poolId: 'p-1', week: 6 }));
      });

      const text = container.textContent;
      expect(text).toContain('WEEK 6 FINAL · SETTLEMENT NOT CONFIRMED');
      expect(text).toContain('SETTLEMENT NOT CONFIRMED');
      expect(text).not.toContain('OFFICIAL SETTLED');

      await act(async () => {
        root.unmount();
      });
    });

    it('mounts actual WallOfShamePage with verified authoritative settlement summary: shows OFFICIAL SETTLED', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      setupWallMocks({
        wrapup: {
          pool_id: 'p-1',
          week_number: 6,
          completed_at: '2026-10-21T00:00:00Z',
          summary: {
            poolId: 'p-1',
            season: 2026,
            seasonType: 2,
            weekNumber: 6,
            standings: [
              { userId: 'u1', rank: 1, score: 10, shots: 0, isSafeHaven: true, isDeadPlace: false },
              { userId: 'u2', rank: 2, score: 6, shots: 2.5, isSafeHaven: false, isDeadPlace: true },
            ],
          },
        },
      });

      await act(async () => {
        root.render(React.createElement(WallOfShamePage, { poolId: 'p-1', week: 6 }));
      });

      const text = container.textContent;
      expect(text).toContain('OFFICIALLY SETTLED');
      expect(text).toContain('WEEK 6 · OFFICIAL SETTLED');
      expect(text).toContain('CLEARED (SAFE)');
      expect(text).toContain('DEAD PLACE');

      await act(async () => {
        root.unmount();
      });
    });
  });

  // =========================================================================
  // Case 7: Visible stale snapshot banner & elimination of fake countdown
  // =========================================================================
  describe('Case 7: Visible stale snapshot banner & elimination of fake countdown', () => {
    it('mounts WeeklyLadderView with isStale: true and displays visible warning banner with timestamp', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      const ladderMock = [
        {
          rank: 1,
          displayRank: '#1',
          userId: 'u1',
          userName: 'adambrickner',
          shots: '0.00 shots',
          penaltyShots: 0,
          status: 'CLEARED (SAFE)',
          fsmDisplayStatus: 'Safe Haven',
          tier: 'SAFE HAVEN',
        },
      ];

      await act(async () => {
        root.render(
          React.createElement(WeeklyLadderView, {
            ladder: ladderMock,
            status: 'READY',
            weekNumber: 6,
            isSettled: false,
            scoreStatus: 'ALL_GAMES_FINAL',
            isStale: true,
            observedAt: '2026-10-24T18:00:00.000Z',
          })
        );
      });

      const text = container.textContent;
      expect(text).toContain('DISPLAYING STALE SNAPSHOT');
      expect(text).toContain('Recorded');
      expect(text).not.toContain('3600*24');
      expect(text).not.toContain('Time Remaining');

      await act(async () => {
        root.unmount();
      });
    });
  });

  // =========================================================================
  // Case 8: Real Producer/Caller Contract Alignment (HOLD 8f4d4b0 Remediation)
  // =========================================================================
  describe('Case 8: Real Producer/Caller Contract Alignment (HOLD 8f4d4b0 Remediation)', () => {
    it('validates 1-to-1 internal/external identity mapping with distinct UUIDs and ESPN IDs', () => {
      const slateGames: SlateGame[] = [
        {
          id: 'b819f71c-3e3e-4b77-a859-6b3a00249c51', // internal UUID
          externalGameId: '401772648', // ESPN ID
          homeTeam: 'NE',
          awayTeam: 'CHI',
          kickoffTime: '2026-10-15T00:15:00Z',
        },
      ];
      const liveScores: LiveGame[] = [
        {
          id: '401772648',
          status: 'FINAL',
          homeTeam: { code: 'NE', score: '24' },
          awayTeam: { code: 'CHI', score: '30' },
        },
      ];

      // Telemetry coverage matches externalGameId
      const cov = validateTelemetryCoverage(slateGames, liveScores);
      expect(cov.isReady).toBe(true);
      expect(cov.isIncomplete).toBe(false);

      // Picks use internal UUID
      const users: UserStandingRef[] = [
        { id: 'u1', name: 'Member CHI' },
        { id: 'u2', name: 'Member NE' },
      ];
      const picks: UserPickItem[] = [
        { userId: 'u1', gameId: 'b819f71c-3e3e-4b77-a859-6b3a00249c51', selectedTeam: 'CHI', isSubmitted: true },
        { userId: 'u2', gameId: 'b819f71c-3e3e-4b77-a859-6b3a00249c51', selectedTeam: 'NE', isSubmitted: true },
      ];

      const standings = calculateProvisionalStandings(users, slateGames, liveScores, picks);
      expect(standings.standings[0].userId).toBe('u1');
      expect(standings.standings[0].totalProvisionalPoints).toBe(1);
      expect(standings.standings[0].provisionalRank).toBe(1);
      expect(standings.standings[1].userId).toBe('u2');
      expect(standings.standings[1].totalProvisionalPoints).toBe(0);
      expect(standings.standings[1].provisionalRank).toBe(2);
    });

    it('rejects duplicate slate game IDs with DUPLICATE_SLATE_GAME_ID', () => {
      const slateGames: SlateGame[] = [
        { id: 'game-uuid-1', externalGameId: 'espn-1', homeTeam: 'NE', awayTeam: 'CHI', kickoffTime: '2026-10-15T00:15:00Z' },
        { id: 'game-uuid-1', externalGameId: 'espn-2', homeTeam: 'KC', awayTeam: 'BAL', kickoffTime: '2026-10-15T00:15:00Z' },
      ];
      const liveScores: LiveGame[] = [
        { id: 'espn-1', status: 'FINAL', homeTeam: { code: 'NE', score: '24' }, awayTeam: { code: 'CHI', score: '30' } },
        { id: 'espn-2', status: 'FINAL', homeTeam: { code: 'KC', score: '27' }, awayTeam: { code: 'BAL', score: '20' } },
      ];
      const cov = validateTelemetryCoverage(slateGames, liveScores);
      expect(cov.isReady).toBe(false);
      expect(cov.isIncomplete).toBe(true);
      expect(cov.reason).toBe('DUPLICATE_SLATE_GAME_ID');
    });

    it('consumes real tiebreaker endpoint DTO with readiness array and derives designated game score', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      setupWallMocks({
        matrixRows: [
          { game_id: 'g-uuid-1', external_game_id: '401772648', home_team_id: 'NE', away_team_id: 'CHI', kickoff_time: '2026-10-15T00:15:00Z' },
        ],
        liveScores: [
          { id: '401772648', status: 'FINAL', homeTeam: { code: 'NE', score: '24' }, awayTeam: { code: 'CHI', score: '30' } },
        ],
        picks: [
          { user_id: 'u1', game_id: 'g-uuid-1', selected_team: 'CHI' },
          { user_id: 'u2', game_id: 'g-uuid-1', selected_team: 'CHI' },
        ],
        tiebreakerResponse: {
          status: 'DEFAULT_LIONS',
          tiebreakerOffered: true,
          eventId: '401772648',
          readiness: [
            { userId: 'u1', prediction: 54 }, // exact match 24+30=54
            { userId: 'u2', prediction: 40 }, // distance 14
          ],
        },
      });

      await act(async () => {
        root.render(
          React.createElement(WallOfShamePage, {
            poolId: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
            season: 2026,
            seasonType: 2,
            week: 7,
          })
        );
      });

      const text = container.textContent;
      expect(text).toContain('WEEK 7');
      expect(text).toContain('adambrickner');
      expect(text).toContain('smoke_test_runner');

      await act(async () => {
        root.unmount();
      });
    });

    it('fails closed to INCOMPLETE_TELEMETRY when tiebreaker fetch fails on non-Week-6', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      setupWallMocks({
        matrixRows: [
          { game_id: 'g-uuid-1', external_game_id: '401772648', home_team_id: 'NE', away_team_id: 'CHI', kickoff_time: '2026-10-15T00:15:00Z' },
        ],
        liveScores: [
          { id: '401772648', status: 'FINAL', homeTeam: { code: 'NE', score: '24' }, awayTeam: { code: 'CHI', score: '30' } },
        ],
        picks: [
          { user_id: 'u1', game_id: 'g-uuid-1', selected_team: 'CHI' },
        ],
        tiebreakerShouldFail: true,
      });

      await act(async () => {
        root.render(
          React.createElement(WallOfShamePage, {
            poolId: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
            season: 2026,
            seasonType: 2,
            week: 7,
          })
        );
      });

      const text = container.textContent;
      expect(text).toContain('INCOMPLETE GAME TELEMETRY');
      expect(text).toContain('Tiebreaker data could not be verified for this week.');
      expect(text).not.toContain('PROJECTED SAFE');

      await act(async () => {
        root.unmount();
      });
    });

    it('validates settlement scope and displays DANGER_HIGH for 2-shot tier', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      const validWrapup = {
        pool_id: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
        week_number: 6,
        completed_at: '2026-10-24T18:00:00.000Z',
        summary: {
          poolId: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
          season: 2026,
          seasonType: 2,
          weekNumber: 6,
          standings: [
            { userId: 'u1', rank: 1, score: 10, shots: 0, isSafeHaven: true, isDeadPlace: false },
            { userId: 'u2', rank: 2, score: 7, shots: 2, isSafeHaven: false, isDeadPlace: false },
          ],
        },
      };

      setupWallMocks({
        wrapup: validWrapup,
      });

      await act(async () => {
        root.render(
          React.createElement(WallOfShamePage, {
            poolId: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
            season: 2026,
            seasonType: 2,
            week: 6,
          })
        );
      });

      const text = container.textContent;
      expect(text).toContain('OFFICIALLY SETTLED');
      expect(text).toContain('CLEARED (SAFE)');
      expect(text).toContain('2 SHOTS');

      await act(async () => {
        root.unmount();
      });
    });

    it('rejects settlement when summary scope does not match requested scope', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      const mismatchedWrapup = {
        pool_id: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
        week_number: 6,
        completed_at: '2026-10-24T18:00:00.000Z',
        summary: {
          poolId: 'different-pool-id', // mismatch
          season: 2026,
          seasonType: 2,
          weekNumber: 6,
          standings: [
            { userId: 'u1', rank: 1, score: 10, shots: 0, isSafeHaven: true, isDeadPlace: false },
          ],
        },
      };

      setupWallMocks({
        wrapup: mismatchedWrapup,
        matrixRows: [
          { game_id: 'g-uuid-1', external_game_id: '401772648', home_team_id: 'NE', away_team_id: 'CHI', kickoff_time: '2026-10-15T00:15:00Z' },
        ],
        liveScores: [
          { id: '401772648', status: 'FINAL', homeTeam: { code: 'NE', score: '24' }, awayTeam: { code: 'CHI', score: '30' } },
        ],
        picks: [{ user_id: 'u1', game_id: 'g-uuid-1', selected_team: 'CHI' }],
      });

      await act(async () => {
        root.render(
          React.createElement(WallOfShamePage, {
            poolId: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
            season: 2026,
            seasonType: 2,
            week: 6,
          })
        );
      });

      const text = container.textContent;
      expect(text).not.toContain('OFFICIALLY SETTLED');
      expect(text).toContain('SETTLEMENT NOT CONFIRMED');

      await act(async () => {
        root.unmount();
      });
    });

    it('separates lock offset from game progress in evaluateSlateLockSummary', () => {
      // Future scheduled game whose kickoff is in 10 minutes, inside 15-minute lock offset
      const now = new Date('2026-10-18T16:50:00Z').getTime();
      const futureGame = {
        id: 'future-game-1',
        kickoffTime: '2026-10-18T17:00:00Z', // 10 min away
        status: 'SCHEDULED',
      };

      const summary = evaluateSlateLockSummary([futureGame], [], 15, now);
      expect(summary.lockedCount).toBe(1);
      expect(summary.openCount).toBe(0);
      expect(summary.anyStartedOrFinal).toBe(false); // Game has NOT started!
      expect(summary.phaseLabel).toBe('Games not started');
    });

    it('evaluates mixed locked and unavailable games as UNAVAILABLE rather than all locked', () => {
      const now = new Date('2026-10-18T18:00:00Z').getTime();
      const games = [
        { id: 'locked-game', kickoffTime: '2026-10-18T17:00:00Z', status: 'FINAL' }, // locked
        { id: 'unconfirmed-game', canonical_kickoff_time: null, kickoffTime: null }, // unavailable
      ];

      const summary = evaluateSlateLockSummary(games, [], 0, now);
      expect(summary.allGamesLocked).toBe(false);
      expect(summary.lockBadgeText).toBe('UNAVAILABLE');
    });

    it('enforces canonical unknown denial on explicit canonical NULL in evaluateCanonicalGameLock', () => {
      const evalResult = evaluateCanonicalGameLock({
        canonical_kickoff_time: null,
        kickoffTime: '2026-10-30T20:00:00Z', // display kickoff exists but canonical is null
      });

      expect(evalResult.state).toBe('UNAVAILABLE');
      expect(evalResult.isLocked).toBe(true);
      expect(evalResult.reason).toBe('UNVERIFIED_KICKOFF');
    });

    it('subtracts pool lock offset from stored effective deadline (lock_effective_at) at exact boundaries', () => {
      // Effective kickoff is 17:00:00Z, with 15-minute pool offset -> lock deadline is 16:45:00Z
      const effectiveKickoff = '2026-10-18T17:00:00.000Z';
      const lockDeadlineMs = new Date('2026-10-18T16:45:00.000Z').getTime();

      // 1 ms before boundary
      const before = evaluateCanonicalGameLock(
        { lock_effective_at: effectiveKickoff, isKickoffConfirmed: true },
        15,
        lockDeadlineMs - 1
      );
      expect(before.state).toBe('OPEN');
      expect(before.isLocked).toBe(false);

      // Exact boundary
      const exact = evaluateCanonicalGameLock(
        { lock_effective_at: effectiveKickoff, isKickoffConfirmed: true },
        15,
        lockDeadlineMs
      );
      expect(exact.state).toBe('LOCKED');
      expect(exact.isLocked).toBe(true);

      // 1 ms after boundary
      const after = evaluateCanonicalGameLock(
        { lock_effective_at: effectiveKickoff, isKickoffConfirmed: true },
        15,
        lockDeadlineMs + 1
      );
      expect(after.state).toBe('LOCKED');
      expect(after.isLocked).toBe(true);
    });

    it('honors flexed earlier lock_effective_at over display kickoff_time', () => {
      const game = {
        kickoff_time: '2026-10-18T20:00:00.000Z',
        lock_effective_at: '2026-10-18T17:00:00.000Z', // flexed 3 hours earlier
        isKickoffConfirmed: true,
      };

      // Reference time is 17:00:01Z with 0 offset: locked by effective deadline even though display kickoff is 20:00Z
      const evalResult = evaluateCanonicalGameLock(game, 0, new Date('2026-10-18T17:00:01.000Z'));
      expect(evalResult.state).toBe('LOCKED');
      expect(evalResult.isLocked).toBe(true);
    });

    it('Profile resolveProfileReminderScope selects canonical_kickoff_time and lock_effective_at and carries to windowGames', async () => {
      const mockSb = {
        from: (table: string) => {
          const builder: any = {
            select: (cols?: string) => {
              if (cols && cols.includes('lock_offset')) {
                throw new Error(`UNSUPPORTED_COLUMN: 'lock_offset' queried in ${cols}`);
              }
              return builder;
            },
            eq: () => builder,
            in: () => builder,
            order: () => builder,
            maybeSingle: async () => {
              if (table === 'pool_memberships') {
                return {
                  data: {
                    pool_id: 'p-1',
                    status: 'ACTIVE',
                    pools: {
                      id: 'p-1',
                      settings: { season: 2026, season_type: 2, current_week: 7, lockOffset: 15 },
                    },
                  },
                  error: null,
                };
              }
              if (table === 'weekly_slate_manifests') {
                return {
                  data: {
                    season: 2026,
                    season_type: 2,
                    week_number: 7,
                    event_ids: ['401872995'],
                  },
                  error: null,
                };
              }
              return { data: null, error: null };
            },
            then: (resolve: Function) => {
              if (table === 'games') {
                resolve({
                  data: [
                    {
                      id: 'g-internal-uuid',
                      external_game_id: '401872995',
                      home_team_id: 'DEN',
                      away_team_id: 'SEA',
                      kickoff_time: '2026-10-18T20:00:00Z',
                      canonical_kickoff_time: '2026-10-18T20:00:00Z',
                      lock_effective_at: '2026-10-18T17:00:00Z',
                      status: 'SCHEDULED',
                    },
                  ],
                  error: null,
                });
              } else if (table === 'picks') {
                resolve({ data: [], error: null });
              } else {
                resolve({ data: [], error: null });
              }
            },
          };
          return builder;
        },
      };

      const res = await resolveProfileReminderScope({
        userId: 'u1',
        propPoolId: 'p-1',
        supabaseClient: mockSb as any,
      });

      expect(res.hasAcceptedSlate).toBe(true);
      expect(res.poolLockOffset).toBe(15);
      expect(res.windowGames[0].canonical_kickoff_time).toBe('2026-10-18T20:00:00Z');
      expect(res.windowGames[0].lock_effective_at).toBe('2026-10-18T17:00:00Z');
    });

    it('WallOfShamePage distinguishes live designated game from final designated game for tiebreaker ranking', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      // Both u1 and u2 picked the winning team NE in game 1.
      // u1 predicted 45, u2 predicted 55 for tiebreaker event 401772648.
      // In first render, tiebreaker event 401772648 is IN_PROGRESS (live score 24-20 = 44).
      setupWallMocks({
        matrixRows: [
          { game_id: 'g-uuid-1', external_game_id: '401772648', home_team_id: 'NE', away_team_id: 'CHI', kickoff_time: '2026-10-15T00:15:00Z' },
        ],
        liveScores: [
          { id: '401772648', status: 'IN_PROGRESS', homeTeam: { code: 'NE', score: '24' }, awayTeam: { code: 'CHI', score: '20' } },
        ],
        picks: [
          { user_id: 'u1', game_id: 'g-uuid-1', selected_team: 'NE' },
          { user_id: 'u2', game_id: 'g-uuid-1', selected_team: 'NE' },
        ],
        tiebreakerResponse: {
          status: 'DEFAULT_LIONS',
          tiebreakerOffered: true,
          eventId: '401772648',
          readiness: [
            { userId: 'u1', prediction: 45 },
            { userId: 'u2', prediction: 55 },
          ],
        },
      });

      await act(async () => {
        root.render(
          React.createElement(WallOfShamePage, {
            key: 'live',
            poolId: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
            season: 2026,
            seasonType: 2,
            week: 7,
          })
        );
      });

      let text = container.textContent;
      // When live, tiebreaker score is not final so provisional ties are preserved
      expect(text).toContain('GAMES LIVE');
      expect(text).toContain('T-#1'); // both members tied at rank 1

      // Now game finishes and is FINAL with total 45 (NE 24, CHI 21)
      setupWallMocks({
        matrixRows: [
          { game_id: 'g-uuid-1', external_game_id: '401772648', home_team_id: 'NE', away_team_id: 'CHI', kickoff_time: '2026-10-15T00:15:00Z' },
        ],
        liveScores: [
          { id: '401772648', status: 'FINAL', homeTeam: { code: 'NE', score: '24' }, awayTeam: { code: 'CHI', score: '21' } },
        ],
        picks: [
          { user_id: 'u1', game_id: 'g-uuid-1', selected_team: 'NE' },
          { user_id: 'u2', game_id: 'g-uuid-1', selected_team: 'NE' },
        ],
        tiebreakerResponse: {
          status: 'DEFAULT_LIONS',
          tiebreakerOffered: true,
          eventId: '401772648',
          readiness: [
            { userId: 'u1', prediction: 45 },
            { userId: 'u2', prediction: 55 },
          ],
        },
      });

      await act(async () => {
        root.render(
          React.createElement(WallOfShamePage, {
            key: 'final',
            poolId: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
            season: 2026,
            seasonType: 2,
            week: 7,
          })
        );
      });

      text = container.textContent;
      // u1 (distance 0) should be #1, u2 (distance 10) should be #2
      expect(text).toContain('#1');
      expect(text).toContain('#2');

      await act(async () => {
        root.unmount();
      });
    });

    it('WallOfShamePage fails closed to INCOMPLETE_TELEMETRY when tiebreaker designation is UNRESOLVED or readiness incomplete', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      setupWallMocks({
        matrixRows: [
          { game_id: 'g-uuid-1', external_game_id: '401772648', home_team_id: 'NE', away_team_id: 'CHI', kickoff_time: '2026-10-15T00:15:00Z' },
        ],
        liveScores: [
          { id: '401772648', status: 'FINAL', homeTeam: { code: 'NE', score: '24' }, awayTeam: { code: 'CHI', score: '30' } },
        ],
        tiebreakerResponse: {
          status: 'UNRESOLVED',
          tiebreakerOffered: false,
          readiness: [],
        },
      });

      await act(async () => {
        root.render(
          React.createElement(WallOfShamePage, {
            poolId: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
            season: 2026,
            seasonType: 2,
            week: 7,
          })
        );
      });

      let text = container.textContent;
      expect(text).toContain('INCOMPLETE GAME TELEMETRY');
      expect(text).toContain('Tiebreaker designation is unresolved for this week.');

      await act(async () => {
        root.unmount();
      });
    });

    it('Profile resolveProfileReminderScope handles settings alias precedence and fails closed on missing settings', async () => {
      // 1. Precedence: lock_offset takes precedence over lockOffset
      const sbPrecedence = {
        from: () => ({
          select: (cols?: string) => {
            if (cols && cols.includes('lock_offset')) throw new Error('UNSUPPORTED_COLUMN');
            return sbPrecedence.from();
          },
          eq: () => sbPrecedence.from(),
          in: () => sbPrecedence.from(),
          order: () => sbPrecedence.from(),
          maybeSingle: async () => ({
            data: {
              pool_id: 'p-1',
              status: 'ACTIVE',
              pools: { id: 'p-1', settings: { season: 2026, season_type: 2, current_week: 7, lock_offset: 20, lockOffset: 10 } },
            },
            error: null,
          }),
          then: (res: Function) => res({ data: [], error: null }),
        }),
      };
      const resPrecedence = await resolveProfileReminderScope({
        userId: 'u1',
        propPoolId: 'p-1',
        supabaseClient: sbPrecedence as any,
      });
      expect(resPrecedence.poolLockOffset).toBe(20);

      // 2. Fallback to lockOffset alias when lock_offset absent
      const sbAlias = {
        from: () => ({
          select: (cols?: string) => {
            if (cols && cols.includes('lock_offset')) throw new Error('UNSUPPORTED_COLUMN');
            return sbAlias.from();
          },
          eq: () => sbAlias.from(),
          in: () => sbAlias.from(),
          order: () => sbAlias.from(),
          maybeSingle: async () => ({
            data: {
              pool_id: 'p-1',
              status: 'ACTIVE',
              pools: { id: 'p-1', settings: { season: 2026, season_type: 2, current_week: 7, lockOffset: 15 } },
            },
            error: null,
          }),
          then: (res: Function) => res({ data: [], error: null }),
        }),
      };
      const resAlias = await resolveProfileReminderScope({
        userId: 'u1',
        propPoolId: 'p-1',
        supabaseClient: sbAlias as any,
      });
      expect(resAlias.poolLockOffset).toBe(15);

      // 3. Fails closed when pool settings is missing/corrupt (does NOT default to offset 0)
      const sbMissingSettings = {
        from: () => ({
          select: (cols?: string) => {
            if (cols && cols.includes('lock_offset')) throw new Error('UNSUPPORTED_COLUMN');
            return sbMissingSettings.from();
          },
          eq: () => sbMissingSettings.from(),
          in: () => sbMissingSettings.from(),
          order: () => sbMissingSettings.from(),
          maybeSingle: async () => ({
            data: {
              pool_id: 'p-1',
              status: 'ACTIVE',
              pools: { id: 'p-1', settings: null },
            },
            error: null,
          }),
          then: (res: Function) => res({ data: [], error: null }),
        }),
      };
      const resMissing = await resolveProfileReminderScope({
        userId: 'u1',
        propPoolId: 'p-1',
        supabaseClient: sbMissingSettings as any,
      });
      expect(resMissing.hasAcceptedSlate).toBe(false);
      expect(resMissing.unavailabilityReason).toBe('POOL_SETTINGS_UNAVAILABLE');

      // 4. Fails closed when lock offset is negative or NaN
      const sbInvalidOffset = {
        from: () => ({
          select: (cols?: string) => {
            if (cols && cols.includes('lock_offset')) throw new Error('UNSUPPORTED_COLUMN');
            return sbInvalidOffset.from();
          },
          eq: () => sbInvalidOffset.from(),
          in: () => sbInvalidOffset.from(),
          order: () => sbInvalidOffset.from(),
          maybeSingle: async () => ({
            data: {
              pool_id: 'p-1',
              status: 'ACTIVE',
              pools: { id: 'p-1', settings: { season: 2026, season_type: 2, current_week: 7, lock_offset: -10 } },
            },
            error: null,
          }),
          then: (res: Function) => res({ data: [], error: null }),
        }),
      };
      const resInvalid = await resolveProfileReminderScope({
        userId: 'u1',
        propPoolId: 'p-1',
        supabaseClient: sbInvalidOffset as any,
      });
      expect(resInvalid.hasAcceptedSlate).toBe(false);
      expect(resInvalid.unavailabilityReason).toBe('INVALID_POOL_LOCK_OFFSET');
    });

    it('WallOfShamePage fails closed to INCOMPLETE_TELEMETRY on empty {} TB response and missing/invalid status', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      // 1. Empty object {}
      setupWallMocks({
        matrixRows: [
          { game_id: 'g-uuid-1', external_game_id: '401772648', home_team_id: 'NE', away_team_id: 'CHI', kickoff_time: '2026-10-15T00:15:00Z' },
        ],
        liveScores: [
          { id: '401772648', status: 'FINAL', homeTeam: { code: 'NE', score: '24' }, awayTeam: { code: 'CHI', score: '30' } },
        ],
        tiebreakerResponse: {},
      });

      await act(async () => {
        root.render(
          React.createElement(WallOfShamePage, {
            poolId: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
            season: 2026,
            seasonType: 2,
            week: 7,
          })
        );
      });

      expect(container.textContent).toContain('INCOMPLETE GAME TELEMETRY');
      expect(container.textContent).toContain('Unknown or missing tiebreaker status/offered telemetry.');

      // 2. tiebreakerOffered false with missing/unknown status (bypassing validation attempt)
      setupWallMocks({
        matrixRows: [
          { game_id: 'g-uuid-1', external_game_id: '401772648', home_team_id: 'NE', away_team_id: 'CHI', kickoff_time: '2026-10-15T00:15:00Z' },
        ],
        liveScores: [
          { id: '401772648', status: 'FINAL', homeTeam: { code: 'NE', score: '24' }, awayTeam: { code: 'CHI', score: '30' } },
        ],
        tiebreakerResponse: { tiebreakerOffered: false, status: 'UNKNOWN' },
      });

      await act(async () => {
        root.render(
          React.createElement(WallOfShamePage, {
            poolId: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
            season: 2026,
            seasonType: 2,
            week: 7,
          })
        );
      });

      expect(container.textContent).toContain('INCOMPLETE GAME TELEMETRY');

      await act(async () => {
        root.unmount();
      });
    });

    it('WallOfShamePage fails closed on duplicate member rows or malformed prediction values', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      // 1. Duplicate member rows in readiness array
      setupWallMocks({
        matrixRows: [
          { game_id: 'g-uuid-1', external_game_id: '401772648', home_team_id: 'NE', away_team_id: 'CHI', kickoff_time: '2026-10-15T00:15:00Z' },
        ],
        liveScores: [
          { id: '401772648', status: 'FINAL', homeTeam: { code: 'NE', score: '24' }, awayTeam: { code: 'CHI', score: '30' } },
        ],
        tiebreakerResponse: {
          status: 'DEFAULT_LIONS',
          tiebreakerOffered: true,
          eventId: '401772648',
          readiness: [
            { userId: 'u1', prediction: 45 },
            { userId: 'u1', prediction: 50 }, // Duplicate user row
          ],
        },
      });

      await act(async () => {
        root.render(
          React.createElement(WallOfShamePage, {
            poolId: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
            season: 2026,
            seasonType: 2,
            week: 7,
          })
        );
      });

      expect(container.textContent).toContain('INCOMPLETE GAME TELEMETRY');
      expect(container.textContent).toContain('Duplicate member row in tiebreaker readiness.');

      await act(async () => {
        root.unmount();
      });

      // 2. Malformed non-numeric prediction (e.g. string or boolean)
      const container2 = mockDoc.createElement('div');
      const root2 = createRoot(container2 as any);

      setupWallMocks({
        matrixRows: [
          { game_id: 'g-uuid-1', external_game_id: '401772648', home_team_id: 'NE', away_team_id: 'CHI', kickoff_time: '2026-10-15T00:15:00Z' },
        ],
        liveScores: [
          { id: '401772648', status: 'FINAL', homeTeam: { code: 'NE', score: '24' }, awayTeam: { code: 'CHI', score: '30' } },
        ],
        tiebreakerResponse: {
          status: 'DEFAULT_LIONS',
          tiebreakerOffered: true,
          eventId: '401772648',
          readiness: [
            { userId: 'u1', prediction: false }, // boolean false -> cannot coerce to 0
            { userId: 'u2', prediction: 45 },
          ],
        },
      });

      await act(async () => {
        root2.render(
          React.createElement(WallOfShamePage, {
            poolId: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
            season: 2026,
            seasonType: 2,
            week: 7,
          })
        );
      });

      expect(container2.textContent).toContain('INCOMPLETE GAME TELEMETRY');
      expect(container2.textContent).toContain('Malformed tiebreaker prediction value encountered.');

      await act(async () => {
        root2.unmount();
      });
    });

    it('WallOfShamePage rejects malformed matrix cell shapes and safely falls back to authoritative resolver + DB picks', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      // Producer cell is null: cannot manufacture zero-point safe standing; must fall back to authoritative resolver
      setupWallMocks({
        matrixRows: [
          { game_id: 'g-uuid-1', external_game_id: '401772648', home_team_id: 'NE', away_team_id: 'CHI', kickoff_time: '2026-10-15T00:15:00Z' },
        ],
        matrixCells: {
          'g-uuid-1': {
            u1: null, // Malformed null cell
            u2: { pick_id: 'p-2', selected_team_id: 'CHI' },
          },
        },
        dbGames: [
          {
            id: 'g-uuid-1',
            external_game_id: '401772648',
            home_team_id: 'NE',
            away_team_id: 'CHI',
            kickoff_time: '2026-10-15T00:15:00Z',
          },
        ],
        liveScores: [
          { id: '401772648', status: 'FINAL', homeTeam: { code: 'NE', score: '24' }, awayTeam: { code: 'CHI', score: '30' } },
        ],
        picks: [
          { user_id: 'u1', game_id: 'g-uuid-1', selected_team: 'NE' },
          { user_id: 'u2', game_id: 'g-uuid-1', selected_team: 'CHI' },
        ],
      });

      await act(async () => {
        root.render(
          React.createElement(WallOfShamePage, {
            poolId: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
            season: 2026,
            seasonType: 2,
            week: 7,
          })
        );
      });

      const text = container.textContent;
      // Authoritative fallback correctly loaded picks from DB: u2 selected CHI (winner), u1 selected NE
      expect(text).toContain('adambrickner');
      expect(text).toContain('smoke_test_runner');
      expect(text).not.toContain('INCOMPLETE GAME TELEMETRY');

      await act(async () => {
        root.unmount();
      });
    });

    it('WallOfShamePage scope transition (week 6 -> 7) on same mount clears settlement header immediately during loading and publishes error', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      // 1. Initial settled state
      setupWallMocks({
        wrapup: {
          pool_id: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
          week_number: 6,
          completed_at: '2026-10-24T18:00:00Z',
          summary: {
            poolId: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
            season: 2026,
            seasonType: 2,
            weekNumber: 6,
            standings: [
              { userId: 'u1', rank: 1, score: 10, shots: 0, isSafeHaven: true, isDeadPlace: false },
            ],
          },
        },
      });

      await act(async () => {
        root.render(
          React.createElement(WallOfShamePage, {
            poolId: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
            season: 2026,
            seasonType: 2,
            week: 6,
          })
        );
      });

      expect(container.textContent).toContain('OFFICIALLY SETTLED');

      // 2. Refresh/retry on the SAME instance with controlled delayed membership error
      setupWallMocks({
        membersDelayMs: 60,
        membersError: new Error('Simulated network failure'),
      });

      // Update same instance (same React key / element structure) to trigger reload
      let renderPromise: Promise<void>;
      act(() => {
        renderPromise = new Promise(async (resolve) => {
          root.render(
            React.createElement(WallOfShamePage, {
              poolId: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
              season: 2026,
              seasonType: 2,
              week: 7, // Week switch on same instance
            })
          );
          resolve();
        });
      });

      // Assert DURING loading (membership delay in-flight):
      // Settled header must be cleared immediately, not retained
      expect(container.textContent).not.toContain('OFFICIALLY SETTLED');

      // Wait for delay and error publication
      await act(async () => {
        await new Promise((r) => setTimeout(r, 80));
      });

      expect(container.textContent).not.toContain('OFFICIALLY SETTLED');
      expect(container.textContent).toContain('Failed to retrieve active pool memberships.');

      await act(async () => {
        root.unmount();
      });
    });

    it('WallOfShamePage same-scope retry recovery interaction recovers from error and renders valid ladder', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      // 1. Initial failed state on Week 7
      setupWallMocks({
        membersError: new Error('Network connection timeout'),
      });

      await act(async () => {
        root.render(
          React.createElement(WallOfShamePage, {
            poolId: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
            season: 2026,
            seasonType: 2,
            week: 7,
          })
        );
      });

      expect(container.textContent).toContain('Failed to retrieve active pool memberships.');
      expect(container.textContent).toContain('RETRY');

      // 2. Recovery on same mount: reconfigure mocks to succeed
      setupWallMocks({
        matrixRows: [
          { game_id: 'g-uuid-1', external_game_id: '401772648', home_team_id: 'NE', away_team_id: 'CHI', kickoff_time: '2026-10-15T00:15:00Z' },
        ],
        liveScores: [
          { id: '401772648', status: 'FINAL', homeTeam: { code: 'NE', score: '24' }, awayTeam: { code: 'CHI', score: '30' } },
        ],
        picks: [
          { user_id: 'u1', game_id: 'g-uuid-1', selected_team: 'CHI' },
          { user_id: 'u2', game_id: 'g-uuid-1', selected_team: 'CHI' },
        ],
        tiebreakerResponse: {
          status: 'DEFAULT_LIONS',
          tiebreakerOffered: true,
          eventId: '401772648',
          readiness: [
            { userId: 'u1', prediction: 54 },
            { userId: 'u2', prediction: 40 },
          ],
        },
      });

      // Find retry button
      const retryBtn = container.querySelectorAll('button').find((b: any) => b.textContent.includes('RETRY'));
      expect(retryBtn).toBeDefined();
      const reactPropsKey = Object.keys(retryBtn!).find((k) => k.startsWith('__reactProps$'));
      expect(reactPropsKey).toBeDefined();

      await act(async () => {
        (retryBtn as any)[reactPropsKey!].onClick();
      });

      // After recovery, ladder renders with differentiated ranks
      expect(container.textContent).not.toContain('Failed to retrieve active pool memberships.');
      expect(container.textContent).toContain('adambrickner');
      expect(container.textContent).toContain('#1');

      await act(async () => {
        root.unmount();
      });
    });

    it('binds tiebreaker consumer status contract to authoritative DesignationStatus producer enum', () => {
      const validProducerStatuses: DesignationStatus[] = [
        'DEFAULT_LIONS',
        'COMMISSIONER_OVERRIDE',
        'COMMISSIONER_SELECTION_REQUIRED',
        'UNRESOLVED',
      ];
      const validConsumerStatuses = [...validProducerStatuses, 'UNAVAILABLE'];

      const inventedStatuses = ['DEFAULT', 'OVERRIDDEN', 'UNKNOWN', 'RESOLVED'];
      inventedStatuses.forEach((status) => {
        expect(validConsumerStatuses).not.toContain(status);
      });
    });

    it('WallOfShamePage processes COMMISSIONER_OVERRIDE with verified readiness to differentiated ranked output', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      setupWallMocks({
        matrixRows: [
          { game_id: 'g-uuid-1', external_game_id: '401772648', home_team_id: 'NE', away_team_id: 'CHI', kickoff_time: '2026-10-15T00:15:00Z' },
        ],
        liveScores: [
          { id: '401772648', status: 'FINAL', homeTeam: { code: 'NE', score: '24' }, awayTeam: { code: 'CHI', score: '30' } },
        ],
        picks: [
          { user_id: 'u1', game_id: 'g-uuid-1', selected_team: 'CHI' },
          { user_id: 'u2', game_id: 'g-uuid-1', selected_team: 'CHI' },
        ],
        tiebreakerResponse: {
          status: 'COMMISSIONER_OVERRIDE',
          tiebreakerOffered: true,
          eventId: '401772648',
          readiness: [
            { userId: 'u1', prediction: 54 }, // exact match (distance 0)
            { userId: 'u2', prediction: 40 }, // distance 14
          ],
        },
      });

      await act(async () => {
        root.render(
          React.createElement(WallOfShamePage, {
            poolId: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
            season: 2026,
            seasonType: 2,
            week: 7,
          })
        );
      });

      const text = container.textContent;
      expect(text).toContain('WEEK 7');
      expect(text).toContain('adambrickner');
      expect(text).toContain('#1');
      expect(text).toContain('#2');

      await act(async () => {
        root.unmount();
      });
    });

    it('WallOfShamePage fails closed when tiebreaker status is COMMISSIONER_SELECTION_REQUIRED', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      setupWallMocks({
        matrixRows: [
          { game_id: 'g-uuid-1', external_game_id: '401772648', home_team_id: 'NE', away_team_id: 'CHI', kickoff_time: '2026-10-15T00:15:00Z' },
        ],
        liveScores: [
          { id: '401772648', status: 'FINAL', homeTeam: { code: 'NE', score: '24' }, awayTeam: { code: 'CHI', score: '30' } },
        ],
        tiebreakerResponse: {
          status: 'COMMISSIONER_SELECTION_REQUIRED',
          tiebreakerOffered: true,
          eventId: null,
          readiness: [],
        },
      });

      await act(async () => {
        root.render(
          React.createElement(WallOfShamePage, {
            poolId: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
            season: 2026,
            seasonType: 2,
            week: 7,
          })
        );
      });

      expect(container.textContent).toContain('INCOMPLETE GAME TELEMETRY');
      expect(container.textContent).toContain('Commissioner selection is required for this week tiebreaker.');

      await act(async () => {
        root.unmount();
      });
    });

    it('WallOfShamePage fails closed when tiebreaker status is invented legacy DEFAULT or OVERRIDDEN', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      setupWallMocks({
        matrixRows: [
          { game_id: 'g-uuid-1', external_game_id: '401772648', home_team_id: 'NE', away_team_id: 'CHI', kickoff_time: '2026-10-15T00:15:00Z' },
        ],
        liveScores: [
          { id: '401772648', status: 'FINAL', homeTeam: { code: 'NE', score: '24' }, awayTeam: { code: 'CHI', score: '30' } },
        ],
        tiebreakerResponse: {
          status: 'DEFAULT', // legacy invented value
          tiebreakerOffered: true,
          eventId: '401772648',
          readiness: [
            { userId: 'u1', prediction: 54 },
            { userId: 'u2', prediction: 40 },
          ],
        },
      });

      await act(async () => {
        root.render(
          React.createElement(WallOfShamePage, {
            poolId: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
            season: 2026,
            seasonType: 2,
            week: 7,
          })
        );
      });

      expect(container.textContent).toContain('INCOMPLETE GAME TELEMETRY');
      expect(container.textContent).toContain('Unknown or missing tiebreaker status/offered telemetry.');

      await act(async () => {
        root.unmount();
      });
    });

    it('MatrixPage week switch gates AppHeader, phase, badge, and Gametrack stream during sync', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      // Initial week 7 mount (getCurrentNFLWeek() returns 7)
      setupWallMocks({
        matrixRows: [
          { game_id: 'g-w7', home_team_id: 'KC', away_team_id: 'DEN', kickoff_time: '2026-10-18T17:00:00Z' },
        ],
        picks: [{ user_id: 'u1', game_id: 'g-w7', selected_team: 'KC' }],
      });

      await act(async () => {
        root.render(React.createElement(MatrixPage, null));
      });

      // Verify Week 7 loaded state
      expect(container.textContent).toContain('WEEK 7');

      // Switch to Week 8 with delayed matrix fetch to test syncing wireframe gating
      setupWallMocks({
        matrixDelayMs: 60,
        matrixRows: [
          { game_id: 'g-w8', home_team_id: 'NE', away_team_id: 'CHI', kickoff_time: '2026-10-25T17:00:00Z' },
        ],
      });

      // Find the week selector and dispatch change event to switch to Week 8
      const selectNode = container.querySelector('select');
      expect(selectNode).not.toBeNull();

      act(() => {
        const changeEvent = { target: { value: '8' } };
        const reactPropsKey = Object.keys(selectNode!).find((k) => k.startsWith('__reactProps$'));
        if (reactPropsKey && (selectNode as any)[reactPropsKey]?.onChange) {
          (selectNode as any)[reactPropsKey].onChange(changeEvent);
        }
      });

      // Assert immediately while Week 8 sync is pending:
      // AppHeader scope shows SYNCING..., phase shows SYNCING, badge shows SYNCING
      expect(container.textContent).toContain('SYNCING...');
      expect(container.textContent).toContain('SYNCING');
      expect(container.textContent).toContain('[ SYNCING SLATE ]');

      // Allow async load to complete
      await act(async () => {
        await new Promise((r) => setTimeout(r, 80));
      });

      expect(container.textContent).not.toContain('SYNCING...');
      expect(container.textContent).toContain('WEEK 8');

      await act(async () => {
        root.unmount();
      });
    });

    it('ProfilePage identity change to null or new user immediately denies reminder text', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      currentMockAuthUser = { id: 'u1', email: 'jack.w.cone@gmail.com', role: 'ADMIN' };

      // Mount with verified commissioner user
      await act(async () => {
        root.render(
          React.createElement(ProfilePage, {
            propPoolId: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
            propWeek: 7,
          })
        );
      });

      expect(container.textContent).toContain('Next Kickoff Lock');

      // Now switch user to null (logout)
      currentMockAuthUser = null;
      await act(async () => {
        root.render(
          React.createElement(ProfilePage, {
            propPoolId: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782',
            propWeek: 7,
          })
        );
      });

      // Identity mismatch / null user must immediately deny deadline text and hide commissioner room
      expect(container.textContent).not.toContain('Next Kickoff Lock');
      expect(container.textContent).toContain('No accepted weekly slate available');

      // Reset mock user for remaining tests
      currentMockAuthUser = { id: 'u1', email: 'adambrickner@example.com', role: 'MEMBER' };

      await act(async () => {
        root.unmount();
      });
    });

    it('MatrixPage displays [ DATA UNAVAILABLE ] on query error and [ NO PICKS SUBMITTED ] on verified empty', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      // 1. Error state
      setupWallMocks({
        membersError: new Error('RPC query failed'),
      });

      await act(async () => {
        root.render(React.createElement(MatrixPage, null));
      });

      expect(container.textContent).toContain('[ DATA UNAVAILABLE ]');
      expect(container.textContent).not.toContain('[ NO PICKS SUBMITTED ]');

      await act(async () => {
        root.unmount();
      });

      // 2. Verified empty state (queries succeed, 0 picks submitted)
      const container2 = mockDoc.createElement('div');
      const root2 = createRoot(container2 as any);

      setupWallMocks({
        matrixRows: [],
        picks: [],
        dbGames: [
          {
            id: 'g-1',
            external_game_id: '401872995',
            home_team_id: 'DEN',
            away_team_id: 'SEA',
            kickoff_time: '2026-10-18T17:00:00Z',
            canonical_kickoff_time: '2026-10-18T17:00:00Z',
            lock_effective_at: '2026-10-18T17:00:00Z',
            season: 2026,
            season_type: 2,
            week: 7,
            manifest_revision: 1,
            status: 'SCHEDULED',
          },
        ],
      });

      await act(async () => {
        root2.render(React.createElement(MatrixPage, null));
      });

      expect(container2.textContent).toContain('[ NO PICKS SUBMITTED ]');

      await act(async () => {
        root2.unmount();
      });
    });

    it('MatrixPage gates open counts during delayed settings load, never claiming offset 0 open counts', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      // Kickoff is in 45 minutes.
      // With offset 0: game is OPEN (45 min remaining).
      // With offset 60: lock was 15 min ago (45 - 60 = -15 min), so game is LOCKED.
      const kickoffIn45Min = new Date(Date.now() + 45 * 60 * 1000).toISOString();

      setupWallMocks({
        poolDelayMs: 60,
        poolSettings: { lock_offset: 60 },
        matrixRows: [
          { game_id: 'g-upcoming', home_team_id: 'KC', away_team_id: 'DEN', kickoff_time: kickoffIn45Min },
        ],
        picks: [],
      });

      let renderPromise: Promise<void>;
      act(() => {
        renderPromise = new Promise(async (resolve) => {
          root.render(React.createElement(MatrixPage, null));
          resolve();
        });
      });

      // While settings is delayed / in-flight:
      // Header MUST show SYNCING, NOT offset 0 open counts (1 PICK OPEN)
      expect(container.textContent).toContain('SYNCING');
      expect(container.textContent).not.toContain('1 PICK OPEN');

      // Allow settings to complete with lock_offset = 60
      await act(async () => {
        await new Promise((r) => setTimeout(r, 80));
      });

      // With offset 60 validated, kickoff in 45 min is LOCKED, not open!
      expect(container.textContent).not.toContain('SYNCING...');
      expect(container.textContent).not.toContain('1 PICK OPEN');
      expect(container.textContent).toContain('ALL GAMES LOCKED');

      await act(async () => {
        root.unmount();
      });
    });

    it('MatrixPage preserves settings error across week switch until successful retry interaction', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      // 1. Initial settings failure
      setupWallMocks({
        poolError: new Error('Settings database timeout'),
        matrixRows: [
          { game_id: 'g-w7', home_team_id: 'KC', away_team_id: 'DEN', kickoff_time: '2026-10-18T17:00:00Z' },
        ],
        picks: [],
      });

      await act(async () => {
        root.render(React.createElement(MatrixPage, null));
      });

      // Header and content must fail closed to UNAVAILABLE
      expect(container.textContent).toContain('STATUS_UNAVAILABLE');
      expect(container.textContent).toContain('UNAVAILABLE');
      expect(container.textContent).toContain('[ DATA UNAVAILABLE ]');
      expect(container.textContent).not.toContain('1 PICK OPEN');

      // 2. Switch to Week 8: settings error MUST NOT be erased by week switch
      setupWallMocks({
        poolError: new Error('Settings database timeout'),
        matrixRows: [
          { game_id: 'g-w8', home_team_id: 'NE', away_team_id: 'CHI', kickoff_time: '2026-10-25T17:00:00Z' },
        ],
        picks: [],
      });

      const selectNode = container.querySelector('select');
      expect(selectNode).not.toBeNull();
      act(() => {
        const changeEvent = { target: { value: '8' } };
        const reactPropsKey = Object.keys(selectNode!).find((k) => k.startsWith('__reactProps$'));
        if (reactPropsKey && (selectNode as any)[reactPropsKey]?.onChange) {
          (selectNode as any)[reactPropsKey].onChange(changeEvent);
        }
      });

      // Allow Week 8 slate to load
      await act(async () => {
        await new Promise((r) => setTimeout(r, 20));
      });

      // Week 8 STILL preserves settings error state, never defaulting to offset 0
      expect(container.textContent).toContain('WEEK 8');
      expect(container.textContent).toContain('STATUS_UNAVAILABLE');
      expect(container.textContent).toContain('UNAVAILABLE');
      expect(container.textContent).toContain('[ DATA UNAVAILABLE ]');

      // 3. Trigger successful retry
      setupWallMocks({
        poolError: null,
        poolSettings: { lock_offset: 0 },
        matrixRows: [
          { game_id: 'g-w8', home_team_id: 'NE', away_team_id: 'CHI', kickoff_time: '2026-10-25T17:00:00Z' },
        ],
        picks: [],
      });

      const retryBtn = container.querySelectorAll('button').find((b: any) => b.textContent.includes('RETRY'));
      expect(retryBtn).toBeDefined();
      const reactPropsKey = Object.keys(retryBtn!).find((k) => k.startsWith('__reactProps$'));
      expect(reactPropsKey).toBeDefined();

      await act(async () => {
        (retryBtn as any)[reactPropsKey!].onClick();
      });

      // Error clears and Matrix recovers
      expect(container.textContent).not.toContain('[ DATA UNAVAILABLE ]');

      await act(async () => {
        root.unmount();
      });
    });
  });

  describe('P42 R1: WeeklyPicks Settings Readiness, Lock Gating & Retry Contract', () => {
    beforeEach(() => {
      pickPersistenceTracker.reset();
    });

    it('WeeklyPicks gates open counts during delayed settings load, denies pick entry and writes no persistence until resolved', async () => {
      const { mockDoc } = setupMockDom();
      localStorage.setItem('pickem_preferred_view_mode', 'list');
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      // Kickoff is in 45 minutes
      // With offset 0: game is OPEN (45 min remaining).
      // With offset 60: lock was 15 min ago (45 - 60 = -15 min), so game is LOCKED.
      const kickoffIn45Min = new Date(Date.now() + 45 * 60 * 1000).toISOString();

      setupWallMocks({
        poolDelayMs: 60,
        poolSettings: { lock_offset: 60 },
        dbGames: [
          { game_id: 'g-45', home_team_id: 'KC', away_team_id: 'DEN', kickoff_time: kickoffIn45Min },
        ],
        picks: [],
      });

      await act(async () => {
        root.render(React.createElement(WeeklyPicks, null));
        await new Promise((r) => setTimeout(r, 20));
      });

      // While settings is delayed / in-flight:
      // Header MUST show SYNCING, NOT offset 0 open counts (PICKS OPEN / 1 PICK OPEN)
      expect(container.textContent).toContain('SYNCING');
      expect(container.textContent).not.toContain('PICKS OPEN');
      expect(container.textContent).not.toContain('1 PICK OPEN');

      // Actual pick interaction attempt while pending
      const awayBtn = container.querySelectorAll('button').find((b: any) => b.textContent.includes('DEN'));
      expect(awayBtn).toBeDefined();
      expect(awayBtn!.disabled).toBe(true);

      await act(async () => {
        awayBtn!.click();
        const reactPropsKey = Object.keys(awayBtn!).find((k) => k.startsWith('__reactProps$'));
        if (reactPropsKey && (awayBtn as any)[reactPropsKey]?.onClick) {
          (awayBtn as any)[reactPropsKey].onClick({ type: 'click' });
        }
        await new Promise((r) => setTimeout(r, 10));
      });

      // Assert zero persistence across all channels while pending
      expect(pickPersistenceTracker.upsertCalls.length).toBe(0);
      expect(pickPersistenceTracker.deleteCalls.length).toBe(0);
      expect(pickPersistenceTracker.apiProxyCalls.length).toBe(0);
      expect(pickPersistenceTracker.localStoragePickWrites.length).toBe(0);

      // Allow settings to complete with lock_offset = 60
      await act(async () => {
        await new Promise((r) => setTimeout(r, 80));
      });

      // With offset 60 validated, kickoff in 45 min is LOCKED!
      expect(container.textContent).not.toContain('SYNCING...');
      expect(container.textContent).not.toContain('PICKS OPEN');
      expect(container.textContent).toContain('ALL GAMES LOCKED');
      expect(awayBtn!.disabled).toBe(true);

      // Attempt pick interaction after offset-60 lock
      await act(async () => {
        awayBtn!.click();
        const reactPropsKey = Object.keys(awayBtn!).find((k) => k.startsWith('__reactProps$'));
        if (reactPropsKey && (awayBtn as any)[reactPropsKey]?.onClick) {
          (awayBtn as any)[reactPropsKey].onClick({ type: 'click' });
        }
        await new Promise((r) => setTimeout(r, 10));
      });

      // Assert zero persistence maintained
      expect(pickPersistenceTracker.upsertCalls.length).toBe(0);
      expect(pickPersistenceTracker.deleteCalls.length).toBe(0);
      expect(pickPersistenceTracker.apiProxyCalls.length).toBe(0);
      expect(pickPersistenceTracker.localStoragePickWrites.length).toBe(0);

      await act(async () => {
        root.unmount();
      });
    });

    it('WeeklyPicks fails closed when pool settings query fails, denying pick entry and writing no persistence', async () => {
      const { mockDoc } = setupMockDom();
      localStorage.setItem('pickem_preferred_view_mode', 'list');
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      const kickoffIn2Hours = new Date(Date.now() + 120 * 60 * 1000).toISOString();

      setupWallMocks({
        poolError: new Error('Settings database timeout'),
        dbGames: [
          { game_id: 'g-future', home_team_id: 'KC', away_team_id: 'DEN', kickoff_time: kickoffIn2Hours },
        ],
        picks: [],
      });

      await act(async () => {
        root.render(React.createElement(WeeklyPicks, null));
        await new Promise((r) => setTimeout(r, 20));
      });

      // Fails closed to UNAVAILABLE
      expect(container.textContent).toContain('UNAVAILABLE');
      expect(container.textContent).toContain('[ DATA UNAVAILABLE ]');
      expect(container.textContent).not.toContain('PICKS OPEN');

      // Verify retry button is present
      const retryBtn = container.querySelectorAll('button').find((b: any) => b.textContent.includes('RETRY'));
      expect(retryBtn).toBeDefined();

      // Actual pick interaction attempt while in error
      const awayBtn = container.querySelectorAll('button').find((b: any) => b.textContent.includes('DEN'));
      expect(awayBtn).toBeDefined();
      expect(awayBtn!.disabled).toBe(true);

      await act(async () => {
        awayBtn!.click();
        const reactPropsKey = Object.keys(awayBtn!).find((k) => k.startsWith('__reactProps$'));
        if (reactPropsKey && (awayBtn as any)[reactPropsKey]?.onClick) {
          (awayBtn as any)[reactPropsKey].onClick({ type: 'click' });
        }
        await new Promise((r) => setTimeout(r, 10));
      });

      // Assert zero persistence across all channels
      expect(pickPersistenceTracker.upsertCalls.length).toBe(0);
      expect(pickPersistenceTracker.deleteCalls.length).toBe(0);
      expect(pickPersistenceTracker.apiProxyCalls.length).toBe(0);
      expect(pickPersistenceTracker.localStoragePickWrites.length).toBe(0);

      await act(async () => {
        root.unmount();
      });
    });

    it('WeeklyPicks fails closed when pool settings is missing or null, denying entry and writing no persistence', async () => {
      const { mockDoc } = setupMockDom();
      localStorage.setItem('pickem_preferred_view_mode', 'list');
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      const kickoffIn2Hours = new Date(Date.now() + 120 * 60 * 1000).toISOString();

      setupWallMocks({
        poolSettings: null,
        dbGames: [
          { game_id: 'g-future', home_team_id: 'KC', away_team_id: 'DEN', kickoff_time: kickoffIn2Hours },
        ],
        picks: [],
      });

      await act(async () => {
        root.render(React.createElement(WeeklyPicks, null));
        await new Promise((r) => setTimeout(r, 20));
      });

      // Missing settings fails closed to UNAVAILABLE
      expect(container.textContent).toContain('UNAVAILABLE');
      expect(container.textContent).toContain('[ DATA UNAVAILABLE ]');
      expect(container.textContent).not.toContain('PICKS OPEN');

      // Actual pick interaction attempt while settings is null
      const awayBtn = container.querySelectorAll('button').find((b: any) => b.textContent.includes('DEN'));
      expect(awayBtn).toBeDefined();
      expect(awayBtn!.disabled).toBe(true);

      await act(async () => {
        awayBtn!.click();
        const reactPropsKey = Object.keys(awayBtn!).find((k) => k.startsWith('__reactProps$'));
        if (reactPropsKey && (awayBtn as any)[reactPropsKey]?.onClick) {
          (awayBtn as any)[reactPropsKey].onClick({ type: 'click' });
        }
        await new Promise((r) => setTimeout(r, 10));
      });

      // Assert zero persistence across all channels
      expect(pickPersistenceTracker.upsertCalls.length).toBe(0);
      expect(pickPersistenceTracker.deleteCalls.length).toBe(0);
      expect(pickPersistenceTracker.apiProxyCalls.length).toBe(0);
      expect(pickPersistenceTracker.localStoragePickWrites.length).toBe(0);

      await act(async () => {
        root.unmount();
      });
    });

    it('WeeklyPicks fails closed when pool record is missing (poolData: null), denying entry and writing no persistence', async () => {
      const { mockDoc } = setupMockDom();
      localStorage.setItem('pickem_preferred_view_mode', 'list');
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      const kickoffIn2Hours = new Date(Date.now() + 120 * 60 * 1000).toISOString();

      setupWallMocks({
        poolData: null, // pool record missing completely
        dbGames: [
          { game_id: 'g-future', home_team_id: 'KC', away_team_id: 'DEN', kickoff_time: kickoffIn2Hours },
        ],
        picks: [],
      });

      await act(async () => {
        root.render(React.createElement(WeeklyPicks, null));
        await new Promise((r) => setTimeout(r, 20));
      });

      // Missing pool row fails closed to UNAVAILABLE
      expect(container.textContent).toContain('UNAVAILABLE');
      expect(container.textContent).toContain('[ DATA UNAVAILABLE ]');
      expect(container.textContent).not.toContain('PICKS OPEN');

      // Actual pick interaction attempt while pool row is missing
      const awayBtn = container.querySelectorAll('button').find((b: any) => b.textContent.includes('DEN'));
      expect(awayBtn).toBeDefined();
      expect(awayBtn!.disabled).toBe(true);

      await act(async () => {
        awayBtn!.click();
        const reactPropsKey = Object.keys(awayBtn!).find((k) => k.startsWith('__reactProps$'));
        if (reactPropsKey && (awayBtn as any)[reactPropsKey]?.onClick) {
          (awayBtn as any)[reactPropsKey].onClick({ type: 'click' });
        }
        await new Promise((r) => setTimeout(r, 10));
      });

      // Assert zero persistence across all channels
      expect(pickPersistenceTracker.upsertCalls.length).toBe(0);
      expect(pickPersistenceTracker.deleteCalls.length).toBe(0);
      expect(pickPersistenceTracker.apiProxyCalls.length).toBe(0);
      expect(pickPersistenceTracker.localStoragePickWrites.length).toBe(0);

      await act(async () => {
        root.unmount();
      });
    });

    it('WeeklyPicks fails closed on malformed lock_offset, never masking invalid values to offset 0 and asserting zero persistence', async () => {
      const { mockDoc } = setupMockDom();
      localStorage.setItem('pickem_preferred_view_mode', 'list');
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      const kickoffIn45Min = new Date(Date.now() + 45 * 60 * 1000).toISOString();

      // String "invalid" should NOT become NaN || 0 => 0
      setupWallMocks({
        poolSettings: { lock_offset: 'invalid' },
        dbGames: [
          { game_id: 'g-malformed', home_team_id: 'KC', away_team_id: 'DEN', kickoff_time: kickoffIn45Min },
        ],
        picks: [],
      });

      await act(async () => {
        root.render(React.createElement(WeeklyPicks, null));
        await new Promise((r) => setTimeout(r, 20));
      });

      // Must fail closed to UNAVAILABLE
      expect(container.textContent).toContain('UNAVAILABLE');
      expect(container.textContent).toContain('[ DATA UNAVAILABLE ]');
      expect(container.textContent).not.toContain('PICKS OPEN');

      const awayBtn = container.querySelectorAll('button').find((b: any) => b.textContent.includes('DEN'));
      expect(awayBtn).toBeDefined();
      expect(awayBtn!.disabled).toBe(true);

      await act(async () => {
        awayBtn!.click();
        const reactPropsKey = Object.keys(awayBtn!).find((k) => k.startsWith('__reactProps$'));
        if (reactPropsKey && (awayBtn as any)[reactPropsKey]?.onClick) {
          (awayBtn as any)[reactPropsKey].onClick({ type: 'click' });
        }
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(pickPersistenceTracker.upsertCalls.length).toBe(0);
      expect(pickPersistenceTracker.deleteCalls.length).toBe(0);
      expect(pickPersistenceTracker.apiProxyCalls.length).toBe(0);
      expect(pickPersistenceTracker.localStoragePickWrites.length).toBe(0);

      // Negative offset should also fail closed
      pickPersistenceTracker.reset();
      setupWallMocks({
        poolSettings: { lock_offset: -15 },
        dbGames: [
          { game_id: 'g-neg', home_team_id: 'KC', away_team_id: 'DEN', kickoff_time: kickoffIn45Min },
        ],
        picks: [],
      });

      const container2 = mockDoc.createElement('div');
      const root2 = createRoot(container2 as any);

      await act(async () => {
        root2.render(React.createElement(WeeklyPicks, null));
        await new Promise((r) => setTimeout(r, 20));
      });

      expect(container2.textContent).toContain('UNAVAILABLE');
      expect(container2.textContent).toContain('[ DATA UNAVAILABLE ]');
      expect(container2.textContent).not.toContain('PICKS OPEN');

      const awayBtn2 = container2.querySelectorAll('button').find((b: any) => b.textContent.includes('DEN'));
      expect(awayBtn2).toBeDefined();
      expect(awayBtn2!.disabled).toBe(true);

      await act(async () => {
        awayBtn2!.click();
        const reactPropsKey = Object.keys(awayBtn2!).find((k) => k.startsWith('__reactProps$'));
        if (reactPropsKey && (awayBtn2 as any)[reactPropsKey]?.onClick) {
          (awayBtn2 as any)[reactPropsKey].onClick({ type: 'click' });
        }
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(pickPersistenceTracker.upsertCalls.length).toBe(0);
      expect(pickPersistenceTracker.deleteCalls.length).toBe(0);
      expect(pickPersistenceTracker.apiProxyCalls.length).toBe(0);
      expect(pickPersistenceTracker.localStoragePickWrites.length).toBe(0);

      await act(async () => {
        root.unmount();
        root2.unmount();
      });
    });

    it('WeeklyPicks successful retry interaction clears error, restores eligible pick entry, and persists selected pick', async () => {
      const { mockDoc } = setupMockDom();
      localStorage.setItem('pickem_preferred_view_mode', 'list');
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      const kickoffIn2Hours = new Date(Date.now() + 120 * 60 * 1000).toISOString();

      // 1. Initial failed state
      setupWallMocks({
        poolError: new Error('Initial network error'),
        dbGames: [
          { game_id: 'g-retry', home_team_id: 'KC', away_team_id: 'DEN', kickoff_time: kickoffIn2Hours },
        ],
        picks: [],
      });

      await act(async () => {
        root.render(React.createElement(WeeklyPicks, null));
        await new Promise((r) => setTimeout(r, 20));
      });

      expect(container.textContent).toContain('UNAVAILABLE');
      expect(container.textContent).toContain('[ DATA UNAVAILABLE ]');

      const initialAwayBtn = container.querySelectorAll('button').find((b: any) => b.textContent.includes('DEN'));
      expect(initialAwayBtn).toBeDefined();
      expect(initialAwayBtn!.disabled).toBe(true);

      // Attempt pick interaction while failed -> denied
      await act(async () => {
        initialAwayBtn!.click();
        const reactPropsKey = Object.keys(initialAwayBtn!).find((k) => k.startsWith('__reactProps$'));
        if (reactPropsKey && (initialAwayBtn as any)[reactPropsKey]?.onClick) {
          (initialAwayBtn as any)[reactPropsKey].onClick({ type: 'click' });
        }
        await new Promise((r) => setTimeout(r, 10));
      });
      expect(pickPersistenceTracker.upsertCalls.length).toBe(0);
      expect(pickPersistenceTracker.apiProxyCalls.length).toBe(0);

      // 2. Configure mock to succeed on retry
      setupWallMocks({
        poolError: null,
        poolSettings: { lock_offset: 0 },
        dbGames: [
          { game_id: 'g-retry', home_team_id: 'KC', away_team_id: 'DEN', kickoff_time: kickoffIn2Hours },
        ],
        picks: [],
      });

      const retryBtn = container.querySelectorAll('button').find((b: any) => b.textContent.includes('RETRY'));
      expect(retryBtn).toBeDefined();
      const reactPropsKey = Object.keys(retryBtn!).find((k) => k.startsWith('__reactProps$'));
      expect(reactPropsKey).toBeDefined();

      await act(async () => {
        (retryBtn as any)[reactPropsKey!].onClick();
      });

      // Allow retry to complete
      await act(async () => {
        await new Promise((r) => setTimeout(r, 60));
      });

      // Error clears and valid open count publishes
      expect(container.textContent).not.toContain('[ DATA UNAVAILABLE ]');
      expect(container.textContent).toContain('PICKS OPEN: 1');

      // Actual pick entry is restored: button is enabled
      const restoredAwayBtn = container.querySelectorAll('button').find((b: any) => b.textContent.includes('DEN'));
      expect(restoredAwayBtn).toBeDefined();
      expect(restoredAwayBtn!.disabled).toBe(false);

      // Clicking restored button persists pick to Supabase, API proxy, and localStorage
      await act(async () => {
        restoredAwayBtn!.click();
        await new Promise((r) => setTimeout(r, 30));
      });

      expect(pickPersistenceTracker.upsertCalls.length).toBe(1);
      expect(pickPersistenceTracker.upsertCalls[0].payload.game_id).toBe('g-retry');
      expect(pickPersistenceTracker.upsertCalls[0].payload.selected_team).toBe('DEN');
      expect(pickPersistenceTracker.apiProxyCalls.length).toBe(1);
      expect(pickPersistenceTracker.localStoragePickWrites.length).toBeGreaterThanOrEqual(1);

      await act(async () => {
        root.unmount();
      });
    });

    it('WeeklyPicks mounts with valid empty settings object ({}) and enforces server zero default allowing pick entry and persistence', async () => {
      const { mockDoc } = setupMockDom();
      localStorage.setItem('pickem_preferred_view_mode', 'list');
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      const kickoffIn2Hours = new Date(Date.now() + 120 * 60 * 1000).toISOString();

      setupWallMocks({
        poolSettings: {}, // valid empty settings object -> server zero default
        dbGames: [
          { game_id: 'g-zero-default', home_team_id: 'KC', away_team_id: 'DEN', kickoff_time: kickoffIn2Hours },
        ],
        picks: [],
      });

      await act(async () => {
        root.render(React.createElement(WeeklyPicks, null));
        await new Promise((r) => setTimeout(r, 60));
      });

      // Header shows zero default open count
      expect(container.textContent).toContain('PICKS OPEN: 1');

      // Button is enabled
      const awayBtn = container.querySelectorAll('button').find((b: any) => b.textContent.includes('DEN'));
      expect(awayBtn).toBeDefined();
      expect(awayBtn!.disabled).toBe(false);

      // Click team button persists pick successfully
      await act(async () => {
        awayBtn!.click();
        await new Promise((r) => setTimeout(r, 30));
      });

      expect(pickPersistenceTracker.upsertCalls.length).toBe(1);
      expect(pickPersistenceTracker.upsertCalls[0].payload.game_id).toBe('g-zero-default');
      expect(pickPersistenceTracker.upsertCalls[0].payload.selected_team).toBe('DEN');
      expect(pickPersistenceTracker.apiProxyCalls.length).toBe(1);
      expect(pickPersistenceTracker.localStoragePickWrites.length).toBeGreaterThanOrEqual(1);

      await act(async () => {
        root.unmount();
      });
    });

    it('WeeklyPicks mounts with nonzero offset and advances controlled clock across before/exact effective deadline, gating entry and persistence', async () => {
      vi.useFakeTimers();

      const { mockDoc } = setupMockDom();
      localStorage.setItem('pickem_preferred_view_mode', 'list');
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      // Kickoff at 17:00:00Z. Lock offset = 15m.
      // Effective lock deadline: 17:00 - 15m = 16:45:00Z.
      const kickoffIso = '2026-10-25T17:00:00.000Z';

      // Set initial clock to 16:40:00Z (5 minutes before lock deadline)
      vi.setSystemTime(new Date('2026-10-25T16:40:00.000Z'));

      setupWallMocks({
        poolSettings: { lock_offset: 15 },
        dbGames: [
          { game_id: 'g-offset-15', home_team_id: 'KC', away_team_id: 'DEN', kickoff_time: kickoffIso },
        ],
        picks: [],
      });

      await act(async () => {
        root.render(React.createElement(WeeklyPicks, null));
        await vi.advanceTimersByTimeAsync(60);
      });

      // 1. Before deadline: game is open
      expect(container.textContent).toContain('PICKS OPEN: 1');
      const awayBtn = container.querySelectorAll('button').find((b: any) => b.textContent.includes('DEN'));
      expect(awayBtn).toBeDefined();
      expect(awayBtn!.disabled).toBe(false);

      // Click succeeds and persists
      await act(async () => {
        awayBtn!.click();
        await vi.advanceTimersByTimeAsync(30);
      });

      expect(pickPersistenceTracker.upsertCalls.length).toBe(1);
      expect(pickPersistenceTracker.upsertCalls[0].payload.selected_team).toBe('DEN');
      expect(pickPersistenceTracker.apiProxyCalls.length).toBe(1);

      // Reset persistence tracker before clock advancement
      pickPersistenceTracker.reset();

      // 2. Advance clock to exact effective deadline (16:45:00Z)
      await act(async () => {
        vi.setSystemTime(new Date('2026-10-25T16:45:00.000Z'));
        await vi.advanceTimersByTimeAsync(10000); // triggers WeeklyPicks 10s setInterval
      });

      // Header updates to ALL GAMES LOCKED and button is disabled
      expect(container.textContent).toContain('ALL GAMES LOCKED');
      expect(container.textContent).not.toContain('PICKS OPEN');
      expect(awayBtn!.disabled).toBe(true);

      // Attempt pick interaction at exact deadline -> denied, zero writes
      await act(async () => {
        awayBtn!.click();
        const reactPropsKey = Object.keys(awayBtn!).find((k) => k.startsWith('__reactProps$'));
        if (reactPropsKey && (awayBtn as any)[reactPropsKey]?.onClick) {
          (awayBtn as any)[reactPropsKey].onClick({ type: 'click' });
        }
        await vi.advanceTimersByTimeAsync(10);
      });

      expect(pickPersistenceTracker.upsertCalls.length).toBe(0);
      expect(pickPersistenceTracker.deleteCalls.length).toBe(0);
      expect(pickPersistenceTracker.apiProxyCalls.length).toBe(0);
      expect(pickPersistenceTracker.localStoragePickWrites.length).toBe(0);

      // 3. Advance clock past effective deadline to 16:50:00Z (still 10 min before kickoff)
      await act(async () => {
        vi.setSystemTime(new Date('2026-10-25T16:50:00.000Z'));
        await vi.advanceTimersByTimeAsync(10000);
      });

      expect(container.textContent).toContain('ALL GAMES LOCKED');
      expect(awayBtn!.disabled).toBe(true);

      // Attempt pick interaction past deadline -> denied, zero writes
      await act(async () => {
        awayBtn!.click();
        const reactPropsKey = Object.keys(awayBtn!).find((k) => k.startsWith('__reactProps$'));
        if (reactPropsKey && (awayBtn as any)[reactPropsKey]?.onClick) {
          (awayBtn as any)[reactPropsKey].onClick({ type: 'click' });
        }
        await vi.advanceTimersByTimeAsync(10);
      });

      expect(pickPersistenceTracker.upsertCalls.length).toBe(0);
      expect(pickPersistenceTracker.deleteCalls.length).toBe(0);
      expect(pickPersistenceTracker.apiProxyCalls.length).toBe(0);
      expect(pickPersistenceTracker.localStoragePickWrites.length).toBe(0);

      await act(async () => {
        root.unmount();
      });

      vi.useRealTimers();
    });

    it('enforces exact canonical lock deadline and verifies absent offset server zero default at domain level', () => {
      const baseKickoff = new Date('2026-10-25T17:00:00.000Z');

      // Valid loaded settings with absent offset uses server zero default (deadline == kickoff)
      const zeroDefaultResult = evaluateCanonicalGameLock(
        { kickoff_time: baseKickoff.toISOString() },
        0,
        new Date('2026-10-25T16:59:00.000Z')
      );
      expect(zeroDefaultResult.isLocked).toBe(false);
      expect(zeroDefaultResult.effectiveDeadline?.toISOString()).toBe(baseKickoff.toISOString());

      // At exact kickoff, game locks
      const atKickoffResult = evaluateCanonicalGameLock(
        { kickoff_time: baseKickoff.toISOString() },
        0,
        baseKickoff
      );
      expect(atKickoffResult.isLocked).toBe(true);

      // Non-zero offset (e.g. 15 minutes before kickoff)
      // Effective deadline: 17:00 - 15m = 16:45:00
      const offsetResult = evaluateCanonicalGameLock(
        { kickoff_time: baseKickoff.toISOString() },
        15,
        new Date('2026-10-25T16:40:00.000Z')
      );
      expect(offsetResult.isLocked).toBe(false);
      expect(offsetResult.effectiveDeadline?.getTime()).toBe(baseKickoff.getTime() - 15 * 60 * 1000);

      // At exact offset boundary (16:45), game locks
      const atOffsetBoundaryResult = evaluateCanonicalGameLock(
        { kickoff_time: baseKickoff.toISOString() },
        15,
        new Date('2026-10-25T16:45:00.000Z')
      );
      expect(atOffsetBoundaryResult.isLocked).toBe(true);

      // 5 minutes after offset deadline (16:50), game remains locked even though kickoff is in future
      const pastOffsetResult = evaluateCanonicalGameLock(
        { kickoff_time: baseKickoff.toISOString() },
        15,
        new Date('2026-10-25T16:50:00.000Z')
      );
      expect(pastOffsetResult.isLocked).toBe(true);
      expect(pastOffsetResult.reason).toBe('KICKOFF_PASSED');

      // Unvalidated NaN offset must fail closed to UNAVAILABLE, never defaulting to 0
      const nanResult = evaluateCanonicalGameLock(
        { kickoff_time: baseKickoff.toISOString() },
        NaN,
        new Date('2026-10-25T12:00:00.000Z')
      );
      expect(nanResult.isLocked).toBe(true);
      expect(nanResult.state).toBe('UNAVAILABLE');
    });
  });
});
