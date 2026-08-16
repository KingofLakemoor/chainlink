const fs = require('fs');
const path = './src/pages/play/PlayDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "mCounts={matchupPickCounts[activeMatchup.gameId]}",
  "mCounts={matchupPickCounts[activeMatchup.gameId]}\n              globalActivePicksCount={globalUpcomingPicks.length}"
);

content = content.replace(
  "mCounts={matchupPickCounts[m.gameId]}",
  "mCounts={matchupPickCounts[m.gameId]}\n                globalActivePicksCount={globalUpcomingPicks.length}"
);

fs.writeFileSync(path, content);
