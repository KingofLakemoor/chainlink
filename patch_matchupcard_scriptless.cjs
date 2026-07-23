const fs = require('fs');
const file = 'src/components/ui/MatchupCard.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /      if \(m\.featuredType === 'ChainBuilder'\) \{/,
  "      if (m.featuredType === 'ScriptLess' || m.featuredType === 'SCRIPTLESS' || m.featuredType === 'yZd7SruYT08dhh6MbVIh') {\n          featuredColor = \"#d46f1c\";\n          featuredName = \"ScriptLess\";\n          featuredSponsorObj = { image: '/images/scriptless.png', name: 'ScriptLess', color: '#d46f1c' };\n      } else if (m.featuredType === 'ChainBuilder') {"
);

fs.writeFileSync(file, code);
