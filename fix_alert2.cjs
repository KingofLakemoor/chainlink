const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', 'utf-8');

code = code.replace(
  "alert(`No games found. API returned ${res.data?.length || 0} games, but all were filtered out by date bounds (Games Begin: ${campaign.gamesBeginDate ? new Date(campaign.gamesBeginDate).toLocaleString() : 'N/A'}, End: ${campaign.endDate ? new Date(campaign.endDate).toLocaleString() : 'N/A'}).`);",
  "alert(`No games found. They may have been filtered out by date bounds (Games Begin: ${campaign.gamesBeginDate ? new Date(campaign.gamesBeginDate).toLocaleString() : 'N/A'}, End: ${campaign.endDate ? new Date(campaign.endDate).toLocaleString() : 'N/A'}).`);"
);

fs.writeFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', code);
