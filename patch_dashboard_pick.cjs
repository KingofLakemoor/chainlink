const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/dashboard-pick.tsx', 'utf8');

code = code.replace(
  '<FirebaseImage src={activeMatchup.type === \'OVER_UNDER\' ? \'/images/over.png\' : activeMatchup.awayTeam.image} fallback="/logo.png" className="w-16 h-16 object-contain" alt={activeMatchup.type === \'OVER_UNDER\' ? \'OVER\' : activeMatchup.awayTeam.name} loading="lazy" />',
  '<FirebaseImage src={activeMatchup.type === \'OVER_UNDER\' ? \'/images/over.png\' : activeMatchup.awayTeam.image} fallback={activeMatchup.league === \'SCRIPTLESS\' ? \'/images/scriptless.png\' : \'/logo.png\'} className="w-16 h-16 object-contain" alt={activeMatchup.type === \'OVER_UNDER\' ? \'OVER\' : activeMatchup.awayTeam.name} loading="lazy" />'
);

code = code.replace(
  '<FirebaseImage src={activeMatchup.type === \'OVER_UNDER\' ? \'/images/under.png\' : activeMatchup.homeTeam.image} fallback="/logo.png" className="w-16 h-16 object-contain" alt={activeMatchup.type === \'OVER_UNDER\' ? \'UNDER\' : activeMatchup.homeTeam.name} loading="lazy" />',
  '<FirebaseImage src={activeMatchup.type === \'OVER_UNDER\' ? \'/images/under.png\' : activeMatchup.homeTeam.image} fallback={activeMatchup.league === \'SCRIPTLESS\' ? \'/images/scriptless.png\' : \'/logo.png\'} className="w-16 h-16 object-contain" alt={activeMatchup.type === \'OVER_UNDER\' ? \'UNDER\' : activeMatchup.homeTeam.name} loading="lazy" />'
);

fs.writeFileSync('src/components/dashboard/dashboard-pick.tsx', code);
