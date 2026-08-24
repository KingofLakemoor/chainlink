const fs = require('fs');
let code = fs.readFileSync('src/pages/pickem/PickEmPage.tsx', 'utf8');

code = code.replace('<th className="px-6 py-4 font-medium text-center">W-L-P</th>',
'<th className="px-6 py-4 font-medium text-center">W-L-P</th>\n                    <th className="px-6 py-4 font-medium text-center">Tiebreaker</th>');

code = code.replace('{isNaN(participant.wins) ? 0 : String(participant.wins)}-{isNaN(participant.losses) ? 0 : String(participant.losses)}-{isNaN(participant.pushes) ? 0 : String(participant.pushes)}\n                      </td>',
`{isNaN(participant.wins) ? 0 : String(participant.wins)}-{isNaN(participant.losses) ? 0 : String(participant.losses)}-{isNaN(participant.pushes) ? 0 : String(participant.pushes)}
                      </td>
                      <td className="px-6 py-4 text-center text-amber-500 font-mono font-bold">
                         {participant.picks?.find(p => p.tiebreakerTotal !== undefined)?.tiebreakerTotal || '-'}
                      </td>`);
                      
fs.writeFileSync('src/pages/pickem/PickEmPage.tsx', code);
