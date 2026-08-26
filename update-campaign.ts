import fs from 'fs';

let content = fs.readFileSync('src/pages/admin/pickem/PickEmCreateCampaign.tsx', 'utf-8');
content = content.replace(
  '<option value="SPREAD">Against the Spread (ATS)</option>',
  '<option value="SPREAD">Against the Spread (ATS)</option>\n              <option value="BOTH">Moneyline/ATS (Use Spread if available)</option>'
);
fs.writeFileSync('src/pages/admin/pickem/PickEmCreateCampaign.tsx', content);

content = fs.readFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', 'utf-8');
content = content.replace(
  'type: campaign.defaultMatchType || "STANDARD",',
  'type: campaign.defaultMatchType === "BOTH" ? (metadataToSave?.spread !== undefined ? "SPREAD" : "STANDARD") : (campaign.defaultMatchType || "STANDARD"),'
);
fs.writeFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', content);

content = fs.readFileSync('src/pages/pickem/PickEmLandingPage.tsx', 'utf-8');
content = content.replace(
  "c.defaultMatchType === 'SPREAD' ? 'ATS' : 'Moneyline'",
  "c.defaultMatchType === 'SPREAD' ? 'ATS' : c.defaultMatchType === 'BOTH' ? 'Moneyline/ATS' : 'Moneyline'"
);
content = content.replace(
  "selectedPublicCamp.defaultMatchType === 'SPREAD' ? 'ATS' : 'Moneyline'",
  "selectedPublicCamp.defaultMatchType === 'SPREAD' ? 'ATS' : selectedPublicCamp.defaultMatchType === 'BOTH' ? 'Moneyline/ATS' : 'Moneyline'"
);
fs.writeFileSync('src/pages/pickem/PickEmLandingPage.tsx', content);
