import { scrapeLeagueSchedules } from './src/services/espnScraper.js';

async function run() {
  const result = await scrapeLeagueSchedules('NBASL');
  console.log(JSON.stringify(result.data?.[0], null, 2));
}
run();
