const fs = require('fs');
const path = './src/components/ui/MatchupCard.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'className="h-full bg-blue-500 rounded-full" style={{ width: `${awayHotPct}%` }}',
  'className={cn("h-full rounded-full transition-all duration-500", getHotBarClass(awayHotPct))} style={{ width: `${awayHotPct}%` }}'
);

content = content.replace(
  'className="h-full bg-blue-500 rounded-full" style={{ width: `${homeHotPct}%` }}',
  'className={cn("h-full rounded-full transition-all duration-500", getHotBarClass(homeHotPct))} style={{ width: `${homeHotPct}%` }}'
);

content = content.replace(
  'className={cn("h-full rounded-full transition-all duration-500", awayHotPct >= 50 ? "bg-gradient-to-l from-red-500 to-red-500" : "bg-zinc-700")} style={{ width: `${awayHotPct}%` }}',
  'className={cn("h-full rounded-full transition-all duration-500", getHotBarClass(awayHotPct))} style={{ width: `${awayHotPct}%` }}'
);

content = content.replace(
  'className={cn("h-full rounded-full transition-all duration-500", homeHotPct >= 50 ? "bg-gradient-to-r from-red-500 to-red-500" : "bg-zinc-700")} style={{ width: `${homeHotPct}%` }}',
  'className={cn("h-full rounded-full transition-all duration-500", getHotBarClass(homeHotPct))} style={{ width: `${homeHotPct}%` }}'
);

fs.writeFileSync(path, content);
