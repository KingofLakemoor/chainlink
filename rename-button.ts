import fs from 'fs';
let content = fs.readFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', 'utf-8');
content = content.replace(
  '<Button onClick={updateCurrentWeek} variant="secondary">Update Campaign</Button>',
  '<Button onClick={handleSaveCampaign} variant="secondary">Save Week Selection</Button>'
);
fs.writeFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', content);
