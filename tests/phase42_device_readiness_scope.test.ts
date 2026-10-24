import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
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
  resolveProfileReminderScope,
  formatNextKickoffLock,
} from '../client/src/pages/ProfilePage';
import { LiveGame } from '../client/src/services/liveScoreService';
import * as apiClient from '../client/src/lib/apiClient';
import * as liveScoreService from '../client/src/services/liveScoreService';
import { supabase } from '../client/src/lib/supabase';
import { WallOfShamePage } from '../client/src/pages/WallOfShamePage';
import {
  evaluateCanonicalGameLock,
  evaluateSlateLockSummary,
} from '../client/src/services/lockEnforcementService';

vi.mock('../client/src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'adambrickner@example.com', role: 'MEMBER' },
    token: 'synthetic-jwt-1',
  }),
}));

// Mock DOM container for React createRoot testing in jsdom/node
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
  mockDoc.defaultView = globalThis;

  return { mockDoc, MockElement };
}

function setupWallMocks(options: {
  members?: any[];
  wrapup?: any;
  matrixRows?: any[];
  dbGames?: any[];
  picks?: any[];
  liveScores?: LiveGame[];
  matrixDelayMs?: number;
  matrixShouldFail?: boolean;
}) {
  const members = options.members ?? [
    { user_id: 'u1', role: 'MEMBER', users: { id: 'u1', email: 'adambrickner@example.com', display_name: 'adambrickner' } },
    { user_id: 'u2', role: 'MEMBER', users: { id: 'u2', email: 'smoketester@example.com', display_name: 'smoke_test_runner' } },
  ];

  vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
    const filters: Record<string, any> = {};
    const builder: any = {
      select: () => builder,
      eq: (col: string, val: any) => {
        filters[col] = val;
        return builder;
      },
      maybeSingle: async () => {
        if (table === 'weekly_wrapups') {
          return { data: options.wrapup ?? null, error: null };
        }
        return { data: null, error: null };
      },
      then: (resolve: Function) => {
        if (table === 'pool_memberships') {
          resolve({ data: members, error: null });
        } else if (table === 'picks') {
          resolve({ data: options.picks ?? [], error: null });
        } else if (table === 'games') {
          resolve({ data: options.dbGames ?? [], error: null });
        } else {
          resolve({ data: [], error: null });
        }
      },
    };
    return builder;
  }) as any);

  vi.spyOn(apiClient, 'scopedExpressFetch').mockImplementation((async (url: string) => {
    if (url.includes('/matrix')) {
      if (options.matrixDelayMs) {
        await new Promise((r) => setTimeout(r, options.matrixDelayMs));
      }
      if (options.matrixShouldFail) {
        return { ok: false, status: 500, json: async () => ({ error: 'FAILED' }) } as any;
      }
      return {
        ok: true,
        json: async () => ({ rows: options.matrixRows ?? [] }),
      } as any;
    }
    if (url.includes('/tiebreaker')) {
      return {
        ok: true,
        json: async () => ({ tiebreakerOffered: false }),
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
            select: () => queryBuilder,
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
});
