const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', 'utf-8');

code = code.replace(
  /for \(const m of res\.data\) \{[\s\S]*?const pickemMatchupId =/g,
  `for (const m of res.data) {
          if (campaign.gamesBeginDate && m.startTime < campaign.gamesBeginDate) {
            continue;
          }
          if (campaign.endDate && m.startTime > campaign.endDate) {
            continue;
          }

          const pickemMatchupId =`
);

fs.writeFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', code);
