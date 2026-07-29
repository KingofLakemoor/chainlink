import { scrapeLeagueSchedules } from './src/services/espnScraper.js';

async function run() {
  console.log("Scraping MLB...");
  const res = await scrapeLeagueSchedules("MLB");
  console.log("Response data length:", res.data?.length);
  if (res.data && res.data.length > 0) {
    console.log("First game:", new Date(res.data[0].startTime).toLocaleString());
  } else {
    console.log("No games", res.error);
  }
}
run();
