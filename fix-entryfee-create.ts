import fs from 'fs';
let content = fs.readFileSync('src/pages/admin/pickem/PickEmCreateCampaign.tsx', 'utf-8');

// Add state
content = content.replace(
  "const [useTiebreaker, setUseTiebreaker] = useState<boolean>(false);",
  "const [useTiebreaker, setUseTiebreaker] = useState<boolean>(false);\n  const [entryFee, setEntryFee] = useState<number>(0);"
);

// Add to save
content = content.replace(
  "entryFee: 0,",
  "entryFee: entryFee,"
);

// Add to UI
content = content.replace(
  `          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Pick Limit Per Week</label>`,
  `          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Entry Fee (Link Coins)</label>
            <input
              type="number"
              value={entryFee}
              onChange={e => setEntryFee(Number(e.target.value))}
              className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white mb-4"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Pick Limit Per Week</label>`
);

fs.writeFileSync('src/pages/admin/pickem/PickEmCreateCampaign.tsx', content);
