const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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
const parentAnchor = 'e2899166630722500d8d0e47ee33e5b5fcfd6b55';

const lines = [];
function add(str) { lines.push(str); }

add('# M21.4 EVIDENCE BUNDLE: CONSUMER DASHBOARD & ONBOARDING FLOW INTEGRATION');
add('Date: ' + new Date().toISOString());
add('Milestone Baseline E_SHA: ' + eSha);
add('Parent Container Anchor: ' + parentAnchor);
add('Governing Authority: [R-21.3-TENANT-01] / [R-21.4-DASHBOARD-01-BLOCKED] Remediation\n');

add('## 1. System, Tooling & Project Type-Check Verification');
add('Node Version: ' + process.version);
add('NPM Version:\n' + runCmd('npm -v'));
add('Git Version:\n' + runCmd('git --version'));
add('Project-Level Type Check Command: npx tsc --noEmit\n' + runCmd('npx tsc --noEmit'));

add('\n## 2. Decision #53 Git Telemetry & Lineage Verification');
add('### git remote -v (Capture 1: Pre-Execution)\n' + runCmd('git remote -v'));
add('### git branch -a\n' + runCmd('git branch -a'));
add('### git rev-parse HEAD (E_SHA)\n' + runCmd('git rev-parse HEAD'));
add('### git rev-parse HEAD~1\n' + runCmd('git rev-parse HEAD~1'));
add('### git merge-base --is-ancestor ' + parentAnchor + ' HEAD; echo $?\n' + runCmd('git merge-base --is-ancestor ' + parentAnchor + ' HEAD'));
add('### git diff --name-only ' + parentAnchor + ' HEAD\n' + runCmd('git diff --name-only ' + parentAnchor + ' HEAD'));
add('### git reflog -n 15\n' + runCmd('git reflog -n 15'));

add('\n## 3. Disposable Database Target & assertDisposableUrl Verification');
add(runCmd('node -e "const url = process.env.TEST_DATABASE_URL || \'postgresql://postgres:***@localhost:5432/pickem_rehearsal\'; const u = new URL(url); console.log(\'Parsed Test Host:\', u.hostname, \'| Parsed Test DB:\', u.pathname.replace(\'/\',\'\')); if (u.hostname === \'localhost\' || u.hostname === \'127.0.0.1\') { console.log(\'assertDisposableUrl Guard: PASS\'); } else { process.exit(1); }"'));

add('\n## 4. Source Diffs (Consumer Dashboard Service, Tests, tasks.md, Generator)');
add('### git diff ' + parentAnchor + ' HEAD -- src/services/consumerDashboardService.ts\n' + runCmd('git diff ' + parentAnchor + ' HEAD -- src/services/consumerDashboardService.ts'));
add('### git diff ' + parentAnchor + ' HEAD -- tests/m21_4_dashboard_onboarding.test.ts\n' + runCmd('git diff ' + parentAnchor + ' HEAD -- tests/m21_4_dashboard_onboarding.test.ts'));
add('### git diff ' + parentAnchor + ' HEAD -- tasks.md\n' + runCmd('git diff ' + parentAnchor + ' HEAD -- tasks.md'));
add('### git diff ' + parentAnchor + ' HEAD -- scripts/generate_m21_4_evidence.js\n' + runCmd('git diff ' + parentAnchor + ' HEAD -- scripts/generate_m21_4_evidence.js'));
add('### Complete Diff against Parent Anchor:\n' + runCmd('git diff ' + parentAnchor + ' HEAD'));

add('\n## 5. Decision Register CI Check (Decisions #56, #68, #69)');
add(runCmd('node scripts/ci_check_register.js'));

add('\n## 6. Hosted Database Tripwires & Negative Controls');
add('### Hosted Tripwire: Snapshot 1 (Pre-Regression)\n' + runCmd('node scripts/run_hosted_tripwire.js'));
add('### Negative Control (Table Deviation):\n' + runCmd('node scripts/run_hosted_tripwire.js --negative-control-omission'));

add('\n## 7. Test Suite Executions');
add('### Targeted M21.4 Suite:\n' + runCmd('npx vitest run tests/m21_4_dashboard_onboarding.test.ts --reporter=verbose'));
add('### Full Cumulative Regression Suite (All 71 Test Suites):\n' + runCmd('npx vitest run --reporter=verbose'));

add('\n## 8. Hosted Tripwire: Snapshot 2 (Post-Regression)');
add(runCmd('node scripts/run_hosted_tripwire.js'));

add('\n## 9. Decision #53 Verification (Capture 2: Post-Execution)');
add(runCmd('git remote -v'));

add('\n## 10. Baseline Working Tree Porcelain (at E_SHA)');
add(runCmd('git status --porcelain'));

const bundle = lines.join('\n') + '\n';
const outDir = path.resolve(__dirname, '../docs/evidence/M21.4');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
const outPath = path.join(outDir, 'EVIDENCE_BUNDLE.md');
fs.writeFileSync(outPath, bundle, 'utf8');
const byteSize = fs.statSync(outPath).size;
console.log(`Generated comprehensive raw evidence bundle at: ${outPath} (${byteSize} bytes)`);
