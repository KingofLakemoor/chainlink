const fs = require('fs');
const file = 'src/services/espnScraper.ts';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `case "NWSL": return dates.map(date => \`https://site.api.espn.com/apis/site/v2/sports/soccer/nwsl.1/scoreboard?dates=\${date}\`);`;
const replStr = `case "NWSL": return dates.map(date => \`https://site.api.espn.com/apis/site/v2/sports/soccer/usa.nwsl/scoreboard?dates=\${date}\`);`;

code = code.replace(new RegExp(targetStr.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), replStr);
fs.writeFileSync(file, code);
console.log("Patched NWSL endpoint");
