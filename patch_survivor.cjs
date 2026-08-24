const fs = require('fs');
let code = fs.readFileSync('src/pages/pickem/PickEmPage.tsx', 'utf8');

// Add isEliminated state
code = code.replace("const [joining, setJoining] = useState(false);", "const [joining, setJoining] = useState(false);\n  const [isEliminated, setIsEliminated] = useState(false);");

// Inside fetchUserPicks
const fetchUserPicksLogic = `
        const picksDict: Record<string, any> = {};
        let eliminated = false;
        
        snap.docs.forEach(d => {
           const p = { id: d.id, ...d.data() };
           
           if (p.status === 'LOSS') eliminated = true;
           
           if (p.week === selectedWeek) {
             picksDict[p.matchupId] = p;
           }
        });
        
        setIsEliminated(eliminated);
        setUserPicks(picksDict);
`;
code = code.replace(/const picksDict: Record<string, any> = {};\s*snap\.docs\.forEach[\s\S]*?setUserPicks\(picksDict\);/, fetchUserPicksLogic);

// Add elimination banner
const bannerHtml = `
      {isEliminated && selectedCampaign?.format === 'SURVIVOR' && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-center font-medium mb-6">
           <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
           You have been eliminated from this Survivor campaign due to an incorrect pick. Better luck next year!
        </div>
      )}
`;
code = code.replace('<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">', bannerHtml + '\n      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">');

// Prevent picking if eliminated
code = code.replace("if (matchup.status !== 'STATUS_SCHEDULED'", "if (isEliminated && selectedCampaign.format === 'SURVIVOR') return;\n    if (matchup.status !== 'STATUS_SCHEDULED'");
// For clear pick too
code = code.replace("const handleClearPick = async (matchup: any) => {", "const handleClearPick = async (matchup: any) => {\n    if (isEliminated && selectedCampaign?.format === 'SURVIVOR') return;");

fs.writeFileSync('src/pages/pickem/PickEmPage.tsx', code);
