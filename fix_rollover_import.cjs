const fs = require('fs');
let code = fs.readFileSync('src/services/monthlyRollover.ts', 'utf-8');
code = code.replace("import { getFirestore } from 'firebase-admin/firestore';", "import admin from 'firebase-admin';");
code = code.replace("const adminDb = getFirestore();", "const adminDb = admin.firestore();");
fs.writeFileSync('src/services/monthlyRollover.ts', code);
