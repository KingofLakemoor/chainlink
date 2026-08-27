import fs from 'fs';
let code = fs.readFileSync('src/apiRouter.ts', 'utf-8');

// Replace the filter bounds with exact dates rather than +/- 7 days
code = code.replace(
  'const filterBegin = effectiveBeginDate ? effectiveBeginDate - (7 * 24 * 3600 * 1000) : undefined;',
  'const filterBegin = effectiveBeginDate ? effectiveBeginDate : undefined;'
);
code = code.replace(
  'const filterEnd = effectiveEndDate ? effectiveEndDate + (7 * 24 * 3600 * 1000) : undefined;',
  'const filterEnd = effectiveEndDate ? effectiveEndDate : undefined;'
);

fs.writeFileSync('src/apiRouter.ts', code);
