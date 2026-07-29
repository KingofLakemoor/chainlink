const fs = require('fs');

// Fix Create Campaign
let createCode = fs.readFileSync('src/pages/admin/pickem/PickEmCreateCampaign.tsx', 'utf-8');
// Remove startDateStr input block
createCode = createCode.replace(
  /<div>\s*<label className="block text-sm font-medium text-zinc-400 mb-1">Start Date<\/label>[\s\S]*?<\/div>/,
  ""
);
// Make startDate equal to visibleDate to avoid breaking any legacy references
createCode = createCode.replace(
  "startDate: startDateStr ? new Date(startDateStr).getTime() || Date.now() : Date.now(),",
  "startDate: visibleDateStr ? new Date(visibleDateStr).getTime() || Date.now() : Date.now(),"
);
fs.writeFileSync('src/pages/admin/pickem/PickEmCreateCampaign.tsx', createCode);

// Fix Campaign Detail
let detailCode = fs.readFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', 'utf-8');
// Remove startDateStr input block
detailCode = detailCode.replace(
  /<div>\s*<label className="block text-sm font-medium text-zinc-400 mb-1">Start Date<\/label>[\s\S]*?<\/div>/,
  ""
);
// Make startDate equal to visibleDate to avoid breaking any legacy references
detailCode = detailCode.replace(
  "startDate: startDateStr ? new Date(startDateStr).getTime() || campaign.startDate || Date.now() : campaign.startDate || Date.now(),",
  "startDate: visibleDateStr ? new Date(visibleDateStr).getTime() || campaign.visibleDate || Date.now() : campaign.visibleDate || Date.now(),"
);
fs.writeFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', detailCode);
