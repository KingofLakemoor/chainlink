import fs from 'fs';
let content = fs.readFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', 'utf-8');
const oldText = `<Button variant="ghost" onClick={() => navigate('/admin/pickem')}>Back</Button>`;
const newText = `<div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/admin/pickem')}>Back</Button>
          <Button onClick={handleSaveCampaign} className="bg-purple-600 hover:bg-purple-500 text-white font-bold">Save All Settings</Button>
        </div>`;
content = content.replace(oldText, newText);
fs.writeFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', content);
