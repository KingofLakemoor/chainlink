const fs = require('fs');
const file = 'src/services/espnScraper.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
    /case "CFB": return \[`https:\/\/cdn\.espn\.com\/core\/college-football\/schedule\?dates=\$\{year\}&xhr=1&render=false&device=desktop&userab=18`\];/g,
    'case "CFB": return specificDates && specificDates.length > 0 ? specificDates.map(date => `https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?dates=${date}`) : [`https://cdn.espn.com/core/college-football/schedule?dates=${year}&xhr=1&render=false&device=desktop&userab=18`];'
);

code = code.replace(
    /case "NHL": return \[`https:\/\/cdn\.espn\.com\/core\/nhl\/schedule\?dates=\$\{year\}&xhr=1&render=false&device=desktop&userab=18`\];/g,
    'case "NHL": return specificDates && specificDates.length > 0 ? specificDates.map(date => `https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard?dates=${date}`) : [`https://cdn.espn.com/core/nhl/schedule?dates=${year}&xhr=1&render=false&device=desktop&userab=18`];'
);

code = code.replace(
    /case "CBASE": return \[`https:\/\/cdn\.espn\.com\/core\/college-baseball\/schedule\?dates=\$\{year\}&xhr=1&render=false&device=desktop&userab=18`\];/g,
    'case "CBASE": return specificDates && specificDates.length > 0 ? specificDates.map(date => `https://site.api.espn.com/apis/site/v2/sports/baseball/college-baseball/scoreboard?dates=${date}`) : [`https://cdn.espn.com/core/college-baseball/schedule?dates=${year}&xhr=1&render=false&device=desktop&userab=18`];'
);

code = code.replace(
    /case "WNBA": return \[`https:\/\/cdn\.espn\.com\/core\/wnba\/schedule\?dates=\$\{year\}&xhr=1&render=false&device=desktop&userab=18`\];/g,
    'case "WNBA": return specificDates && specificDates.length > 0 ? specificDates.map(date => `https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard?dates=${date}`) : [`https://cdn.espn.com/core/wnba/schedule?dates=${year}&xhr=1&render=false&device=desktop&userab=18`];'
);

fs.writeFileSync(file, code);
console.log("Patched espnScraper.ts");
