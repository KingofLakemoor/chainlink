const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', 'utf-8');

// Add totalWeeks state
code = code.replace(
  "const [endDateStr, setEndDateStr] = useState('');",
  "const [endDateStr, setEndDateStr] = useState('');\n  const [totalWeeks, setTotalWeeks] = useState<number>(18);"
);

// Add to fetchCampaign
code = code.replace(
  "setSelectedWeek(data.currentWeek || 1);",
  "setSelectedWeek(data.currentWeek || 1);\n        setTotalWeeks(data.totalWeeks || 18);"
);

// Add to updateCurrentWeek
code = code.replace(
  "currentWeek: selectedWeek,",
  "currentWeek: selectedWeek,\n        totalWeeks: totalWeeks,"
);
code = code.replace(
  "setCampaign(prev => ({ ...prev, currentWeek: selectedWeek, theme:",
  "setCampaign(prev => ({ ...prev, currentWeek: selectedWeek, totalWeeks, theme:"
);

// Add the input to the UI
const uiInput = `              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Total Weeks</label>
                <input
                  type="number"
                  min="1"
                  value={totalWeeks}
                  onChange={e => setTotalWeeks(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
                />
              </div>`;

code = code.replace(
  `<h3 className="text-lg font-medium text-white mb-4">Campaign Schedule</h3>\n            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">`,
  `<h3 className="text-lg font-medium text-white mb-4">Campaign Schedule</h3>\n            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">\n${uiInput}`
);

fs.writeFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', code);
