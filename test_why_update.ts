import { adminDb } from './src/lib/firebase-admin.js';
import { scrapeLeagueSchedules } from './src/services/espnScraper.js';

async function run() {
  if (!adminDb) return;
  const gameId = '1075-2026_182119'; // WTA game
  const league = 'WTA';
  
  const data = await scrapeLeagueSchedules(league);
  const games = data.matchups || (Array.isArray(data) ? data : data.games) || data.data;
  if (!games) { console.log("No games", Object.keys(data)); return; }
  
  const scrapedMatchup = games.find(g => g.gameId === gameId);
  if (!scrapedMatchup) { console.log("Scraped not found"); return; }
  
  const doc = await adminDb.collection('matchups').doc(gameId).get();
  const existingData = doc.data();
  
  // Now evaluate needsUpdate conditions!
  console.log("existingData.abandoned === true:", existingData.abandoned === true);
  console.log("status:", existingData.status, scrapedMatchup.status);
  console.log("statusDesc:", existingData.statusDesc, scrapedMatchup.statusDesc);
  console.log("startTime:", existingData.startTime, scrapedMatchup.startTime);
  console.log("homeScore:", existingData.homeTeam?.score, scrapedMatchup.homeTeam?.score);
  console.log("awayScore:", existingData.awayTeam?.score, scrapedMatchup.awayTeam?.score);
  console.log("title:", existingData.title, scrapedMatchup.title);
  console.log("league:", existingData.league, scrapedMatchup.league);
  console.log("homeName:", existingData.homeTeam?.name, scrapedMatchup.homeTeam?.name);
  console.log("homeShort:", existingData.homeTeam?.shortName, scrapedMatchup.homeTeam?.shortName);
  console.log("homeImage:", existingData.homeTeam?.image, scrapedMatchup.homeTeam?.image);
  console.log("homeId:", existingData.homeTeam?.id, scrapedMatchup.homeTeam?.id);
  console.log("awayName:", existingData.awayTeam?.name, scrapedMatchup.awayTeam?.name);
  console.log("awayShort:", existingData.awayTeam?.shortName, scrapedMatchup.awayTeam?.shortName);
  console.log("awayImage:", existingData.awayTeam?.image, scrapedMatchup.awayTeam?.image);
  console.log("awayId:", existingData.awayTeam?.id, scrapedMatchup.awayTeam?.id);
  console.log("active:", existingData.active, scrapedMatchup.active);
  console.log("abandoned condition:", (existingData.abandoned !== false && !existingData.abandoned));
  
  const metadataCond = (scrapedMatchup.metadata?.overUnder !== undefined && existingData.metadata?.overUnder !== scrapedMatchup.metadata?.overUnder);
  console.log("metadata overUnder:", metadataCond);
  
  console.log("metadata homeLinescores:", JSON.stringify(existingData.metadata?.homeLinescores), JSON.stringify(scrapedMatchup.metadata?.homeLinescores));
  console.log("metadata awayLinescores:", JSON.stringify(existingData.metadata?.awayLinescores), JSON.stringify(scrapedMatchup.metadata?.awayLinescores));
  
}
run();
