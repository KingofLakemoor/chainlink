import { scrapeLeagueSchedules } from './src/services/espnScraper.js';
async function run() {
  const data = await scrapeLeagueSchedules('WTA');
  const games = data.matchups || (Array.isArray(data) ? data : data.games) || data.data;
  const match = games.find((g: any) => g.gameId === '718-2026_184453');
  console.log("mlHome:", match?.metadata?.mlHome, typeof match?.metadata?.mlHome);
  console.log("mlAway:", match?.metadata?.mlAway, typeof match?.metadata?.mlAway);
}
run();
