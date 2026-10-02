const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const appendixPath = path.join(rootDir, 'docs/rulings/appendix-a.md');
const archPath = path.join(rootDir, 'ARCHITECTURE.md');

if (!fs.existsSync(appendixPath)) {
  console.error(`Error: ${appendixPath} does not exist.`);
  process.exit(1);
}

if (!fs.existsSync(archPath)) {
  console.error(`Error: ${archPath} does not exist.`);
  process.exit(1);
}

const appendixContent = fs.readFileSync(appendixPath, 'utf8');
const archContent = fs.readFileSync(archPath, 'utf8');

// Normalize CRLF to LF for robust cross-platform byte comparison
const normalizedAppendix = appendixContent.replace(/\r\n/g, '\n').trim();
const normalizedArch = archContent.replace(/\r\n/g, '\n');

if (normalizedArch.includes(normalizedAppendix)) {
  console.log('✅ CI Check PASSED: Appendix A Decision Register exists byte-for-byte in ARCHITECTURE.md.');
  process.exit(0);
} else {
  console.error('❌ CI Check FAILED: Appendix A Decision Register does not match ARCHITECTURE.md byte-for-byte.');
  process.exit(1);
}
