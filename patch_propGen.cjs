const fs = require('fs');
let code = fs.readFileSync('src/services/propGenerator.ts', 'utf8');

code = code.replace(
    /\/\/ Generate Anytime TD Scorer O\/U 0.5 for RBs and WRs/,
    `// Generate Anytime TD Scorer O/U 0.5 for RBs and WRs
            const generatePassingTD = (player: any, team: any) => {
                if (!player) return;
                const pId = player.id?.toString() || player.athlete?.id?.toString();
                const pName = player.displayName || player.fullName || player.athlete?.displayName;
                const pImage = \`https://a.espncdn.com/i/headshots/nfl/players/full/\${pId}.png\`;
                
                const optionA = {
                    league: 'NFL',
                    gameId: game.id,
                    playerId: pId,
                    teamId: team.id,
                    playerName: pName,
                    playerImage: pImage,
                    statType: 'PASSING_TOUCHDOWNS'
                };
                
                const gameId = \`prop_pass_td_\${game.id}_\${pId}\`;
                const title = \`\${pName} (Passing TDs)\`;
                
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
                        id: \`prop_\${pId}\`,
                        name: pName,
                        image: pImage,
                        score: 0
                    },
                    metadata: {
                        isPropMatchup: true,
                        isSinglePlayerProp: true,
                        timeframe: 'FULL_GAME',
                        overUnder: 1.5,
                        optionA,
                        generatedAt: now
                    }
                }, { merge: true });
                createdCount++;
            };
            
            generatePassingTD(awayQB, awayTeam);
            generatePassingTD(homeQB, homeTeam);
`
);

fs.writeFileSync('src/services/propGenerator.ts', code);
