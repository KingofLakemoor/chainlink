const fs = require('fs');

function replaceInFile(file) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/\/icons\/icon-256x256\.png/g, '/logo.png');
  fs.writeFileSync(file, code);
}

replaceInFile('src/pages/admin/brackets/BracketEntriesAdminPage.tsx');
replaceInFile('src/pages/admin/pga/PGABuilderPage.tsx');
replaceInFile('src/services/espnScraper.ts');
replaceInFile('src/apiRouter.ts');
