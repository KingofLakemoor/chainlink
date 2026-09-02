import * as firebaseAdmin from '../lib/firebase-admin.js';
import fetch from 'node-fetch';
import cron from 'node-cron';

let getAdminDb = () => firebaseAdmin.adminDb;

// Export for mocking in tests
export function setAdminDbMock(mock: any) { getAdminDb = () => mock; }

let oddsSyncInterval: NodeJS.Timeout | null = null;

export function startOddsProcessorJob() {
  if (oddsSyncInterval) return;
  const runOddsSync = async () => {
    console.log('[OddsProcessor] Running scheduled odds sync (Tennis & Soccer)');
    await syncTennisOdds();
    await syncSoccerOdds();
  };
  runOddsSync();
  oddsSyncInterval = setInterval(runOddsSync, 6 * 60 * 60 * 1000);
}

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
  if (n1.includes(n2) || n2.includes(n1)) return true;
  
  const p1 = n1.split(' ');
  const p2 = n2.split(' ');
  
  const sig1 = p1.filter(w => w.length > 2);
  const sig2 = p2.filter(w => w.length > 2);
  
  const sharedSig = sig1.filter(w => sig2.includes(w));
  if (sharedSig.length === 0) return false;
  if (sharedSig.length >= 2) return true;
  
  const unshared1 = p1.filter(w => !sharedSig.includes(w));
  const unshared2 = p2.filter(w => !sharedSig.includes(w));
  
  for (const w1 of unshared1) {
    for (const w2 of unshared2) {
      if (w1[0] === w2[0]) return true;
      if (w1.length > 2 && w2.length > 2 && (w1.includes(w2) || w2.includes(w1))) return true;
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
  
  const apiKey = process.env.THE_ODDS_API_KEY || process.env.ODDS_API_KEY;
  if (!apiKey) {
    console.log("[OddsProcessor] Neither THE_ODDS_API_KEY nor ODDS_API_KEY is set. Skipping tennis odds sync.");
    return { success: true, message: 'ODDS_API_KEY missing, skipping.' };
  }

  try {
    const matchupsSnap = await adminDb.collection('matchups')
      .where('status', '==', 'STATUS_SCHEDULED')
      .where('league', 'in', ['ATP', 'WTA'])
      .get();

    if (matchupsSnap.empty) {
      console.log("[OddsProcessor] No scheduled ATP/WTA matchups in DB.");
      return { success: true, message: 'No scheduled tennis matches in DB.' };
    }

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
    
    const dbMatchups: any[] = matchupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
            if (isNaN(finalMlHomeNum) && isNaN(finalMlAwayNum)) {
                active = false;
            } else {
                if (!isNaN(finalMlHomeNum) && (finalMlHomeNum <= -threshold || finalMlHomeNum >= threshold)) {
                    active = false;
                }
                if (!isNaN(finalMlAwayNum) && (finalMlAwayNum <= -threshold || finalMlAwayNum >= threshold)) {
                    active = false;
                }
            }

            let abandoned = match.abandoned || false;
            if (!active) {
                // Check if anyone has already picked this before making it inactive
                const targetIds = Array.from(new Set([match.id, match.gameId].filter(Boolean)));
                const picksSnap = await adminDb.collection('picks').where('matchupId', 'in', targetIds).limit(1).get();
                const pickemPicksSnap = await adminDb.collection('pickemPicks').where('matchupId', 'in', targetIds).limit(1).get();
                if (!picksSnap.empty || !pickemPicksSnap.empty) {
                    active = true;
                } else {
                    abandoned = true;
                }
            }

            batch.update(matchRef, {
              'metadata.mlHome': finalMlHome,
              'metadata.mlAway': finalMlAway,
              'active': active,
              'abandoned': abandoned,
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
    
    // Mark any unmatched ATP/WTA matchups as inactive and abandoned if no picks exist
    for (const match of dbMatchups as any[]) {
       if (!matchedIds.has(match.id) && (match as any).active === true) {
           // Check if anyone has already picked this before making it inactive
           const targetIds = Array.from(new Set([match.id, match.gameId].filter(Boolean)));
           const picksSnap = await adminDb.collection('picks').where('matchupId', 'in', targetIds).limit(1).get();
           const pickemPicksSnap = await adminDb.collection('pickemPicks').where('matchupId', 'in', targetIds).limit(1).get();
           if (!picksSnap.empty || !pickemPicksSnap.empty) {
               continue;
           }

           const matchRef = adminDb.collection('matchups').doc(match.id);
           batch.update(matchRef, {
               'active': false,
               'abandoned': true,
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
  const apiKey = process.env.THE_ODDS_API_KEY || process.env.ODDS_API_KEY;
  if (!apiKey) return { success: true, message: 'ODDS_API_KEY missing, skipping.' };

  const leaguesToSync = [
    { espn: 'RPL', oddsApi: 'soccer_russia_premier_league' },
    { espn: 'TUR', oddsApi: 'soccer_turkey_super_league' },
    { espn: 'ARG', oddsApi: 'soccer_argentina_primera_division' },
    { espn: 'BRA', oddsApi: 'soccer_brazil_campeonato' },
    { espn: 'LMX', oddsApi: 'soccer_mexico_ligamx' }
  ];

  let totalUpdated = 0;

  try {
    const scraperSnap = await adminDb.collection('systemSettings').doc('scraper').get();
    let scraperConfig: any = {};
    let baseThreshold = 300;
    if (scraperSnap.exists) {
       scraperConfig = scraperSnap.data();
       baseThreshold = Math.abs(scraperConfig.maxMoneylineOdds ?? 300);
    }

    for (const l of leaguesToSync) {
        let threshold = baseThreshold;
        if (scraperConfig.sportOverrides && scraperConfig.sportOverrides[l.espn] !== undefined) {
            threshold = Math.abs(scraperConfig.sportOverrides[l.espn]);
        }

        const matchupsSnap = await adminDb.collection('matchups')
          .where('status', '==', 'STATUS_SCHEDULED')
          .where('league', '==', l.espn)
          .get();
             
        if (matchupsSnap.empty) {
            console.log(`[OddsProcessor] No scheduled matchups for soccer league ${l.espn}, skipping API call.`);
            continue;
        }
        const dbMatchups: any[] = matchupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const oddsRes = await fetch(`https://api.the-odds-api.com/v4/sports/${l.oddsApi}/odds/?apiKey=${apiKey}&regions=us&markets=h2h&oddsFormat=american`);
        if (!oddsRes.ok) continue;
        const oddsData: any[] = (await oddsRes.json()) as any[];

        const batch = adminDb.batch();
        let batchCount = 0;
        const matchedIds = new Set();

        for (const event of oddsData) {
           const homeTeamName = event.home_team;
           const awayTeamName = event.away_team;
              
           const bookmaker = event.bookmakers?.find((b) => b.key === 'draftkings' || b.key === 'fanduel') || event.bookmakers?.[0];
           if (!bookmaker) continue;
              
           const h2hMarket = bookmaker.markets?.find((m) => m.key === 'h2h');
           if (!h2hMarket || !h2hMarket.outcomes) continue;
              
           const homeOutcome = h2hMarket.outcomes.find((o) => o.name === homeTeamName);
           const awayOutcome = h2hMarket.outcomes.find((o) => o.name === awayTeamName);
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
              if (isNaN(finalMlHomeNum) && isNaN(finalMlAwayNum)) {
                  active = false;
              } else {
                  if (!isNaN(finalMlHomeNum) && (finalMlHomeNum <= -threshold || finalMlHomeNum >= threshold)) active = false;
                  if (!isNaN(finalMlAwayNum) && (finalMlAwayNum <= -threshold || finalMlAwayNum >= threshold)) active = false;
              }
                 
              if (!active) {
                  const targetIds = Array.from(new Set([match.id, match.gameId].filter(Boolean)));
                  const picksSnap = await adminDb.collection('picks').where('matchupId', 'in', targetIds).limit(1).get();
                  if (!picksSnap.empty) active = true;
              }

              batch.update(matchRef, {
                'metadata.mlHome': finalMlHome,
                'metadata.mlAway': finalMlAway,
                'active': active,
                'updatedAt': Date.now()
              });
              totalUpdated++;
              batchCount++;
                 
              if (batchCount === 490) {
                 await batch.commit();
                 batchCount = 0;
              }
           }
        }

        for (const match of dbMatchups) {
           if (!matchedIds.has(match.id) && (match as any).active === true) {
               const targetIds = Array.from(new Set([match.id, match.gameId].filter(Boolean)));
               const picksSnap = await adminDb.collection('picks').where('matchupId', 'in', targetIds).limit(1).get();
               if (!picksSnap.empty) continue;
               const matchRef = adminDb.collection('matchups').doc(match.id);
               batch.update(matchRef, { 'active': false, 'updatedAt': Date.now() });
               batchCount++;
               if (batchCount === 490) { await batch.commit(); batchCount = 0; }
           }
        }
           
        if (batchCount > 0) await batch.commit();
    }
    
    return { success: true, updated: totalUpdated };
  } catch (err: any) {
    console.error('Error syncing soccer odds', err);
    return { success: false, error: err.message };
  }
}
