import { scrapeLeagueSchedules } from './src/services/espnScraper.js';
async function test() {
    const res = await scrapeLeagueSchedules('ATP');
    console.log(res.data.slice(0, 2));
}
test();
