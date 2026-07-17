const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', 'utf8');

const importsToAdd = `import { Plus } from 'lucide-react';
`;
if (!code.includes('import { Plus }')) {
  code = code.replace("import { RefreshCw, Trash2 } from 'lucide-react';", "import { RefreshCw, Trash2, Plus } from 'lucide-react';");
}

const stateToAdd = `
  const [showPropModal, setShowPropModal] = useState(false);
  const [propTitle, setPropTitle] = useState('');
  const [propOptionA, setPropOptionA] = useState('');
  const [propOptionB, setPropOptionB] = useState('');
  const [propDate, setPropDate] = useState('');
`;
code = code.replace("const [matchupsLoading, setMatchupsLoading] = useState(false);", "const [matchupsLoading, setMatchupsLoading] = useState(false);" + stateToAdd);

const addPropFunction = `
  const handleAddProp = async () => {
    if (!id || !propTitle || !propOptionA || !propOptionB || !propDate) {
      alert('Please fill out all fields');
      return;
    }
    
    setMatchupsLoading(true);
    try {
      const matchId = \`\${id}_\${selectedWeek}_prop_\${Date.now()}\`;
      await setDoc(doc(db, 'pickemMatchups', matchId), {
        campaignId: id,
        week: selectedWeek,
        gameId: \`prop_\${Date.now()}\`,
        title: propTitle,
        type: 'PROP',
        startTime: new Date(propDate).getTime(),
        status: 'STATUS_SCHEDULED',
        statusDesc: 'Scheduled',
        awayTeam: { id: 'option_a', name: propOptionA, image: 'https://ui-avatars.com/api/?name=' + propOptionA[0] + '&background=random' },
        homeTeam: { id: 'option_b', name: propOptionB, image: 'https://ui-avatars.com/api/?name=' + propOptionB[0] + '&background=random' },
        createdAt: Date.now()
      });
      setShowPropModal(false);
      setPropTitle('');
      setPropOptionA('');
      setPropOptionB('');
      setPropDate('');
      fetchMatchups(selectedWeek);
    } catch (e) {
      console.error(e);
      alert('Failed to add prop');
    } finally {
      setMatchupsLoading(false);
    }
  };
`;
code = code.replace("const handleSyncMatchups = async () => {", addPropFunction + "\n  const handleSyncMatchups = async () => {");

const buttonToAdd = `
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowPropModal(true)} size="sm" variant="outline" className="gap-2">
               <Plus className="w-4 h-4" />
               Add Prop Matchup
            </Button>
            <Button onClick={handleSyncMatchups} size="sm" className="gap-2" disabled={matchupsLoading}>
               <RefreshCw className={\`w-4 h-4 \${matchupsLoading ? 'animate-spin' : ''}\`} />
               Sync Matchups
            </Button>
          </div>
`;
code = code.replace(/<Button onClick=\{handleSyncMatchups\}.*?<\/Button>/s, buttonToAdd);

const modalUI = `
      {showPropModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#18181A] rounded-xl border border-zinc-800 p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Add Custom Prop Matchup</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Prop Title / Question</label>
                <input type="text" value={propTitle} onChange={e => setPropTitle(e.target.value)} placeholder="e.g. First pitcher to 3 strikeouts" className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Option A</label>
                <input type="text" value={propOptionA} onChange={e => setPropOptionA(e.target.value)} placeholder="e.g. Gerrit Cole" className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Option B</label>
                <input type="text" value={propOptionB} onChange={e => setPropOptionB(e.target.value)} placeholder="e.g. Justin Verlander" className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Event Time</label>
                <input type="datetime-local" value={propDate} onChange={e => setPropDate(e.target.value)} className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-4 py-2 text-white [color-scheme:dark]" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6 justify-end">
              <Button variant="ghost" onClick={() => setShowPropModal(false)}>Cancel</Button>
              <Button onClick={handleAddProp}>Add Prop</Button>
            </div>
          </div>
        </div>
      )}
`;
code = code.replace("return (", "return (\n    <>" + modalUI);
code = code.replace("</div>\n    </div>\n  );\n}\n", "</div>\n    </div>\n    </>\n  );\n}\n");

fs.writeFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', code);
