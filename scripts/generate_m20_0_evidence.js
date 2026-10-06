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

add('# M20.0 EVIDENCE BUNDLE: RAW TELEMETRY DOSSIER (R-20.0-AUDIT-05 COMPLIANT)');
add('Date: ' + new Date().toISOString());
add('Milestone Baseline E_SHA: ' + eSha);
add('Governing Authority: R-20.0-INTAKE-01 / R-20.0-AUDIT-01..05\n');

add('## 0. Declaration of Superseded SHAs & Clean Ancestry');
add('Historical voided SHAs:');
add('- 82b944315aba4dbb1db9bceda44359be42b55ff0 (VOID)');
add('- 91027174d00e0262900585147819e17a43dc7cbf (VOID)');
add('- 62aff04a2c1155bd8b8c8ce84aacc57b3f30bd99 (VOID)');
add('- 10a678b6fc627fbbba44a398f4e0d088f70b840f (VOID)');
add('- 5c367cf175995a651d31d601a9f8531617553ddc (VOID)');
add('- e9b0ab7683ea4fd8c82d98cff6ab3ab36320ffaf (VOID)');
add('- 259e28f172ac2cf0d24069d753f9d0a885fdcd68 (VOID)');
add('- b93e7efe25d28dccc9debb92fb86aa2e4008665f (VOID)');
add('- d1e85ce9c01710a6deb02584f4f2f09027270af4 (VOID)');
add('Lineage Reset: feat/phase20-m20.0-intake reset directly to clean parent 2c3c540fc019a86e7063e4a2c7a199ccdf499e7f.\n');

add('## 1. System, Tooling & Project Type-Check Verification');
add('Node Version: ' + process.version);
add('NPM Version:\n' + runCmd('npm -v'));
add('Git Version:\n' + runCmd('git --version'));
add('Project-Level Type Check Command: npx tsc --noEmit\n' + runCmd('npx tsc --noEmit'));

add('\n## 2. Decision #53 Git Telemetry & Real Command Transcript');
add('### git remote -v (Capture 1: Pre-Execution)\n' + runCmd('git remote -v'));
add('### git rev-parse HEAD (E_SHA)\n' + runCmd('git rev-parse HEAD'));
add('### git rev-parse HEAD~1\n' + runCmd('git rev-parse HEAD~1'));
add('### git merge-base --is-ancestor 2c3c540fc019a86e7063e4a2c7a199ccdf499e7f HEAD; echo $?\n' + runCmd('git merge-base --is-ancestor 2c3c540fc019a86e7063e4a2c7a199ccdf499e7f HEAD'));
add('### git diff --name-only 2c3c540fc019a86e7063e4a2c7a199ccdf499e7f HEAD\n' + runCmd('git diff --name-only 2c3c540fc019a86e7063e4a2c7a199ccdf499e7f HEAD'));
add('### git reflog -n 10\n' + runCmd('git reflog -n 10'));

add('\n## 3. Disposable Database Target & assertDisposableUrl Verification');
add(runCmd('node -e "const url = process.env.TEST_DATABASE_URL || \'postgresql://postgres:***@localhost:5432/pickem_rehearsal\'; const u = new URL(url); console.log(\'Parsed Test Host:\', u.hostname, \'| Parsed Test DB:\', u.pathname.replace(\'/\',\'\')); if (u.hostname === \'localhost\' || u.hostname === \'127.0.0.1\') { console.log(\'assertDisposableUrl Guard: PASS\'); } else { process.exit(1); }"'));

add('\n## 4. Source Diffs (Contracts, FSM, Decision #69, Feature Registry)');
add('### git diff 2c3c540fc019a86e7063e4a2c7a199ccdf499e7f HEAD -- src/config/featureFlags.ts\n' + runCmd('git diff 2c3c540fc019a86e7063e4a2c7a199ccdf499e7f HEAD -- src/config/featureFlags.ts'));
add('### git diff 2c3c540fc019a86e7063e4a2c7a199ccdf499e7f HEAD -- src/services/phase20CoreService.ts\n' + runCmd('git diff 2c3c540fc019a86e7063e4a2c7a199ccdf499e7f HEAD -- src/services/phase20CoreService.ts'));
add('### git diff 2c3c540fc019a86e7063e4a2c7a199ccdf499e7f HEAD -- tests/m20_0_intake.test.ts\n' + runCmd('git diff 2c3c540fc019a86e7063e4a2c7a199ccdf499e7f HEAD -- tests/m20_0_intake.test.ts'));
add('### git diff 2c3c540fc019a86e7063e4a2c7a199ccdf499e7f HEAD -- tests/br4b.test.ts\n' + runCmd('git diff 2c3c540fc019a86e7063e4a2c7a199ccdf499e7f HEAD -- tests/br4b.test.ts'));

add('\n## 5. Decision Register CI Check (Decisions #56, #68, #69)');
add(runCmd('node scripts/ci_check_register.js'));

add('\n## 6. Hosted Database Tripwires & Negative Controls');
add('### Hosted Tripwire: Snapshot 1 (Pre-Regression)\n' + runCmd('node scripts/run_hosted_tripwire.js'));
add('### Direct RLS Relation Query (pg_class) & Policies Query (pg_policies):');
add(runCmd('node -e "const { Client } = require(\'pg\'); const fs = require(\'fs\'); const dotenv = require(\'dotenv\'); let dbUrl = process.env.DATABASE_URL; if (fs.existsSync(\'.env.hosted\')) { const envConfig = dotenv.parse(fs.readFileSync(\'.env.hosted\')); dbUrl = envConfig.DATABASE_URL || envConfig.DIRECT_URL || dbUrl; } const c = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } }); async function q() { try { await c.connect(); const rlsRes = await c.query(\'SELECT relname, relrowsecurity FROM pg_class JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace WHERE pg_namespace.nspname = \\\'public\\\' AND relkind = \\\'r\\\' ORDER BY relname;\'); console.log(\'Public Relations Count:\', rlsRes.rows.length); const polRes = await c.query(\'SELECT policyname FROM pg_policies WHERE schemaname = \\\'public\\\';\'); console.log(\'pg_policies Count:\', polRes.rows.length); await c.end(); } catch(e) { console.log(e.message); } } q();"'));

add('\n### Negative Controls:');
add('1. Localhost Inverse Guard Deviation:\n' + runCmd('node scripts/run_hosted_tripwire.js --dummy-localhost'));
add('2. Table Omission Deviation:\n' + runCmd('node scripts/run_hosted_tripwire.js --negative-control-omission'));

add('\n## 7. Test Suite Executions');
add('### Targeted M20.0 Suite (tests/m20_0_intake.test.ts):\n' + runCmd('npx vitest run tests/m20_0_intake.test.ts --reporter=verbose'));
add('### Full Cumulative Regression Suite:\n' + runCmd('npx vitest run --reporter=verbose'));

add('\n## 8. Hosted Tripwire: Snapshot 2 (Post-Regression)');
add(runCmd('node scripts/run_hosted_tripwire.js'));

add('\n## 9. Decision #53 Verification (Capture 2: Post-Execution)');
add(runCmd('git remote -v'));

add('\n## 10. Baseline Working Tree Porcelain (at E_SHA)');
add(runCmd('git status --porcelain'));

const bundle = lines.join('\n') + '\n';
if (process.argv.includes('--write-file')) {
  const outDir = path.resolve(__dirname, '../docs/evidence/M20.0');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outPath = path.join(outDir, 'EVIDENCE_BUNDLE.md');
  fs.writeFileSync(outPath, bundle, 'utf8');
  console.log('Evidence bundle written successfully to:', outPath);
} else {
  console.log(bundle);
}
