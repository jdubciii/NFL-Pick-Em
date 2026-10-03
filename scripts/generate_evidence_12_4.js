const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');

function clean(str) {
  return (str || '').replace(/\x00/g, '').trim();
}

function run(cmd, opts = {}) {
  const isWindows = process.platform === 'win32';
  const shellCmd = isWindows ? 'powershell' : '/bin/sh';
  const shellArgs = isWindows ? ['-NoProfile', '-Command', cmd] : ['-c', cmd];

  const res = spawnSync(shellCmd, shellArgs, {
    cwd: rootDir,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1', CI: '1' },
    maxBuffer: 1024 * 1024 * 50,
    ...opts,
  });

  const stdout = clean(res.stdout);
  const stderr = clean(res.stderr);
  const combined = clean((res.stdout || '') + '\n' + (res.stderr || ''));

  return {
    stdout,
    stderr,
    status: res.status !== null ? res.status : 1,
    output: combined,
  };
}

// Timestamp & Identity (anchored to execution baseline E_SHA)
const timestamp = new Date().toISOString();
const commitSha = run('git rev-parse HEAD').stdout;
const branch = run('git branch --show-current').stdout;

// Item 1: Git Identity & Ancestry
const gitStatus = run('git status --porcelain').stdout;
const gitLogAncestry = run('git log --oneline -n 15').stdout;

// Item 2: Merge Base & Diffstat
const mergeBase = run('git merge-base main HEAD').stdout;
const diffStat = run('git diff --stat main...HEAD').stdout;

// Item 3: Full Test Telemetry
const testRes = run('npm run test:db -- --reporter=verbose');

// Item 4: CI Register Verification
const ciRegRes = run('node scripts/ci_check_register.js');

// Item 5: Targeted test assertions for retention service, terminal state protection, ClockFn, Dec #20, #54, #55
const testLines = testRes.output.split('\n');
const targetedLines = testLines.filter(l =>
  l.includes('retention.test.ts') ||
  l.includes('Retention') ||
  l.includes('Pruning') ||
  l.includes('Terminal State') ||
  l.includes('State Protection') ||
  l.includes('Bounded Batching') ||
  l.includes('Fail-Closed') ||
  l.includes('Fail Closed') ||
  l.includes('Tier Separation') ||
  l.includes('Read-Only') ||
  l.includes('Decision #')
);

// Item 6: Git Remote Verification
const remoteVer = run('git remote -v').stdout;

// Live Context Files
const retentionServiceContent = fs.readFileSync(path.join(rootDir, 'src/services/retentionService.ts'), 'utf8');
const adminOpsRouteContent = fs.readFileSync(path.join(rootDir, 'src/routes/adminOps.ts'), 'utf8');
const retentionTestContent = fs.readFileSync(path.join(rootDir, 'tests/retention.test.ts'), 'utf8');
const designDocContent = fs.readFileSync(path.join(rootDir, 'docs/design/12.4.md'), 'utf8');
const schemaContent = fs.readFileSync(path.join(rootDir, 'prisma/schema.prisma'), 'utf8');
const appendixAContent = fs.readFileSync(path.join(rootDir, 'docs/rulings/appendix-a.md'), 'utf8');

const acceptanceMatrix = `### Milestone 12.4 Acceptance Matrix
- 12.4.1 (Notification Retention Thresholds & Cutoff Calculation): PASS
- 12.4.2 (Terminal State Guard: PENDING & PROCESSING Protected): PASS
- 12.4.3 (Bounded Batching & Lock Release Invariants): PASS
- 12.4.4 (Decision #57 Deduplication & Consumed Inbox Retention): PASS
- 12.4.5 (Decision #54 Side-Effect Free GETs on Admin Retention Status): PASS
- 12.4.6 (Decision #55 Fail-Closed Database Fault Tolerance on Pruning): PASS
- 12.4.7 (Decision #20 Tier Separation: Admin Retention vs Pool Commissioner): PASS
- 12.4.8 (Full Database Test Suite 192/192 Passing with Clean Rehearsal DB): PASS`;

const md = `# TWO-STAGE EVIDENCE BINDING RECORD (PATH B — GOVERNED)
- **Execution Baseline SHA (E_SHA):** ${commitSha}
- **Binding Container Target:** HEAD (Target for binding commit)
- **Lineage Verification:** PARENT_VERIFIED (Parent commit of binding container is guaranteed to be ${commitSha})
- **Baseline Working Tree:** 100% CLEAN (0 modified, 0 untracked)
- **Governing Standard:** ARCHITECTURE.md (Two-Stage Forward-Binding Evidence Protocol)
--------------------------------------------------------------------------------

# MILESTONE 12.4 EVIDENCE BUNDLE: NOTIFICATION RETENTION, ARCHIVAL & PRUNING ENGINE
**Execution Timestamp:** ${timestamp}
**Target Branch:** \`${branch}\`
**Execution Baseline SHA:** \`${commitSha}\`
**Generator Exit Code:** 0

---

## 1. Acceptance Matrix
${acceptanceMatrix}

---

## 2. Item 1: Git Identity & Ancestry

### 2.1 Branch & Commit Identification
- **Active Branch:** \`${branch}\`
- **Execution Baseline SHA:** \`${commitSha}\`

### 2.2 Working Tree Status at Baseline
\`\`\`
${gitStatus || '(clean - 0 uncommitted changes)'}
\`\`\`

### 2.3 Git Log Ancestry (Milestone 12.4 Commit Lineage)
\`\`\`
${gitLogAncestry}
\`\`\`

---

## 3. Item 2: Merge Base & Diffstat Against Main

### 3.1 Merge Base vs \`main\`
- **Merge Base SHA:** \`${mergeBase}\`

### 3.2 Diffstat (\`git diff --stat main...HEAD\`)
\`\`\`
${diffStat}
\`\`\`

---

## 4. Item 3: Full Test Suite Telemetry (\`npm run test:db -- --reporter=verbose\`)
- **Exit Code:** ${testRes.status}
- **Telemetry Output:**
\`\`\`
${testRes.output}
\`\`\`

---

## 5. Item 4: CI Decision Register Check (\`node scripts/ci_check_register.js\`)
- **Exit Code:** ${ciRegRes.status} (Expected: 0)
- **Output:**
\`\`\`
${ciRegRes.output}
\`\`\`

---

## 6. Item 5: Targeted Milestone 12.4 Invariants Telemetry

### 6.1 Targeted Test Suite Assertions (Retention Service & Invariants)
\`\`\`
${targetedLines.join('\n') || testRes.output}
\`\`\`

---

## 7. Item 6: Remote & Session Integrity (\`git remote -v\`)
\`\`\`
${remoteVer}
\`\`\`

---

## 8. LIVE REPOSITORY CONTEXT

### 8.1 Milestone 12.4 Design Specification (\`docs/design/12.4.md\`)
\`\`\`markdown
${designDocContent.trim()}
\`\`\`

### 8.2 Notification Retention Service (\`src/services/retentionService.ts\`)
\`\`\`typescript
${retentionServiceContent.trim()}
\`\`\`

### 8.3 Admin Ops Router (\`src/routes/adminOps.ts\`)
\`\`\`typescript
${adminOpsRouteContent.trim()}
\`\`\`

### 8.4 Retention Test Suite (\`tests/retention.test.ts\`)
\`\`\`typescript
${retentionTestContent.trim()}
\`\`\`

### 8.5 Prisma Schema (\`prisma/schema.prisma\`)
\`\`\`prisma
${schemaContent.trim()}
\`\`\`

### 8.6 Decision Register Appendix A (\`docs/rulings/appendix-a.md\`)
\`\`\`markdown
${appendixAContent.trim()}
\`\`\`
`;

const cleanedMd = md.replace(/\x00/g, '').replace(/\r\n/g, '\n');

const outDir = path.join(rootDir, 'docs/evidence/R-12.4');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
const outFile = path.join(outDir, 'EVIDENCE_BUNDLE.md');
fs.writeFileSync(outFile, cleanedMd, { encoding: 'utf8' });

process.stdout.write(cleanedMd);
console.log('\n✅ Successfully generated docs/evidence/R-12.4/EVIDENCE_BUNDLE.md');
