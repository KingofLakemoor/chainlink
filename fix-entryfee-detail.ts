import fs from 'fs';
let content = fs.readFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', 'utf-8');

// Add state
content = content.replace(
  "const [useTiebreaker, setUseTiebreaker] = useState<boolean>(false);",
  "const [useTiebreaker, setUseTiebreaker] = useState<boolean>(false);\n  const [entryFee, setEntryFee] = useState<number>(0);"
);

// Add init
content = content.replace(
  "setUseTiebreaker(data.useTiebreaker || false);",
  "setUseTiebreaker(data.useTiebreaker || false);\n        setEntryFee(data.entryFee || 0);"
);

// Add to save
content = content.replace(
  "useTiebreaker, ",
  "useTiebreaker, \n        entryFee: entryFee,"
);

// Add to UI
content = content.replace(
  `                <div className="flex items-center gap-3 bg-[#18181A] p-3 rounded-lg border border-zinc-800">
                  <input type="checkbox" checked={hasWeekZero} onChange={e => setHasWeekZero(e.target.checked)} className="w-5 h-5" />`,
  `                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Entry Fee (Link Coins)</label>
                  <input type="number" value={entryFee} onChange={e => setEntryFee(Number(e.target.value))} className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white" min="0" />
                </div>
                
                <div className="flex items-center gap-3 bg-[#18181A] p-3 rounded-lg border border-zinc-800">
                  <input type="checkbox" checked={hasWeekZero} onChange={e => setHasWeekZero(e.target.checked)} className="w-5 h-5" />`
);

fs.writeFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', content);
