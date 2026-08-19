const fs = require('fs');
const file = 'src/components/ui/MatchupCard.tsx';
let code = fs.readFileSync(file, 'utf8');

const awayTarget = `<span className="text-xs sm:text-sm font-semibold text-zinc-200 truncate w-full text-center px-1">{m.type === 'OVER_UNDER' ? 'OVER' : m.awayTeam.name}</span>`;
const awayRepl = `<span className="text-xs sm:text-sm font-semibold text-zinc-200 truncate w-full text-center px-1">{m.type === 'OVER_UNDER' ? 'OVER' : (m.awayTeam.shortName || m.awayTeam.name)}</span>`;
code = code.replace(awayTarget, awayRepl);

const homeTarget = `<span className="text-xs sm:text-sm font-semibold text-zinc-200 truncate w-full text-center px-1">{m.type === 'OVER_UNDER' ? 'UNDER' : \`@\${m.homeTeam.name}\`}</span>`;
const homeRepl = `<span className="text-xs sm:text-sm font-semibold text-zinc-200 truncate w-full text-center px-1">{m.type === 'OVER_UNDER' ? 'UNDER' : \`@\${m.homeTeam.shortName || m.homeTeam.name}\`}</span>`;
code = code.replace(homeTarget, homeRepl);

fs.writeFileSync(file, code);
