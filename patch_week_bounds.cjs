const fs = require('fs');
const file = 'src/pages/admin/pickem/PickEmCampaignDetail.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `<div className="flex items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Manage Week</label>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              className="bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
            >
              {[...Array(totalWeeks)].map((_, i) => (
                <option key={i+1} value={i+1}>Week {i+1}</option>
              ))}
            </select>
          </div>
          <Button onClick={updateCurrentWeek} variant="secondary">Update Campaign</Button>
        </div>`;

const repl = `<div className="flex flex-col gap-4">
          <div className="flex items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Manage Week</label>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                className="bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
              >
                {[...Array(totalWeeks)].map((_, i) => (
                  <option key={i+1} value={i+1}>Week {i+1}</option>
                ))}
              </select>
            </div>
            <Button onClick={updateCurrentWeek} variant="secondary">Update Campaign</Button>
          </div>
          <div className="flex flex-wrap items-end gap-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Week {selectedWeek} Sync Start Boundary (Optional)</label>
              <input
                type="datetime-local"
                value={weekGamesBeginDateStr}
                onChange={e => setWeekGamesBeginDateStr(e.target.value)}
                className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Week {selectedWeek} Sync End Boundary (Optional)</label>
              <input
                type="datetime-local"
                value={weekEndDateStr}
                onChange={e => setWeekEndDateStr(e.target.value)}
                className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm"
              />
            </div>
            <div className="text-xs text-zinc-500 max-w-sm ml-2">
              These bounds determine which games are fetched when clicking "Sync Matchups" for this specific week. (Don't forget to click 'Save All Settings' below after editing).
            </div>
          </div>
        </div>`;

if (code.includes(target)) {
  code = code.replace(target, repl);
  fs.writeFileSync(file, code);
  console.log("Patched PickEmCampaignDetail with week settings UI!");
} else {
  console.log("Could not find target in PickEmCampaignDetail.");
}
