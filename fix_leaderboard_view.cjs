const fs = require('fs');
let code = fs.readFileSync('src/pages/pickem/PickEmPage.tsx', 'utf8');

code = code.replace("if (!selectedCampaign || activeTab !== 'leaderboard') return;", 
"if (!selectedCampaign || activeTab !== 'leaderboard') return;");

code = code.replace("participantStats[pId].picks.push(pick);", 
"participantStats[pId].picks.push(pick);\n          if (leaderboardView === 'week' && pick.week !== selectedWeek) return;");

code = code.replace("}, [selectedCampaign, activeTab]);", "}, [selectedCampaign, activeTab, leaderboardView, selectedWeek]);");

fs.writeFileSync('src/pages/pickem/PickEmPage.tsx', code);
