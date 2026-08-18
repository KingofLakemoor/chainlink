const fs = require('fs');
const file = 'src/pages/admin/pickem/PickEmCampaignDetail.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `const res = await scrapeLeagueSchedules(lg, false, specificDates);`;
const repl = `const res = await scrapeLeagueSchedules(lg, false, undefined, specificDates);`;

if (code.includes(target)) {
  code = code.replace(target, repl);
  fs.writeFileSync(file, code);
  console.log("Patched scrapeLeagueSchedules args!");
} else {
  console.log("Could not find target in PickEmCampaignDetail.");
}
