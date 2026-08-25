import { adminDb } from './src/lib/firebase-admin.js';
import { scrapeLeagueSchedules } from './src/services/espnScraper.js';

async function run() {
  if (!adminDb) return;
  const league = 'MLB';
  const data = await scrapeLeagueSchedules(league);
  console.log(Object.keys(data));
  const games = data.matchups || (Array.isArray(data) ? data : data.games);
  if (!games || games.length === 0) { console.log("No games"); return; }
  
  const game = games[0];
  const doc = await adminDb.collection('matchups').doc(game.gameId).get();
  if (!doc.exists) { console.log("Doc not found"); return; }
  
  const existing = doc.data();
  console.log("ESPN:", JSON.stringify(game, null, 2));
  console.log("DB:", JSON.stringify(existing, null, 2));
}
run();
