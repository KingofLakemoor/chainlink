const fs = require('fs');
let code = fs.readFileSync('src/pages/pickem/PickEmPage.tsx', 'utf8');

code = code.replace(/<button\s*onClick={\(\) => handlePick\(m, m.type === 'OVER_UNDER' \? 'OVER' : m\.awayTeam\.id\)}\s*disabled={isLocked}/g, 
`<button
onClick={() => handlePick(m, m.type === 'OVER_UNDER' ? 'OVER' : m.awayTeam.id)}
disabled={isLocked || (selectedCampaign?.format === 'SURVIVOR' && usedTeams.has(m.type === 'OVER_UNDER' ? 'OVER' : m.awayTeam.id))}
`);

code = code.replace(/<button\s*onClick={\(\) => handlePick\(m, m.type === 'OVER_UNDER' \? 'UNDER' : m\.homeTeam\.id\)}\s*disabled={isLocked}/g, 
`<button
onClick={() => handlePick(m, m.type === 'OVER_UNDER' ? 'UNDER' : m.homeTeam.id)}
disabled={isLocked || (selectedCampaign?.format === 'SURVIVOR' && usedTeams.has(m.type === 'OVER_UNDER' ? 'UNDER' : m.homeTeam.id))}
`);

// Add a badge indicating "USED"
code = code.replace(
`{type === 'WIN_BY' ? (hasVal ? \`Win by \${val}+\` : 'Win') : (hasVal ? \`W/D/Lose by \${val}\` : 'W/D/Lose')}
                                 </span>
                               );
                            })()}
                          </div>
                        </div>`, 
`{type === 'WIN_BY' ? (hasVal ? \`Win by \${val}+\` : 'Win') : (hasVal ? \`W/D/Lose by \${val}\` : 'W/D/Lose')}
                                 </span>
                               );
                            })()}
                          </div>
                          {(selectedCampaign?.format === 'SURVIVOR' && usedTeams.has(m.type === 'OVER_UNDER' ? 'OVER' : m.awayTeam.id)) && <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded">USED</span>}
                        </div>`);

code = code.replace(
`{type === 'WIN_BY' ? (hasVal ? \`Win by \${val}+\` : 'Win') : (hasVal ? \`W/D/Lose by \${val}\` : 'W/D/Lose')}
                                 </span>
                               );
                            })()}
                          </div>
                        </div>
                        {pick?.pick.teamId === (m.type === 'OVER_UNDER' ? 'UNDER' : m.homeTeam.id)`, 
`{type === 'WIN_BY' ? (hasVal ? \`Win by \${val}+\` : 'Win') : (hasVal ? \`W/D/Lose by \${val}\` : 'W/D/Lose')}
                                 </span>
                               );
                            })()}
                          </div>
                          {(selectedCampaign?.format === 'SURVIVOR' && usedTeams.has(m.type === 'OVER_UNDER' ? 'UNDER' : m.homeTeam.id)) && <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded">USED</span>}
                        </div>
                        {pick?.pick.teamId === (m.type === 'OVER_UNDER' ? 'UNDER' : m.homeTeam.id)`);


fs.writeFileSync('src/pages/pickem/PickEmPage.tsx', code);
