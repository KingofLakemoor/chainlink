const fs = require('fs');
let code = fs.readFileSync('src/services/propGrader.ts', 'utf8');

const parseFunction = `
    if (!data || !data.boxscore || !data.boxscore.players) {
        return null; // Game hasn't started or boxscore not available
    }

    try {
        const playerId = config.playerId.toString();
        let foundStatValue = null;

        for (const teamTeam of data.boxscore.players) {
            for (const statGroup of teamTeam.statistics) {
                // Determine labels array: NBA uses 'names', NFL uses 'labels'
                const labels = statGroup.names || statGroup.labels || [];
                
                let targetIdx = -1;
                // NBA mapping
                if (config.statType === 'POINTS') targetIdx = labels.findIndex((l: string) => l === 'PTS');
                if (config.statType === 'REBOUNDS') targetIdx = labels.findIndex((l: string) => l === 'REB');
                if (config.statType === 'ASSISTS') targetIdx = labels.findIndex((l: string) => l === 'AST');
                if (config.statType === 'THREES') targetIdx = labels.findIndex((l: string) => l === '3PT');
                
                // MLB mapping
                if (config.statType === 'STRIKEOUTS') targetIdx = labels.findIndex((l: string) => l === 'K');
                if (config.statType === 'HITS') targetIdx = labels.findIndex((l: string) => l === 'H');
                if (config.statType === 'HOME_RUNS') targetIdx = labels.findIndex((l: string) => l === 'HR');
                
                // NFL mapping
                if (config.statType === 'PASSING_YARDS' && statGroup.name === 'passing') targetIdx = labels.findIndex((l: string) => l === 'YDS');
                if (config.statType === 'RUSHING_YARDS' && statGroup.name === 'rushing') targetIdx = labels.findIndex((l: string) => l === 'YDS');
                if (config.statType === 'RECEIVING_YARDS' && statGroup.name === 'receiving') targetIdx = labels.findIndex((l: string) => l === 'YDS');
                if (config.statType === 'TOUCHDOWNS') {
                    if (statGroup.name === 'passing') targetIdx = labels.findIndex((l: string) => l === 'TD');
                    if (statGroup.name === 'rushing') targetIdx = labels.findIndex((l: string) => l === 'TD');
                    if (statGroup.name === 'receiving') targetIdx = labels.findIndex((l: string) => l === 'TD');
                }

                if (targetIdx !== -1) {
                    const athleteStat = statGroup.athletes?.find((a: any) => a.athlete.id.toString() === playerId);
                    if (athleteStat && athleteStat.stats && athleteStat.stats[targetIdx] !== undefined) {
                        const val = parseFloat(athleteStat.stats[targetIdx]);
                        if (!isNaN(val)) {
                            // If stat is TOUCHDOWNS, sum them across rushing/receiving/passing
                            if (config.statType === 'TOUCHDOWNS') {
                                foundStatValue = (foundStatValue || 0) + val;
                            } else {
                                return val;
                            }
                        }
                    }
                }
            }
        }
        
        if (foundStatValue !== null) return foundStatValue;
        
        // If the player is in the boxscore but didn't register this specific stat, they get 0
        // (Assuming they played if the boxscore exists)
        return 0;
    } catch (err) {
        console.error("Error parsing boxscore:", err);
        return 0;
    }
`;

code = code.replace(
`    if (!data || !data.boxscore || !data.boxscore.players) {
        return null; // Game hasn't started or boxscore not available
    }

    // TODO: Implement deep boxscore parsing for each specific league and statType
    // For now, returning a mock value so the structure compiles and makes sense.
    return 0;`,
    parseFunction
);

fs.writeFileSync('src/services/propGrader.ts', code);
