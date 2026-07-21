const fs = require('fs');
let code = fs.readFileSync('src/components/ui/MatchupCard.tsx', 'utf8');

// Replace standard fallbacks with dynamic ones based on the league
code = code.replace(
  '<FirebaseImage fallback="/logo.png" src={m.type === \'OVER_UNDER\' ? \'/images/over.png\' : m.awayTeam.image} className="w-full h-full object-contain drop-shadow-md" alt={m.type === \'OVER_UNDER\' ? \'OVER\' : m.awayTeam.name} />',
  '<FirebaseImage fallback={m.league === \'SCRIPTLESS\' ? \'/images/scriptless.png\' : \'/logo.png\'} src={m.type === \'OVER_UNDER\' ? \'/images/over.png\' : m.awayTeam.image} className="w-full h-full object-contain drop-shadow-md" alt={m.type === \'OVER_UNDER\' ? \'OVER\' : m.awayTeam.name} />'
);

code = code.replace(
  '<FirebaseImage fallback="/logo.png" src={m.type === \'OVER_UNDER\' ? \'/images/under.png\' : m.homeTeam.image} className="w-full h-full object-contain drop-shadow-md" alt={m.type === \'OVER_UNDER\' ? \'UNDER\' : m.homeTeam.name} />',
  '<FirebaseImage fallback={m.league === \'SCRIPTLESS\' ? \'/images/scriptless.png\' : \'/logo.png\'} src={m.type === \'OVER_UNDER\' ? \'/images/under.png\' : m.homeTeam.image} className="w-full h-full object-contain drop-shadow-md" alt={m.type === \'OVER_UNDER\' ? \'UNDER\' : m.homeTeam.name} />'
);

fs.writeFileSync('src/components/ui/MatchupCard.tsx', code);
