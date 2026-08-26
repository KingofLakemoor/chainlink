import fs from 'fs';
let content = fs.readFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', 'utf-8');
content = content.replace(
  'type: campaign.defaultMatchType === "BOTH" ? (metadataToSave?.spread !== undefined ? "SPREAD" : "STANDARD") : (campaign.defaultMatchType || "STANDARD"),',
  'type: campaign.defaultMatchType === "BOTH" ? ((metadataToSave?.spread !== undefined && metadataToSave?.spread !== null) ? "SPREAD" : "STANDARD") : (campaign.defaultMatchType || "STANDARD"),'
);
fs.writeFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', content);
