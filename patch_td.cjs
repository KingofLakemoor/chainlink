const fs = require('fs');
let code = fs.readFileSync('src/services/propGrader.ts', 'utf8');

code = code.replace(
    /\| 'PASSING_YARDS' \| 'RUSHING_YARDS' \| 'RECEIVING_YARDS' \| 'TOUCHDOWNS'/,
    "| 'PASSING_YARDS' | 'RUSHING_YARDS' | 'RECEIVING_YARDS' | 'TOUCHDOWNS' | 'PASSING_TOUCHDOWNS'"
);

code = code.replace(
    /if \(config\.statType === 'TOUCHDOWNS'\) \{\s*if \(statGroup\.name === 'passing'\) targetIdx = labels\.findIndex\(\(l: string\) => l === 'TD'\);\s*if \(statGroup\.name === 'rushing'\) targetIdx = labels\.findIndex\(\(l: string\) => l === 'TD'\);\s*if \(statGroup\.name === 'receiving'\) targetIdx = labels\.findIndex\(\(l: string\) => l === 'TD'\);\s*\}/,
    `if (config.statType === 'TOUCHDOWNS') {
                    if (statGroup.name === 'rushing') targetIdx = labels.findIndex((l: string) => l === 'TD');
                    if (statGroup.name === 'receiving') targetIdx = labels.findIndex((l: string) => l === 'TD');
                }
                if (config.statType === 'PASSING_TOUCHDOWNS') {
                    if (statGroup.name === 'passing') targetIdx = labels.findIndex((l: string) => l === 'TD');
                }`
);

code = code.replace(
    /\/\/ If stat is TOUCHDOWNS, sum them across rushing\/receiving\/passing\s*if \(config\.statType === 'TOUCHDOWNS'\) {/,
    `// If stat is TOUCHDOWNS or PASSING_TOUCHDOWNS, sum them if multiple groups (though usually not for passing)
                            if (config.statType === 'TOUCHDOWNS' || config.statType === 'PASSING_TOUCHDOWNS') {`
);

fs.writeFileSync('src/services/propGrader.ts', code);
