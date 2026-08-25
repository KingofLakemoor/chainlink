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
  const gameId = '1075-2026_182119';
  const league = 'WTA';
  
  const data = await scrapeLeagueSchedules(league);
  const games = data.matchups || (Array.isArray(data) ? data : data.games) || data.data;
  const scrapedMatchup = games.find((g: any) => g.gameId === gameId);
  const doc = await adminDb.collection('matchups').doc(gameId).get();
  const existingData = doc.data();
  
  let newStatus = scrapedMatchup.status;
  let homeScore = scrapedMatchup.homeTeam?.score;
  let awayScore = scrapedMatchup.awayTeam?.score;
  let finalActive = false; // simplify
  let newTitle = scrapedMatchup.title;
  let newStatusDesc = scrapedMatchup.statusDesc;
  
  const c1 = (existingData.abandoned === true && false);
  const c2 = existingData.status !== newStatus;
  const c3 = existingData.statusDesc !== newStatusDesc;
  const c4 = existingData.startTime !== scrapedMatchup.startTime;
  const c5 = existingData.homeTeam?.score !== homeScore;
  const c6 = existingData.awayTeam?.score !== awayScore;
  const c7 = existingData.title !== newTitle;
  const c8 = existingData.league !== scrapedMatchup.league;
  const c9 = existingData.homeTeam?.name !== scrapedMatchup.homeTeam?.name;
  const c10 = existingData.homeTeam?.shortName !== scrapedMatchup.homeTeam?.shortName;
  const c11 = existingData.homeTeam?.image !== resolveImage(existingData.homeTeam?.image, scrapedMatchup.homeTeam?.image);
  const c12 = existingData.homeTeam?.id !== scrapedMatchup.homeTeam?.id;
  const c13 = existingData.awayTeam?.name !== scrapedMatchup.awayTeam?.name;
  const c14 = existingData.awayTeam?.shortName !== scrapedMatchup.awayTeam?.shortName;
  const c15 = existingData.awayTeam?.image !== resolveImage(existingData.awayTeam?.image, scrapedMatchup.awayTeam?.image);
  const c16 = existingData.awayTeam?.id !== scrapedMatchup.awayTeam?.id;
  const c17 = existingData.active !== finalActive;
  const c18 = (existingData.abandoned !== false && !existingData.abandoned);
  const c19 = (scrapedMatchup.metadata?.overUnder !== undefined && existingData.metadata?.overUnder !== scrapedMatchup.metadata?.overUnder);
  const c20 = (scrapedMatchup.metadata?.mlHome !== undefined && existingData.metadata?.mlHome !== scrapedMatchup.metadata?.mlHome);
  const c21 = (scrapedMatchup.metadata?.mlAway !== undefined && existingData.metadata?.mlAway !== scrapedMatchup.metadata?.mlAway);
  const c22 = (scrapedMatchup.metadata?.homeLinescores !== undefined && JSON.stringify(existingData.metadata?.homeLinescores) !== JSON.stringify(scrapedMatchup.metadata?.homeLinescores));
  const c23 = (scrapedMatchup.metadata?.awayLinescores !== undefined && JSON.stringify(existingData.metadata?.awayLinescores) !== JSON.stringify(scrapedMatchup.metadata?.awayLinescores));
  const c24 = (existingData.type !== 'SPREAD' && scrapedMatchup.metadata?.spread !== undefined && existingData.metadata?.spread !== scrapedMatchup.metadata?.spread);
  const c25 = (existingData.type !== scrapedMatchup.type && scrapedMatchup.type === 'SPREAD');

  console.log({c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12, c13, c14, c15, c16, c17, c18, c19, c20, c21, c22, c23, c24, c25});
}
run();
