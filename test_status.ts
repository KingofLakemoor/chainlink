import { scrapeLeagueSchedules } from './src/services/scheduleProcessor.js';

async function run() {
  const resScrape = await scrapeLeagueSchedules('CFB', false, undefined, ['20260829']);
  if (resScrape.data && resScrape.data.length > 0) {
    console.log(resScrape.data[0]);
  }
}
run();
