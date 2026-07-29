const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', 'utf-8');

code = code.replace(
  "{[...Array(20)].map((_, i) => (",
  "{[...Array(totalWeeks)].map((_, i) => ("
);

fs.writeFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', code);
