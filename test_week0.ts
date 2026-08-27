import { scrapeLeagueSchedules } from './src/services/scheduleProcessor.js';

async function run() {
  const resScrape = await scrapeLeagueSchedules('CFB', false, undefined, ['20260822', '20260823', '20260824']);
  console.log("Found", resScrape.data?.length);
  if (resScrape.data) {
    resScrape.data.forEach(m => console.log(m.title, new Date(m.startTime).toLocaleString()));
  }
}
run();
