const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', 'utf8');

if (!code.includes('format: e.target.value')) {
    const formatHtml = `
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Campaign Format</label>
              <select
                value={campaign.format || 'STANDARD'}
                onChange={e => setCampaign({ ...campaign, format: e.target.value })}
                className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
              >
                <option value="STANDARD">Standard</option>
                <option value="SURVIVOR">Survivor Mode</option>
                <option value="CONFIDENCE">Confidence Points</option>
              </select>
            </div>
`;
    // Find Total Weeks in Campaign and insert before it
    code = code.replace(`<div>\n              <label className="block text-sm font-medium text-zinc-400 mb-1">Total Weeks in Campaign</label>`, formatHtml + `<div>\n              <label className="block text-sm font-medium text-zinc-400 mb-1">Total Weeks in Campaign</label>`);
    fs.writeFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', code);
}
