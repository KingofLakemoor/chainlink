const fs = require('fs');
const path = './src/pages/pickem/PickEmPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `                            const matchup = matchups.find((m: any) => m.id === pick.matchupId);
                            if (!matchup || matchup.status === 'STATUS_SCHEDULED') return null;`;

const replace = `                            const matchup = matchups.find((m: any) => m.id === pick.matchupId);
                            if (!matchup) return null;
                            
                            const isMyPick = participant.uid === user?.uid;
                            const isRevealed = matchup.status !== 'STATUS_SCHEDULED';
                            
                            if (!isRevealed && !isMyPick) {
                                return (
                                  <div key={pick.id} className="w-8 h-8 rounded-full border-2 border-zinc-600 overflow-hidden bg-zinc-800 flex items-center justify-center flex-shrink-0" title="Pick Hidden (Game not started)">
                                    <span className="text-zinc-400 font-bold text-xs">?</span>
                                  </div>
                                );
                            }`;

content = content.replace(target, replace);
fs.writeFileSync(path, content);
