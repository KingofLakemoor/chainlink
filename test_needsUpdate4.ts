import { adminDb } from './src/lib/firebase-admin.js';
import { scrapeLeagueSchedules } from './src/services/espnScraper.js';

const resolveImage = (existingImage: string | undefined, scrapedImage: string | undefined) => {
    if (!scrapedImage || scrapedImage === '/logo.png') return existingImage || scrapedImage;
    if (scrapedImage.includes('usa.png') && existingImage && !existingImage.includes('usa.png') && existingImage !== '/logo.png') {
        return existingImage;
    }
    return scrapedImage || existingImage;
};

async function run() {
  if (!adminDb) return;
  const gameId = '401816655';
  
  const data = await scrapeLeagueSchedules('MLB');
  const games = data.matchups || (Array.isArray(data) ? data : data.games) || data.data;
  const scrapedMatchup = games.find((g: any) => g.gameId === gameId);
  const doc = await adminDb.collection('matchups').doc(gameId).get();
  const existingData = doc.data();
  
  let newStatus = scrapedMatchup.status;
  let homeScore = scrapedMatchup.homeTeam?.score;
  let awayScore = scrapedMatchup.awayTeam?.score;
  let finalActive = false;
  let newTitle = scrapedMatchup.title;
  let newStatusDesc = scrapedMatchup.statusDesc;
  
  console.log("type mismatch:", existingData.type !== 'STATS');
  console.log("homeName mismatch:", existingData.homeTeam?.name !== scrapedMatchup.homeTeam?.name);
  console.log("awayName mismatch:", existingData.awayTeam?.name !== scrapedMatchup.awayTeam?.name);
  
  console.log("cond:", (existingData.type !== 'STATS' && existingData.homeTeam?.name !== scrapedMatchup.homeTeam?.name));
  
  const spread_cond = (existingData.type !== 'SPREAD' && scrapedMatchup.metadata?.spread !== undefined && scrapedMatchup.metadata?.spread !== null && existingData.metadata?.spread !== scrapedMatchup.metadata?.spread);
  console.log("spread:", spread_cond);
}
run();
