const fs = require('fs');
const file = 'src/pages/pickem/PickEmPage.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetDropdown = `          <select
            value={selectedWeek}
            onChange={e => setSelectedWeek(Number(e.target.value))}
            className="bg-[#121212] border border-zinc-800 rounded-xl px-4 py-3 text-white text-lg font-medium"
          >
            {[...Array(selectedCampaign?.totalWeeks || 18)].map((_, i) => (
              <option key={i+1} value={i+1}>Week {i+1}</option>
            ))}
          </select>`;

const replDropdown = `          <select
            value={selectedWeek}
            onChange={e => setSelectedWeek(Number(e.target.value))}
            className="bg-[#121212] border border-zinc-800 rounded-xl px-4 py-3 text-white text-lg font-medium"
          >
            {[...Array(selectedCampaign?.totalWeeks || 18)].map((_, i) => {
              const weekNum = i + 1;
              const customLabel = selectedCampaign?.weekSettings?.[weekNum]?.label;
              return (
                <option key={weekNum} value={weekNum}>
                  {customLabel ? customLabel : \`Week \${weekNum}\`}
                </option>
              );
            })}
          </select>`;

code = code.replace(targetDropdown, replDropdown);

// Ensure the "Week X" text below the tabs also shows the label if present
const targetHeader = `<h2 className="text-xl font-bold text-white mb-6">Week {selectedWeek} Matchups</h2>`;
const replHeader = `<h2 className="text-xl font-bold text-white mb-6">{selectedCampaign?.weekSettings?.[selectedWeek]?.label || \`Week \${selectedWeek}\`} Matchups</h2>`;
code = code.replace(targetHeader, replHeader);

fs.writeFileSync(file, code);
console.log("Patched PickEmPage.tsx");
