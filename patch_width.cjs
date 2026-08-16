const fs = require('fs');
const path = './src/components/ui/MatchupCard.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.split('style={{ width: `${awayHotPct}%` }}').join('style={{ width: `${Math.max(awayHotPct, awayHotPct > 0 ? 5 : 0)}%` }}');
content = content.split('style={{ width: `${homeHotPct}%` }}').join('style={{ width: `${Math.max(homeHotPct, homeHotPct > 0 ? 5 : 0)}%` }}');

fs.writeFileSync(path, content);
