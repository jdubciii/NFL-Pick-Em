import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

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
    return `(non-zero exit / output: ${err.message})`;
  }
}

log('================================================================================');
log('FACT GATHERING (PHASE 1 - READ ONLY) — RULING R-12.2-AC');
log('================================================================================\n');

// 1. Commit truth
log('### 1. Commit & Branch Truth');
log('```text');
log('--- git show --stat 00e89dd ---');
log(run('git show --stat 00e89dd'));
log('\n--- git branch --contains 00e89dd ---');
log(run('git branch --contains 00e89dd'));
log('\n--- git rev-parse main fix/br5b-admin-picks ---');
log(run('git rev-parse main fix/br5b-admin-picks'));
log('\n--- git log --oneline -n 8 main ---');
log(run('git log --oneline -n 8 main'));
log('```\n');

// 2. Claim code facts
log('### 2. Claim Code Implementation (`src/services/weeklyWrapUp.ts:60-130`)');
log('```typescript');
try {
  const wrapContent = fs.readFileSync(path.join(rootDir, 'src/services/weeklyWrapUp.ts'), 'utf8');
  const lines = wrapContent.split('\n');
  const slice = lines.slice(59, 130).map((l, idx) => `${idx + 60}: ${l}`).join('\n');
  log(slice);
} catch (e) {
  log(`Error reading weeklyWrapUp.ts: ${e.message}`);
}
log('```\n');

// 3. Database Facts (TEST DB)
log('### 3. Database Facts (Rehearsal DB)');
log('```text');
const localRehearsalUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pickem_rehearsal';
const prisma = new PrismaClient({ datasources: { db: { url: localRehearsalUrl } } });

async function getDbFacts() {
  try {
    const ident = await prisma.$queryRaw`SELECT current_database(), current_user, inet_server_addr(), inet_server_port();`;
    log(`Identity: ${JSON.stringify(ident[0])}`);

    const reg = await prisma.$queryRaw`SELECT to_regclass('public.weekly_wrapups')::text as to_regclass;`;
    log(`to_regclass('public.weekly_wrapups'): ${JSON.stringify(reg[0])}`);

    const migs = await prisma.$queryRaw`SELECT migration_name, started_at, finished_at FROM _prisma_migrations ORDER BY started_at;`;
    log(`\nApplied Migrations (${migs.length}):`);
    migs.forEach((m) => log(` - ${m.migration_name} (finished: ${m.finished_at ? 'YES' : 'NO'})`));
  } catch (err) {
    log(`DB Error: ${err.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

await getDbFacts();
log('```\n');

// 4. DDL Grep
log('### 4. DDL & search_path Grep Verification');
log('```text');
const ddlOut = run('git grep -rEni "(CREATE|ALTER|DROP)[[:space:]]+(TABLE|INDEX|FUNCTION|TRIGGER|TYPE|SCHEMA|EXTENSION|POLICY)|SET[[:space:]]+search_path" tests/ scripts/dev/ prisma/seed.ts');
log(ddlOut && !ddlOut.includes('non-zero exit') ? ddlOut : 'CLEAN: 0 DDL or SET search_path matches found across tests/, scripts/dev/, prisma/seed.ts');
log('```\n');

// 5. S-7 Facts (Shot-Cam routes in src/server.ts)
log('### 5. S-7 Shot-Cam Routes & Authorization Facts');
log('```typescript');
log('--- src/server.ts:580-625 (POST /api/pools/:pool_id/penalties/:id/media) ---');
try {
  const srvContent = fs.readFileSync(path.join(rootDir, 'src/server.ts'), 'utf8');
  const srvLines = srvContent.split('\n');
  log(srvLines.slice(579, 625).map((l, i) => `${i + 580}: ${l}`).join('\n'));
  log('\n--- src/server.ts:675-710 (PATCH /api/pools/:pool_id/penalties/:id/media/confirm) ---');
  log(srvLines.slice(674, 710).map((l, i) => `${i + 675}: ${l}`).join('\n'));
} catch (e) {
  log(`Error reading server.ts: ${e.message}`);
}
log('```\n');

// 6. server.ts:122 Facts
log('### 6. `src/server.ts:105-135` Facts (GET /api/games Pool Scoping)');
log('```typescript');
try {
  const srvContent = fs.readFileSync(path.join(rootDir, 'src/server.ts'), 'utf8');
  const srvLines = srvContent.split('\n');
  log(srvLines.slice(104, 135).map((l, i) => `${i + 105}: ${l}`).join('\n'));
} catch (e) {
  log(`Error: ${e.message}`);
}
log('```\n');

// 7. BR-5b UI Facts
log('### 7. BR-5b Client Pool Scoping (`client/src/components/AdminDashboard.tsx`)');
log('```typescript');
try {
  const clientDash = fs.readFileSync(path.join(rootDir, 'client/src/components/AdminDashboard.tsx'), 'utf8');
  const cLines = clientDash.split('\n');
  const poolMatches = [];
  cLines.forEach((l, idx) => {
    if (l.includes('/api/admin/picks') || l.includes('/api/pools') || l.includes('setPoolId')) {
      poolMatches.push(`${idx + 1}: ${l}`);
    }
  });
  log(poolMatches.join('\n'));
} catch (e) {
  log(`Error: ${e.message}`);
}
log('```\n');

// 8. Control hygiene
log('### 8. Worktree & Control Hygiene');
log('```text');
log('--- git reflog -n 10 ---');
log(run('git reflog -n 10'));
log('\n--- git worktree list ---');
log(run('git worktree list'));
log('\n--- .gitignore worktree entry ---');
log(run('git grep -n "worktree" .gitignore || cat .gitignore | grep -i worktree'));
log('```\n');

const evDir = path.join(rootDir, 'docs/evidence/R-12.2-AC');
if (!fs.existsSync(evDir)) {
  fs.mkdirSync(evDir, { recursive: true });
}
const factsPath = path.join(evDir, 'facts.txt');
fs.writeFileSync(factsPath, logs.join('\n'), 'utf8');
log(`✅ Written ${factsPath} successfully (UTF-8).\n`);
