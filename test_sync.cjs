const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', 'utf-8');

code = code.replace(
  "if (!res.data || res.data.length === 0) {",
  "console.log('API returned games:', res.data?.length);\n        if (!res.data || res.data.length === 0) {"
);

code = code.replace(
  "if (campaign.startDate && m.startTime < campaign.startDate) {",
  "console.log('Game', m.title, 'startTime:', new Date(m.startTime).toLocaleString(), 'campaignStart:', new Date(campaign.startDate).toLocaleString());\n          if (campaign.gamesBeginDate && m.startTime < campaign.gamesBeginDate) {\n            console.log('Skipped due to gamesBeginDate');\n            continue;\n          }\n          if (campaign.startDate && m.startTime < campaign.startDate) {"
);

fs.writeFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', code);
