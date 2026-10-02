import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const evDir = path.join(rootDir, 'docs/evidence/R-12.2-AE');
if (!fs.existsSync(evDir)) {
  fs.mkdirSync(evDir, { recursive: true });
}

function run(cmd, opts = {}) {
  const isWindows = process.platform === 'win32';
  const shellCmd = isWindows ? 'powershell' : '/bin/sh';
  const shellArgs = isWindows ? ['-NoProfile', '-Command', cmd] : ['-c', cmd];

  const res = spawnSync(shellCmd, shellArgs, {
    cwd: rootDir,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
    maxBuffer: 1024 * 1024 * 50,
    ...opts,
  });

  const stdout = (res.stdout || '').replace(/\x00/g, '');
  const stderr = (res.stderr || '').replace(/\x00/g, '');
  return (stdout || stderr).trim();
}

console.log('================================================================================');
console.log('FACT GATHERING (PHASE 1 - PRE-PUSH SCAN) — RULING R-12.2-AE');
console.log('================================================================================\n');

// 1. Git Remote
console.log('### 1. Git Remote Verification');
console.log('```text');
console.log(run('git remote -v') || '(no output)');
console.log('```\n');

// 2. Git Check Ignore .env
console.log('### 2. .env Git Ignore Status');
console.log('```text');
console.log(run('git check-ignore -v .env .env.hosted') || '(not ignored)');
console.log('```\n');

// 3. Git Tracked .env files
console.log('### 3. Tracked .env Files in Repository');
console.log('```text');
const envTracked = run('git ls-files | Select-String -Pattern "\\.env"') || 'CLEAN: 0 .env files tracked in git';
console.log(envTracked);
console.log('```\n');

// 4. Secret Scanner across git history
console.log('### 4. Secret & Credential History Scan');
console.log('```text');
let secretScanMatches = '';
try {
  const rawMatches = run('git rev-list --all | ForEach-Object { git grep -n -E "eyJ[A-Za-z0-9_-]{20,}|sb_(publishable|secret)_[A-Za-z0-9_-]+|postgres(ql)?://[^:/]+:[^@ ]+@" $_ }');
  const lines = (rawMatches || '').split('\n').filter(l => l.trim().length > 0);
  const realLeaks = lines.filter(l => {
    if (l.includes('package-lock.json') || l.includes('.env.example')) return false;
    if (l.includes('localhost') || l.includes('127.0.0.1') || l.includes('host.docker.internal') || l.includes('db.invalid')) return false;
    if (l.includes('postgres.exampleref') || l.includes('test_secret') || l.includes('mock_') || l.includes(':fake@') || l.includes(':pass@')) return false;
    return true;
  });
  if (realLeaks.length > 0) {
    console.log(`POTENTIAL LEAKS DETECTED (${realLeaks.length} occurrences):`);
    console.log(realLeaks.slice(0, 10).join('\n'));
    throw new Error('Credential scan detected unmasked sensitive tokens!');
  } else {
    secretScanMatches = `CLEAN: 0 real credentials found across all git revisions. (Checked against JWT patterns, Supabase keys, connection strings with localhost/exampleref/test placeholders ignored).`;
  }
} catch (err) {
  secretScanMatches = err.message;
}
console.log(secretScanMatches);
console.log('```\n');

// 5. claimModel grep in weeklyWrapUp.ts
console.log('### 5. `claimModel` Grep in `src/services/weeklyWrapUp.ts`');
console.log('```text');
let claimModelGrep = '';
try {
  claimModelGrep = run('git grep -n "claimModel" src/services/weeklyWrapUp.ts');
} catch (e) {
  claimModelGrep = 'CLEAN: 0 occurrences of claimModel found in weeklyWrapUp.ts';
}
console.log(claimModelGrep || 'CLEAN: 0 occurrences of claimModel found in weeklyWrapUp.ts');
console.log('```\n');

// 6. weekNo grep in weeklyWrapUp.ts
console.log('### 6. `weekNo` Grep in `src/services/weeklyWrapUp.ts`');
console.log('```text');
let weekNoGrep = '';
try {
  weekNoGrep = run('git grep -n "weekNo" src/services/weeklyWrapUp.ts');
} catch (e) {
  weekNoGrep = 'CLEAN: 0 occurrences of weekNo found in weeklyWrapUp.ts';
}
console.log(weekNoGrep || 'CLEAN: 0 occurrences of weekNo found in weeklyWrapUp.ts');
console.log('```\n');

// 7. AdminDashboard.tsx lines 40-70
console.log('### 7. `client/src/pages/AdminDashboard.tsx` (Lines 40-70)');
console.log('```typescript');
try {
  const content = fs.readFileSync(path.join(rootDir, 'client/src/pages/AdminDashboard.tsx'), 'utf8');
  const lines = content.split('\n').slice(39, 70).map((l, i) => `${40 + i}: ${l}`).join('\n');
  console.log(lines);
} catch (e) {
  console.log('File not found or error reading: ' + e.message);
}
console.log('```\n');

// 8. AdminDashboard files tracked in git
console.log('### 8. AdminDashboard Tracked Files in Git');
console.log('```text');
console.log(run('git ls-files | Select-String -Pattern "AdminDashboard"'));
console.log('```\n');

// 9. GET /api/pools route definition
console.log('### 9. `GET /api/pools` Route Definition');
console.log('```typescript');
try {
  const serverContent = fs.readFileSync(path.join(rootDir, 'src/server.ts'), 'utf8');
  const lines = serverContent.split('\n');
  const poolIdx = lines.findIndex(l => l.includes("app.get('/api/pools'"));
  if (poolIdx !== -1) {
    console.log(lines.slice(poolIdx - 3, poolIdx + 15).map((l, i) => `${poolIdx - 2 + i}: ${l}`).join('\n'));
  } else {
    console.log('GET /api/pools not found in server.ts');
  }
} catch (e) {
  console.log(e.message);
}
console.log('```\n');

// 10. Client /api/pools calls
console.log('### 10. Client `/api/pools` Grep');
console.log('```text');
console.log(run('git grep -n "/api/pools" client/'));
console.log('```\n');

// 11. POST /api/picks route definition
console.log('### 11. `POST /api/picks` Route Definition (`src/routes/picks.ts`)');
console.log('```typescript');
try {
  const picksContent = fs.readFileSync(path.join(rootDir, 'src/routes/picks.ts'), 'utf8');
  const lines = picksContent.split('\n');
  const postIdx = lines.findIndex(l => l.includes("picksRouter.post('/')") || l.includes("POST /api/picks"));
  if (postIdx !== -1) {
    console.log(lines.slice(postIdx, postIdx + 20).map((l, i) => `${postIdx + 1 + i}: ${l}`).join('\n'));
  } else {
    console.log(lines.slice(0, 25).map((l, i) => `${i + 1}: ${l}`).join('\n'));
  }
} catch (e) {
  console.log(e.message);
}
console.log('```\n');
