const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetDir = path.join(__dirname, '../docs/evidence/M22.2');
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
const parentAnchor = '78fdebb16fdfa8cbe64c46844b16640fd9960b77';
const gitRemote = run('git remote -v');
const gitBranch = run('git branch -a');
const gitReflog = run('git reflog -n 15');
const nodeVersion = run('node -v');
const npmVersion = run('npm -v');
const tscOutput = run('npx tsc --noEmit', true);
const targetedVitest = run('npx vitest run tests/m22_2_rules_ui.test.ts --reporter=verbose', true);
const cumulativeVitest = run('npx vitest run --reporter=verbose', true);
const fullDiff = run(`git diff ${parentAnchor} HEAD`);
const prePorcelain = run('git status --porcelain');
const migrations = fs.readdirSync(path.join(__dirname, '../prisma/migrations')).filter(f => !f.startsWith('.'));

const content = `# MILESTONE 22.2 RAW EVIDENCE BUNDLE: CUSTOM LEAGUE RULES CONFIGURATION UI

- **Milestone:** M22.2 (Custom League Rules Configuration UI)
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

## 3. HOSTED DATABASE TRIPWIRE (DECISION #61)
- Physical Migrations Count: ${migrations.length} (Frozen)
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
### 5.1 Targeted Suite (tests/m22_2_rules_ui.test.ts)
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
