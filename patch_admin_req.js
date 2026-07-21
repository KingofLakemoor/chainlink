import fs from 'fs';
let content = fs.readFileSync('src/pages/admin/prize/PrizeAdminPage.tsx', 'utf8');

const targetInput = `        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Referrals Requirement (0 to disable)</label>
          <input
            type="number"
            value={prizeData.referralsRequirement || 0}
            onChange={(e) => setPrizeData({...prizeData, referralsRequirement: parseInt(e.target.value) || 0})}
            className="w-full bg-[#1a1a1a] border border-[#3f3f46] rounded-lg px-4 py-2 text-zinc-100"
          />
        </div>`;

content = content.replace(targetInput, "");
fs.writeFileSync('src/pages/admin/prize/PrizeAdminPage.tsx', content);
