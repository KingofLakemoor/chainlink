const fs = require('fs');
const file = 'src/apiRouter.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /    } else if \(league === 'PROP'\) \{\n      await updateAllProps\(\);\n      result = \{ success: true, message: 'Prop updates complete' \};\n    \} else \{\n      result = await syncLeagueSchedules\(league\);\n    \}/,
  "    } else if (league === 'PROP') {\n      await updateAllProps();\n      result = { success: true, message: 'Prop updates complete' };\n    } else {\n      result = await syncLeagueSchedules(league);\n      try {\n        await updateAllProps();\n      } catch (err) {\n        console.error('Failed to update props during sync-schedules:', err);\n      }\n    }"
);

fs.writeFileSync(file, code);
