const fs = require('fs');
let code = fs.readFileSync('src/components/ui/MatchupCard.tsx', 'utf8');

code = code.replace(
  '<FirebaseImage fallback={m.league === \'SCRIPTLESS\' ? \'/images/scriptless.png\' : \'/logo.png\'} src={m.type === \'OVER_UNDER\' ? \'/images/over.png\' : m.awayTeam.image} className="w-full h-full object-contain drop-shadow-md" alt={m.type === \'OVER_UNDER\' ? \'OVER\' : m.awayTeam.name} />',
  '<FirebaseImage fallback={m.league === \'SCRIPTLESS\' ? \'/images/scriptless.png\' : undefined} fallbackIcon={m.league === \'SCRIPTLESS\' ? undefined : <Link2 className="w-10 h-10 text-zinc-600" />} src={m.type === \'OVER_UNDER\' ? \'/images/over.png\' : m.awayTeam.image} className="w-full h-full object-contain drop-shadow-md flex items-center justify-center" alt={m.type === \'OVER_UNDER\' ? \'OVER\' : m.awayTeam.name} />'
);

code = code.replace(
  '<FirebaseImage fallback={m.league === \'SCRIPTLESS\' ? \'/images/scriptless.png\' : \'/logo.png\'} src={m.type === \'OVER_UNDER\' ? \'/images/under.png\' : m.homeTeam.image} className="w-full h-full object-contain drop-shadow-md" alt={m.type === \'OVER_UNDER\' ? \'UNDER\' : m.homeTeam.name} />',
  '<FirebaseImage fallback={m.league === \'SCRIPTLESS\' ? \'/images/scriptless.png\' : undefined} fallbackIcon={m.league === \'SCRIPTLESS\' ? undefined : <Link2 className="w-10 h-10 text-zinc-600" />} src={m.type === \'OVER_UNDER\' ? \'/images/under.png\' : m.homeTeam.image} className="w-full h-full object-contain drop-shadow-md flex items-center justify-center" alt={m.type === \'OVER_UNDER\' ? \'UNDER\' : m.homeTeam.name} />'
);

fs.writeFileSync('src/components/ui/MatchupCard.tsx', code);
