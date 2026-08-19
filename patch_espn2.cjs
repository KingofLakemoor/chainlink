const fs = require('fs');
const file = 'src/services/espnScraper.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replaceAll(
  `name: homeName || "Home Team",\n                         image:`,
  `name: homeName || "Home Team",\n                         shortName: homeShortName || "Home",\n                         image:`
);
code = code.replaceAll(
  `name: awayName || "Away Team",\n                         image:`,
  `name: awayName || "Away Team",\n                         shortName: awayShortName || "Away",\n                         image:`
);

code = code.replaceAll(
  `name: homeName,\n               image: (league as any === "CRICKET"`,
  `name: homeName,\n               shortName: homeShortName,\n               image: (league as any === "CRICKET"`
);
code = code.replaceAll(
  `name: awayName,\n               image: (league as any === "CRICKET"`,
  `name: awayName,\n               shortName: awayShortName,\n               image: (league as any === "CRICKET"`
);

// We also need to fix the third grouping's assignment of homeShortName
code = code.replaceAll(
  `const homeName = home.team?.displayName || home.team?.name || "Home Team";\n                const awayName = away.team?.displayName || away.team?.name || "Away Team";`,
  `const homeName = home.team?.displayName || home.team?.name || "Home Team";\n                const awayName = away.team?.displayName || away.team?.name || "Away Team";\n                const homeShortName = home.team?.shortDisplayName || home.team?.name || homeName;\n                const awayShortName = away.team?.shortDisplayName || away.team?.name || awayName;`
);

fs.writeFileSync(file, code);
