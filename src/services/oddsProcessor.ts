import * as firebaseAdmin from '../lib/firebase-admin.js';
import { logServerError } from '../lib/serverErrorLogger.js';
import { teamsMatch } from '../utils/sportMapping.js';
import fetch from 'node-fetch';
import cron from 'node-cron';

let getAdminDb = () => firebaseAdmin.adminDb;

// Export for mocking in tests
export function setAdminDbMock(mock: any) { getAdminDb = () => mock; }

// Setup internal cron to pull odds at key points during the day after overnight runs (06:00, 12:00, 18:00)
cron.schedule('0 6,12,18 * * *', async () => {
    console.log('[OddsProcessor] Running scheduled key-time odds sync (Tennis & Soccer)');
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
async function checkMatchupHasPicks(adminDb: any, match: any): Promise<boolean> {
  const targetIds = Array.from(new Set([match.id, match.gameId])).filter(Boolean);
  if (targetIds.length === 0) return false;

  const picksSnap = await adminDb.collection('picks').where('matchupId', 'in', targetIds).limit(1).get();
  if (!picksSnap.empty) return true;

  const pickemPicksSnap = await adminDb.collection('pickemPicks').where('matchupId', 'in', targetIds).limit(1).get();
  return !pickemPicksSnap.empty;
}

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

  const oddsApiKey = (process.env.THE_ODDS_API_KEY || process.env.ODDS_API_KEY || '').trim();
  const sharpApiKey = (process.env.SHARP_API_KEY || '').trim();

  if (!oddsApiKey && !sharpApiKey) {
    console.warn("[OddsProcessor] No odds API keys (THE_ODDS_API_KEY, ODDS_API_KEY, SHARP_API_KEY) are set. Skipping tennis odds sync.");
    return { success: false, error: 'No odds API keys configured (THE_ODDS_API_KEY, ODDS_API_KEY, or SHARP_API_KEY missing).' };
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

    const scraperSnap = await adminDb.collection('systemSettings').doc('scraper').get();
    let threshold = 300;
    if (scraperSnap.exists) {
       const scraperConfig = scraperSnap.data();
       threshold = Math.abs(scraperConfig.maxMoneylineOdds ?? 300);
       if (scraperConfig.sportOverrides && scraperConfig.sportOverrides['ATP'] !== undefined) {
          threshold = Math.abs(scraperConfig.sportOverrides['ATP']);
       }
    }

    const dbMatchups: any[] = matchupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    let updatedCount = 0;
    const batch = adminDb.batch();
    let batchCount = 0;
    const matchedIds = new Set<string>();
    let fetchedAnyOddsSuccessfully = false;

    // 1. Try SharpAPI first (Secondary odds provider)
    if (sharpApiKey) {
      for (const leagueSlug of ['atp', 'wta']) {
        try {
          const res = await fetch(`https://api.sharpapi.io/api/v1/odds?league=${leagueSlug}`, {
            headers: { 'X-API-Key': sharpApiKey }
          });
          if (!res.ok) {
            console.warn(`[OddsProcessor] SharpAPI returned HTTP ${res.status} for tennis league ${leagueSlug}`);
            continue;
          }
          fetchedAnyOddsSuccessfully = true;
          const json: any = await res.json();
          const events = json.data || json || [];

          for (const item of events) {
            const homeName = item.home_team?.name || item.home_team || '';
            const awayName = item.away_team?.name || item.away_team || '';
            const markets = item.markets || [];
            const mlMarket = markets.find((m: any) =>
              (m.market_type === 'moneyline' || m.market_type === 'h2h' || m.market === 'moneyline' || m.market === 'h2h') &&
              !String(m.market_name || m.name || '').toLowerCase().includes('set')
            );
            if (!mlMarket?.lines?.length) continue;

            const homeMlObj = mlMarket.lines.find((l: any) => l.is_home || teamsMatch(l.team_name, homeName, true));
            const awayMlObj = mlMarket.lines.find((l: any) => !l.is_home || teamsMatch(l.team_name, awayName, true));
            if (!homeMlObj?.odds || !awayMlObj?.odds) continue;

            const mlHome = parseInt(homeMlObj.odds, 10);
            const mlAway = parseInt(awayMlObj.odds, 10);
            let isSwapped = false;

            const match = dbMatchups.find((m: any) => {
              if (matchedIds.has(m.id)) return false;
              if (!m.homeTeam?.name || !m.awayTeam?.name) return false;
              const espnHome = m.homeTeam.name;
              const espnAway = m.awayTeam.name;
              if (teamsMatch(espnHome, homeName, true) && teamsMatch(espnAway, awayName, true)) { isSwapped = false; return true; }
              if (teamsMatch(espnHome, awayName, true) && teamsMatch(espnAway, homeName, true)) { isSwapped = true; return true; }
              if (namesMatch(espnHome, homeName) && namesMatch(espnAway, awayName)) { isSwapped = false; return true; }
              if (namesMatch(espnHome, awayName) && namesMatch(espnAway, homeName)) { isSwapped = true; return true; }
              return false;
            });

            if (match) {
              matchedIds.add(match.id);
              let finalMlHome = isSwapped ? mlAway : mlHome;
              let finalMlAway = isSwapped ? mlHome : mlAway;

              const matchRef = adminDb.collection('matchups').doc(match.id);
              let active = true;
              if (isNaN(finalMlHome) || isNaN(finalMlAway)) {
                active = false;
              } else {
                if (finalMlHome <= -threshold || finalMlHome >= threshold) active = false;
                if (finalMlAway <= -threshold || finalMlAway >= threshold) active = false;
              }

              let abandoned = active ? false : (match.abandoned || false);
              if (!active) {
                const hasPicks = await checkMatchupHasPicks(adminDb, match);
                if (hasPicks || match.manuallyActivated) { active = true; abandoned = false; }
                else { abandoned = true; }
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
              if (batchCount === 490) { await batch.commit(); batchCount = 0; }
            }
          }
        } catch (err) {
          console.warn(`[OddsProcessor] SharpAPI fetch failed for ${leagueSlug}:`, err);
        }
      }
    }

    // 2. Try The-Odds-API second for any unmatched tennis games (Tertiary odds provider)
    if (oddsApiKey && matchedIds.size < dbMatchups.length) {
      const sportsRes = await fetch(`https://api.the-odds-api.com/v4/sports/?apiKey=${oddsApiKey}`);
      if (sportsRes.ok) {
        const sportsData: any = await sportsRes.json();
        const tennisSports = sportsData
          .filter((s: any) => s.key && (s.key.startsWith('tennis_atp') || s.key.startsWith('tennis_wta')))
          .map((s: any) => s.key);

        for (const sport of tennisSports) {
           const oddsRes = await fetch(`https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${oddsApiKey}&regions=us&markets=h2h&oddsFormat=american`);
           if (!oddsRes.ok) {
             console.warn(`[OddsProcessor] The-Odds-API returned HTTP ${oddsRes.status} for tennis sport ${sport}`);
             continue;
           }
           fetchedAnyOddsSuccessfully = true;
           const oddsData: any = await oddsRes.json();

           for (const event of oddsData) {
             const homeTeamName = event.home_team;
             const awayTeamName = event.away_team;
             const bookmaker = event.bookmakers?.find((b: any) => b.key === 'draftkings' || b.key === 'fanduel') || event.bookmakers?.[0];
             if (!bookmaker) continue;

             const h2hMarket = bookmaker.markets?.find((m: any) => m.key === 'h2h');
             if (!h2hMarket || !h2hMarket.outcomes) continue;

             const homeOutcome = h2hMarket.outcomes.find((o: any) => o.name === homeTeamName || teamsMatch(homeTeamName, o.name, true));
             const awayOutcome = h2hMarket.outcomes.find((o: any) => o.name === awayTeamName || teamsMatch(awayTeamName, o.name, true));

             if (!homeOutcome || !awayOutcome) continue;

             const mlHome = homeOutcome.price;
             const mlAway = awayOutcome.price;
             let isSwapped = false;

             const match = dbMatchups.find((m: any) => {
                if (matchedIds.has(m.id)) return false;
                if (!m.homeTeam?.name || !m.awayTeam?.name) return false;
                const espnHome = m.homeTeam.name;
                const espnAway = m.awayTeam.name;
                if (teamsMatch(espnHome, homeTeamName, true) && teamsMatch(espnAway, awayTeamName, true)) { isSwapped = false; return true; }
                if (teamsMatch(espnHome, awayTeamName, true) && teamsMatch(espnAway, homeTeamName, true)) { isSwapped = true; return true; }
                if (namesMatch(espnHome, homeTeamName) && namesMatch(espnAway, awayTeamName)) { isSwapped = false; return true; }
                if (namesMatch(espnHome, awayTeamName) && namesMatch(espnAway, homeTeamName)) { isSwapped = true; return true; }
                return false;
             });

             if (match) {
                matchedIds.add(match.id);
                let finalMlHome = isSwapped ? mlAway : mlHome;
                let finalMlAway = isSwapped ? mlHome : mlAway;

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

                let abandoned = active ? false : (match.abandoned || false);
                if (!active) {
                    const hasPicks = await checkMatchupHasPicks(adminDb, match);
                    if (hasPicks || match.manuallyActivated) { active = true; abandoned = false; }
                    else { abandoned = true; }
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
                if (batchCount === 490) { await batch.commit(); batchCount = 0; }
             }
           }
        }
      } else {
        console.warn(`[OddsProcessor] The-Odds-API sports list returned HTTP ${sportsRes.status}`);
      }
    }
    
    if (!fetchedAnyOddsSuccessfully) {
       console.warn("[OddsProcessor] Could not fetch odds for any tennis sport from external providers.");
       return { success: false, error: 'Could not fetch odds for any tennis sport' };
    }

    // Mark any unmatched ATP/WTA matchups as inactive and abandoned if no picks exist
    for (const match of dbMatchups as any[]) {
       if (!matchedIds.has(match.id) && !match.abandoned) {
           const hasPicks = await checkMatchupHasPicks(adminDb, match);
           if (hasPicks || match.manuallyActivated) {
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
    logServerError('OddsProcessor Tennis Sync', err);
    return { success: false, error: err.message };
  }
}

export async function syncSoccerOdds() {
  const adminDb = getAdminDb();
  if (!adminDb) return { success: false, error: 'No admin db' };

  const oddsApiKey = (process.env.THE_ODDS_API_KEY || process.env.ODDS_API_KEY || '').trim();
  const sharpApiKey = (process.env.SHARP_API_KEY || '').trim();

  if (!oddsApiKey && !sharpApiKey) {
    console.warn("[OddsProcessor] No odds API keys (THE_ODDS_API_KEY, ODDS_API_KEY, SHARP_API_KEY) are set. Skipping soccer odds sync.");
    return { success: false, error: 'No odds API keys configured (THE_ODDS_API_KEY, ODDS_API_KEY, or SHARP_API_KEY missing).' };
  }

  const leaguesToSync = [
    { espn: 'RPL', oddsApi: 'soccer_russia_premier_league', sharpApi: 'rpl' },
    { espn: 'TUR', oddsApi: 'soccer_turkey_super_league', sharpApi: 'tur' },
    { espn: 'ARG', oddsApi: 'soccer_argentina_primera_division', sharpApi: 'arg' },
    { espn: 'BRA', oddsApi: 'soccer_brazil_campeonato', sharpApi: 'bra' },
    { espn: 'LMX', oddsApi: 'soccer_mexico_ligamx', sharpApi: 'lmx' },
    { espn: 'FRA', oddsApi: 'soccer_france_ligue_one', sharpApi: 'fra' },
    { espn: 'EPL', oddsApi: 'soccer_epl', sharpApi: 'epl' },
    { espn: 'MLS', oddsApi: 'soccer_usa_mls', sharpApi: 'mls' },
    { espn: 'NWSL', oddsApi: 'soccer_usa_nwsl', sharpApi: 'nwsl' }
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

        const batch = adminDb.batch();
        let batchCount = 0;
        const matchedIds = new Set();
        let fetchedAnyOddsForLeague = false;

        // 1. Try SharpAPI first if key available (Secondary odds provider)
        if (sharpApiKey) {
          try {
            const sharpRes = await fetch(`https://api.sharpapi.io/api/v1/odds?league=${l.sharpApi || l.espn.toLowerCase()}`, {
              headers: { 'X-API-Key': sharpApiKey }
            });
            if (!sharpRes.ok) {
              console.warn(`[OddsProcessor] SharpAPI returned HTTP ${sharpRes.status} for soccer league ${l.espn}`);
            } else {
              fetchedAnyOddsForLeague = true;
              const json: any = await sharpRes.json();
              const sharpEvents = json.data || json || [];

              for (const item of sharpEvents) {
                const homeName = item.home_team?.name || item.home_team || '';
                const awayName = item.away_team?.name || item.away_team || '';
                const markets = item.markets || [];
                const mlMarket = markets.find((m: any) =>
                  (m.market_type === 'moneyline' || m.market_type === 'h2h' || m.market === 'moneyline' || m.market === 'h2h')
                );
                if (!mlMarket?.lines?.length) continue;

                const homeMlObj = mlMarket.lines.find((line: any) => line.is_home || teamsMatch(line.team_name, homeName));
                const awayMlObj = mlMarket.lines.find((line: any) => !line.is_home || teamsMatch(line.team_name, awayName));
                if (!homeMlObj?.odds || !awayMlObj?.odds) continue;

                const mlHome = parseInt(homeMlObj.odds, 10);
                const mlAway = parseInt(awayMlObj.odds, 10);

                const match = dbMatchups.find((m: any) => {
                  if (matchedIds.has(m.id)) return false;
                  if (!m.homeTeam?.name || !m.awayTeam?.name) return false;
                  const espnHome = m.homeTeam.name;
                  const espnAway = m.awayTeam.name;
                  if (teamsMatch(espnHome, homeName) && teamsMatch(espnAway, awayName)) return true;
                  if (teamsMatch(espnHome, awayName) && teamsMatch(espnAway, homeName)) return true;
                  if (namesMatch(espnHome, homeName) && namesMatch(espnAway, awayName)) return true;
                  if (namesMatch(espnHome, awayName) && namesMatch(espnAway, homeName)) return true;
                  return false;
                });

                if (match) {
                  matchedIds.add(match.id);
                  let finalMlHome = mlHome;
                  let finalMlAway = mlAway;
                  if ((teamsMatch((match as any).homeTeam.name, awayName) && teamsMatch((match as any).awayTeam.name, homeName)) ||
                      (namesMatch((match as any).homeTeam.name, awayName) && namesMatch((match as any).awayTeam.name, homeName))) {
                      finalMlHome = mlAway;
                      finalMlAway = mlHome;
                  }

                  const matchRef = adminDb.collection('matchups').doc(match.id);
                  let active = true;
                  if (isNaN(finalMlHome) || isNaN(finalMlAway)) {
                      active = false;
                  } else {
                      if (finalMlHome <= -threshold || finalMlHome >= threshold) active = false;
                      if (finalMlAway <= -threshold || finalMlAway >= threshold) active = false;
                  }

                  let abandoned = active ? false : (match.abandoned || false);
                  if (!active) {
                      const hasPicks = await checkMatchupHasPicks(adminDb, match);
                      if (hasPicks || (match as any).manuallyActivated) {
                          active = true;
                          abandoned = false;
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
                  totalUpdated++;
                  batchCount++;

                  if (batchCount === 490) {
                     await batch.commit();
                     batchCount = 0;
                  }
                }
              }
            }
          } catch (err) {
            console.warn(`[OddsProcessor] Sharp API fetch failed for ${l.espn}:`, err);
          }
        }

        // 2. Try The-Odds-API second for unmatched matches or if SharpAPI failed (Tertiary odds provider)
        if (oddsApiKey && matchedIds.size < dbMatchups.length) {
          try {
            const oddsRes = await fetch(`https://api.the-odds-api.com/v4/sports/${l.oddsApi}/odds/?apiKey=${oddsApiKey}&regions=us&markets=h2h&oddsFormat=american`);
            if (!oddsRes.ok) {
              console.warn(`[OddsProcessor] The-Odds-API returned HTTP ${oddsRes.status} for soccer league ${l.espn}`);
            } else {
              fetchedAnyOddsForLeague = true;
              const oddsData: any[] = (await oddsRes.json()) as any[];

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
                    if (matchedIds.has(m.id)) return false;
                    if (!m.homeTeam?.name || !m.awayTeam?.name) return false;
                    const espnHome = m.homeTeam.name;
                    const espnAway = m.awayTeam.name;
                    if (teamsMatch(espnHome, homeTeamName) && teamsMatch(espnAway, awayTeamName)) return true;
                    if (teamsMatch(espnHome, awayTeamName) && teamsMatch(espnAway, homeTeamName)) return true;
                    if (namesMatch(espnHome, homeTeamName) && namesMatch(espnAway, awayTeamName)) return true;
                    if (namesMatch(espnHome, awayTeamName) && namesMatch(espnAway, homeTeamName)) return true;
                    return false;
                 });

                 if (match) {
                    matchedIds.add(match.id);
                    let finalMlHome = mlHome;
                    let finalMlAway = mlAway;
                    if ((teamsMatch((match as any).homeTeam.name, awayTeamName) && teamsMatch((match as any).awayTeam.name, homeTeamName)) ||
                        (namesMatch((match as any).homeTeam.name, awayTeamName) && namesMatch((match as any).awayTeam.name, homeTeamName))) {
                        finalMlHome = mlAway;
                        finalMlAway = mlHome;
                    }
                    const matchRef = adminDb.collection('matchups').doc(match.id);
                    const finalMlHomeNum = parseInt(finalMlHome, 10);
                    const finalMlAwayNum = parseInt(finalMlAway, 10);
                    let active = true;
                    if (isNaN(finalMlHomeNum) || isNaN(finalMlAwayNum)) {
                        active = false;
                    } else {
                        if (!isNaN(finalMlHomeNum) && (finalMlHomeNum <= -threshold || finalMlHomeNum >= threshold)) active = false;
                        if (!isNaN(finalMlAwayNum) && (finalMlAwayNum <= -threshold || finalMlAwayNum >= threshold)) active = false;
                    }

                    let abandoned = active ? false : (match.abandoned || false);
                    if (!active) {
                        const hasPicks = await checkMatchupHasPicks(adminDb, match);
                        if (hasPicks || (match as any).manuallyActivated) {
                            active = true;
                            abandoned = false;
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
                    totalUpdated++;
                    batchCount++;

                    if (batchCount === 490) {
                       await batch.commit();
                       batchCount = 0;
                    }
                 }
              }
            }
          } catch (err) {
            console.warn(`[OddsProcessor] Odds API fetch failed for ${l.espn}:`, err);
          }
        }

        if (fetchedAnyOddsForLeague) {
          for (const match of dbMatchups) {
             if (!matchedIds.has(match.id)) {
                 const hasPicks = await checkMatchupHasPicks(adminDb, match);
                 if (hasPicks || (match as any).manuallyActivated) continue;
                 const matchRef = adminDb.collection('matchups').doc(match.id);
                 batch.update(matchRef, { 'active': false, 'abandoned': true, 'updatedAt': Date.now() });
                 batchCount++;
                 if (batchCount === 490) { await batch.commit(); batchCount = 0; }
             }
          }
        }
           
        if (batchCount > 0) await batch.commit();
    }
    
    return { success: true, updated: totalUpdated };
  } catch (err: any) {
    console.error('Error syncing soccer odds', err);
    logServerError('OddsProcessor Soccer Sync', err);
    return { success: false, error: err.message };
  }
}
