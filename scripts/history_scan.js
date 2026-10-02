const { execSync } = require('child_process');

const targetRef = process.argv[2] || 'origin/main';
const patterns = 'eyJ[A-Za-z0-9_-]{20,}|postgres(ql)?://[^:/]+:[^@ \\r\\n]+@|sb_(publishable|secret)_[A-Za-z0-9_-]+';

console.log(`=== History Secret Scan against ${targetRef} ===`);
console.log('Excluding package-lock.json, including tests/...');

try {
  const cmd = `git grep -nE "${patterns}" ${targetRef} -- ":!**/package-lock.json"`;
  const output = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  if (output.trim()) {
    console.log('MATCHES FOUND:');
    console.log(output.trim());
    process.exit(1);
  } else {
    console.log(`Clean: Zero secrets detected in ${targetRef}.`);
    process.exit(0);
  }
} catch (error) {
  if (error.stdout && error.stdout.toString().trim()) {
    console.log('MATCHES FOUND:');
    console.log(error.stdout.toString().trim());
    process.exit(1);
  } else {
    console.log(`Clean: Zero secrets detected in ${targetRef}.`);
    process.exit(0);
  }
}
