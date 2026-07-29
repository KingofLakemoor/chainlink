const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/pickem/PickEmCreateCampaign.tsx', 'utf-8');

// Add totalWeeks state
code = code.replace(
  "const [pickLimit, setPickLimit] = useState<number>(0);",
  "const [pickLimit, setPickLimit] = useState<number>(0);\n  const [totalWeeks, setTotalWeeks] = useState<number>(18);"
);

// Add totalWeeks to addDoc
code = code.replace(
  "pickLimit: pickLimit,",
  "pickLimit: pickLimit,\n        totalWeeks: totalWeeks,"
);

// Add the UI input for totalWeeks
const uiInput = `          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Total Weeks in Campaign</label>
            <input
              type="number"
              min="1"
              value={totalWeeks}
              onChange={e => setTotalWeeks(parseInt(e.target.value) || 1)}
              className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
            />
          </div>`;

code = code.replace(
  "{/* Campaign Schedule */}",
  uiInput + "\n\n          {/* Campaign Schedule */}"
);

fs.writeFileSync('src/pages/admin/pickem/PickEmCreateCampaign.tsx', code);
