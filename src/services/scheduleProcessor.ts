import { adminDb } from '../lib/firebase-admin.js';
import { gradeMatchups } from './grader.js';
import { gradePickemMatchups } from './pickemGrader.js';
import { gradeLink4Matchups, processCompletedLink4Segments } from './link4Grader.js';
import { League, LeagueResponse, scrapeLeagueSchedules } from './espnScraper.js';

export { scrapeLeagueSchedules } from './espnScraper.js';
import { gradeBrackets } from './bracketGrader.js';

export async function syncLeagueSchedules(league: League, scoreboardOnly: boolean = false, specificDates?: string[]): Promise<LeagueResponse> {
  let scraperConfig: { maxMoneylineOdds?: number, sportOverrides?: Record<string, number> } | undefined = undefined;
  if (adminDb) {
    try {
      const scraperSnap = await adminDb.collection('systemSettings').doc('scraper').get();
      if (scraperSnap.exists) {
        scraperConfig = scraperSnap.data() as { maxMoneylineOdds?: number, sportOverrides?: Record<string, number> };
      }
    } catch (e) {
      console.error("Error fetching scraper config", e);
    }
  }

  const response = await scrapeLeagueSchedules(league, scoreboardOnly, scraperConfig, specificDates);

  if (response.data && response.data.length > 0 && adminDb) {
    try {
      const leagueSettingsSnap = await adminDb.collection('leagueSettings').doc(league).get();
      let defaultActive = true;
      if (leagueSettingsSnap.exists) {
        const settings = leagueSettingsSnap.data();
        if (settings && typeof settings.active === 'boolean') {
          defaultActive = settings.active;
        }
      }

      // Gather bracket match IDs to force activity
      const bracketMatchIds = new Set<string>();
      try {
        const bracketsSnap = await adminDb.collection('brackets').where('status', 'in', ['OPEN', 'LOCKED', 'ACTIVE']).get();
        for (const doc of bracketsSnap.docs) {
          const bData = doc.data();
          if (bData.matchIds) {
            Object.values(bData.matchIds).forEach(id => {
               if (id) bracketMatchIds.add(String(id));
            });
          }
        }
      } catch (err) {
        console.error("Error fetching bracket match IDs", err);
      }

      const existingMap = new Map<string, any>();
      const gameIds = response.data.map(m => m.gameId).filter(id => id);

      // Batch fetch existing matchups using 'in' query (max 30 per chunk)
      if (gameIds.length > 0) {
        const matchupsRef = adminDb.collection('matchups');
        for (let i = 0; i < gameIds.length; i += 30) {
          const chunk = gameIds.slice(i, i + 30);
          const chunkSnap = await matchupsRef.where('gameId', 'in', chunk).get();
          chunkSnap.docs.forEach(d => {
            if (d.data().league === league) {
              existingMap.set(d.data().gameId, d);
            }
          });
        }
      } else if (league === 'PGA') {
        // PGA scraped data doesn't have gameIds, so we need to fetch all active PGA matchups recently scheduled
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const pgaSnap = await adminDb.collection('matchups')
          .where('league', '==', 'PGA')
          .where('active', '==', true)
          .get();

        pgaSnap.docs.forEach(d => {
          const data = d.data();
          if (data.startTime && data.startTime > sevenDaysAgo && !data.abandoned) {
             existingMap.set(data.gameId, d);
          }
        });
      }

      let batch = adminDb.batch();
      let opCount = 0;
      let newCount = 0;
      let updateCount = 0;
      const matchupsToGrade: any[] = [];
      const matchupsToSyncToPickem: any[] = [];
      const scrapedGameIds = new Set<string>();

      let fifaBracketUpdates: Record<string, { oldHome: string, newHome: string, oldAway: string, newAway: string }> = {};

      for (const scrapedMatchup of response.data) {
        if (scrapedMatchup.isRawPGAData) {
          const competitors = scrapedMatchup.competition.competitors || [];

          for (const [existingGameId, doc] of existingMap.entries()) {
            const data = doc.data();
            if (data.league !== 'PGA' || data.abandoned) continue;

            const homeGolferId = data.homeTeam?.id;
            const awayGolferId = data.awayTeam?.id;

            const homeComp = competitors.find((c: any) => String(c.id) === homeGolferId);
            const awayComp = competitors.find((c: any) => String(c.id) === awayGolferId);

            if (homeComp && awayComp) {
              const period = data.metadata?.period || 1;
              const holes = data.metadata?.holes || 18;
              const isRoundScore = data.metadata?.matchupType === 'ROUND_SCORE';
              const isThruHolesMatchup = ['THRU_HOLES', 'BIRDIES_THRU_HOLES', 'EAGLES_THRU_HOLES', 'PARS_THRU_HOLES', 'BOGEYS_THRU_HOLES'].includes(data.metadata?.matchupType);
              const matchupType = data.metadata?.matchupType;

              let homeScore = 0;
              let awayScore = 0;

              let homeFinal = false;
              let awayFinal = false;
              let homeStarted = false;
              let awayStarted = false;

              let homeFrozenScore = data.metadata?.homeFinalScore;
              let awayFrozenScore = data.metadata?.awayFinalScore;

              const parseGolfScore = (val: any) => {
                 if (val === null || val === undefined) return 0;
                 const strVal = String(val).toUpperCase();
                 if (strVal === 'E' || strVal === 'EVEN' || strVal === 'WD' || strVal === 'MC') return 0;
                 const parsed = parseFloat(strVal);
                 return isNaN(parsed) ? 0 : parsed;
              };

              const parseGolfStatCount = (lsHoles: any[], targetHoles: number, statType: string) => {
                 if (!lsHoles || lsHoles.length === 0) return 0;
                 let count = 0;
                 let holesProcessed = 0;
                 for (const h of lsHoles) {
                    if (holesProcessed >= targetHoles) break;
                    if (h && h.scoreType && h.scoreType.displayValue) {
                        const val = h.scoreType.displayValue;
                        if (statType === 'BIRDIES_THRU_HOLES') {
                            if (val === '-1' || val === '-2' || val === '-3') count++; // Birdie or better
                        } else if (statType === 'EAGLES_THRU_HOLES') {
                            if (val === '-2' || val === '-3') count++; // Eagle or better
                        } else if (statType === 'PARS_THRU_HOLES') {
                            if (val === 'E') count++; // Pars
                        } else if (statType === 'BOGEYS_THRU_HOLES') {
                            if (val === '+1' || val === '+2' || val === '+3' || val === '+4') count++; // Bogey or worse
                        }
                    }
                    holesProcessed++;
                 }
                 return count;
              };

              const isTournamentPost = scrapedMatchup.competition?.status?.type?.name === 'STATUS_FINAL' || scrapedMatchup.competition?.status?.type?.completed === true;
              const isHomeWD = homeComp?.status?.type?.name === 'STATUS_WITHDRAWN' || homeComp?.status?.type?.name === 'STATUS_CUT' || homeComp?.status?.type?.name === 'STATUS_DQ';
              const isAwayWD = awayComp?.status?.type?.name === 'STATUS_WITHDRAWN' || awayComp?.status?.type?.name === 'STATUS_CUT' || awayComp?.status?.type?.name === 'STATUS_DQ';

              if (isRoundScore || isThruHolesMatchup) {
                 const homeLs = homeComp.linescores?.find((ls: any) => ls.period === period);
                 const awayLs = awayComp.linescores?.find((ls: any) => ls.period === period);

                 if (isThruHolesMatchup && matchupType !== 'THRU_HOLES') {
                     homeScore = homeLs ? parseGolfStatCount(homeLs.holes, holes, matchupType) : 0;
                     awayScore = awayLs ? parseGolfStatCount(awayLs.holes, holes, matchupType) : 0;
                 } else {
                     homeScore = homeLs ? parseGolfScore(homeLs.displayValue || homeLs.value) : 0;
                     awayScore = awayLs ? parseGolfScore(awayLs.displayValue || awayLs.value) : 0;
                 }

                 const now = Date.now();

                 const hasHomeHoles = homeLs?.holes && homeLs.holes.length > 0;
                 const isHomeRoundIn = homeComp.status?.period === period && homeComp.status?.type?.state === 'in';
                 homeStarted = hasHomeHoles || isHomeRoundIn;

                 const hasAwayHoles = awayLs?.holes && awayLs.holes.length > 0;
                 const isAwayRoundIn = awayComp.status?.period === period && awayComp.status?.type?.state === 'in';
                 awayStarted = hasAwayHoles || isAwayRoundIn;

                 // If the whole tournament is post or they have finished their specific round
                 // Note: ESPN doesn't always cleanly mark individual rounds as 'post', so we rely on teeTimes and general status if needed
                 // But typically if they are on a later round, the previous round is final.
                 const currentRound = homeComp.status?.period || 1;
                 const isHomeRoundDone = isTournamentPost || isHomeWD || (currentRound === period && homeComp.status?.type?.state === 'post') || currentRound > period || (currentRound === period && homeComp.status?.type?.completed);

                 const awayCurrentRound = awayComp.status?.period || 1;
                 const isAwayRoundDone = isTournamentPost || isAwayWD || (awayCurrentRound === period && awayComp.status?.type?.state === 'post') || awayCurrentRound > period || (awayCurrentRound === period && awayComp.status?.type?.completed);

                 if (isThruHolesMatchup) {
                    if (isHomeRoundDone || (currentRound === period && (homeComp.status?.thru || 0) >= holes)) {
                        homeFinal = true;
                    }
                    if (isAwayRoundDone || (awayCurrentRound === period && (awayComp.status?.thru || 0) >= holes)) {
                        awayFinal = true;
                    }
                 } else {
                    homeFinal = isHomeRoundDone;
                    awayFinal = isAwayRoundDone;
                 }

              } else {
                 homeScore = parseGolfScore(homeComp.score?.displayValue || homeComp.score?.value || homeComp.score);
                 awayScore = parseGolfScore(awayComp.score?.displayValue || awayComp.score?.value || awayComp.score);

                 if (isTournamentPost || isHomeWD) homeFinal = true;
                 if (isTournamentPost || isAwayWD) awayFinal = true;

                 if (homeComp.status?.type?.state === 'in' || homeFinal) homeStarted = true;
                 if (awayComp.status?.type?.state === 'in' || awayFinal) awayStarted = true;
              }

              if (homeFrozenScore !== undefined) {
                 homeScore = homeFrozenScore;
                 homeFinal = true;
              } else if (isThruHolesMatchup && homeFinal) {
                 homeFrozenScore = homeScore;
              }

              if (awayFrozenScore !== undefined) {
                 awayScore = awayFrozenScore;
                 awayFinal = true;
              } else if (isThruHolesMatchup && awayFinal) {
                 awayFrozenScore = awayScore;
              }

              let newStatus = data.status;
              let newActive = data.active;
              let newAbandoned = data.abandoned;

              if (homeFinal && awayFinal) {
                newStatus = 'STATUS_FINAL';
              } else if (homeStarted || awayStarted) {
                newStatus = 'STATUS_IN_PROGRESS';
              }

              let currentThruDesc = 'In Progress';
              if (newStatus === 'STATUS_IN_PROGRESS') {
                const homeThru = homeComp.status?.thru || 0;
                const awayThru = awayComp.status?.thru || 0;
                let minThru = 0;

                if (homeThru > 0 && awayThru > 0) {
                  minThru = Math.min(homeThru, awayThru);
                } else if (homeThru > 0) {
                  minThru = homeThru;
                } else if (awayThru > 0) {
                  minThru = awayThru;
                }

                if (minThru > 0) {
                  currentThruDesc = `THRU ${minThru}`;
                } else if (data.startTime && Date.now() > data.startTime + 15 * 60 * 1000) {
                  currentThruDesc = 'Delayed';
                }
              }

              let isMetadataChanged = false;
              if (isThruHolesMatchup) {
                  if (homeFrozenScore !== data.metadata?.homeFinalScore || awayFrozenScore !== data.metadata?.awayFinalScore) {
                      isMetadataChanged = true;
                  }
              }

              const needsUpdate = data.status !== newStatus ||
                  data.statusDesc !== (newStatus === 'STATUS_FINAL' ? 'Final' : newStatus === 'STATUS_IN_PROGRESS' ? currentThruDesc : 'Upcoming') ||
                  data.homeTeam?.score !== homeScore ||
                  data.awayTeam?.score !== awayScore ||
                  data.active !== newActive ||
                  data.abandoned !== newAbandoned ||
                  isMetadataChanged;

              if (needsUpdate) {
                const updateData: any = {
                  ...data,
                  status: newStatus,
                  statusDesc: newStatus === 'STATUS_FINAL' ? 'Final' : newStatus === 'STATUS_IN_PROGRESS' ? currentThruDesc : 'Upcoming',
                  active: newActive,
                  abandoned: newAbandoned,
                  homeTeam: {
                      ...data.homeTeam,
                      score: homeScore
                  },
                  awayTeam: {
                      ...data.awayTeam,
                      score: awayScore
                  },
                  metadata: {
                      ...(data.metadata || {})
                  },
                  updatedAt: Date.now()
                };

                if (isThruHolesMatchup) {
                    if (homeFrozenScore !== undefined) updateData.metadata.homeFinalScore = homeFrozenScore;
                    if (awayFrozenScore !== undefined) updateData.metadata.awayFinalScore = awayFrozenScore;
                }

                const flattenedUpdate: any = {
                  active: updateData.active,
                  status: updateData.status,
                  statusDesc: updateData.statusDesc,
                  'homeTeam.score': updateData.homeTeam.score,
                  'awayTeam.score': updateData.awayTeam.score,
                  updatedAt: updateData.updatedAt
                };
                if (updateData.abandoned !== undefined) {
                    flattenedUpdate.abandoned = updateData.abandoned;
                }

                if (data.status === 'STATUS_SCHEDULED' && (newStatus === 'STATUS_IN_PROGRESS' || newStatus === 'STATUS_FINAL' || newStatus === 'STATUS_POSTPONED')) {
                  const pendingPicksSnap = await adminDb.collection('picks')
                    .where('matchupId', '==', existingGameId)
                    .where('status', '==', 'PENDING')
                    .get();

                  const pendingPickemPicksSnap = await adminDb.collection('pickemPicks')
                    .where('matchupId', '==', existingGameId)
                    .where('status', '==', 'PENDING')
                    .limit(1)
                    .get();

                  if (pendingPicksSnap.empty && pendingPickemPicksSnap.empty) {
                    updateData.abandoned = true;
                    updateData.active = false;
                    flattenedUpdate.abandoned = true;
                    flattenedUpdate.active = false;
                  }
                }

                if (isThruHolesMatchup) {
                    if (homeFrozenScore !== undefined) flattenedUpdate['metadata.homeFinalScore'] = homeFrozenScore;
                    if (awayFrozenScore !== undefined) flattenedUpdate['metadata.awayFinalScore'] = awayFrozenScore;
                }

                Object.keys(flattenedUpdate).forEach(key => flattenedUpdate[key] === undefined && delete flattenedUpdate[key]);

                batch.update(doc.ref, flattenedUpdate);
                opCount++;
                updateCount++;

                if (newStatus === 'STATUS_FINAL' && data.status !== 'STATUS_FINAL') {
                  matchupsToGrade.push({ ...data, ...updateData, id: existingGameId, gameId: existingGameId });
                }

                matchupsToSyncToPickem.push({ ...data, ...updateData, id: existingGameId, gameId: existingGameId });

                if (opCount >= 500) {
                  await batch.commit();
                  batch = adminDb.batch();
                  opCount = 0;
                }
              } else if (data.status === 'STATUS_FINAL' || data.status === 'STATUS_POSTPONED') {
                matchupsToSyncToPickem.push({ ...data, id: existingGameId, gameId: existingGameId });
              }
            }
          }
          continue;
        }

        const gameId = scrapedMatchup.gameId;
        scrapedGameIds.add(gameId);
        const existingDoc = existingMap.get(gameId);

        if (existingDoc) {
          const existingData = existingDoc.data();

          if (existingData.abandoned && scrapedMatchup.league !== 'ATP' && scrapedMatchup.league !== 'WTA' && scrapedMatchup.league !== 'CRICKET') {
            if (existingData.status !== 'STATUS_SCHEDULED') {
              continue;
            }
          }

          const newTitle = existingData.hasCustomTitle ? existingData.title : scrapedMatchup.title;

          let homeScore = existingData.type === 'STATS' ? (existingData.homeTeam?.score ?? 0) : (scrapedMatchup.homeTeam?.score ?? existingData.homeTeam?.score ?? 0);
          let awayScore = existingData.type === 'STATS' ? (existingData.awayTeam?.score ?? 0) : (scrapedMatchup.awayTeam?.score ?? existingData.awayTeam?.score ?? 0);
          let newStatus = scrapedMatchup.status;
          let newStatusDesc = scrapedMatchup.statusDesc;

          if (existingData.type === 'STATS' && (league === 'NFL' || league === 'CFB')) {
              try {
                  const statCategory = existingData.metadata?.statCategory;
                  const statKey = existingData.metadata?.statKey;
                  if (statCategory && statKey) {
                      const sportStr = league === 'NFL' ? 'nfl' : 'college-football';
                      const summaryUrl = `https://site.api.espn.com/apis/site/v2/sports/football/${sportStr}/summary?event=${existingData.gameId}`;
                      const summaryRes = await fetch(summaryUrl);
                      const summaryData = await summaryRes.json();

                      // We also might want to update status if ESPN says the game is final.
                      const gameInfoStatus = summaryData.header?.competitions?.[0]?.status?.type?.name;
                      if (gameInfoStatus) {
                         // Simplify status mapping for STATS props
                         if (gameInfoStatus.includes('FINAL')) {
                             newStatus = 'STATUS_FINAL';
                             newStatusDesc = summaryData.header?.competitions?.[0]?.status?.type?.shortDetail || 'Final';
                         } else if (gameInfoStatus.includes('IN_PROGRESS') || gameInfoStatus === 'STATUS_HALFTIME') {
                             newStatus = 'STATUS_IN_PROGRESS';
                             newStatusDesc = summaryData.header?.competitions?.[0]?.status?.type?.shortDetail || 'In Progress';
                         }
                      }

                      if (existingData.metadata?.period) {
                          // Quarter-specific props are not supported currently because ESPN plays endpoint lacks participant IDs and relies on raw text parsing.
                          // Fallback to full game stats.
                      }

                      if (summaryData.boxscore && summaryData.boxscore.players) {

                          const homeId = existingData.homeTeam?.id;
                          const awayId = existingData.awayTeam?.id;

                          for (const p of summaryData.boxscore.players) {
                              const statsList = p.statistics?.find((s: any) => s.name === statCategory);
                              if (statsList) {
                                  const keyIndex = statsList.keys ? statsList.keys.indexOf(statKey) : -1;
                                  if (keyIndex !== -1 && statsList.athletes) {
                                      for (const a of statsList.athletes) {
                                          if (String(a.athlete?.id) === homeId) {
                                              const statVal = parseFloat(a.stats[keyIndex]);
                                              if (!isNaN(statVal)) homeScore = statVal;
                                          }
                                          if (String(a.athlete?.id) === awayId) {
                                              const statVal = parseFloat(a.stats[keyIndex]);
                                              if (!isNaN(statVal)) awayScore = statVal;
                                          }
                                      }
                                  }
                              }
                          }
                      }
                  }
              } catch (e) {
                  console.error('Error fetching/parsing STATS for matchup', existingData.gameId, e);
              }
          }

          let finalActive = existingData.active;

          if (!scoreboardOnly) {
            let scraperActive = scrapedMatchup.active;
            if (!scraperActive && existingData.type !== 'SCORE' && existingData.type !== undefined) {
              scraperActive = true;
            }

            // Only deactivate if scraper says it shouldn't be active (e.g. wild odds)
            // If it's already active, don't let defaultActive=false override it
            if (existingData.active && !scraperActive) {
              const picksSnap = await adminDb.collection('picks').where('matchupId', '==', gameId).limit(1).get();
              const pickemPicksSnap = await adminDb.collection('pickemPicks').where('matchupId', '==', gameId).limit(1).get();

              if (!picksSnap.empty || !pickemPicksSnap.empty) {
                finalActive = true;
              } else {
                finalActive = false;
              }
            }
          }

          const needsUpdate = existingData.status !== newStatus || existingData.statusDesc !== newStatusDesc ||
              existingData.startTime !== scrapedMatchup.startTime ||
              existingData.homeTeam?.score !== homeScore ||
              existingData.awayTeam?.score !== awayScore ||
              existingData.title !== newTitle ||
              existingData.league !== scrapedMatchup.league ||
              existingData.homeTeam?.name !== scrapedMatchup.homeTeam?.name ||
              existingData.homeTeam?.image !== scrapedMatchup.homeTeam?.image ||
              existingData.homeTeam?.id !== scrapedMatchup.homeTeam?.id ||
              existingData.awayTeam?.name !== scrapedMatchup.awayTeam?.name ||
              existingData.awayTeam?.image !== scrapedMatchup.awayTeam?.image ||
              existingData.awayTeam?.id !== scrapedMatchup.awayTeam?.id ||
              existingData.active !== finalActive ||
              existingData.abandoned !== false ||
              existingData.metadata?.overUnder !== scrapedMatchup.metadata?.overUnder ||
              existingData.metadata?.mlHome !== scrapedMatchup.metadata?.mlHome ||
              existingData.metadata?.mlAway !== scrapedMatchup.metadata?.mlAway ||
              JSON.stringify(existingData.metadata?.homeLinescores) !== JSON.stringify(scrapedMatchup.metadata?.homeLinescores) ||
              JSON.stringify(existingData.metadata?.awayLinescores) !== JSON.stringify(scrapedMatchup.metadata?.awayLinescores) ||
              (existingData.type !== 'SPREAD' && existingData.metadata?.spread !== scrapedMatchup.metadata?.spread);

          if (needsUpdate || existingDoc.id !== gameId) {
            const updateData: any = {
              ...existingData,
              abandoned: false,
              title: newTitle,
              league: scrapedMatchup.league,
              active: finalActive,
              status: newStatus,
              statusDesc: newStatusDesc,
              startTime: scrapedMatchup.startTime,
              homeTeam: {
                  ...(existingData.homeTeam || {}),
                  id: existingData.type === 'STATS' ? existingData.homeTeam?.id : (scrapedMatchup.homeTeam?.id || existingData.homeTeam?.id),
                  name: existingData.type === 'STATS' ? existingData.homeTeam?.name : (scrapedMatchup.homeTeam?.name || existingData.homeTeam?.name),
                  image: existingData.type === 'STATS' ? existingData.homeTeam?.image : (scrapedMatchup.homeTeam?.image || existingData.homeTeam?.image),
                  score: homeScore
              },
              awayTeam: {
                  ...(existingData.awayTeam || {}),
                  id: existingData.type === 'STATS' ? existingData.awayTeam?.id : (scrapedMatchup.awayTeam?.id || existingData.awayTeam?.id),
                  name: existingData.type === 'STATS' ? existingData.awayTeam?.name : (scrapedMatchup.awayTeam?.name || existingData.awayTeam?.name),
                  image: existingData.type === 'STATS' ? existingData.awayTeam?.image : (scrapedMatchup.awayTeam?.image || existingData.awayTeam?.image),
                  score: awayScore
              },
              metadata: {
                  ...(existingData.metadata || {}),
                  overUnder: scrapedMatchup.metadata?.overUnder,
                  mlHome: scrapedMatchup.metadata?.mlHome,
                  mlAway: scrapedMatchup.metadata?.mlAway,
                  spread: existingData.type === 'SPREAD' ? existingData.metadata?.spread : scrapedMatchup.metadata?.spread,
                  homeLinescores: scrapedMatchup.metadata?.homeLinescores,
                  awayLinescores: scrapedMatchup.metadata?.awayLinescores,
                  network: scrapedMatchup.metadata?.network
              },
              updatedAt: Date.now()
            };

            // Flatten update properties specifically for batch.update when NOT migrating
            const flattenedUpdate: any = {
              abandoned: updateData.abandoned,
              title: updateData.title,
              league: updateData.league,
              active: updateData.active,
              status: updateData.status,
              statusDesc: updateData.statusDesc,
              startTime: updateData.startTime,
              'homeTeam.id': updateData.homeTeam.id,
              'homeTeam.name': updateData.homeTeam.name,
              'homeTeam.image': updateData.homeTeam.image,
              'homeTeam.score': updateData.homeTeam.score,
              'awayTeam.id': updateData.awayTeam.id,
              'awayTeam.name': updateData.awayTeam.name,
              'awayTeam.image': updateData.awayTeam.image,
              'awayTeam.score': updateData.awayTeam.score,
              'metadata.overUnder': updateData.metadata.overUnder,
              'metadata.mlHome': updateData.metadata.mlHome,
              'metadata.mlAway': updateData.metadata.mlAway,
              'metadata.spread': updateData.metadata.spread,
              'metadata.homeLinescores': updateData.metadata.homeLinescores,
              'metadata.awayLinescores': updateData.metadata.awayLinescores,
              'metadata.network': updateData.metadata.network,
              updatedAt: updateData.updatedAt
            };

            if (scrapedMatchup.league === 'FIFA') {
               const oldHomeName = existingData.homeTeam?.name;
               const newHomeName = scrapedMatchup.homeTeam?.name;
               const oldAwayName = existingData.awayTeam?.name;
               const newAwayName = scrapedMatchup.awayTeam?.name;

               if ((oldHomeName && newHomeName && oldHomeName !== newHomeName) ||
                   (oldAwayName && newAwayName && oldAwayName !== newAwayName)) {
                   fifaBracketUpdates[gameId] = {
                       oldHome: oldHomeName,
                       newHome: newHomeName,
                       oldAway: oldAwayName,
                       newAway: newAwayName
                   };
               }
            }

            Object.keys(flattenedUpdate).forEach(key => flattenedUpdate[key] === undefined && delete flattenedUpdate[key]);

            if (existingData.status === 'STATUS_SCHEDULED' &&
                (scrapedMatchup.status === 'STATUS_IN_PROGRESS' ||
                 scrapedMatchup.status === 'STATUS_FINAL' ||
                 scrapedMatchup.status === 'STATUS_POSTPONED')) {
              const pendingPicksSnap = await adminDb.collection('picks')
                .where('matchupId', '==', gameId)
                .where('status', '==', 'PENDING')
                .get();

              const pendingPickemPicksSnap = await adminDb.collection('pickemPicks')
                .where('matchupId', '==', gameId)
                .where('status', '==', 'PENDING')
                .limit(1)
                .get();

              let hasValidPicks = !pendingPicksSnap.empty || !pendingPickemPicksSnap.empty;

              if (!pendingPicksSnap.empty && (scrapedMatchup.status === 'STATUS_IN_PROGRESS' || scrapedMatchup.status === 'STATUS_FINAL')) {
                hasValidPicks = false; // We will prove there is a valid pick below
                for (const pickDoc of pendingPicksSnap.docs) {
                    const pickData = pickDoc.data();
                    const userPicksSnap = await adminDb.collection('picks').where('userId', '==', pickData.userId).where('status', '==', 'PENDING').orderBy('createdAt', 'asc').get();

                    const pickIndex = userPicksSnap.docs.findIndex(doc => doc.id === pickDoc.id);
                    if (pickIndex > 0) {
                        batch.delete(pickDoc.ref);
                        const userRef = adminDb.collection('users').doc(pickData.userId);
                        const userDoc = await userRef.get();
                        if (userDoc.exists && pickData.links > 0) {
                            const userData = userDoc.data()!;
                            batch.update(userRef, { links: (userData.links || 0) + pickData.links, updatedAt: Date.now() });
                            const logRef = adminDb.collection('linkTransactions').doc();
                            batch.set(logRef, {
                              userId: pickData.userId,
                              username: userData.username || userData.name || 'Unknown User',
                              type: 'PICK_CANCELLED',
                              amount: pickData.links,
                              description: `Wager refunded for cancelled pick on ${updateData.title || (updateData.awayTeam?.name + ' @ ' + updateData.homeTeam?.name)}`,
                              createdAt: Date.now()
                            });
                            opCount++;
                        }
                        opCount += 2;

                        const notificationsRef = adminDb.collection('notifications').doc();
                        const gameTitle = updateData.title || (updateData.awayTeam?.name + ' @ ' + updateData.homeTeam?.name);
                        batch.set(notificationsRef, {
                            title: 'Queued Pick Cancelled ⏱️',
                            body: `Your queued pick on ${gameTitle} was cancelled because the game started before it became your active pick. Your wager of ${pickData.links || 0} links was refunded.`,
                            audience: 'USER',
                            targetUserId: pickData.userId,
                            status: 'PENDING',
                            scheduledTime: Date.now(),
                            createdAt: Date.now()
                        });
                        opCount++;
                    } else {
                        hasValidPicks = true;
                    }
                }

                if (!pendingPickemPicksSnap.empty) {
                  hasValidPicks = true;
                }
              }

              if (!hasValidPicks && !bracketMatchIds.has(gameId)) {
                updateData.abandoned = true;
                updateData.active = false;
                flattenedUpdate.abandoned = true;
                flattenedUpdate.active = false;
              }
            }

            if (bracketMatchIds.has(gameId)) {
                updateData.active = true;
                updateData.abandoned = false;
                flattenedUpdate.active = true;
                flattenedUpdate.abandoned = false;
            }

            if (existingDoc.id !== gameId) {
              const newDocRef = adminDb.collection("matchups").doc(gameId);
              batch.set(newDocRef, updateData);
              batch.delete(existingDoc.ref);
              opCount += 2;
              existingMap.set(gameId, { data: () => updateData, ref: newDocRef } as any);
            } else if (needsUpdate) {
              batch.update(existingDoc.ref, flattenedUpdate);
              opCount++;
            }
            updateCount++;

            if (!updateData.abandoned &&
               ((newStatus === 'STATUS_FINAL' && existingData.status !== 'STATUS_FINAL') ||
                (newStatus === 'STATUS_POSTPONED' && existingData.status !== 'STATUS_POSTPONED'))) {
              matchupsToGrade.push({ ...existingData, ...updateData, gameId: scrapedMatchup.gameId, id: gameId });
            }
            matchupsToSyncToPickem.push({ ...existingData, ...updateData, gameId: scrapedMatchup.gameId, id: gameId });
          } else if (existingData.status === 'STATUS_FINAL' || existingData.status === 'STATUS_POSTPONED') {
            matchupsToSyncToPickem.push({ ...existingData, gameId: scrapedMatchup.gameId, id: gameId });
          }
        } else {
          const newDocRef = adminDb.collection("matchups").doc(gameId);

          let abandoned = false;
          let active = scrapedMatchup.active && defaultActive;

          if (scrapedMatchup.status === 'STATUS_IN_PROGRESS' ||
              scrapedMatchup.status === 'STATUS_FINAL' ||
              scrapedMatchup.status === 'STATUS_POSTPONED') {
            active = false;
            if (scrapedMatchup.league !== 'ATP' && scrapedMatchup.league !== 'WTA' && scrapedMatchup.league !== 'CRICKET') {
              abandoned = true;
            }
          }

          if (bracketMatchIds.has(gameId)) {
            active = true;
            abandoned = false;
          }

          const newMatchupData = {
            ...scrapedMatchup,
            active,
            abandoned,
            updatedAt: Date.now(),
            createdAt: Date.now()
          };

          batch.set(newDocRef, newMatchupData);
          opCount++;
          newCount++;

          existingMap.set(gameId, { data: () => newMatchupData, ref: newDocRef } as any);
          
          if (scrapedMatchup.status === 'STATUS_FINAL') {
              matchupsToGrade.push({ ...newMatchupData, id: gameId, gameId: gameId });
          }
        }

        if (opCount >= 500) {
          await batch.commit();
          batch = adminDb.batch();
          opCount = 0;
        }
      }

      // Check for removed/cancelled games only on full schedule sync
      if (!scoreboardOnly) {
        for (const [gameId, doc] of existingMap.entries()) {
          const data = doc.data();
          // If it was scheduled, not abandoned, and no longer in the scraped data
          if (data.status === 'STATUS_SCHEDULED' && !data.abandoned && !scrapedGameIds.has(gameId) && data.league !== 'PGA' && data.league !== 'CBASE' && data.league !== 'ATP' && data.league !== 'WTA' && data.league !== 'CRICKET') {
            const pendingPicksSnap = await adminDb.collection('picks')
              .where('matchupId', '==', gameId)
              .where('status', '==', 'PENDING')
              .limit(1)
              .get();

            const pendingPickemPicksSnap = await adminDb.collection('pickemPicks')
              .where('matchupId', '==', gameId)
              .where('status', '==', 'PENDING')
              .limit(1)
              .get();

            if (pendingPicksSnap.empty && pendingPickemPicksSnap.empty) {
              // No picks, safe to hide and let cron purge
              batch.update(doc.ref, { abandoned: true, active: false, updatedAt: Date.now() });
              opCount++;
              updateCount++;
            } else {
              // Has picks, mark as postponed so grader refunds them
              batch.update(doc.ref, { status: 'STATUS_POSTPONED', statusDesc: 'Canceled', updatedAt: Date.now() });
              opCount++;
              updateCount++;
              matchupsToGrade.push({ ...data, status: 'STATUS_POSTPONED', id: gameId, gameId });
              matchupsToSyncToPickem.push({ ...data, status: 'STATUS_POSTPONED', id: gameId, gameId });
            }

            if (opCount >= 500) {
              await batch.commit();
              batch = adminDb.batch();
              opCount = 0;
            }
          }
        }
      }

      if (opCount > 0) {
        await batch.commit();
      }

      if (Object.keys(fifaBracketUpdates).length > 0) {
          try {
              const bracketRef = adminDb.collection('brackets').doc('world-cup-2026');
              const bracketDoc = await bracketRef.get();
              if (bracketDoc.exists) {
                  const bracketData = bracketDoc.data()!;
                  let teamsChanged = false;
                  const newTeams = [...(bracketData.teams || [])];

                  const nameMap: Record<string, string> = {};

                  for (const [gameId, update] of Object.entries(fifaBracketUpdates)) {
                      if (update.oldHome && update.newHome && update.oldHome !== update.newHome) {
                          nameMap[update.oldHome] = update.newHome;
                      }
                      if (update.oldAway && update.newAway && update.oldAway !== update.newAway) {
                          nameMap[update.oldAway] = update.newAway;
                      }
                  }

                  for (let i = 0; i < newTeams.length; i++) {
                      if (nameMap[newTeams[i]]) {
                          newTeams[i] = nameMap[newTeams[i]];
                          teamsChanged = true;
                      }
                  }

                  if (teamsChanged) {
                      await bracketRef.update({ teams: newTeams, updatedAt: Date.now() });

                      const predictionsSnap = await adminDb.collection('bracketGamePredictions')
                          .where('bracketId', '==', 'world-cup-2026')
                          .get();

                      let predBatch = adminDb.batch();
                      let predOpCount = 0;

                      for (const predDoc of predictionsSnap.docs) {
                          const pData = predDoc.data();
                          let selectionsChanged = false;
                          const newSelections = { ...(pData.selections || {}) };

                          for (const [mId, pickedTeam] of Object.entries(newSelections)) {
                              if (typeof pickedTeam === 'string' && nameMap[pickedTeam]) {
                                  newSelections[mId] = nameMap[pickedTeam];
                                  selectionsChanged = true;
                              }
                          }

                          if (selectionsChanged) {
                              predBatch.update(predDoc.ref, { selections: newSelections, updatedAt: Date.now() });
                              predOpCount++;
                              if (predOpCount >= 500) {
                                  await predBatch.commit();
                                  predBatch = adminDb.batch();
                                  predOpCount = 0;
                              }
                          }
                      }
                      if (predOpCount > 0) {
                          await predBatch.commit();
                      }
                  }
              }
          } catch (err) {
              console.error("[Sync] Error updating FIFA bracket placeholder teams:", err);
          }
      }

      if (matchupsToGrade.length > 0) {
        await gradeMatchups(matchupsToGrade);
        await gradeBrackets(matchupsToGrade);
        await gradeLink4Matchups(matchupsToGrade);
      }

      if (matchupsToSyncToPickem.length > 0) {
        const pickemMatchupsToGrade: any[] = [];
        const uniqueGameIds = Array.from(new Set(matchupsToSyncToPickem.map(m => m.gameId))).filter(Boolean);
        const matchupMap = new Map(matchupsToSyncToPickem.map(m => [m.gameId, m]));

        let pickemBatch = adminDb.batch();
        let pickemOpCount = 0;

        for (let i = 0; i < uniqueGameIds.length; i += 30) {
          const chunk = uniqueGameIds.slice(i, i + 30);
          try {
            const pickemSnaps = await adminDb.collection('pickemMatchups').where('gameId', 'in', chunk).get();
            for (const doc of pickemSnaps.docs) {
              const pData = doc.data();
              const matchup = matchupMap.get(pData.gameId);
              if (!matchup) continue;

              // Sync standard matchup score and status into the pickem matchup
              const updateData = {
                status: matchup.status,
                statusDesc: matchup.statusDesc,
                'homeTeam.score': matchup.homeTeam?.score ?? 0,
                'awayTeam.score': matchup.awayTeam?.score ?? 0,
                updatedAt: Date.now()
              };

              const isStatusOrScoreChanged = pData.status !== updateData.status ||
                  pData.statusDesc !== updateData.statusDesc ||
                  pData.homeTeam?.score !== updateData['homeTeam.score'] ||
                  pData.awayTeam?.score !== updateData['awayTeam.score'];

              if (isStatusOrScoreChanged) {
                pickemBatch.update(doc.ref, updateData);
                pickemOpCount++;

                if (pickemOpCount >= 500) {
                  await pickemBatch.commit();
                  pickemBatch = adminDb.batch();
                  pickemOpCount = 0;
                }
              }

              if (updateData.status === 'STATUS_FINAL' || updateData.status === 'STATUS_POSTPONED') {
                if (isStatusOrScoreChanged) {
                  pickemMatchupsToGrade.push({
                    ...pData,
                    status: matchup.status,
                    statusDesc: matchup.statusDesc,
                    homeTeam: { ...(pData.homeTeam || {}), score: matchup.homeTeam?.score ?? 0 },
                    awayTeam: { ...(pData.awayTeam || {}), score: matchup.awayTeam?.score ?? 0 },
                    id: doc.id
                  });
                } else {
                  // If status/score didn't change but game is final, check for pending picks to retry
                  const pendingPicksSnap = await adminDb.collection('pickemPicks')
                    .where('matchupId', '==', doc.id)
                    .where('status', '==', 'PENDING')
                    .limit(1)
                    .get();

                  if (!pendingPicksSnap.empty) {
                    pickemMatchupsToGrade.push({
                      ...pData,
                      status: matchup.status,
                      statusDesc: matchup.statusDesc,
                      homeTeam: { ...(pData.homeTeam || {}), score: matchup.homeTeam?.score ?? 0 },
                      awayTeam: { ...(pData.awayTeam || {}), score: matchup.awayTeam?.score ?? 0 },
                      id: doc.id
                    });
                  }
                }
              }
            }
          } catch (err) {
            console.error(`[Sync] Error syncing pickem matchup chunk:`, err);
          }
        }

        if (pickemOpCount > 0) {
          await pickemBatch.commit();
        }

        if (pickemMatchupsToGrade.length > 0) {
          await gradePickemMatchups(pickemMatchupsToGrade);
        }
      }

      response.scoreMatchupsCreated = newCount;
      response.matchupsUpdated = updateCount;

      // Check for Link4 payouts
      await processCompletedLink4Segments();

    } catch (e: any) {
      console.error(`[Sync] Error writing to Firestore for ${league}:`, e);
      response.error = e.message;
    }
  } else if (!adminDb) {
    console.warn(`[Sync] Skipping Firestore write for ${league} because adminDb is not initialized.`);
  }

  return response;
}
