const fs = require('fs');
let code = fs.readFileSync('src/pages/pickem/PickEmPage.tsx', 'utf8');

const confidenceHtml = `
                      {selectedCampaign?.format === 'CONFIDENCE' && pick && (
                        <div className="mt-4 p-3 bg-[#18181A] border border-zinc-800 rounded-lg">
                           <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Confidence Points</label>
                           <p className="text-zinc-500 text-sm mb-2">Assign points to this pick (e.g. 1 to 10)</p>
                           <input
                             type="number"
                             min="1"
                             placeholder="Points"
                             value={pick.confidence || ''}
                             onChange={async (e) => {
                               const conf = parseInt(e.target.value) || 1;
                               if (!userPicks[m.id]?.id) return;
                               await updateDoc(doc(db, 'pickemPicks', userPicks[m.id].id), { confidence: conf, pointsEarned: conf });
                               setUserPicks(prev => ({
                                 ...prev,
                                 [m.id]: { ...prev[m.id], confidence: conf }
                               }));
                             }}
                             disabled={isLocked}
                             className="w-full bg-[#121212] border border-zinc-700 rounded-lg px-4 py-2 text-white disabled:opacity-50"
                           />
                        </div>
                      )}
`;

code = code.replace("{pick && !isLocked && (", confidenceHtml + "\n                      {pick && !isLocked && (");

fs.writeFileSync('src/pages/pickem/PickEmPage.tsx', code);
