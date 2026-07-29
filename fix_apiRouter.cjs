const fs = require('fs');
let code = fs.readFileSync('src/apiRouter.ts', 'utf-8');

code = code.split("if (league === 'MEX' || league === 'Liga MX') {\n      league = 'LMX';\n    }").join(
  "if (league === 'MEX' || league === 'Liga MX') {\n      league = 'LMX';\n    }\n    if (league === 'Argentina' || league === 'Liga Profesional') {\n      league = 'ARG';\n    }\n    if (league === 'Brazil' || league === 'Serie A' || league === 'Campeonato Brasileiro') {\n      league = 'BRA';\n    }"
);

fs.writeFileSync('src/apiRouter.ts', code);
