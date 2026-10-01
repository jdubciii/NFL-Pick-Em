import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const logs = [];
function log(msg = '') {
  console.log(msg);
  logs.push(msg);
}

function run(cmd, opts = {}) {
  try {
    const out = execSync(cmd, {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 1024 * 1024 * 50,
      ...opts,
    });
    return out.trim();
  } catch (err) {
    if (err.stdout && err.stdout.toString().trim()) {
      return err.stdout.toString().trim();
    }
    return `(non-zero exit / empty output: ${err.message})`;
  }
}

log('================================================================================');
log('DOCUMENTATION AUDIT & INVARIANT VERIFICATION — RULING R-12.2-AB (Section 6)');
log('================================================================================\n');

// 1. Revisions
log('### 1. Revision Hashes');
log('```text');
log(`e41ce72: ${run('git rev-parse e41ce72')}`);
log(`phase12-docs-base: ${run('git rev-parse phase12-docs-base || echo "Tag not found"')}`);
log(`HEAD: ${run('git rev-parse HEAD')}`);
log('```\n');

// 2. Per-file audits
const docFiles = ['ARCHITECTURE.md', 'ROADMAP.md', 'tasks.md'];
log('### 2. Per-File Documentation Metrics & Integrity Verification');
log('```text');
docFiles.forEach((file) => {
  const baseContent = run(`git show e41ce72:${file}`);
  const baseLines = baseContent && !baseContent.includes('non-zero exit') ? baseContent.split('\n').length : 0;
  const currentContent = fs.readFileSync(path.join(rootDir, file), 'utf8');
  const currentLines = currentContent.split('\n').length;
  const numstat = run(`git diff -w --numstat e41ce72 -- ${file}`);
  const hashObj = run(`git hash-object ${file}`);
  const diffRaw = run(`git diff -w e41ce72 -- ${file}`);
  const deletedLines = diffRaw
    .split('\n')
    .filter((l) => l.startsWith('-') && !l.startsWith('---'));

  log(`--- ${file} ---`);
  log(`  Baseline lines (e41ce72): ${baseLines}`);
  log(`  Current lines (HEAD):     ${currentLines}`);
  log(`  Diff Numstat vs baseline: ${numstat}`);
  log(`  Blob hash:                ${hashObj}`);
  log(`  Deleted lines:            ${deletedLines.length === 0 ? '0 (CLEAN - No deletions)' : deletedLines.join('\n')}`);
  log('');
});
log('```\n');

fs.writeFileSync(path.join(rootDir, 'docs_audit_ab.txt'), logs.join('\n'), 'utf8');
log('✅ Written docs_audit_ab.txt successfully (UTF-8).');
