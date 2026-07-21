async function fetchPlayerStat(config, timeframe) {
    let sport = '';
    let leaguePath = '';
    
    switch (config.league) {
        case 'MLB': sport = 'baseball'; leaguePath = 'mlb'; break;
        case 'NFL': sport = 'football'; leaguePath = 'nfl'; break;
        case 'CFB': sport = 'football'; leaguePath = 'college-football'; break;
        case 'NBA': sport = 'basketball'; leaguePath = 'nba'; break;
    }

    const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${leaguePath}/summary?event=${config.gameId}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${config.league} data`);
    const data = await res.json();

    if (!data || !data.boxscore || !data.boxscore.players) {
        return null; 
    }

    try {
        const playerId = config.playerId.toString();
        let foundStatValue = null;

        for (const teamTeam of data.boxscore.players) {
            for (const statGroup of teamTeam.statistics) {
                const labels = statGroup.names || statGroup.labels || [];
                
                let targetIdx = -1;
                
                // NBA mapping
                if (config.statType === 'POINTS') targetIdx = labels.findIndex((l) => l === 'PTS');
                if (config.statType === 'REBOUNDS') targetIdx = labels.findIndex((l) => l === 'REB');
                if (config.statType === 'ASSISTS') targetIdx = labels.findIndex((l) => l === 'AST');
                if (config.statType === 'THREES') targetIdx = labels.findIndex((l) => l === '3PT');
                
                // MLB mapping
                if (config.statType === 'STRIKEOUTS') targetIdx = labels.findIndex((l) => l === 'K');
                if (config.statType === 'HITS') targetIdx = labels.findIndex((l) => l === 'H');
                if (config.statType === 'HOME_RUNS') targetIdx = labels.findIndex((l) => l === 'HR');
                
                // NFL mapping
                if (config.statType === 'PASSING_YARDS' && statGroup.name === 'passing') targetIdx = labels.findIndex((l) => l === 'YDS');
                if (config.statType === 'RUSHING_YARDS' && statGroup.name === 'rushing') targetIdx = labels.findIndex((l) => l === 'YDS');
                if (config.statType === 'RECEIVING_YARDS' && statGroup.name === 'receiving') targetIdx = labels.findIndex((l) => l === 'YDS');
                if (config.statType === 'TOUCHDOWNS') {
                    if (statGroup.name === 'passing') targetIdx = labels.findIndex((l) => l === 'TD');
                    if (statGroup.name === 'rushing') targetIdx = labels.findIndex((l) => l === 'TD');
                    if (statGroup.name === 'receiving') targetIdx = labels.findIndex((l) => l === 'TD');
                }

                if (targetIdx !== -1) {
                    const athleteStat = statGroup.athletes?.find((a) => a.athlete.id.toString() === playerId);
                    if (athleteStat && athleteStat.stats && athleteStat.stats[targetIdx] !== undefined) {
                        const val = parseFloat(athleteStat.stats[targetIdx]);
                        if (!isNaN(val)) {
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
        
        return 0;
    } catch (err) {
        console.error("Error parsing boxscore:", err);
        return 0;
    }
}

fetchPlayerStat({ league: 'MLB', gameId: '401569931', playerId: 31097, statType: 'STRIKEOUTS' }, 'FULL_GAME').then(res => console.log(res));
