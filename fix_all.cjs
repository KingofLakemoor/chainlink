const fs = require('fs');

// PickEmCreateCampaign
let code = fs.readFileSync('src/pages/admin/pickem/PickEmCreateCampaign.tsx', 'utf8');
code = code.replace("defaultMatchType,\n      format,", "defaultMatchType,");
fs.writeFileSync('src/pages/admin/pickem/PickEmCreateCampaign.tsx', code);

// PickEmPage
let code2 = fs.readFileSync('src/pages/pickem/PickEmPage.tsx', 'utf8');
// Fix the missing div
code2 = code2.replace(
`          <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-[#18181A]">
            <h3 className="font-bold text-lg text-white">Leaderboard</h3>`,
`<div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-[#18181A]">
            <h3 className="font-bold text-lg text-white">Leaderboard</h3>`);
fs.writeFileSync('src/pages/pickem/PickEmPage.tsx', code2);

