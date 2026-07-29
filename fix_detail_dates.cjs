const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', 'utf-8');

const newStates = `  const [visibleDateStr, setVisibleDateStr] = useState('');
  const [gamesBeginDateStr, setGamesBeginDateStr] = useState('');`;

code = code.replace(
  "  const [startDateStr, setStartDateStr] = useState('');",
  newStates + "\n  const [startDateStr, setStartDateStr] = useState('');"
);

code = code.replace(
  "if (data.startDate) {",
  `if (data.visibleDate) {
          const d = new Date(data.visibleDate);
          setVisibleDateStr(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
        }
        if (data.gamesBeginDate) {
          const d = new Date(data.gamesBeginDate);
          setGamesBeginDateStr(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
        }
        if (data.startDate) {`
);

code = code.replace(
  "startDate: startDateStr ? new Date(startDateStr).getTime() || campaign.startDate || Date.now() : campaign.startDate || Date.now(),",
  `visibleDate: visibleDateStr ? new Date(visibleDateStr).getTime() || campaign.visibleDate || Date.now() : campaign.visibleDate || Date.now(),
        gamesBeginDate: gamesBeginDateStr ? new Date(gamesBeginDateStr).getTime() || campaign.gamesBeginDate || Date.now() : campaign.gamesBeginDate || Date.now(),
        startDate: startDateStr ? new Date(startDateStr).getTime() || campaign.startDate || Date.now() : campaign.startDate || Date.now(),`
);

const uiInputs = `              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Visible Date</label>
                <input
                  type="datetime-local"
                  value={visibleDateStr}
                  onChange={e => setVisibleDateStr(e.target.value)}
                  className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Games Begin Date</label>
                <input
                  type="datetime-local"
                  value={gamesBeginDateStr}
                  onChange={e => setGamesBeginDateStr(e.target.value)}
                  className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
                />
              </div>`;

code = code.replace(
  `<h3 className="text-lg font-medium text-white mb-4">Campaign Schedule</h3>\n            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">`,
  `<h3 className="text-lg font-medium text-white mb-4">Campaign Schedule</h3>\n            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">\n${uiInputs}`
);

fs.writeFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', code);
