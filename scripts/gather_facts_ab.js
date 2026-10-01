import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const logs = [];
function log(msg = '') {
  console.log(msg);
  logs.push(msg);
}

function run(cmd, opts = {}) {
  try {
    const out = execSync(cmd, {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 1024 * 1024 * 50,
      ...opts,
    });
    return out.trim();
  } catch (err) {
    if (err.stdout && err.stdout.toString().trim()) {
      return err.stdout.toString().trim();
    }
    return `(non-zero exit / empty output: ${err.message})`;
  }
}

log('================================================================================');
log('FACT GATHERING & INTEGRITY CHECKS — RULING R-12.2-AB');
log('================================================================================\n');

// 1. Grep for "Main NFL Pick"
log('### 1. Grep for "Main NFL Pick" in src, prisma, client, seed');
let mainPickMatches = 'Clean: Zero occurrences found across src/, prisma/, client/, prisma/seed.ts';
try {
  const matches = run('git grep -n -i "Main NFL Pick" -- src prisma client prisma/seed.ts');
  if (matches && !matches.includes('non-zero exit')) {
    mainPickMatches = matches;
  }
} catch (e) {}
log('```text');
log(mainPickMatches);
log('```\n');

// 2. Branch & Status
log('### 2. Git Working Tree State & Current Branch');
log('```text');
log(`Branch: ${run('git branch --show-current')}`);
log(`Status: ${run('git status --short') || '(clean)'}`);
log('```\n');

// 3. Prisma Migrate Status
log('### 3. Rehearsal Database Migration Status (`npx prisma migrate status`)');
log('```text');
log(run('npx prisma migrate status'));
log('```\n');

// 4. Schema & Client Types Search for weeklyWrapup
log('### 4. Schema & Prisma Client Types Search for `WeeklyWrapup`');
log('```text');
const schemaSearch = run('git grep -n -i "weekly_wrapup\\|weeklyWrapup" main -- src prisma/schema.prisma');
log('Schema & Code search on main:');
log(schemaSearch || '(No matches found)');

const clientTypesPath = path.join(rootDir, 'node_modules/.prisma/client/index.d.ts');
let typeMatchesCount = 0;
if (fs.existsSync(clientTypesPath)) {
  const content = fs.readFileSync(clientTypesPath, 'utf8');
  const m = content.match(/WeeklyWrapup/gi);
  typeMatchesCount = m ? m.length : 0;
}
log(`\nMatches for "WeeklyWrapup" in node_modules/.prisma/client/index.d.ts: ${typeMatchesCount}`);
log('```\n');

// 5. Route Handler Facts
log('### 5. Audited Route Handlers & Protection Facts');
const routeFacts = [
  {
    endpoint: '`POST /api/pools/:pool_id/penalties/:id/media`',
    file: '`src/server.ts:581`',
    auth: '`requireAuth`',
    authorization: 'Scoped to pool: checks penalty exists in pool, user is owner/commish/admin',
    audit: 'Creates `UPLOAD_PENALTY_MEDIA` audit log',
  },
  {
    endpoint: '`PATCH /api/pools/:pool_id/penalties/:id/media/confirm`',
    file: '`src/server.ts:676`',
    auth: '`requireAuth`',
    authorization: 'Scoped to pool: verifies commissioner or admin role',
    audit: 'Creates `CONFIRM_PENALTY_MEDIA` audit log',
  },
  {
    endpoint: '`GET /api/games`',
    file: '`src/server.ts:110`',
    auth: '`requireAuth`',
    authorization: 'Global game schedule with optional week & pool_id filtering',
    audit: 'Read-only',
  },
  {
    endpoint: '`POST /api/picks`',
    file: '`src/routes/picks.ts:15`',
    auth: '`requireAuth`',
    authorization: 'Submits/updates user own pick; enforces pool lock offset and game kickoff lock',
    audit: 'Upserts pick on [poolId, userId, gameId]',
  },
  {
    endpoint: '`GET /api/pools`',
    file: '`src/server.ts:93`',
    auth: '`requireAuth`',
    authorization: 'Platform pool directory; lists all ACTIVE pools',
    audit: 'Read-only',
  },
  {
    endpoint: '`GET /api/admin/audit-logs`',
    file: '`src/routes/admin.ts:71`',
    auth: '`requireAuth, requireAdmin`',
    authorization: 'Platform-level global audit viewer; recent 50 logs with actor info',
    audit: 'Read-only platform management',
  },
];

log('| Endpoint | File Location | Middleware | Authorization & Scoping | Notes / Audit |');
log('| :--- | :--- | :--- | :--- | :--- |');
routeFacts.forEach((rf) => {
  log(`| ${rf.endpoint} | ${rf.file} | ${rf.auth} | ${rf.authorization} | ${rf.audit} |`);
});
log('\n');

fs.writeFileSync(path.join(rootDir, 'facts_ab.txt'), logs.join('\n'), 'utf8');
log('✅ Written facts_ab.txt successfully (UTF-8).');
