const fs = require('fs');
const path = './src/components/ui/MatchupCard.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "mCounts?: { total: number; away: number; home: number };\n  sponsors: any[];",
  "mCounts?: { total: number; away: number; home: number };\n  globalActivePicksCount?: number;\n  sponsors: any[];"
);

content = content.replace(
  "mCounts = { total: 0, away: 0, home: 0 },\n  sponsors,",
  "mCounts = { total: 0, away: 0, home: 0 },\n  globalActivePicksCount,\n  sponsors,"
);

const oldPctCalc = `  const awayHotPct = mCounts.total > 0 ? Math.round(((mCounts.away || 0) / mCounts.total) * 100) : 0;
  const homeHotPct = mCounts.total > 0 ? Math.round(((mCounts.home || 0) / mCounts.total) * 100) : 0;`;

const newPctCalc = `  const totalPicksForCalc = globalActivePicksCount && globalActivePicksCount > 0 ? globalActivePicksCount : mCounts.total;
  const awayHotPct = totalPicksForCalc > 0 ? Math.round(((mCounts.away || 0) / totalPicksForCalc) * 100) : 0;
  const homeHotPct = totalPicksForCalc > 0 ? Math.round(((mCounts.home || 0) / totalPicksForCalc) * 100) : 0;

  const getHotBarClass = (pct: number) => {
    if (pct >= 50) return "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]";
    if (pct >= 25) return "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]";
    if (pct > 0) return "bg-blue-500";
    return "bg-zinc-700";
  };`;

content = content.replace(oldPctCalc, newPctCalc);

fs.writeFileSync(path, content);
