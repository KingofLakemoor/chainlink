import { scrapeLeagueSchedules } from './src/services/espnScraper.ts';
async function run() {
  const res = await scrapeLeagueSchedules('LMX', false, undefined, ['20260726']);
  console.log(res);
}
run();
