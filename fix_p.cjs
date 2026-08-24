const fs = require('fs');
let code = fs.readFileSync('src/pages/pickem/PickEmPage.tsx', 'utf8');

code = code.replace("p => p.tiebreakerTotal", "(p: any) => p.tiebreakerTotal");
fs.writeFileSync('src/pages/pickem/PickEmPage.tsx', code);
