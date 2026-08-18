const fs = require('fs');
const file = 'src/pages/admin/pickem/PickEmCampaignDetail.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `These bounds determine which games are fetched when clicking "Sync Matchups" for this specific week. (Don't forget to click 'Save All Settings' below after editing).`;

const repl = `These bounds determine which games are fetched when clicking "Sync Matchups" for this specific week. (Don't forget to click 'Update Campaign' after editing).`;

if (code.includes(target)) {
  code = code.replace(target, repl);
  fs.writeFileSync(file, code);
  console.log("Patched tooltip text!");
} else {
  console.log("Could not find target in PickEmCampaignDetail.");
}
