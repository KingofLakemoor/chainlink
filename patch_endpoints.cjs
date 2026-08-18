const fs = require('fs');
const file = 'src/services/espnScraper.ts';
let code = fs.readFileSync(file, 'utf8');

const target1 = `  const estDate = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  const year = new Date(estDate).getFullYear();
  switch (league) {
    case "NFL": return [\`https://cdn.espn.com/core/nfl/schedule?dates=\${year}&xhr=1&render=false&device=desktop&userab=18\`];
    case "NBA": return [\`https://cdn.espn.com/core/nba/schedule?dates=\${year}&xhr=1&render=false&device=desktop&userab=18\`];`;

const repl1 = `  const estDate = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  const year = new Date(estDate).getFullYear();
  switch (league) {
    case "NFL": return specificDates && specificDates.length > 0 ? specificDates.map(date => \`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=\${date}\`) : [\`https://cdn.espn.com/core/nfl/schedule?dates=\${year}&xhr=1&render=false&device=desktop&userab=18\`];
    case "NBA": return specificDates && specificDates.length > 0 ? specificDates.map(date => \`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=\${date}\`) : [\`https://cdn.espn.com/core/nba/schedule?dates=\${year}&xhr=1&render=false&device=desktop&userab=18\`];`;

if (code.includes(target1)) {
  code = code.replace(target1, repl1);
  fs.writeFileSync(file, code);
  console.log("Patched endpoints in espnScraper.ts");
} else {
  console.log("Could not find target in espnScraper.ts");
}
