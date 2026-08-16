const fs = require('fs');
let code = fs.readFileSync('src/services/propGrader.ts', 'utf8');

code = code.replace(
    /const isFinalForTimeframe = \(statusObj: GameStatus, timeF: PropTimeframe, lg: string\) => {[\s\S]*?return false;\n                };/,
    `const isFinalForTimeframe = (statusObj: GameStatus, timeF: PropTimeframe, lg: string) => {
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
                };`
);

fs.writeFileSync('src/services/propGrader.ts', code);
