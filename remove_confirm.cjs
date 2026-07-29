const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', 'utf-8');

code = code.replace(
  "if (!confirm(`Sync ${leaguesToSync.join(', ')} matchups for Week ${selectedWeek}?`)) return;",
  "// confirm removed"
);

fs.writeFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', code);
