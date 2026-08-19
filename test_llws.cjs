const scraper = require('./dist/services/espnScraper.js');
async function run() {
    const dates = ["20260819", "20260818", "20260817", "20260820"]; // Try a few dates around today
    let found = false;
    for (const d of dates) {
        const res = await scraper.scrapeLeagueSchedules('LLWS', false, undefined, [d]);
        if (res.data && res.data.length > 0) {
            console.log(`Date: ${d} - Found ${res.data.length} LLWS games`);
            res.data.forEach(g => {
                if(g.homeTeam.name.includes("Santiago") || g.awayTeam.name.includes("Santiago") || g.homeTeam.name.includes("Leon") || g.awayTeam.name.includes("Leon")) {
                    console.log(g.gameId, g.title, g.status, g.statusDesc);
                    found = true;
                }
            });
        }
    }
    if (!found) console.log("Game not found.");
}
run();
