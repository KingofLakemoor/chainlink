const fs = require('fs');
let code = fs.readFileSync('src/components/ui/BracketMatchupCard.tsx', 'utf8');
code = code.replace("import { Trophy, Check, X } from 'lucide-react';", "import { Trophy, Check, X, Link2 } from 'lucide-react';");
fs.writeFileSync('src/components/ui/BracketMatchupCard.tsx', code);
