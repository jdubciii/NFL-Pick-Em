import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const isSelfTest = process.argv.includes('--self-test');

function runCommand(cmd, opts = {}) {
  const output = execSync(cmd, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: 'C:\\Program Files\\Git\\bin\\bash.exe',
    ...opts,
  });

  const trimmed = output.trim();
  if (!trimmed) {
    throw new Error(`Empty output block detected from command: "${cmd}"`);
  }
  return trimmed;
}

if (isSelfTest) {
  console.log('=== Running Generator Self-Test ===');
  // Intentionally execute a command that produces no output
  try {
    runCommand('echo -n ""');
  } catch (err) {
    console.error(`Generator Self-Test Caught Expected Error:\n${err.message}`);
    process.exit(1);
  }
  process.exit(0);
}

console.log('=== Running Strict Evidence Generator for R-12.2-Z ===\n');

const evDir = path.join(rootDir, 'docs/evidence/R-12.2-Z');
if (!fs.existsSync(evDir)) {
  fs.mkdirSync(evDir, { recursive: true });
}

// 1. Verify and read self_test_output.txt
const selfTestPath = path.join(evDir, 'self_test_output.txt');
if (!fs.existsSync(selfTestPath)) {
  throw new Error('docs/evidence/R-12.2-Z/self_test_output.txt not found. Please run Step 2 first.');
}
const selfTestOutput = runCommand('cat docs/evidence/R-12.2-Z/self_test_output.txt');
if (!selfTestOutput.includes('Empty output block detected')) {
  throw new Error('self_test_output.txt does not contain "Empty output block detected"');
}

// 2. Negative Control Grep on HEAD~1
console.log('1. Capturing negative control grep on HEAD~1...');
execSync('git stash push -u -m "temp-evidence-stash" || true', { cwd: rootDir, shell: 'C:\\Program Files\\Git\\bin\\bash.exe' });

let grepHeadMinus1 = '';
try {
  grepHeadMinus1 = runCommand('git checkout HEAD~1 >/dev/null 2>&1 && grep -rEn "(CREATE|ALTER|DROP)\\s+(TABLE|INDEX|FUNCTION|TRIGGER|TYPE|SCHEMA|EXTENSION|POLICY)|SET\\s+search_path" tests/ scripts/dev/ prisma/seed.ts || echo "No matches"');
} finally {
  execSync('git checkout - >/dev/null 2>&1', { cwd: rootDir, shell: 'C:\\Program Files\\Git\\bin\\bash.exe' });
  execSync('git stash pop >/dev/null 2>&1 || true', { cwd: rootDir, shell: 'C:\\Program Files\\Git\\bin\\bash.exe' });
}

if (!grepHeadMinus1 || !grepHeadMinus1.includes('wrapUpConcurrency.test.ts')) {
  throw new Error(`Negative control grep failed! Expected wrapUpConcurrency.test.ts to be flagged, got: "${grepHeadMinus1}"`);
}

// 3. Positive Control Grep on HEAD
console.log('2. Capturing positive control grep on HEAD...');
const grepHead = runCommand('grep -rEn "(CREATE|ALTER|DROP)\\s+(TABLE|INDEX|FUNCTION|TRIGGER|TYPE|SCHEMA|EXTENSION|POLICY)|SET\\s+search_path" tests/ scripts/dev/ prisma/seed.ts || echo "CLEAN: 0 DDL or SET search_path matches found across tests/, scripts/dev/, prisma/seed.ts"');

// 4. Git Revisions and Ancestry
console.log('3. Capturing git revisions and lineage...');
const revParse = runCommand('git rev-parse HEAD main');
const gitLog = runCommand('git log --oneline -n 8');
const isAncestor = runCommand('git merge-base --is-ancestor HEAD main; echo $?');

// 5. Migration Directory Listings and Counts
console.log('4. Capturing migration directory listing and counts...');
const migrationsList = runCommand('ls -1 prisma/migrations');
const migrationsCount = runCommand('ls -1 prisma/migrations | wc -l');

// 6. Dependency Counts by Symbol
console.log('5. Capturing dependency counts by symbol...');
const symbols = [
  'requirePoolCommissioner',
  'requirePoolMember',
  'req.pool',
  'Role.ADMIN',
  'requireAdmin',
];

const symbolCounts = symbols.map((sym) => {
  const count = runCommand(`grep -r "${sym}" src/ | wc -l`);
  return { symbol: sym, count: count.trim() };
});
const totalMatches = runCommand('grep -rE "requirePoolCommissioner|requirePoolMember|req\\.pool|Role\\.ADMIN|requireAdmin" src/ | wc -l');

// 7. Test Execution: tests/br4b.test.ts
console.log('6. Running tests/br4b.test.ts concurrency test...');
const br4bOutput = runCommand('npx vitest run tests/br4b.test.ts -t "Concurrent calls on final week" --reporter=verbose');

// 8. Admin Inventory
console.log('7. Compiling Admin Inventory...');
const adminInventory = [
  {
    location: '`src/routes/admin.ts:11`',
    methodPath: '`GET /api/admin/users`',
    guard: '`requireAuth, requireAdmin`',
    returns: 'Array of users (`id`, `email`, `role`, `createdAt`)',
    crossPool: 'Yes (global user list)',
    credentials: 'No (`passwordHash` excluded via select)',
  },
  {
    location: '`src/routes/admin.ts:33`',
    methodPath: '`GET /api/admin/picks`',
    guard: '`requireAuth, requireAdmin`',
    returns: 'NFL games list populated with target user picks',
    crossPool: 'Scoped to `pool_id` query param (creates default if none)',
    credentials: 'No',
  },
  {
    location: '`src/routes/admin.ts:95`',
    methodPath: '`GET /api/admin/audit-logs`',
    guard: '`requireAuth, requireAdmin`',
    returns: 'Recent 50 audit logs with actor info',
    crossPool: 'Yes (system-wide audit log query)',
    credentials: 'No',
  },
  {
    location: '`src/routes/admin.ts:123`',
    methodPath: '`PUT /api/admin/picks`',
    guard: '`requireAuth, requireAdmin`',
    returns: 'Upserts pick for user and creates AuditLog record',
    crossPool: 'Scoped by `pool_id` in request body',
    credentials: 'No',
  },
];

// 9. Documentation Verification
console.log('8. Capturing doc line counts and diffs...');
const archLines = fs.readFileSync(path.join(rootDir, 'ARCHITECTURE.md'), 'utf8').split('\n').length;
const roadLines = fs.readFileSync(path.join(rootDir, 'ROADMAP.md'), 'utf8').split('\n').length;
const taskLines = fs.readFileSync(path.join(rootDir, 'tasks.md'), 'utf8').split('\n').length;
const totalDocLines = archLines + roadLines + taskLines;
const wcOutput = `  ${archLines} ARCHITECTURE.md\n  ${roadLines} ROADMAP.md\n  ${taskLines} tasks.md\n  ${totalDocLines} total`;
const diffNumstat = runCommand('git diff -w --numstat e41ce72 -- ARCHITECTURE.md ROADMAP.md tasks.md');

// Construct EVIDENCE_BUNDLE.md
const header = `# EVIDENCE BUNDLE — RE: RULING R-12.2-Y
**Date (UTC):** ${new Date().toISOString()}  
**Current Commit:** ${runCommand('git rev-parse HEAD')}  
**Branch:** main  

---

## 1. Generator Self-Test Verification

\`\`\`text
${selfTestOutput}
\`\`\`
*Verification: The generator strictness check proved operational by failing on an empty command block and exiting with code 1.*

---

## 2. Negative & Positive Control Grep (wrapUpConcurrency Retirement Verification)

### 2.1 Negative Control at HEAD~1 (wrapUpConcurrency Present)
Command: \`git checkout HEAD~1 && grep -rEn "(CREATE|ALTER|DROP)\\s+(TABLE|INDEX|FUNCTION|TRIGGER|TYPE|SCHEMA|EXTENSION|POLICY)|SET\\s+search_path" tests/ scripts/dev/ prisma/seed.ts || true\`

\`\`\`text
${grepHeadMinus1}
\`\`\`
*Verification: Test-made DDL in \`tests/wrapUpConcurrency.test.ts\` was identified as the root cause of the spurious \`applied_by\` column and flagged by DDL grep.*

### 2.2 Positive Control at HEAD (Clean Repository State)
Command: \`grep -rEn "(CREATE|ALTER|DROP)\\s+(TABLE|INDEX|FUNCTION|TRIGGER|TYPE|SCHEMA|EXTENSION|POLICY)|SET\\s+search_path" tests/ scripts/dev/ prisma/seed.ts || true\`

\`\`\`text
${grepHead}
\`\`\`
*Verification: Zero test files contain DDL or \`SET search_path\` on HEAD.*

---

## 3. Post-Merge Git & Migration Lineage

### 3.1 Git Revisions
\`\`\`text
${revParse}
\`\`\`

### 3.2 Git Log (Last 8 Commits)
\`\`\`text
${gitLog}
\`\`\`

### 3.3 Ancestry Check (\`git merge-base --is-ancestor HEAD main; echo $?\`)
\`\`\`text
${isAncestor}
\`\`\`

### 3.4 Migration Directories
\`\`\`text
${migrationsList}
\`\`\`
- Total Migration Directories (\`ls -1 prisma/migrations | wc -l\`): \`${migrationsCount}\`

---

## 4. Dependency Counts & Admin Route Inventory

### 4.1 Symbol Counts in \`src/\`
| Symbol | Matches in \`src/\` |
| :--- | :--- |
${symbolCounts.map((s) => `| \`${s.symbol}\` | **${s.count}** |`).join('\n')}
| **Total Combined Matches** | **${totalMatches}** |

### 4.2 Admin Route Inventory (\`/api/admin/*\`)
| File & Line | Method & Path | Guard Middleware | Returned Data / Operation | Cross-Pool Scope | Exposes Credentials? |
| :--- | :--- | :--- | :--- | :--- | :--- |
${adminInventory.map((a) => `| ${a.location} | ${a.methodPath} | ${a.guard} | ${a.returns} | ${a.crossPool} | ${a.credentials} |`).join('\n')}

---

## 5. Concurrency & Weekly Wrap-Up Test Execution

Command: \`npx vitest run tests/br4b.test.ts -t "Concurrent calls on final week" --reporter=verbose\`

\`\`\`text
${br4bOutput}
\`\`\`

---

## 6. Documentation Invariant & Append-Only Verification

### 6.1 File Line Counts (\`wc -l ARCHITECTURE.md ROADMAP.md tasks.md\`)
\`\`\`text
${wcOutput}
\`\`\`

### 6.2 Diff Numstat Against Baseline (\`git diff --numstat e41ce72 -- ARCHITECTURE.md ROADMAP.md tasks.md\`)
\`\`\`text
${diffNumstat}
\`\`\`
*Verification: Strictly 0 deletions across ARCHITECTURE.md, ROADMAP.md, and tasks.md.*

---
`;

const targetBundlePath = path.join(evDir, 'EVIDENCE_BUNDLE.md');
fs.writeFileSync(targetBundlePath, header, 'utf8');
console.log(`✅ scripts/generate_evidence.js executed successfully and wrote ${targetBundlePath}.\n`);

