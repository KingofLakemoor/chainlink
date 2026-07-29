const fs = require('fs');

function fixFile(file) {
  let code = fs.readFileSync(file, 'utf-8');
  code = code.replace(/['"]User-Agent['"]:\s*['"][^'"]+['"],?/g, "");
  fs.writeFileSync(file, code);
}

fixFile('src/services/espnScraper.ts');
fixFile('src/services/scheduleProcessor.ts');
