import fs from 'fs';
let content = fs.readFileSync('src/pages/admin/prize/PrizeAdminPage.tsx', 'utf8');

const targetState = `    activeUsersRequirement: 25,
    picksRequirement: 375,`;

const replacementState = `    activeUsersRequirement: 25,
    picksRequirement: 375,
    referralsRequirement: 0,`;

content = content.replace(targetState, replacementState);

const targetInput = `        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Global Picks Requirement</label>
          <input
            type="number"
            value={prizeData.picksRequirement}
            onChange={(e) => setPrizeData({...prizeData, picksRequirement: parseInt(e.target.value) || 0})}
            className="w-full bg-[#1a1a1a] border border-[#3f3f46] rounded-lg px-4 py-2 text-zinc-100"
          />
        </div>`;

const replacementInput = `        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Global Picks Requirement</label>
          <input
            type="number"
            value={prizeData.picksRequirement}
            onChange={(e) => setPrizeData({...prizeData, picksRequirement: parseInt(e.target.value) || 0})}
            className="w-full bg-[#1a1a1a] border border-[#3f3f46] rounded-lg px-4 py-2 text-zinc-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Referrals Requirement (0 to disable)</label>
          <input
            type="number"
            value={prizeData.referralsRequirement || 0}
            onChange={(e) => setPrizeData({...prizeData, referralsRequirement: parseInt(e.target.value) || 0})}
            className="w-full bg-[#1a1a1a] border border-[#3f3f46] rounded-lg px-4 py-2 text-zinc-100"
          />
        </div>`;

content = content.replace(targetInput, replacementInput);

const targetWinCondition = `<option value="Highest Win Percentage">Highest Win Percentage</option>`;
const replacementWinCondition = `<option value="Highest Win Percentage">Highest Win Percentage</option>
            <option value="Most Referrals">Most Referrals</option>`;
            
content = content.replace(targetWinCondition, replacementWinCondition);

fs.writeFileSync('src/pages/admin/prize/PrizeAdminPage.tsx', content);
console.log("Patched admin page");
