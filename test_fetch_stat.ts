import { fetchPlayerStat } from './src/services/propGrader.js';

async function run() {
    const configA = {
        statType: "STRIKEOUTS",
        gameId: "401816234",
        teamId: "30",
        playerId: "4346117",
        league: "MLB"
    };
    
    const configB = {
        playerId: "40912",
        statType: "STRIKEOUTS",
        league: "MLB",
        teamId: "14",
        gameId: "401816234"
    };
    
    const statA = await fetchPlayerStat(configA as any, 'FULL_GAME');
    const statB = await fetchPlayerStat(configB as any, 'FULL_GAME');
    
    console.log("Stat A:", statA);
    console.log("Stat B:", statB);
}

run();
