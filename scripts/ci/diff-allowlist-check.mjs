import fs from 'fs';
import path from 'path';

export function checkDiffAllowlist(diffContent, allowlistPath) {
  const allowlistRaw = fs.readFileSync(allowlistPath, 'utf8');
  const patterns = allowlistRaw
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));

  const diffLines = diffContent.split(/\r?\n/);
  let matchedCount = 0;
  const unmatchedLines = [];

  for (const line of diffLines) {
    // Ignore unified diff headers
    if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('@@') || line.startsWith('diff --git') || line.startsWith('index ')) {
      continue;
    }

    if (line.startsWith('-') || line.startsWith('+')) {
      const content = line.substring(1).trim();
      if (content.length === 0) continue;

      const isAllowed = patterns.some(pattern => {
        if (pattern.startsWith('/') && pattern.endsWith('/')) {
          const regex = new RegExp(pattern.slice(1, -1));
          return regex.test(content);
        }
        return content.includes(pattern);
      });

      if (isAllowed) {
        matchedCount++;
      } else {
        unmatchedLines.push(line);
      }
    }
  }

  return {
    passed: unmatchedLines.length === 0,
    matchedCount,
    unmatchedCount: unmatchedLines.length,
    unmatchedLines
  };
}

async function main() {
  const allowlistPath = path.join(process.cwd(), 'scripts/ci/acl-allowlist.txt');
  const diffFile = process.argv[2];

  let diffContent = '';
  if (diffFile && fs.existsSync(diffFile)) {
    diffContent = fs.readFileSync(diffFile, 'utf8');
  } else if (!process.stdin.isTTY) {
    diffContent = fs.readFileSync(0, 'utf8');
  } else {
    // Default to generated normalized dumps
    const hostedFile = path.join(process.cwd(), 'scratch/normalized_dumps/hosted_v2.sql');
    const localFile = path.join(process.cwd(), 'scratch/normalized_dumps/local6_v2.sql');
    if (fs.existsSync(hostedFile) && fs.existsSync(localFile)) {
      const { execSync } = await import('child_process');
      try {
        diffContent = execSync(`git diff --no-index "${hostedFile}" "${localFile}"`, { encoding: 'utf8' });
      } catch (e) {
        diffContent = e.stdout || '';
      }
    } else {
      console.error('Usage: node diff-allowlist-check.mjs <diff-file> or pipe diff to stdin');
      process.exit(1);
    }
  }

  const result = checkDiffAllowlist(diffContent, allowlistPath);

  if (result.passed) {
    console.log(`ALLOWLIST OK (${result.matchedCount} lines matched, 0 unmatched)`);
    process.exit(0);
  } else {
    console.error(`ALLOWLIST FAIL (${result.matchedCount} lines matched, ${result.unmatchedCount} UNMATCHED)`);
    console.error('Unmatched Lines:\n' + result.unmatchedLines.join('\n'));
    process.exit(1);
  }
}

import { fileURLToPath } from 'url';
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
