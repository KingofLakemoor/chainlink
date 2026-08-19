const fs = require('fs');
const file = 'src/services/espnScraper.ts';
let code = fs.readFileSync(file, 'utf8');

// Replace homeName / awayName with also grabbing shortName

code = code.replace(
  `const homeName = homeCompetitor?.athlete?.displayName || homeCompetitor?.team?.displayName || homeCompetitor?.team?.name || "";\n                  const awayName = awayCompetitor?.athlete?.displayName || awayCompetitor?.team?.displayName || awayCompetitor?.team?.name || "";`,
  `const homeName = homeCompetitor?.athlete?.displayName || homeCompetitor?.team?.displayName || homeCompetitor?.team?.name || "";\n                  const awayName = awayCompetitor?.athlete?.displayName || awayCompetitor?.team?.displayName || awayCompetitor?.team?.name || "";\n                  const homeShortName = homeCompetitor?.athlete?.shortName || homeCompetitor?.team?.shortDisplayName || homeCompetitor?.team?.name || homeName;\n                  const awayShortName = awayCompetitor?.athlete?.shortName || awayCompetitor?.team?.shortDisplayName || awayCompetitor?.team?.name || awayName;`
);

code = code.replace(
  `name: homeName || "Home Team",\n                         image:`,
  `name: homeName || "Home Team",\n                         shortName: homeShortName || "Home",\n                         image:`
);
code = code.replace(
  `name: awayName || "Away Team",\n                         image:`,
  `name: awayName || "Away Team",\n                         shortName: awayShortName || "Away",\n                         image:`
);

// Now for the second grouping (line 748)
code = code.replace(
  `const homeName = home.team?.displayName || home.team?.name || "Home Team";\n                const awayName = away.team?.displayName || away.team?.name || "Away Team";`,
  `const homeName = home.team?.displayName || home.team?.name || "Home Team";\n                const awayName = away.team?.displayName || away.team?.name || "Away Team";\n                const homeShortName = home.team?.shortDisplayName || home.team?.name || homeName;\n                const awayShortName = away.team?.shortDisplayName || away.team?.name || awayName;`
);

code = code.replace(
  `name: homeName,\n               image: (league as any === "CRICKET"`,
  `name: homeName,\n               shortName: homeShortName,\n               image: (league as any === "CRICKET"`
);
code = code.replace(
  `name: awayName,\n               image: (league as any === "CRICKET"`,
  `name: awayName,\n               shortName: awayShortName,\n               image: (league as any === "CRICKET"`
);

// And the third grouping (line 1005)
// Wait, the previous replace will probably replace all occurrences of `name: homeName,\n               image...` if we use a global replace. Let's see if it caught them.
fs.writeFileSync(file, code);
console.log("Patched espnScraper.ts");
