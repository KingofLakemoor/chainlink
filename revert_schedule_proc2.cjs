const fs = require('fs');
const file = 'src/services/scheduleProcessor.ts';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `              const updateData: any = {                status: matchup.status,                statusDesc: matchup.statusDesc,                'homeTeam.score': matchup.homeTeam?.score ?? 0,                'awayTeam.score': matchup.awayTeam?.score ?? 0,                title: matchup.title,                active: true,                updatedAt: Date.now()              };`;

const replStr = `              const updateData: any = {                status: matchup.status,                statusDesc: matchup.statusDesc,                'homeTeam.score': matchup.homeTeam?.score ?? 0,                'awayTeam.score': matchup.awayTeam?.score ?? 0,                title: matchup.title,                updatedAt: Date.now()              };`;

code = code.replace(targetStr, replStr);
fs.writeFileSync(file, code);
console.log("Reverted patch 2");
