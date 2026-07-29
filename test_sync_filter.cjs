const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', 'utf-8');

code = code.replace(
  "if (campaign.gamesBeginDate && m.startTime < campaign.gamesBeginDate) {",
  "console.log('Game', m.title, new Date(m.startTime).toLocaleString(), 'vs bounds:', campaign.gamesBeginDate ? new Date(campaign.gamesBeginDate).toLocaleString() : null, campaign.endDate ? new Date(campaign.endDate).toLocaleString() : null);\n          if (campaign.gamesBeginDate && m.startTime < campaign.gamesBeginDate) {"
);

fs.writeFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', code);
