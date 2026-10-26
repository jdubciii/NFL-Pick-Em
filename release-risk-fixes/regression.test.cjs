// Built-ins only. No app imports, host environment in VM, network or database.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { stripTypeScriptTypes } = require('node:module');
const vm = require('node:vm');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const REV = '790cfc84b1c044fd8db8174b2593bf12269dc804';
const git = (...args) => execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' });
const original = p => git('show', `${REV}:${p}`);
const sha = s => createHash('sha256').update(s).digest('hex');
const patch = readFileSync(path.join(__dirname, 'candidate.patch'), 'utf8');
const candidates = {};
assert.equal(git('rev-parse', '--verify', `${REV}^{commit}`).trim(), REV);
// Strict context application, in memory only. Source is always the pinned git object.
for (const part of patch.split('diff --git ').slice(1)) {
  const p = part.split('\n')[0].split(' b/')[1];
  const source = original(p); let result = source; let cursor = 0;
  const headers = [...part.matchAll(/^@@ -(\d+),(\d+) \+(\d+),(\d+) @@$/gm)];
  let index = 0;
  for (const hunk of part.split(/^@@ .*@@.*\n/m).slice(1)) {
    const lines = hunk.trimEnd().split('\n');
    assert.ok(lines.every(l => /^[ +\-]/.test(l)));
    const before = lines.filter(l => l[0] !== '+').map(l => l.slice(1)).join('\n');
    const after = lines.filter(l => l[0] !== '-').map(l => l.slice(1)).join('\n');
    const at = result.indexOf(before, cursor);
    const header = headers[index++]; assert.ok(header, 'valid unified diff header');
    assert.equal(lines.filter(l => l[0] !== '+').length, Number(header[2]));
    assert.equal(lines.filter(l => l[0] !== '-').length, Number(header[4]));
    assert.equal(source.slice(0, source.indexOf(before)).split('\n').length, Number(header[1]));
    assert.equal(result.slice(0, at).split('\n').length, Number(header[3]));
    assert.ok(at >= cursor, `patch context ${p}`);
    assert.equal(result.indexOf(before, at + 1), -1, `unique context ${p}`);
    result = result.slice(0, at) + after + result.slice(at + before.length); cursor = at + after.length;
  }
  candidates[p] = result;
  console.log('SOURCE', JSON.stringify({ revision: REV, path: p, originalSHA256: sha(source), candidateSHA256: sha(result), originalLines: source.split('\n').length - 1, candidateLines: result.split('\n').length - 1 }));
}
const slice = (s, a, b) => { const start = s.indexOf(a); const end = b ? s.indexOf(b, start + a.length) : s.length; assert.ok(start >= 0 && end > start); return s.slice(start, end); };
const dep = (p, a, b) => slice(original(`src/services/${p}.ts`), a, b);
const dependencies = [
  dep('lockResolver', 'export function isGameInExcludedWindow('),
  dep('authoritativeSlateService', 'export function normalizeTeamCode(', '\n/**'),
  dep('tiebreakerRankingService', 'export function compareTiebreakerPredictions('),
  dep('weeklyDesignationService', 'export function isDetroitLions(', '\n/**\n * Validates and applies'),
  dep('authoritativeSlateService', 'export async function getAcceptedSlateManifest(', '\n/**'),
].join('\n');
function evaluate(code, bindings, expression) {
  const ctx = vm.createContext({ ...bindings, process: Object.freeze({ env: Object.freeze({}) }), console: { warn() {}, error() {} } }, { codeGeneration: { strings: false, wasm: false } });
  return vm.runInContext(stripTypeScriptTypes(code.replace(/\bexport /g, '')) + `\n;(${expression})`, ctx, { timeout: 1000 });
}
class Decimal { constructor(n) { this.n = Number(n); } toString() { return String(this.n); } }
function wrapAPI(fixed) {
  const p = 'src/services/wrapUpEngine.ts';
  const body = slice(fixed ? candidates[p] : original(p), 'export async function executeWeeklyWrapUpForPool(', '\n/**');
  return evaluate(dependencies + body, { Prisma: { Decimal }, GameStatus: { FINAL: 'FINAL' }, OutboxStatus: { PENDING: 'PENDING' } }, 'executeWeeklyWrapUpForPool');
}
const fixed = wrapAPI(true), old = wrapAPI(false);
const clone = structuredClone;
function fixture() {
  return { games: [7, 8, 9].map(w => ({ id: `uuid${w}`, externalGameId: `event${w}`, week: w, season: 2026, homeTeamId: 'NO', awayTeamId: 'PIT', status: w === 7 ? 'FINAL' : 'SCHEDULED', homeScore: 21, awayScore: 24, kickoffTime: `2026-11-0${w - 6}T18:00:00Z` })),
    picks: ['A', 'B'].map(user_id => ({ user_id, game_id: 'event7', week: 7, selected_team_id: user_id === 'A' ? 'PIT' : 'NO' })),
    claims: [], ledger: [], stats: [], outbox: [], inbox: [] };
}
class Memory {
  constructor({ manifest = ['event7'], tags = false, seasonClaim = true } = {}) { this.state = fixture(); this.manifest = manifest; this.tags = tags; this.seasonClaim = seasonClaim; this.events = []; this.fail = false; this.tail = Promise.resolve(); }
  $transaction(fn) {
    const run = this.tail.then(async () => {
      const s = clone(this.state); const actions = [];
      const raw = async (sql, ...args) => {
        const q = sql.replace(/\s+/g, ' ').trim();
        if (q.includes('to_regclass')) return [{ to_regclass: q.includes('weekly_slate_manifests') && this.manifest === null ? null : 'exists' }];
        if (q.startsWith('SELECT column_name')) return this.seasonClaim ? [{ column_name: 'season' }] : [];
        if (q.startsWith('SELECT season, season_type')) return this.manifest?.length ? [{ season: 2026, season_type: 2, week_number: 7, revision: 1, event_ids: this.manifest, accepted_at: '2026-10-25', observation_time: '2026-10-25', manifest_fingerprint: 'fixture' }] : [];
        if (q.startsWith('INSERT INTO public.weekly_wrapups')) { if (s.claims.length) return []; const r = { pool_id: 'P', season: this.seasonClaim ? 2026 : undefined, week_number: 7, summary: null }; s.claims.push(r); actions.push('claim'); return [r]; }
        if (q.startsWith('SELECT pool_id,')) return s.claims;
        if (q.startsWith('DELETE FROM public.weekly_wrapups')) { assert.match(q, /AND summary IS NULL;/); assert.deepEqual(args, this.seasonClaim ? ['P', 2026, 7] : ['P', 7]); s.claims = s.claims.filter(r => r.summary !== null); actions.push('cleanup'); return []; }
        if (q.startsWith('SELECT DISTINCT game_id')) return [...new Set(s.picks.filter(p => p.week === 7 || (q.includes('week IS NULL') && p.week === null)).map(p => p.game_id))].map(game_id => ({ game_id }));
        if (q.startsWith('SELECT p.user_id,')) return s.picks.filter(p => p.week === 7 || p.week === null).flatMap(p => { const gs = s.games.filter(g => g.id === p.game_id || g.externalGameId === p.game_id); return (gs.length ? gs : [null]).map(g => ({ ...p, home_team_id: g?.homeTeamId ?? null, away_team_id: g?.awayTeamId ?? null, home_score: g?.homeScore ?? null, away_score: g?.awayScore ?? null, status: g?.status ?? null })); });
        if (q.startsWith('UPDATE public.weekly_wrapups')) { s.claims[0].summary = JSON.parse(args[0]); return []; }
        throw new Error(`UNMODELED SQL ${q}`);
      };
      const effects = k => async ({ data }) => { s[k].push(clone(data)); actions.push(k); return { count: 1 }; };
      const tx = { $queryRaw: async strings => raw(strings.join('')), $queryRawUnsafe: raw,
        pool: { findUnique: async () => ({ id: 'P', name: 'MEMORY', adminId: 'A', settings: {}, memberships: ['A', 'B'].map(userId => ({ userId, user: { id: userId } })) }) },
        game: { findMany: async () => s.games.map(g => { const r = clone(g); if (!this.tags) { delete r.week; delete r.season; } return r; }) },
        weeklySubmission: { findMany: async () => [] },
        penaltyLedger: { create: effects('ledger'), aggregate: async () => ({ _sum: { delta: new Decimal(0) } }) },
        poolMemberStat: { upsert: effects('stats') }, outboxEvent: { createMany: effects('outbox') },
        inboxMessage: { createMany: async args => { if (this.fail) throw Error('injected after effects'); return effects('inbox')(args); } } };
      try { const result = await fn(tx); this.state = s; this.events.push({ outcome: 'COMMIT', actions }); return result; }
      catch (e) { this.events.push({ outcome: 'ROLLBACK', actions }); throw e; }
    }); this.tail = run.catch(() => {}); return run;
  }
}
const run = (db, api = fixed) => api('P', 7, { prismaClient: db, season: 2026, seasonType: 2, tiebreakerOffered: false, settlementEnabled: true, penaltyPostingEnabled: true });
function zero(db) { for (const k of ['claims', 'ledger', 'stats', 'outbox', 'inbox']) assert.equal(db.state[k].length, 0, k); }
for (const tags of [false, true]) test(`W7 fallback ignores pending W8/W9; tags=${tags}`, async () => {
  const db = new Memory({ manifest: [], tags });
  const r = await run(db); assert.equal(r.applied, true); assert.equal(r.standings.find(r => r.userId === 'A').score, 1);
  const before = JSON.stringify(db.state); assert.equal((await run(db)).reason, 'ALREADY_WRAPPED_UP'); assert.equal(JSON.stringify(db.state), before);
});
test('absent manifest table uses scoped fallback', async () => { assert.equal((await run(new Memory({ manifest: null }))).applied, true); });
test('original fails new W7-isolation assertion', async () => { const db = new Memory({ manifest: [] }); const r = await run(db, old); assert.throws(() => assert.equal(r.applied, true), assert.AssertionError); assert.equal(r.reason, 'WEEK_NOT_FINAL'); });
for (const manifest of [[], ['event7']]) test(`pending intended W7 cleans claim then ready retry; manifest=${manifest.length}`, async () => {
  const db = new Memory({ manifest }); db.state.games[0].status = 'SCHEDULED';
  const r = await run(db); assert.equal(r.reason, 'WEEK_NOT_FINAL'); assert.equal(r.pendingCount, 1); zero(db);
  db.state.games[0].status = 'FINAL'; assert.equal((await run(db)).applied, true);
});
test('tagged unpicked pending W7 remains blocking', async () => {
  const db = new Memory({ manifest: [], tags: true }); db.state.games[1].week = 7;
  assert.equal((await run(db)).reason, 'WEEK_NOT_FINAL'); zero(db);
});
test('manifest completeness and unpicked pending controls', async () => {
  for (const id of ['missing', 'event8']) { const db = new Memory({ manifest: ['event7', id] }); assert.equal((await run(db)).reason, id === 'missing' ? 'AUTHORITATIVE_SLATE_UNAVAILABLE' : 'WEEK_NOT_FINAL'); zero(db); }
});
test('unscoped empty/null-week fallback refuses, not all-games finality', async () => {
  for (const nullWeek of [false, true]) { const db = new Memory({ manifest: [] }); db.state.picks = nullWeek ? db.state.picks.map(p => ({ ...p, week: null })) : []; assert.equal((await run(db)).reason, 'AUTHORITATIVE_SLATE_UNAVAILABLE'); zero(db); }
});
test('fallback supports UUID join; rejects unresolved or conflicting tagged pick identity', async () => {
  const db = new Memory({ manifest: [] }); db.state.picks.forEach(p => p.game_id = 'uuid7'); assert.equal((await run(db)).applied, true);
  for (const bad of ['missing', 'event8']) { const d = new Memory({ manifest: [], tags: true }); d.state.picks.forEach(p => p.game_id = bad); assert.equal((await run(d)).reason, 'AUTHORITATIVE_SLATE_UNAVAILABLE'); zero(d); }
});
for (const seasonClaim of [true, false]) test(`mapping refusal -> zero effects/claim -> repair -> success -> dedupe; season key=${seasonClaim}`, async () => {
  const db = new Memory({ seasonClaim }); db.state.picks.forEach(p => p.game_id = 'missing');
  assert.equal((await run(db)).reason, 'AUTHORITATIVE_SLATE_UNAVAILABLE'); zero(db); assert.deepEqual(db.events[0].actions, ['claim', 'cleanup']);
  db.state.picks.forEach(p => p.game_id = 'event7'); assert.equal((await run(db)).applied, true);
  const before = JSON.stringify(db.state); assert.equal((await run(db)).reason, 'ALREADY_WRAPPED_UP'); assert.equal(JSON.stringify(db.state), before);
});
test('original fails new zero-claim mapping-refusal assertion', async () => {
  const db = new Memory(); db.state.picks.forEach(p => p.game_id = 'missing'); await run(db, old);
  assert.throws(() => zero(db), assert.AssertionError); assert.equal(db.state.claims.length, 1);
});
test('completed claims preserved even with mapping missing', async () => {
  const db = new Memory(); db.state.claims.push({ pool_id: 'P', season: 2026, week_number: 7, summary: { completed: true } }); db.state.picks.forEach(p => p.game_id = 'missing');
  const before = JSON.stringify(db.state); assert.equal((await run(db)).reason, 'ALREADY_WRAPPED_UP'); assert.equal(JSON.stringify(db.state), before); assert.deepEqual(db.events[0].actions, []);
});
test('failure after effects rolls back; competing ready retries apply once', async () => {
  const db = new Memory(); const before = JSON.stringify(db.state); db.fail = true; await assert.rejects(run(db), /injected/); assert.equal(JSON.stringify(db.state), before); assert.equal(db.events[0].outcome, 'ROLLBACK');
  db.fail = false; const rs = await Promise.all([run(db), run(db)]); assert.equal(rs.filter(r => r.applied).length, 1); assert.equal(rs.filter(r => r.reason === 'ALREADY_WRAPPED_UP').length, 1); assert.equal(db.state.claims.length, 1); assert.equal(db.state.outbox.length, 2); assert.equal(db.state.inbox.length, 2);
});
async function poll(fixedSource, rows, feed, lock = true) {
  const p = 'src/services/liveScorePoller.ts'; const src = fixedSource ? candidates[p] : original(p); const state = clone(rows);
  const matches = (r, w) => Object.entries(w).every(([k, v]) => k === 'OR' ? v.some(x => matches(r, x)) : v && typeof v === 'object' ? v.in.includes(r[k]) : r[k] === v);
  const api = evaluate('let isExecuting = false;\n' + slice(src, 'export async function tickLiveScorePoller()', '\n/**'), {
    GameStatus: { FINAL: 'FINAL', IN_PROGRESS: 'IN_PROGRESS', SCHEDULED: 'SCHEDULED' },
    LiveScoreboardService: { fetchLiveScores: async () => feed }, tryAcquireAdvisoryLock: async () => lock,
    prisma: { $transaction: async fn => fn({ game: { findMany: async ({ where }) => state.filter(r => matches(r, where)), update: async ({ where, data }) => Object.assign(state.find(r => r.id === where.id), data) } }) },
  }, 'tickLiveScorePoller');
  return { result: await api(), state };
}
const feed = { gameId: '401999', season: 2026, weekNumber: 7, awayTeam: 'PIT', homeTeam: 'NO', awayScore: 24, homeScore: 21, isFinal: true, isLive: false };
const rows = ['2026_w07_PIT_NO', '2026_w08_PIT_NO', '2025_w07_PIT_NO', '2026_w07_NO_PIT', 'espn_401999', '401999', 'unrelated'].map((externalGameId, i) => ({ id: String(i), externalGameId, awayTeamId: i === 3 ? 'NO' : 'PIT', homeTeamId: i === 3 ? 'PIT' : 'NO', status: 'SCHEDULED', awayScore: null, homeScore: null }));
test('poller exact identities only; other week/season/reverse untouched', async () => {
  const { result, state } = await poll(true, rows, [feed]); assert.equal(result.updatedCount, 3);
  for (const i of [0, 4, 5]) { assert.equal(state[i].awayScore, 24); assert.equal(state[i].homeScore, 21); }
  for (const i of [1, 2, 3, 6]) assert.deepEqual(state[i], rows[i]);
  const oldResult = await poll(false, rows, [feed]); assert.throws(() => assert.equal(oldResult.result.updatedCount, 3), assert.AssertionError); assert.equal(oldResult.state[3].awayScore, 24);
});
test('poller rejects reverse orientation even with exact event ID, missing ID and unknown identity', async () => {
  const reversed = [{ ...rows[4], awayTeamId: 'NO', homeTeamId: 'PIT' }]; assert.equal((await poll(true, reversed, [feed])).result.updatedCount, 0);
  for (const f of [{ ...feed, gameId: '' }, { ...feed, gameId: 'unknown', season: undefined, weekNumber: undefined }]) assert.equal((await poll(true, rows, [f])).result.updatedCount, 0);
});
test('poller final-to-live guard, lock refusal, aliases and lowercase canonical identity', async () => {
  const live = await poll(true, rows, [{ ...feed, isFinal: false, isLive: true }]); assert.equal(live.result.updatedCount, 3); assert.equal(live.state[0].status, 'IN_PROGRESS');
  const final = rows.map(r => ({ ...r, status: 'FINAL' })); assert.equal((await poll(true, final, [{ ...feed, isFinal: false, isLive: true }])).result.updatedCount, 0);
  assert.equal((await poll(true, rows, [feed], false)).result.reason, 'LOCK_UNAVAILABLE');
  const alias = [{ ...rows[0], externalGameId: '2026_w07_jax_was', awayTeamId: 'jax', homeTeamId: 'was' }]; assert.equal((await poll(true, alias, [{ ...feed, awayTeam: 'JAC', homeTeam: 'WSH' }])).result.updatedCount, 1);
});
test('poller missing canonical scope does not guess from teams; pregame ignored', async () => {
  const scoped = await poll(true, rows, [{ ...feed, season: undefined, weekNumber: undefined }]);
  assert.equal(scoped.result.updatedCount, 2); assert.deepEqual(scoped.state[0], rows[0]);
  assert.equal((await poll(true, rows, [{ ...feed, isFinal: false, isLive: false }])).result.updatedCount, 0);
});
test('actual candidate feed mapper provides canonical scope metadata', async () => {
  const p = 'src/services/LiveScoreboardService.ts';
  const api = evaluate(candidates[p], { AbortSignal: { timeout: () => undefined }, fetch: async () => ({ ok: true, json: async () => ({ season: { year: 2026 }, week: { number: 7 }, events: [{ id: '401999', competitions: [{ competitors: [{ homeAway: 'away', team: { abbreviation: 'PIT' }, score: '24' }, { homeAway: 'home', team: { abbreviation: 'NO' }, score: '21' }] }], status: { type: { state: 'post' } } }] }) }) }, 'LiveScoreboardService');
  const games = await api.fetchLiveScores(); assert.equal(games[0].season, 2026); assert.equal(games[0].weekNumber, 7); assert.equal((await poll(true, rows, games)).result.updatedCount, 3);
});
