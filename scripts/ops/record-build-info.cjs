const fs = require('fs');
const path = require('path');

const targetDir = path.resolve(__dirname, '../../dist');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const buildInfo = {
  builtAt: new Date().toISOString(),
};

fs.writeFileSync(path.join(targetDir, 'build-info.json'), JSON.stringify(buildInfo, null, 2) + '\n');
console.log(`[build-info] Recorded build-info.json with builtAt: ${buildInfo.builtAt}`);
