const fs = require('fs');

function fixFile(file) {
  let code = fs.readFileSync(file, 'utf-8');
  code = code.replace(/if \(!confirm\([^)]+\)\) return;/g, "");
  code = code.replace(/alert\(/g, "console.log(");
  fs.writeFileSync(file, code);
}

fixFile('src/pages/admin/pickem/PickEmCampaignDetail.tsx');
fixFile('src/pages/admin/pickem/PickEmCampaignsList.tsx');
fixFile('src/pages/pickem/PickEmPage.tsx');
