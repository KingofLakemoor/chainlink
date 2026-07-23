import * as firebaseAdmin from '../lib/firebase-admin.js';
import { gradeMatchups } from './grader.js';
export type PropLeague = 'NFL' | 'CFB' | 'NBA' | 'MLB';

export type PropStatType = 
    // MLB
    | 'STRIKEOUTS' | 'HITS' | 'HOME_RUNS'
    // NFL / CFB
    | 'PASSING_YARDS' | 'RUSHING_YARDS' | 'RECEIVING_YARDS' | 'TOUCHDOWNS'
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

async function fetchPlayerStat(config: PropAthleteConfig, timeframe: PropTimeframe): Promise<number | null> {
    // Determine the base API URL based on the league
    let sport = '';
    let leaguePath = '';
    
    switch (config.league) {
        case 'MLB': sport = 'baseball'; leaguePath = 'mlb'; break;
        case 'NFL': sport = 'football'; leaguePath = 'nfl'; break;
        case 'CFB': sport = 'football'; leaguePath = 'college-football'; break;
        case 'NBA': sport = 'basketball'; leaguePath = 'nba'; break;
    }

    const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${leaguePath}/summary?event=${config.gameId}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${config.league} data`);
    const data = await res.json();

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
                if (config.statType === 'STRIKEOUTS' && (!groupType || groupType === 'pitching')) targetIdx = labels.findIndex((l: string) => l === 'K');
                if (config.statType === 'HITS' && (!groupType || groupType === 'batting')) targetIdx = labels.findIndex((l: string) => l === 'H');
                if (config.statType === 'HOME_RUNS' && (!groupType || groupType === 'batting')) targetIdx = labels.findIndex((l: string) => l === 'HR');
                
                // NFL mapping
                if (config.statType === 'PASSING_YARDS' && statGroup.name === 'passing') targetIdx = labels.findIndex((l: string) => l === 'YDS');
                if (config.statType === 'RUSHING_YARDS' && statGroup.name === 'rushing') targetIdx = labels.findIndex((l: string) => l === 'YDS');
                if (config.statType === 'RECEIVING_YARDS' && statGroup.name === 'receiving') targetIdx = labels.findIndex((l: string) => l === 'YDS');
                if (config.statType === 'TOUCHDOWNS') {
                    if (statGroup.name === 'passing') targetIdx = labels.findIndex((l: string) => l === 'TD');
                    if (statGroup.name === 'rushing') targetIdx = labels.findIndex((l: string) => l === 'TD');
                    if (statGroup.name === 'receiving') targetIdx = labels.findIndex((l: string) => l === 'TD');
                }

                if (targetIdx !== -1) {
                    const athleteStat = statGroup.athletes?.find((a: any) => a.athlete.id.toString() === playerId);
                    if (athleteStat && athleteStat.stats && athleteStat.stats[targetIdx] !== undefined) {
                        const val = parseFloat(athleteStat.stats[targetIdx]);
                        if (!isNaN(val)) {
                            // If stat is TOUCHDOWNS, sum them across rushing/receiving/passing
                            if (config.statType === 'TOUCHDOWNS') {
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
            .where('type', '==', 'STATS')
            .where('status', 'in', ['STATUS_SCHEDULED', 'STATUS_IN_PROGRESS'])
            .get();
            
        let batch = adminDb.batch();
        let count = 0;
        const matchupsToGrade: any[] = [];
        
        for (const doc of snap.docs) {
            const m = doc.data();
            if (!m.metadata?.isPropMatchup) continue;
            
            const valueA = await fetchPlayerStat(m.metadata.optionA, m.metadata.timeframe);
            const valueB = await fetchPlayerStat(m.metadata.optionB, m.metadata.timeframe);
            
            if (valueA !== null && valueB !== null) {
                // Determine if both games are final
                const statusA = await fetchGameStatus(m.metadata.optionA);
                const statusB = await fetchGameStatus(m.metadata.optionB);
                
                let newStatus = 'STATUS_IN_PROGRESS';
                let statusDesc = 'In Progress';
                if (statusA.status === 'STATUS_FINAL' && statusB.status === 'STATUS_FINAL') {
                    newStatus = 'STATUS_FINAL';
                    statusDesc = 'Final';
                } else {
                    if (m.metadata.optionA.gameId === m.metadata.optionB.gameId) {
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
                
                batch.update(doc.ref, {
                    'awayTeam.score': valueA,
                    'homeTeam.score': valueB,
                    status: newStatus,
                    statusDesc: statusDesc
                });
                count++;
                if (newStatus === 'STATUS_FINAL') {
                    matchupsToGrade.push({ id: doc.id, ...m, status: 'STATUS_FINAL', statusDesc: 'Final', homeTeam: { ...m.homeTeam, score: valueB }, awayTeam: { ...m.awayTeam, score: valueA } });
                }
            } else if (m.startTime && Date.now() >= m.startTime && m.status === 'STATUS_SCHEDULED') {
                // If games have started by time but boxscore is not ready, update status to lock the prop
                batch.update(doc.ref, { status: 'STATUS_IN_PROGRESS' });
                count++;
            }
        }
        
        if (count > 0) {
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

async function fetchGameStatus(config: PropAthleteConfig): Promise<GameStatus> {
    try {
        let sport = '';
        let leaguePath = '';
        switch (config.league) {
            case 'MLB': sport = 'baseball'; leaguePath = 'mlb'; break;
            case 'NFL': sport = 'football'; leaguePath = 'nfl'; break;
            case 'CFB': sport = 'football'; leaguePath = 'college-football'; break;
            case 'NBA': sport = 'basketball'; leaguePath = 'nba'; break;
        }
        const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${leaguePath}/summary?event=${config.gameId}`;
        const res = await fetch(url);
        if (!res.ok) return { status: 'STATUS_IN_PROGRESS' };
        const data = await res.json();
        const statusObj = data.header?.competitions?.[0]?.status;
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
