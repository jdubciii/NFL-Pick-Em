const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetDir = path.join(__dirname, '../docs/evidence/M24.5');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function run(cmd, allowFail = false) {
  try {
    return execSync(cmd, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 30 });
  } catch (err) {
    if (allowFail) {
      return (err.stdout || '') + '\n' + (err.stderr || '') + `\n[Process exited with code ${err.status}]`;
    }
    throw err;
  }
}

const eSha = run('git rev-parse HEAD').trim();
const parentAnchor = 'fd0a4950c81687786cc825f2c842a6593d9f02f9';
const gitRemote = run('git remote -v');
const gitBranch = run('git branch -a');
const gitReflog = run('git reflog -n 15');
const nodeVersion = run('node -v');
const npmVersion = run('npm -v');
const tscOutput = run('npx tsc --noEmit', true);
const targetedVitest = run('npx vitest run tests/m24_5_phase24_closure.test.ts --reporter=verbose', true);
const cumulativeVitest = run('npx vitest run --reporter=verbose', true);
const fullDiff = run(`git diff ${parentAnchor} HEAD`);
const prePorcelain = run('git status --porcelain');
const migrations = fs.readdirSync(path.join(__dirname, '../prisma/migrations')).filter(f => !f.startsWith('.'));

const content = `# MILESTONE 24.5 RAW EVIDENCE BUNDLE: PHASE 24 CUMULATIVE CLOSURE

- **Milestone:** M24.5 (Phase 24 Cumulative Observability Dossier & Ratification)
- **Phase:** Phase 24 (Enterprise Observability, Automated Audit Telemetry & Operational Health)
- **Parent Container Anchor:** \`${parentAnchor}\`
- **Execution SHA (E_SHA):** \`${eSha}\`
- **Timestamp:** ${new Date().toISOString()}

---

## 1. GIT HYGIENE & LINEAGE (DECISION #53)
\`\`\`
${gitRemote.trim()}
\`\`\`
\`\`\`
${gitBranch.trim()}
\`\`\`
\`\`\`
${gitReflog.trim()}
\`\`\`

---

## 2. ENVIRONMENT & TYPECHECK TELEMETRY
- Node: \`${nodeVersion.trim()}\` | NPM: \`${npmVersion.trim()}\`
\`\`\`
${tscOutput.trim() || 'TypeScript compilation clean (Exit code 0).'}
\`\`\`

---

## 3. HOSTED DATABASE TRIPWIRE (DECISION #61 - ZERO DDL)
- Physical Migrations Count: ${migrations.length} (Frozen at 9 migrations)
\`\`\`
${migrations.join('\n')}
\`\`\`

---

## 4. SOURCE DIFF AGAINST PARENT ANCHOR (\`git diff ${parentAnchor} HEAD\`)
\`\`\`diff
${fullDiff.trim()}
\`\`\`

---

## 5. TEST TELEMETRY
### 5.1 Targeted Suite (tests/m24_5_phase24_closure.test.ts)
\`\`\`
${targetedVitest.trim()}
\`\`\`

### 5.2 Full Cumulative Regression Suite
\`\`\`
${cumulativeVitest.trim()}
\`\`\`

---

## 6. PRE-CONTAINER PORCELAIN AUDIT
\`\`\`
${prePorcelain.trim() || 'Working tree clean (0 uncommitted changes).'}
\`\`\`
`;

const outputPath = path.join(targetDir, 'EVIDENCE_BUNDLE.md');
fs.writeFileSync(outputPath, content, 'utf8');
const byteSize = fs.statSync(outputPath).size;
console.log(`Generated evidence bundle at: ${outputPath} (${byteSize} bytes)`);
