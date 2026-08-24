const fs = require('fs');
let code = fs.readFileSync('src/lib/errorLogger.ts', 'utf8');
code = code.replace("await addDoc(collection(db, 'system_errors')", "if (db) await addDoc(collection(db, 'system_errors')");
fs.writeFileSync('src/lib/errorLogger.ts', code);
