const fs = require('fs');
let code = fs.readFileSync('src/apiRouter.ts', 'utf8');

if (!code.includes('updateAllProps')) {
  code = code.replace("import { gradePickemMatchups } from './services/pickemGrader.js';", "import { gradePickemMatchups } from './services/pickemGrader.js';\nimport { updateAllProps } from './services/propGrader.js';");
}

if (!code.includes("if (league === 'PROP')")) {
  code = code.replace(
    "const result = await syncLeagueSchedules(league);",
    "let result = {};\n    if (league === 'PROP') {\n      await updateAllProps();\n      result = { success: true, message: 'Prop updates complete' };\n    } else {\n      result = await syncLeagueSchedules(league);\n    }"
  );
}

fs.writeFileSync('src/apiRouter.ts', code);
