const fs = require('fs');
let code = fs.readFileSync('src/components/ui/BracketMatchupCard.tsx', 'utf8');

code = code.replace(
  '<FirebaseImage src={teamLogo} fallback="/icons/icon-256x256.png" className="w-4 h-4 object-contain rounded-sm flex-shrink-0" />',
  '<FirebaseImage src={teamLogo} fallback={liveMatchup?.league === \'SCRIPTLESS\' ? \'/images/scriptless.png\' : \'/logo.png\'} className="w-4 h-4 object-contain rounded-sm flex-shrink-0" />'
);

fs.writeFileSync('src/components/ui/BracketMatchupCard.tsx', code);
