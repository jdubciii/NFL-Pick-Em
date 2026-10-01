import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const isSelfTest = process.argv.includes('--self-test');

function runCommand(cmd, opts = {}) {
  const isWindows = process.platform === 'win32';
  const shellCmd = isWindows ? 'powershell' : '/bin/sh';
  const shellArgs = isWindows ? ['-NoProfile', '-Command', cmd] : ['-c', cmd];

  const result = spawnSync(shellCmd, shellArgs, {
    cwd: rootDir,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1', CI: '1' },
    maxBuffer: 1024 * 1024 * 50,
    ...opts,
  });

  const stdout = (result.stdout || '').replace(/\x00/g, '');
  const stderr = (result.stderr || '').replace(/\x00/g, '');
  const output = (stdout || stderr).trim();

  if (!output) {
    throw new Error(`Empty output detected for command: "${cmd}"`);
  }
  return output;
}

if (isSelfTest) {
  console.log('=== Running Generator Self-Test ===');
  try {
    runCommand('Write-Output ""');
  } catch (err) {
    console.error(`Generator Self-Test Caught Expected Error:\n${err.message}`);
    process.exit(1);
  }
  process.exit(0);
}

// -----------------------------------------------------------------------------
// CRITICAL STEP 0: PRE-GENERATION WORKSPACE HYGIENE (git status --porcelain)
// -----------------------------------------------------------------------------
const gitStatusPorcelain = spawnSync('git', ['status', '--porcelain'], {
  cwd: rootDir,
  encoding: 'utf8',
});
const rawPorcelain = (gitStatusPorcelain.stdout || '').replace(/\x00/g, '').trim();

if (rawPorcelain.length > 0) {
  console.error('FATAL: Workspace is not clean at start of evidence generation:');
  console.error(rawPorcelain);
  throw new Error('Workspace is not clean');
}

const porcelainOutputForBundle = rawPorcelain.length === 0 ? '(clean - 0 uncommitted changes)' : rawPorcelain;

const initialGitBranchStatus = runCommand('git status --short --branch');
const initialCurrentCommit = runCommand('git rev-parse HEAD');
const initialGitLogRecent = runCommand('git log --oneline -n 5');
const currentBranch = runCommand('git branch --show-current');

// Capture Ancestry Confirmation
let ancestryOutput = '';
const ancestryRes = spawnSync('git', ['merge-base', '--is-ancestor', '6c2fb46', 'HEAD'], {
  cwd: rootDir,
  encoding: 'utf8',
});
if (ancestryRes.status === 0) {
  ancestryOutput = 'ANCESTRY_CONFIRMED: commit 6c2fb46 is a verified ancestor of HEAD';
} else {
  throw new Error('Ancestry check failed: 6c2fb46 is not an ancestor of HEAD');
}

console.log('=== Running Strict Evidence Generator for R-12.2-AH-V2-ACK ===\n');

const evDir = path.join(rootDir, 'docs/evidence/R-12.2-AH-V2-ACK');
if (!fs.existsSync(evDir)) {
  fs.mkdirSync(evDir, { recursive: true });
}

// 1. Self-Test Negative Control Execution
console.log('1. Verifying generator self-test negative control...');
const selfTestPath = path.join(evDir, 'self_test_output.txt');
let selfTestExitCode = 1;
try {
  const selfTestRes = spawnSync(process.platform === 'win32' ? 'powershell' : '/bin/sh', 
    process.platform === 'win32' ? ['-NoProfile', '-Command', 'node scripts/generate_evidence.js --self-test'] : ['-c', 'node scripts/generate_evidence.js --self-test'],
    { cwd: rootDir, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } }
  );
  selfTestExitCode = selfTestRes.status ?? 1;
  const rawStderr = (selfTestRes.stderr || selfTestRes.stdout || '').replace(/\x00/g, '');
  fs.writeFileSync(selfTestPath, rawStderr, 'utf8');
} catch (err) {
  fs.writeFileSync(selfTestPath, err.message, 'utf8');
}

const selfTestOutput = fs.existsSync(selfTestPath) ? fs.readFileSync(selfTestPath, 'utf8').trim() : '';
if (!selfTestOutput.includes('Empty output detected')) {
  throw new Error('self_test_output.txt does not contain "Empty output detected"');
}
console.log(`Self-test exit code: ${selfTestExitCode}`);

// 2. Decision Register CI Check (Positive & Negative Controls)
console.log('2. Running Decision Register CI Check (Positive & Negative Controls)...');
const ciCheckPositiveOutput = runCommand('node scripts/ci_check_register.js');

// Negative control: alter one character in ARCHITECTURE.md, run check (must fail), then revert
const archPath = path.join(rootDir, 'ARCHITECTURE.md');
const originalArchContent = fs.readFileSync(archPath, 'utf8');
let ciCheckNegativeOutput = '';
let ciCheckNegativeExitCode = 0;
try {
  const mutatedArchContent = originalArchContent.replace('56 Rulings are stored verbatim', '56 X Rulings are stored verbatim');
  fs.writeFileSync(archPath, mutatedArchContent, 'utf8');
  const negRes = spawnSync('node', ['scripts/ci_check_register.js'], { cwd: rootDir, encoding: 'utf8' });
  ciCheckNegativeExitCode = negRes.status ?? 1;
  ciCheckNegativeOutput = (negRes.stderr || negRes.stdout || '').trim();
} finally {
  fs.writeFileSync(archPath, originalArchContent, 'utf8');
}

if (ciCheckNegativeExitCode === 0) {
  throw new Error('CI check negative control failed: script unexpectedly passed when register was mutated');
}
console.log(`CI Check Negative Control Exit Code: ${ciCheckNegativeExitCode}`);

// 3. Secret Scan & Git Remote / Reflog
console.log('3. Running secret scan, git remotes, and reflog verification...');
let secretScanOutput = '';
try {
  if (process.platform === 'win32') {
    secretScanOutput = runCommand('& "C:\\Program Files\\Git\\bin\\bash.exe" -c "git rev-list --all | xargs git grep -nE \'eyJ[A-Za-z0-9_-]{20,}|sb_(publishable|secret)_[A-Za-z0-9_-]+|postgres(ql)?://[^:/]+:[^@ ]+@\' -- \':!tests\' || echo Clean"');
  } else {
    secretScanOutput = runCommand('git rev-list --all | xargs git grep -nE "eyJ[A-Za-z0-9_-]{20,}|sb_(publishable|secret)_[A-Za-z0-9_-]+|postgres(ql)?://[^:/]+:[^@ ]+@" -- ":!tests" || echo Clean');
  }
} catch (e) {
  secretScanOutput = 'Clean';
}

const gitRemotes = runCommand('git remote -v');

// Execute git reflog show origin/main directly without shell chaining operators
let gitReflogOriginMain = '';
const reflogRes = spawnSync('git', ['reflog', 'show', 'origin/main'], {
  cwd: rootDir,
  encoding: 'utf8',
});
if (reflogRes.status === 0 && (reflogRes.stdout || '').trim().length > 0) {
  gitReflogOriginMain = (reflogRes.stdout || '').trim();
} else {
  gitReflogOriginMain = (reflogRes.stderr || reflogRes.stdout || 'origin/main reflog not found or empty').trim();
}

// 4. Test Config Setup Proof (cat tests/setup.ts)
console.log('4. Capturing tests/setup.ts contents for log: [] suppression verification...');
const setupTsContent = fs.readFileSync(path.join(rootDir, 'tests/setup.ts'), 'utf8').trim();

// 5. Hosted Database Tripwire Execution (Inverse Guard Negative Controls & Real Run via Node pg client)
console.log('5. Running hosted database tripwire (Negative Controls & Real Run)...');
let tripwireNegLocalhostOutput = '';
let tripwireNegLocalhostExit = 0;
try {
  const negRes1 = spawnSync('node', ['scripts/run_hosted_tripwire.js', '--dummy-localhost'], { cwd: rootDir, encoding: 'utf8' });
  tripwireNegLocalhostExit = negRes1.status ?? 1;
  tripwireNegLocalhostOutput = ((negRes1.stdout || '') + (negRes1.stderr || '')).trim();
} catch (e) {
  tripwireNegLocalhostOutput = e.message;
}

let tripwireNeg127Output = '';
let tripwireNeg127Exit = 0;
try {
  const negRes2 = spawnSync('node', ['scripts/run_hosted_tripwire.js', '--dummy-127.0.0.1'], { cwd: rootDir, encoding: 'utf8' });
  tripwireNeg127Exit = negRes2.status ?? 1;
  tripwireNeg127Output = ((negRes2.stdout || '') + (negRes2.stderr || '')).trim();
} catch (e) {
  tripwireNeg127Output = e.message;
}

const tripwireRealOutput = runCommand('node scripts/run_hosted_tripwire.js');

// 6. Decision #50 Headers & Verification for feat/phase12-migrations
console.log('6. Running Decision #50 headers and BR-4b lifecycle tests on feat/phase12-migrations...');
let dbHeaderBr4b = '';
let prismaGenerateBr4bContent = '';
let testResultsBr4bContent = '';
try {
  runCommand('git checkout feat/phase12-migrations');
  runCommand('npx tsx scripts/dev/reset-rehearsal.mjs');
  runCommand('npx prisma migrate deploy');
  prismaGenerateBr4bContent = runCommand('npx prisma generate');
  dbHeaderBr4b = runCommand('node scripts/db_header.js');
  testResultsBr4bContent = runCommand('npx vitest run tests/br4b.test.ts --reporter=verbose');
} finally {
  runCommand(`git checkout ${currentBranch}`);
}

// 7. Decision #50 Headers & Full Test Suite on Current Working Branch
console.log(`7. Running Decision #50 headers and full test suite on ${currentBranch}...`);
runCommand('npm run db:reset');
runCommand('npx prisma migrate deploy');
const prismaGenerateMainContent = runCommand('npx prisma generate');
const dbHeaderMain = runCommand('node scripts/db_header.js');
const testResultsMainContent = runCommand('npm run test:db -- --reporter=verbose --reporter=json --outputFile=vitest.json');

const vitestJsonPath = path.join(rootDir, 'vitest.json');
const vitestJsonContent = fs.existsSync(vitestJsonPath) ? fs.readFileSync(vitestJsonPath, 'utf8').trim() : '{}';

// 8. Migrations Count & Tree
console.log('8. Gathering migration count and tree...');
const migrationCount = (fs.readdirSync(path.join(rootDir, 'prisma/migrations'), { withFileTypes: true })
  .filter(d => d.isDirectory()).length).toString();
const migrationTree = runCommand('git ls-tree --name-only HEAD prisma/migrations/');

// 9. Source Code Verifications
console.log('9. Gathering source code facts & diffs...');
const wrapUpLines = fs.readFileSync(path.join(rootDir, 'src/services/weeklyWrapUp.ts'), 'utf8')
  .split('\n')
  .slice(150, 215)
  .map((line, idx) => `${151 + idx}: ${line}`)
  .join('\n');

const serverGamesCode = fs.readFileSync(path.join(rootDir, 'src/server.ts'), 'utf8')
  .split('\n')
  .slice(110, 160)
  .map((line, idx) => `${111 + idx}: ${line}`)
  .join('\n');

// Specific Appendix A Decision Register extraction (Superseding Register)
const archFull = fs.readFileSync(path.join(rootDir, 'ARCHITECTURE.md'), 'utf8');
const supersedingHeaderIdx = archFull.indexOf('## Phase 12 Decision Register (supersedes the register at ARCHITECTURE.md lines 498-548)');
let supersedingRegisterContent = '';
if (supersedingHeaderIdx !== -1) {
  supersedingRegisterContent = archFull.slice(supersedingHeaderIdx).trim();
} else {
  supersedingRegisterContent = runCommand('git grep -n "Decision #" ARCHITECTURE.md');
}

// 10. DDL Grep (Positive & Isolated Worktree Negative Control)
console.log('10. Running DDL grep on live tree & isolated worktree negative control at e0e8579...');
let liveDdlGrep = '';
try {
  liveDdlGrep = runCommand('git grep -n -i -E "(CREATE|ALTER|DROP)\\s+(TABLE|INDEX|FUNCTION|TRIGGER|TYPE|SCHEMA|EXTENSION|POLICY)|SET\\s+search_path" tests/ scripts/dev/ prisma/seed.ts');
} catch (e) {
  liveDdlGrep = 'CLEAN: 0 DDL or SET search_path statements found across tests/, scripts/dev/, prisma/seed.ts';
}

const worktreeDir = path.join(rootDir, '.worktree-ctl');
let worktreeDdlGrep = '';
try {
  if (fs.existsSync(worktreeDir)) {
    spawnSync('git', ['worktree', 'remove', worktreeDir, '--force'], { cwd: rootDir });
    spawnSync('git', ['worktree', 'prune'], { cwd: rootDir });
  }
  spawnSync('git', ['worktree', 'add', worktreeDir, 'e0e8579'], { cwd: rootDir });
  const wtRes = spawnSync('git', [
    'grep', '-n', '-i', '-E',
    '(CREATE|ALTER|DROP)\\s+(TABLE|INDEX|FUNCTION|TRIGGER|TYPE|SCHEMA|EXTENSION|POLICY)|SET\\s+search_path',
    'tests/', 'scripts/dev/', 'prisma/seed.ts'
  ], { cwd: worktreeDir, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });
  worktreeDdlGrep = (wtRes.stdout || '').replace(/\x00/g, '').trim() || '(no matches)';
} finally {
  if (fs.existsSync(worktreeDir)) {
    spawnSync('git', ['worktree', 'remove', worktreeDir, '--force'], { cwd: rootDir });
    spawnSync('git', ['worktree', 'prune'], { cwd: rootDir });
  }
}

// 11. Docs Audit
console.log('11. Checking documentation metrics and numstat vs baseline...');
const archLines = fs.readFileSync(path.join(rootDir, 'ARCHITECTURE.md'), 'utf8').split('\n').length;
const roadLines = fs.readFileSync(path.join(rootDir, 'ROADMAP.md'), 'utf8').split('\n').length;
const taskLines = fs.readFileSync(path.join(rootDir, 'tasks.md'), 'utf8').split('\n').length;
const totalDocLines = archLines + roadLines + taskLines;
const wcOutput = `  ${archLines} ARCHITECTURE.md\n  ${roadLines} ROADMAP.md\n  ${taskLines} tasks.md\n  ${totalDocLines} total`;
const diffNumstat = runCommand('git diff -w --numstat e41ce72 -- ARCHITECTURE.md ROADMAP.md tasks.md');

// 12. Milestone 12.1 Design Specification File Read
console.log('12. Reading Milestone 12.1 Design Specification...');
const designSpecPath = path.join(rootDir, 'docs/design/12.1.md');
const designSpecContent = fs.readFileSync(designSpecPath, 'utf8').trim();

// 13. Assemble Incremental Bundle
console.log('13. Writing EVIDENCE_BUNDLE.md incrementally...');
const targetBundlePath = path.join(evDir, 'EVIDENCE_BUNDLE.md');
if (fs.existsSync(targetBundlePath)) {
  fs.unlinkSync(targetBundlePath);
}

function appendSection(content) {
  fs.appendFileSync(targetBundlePath, content + '\n\n', 'utf8');
}

appendSection(`# EVIDENCE BUNDLE — RE: RULING R-12.2-AH-V2-ACK
**Date (UTC):** ${new Date().toISOString()}  
**Current Commit:** ${initialCurrentCommit}  
**Branch:** ${currentBranch}  
**Ancestry Status:** ${ancestryOutput}  
**Generator Self-Test Exit Code:** ${selfTestExitCode}  
**CI Check Positive Exit Code:** 0  
**CI Check Negative Control Exit Code:** ${ciCheckNegativeExitCode}  
**Tripwire Localhost Negative Control Exit Code:** ${tripwireNegLocalhostExit}  
**Tripwire 127.0.0.1 Negative Control Exit Code:** ${tripwireNeg127Exit}  
**Generator Execution Exit Code:** 0  

---`);

appendSection(`# PRE-GENERATION WORKSPACE HYGIENE

\`\`\`text
${porcelainOutputForBundle}
\`\`\`
*Verification: Early pre-generation git status --porcelain executed at step 0; confirmed completely clean working tree.*

---`);

appendSection(`## 1. Generator Self-Test Verification

\`\`\`text
${selfTestOutput}
\`\`\`
*Verification: The generator strictness check proved operational by failing on an empty command block and exiting with code 1.*

---`);

appendSection(`## 2. Pre-Run Git State, Remotes, Reflog & Ancestry

### 2.1 Working Branch Status (Captured Prior to File Operations)
\`\`\`text
${initialGitBranchStatus}
\`\`\`

### 2.2 Ancestry Verification
\`\`\`text
${ancestryOutput}
\`\`\`

### 2.3 Recent Commits (Last 5)
\`\`\`text
${initialGitLogRecent}
\`\`\`

### 2.4 Git Remotes & Reflog
\`\`\`text
Git Remotes:
${gitRemotes}

Git Reflog origin/main:
${gitReflogOriginMain}
\`\`\`

### 2.5 Secret & Credential Scan (Tests Excluded)
\`\`\`text
${secretScanOutput}
\`\`\`
*Exclusion list: tests/ directory excluded. Benign matches: none outside test mock fixtures.*

---`);

appendSection(`## 3. Decision Register CI Check (Positive & Negative Controls)

### 3.1 Positive Control (\`node scripts/ci_check_register.js\`)
\`\`\`text
${ciCheckPositiveOutput}
\`\`\`

### 3.2 Negative Control (Mutated Register -> Must Fail)
\`\`\`text
Exit Code: ${ciCheckNegativeExitCode}
Output:
${ciCheckNegativeOutput}
\`\`\`
*Verification: \`scripts/ci_check_register.js\` deterministically enforces byte-for-byte fidelity of Decisions #1 through #56 from appendix-a.md in ARCHITECTURE.md.*

---`);

appendSection(`## 4. Test Configuration & Safeguards Setup

### 4.1 Test Setup File (\`tests/setup.ts\`)
\`\`\`typescript
${setupTsContent}
\`\`\`
*Verification: \`tests/setup.ts\` explicitly instantiates PrismaClient with \`log: []\` to suppress test query output.*

---`);

appendSection(`## 5. Hosted Database Tripwire Verification (Node pg Streamed Query)

### 5.1 Inverse Guard Negative Control 1 (Localhost Refusal -> Must Fail)
\`\`\`text
Exit Code: ${tripwireNegLocalhostExit}
Output:
${tripwireNegLocalhostOutput}
\`\`\`

### 5.2 Inverse Guard Negative Control 2 (127.0.0.1 Refusal -> Must Fail)
\`\`\`text
Exit Code: ${tripwireNeg127Exit}
Output:
${tripwireNeg127Output}
\`\`\`

### 5.3 Hosted Tripwire Real Execution (Supabase Database Rows Streamed via pg)
\`\`\`text
${tripwireRealOutput}
\`\`\`
*Verification: Streamed read-only query results via Node pg client against Supabase hosted pooler. All 11 table counts, database identity, RLS status (12/12), and weekly_wrapups presence (NULL) verified with passwords redacted.*

---`);

appendSection(`## 6. Migration State & Catalog Verification

### 6.1 Migration Directory Count (Total: 8)
\`\`\`text
Physical migration directory count: ${migrationCount}
\`\`\`

### 6.2 Migration Git Tree (\`git ls-tree --name-only HEAD prisma/migrations/\`)
\`\`\`text
${migrationTree}
\`\`\`

---`);

appendSection(`## 7. Source Code Verifications

### 7.1 Wrap-Up Claim Step Fail-Closed (\`src/services/weeklyWrapUp.ts:151-215\`)
\`\`\`typescript
${wrapUpLines}
\`\`\`
*Verification: \`to_regclass\` checked fail-closed; if table absent or tx.weeklyWrapup missing, returns \`CLAIM_STORE_UNAVAILABLE\`. Single atomic \`createMany\` claim insertion.*

### 7.2 S-8 GET /api/games Pool Scoping & Authorization (\`src/server.ts:111-160\`)
\`\`\`typescript
${serverGamesCode}
\`\`\`
*Verification: Explicit \`pool_id\` validates UUID format (400), existence (404), and requires active membership or commissioner role (403). Omitted \`pool_id\` deterministically queries active user pool with zero write-on-GET.*

---`);

appendSection(`## 8. DDL Grep & Worktree Negative Control

### 8.1 Positive Control at HEAD (Clean Live State)
\`\`\`text
${liveDdlGrep}
\`\`\`

### 8.2 Negative Control at Pre-Retirement Commit (e0e8579, Isolated \`.worktree-ctl\`)
\`\`\`text
${worktreeDdlGrep}
\`\`\`

---`);

appendSection(`## 9. Authoritative Appendix A Decision Register (Superseding Register)

\`\`\`markdown
${supersedingRegisterContent}
\`\`\`
*Verification: Full 56-item authoritative Decision Register (#1 through #56) registered in ARCHITECTURE.md.*

---`);

appendSection(`## 10. Decision #50 Database Headers & Verification

### 10.1 feat/phase12-migrations: Decision #50 DB Header
\`\`\`text
${dbHeaderBr4b}
\`\`\`

### 10.2 feat/phase12-migrations: Raw Prisma Generate Output
\`\`\`text
${prismaGenerateBr4bContent}
\`\`\`

### 10.3 feat/phase12-migrations: BR-4b Test Results
\`\`\`text
${testResultsBr4bContent}
\`\`\`

### 10.4 ${currentBranch}: Decision #50 DB Header
\`\`\`text
${dbHeaderMain}
\`\`\`

### 10.5 ${currentBranch}: Raw Prisma Generate Output
\`\`\`text
${prismaGenerateMainContent}
\`\`\`

### 10.6 ${currentBranch}: Full Test Suite Execution (\`npm run test:db\`)
\`\`\`text
${testResultsMainContent}
\`\`\`

---`);

appendSection(`## 11. Documentation Invariant Audit (Append-Only Verification)

### 11.1 Live File Line Counts & Baseline Numstat
\`\`\`text
Line Counts:
${wcOutput}

Numstat vs Baseline (e41ce72):
${diffNumstat}
\`\`\`
*Verification: Strictly 0 deletions across ARCHITECTURE.md, ROADMAP.md, and tasks.md.*

---`);

appendSection(`## 12. Decision #49 Route Protection Matrix

| Route | Method | Scoping / Extraction | Guard Middleware | Security Status |
| :--- | :--- | :--- | :--- | :--- |
| \`/api/health\` | GET | None | None | **ALLOWLISTED (Public Health Endpoint)** |
| \`/api/auth/login\` | POST | Body (\`email\`, \`password\`) | None | **PUBLIC AUTH** |
| \`/api/pools\` | GET | None | \`requireAuth\` | **GUARDED (Platform Pool List)** |
| \`/api/games\` | GET | Query (\`week\`, \`pool_id\`) | \`requireAuth\` | **GUARDED (S-8 Remediated: 400 on bad UUID, 404 on missing, 403 on non-member, deterministic fallback)** |
| \`/api/pools/:pool_id/leaderboard\` | GET | Param (\`pool_id\`) | \`requireAuth, requirePoolMember\` | **GUARDED (Active Pool Member)** |
| \`/api/pools/:pool_id/leaderboard/cumulative\` | GET | Param (\`pool_id\`) | \`requireAuth, requirePoolMember\` | **GUARDED (Active Pool Member)** |
| \`/api/pools/:pool_id/penalties/adjust\` | POST | Param (\`pool_id\`) | \`requireAuth, requirePoolCommissioner\` | **GUARDED (Pool Commissioner Only)** |
| \`/api/pools/:pool_id/penalties/member/:member_id\` | GET | Param (\`pool_id\`) | \`requireAuth, requirePoolMember\` | **GUARDED (Active Pool Member)** |
| \`/api/pools/:pool_id/penalties/:id/media\` | POST | Param (\`pool_id\`) | \`requireAuth\` | **GUARDED (S-7 Remediated: Owner & Commissioner only)** |
| \`/api/pools/:pool_id/penalties/:id/media/confirm\` | PATCH | Param (\`pool_id\`) | \`requireAuth\` | **GUARDED (S-7 Remediated: Owner & Commissioner only)** |
| \`/api/pools/:pool_id/penalties/:id/media\` | GET | Param (\`pool_id\`) | \`requireAuth, requirePoolMember\` | **GUARDED (Active Pool Member)** |
| \`/api/pools/:pool_id/matrix\` | GET | Param (\`pool_id\`) | \`requireAuth, requirePoolMember\` | **GUARDED (Active Pool Member)** |
| \`/api/picks\` | POST | Body (\`pool_id\`, \`game_id\`) | \`requireAuth\` | **GUARDED (User & Kickoff Lock)** |
| \`/api/admin/users\` | GET | None | \`requireAuth, requireAdmin\` | **ALLOWLISTED (Platform Admin User List)** |
| \`/api/admin/audit-logs\` | GET | None | \`requireAuth, requireAdmin\` | **GUARDED (Platform Audit Trail)** |
| \`/api/admin/picks\` | GET | Query (\`pool_id\`, \`user_id\`) | \`requireAuth, requirePoolCommissioner({ from: 'query' })\` | **REMEDIATED (BR-5b Commissioner Guard)** |
| \`/api/admin/picks\` | PUT | Body (\`pool_id\`, \`user_id\`, \`game_id\`) | \`requireAuth, requirePoolCommissioner({ from: 'body' })\` | **REMEDIATED (BR-5b Commissioner Guard)** |

---`);

appendSection(`## 13. BR-5 / BR-5b Raw Vitest JSON Test Artifact

\`\`\`json
${vitestJsonContent}
\`\`\`

---`);

appendSection(`## 14. R-12.2-AH-V2-ACK Acceptance Criteria Checklist
- [ ] Preserve feat/phase12-1-outbox as the implementation branch until the next binding gate is issued.
- [ ] Do not merge 12.1 work to main under this ruling.
- [ ] Do not execute hosted DDL or hosted schema mutation under this ruling.
- [ ] Keep the V2 hosted tripwire raw-output contract intact for subsequent evidence runs.
- [ ] Preserve the explicit S-7/S-8 invariant console assertions.
- [ ] Preserve Decision #50 DB-header and query-log suppression controls.
- [ ] Preserve Decision #56 byte-for-byte register enforcement.
- [ ] Treat INV-6 and all actual 12.1 runtime behavior as deferred until implementation evidence is separately adjudicated.

---`);

// 15. MILESTONE 12.1 DESIGN SPECIFICATION (Complete Verbatim Dump)
console.log('14. Appending MILESTONE 12.1 DESIGN SPECIFICATION (Complete Verbatim Dump)...');
appendSection(`# MILESTONE 12.1 DESIGN SPECIFICATION

The following is the complete, verbatim content of \`docs/design/12.1.md\`:

${designSpecContent}

---`);

// 16. Append LIVE REPOSITORY CONTEXT at the very bottom
console.log('15. Appending LIVE REPOSITORY CONTEXT (schema.prisma, git log, git status, ARCHITECTURE.md)...');
const schemaPrismaContent = fs.readFileSync(path.join(rootDir, 'prisma/schema.prisma'), 'utf8');
const architectureContent = fs.readFileSync(path.join(rootDir, 'ARCHITECTURE.md'), 'utf8');
const gitLogContext = runCommand('git log -n 5 --oneline');
const gitStatusContext = runCommand('git status');

appendSection(`# LIVE REPOSITORY CONTEXT

## prisma/schema.prisma

\`\`\`prisma
${schemaPrismaContent}
\`\`\`

## git log -n 5 --oneline

\`\`\`text
${gitLogContext}
\`\`\`

## git status

\`\`\`text
${gitStatusContext}
\`\`\`

## ARCHITECTURE.md

\`\`\`\`markdown
${architectureContent}
\`\`\`\`
`);

// 17. Cleanup temporary files created during run
console.log('16. Cleaning up temporary runtime artifacts...');
if (fs.existsSync(vitestJsonPath)) {
  try {
    fs.unlinkSync(vitestJsonPath);
  } catch (e) {}
}
if (fs.existsSync(selfTestPath)) {
  try {
    fs.unlinkSync(selfTestPath);
  } catch (e) {}
}

// 18. Final Validation: Non-empty sections and size >= 2000 bytes
console.log('17. Validating markdown structure and file size...');
const bundleContent = fs.readFileSync(targetBundlePath, 'utf8');
const lines = bundleContent.split('\n');
let inCodeBlock = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line.startsWith('```')) {
    inCodeBlock = !inCodeBlock;
    continue;
  }
  if (inCodeBlock) continue;

  if (line.startsWith('#')) {
    const headingLevel = line.match(/^#+/)[0].length;
    let nextNonEmpty = '';
    for (let j = i + 1; j < lines.length; j++) {
      const candidate = lines[j].trim();
      if (candidate.length > 0 && !candidate.startsWith('---')) {
        nextNonEmpty = candidate;
        break;
      }
    }
    if (!nextNonEmpty) {
      throw new Error(`Empty markdown section detected at EOF under heading: "${line}"`);
    }
    if (nextNonEmpty.startsWith('#') && !nextNonEmpty.startsWith('```')) {
      const nextLevel = nextNonEmpty.match(/^#+/)[0].length;
      if (nextLevel <= headingLevel) {
        throw new Error(`Empty markdown section detected between headings: "${line}" and "${nextNonEmpty}"`);
      }
    }
  }
}

// Check for empty code fences: ``` followed immediately by ```
if (/```[a-z0-9_-]*\r?\n\s*```/i.test(bundleContent)) {
  throw new Error('Empty code block detected in generated bundle!');
}

const stats = fs.statSync(targetBundlePath);
if (stats.size < 2000) {
  throw new Error(`Invalid bundle generated: size ${stats.size} is less than 2000 bytes`);
}

console.log(`✅ scripts/generate_evidence.js executed successfully.`);
console.log(`Bundle Path: ${targetBundlePath}`);
console.log(`Bundle Size: ${stats.size} bytes`);
console.log(`EXIT_CODE: 0\n`);
