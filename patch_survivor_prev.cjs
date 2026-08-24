const fs = require('fs');
let code = fs.readFileSync('src/pages/pickem/PickEmPage.tsx', 'utf8');

code = code.replace("const [isEliminated, setIsEliminated] = useState(false);", "const [isEliminated, setIsEliminated] = useState(false);\n  const [usedTeams, setUsedTeams] = useState<Set<string>>(new Set());");

const newFetchLogic = `
        const picksDict: Record<string, any> = {};
        let eliminated = false;
        const used = new Set<string>();
        
        snap.docs.forEach(d => {
           const p = { id: d.id, ...d.data() };
           
           if (p.status === 'LOSS') eliminated = true;
           
           if (p.pick?.teamId) {
             // Only count as used if it's from a previous week
             if (p.week !== selectedWeek) {
                 used.add(p.pick.teamId);
             }
           }
           
           if (p.week === selectedWeek) {
             picksDict[p.matchupId] = p;
           }
        });
        
        setIsEliminated(eliminated);
        setUsedTeams(used);
        setUserPicks(picksDict);
`;
code = code.replace(/const picksDict: Record<string, any> = {};[\s\S]*?setUserPicks\(picksDict\);/, newFetchLogic);

code = code.replace("if (isEliminated && selectedCampaign.format === 'SURVIVOR') return;", 
"if (isEliminated && selectedCampaign.format === 'SURVIVOR') return;\n    if (selectedCampaign.format === 'SURVIVOR' && usedTeams.has(teamId)) {\n       alert('You have already picked this team in a previous week!');\n       return;\n    }");

fs.writeFileSync('src/pages/pickem/PickEmPage.tsx', code);
