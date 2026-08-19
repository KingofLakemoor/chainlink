import { scrapeLeagueSchedules } from './src/services/espnScraper.js';
async function test() {
    const res = await scrapeLeagueSchedules('LLWS');
    console.log("Found matches:", res.data.length);
    if (res.data.length > 0) {
        console.log(res.data[0]);
    }
}
test();
