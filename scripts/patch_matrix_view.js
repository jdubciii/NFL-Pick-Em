const fs = require('fs');
const path = require('path');

const matrixPath = path.join(__dirname, '../client/src/components/LeagueMatrixView.tsx');
if (fs.existsSync(matrixPath)) {
  let content = fs.readFileSync(matrixPath, 'utf8');

  // Ensure default pool selection is automatic if pools exist
  if (!content.includes('setSelectedPoolId(data[0].id)')) {
    content = content.replace(
      /setPools\(data\);/g,
      'setPools(data); if (data && data.length > 0 && !selectedPoolId) { setSelectedPoolId(data[0].id); }'
    );
    fs.writeFileSync(matrixPath, content, 'utf8');
    console.log("Patched LeagueMatrixView.tsx for automatic pool selection.");
  }
}
