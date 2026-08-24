const fs = require('fs');
let code = fs.readFileSync('src/services/pickemEnforcer.ts', 'utf8');

code = code.replace("const allPicks = picksSnap.docs.map(d => ({ id: d.id, ...d.data() }));", "const allPicks: any[] = picksSnap.docs.map(d => ({ id: d.id, ...d.data() }));");

fs.writeFileSync('src/services/pickemEnforcer.ts', code);
