const fs = require('fs');
const file = 'src/pages/admin/pickem/PickEmCampaignDetail.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add state
code = code.replace(
  `const [weekGamesBeginDateStr, setWeekGamesBeginDateStr] = useState('');`,
  `const [weekGamesBeginDateStr, setWeekGamesBeginDateStr] = useState('');\n  const [weekLabel, setWeekLabel] = useState('');`
);

// 2. Add to useEffect
code = code.replace(
  `const currentWS = ws[selectedWeek] || {};`,
  `const currentWS = ws[selectedWeek] || {};\n      setWeekLabel(currentWS.label || '');`
);

// 3. Add to updateCurrentWeek
code = code.replace(
  `gamesBeginDate: weekGamesBeginDateStr ? new Date(weekGamesBeginDateStr).getTime() : null,`,
  `label: weekLabel,\n          gamesBeginDate: weekGamesBeginDateStr ? new Date(weekGamesBeginDateStr).getTime() : null,`
);

// 4. Add to UI
const targetUI = `<label className="block text-sm font-medium text-zinc-400 mb-1">Week {selectedWeek} Sync Start Boundary (Optional)</label>`;
const replUI = `<div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Week {selectedWeek} Display Label (Optional)</label>
              <input
                type="text"
                value={weekLabel}
                onChange={e => setWeekLabel(e.target.value)}
                placeholder="e.g. Preseason Week 2"
                className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm mb-4"
              />
            </div>\n            <label className="block text-sm font-medium text-zinc-400 mb-1">Week {selectedWeek} Sync Start Boundary (Optional)</label>`;
code = code.replace(targetUI, replUI);

fs.writeFileSync(file, code);
console.log("Patched PickEmCampaignDetail.tsx");
