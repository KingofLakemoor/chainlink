import fs from 'fs';
let code = fs.readFileSync('src/apiRouter.ts', 'utf-8');

code = code.replace(
  'const startDay = new Date(effectiveBeginDate - 7 * 86400000);',
  'const startDay = new Date(effectiveBeginDate - 1 * 86400000);'
);
code = code.replace(
  'const endDay = new Date(effectiveEndDate + 7 * 86400000);',
  'const endDay = new Date(effectiveEndDate + 1 * 86400000);'
);

fs.writeFileSync('src/apiRouter.ts', code);
