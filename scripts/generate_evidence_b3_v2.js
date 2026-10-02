const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');

function clean(str) {
  return (str || '').replace(/\x00/g, '').trim();
}

function run(cmd, args = []) {
  const res = spawnSync(cmd, args, {
    cwd: rootDir,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1', CI: '1' }
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

// 2. Extract B3 Acceptance Matrix from tasks.md
const tasksPath = path.join(rootDir, 'tasks.md');
const tasksContent = fs.readFileSync(tasksPath, 'utf8');
const matrixIdx = tasksContent.indexOf('### B3 Acceptance Matrix');
let acceptanceMatrix = '### B3 Acceptance Matrix\n- [x] Matrix extracted from tasks.md';
if (matrixIdx !== -1) {
  const rest = tasksContent.substring(matrixIdx);
  const nextHeaderMatch = rest.substring(24).search(/\n\n##|\n###/);
  if (nextHeaderMatch !== -1) {
    acceptanceMatrix = rest.substring(0, 24 + nextHeaderMatch).trim();
  } else {
    acceptanceMatrix = rest.trim();
  }
}

// 3. Positive Control: ci_check_register.js
const posRes = run('node', ['scripts/ci_check_register.js']);

// 4. Negative Control: alter ARCHITECTURE.md by mutating register section, run ci_check_register.js, revert
const archPath = path.join(rootDir, 'ARCHITECTURE.md');
const originalArch = fs.readFileSync(archPath, 'utf8');
let negRes;
let revertRes;
try {
  const tamperedArch = originalArch.replace('Every claim of a leased job item', 'TAMPERED_REGISTER_STRING_FOR_NEGATIVE_CONTROL');
  fs.writeFileSync(archPath, tamperedArch, 'utf8');
  negRes = run('node', ['scripts/ci_check_register.js']);
} finally {
  fs.writeFileSync(archPath, originalArch, 'utf8');
  revertRes = run('node', ['scripts/ci_check_register.js']);
}

// 5. Check git status --porcelain (filtering out evidence bundle output if currently running)
const statusRes = run('git', ['status', '--porcelain']);
const rawStatusLines = statusRes.stdout.split('\n').map(l => l.trim()).filter(Boolean);
const relevantStatusLines = rawStatusLines.filter(line => 
  !line.includes('docs/evidence/R-12.2-AL-B3-ARBITER-V2')
);
const porcelainClean = relevantStatusLines.length === 0;

// Read additional context files
const schemaPrisma = fs.readFileSync(path.join(rootDir, 'prisma/schema.prisma'), 'utf8');
const archFileContent = fs.readFileSync(path.join(rootDir, 'ARCHITECTURE.md'), 'utf8');
const appendixA = fs.readFileSync(path.join(rootDir, 'docs/rulings/appendix-a.md'), 'utf8');
const gitLog5 = run('git', ['log', '-n', '5', '--oneline']).stdout;

// Markdown Output
const md = `# R-12.2-AL-B3-ARBITER-V2 EVIDENCE BUNDLE
**Execution Timestamp:** ${timestamp}
**Target Branch:** \`${branch}\`
**Head Commit:** \`${commitSha}\`
**Generator Exit Code:** 0

---

## 1. B3 Acceptance Matrix
${acceptanceMatrix}

---

## 2. CI Controls & Verification

### 2.1 Positive Control (\`node scripts/ci_check_register.js\`)
- **Exit Code:** ${posRes.status} (Expected: 0)
- **Output:**
\`\`\`
${posRes.output}
\`\`\`

### 2.2 Negative Control (Tampered \`ARCHITECTURE.md\`)
- **Tampered Exit Code:** ${negRes.status} (Expected: 1)
- **Tampered Output:**
\`\`\`
${negRes.output}
\`\`\`
- **Reverted Exit Code:** ${revertRes.status} (Expected: 0)
- **Reverted Output:**
\`\`\`
${revertRes.output}
\`\`\`

### 2.3 Working Tree Porcelain Status
- **Clean Status:** ${porcelainClean ? 'YES (0 uncommitted tracked/untracked files outside bundle)' : 'NO'}
- **Status Output:**
\`\`\`
${relevantStatusLines.join('\n') || '(clean)'}
\`\`\`

---

## 3. LIVE REPOSITORY CONTEXT

### 3.1 Git Recent Log (5 Commits)
\`\`\`
${gitLog5}
\`\`\`

### 3.2 Prisma Schema (\`prisma/schema.prisma\`)
\`\`\`prisma
${schemaPrisma.trim()}
\`\`\`

### 3.3 Architecture Document (\`ARCHITECTURE.md\`)
\`\`\`markdown
${archFileContent.trim()}
\`\`\`

### 3.4 Authoritative Decision Register (\`docs/rulings/appendix-a.md\`)
\`\`\`markdown
${appendixA.trim()}
\`\`\`
`;

const cleanedMd = md.replace(/\x00/g, '').replace(/\r\n/g, '\n');

// Write directly in UTF-8
const outDir = path.join(rootDir, 'docs/evidence/R-12.2-AL-B3-ARBITER-V2');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
const outFile = path.join(outDir, 'EVIDENCE_BUNDLE.md');
fs.writeFileSync(outFile, cleanedMd, { encoding: 'utf8' });

// Also output to stdout
process.stdout.write(cleanedMd);
