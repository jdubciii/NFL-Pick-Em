const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const wtPath = path.resolve(__dirname, '..', '.worktree-ctl');

try {
  execSync('git worktree remove --force .worktree-ctl', { stdio: 'ignore' });
} catch (e) {}

if (fs.existsSync(wtPath)) {
  fs.rmSync(wtPath, { recursive: true, force: true });
}

console.log('--- Setting up .worktree-ctl for Negative Control ---');
execSync('git worktree add --detach .worktree-ctl HEAD', { stdio: 'inherit' });

const secretFile = path.join(wtPath, 'test_secrets.txt');
fs.writeFileSync(
  secretFile,
  `FAKE_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
FAKE_DB=postgres://u:realisticpass@host.internal:5432/db
`
);

execSync('git add test_secrets.txt', { cwd: wtPath, stdio: 'inherit' });
execSync('git commit -m "chore: negative control test commit"', { cwd: wtPath, stdio: 'inherit' });

console.log('\n--- Running History Scan Against Negative Control Commit ---');
let scanOutput = '';
try {
  scanOutput = execSync('node ../scripts/history_scan.js HEAD', { cwd: wtPath, encoding: 'utf8' });
} catch (err) {
  scanOutput = (err.stdout || '') + (err.stderr || '');
}

console.log(scanOutput);

console.log('--- Cleaning up .worktree-ctl ---');
execSync('git worktree remove --force .worktree-ctl', { stdio: 'inherit' });
