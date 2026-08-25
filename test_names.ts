import { adminDb } from './src/lib/firebase-admin.js';
import { scrapeLeagueSchedules } from './src/services/espnScraper.js';

async function run() {
  if (!adminDb) return;
  const gameId = '401816655';
  
  const data = await scrapeLeagueSchedules('MLB');
  const games = data.matchups || (Array.isArray(data) ? data : data.games) || data.data;
  const scrapedMatchup = games.find((g: any) => g.gameId === gameId);
  const doc = await adminDb.collection('matchups').doc(gameId).get();
  const existingData = doc.data();
  
  console.log("homeName db:", existingData?.homeTeam?.name, "scraper:", scrapedMatchup?.homeTeam?.name);
  console.log("awayName db:", existingData?.awayTeam?.name, "scraper:", scrapedMatchup?.awayTeam?.name);
}
run();
