import * as firebaseAdmin from '../lib/firebase-admin.js';
import fetch from 'node-fetch';
import cron from 'node-cron';

let getAdminDb = () => firebaseAdmin.adminDb;

// Export for mocking in tests
export function setAdminDbMock(mock: any) { getAdminDb = () => mock; }

// Setup internal cron to run every 6 hours for odds sync
cron.schedule('0 */6 * * *', async () => {
    console.log('[OddsProcessor] Running scheduled 6-hour odds sync (Tennis & Soccer)');
    await syncTennisOdds();
    await syncSoccerOdds();
});

/**
 * Normalizes player names to help matching between ESPN and Odds API.
 */
function normalizeName(name: string) {
  if (!name) return "";
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z ]/g, "").trim();
}

/**
 * Checks if two names match, handling initials (e.g. "C. Alcaraz" vs "Carlos Alcaraz").
 */
function namesMatch(name1: string, name2: string) {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  
  if (n1 === n2) return true;
  
  const p1 = n1.split(' ');
  const p2 = n2.split(' ');
  
  const last1 = p1[p1.length - 1];
  const last2 = p2[p2.length - 1];
  
  if (last1 === last2 && last1.length > 2) {
    const first1 = p1[0];
    const first2 = p2[0];
    if (first1[0] === first2[0]) {
      return true;
    }
  }
  return false;
}

export async function syncTennisOdds() {
  const adminDb = getAdminDb();
  if (!adminDb) {
    console.warn("[OddsProcessor] adminDb is not initialized. Skipping odds sync.");
    return { success: false, error: 'No admin db' };
  }
  
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    console.log("[OddsProcessor] ODDS_API_KEY is not set. Skipping tennis odds sync.");
    return { success: true, message: 'ODDS_API_KEY missing, skipping.' };
  }

  try {
    const sportsRes = await fetch(`https://api.the-odds-api.com/v4/sports/?apiKey=${apiKey}`);
    if (!sportsRes.ok) {
       const text = await sportsRes.text();
       console.error("[OddsProcessor] Failed to fetch sports from Odds API", text);
       return { success: false, error: 'Failed to fetch sports from Odds API' };
    }
    const sportsData: any = await sportsRes.json();
    
    // Filter for ATP and WTA tennis sports
    const tennisSports = sportsData
      .filter((s: any) => s.key && (s.key.startsWith('tennis_atp') || s.key.startsWith('tennis_wta')))
      .map((s: any) => s.key);
    
    if (tennisSports.length === 0) {
      console.log("[OddsProcessor] No active tennis sports found on Odds API.");
      return { success: true, message: 'No active tennis sports.' };
    }

    const scraperSnap = await adminDb.collection('systemSettings').doc('scraper').get();
    let threshold = 300;
    if (scraperSnap.exists) {
       const scraperConfig = scraperSnap.data();
       threshold = Math.abs(scraperConfig.maxMoneylineOdds ?? 300);
       if (scraperConfig.sportOverrides && scraperConfig.sportOverrides['ATP'] !== undefined) {
          // just taking ATP override as generic for tennis
          threshold = Math.abs(scraperConfig.sportOverrides['ATP']);
       }
    }

    const matchupsSnap = await adminDb.collection('matchups')
      .where('status', '==', 'STATUS_SCHEDULED')
      .where('league', 'in', ['ATP', 'WTA'])
      .get();
      
    if (matchupsSnap.empty) {
      console.log("[OddsProcessor] No scheduled ATP/WTA matchups in DB.");
      return { success: true, message: 'No scheduled tennis matches in DB.' };
    }
    
    const dbMatchups = matchupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    let updatedCount = 0;
    const batch = adminDb.batch();
    let batchCount = 0;
    const matchedIds = new Set<string>();

    for (const sport of tennisSports) {
       const oddsRes = await fetch(`https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${apiKey}&regions=us&markets=h2h&oddsFormat=american`);
       if (!oddsRes.ok) {
          console.error(`[OddsProcessor] Failed to fetch odds for ${sport}`);
          continue;
       }
       const oddsData: any = await oddsRes.json();
       
       for (const event of oddsData) {
         const homeTeamName = event.home_team;
         const awayTeamName = event.away_team;
         
         // Prefer DraftKings or FanDuel, otherwise just take the first US bookmaker
         const bookmaker = event.bookmakers?.find((b: any) => b.key === 'draftkings' || b.key === 'fanduel') || event.bookmakers?.[0];
         if (!bookmaker) continue;
         
         const h2hMarket = bookmaker.markets?.find((m: any) => m.key === 'h2h');
         if (!h2hMarket || !h2hMarket.outcomes) continue;
         
         const homeOutcome = h2hMarket.outcomes.find((o: any) => o.name === homeTeamName);
         const awayOutcome = h2hMarket.outcomes.find((o: any) => o.name === awayTeamName);
         
         if (!homeOutcome || !awayOutcome) continue;
         
         const mlHome = homeOutcome.price;
         const mlAway = awayOutcome.price;

         const match = dbMatchups.find((m: any) => {
            if (!m.homeTeam?.name || !m.awayTeam?.name) return false;
            
            // The Odds API usually uses standard names. 
            // In ESPN, home and away could be swapped sometimes, so we check both combinations
            const espnHome = m.homeTeam.name;
            const espnAway = m.awayTeam.name;
            
            if (namesMatch(espnHome, homeTeamName) && namesMatch(espnAway, awayTeamName)) {
                return true;
            }
            if (namesMatch(espnHome, awayTeamName) && namesMatch(espnAway, homeTeamName)) {
                return true;
            }
            
            return false;
         });
         
         if (match) {
            matchedIds.add(match.id);
            let finalMlHome = mlHome;
            let finalMlAway = mlAway;
            
            // Swap odds if ESPN's home/away is flipped compared to Odds API
            if (namesMatch((match as any).homeTeam.name, awayTeamName) && namesMatch((match as any).awayTeam.name, homeTeamName)) {
                finalMlHome = mlAway;
                finalMlAway = mlHome;
            }

            const matchRef = adminDb.collection('matchups').doc(match.id);
            const finalMlHomeNum = parseInt(finalMlHome, 10);
            const finalMlAwayNum = parseInt(finalMlAway, 10);

            let active = true;
            if (!isNaN(finalMlHomeNum) && (finalMlHomeNum <= -threshold || finalMlHomeNum >= threshold)) {
                active = false;
            }
            if (!isNaN(finalMlAwayNum) && (finalMlAwayNum <= -threshold || finalMlAwayNum >= threshold)) {
                active = false;
            }

            if (!active) {
                // Check if anyone has already picked this before making it inactive
                const picksSnap = await adminDb.collection('picks').where('matchupId', '==', match.id).limit(1).get();
                if (!picksSnap.empty) {
                    active = true;
                }
            }

            batch.update(matchRef, {
              'metadata.mlHome': finalMlHome,
              'metadata.mlAway': finalMlAway,
              'active': active,
              'updatedAt': Date.now()
            });
            updatedCount++;
            batchCount++;
            
            if (batchCount === 490) {
               await batch.commit();
               batchCount = 0;
            }
         }
       }
    }
    
    // Mark any unmatched ATP/WTA matchups as inactive
    for (const match of dbMatchups) {
       if (!matchedIds.has(match.id) && (match as any).active === true) {
           // Check if anyone has already picked this before making it inactive
           const picksSnap = await adminDb.collection('picks').where('matchupId', '==', match.id).limit(1).get();
           if (!picksSnap.empty) {
               continue;
           }

           const matchRef = adminDb.collection('matchups').doc(match.id);
           batch.update(matchRef, {
               'active': false,
               'updatedAt': Date.now()
           });
           batchCount++;
           if (batchCount === 490) {
               await batch.commit();
               batchCount = 0;
           }
       }
    }
    
    if (batchCount > 0) {
      await batch.commit();
    }
    
    console.log(`[OddsProcessor] Successfully updated ${updatedCount} tennis matchups with third-party odds.`);
    return { success: true, updatedCount };
  } catch (err: any) {
    console.error("[OddsProcessor] Odds processing error:", err);
    return { success: false, error: err.message };
  }
}


export async function syncSoccerOdds() {
  const adminDb = getAdminDb();
  if (!adminDb) return { success: false, error: 'No admin db' };
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) return { success: true, message: 'ODDS_API_KEY missing, skipping.' };

  try {
    const scraperSnap = await adminDb.collection('systemSettings').doc('scraper').get();
    let threshold = 300;
    if (scraperSnap.exists) {
       const scraperConfig = scraperSnap.data();
       threshold = Math.abs(scraperConfig.maxMoneylineOdds ?? 300);
       if (scraperConfig.sportOverrides && scraperConfig.sportOverrides['RPL'] !== undefined) {
          threshold = Math.abs(scraperConfig.sportOverrides['RPL']);
       }
    }

    const matchupsSnap = await adminDb.collection('matchups')
      .where('status', '==', 'STATUS_SCHEDULED')
      .where('league', '==', 'RPL')
      .get();
      
    if (matchupsSnap.empty) return { success: true, message: 'No scheduled RPL matches in DB.' };
    const dbMatchups = matchupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const oddsRes = await fetch(`https://api.the-odds-api.com/v4/sports/soccer_russia_premier_league/odds/?apiKey=${apiKey}&regions=us&markets=h2h&oddsFormat=american`);
    if (!oddsRes.ok) return { success: false, error: 'Failed to fetch RPL odds' };
    const oddsData = await oddsRes.json();

    let updatedCount = 0;
    const batch = adminDb.batch();
    let batchCount = 0;
    const matchedIds = new Set<string>();

    for (const event of oddsData) {
       const homeTeamName = event.home_team;
       const awayTeamName = event.away_team;
       
       const bookmaker = event.bookmakers?.find((b: any) => b.key === 'draftkings' || b.key === 'fanduel') || event.bookmakers?.[0];
       if (!bookmaker) continue;
       
       const h2hMarket = bookmaker.markets?.find((m: any) => m.key === 'h2h');
       if (!h2hMarket || !h2hMarket.outcomes) continue;
       
       const homeOutcome = h2hMarket.outcomes.find((o: any) => o.name === homeTeamName);
       const awayOutcome = h2hMarket.outcomes.find((o: any) => o.name === awayTeamName);
       if (!homeOutcome || !awayOutcome) continue;

       const mlHome = homeOutcome.price;
       const mlAway = awayOutcome.price;

       const match = dbMatchups.find((m: any) => {
          if (!m.homeTeam?.name || !m.awayTeam?.name) return false;
          const espnHome = m.homeTeam.name;
          const espnAway = m.awayTeam.name;
          if (namesMatch(espnHome, homeTeamName) && namesMatch(espnAway, awayTeamName)) return true;
          if (namesMatch(espnHome, awayTeamName) && namesMatch(espnAway, homeTeamName)) return true;
          return false;
       });

       if (match) {
          matchedIds.add(match.id);
          let finalMlHome = mlHome;
          let finalMlAway = mlAway;
          if (namesMatch((match as any).homeTeam.name, awayTeamName) && namesMatch((match as any).awayTeam.name, homeTeamName)) {
              finalMlHome = mlAway;
              finalMlAway = mlHome;
          }
          const matchRef = adminDb.collection('matchups').doc(match.id);
          const finalMlHomeNum = parseInt(finalMlHome, 10);
          const finalMlAwayNum = parseInt(finalMlAway, 10);
          let active = true;
          if (!isNaN(finalMlHomeNum) && (finalMlHomeNum <= -threshold || finalMlHomeNum >= threshold)) active = false;
          if (!isNaN(finalMlAwayNum) && (finalMlAwayNum <= -threshold || finalMlAwayNum >= threshold)) active = false;
          
          if (!active) {
              const picksSnap = await adminDb.collection('picks').where('matchupId', '==', match.id).limit(1).get();
              if (!picksSnap.empty) active = true;
          }

          batch.update(matchRef, {
            'metadata.mlHome': finalMlHome,
            'metadata.mlAway': finalMlAway,
            'active': active,
            'updatedAt': Date.now()
          });
          updatedCount++;
          batchCount++;
          
          if (batchCount === 490) {
             await batch.commit();
             batchCount = 0;
          }
       }
    }

    for (const match of dbMatchups) {
       if (!matchedIds.has(match.id) && (match as any).active === true) {
           const picksSnap = await adminDb.collection('picks').where('matchupId', '==', match.id).limit(1).get();
           if (!picksSnap.empty) continue;
           const matchRef = adminDb.collection('matchups').doc(match.id);
           batch.update(matchRef, { 'active': false, 'updatedAt': Date.now() });
           batchCount++;
           if (batchCount === 490) { await batch.commit(); batchCount = 0; }
       }
    }
    
    if (batchCount > 0) await batch.commit();
    console.log(`[OddsProcessor] Successfully updated ${updatedCount} RPL matchups with third-party odds.`);
    return { success: true, updatedCount };

  } catch (err: any) {
    console.error("[OddsProcessor] RPL odds processing error:", err);
    return { success: false, error: err.message };
  }
}
