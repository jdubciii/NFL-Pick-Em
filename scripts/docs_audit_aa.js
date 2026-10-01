import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function run(cmd, opts = {}) {
  try {
    const out = execSync(cmd, {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      ...opts,
    });
    return out.trim();
  } catch (err) {
    if (err.stdout && err.stdout.toString().trim()) {
      return err.stdout.toString().trim();
    }
    return `Error executing "${cmd}": ${err.message}`;
  }
}

console.log('================================================================================');
console.log('DOCUMENTATION AUDIT & LINEAGE RECOVERY — RULING R-12.2-AA (Section 3)');
console.log('================================================================================\n');

// 1. Revision parse
console.log('### 1. Baseline Revisions');
console.log('```text');
console.log(`Baseline hash (e41ce72): ${run('git rev-parse e41ce72')}`);
console.log(`Current HEAD: ${run('git rev-parse HEAD')}`);
console.log('```\n');

// 2. Baseline line counts
console.log('### 2. Line Counts at Baseline (`e41ce72`)');
const docFiles = ['ARCHITECTURE.md', 'ROADMAP.md', 'tasks.md'];
console.log('```text');
docFiles.forEach((file) => {
  const content = run(`git show e41ce72:${file}`);
  const lines = content ? content.split('\n').length : 0;
  console.log(`${lines.toString().padStart(6)} e41ce72:${file}`);
});
console.log('```\n');

// 3. Current line counts
console.log('### 3. Current Line Counts on HEAD');
console.log('```text');
docFiles.forEach((file) => {
  const content = fs.readFileSync(path.join(rootDir, file), 'utf8');
  const lines = content.split('\n').length;
  console.log(`${lines.toString().padStart(6)} ${file}`);
});
console.log('```\n');

// 4. Git diff numstat against baseline
console.log('### 4. Git Diff Numstat Against Baseline (`git diff -w --numstat e41ce72 -- ...`)');
console.log('```text');
console.log(run('git diff -w --numstat e41ce72 -- ARCHITECTURE.md ROADMAP.md tasks.md'));
console.log('```\n');

// 5. Branch recovery and state
console.log('### 5. Git Lineage, Stash, and Branch State');
console.log('```text');
console.log(`Current branch: ${run('git branch --show-current')}`);
console.log(`Working tree status:\n${run('git status --short')}`);
console.log(`Stash list:\n${run('git stash list') || '(empty)'}`);
console.log(`\nReflog (last 15 entries):\n${run('git reflog -n 15')}`);
console.log(`\nCommit log for doc files across all refs:\n${run('git log --all --oneline -n 10 -- ARCHITECTURE.md ROADMAP.md tasks.md')}`);
console.log('```\n');

// 6. Restoration proof (grep for deletions)
console.log('### 6. Restoration Proof (Asserting 0 Deleted Lines against Baseline)');
const diffTasks = run('git diff -w e41ce72 -- tasks.md');
const deletedLines = diffTasks
  .split('\n')
  .filter((line) => line.startsWith('-') && !line.startsWith('---'));

console.log('```text');
if (deletedLines.length === 0) {
  console.log('RESTORED_CLEAN: Exactly 0 deleted lines found in tasks.md relative to e41ce72.');
} else {
  console.log(`WARNING: Found ${deletedLines.length} deleted lines in tasks.md:`);
  deletedLines.forEach((l) => console.log(l));
}
console.log('```\n');
