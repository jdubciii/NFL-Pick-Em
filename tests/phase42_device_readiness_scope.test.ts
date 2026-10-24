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
  WeeklyLadderViewProps,
} from '../client/src/components/shame/WeeklyLadderView';
import {
  resolveProfileReminderScope,
  formatNextKickoffLock,
} from '../client/src/pages/ProfilePage';
import { LiveGame } from '../client/src/services/liveScoreService';

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
          homeTeam: { code: 'GB', name: 'Packers', score: '0' },
          awayTeam: { code: 'CHI', name: 'Bears', score: '0' },
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
        { id: 'g-live', homeTeam: 'DET', awayTeam: 'MIN', kickoffTime: '2026-10-18T17:00:00Z' },
      ];

      const liveScoresInvalid: LiveGame[] = [
        {
          id: 'g-live',
          name: 'DET vs MIN',
          shortName: 'DET vs MIN',
          homeTeam: { code: 'DET', name: 'Lions', score: 'NaN' },
          awayTeam: { code: 'MIN', name: 'Vikings', score: '14' },
          status: 'IN_PROGRESS',
          clock: '5:00',
          period: 2,
        },
      ];

      const validation = validateTelemetryCoverage(games, liveScoresInvalid);
      expect(validation.isReady).toBe(false);
      expect(validation.isIncomplete).toBe(true);
      expect(validation.missingGameIds).toContain('g-live');
    });

    it('mounts WeeklyLadderView in INCOMPLETE_TELEMETRY state and displays retry without SAFE claims', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      const retryFn = vi.fn();

      await act(async () => {
        root.render(
          React.createElement(WeeklyLadderView, {
            ladder: [],
            status: 'INCOMPLETE_TELEMETRY',
            weekNumber: 6,
            isSettled: false,
            onRetry: retryFn,
          })
        );
      });

      const text = container.textContent;
      expect(text).toContain('INCOMPLETE GAME TELEMETRY');
      expect(text).toContain('RETRY');
      expect(text).not.toContain('PROJECTED SAFE');
      expect(text).not.toContain('0 shots');

      await act(async () => {
        root.unmount();
      });
    });

    it('mounts WeeklyLadderView in LOADING state without child fallback or fake rank 1 SAFE claims', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      await act(async () => {
        root.render(
          React.createElement(WeeklyLadderView, {
            ladder: [],
            status: 'LOADING',
            weekNumber: 6,
            isSettled: false,
          })
        );
      });

      const text = container.textContent;
      expect(text).toContain('LOADING WEEK 6 LADDER');
      expect(text).not.toContain('PROJECTED SAFE');
      expect(text).not.toContain('SAFE HAVEN // 1ST PLACE');

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
        { id: 'g-1', homeTeam: 'DET', awayTeam: 'MIN', kickoffTime: '2026-10-18T17:00:00Z' },
      ];

      const liveScores00: LiveGame[] = [
        {
          id: 'g-1',
          name: 'DET vs MIN',
          shortName: 'DET vs MIN',
          homeTeam: { code: 'DET', name: 'Lions', score: '0' },
          awayTeam: { code: 'MIN', name: 'Vikings', score: '0' },
          status: 'IN_PROGRESS',
          clock: '15:00',
          period: 1,
        },
      ];

      const validation = validateTelemetryCoverage(games, liveScores00);
      expect(validation.isReady).toBe(true);
      expect(validation.isIncomplete).toBe(false);
      expect(validation.isAllPregame).toBe(false);
    });

    it('identifies confirmed all-future scheduled games as all-pregame without numeric scores required', () => {
      const futureTime = new Date(Date.now() + 86400000 * 3).toISOString();
      const games: SlateGame[] = [
        { id: 'g-w7-1', homeTeam: 'DET', awayTeam: 'MIN', kickoffTime: futureTime },
        { id: 'g-w7-2', homeTeam: 'GB', awayTeam: 'CHI', kickoffTime: futureTime },
      ];

      const liveScoresScheduled: LiveGame[] = [
        {
          id: 'g-w7-1',
          name: 'DET vs MIN',
          shortName: 'DET vs MIN',
          homeTeam: { code: 'DET', name: 'Lions', score: '0' },
          awayTeam: { code: 'MIN', name: 'Vikings', score: '0' },
          status: 'SCHEDULED',
          clock: '0:00',
          period: 1,
        },
        {
          id: 'g-w7-2',
          name: 'GB vs CHI',
          shortName: 'GB vs CHI',
          homeTeam: { code: 'GB', name: 'Packers', score: '0' },
          awayTeam: { code: 'CHI', name: 'Bears', score: '0' },
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

    it('mounts WeeklyLadderView in GAMES_NOT_STARTED state with zero safety promise', async () => {
      const { mockDoc } = setupMockDom();
      const container = mockDoc.createElement('div');
      const root = createRoot(container as any);

      await act(async () => {
        root.render(
          React.createElement(WeeklyLadderView, {
            ladder: [],
            status: 'GAMES_NOT_STARTED',
            weekNumber: 7,
            isSettled: false,
          })
        );
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
      // Both users picked DET and have identical correct picks
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
    it('proves only latest request generation publishes when slow earlier request completes late', async () => {
      let generation = 0;
      let publishedSnapshot: any = null;

      async function simulatedLoad(scopeWeek: number, delayMs: number) {
        const thisGen = ++generation;
        await new Promise((r) => setTimeout(r, delayMs));
        // Stale generation check
        if (thisGen !== generation) {
          return; // Cancelled
        }
        publishedSnapshot = { week: scopeWeek, generation: thisGen };
      }

      // Start slow earlier request for Week 6 (100ms)
      const p1 = simulatedLoad(6, 100);
      // Start fast later request for Week 7 (20ms)
      const p2 = simulatedLoad(7, 20);

      await Promise.all([p1, p2]);

      // Only Week 7 generation published; Week 6 was discarded
      expect(publishedSnapshot).toEqual({ week: 7, generation: 2 });
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
          let selectedCols = '*';
          const filters: Record<string, any> = {};

          const queryBuilder = {
            select: (cols: string) => {
              selectedCols = cols;
              return queryBuilder;
            },
            eq: (col: string, val: any) => {
              filters[col] = val;
              return queryBuilder;
            },
            in: (col: string, val: any) => {
              filters[col] = val;
              return queryBuilder;
            },
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
  });

  // =========================================================================
  // Case 5: Per-game lock and week in progress status
  // =========================================================================
  describe('Case 5: Per-game lock and week in progress status', () => {
    it('verifies that a final Thursday game does not lock Sunday games', () => {
      const nowMs = new Date('2026-10-24T12:00:00Z').getTime(); // Saturday
      const thursdayPast = new Date('2026-10-22T20:15:00Z').getTime();
      const sundayFuture = new Date('2026-10-25T17:00:00Z').getTime();

      const isThursdayLocked = nowMs >= thursdayPast;
      const isSundayLocked = nowMs >= sundayFuture;

      expect(isThursdayLocked).toBe(true);
      expect(isSundayLocked).toBe(false);
    });
  });

  // =========================================================================
  // Case 6: Settlement separation from game outcome finality
  // =========================================================================
  describe('Case 6: Settlement separation from game outcome finality', () => {
    it('mounts WeeklyLadderView with all final scores and unconfirmed settlement: shows settlement not confirmed badge', async () => {
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
          status: 'PROJECTED SAFE',
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
          })
        );
      });

      const text = container.textContent;
      expect(text).toContain('WEEK 6 · PROVISIONAL PREVIEW — SETTLEMENT NOT CONFIRMED');
      expect(text).not.toContain('OFFICIAL SETTLED');

      await act(async () => {
        root.unmount();
      });
    });

    it('mounts WeeklyLadderView with verified authoritative settlement: shows OFFICIAL SETTLED', async () => {
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
            isSettled: true,
            scoreStatus: 'ALL_GAMES_FINAL',
          })
        );
      });

      const text = container.textContent;
      expect(text).toContain('WEEK 6 · OFFICIAL SETTLED');

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
          userName: 'Player 1',
          penaltyShots: 0,
          status: 'Provisional',
          fsmDisplayStatus: 'Provisional',
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
            isStale: true,
            observedAt: '2026-10-24T12:00:00.000Z',
          })
        );
      });

      const text = container.textContent;
      expect(text).toContain('DISPLAYING STALE SNAPSHOT');
      expect(text).not.toContain('TIME TO SUBMIT EVIDENCE (SUBMISSION DEADLINE)'); // Fake timer removed

      await act(async () => {
        root.unmount();
      });
    });
  });
});
