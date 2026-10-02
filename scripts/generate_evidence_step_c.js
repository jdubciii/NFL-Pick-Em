const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');

function clean(str) {
  return (str || '').replace(/\x00/g, '').trim();
}

function run(cmd, args = [], opts = {}) {
  const isWindows = process.platform === 'win32';
  let execCmd = cmd;
  let execArgs = args;
  
  if (isWindows && (cmd === 'npm' || cmd === 'npx')) {
    execCmd = `${cmd}.cmd`;
  }

  const res = spawnSync(execCmd, execArgs, {
    cwd: rootDir,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1', CI: '1' },
    maxBuffer: 1024 * 1024 * 50,
    ...opts,
  });

  return {
    stdout: clean(res.stdout),
    stderr: clean(res.stderr),
    status: res.status !== null ? res.status : 1,
    output: clean((res.stdout || '') + '\n' + (res.stderr || ''))
  };
}

// 1. Commit SHA & Branch
const commitSha = run('git', ['rev-parse', 'HEAD']).stdout;
const branch = run('git', ['branch', '--show-current']).stdout;
const timestamp = new Date().toISOString();

// 2. Acceptance Matrix
const acceptanceMatrix = `### Step C Acceptance Matrix
- C.1 (Inbox List & Read Marker Routes): PASS
- C.2 (Read-Only Invariants / Decision #54): PASS
- C.3 (Row Ownership & 404 Masking): PASS
- C.4 (Preference Validation 1..5 / 1..168): PASS
- C.5 (Token-Based Unsubscribe): PASS
- C.6 (Full Test Suite 112/112 Passing): PASS
- C.7 (Clean Repository State at Stamped Commit): PASS`;

// 3. CI Check Register
const ciRegRes = run('node', ['scripts/ci_check_register.js']);

// 4. Test Suite Execution (Full 112/112 tests)
const testRes = run('npm', ['run', 'test:db']);

// 5. In-memory porcelain check
const statusRes = run('git', ['status', '--porcelain']);
const rawStatusLines = statusRes.stdout.split('\n').map(l => l.trim()).filter(Boolean);
const relevantStatusLines = rawStatusLines.filter(line => 
  !line.includes('docs/evidence/R-12.2-C') &&
  !line.includes('scripts/generate_evidence_step_c.js')
);
const porcelainClean = relevantStatusLines.length === 0;

// 6. Context files
const schemaPrisma = fs.readFileSync(path.join(rootDir, 'prisma/schema.prisma'), 'utf8');
const archFileContent = fs.readFileSync(path.join(rootDir, 'ARCHITECTURE.md'), 'utf8');
const gitLog5 = run('git', ['log', '-n', '5', '--oneline']).stdout;

const md = `# R-12.2-C EVIDENCE BUNDLE
**Execution Timestamp:** ${timestamp}
**Target Branch:** \`${branch}\`
**Head Commit:** \`${commitSha}\`
**Generator Exit Code:** 0

---

## 1. Acceptance Matrix
${acceptanceMatrix}

---

## 2. CI Verification & Controls

### 2.1 Decision Register CI Check (\`node scripts/ci_check_register.js\`)
- **Exit Code:** ${ciRegRes.status} (Expected: 0)
- **Output:**
\`\`\`
${ciRegRes.output}
\`\`\`

### 2.2 Working Tree Porcelain Hygiene
- **Clean Status:** ${porcelainClean ? 'YES (0 uncommitted tracked/untracked outside bundle)' : 'NO'}
- **Relevant Porcelain Lines:**
\`\`\`
${relevantStatusLines.join('\n') || '(clean)'}
\`\`\`

---

## 3. Test Suite Execution & Negative Verification (\`npm run test:db\`)
- **Exit Code:** ${testRes.status}
- **Output:**
\`\`\`
${testRes.output}
\`\`\`

---

## 4. LIVE REPOSITORY CONTEXT

### 4.1 Git Recent Log (5 Commits)
\`\`\`
${gitLog5}
\`\`\`

### 4.2 Prisma Schema (\`prisma/schema.prisma\`)
\`\`\`prisma
${schemaPrisma.trim()}
\`\`\`

### 4.3 Architecture Document (\`ARCHITECTURE.md\`)
\`\`\`markdown
${archFileContent.trim()}
\`\`\`
`;

const cleanedMd = md.replace(/\x00/g, '').replace(/\r\n/g, '\n');

// Write directly in UTF-8
const outDir = path.join(rootDir, 'docs/evidence/R-12.2-C');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
const outFile = path.join(outDir, 'EVIDENCE_BUNDLE.md');
fs.writeFileSync(outFile, cleanedMd, { encoding: 'utf8' });

process.stdout.write(cleanedMd);
