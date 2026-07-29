const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', 'utf-8');

code = code.replace(
  "alert(\"No games found to sync across any leagues. Error: \" + (res ? res.error : 'unknown'));",
  "alert(\"No games found to sync across any leagues.\");"
);

fs.writeFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', code);
