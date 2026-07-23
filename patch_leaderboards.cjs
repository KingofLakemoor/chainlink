const fs = require('fs');
let code = fs.readFileSync('src/pages/leaderboards/LeaderboardsPage.tsx', 'utf8');

const targetContent1 = `  const topWinRate = eligibleForWinRate.length > 0 ? [...eligibleForWinRate].sort((a, b) => {
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    return (b.stats?.wins || 0) - (a.stats?.wins || 0);
  })[0] : null;

  const handleExportCSV = () => {`;

const replaceContent1 = `  const topWinRate = eligibleForWinRate.length > 0 ? [...eligibleForWinRate].sort((a, b) => {
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    return (b.stats?.wins || 0) - (a.stats?.wins || 0);
  })[0] : null;

  const globalWins = leaderboardData.reduce((acc, player) => acc + (player.stats?.wins || 0), 0);
  const globalLosses = leaderboardData.reduce((acc, player) => acc + (player.stats?.losses || 0), 0);
  const globalTotalDecisions = globalWins + globalLosses;
  const globalWinRate = globalTotalDecisions > 0 ? ((globalWins / globalTotalDecisions) * 100).toFixed(1) : '0.0';

  const handleExportCSV = () => {`;

const targetContent2 = `        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
            <Users className="w-5 h-5 text-zinc-400" />
            Global Standings
          </h2>
        </div>`;

const replaceContent2 = `        <div className="p-5 border-b border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
            <Users className="w-5 h-5 text-zinc-400" />
            Global Standings
          </h2>
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
            <div className="flex items-center gap-1.5">
               <span className="text-zinc-400">Total Wins:</span>
               <span className="text-green-400 font-mono font-bold">{globalWins}</span>
            </div>
            <div className="flex items-center gap-1.5">
               <span className="text-zinc-400">Total Losses:</span>
               <span className="text-red-400 font-mono font-bold">{globalLosses}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-zinc-900/50 px-2 py-1 rounded border border-zinc-800">
               <span className="text-zinc-400">Global Win %:</span>
               <span className="text-cyan-400 font-mono font-bold">{globalWinRate}%</span>
            </div>
          </div>
        </div>`;

if (code.includes(targetContent1) && code.includes(targetContent2)) {
    code = code.replace(targetContent1, replaceContent1);
    code = code.replace(targetContent2, replaceContent2);
    fs.writeFileSync('src/pages/leaderboards/LeaderboardsPage.tsx', code);
    console.log('Patched successfully');
} else {
    console.log('Target content not found. \\nTarget 1 found:', code.includes(targetContent1), '\\nTarget 2 found:', code.includes(targetContent2));
}
