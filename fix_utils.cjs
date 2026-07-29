const fs = require('fs');
let code = fs.readFileSync('src/lib/utils.ts', 'utf-8');

code = code.replace(
  /if \(\s*\["MLS", "NWSL", "EPL", "RPL",[^]*?\.includes\(\s*league\s*\)\s*\)\s*return "soccer";/,
  'if (["MLS", "NWSL", "EPL", "RPL", "CFL", "LMX", "ARG", "BRA", "CSL", "TUR", "FRIENDLY", "FIFA", "FRA", "CHN"].includes(league)) return "soccer";'
);

fs.writeFileSync('src/lib/utils.ts', code);
