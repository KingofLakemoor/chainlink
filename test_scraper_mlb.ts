import { scrapeLeagueSchedules } from './src/services/espnScraper.js';

async function run() {
  const data = await scrapeLeagueSchedules('MLB');
  const games = data.matchups || (Array.isArray(data) ? data : data.games) || data.data;
  const match = games.find((g: any) => g.gameId === '401816655');
  console.log("metadata:", match?.metadata);
}
run();
