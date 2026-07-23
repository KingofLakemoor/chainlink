const fs = require('fs');
const file = 'src/services/propGrader.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /async function fetchPlayerStat/,
  'export async function fetchPlayerStat'
);

fs.writeFileSync(file, code);
