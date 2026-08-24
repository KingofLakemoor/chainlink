const fs = require('fs');
let code = fs.readFileSync('src/pages/pickem/PickEmPage.tsx', 'utf8');

// We add a tiebreaker input to the matchup card if it's a tiebreaker
const tiebreakerHtml = `
                      {m.isTiebreaker && pick && (
                        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                           <label className="block text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">Tiebreaker Matchup</label>
                           <p className="text-zinc-400 text-sm mb-2">Predict the total combined score for this game.</p>
                           <input
                             type="number"
                             min="0"
                             placeholder="Total Score (e.g. 45)"
                             value={pick.tiebreakerTotal || ''}
                             onChange={(e) => handleTiebreakerChange(m, parseInt(e.target.value) || 0)}
                             disabled={isLocked}
                             className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white disabled:opacity-50"
                           />
                        </div>
                      )}
`;

code = code.replace("{pick && !isLocked && (", tiebreakerHtml + "\n                      {pick && !isLocked && (");

const handleTiebreaker = `
  const handleTiebreakerChange = async (matchup: any, total: number) => {
    if (!user || !selectedCampaign || isNaN(total)) return;
    try {
      const pickId = userPicks[matchup.id]?.id;
      if (!pickId) return;
      await updateDoc(doc(db, 'pickemPicks', pickId), { tiebreakerTotal: total });
      setUserPicks(prev => ({
        ...prev,
        [matchup.id]: { ...prev[matchup.id], tiebreakerTotal: total }
      }));
    } catch (e) {
      console.error("Failed to update tiebreaker", e);
    }
  };
`;
code = code.replace("const handleClearPick = async", handleTiebreaker + "\n  const handleClearPick = async");

// Also add a "Week View" toggle for Leaderboard
// We currently have {activeTab === 'leaderboard' && ( ... )}
// inside we can add a toggle

const toggleHtml = `
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-[#18181A]">
            <h3 className="font-bold text-lg text-white">Leaderboard</h3>
            <div className="flex bg-zinc-800 rounded-lg p-1">
              <button
                onClick={() => setLeaderboardView('season')}
                className={\`px-4 py-1.5 text-sm font-medium rounded-md transition-colors \${leaderboardView === 'season' ? 'bg-[#121212] text-white shadow-sm' : 'text-zinc-400 hover:text-white'}\`}
              >
                Season
              </button>
              <button
                onClick={() => setLeaderboardView('week')}
                className={\`px-4 py-1.5 text-sm font-medium rounded-md transition-colors \${leaderboardView === 'week' ? 'bg-[#121212] text-white shadow-sm' : 'text-zinc-400 hover:text-white'}\`}
              >
                Week {selectedWeek}
              </button>
            </div>
          </div>
`;
code = code.replace('<div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden">\n          {leaderboardLoading ? (', toggleHtml + '\n          {leaderboardLoading ? (');

code = code.replace("const [activeTab, setActiveTab] = useState<'picks' | 'leaderboard'>('picks');", "const [activeTab, setActiveTab] = useState<'picks' | 'leaderboard'>('picks');\n  const [leaderboardView, setLeaderboardView] = useState<'season' | 'week'>('season');");

fs.writeFileSync('src/pages/pickem/PickEmPage.tsx', code);
