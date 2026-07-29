const fs = require('fs');
let code = fs.readFileSync('src/pages/pickem/PickEmPage.tsx', 'utf-8');

code = code.replace(
  "{[...Array(20)].map((_, i) => (",
  "{[...Array(selectedCampaign?.totalWeeks || 18)].map((_, i) => ("
);

fs.writeFileSync('src/pages/pickem/PickEmPage.tsx', code);
