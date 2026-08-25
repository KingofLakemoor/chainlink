import { scrapeLeagueSchedules } from './src/services/espnScraper.js';

async function run() {
  const res = await scrapeLeagueSchedules('WNBA', false);
  res.data.forEach(m => {
    if (m.title.includes("Dream") || m.title.includes("Sparks")) {
      console.log(m.title, m.status, m.statusDesc);
    }
  });
}
run();
