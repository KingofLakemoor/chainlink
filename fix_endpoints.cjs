const fs = require('fs');
let code = fs.readFileSync('src/services/espnScraper.ts', 'utf-8');

code = code.split('case "LMX": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/soccer/mex.1/scoreboard?dates=${date}`);').join(
  'case "LMX": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/soccer/mex.1/scoreboard?dates=${date}`);\n      case "ARG": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/soccer/arg.1/scoreboard?dates=${date}`);\n      case "BRA": return dates.map(date => `https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1/scoreboard?dates=${date}`);'
);

code = code.split('league === "LMX" ||').join(
  'league === "LMX" || league === "ARG" || league === "BRA" ||'
);

code = code.split('LMX: "https://site.api.espn.com/apis/site/v2/sports/soccer/mex.1/scoreboard",').join(
  'LMX: "https://site.api.espn.com/apis/site/v2/sports/soccer/mex.1/scoreboard",\n        ARG: "https://site.api.espn.com/apis/site/v2/sports/soccer/arg.1/scoreboard",\n        BRA: "https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1/scoreboard",'
);

code = code.split('"FIFA", "LMX", "EPL", "MLS", "FRA", "TUR", "RPL", "CHN", "NWSL"').join(
  '"FIFA", "LMX", "ARG", "BRA", "EPL", "MLS", "FRA", "TUR", "RPL", "CHN", "NWSL"'
);

fs.writeFileSync('src/services/espnScraper.ts', code);
