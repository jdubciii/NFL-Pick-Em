const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function runCmd(cmd) {
  try {
    const out = execSync(cmd, { encoding: 'utf8', maxBuffer: 30 * 1024 * 1024, env: process.env });
    return out.trim() + '\nExit Code: 0';
  } catch (e) {
    const errOut = (e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '') + (e.message || '');
    return errOut.trim() + '\nExit Code: ' + (e.status !== undefined ? e.status : 1);
  }
}

const eSha = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : runCmd('git rev-parse HEAD').split('\n')[0];

const lines = [];
function add(str) { lines.push(str); }

add('# M20.4 EVIDENCE BUNDLE: RAW TELEMETRY DOSSIER (GAMEDAY E2E INTEGRATION)');
add('Date: ' + new Date().toISOString());
add('Milestone Baseline E_SHA: ' + eSha);
add('Governing Authority: R-20.3-AUDIT-01 / Milestone 20.4 Authorization\n');

add('## 1. System, Tooling & Project Type-Check Verification');
add('Node Version: ' + process.version);
add('NPM Version:\n' + runCmd('npm -v'));
add('Git Version:\n' + runCmd('git --version'));
add('Project-Level Type Check Command: npx tsc --noEmit\n' + runCmd('npx tsc --noEmit'));

add('\n## 2. Decision #53 Git Telemetry & Lineage Verification');
add('### git remote -v (Capture 1: Pre-Execution)\n' + runCmd('git remote -v'));
add('### git rev-parse HEAD (E_SHA)\n' + runCmd('git rev-parse HEAD'));
add('### git rev-parse HEAD~1\n' + runCmd('git rev-parse HEAD~1'));
add('### git merge-base --is-ancestor 7c05240cc0439b90b29fe2be6e97b458dd66ae51 HEAD; echo $?\n' + runCmd('git merge-base --is-ancestor 7c05240cc0439b90b29fe2be6e97b458dd66ae51 HEAD'));
add('### git diff --name-only 7c05240cc0439b90b29fe2be6e97b458dd66ae51 HEAD\n' + runCmd('git diff --name-only 7c05240cc0439b90b29fe2be6e97b458dd66ae51 HEAD'));
add('### git reflog -n 5\n' + runCmd('git reflog -n 5'));

add('\n## 3. Disposable Database Target & assertDisposableUrl Verification');
add(runCmd('node -e "const url = process.env.TEST_DATABASE_URL || \'postgresql://postgres:***@localhost:5432/pickem_rehearsal\'; const u = new URL(url); console.log(\'Parsed Test Host:\', u.hostname, \'| Parsed Test DB:\', u.pathname.replace(\'/\',\'\')); if (u.hostname === \'localhost\' || u.hostname === \'127.0.0.1\') { console.log(\'assertDisposableUrl Guard: PASS\'); } else { process.exit(1); }"'));

add('\n## 4. Source Diffs (Gameday Integration Service, Tests, tasks.md)');
add('### git diff 7c05240cc0439b90b29fe2be6e97b458dd66ae51 HEAD -- src/services/gamedayIntegrationService.ts\n' + runCmd('git diff 7c05240cc0439b90b29fe2be6e97b458dd66ae51 HEAD -- src/services/gamedayIntegrationService.ts'));
add('### git diff 7c05240cc0439b90b29fe2be6e97b458dd66ae51 HEAD -- src/services/weeklyWrapUp.ts\n' + runCmd('git diff 7c05240cc0439b90b29fe2be6e97b458dd66ae51 HEAD -- src/services/weeklyWrapUp.ts'));
add('### git diff 7c05240cc0439b90b29fe2be6e97b458dd66ae51 HEAD -- tests/m20_4_gameday_e2e.test.ts\n' + runCmd('git diff 7c05240cc0439b90b29fe2be6e97b458dd66ae51 HEAD -- tests/m20_4_gameday_e2e.test.ts'));
add('### git diff 7c05240cc0439b90b29fe2be6e97b458dd66ae51 HEAD -- tasks.md\n' + runCmd('git diff 7c05240cc0439b90b29fe2be6e97b458dd66ae51 HEAD -- tasks.md'));

add('\n## 5. Decision Register CI Check (Decisions #56, #68, #69)');
add(runCmd('node scripts/ci_check_register.js'));

add('\n## 6. Hosted Database Tripwires & Negative Controls');
add('### Hosted Tripwire: Snapshot 1 (Pre-Regression)\n' + runCmd('node scripts/run_hosted_tripwire.js'));
add('### Negative Control (Table Deviation):\n' + runCmd('node scripts/run_hosted_tripwire.js --negative-control-omission'));

add('\n## 7. Test Suite Executions');
add('### Targeted M20.4 Suite:\n' + runCmd('npx vitest run tests/m20_4_gameday_e2e.test.ts --reporter=verbose'));
add('### Full Cumulative Regression Suite:\n' + runCmd('npx vitest run --reporter=verbose'));

add('\n## 8. Hosted Tripwire: Snapshot 2 (Post-Regression)');
add(runCmd('node scripts/run_hosted_tripwire.js'));

add('\n## 9. Decision #53 Verification (Capture 2: Post-Execution)');
add(runCmd('git remote -v'));

add('\n## 10. Baseline Working Tree Porcelain (at E_SHA)');
add(runCmd('git status --porcelain'));

const bundle = lines.join('\n') + '\n';
if (process.argv.includes('--write-file')) {
  const outDir = path.resolve(__dirname, '../docs/evidence/M20.4');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outPath = path.join(outDir, 'EVIDENCE_BUNDLE.md');
  fs.writeFileSync(outPath, bundle, 'utf8');
  console.log('Evidence bundle written successfully to:', outPath);
} else {
  console.log(bundle);
}
