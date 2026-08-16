import * as firebaseAdmin from '../lib/firebase-admin.js';
import { gradeMatchups } from './grader.js';

const boxscoreCache = new Map<string, any>();
const gameStatusCache = new Map<string, any>();

// Invalidate caches every 5 minutes to prevent memory leaks if used in a long-running process
setInterval(() => {
    boxscoreCache.clear();
    gameStatusCache.clear();
}, 5 * 60 * 1000);
export type PropLeague = 'NFL' | 'CFB' | 'NBA' | 'MLB';

export type PropStatType = 
    // MLB
    | 'STRIKEOUTS' | 'HITS' | 'HOME_RUNS'
    // NFL / CFB
    | 'PASSING_YARDS' | 'RUSHING_YARDS' | 'RECEIVING_YARDS' | 'TOUCHDOWNS' | 'PASSING_TOUCHDOWNS'
    // NBA
    | 'POINTS' | 'REBOUNDS' | 'ASSISTS' | 'THREES';

export type PropTimeframe = 
    | 'FULL_GAME' 
    | 'FIRST_HALF' 
    | 'FIRST_QUARTER' // or 1st inning
    | 'RACE_TO_X';

export interface PropAthleteConfig {
    league: PropLeague;
    gameId: string;
    playerId: string;
    statType: PropStatType;
}

export interface CrossSportPropConfig {
    propId: string;
    timeframe: PropTimeframe;
    targetValue?: number; // Used for 'RACE_TO_X' or handicap/spreads in the future
    optionA: PropAthleteConfig;
    optionB: PropAthleteConfig;
}

export interface PropGraderResult {
    status: 'A' | 'B' | 'TIE' | 'PENDING' | 'ERROR';
    optionA_Value: number;
    optionB_Value: number;
    reason?: string;
}

/**
 * Universal Grader for Cross-Sport Stat Props
 * 
 * Supports comparing stats between two different players, even in different sports.
 * e.g., NBA Player Points (Q1) vs NFL Player Rushing Yards (H1)
 */
export async function gradeCrossSportProp(config: CrossSportPropConfig): Promise<PropGraderResult> {
    try {
        // 1. Fetch data for Option A
        const valueA = await fetchPlayerStat(config.optionA, config.timeframe);
        
        // 2. Fetch data for Option B
        const valueB = await fetchPlayerStat(config.optionB, config.timeframe);

        // If either value is null, the game might not have started or the stat isn't available yet
        if (valueA === null || valueB === null) {
            return { status: 'PENDING', optionA_Value: valueA || 0, optionB_Value: valueB || 0 };
        }

        // RACE_TO_X Logic (requires play-by-play analysis which is more complex)
        if (config.timeframe === 'RACE_TO_X') {
            // Note: Race to X requires timestamping each event to see who reached it first chronologically.
            // This would require deep play-by-play parsing.
            return { status: 'PENDING', optionA_Value: valueA, optionB_Value: valueB, reason: 'Race logic requires play-by-play timestamps.' };
        }

        // Standard Comparison Logic
        if (valueA > valueB) return { status: 'A', optionA_Value: valueA, optionB_Value: valueB };
        if (valueB > valueA) return { status: 'B', optionA_Value: valueA, optionB_Value: valueB };
        
        // If they are equal, we need to know if the games are FINAL to declare a tie
        // For now, if they are equal we return TIE, but in production we'd check if the games are completed
        return { status: 'TIE', optionA_Value: valueA, optionB_Value: valueB };

    } catch (e) {
        console.error("Error grading cross-sport prop:", e);
        return { status: 'ERROR', optionA_Value: 0, optionB_Value: 0 };
    }
}

export async function fetchPlayerStat(config: PropAthleteConfig, timeframe: PropTimeframe): Promise<number | null> {
    // Determine the base API URL based on the league
    let sport = '';
    let leaguePath = '';
    
    switch (config.league) {
        case 'MLB': sport = 'baseball'; leaguePath = 'mlb'; break;
        case 'NFL': sport = 'football'; leaguePath = 'nfl'; break;
        case 'CFB': sport = 'football'; leaguePath = 'college-football'; break;
        case 'NBA': sport = 'basketball'; leaguePath = 'nba'; break;
    }

    let data;
    if (boxscoreCache.has(config.gameId)) {
        const cached = boxscoreCache.get(config.gameId);
        if (cached instanceof Promise) {
            data = await cached;
        } else {
            data = cached;
        }
    } else {
        const fetchPromise = (async () => {
            const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${leaguePath}/summary?event=${config.gameId}`;
            const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
            if (!res.ok) throw new Error(`Failed to fetch ${config.league} data`);
            return await res.json();
        })();
        
        boxscoreCache.set(config.gameId, fetchPromise);
        data = await fetchPromise;
        // Replace promise with actual data once resolved to save memory/avoid promise resolution overhead on every hit
        boxscoreCache.set(config.gameId, data);
    }

    // NOTE: This is a simplified extractor. 
    // In reality, we need to parse the `boxscore.players` array or the `plays` array
    // depending on the timeframe (e.g., Q1 vs Full Game).
    

    if (!data || !data.boxscore || !data.boxscore.players) {
        return null; // Game hasn't started or boxscore not available
    }

    try {
        const playerId = config.playerId.toString();
        let foundStatValue = null;

        for (const teamTeam of data.boxscore.players) {
            for (const statGroup of teamTeam.statistics) {
                // Determine labels array: NBA uses 'names', NFL uses 'labels'
                const labels = statGroup.names || statGroup.labels || [];
                
                let targetIdx = -1;
                // NBA mapping
                if (config.statType === 'POINTS') targetIdx = labels.findIndex((l: string) => l === 'PTS');
                if (config.statType === 'REBOUNDS') targetIdx = labels.findIndex((l: string) => l === 'REB');
                if (config.statType === 'ASSISTS') targetIdx = labels.findIndex((l: string) => l === 'AST');
                if (config.statType === 'THREES') targetIdx = labels.findIndex((l: string) => l === '3PT');
                
                const groupType = statGroup.type || statGroup.name;
                
                // MLB mapping
                if (config.statType === 'STRIKEOUTS' && groupType === 'pitching') targetIdx = labels.findIndex((l: string) => l === 'K');
                if (config.statType === 'HITS' && groupType === 'batting') targetIdx = labels.findIndex((l: string) => l === 'H');
                if (config.statType === 'HOME_RUNS' && groupType === 'batting') targetIdx = labels.findIndex((l: string) => l === 'HR');
                
                // NFL mapping
                if (config.statType === 'PASSING_YARDS' && statGroup.name === 'passing') targetIdx = labels.findIndex((l: string) => l === 'YDS');
                if (config.statType === 'RUSHING_YARDS' && statGroup.name === 'rushing') targetIdx = labels.findIndex((l: string) => l === 'YDS');
                if (config.statType === 'RECEIVING_YARDS' && statGroup.name === 'receiving') targetIdx = labels.findIndex((l: string) => l === 'YDS');
                if (config.statType === 'TOUCHDOWNS') {
                    if (statGroup.name === 'rushing') targetIdx = labels.findIndex((l: string) => l === 'TD');
                    if (statGroup.name === 'receiving') targetIdx = labels.findIndex((l: string) => l === 'TD');
                }
                if (config.statType === 'PASSING_TOUCHDOWNS') {
                    if (statGroup.name === 'passing') targetIdx = labels.findIndex((l: string) => l === 'TD');
                }

                if (targetIdx !== -1) {
                    const athleteStat = statGroup.athletes?.find((a: any) => a.athlete.id.toString() === playerId);
                    if (athleteStat && athleteStat.stats && athleteStat.stats[targetIdx] !== undefined) {
                        const val = parseFloat(athleteStat.stats[targetIdx]);
                        if (!isNaN(val)) {
                            // If stat is TOUCHDOWNS or PASSING_TOUCHDOWNS, sum them if multiple groups (though usually not for passing)
                            if (config.statType === 'TOUCHDOWNS' || config.statType === 'PASSING_TOUCHDOWNS') {
                                foundStatValue = (foundStatValue || 0) + val;
                            } else {
                                return val;
                            }
                        }
                    }
                }
            }
        }
        
        if (foundStatValue !== null) return foundStatValue;
        
        // If the player is in the boxscore but didn't register this specific stat, they get 0
        // (Assuming they played if the boxscore exists)
        return 0;
    } catch (err) {
        console.error("Error parsing boxscore:", err);
        return 0;
    }

}



export async function updateAllProps() {
    const adminDb = firebaseAdmin.adminDb;
    if (!adminDb) return;
    
    try {
        const snap = await adminDb.collection('matchups')
            .where('metadata.isPropMatchup', '==', true)
            .where('status', 'in', ['STATUS_SCHEDULED', 'STATUS_IN_PROGRESS'])
            .get();
            
        let batch = adminDb.batch();
        let count = 0;
        let batchCount = 0;
        const matchupsToGrade: any[] = [];
        
        const chunk = 20;
        for (let i = 0; i < snap.docs.length; i += chunk) {
            const batchDocs = snap.docs.slice(i, i + chunk);
            await Promise.all(batchDocs.map(async (doc) => {
            try {
            const m = doc.data();
            if (!m.metadata?.isPropMatchup) return;
            
            const valueA = m.metadata.optionA ? await fetchPlayerStat(m.metadata.optionA, m.metadata.timeframe) : null;
            const valueB = m.metadata.optionB ? await fetchPlayerStat(m.metadata.optionB, m.metadata.timeframe) : null;
            
            if (valueA !== null || valueB !== null) {
                // Determine if both games are final
                const statusA = await fetchGameStatus(adminDb, m.metadata.optionA, m.metadata.timeframe);
                const statusB = m.metadata.optionB ? await fetchGameStatus(adminDb, m.metadata.optionB, m.metadata.timeframe) : statusA;
                
                let newStatus = 'STATUS_IN_PROGRESS';
                let statusDesc = 'In Progress';
                
                // If one game hasn't started, its status will be IN_PROGRESS or SCHEDULED (from fetchGameStatus default)
                // Let's ensure we only mark FINAL if BOTH are FINAL
                const isFinalForTimeframe = (statusObj: GameStatus, timeF: PropTimeframe, lg: string) => {
                    if (statusObj.status === 'STATUS_FINAL') return true;
                    if (!statusObj.period || !timeF || timeF === 'FULL_GAME') return false;
                    
                    const desc = (statusObj.detail || "").toLowerCase();

                    if (timeF === 'FIRST_QUARTER') {
                        if (statusObj.period > 1) return true;
                        if (statusObj.period === 1 && (desc.includes('end of') || desc.includes('end 1') || desc.includes('end of 1st') || desc.includes('halftime'))) return true;
                        return false;
                    } else if (timeF === 'FIRST_HALF') {
                        if (lg === 'MLB' || lg === 'CBASE') {
                            if (statusObj.period > 5) return true;
                            if (statusObj.period === 5 && (desc.includes('end of') || desc.includes('end 5') || desc.includes('end of 5th') || desc.includes('mid 6'))) return true;
                            return false;
                        }
                        if (statusObj.period > 2) return true;
                        if (statusObj.period === 2 && (desc.includes('end of') || desc.includes('halftime') || desc.includes('end 2') || desc.includes('end of 2nd') || desc.includes('end of half'))) return true;
                        return false;
                    }
                    return false;
                };

                const isAFinal = isFinalForTimeframe(statusA, m.metadata.timeframe, m.metadata.optionA.league);
                const isBFinal = m.metadata.optionB ? isFinalForTimeframe(statusB, m.metadata.timeframe, m.metadata.optionB.league) : isAFinal;

                if (isAFinal && isBFinal) {
                    newStatus = 'STATUS_FINAL';
                    statusDesc = 'Final';
                } else {
                    if (!m.metadata.optionB || m.metadata.optionA.gameId === m.metadata.optionB.gameId) {
                         statusDesc = statusA.detail || 'In Progress';
                    } else {
                         let farthest = statusA;
                         if (statusA.status === 'STATUS_FINAL') {
                             farthest = statusB;
                         } else if (statusB.status === 'STATUS_FINAL') {
                             farthest = statusA;
                         } else if (statusA.period !== undefined && statusB.period !== undefined) {
                             if (statusA.period < statusB.period) {
                                 farthest = statusA;
                             } else if (statusA.period > statusB.period) {
                                 farthest = statusB;
                             }
                         }
                         statusDesc = farthest.detail || 'In Progress';
                    }
                }
                
                const updateData: any = {
                    status: newStatus,
                    statusDesc: statusDesc
                };
                
                let currentScoreA = m.awayTeam?.score || 0;
                let currentScoreB = m.homeTeam?.score || 0;
                
                if (valueA !== null) {
                    updateData['awayTeam.score'] = valueA;
                    currentScoreA = valueA;
                }
                if (valueB !== null) {
                    updateData['homeTeam.score'] = valueB;
                    currentScoreB = valueB;
                }
                
                if ((m.metadata.isSinglePlayerProp || m.metadata.isSoloProp) && (m.type === 'OVER_UNDER' || m.metadata.isYesOnly)) {
                     const ou = m.metadata.overUnder || m.metadata.targetLine || 0;
                     // If the prop is Yes Only, and it hit the mark, grade it immediately
                     if (currentScoreA > ou && newStatus !== 'STATUS_FINAL' && m.metadata.isYesOnly) {
                          newStatus = 'STATUS_FINAL';
                          updateData.status = 'STATUS_FINAL';
                          updateData.statusDesc = 'Final';
                          updateData['metadata.winningSide'] = 'OVER';
                     } else if (newStatus === 'STATUS_FINAL') {
                          if (currentScoreA > ou) updateData['metadata.winningSide'] = 'OVER';
                          else if (currentScoreA < ou) updateData['metadata.winningSide'] = 'UNDER';
                          else updateData['metadata.winningSide'] = 'PUSH';
                     }
                } else if (newStatus === 'STATUS_FINAL') {
                     // Existing head-to-head logic
                     if (currentScoreA > currentScoreB) updateData['metadata.winningSide'] = m.awayTeam.id;
                     else if (currentScoreB > currentScoreA) updateData['metadata.winningSide'] = m.homeTeam.id;
                     else updateData['metadata.winningSide'] = 'PUSH';
                }
                
                batch.update(doc.ref, updateData);
                count++;
                batchCount++;
                if (batchCount >= 490) {
                    await batch.commit();
                    batch = adminDb.batch();
                    batchCount = 0;
                }
                if (newStatus === 'STATUS_FINAL') {
                    matchupsToGrade.push({ id: doc.id, ...m, status: 'STATUS_FINAL', statusDesc: 'Final', homeTeam: { ...m.homeTeam, score: currentScoreB }, awayTeam: { ...m.awayTeam, score: currentScoreA } });
                }
            } else if (m.startTime && Date.now() >= m.startTime && m.status === 'STATUS_SCHEDULED') {
                // If games have started by time but boxscore is not ready, update status to lock the prop
                const picksSnap = await adminDb.collection('picks')
                    .where('matchupId', '==', doc.id)
                    .limit(1)
                    .get();
                if (picksSnap.empty) {
                    batch.update(doc.ref, { status: 'STATUS_IN_PROGRESS', abandoned: true, active: false });
                } else {
                    batch.update(doc.ref, { status: 'STATUS_IN_PROGRESS' });
                }
                count++;
                batchCount++;
                if (batchCount >= 490) {
                    await batch.commit();
                    batch = adminDb.batch();
                    batchCount = 0;
                }
            }
            } catch (err) {
                console.error('Error processing prop matchup ' + doc.id, err);
            }
        }));
        }
        
        if (batchCount > 0) {
            await batch.commit();
            console.log(`[propGrader] Updated ${count} prop matchups.`);
            if (matchupsToGrade.length > 0) {
                await gradeMatchups(matchupsToGrade);
            }
        }
    } catch (e) {
        console.error("Error in updateAllProps:", e);
    }
}

interface GameStatus {
    status: string;
    detail?: string;
    period?: number;
}

async function fetchGameStatus(adminDb: any, config: PropAthleteConfig, timeframe?: PropTimeframe): Promise<GameStatus> {
    try {
        let data;
        if (gameStatusCache.has(config.gameId)) {
            const cached = gameStatusCache.get(config.gameId);
            if (cached instanceof Promise) {
                data = await cached;
            } else {
                data = cached;
            }
        } else {
            const fetchPromise = (async () => {
                const doc = await adminDb.collection('matchups').doc(config.gameId).get();
                if (doc.exists) {
                    return doc.data();
                }
                return null;
            })();
            
            gameStatusCache.set(config.gameId, fetchPromise);
            data = await fetchPromise;
            
            if (data) {
                gameStatusCache.set(config.gameId, data);
            } else {
                gameStatusCache.delete(config.gameId);
            }
        }
        
        if (data) {
            return {
                status: data.status === 'STATUS_FINAL' ? 'STATUS_FINAL' : 'STATUS_IN_PROGRESS',
                detail: data.statusDesc || 'In Progress',
                period: data.metadata?.period || 0
            };
        }
    } catch (e) {
        // Fallback to ESPN if db fetch fails
    }
    try {
        let sport = '';
        let leaguePath = '';
        switch (config.league) {
            case 'MLB': sport = 'baseball'; leaguePath = 'mlb'; break;
            case 'NFL': sport = 'football'; leaguePath = 'nfl'; break;
            case 'CFB': sport = 'football'; leaguePath = 'college-football'; break;
            case 'NBA': sport = 'basketball'; leaguePath = 'nba'; break;
        }
        
        let data;
        if (boxscoreCache.has(config.gameId)) {
            const cached = boxscoreCache.get(config.gameId);
            if (cached instanceof Promise) {
                data = await cached;
            } else {
                data = cached;
            }
        } else {
            const fetchPromise = (async () => {
                const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${leaguePath}/summary?event=${config.gameId}`;
                const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
                if (!res.ok) throw new Error('Failed to fetch espn');
                return await res.json();
            })();
            boxscoreCache.set(config.gameId, fetchPromise);
            data = await fetchPromise;
            boxscoreCache.set(config.gameId, data);
        }

        const statusObj = data?.header?.competitions?.[0]?.status;
        const rawStatus = statusObj?.type?.name;
        if (rawStatus === 'STATUS_FINAL') return { status: 'STATUS_FINAL', detail: statusObj?.type?.detail || 'Final' };
        return { 
           status: 'STATUS_IN_PROGRESS', 
           detail: statusObj?.type?.shortDetail || statusObj?.type?.detail,
           period: statusObj?.period
        };
    } catch {
        return { status: 'STATUS_IN_PROGRESS' };
    }
}
