import { scrapeLeagueSchedules } from './src/services/espnScraper.ts';
async function run() {
  const res = await scrapeLeagueSchedules('BRA', false, undefined, ['20260726']);
  console.log(res);
}
run();
