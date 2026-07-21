const fs = require('fs');
let code = fs.readFileSync('src/components/ui/BracketMatchupCard.tsx', 'utf8');

code = code.replace(
  '<FirebaseImage src={teamLogo} fallback={liveMatchup?.league === \'SCRIPTLESS\' ? \'/images/scriptless.png\' : \'/logo.png\'} className="w-4 h-4 object-contain rounded-sm flex-shrink-0" />',
  '<FirebaseImage src={teamLogo} fallback={liveMatchup?.league === \'SCRIPTLESS\' ? \'/images/scriptless.png\' : undefined} fallbackIcon={liveMatchup?.league === \'SCRIPTLESS\' ? undefined : <Link2 className="w-4 h-4 text-zinc-600" />} className="w-4 h-4 object-contain rounded-sm flex-shrink-0 flex items-center justify-center" />'
);

if (!code.includes("import {") || !code.includes("Link2")) {
  code = code.replace('import {', 'import { Link2,');
}

fs.writeFileSync('src/components/ui/BracketMatchupCard.tsx', code);
