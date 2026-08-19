const fs = require('fs');
const file = 'package.json';
let code = fs.readFileSync(file, 'utf8');
code = code.replace('"test": "echo \\"Error: no test specified\\" && exit 1"', '"test": "vitest"');
fs.writeFileSync(file, code);
