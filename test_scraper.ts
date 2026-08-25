import { scrapeLeagueSchedules } from './src/services/espnScraper.js';

async function run() {
  const res = await scrapeLeagueSchedules('ARG', false);
  res.data.forEach(m => {
    if (m.title.includes("Talleres")) {
      console.log(m.title, m.status, m.statusDesc);
    }
  });
}
run();
