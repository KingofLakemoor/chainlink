import * as firebaseAdmin from '../lib/firebase-admin.js';
import fetch from 'node-fetch';

const NFL_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

export async function autoGenerateNFLProps() {
    const adminDb = firebaseAdmin.adminDb;
    if (!adminDb) return { success: false, message: 'adminDb not initialized' };

    try {
        const res = await fetch(`${NFL_URL}/scoreboard`, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
        const data = await res.json() as any;
        const upcomingGames = data.events?.filter((e: any) => 
            e.status?.type?.name === 'STATUS_SCHEDULED'
        ) || [];

        if (upcomingGames.length === 0) {
            return { success: true, message: 'No upcoming NFL games found.' };
        }

        let createdCount = 0;
        const batch = adminDb.batch();
        const now = Date.now();
        
        // Grab top 3 games
        const targetGames = upcomingGames.slice(0, 3);

        for (const game of targetGames) {
            const comp = game.competitions[0];
            const awayTeam = comp.competitors.find((c: any) => c.homeAway === 'away')?.team;
            const homeTeam = comp.competitors.find((c: any) => c.homeAway === 'home')?.team;

            if (!awayTeam || !homeTeam) continue;

            const startTime = new Date(game.date).getTime();

            const awayDepthRes = await fetch(`${NFL_URL}/teams/${awayTeam.id}/depthcharts`, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
            const awayDepthData = await awayDepthRes.json() as any;
            const homeDepthRes = await fetch(`${NFL_URL}/teams/${homeTeam.id}/depthcharts`, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
            const homeDepthData = await homeDepthRes.json() as any;

            const awayOffense = awayDepthData.depthchart?.find((x:any) => x.positions.qb);
            const homeOffense = homeDepthData.depthchart?.find((x:any) => x.positions.qb);

            if (!awayOffense || !homeOffense) continue;

            const awayQB = awayOffense.positions.qb?.athletes[0];
            const homeQB = homeOffense.positions.qb?.athletes[0];

            const awayRB = awayOffense.positions.rb?.athletes[0];
            const homeRB = homeOffense.positions.rb?.athletes[0];

            const awayWR = (awayOffense.positions.wr?.athletes[0] || awayOffense.positions.wr1?.athletes[0]);
            const homeWR = (homeOffense.positions.wr?.athletes[0] || homeOffense.positions.wr1?.athletes[0]);

            const generateMatchup = (playerA: any, playerB: any, statType: string) => {
                if (!playerA || !playerB) return;
                
                const optionA = {
                    league: 'NFL',
                    gameId: game.id,
                    playerId: playerA.id?.toString() || playerA.athlete?.id?.toString(),
                    teamId: awayTeam.id,
                    playerName: playerA.displayName || playerA.fullName || playerA.athlete?.displayName,
                    playerImage: `https://a.espncdn.com/i/headshots/nfl/players/full/${playerA.id || playerA.athlete?.id}.png`,
                    statType: statType
                };

                const optionB = {
                    league: 'NFL',
                    gameId: game.id,
                    playerId: playerB.id?.toString() || playerB.athlete?.id?.toString(),
                    teamId: homeTeam.id,
                    playerName: playerB.displayName || playerB.fullName || playerB.athlete?.displayName,
                    playerImage: `https://a.espncdn.com/i/headshots/nfl/players/full/${playerB.id || playerB.athlete?.id}.png`,
                    statType: statType
                };

                const gameId = `prop_auto_${game.id}_${optionA.playerId}_${optionB.playerId}_${statType}`;
                const title = `${optionA.playerName} (${statType}) vs ${optionB.playerName} (${statType})`;

                const matchupData = {
                    title: title,
                    league: 'NFL',
                    type: 'STATS',
                    typeDetails: 'PLAYER_STAT',
                    cost: 0,
                    startTime,
                    active: false,
                    featured: false,
                    status: 'STATUS_SCHEDULED',
                    gameId,
                    hasCustomTitle: true,
                    homeTeam: {
                        id: `prop_${optionB.playerId}`,
                        name: optionB.playerName,
                        image: optionB.playerImage,
                        score: 0
                    },
                    awayTeam: {
                        id: `prop_${optionA.playerId}`,
                        name: optionA.playerName,
                        image: optionA.playerImage,
                        score: 0
                    },
                    metadata: {
                        isPropMatchup: true,
                        timeframe: 'FULL_GAME',
                        optionA,
                        optionB,
                        generatedAt: now
                    }
                };

                const docRef = adminDb.collection('matchups').doc(gameId);
                batch.set(docRef, matchupData, { merge: true });
                createdCount++;
            };
            
            const generateAnytimeTD = (player: any, team: any) => {
                if (!player) return;
                const pId = player.id?.toString() || player.athlete?.id?.toString();
                const pName = player.displayName || player.fullName || player.athlete?.displayName;
                const pImage = `https://a.espncdn.com/i/headshots/nfl/players/full/${pId}.png`;
                
                const optionA = {
                    league: 'NFL',
                    gameId: game.id,
                    playerId: pId,
                    teamId: team.id,
                    playerName: pName,
                    playerImage: pImage,
                    statType: 'TOUCHDOWNS'
                };
                
                const gameId = `prop_td_${game.id}_${pId}`;
                const title = `${pName} (Anytime TD Scorer)`;
                
                const docRef = adminDb.collection('matchups').doc(gameId);
                batch.set(docRef, {
                    title: title,
                    league: 'NFL',
                    type: 'OVER_UNDER',
                    typeDetails: 'PLAYER_STAT',
                    cost: 0,
                    startTime,
                    active: false,
                    featured: false,
                    status: 'STATUS_SCHEDULED',
                    gameId,
                    hasCustomTitle: true,
                    homeTeam: {
                        id: 'UNDER',
                        name: 'Under',
                        image: '/images/under.png',
                        score: 0
                    },
                    awayTeam: {
                        id: `prop_${pId}`,
                        name: pName,
                        image: pImage,
                        score: 0 // We will store the player's TDs here
                    },
                    metadata: {
                        isPropMatchup: true,
                        isSinglePlayerProp: true,
                        timeframe: 'FULL_GAME',
                        overUnder: 0.5,
                        optionA, // player info for fetchPlayerStat
                        generatedAt: now
                    }
                }, { merge: true });
                createdCount++;
            };

            generateMatchup(awayQB, homeQB, 'PASSING_YARDS');
            generateMatchup(awayRB, homeRB, 'RUSHING_YARDS');
            generateMatchup(awayWR, homeWR, 'RECEIVING_YARDS');
            
            // Generate Anytime TD Scorer O/U 0.5 for RBs and WRs
            generateAnytimeTD(awayRB, awayTeam);
            generateAnytimeTD(homeRB, homeTeam);
            generateAnytimeTD(awayWR, awayTeam);
            generateAnytimeTD(homeWR, homeTeam);
        }

        if (createdCount > 0) {
            await batch.commit();
        }

        return { success: true, message: `Auto-generated ${createdCount} NFL props.` };

    } catch (err: any) {
        console.error("Auto-gen Props Error:", err);
        return { success: false, message: err.message };
    }
}
