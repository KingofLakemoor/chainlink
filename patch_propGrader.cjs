const fs = require('fs');
let code = fs.readFileSync('src/services/propGrader.ts', 'utf8');

// Update fetchGameStatus to accept timeframe
code = code.replace(
    /async function fetchGameStatus\(adminDb: any, config: PropAthleteConfig\): Promise<GameStatus> {/g,
    `async function fetchGameStatus(adminDb: any, config: PropAthleteConfig, timeframe?: PropTimeframe): Promise<GameStatus> {`
);

// Update calls to fetchGameStatus
code = code.replace(
    /const statusA = await fetchGameStatus\(adminDb, m\.metadata\.optionA\);/g,
    `const statusA = await fetchGameStatus(adminDb, m.metadata.optionA, m.metadata.timeframe);`
);
code = code.replace(
    /const statusB = m\.metadata\.optionB \? await fetchGameStatus\(adminDb, m\.metadata\.optionB\) : statusA;/g,
    `const statusB = m.metadata.optionB ? await fetchGameStatus(adminDb, m.metadata.optionB, m.metadata.timeframe) : statusA;`
);

// Update fetchGameStatus period assignment from db
code = code.replace(
    /period: 0/g,
    `period: data.metadata?.period || 0`
);

// Update final status check logic
const checkFinalLogic = `                // If one game hasn't started, its status will be IN_PROGRESS or SCHEDULED (from fetchGameStatus default)
                // Let's ensure we only mark FINAL if BOTH are FINAL
                const isFinalForTimeframe = (statusObj: GameStatus, timeF: PropTimeframe, lg: string) => {
                    if (statusObj.status === 'STATUS_FINAL') return true;
                    if (!statusObj.period || !timeF || timeF === 'FULL_GAME') return false;
                    
                    if (timeF === 'FIRST_QUARTER') {
                        return statusObj.period > 1;
                    } else if (timeF === 'FIRST_HALF') {
                        if (lg === 'MLB' || lg === 'CBASE') return statusObj.period > 5;
                        return statusObj.period > 2;
                    }
                    return false;
                };

                const isAFinal = isFinalForTimeframe(statusA, m.metadata.timeframe, m.metadata.optionA.league);
                const isBFinal = m.metadata.optionB ? isFinalForTimeframe(statusB, m.metadata.timeframe, m.metadata.optionB.league) : isAFinal;

                if (isAFinal && isBFinal) {
                    newStatus = 'STATUS_FINAL';
                    statusDesc = 'Final';
                } else {`;

code = code.replace(
    /                \/\/ If one game hasn't started, its status will be IN_PROGRESS or SCHEDULED \(from fetchGameStatus default\)\n                \/\/ Let's ensure we only mark FINAL if BOTH are FINAL\n                if \(statusA\.status === 'STATUS_FINAL' && statusB\.status === 'STATUS_FINAL'\) {\n                    newStatus = 'STATUS_FINAL';\n                    statusDesc = 'Final';\n                } else {/g,
    checkFinalLogic
);

fs.writeFileSync('src/services/propGrader.ts', code);
