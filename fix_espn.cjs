const fs = require('fs');
const file = 'src/services/espnScraper.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  `                const homeShortName = home.team?.shortDisplayName || home.team?.name || homeName;
                const awayShortName = away.team?.shortDisplayName || away.team?.name || awayName;
                const homeShortName = home.team?.shortDisplayName || home.team?.name || homeName;
                const awayShortName = away.team?.shortDisplayName || away.team?.name || awayName;`,
  `                const homeShortName = home.team?.shortDisplayName || home.team?.name || homeName;
                const awayShortName = away.team?.shortDisplayName || away.team?.name || awayName;`
);

// wait, let's also check the third grouping around line 1010
code = code.replace(
  `                const homeShortName = home.team?.shortDisplayName || home.team?.name || homeName;
                const awayShortName = away.team?.shortDisplayName || away.team?.name || awayName;
                const homeShortName = home.team?.shortDisplayName || home.team?.name || homeName;
                const awayShortName = away.team?.shortDisplayName || away.team?.name || awayName;`,
  `                const homeShortName = home.team?.shortDisplayName || home.team?.name || homeName;
                const awayShortName = away.team?.shortDisplayName || away.team?.name || awayName;`
);

fs.writeFileSync(file, code);
