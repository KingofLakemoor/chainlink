const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', 'utf-8');

code = code.replace(
  "console.log('Failed to sync matchups');",
  "alert('Failed to sync matchups: ' + (err.message || String(err)));"
);
code = code.replace(
  "console.log(\"No games found to sync across any leagues.\");",
  "alert(\"No games found to sync across any leagues.\");"
);
code = code.replace(
  "console.log(`Synced ${count} matchups successfully across ${leaguesToSync.length} league(s)!`);",
  "alert(`Synced ${count} matchups successfully across ${leaguesToSync.length} league(s)!`);"
);

fs.writeFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', code);
