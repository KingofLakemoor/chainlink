const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', 'utf-8');

code = code.replace(
  /if \(campaign\.startDate && m\.startTime < campaign\.startDate\) \{[\s\S]*?continue;\n          \}/g,
  `if (campaign.gamesBeginDate && m.startTime < campaign.gamesBeginDate) {
            continue;
          }`
);

fs.writeFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', code);
