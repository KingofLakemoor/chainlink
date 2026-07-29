const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/pickem/PickEmCreateCampaign.tsx', 'utf-8');

// Add state
const newStates = `  const [visibleDateStr, setVisibleDateStr] = useState(() => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [gamesBeginDateStr, setGamesBeginDateStr] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });`;

code = code.replace(
  "  const [startDateStr, setStartDateStr] = useState(() => {",
  newStates + "\n  const [startDateStr, setStartDateStr] = useState(() => {"
);

// Add to addDoc
code = code.replace(
  "startDate: startDateStr ? new Date(startDateStr).getTime() || Date.now() : Date.now(),",
  "visibleDate: visibleDateStr ? new Date(visibleDateStr).getTime() || Date.now() : Date.now(),\n        gamesBeginDate: gamesBeginDateStr ? new Date(gamesBeginDateStr).getTime() || Date.now() : Date.now(),\n        startDate: startDateStr ? new Date(startDateStr).getTime() || Date.now() : Date.now(),"
);

// Add to UI
const uiInputs = `              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Visible Date (When users can see and sign up)</label>
                <input
                  type="datetime-local"
                  value={visibleDateStr}
                  onChange={e => setVisibleDateStr(e.target.value)}
                  className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Games Begin Date</label>
                <input
                  type="datetime-local"
                  value={gamesBeginDateStr}
                  onChange={e => setGamesBeginDateStr(e.target.value)}
                  className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
                  required
                />
              </div>`;

code = code.replace(
  `            <h3 className="text-lg font-medium text-white mb-4">Campaign Schedule</h3>\n            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">`,
  `            <h3 className="text-lg font-medium text-white mb-4">Campaign Schedule</h3>\n            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">\n${uiInputs}`
);

fs.writeFileSync('src/pages/admin/pickem/PickEmCreateCampaign.tsx', code);
