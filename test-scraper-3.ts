import { scrapeLeagueSchedules } from './src/services/espnScraper.js';

async function main() {
    const res = await scrapeLeagueSchedules('ATP', false);
    const activeNoOdds = res.data.filter((m: any) => m.active && m.metadata?.mlHome === null && m.metadata?.mlAway === null);
    console.log(`Active with NO odds: ${activeNoOdds.length}`);
    if (activeNoOdds.length > 0) {
        console.log(JSON.stringify(activeNoOdds[0], null, 2));
    }
}
main();
